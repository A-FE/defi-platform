import { useState, useEffect, useMemo } from 'react';
import { useKlineStore, useIndicatorStore } from '@/stores';
import { KlineInterval, KlineBar } from '@/types/market';

// 拆分后的子 Hooks
import { useChartInit } from './useChartInit';
import { useTimeFormatUpdate } from './useTimeFormatUpdate';
import { useKlineDataLoader } from './useKlineDataLoader';
import { useInfiniteLoadHistory } from './useInfiniteLoadHistory';
import { useIndicatorRenderer } from './useIndicatorRenderer';

interface UseKlineChartProps {
  symbol: string;
  initialInterval?: KlineInterval;
}

/**
 * K 线图表主 Hook（编排层）
 *
 * 职责：
 * - 协调各个子 Hook 的交互
 * - 管理周期状态
 * - 暴露统一的 API 接口
 */
export function useKlineChart({ symbol, initialInterval = '1h' }: UseKlineChartProps) {
  // ========== 状态管理 ==========
  const [interval, setInterval] = useState<KlineInterval>(initialInterval);
  const [isLoading, setIsLoading] = useState(false);
  const [klineData, setKlineData] = useState<KlineBar[]>([]);

  // ========== Store ==========
  const { fetchKlines, subscribeBars } = useKlineStore();
  const { getEnabledIndicators } = useIndicatorStore();

  // 缓存指标配置，避免不必要的重渲染
  const enabledIndicators = useMemo(() => getEnabledIndicators(), [getEnabledIndicators]);
  const memoizedIndicators = useMemo(() => enabledIndicators, [enabledIndicators]);

  // ========== 1. 图表初始化 ==========
  const { containerRef, chartRef, seriesRef, managerRef } = useChartInit();

  // ========== 2. 时间格式更新 ==========
  useTimeFormatUpdate(chartRef, interval);

  // ========== 3. 无限滚动加载历史数据 ==========
  const {
    isLoadingMore,
    resetHistory,
    oldestTimeRef,
  } = useInfiniteLoadHistory({
    symbol,
    interval,
    chartRef,
    seriesRef,
    fetchKlines,
    onDataLoaded: (bars) => {
      setKlineData(bars);
    },
  });

  // ========== 4. K 线数据加载 ==========
  const { loadKlineData, unsubscribe } = useKlineDataLoader({
    symbol,
    chartRef,
    seriesRef,
    fetchKlines,
    subscribeBars,
    onDataLoaded: (barsOrUpdater) => {
      if (typeof barsOrUpdater === 'function') {
        setKlineData(barsOrUpdater);
      } else {
        setKlineData(barsOrUpdater);
      }
    },
    onOldestTimeUpdate: (time) => {
      oldestTimeRef.current = time;
    },
  });

  // ========== 5. 指标渲染 ==========
  useIndicatorRenderer(chartRef, managerRef, klineData, memoizedIndicators);

  // ========== 6. 周期变化监听 ==========
  useEffect(() => {
    if (!seriesRef.current) {
      console.log('[useKlineChart] ⚠️ seriesRef.current 为 null，跳过加载');
      return;
    }

    console.log('[useKlineChart] 🔄 周期变化触发:', {
      interval,
      symbol,
      timestamp: Date.now(),
    });

    // 取消 WebSocket 订阅
    unsubscribe();

    // 重置历史加载状态
    resetHistory();

    // 清空数据
    setKlineData([]);
    setIsLoading(true);

    // 重新加载数据
    loadKlineData(interval).finally(() => {
      setIsLoading(false);
      console.log('[useKlineChart] ✅ 加载完成');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, symbol]);

  // ========== 对外接口 ==========
  return {
    containerRef,
    chartRef,
    seriesRef,
    interval,
    setInterval,
    isLoading,
    isLoadingMore,
  };
}
