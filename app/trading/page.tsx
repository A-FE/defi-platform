'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import WalletButton from '@/components/Wallet/WalletButton';
import PriceTicker from '@/components/Ticker/PriceTicker';
import { DEFAULT_SYMBOL } from '@/constants/api';

// 动态导入大组件（代码分割）
const OrderBook = dynamic(() => import('@/components/OrderBook/OrderBook'), {
  loading: () => <OrderBookSkeleton />,
  ssr: false,
});

/**
 * 交易页面
 */
export default function TradingPage() {
  const symbol = DEFAULT_SYMBOL;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 顶部导航栏 */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
                D
              </div>
              <div>
                <h1 className="text-xl font-bold">DeFi Trading</h1>
                <p className="text-xs text-gray-400">Solana DEX Platform</p>
              </div>
            </div>

            {/* 钱包按钮 */}
            <WalletButton />
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-4 py-6">
        {/* Ticker 行情 */}
        <div className="mb-6 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{symbol}</h2>
              <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded">
                Spot
              </span>
            </div>
          </div>
          <PriceTicker symbol={symbol} />
        </div>

        {/* 交易布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧：K线图占位 */}
          <div className="lg:col-span-9">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 h-[600px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">K线图</h3>
                <p className="text-gray-400 text-sm">即将推出...</p>
                <p className="text-gray-500 text-xs mt-2">
                  TradingView Lightweight Charts 集成中
                </p>
              </div>
            </div>
          </div>

          {/* 右侧：订单簿 */}
          <div className="lg:col-span-3">
            <Suspense fallback={<OrderBookSkeleton />}>
              <OrderBook symbol={symbol} />
            </Suspense>
          </div>
        </div>

        {/* 底部：Swap 交易面板占位 */}
        <div className="mt-6 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Swap 交易</h3>
            <p className="text-gray-400 text-sm">Jupiter 聚合器集成中...</p>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              <p>DeFi Trading Platform - Powered by Solana</p>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white transition-colors">
                文档
              </a>
              <a href="#" className="hover:text-white transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Twitter
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * 订单簿骨架屏
 */
function OrderBookSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg p-4 h-[600px] animate-pulse">
      <div className="h-6 bg-gray-800 rounded w-24 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="h-6 bg-gray-800 rounded" />
        ))}
      </div>
    </div>
  );
}
