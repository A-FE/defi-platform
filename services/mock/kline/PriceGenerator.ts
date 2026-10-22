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

    // 2. ✅ 大幅减小新 bar 的变化幅度（±0.3%）避免跳空
    const maxMove = 0.003; // 0.3%（原来是 1%）
    const trendMove = trend * trendStrength * 0.002; // 趋势移动 ±0.06% - ±0.14%
    const randomMove = (Math.random() - 0.5) * 0.003; // 随机噪音 ±0.15%
    const rawTotalMove = trendMove + randomMove;

    // ✅ 限制总变化在 ±0.3%
    const totalMove = Math.max(-maxMove, Math.min(maxMove, rawTotalMove));

    // 3. 计算 Close（基于 open 和总体移动）
    const close = open * (1 + totalMove);

    // 4. 计算 High 和 Low（减小影线波动）
    const volatility = 0.001 + Math.random() * 0.002; // ✅ 减小波动率 0.1% - 0.3%（原来是 0.5% - 1.5%）
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

    // 2. ✅ 限制单次更新的变化幅度（±0.5%）
    const maxSingleMove = 0.005; // 0.5%
    const trendMove = trend * trendStrength * 0.003; // ±0.09% - ±0.21%
    const randomMove = (Math.random() - 0.5) * 0.006; // ±0.3%
    const rawTotalMove = trendMove + randomMove;

    // ✅ 限制在 ±0.5%
    const totalMove = Math.max(-maxSingleMove, Math.min(maxSingleMove, rawTotalMove));

    // 3. 计算新的 Close
    let close = open * (1 + totalMove);

    // ✅ 限制相对于 open 的总变化在 ±3%
    const maxTotalChange = 0.03; // 3%
    const minClose = open * (1 - maxTotalChange);
    const maxClose = open * (1 + maxTotalChange);
    close = Math.max(minClose, Math.min(maxClose, close));

    // 4. 更新 High 和 Low（只能扩大范围）
    const volatility = 0.002 + Math.random() * 0.006; // ✅ 减小波动 0.2% - 0.8%
    const upperWick = Math.random() * volatility;
    const lowerWick = Math.random() * volatility;

    const maxPrice = Math.max(open, close);
    const minPrice = Math.min(open, close);

    const newHigh = maxPrice * (1 + upperWick);
    const newLow = minPrice * (1 - lowerWick);

    // High 只能增加，Low 只能减少
    const high = Math.max(currentHigh, newHigh);
    const low = Math.min(currentLow, newLow);

    // 5. 累加成交量
    const additionalVolume = (50 + Math.random() * 150) * (1 + Math.abs(totalMove) * 10);
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
