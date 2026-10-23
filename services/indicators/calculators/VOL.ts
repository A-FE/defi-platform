import { KlineBar } from '@/types/market';
import { SingleIndicatorValue } from '@/types/indicator';

/**
 * 计算成交量数据（用于图表渲染）
 * @param bars K线数据
 * @returns 成交量数据
 */
export function calculateVOL(bars: KlineBar[]): SingleIndicatorValue[] {
  return bars.map((bar) => ({
    time: bar.time,
    value: bar.volume,
  }));
}
