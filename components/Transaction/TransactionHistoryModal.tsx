'use client';

import { useState } from 'react';
import TransactionHistory from '../Transaction/TransactionHistory';

/**
 * 交易历史按钮和模态框
 */
export function TransactionHistoryModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>交易历史</span>
      </button>

      {/* 模态框 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          {/* 遮罩层 */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

          {/* 内容 */}
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-lg shadow-2xl animate-fade-in">
            {/* 标题栏 */}
            <div className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">交易历史</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 历史记录 */}
            <div className="overflow-y-auto max-h-[calc(80vh-4rem)]">
              <TransactionHistory />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TransactionHistoryModal;
