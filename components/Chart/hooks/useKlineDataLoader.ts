/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef } from 'react';
import type { ISeriesApi, IChartApi } from 'lightweight-charts';
import { KlineInterval, KlineBar } from '@/types/market';
import { IndicatorConfig } from '@/types/indicator';
import { getIntervalSeconds } from './utils/chartTimeFormat';
import { CHART_DATA_CONFIG } from '@/constants/chart';
import { calculateTotalDataSize } from '@/utils/indicatorDataRequirements';

interface UseKlineDataLoaderProps {
  symbol: string;
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>;
  fetchKlines: (symbol: string, interval: KlineInterval, from: number, to: number) => Promise<KlineBar[]>;
  subscribeBars: (symbol: string, interval: KlineInterval, lastBar: KlineBar, callback: (bar: KlineBar) => void) => () => void;
  onDataLoaded: (bars: KlineBar[] | ((prev: KlineBar[]) => KlineBar[])) => void; // 完整数据回调
  onDisplayDataLoaded: (bars: KlineBar[] | ((prev: KlineBar[]) => KlineBar[])) => void; // 显示数据回调
  onOldestTimeUpdate: (time: number) => void;
  enabledIndicators: IndicatorConfig[]; // ✅ 新增：启用的指标列表
  updateBar?: (symbol: string, bar: KlineBar) => void; // ✅ 新增：更新 Store 中的 bar
}

/**
 * K线数据加载 Hook
 * 职责：初始加载历史数据 + WebSocket 实时订阅
 *
 * 动态冗余数据加载策略：
 * - 根据启用的指标计算所需的数据量
 * - 实际加载量 = 显示数据量 + (指标最大需求 * 2)
 * - 例如：显示 50 根 + MACD 需要 35 根 * 2 = 120 根
 */
