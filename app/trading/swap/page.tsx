'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import TradingLayout from '@/components/Layout/TradingLayout';

const SwapPanel = dynamic(() => import('@/components/Swap/SwapPanel'), {
  loading: () => <SwapSkeleton />,
  ssr: false,
});

/**
 * Swap 交易页面
 */
export default function SwapPage() {
  return (
    <TradingLayout>
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">代币兑换</h1>
          <p className="text-gray-400">通过 Jupiter 聚合器获取最优兑换路径</p>
        </div>

        {/* Swap 面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：Swap 表单 */}
          <div className="lg:col-span-2">
            <Suspense fallback={<SwapSkeleton />}>
              <SwapPanel defaultFrom="SOL" defaultTo="USDC" />
            </Suspense>
          </div>

          {/* 右侧：提示信息 */}
          <div className="space-y-4">
            {/* 特性卡片 */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                快速兑换
              </h3>
              <p className="text-sm text-gray-400">
                基于 Solana 区块链的超快交易速度，几秒内完成代币兑换
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                最优价格
              </h3>
              <p className="text-sm text-gray-400">
                Jupiter 聚合器自动比较多个 DEX，为您找到最优兑换价格
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                安全可靠
              </h3>
              <p className="text-sm text-gray-400">
                所有交易通过智能合约执行，资金安全由区块链保障
              </p>
            </div>

            {/* 风险提示 */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h4 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                风险提示
              </h4>
              <p className="text-xs text-gray-400">
                请注意设置合理的滑点容差，避免因价格波动导致交易失败或损失
              </p>
            </div>
          </div>
        </div>
      </div>
    </TradingLayout>
  );
}

/**
 * Swap 骨架屏
 */
function SwapSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 animate-pulse">
      <div className="h-6 bg-gray-800 rounded w-24 mb-6" />
      <div className="space-y-4">
        <div className="h-32 bg-gray-800 rounded-lg" />
        <div className="h-32 bg-gray-800 rounded-lg" />
      </div>
      <div className="h-12 bg-gray-800 rounded-lg mt-6" />
    </div>
  );
}
