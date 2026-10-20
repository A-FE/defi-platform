'use client';

import { useState, useEffect } from 'react';
import { useIndicatorStore } from '@/stores';
import { IndicatorType } from '@/types/indicator';
import { INDICATOR_META } from '@/constants/indicators';

interface IndicatorConfigModalProps {
  type: IndicatorType;
  onClose: () => void;
}

/**
 * 指标参数配置弹窗
 * 功能：
 *  - 调整指标参数（如 MA 周期）
 *  - 自定义颜色
 *  - 重置为默认
 */
export function IndicatorConfigModal({ type, onClose }: IndicatorConfigModalProps) {
  const { configs, updateParams, updateColors, resetConfig } = useIndicatorStore();
  const config = configs[type];
  const meta = INDICATOR_META[type];

  const [params, setParams] = useState(config.params);
  const [colors, setColors] = useState(config.colors);

  // 当 config 变化时更新本地状态
  useEffect(() => {
    setParams(config.params);
    setColors(config.colors);
  }, [config]);

  const handleSave = () => {
    updateParams(type, params);
    updateColors(type, colors);
    onClose();
  };

  const handleReset = () => {
    resetConfig(type);
    setParams(meta.defaultParams);
    setColors(meta.defaultColors);
  };

  const handleParamChange = (key: string, value: string) => {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue > 0) {
      setParams({ ...params, [key]: numValue });
    }
  };

  const handleColorChange = (index: number, value: string) => {
    const newColors = [...colors];
    newColors[index] = value;
    setColors(newColors);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700 shadow-2xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-white">{meta.name} 配置</h3>
            <p className="text-xs text-gray-400 mt-1">{meta.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 内容区 */}
        <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
          {/* 参数配置 */}
          {Object.keys(params).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                参数设置
              </label>
              <div className="space-y-3">
                {Object.entries(params).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-sm text-gray-400 w-24">
                      {meta.paramLabels[key] || key}
                    </label>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      min="1"
                      step="1"
                      className="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 颜色配置 */}
          {colors.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                颜色设置
              </label>
              <div className="flex flex-wrap gap-3">
                {colors.map((color, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => handleColorChange(i, e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer border-2 border-gray-600 hover:border-purple-500 transition-colors"
                    />
                    <span className="text-xs text-gray-400 font-mono">
                      {color.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 说明提示 */}
          <div className="bg-gray-900/50 rounded p-3 border border-gray-700">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-xs text-gray-400">
                修改参数后将立即应用到图表。点击重置可恢复默认设置。
              </p>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-700">
          <button
            onClick={handleSave}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded font-medium transition-colors"
          >
            保存
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors"
          >
            重置
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded font-medium transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

export default IndicatorConfigModal;
