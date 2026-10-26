import { getTokenBySymbol } from '@/constants/tokens';
import { priceService } from '../price';

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  price: number;
  priceImpact: number;
  minimumReceived: number;
}

/**
 * EVM Swap 服务
 * 提供代币兑换价格查询和交易执行
 */
export class SwapService {
  /**
   * 获取兑换报价
   */
  async getQuote(
    fromToken: string,
    toToken: string,
    fromAmount: number,
    slippage: number = 0.5,
  ): Promise<SwapQuote | null> {
    try {
      if (!fromAmount || fromAmount <= 0) {
        return null;
      }

      const fromTokenInfo = getTokenBySymbol(fromToken);
      const toTokenInfo = getTokenBySymbol(toToken);

      if (!fromTokenInfo || !toTokenInfo) {
        console.error('[SwapService] Invalid tokens:', fromToken, toToken);
        return null;
      }

      // 查询实时价格
      const price = await this.getPrice(fromToken, toToken);

      if (!price) {
        console.warn('[SwapService] No price data available');
        return null;
      }

      // 计算兑换数量
      const toAmount = fromAmount * price;

      // 计算价格影响（简化版本，实际应该基于流动性深度）
      const priceImpact = this.calculatePriceImpact(fromAmount, fromTokenInfo.symbol);

      // 计算最小接收量（考虑滑点）
      const minimumReceived = toAmount * (1 - slippage / 100);

      return {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        price,
        priceImpact,
        minimumReceived,
      };
    } catch (error) {
      console.error('[SwapService] Failed to get quote:', error);
      return null;
    }
  }

  /**
   * 获取代币对价格
   */
  private async getPrice(fromToken: string, toToken: string): Promise<number | null> {
    try {
      // 使用 CoinGecko API 获取价格
      const price = await priceService.getTokenPairPrice(fromToken, toToken);

      if (!price) {
        console.warn('[SwapService] No price data for', fromToken, '/', toToken);
        return null;
      }

      console.info(`[SwapService] Price for ${fromToken}/${toToken}:`, price);
      return price;
    } catch (error) {
      console.error('[SwapService] Failed to fetch price:', error);
      return null;
    }
  }

  /**
   * 反向价格查询（当正向查询失败时）
   * @deprecated 新的价格服务已经处理了双向查询
   */
  private async getPriceReverse(fromToken: string, toToken: string): Promise<number | null> {
    const price = await this.getPrice(toToken, fromToken);
    return price ? 1 / price : null;
  }

  /**
   * 计算价格影响
   * 简化版本，实际应该基于 AMM 曲线和流动性池深度
   */
  private calculatePriceImpact(amount: number, token: string): number {
    // 根据交易金额估算价格影响
    // 这是一个简化的模型，实际应该查询链上流动性
    const usdValue = this.estimateUSDValue(amount, token);

    if (usdValue < 1000) {return 0.01;} // < $1k: ~0.01%
    if (usdValue < 10000) {return 0.05;} // < $10k: ~0.05%
    if (usdValue < 100000) {return 0.1;} // < $100k: ~0.1%
    return 0.5; // >= $100k: ~0.5%
  }

  /**
   * 估算美元价值
   */
  private estimateUSDValue(amount: number, token: string): number {
    // 简化的美元价值估算
    const approximatePrices: Record<string, number> = {
      ETH: 3500,
      WETH: 3500,
      WBTC: 65000,
      USDT: 1,
      USDC: 1,
      UNI: 12,
      LINK: 18,
    };

    return amount * (approximatePrices[token] || 0);
  }
}

// 导出单例
export const swapService = new SwapService();
