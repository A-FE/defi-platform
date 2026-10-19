import { KlineInterval } from '@/types/market';

/**
 * API 端点配置
 */
export const API_ENDPOINTS = {
  // Mock API（开发阶段）
  MOCK_KLINE: '/api/mock/kline',
  MOCK_DEPTH: '/api/mock/depth',
  MOCK_TICKER: '/api/mock/ticker',

  // Jupiter API
  JUPITER_QUOTE: 'https://quote-api.jup.ag/v6/quote',
  JUPITER_SWAP: 'https://quote-api.jup.ag/v6/swap',

  // WebSocket
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080',
};

/**
 * K线周期列表
 */
export const KLINE_INTERVALS: KlineInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

/**
 * K线周期显示名称
 */
export const INTERVAL_LABELS: Record<KlineInterval, string> = {
  '1m': '1 分钟',
  '5m': '5 分钟',
  '15m': '15 分钟',
  '1h': '1 小时',
  '4h': '4 小时',
  '1d': '1 天',
  '1w': '1 周',
};

/**
 * 交易对列表
 */
export const TRADING_PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
];

/**
 * 默认交易对
 */
export const DEFAULT_SYMBOL = 'BTCUSDT';

/**
 * 默认周期
 */
export const DEFAULT_INTERVAL: KlineInterval = '1h';

/**
 * 订单簿档位数
 */
export const DEPTH_LEVELS = 20;

/**
 * WebSocket 重连配置
 */
export const WS_RECONNECT_CONFIG = {
  MAX_ATTEMPTS: 10,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 8000,
};

/**
 * 消息队列配置
 */
export const MESSAGE_QUEUE_CONFIG = {
  MAX_SIZE: 100,
};
