import { DepthItem, DepthData } from '@/types/market';
import { getPriceConfig } from './priceConfig';

/**
 * 订单簿 Mock 数据生成器
 */
export class DepthMockService {
  // 为每个交易对维护独立的价格和序列号
  private states: Map<string, {
    basePrice: number;
    sequence: number;
  }> = new Map();

  /**
   * 获取或初始化交易对的状态
   */
  private getState(symbol: string) {
    if (!this.states.has(symbol)) {
      const config = getPriceConfig(symbol);
      this.states.set(symbol, {
        basePrice: config.basePrice,
        sequence: 1,
      });
    }
    const state = this.states.get(symbol);
    if (!state) {throw new Error(`No state for symbol: ${symbol}`);}
    return state;
  }

  /**
   * 生成订单簿快照
   */
  generateSnapshot(symbol: string, levels: number = 20): DepthData {
    const state = this.getState(symbol);
    const config = getPriceConfig(symbol);

    // ✅ 模拟价格波动：每次生成时轻微调整 basePrice
    const priceChange = (Math.random() - 0.5) * config.volatility * 0.01; // 1% 的波动率
    state.basePrice = state.basePrice * (1 + priceChange);

    // 确保价格在合理范围内（配置价格的 ±20%）
    const minPrice = config.basePrice * 0.8;
    const maxPrice = config.basePrice * 1.2;
    state.basePrice = Math.max(minPrice, Math.min(maxPrice, state.basePrice));

    const bids = this.generateBids(state.basePrice, levels);
    const asks = this.generateAsks(state.basePrice, levels);

    return {
      bids,
      asks,
      sequence: state.sequence++,
      timestamp: Date.now(),
    };
  }

  /**
   * 生成订单簿增量更新
   */
  generateUpdate(symbol: string): DepthData {
    const state = this.getState(symbol);

    // 随机更新 2-5 个档位
    const updateCount = 2 + Math.floor(Math.random() * 4);
    const bids: DepthItem[] = [];
    const asks: DepthItem[] = [];

    for (let i = 0; i < updateCount; i++) {
      // 50% 概率更新买盘，50% 更新卖盘
      if (Math.random() > 0.5) {
        // 更新买盘
        const price = state.basePrice * (1 - Math.random() * 0.001);
        const quantity = Math.random() * 10;
        bids.push({ price, quantity });
      } else {
        // 更新卖盘
        const price = state.basePrice * (1 + Math.random() * 0.001);
        const quantity = Math.random() * 10;
        asks.push({ price, quantity });
      }
    }

    // 10% 概率删除档位（数量设为 0）
    if (Math.random() < 0.1 && bids.length > 0) {
      bids[0].quantity = 0;
    }

    return {
      bids,
      asks,
      sequence: state.sequence++,
      timestamp: Date.now(),
    };
  }

  /**
   * 生成买盘
   */
  private generateBids(basePrice: number, levels: number): DepthItem[] {
    const bids: DepthItem[] = [];
    let cumulativeTotal = 0;

    // 根据价格确定小数位数
    const decimals = basePrice >= 100 ? 2 : basePrice >= 1 ? 3 : 5;

    for (let i = 0; i < levels; i++) {
      // 价格递减，距离基础价格 0.01% - 0.1%
      const priceOffset = 0.0001 + (i * 0.0001);
      const price = basePrice * (1 - priceOffset);

      // 数量：1-10
      const quantity = 1 + Math.random() * 9;
      cumulativeTotal += quantity;

      bids.push({
        price: parseFloat(price.toFixed(decimals)),
        quantity: parseFloat(quantity.toFixed(4)),
        total: parseFloat(cumulativeTotal.toFixed(4)),
      });
    }

    return bids;
  }

  /**
   * 生成卖盘
   */
  private generateAsks(basePrice: number, levels: number): DepthItem[] {
    const asks: DepthItem[] = [];
    let cumulativeTotal = 0;

    // 根据价格确定小数位数
    const decimals = basePrice >= 100 ? 2 : basePrice >= 1 ? 3 : 5;

    for (let i = 0; i < levels; i++) {
      // 价格递增，距离基础价格 0.01% - 0.1%
      const priceOffset = 0.0001 + (i * 0.0001);
      const price = basePrice * (1 + priceOffset);

      // 数量：1-10
      const quantity = 1 + Math.random() * 9;
      cumulativeTotal += quantity;

      asks.push({
        price: parseFloat(price.toFixed(decimals)),
        quantity: parseFloat(quantity.toFixed(4)),
        total: parseFloat(cumulativeTotal.toFixed(4)),
      });
    }

    return asks;
  }

  /**
   * 更新基础价格（用于模拟价格变化）
   */
  updateBasePrice(symbol: string, price: number): void {
    const state = this.getState(symbol);
    state.basePrice = price;
  }

  /**
   * 清空所有状态（用于测试）
   */
  clearAll(): void {
    this.states.clear();
  }
}

// 导出单例
export const depthMockService = new DepthMockService();
