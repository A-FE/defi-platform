'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WalletButton from '@/components/Wallet/WalletButton';

interface TradingLayoutProps {
  children: React.ReactNode;
}

/**
 * 行情页面共享布局
 */
export function TradingLayout({ children }: TradingLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/market', label: '行情', icon: '📊' },
    { href: '/market/swap', label: 'Swap', icon: '🔄' },
    { href: '/market/portfolio', label: '资产', icon: '💼' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 顶部导航栏 */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
                D
              </div>
              <div>
                <h1 className="text-xl font-bold">DeFi Trading</h1>
                <p className="text-xs text-gray-400">Solana DEX Platform</p>
              </div>
            </Link>

            {/* 导航菜单 */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* 钱包按钮 */}
            <WalletButton />
          </div>

          {/* 移动端导航 */}
          <nav className="md:hidden flex items-center gap-2 mt-4 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex-shrink-0 text-sm ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-4 py-6">{children}</main>

      {/* 页脚 */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              <p>DeFi Trading - Powered by Solana</p>
            </div>
            <div className="flex items-center gap-4">
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

export default TradingLayout;
