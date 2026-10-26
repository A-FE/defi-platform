/**
 * Mock 价格数据服务
 * 用于演示目的，提供稳定的价格数据
 */

/**
 * Mock 价格数据
 * 这些价格用于演示目的，会有小幅随机波动以模拟真实市场
 */
const MOCK_PRICES: Record<string, number> = {
  ETH: 3500.00,
  WETH: 3500.00,
  USDT: 1.00,
  USDC: 1.00,
  WBTC: 65000.00,
  UNI: 12.50,
  LINK: 18.00,
  DAI: 1.00,
  AAVE: 95.00,
};

/**
 * 价格服务 - Mock 数据版本
 */
export class PriceService {
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 分钟缓存

  /**
   * 获取 Mock 价格（带随机波动）
   */
  private getMockPrice(symbol: string): number {
    const basePrice = MOCK_PRICES[symbol.toUpperCase()];
    if (!basePrice) {
      console.warn('[PriceService] Unknown token:', symbol);
      return 0;
    }

    // 添加 ±2% 的随机波动，使价格看起来更真实
    const volatility = 0.02;
    const randomFactor = 1 + (Math.random() - 0.5) * 2 * volatility;
    return basePrice * randomFactor;
  }

  /**
   * 获取代币价格（以 USD 计价）
   */
  async getTokenPriceUSD(symbol: string): Promise<number | null> {
    // 检查缓存
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    const mockPrice = this.getMockPrice(symbol);

    // 更新缓存
    this.priceCache.set(symbol, {
      price: mockPrice,
      timestamp: Date.now(),
    });

    return mockPrice;
  }

  /**
   * 获取多个代币的价格
   */
  async getTokenPricesUSD(symbols: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    symbols.forEach((symbol) => {
      const price = this.getMockPrice(symbol);
      if (price > 0) {
        result[symbol] = price;
      }
    });

    return result;
  }

  /**
   * 计算代币对价格
   * 通过 USD 价格计算两个代币之间的汇率
   */
  async getTokenPairPrice(fromToken: string, toToken: string): Promise<number | null> {
    // 处理 ETH <-> WETH 的特殊情况
    if (
      (fromToken === 'ETH' && toToken === 'WETH') ||
      (fromToken === 'WETH' && toToken === 'ETH')
    ) {
      return 1.0;
    }

    // 如果目标代币是稳定币，直接返回源代币的 USD 价格
    if (['USDT', 'USDC', 'DAI'].includes(toToken.toUpperCase())) {
      return this.getTokenPriceUSD(fromToken);
    }

    // 如果源代币是稳定币，返回目标代币价格的倒数
    if (['USDT', 'USDC', 'DAI'].includes(fromToken.toUpperCase())) {
      const toPrice = await this.getTokenPriceUSD(toToken);
      return toPrice ? 1 / toPrice : null;
    }

    // 其他情况：通过 USD 计算汇率
    const prices = await this.getTokenPricesUSD([fromToken, toToken]);

    if (!prices[fromToken] || !prices[toToken]) {
      return null;
    }

    return prices[fromToken] / prices[toToken];
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.priceCache.clear();
  }
}

// 导出单例
export const priceService = new PriceService();
