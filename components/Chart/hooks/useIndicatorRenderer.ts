import { useEffect } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { IndicatorManager } from '@/services/indicators/IndicatorManager';
import { KlineBar } from '@/types/market';
import { IndicatorConfig } from '@/types/indicator';

/**
 * 指标渲染 Hook
 * 职责：监听数据和配置变化，自动渲染指标
 *
 * 数据分离策略：
 * - fullKlineData: 完整数据（100 根），用于指标计算
 * - displayKlineData: 显示数据（50 根），用于过滤指标结果
 */
export function useIndicatorRenderer(
  chartRef: React.RefObject<IChartApi | null>,
  managerRef: React.RefObject<IndicatorManager | null>,
  fullKlineData: KlineBar[], // ✅ 完整数据（用于计算）
  displayKlineData: KlineBar[], // ✅ 显示数据（用于过滤）
  enabledIndicators: IndicatorConfig[]
) {
  useEffect(() => {
    console.log('[useIndicatorRenderer] 🚀 useEffect 触发:', {
      hasManager: !!managerRef.current,
      hasChart: !!chartRef.current,
      fullDataLength: fullKlineData.length,
      displayDataLength: displayKlineData.length,
      enabledCount: enabledIndicators.length,
      timestamp: Date.now(),
    });

    if (!managerRef.current || !chartRef.current || fullKlineData.length === 0) {
      console.log('[useIndicatorRenderer] ⚠️ 条件不满足，跳过');
      return;
    }

    if (enabledIndicators.length === 0) {
      console.log('[useIndicatorRenderer] 📭 无启用指标，清空');
      managerRef.current.clear();
      return;
    }

    console.log('[useIndicatorRenderer] 更新指标:', {
      fullBarsCount: fullKlineData.length,
      displayBarsCount: displayKlineData.length,
      indicators: enabledIndicators.map(c => c.type),
    });

    // ✅ 传入完整数据和显示数据
    managerRef.current.updateIndicators(fullKlineData, displayKlineData, enabledIndicators);
  }, [chartRef, managerRef, fullKlineData, displayKlineData, enabledIndicators]);
}
