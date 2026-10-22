import { useState, useEffect, useCallback, useRef } from 'react';
import { ISeriesApi, IChartApi } from 'lightweight-charts';
import { useKlineStore } from '@/stores';
import { KlineInterval, KlineBar } from '@/types/market';

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
 * K线数据管理 Hook V4 - 前端计算版本
 * 职责：周期切换、数据加载、实时订阅、无限左滑加载历史数据
 *
 * V4 改变（前端计算重构）：
 * - 只获取原始 K线数据，不再获取指标
 * - 指标计算由 IndicatorManager 负责（前端计算）
 * - 返回原始 KlineBar[]，供外部使用
 * - 简化逻辑，移除指标相关参数
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
  const [klineData, setKlineData] = useState<KlineBar[]>([]);  // ✅ 改为 KlineBar[]
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);

  // 追踪已加载的数据范围
  const oldestTimeRef = useRef<number | null>(null);
  const hasMoreHistoryRef = useRef<boolean>(true);
  const isLoadingMoreRef = useRef<boolean>(false);
  const isReloadingRef = useRef<boolean>(false);

  const { fetchKlines, subscribeBars, unsubscribeBars } = useKlineStore();

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

        // 检查是否为有效的蜡烛图数据
        if (!('open' in oldestCurrentBar)) {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
          return;
        }

        const targetPrice = oldestCurrentBar.open;

        console.log(`[loadMoreHistory] 当前最早K线: time=${oldestCurrentBar.time}, open=${oldestCurrentBar.open}`);

        // ✅ 获取更早的历史数据（只获取原始 K 线）
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
          // 更新最旧时间戳
          oldestTimeRef.current = olderBars[0].time;

          // 调整最后一根历史K线，使其 close 与当前最早K线的 open 相等
          const lastOlderBar = olderBars[olderBars.length - 1];
          const priceAdjustment = targetPrice / lastOlderBar.close;

          console.log(`[loadMoreHistory] 价格调整: ${lastOlderBar.close} -> ${targetPrice}, 比例: ${priceAdjustment}`);

          // ✅ 调整所有历史K线的价格，保持相对关系
          const adjustedOlderBars = olderBars.map((bar) => ({
            ...bar,
            open: bar.open * priceAdjustment,
            high: bar.high * priceAdjustment,
            low: bar.low * priceAdjustment,
            close: bar.close * priceAdjustment,
            volume: bar.volume,
          }));

          // 合并：调整后的旧数据 + 当前数据
          const allBars = [...adjustedOlderBars, ...currentData];

          // 转换为 lightweight-charts 格式（仅 OHLC）
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

          // ✅ 更新完整数据（原始K线）
          setKlineData(prev => {
            const currentCompleteData = prev.filter(bar =>
              bar.time >= (oldestCurrentBar.time as number)
            );
            return [...adjustedOlderBars, ...currentCompleteData];
          });

          console.log(`[loadMoreHistory] 加载了 ${olderBars.length} 根历史K线（含指标），最早时间: ${new Date(oldestTimeRef.current * 1000).toLocaleString()}`);
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
    [symbol, fetchKlines, seriesRef]
  );

  // 加载 K线数据
  const loadKlineData = useCallback(
    async (newInterval: KlineInterval) => {
      if (!seriesRef.current) return;

      setIsLoading(true);
      isReloadingRef.current = true;  // ✅ 标记正在重载，阻止 WebSocket 更新

      // 重置历史数据追踪
      oldestTimeRef.current = null;
      hasMoreHistoryRef.current = true;

      try {
        // ✅ 简化：只获取原始 K线数据
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

        // ✅ 保存原始 K线数据
        setKlineData(bars);

        // 记录最旧的时间戳
        oldestTimeRef.current = bars[0].time;

        // 渲染 K 线到图表（只渲染 OHLC，不渲染指标）
        const data = bars.map((bar) => {
          const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);

          if (isNaN(time)) {
            console.error('Invalid bar time:', bar);
            throw new Error(`Invalid time value: ${bar.time}`);
          }

          return {
            time: time as any,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          };
        });

        seriesRef.current.setData(data);

        console.log(`[loadKlineData] 初始加载 ${bars.length} 根K线，最早时间: ${new Date(oldestTimeRef.current * 1000).toLocaleString()}`);

        // 设置可视范围（显示最近 30 根 K 线）
        setTimeout(() => {
          const timeScale = chartRef.current?.timeScale();
          if (timeScale && data.length > 30) {
            const visibleStart = data[data.length - 30].time;
            const visibleEnd = data[data.length - 1].time;
            timeScale.setVisibleRange({
              from: visibleStart as any,
              to: visibleEnd as any,
            });
            console.log('[useKlineData] Visible range set to last 30 bars');
          } else {
            timeScale?.fitContent();
          }
        }, 100);

        // 订阅新周期 WebSocket
        const lastBar = bars[bars.length - 1];
        const unsubscribe = subscribeBars(symbol, newInterval, lastBar, (bar) => {
          // ✅ 防止在重载期间更新（避免 "Cannot update oldest data" 错误）
          if (!seriesRef.current || isReloadingRef.current) return;

          // 确保 time 是 number 类型
          const time = typeof bar.time === 'number' ? bar.time : Number(bar.time);

          if (isNaN(time)) {
            console.error('[useKlineData] Invalid real-time bar time:', bar);
            return;
          }

          // ✅ 获取当前系列的最后一个数据点
          const seriesData = seriesRef.current.data();
          if (seriesData.length > 0) {
            const lastDataPoint = seriesData[seriesData.length - 1];
            const lastTime = typeof lastDataPoint.time === 'number'
              ? lastDataPoint.time
              : Number(lastDataPoint.time);

            // 如果新时间戳 < 最后时间戳，拒绝更新旧数据
            if (time < lastTime) {
              console.warn(`[useKlineData] Skipping old data: new time ${time} < last time ${lastTime}`);
              return;
            }

            // 如果时间戳相等，说明是更新当前 K 线，允许继续
            // 如果时间戳更大，说明是新 K 线，也允许继续
          }

          // 实时更新 K 线
          try {
            seriesRef.current.update({
              time: time as any,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
            });

            // ✅ 更新 klineData 状态
            setKlineData(prev => {
              const newData = [...prev];
              const lastIndex = newData.findIndex(b => b.time === bar.time);

              if (lastIndex >= 0) {
                // 更新现有 bar
                newData[lastIndex] = bar;
              } else {
                // 添加新 bar
                newData.push(bar);
              }

              return newData;
            });

            console.log('[useKlineData] Real-time update applied:', {
              time: new Date(time * 1000).toLocaleString(),
            });
          } catch (error) {
            console.error('[useKlineData] Failed to update series:', {
              error,
              time,
              bar,
              lastBar: seriesData[seriesData.length - 1],
            });
          }
        });

        // 保存取消订阅函数到 ref
        unsubscribeRef.current = unsubscribe;

        // ✅ 等待一小段时间确保图表数据完全设置后再允许更新
        setTimeout(() => {
          isReloadingRef.current = false;
        }, 100);

        return unsubscribe;
      } catch (error) {
        console.error('Load K-line data error:', error);
        isReloadingRef.current = false;  // ✅ 出错时也要清除标记
      } finally {
        setIsLoading(false);
      }
    },
    [symbol, fetchKlines, subscribeBars, seriesRef, chartRef]
  );

  // 监听周期变化
  useEffect(() => {
    console.log('[useKlineData] Interval changed, reloading');
    loadKlineData(interval);

    // 清理：取消订阅
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = undefined;
      }
    };
  }, [interval, loadKlineData]);

  // 监听可视范围变化，触发无限加载
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const timeScale = chart.timeScale();

    const handleVisibleRangeChange = () => {
      const logicalRange = timeScale.getVisibleLogicalRange();
      if (!logicalRange) return;

      // 当用户滚动到左侧边界附近时，加载更多历史数据
      if (logicalRange.from < 5) {
        loadMoreHistory(interval);
      }
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    };
  }, [chartRef, interval, loadMoreHistory]);

  return {
    interval,
    setInterval: (newInterval: KlineInterval) => {
      setIntervalState(newInterval);
    },
    isLoading,
    isLoadingMore,
    klineData,  // ✅ 返回原始 K线数据
  };
}
