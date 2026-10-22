import { KlineInterval, KlineBar } from './market';
import { DepthItem, TickerData, AssetData } from './market';
import { WalletInfo } from './solana';

/**
 * K线缓存项（V2：使用原始 KlineBar）
 */
export interface KlineCacheItem {
  bars: KlineBar[];
  timestamp: number;
}

/**
 * K线 Store 状态（V2：前端计算版本）
 */
export interface KlineState {
  bars: KlineBar[];
  interval: KlineInterval;
  cache: Record<string, KlineCacheItem>;
  isLoading: boolean;

  // Actions - 简化：只获取原始K线
  fetchKlines: (
    symbol: string,
    interval: KlineInterval,
    from: number,
    to: number
  ) => Promise<KlineBar[]>;

  subscribeBars: (
    symbol: string,
    interval: KlineInterval,
    lastBar: KlineBar,
    callback: (bar: KlineBar) => void
  ) => () => void;

  unsubscribeBars: (symbol: string, interval: KlineInterval) => void;
  updateBar: (symbol: string, bar: KlineBar) => void;
  getFromCache: (symbol: string, interval: KlineInterval) => KlineBar[] | null;
  saveToCache: (symbol: string, interval: KlineInterval, bars: KlineBar[]) => void;
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
  subscribe: (symbol: string) => () => void;
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
  subscribe: (symbol: string) => () => void;
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
