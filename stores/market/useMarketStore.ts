import { create } from 'zustand';
import { DEFAULT_MARKET } from '@/constants/markets';

interface MarketState {
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
}

/**
 * 市场状态管理
 * 管理当前选中的交易对
 */
export const useMarketStore = create<MarketState>((set) => ({
  selectedSymbol: DEFAULT_MARKET,
  setSelectedSymbol: (symbol) => {
    console.info('[MarketStore] Switch symbol:', symbol);
    set({ selectedSymbol: symbol });
  },
}));
