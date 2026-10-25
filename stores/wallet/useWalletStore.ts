import { create } from 'zustand';
import { WalletState } from '@/types/store';

/**
 * 钱包 Store
 * 职责：管理钱包连接状态
 *
 * 注意：这个 Store 主要用于存储钱包状态
 * 实际的钱包连接通过 Wagmi/RainbowKit 处理
 */
export const useWalletStore = create<WalletState>((set, get) => ({
  wallet: null,
  isConnecting: false,

  /**
   * 设置钱包信息
   * 由外部钱包连接组件调用
   */
  setWallet: (walletData) => {
    set({
      wallet: walletData ? {
        address: walletData.address,
        publicKey: walletData.publicKey || walletData.address,
        connected: walletData.connected,
        balance: walletData.balance || 0,
      } : null,
    });
  },

  /**
   * 连接钱包
   * 实际连接逻辑由 RainbowKit 处理
   * 这里只是一个占位符
   */
  connect: async () => {
    set({ isConnecting: true });
    // 实际连接由 RainbowKit 的 ConnectButton 处理
    // 这里不需要实现具体逻辑
    set({ isConnecting: false });
  },

  /**
   * 断开钱包
   */
  disconnect: () => {
    set({ wallet: null });
  },

  /**
   * 更新余额
   * 由外部调用传入真实余额
   */
  updateBalance: async (balance?: number) => {
    const { wallet } = get();
    if (!wallet) {return;}

    if (balance !== undefined) {
      set({
        wallet: {
          ...wallet,
          balance,
        },
      });
    }
  },
}));
