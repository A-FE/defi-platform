'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import WalletButton from '@/components/Wallet/WalletButton';
import PriceTicker from '@/components/Ticker/PriceTicker';
import { DEFAULT_SYMBOL } from '@/constants/api';

// 动态导入大组件（代码分割）
const KlineChart = dynamic(() => import('@/components/Chart/KlineChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const OrderBook = dynamic(() => import('@/components/OrderBook/OrderBook'), {
  loading: () => <OrderBookSkeleton />,
  ssr: false,
});

const SwapPanel = dynamic(() => import('@/components/Swap/SwapPanel'), {
  loading: () => <SwapSkeleton />,
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
          {/* 左侧：K线图 */}
          <div className="lg:col-span-9">
            <Suspense fallback={<ChartSkeleton />}>
              <KlineChart symbol={symbol} defaultInterval="1h" />
            </Suspense>
          </div>

          {/* 右侧：订单簿 */}
          <div className="lg:col-span-3">
            <Suspense fallback={<OrderBookSkeleton />}>
              <OrderBook symbol={symbol} />
            </Suspense>
          </div>
        </div>

        {/* 底部：Swap 交易面板 */}
        <div className="mt-6">
          <Suspense fallback={<SwapSkeleton />}>
            <SwapPanel defaultFrom="SOL" defaultTo="USDC" />
          </Suspense>
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
 * K线图骨架屏
 */
function ChartSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 h-[600px] animate-pulse">
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-800 rounded w-12" />
        ))}
      </div>
      <div className="h-full bg-gray-800 rounded" />
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

/**
 * Swap 骨架屏
 */
function SwapSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-md mx-auto animate-pulse">
      <div className="h-6 bg-gray-800 rounded w-24 mb-6" />
      <div className="space-y-4">
        <div className="h-32 bg-gray-800 rounded-lg" />
        <div className="h-32 bg-gray-800 rounded-lg" />
      </div>
      <div className="h-12 bg-gray-800 rounded-lg mt-6" />
    </div>
  );
}
