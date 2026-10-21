import { useState, useEffect, useCallback, useRef } from 'react';
import { createChart, CandlestickSeries, Time } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useKlineStore, useIndicatorStore } from '@/stores';
import { KlineInterval } from '@/types/market';
import { IndicatorKlineItem } from '@/types/api';
import { IndicatorManager } from '@/services/indicators/IndicatorManager';
import { mockCalculateIndicators } from '@/services/mock/indicatorMock';

/**
 * 辅助函数：获取 K 线周期对应的秒数
 */
function getIntervalSeconds(interval: KlineInterval): number {
  const map: Record<KlineInterval, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
    '1w': 604800,
  };
  return map[interval] || 3600;
}

/**
 * 根据周期获取时间格式配置
 */
function getTimeFormatOptions(interval: KlineInterval) {
  switch (interval) {
    case '1m':
      return {
        timeVisible: true,
        secondsVisible: true,
        localization: {
          timeFormatter: (timestamp: number | string) => {
            const time = typeof timestamp === 'number' ? timestamp : Number(timestamp);
            const date = new Date(time * 1000);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
          }
        }
      };

    case '5m':
    case '15m':
      return {
        timeVisible: true,
        secondsVisible: false,
        localization: {
          timeFormatter: (timestamp: number | string) => {
            const time = typeof timestamp === 'number' ? timestamp : Number(timestamp);
            const date = new Date(time * 1000);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
          }
        }
      };

    case '1h':
    case '4h':
      return {
        timeVisible: true,
        secondsVisible: false,
        localization: {
          timeFormatter: (timestamp: number | string) => {
            const time = typeof timestamp === 'number' ? timestamp : Number(timestamp);
            const date = new Date(time * 1000);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${month}-${day} ${hours}:${minutes}`;
          }
        }
      };

    case '1d':
    case '1w':
      return {
        timeVisible: true,
        secondsVisible: false,
        localization: {
          timeFormatter: (timestamp: number | string) => {
            const time = typeof timestamp === 'number' ? timestamp : Number(timestamp);
            const date = new Date(time * 1000);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        }
      };

    default:
      return {
        timeVisible: true,
        secondsVisible: false,
      };
  }
}

/**
 * 统一的 K 线图表 Hook
 *
 * 职责：
 * - 图表初始化（chart + series）
 * - K 线数据管理（初始加载 + 实时订阅）
 * - 无限左滑加载历史
 * - 指标数据计算 + 渲染
 * - 周期切换
 *
 * 架构优势：
 * - 单一数据流：K 线 + 指标在同一 hook 内管理
 * - 数据一致性：状态更新后立即渲染
 * - 简化调用：外部组件只需一个 hook
 */
export function useKlineChart(
  symbol: string,
  defaultInterval: KlineInterval
) {
  // ========== Refs ==========
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const managerRef = useRef<IndicatorManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);

  // 追踪已加载的数据范围
  const oldestTimeRef = useRef<number | null>(null);
  const hasMoreHistoryRef = useRef<boolean>(true);
  const isLoadingMoreRef = useRef<boolean>(false);
  const isReloadingRef = useRef<boolean>(false);

  // ========== State ==========
  const [interval, setIntervalState] = useState<KlineInterval>(defaultInterval);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [klineData, setKlineData] = useState<IndicatorKlineItem[]>([]);

  // ========== Store ==========
  const { fetchKlines, subscribeBars, unsubscribeBars } = useKlineStore();
  const { getEnabledIndicators } = useIndicatorStore();

  // ========== 图表初始化 ==========
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // 创建图表（初始时间格式使用默认配置）
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        layout: {
          background: { color: '#111827' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#1f2937' },
          horzLines: { color: '#1f2937' },
        },
        timeScale: {
          borderColor: '#1f2937',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      // 添加 K 线系列
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      }, 0);

      seriesRef.current = candlestickSeries;

      // 初始化指标管理器
      managerRef.current = new IndicatorManager(chart, candlestickSeries);

      console.log('[useKlineChart] Chart initialized');

      // 响应式处理
      const handleResize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      // 清理
      return () => {
        window.removeEventListener('resize', handleResize);
        if (managerRef.current) {
          managerRef.current.clear();
          managerRef.current = null;
        }
        chart.remove();
      };
    } catch (error) {
      console.error('[useKlineChart] Initialization error:', error);
    }
  }, []);  // ✅ 只初始化一次

  // ========== 周期变化时更新时间格式 ==========
  useEffect(() => {
    if (!chartRef.current) return;

    const timeFormatOptions = getTimeFormatOptions(interval);

    try {
      chartRef.current.applyOptions({
        timeScale: timeFormatOptions,
      });

      console.log('[useKlineChart] Time format updated for interval:', interval, timeFormatOptions);
    } catch (error) {
      console.error('[useKlineChart] Failed to update time format:', error);
    }
  }, [interval]);

  // ========== 获取当前启用的指标 ==========
  const enabledIndicators = useCallback(() => {
    const configs = getEnabledIndicators();

    const result = configs.map(c => {
      // ✅ 根据指标类型正确转换参数
      let params: number[];

      switch (c.type) {
        case 'MA':
        case 'EMA':
          // MA/EMA: params 是对象 {period1: 5, period2: 10, ...}
          // 需要转换为数组 [5, 10, ...]
          params = Object.values(c.params);
          break;

        case 'MACD':
          // MACD: params 是 {fastPeriod: 12, slowPeriod: 26, signalPeriod: 9}
          // 需要按顺序转换为 [12, 26, 9]
          params = [
            c.params.fastPeriod,
            c.params.slowPeriod,
            c.params.signalPeriod,
          ];
          break;

        case 'KDJ':
          // KDJ: params 是 {period: 9, kPeriod: 3, dPeriod: 3}
          // 需要按顺序转换为 [9, 3, 3]
          params = [
            c.params.period,
            c.params.kPeriod,
            c.params.dPeriod,
          ];
          break;

        case 'RSI':
          // RSI: params 是 {period: 14}
          // 需要转换为 [14]
          params = [c.params.period];
          break;

        case 'BOLL':
          // BOLL: params 是 {period: 20, stdDev: 2}
          // 需要按顺序转换为 [20, 2]
          params = [c.params.period, c.params.stdDev];
          break;

        case 'VOL':
          // VOL: 无参数
          params = [];
          break;

        default:
          params = Object.values(c.params);
      }

      return {
        name: c.type.toLowerCase(),
        params,
      };
    });

    // ✅ 添加调试日志
    console.log('[enabledIndicators] 转换后的指标配置:', result);

    return result;
  }, [getEnabledIndicators]);

  // ========== 加载更多历史数据（无限左滑）==========
  const loadMoreHistory = useCallback(
    async (currentInterval: KlineInterval) => {
      if (isLoadingMoreRef.current || !hasMoreHistoryRef.current) {
        return;
      }

      if (!oldestTimeRef.current || !seriesRef.current) {
        return;
      }

      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);

      try {
        const currentData = seriesRef.current.data();

        if (currentData.length === 0) {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
          return;
        }

        const oldestCurrentBar = currentData[0];

        if (!('open' in oldestCurrentBar)) {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
          return;
        }

        const targetPrice = oldestCurrentBar.open;

        console.log(`[loadMoreHistory] 当前最早K线: time=${oldestCurrentBar.time}, open=${oldestCurrentBar.open}`);

        // 获取历史数据（只获取 K 线）
        const olderTime = oldestTimeRef.current;
        const from = olderTime - (50 * getIntervalSeconds(currentInterval));
        const to = olderTime - 1;

        const olderBars = await fetchKlines(
          symbol,
          currentInterval,
          from,
          to,
          []  // 只获取 K 线
        );

        if (olderBars && olderBars.length > 0) {
          oldestTimeRef.current = olderBars[0].time;

          // 价格调整
          const lastOlderBar = olderBars[olderBars.length - 1];
          const priceAdjustment = targetPrice / lastOlderBar.close;

          console.log(`[loadMoreHistory] 价格调整: ${lastOlderBar.close} -> ${targetPrice}, 比例: ${priceAdjustment}`);

          const adjustedOlderBars = olderBars.map((bar) => ({
            ...bar,
            open: bar.open * priceAdjustment,
            high: bar.high * priceAdjustment,
            low: bar.low * priceAdjustment,
            close: bar.close * priceAdjustment,
            volume: bar.volume,
            indicators: {},
          }));

          // ✅ 滑动窗口计算指标（关键修复）
          let finalAdjustedBars = adjustedOlderBars;
          let updatedCurrentData = klineData;  // ✅ 保存更新后的当前数据
          const indicators = enabledIndicators();

          if (indicators.length > 0) {
            try {
              const currentCompleteData = klineData;
              const allBarsForCalculation = [...adjustedOlderBars, ...currentCompleteData];

              console.log('[loadMoreHistory] 使用滑动窗口计算指标:', {
                历史数据: adjustedOlderBars.length,
                当前数据: currentCompleteData.length,
                完整数据集: allBarsForCalculation.length,
              });

              // ✅ 用完整数据集计算指标
              const allBarsWithIndicators = mockCalculateIndicators(allBarsForCalculation, {
                symbol,
                resolution: currentInterval,
                from: allBarsForCalculation[0].time,
                to: allBarsForCalculation[allBarsForCalculation.length - 1].time,
                indicators,
              });

              // ✅ 分割：前 N 根是新历史数据，后面是更新后的当前数据
              finalAdjustedBars = allBarsWithIndicators.slice(0, adjustedOlderBars.length);
              updatedCurrentData = allBarsWithIndicators.slice(adjustedOlderBars.length);

              console.log('[loadMoreHistory] 滑动窗口指标计算完成:', {
                新历史数据: finalAdjustedBars.length,
                更新后当前数据: updatedCurrentData.length,
                总计: allBarsWithIndicators.length,
              });
            } catch (error) {
              console.error('[loadMoreHistory] 指标计算失败:', error);
            }
          }

          // ✅ 合并完整数据（带指标）
          const allBarsWithIndicators = [...finalAdjustedBars, ...updatedCurrentData];

          // 更新图表（只渲染 K 线）
          const formattedData = allBarsWithIndicators.map((bar: any) => {
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

          // ✅ 更新状态（完整数据，包含指标）
          setKlineData(allBarsWithIndicators);

          console.log(`[loadMoreHistory] 加载了 ${olderBars.length} 根历史K线`);
        } else {
          hasMoreHistoryRef.current = false;
          console.log('[loadMoreHistory] 没有更多历史数据');
        }
      } catch (error) {
        console.error('[loadMoreHistory] 加载失败:', error);
      } finally {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    },
    [symbol, fetchKlines, klineData, enabledIndicators]
  );

  // ========== 加载 K 线数据 ==========
  const loadKlineData = useCallback(
    async (newInterval: KlineInterval) => {
      if (!seriesRef.current) return;

      setIsLoading(true);
      isReloadingRef.current = true;

      // 重置历史数据追踪
      oldestTimeRef.current = null;
      hasMoreHistoryRef.current = true;

      try {
        const now = Math.floor(Date.now() / 1000);
        const from = now - (100 * getIntervalSeconds(newInterval));
        const indicators = enabledIndicators();

        const bars = await fetchKlines(
          symbol,
          newInterval,
          from,
          now,
          indicators
        );

        if (bars.length === 0) {
          console.warn('[loadKlineData] No bars received');
          setIsLoading(false);
          return;
        }

        // 保存完整数据
        setKlineData(bars);

        // 记录最旧时间戳
        oldestTimeRef.current = bars[0].time;

        // 渲染 K 线
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
        const lastBar = bars[bars.length - 1];
        const unsubscribe = subscribeBars(symbol, newInterval, lastBar, (bar) => {
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
              console.warn(`[useKlineChart] Skipping old data: ${time} < ${lastTime}`);
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

            // 更新状态
            setKlineData(prev => {
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
            console.error('[useKlineChart] Update failed:', error);
          }
        }, indicators);

        unsubscribeRef.current = unsubscribe;

        setTimeout(() => {
          isReloadingRef.current = false;
        }, 100);

        return unsubscribe;
      } catch (error) {
        console.error('[loadKlineData] Error:', error);
        isReloadingRef.current = false;
      } finally {
        setIsLoading(false);
      }
    },
    [symbol, fetchKlines, subscribeBars, enabledIndicators]
  );

  // ========== 渲染指标 ==========
  useEffect(() => {
    console.log('[useKlineChart] 🚀 useEffect 触发:', {
      hasManager: !!managerRef.current,
      hasChart: !!chartRef.current,
      dataLength: klineData.length,
      enabledCount: getEnabledIndicators().length,
      timestamp: Date.now(),
    });

    if (!managerRef.current || !chartRef.current || klineData.length === 0) {
      console.log('[useKlineChart] ⚠️ 条件不满足，跳过');
      return;
    }

    const enabledConfigs = getEnabledIndicators();

    if (enabledConfigs.length === 0) {
      console.log('[useKlineChart] 📭 无启用指标，清空');
      managerRef.current.clear();
      return;
    }

    // ✅ 检查当前数据是否包含所需的指标数据
    const needsRecalculation = enabledConfigs.some(config => {
      // 检查数据中是否有该指标
      const hasIndicatorData = klineData.some(bar => {
        switch (config.type) {
          case 'MACD':
            return bar.indicators.macd !== undefined;
          case 'RSI':
            return bar.indicators.rsi !== undefined;
          case 'KDJ':
            return bar.indicators.kdj !== undefined;
          case 'BOLL':
            return bar.indicators.boll !== undefined;
          case 'MA':
            return bar.indicators.ma !== undefined;
          case 'EMA':
            return bar.indicators.ema !== undefined;
          case 'VOL':
            return bar.indicators.vol !== undefined;
          default:
            return false;
        }
      });
      return !hasIndicatorData;
    });

    // ✅ 如果需要重新计算指标
    if (needsRecalculation) {
      const t0 = performance.now();
      console.log('[useKlineChart] 🔍 指标数据缺失，开始重新计算:', {
        enabledIndicators: enabledConfigs.map(c => c.type),
        dataLength: klineData.length,
      });

      try {
        const t1 = performance.now();
        const indicators = enabledIndicators();

        if (indicators.length === 0) return;

        const t2 = performance.now();
        console.log(`[useKlineChart] ⏱️ 准备指标配置: ${(t2 - t1).toFixed(2)}ms`);

        // 重新计算所有指标
        const barsWithIndicators = mockCalculateIndicators(klineData, {
          symbol,
          resolution: interval,
          from: klineData[0]?.time || 0,
          to: klineData[klineData.length - 1]?.time || 0,
          indicators,
        });

        const t3 = performance.now();
        console.log(`[useKlineChart] ⏱️ 指标计算: ${(t3 - t2).toFixed(2)}ms`);

        // ✅ 关键优化：直接渲染，不触发第二次 useEffect
        managerRef.current.updateIndicators(barsWithIndicators, enabledConfigs);

        const t4 = performance.now();
        console.log(`[useKlineChart] ⏱️ 渲染: ${(t4 - t3).toFixed(2)}ms`);
        console.log(`[useKlineChart] ✅ 总耗时: ${(t4 - t0).toFixed(2)}ms`);

        // ✅ 异步更新状态（不阻塞渲染）
        requestAnimationFrame(() => {
          setKlineData(barsWithIndicators);
        });

        return; // 已完成渲染，跳过后面的逻辑
      } catch (error) {
        console.error('[useKlineChart] 指标重新计算失败:', error);
      }
    }

    console.log('[useKlineChart] 更新指标:', {
      barsCount: klineData.length,
      indicators: enabledConfigs.map(c => c.type),
      hasMACDData: klineData.filter(b => b.indicators.macd).length,
    });

    // ✅ 使用增量更新（智能判断是否需要重建）
    managerRef.current.updateIndicators(klineData, enabledConfigs);
  }, [klineData, getEnabledIndicators, symbol, interval, enabledIndicators]);

  // ========== 监听周期变化 ==========
  useEffect(() => {
    console.log('[useKlineChart] Interval changed, reloading:', interval);
    loadKlineData(interval);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = undefined;
      }
    };
  }, [interval, loadKlineData]);

  // ========== 监听可视范围变化（无限左滑）==========
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const timeScale = chart.timeScale();

    const handleVisibleRangeChange = () => {
      const logicalRange = timeScale.getVisibleLogicalRange();
      if (!logicalRange) return;

      if (logicalRange.from < 5) {
        loadMoreHistory(interval);
      }
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    };
  }, [chartRef, interval, loadMoreHistory]);

  // ========== 返回值 ==========
  return {
    containerRef,
    isLoading,
    isLoadingMore,
    interval,
    setInterval: (newInterval: KlineInterval) => {
      setIntervalState(newInterval);
    },
    klineData,  // 可选，用于调试
  };
}
