import { useState, useEffect, useCallback, useRef } from 'react';
import { ISeriesApi, IChartApi } from 'lightweight-charts';
import { useKlineStore } from '@/stores';
import { KlineInterval } from '@/types/market';

/**
 * K线数据管理 Hook
 * 职责：周期切换、数据加载、实时订阅
 */
export function useKlineData(
  symbol: string,
  defaultInterval: KlineInterval,
  chartRef: React.RefObject<IChartApi | null>,
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>
) {
  const [interval, setIntervalState] = useState<KlineInterval>(defaultInterval);
  const [isLoading, setIsLoading] = useState(false);
  const unsubscribeRef = useRef<(() => void) | undefined>();

  const { fetchHistory, subscribeBars, unsubscribeBars, getFromCache } = useKlineStore();

  // 加载 K线数据
  const loadKlineData = useCallback(
    async (newInterval: KlineInterval) => {
      if (!seriesRef.current) return;

      setIsLoading(true);

      try {
        // 1. 尝试从缓存读取
        let bars = getFromCache(symbol, newInterval);

        // 2. 无缓存则 HTTP 拉取（加载 100 根 K 线足够显示）
        if (!bars || bars.length === 0) {
          bars = await fetchHistory(symbol, newInterval, 100);
        }

        // 3. setData() 设置数据
        if (bars.length > 0) {
          const data = bars.map((bar) => {
            // 确保 time 是 number 类型
            const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);

            if (isNaN(time)) {
              console.error('Invalid bar time:', bar);
              throw new Error(`Invalid time value: ${bar.time}`);
            }

            return {
              time,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
            };
          });

          seriesRef.current.setData(data);

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
            // 确保 time 是 number 类型
            const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);

            if (isNaN(time)) {
              console.error('Invalid real-time bar:', bar);
              return; // 跳过无效数据
            }

            // 实时更新只用 update()，不频繁 setData()
            seriesRef.current.update({
              time,
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
    [symbol, fetchHistory, subscribeBars, getFromCache, seriesRef]
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

    loadKlineData(interval).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [symbol]);

  return {
    interval,
    setInterval,
    isLoading,
  };
}
