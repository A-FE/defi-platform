'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/config/wagmi';
import { WalletSync } from '@/components/Wallet/WalletSync';

const queryClient = new QueryClient();

/**
 * Web3 Provider（不使用 RainbowKit）
 * 使用纯 Wagmi 避免依赖问题
 */
export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletSync />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
