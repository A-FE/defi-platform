import { useEffect } from 'react';
import type { IChartApi } from 'lightweight-charts';
import { KlineInterval } from '@/types/market';
import { getTimeFormatOptions } from './utils/chartTimeFormat';

/**
 * 图表时间格式更新 Hook
 * 职责：根据周期变化更新时间轴格式
 */
export function useTimeFormatUpdate(
  chartRef: React.RefObject<IChartApi | null>,
  interval: KlineInterval,
) {
  useEffect(() => {
    if (!chartRef.current) {return;}

    const timeFormatOptions = getTimeFormatOptions(interval);

    try {
      chartRef.current.applyOptions({
        timeScale: timeFormatOptions,
      });

      console.info('[useTimeFormatUpdate] Updated for interval:', interval);
    } catch (error) {
      console.error('[useTimeFormatUpdate] Failed:', error);
    }
  }, [chartRef, interval]);
}
