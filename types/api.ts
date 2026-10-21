/**
 * API 响应基础结构
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * K线历史数据请求参数
 */
export interface KlineHistoryParams {
  symbol: string;
  interval: string;
  limit: number;
  before?: number;      // 时间戳，获取此时间之前的数据
}

/**
 * 深度数据请求参数
 */
export interface DepthParams {
  symbol: string;
  limit?: number;       // 档位数量
}

/**
 * Swap 报价参数
 */
export interface SwapQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps: number;  // 滑点（基点，1% = 100 bps）
}

/**
 * Jupiter 报价响应
 */
export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: number;
  routePlan: any[];
}

/**
 * 指标查询请求参数
 */
export interface IndicatorQueryParams {
  symbol: string;
  resolution: string; // '1m' | '5m' | '1h' | '1D'
  from: number; // UTC 时间戳（秒）
  to: number;   // UTC 时间戳（秒）
  indicators: Array<{
    name: string; // 'macd' | 'rsi' | 'kdj' | 'boll' | 'ma' | 'ema' | 'vol'
    params: number[]; // 例如 MACD: [12, 26, 9], RSI: [14]
  }>;
}

/**
 * 带指标的 K 线数据项
 */
export interface IndicatorKlineItem {
  time: number; // UTC 时间戳（秒）
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed?: boolean; // 是否已收盘（WebSocket 实时推送时使用）
  indicators: {
    macd?: { dif: number; dea: number; macd: number };
    rsi?: { rsi: number };
    kdj?: { k: number; d: number; j: number };
    boll?: { upper: number; middle: number; lower: number };
    ma?: Record<string, number>; // 例如 { ma5: 100.5, ma10: 101.2 }
    ema?: Record<string, number>;
    vol?: { volume: number };
  };
}

/**
 * 指标查询响应
 */
export interface IndicatorKlineResponse {
  bars: IndicatorKlineItem[];
}
