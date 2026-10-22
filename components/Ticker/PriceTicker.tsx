/* eslint-disable max-lines-per-function */
'use client';

import { useEffect, useState, useRef } from 'react';
import { useKlineStore, useChartCrosshairStore } from '@/stores';

interface PriceTickerProps {
  symbol: string;
}

/**
 * 实时价格 Ticker 组件
 *
 * 功能：
 * - 鼠标 hover 图表时：显示当前点位的 K 线数据
 * - 鼠标未 hover 时：显示最新的 K 线数据
 * - 显示内容：价格、涨跌幅（相对开盘价）、高点、低点、成交量
 */
export function PriceTicker({ symbol }: PriceTickerProps) {
  const { bars } = useKlineStore();
  const { getCrosshair } = useChartCrosshairStore();

  const crosshair = getCrosshair(symbol);

  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number>(0);

  // 获取最新的 K 线数据
  const latestBar = bars.length > 0 ? bars[bars.length - 1] : null;

  // 决定显示的数据来源：hover 的 K 线 或 最新的 K 线
  const isHovering = crosshair?.isHovering && crosshair?.bar;
  const displayBar = isHovering ? crosshair.bar : latestBar;

  // 监听价格变化，触发颜色变化（仅在非 hover 状态）
  useEffect(() => {
    // 如果正在 hover，不触发价格变化动画
    if (isHovering) {
      return;
    }

    if (!latestBar) {
      return;
    }

    const currentPrice = latestBar.close;
    const prevPrice = prevPriceRef.current;

    if (currentPrice > prevPrice && prevPrice > 0) {
      setPriceDirection('up');
    } else if (currentPrice < prevPrice && prevPrice > 0) {
      setPriceDirection('down');
    }

    prevPriceRef.current = currentPrice;

    // 300ms 后恢复默认颜色
    const timer = setTimeout(() => setPriceDirection(null), 300);
    return () => clearTimeout(timer);
  }, [latestBar?.close, isHovering, latestBar]);

  if (!displayBar) {
    return (
      <div className="h-[72px] animate-pulse flex items-center">
        <div className="h-10 bg-gray-700 rounded w-32" />
      </div>
    );
  }

  // 显示数据（都来自 K 线）
  const price = displayBar.close;
  const open = displayBar.open;
  const high = displayBar.high;
  const low = displayBar.low;
  const volume = displayBar.volume;

  // 计算涨跌幅（相对该 K 线的开盘价）
  const change = ((displayBar.close - displayBar.open) / displayBar.open) * 100;
  const changeAmount = displayBar.close - displayBar.open;
  const isPositive = change >= 0;

  return (
    <div className="h-[72px] flex flex-col justify-center gap-2">
      {/* 第一行：价格 + 涨跌幅 */}
      <div className="flex items-baseline gap-4">
        {/* 当前价格 */}
        <div
          className={`text-4xl font-bold transition-colors duration-300 ${
            isHovering
              ? 'text-white' // hover 时固定白色
              : priceDirection === 'up'
              ? 'text-green-400'
              : priceDirection === 'down'
              ? 'text-red-400'
              : 'text-white'
          }`}
        >
          ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        {/* 涨跌幅 */}
        <div
          className={`flex items-center gap-1 text-base font-medium ${
            isPositive ? 'text-green-400' : 'text-red-400'
          }`}
        >
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>
            {isPositive ? '+' : ''}
            {change.toFixed(2)}%
          </span>
          <span className="text-sm opacity-75">
            ({isPositive ? '+' : ''}${Math.abs(changeAmount).toFixed(2)})
          </span>
        </div>
      </div>

      {/* 第二行：统计数据 + 时间（hover 时） */}
      <div className="flex items-center gap-4 text-sm">
        {/* 高点 */}
        <div className="text-gray-400">
          <span className="opacity-60">高：</span>
          <span className="text-gray-300 ml-1">
            ${high.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* 低点 */}
        <div className="text-gray-400">
          <span className="opacity-60">低：</span>
          <span className="text-gray-300 ml-1">
            ${low.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* 成交量 */}
        <div className="text-gray-400">
          <span className="opacity-60">量：</span>
          <span className="text-gray-300 ml-1">
            ${(volume / 1000).toFixed(2)}K
          </span>
        </div>

        {/* 时间显示（仅 hover 时，inline 显示） */}
        {isHovering && (
          <>
            <div className="w-px h-4 bg-gray-700" />
            <div className="text-gray-400">
              <span className="opacity-60">时间：</span>
              <span className="text-gray-300 ml-1">
                {new Date(displayBar.time * 1000).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PriceTicker;
