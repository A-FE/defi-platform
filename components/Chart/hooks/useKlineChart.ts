/* eslint-disable max-lines-per-function */
import { useState, useEffect } from 'react';
import { useKlineStore } from '@/stores';
import { KlineInterval, KlineBar } from '@/types/market';

// 拆分后的子 Hooks
import { useChartInit } from './useChartInit';
import { useTimeFormatUpdate } from './useTimeFormatUpdate';
import { useKlineDataLoader } from './useKlineDataLoader';
import { useInfiniteLoadHistory } from './useInfiniteLoadHistory';
import { useIndicatorRenderer } from './useIndicatorRenderer';
import { useEnabledIndicators } from './useEnabledIndicators';
import { useIndicatorLegend } from './useIndicatorLegend';

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
 *
 * 数据分离策略：
 * - fullKlineData: 完整数据（100 根），用于指标计算
 * - displayKlineData: 显示数据（50 根），用于图表渲染
 */
export function useKlineChart({ symbol, initialInterval = '1h' }: UseKlineChartProps) {
  // ========== 状态管理 ==========
  const [interval, setInterval] = useState<KlineInterval>(initialInterval);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ 数据分离：完整数据（用于指标计算）和显示数据（用于图表渲染）
  const [fullKlineData, setFullKlineData] = useState<KlineBar[]>([]); // 100 根
  const [displayKlineData, setDisplayKlineData] = useState<KlineBar[]>([]); // 50 根

  // ========== Store ==========
  const { fetchKlines, subscribeBars } = useKlineStore();

  // ========== 响应式订阅启用的指标 ==========
  const enabledIndicators = useEnabledIndicators();

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
    currentKlineData: fullKlineData, // ✅ 传入完整数据
    onDataLoaded: (bars) => {
      setFullKlineData(bars);
      // ✅ 历史加载时，保持显示所有数据（不限制为 50 根）
      // 图表的可见范围由 timeScale.setVisibleRange 控制
      setDisplayKlineData(bars);
    },
    enabledIndicators, // ✅ 传入启用的指标列表
  });

  // ========== 4. K 线数据加载 ==========
  const { loadKlineData, unsubscribe } = useKlineDataLoader({
    symbol,
    chartRef,
    seriesRef,
    fetchKlines,
    subscribeBars,
    onDataLoaded: (barsOrUpdater) => {
      // ✅ 更新完整数据
      if (typeof barsOrUpdater === 'function') {
        setFullKlineData(barsOrUpdater);
      } else {
        setFullKlineData(barsOrUpdater);
      }
    },
    onDisplayDataLoaded: (barsOrUpdater) => {
      // ✅ 更新显示数据
      if (typeof barsOrUpdater === 'function') {
        setDisplayKlineData(barsOrUpdater);
      } else {
        setDisplayKlineData(barsOrUpdater);
      }
    },
    onOldestTimeUpdate: (time) => {
      oldestTimeRef.current = time;
    },
    enabledIndicators, // ✅ 传入启用的指标列表
  });

  // ========== 5. 指标渲染 ==========
  // ✅ 传入完整数据用于计算，显示数据用于过滤
  useIndicatorRenderer(chartRef, managerRef, fullKlineData, displayKlineData, enabledIndicators);

  // ========== 6. 指标图例 ==========
  const { legends } = useIndicatorLegend({
    chartRef,
    managerRef,
    enabledIndicators,
  });

  // ========== 7. 周期变化监听 ==========
  useEffect(() => {
    if (!seriesRef.current) {
      console.info('[useKlineChart] ⚠️ seriesRef.current 为 null，跳过加载');
      return;
    }

    console.info('[useKlineChart] 🔄 周期变化触发:', {
      interval,
      symbol,
      timestamp: Date.now(),
    });

    // 取消 WebSocket 订阅
    unsubscribe();

    // 重置历史加载状态
    resetHistory();

    // 清空数据
    setFullKlineData([]);
    setDisplayKlineData([]);
    setIsLoading(true);

    // 重新加载数据
    loadKlineData(interval).finally(() => {
      setIsLoading(false);
      console.info('[useKlineChart] ✅ 加载完成');
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
    legends,
  };
}
