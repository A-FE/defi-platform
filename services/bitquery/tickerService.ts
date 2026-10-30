import { bitqueryClient } from './BitqueryClient';
import { TICKER_QUERY } from './queries';
import { adaptTickerData } from '../adapters/bitqueryAdapter';
import { TickerData } from '@/types/market';
import { EVM_TOKENS } from '@/constants/tokens';

/**
 * Bitquery Ticker 数据服务
 */
export class BitqueryTickerService {
  /**
   * 获取 24h Ticker 数据
   * @param symbol - 交易对（如 "WETH/USDC"）
   */
  async fetchTickerData(symbol: string): Promise<TickerData | null> {
    try {
      const [baseToken, quoteToken] = symbol.split('/');

      // 获取代币合约地址
      const baseAddress = this.getTokenAddress(baseToken);
      const quoteAddress = this.getTokenAddress(quoteToken);

      if (!baseAddress || !quoteAddress) {
        console.error('[BitqueryTickerService] Invalid token:', symbol);
        return null;
      }

      // 构建查询变量
      const variables = {
        network: 'eth',
        baseCurrency: baseAddress,
        quoteCurrency: quoteAddress,
      };

      console.info('[BitqueryTickerService] Fetching ticker data:', symbol);

      // 执行查询
      const response = await bitqueryClient.query(TICKER_QUERY, variables);

      // 提取交易数据
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trades = (response as any)?.EVM?.DEXTradeByTokens || [];

      if (trades.length === 0) {
        console.warn('[BitqueryTickerService] No trade data for', symbol);
        return null;
      }

      // 适配为标准格式
      const tickerData = adaptTickerData(trades, symbol);

      console.info('[BitqueryTickerService] Ticker data:', tickerData);

      return tickerData;
    } catch (error) {
      console.error('[BitqueryTickerService] Failed to fetch ticker:', error);
      return null;
    }
  }

  /**
   * 获取代币合约地址
   */
  private getTokenAddress(symbol: string): string | null {
    const token = EVM_TOKENS[symbol.toUpperCase()];
    if (!token) {
      console.warn('[BitqueryTickerService] Unknown token:', symbol);
      return null;
    }
    return token.address.toLowerCase();
  }
}

// 导出单例
export const bitqueryTickerService = new BitqueryTickerService();
