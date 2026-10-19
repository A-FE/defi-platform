import { create } from 'zustand';
import { TickerState } from '@/types/store';
import { TickerData } from '@/types/market';
import { wsCenter } from '@/services/websocket';
import { tickerMockService } from '@/services/mock';

/**
 * Ticker Store
 * 职责：管理实时行情数据
 */
export const useTickerStore = create<TickerState>((set, get) => ({
  tickers: {},

  /**
   * 订阅标的 Ticker
   */
  subscribe: (symbol: string) => {
    // 订阅 WebSocket Ticker 流
    const unsubscribe = wsCenter.subscribe('ticker', (message) => {
      if (message.symbol === symbol && message.data) {
        get().updateTicker(symbol, message.data);
      }
    });

    // 开发阶段：使用 Mock 数据模拟实时更新
    const mockInterval = setInterval(() => {
      const mockTicker = tickerMockService.generateTicker(symbol);
      get().updateTicker(symbol, mockTicker);
    }, 1000); // 每秒更新一次

    // 清理函数
    return () => {
      unsubscribe();
      clearInterval(mockInterval);
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
