'use client';

import React, { useEffect, useMemo, useState, useRef, useCallback, memo } from 'react';
import { useDepthStore } from '@/stores';
import { DepthItem } from '@/types/market';

interface OrderBookProps {
  symbol: string;
  maxLevels?: number;
}

/**
 * 订单簿主组件
 * ✅ 性能优化：使用 React.memo 避免不必要的重渲染
 */
const OrderBookComponent = ({ symbol, maxLevels = 15 }: OrderBookProps) => {
  // ✅ 性能优化：使用 selector 只订阅需要的数据
  const bids = useDepthStore((state) => state.bids);
  const asks = useDepthStore((state) => state.asks);
  const changedPrices = useDepthStore((state) => state.changedPrices);
  const subscribe = useDepthStore((state) => state.subscribe);
  const unsubscribe = useDepthStore((state) => state.unsubscribe);

  // 订阅深度数据
  useEffect(() => {
    subscribe(symbol);
    return () => {
      unsubscribe(symbol);
    };
  }, [symbol, subscribe, unsubscribe]);

  // 渲染节流
  const { maxTotal } = useDepthRender(bids, asks);

  return (
    <div className="bg-gray-900 rounded-lg p-4 h-[600px] flex flex-col">
      <h3 className="text-lg font-bold mb-4 text-white">订单簿</h3>

      {/* 表头 */}
      <OrderBookHeader />

      {/* 卖盘（倒序显示） */}
      <div className="flex-1 overflow-hidden flex flex-col-reverse space-y-0.5 space-y-reverse">
        {asks.slice(0, maxLevels).map((ask) => (
          <DepthRow
            key={`ask-${ask.price}`}
            item={ask}
            type="ask"
            maxTotal={maxTotal}
            isChanged={changedPrices.has(ask.price)}
          />
        ))}
      </div>

      {/* 当前价格 */}
      <CurrentPrice price={bids[0]?.price || asks[0]?.price || 0} />

      {/* 买盘 */}
      <div className="flex-1 overflow-hidden space-y-0.5">
        {bids.slice(0, maxLevels).map((bid) => (
          <DepthRow
            key={`bid-${bid.price}`}
            item={bid}
            type="bid"
            maxTotal={maxTotal}
            isChanged={changedPrices.has(bid.price)}
          />
        ))}
      </div>
    </div>
  );
};

// ✅ 性能优化：使用 memo 避免父组件重渲染时的不必要更新
export const OrderBook = memo(OrderBookComponent);

/**
 * 订单簿表头
 */
function OrderBookHeader() {
  return (
    <div className="grid grid-cols-3 text-gray-400 text-xs mb-2 pb-2 border-b border-gray-800">
      <div>价格 (USDT)</div>
      <div className="text-right">数量 (BTC)</div>
      <div className="text-right">累计</div>
    </div>
  );
}

/**
 * 单行深度组件（React.memo 优化）
 */
const DepthRow = React.memo(
  ({
    item,
    type,
    maxTotal,
    isChanged,
  }: {
    item: DepthItem;
    type: 'bid' | 'ask';
    maxTotal: number;
    isChanged: boolean;
  }) => {
    const percent = ((item.total || 0) / maxTotal) * 100;
    const bgColor = type === 'bid' ? 'bg-green-900/20' : 'bg-red-900/20';

    return (
      <div
        className={`relative grid grid-cols-3 text-xs py-1 px-2 rounded transition-all duration-200 ${
          isChanged ? 'bg-yellow-900/30' : ''
        }`}
      >
        {/* 进度条背景 */}
        <div
          className={`absolute inset-y-0 right-0 ${bgColor} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />

        {/* 价格 */}
        <div className={`relative z-10 ${type === 'bid' ? 'text-green-400' : 'text-red-400'}`}>
          {item.price.toFixed(2)}
        </div>

        {/* 数量 */}
        <div className="relative z-10 text-right text-gray-300">
          {item.quantity.toFixed(4)}
        </div>

        {/* 累计 */}
        <div className="relative z-10 text-right text-gray-400">
          {(item.total || 0).toFixed(4)}
        </div>
      </div>
    );
  },
);

DepthRow.displayName = 'DepthRow';

/**
 * 当前价格显示
 */
function CurrentPrice({ price }: { price: number }) {
  return (
    <div className="my-2 py-2 px-3 bg-gray-800 rounded flex items-center justify-between">
      <span className="text-gray-400 text-sm">当前价格</span>
      <span className="text-white text-lg font-bold">{price.toFixed(2)}</span>
    </div>
  );
}

/**
 * 渲染节流 Hook（核心性能优化）
 */
function useDepthRender(bids: DepthItem[], asks: DepthItem[]) {
  const [renderTrigger, setRenderTrigger] = useState(0);
  const pendingRenderRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  const scheduleRender = useCallback(() => {
    if (pendingRenderRef.current) {return;}

    pendingRenderRef.current = true;
    rafIdRef.current = requestAnimationFrame(() => {
      setRenderTrigger((prev) => prev + 1);
      pendingRenderRef.current = false;
      rafIdRef.current = null;
    });
  }, []);

  // 监听深度变化，调度渲染
  useEffect(() => {
    scheduleRender();
  }, [bids, asks, scheduleRender]);

  // ✅ 性能优化：只依赖首项的 total 值，避免整个数组变化时重新计算
  const maxTotal = useMemo(() => {
    return Math.max(bids[0]?.total || 0, asks[0]?.total || 0);
  }, [bids[0]?.total, asks[0]?.total, renderTrigger]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return { renderTrigger, maxTotal };
}

export default OrderBook;
