'use client';

import dynamic from 'next/dynamic';
import { Suspense, useState } from 'react';
import TradingLayout from '@/components/Layout/TradingLayout';
import PriceTicker from '@/components/Ticker/PriceTicker';
import { MARKET_SYMBOLS, DEFAULT_SYMBOL } from '@/constants/api';

// 动态导入大组件（代码分割）
const KlineChart = dynamic(() => import('@/components/Chart/KlineChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const OrderBook = dynamic(() => import('@/components/OrderBook/OrderBook'), {
  loading: () => <OrderBookSkeleton />,
  ssr: false,
});

/**
 * 行情页面 - K线图和订单簿
 */
export default function MarketPage() {
  const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOL);

  return (
    <TradingLayout>
      {/* 品种选择器 */}
      <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400 mr-2">选择品种:</span>
          {MARKET_SYMBOLS?.map((market) => (
            <button
              key={market.symbol}
              onClick={() => setSelectedSymbol(market.symbol)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedSymbol === market.symbol
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {market.name}
            </button>
          ))}
        </div>
      </div>

      {/* Ticker 行情 */}
      <div className="mb-6 p-6 bg-gray-900 rounded-lg border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{selectedSymbol}</h2>
            <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded">
              现货
            </span>
          </div>
        </div>
        <PriceTicker symbol={selectedSymbol} />
      </div>

      {/* K线图 + 订单簿 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：K线图 */}
        <div className="lg:col-span-9">
          <Suspense fallback={<ChartSkeleton />}>
            <KlineChart key={selectedSymbol} symbol={selectedSymbol} defaultInterval="1h" />
          </Suspense>
        </div>

        {/* 右侧：订单簿 */}
        <div className="lg:col-span-3">
          <Suspense fallback={<OrderBookSkeleton />}>
            <OrderBook key={selectedSymbol} symbol={selectedSymbol} />
          </Suspense>
        </div>
      </div>
    </TradingLayout>
  );
}

/**
 * K线图骨架屏
 */
function ChartSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg p-4 h-[600px] animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-48 mb-4" />
      <div className="h-[540px] bg-gray-800 rounded" />
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
