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

/**
 * 获取成交量的涨跌信息（用于颜色区分）
 * @param bars K线数据
 * @returns 成交量涨跌数据
 */
export function calculateVOLWithTrend(
  bars: KlineBar[],
): Array<{ time: number; value: number; isUp: boolean }> {
  return bars.map((bar, index) => ({
    time: bar.time,
    value: bar.volume,
    isUp: index === 0 ? true : bar.close >= bar.open,
  }));
}
