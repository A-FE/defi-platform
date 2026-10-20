import { useEffect, useRef, useMemo } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useIndicatorStore } from '@/stores';
import { IndicatorManager } from '@/services/indicators';
import { KlineBar } from '@/types/market';

/**
 * 指标管理 Hook
 * 职责：
 *  - 监听指标配置变化
 *  - 调用 IndicatorManager 渲染指标
 *  - 处理实时更新
 *  - 支持主图和副图
 */
export function useIndicators(
  chartRef: React.RefObject<IChartApi | null>,
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>,
  bars: KlineBar[],
  subChartRef?: React.RefObject<IChartApi | null>
) {
  const managerRef = useRef<IndicatorManager | null>(null);
  const { configs } = useIndicatorStore();

  // 使用 useMemo 来避免不必要的重新计算
  const enabledIndicators = useMemo(() => {
    return Object.values(configs).filter((c) => c.enabled);
  }, [configs]);

  // 初始化 IndicatorManager
  useEffect(() => {
    if (chartRef.current && seriesRef.current && !managerRef.current) {
      managerRef.current = new IndicatorManager(
        chartRef.current,
        seriesRef.current,
        subChartRef?.current || undefined
      );
    }

    // 副图初始化后，更新 IndicatorManager
    if (managerRef.current && subChartRef?.current) {
      managerRef.current.setSubChart(subChartRef.current);
    }

    return () => {
      if (managerRef.current) {
        managerRef.current.clear();
        managerRef.current = null;
      }
    };
  }, [chartRef, seriesRef, subChartRef]);

  // 监听指标配置变化，重新渲染
  useEffect(() => {
    if (!managerRef.current || bars.length === 0) {
      return;
    }

    // 清空旧指标
    managerRef.current.clear();

    // 添加新指标
    enabledIndicators.forEach((config) => {
      managerRef.current?.addIndicator(config, bars);
    });
  }, [enabledIndicators, bars]);

  // 实时更新指标（在 useKlineData 的订阅回调中调用）
  const updateRealtimeIndicators = (bar: KlineBar, allBars: KlineBar[]) => {
    if (managerRef.current && enabledIndicators.length > 0) {
      managerRef.current.updateRealtimeBar(bar, enabledIndicators, allBars);
    }
  };

  return { updateRealtimeIndicators };
}
