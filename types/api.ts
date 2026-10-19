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
