/**
 * 指标渲染 Hook（V2 版本）
 *
 * 这个 Hook 用于替换旧的 useIndicatorRenderer
 * 使用新的 IndicatorOrchestrator 架构
 */

import { useEffect, useRef } from 'react';
import { IChartApi } from 'lightweight-charts';
import { KlineBar } from '@/types/market';
import { IndicatorConfig as LegacyIndicatorConfig } from '@/types/indicator';
import { IndicatorOrchestrator } from '@/services/indicators/v2';

interface UseIndicatorRendererV2Props {
  chartRef: React.MutableRefObject<IChartApi | null>;
  klineData: KlineBar[];
  enabledIndicators: LegacyIndicatorConfig[];
  symbol: string;
  interval: string;
  enabled?: boolean; // 是否启用 V2
}

/**
 * 指标渲染 Hook V2
 *
 * 使用新的 IndicatorOrchestrator 替代旧的 IndicatorManager
 */
export function useIndicatorRendererV2({
  chartRef,
  klineData,
  enabledIndicators,
  symbol,
  interval,
  enabled = true,
}: UseIndicatorRendererV2Props) {
  const orchestratorRef = useRef<IndicatorOrchestrator | null>(null);

  // 初始化 Orchestrator
  useEffect(() => {
    if (!enabled || !chartRef.current) {
      return;
    }

    if (!orchestratorRef.current) {
      orchestratorRef.current = new IndicatorOrchestrator(chartRef.current);
      console.info('[useIndicatorRendererV2] ✅ Orchestrator initialized');
    }

    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.clear();
        orchestratorRef.current = null;
        console.info('[useIndicatorRendererV2] ❌ Orchestrator destroyed');
      }
    };
  }, [enabled, chartRef]);

  // 更新指标
  useEffect(() => {
    if (!enabled || !orchestratorRef.current || klineData.length === 0 || enabledIndicators.length === 0) {
      return;
    }

    console.info('[useIndicatorRendererV2] 🔄 Updating indicators:', {
      symbol,
      interval,
      barsCount: klineData.length,
      timeRange: klineData.length > 0 ? `${klineData[0]?.time} ~ ${klineData[klineData.length - 1]?.time}` : 'empty',
      indicators: enabledIndicators.map(i => i.type),
    });

    // 异步更新，避免阻塞主线程
    const updateAsync = async () => {
      try {
        await orchestratorRef.current?.updateIndicators(
          symbol,
          interval,
          klineData,
          enabledIndicators,
        );
      } catch (error) {
        console.error('[useIndicatorRendererV2] Failed to update indicators:', error);
      }
    };

    updateAsync();
  }, [enabled, symbol, interval, klineData, enabledIndicators]);

  // 不返回 ref，避免在 render 时访问
  return {};
}