export function useKlineDataLoader({
  symbol,
  chartRef,
  seriesRef,
  fetchKlines,
  subscribeBars,
  onDataLoaded,
  onDisplayDataLoaded,
  onOldestTimeUpdate,
  enabledIndicators, // ✅ 启用的指标列表
  updateBar, // ✅ 更新 Store 中的 bar
}: UseKlineDataLoaderProps) {
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);
  const isReloadingRef = useRef<boolean>(false);
  const lastLoadedIntervalRef = useRef<KlineInterval | null>(null);
  const totalDataSizeRef = useRef<number>(CHART_DATA_CONFIG.BASE_DATA_SIZE); // ✅ 缓存当前的总数据量

  const loadKlineData = useCallback(
    async (interval: KlineInterval) => {
      if (!seriesRef.current) {return;}

      // ⚠️ 防止重复加载同一周期的数据
      if (isReloadingRef.current && lastLoadedIntervalRef.current === interval) {
        console.info('[loadKlineData] ⚠️ 已在加载中，跳过重复请求:', interval);
        return;
      }

      isReloadingRef.current = true;
      lastLoadedIntervalRef.current = interval;

      console.info('[loadKlineData] 🔄 开始加载:', {
        interval,
        symbol,
        timestamp: Date.now(),
      });

      try {
        const now = Math.floor(Date.now() / 1000);

        // ✅ 动态计算需要加载的数据量
        // 基础数据量 = 显示数据量 + (指标最大需求 * 2)
        const totalDataSize = Math.max(
          CHART_DATA_CONFIG.BASE_DATA_SIZE,
          calculateTotalDataSize(CHART_DATA_CONFIG.DISPLAY_DATA_SIZE, enabledIndicators),
        );

        // ✅ 缓存到 ref，供 WebSocket 回调使用
        totalDataSizeRef.current = totalDataSize;

        console.info('[loadKlineData] 📊 数据量计算:', {
          显示数据量: CHART_DATA_CONFIG.DISPLAY_DATA_SIZE,
          启用指标数: enabledIndicators.length,
          总加载量: totalDataSize,
          指标列表: enabledIndicators.map(ind => `${ind.type}(${Object.values(ind.params).join(',')})`),
        });

        const from = now - (totalDataSize * getIntervalSeconds(interval));

        const allBars = await fetchKlines(symbol, interval, from, now);

        if (allBars.length === 0) {
          console.warn('[loadKlineData] No bars received');
          return;
        }

        // ✅ 完整数据和显示数据都设置为全部数据
        // 图表的可见范围通过 timeScale.setVisibleRange 控制
        onDataLoaded(allBars);
        onDisplayDataLoaded(allBars);

        // 记录最旧时间戳
        onOldestTimeUpdate(allBars[0].time);

        console.info('[loadKlineData] 数据加载完成:', {
          total: allBars.length,
          interval,
        });

        // ✅ 根据周期类型转换数据格式
        const isTimesharing = interval === 'timesharing';

        const data = allBars.map((bar) => {
          const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);
          if (isNaN(time)) {throw new Error(`Invalid time: ${bar.time}`);}

          if (isTimesharing) {
            // 分时图：LineSeries 需要 { time, value } 格式
            return {
              time: time as any,
              value: bar.close, // 使用收盘价作为折线图的值
            };
          } 
            // K线图：CandlestickSeries 需要 { time, open, high, low, close } 格式
            return {
              time: time as any,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
            };
          
        });

        seriesRef.current.setData(data);

        console.info(`[loadKlineData] 加载完成: 总计 ${allBars.length} 根 K 线`);

        // 设置可视范围：初始只显示最新 50 根
        setTimeout(() => {
          const timeScale = chartRef.current?.timeScale();
          if (timeScale && data.length > CHART_DATA_CONFIG.DISPLAY_DATA_SIZE) {
            // 显示最新 50 根 K 线
            const visibleStart = data[data.length - CHART_DATA_CONFIG.DISPLAY_DATA_SIZE].time;
            const visibleEnd = data[data.length - 1].time;
            timeScale.setVisibleRange({
              from: visibleStart as any,
              to: visibleEnd as any,
            });
            console.info('[loadKlineData] 设置可见范围:', {
              from: visibleStart,
              to: visibleEnd,
              count: CHART_DATA_CONFIG.DISPLAY_DATA_SIZE,
            });
          } else {
            timeScale?.fitContent();
          }
        }, 100);

        // 订阅实时数据
        // ⚠️ 重要：使用图表上实际显示的最后一根 K 线的价格
        // 因为历史数据可能经过价格调整（Mock 场景），需要确保 WebSocket 基于调整后的价格继续生成
        const lastFullBar = allBars[allBars.length - 1];

        // ✅ 无论是分时图还是 K线图，WebSocket 订阅都使用完整的 KlineBar 格式
        const adjustedLastBar: KlineBar = {
          ...lastFullBar,
          // 分时图和 K线图都使用原始的完整数据
        };

        console.info('[loadKlineData] WebSocket 订阅基准价格:', {
          原始: lastFullBar.close,
          周期: interval,
        });

        const unsubscribe = subscribeBars(symbol, interval, adjustedLastBar, (bar) => {
          if (!seriesRef.current || isReloadingRef.current) {return;}

          const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);
          if (isNaN(time)) {return;}

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
            // ✅ 根据周期类型转换数据格式
            const isTimesharing = interval === 'timesharing';

            if (isTimesharing) {
              // 分时图：LineSeries 需要 { time, value } 格式
              seriesRef.current.update({
                time: time as any,
                value: bar.close,
              });
            } else {
              // K线图：CandlestickSeries 需要 OHLC 格式
              seriesRef.current.update({
                time: time as any,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
              });
            }

            // ✅ 更新完整数据（用于指标计算）
            onDataLoaded((prev: KlineBar[]) => {
              const newData = [...prev];
              const lastIndex = newData.findIndex(b => b.time === bar.time);

              if (lastIndex >= 0) {
                newData[lastIndex] = bar;
              } else {
                newData.push(bar);
                // ✅ 保持数据在合理范围内（防止内存溢出）
                if (newData.length > CHART_DATA_CONFIG.MAX_DATA_SIZE) {
                  return newData.slice(-totalDataSizeRef.current);
                }
              }

              return newData;
            });

            // ✅ 更新显示数据（与完整数据保持一致）
            onDisplayDataLoaded((prev: KlineBar[]) => {
              const newData = [...prev];
              const lastIndex = newData.findIndex(b => b.time === bar.time);

              if (lastIndex >= 0) {
                newData[lastIndex] = bar;
              } else {
                newData.push(bar);
                // ✅ 显示数据也保持在合理范围内（与完整数据一致）
                if (newData.length > CHART_DATA_CONFIG.MAX_DATA_SIZE) {
                  return newData.slice(-totalDataSizeRef.current);
                }
              }

              return newData;
            });

            // ✅ 同步更新 Store（让 PriceTicker 能够获取到实时更新）
            if (updateBar) {
              updateBar(symbol, bar);
            }
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
    [symbol, fetchKlines, subscribeBars, seriesRef, chartRef, onDataLoaded, onDisplayDataLoaded, onOldestTimeUpdate, enabledIndicators],
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
