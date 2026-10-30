import { create } from 'zustand';
import { TickerState } from '@/types/store';
import { TickerData } from '@/types/market';
import { wsCenter } from '@/services/websocket';
import { tickerMockService } from '@/services/mock';
import { bitqueryTickerService } from '@/services/bitquery';

/**
 * Ticker Store V2 - Bitquery 集成版本
 * 职责：管理实时行情数据
 * 数据源：优先使用 Bitquery，降级到 Mock
 */
export const useTickerStore = create<TickerState>((set, get) => ({
  tickers: {},

  /**
   * 订阅标的 Ticker（支持 Bitquery 和 Mock 模式）
   */
  subscribe: (symbol: string) => {
    // 检查是否启用 Bitquery（支持客户端和服务端环境变量）
    const apiKey = process.env.NEXT_PUBLIC_BITQUERY_API_KEY || process.env.BITQUERY_API_KEY;
    const useBitquery = process.env.NEXT_PUBLIC_USE_BITQUERY === 'true' && Boolean(apiKey);

    console.info('[TickerStore] Config:', {
      useBitquery,
      hasApiKey: Boolean(apiKey),
      useFlag: process.env.NEXT_PUBLIC_USE_BITQUERY,
      symbol,
    });

    // 🎭 Mock 模式
    if (!useBitquery) {
      console.info('[Mock Mode] Ticker subscribe:', symbol);

      const generateTicker = () => {
        const tickerData = tickerMockService.generateTicker(symbol);
        get().updateTicker(symbol, tickerData);
      };

      // 立即生成一次
      generateTicker();

      // 每 1 秒更新一次
      const intervalId = setInterval(generateTicker, 1000);

      // 清理函数
      return () => {
        clearInterval(intervalId);
      };
    }

    let retryCount = 0;
    const MAX_RETRIES = 3;

    // 🚀 Bitquery 模式：定期从 API 获取数据
    console.info('[Bitquery Mode] Ticker subscribe:', symbol);

    const fetchTicker = async () => {
      try {
        const tickerData = await bitqueryTickerService.fetchTickerData(symbol);
        if (tickerData) {
          get().updateTicker(symbol, tickerData);
          retryCount = 0; // 重置重试计数
        } else {
          console.warn('[Ticker] No data available for', symbol);
        }
      } catch (error: unknown) {
        // 处理 429 限流错误
        if (error instanceof Error && error.message?.includes('429')) {
          retryCount++;
          console.warn(`[Ticker] Rate limited (${retryCount}/${MAX_RETRIES}), will retry later`);

          if (retryCount >= MAX_RETRIES) {
            console.error('[Ticker] Max retries reached, stopping updates');
            clearInterval(intervalId);
          }
        } else {
          console.error('[Ticker] Fetch error:', error);
        }
      }
    };

    // 立即获取一次
    fetchTicker();

    // 每 30 秒更新一次（降低频率避免 API 限流）
    const intervalId = setInterval(fetchTicker, 30000);

    // 订阅 WebSocket Ticker 流（如果有）
    const unsubscribe = wsCenter.subscribe('ticker', (message) => {
      if (message.symbol === symbol && message.data) {
        get().updateTicker(symbol, message.data as TickerData);
      }
    });

    // 清理函数
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  },

  /**
   * 取消订阅
   */
  unsubscribe: (symbol: string) => {
    // WebSocket 取消订阅逻辑
    wsCenter.unsubscribeSymbol(symbol, ['ticker']);
  },

  /**
   * 更新 Ticker 数据
   */
  updateTicker: (symbol: string, data: TickerData) => {
    set((state) => ({
      tickers: {
        ...state.tickers,
        [symbol]: data,
      },
    }));
  },

  /**
   * 根据标的获取 Ticker
   */
  getTickerBySymbol: (symbol: string) => {
    return get().tickers[symbol];
  },
}));
