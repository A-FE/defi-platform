'use client';

import { useState } from 'react';
import { TOKENS, getTokenBySymbol } from '@/constants/tokens';
import { useWalletStore, useTransactionStore } from '@/stores';
import { notify } from '@/stores/notification/useNotificationStore';

interface SwapPanelProps {
  defaultFrom?: string;
  defaultTo?: string;
}

/**
 * Swap 交易面板
 */
export function SwapPanel({ defaultFrom = 'SOL', defaultTo = 'USDC' }: SwapPanelProps) {
  const { wallet } = useWalletStore();
  const { addTransaction } = useTransactionStore();
  const [fromToken, setFromToken] = useState(defaultFrom);
  const [toToken, setToToken] = useState(defaultTo);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [isSwapping, setIsSwapping] = useState(false);

  const fromTokenInfo = getTokenBySymbol(fromToken);
  const toTokenInfo = getTokenBySymbol(toToken);

  // 模拟汇率计算
  const calculateToAmount = (amount: string) => {
    if (!amount || isNaN(parseFloat(amount))) {
      setToAmount('');
      return;
    }

    // Mock 汇率：1 SOL = 100 USDC
    const mockRate = fromToken === 'SOL' && toToken === 'USDC' ? 100 : 0.01;
    const result = parseFloat(amount) * mockRate;
    setToAmount(result.toFixed(6));
  };

  // 处理输入变化
  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    calculateToAmount(value);
  };

  // 交换代币
  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // 执行 Swap
  const handleSwap = async () => {
    if (!wallet?.connected) {
      notify.warning('请先连接钱包', '需要连接钱包才能进行交易');
      return;
    }

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      notify.warning('输入无效', '请输入有效的交易数量');
      return;
    }

    setIsSwapping(true);

    try {
      // 记录交易到历史
      addTransaction({
        type: 'swap',
        status: 'pending',
        fromToken,
        toToken,
        fromAmount: parseFloat(fromAmount),
        toAmount: parseFloat(toAmount),
        signature: `mock_${Date.now()}`,
      });

      // 显示交易开始通知
      notify.info('交易已提交', '正在处理您的 Swap 交易...');

      // 模拟交易延迟
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 显示成功通知
      notify.success(
        '交易成功！',
        `${fromAmount} ${fromToken} → ${toAmount} ${toToken}`
      );

      // 清空输入
      setFromAmount('');
      setToAmount('');
    } catch (error) {
      console.error('Swap error:', error);
      notify.error('交易失败', '请重试或检查网络连接');
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Swap</h3>
        <button
          onClick={() => setSlippage(slippage === 0.5 ? 1 : 0.5)}
          className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          滑点: {slippage}%
        </button>
      </div>

      {/* From 输入框 */}
      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">支付</span>
            {wallet?.connected && (
              <span className="text-xs text-gray-500">
                余额: {wallet.balance.toFixed(4)} {fromToken}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => handleFromAmountChange(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-2xl font-bold text-white outline-none"
            />

            {/* 代币选择器 */}
            <TokenSelector
              selectedToken={fromToken}
              onSelect={setFromToken}
              excludeToken={toToken}
            />
          </div>
        </div>

        {/* 交换按钮 */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={handleSwapTokens}
            className="w-10 h-10 bg-gray-800 rounded-full border-4 border-gray-900 flex items-center justify-center hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-400"
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
          </button>
        </div>

        {/* To 输入框 */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">接收</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              value={toAmount}
              readOnly
              placeholder="0.00"
              className="flex-1 bg-transparent text-2xl font-bold text-white outline-none"
            />

            {/* 代币选择器 */}
            <TokenSelector
              selectedToken={toToken}
              onSelect={setToToken}
              excludeToken={fromToken}
            />
          </div>
        </div>
      </div>

      {/* 交易详情 */}
      {fromAmount && toAmount && (
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>汇率</span>
            <span className="text-gray-300">
              1 {fromToken} ≈{' '}
              {fromToken === 'SOL' && toToken === 'USDC' ? '100' : '0.01'} {toToken}
            </span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>价格影响</span>
            <span className="text-green-400">&lt; 0.01%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>最小接收</span>
            <span className="text-gray-300">
              {(parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6)} {toToken}
            </span>
          </div>
        </div>
      )}

      {/* Swap 按钮 */}
      <button
        onClick={handleSwap}
        disabled={!wallet?.connected || !fromAmount || isSwapping}
        className="w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {isSwapping ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            交易中...
          </span>
        ) : !wallet?.connected ? (
          '请先连接钱包'
        ) : !fromAmount ? (
          '请输入数量'
        ) : (
          'Swap'
        )}
      </button>

      {/* 提示信息 */}
      <div className="mt-4 text-center text-xs text-gray-500">
        由 Jupiter 聚合器提供最优路径
      </div>
    </div>
  );
}

/**
 * 代币选择器组件
 */
function TokenSelector({
  selectedToken,
  onSelect,
  excludeToken,
}: {
  selectedToken: string;
  onSelect: (token: string) => void;
  excludeToken?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tokenInfo = getTokenBySymbol(selectedToken);

  const availableTokens = Object.keys(TOKENS).filter((t) => t !== excludeToken);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
      >
        {tokenInfo?.logoURI && (
          <img src={tokenInfo.logoURI} alt={selectedToken} className="w-6 h-6 rounded-full" />
        )}
        <span className="font-bold text-white">{selectedToken}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* 菜单 */}
          <div className="absolute top-full mt-2 right-0 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-20 min-w-[200px] overflow-hidden">
            {availableTokens.map((token) => {
              const info = getTokenBySymbol(token);
              return (
                <button
                  key={token}
                  onClick={() => {
                    onSelect(token);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors text-left"
                >
                  {info?.logoURI && (
                    <img src={info.logoURI} alt={token} className="w-8 h-8 rounded-full" />
                  )}
                  <div>
                    <div className="font-bold text-white">{token}</div>
                    <div className="text-xs text-gray-400">{info?.name}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default SwapPanel;
