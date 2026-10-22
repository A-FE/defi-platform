'use client';

import { useIndicatorStore } from '@/stores';
import { KlineInterval, IndicatorType } from '@/types';
import { KLINE_INTERVALS } from '@/constants/api';
import { INDICATOR_META } from '@/constants/indicators';

interface ChartControlsProps {
  interval: KlineInterval;
  onIntervalChange: (interval: KlineInterval) => void;
}

/**
 * K线图控制栏
 * 职责：周期切换 + 指标开关（平铺布局）
 */
// eslint-disable-next-line max-lines-per-function
export function ChartControls({ interval, onIntervalChange }: ChartControlsProps) {
  const { configs, toggleIndicator } = useIndicatorStore();

  // 分组：主图指标和副图指标
  const mainIndicators: IndicatorType[] = ['MA', 'BOLL'];
  const subIndicators: IndicatorType[] = ['RSI', 'MACD', 'KDJ', 'VOL'];

  // 防止 SSR 时 configs 未定义
  if (!configs) {
    return null;
  }

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
                onClick={() => {
                  const t0 = performance.now();
                  console.info(`[ChartControls] 🖱️ 点击指标: ${type}`, { timestamp: Date.now() });

                  toggleIndicator(type);

                  const t1 = performance.now();
                  console.info(`[ChartControls] ⏱️ toggleIndicator 耗时: ${(t1 - t0).toFixed(2)}ms`);
                }}
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

        {/* 副图指标 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">副图</span>
          {subIndicators.map((type) => {
            const config = configs[type];
            const meta = INDICATOR_META[type];

            return (
              <button
                key={type}
                onClick={() => {
                  const t0 = performance.now();
                  console.info(`[ChartControls] 🖱️ 点击指标: ${type}`, { timestamp: Date.now() });

                  toggleIndicator(type);

                  const t1 = performance.now();
                  console.info(`[ChartControls] ⏱️ toggleIndicator 耗时: ${(t1 - t0).toFixed(2)}ms`);
                }}
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

      
      </div>
    </>
  );
}

export default ChartControls;
