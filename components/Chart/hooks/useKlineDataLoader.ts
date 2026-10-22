import { useCallback, useRef } from 'react';
import type { ISeriesApi, IChartApi } from 'lightweight-charts';
import { KlineInterval, KlineBar } from '@/types/market';
import { getIntervalSeconds } from './utils/chartTimeFormat';

interface UseKlineDataLoaderProps {
  symbol: string;
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>;
  fetchKlines: (symbol: string, interval: KlineInterval, from: number, to: number) => Promise<KlineBar[]>;
  subscribeBars: (symbol: string, interval: KlineInterval, lastBar: KlineBar, callback: (bar: KlineBar) => void) => () => void;
  onDataLoaded: (bars: KlineBar[] | ((prev: KlineBar[]) => KlineBar[])) => void;
  onOldestTimeUpdate: (time: number) => void;
}

/**
 * K线数据加载 Hook
 * 职责：初始加载历史数据 + WebSocket 实时订阅
 */
export function useKlineDataLoader({
  symbol,
  chartRef,
  seriesRef,
  fetchKlines,
  subscribeBars,
  onDataLoaded,
  onOldestTimeUpdate,
}: UseKlineDataLoaderProps) {
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);
  const isReloadingRef = useRef<boolean>(false);
  const lastLoadedIntervalRef = useRef<KlineInterval | null>(null);

  const loadKlineData = useCallback(
    async (interval: KlineInterval) => {
      if (!seriesRef.current) return;

      // ⚠️ 防止重复加载同一周期的数据
      if (isReloadingRef.current && lastLoadedIntervalRef.current === interval) {
        console.log('[loadKlineData] ⚠️ 已在加载中，跳过重复请求:', interval);
        return;
      }

      isReloadingRef.current = true;
      lastLoadedIntervalRef.current = interval;

      console.log('[loadKlineData] 🔄 开始加载:', {
        interval,
        symbol,
        timestamp: Date.now(),
      });

      try {
        const now = Math.floor(Date.now() / 1000);
        const from = now - (50 * getIntervalSeconds(interval));

        const bars = await fetchKlines(symbol, interval, from, now);

        if (bars.length === 0) {
          console.warn('[loadKlineData] No bars received');
          return;
        }

        // 保存完整数据
        onDataLoaded(bars);

        // 记录最旧时间戳
        onOldestTimeUpdate(bars[0].time);

        // 渲染 K 线到图表
        const data = bars.map((bar) => {
          const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);
          if (isNaN(time)) throw new Error(`Invalid time: ${bar.time}`);

          return {
            time: time as any,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          };
        });

        seriesRef.current.setData(data);

        console.log(`[loadKlineData] 加载 ${bars.length} 根K线`);

        // 设置可视范围
        setTimeout(() => {
          const timeScale = chartRef.current?.timeScale();
          if (timeScale && data.length > 30) {
            const visibleStart = data[data.length - 30].time;
            const visibleEnd = data[data.length - 1].time;
            timeScale.setVisibleRange({
              from: visibleStart as any,
              to: visibleEnd as any,
            });
          } else {
            timeScale?.fitContent();
          }
        }, 100);

        // 订阅实时数据
        // ⚠️ 重要：使用图表上实际显示的最后一根 K 线的价格
        // 因为历史数据可能经过价格调整（Mock 场景），需要确保 WebSocket 基于调整后的价格继续生成
        const lastBar = bars[bars.length - 1];
        const lastDisplayedBar = data[data.length - 1];

        // 创建一个基于显示价格的 lastBar 副本
        const adjustedLastBar: KlineBar = {
          ...lastBar,
          open: lastDisplayedBar.open,
          high: lastDisplayedBar.high,
          low: lastDisplayedBar.low,
          close: lastDisplayedBar.close,
        };

        console.log('[loadKlineData] WebSocket 订阅基准价格:', {
          原始: lastBar.close,
          调整后: adjustedLastBar.close,
        });

        const unsubscribe = subscribeBars(symbol, interval, adjustedLastBar, (bar) => {
          if (!seriesRef.current || isReloadingRef.current) return;

          const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);
          if (isNaN(time)) return;

          const seriesData = seriesRef.current.data();
          if (seriesData.length > 0) {
            const lastDataPoint = seriesData[seriesData.length - 1];
            const lastTime = typeof lastDataPoint.time === 'number'
              ? lastDataPoint.time
              : Number(lastDataPoint.time);

            if (time < lastTime) {
              console.warn(`[useKlineDataLoader] Skipping old data: ${time} < ${lastTime}`);
              return;
            }
          }

          try {
            seriesRef.current.update({
              time: time as any,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
            });

            // 通知外部更新数据
            onDataLoaded((prev: KlineBar[]) => {
              const newData = [...prev];
              const lastIndex = newData.findIndex(b => b.time === bar.time);

              if (lastIndex >= 0) {
                newData[lastIndex] = bar;
              } else {
                newData.push(bar);
              }

              return newData;
            });
          } catch (error) {
            console.error('[useKlineDataLoader] Update failed:', error);
          }
        });

        unsubscribeRef.current = unsubscribe;

        setTimeout(() => {
          isReloadingRef.current = false;
        }, 100);

        return unsubscribe;
      } catch (error) {
        console.error('[loadKlineData] Error:', error);
        isReloadingRef.current = false;
      }
    },
    [symbol, fetchKlines, subscribeBars, seriesRef, chartRef, onDataLoaded, onOldestTimeUpdate]
  );

  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = undefined;
    }
  }, []);

  return {
    loadKlineData,
    unsubscribe,
    isReloadingRef,
  };
}
