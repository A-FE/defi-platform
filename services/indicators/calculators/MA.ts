import { KlineBar } from '@/types/market';
import { SingleIndicatorValue } from '@/types/indicator';

/**
 * 计算简单移动平均线（SMA）
 * @param bars K线数据
 * @param period 周期
 * @returns 移动平均线数据
 */
export function calculateMA(
  bars: KlineBar[],
  period: number
): SingleIndicatorValue[] {
  const result: SingleIndicatorValue[] = [];

  if (bars.length < period) {
    return result;
  }

  for (let i = period - 1; i < bars.length; i++) {
    const sum = bars
      .slice(i - period + 1, i + 1)
      .reduce((acc, bar) => acc + bar.close, 0);

    result.push({
      time: bars[i].time,
      value: sum / period,
    });
  }

  return result;
}

/**
 * 计算多周期移动平均线
 * @param bars K线数据
 * @param periods 周期数组，如 [5, 10, 20, 30]
 * @returns 多条移动平均线数据
 */
export function calculateMultiMA(
  bars: KlineBar[],
  periods: number[]
): Record<string, SingleIndicatorValue[]> {
  const result: Record<string, SingleIndicatorValue[]> = {};

  periods.forEach((period) => {
    result[`MA${period}`] = calculateMA(bars, period);
  });

  return result;
}
