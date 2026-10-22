import { create } from 'zustand';
import { WalletState } from '@/types/store';

/**
 * 钱包 Store
 * 职责：管理钱包连接状态
 */
export const useWalletStore = create<WalletState>((set, get) => ({
  wallet: null,
  isConnecting: false,

  /**
   * 连接钱包
   */
  connect: async () => {
    set({ isConnecting: true });

    try {
      // 这里会在后面集成真实的 Solana wallet adapter
      // 暂时使用 Mock 数据
      const mockWallet = {
        address: 'Fy7w...x9Ks',
        publicKey: 'Fy7wVhxxx9Ks',
        connected: true,
        balance: 10.5, // SOL
      };

      set({ wallet: mockWallet, isConnecting: false });
    } catch (error) {
      console.error('Connect wallet error:', error);
      set({ isConnecting: false });
    }
  },

  /**
   * 断开钱包
   */
  disconnect: () => {
    set({ wallet: null });
  },

  /**
   * 更新余额
   */
  updateBalance: async () => {
    const { wallet } = get();
    if (!wallet) {return;}

    try {
      // 这里会查询真实余额
      // 暂时 Mock
      const newBalance = wallet.balance + Math.random() * 0.1;
      set({
        wallet: {
          ...wallet,
          balance: newBalance,
        },
      });
    } catch (error) {
      console.error('Update balance error:', error);
    }
  },
}));
