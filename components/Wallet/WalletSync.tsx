'use client';

import { useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useWalletStore } from '@/stores';

/**
 * 钱包状态同步组件
 * 将 Wagmi 的钱包状态同步到 WalletStore
 */
export function WalletSync() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });
  const { setWallet } = useWalletStore();

  useEffect(() => {
    if (isConnected && address) {
      // 同步钱包信息到 Store
      setWallet({
        address: address,
        publicKey: address,
        connected: true,
        balance: balance?.value || 0n,
        balanceFormatted: balance?.formatted,
      });
    } else {
      // 断开连接时清空
      setWallet(null);
    }
  }, [isConnected, address, balance, setWallet]);

  return null; // 这是一个纯逻辑组件，不渲染任何内容
}
