'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import TradingLayout from '@/components/Layout/TradingLayout';

const AssetPanel = dynamic(() => import('@/components/Asset/AssetPanel'), {
  loading: () => <AssetSkeleton />,
  ssr: false,
});

/**
 * 资产组合页面
 */
export default function PortfolioPage() {
  return (
    <TradingLayout>
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">资产组合</h1>
          <p className="text-gray-400">查看您的持仓和盈亏情况</p>
        </div>

        {/* 资产面板 */}
        <Suspense fallback={<AssetSkeleton />}>
          <AssetPanel />
        </Suspense>

        {/* 底部提示 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">多元化投资</h3>
                <p className="text-sm text-gray-400">分散持仓可以有效降低投资风险</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">实时更新</h3>
                <p className="text-sm text-gray-400">资产价格和盈亏实时更新</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">透明计算</h3>
                <p className="text-sm text-gray-400">盈亏计算基于实时市场价格</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TradingLayout>
  );
}

/**
 * 资产管理骨架屏
 */
function AssetSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 animate-pulse">
      <div className="p-6 border-b border-gray-800">
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 bg-gray-800 rounded w-20 mb-2" />
              <div className="h-8 bg-gray-800 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
      <div className="p-6">
        <div className="h-6 bg-gray-800 rounded w-24 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
