import { KlineBar, KlineInterval } from '@/types/market';

/**
 * K线 Mock 数据生成器
 * 生成符合真实市场特征的 K 线数据
 */
export class KlineMockService {
  private basePrice = 50000; // BTC 基础价格
  private lastBar: KlineBar | null = null;
  private trend = 0; // 当前趋势方向 (-1 到 1)
  private trendStrength = 0; // 趋势强度

  /**
   * 生成历史 K线数据
   */
  generateHistory(
    symbol: string,
    interval: KlineInterval,
    limit: number,
    before?: number
  ): KlineBar[] {
    const bars: KlineBar[] = [];
    const intervalMs = this.getIntervalMs(interval);
    const endTime = before || Math.floor(Date.now() / 1000);

    // 重置状态
    this.lastBar = null;
    this.trend = (Math.random() - 0.5) * 2; // 随机初始趋势
    this.trendStrength = 0.3 + Math.random() * 0.4; // 趋势强度 0.3-0.7

    for (let i = limit - 1; i >= 0; i--) {
      const time = endTime - i * (intervalMs / 1000);
      const bar = this.generateBar(time);
      bars.push(bar);

      // 每隔一段时间随机改变趋势（模拟市场反转）
      if (Math.random() < 0.05) {
        this.trend = (Math.random() - 0.5) * 2;
        this.trendStrength = 0.2 + Math.random() * 0.5;
      }
    }

    if (bars.length > 0) {
      this.lastBar = bars[bars.length - 1];
    }

    return bars;
  }

  /**
   * 生成单根 K线
   */
  generateBar(time: number): KlineBar {
    // 1. Open = 上一根的 Close（K 线连续性）
    const open = this.lastBar?.close || this.basePrice;

    // 2. 计算趋势性变化（带有趋势的随机游走）
    const trendMove = this.trend * this.trendStrength * 0.01; // 趋势移动 ±0.3% - ±0.7%
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

    const bar: KlineBar = {
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(2)),
    };

    this.lastBar = bar;
    return bar;
  }

  /**
   * 生成实时更新的 K线（不修改 lastBar 状态）
   */
  generateRealtimeBar(interval: KlineInterval, prevClose?: number): KlineBar {
    const now = Math.floor(Date.now() / 1000);
    const intervalMs = this.getIntervalMs(interval);
    const barStartTime = Math.floor(now / (intervalMs / 1000)) * (intervalMs / 1000);

    // 使用提供的 prevClose 或当前的 lastBar.close
    const open = prevClose || this.lastBar?.close || this.basePrice;

    // 计算趋势性变化
    const trendMove = this.trend * this.trendStrength * 0.01;
    const randomMove = (Math.random() - 0.5) * 0.02;
    const totalMove = trendMove + randomMove;

    const close = open * (1 + totalMove);

    // 计算 High 和 Low
    const volatility = 0.005 + Math.random() * 0.015;
    const upperWick = Math.random() * volatility;
    const lowerWick = Math.random() * volatility;

    const maxPrice = Math.max(open, close);
    const minPrice = Math.min(open, close);

    const high = maxPrice * (1 + upperWick);
    const low = minPrice * (1 - lowerWick);

    // 成交量
    const baseVolume = 500 + Math.random() * 1500;
    const trendMultiplier = 1 + Math.abs(totalMove) * 50;
    const volume = baseVolume * trendMultiplier;

    return {
      time: barStartTime,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(2)),
    };
  }

  /**
   * 获取周期对应的毫秒数
   */
  private getIntervalMs(interval: KlineInterval): number {
    const map: Record<KlineInterval, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };
    return map[interval];
  }
}

// 导出单例
export const klineMockService = new KlineMockService();
