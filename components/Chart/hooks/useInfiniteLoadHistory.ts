import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import type { ISeriesApi, IChartApi } from 'lightweight-charts';
import { KlineInterval, KlineBar } from '@/types/market';
import { IndicatorConfig } from '@/types/indicator';
import { getIntervalSeconds } from './utils/chartTimeFormat';
import { getMaxIndicatorDataRequirement } from '@/utils/indicatorDataRequirements';

interface UseInfiniteLoadHistoryProps {
  symbol: string;
  interval: KlineInterval;
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>;
  fetchKlines: (symbol: string, interval: KlineInterval, from: number, to: number) => Promise<KlineBar[]>;
  onDataLoaded: (bars: KlineBar[]) => void;
  currentKlineData: KlineBar[]; // ✅ 从外部传入完整的 K 线数据（包含 volume）
  enabledIndicators: IndicatorConfig[]; // ✅ 新增：启用的指标列表
}

/**
 * 无限滚动加载历史数据 Hook
 *
 * 职责：
 * 1. 监听图表滚动到左边界
 * 2. 自动加载更早的历史数据
 * 3. 价格调整确保连续性
 * 4. 管理加载状态
 * 5. ✅ 根据启用的指标动态计算触发阈值
 */
export function useInfiniteLoadHistory({
  symbol,
  interval,
  chartRef,
  seriesRef,
  fetchKlines,
  onDataLoaded,
  currentKlineData, // ✅ 接收完整的 K 线数据
  enabledIndicators, // ✅ 接收启用的指标列表
}: UseInfiniteLoadHistoryProps) {
  // ========== 状态管理 ==========
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const oldestTimeRef = useRef<number | null>(null);
  const hasMoreHistoryRef = useRef<boolean>(true);

  // ========== 安全缓冲区配置 ==========
  const SAFETY_BUFFER = 10;

  // ========== 动态计算触发阈值 ==========
  // 根据启用的指标计算触发阈值
  // 例如：MACD 需要 35 根数据，触发阈值 = 35 + 10 = 45
  const triggerThreshold = useMemo(() => {
    const maxRequirement = getMaxIndicatorDataRequirement(enabledIndicators);
    const threshold = maxRequirement + SAFETY_BUFFER;

    console.info('[useInfiniteLoadHistory] 📏 计算触发阈值:', {
      maxRequirement,
      safetyBuffer: SAFETY_BUFFER,
      threshold,
      indicators: enabledIndicators.map(ind =>
        `${ind.type}(${Object.values(ind.params).join(',')})`,
      ),
    });

    return threshold;
  }, [enabledIndicators]);

  // ========== 加载历史数据逻辑 ==========
  const loadMoreHistory = useCallback(
    async () => {
      if (isLoadingMore || !hasMoreHistoryRef.current) {
        return;
      }

      if (!oldestTimeRef.current || !seriesRef.current) {
        return;
      }

      setIsLoadingMore(true);

      try {
        // ✅ 使用外部传入的完整 K 线数据（包含 volume），而不是从图表获取
        const currentData = currentKlineData;

        if (currentData.length === 0) {
          return;
        }

        const oldestCurrentBar = currentData[0];

        const targetPrice = oldestCurrentBar.open;

        console.info(`[useInfiniteLoadHistory] 当前最早K线: time=${oldestCurrentBar.time}, open=${oldestCurrentBar.open}`);

        // 获取历史数据
        const olderTime = oldestTimeRef.current;
        const from = olderTime - (50 * getIntervalSeconds(interval));
        const to = olderTime - 1;

        const olderBars = await fetchKlines(symbol, interval, from, to);

        if (olderBars && olderBars.length > 0) {
          oldestTimeRef.current = olderBars[0].time;

          // 价格调整
          const lastOlderBar = olderBars[olderBars.length - 1];
          const priceAdjustment = targetPrice / lastOlderBar.close;

          console.info(`[useInfiniteLoadHistory] 价格调整: ${lastOlderBar.close} -> ${targetPrice}, 比例: ${priceAdjustment}`);

          const adjustedOlderBars = olderBars.map((bar) => ({
            ...bar,
            open: bar.open * priceAdjustment,
            high: bar.high * priceAdjustment,
            low: bar.low * priceAdjustment,
            close: bar.close * priceAdjustment,
            volume: bar.volume, // ✅ 保留 volume
          }));

          // ✅ 合并完整的 K 线数据（包含 volume）
          const allBars = [...adjustedOlderBars, ...currentData];

          // ✅ 转换为图表格式（只用于图表渲染，OHLC 即可）
          const formattedData = allBars.map((bar) => {
            const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);
            if (isNaN(time)) {return null;}

            return {
              time: time as any,
              open: Number(bar.open.toFixed(2)),
              high: Number(bar.high.toFixed(2)),
              low: Number(bar.low.toFixed(2)),
              close: Number(bar.close.toFixed(2)),
            };
          }).filter(Boolean);

          // 更新图表（只需要 OHLC）
          seriesRef.current.setData(formattedData as any);

          // ✅ 通知外部更新完整数据（包含 volume）
          onDataLoaded(allBars);

          console.info(`[useInfiniteLoadHistory] 加载了 ${olderBars.length} 根历史K线`);
        } else {
          hasMoreHistoryRef.current = false;
          console.info('[useInfiniteLoadHistory] 没有更多历史数据');
        }
      } catch (error) {
        console.error('[useInfiniteLoadHistory] 加载失败:', error);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [isLoadingMore, symbol, interval, fetchKlines, seriesRef, onDataLoaded, currentKlineData],
  );

  // ========== 重置状态 ==========
  const resetHistory = useCallback(() => {
    oldestTimeRef.current = null;
    hasMoreHistoryRef.current = true;
    setIsLoadingMore(false);
  }, []);

  // ========== 滚动监听 ==========
  useEffect(() => {
    if (!chartRef.current) {return;}

    const chart = chartRef.current;
    const timeScale = chart.timeScale();

    const handleVisibleRangeChange = () => {
      const logicalRange = timeScale.getVisibleLogicalRange();
      if (!logicalRange) {return;}

      console.info('[useInfiniteLoadHistory] 📊 可视范围变化:', {
        from: logicalRange.from.toFixed(2),
        to: logicalRange.to.toFixed(2),
        triggerThreshold,
        shouldLoad: logicalRange.from < triggerThreshold,
      });

      // ✅ 使用动态阈值：基于需求最大的指标
      // 当用户滚动到左侧边界附近时，自动加载更多历史数据
      if (logicalRange.from < triggerThreshold) {
        console.info('[useInfiniteLoadHistory] 🔄 触发历史数据加载');
        loadMoreHistory();
      }
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    };
  }, [chartRef, loadMoreHistory, triggerThreshold]);

  // ========== 对外接口 ==========
  return {
    isLoadingMore,
    resetHistory,
    oldestTimeRef, // 暴露给数据加载器设置初始值
  };
}
