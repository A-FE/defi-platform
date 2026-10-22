import { useCallback, useRef, useEffect, useState } from 'react';
import type { ISeriesApi, IChartApi } from 'lightweight-charts';
import { KlineInterval, KlineBar } from '@/types/market';
import { getIntervalSeconds } from './utils/chartTimeFormat';

interface UseInfiniteLoadHistoryProps {
  symbol: string;
  interval: KlineInterval;
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>;
  fetchKlines: (symbol: string, interval: KlineInterval, from: number, to: number) => Promise<KlineBar[]>;
  onDataLoaded: (bars: KlineBar[]) => void;
}

/**
 * 无限滚动加载历史数据 Hook
 *
 * 职责：
 * 1. 监听图表滚动到左边界
 * 2. 自动加载更早的历史数据
 * 3. 价格调整确保连续性
 * 4. 管理加载状态
 */
export function useInfiniteLoadHistory({
  symbol,
  interval,
  chartRef,
  seriesRef,
  fetchKlines,
  onDataLoaded,
}: UseInfiniteLoadHistoryProps) {
  // ========== 状态管理 ==========
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const oldestTimeRef = useRef<number | null>(null);
  const hasMoreHistoryRef = useRef<boolean>(true);

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
        const currentData = seriesRef.current.data();

        if (currentData.length === 0) {
          return;
        }

        const oldestCurrentBar = currentData[0];

        if (!('open' in oldestCurrentBar)) {
          return;
        }

        const targetPrice = oldestCurrentBar.open;

        console.log(`[useInfiniteLoadHistory] 当前最早K线: time=${oldestCurrentBar.time}, open=${oldestCurrentBar.open}`);

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

          console.log(`[useInfiniteLoadHistory] 价格调整: ${lastOlderBar.close} -> ${targetPrice}, 比例: ${priceAdjustment}`);

          const adjustedOlderBars = olderBars.map((bar) => ({
            ...bar,
            open: bar.open * priceAdjustment,
            high: bar.high * priceAdjustment,
            low: bar.low * priceAdjustment,
            close: bar.close * priceAdjustment,
            volume: bar.volume,
          }));

          const allBars = [...adjustedOlderBars, ...currentData];

          // 转换为图表格式
          const formattedData = allBars.map((bar: any) => {
            const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);
            if (isNaN(time)) return null;

            return {
              time: time as any,
              open: Number(bar.open.toFixed(2)),
              high: Number(bar.high.toFixed(2)),
              low: Number(bar.low.toFixed(2)),
              close: Number(bar.close.toFixed(2)),
            };
          }).filter(Boolean);

          seriesRef.current.setData(formattedData as any);

          // 通知外部更新数据
          onDataLoaded(allBars as KlineBar[]);

          console.log(`[useInfiniteLoadHistory] 加载了 ${olderBars.length} 根历史K线`);
        } else {
          hasMoreHistoryRef.current = false;
          console.log('[useInfiniteLoadHistory] 没有更多历史数据');
        }
      } catch (error) {
        console.error('[useInfiniteLoadHistory] 加载失败:', error);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [isLoadingMore, symbol, interval, fetchKlines, seriesRef, onDataLoaded]
  );

  // ========== 重置状态 ==========
  const resetHistory = useCallback(() => {
    oldestTimeRef.current = null;
    hasMoreHistoryRef.current = true;
    setIsLoadingMore(false);
  }, []);

  // ========== 滚动监听 ==========
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const timeScale = chart.timeScale();

    const handleVisibleRangeChange = () => {
      const logicalRange = timeScale.getVisibleLogicalRange();
      if (!logicalRange) return;

      // 当用户滚动到左侧边界附近时，自动加载更多历史数据
      if (logicalRange.from < 5) {
        loadMoreHistory();
      }
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    };
  }, [chartRef, loadMoreHistory]);

  // ========== 对外接口 ==========
  return {
    isLoadingMore,
    resetHistory,
    oldestTimeRef, // 暴露给数据加载器设置初始值
  };
}
