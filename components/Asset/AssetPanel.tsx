'use client';

import { useEffect } from 'react';
import { useAssetStore, useWalletStore } from '@/stores';

/**
 * 资产管理面板
 * 显示持仓列表、盈亏计算
 */
export function AssetPanel() {
  const { wallet } = useWalletStore();
  const { assets, isCalculating, loadAssets, calculatePnLDebounced } = useAssetStore();

  // 加载资产
  useEffect(() => {
    if (wallet?.connected) {
      loadAssets();
    }
  }, [wallet?.connected, loadAssets]);

  // 实时计算盈亏（防抖）
  useEffect(() => {
    if (assets && wallet?.connected) {
      calculatePnLDebounced();
    }
  }, [assets, wallet?.connected, calculatePnLDebounced]);

  if (!wallet?.connected) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-8">
        <div className="text-center text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          <p className="text-lg">请先连接钱包查看资产</p>
        </div>
      </div>
    );
  }

  if (!assets) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">加载资产数据中...</p>
        </div>
      </div>
    );
  }

  const totalPnL = assets.positions.reduce((sum, pos) => sum + (pos.unrealizedPnL || 0), 0);
  const totalPnLPercent =
    assets.positions.reduce(
      (sum, pos) => sum + (pos.quantity * pos.costPrice * (pos.pnlPercent || 0)) / 100,
      0
    ) /
      (assets.totalValueUSD || 1) *
      100 || 0;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      {/* 资产概览 */}
      <div className="p-6 border-b border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 总资产 */}
          <div>
            <div className="text-sm text-gray-400 mb-1">总资产价值</div>
            <div className="text-2xl font-bold text-white">
              ${assets.totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* 可用余额 */}
          <div>
            <div className="text-sm text-gray-400 mb-1">可用余额</div>
            <div className="text-2xl font-bold text-white">
              ${assets.availableUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* 未实现盈亏 */}
          <div>
            <div className="text-sm text-gray-400 mb-1">未实现盈亏</div>
            <div
              className={`text-2xl font-bold ${
                totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              <span className="text-base ml-2">
                ({totalPnL >= 0 ? '+' : ''}
                {totalPnLPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 持仓列表 */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">持仓列表</h3>

        {assets.positions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p>暂无持仓</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assets.positions.map((position) => (
              <div
                key={position.symbol}
                className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* 左侧：代币信息 */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center font-bold">
                      {position.symbol.substring(0, 1)}
                    </div>
                    <div>
                      <div className="font-bold text-white">{position.symbol}</div>
                      <div className="text-sm text-gray-400">
                        {position.quantity.toFixed(4)} 个
                      </div>
                    </div>
                  </div>

                  {/* 右侧：盈亏信息 */}
                  <div className="text-right">
                    <div className="text-white font-medium">
                      ${((position.currentPrice || 0) * position.quantity).toFixed(2)}
                    </div>
                    <div
                      className={`text-sm ${
                        (position.pnlPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {(position.pnlPercent || 0) >= 0 ? '+' : ''}
                      {(position.pnlPercent || 0).toFixed(2)}%
                      <span className="ml-2">
                        ({(position.unrealizedPnL || 0) >= 0 ? '+' : ''}$
                        {(position.unrealizedPnL || 0).toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 成本价和当前价 */}
                <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-sm">
                  <div className="text-gray-400">
                    成本价: <span className="text-gray-300">${position.costPrice.toFixed(2)}</span>
                  </div>
                  <div className="text-gray-400">
                    当前价:{' '}
                    <span className="text-gray-300">
                      ${(position.currentPrice || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 刷新按钮 */}
      <div className="p-6 pt-0">
        <button
          onClick={() => loadAssets()}
          disabled={isCalculating}
          className="w-full py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {isCalculating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              计算中...
            </span>
          ) : (
            '刷新资产'
          )}
        </button>
      </div>
    </div>
  );
}

export default AssetPanel;
