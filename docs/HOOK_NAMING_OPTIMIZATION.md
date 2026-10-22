# Hook 命名优化说明

## 🔍 发现的问题

### 1. **重复的图表初始化 Hook**
- ❌ `useChartInit.ts` (旧版，无 IndicatorManager)
- ❌ `useChartInitialization.ts` (新版，带 IndicatorManager)
- **问题**: 两个文件功能几乎相同，造成混淆

### 2. **命名过长**
- ❌ `useChartInitialization` - 23 个字符，太长
- ✅ `useChartInit` - 12 个字符，简洁

---

## ✅ 解决方案

### **删除重复文件**
```bash
# 删除旧的 useChartInit.ts（无 IndicatorManager）
rm components/Chart/hooks/useChartInit.ts

# 重命名新版本为更简洁的名字
mv useChartInitialization.ts → useChartInit.ts
```

### **最终 Hook 命名**

| Hook | 职责 | 命名解释 |
|------|------|----------|
| `useChartInit` | 图表初始化 | 简洁，清晰表达"初始化" |
| `useKlineDataLoader` | 数据加载 | 明确表达"K线数据加载器" |
| `useLoadMoreHistory` | 历史加载 | 明确表达"加载更多历史" |
| `useInfiniteScroll` | 滚动监听 | 标准命名，表达"无限滚动" |
| `useIndicatorRenderer` | 指标渲染 | 明确表达"指标渲染器" |
| `useTimeFormatUpdate` | 时间格式 | 明确表达"时间格式更新" |

---

## 📊 职责边界清晰化

### **useInfiniteScroll vs useLoadMoreHistory**

这两个 Hook 容易混淆，但职责不同：

```typescript
// useInfiniteScroll - 监听器（只负责监听，不执行加载）
// 职责：监听用户滚动到左边界，触发回调
export function useInfiniteScroll(
  chartRef,
  interval,
  onLoadMore  // 👈 只触发回调，不执行加载
) {
  // 监听可视范围变化
  // 当滚动到左边界时，调用 onLoadMore()
}

// useLoadMoreHistory - 执行器（执行实际的数据加载）
// 职责：获取历史数据，价格调整，更新图表
export function useLoadMoreHistory({
  fetchKlines,  // 👈 实际执行数据请求
  onDataLoaded
}) {
  const loadMoreHistory = async () => {
    // 1. 请求历史数据
    const olderBars = await fetchKlines(...)
    // 2. 价格调整算法
    // 3. 更新图表
  }
}
```

**协作流程**:
```
用户滚动
  ↓
useInfiniteScroll 检测到边界
  ↓
触发 onLoadMore 回调
  ↓
useLoadMoreHistory.loadMoreHistory() 执行
  ↓
数据加载完成
```

---

## 🎯 命名原则

### 1. **简洁 > 冗长**
- ✅ `useChartInit` (12 字符)
- ❌ `useChartInitialization` (23 字符)

### 2. **一致性**
- 所有 Hook 都以 `use` 开头
- 都使用驼峰命名
- 长度控制在 12-20 字符

### 3. **职责明确**
- `Loader` 后缀 = 数据加载器
- `Renderer` 后缀 = 渲染器
- `Init` 后缀 = 初始化
- `Update` 后缀 = 更新器

---

## ✅ 最终文件清单

```
components/Chart/hooks/
├── useKlineChart.ts           ✅ 主 Hook（编排层）
├── useChartInit.ts            ✅ 图表初始化（已合并，保留带 IndicatorManager 版本）
├── useKlineDataLoader.ts      ✅ 数据加载
├── useLoadMoreHistory.ts      ✅ 历史数据加载（执行器）
├── useInfiniteScroll.ts       ✅ 无限滚动监听（监听器）
├── useIndicatorRenderer.ts    ✅ 指标渲染
├── useTimeFormatUpdate.ts     ✅ 时间格式更新
└── utils/
    └── chartTimeFormat.ts     ✅ 时间格式工具
```

**总计**: 7 个专注的子 Hook + 1 个编排 Hook + 1 个工具文件

---

## 🔄 更新内容

### 已更新的文件
1. ✅ `useKlineChart.ts` - 导入语句
2. ✅ `hooks/index.ts` - 导出语句
3. ✅ `REFACTORING_REPORT_useKlineChart.md` - 文档

### TypeScript 检查
✅ 所有类型检查通过，无错误

---

**结论**: 删除了重复的 `useChartInit.ts`（旧版），统一使用更简洁的命名，职责边界更清晰。
