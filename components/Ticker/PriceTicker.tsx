'use client';

import { useEffect, useState } from 'react';
import { useTickerStore } from '@/stores';

interface PriceTickerProps {
  symbol: string;
}

/**
 * 实时价格 Ticker 组件
 */
export function PriceTicker({ symbol }: PriceTickerProps) {
  const { tickers, subscribe } = useTickerStore();
  const ticker = tickers[symbol];
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const [prevPrice, setPrevPrice] = useState<number>(0);

  // 订阅 Ticker 数据
  useEffect(() => {
    const unsubscribe = subscribe(symbol);
    return () =>  unsubscribe();
  }, [symbol, subscribe]);

  // 监听价格变化，触发颜色变化
  useEffect(() => {
    if (!ticker) return;

    if (ticker.price > prevPrice) {
      setPriceDirection('up');
    } else if (ticker.price < prevPrice) {
      setPriceDirection('down');
    }

    setPrevPrice(ticker.price);

    // 300ms 后恢复默认颜色
    const timer = setTimeout(() => setPriceDirection(null), 300);
    return () => clearTimeout(timer);
  }, [ticker?.price]);

  if (!ticker) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-700 rounded w-32 mb-2" />
        <div className="h-6 bg-gray-700 rounded w-24" />
      </div>
    );
  }

  const isPositive = ticker.change24h >= 0;

  return (
    <div className="space-y-2">
      {/* 当前价格 */}
      <div
        className={`text-4xl font-bold transition-colors duration-300 ${
          priceDirection === 'up'
            ? 'text-green-400'
            : priceDirection === 'down'
            ? 'text-red-400'
            : 'text-white'
        }`}
      >
        ${ticker.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      {/* 24h 涨跌幅 */}
      <div className="flex items-center gap-4 text-sm">
        <div
          className={`flex items-center gap-1 font-medium ${
            isPositive ? 'text-green-400' : 'text-red-400'
          }`}
        >
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>
            {isPositive ? '+' : ''}
            {ticker.change24h.toFixed(2)}%
          </span>
        </div>

        <div className="text-gray-400">
          <span className="opacity-60">24h 高：</span>
          <span className="text-gray-300 ml-1">
            ${ticker.high24h.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="text-gray-400">
          <span className="opacity-60">24h 低：</span>
          <span className="text-gray-300 ml-1">
            ${ticker.low24h.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="text-gray-400">
          <span className="opacity-60">24h 量：</span>
          <span className="text-gray-300 ml-1">
            ${(ticker.volume24h / 1000000).toFixed(2)}M
          </span>
        </div>
      </div>
    </div>
  );
}

export default PriceTicker;
