import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createChart, CandlestickSeries, Time } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useKlineStore, useIndicatorStore } from '@/stores';
import { KlineInterval, KlineBar } from '@/types/market';
import { IndicatorManager } from '@/services/indicators/IndicatorManager';

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
  const [klineData, setKlineData] = useState<KlineBar[]>([]);

  // ========== Store ==========
  const { fetchKlines, subscribeBars, unsubscribeBars } = useKlineStore();
  const { configs: indicatorConfigs, getEnabledIndicators } = useIndicatorStore();

  // ✅ 优化：使用 useMemo 缓存启用的指标配置，避免每次都重新计算
  const enabledIndicators = useMemo(() => {
    return Object.values(indicatorConfigs).filter(c => c.enabled);
  }, [indicatorConfigs]);

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
          to
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
          }));

          // ✅ 简化：指标由 IndicatorManager 自动计算，这里只处理K线数据
          const allBars = [...adjustedOlderBars, ...currentData];

          // 更新图表（只渲染 K 线）
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

          // ✅ 更新状态（原始K线数据）
          setKlineData(allBars as KlineBar[]);

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

        const bars = await fetchKlines(
          symbol,
          newInterval,
          from,
          now
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
        });

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
      enabledCount: enabledIndicators.length,
      timestamp: Date.now(),
    });

    if (!managerRef.current || !chartRef.current || klineData.length === 0) {
      console.log('[useKlineChart] ⚠️ 条件不满足，跳过');
      return;
    }

    if (enabledIndicators.length === 0) {
      console.log('[useKlineChart] 📭 无启用指标，清空');
      managerRef.current.clear();
      return;
    }

    // ✅ 简化：直接调用 IndicatorManager 更新指标（前端自动计算）
    console.log('[useKlineChart] 更新指标:', {
      barsCount: klineData.length,
      indicators: enabledIndicators.map(c => c.type),
    });

    managerRef.current.updateIndicators(klineData, enabledIndicators);
  }, [klineData, enabledIndicators]); // ✅ 修复：直接依赖 enabledIndicators，不是函数

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
