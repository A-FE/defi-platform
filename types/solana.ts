/**
 * 钱包信息
 */
export interface WalletInfo {
  address: string;
  publicKey: string;
  connected: boolean;
  balance: number;        // SOL 余额
}

/**
 * 代币信息
 */
export interface TokenInfo {
  mint: string;           // Token Mint 地址
  symbol: string;         // 代币符号 (SOL, USDC, etc.)
  name: string;           // 代币名称
  decimals: number;       // 精度
  logoURI?: string;       // 图标 URI
  balance?: number;       // 余额
  balanceUSD?: number;    // USD 价值
}

/**
 * Solana 网络类型
 */
export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet';

/**
 * RPC 配置
 */
export interface RPCConfig {
  url: string;
  network: SolanaNetwork;
  wsUrl?: string;
}
