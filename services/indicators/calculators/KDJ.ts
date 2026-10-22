import { KlineBar } from '@/types/market';
import { MultiIndicatorValue } from '@/types/indicator';

/**
 * 计算 KDJ
 * @param bars K线数据
 * @param period RSV 周期（默认 9）
 * @param kPeriod K 值平滑周期（默认 3）
 * @param dPeriod D 值平滑周期（默认 3）
 * @returns KDJ 数据（K、D、J）
 */
export function calculateKDJ(
  bars: KlineBar[],
  period: number = 9,
  kPeriod: number = 3,
  dPeriod: number = 3,
): MultiIndicatorValue[] {
  const result: MultiIndicatorValue[] = [];

  if (bars.length < period) {
    return result;
  }

  let k = 50; // K 初始值
  let d = 50; // D 初始值

  for (let i = period - 1; i < bars.length; i++) {
    // 计算 N 周期内的最高价和最低价
    const slicedBars = bars.slice(i - period + 1, i + 1);
    const high = Math.max(...slicedBars.map((bar) => bar.high));
    const low = Math.min(...slicedBars.map((bar) => bar.low));
    const close = bars[i].close;

    // 计算 RSV = (收盘价 - 最低价) / (最高价 - 最低价) * 100
    const rsv = high === low ? 50 : ((close - low) / (high - low)) * 100;

    // K = (2/3) × 前一日K + (1/3) × RSV
    k = (2 / kPeriod) * k + (1 / kPeriod) * rsv;

    // D = (2/3) × 前一日D + (1/3) × K
    d = (2 / dPeriod) * d + (1 / dPeriod) * k;

    // J = 3K - 2D
    const j = 3 * k - 2 * d;

    result.push({
      time: bars[i].time,
      values: {
        k,
        d,
        j,
      },
    });
  }

  return result;
}
