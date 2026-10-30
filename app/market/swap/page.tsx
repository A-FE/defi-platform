'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import TradingLayout from '@/components/Layout/TradingLayout';

const SwapPanel = dynamic(() => import('@/components/Swap/SwapPanel'), {
  loading: () => <SwapSkeleton />,
  ssr: false,
});

/**
 * 代币兑换页面
 */
export default function SwapPage() {
  return (
    <TradingLayout>
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            代币兑换
          </h1>
          <p className="text-gray-400 text-lg">通过 Uniswap 等 DEX 获取最优兑换路径</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左侧：特性介绍 */}
          <div className="lg:col-span-4 space-y-6">
            {/* 特性卡片 */}
            <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">超快速度</h3>
              </div>
              <p className="text-gray-300 leading-relaxed">
                基于以太坊生态的去中心化交易，安全可靠，享受极致的 DeFi 体验
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-600/10 to-emerald-600/10 rounded-xl border border-green-500/20 p-6 hover:border-green-500/40 transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">最优价格</h3>
              </div>
              <p className="text-gray-300 leading-relaxed">
                智能聚合 Uniswap、SushiSwap 等多个 DEX，实时对比价格，为您找到最优惠的兑换路径
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-xl border border-blue-500/20 p-6 hover:border-blue-500/40 transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">安全可靠</h3>
              </div>
              <p className="text-gray-300 leading-relaxed">
                所有交易通过审计的智能合约执行，资金安全由区块链技术保障
              </p>
            </div>

            {/* 风险提示 */}
            <div className="bg-gradient-to-br from-yellow-600/10 to-orange-600/10 rounded-xl border border-yellow-500/30 p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-yellow-400 font-bold mb-2">风险提示</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    加密货币交易存在风险，请根据自身情况合理设置滑点容差，避免因价格剧烈波动造成损失
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 中间：兑换表单 */}
          <div className="lg:col-span-5">
            <Suspense fallback={<SwapSkeleton />}>
              <SwapPanel defaultFrom="ETH" defaultTo="USDC" />
            </Suspense>
          </div>

          {/* 右侧：数据统计 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 24小时统计 */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                24 小时统计
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">交易量</div>
                  <div className="text-2xl font-bold text-white">$125.8M</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">交易笔数</div>
                  <div className="text-2xl font-bold text-white">45,231</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">活跃用户</div>
                  <div className="text-2xl font-bold text-white">8,492</div>
                </div>
              </div>
            </div>

            {/* 热门交易对 */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                </svg>
                热门交易对
              </h3>
              <div className="space-y-3">
                {[
                  { from: 'ETH', to: 'USDC', volume: '$45.2M' },
                  { from: 'WETH', to: 'USDT', volume: '$28.7M' },
                  { from: 'WBTC', to: 'USDC', volume: '$15.3M' },
                ].map((pair, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{pair.from}</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <span className="text-white font-medium">{pair.to}</span>
                    </div>
                    <span className="text-sm text-gray-400">{pair.volume}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 费用说明 */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                费用说明
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">平台费用</span>
                  <span className="text-white font-medium">0.25%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gas 费用</span>
                  <span className="text-white font-medium">动态调整</span>
                </div>
                <div className="pt-3 border-t border-gray-800 text-xs text-gray-500">
                  * 实际费用可能因网络拥堵程度略有差异
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TradingLayout>
  );
}

/**
 * 兑换骨架屏
 */
function SwapSkeleton() {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 animate-pulse">
      <div className="h-6 bg-gray-800 rounded w-24 mb-6" />
      <div className="space-y-4">
        <div className="h-32 bg-gray-800 rounded-lg" />
        <div className="h-32 bg-gray-800 rounded-lg" />
      </div>
      <div className="h-12 bg-gray-800 rounded-lg mt-6" />
    </div>
  );
}
