import { KlineBar } from '@/types/market';

/**
 * 价格生成器
 * 职责：无状态的价格计算，模拟真实市场特征
 */
export class PriceGenerator {
  /**
   * 生成新的 K线价格数据
   * @param prevClose 前一根 K线的收盘价
   * @param trend 趋势方向 (-1 到 1)
   * @param trendStrength 趋势强度 (0 到 1)
   * @returns 包含 open, high, low, close, volume 的对象
   */
  static generate(
    prevClose: number,
    trend: number,
    trendStrength: number
  ): Omit<KlineBar, 'time'> {
    // 1. Open = 上一根的 Close（K线连续性）
    const open = prevClose;

    // 2. 计算趋势性变化（带有趋势的随机游走）
    const trendMove = trend * trendStrength * 0.01; // 趋势移动 ±0.3% - ±0.7%
    const randomMove = (Math.random() - 0.5) * 0.02; // 随机噪音 ±1%
    const totalMove = trendMove + randomMove;

    // 3. 计算 Close（基于 open 和总体移动）
    const close = open * (1 + totalMove);

    // 4. 计算 High 和 Low（模拟价格波动范围）
    const volatility = 0.005 + Math.random() * 0.015; // 波动率 0.5% - 2%
    const upperWick = Math.random() * volatility; // 上影线
    const lowerWick = Math.random() * volatility; // 下影线

    // High 和 Low 必须包含 Open 和 Close
    const maxPrice = Math.max(open, close);
    const minPrice = Math.min(open, close);

    const high = maxPrice * (1 + upperWick);
    const low = minPrice * (1 - lowerWick);

    // 5. 成交量（趋势强时成交量大）
    const baseVolume = 500 + Math.random() * 1500;
    const trendMultiplier = 1 + Math.abs(totalMove) * 50; // 波动大时成交量增加
    const volume = baseVolume * trendMultiplier;

    return {
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(2)),
    };
  }

  /**
   * 生成K线更新数据（用于更新当前K线，不改变 open）
   * @param currentOpen 当前K线的开盘价（保持不变）
   * @param currentHigh 当前K线的最高价
   * @param currentLow 当前K线的最低价
   * @param currentVolume 当前K线的累计成交量
   * @param trend 趋势方向 (-1 到 1)
   * @param trendStrength 趋势强度 (0 到 1)
   * @returns 更新后的 K线数据
   */
  static generateUpdate(
    currentOpen: number,
    currentHigh: number,
    currentLow: number,
    currentVolume: number,
    trend: number,
    trendStrength: number
  ): Omit<KlineBar, 'time'> {
    // 1. Open 保持不变
    const open = currentOpen;

    // 2. 计算新的 Close（基于 open 的随机游走）
    const trendMove = trend * trendStrength * 0.01;
    const randomMove = (Math.random() - 0.5) * 0.02;
    const totalMove = trendMove + randomMove;
    const close = open * (1 + totalMove);

    // 3. 更新 High 和 Low（只能扩大范围）
    const volatility = 0.005 + Math.random() * 0.015;
    const upperWick = Math.random() * volatility;
    const lowerWick = Math.random() * volatility;

    const maxPrice = Math.max(open, close);
    const minPrice = Math.min(open, close);

    const newHigh = maxPrice * (1 + upperWick);
    const newLow = minPrice * (1 - lowerWick);

    // High 只能增加，Low 只能减少
    const high = Math.max(currentHigh, newHigh);
    const low = Math.min(currentLow, newLow);

    // 4. 累加成交量
    const additionalVolume = (100 + Math.random() * 200) * (1 + Math.abs(totalMove) * 10);
    const volume = currentVolume + additionalVolume;

    return {
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(2)),
    };
  }

  /**
   * 生成随机趋势参数
   */
  static generateTrendParams(): { trend: number; trendStrength: number } {
    return {
      trend: (Math.random() - 0.5) * 2, // -1 到 1
      trendStrength: 0.3 + Math.random() * 0.4, // 0.3 到 0.7
    };
  }

  /**
   * 判断是否应该改变趋势（模拟市场反转）
   * @param probability 反转概率 (0 到 1)
   */
  static shouldChangeTrend(probability: number = 0.05): boolean {
    return Math.random() < probability;
  }
}
