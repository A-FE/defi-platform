# useKlineChart Hook 重构报告

**重构时间**: 2026-10-22  
**重构原因**: 原始文件 547 行，过于臃肿，难以维护

---

## 📊 重构前后对比

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| **主文件行数** | 547 行 | 107 行 |
| **Hook 数量** | 1 个巨型 Hook | 7 个专注的小 Hook |
| **最大单文件** | 547 行 | 153 行 (useKlineDataLoader) |
| **代码重用性** | 低（耦合紧密） | 高（各 Hook 可独立使用） |
| **可测试性** | 困难 | 容易（每个 Hook 可独立测试） |

---

## 🎯 拆分策略

### 1. **工具函数提取**
`utils/chartTimeFormat.ts` (102 行)
- `getIntervalSeconds()` - 获取周期对应的秒数
- `getTimeFormatOptions()` - 获取时间轴格式配置

### 2. **图表初始化**
`useChartInit.ts` (88 行)
- 创建 chart 实例
- 添加 K 线 series
- 初始化 IndicatorManager
- 响应式窗口大小调整

### 3. **时间格式更新**
`useTimeFormatUpdate.ts` (25 行)
- 监听周期变化
- 自动更新时间轴格式

### 4. **数据加载**
`useKlineDataLoader.ts` (153 行)
- 初始历史数据加载
- WebSocket 实时订阅
- 数据渲染到图表
- 可视范围设置

### 5. **历史数据加载**
`useLoadMoreHistory.ts` (134 行)
- 无限左滑加载更早数据
- 价格调整算法（确保连续性）
- 加载状态管理

### 6. **指标渲染**
`useIndicatorRenderer.ts` (38 行)
- 监听 K 线数据变化
- 监听指标配置变化
- 自动渲染指标

### 7. **无限滚动监听**
`useInfiniteScroll.ts` (30 行)
- 监听可视范围变化
- 触发历史数据加载

### 8. **主 Hook（编排层）**
`useKlineChart.ts` (107 行)
- 组合所有子 Hook
- 管理全局状态（interval, isLoading, klineData）
- 协调各模块交互
- 暴露统一 API

---

## 📁 新文件结构

```
components/Chart/hooks/
├── index.ts                      # 导出文件
├── useKlineChart.ts              # 主 Hook（编排层）107 行
├── useChartInit.ts               # 图表初始化 88 行
├── useKlineDataLoader.ts         # 数据加载 153 行
├── useLoadMoreHistory.ts         # 历史数据加载 134 行
├── useIndicatorRenderer.ts       # 指标渲染 38 行
├── useInfiniteScroll.ts          # 无限滚动监听 30 行
├── useTimeFormatUpdate.ts        # 时间格式更新 25 行
└── utils/
    └── chartTimeFormat.ts        # 时间格式工具 102 行
```

---

## ✨ 重构优势

### 1. **单一职责原则**
每个 Hook 只负责一个明确的功能，符合 SOLID 原则。

### 2. **可测试性提升**
```typescript
// 之前：必须测试整个 547 行的巨型 Hook
test('useKlineChart', () => { /* 复杂的 setup */ });

// 现在：可以独立测试每个小 Hook
test('useLoadMoreHistory', () => { /* 简单明确 */ });
test('useIndicatorRenderer', () => { /* 易于 mock */ });
```

### 3. **代码复用**
其他组件可以单独使用某个子 Hook：
```typescript
// 只需要图表初始化
const { chartRef } = useChartInitialization();

// 只需要时间格式工具
import { getIntervalSeconds } from '@/components/Chart/hooks';
```

### 4. **易于维护**
- 修改某个功能时，只需关注对应的小文件
- 减少 Git 冲突（多人协作时不会都修改同一个大文件）

### 5. **性能优化空间**
每个 Hook 的依赖更清晰，可以更精确地控制重渲染。

---

## 🔧 主 Hook 架构

