import { useEffect, useRef } from 'react';
import { CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { KlineInterval } from '@/types/market';
import type { IndicatorManager } from '@/services/indicators/IndicatorManager';

interface UseSeriesTypeSwitchProps {
  chartRef: React.MutableRefObject<IChartApi | null>;
  seriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>;
  managerRef: React.MutableRefObject<IndicatorManager | null>;
  interval: KlineInterval;
}

/**
 * 系列类型切换 Hook
 * 职责：根据 interval 动态切换 CandlestickSeries 和 LineSeries
 *
 * ⚠️ 注意：切换系列后不立即设置数据，数据由外部的数据加载逻辑统一设置
 * ✅ 修复：切换时清理指标管理器，避免残留的指标线条
 */
export function useSeriesTypeSwitch({
  chartRef,
  seriesRef,
  managerRef,
  interval,
}: UseSeriesTypeSwitchProps) {
  // 记录上一次的系列类型
  const prevSeriesTypeRef = useRef<'candlestick' | 'line'>('candlestick');

  useEffect(() => {
    if (!chartRef.current) {return;}

    const isTimesharing = interval === 'timesharing';
    const currentSeriesType = isTimesharing ? 'line' : 'candlestick';

    // 如果系列类型没有变化，不需要重建
    if (currentSeriesType === prevSeriesTypeRef.current) {
      return;
    }

    console.info('[useSeriesTypeSwitch] 切换系列类型:', {
      from: prevSeriesTypeRef.current,
      to: currentSeriesType,
      interval,
    });

    try {
      // 0. ✅ 只有在分时与其他周期之间切换时，才清理指标管理器
      // K线周期之间切换（1m → 5m）不需要清理指标
      const isCrossingTimesharingBoundary =
        (prevSeriesTypeRef.current === 'line' && currentSeriesType === 'candlestick') ||
        (prevSeriesTypeRef.current === 'candlestick' && currentSeriesType === 'line');

      if (isCrossingTimesharingBoundary && managerRef.current) {
        managerRef.current.clear();
      }

      // 1. 移除旧系列
      if (seriesRef.current) {
        chartRef.current.removeSeries(seriesRef.current);
        seriesRef.current = null;
      }

      // 2. 创建新系列
      if (isTimesharing) {
        // 创建 LineSeries（分时图）
        const lineSeries = chartRef.current.addSeries(LineSeries, {
          color: '#2962FF',
          lineWidth: 2,
          priceLineVisible: true,
          lastValueVisible: true,
        }, 0);

        seriesRef.current = lineSeries;
      } else {
        // 创建 CandlestickSeries（K线图）
        const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
          upColor: '#10b981',
          downColor: '#ef4444',
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
          priceLineVisible: false,
        }, 0);

        seriesRef.current = candlestickSeries;
      }

      // 3. ✅ 不在这里设置数据，让数据加载逻辑统一处理
      // 数据会在周期变化时由 useKlineChart 中的 loadKlineData 重新加载

      // 4. 更新记录
      prevSeriesTypeRef.current = currentSeriesType;

      console.info('[useSeriesTypeSwitch] ✅ 系列切换完成，等待数据加载');
    } catch (error) {
      console.error('[useSeriesTypeSwitch] ❌ 系列切换失败:', error);
    }
  }, [chartRef, seriesRef, managerRef, interval]);
}
