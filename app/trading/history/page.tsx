'use client';

import TradingLayout from '@/components/Layout/TradingLayout';
import TransactionHistory from '@/components/Transaction/TransactionHistory';

/**
 * 交易历史页面
 */
export default function HistoryPage() {
  return (
    <TradingLayout>
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">交易历史</h1>
          <p className="text-gray-400">查看您的所有交易记录</p>
        </div>

        {/* 交易历史列表 */}
        <TransactionHistory />

        {/* 底部说明 */}
        <div className="mt-6 bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-gray-400">
              <p className="mb-2">
                <strong className="text-white">交易记录说明：</strong>
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>交易记录保存在本地浏览器，清除缓存后会丢失</li>
                <li>点击"查看详情"可以在区块链浏览器查看完整信息</li>
                <li>交易状态会自动更新：进行中 → 成功/失败</li>
                <li>历史记录最多显示 20 条最近的交易</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </TradingLayout>
  );
}
