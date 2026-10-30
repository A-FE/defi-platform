/**
 * EVM 生态类型定义
 * 替代原有的 Solana 类型
 */

/**
 * 钱包信息 - EVM 版本
 */
export interface WalletInfo {
  address: `0x${string}`;      // EVM 地址格式
  publicKey: `0x${string}`;    // 与 address 相同（兼容旧代码）
  connected: boolean;
  balance: bigint;             // ETH/MATIC 余额（wei 单位）
  chainId?: number;            // 链 ID (1=Mainnet, 137=Polygon)
  balanceFormatted?: string;   // 格式化余额（带单位）
}

/**
 * 代币信息 - ERC20
 */
export interface TokenInfo {
  address: `0x${string}`;      // 合约地址（0x0 表示原生代币）
  symbol: string;              // 代币符号
  name: string;
  decimals: number;
  logoURI?: string;
  chainId: number;             // 所属链
  balance?: bigint;
  balanceUSD?: number;
}

/**
 * 支持的 EVM 链
 */
export type EVMChain = 'ethereum' | 'polygon' | 'bsc' | 'arbitrum' | 'base';

/**
 * 链配置
 */
export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

/**
 * 链配置映射
 */
export const CHAIN_CONFIGS: Record<EVMChain, ChainConfig> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || '',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || '',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
  },
  bsc: {
    chainId: 56,
    name: 'BNB Chain',
    rpcUrl: process.env.NEXT_PUBLIC_BSC_RPC_URL || '',
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || '',
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  base: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || '',
    blockExplorer: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};
