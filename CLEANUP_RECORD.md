# 代码清理记录

## 2026-10-22

### 第一次清理：删除废弃的 useIndicators Hook

**文件**: `components/Chart/hooks/useIndicators.ts`

**删除原因**:
- ✅ 功能已被集成到 `useKlineChart` Hook 内部
- ✅ 项目中无其他地方引用此 Hook

---

### 第二次清理：删除冗余的 useKlineData Hook

**文件**: `components/Chart/hooks/useKlineData.ts`

**删除原因**:
- ✅ 功能与 `useKlineChart` 完全重复
- ✅ `useKlineChart` 包含了所有 `useKlineData` 的功能
- ✅ 只在 `index.ts` 中导出，但无实际使用
- ✅ 避免代码冗余，减少维护成本

**代码重复度**:
- `loadKlineData()` - 100% 相同
- `loadMoreHistory()` - 100% 相同
- WebSocket 订阅 - 100% 相同
- 无限左滑 - 100% 相同

**架构对比**:
```
useKlineData 职责:
├── K线数据加载
├── 周期切换
├── 实时订阅
└── 无限左滑

useKlineChart 职责:
├── 图表初始化 ← 额外功能
├── K线数据加载 ✅ 包含
├── 周期切换 ✅ 包含
├── 实时订阅 ✅ 包含
├── 无限左滑 ✅ 包含
└── 指标管理 ← 额外功能
```

**结论**: `useKlineChart` 是 `useKlineData` 的超集

---

### 清理后的 Chart Hooks 结构

```
components/Chart/hooks/
├── useChartInit.ts      # 图表初始化（待评估）
├── useKlineChart.ts     # ✅ 统一管理 Hook（推荐使用）
└── useSubChart.ts       # 副图管理
```

### 更新的导出文件

**components/Chart/index.ts**:
```typescript
export { KlineChart } from './KlineChart';
export { useKlineChart } from './hooks/useKlineChart';  // ✅ 推荐
export { useChartInit } from './hooks/useChartInit';
export { useSubChart } from './hooks/useSubChart';
```

---

## 下一步建议

### 可能需要清理的文件

1. **useChartInit.ts**
   - 如果 `useKlineChart` 已包含图表初始化
   - 检查是否还有其他组件使用

2. **useSubChart.ts**
   - 检查副图管理是否已被 `useKlineChart` 的 pane 管理替代
   - 确认实际使用情况

---

**维护原则**: 保持单一数据源，避免功能重复
**推荐使用**: `useKlineChart` 作为图表的唯一入口

