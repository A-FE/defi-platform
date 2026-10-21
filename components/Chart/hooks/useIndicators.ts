import { useEffect, useRef, useMemo } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useIndicatorStore } from '@/stores';
import { IndicatorManager } from '@/services/indicators/IndicatorManager';
import { IndicatorKlineItem } from '@/types/api';

/**
 * 指标管理 Hook V3 - 纯渲染版本
 * 职责：
 *  - 监听指标配置变化和数据变化
 *  - 使用 IndicatorManager 渲染指标（纯渲染，无计算）
 *  - 动态管理 pane：启用时创建，禁用时移除
 *
 * V3 改变（统一接口重构）：
 *  - 不再负责数据获取（数据由 useKlineData 管理）
 *  - 只接收 klineData 参数，监听变化自动渲染
 *  - 大幅简化逻辑，从 ~180 行 → ~80 行
 */
export function useIndicators(
  chartRef: React.RefObject<IChartApi | null>,
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>,
  klineData: IndicatorKlineItem[]  // ✅ 从外部接收完整数据
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
        seriesRef.current
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

  // ✅ 监听数据变化，自动渲染指标
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

    console.log('[useIndicators] Rendering indicators:', {
      barsCount: klineData.length,
      indicators: enabledConfigs.map(c => c.type),
    });

    managerRef.current.renderIndicators(klineData, enabledConfigs);
  }, [klineData, enabledIndicators, getEnabledIndicators]);

  // ✅ 不再返回任何方法（纯被动渲染）
  return {};
}
