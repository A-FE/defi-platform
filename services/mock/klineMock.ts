import { KlineBar, KlineInterval } from '@/types/market';

/**
 * K线 Mock 数据生成器
 */
export class KlineMockService {
  private basePrice = 50000; // BTC 基础价格
  private lastBar: KlineBar | null = null;

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

    for (let i = limit - 1; i >= 0; i--) {
      const time = endTime - i * (intervalMs / 1000);
      const bar = this.generateBar(time);
      bars.push(bar);
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
    // 基于上一根 K线生成新的，模拟连续性
    const prevClose = this.lastBar?.close || this.basePrice;

    // 随机波动 ±0.5%
    const change = (Math.random() - 0.5) * 0.01;
    const open = prevClose * (1 + change);

    // 高低价波动 ±0.3%
    const highChange = Math.random() * 0.003;
    const lowChange = Math.random() * 0.003;
    const high = open * (1 + highChange);
    const low = open * (1 - lowChange);

    // 收盘价在高低之间
    const close = low + Math.random() * (high - low);

    // 成交量 100-1000
    const volume = 100 + Math.random() * 900;

    return {
      time,
      open,
      high,
      low,
      close,
      volume,
    };
  }

  /**
   * 生成实时更新的 K线
   */
  generateRealtimeBar(interval: KlineInterval): KlineBar {
    const now = Math.floor(Date.now() / 1000);
    const intervalMs = this.getIntervalMs(interval);
    const barStartTime = Math.floor(now / (intervalMs / 1000)) * (intervalMs / 1000);

    return this.generateBar(barStartTime);
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