```typescript
export function useKlineChart({ symbol, initialInterval }) {
  // 1. 状态管理
  const [interval, setInterval] = useState(initialInterval);
  const [klineData, setKlineData] = useState([]);

  // 2. 图表初始化
  const { chartRef, seriesRef, managerRef } = useChartInitialization();

  // 3. 时间格式
  useTimeFormatUpdate(chartRef, interval);

  // 4. 历史数据
  const { loadMoreHistory } = useLoadMoreHistory({ ... });

  // 5. 数据加载
  const { loadKlineData } = useKlineDataLoader({ ... });

  // 6. 指标渲染
  useIndicatorRenderer(chartRef, managerRef, klineData, indicators);

  // 7. 无限滚动
  useInfiniteScroll(chartRef, interval, loadMoreHistory);

  // 8. 对外接口
  return { chartRef, interval, setInterval, isLoading };
}
```

---

## 🎨 设计模式

### 1. **组合模式 (Composition)**
主 Hook 不实现具体逻辑，而是组合多个小 Hook。

### 2. **依赖注入**
子 Hook 通过参数接收依赖，而不是直接引用全局状态：
```typescript
// ✅ 好：显式依赖
function useIndicatorRenderer(chartRef, managerRef, data, configs) { }

// ❌ 坏：隐式依赖
function useIndicatorRenderer() {
  const { data } = useGlobalState(); // 难以测试
}
```

### 3. **关注点分离**
- **数据层**: useKlineDataLoader, useLoadMoreHistory
- **渲染层**: useIndicatorRenderer
- **交互层**: useInfiniteScroll
- **基础设施**: useChartInitialization, useTimeFormatUpdate

---

## 📝 使用示例

### 基础使用（与之前完全一致）
```typescript
const { containerRef, interval, setInterval } = useKlineChart({
  symbol: 'BTC/USDT',
  initialInterval: '1h'
});
```

### 高级定制（可选使用子 Hook）
```typescript
// 只需要图表实例，自己管理数据
import { useChartInitialization } from '@/components/Chart/hooks';

const { chartRef, seriesRef } = useChartInitialization();
// 自定义数据加载逻辑...
```

---

## 🧪 测试建议

### 单元测试
每个子 Hook 可以独立测试：
```typescript
describe('useLoadMoreHistory', () => {
  it('should load older bars when called', async () => {
    const { result } = renderHook(() => useLoadMoreHistory({ ... }));
    await act(() => result.current.loadMoreHistory('1h'));
    expect(mockFetchKlines).toHaveBeenCalled();
  });
});
```

### 集成测试
测试主 Hook 的整体行为：
```typescript
describe('useKlineChart', () => {
  it('should initialize chart and load data', async () => {
    const { result } = renderHook(() => useKlineChart({ ... }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
```

---

## 🚀 下一步优化建议

1. **类型安全增强**
   - 为 `onDataLoaded` 回调添加更严格的类型
   - 统一 `KlineBar` 的时间戳类型（number vs string）

2. **错误边界**
   - 添加 Error Boundary 处理各 Hook 的异常
   - 统一错误上报机制

3. **性能监控**
   - 使用 React DevTools Profiler 分析各 Hook 的渲染开销
   - 添加关键路径的性能埋点

4. **文档完善**
   - 为每个 Hook 添加 JSDoc 注释
   - 创建 Storybook 示例

---

## ✅ 重构完成清单

- [x] 提取工具函数到 `utils/chartTimeFormat.ts`
- [x] 创建 `useChartInitialization.ts`
- [x] 创建 `useTimeFormatUpdate.ts`
- [x] 创建 `useKlineDataLoader.ts`
- [x] 创建 `useLoadMoreHistory.ts`
- [x] 创建 `useIndicatorRenderer.ts`
- [x] 创建 `useInfiniteScroll.ts`
- [x] 重写主 Hook 为编排层
- [x] 更新 `hooks/index.ts` 导出
- [x] 修复 TypeScript 类型错误
- [x] 更新 `KlineChart.tsx` 调用方式
- [x] 通过类型检查

---

**重构结论**: 
从 547 行的单一文件拆分为 7 个专注的小 Hook + 1 个编排层，每个文件不超过 153 行。代码结构更清晰，可维护性、可测试性和可复用性大幅提升。
