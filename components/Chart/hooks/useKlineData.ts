import { useState, useEffect, useCallback } from 'react';
import { ISeriesApi } from 'lightweight-charts';
import { useKlineStore } from '@/stores';
import { KlineInterval } from '@/types/market';

/**
 * K线数据管理 Hook
 * 职责：周期切换、数据加载、实时订阅
 */
export function useKlineData(
  symbol: string,
  defaultInterval: KlineInterval,
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>
) {
  const [interval, setIntervalState] = useState<KlineInterval>(defaultInterval);
  const [isLoading, setIsLoading] = useState(false);

  const { fetchHistory, subscribeBars, unsubscribeBars, getFromCache } = useKlineStore();

  // 加载 K线数据
  const loadKlineData = useCallback(
    async (newInterval: KlineInterval) => {
      if (!seriesRef.current) return;

      setIsLoading(true);

      try {
        // 1. 尝试从缓存读取
        let bars = getFromCache(symbol, newInterval);

        // 2. 无缓存则 HTTP 拉取
        if (!bars || bars.length === 0) {
          bars = await fetchHistory(symbol, newInterval, 500);
        }

        // 3. setData() 设置数据
        if (bars.length > 0) {
          const data = bars.map((bar) => ({
            time: bar.time as any,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          }));
          seriesRef.current.setData(data);

          // 自动调整可视范围
          setTimeout(() => {
            seriesRef.current?.timeScale().fitContent();
          }, 0);
        }

        // 4. 订阅新周期 WebSocket
        const unsubscribe = subscribeBars(symbol, newInterval, (bar) => {
          if (seriesRef.current) {
            // 实时更新只用 update()，不频繁 setData()
            seriesRef.current.update({
              time: bar.time as any,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
            });
          }
        });

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

      // 取消旧订阅
      unsubscribeBars(symbol, interval);

      setIntervalState(newInterval);

      // 加载新周期数据
      await loadKlineData(newInterval);
    },
    [interval, symbol, unsubscribeBars, loadKlineData]
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
