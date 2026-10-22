# Market 页面性能优化计划

## 背景
market 行情页面存在性能问题，需要进行全面优化。

## 已识别的性能问题

### 1. **高频渲染问题**

#### 问题 1.1: OrderBook 每 100ms 高频更新
- **位置**: `stores/depth/useDepthStore.ts:40-43`
- **问题**: Mock 数据每 100ms 触发一次深度更新
- **影响**: 每秒 10 次渲染，消耗大量 CPU
- **优化**: 降低更新频率到 200-500ms

#### 问题 1.2: PriceTicker 频繁重渲染
- **位置**: `components/Ticker/PriceTicker.tsx:20-29`
- **问题**: 每次 K 线数据更新都会触发 `bars` 读取，导致组件重渲染
- **影响**: 与 WebSocket 更新频率相同（1-5秒一次）
- **优化**: 使用 selector 只订阅最新的 bar

#### 问题 1.3: 图表实时更新频率不一致
- **位置**: `stores/kline/useKlineStore.ts:120-130`
- **问题**: 不同周期使用固定的更新间隔（1-5秒），但实际应该根据周期动态调整
- **优化**: 重新评估更新频率策略

### 2. **不必要的计算和数据处理**

#### 问题 2.1: 深度数据每次全量处理
- **位置**: `stores/depth/useDepthStore.ts:86-98`
- **问题**: 每次更新都创建新数组、排序、计算累计量
- **影响**: O(n log n) 排序复杂度，每 100ms 执行一次
- **优化**: 使用增量更新，维护有序数组

#### 问题 2.2: 重复的数据结构转换
- **位置**: `components/Chart/hooks/useKlineDataLoader.ts:107-118`
- **问题**: 每次加载都要转换整个数据集的格式
- **影响**: O(n) 遍历，数据量大时影响明显
- **优化**: 在数据源头统一格式

#### 问题 2.3: useMemo 依赖项不精确
- **位置**: `components/OrderBook/OrderBook.tsx:169-171`
- **问题**: `maxTotal` 计算依赖整个 `bids` 和 `asks` 数组
- **影响**: 数组引用变化就会重新计算，即使实际值没变
- **优化**: 只依赖数组的第一项

### 3. **内存泄漏和资源管理**

#### 问题 3.1: setTimeout 未清理
- **位置**: `stores/depth/useDepthStore.ts:108-110`
- **问题**: 高亮清除的 setTimeout 可能在组件卸载时未清理
- **影响**: 潜在的内存泄漏和错误
- **优化**: 将 timeout ID 保存到 ref，组件卸载时清理

#### 问题 3.2: 多个 useEffect 监听相同数据
- **位置**: `components/Ticker/PriceTicker.tsx:36-60`
- **问题**: 依赖项包含 `latestBar` 对象，每次更新都创建新定时器
- **影响**: 定时器累积
- **优化**: 只依赖 `latestBar.close` 原始值

#### 问题 3.3: WebSocket 订阅未正确清理
- **位置**: 多处订阅逻辑
- **问题**: 订阅返回的清理函数可能未被正确调用
- **影响**: 内存泄漏，重复订阅
- **优化**: 确保所有订阅都在 useEffect 清理函数中取消

### 4. **组件渲染优化不足**

#### 问题 4.1: PriceTicker 未使用 React.memo
- **位置**: `components/Ticker/PriceTicker.tsx:19`
- **问题**: 父组件重渲染会导致 PriceTicker 重渲染
- **影响**: 不必要的 DOM 更新
- **优化**: 添加 React.memo 和精确的 props 比较

#### 问题 4.2: DepthRow 的 memo 可能失效
- **位置**: `components/OrderBook/OrderBook.tsx:84-128`
- **问题**: `isChanged` prop 来自 Set，Set 引用变化会破坏 memo
- **影响**: memo 优化失效
- **优化**: 使用稳定的标识符，或将 Set 转为对象

