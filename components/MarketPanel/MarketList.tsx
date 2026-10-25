'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MARKETS } from '@/constants/markets';
import { useMarketStore } from '@/stores/market/useMarketStore';
import { useTickerStore } from '@/stores/ticker/useTickerStore';

export default function MarketList() {
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedSymbol, setSelectedSymbol } = useMarketStore();
  const tickers = useTickerStore((state) => state.tickers);
  const subscribe = useTickerStore((state) => state.subscribe);

  // 订阅所有币种的 ticker 数据
  useEffect(() => {
    const cleanups = MARKETS.map((market) => subscribe(market.symbol));
    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [subscribe]);

  // 搜索过滤
  const filteredMarkets = MARKETS.filter(market =>
    market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    market.baseAsset.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="w-[320px] h-full bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">交易市场</h3>
      </div>

      {/* 搜索框 */}
      <div className="p-3 border-b border-gray-800">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索币种..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-800 text-white text-sm rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors"
          />
          {/* 搜索图标 */}
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* 币种列表（滚动区域） */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredMarkets.length > 0 ? (
          filteredMarkets.map((market) => {
            const ticker = tickers[market.symbol];
            const isPositive = ticker && ticker.change24h >= 0;

            return (
              <button
                key={market.symbol}
                onClick={() => setSelectedSymbol(market.symbol)}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-all duration-200 ${
                  selectedSymbol === market.symbol
                    ? 'bg-purple-600/20 border-l-2 border-purple-600'
                    : 'border-l-2 border-transparent'
                }`}
              >
                {/* 币种图标 */}
                <div className="relative flex-shrink-0">
                  <Image
                    src={market.icon || '/placeholder.png'}
                    alt={market.baseAsset}
                    width={36}
                    height={36}
                    className="rounded-full"
                    unoptimized
                  />
                  {selectedSymbol === market.symbol && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 rounded-full border-2 border-gray-900" />
                  )}
                </div>

                {/* 币种信息 */}
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {market.name}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {market.dex || 'DEX'}
                  </div>
                </div>

                {/* 价格和涨跌幅 */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {ticker ? (
                    <>
                      {/* 价格 */}
                      <div className="text-sm font-medium text-white">
                        ${ticker.price.toLocaleString()}
                      </div>
                      {/* 24H 涨跌幅 */}
                      <div
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          isPositive
                            ? 'text-green-400 bg-green-500/10'
                            : 'text-red-400 bg-red-500/10'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {ticker.change24h.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 加载中占位符 */}
                      <div className="h-4 w-16 bg-gray-800 rounded animate-pulse" />
                      <div className="h-4 w-12 bg-gray-800 rounded animate-pulse" />
                    </>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">未找到匹配的币种</p>
          </div>
        )}
      </div>

      {/* 底部统计 */}
      <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-500">交易对数量</span>
        <span className="text-xs font-medium text-purple-400">
          {filteredMarkets.length}
        </span>
      </div>
    </div>
  );
}
