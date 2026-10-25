import { bitqueryClient } from './BitqueryClient';
import { KLINE_QUERY } from './queries';
import { adaptKlineData } from '../adapters/bitqueryAdapter';
import { KlineBar, KlineInterval } from '@/types/market';
import { EVM_TOKENS } from '@/constants/tokens';

/**
 * Bitquery K线数据服务
 */
export class BitqueryKlineService {
  /**
   * 获取 K线数据
   * @param symbol - 交易对（如 "WETH/USDC"）
   * @param interval - 周期
   * @param from - 起始时间戳（秒）
   * @param to - 结束时间戳（秒）
   */
  async fetchKlineData(
    symbol: string,
    interval: KlineInterval,
    from: number,
    to: number,
  ): Promise<KlineBar[]> {
    try {
      const [baseToken, quoteToken] = symbol.split('/');

      // 获取代币合约地址
      const baseAddress = this.getTokenAddress(baseToken);
      const quoteAddress = this.getTokenAddress(quoteToken);

      if (!baseAddress || !quoteAddress) {
        console.error('[BitqueryKlineService] Invalid token:', symbol);
        return [];
      }

      // 转换周期为分钟数
      const intervalMinutes = this.convertIntervalToMinutes(interval);

      // 构建查询变量
      const variables = {
        network: 'eth', // 以太坊主网
        baseCurrency: baseAddress,
        quoteCurrency: quoteAddress,
        from: new Date(from * 1000).toISOString(),
        to: new Date(to * 1000).toISOString(),
        interval: intervalMinutes,
      };

      console.info('[BitqueryKlineService] Fetching kline data:', {
        symbol,
        interval,
        from: variables.from,
        to: variables.to,
      });

      // 执行查询
      const response = await bitqueryClient.query(KLINE_QUERY, variables);

      // 提取交易数据
      const trades = response?.EVM?.DEXTradeByTokens || [];

      if (trades.length === 0) {
        console.warn('[BitqueryKlineService] No trade data returned for', symbol);
        return [];
      }

      // 适配为标准格式
      const klineData = adaptKlineData(trades);

      console.info('[BitqueryKlineService] Fetched', klineData.length, 'bars for', symbol);

      return klineData;
    } catch (error) {
      console.error('[BitqueryKlineService] Failed to fetch kline data:', error);
      return [];
    }
  }

  /**
   * 获取代币合约地址
   */
  private getTokenAddress(symbol: string): string | null {
    const token = EVM_TOKENS[symbol.toUpperCase()];
    if (!token) {
      console.warn('[BitqueryKlineService] Unknown token:', symbol);
      return null;
    }
    // Bitquery 使用小写地址
    return token.address.toLowerCase();
  }

  /**
   * 将 KlineInterval 转换为分钟数
   */
  private convertIntervalToMinutes(interval: KlineInterval): number {
    const intervalMap: Record<KlineInterval, number> = {
      'timesharing': 1,
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
      '1w': 10080,
    };
    return intervalMap[interval] || 60;
  }
}

// 导出单例
export const bitqueryKlineService = new BitqueryKlineService();
