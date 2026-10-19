import { DepthItem, DepthData } from '@/types/market';

/**
 * 订单簿 Mock 数据生成器
 */
export class DepthMockService {
  private basePrice = 50000; // BTC 基础价格
  private sequence = 1;

  /**
   * 生成订单簿快照
   */
  generateSnapshot(symbol: string, levels: number = 20): DepthData {
    const bids = this.generateBids(this.basePrice, levels);
    const asks = this.generateAsks(this.basePrice, levels);

    return {
      bids,
      asks,
      sequence: this.sequence++,
      timestamp: Date.now(),
    };
  }

  /**
   * 生成订单簿增量更新
   */
  generateUpdate(symbol: string): DepthData {
    // 随机更新 2-5 个档位
    const updateCount = 2 + Math.floor(Math.random() * 4);
    const bids: DepthItem[] = [];
    const asks: DepthItem[] = [];

    for (let i = 0; i < updateCount; i++) {
      // 50% 概率更新买盘，50% 更新卖盘
      if (Math.random() > 0.5) {
        // 更新买盘
        const price = this.basePrice * (1 - Math.random() * 0.001);
        const quantity = Math.random() * 10;
        bids.push({ price, quantity });
      } else {
        // 更新卖盘
        const price = this.basePrice * (1 + Math.random() * 0.001);
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
      sequence: this.sequence++,
      timestamp: Date.now(),
    };
  }

  /**
   * 生成买盘
   */
  private generateBids(basePrice: number, levels: number): DepthItem[] {
    const bids: DepthItem[] = [];
    let cumulativeTotal = 0;

    for (let i = 0; i < levels; i++) {
      // 价格递减，距离基础价格 0.01% - 0.1%
      const priceOffset = 0.0001 + (i * 0.0001);
      const price = basePrice * (1 - priceOffset);

      // 数量：1-10
      const quantity = 1 + Math.random() * 9;
      cumulativeTotal += quantity;

      bids.push({
        price: parseFloat(price.toFixed(2)),
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

    for (let i = 0; i < levels; i++) {
      // 价格递增，距离基础价格 0.01% - 0.1%
      const priceOffset = 0.0001 + (i * 0.0001);
      const price = basePrice * (1 + priceOffset);

      // 数量：1-10
      const quantity = 1 + Math.random() * 9;
      cumulativeTotal += quantity;

      asks.push({
        price: parseFloat(price.toFixed(2)),
        quantity: parseFloat(quantity.toFixed(4)),
        total: parseFloat(cumulativeTotal.toFixed(4)),
      });
    }

    return asks;
  }

  /**
   * 更新基础价格（用于模拟价格变化）
   */
  updateBasePrice(price: number): void {
    this.basePrice = price;
  }
}

// 导出单例
export const depthMockService = new DepthMockService();
