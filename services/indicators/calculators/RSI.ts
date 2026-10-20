import { KlineBar } from '@/types/market';
import { SingleIndicatorValue } from '@/types/indicator';

/**
 * 计算 RSI（相对强弱指标）
 * @param bars K线数据
 * @param period 周期（默认 14）
 * @returns RSI 数据
 */
export function calculateRSI(
  bars: KlineBar[],
  period: number = 14
): SingleIndicatorValue[] {
  const result: SingleIndicatorValue[] = [];

  if (bars.length <= period) {
    return result;
  }

  // 计算价格变化
  const changes: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    changes.push(bars[i].close - bars[i - 1].close);
  }

  // 计算初始平均涨幅和跌幅
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // 计算第一个 RSI
  const rs = avgGain / (avgLoss || 1);
  const rsi = 100 - 100 / (1 + rs);

  result.push({
    time: bars[period].time,
    value: rsi,
  });

  // 使用平滑方法计算后续 RSI
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];

    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }

    const rs = avgGain / (avgLoss || 1);
    const rsi = 100 - 100 / (1 + rs);

    result.push({
      time: bars[i + 1].time,
      value: rsi,
    });
  }

  return result;
}