#### 问题 4.3: 大列表渲染未虚拟化
- **位置**: `components/OrderBook/OrderBook.tsx:37-62`
- **问题**: 渲染 30 个 DOM 节点（买卖各 15 档）
- **影响**: 高频更新时 DOM 操作开销大
- **优化**: 考虑使用虚拟列表（如果档位增加）

### 5. **Zustand Store 性能问题**

#### 问题 5.1: Store 更新过于频繁
- **位置**: `stores/depth/useDepthStore.ts:100-105`
- **问题**: 每次深度更新都调用 set，触发所有订阅者
- **影响**: 连锁反应，多个组件同时重渲染
- **优化**: 使用 `shallow` 比较，或批量更新

#### 问题 5.2: 未使用 selector 优化
- **位置**: `components/Ticker/PriceTicker.tsx:20`
- **问题**: `const { bars } = useKlineStore()` 订阅整个 store
- **影响**: store 任何部分更新都会触发重渲染
- **优化**: 使用 selector 只订阅需要的数据

#### 问题 5.3: changedPrices Set 每次更新都创建新实例
- **位置**: `stores/depth/useDepthStore.ts:84`
- **问题**: 每次更新创建新 Set，破坏引用相等性
- **影响**: 依赖它的组件无法优化
- **优化**: 使用不可变更新模式，或使用 Map

### 6. **数据流设计问题**

#### 问题 6.1: 双重数据状态
- **位置**: `components/Chart/hooks/useKlineChart.ts:39-40`
- **问题**: 同时维护 `fullKlineData` 和 `displayKlineData`
- **影响**: 每次更新需要同步两份数据
- **优化**: 统一使用一份数据，通过 slice 派生显示数据

#### 问题 6.2: 数据在多个地方存储
- **位置**: Store + 组件 state + 图表实例
- **问题**: K 线数据存在于 store.bars、useState、chart.setData 三个地方
- **影响**: 数据不一致风险，更新复杂度高
- **优化**: 单一数据源，其他地方通过引用或计算获取

## 优化策略

### 阶段 1: 高频渲染优化（优先级：高）
1. 降低 OrderBook Mock 更新频率：100ms → 300ms
2. 优化 PriceTicker selector，只订阅最新 bar
3. 添加 requestAnimationFrame 节流到更多高频更新组件

### 阶段 2: 计算性能优化（优先级：高）
1. 深度数据增量更新：维护有序数组，避免重复排序
2. 优化 useMemo 依赖项，只依赖原始值
3. 减少数据格式转换

### 阶段 3: 内存和资源管理（优先级：中）
1. 清理所有定时器和订阅
2. 使用 AbortController 管理异步操作
3. 实现组件级别的资源清理检查

### 阶段 4: 组件级优化（优先级：中）
1. 为所有主要组件添加 React.memo
2. 优化 props 比较函数
3. 使用 useCallback 稳定回调引用

### 阶段 5: 状态管理优化（优先级：低）
1. 全面使用 Zustand selector
2. 实现批量状态更新
3. 减少状态层级，扁平化数据结构

### 阶段 6: 架构重构（优先级：低，长期）
1. 统一数据流：单一数据源
2. 实现数据缓存层
3. 考虑使用 Web Worker 处理计算密集任务

## 预期效果

- **FPS**: 从 30-40 提升到稳定 60
- **内存**: 减少 20-30% 内存占用
- **响应性**: 用户交互延迟 < 16ms
- **CPU**: 空闲时 CPU 使用率 < 5%

## 实施顺序

1. ✅ 首先：OrderBook 更新频率优化（立即见效）
2. ✅ 其次：PriceTicker selector 优化（显著改善）
3. ✅ 然后：深度数据增量更新（核心优化）
4. 接着：添加 React.memo 和 useCallback
5. 最后：状态管理和架构优化

## 风险评估

- **低风险**: 更新频率调整、添加 memo
- **中风险**: 数据结构修改、算法优化
- **高风险**: 架构重构、数据流改造

## 测试验证

每个优化后需要验证：
1. Chrome DevTools Performance 录制对比
2. React DevTools Profiler 组件渲染次数
3. Memory Profiler 内存快照对比
4. 用户体验测试（流畅度、响应性）
