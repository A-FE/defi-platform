import { TokenInfo } from '@/types/evm';

/**
 * 主流 ERC20 代币（以太坊主网）
 */
export const EVM_TOKENS: Record<string, TokenInfo> = {
  ETH: {
    address: '0x0000000000000000000000000000000000000000', // 原生代币
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chainId: 1,
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  WETH: {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    chainId: 1,
    logoURI: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  USDT: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    chainId: 1,
    logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  },
  USDC: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: 1,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  WBTC: {
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    chainId: 1,
    logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  },
  UNI: {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    chainId: 1,
    logoURI: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
  },
  LINK: {
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
    chainId: 1,
    logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  },
};

/**
 * 获取代币信息
 */
export function getTokenBySymbol(symbol: string): TokenInfo | undefined {
  return EVM_TOKENS[symbol.toUpperCase()];
}

/**
 * 获取代币信息（通过合约地址）
 */
export function getTokenByAddress(address: string): TokenInfo | undefined {
  return Object.values(EVM_TOKENS).find(
    (token) => token.address.toLowerCase() === address.toLowerCase(),
  );
}

/**
 * 默认交易代币对
 */
export const DEFAULT_SWAP_FROM = 'ETH';
export const DEFAULT_SWAP_TO = 'USDC';
