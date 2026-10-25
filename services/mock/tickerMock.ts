import { TickerData } from '@/types/market';
import { getPriceConfig } from './priceConfig';

/**
 * Ticker Mock 数据生成器
 */
export class TickerMockService {
  // 为每个交易对维护独立的价格状态
  private priceStates: Map<string, {
    currentPrice: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  }> = new Map();

  /**
   * 获取或初始化交易对的价格状态
   */
  private getPriceState(symbol: string) {
    if (!this.priceStates.has(symbol)) {
      const config = getPriceConfig(symbol);
      this.priceStates.set(symbol, {
        currentPrice: config.basePrice,
        high24h: config.basePrice * 1.02,
        low24h: config.basePrice * 0.98,
        volume24h: config.volume24h,
      });
    }
    const state = this.priceStates.get(symbol);
    if (!state) {throw new Error(`No state for symbol: ${symbol}`);}
    return state;
  }

  /**
   * 生成 Ticker 数据
   */
  generateTicker(symbol: string): TickerData {
    const config = getPriceConfig(symbol);
    const state = this.getPriceState(symbol);

    // 根据波动率计算随机价格变化
    const change = (Math.random() - 0.5) * config.volatility * 0.1;
    const newPrice = state.currentPrice * (1 + change);

    // 确保价格在合理范围内（基础价格的 ±20%）
    const minPrice = config.basePrice * 0.8;
    const maxPrice = config.basePrice * 1.2;
    const price = Math.max(minPrice, Math.min(maxPrice, newPrice));

    // 24h 涨跌幅（基于基础价格）
    const change24h = ((price - config.basePrice) / config.basePrice) * 100;

    // 更新状态
    state.currentPrice = price;
    if (price > state.high24h) {state.high24h = price;}
    if (price < state.low24h) {state.low24h = price;}

    // 根据价格精度格式化
    const decimals = config.basePrice >= 100 ? 2 : config.basePrice >= 1 ? 3 : 5;

    return {
      symbol,
      price: parseFloat(price.toFixed(decimals)),
      change24h: parseFloat(change24h.toFixed(2)),
      volume24h: state.volume24h,
      high24h: parseFloat(state.high24h.toFixed(decimals)),
      low24h: parseFloat(state.low24h.toFixed(decimals)),
      timestamp: Date.now(),
    };
  }

  /**
   * 重置 24h 统计数据
   */
  reset24hStats(symbol: string): void {
    const state = this.getPriceState(symbol);
    state.high24h = state.currentPrice;
    state.low24h = state.currentPrice;
    state.volume24h = 0;
  }

  /**
   * 清空所有状态（用于测试）
   */
  clearAll(): void {
    this.priceStates.clear();
  }
}

// 导出单例
export const tickerMockService = new TickerMockService();
