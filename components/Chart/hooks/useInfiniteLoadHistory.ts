/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines-per-function */
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
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>;
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
  const currentKlineDataRef = useRef<KlineBar[]>(currentKlineData); // ✅ 使用 ref 存储最新数据

  // ✅ 同步最新数据到 ref
  useEffect(() => {
    currentKlineDataRef.current = currentKlineData;
  }, [currentKlineData]);

  // ========== 固定触发阈值 ==========
  // 使用固定阈值，在可视范围前 50 个数据点时触发加载
  const triggerThreshold = useMemo(() => {
    const maxRequirement = getMaxIndicatorDataRequirement(enabledIndicators);
    const threshold = Math.max(50, maxRequirement + 10); // 最小 50，确保指标有足够数据

    return threshold;
  }, [enabledIndicators]); // ✅ 只依赖指标配置

  // ========== 加载历史数据逻辑 ==========
  const loadMoreHistory = useCallback(
    async () => {
      // ✅ 防止重复加载
      if (isLoadingMore || !hasMoreHistoryRef.current) {
        console.info('[useInfiniteLoadHistory] ⏭️ Skipping load:', {
          isLoadingMore,
          hasMoreHistory: hasMoreHistoryRef.current,
        });
        return;
      }

      if (!oldestTimeRef.current || !seriesRef.current) {
        console.warn('[useInfiniteLoadHistory] ⚠️ Missing oldestTime or series ref');
        return;
      }

      console.info('[useInfiniteLoadHistory] 🚀 Starting load, current data count:', currentKlineDataRef.current.length);
      setIsLoadingMore(true);

      try {
        // ✅ 使用 ref 中的最新数据，避免闭包问题
        const currentData = currentKlineDataRef.current;

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

          // ✅ 转换为图表格式（根据系列类型转换）
          const formattedData = allBars.map((bar) => {
            const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);
            if (isNaN(time)) {return null;}

            // ✅ 检查是否是分时图（LineSeries）
            const seriesType = (seriesRef.current as any)?._internal?.__brand;
            const isLineSeries = seriesType === 'Line' || interval === 'timesharing';

            if (isLineSeries) {
              // 分时图：只需要 time 和 value（使用 close 价格）
              return {
                time: time as any,
                value: Number(bar.close.toFixed(2)),
              };
            } 
              // K线图：需要 OHLC
              return {
                time: time as any,
                open: Number(bar.open.toFixed(2)),
                high: Number(bar.high.toFixed(2)),
                low: Number(bar.low.toFixed(2)),
                close: Number(bar.close.toFixed(2)),
              };
            
          }).filter(Boolean);

          // 更新图表
          seriesRef.current.setData(formattedData as any);

          // ✅ 通知外部更新完整数据（包含 volume）
          onDataLoaded(allBars);

          console.info(`[useInfiniteLoadHistory] 加载了 ${olderBars.length} 根历史K线，总计 ${allBars.length} 根`);
          console.info(`[useInfiniteLoadHistory] 时间范围: ${allBars[0]?.time} ~ ${allBars[allBars.length - 1]?.time}`);
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
    [isLoadingMore, symbol, interval, fetchKlines, seriesRef, onDataLoaded], // ✅ 移除 currentKlineData 依赖
  );

  // ========== 重置状态 ==========
  const resetHistory = useCallback(() => {
    oldestTimeRef.current = null;
    hasMoreHistoryRef.current = true;
    setIsLoadingMore(false);
  }, []);

  // ========== 滚动监听 ==========
  // ✅ 使用 ref 访问动态值，避免依赖变化导致监听器重建
  const loadMoreHistoryRef = useRef(loadMoreHistory);

  useEffect(() => {
    loadMoreHistoryRef.current = loadMoreHistory;
  }, [loadMoreHistory]);

  useEffect(() => {
    console.info('[useInfiniteLoadHistory] 🎯 Setting up scroll listener:', {
      interval,
      hasChart: Boolean(chartRef.current),
    });

    if (!chartRef.current) {
      console.warn('[useInfiniteLoadHistory] ⚠️ Chart not available, skipping scroll listener setup');
      return;
    }

    const chart = chartRef.current;
    const timeScale = chart.timeScale();

    console.info('[useInfiniteLoadHistory] ✅ Scroll listener registered');

    const handleVisibleRangeChange = () => {
      const logicalRange = timeScale.getVisibleLogicalRange();
      if (!logicalRange) {return;}

      // ✅ 动态读取最新值，不依赖闭包
      const currentThreshold = triggerThreshold;
      const shouldLoad = logicalRange.from < currentThreshold;

      // ✅ 防止加载过程中重复触发（直接检查 state）
      if (isLoadingMore) {
        return;
      }

      // ✅ 使用动态阈值：基于需求最大的指标
      // 当用户滚动到左侧边界附近时，自动加载更多历史数据
      if (shouldLoad) {
        console.info('[useInfiniteLoadHistory] 🔄 触发历史数据加载', {
          from: logicalRange.from.toFixed(2),
          threshold: currentThreshold,
        });
        loadMoreHistoryRef.current();
      }
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      console.info('[useInfiniteLoadHistory] 🧹 Cleaning up scroll listener');
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    };
  }, [interval, isLoadingMore]); // ✅ 依赖 isLoadingMore，确保加载状态变化时能正确防止重复触发

  // ========== 对外接口 ==========
  return {
    isLoadingMore,
    resetHistory,
    oldestTimeRef, // 暴露给数据加载器设置初始值
  };
}
