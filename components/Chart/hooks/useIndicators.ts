import { useEffect, useRef, useMemo } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useIndicatorStore } from '@/stores';
import { IndicatorManager } from '@/services/indicators/IndicatorManager';
import { KlineBar } from '@/types/market';

/**
 * 指标管理 Hook V4 - 前端计算版本
 * 职责：
 *  - 监听指标配置变化和数据变化
 *  - 使用 IndicatorManager 计算+渲染指标（前端计算）
 *  - 动态管理 pane：启用时创建，禁用时移除
 *
 * V4 改变（前端计算重构）：
 *  - 接收原始 KlineBar[]，不再是 IndicatorKlineItem[]
 *  - IndicatorManager 内部负责计算指标
 *  - 参数变化时立即重新计算，无网络延迟
 */
export function useIndicators(
  chartRef: React.RefObject<IChartApi | null>,
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>,
  klineData: KlineBar[],  // ✅ 改为原始 KlineBar[]
) {
  const managerRef = useRef<IndicatorManager | null>(null);
  const { configs, getEnabledIndicators } = useIndicatorStore();

  // 使用 useMemo 来避免不必要的重新计算
  const enabledIndicators = useMemo(() => {
    return getEnabledIndicators();
  }, [configs, getEnabledIndicators]);

  // 初始化 IndicatorManager
  useEffect(() => {
    if (chartRef.current && seriesRef.current && !managerRef.current) {
      managerRef.current = new IndicatorManager(
        chartRef.current,
        seriesRef.current,
      );
      console.log('[useIndicators] IndicatorManager initialized');
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.clear();
        managerRef.current = null;
      }
    };
  }, [chartRef, seriesRef]);

  // ✅ 监听数据变化，自动计算+渲染指标
  useEffect(() => {
    if (!managerRef.current || klineData.length === 0) {
      return;
    }

    const enabledConfigs = getEnabledIndicators();

    if (enabledConfigs.length === 0) {
      console.log('[useIndicators] No enabled indicators, clearing');
      managerRef.current.clear();
      return;
    }

    console.log('[useIndicators] Updating indicators:', {
      barsCount: klineData.length,
      indicators: enabledConfigs.map(c => c.type),
    });

    // ✅ 前端计算+渲染（一次调用完成）
    managerRef.current.updateIndicators(klineData, enabledConfigs);
  }, [klineData, enabledIndicators, getEnabledIndicators]);

  // ✅ 不再返回任何方法（纯被动渲染）
  return {};
}
