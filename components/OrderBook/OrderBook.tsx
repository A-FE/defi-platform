'use client';

import React, { useEffect, useMemo,  memo } from 'react';
import { useDepthStore } from '@/stores';
import { DepthItem } from '@/types/market';
import EmptyState from '@/components/EmptyState/EmptyState';

interface OrderBookProps {
  symbol: string;
  maxLevels?: number;
}

/**
 * 订单簿主组件
 * ✅ 性能优化 V4：
 * 1. 每个状态单独订阅，避免对象/shallow 比较问题
 * 2. Zustand 自动优化：只在引用变化时触发重渲染
 * 3. 优化 DepthRow memo 比较逻辑
 */

const OrderBookComponent = ({ symbol, maxLevels = 15 }: OrderBookProps) => {
  // ✅ 单独订阅每个状态，引用稳定，无需 shallow
  const bids = useDepthStore((state) => state.bids);
  const asks = useDepthStore((state) => state.asks);
  const changedPrices = useDepthStore((state) => state.changedPrices);
  const subscribe = useDepthStore((state) => state.subscribe);
  const unsubscribe = useDepthStore((state) => state.unsubscribe);

  // 订阅深度数据
  useEffect(() => {
    const cleanup = subscribe(symbol);
    return () => {
      cleanup();
      unsubscribe(symbol);
    };
  }, [symbol, subscribe, unsubscribe]);

  // ✅ 性能优化：预处理需要渲染的数据，避免在 render 中 slice
  const visibleAsks = useMemo(() => asks.slice(0, maxLevels), [asks, maxLevels]);
  const visibleBids = useMemo(() => bids.slice(0, maxLevels), [bids, maxLevels]);

  // 检查是否有数据
  const hasData = bids.length > 0 || asks.length > 0;

  // ✅ 修复：计算所有可见数据中的最大累计量
  const maxTotal = useMemo(() => {
    let max = 0;

    // 遍历可见买盘
    visibleBids.forEach((bid) => {
      if (bid.total !== undefined && bid.total > max) {
        max = bid.total;
      }
    });

    // 遍历可见卖盘
    visibleAsks.forEach((ask) => {
      if (ask.total !== undefined && ask.total > max) {
        max = ask.total;
      }
    });

    return max || 1; // 避免除以 0
  }, [visibleBids, visibleAsks]);

  return (
    <div className="bg-gray-900 h-full flex flex-col">
      <h3 className="text-lg font-bold px-4 pt-4 pb-2 text-white border-b border-gray-800">订单簿</h3>

      {!hasData ? (
        <EmptyState
          title="暂无数据"
          message="当前没有可用的订单簿数据"
        />
      ) : (
        <>
          {/* 表头 */}
          <div className="px-4 pt-3">
            <OrderBookHeader />
          </div>

          {/* 卖盘（倒序显示） */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col-reverse space-y-0.5 space-y-reverse px-4">
            {visibleAsks.map((ask: DepthItem) => (
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
          <div className="px-4 py-2">
            <CurrentPrice price={bids[0]?.price || asks[0]?.price || 0} />
          </div>

          {/* 买盘 */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-0.5 px-4 pb-4">
            {visibleBids.map((bid: DepthItem) => (
              <DepthRow
                key={`bid-${bid.price}`}
                item={bid}
                type="bid"
                maxTotal={maxTotal}
                isChanged={changedPrices.has(bid.price)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ✅ 性能优化：使用 memo 避免父组件重渲染时的不必要更新
export const OrderBook = memo(OrderBookComponent);

/**
 * 订单簿表头
 * ✅ 性能优化：使用 memo 避免不必要的重渲染
 */
const OrderBookHeader = memo(() => {
  return (
    <div className="grid grid-cols-3 text-gray-400 text-xs mb-2 pb-2 border-b border-gray-800">
      <div>价格 (USDT)</div>
      <div className="text-right">数量 (BTC)</div>
      <div className="text-right">累计</div>
    </div>
  );
});

OrderBookHeader.displayName = 'OrderBookHeader';

/**
 * 单行深度组件
 * ✅ 性能优化：
 * 1. 使用自定义比较函数，优化 memo 效果
 * 2. 使用合成属性（transform/opacity）做动画，避免重排
 */
const DepthRow = memo(
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
    // ✅ 用当前累计量 / 最大累计量计算百分比（不会超过 100%）
    const percent = maxTotal > 0 ? ((item.total || 0) / maxTotal) * 100 : 0;
    const bgColor = type === 'bid' ? 'bg-green-900/20' : 'bg-red-900/20';

    return (
      <div
        className={`relative grid grid-cols-3 text-xs py-1 px-2 rounded transition-opacity duration-200 ${
          isChanged ? 'bg-yellow-900/30' : ''
        }`}
      >
        {/* 进度条背景 - 使用 width 但避免频繁变化触发重排 */}
        <div
          className={`absolute inset-y-0 right-0 ${bgColor} transition-opacity duration-300`}
          style={{
            width: `${percent}%`,
          }}
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
  // ✅ 性能优化：自定义比较函数，只比较实际变化的值
  (prevProps, nextProps) => {
    return (
      prevProps.item.price === nextProps.item.price &&
      prevProps.item.quantity === nextProps.item.quantity &&
      prevProps.item.total === nextProps.item.total &&
      prevProps.maxTotal === nextProps.maxTotal &&
      prevProps.isChanged === nextProps.isChanged &&
      prevProps.type === nextProps.type
    );
  },
);

DepthRow.displayName = 'DepthRow';

/**
 * 当前价格显示
 * ✅ 性能优化：使用 memo 避免不必要的重渲染
 */
const CurrentPrice = memo(({ price }: { price: number }) => {
  return (
    <div className="py-2 px-3 bg-gray-800 rounded flex items-center justify-between">
      <span className="text-gray-400 text-sm">当前价格</span>
      <span className="text-white text-base font-bold">{price.toFixed(2)}</span>
    </div>
  );
});

CurrentPrice.displayName = 'CurrentPrice';

export default OrderBook;
