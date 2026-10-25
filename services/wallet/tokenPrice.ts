/**
 * 获取代币的市场价格
 * 这是一个简化版本，返回模拟价格
 *
 * 实际应用中应该：
 * 1. 从 Ticker Store 获取实时价格
 * 2. 或集成价格 API（CoinGecko, CoinMarketCap）
 */
export function getTokenPrices(): Record<string, number> {
  return {
    'USDC': 1.00,
    'USDT': 1.00,
    'DAI': 1.00,
    'WETH': 3500.00,
    'WBTC': 65000.00,
    'UNI': 12.50,
    'LINK': 18.00,
    'AAVE': 95.00,
  };
}
