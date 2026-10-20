import { useState, useEffect, useCallback, useRef } from 'react';
import { ISeriesApi, IChartApi, LogicalRange } from 'lightweight-charts';
import { useKlineStore } from '@/stores';
import { KlineInterval } from '@/types/market';

/**
 * K线数据管理 Hook
 * 职责：周期切换、数据加载、实时订阅、无限左滑加载历史数据
 */
export function useKlineData(
  symbol: string,
  defaultInterval: KlineInterval,
  chartRef: React.RefObject<IChartApi | null>,
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>
) {
  const [interval, setIntervalState] = useState<KlineInterval>(defaultInterval);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const unsubscribeRef = useRef<(() => void) | undefined>();

  // 追踪已加载的数据范围
  const oldestTimeRef = useRef<number | null>(null);
  const hasMoreHistoryRef = useRef<boolean>(true);
  const isLoadingMoreRef = useRef<boolean>(false);

  const { fetchHistory, subscribeBars, unsubscribeBars, getFromCache } = useKlineStore();

  // 加载更多历史数据（无限左滑）
  const loadMoreHistory = useCallback(
    async (currentInterval: KlineInterval) => {
      // 防止重复加载
      if (isLoadingMoreRef.current || !hasMoreHistoryRef.current) {
        return;
      }

      // 没有最旧时间戳，说明还没有初始数据
      if (!oldestTimeRef.current || !seriesRef.current) {
        return;
      }

      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);

      try {
        // 获取当前图表的所有数据
        const currentData = seriesRef.current.data();

        if (currentData.length === 0) {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
          return;
        }

        // 获取当前最早的K线，用于连接新的历史数据
        const oldestCurrentBar = currentData[0];
        const targetPrice = oldestCurrentBar.open; // 新历史数据的最后一根应该close到这个价格

        console.log(`[loadMoreHistory] 当前最早K线: time=${oldestCurrentBar.time}, open=${oldestCurrentBar.open}`);

        // 获取更早的历史数据（从最旧时间戳之前加载 50 根）
        const olderBars = await fetchHistory(
          symbol,
          currentInterval,
          50,
          oldestTimeRef.current - 1 // before 参数，获取这个时间之前的数据
        );

        if (olderBars && olderBars.length > 0) {
          // 更新最旧时间戳
          oldestTimeRef.current = olderBars[0].time;

          // 调整最后一根历史K线，使其 close 与当前最早K线的 open 相等
          if (olderBars.length > 0) {
            const lastOlderBar = olderBars[olderBars.length - 1];

            // 计算价格调整比例
            const priceAdjustment = targetPrice / lastOlderBar.close;

            console.log(`[loadMoreHistory] 价格调整: ${lastOlderBar.close} -> ${targetPrice}, 比例: ${priceAdjustment}`);

            // 调整所有历史K线的价格，保持相对关系
            const adjustedOlderBars = olderBars.map((bar) => ({
              ...bar,
              open: bar.open * priceAdjustment,
              high: bar.high * priceAdjustment,
              low: bar.low * priceAdjustment,
              close: bar.close * priceAdjustment,
            }));

            // 合并：调整后的旧数据 + 当前数据
            const allBars = [...adjustedOlderBars, ...currentData];

            // 转换为 lightweight-charts 格式
            const formattedData = allBars.map((bar: any) => {
              const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);

              if (isNaN(time)) {
                console.error('Invalid bar time:', bar);
                return null;
              }

              return {
                time: time as any,
                open: Number(bar.open.toFixed(2)),
                high: Number(bar.high.toFixed(2)),
                low: Number(bar.low.toFixed(2)),
                close: Number(bar.close.toFixed(2)),
              };
            }).filter(Boolean);

            // 使用 setData() 重新设置所有数据
            seriesRef.current.setData(formattedData as any);

            console.log(`[loadMoreHistory] 加载了 ${olderBars.length} 根历史K线，最早时间: ${new Date(oldestTimeRef.current * 1000).toLocaleString()}`);
          }
        } else {
          // 没有更多历史数据
          hasMoreHistoryRef.current = false;
          console.log('[loadMoreHistory] 没有更多历史数据');
        }
      } catch (error) {
        console.error('[loadMoreHistory] 加载历史数据失败:', error);
      } finally {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    },
    [symbol, fetchHistory, seriesRef]
  );

  // 加载 K线数据
  const loadKlineData = useCallback(
    async (newInterval: KlineInterval) => {
      if (!seriesRef.current) return;

      setIsLoading(true);

      // 重置历史数据追踪
      oldestTimeRef.current = null;
      hasMoreHistoryRef.current = true;

      try {
        // 1. 尝试从缓存读取
        let bars = getFromCache(symbol, newInterval);

        // 2. 无缓存则 HTTP 拉取（加载 100 根 K 线足够显示）
        if (!bars || bars.length === 0) {
          bars = await fetchHistory(symbol, newInterval, 100);
        }

        // 3. setData() 设置数据
        if (bars.length > 0) {
          // 记录最旧的时间戳
          oldestTimeRef.current = bars[0].time;

          const data = bars.map((bar) => {
            // 确保 time 是 number 类型（秒级 UTC 时间戳）
            const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);

            if (isNaN(time)) {
              console.error('Invalid bar time:', bar);
              throw new Error(`Invalid time value: ${bar.time}`);
            }

            return {
              time: time as any, // lightweight-charts 需要 UTCTimestamp 类型
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
            };
          });

          seriesRef.current.setData(data);

          console.log(`[loadKlineData] 初始加载 ${bars.length} 根K线，最早时间: ${new Date(oldestTimeRef.current * 1000).toLocaleString()}`);

          // 设置可视范围（显示最近 50 根 K 线，其余可滚动查看）
          setTimeout(() => {
            const timeScale = chartRef.current?.timeScale();
            if (timeScale && data.length > 50) {
              const visibleStart = data[data.length - 50].time;
              const visibleEnd = data[data.length - 1].time;
              timeScale.setVisibleRange({
                from: visibleStart as any,
                to: visibleEnd as any,
              });
            } else {
              timeScale?.fitContent();
            }
          }, 0);
        }

        // 4. 订阅新周期 WebSocket（传入最后一根 K 线的信息）
        const lastBar = bars[bars.length - 1];
        const unsubscribe = subscribeBars(symbol, newInterval, lastBar, (bar) => {
          if (seriesRef.current) {
            // 确保 time 是 number 类型（秒级 UTC 时间戳）
            const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);

            if (isNaN(time)) {
              console.error('Invalid real-time bar:', bar);
              return; // 跳过无效数据
            }

            // 实时更新只用 update()，不频繁 setData()
            seriesRef.current.update({
              time: time as any, // lightweight-charts 需要 UTCTimestamp 类型
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
            });
          }
        });

        // 保存取消订阅函数到 ref
        unsubscribeRef.current = unsubscribe;

        // 返回取消订阅函数
        return unsubscribe;
      } catch (error) {
        console.error('Load K-line data error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [symbol, fetchHistory, subscribeBars, getFromCache, seriesRef, chartRef]
  );

  // 切换周期
  const setInterval = useCallback(
    async (newInterval: KlineInterval) => {
      if (interval === newInterval) return;

      // 1. 取消旧订阅
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = undefined;
      }

      // 2. 清空图表数据（避免新旧数据冲突）
      if (seriesRef.current) {
        seriesRef.current.setData([]);
      }

      setIntervalState(newInterval);

      // 3. 加载新周期数据
      await loadKlineData(newInterval);
    },
    [interval, loadKlineData, seriesRef]
  );

  // 初始加载
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const cleanup = () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = undefined;
      }
      // 同时清理 ref 中的订阅
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = undefined;
      }
    };

    loadKlineData(interval).then((unsub) => {
      unsubscribe = unsub;
    });

    return cleanup;
  }, [symbol, interval, loadKlineData]);

  // 监听可视范围变化，实现无限左滑加载
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const timeScale = chart.timeScale();

    // 监听可视范围变化
    const handleVisibleLogicalRangeChange = (newRange: LogicalRange | null) => {
      if (!newRange) return;

      // 当用户滚动到接近最左边时（距离边缘 10 个bar），加载更多历史数据
      const barsToLoadThreshold = 10;

      if (newRange.from < barsToLoadThreshold) {
        console.log('[visibleRangeChange] 接近左边界，触发加载历史数据');
        loadMoreHistory(interval);
      }
    };

    // 订阅可视逻辑范围变化
    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);

    // 清理订阅
    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
    };
  }, [chartRef, interval, loadMoreHistory]);

  return {
    interval,
    setInterval,
    isLoading,
    isLoadingMore,
  };
}
