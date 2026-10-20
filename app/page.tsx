import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* 导航栏 */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center font-bold text-xl text-white">
              D
            </div>
            <span className="text-xl font-bold text-white">DeFi Trading</span>
          </div>
          <Link
            href="/market"
            className="px-6 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            启动应用
          </Link>
        </div>
      </nav>

      {/* Hero 区域 */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* 标题 */}
          <div className="mb-8">
            <span className="inline-block px-4 py-2 bg-purple-600/20 text-purple-300 text-sm rounded-full mb-4 border border-purple-500/30">
              基于 Solana 的去中心化行情平台
            </span>
            <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
              新一代 DeFi
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                交易体验
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              专业级 K线图表、实时订单簿深度、闪电般的交易速度。
              <br />
              基于 Jupiter 聚合器，为您找到最优交易路径。
            </p>
          </div>

          {/* CTA 按钮 */}
          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href="/market"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              查看行情
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors border border-white/20"
            >
              查看文档
            </a>
          </div>

          {/* 功能特性 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            {/* 实时行情 */}
            <div className="p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:border-purple-500/50 transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">实时行情</h3>
              <p className="text-gray-400 text-sm">
                专业级 K线图表，支持多周期切换，实时订单簿深度展示
              </p>
            </div>

            {/* 最优路径 */}
            <div className="p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:border-purple-500/50 transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">最优路径</h3>
              <p className="text-gray-400 text-sm">
                集成 Jupiter 聚合器，自动为您找到最优交易路径和最佳价格
              </p>
            </div>

            {/* 安全快速 */}
            <div className="p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:border-purple-500/50 transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">安全快速</h3>
              <p className="text-gray-400 text-sm">
                基于 Solana 高性能区块链，交易确认快速，Gas 费用低廉
              </p>
            </div>
          </div>

          {/* 技术栈 */}
          <div className="mt-20 p-8 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
            <h3 className="text-lg font-bold text-white mb-6">技术栈</h3>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="px-4 py-2 bg-white/10 rounded-lg text-gray-300 text-sm font-medium">
                Next.js 14
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-gray-300 text-sm font-medium">
                TypeScript
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-gray-300 text-sm font-medium">
                Solana Web3.js
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-gray-300 text-sm font-medium">
                TradingView Charts
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-gray-300 text-sm font-medium">
                Jupiter API
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-lg text-gray-300 text-sm font-medium">
                Zustand
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-white/10 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              <p>© 2026 DeFi Trading Platform. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-6">
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
