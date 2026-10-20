'use client';

import { useIndicatorStore } from '@/stores';
import { KlineInterval, IndicatorType } from '@/types';
import { KLINE_INTERVALS, INTERVAL_LABELS } from '@/constants/api';
import { INDICATOR_META } from '@/constants/indicators';
import { useState } from 'react';
import { IndicatorConfigModal } from './IndicatorConfigModal';

interface ChartControlsProps {
  interval: KlineInterval;
  onIntervalChange: (interval: KlineInterval) => void;
}

/**
 * K线图控制栏
 * 职责：周期切换 + 指标开关（平铺布局）
 */
export function ChartControls({ interval, onIntervalChange }: ChartControlsProps) {
  const { configs, toggleIndicator } = useIndicatorStore();
  const [showConfig, setShowConfig] = useState(false);
  const [selectedType, setSelectedType] = useState<IndicatorType | null>(null);

  // 分组：主图指标和副图指标
  const mainIndicators: IndicatorType[] = ['MA', 'EMA', 'BOLL'];
  const subIndicators: IndicatorType[] = ['RSI', 'MACD', 'KDJ', 'VOL'];

  // 防止 SSR 时 configs 未定义
  if (!configs) {
    return null;
  }

  const handleConfigClick = (type: IndicatorType) => {
    setSelectedType(type);
    setShowConfig(true);
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-3 px-2 flex-wrap">
        {/* 周期选择 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">周期</span>
          {KLINE_INTERVALS.map((int) => (
            <button
              key={int}
              onClick={() => onIntervalChange(int)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                interval === int
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              {int}
            </button>
          ))}
        </div>

        {/* 分隔线 */}
        <div className="h-6 w-px bg-gray-700" />

        {/* 主图指标 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">主图</span>
          {mainIndicators.map((type) => {
            const config = configs[type];
            const meta = INDICATOR_META[type];

            return (
              <button
                key={type}
                onClick={() => toggleIndicator(type)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  config.enabled
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                }`}
                title={meta.description}
              >
                {meta.name}
              </button>
            );
          })}
        </div>

        {/* 分隔线 */}
        <div className="h-6 w-px bg-gray-700" />

        {/* 副图指标 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">副图</span>
          {subIndicators.map((type) => {
            const config = configs[type];
            const meta = INDICATOR_META[type];

            return (
              <button
                key={type}
                onClick={() => toggleIndicator(type)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  config.enabled
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                }`}
                title={meta.description}
              >
                {meta.name}
              </button>
            );
          })}
        </div>

        {/* 右侧：参数配置 */}
        <div className="ml-auto">
          <button
            onClick={() => {
              // 找到第一个启用的指标
              const enabledType = Object.entries(configs).find(([_, cfg]) => cfg.enabled)?.[0] as IndicatorType;
              if (enabledType) {
                handleConfigClick(enabledType);
              }
            }}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="指标参数配置"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 参数配置弹窗 */}
      {showConfig && selectedType && (
        <IndicatorConfigModal
          type={selectedType}
          onClose={() => setShowConfig(false)}
        />
      )}
    </>
  );
}

export default ChartControls;
