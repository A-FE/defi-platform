import { KlineBar } from '@/types/market';
import { SingleIndicatorValue } from '@/types/indicator';

/**
 * 计算指数移动平均线（EMA）
 * @param bars K线数据
 * @param period 周期
 * @returns EMA 数据
 */
export function calculateEMA(
  bars: KlineBar[],
  period: number
): SingleIndicatorValue[] {
  const result: SingleIndicatorValue[] = [];

  if (bars.length < period) {
    return result;
  }

  // 计算乘数
  const multiplier = 2 / (period + 1);

  // 第一个 EMA 使用 SMA
  const firstSum = bars
    .slice(0, period)
    .reduce((acc, bar) => acc + bar.close, 0);
  let ema = firstSum / period;

  result.push({
    time: bars[period - 1].time,
    value: ema,
  });

  // 后续 EMA = (当前价格 - 昨日EMA) × 乘数 + 昨日EMA
  for (let i = period; i < bars.length; i++) {
    ema = (bars[i].close - ema) * multiplier + ema;
    result.push({
      time: bars[i].time,
      value: ema,
    });
  }

  return result;
}

/**
 * 从值数组计算 EMA（用于 MACD 等）
 * @param values 值数组
 * @param period 周期
 * @returns EMA 数据
 */
export function calculateEMAFromValues(
  values: SingleIndicatorValue[],
  period: number
): SingleIndicatorValue[] {
  const result: SingleIndicatorValue[] = [];

  if (values.length < period) {
    return result;
  }

  const multiplier = 2 / (period + 1);

  // 第一个 EMA 使用 SMA
  const firstSum = values
    .slice(0, period)
    .reduce((acc, v) => acc + v.value, 0);
  let ema = firstSum / period;

  result.push({
    time: values[period - 1].time,
    value: ema,
  });

  // 后续 EMA
  for (let i = period; i < values.length; i++) {
    ema = (values[i].value - ema) * multiplier + ema;
    result.push({
      time: values[i].time,
      value: ema,
    });
  }

  return result;
}

/**
 * 计算多周期 EMA
 * @param bars K线数据
 * @param periods 周期数组
 * @returns 多条 EMA 数据
 */
export function calculateMultiEMA(
  bars: KlineBar[],
  periods: number[]
): Record<string, SingleIndicatorValue[]> {
  const result: Record<string, SingleIndicatorValue[]> = {};

  periods.forEach((period) => {
    result[`EMA${period}`] = calculateEMA(bars, period);
  });

  return result;
}
