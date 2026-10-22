import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TransactionInfo, TransactionStatus } from '@/types/market';

interface TransactionState {
  transactions: TransactionInfo[];
  isLoading: boolean;

  // Actions
  addTransaction: (tx: Omit<TransactionInfo, 'id' | 'timestamp'>) => void;
  updateTransactionStatus: (id: string, status: TransactionStatus) => void;
  getTransactionById: (id: string) => TransactionInfo | undefined;
  getRecentTransactions: (limit?: number) => TransactionInfo[];
  clearHistory: () => void;
}

/**
 * 交易历史 Store
 * 职责：管理交易记录、状态更新
 */
export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      isLoading: false,

      /**
       * 添加交易记录
       */
      addTransaction: (tx) => {
        const newTransaction: TransactionInfo = {
          ...tx,
          id: `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          timestamp: Date.now(),
        };

        set((state) => ({
          transactions: [newTransaction, ...state.transactions],
        }));

        // 模拟交易确认
        setTimeout(() => {
          get().updateTransactionStatus(newTransaction.id, 'success');
        }, 3000);
      },

      /**
       * 更新交易状态
       */
      updateTransactionStatus: (id, status) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, status } : tx,
          ),
        }));
      },

      /**
       * 根据 ID 获取交易
       */
      getTransactionById: (id) => {
        return get().transactions.find((tx) => tx.id === id);
      },

      /**
       * 获取最近的交易记录
       */
      getRecentTransactions: (limit = 10) => {
        return get().transactions.slice(0, limit);
      },

      /**
       * 清空历史记录
       */
      clearHistory: () => {
        set({ transactions: [] });
      },
    }),
    {
      name: 'transaction-history',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
