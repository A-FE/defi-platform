import { useEffect } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { IndicatorManager } from '@/services/indicators/IndicatorManager';
import { KlineBar } from '@/types/market';
import { IndicatorConfig } from '@/types/indicator';

/**
 * 指标渲染 Hook
 * 职责：监听数据和配置变化，自动渲染指标
 */
export function useIndicatorRenderer(
  chartRef: React.RefObject<IChartApi | null>,
  managerRef: React.RefObject<IndicatorManager | null>,
  klineData: KlineBar[],
  enabledIndicators: IndicatorConfig[]
) {
  useEffect(() => {
    console.log('[useIndicatorRenderer] 🚀 useEffect 触发:', {
      hasManager: !!managerRef.current,
      hasChart: !!chartRef.current,
      dataLength: klineData.length,
      enabledCount: enabledIndicators.length,
      timestamp: Date.now(),
    });

    if (!managerRef.current || !chartRef.current || klineData.length === 0) {
      console.log('[useIndicatorRenderer] ⚠️ 条件不满足，跳过');
      return;
    }

    if (enabledIndicators.length === 0) {
      console.log('[useIndicatorRenderer] 📭 无启用指标，清空');
      managerRef.current.clear();
      return;
    }

    console.log('[useIndicatorRenderer] 更新指标:', {
      barsCount: klineData.length,
      indicators: enabledIndicators.map(c => c.type),
    });

    managerRef.current.updateIndicators(klineData, enabledIndicators);
  }, [chartRef, managerRef, klineData, enabledIndicators]);
}
