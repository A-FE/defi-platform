/* eslint-disable max-lines-per-function */
import { useState, useEffect } from 'react';
import { useKlineStore } from '@/stores';
import { KlineInterval, KlineBar } from '@/types/market';

// 拆分后的子 Hooks
import { useChartInit } from './useChartInit';
import { useTimeFormatUpdate } from './useTimeFormatUpdate';
import { useKlineDataLoader } from './useKlineDataLoader';
import { useInfiniteLoadHistory } from './useInfiniteLoadHistory';
import { useIndicatorRendererV2 } from './useIndicatorRendererV2';
import { useEnabledIndicators } from './useEnabledIndicators';
import { useIndicatorLegend } from './useIndicatorLegend';
import { useCrosshairListener } from './useCrosshairListener';
import { useSeriesTypeSwitch } from './useSeriesTypeSwitch';

// Feature Flag
import { FEATURE_FLAGS, logFeatureFlag } from '@/services/indicators/v2/featureFlags';

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
 * ✅ 性能优化：移除双重数据状态，使用 useMemo 派生显示数据
 * - klineData: 完整数据（用于指标计算和图表渲染）
 * - 图表可见范围由 timeScale.setVisibleRange 控制
 */
export function useKlineChart({ symbol, initialInterval = '1h' }: UseKlineChartProps) {
  // ========== 状态管理 ==========
  const [interval, setInterval] = useState<KlineInterval>(initialInterval);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ 性能优化：只维护一份完整数据
  const [klineData, setKlineData] = useState<KlineBar[]>([]);

  // ========== Store ==========
  const { fetchKlines, subscribeBars } = useKlineStore();

  // ========== 响应式订阅启用的指标 ==========
  const enabledIndicators = useEnabledIndicators();

  // ========== 1. 图表初始化 ==========
  const { containerRef, chartRef, seriesRef, managerRef } = useChartInit();

  // ========== 2. 系列类型切换（K线 ↔ 分时）==========
  useSeriesTypeSwitch({
    chartRef,
    seriesRef,
    managerRef,
    interval,
  });

  // ========== 3. 时间格式更新 ==========
  useTimeFormatUpdate(chartRef, interval);

  // ========== 4. 无限滚动加载历史数据 ==========
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
    currentKlineData: klineData, // ✅ 使用统一的数据源
    onDataLoaded: (bars) => {
      setKlineData(bars);
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
      // ✅ 性能优化：统一数据更新
      if (typeof barsOrUpdater === 'function') {
        setKlineData(barsOrUpdater);
      } else {
        setKlineData(barsOrUpdater);
      }
    },
    onDisplayDataLoaded: (barsOrUpdater) => {
      // ✅ 保持兼容性：显示数据回调也更新同一份数据
      if (typeof barsOrUpdater === 'function') {
        setKlineData(barsOrUpdater);
      } else {
        setKlineData(barsOrUpdater);
      }
    },
    onOldestTimeUpdate: (time) => {
      oldestTimeRef.current = time;
    },
    enabledIndicators, // ✅ 传入启用的指标列表
  });

  // ========== 5. 指标渲染 ==========
  // ✅ 性能优化：使用统一的数据源
  // ✅ V2 架构：通过 Feature Flag 切换新旧版本
  useEffect(() => {
    logFeatureFlag('USE_INDICATOR_V2', 'useKlineChart');
  }, []);

  // ✅ 修复：避免条件调用 Hook，两个都调用，通过内部逻辑控制
  const useV2 = FEATURE_FLAGS.USE_INDICATOR_V2;

  // V2 Hook（总是调用，内部判断是否执行）
  useIndicatorRendererV2({
    chartRef,
    klineData,
    enabledIndicators,
    symbol,
    interval,
    enabled: useV2,
  });

  // 旧版 Hook（通过 enabled 控制）
  useEffect(() => {
    if (!useV2) {
      // 旧版渲染逻辑
      if (!chartRef.current || !managerRef.current || klineData.length === 0) {
        return;
      }

      managerRef.current.updateIndicators(
        klineData,
        klineData,
        enabledIndicators,
      );
    }
  }, [useV2, chartRef, managerRef, klineData, enabledIndicators]);

  // ========== 6. 指标图例 ==========
  const { legends } = useIndicatorLegend({
    chartRef,
    managerRef,
    enabledIndicators,
  });

  // ========== 7. 十字光标监听（供 PriceTicker 使用）==========
  useCrosshairListener({
    chartRef,
    seriesRef,
    symbol,
    klineData, // ✅ 使用统一的数据源
  });

  // ========== 8. 周期变化监听 ==========
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

    // ✅ 性能优化：清空统一的数据源
    setKlineData([]);
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
