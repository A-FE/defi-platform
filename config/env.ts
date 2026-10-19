import { SolanaNetwork, RPCConfig } from '@/types/solana';

/**
 * 获取环境变量（带类型安全）
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value || defaultValue || '';
}

/**
 * Solana RPC 配置
 */
export const RPC_CONFIG: RPCConfig = {
  url: getEnvVar('NEXT_PUBLIC_SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com'),
  network: getEnvVar('NEXT_PUBLIC_SOLANA_NETWORK', 'mainnet-beta') as SolanaNetwork,
  wsUrl: getEnvVar('NEXT_PUBLIC_WS_URL', 'ws://localhost:8080'),
};

/**
 * 是否为开发环境
 */
export const isDev = process.env.NODE_ENV === 'development';

/**
 * 是否为生产环境
 */
export const isProd = process.env.NODE_ENV === 'production';
