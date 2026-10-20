import { KlineBar } from '@/types/market';
import { MultiIndicatorValue } from '@/types/indicator';
import { calculateEMA, calculateEMAFromValues } from './EMA';

/**
 * 计算 MACD
 * @param bars K线数据
 * @param fastPeriod 快线周期（默认 12）
 * @param slowPeriod 慢线周期（默认 26）
 * @param signalPeriod 信号线周期（默认 9）
 * @returns MACD 数据（DIF、DEA、MACD柱）
 */
export function calculateMACD(
  bars: KlineBar[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MultiIndicatorValue[] {
  const result: MultiIndicatorValue[] = [];

  if (bars.length < slowPeriod) {
    return result;
  }

  // 计算快线和慢线 EMA
  const emaFast = calculateEMA(bars, fastPeriod);
  const emaSlow = calculateEMA(bars, slowPeriod);

  // 计算 DIF = EMA(12) - EMA(26)
  const dif: { time: number; value: number }[] = [];
  const minLength = Math.min(emaFast.length, emaSlow.length);

  for (let i = 0; i < minLength; i++) {
    // 找到对应的时间点
    const fastValue = emaFast.find((v) => v.time === emaSlow[i].time);
    if (fastValue) {
      dif.push({
        time: emaSlow[i].time,
        value: fastValue.value - emaSlow[i].value,
      });
    }
  }

  if (dif.length < signalPeriod) {
    return result;
  }

  // 计算 DEA = EMA(DIF, 9)
  const dea = calculateEMAFromValues(dif, signalPeriod);

  // 计算 MACD = (DIF - DEA) * 2
  for (let i = 0; i < dea.length; i++) {
    const difValue = dif.find((v) => v.time === dea[i].time);
    if (difValue) {
      result.push({
        time: dea[i].time,
        values: {
          dif: difValue.value,
          dea: dea[i].value,
          macd: (difValue.value - dea[i].value) * 2,
        },
      });
    }
  }

  return result;
}
