'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { IChartApi } from 'lightweight-charts';
import type { LegendItem } from './hooks/useIndicatorLegend';

interface IndicatorLegendProps {
  legends: LegendItem[];
  chartRef: React.RefObject<IChartApi | null>;
}

/**
 * 指标图例组件
 *
 * 职责：在每个 panel 的左上角精确显示指标标题和实时数值
 *
 * 优化：
 * - 使用 pane.getHTMLElement() 获取 pane 的 DOM 元素
 * - 直接在 pane 的 HTML 中插入图例节点
 * - 避免 React 状态更新和 RAF 循环，大幅降低内存消耗
 * - 数值更新时只修改文本内容，不重新创建 DOM 节点
 */
// eslint-disable-next-line max-lines-per-function
export function IndicatorLegend({ legends, chartRef }: IndicatorLegendProps) {
  // 缓存已创建的 DOM 元素引用
  const legendElementsRef = useRef<Map<string, HTMLSpanElement>>(new Map());

  // 按 paneIndex 分组
  const groupedByPane = useMemo(() => {
    return legends.reduce((acc, item) => {
      if (!acc[item.paneIndex]) {
        acc[item.paneIndex] = [];
      }
      acc[item.paneIndex].push(item);
      return acc;
    }, {} as Record<number, LegendItem[]>);
  }, [legends]);

  // 获取最后一项数据的序列化表示，用于监听数据变化
  const lastLegendKey = useMemo(() => {
    if (legends.length === 0) {return '';}
    const last = legends[legends.length - 1];
    return `${last.indicator}-${last.title}-${last.value}`;
  }, [legends]);

  // 跟踪是否已创建 DOM（避免重复创建）
  const isInitializedRef = useRef(false);

  // 初始化：创建图例 DOM 结构
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) {
      console.warn('[IndicatorLegend] Chart not ready');
      return;
    }

    // 如果没有图例数据，不创建 DOM
    if (Object.keys(groupedByPane).length === 0 || !lastLegendKey) {
      console.warn('[IndicatorLegend] No legend data, skipping DOM creation');
      return;
    }

    // 如果已经初始化过，不重复创建 DOM
    if (isInitializedRef.current) {
      console.log('[IndicatorLegend] Already initialized, skipping');
      return;
    }

    const panes = chart.panes();
    const createdContainers = new Map<number, HTMLDivElement>();

    console.log('[IndicatorLegend] Initializing legends:', {
      panesCount: panes.length,
      groupedByPane: Object.keys(groupedByPane),
      legendsCount: legends.length,
    });

    // 为每个 pane 创建并插入图例元素
    Object.entries(groupedByPane).forEach(([paneIndex, items]) => {
      const paneNum = Number(paneIndex);
      const pane = panes[paneNum];

      if (!pane) {
        console.warn(`[IndicatorLegend] Pane ${paneNum} not found`);
        return;
      }

      const paneElement = pane.getHTMLElement();
      if (!paneElement) {
        console.warn(`[IndicatorLegend] Pane ${paneNum} HTML element not ready`);
        return;
      }

      console.log(`[IndicatorLegend] Creating legend for pane ${paneNum} with ${items.length} items`);

      // 创建图例容器
      const legendContainer = document.createElement('div');
      legendContainer.style.position = 'absolute';
      legendContainer.style.left = '8px';
      legendContainer.style.top = '8px';
      legendContainer.style.display = 'flex';
      legendContainer.style.flexWrap = 'wrap';
      legendContainer.style.gap = '12px';
      legendContainer.style.fontSize = '12px';
      legendContainer.style.pointerEvents = 'none';
      legendContainer.style.zIndex = '10';
      legendContainer.dataset.paneLegend = paneIndex;

      // 添加图例项
      items.forEach((item, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.display = 'flex';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.gap = '4px';

        // 标题
        const titleSpan = document.createElement('span');
        titleSpan.textContent = item.title;
        titleSpan.style.color = item.color;
        // titleSpan.style.fontWeight = '500';

        // 数值（保存引用以便后续更新）
        const valueSpan = document.createElement('span');
        valueSpan.textContent = item.value;
        valueSpan.style.color = '#ffffff';
        // valueSpan.style.fontWeight = '600';

        // 生成唯一 key 并缓存引用
        const key = `${paneIndex}-${item.indicator}-${idx}`;
        legendElementsRef.current.set(key, valueSpan);

        itemDiv.appendChild(titleSpan);
        itemDiv.appendChild(valueSpan);
        legendContainer.appendChild(itemDiv);
      });

      // 插入到 pane 元素中
      paneElement.style.position = 'relative';
      paneElement.appendChild(legendContainer);

      createdContainers.set(paneNum, legendContainer);
      console.log(`[IndicatorLegend] ✅ Legend created for pane ${paneNum}`);
    });

    // 标记为已初始化
    isInitializedRef.current = true;

    // 清理函数：移除所有创建的图例元素
    return () => {
      console.log('[IndicatorLegend] Cleaning up legends');
      createdContainers.forEach((element) => {
        element.remove();
      });
      createdContainers.clear();
      legendElementsRef.current.clear();
      isInitializedRef.current = false;
    };
  }, [chartRef, groupedByPane, lastLegendKey]);

  // 更新数值：当 legends 变化时，只更新文本内容
  useEffect(() => {
    Object.entries(groupedByPane).forEach(([paneIndex, items]) => {
      items.forEach((item, idx) => {
        const key = `${paneIndex}-${item.indicator}-${idx}`;
        const valueSpan = legendElementsRef.current.get(key);

        if (valueSpan) {
          valueSpan.textContent = item.value;
        }
      });
    });
  }, [legends, groupedByPane]);

  // 不需要渲染任何 React 元素
  return null;
}
