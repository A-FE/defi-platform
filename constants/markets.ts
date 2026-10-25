import { MarketSymbol } from '@/types/market';

/**
 * 支持的交易市场列表
 * 基于以太坊主网的主流 DEX 交易对
 */
export const MARKETS: MarketSymbol[] = [
  {
    symbol: 'WETH/USDC',
    name: 'ETH/USDC',
    baseAsset: 'WETH',
    quoteAsset: 'USDC',
    icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    dex: 'Uniswap V3',
    chainId: 1,
  },
  {
    symbol: 'WBTC/USDC',
    name: 'BTC/USDC',
    baseAsset: 'WBTC',
    quoteAsset: 'USDC',
    icon: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    dex: 'Uniswap V3',
    chainId: 1,
  },
  {
    symbol: 'LINK/USDC',
    name: 'LINK/USDC',
    baseAsset: 'LINK',
    quoteAsset: 'USDC',
    icon: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
    dex: 'Uniswap V3',
    chainId: 1,
  },
  {
    symbol: 'UNI/USDC',
    name: 'UNI/USDC',
    baseAsset: 'UNI',
    quoteAsset: 'USDC',
    icon: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
    dex: 'Uniswap V3',
    chainId: 1,
  },
  {
    symbol: 'USDT/USDC',
    name: 'USDT/USDC',
    baseAsset: 'USDT',
    quoteAsset: 'USDC',
    icon: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    dex: 'Uniswap V3',
    chainId: 1,
  },
];

/**
 * 默认市场
 */
export const DEFAULT_MARKET = 'WETH/USDC';

/**
 * 根据 symbol 获取市场信息
 */
export function getMarketBySymbol(symbol: string): MarketSymbol | undefined {
  return MARKETS.find((market) => market.symbol === symbol);
}
