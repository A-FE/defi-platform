import { KlineInterval } from './market';
import { DepthItem, TickerData, AssetData } from './market';
import { WalletInfo } from './solana';
import { IndicatorKlineItem } from './api';
import { IndicatorType } from './indicator';

/**
 * K线缓存项（统一使用 IndicatorKlineItem）
 */
export interface KlineCacheItem {
  bars: IndicatorKlineItem[];
  timestamp: number;
}

/**
 * K线 Store 状态
 */
export interface KlineState {
  bars: IndicatorKlineItem[];
  interval: KlineInterval;
  cache: Record<string, KlineCacheItem>;
  isLoading: boolean;

  // Actions - 统一的数据获取方法
  fetchKlines: (
    symbol: string,
    interval: KlineInterval,
    from: number,
    to: number,
    indicators?: Array<{ name: string; params: number[] }>
  ) => Promise<IndicatorKlineItem[]>;

  subscribeBars: (
    symbol: string,
    interval: KlineInterval,
    lastBar: IndicatorKlineItem,
    callback: (bar: IndicatorKlineItem) => void
  ) => () => void;

  unsubscribeBars: (symbol: string, interval: KlineInterval) => void;
  updateBar: (symbol: string, bar: IndicatorKlineItem) => void;
  getFromCache: (symbol: string, interval: KlineInterval) => IndicatorKlineItem[] | null;
  saveToCache: (symbol: string, interval: KlineInterval, bars: IndicatorKlineItem[]) => void;
}

/**
 * 深度 Store 状态
 */
export interface DepthState {
  bids: DepthItem[];
  asks: DepthItem[];
  sequence: number;
  changedPrices: Set<number>;

  // Actions
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  handleSnapshot: (data: any) => void;
  handleUpdate: (data: any) => void;
}

/**
 * Ticker Store 状态
 */
export interface TickerState {
  tickers: Record<string, TickerData>;

  // Actions
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  updateTicker: (symbol: string, data: TickerData) => void;
  getTickerBySymbol: (symbol: string) => TickerData | undefined;
}

/**
 * 资产 Store 状态
 */
export interface AssetState {
  assets: AssetData | null;
  isCalculating: boolean;

  // Actions
  loadAssets: () => Promise<void>;
  calculatePnL: () => void;
  calculatePnLDebounced: () => void;
}

/**
 * 钱包 Store 状态
 */
export interface WalletState {
  wallet: WalletInfo | null;
  isConnecting: boolean;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  updateBalance: () => Promise<void>;
}
