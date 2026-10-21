/**
 * 行情品种信息
 */
export interface MarketSymbol {
  symbol: string;
  name: string;
  baseAsset: string;
  quoteAsset: string;
}

/**
 * K线周期类型
 */
export type KlineInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

/**
 * K线数据
 * @deprecated 请使用 IndicatorKlineItem 代替（统一数据结构）
 */
export interface KlineBar {
  time: number;        // UTC 秒级时间戳
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed?: boolean;  // 是否已收盘（实时 WebSocket 推送时使用）
}

/**
 * 统一的 K 线类型别名
 * 所有新代码应使用 IndicatorKlineItem（从 types/api.ts 导入）
 */
export type { IndicatorKlineItem as KlineItem } from './api';

/**
 * 深度数据项
 */
export interface DepthItem {
  price: number;       // 价格
  quantity: number;    // 数量
  total?: number;      // 累计量
}

/**
 * 订单簿深度数据
 */
export interface DepthData {
  bids: DepthItem[];   // 买盘
  asks: DepthItem[];   // 卖盘
  sequence: number;    // 序列号（防乱序）
  timestamp: number;
}

/**
 * Ticker 行情数据
 */
export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;   // 涨跌幅 (%)
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

/**
 * WebSocket 消息类型
 */
export type WSMessageType =
  | 'bar_update'
  | 'depth_snapshot'
  | 'depth_update'
  | 'ticker'
  | 'account_asset';

/**
 * WebSocket 消息结构
 */
export interface WSMessage {
  type: WSMessageType;
  symbol?: string;
  interval?: KlineInterval;
  data?: any;
  bids?: [number, number][];    // [价格, 数量]
  asks?: [number, number][];
  sequence?: number;
  timestamp?: number;
}

/**
 * 资产持仓
 */
export interface Position {
  symbol: string;
  tokenMint: string;
  quantity: number;
  costPrice: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  pnlPercent?: number;
}

/**
 * 账户资产
 */
export interface AssetData {
  totalValueUSD: number;
  availableUSD: number;
  frozenUSD: number;
  positions: Position[];
}

/**
 * 操作类型（替代原"交易类型"）
 */
export type TransactionType = 'swap' | 'transfer' | 'deposit' | 'withdraw';

/**
 * 操作状态（替代原"交易状态"）
 */
export type TransactionStatus = 'pending' | 'success' | 'failed';

/**
 * 操作记录（替代原"交易记录"）
 */
export interface TransactionInfo {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  signature: string;
  timestamp: number;
}
