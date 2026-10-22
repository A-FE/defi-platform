import { useCallback, useRef } from 'react';
import type { ISeriesApi, IChartApi } from 'lightweight-charts';
import { KlineInterval, KlineBar } from '@/types/market';
import { getIntervalSeconds } from './utils/chartTimeFormat';
import { CHART_DATA_CONFIG } from '@/constants/chart';

interface UseKlineDataLoaderProps {
  symbol: string;
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>;
  fetchKlines: (symbol: string, interval: KlineInterval, from: number, to: number) => Promise<KlineBar[]>;
  subscribeBars: (symbol: string, interval: KlineInterval, lastBar: KlineBar, callback: (bar: KlineBar) => void) => () => void;
  onDataLoaded: (bars: KlineBar[] | ((prev: KlineBar[]) => KlineBar[])) => void; // 完整数据回调
  onDisplayDataLoaded: (bars: KlineBar[] | ((prev: KlineBar[]) => KlineBar[])) => void; // 显示数据回调
  onOldestTimeUpdate: (time: number) => void;
}

/**
 * K线数据加载 Hook
 * 职责：初始加载历史数据 + WebSocket 实时订阅
 *
 * 数据分离策略：
 * - 获取 100 根 K 线（用于指标计算）
 * - 只渲染最新 50 根（用于图表显示）
 */
export function useKlineDataLoader({
  symbol,
  chartRef,
  seriesRef,
  fetchKlines,
  subscribeBars,
  onDataLoaded,
  onDisplayDataLoaded, // ✅ 新增：显示数据回调
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
        // ✅ 加载 100 根 K 线（用于指标计算）
        const from = now - (CHART_DATA_CONFIG.FULL_DATA_SIZE * getIntervalSeconds(interval));

        const allBars = await fetchKlines(symbol, interval, from, now);

        if (allBars.length === 0) {
          console.warn('[loadKlineData] No bars received');
          return;
        }

        // ✅ 分离数据：完整数据和显示数据
        const displayBars = allBars.slice(-CHART_DATA_CONFIG.DISPLAY_DATA_SIZE);

        // 保存完整数据（用于指标计算）
        onDataLoaded(allBars);

        // 保存显示数据（用于图表渲染）
        onDisplayDataLoaded(displayBars);

        // 记录最旧时间戳
        onOldestTimeUpdate(allBars[0].time);

        console.log('[loadKlineData] 数据加载完成:', {
          total: allBars.length,
          display: displayBars.length,
        });

        // 渲染 K 线到图表（只渲染显示数据）
        const data = displayBars.map((bar) => {
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

        console.log(`[loadKlineData] 加载完成: 总计 ${allBars.length} 根，显示 ${displayBars.length} 根`);

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
        const lastFullBar = allBars[allBars.length - 1];
        const lastDisplayedBar = data[data.length - 1];

        // 创建一个基于显示价格的 lastBar 副本
        const adjustedLastBar: KlineBar = {
          ...lastFullBar,
          open: lastDisplayedBar.open,
          high: lastDisplayedBar.high,
          low: lastDisplayedBar.low,
          close: lastDisplayedBar.close,
          volume: lastFullBar.volume, // ✅ 保留 volume 字段
        };

        console.log('[loadKlineData] WebSocket 订阅基准价格:', {
          原始: lastFullBar.close,
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

            // ✅ 通知外部更新完整数据
            onDataLoaded((prev: KlineBar[]) => {
              const newData = [...prev];
              const lastIndex = newData.findIndex(b => b.time === bar.time);

              if (lastIndex >= 0) {
                newData[lastIndex] = bar;
              } else {
                newData.push(bar);
                // ✅ 保持完整数据在合理范围内
                if (newData.length > CHART_DATA_CONFIG.MAX_FULL_DATA_SIZE) {
                  return newData.slice(-CHART_DATA_CONFIG.FULL_DATA_SIZE);
                }
              }

              return newData;
            });

            // ✅ 通知外部更新显示数据
            onDisplayDataLoaded((prev: KlineBar[]) => {
              const newData = [...prev];
              const lastIndex = newData.findIndex(b => b.time === bar.time);

              if (lastIndex >= 0) {
                newData[lastIndex] = bar;
              } else {
                newData.push(bar);
                // ✅ 保持显示数据在 50 根
                if (newData.length > CHART_DATA_CONFIG.DISPLAY_DATA_SIZE) {
                  return newData.slice(-CHART_DATA_CONFIG.DISPLAY_DATA_SIZE);
                }
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
    [symbol, fetchKlines, subscribeBars, seriesRef, chartRef, onDataLoaded, onDisplayDataLoaded, onOldestTimeUpdate]
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
