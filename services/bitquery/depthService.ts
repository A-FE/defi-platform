import { bitqueryClient } from './BitqueryClient';
import { RECENT_TRADES_QUERY } from './queries';
import { adaptDepthData } from '../adapters/bitqueryAdapter';
import { DepthData } from '@/types/market';
import { EVM_TOKENS } from '@/constants/tokens';

/**
 * Bitquery 订单簿数据服务（降级方案）
 *
 * ⚠️ 注意：Bitquery 不直接提供实时订单簿深度
 * 此服务使用最近的链上交易数据模拟订单簿
 */
export class BitqueryDepthService {
  /**
   * 获取订单簿数据（基于最近交易）
   * @param symbol - 交易对（如 "WETH/USDC"）
   * @param limit - 交易数量限制（默认 100）
   */
  async fetchDepthData(symbol: string, limit: number = 100): Promise<DepthData | null> {
    try {
      const [baseToken, quoteToken] = symbol.split('/');

      // 获取代币合约地址
      const baseAddress = this.getTokenAddress(baseToken);
      const quoteAddress = this.getTokenAddress(quoteToken);

      if (!baseAddress || !quoteAddress) {
        console.error('[BitqueryDepthService] Invalid token:', symbol);
        return null;
      }

      // 构建查询变量
      const variables = {
        network: 'eth',
        baseCurrency: baseAddress,
        quoteCurrency: quoteAddress,
        limit,
      };

      console.info('[BitqueryDepthService] Fetching recent trades for depth:', symbol);

      // 执行查询
      const response = await bitqueryClient.query(RECENT_TRADES_QUERY, variables);

      // 提取交易数据
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trades = (response as any)?.EVM?.DEXTradeByTokens || [];

      if (trades.length === 0) {
        console.warn('[BitqueryDepthService] No trade data for', symbol);
        return null;
      }

      // 适配为订单簿格式
      const depthData = adaptDepthData(trades);

      console.info('[BitqueryDepthService] Depth data:', {
        bids: depthData.bids.length,
        asks: depthData.asks.length,
      });

      return depthData;
    } catch (error) {
      console.error('[BitqueryDepthService] Failed to fetch depth:', error);
      return null;
    }
  }

  /**
   * 获取代币合约地址
   */
  private getTokenAddress(symbol: string): string | null {
    const token = EVM_TOKENS[symbol.toUpperCase()];
    if (!token) {
      console.warn('[BitqueryDepthService] Unknown token:', symbol);
      return null;
    }
    return token.address.toLowerCase();
  }
}

// 导出单例
export const bitqueryDepthService = new BitqueryDepthService();
