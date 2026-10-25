'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TradingLayout from '@/components/Layout/TradingLayout';
import MarketList from '@/components/MarketPanel/MarketList';
import PriceTicker from '@/components/Ticker/PriceTicker';
import { useMarketStore } from '@/stores/market/useMarketStore';
import { DEFAULT_MARKET } from '@/constants/markets';

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
 * URL 参数同步组件（必须包裹在 Suspense 中）
 */
function URLSyncHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedSymbol, setSelectedSymbol } = useMarketStore();

  // ✅ 双向同步：URL ↔ Store
  useEffect(() => {
    const symbolFromUrl = searchParams.get('symbol');

    if (symbolFromUrl) {
      // URL 有参数，同步到 store（如果不同）
      if (symbolFromUrl !== selectedSymbol) {
        setSelectedSymbol(symbolFromUrl);
      }
    } else {
      // URL 没有参数，用 store 的值更新 URL
      const symbolToUse = selectedSymbol || DEFAULT_MARKET;
      router.replace(`/market?symbol=${symbolToUse}`, { scroll: false });
    }
    // ⚠️ 只依赖 searchParams，避免死循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ✅ Store 变化时更新 URL（用户点击币种列表时触发）
  useEffect(() => {
    const currentUrlSymbol = searchParams.get('symbol');
    if (selectedSymbol && currentUrlSymbol !== selectedSymbol) {
      router.replace(`/market?symbol=${selectedSymbol}`, { scroll: false });
    }
    // ⚠️ 只在 selectedSymbol 变化时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

  return null; // 这个组件不渲染任何内容
}

/**
 * 行情页面 - 左中右三栏布局（优化版）
 * 左：币种列表 (220px)
 * 中：Ticker + K线图 (flex-1)
 * 右：订单簿 (320px)
 *
 * ✅ 优化：
 * - 使用固定高度避免图表压扁
 * - 左中右三栏统一高度
 * - Ticker 栏固定高度，K线区域占据剩余空间
 * - 币种选择同步到 URL 参数（支持刷新和分享）
 */
export default function MarketPage() {
  const { selectedSymbol } = useMarketStore();

  return (
    <TradingLayout>
      {/* URL 参数同步逻辑（包裹在 Suspense 中） */}
      <Suspense fallback={null}>
        <URLSyncHandler />
      </Suspense>

      {/*
        左中右三栏布局
        高度：100vh - Header(64px) - Footer(56px) - Padding(16px) = calc(100vh - 136px)
        最小高度：800px（防止图表被压扁）
      */}
      <div className="flex h-[calc(100vh-136px)] min-h-[800px]">
        {/* 左侧：币种列表（220px 固定宽度，全高度） */}
        <MarketList />

        {/* 中间：Ticker + K线图（弹性布局，全高度） */}
        <div className="flex-1 flex flex-col min-w-[600px] h-full">
          {/* Ticker 行情栏（固定高度 100px） */}
          <div className="h-[100px] flex-shrink-0 px-6 py-4 bg-gray-900 border-b border-gray-800">
            <PriceTicker symbol={selectedSymbol} />
          </div>

          {/* K线图主区域（占据剩余高度） */}
          <div className="flex-1 min-h-[600px] p-4">
            <Suspense fallback={<ChartSkeleton />}>
              <KlineChart
                symbol={selectedSymbol}
                defaultInterval="1h"
              />
            </Suspense>
          </div>
        </div>

        {/* 右侧：订单簿（320px 固定宽度，全高度） */}
        <div className="w-[320px] h-full border-l border-gray-800 overflow-hidden">
          <Suspense fallback={<OrderBookSkeleton />}>
            <OrderBook symbol={selectedSymbol} />
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
    <div className="bg-gray-900 rounded-lg p-4 w-full h-full animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-48 mb-4" />
      <div className="h-[calc(100%-3rem)] bg-gray-800 rounded" />
    </div>
  );
}

/**
 * 订单簿骨架屏
 */
function OrderBookSkeleton() {
  return (
    <div className="bg-gray-900 w-full h-full p-4 animate-pulse">
      <div className="h-6 bg-gray-800 rounded w-24 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="h-6 bg-gray-800 rounded" />
        ))}
      </div>
    </div>
  );
}
