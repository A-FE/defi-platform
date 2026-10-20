import { KlineBar } from '@/types/market';
import { MultiIndicatorValue } from '@/types/indicator';
import { calculateMA } from './MA';

/**
 * 计算布林带（Bollinger Bands）
 * @param bars K线数据
 * @param period 周期（默认 20）
 * @param stdDev 标准差倍数（默认 2）
 * @returns 布林带数据（上轨、中轨、下轨）
 */
export function calculateBOLL(
  bars: KlineBar[],
  period: number = 20,
  stdDev: number = 2
): MultiIndicatorValue[] {
  const result: MultiIndicatorValue[] = [];

  if (bars.length < period) {
    return result;
  }

  // 计算中轨（MA）
  const middleBand = calculateMA(bars, period);

  // 计算标准差和上下轨
  for (let i = 0; i < middleBand.length; i++) {
    const barIndex = i + period - 1;
    const slicedBars = bars.slice(barIndex - period + 1, barIndex + 1);

    // 计算标准差
    const mean = middleBand[i].value;
    const variance =
      slicedBars.reduce((acc, bar) => acc + Math.pow(bar.close - mean, 2), 0) /
      period;
    const standardDeviation = Math.sqrt(variance);

    // 上轨 = 中轨 + N倍标准差
    // 下轨 = 中轨 - N倍标准差
    result.push({
      time: middleBand[i].time,
      values: {
        upper: mean + stdDev * standardDeviation,
        middle: mean,
        lower: mean - stdDev * standardDeviation,
      },
    });
  }

  return result;
}
