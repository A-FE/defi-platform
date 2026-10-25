/**
 * Mock 数据价格配置
 * 为不同交易对设置真实的价格范围
 */

interface PriceConfig {
  basePrice: number;      // 基础价格
  volatility: number;     // 波动率（百分比）
  volume24h: number;      // 24h 交易量
}

/**
 * 各个交易对的价格配置
 */
export const PRICE_CONFIGS: Record<string, PriceConfig> = {
  'WETH/USDC': {
    basePrice: 3500,      // ETH 价格约 $3,500
    volatility: 0.05,     // 5% 日波动
    volume24h: 50000000,  // $50M 日交易量
  },
  'WBTC/USDC': {
    basePrice: 80000,     // BTC 价格约 $80,000
    volatility: 0.04,     // 4% 日波动
    volume24h: 120000000, // $120M 日交易量
  },
  'LINK/USDC': {
    basePrice: 18.5,      // LINK 价格约 $18.5
    volatility: 0.08,     // 8% 日波动
    volume24h: 8000000,   // $8M 日交易量
  },
  'UNI/USDC': {
    basePrice: 12.3,      // UNI 价格约 $12.3
    volatility: 0.07,     // 7% 日波动
    volume24h: 6000000,   // $6M 日交易量
  },
  'USDT/USDC': {
    basePrice: 1.0,       // USDT 价格约 $1.0
    volatility: 0.001,    // 0.1% 日波动（稳定币）
    volume24h: 200000000, // $200M 日交易量
  },
};

/**
 * 获取交易对的价格配置
 */
export function getPriceConfig(symbol: string): PriceConfig {
  return PRICE_CONFIGS[symbol] || PRICE_CONFIGS['WETH/USDC'];
}
