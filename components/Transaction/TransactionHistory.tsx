'use client';

import { useTransactionStore } from '@/stores';
import { TransactionStatus } from '@/types/market';

/**
 * 交易历史面板
 */
export function TransactionHistory() {
  const { transactions, getRecentTransactions, clearHistory } = useTransactionStore();
  const recentTxs = getRecentTransactions(20);

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'pending':
        return (
          <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        );
    }
  };

  const getStatusText = (status: TransactionStatus) => {
    const statusMap = {
      success: { text: '成功', color: 'text-green-400' },
      failed: { text: '失败', color: 'text-red-400' },
      pending: { text: '进行中', color: 'text-yellow-400' },
    };
    return statusMap[status];
  };

  const getTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      swap: 'Swap',
      transfer: '转账',
      deposit: '充值',
      withdraw: '提现',
    };
    return typeMap[type] || type;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // 小于 1 分钟
    if (diff < 60000) {
      return '刚刚';
    }
    // 小于 1 小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`;
    }
    // 小于 24 小时
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} 小时前`;
    }
    // 显示日期
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">交易历史</h3>
        {transactions.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            清空历史
          </button>
        )}
      </div>

      {/* 交易列表 */}
      <div className="divide-y divide-gray-800">
        {recentTxs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p>暂无交易记录</p>
          </div>
        ) : (
          recentTxs.map((tx) => {
            const status = getStatusText(tx.status);
            return (
              <div key={tx.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start justify-between">
                  {/* 左侧：交易信息 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{getTypeText(tx.type)}</span>
                      <span className={`text-sm ${status.color}`}>{status.text}</span>
                    </div>

                    <div className="text-sm text-gray-400 mb-2">
                      {tx.fromAmount.toFixed(4)} {tx.fromToken} → {tx.toAmount.toFixed(4)}{' '}
                      {tx.toToken}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatTime(tx.timestamp)}</span>
                      {tx.signature && (
                        <button
                          onClick={() => {
                            const explorerUrl = `https://solscan.io/tx/${tx.signature}`;
                            window.open(explorerUrl, '_blank');
                          }}
                          className="hover:text-purple-400 transition-colors"
                        >
                          查看详情 →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 右侧：状态图标 */}
                  <div className="ml-4">{getStatusIcon(tx.status)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default TransactionHistory;
