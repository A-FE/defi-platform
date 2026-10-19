import { TickerData } from '@/types/market';

/**
 * Ticker Mock 数据生成器
 */
export class TickerMockService {
  private basePrice = 50000; // BTC 基础价格
  private high24h = 51000;
  private low24h = 49000;
  private volume24h = 12345678;

  /**
   * 生成 Ticker 数据
   */
  generateTicker(symbol: string): TickerData {
    // 随机价格波动 ±0.1%
    const change = (Math.random() - 0.5) * 0.002;
    const price = this.basePrice * (1 + change);

    // 24h 涨跌幅 -5% ~ +5%
    const change24h = -5 + Math.random() * 10;

    // 更新基础价格
    this.basePrice = price;

    // 更新 24h 高低价
    if (price > this.high24h) this.high24h = price;
    if (price < this.low24h) this.low24h = price;

    return {
      symbol,
      price: parseFloat(price.toFixed(2)),
      change24h: parseFloat(change24h.toFixed(2)),
      volume24h: this.volume24h,
      high24h: parseFloat(this.high24h.toFixed(2)),
      low24h: parseFloat(this.low24h.toFixed(2)),
      timestamp: Date.now(),
    };
  }

  /**
   * 重置 24h 统计数据
   */
  reset24hStats(): void {
    this.high24h = this.basePrice;
    this.low24h = this.basePrice;
    this.volume24h = 0;
  }
}

// 导出单例
export const tickerMockService = new TickerMockService();
