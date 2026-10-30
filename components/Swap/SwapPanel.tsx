'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { EVM_TOKENS, getTokenBySymbol, DEFAULT_SWAP_FROM, DEFAULT_SWAP_TO } from '@/constants/tokens';
import { useWalletStore } from '@/stores';
import { notify } from '@/stores/notification/useNotificationStore';
import { swapService, SwapQuote } from '@/services/swap';

interface SwapPanelProps {
  defaultFrom?: string;
  defaultTo?: string;
}

/**
 * Swap 交易面板 - EVM 版本
 */
export function SwapPanel({ defaultFrom = DEFAULT_SWAP_FROM, defaultTo = DEFAULT_SWAP_TO }: SwapPanelProps) {
  const { wallet } = useWalletStore();
  const [fromToken, setFromToken] = useState(defaultFrom);
  const [toToken, setToToken] = useState(defaultTo);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取实时报价
  const fetchQuote = useCallback(async (amount: string) => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setToAmount('');
      setQuote(null);
      return;
    }

    setIsLoadingQuote(true);
    try {
      const quoteData = await swapService.getQuote(
        fromToken,
        toToken,
        parseFloat(amount),
        slippage,
      );

      if (quoteData) {
        setToAmount(quoteData.toAmount.toFixed(6));
        setQuote(quoteData);
      } else {
        setToAmount('');
        setQuote(null);
        notify.warning('无法获取报价', '请稍后重试或更换代币对');
      }
    } catch (error) {
      console.error('Failed to fetch quote:', error);
      setToAmount('');
      setQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  }, [fromToken, toToken, slippage]);

  // 处理输入变化
  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 使用 debounce 避免频繁请求
    debounceTimerRef.current = setTimeout(() => {
      fetchQuote(value);
    }, 500);
  };

  // 代币对或滑点改变时重新获取报价
  useEffect(() => {
    if (fromAmount) {
      // 使用定时器避免同步调用 setState
      const timer = setTimeout(() => {
        fetchQuote(fromAmount);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [fromToken, toToken, slippage, fetchQuote, fromAmount]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 交换代币
  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
    // 交换后重新获取报价
    if (toAmount) {
      fetchQuote(toAmount);
    }
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

    if (!quote) {
      notify.warning('无法执行交易', '请等待报价加载完成');
      return;
    }

    // 提示用户功能未实现
    notify.warning(
      '功能开发中',
      '真实的链上交易功能正在开发中，需要集成 Uniswap/1inch 等 DEX 智能合约',
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-6 shadow-2xl">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white">Swap</h3>
        <button
          onClick={() => setSlippage(slippage === 0.5 ? 1 : 0.5)}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all duration-200 text-sm font-medium border border-gray-700"
        >
          滑点: {slippage}%
        </button>
      </div>

      {/* From 输入框 */}
      <div className="space-y-4">
        <div className="relative z-30 bg-gray-800/50 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-400">支付</span>
            {wallet?.connected && (
              <button
                onClick={() => handleFromAmountChange(wallet.balance.toString())}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                余额: {Number(wallet.balance).toFixed(4)} {fromToken}
              </button>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => handleFromAmountChange(e.target.value)}
              placeholder="0.00"
              className="flex-1 min-w-0 bg-transparent text-3xl font-bold text-white outline-none placeholder:text-gray-600"
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
        <div className="flex justify-center relative z-10">
          <button
            onClick={handleSwapTokens}
            className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-full border-gray-800 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg hover:shadow-purple-500/50"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>

        {/* To 输入框 */}
        <div className="relative z-20 bg-gray-800/50 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 hover:border-green-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-400">接收</span>
          </div>

          <div className="flex items-center">
            <input
              type="number"
              value={toAmount}
              readOnly
              placeholder="0.00"
              className="flex-1 min-w-0 bg-transparent text-3xl font-bold text-white outline-none placeholder:text-gray-600"
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
      {fromAmount && toAmount && quote && (
        <div className="mt-6 p-4 bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/30 space-y-3 text-sm">
          <div className="flex justify-between items-center text-gray-400">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              汇率
            </span>
            <span className="text-white font-medium">
              1 {fromToken} ≈ {quote.price.toFixed(6)} {toToken}
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-400">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              价格影响
            </span>
            <span className={`font-medium ${quote.priceImpact > 1 ? 'text-red-400' : quote.priceImpact > 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>
              {quote.priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-400">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              最小接收
            </span>
            <span className="text-white font-medium">
              {quote.minimumReceived.toFixed(6)} {toToken}
            </span>
          </div>
        </div>
      )}

      {/* 加载状态提示 */}
      {isLoadingQuote && (
        <div className="mt-6 p-4 bg-blue-500/10 backdrop-blur-sm rounded-xl border border-blue-500/30 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-400">正在获取最优报价...</span>
        </div>
      )}

      {/* Swap 按钮 */}
      <button
        onClick={handleSwap}
        disabled={!wallet?.connected || !fromAmount}
        className="w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98]"
      >
        {!wallet?.connected ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            请先连接钱包
          </span>
        ) : !fromAmount ? (
          '请输入数量'
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            立即兑换
          </span>
        )}
      </button>

      {/* 提示信息 */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          通过 <span className="text-purple-400 font-medium">Uniswap</span> 等 DEX 提供最优兑换路径
        </p>
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

  const availableTokens = Object.keys(EVM_TOKENS).filter((t) => t !== excludeToken);

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
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* 菜单 */}
          <div className="absolute top-full mt-2 right-0 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-50 min-w-[200px] overflow-hidden">
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
