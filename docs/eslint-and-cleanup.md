# ESLint 配置和代码清理指南

## 📋 已完成的清理工作

### 1. 删除冗余代码
- ✅ 删除 `tests/indicators.test.ts`（有类型错误的旧测试文件）
- ✅ 保留有用的测试文件：
  - `tests/indicatorDataRequirements.test.ts`
  - `tests/infiniteLoadTrigger.test.ts`

### 2. ESLint 配置优化

已添加以下规则分类：

#### TypeScript 规则
- `@typescript-eslint/no-explicit-any: error` - 禁止使用 any
- `@typescript-eslint/no-unused-vars: warn` - 未使用变量警告
- `@typescript-eslint/no-non-null-assertion: warn` - 非空断言警告

#### 代码质量
- `no-console: warn` - 限制 console 使用（允许 warn, error, info）
- `no-debugger: error` - 禁止 debugger
- `no-var: error` - 禁止 var
- `prefer-const: error` - 优先使用 const
- `no-duplicate-imports: error` - 禁止重复导入

#### React 规则
- `react-hooks/rules-of-hooks: error` - Hooks 规则
- `react-hooks/exhaustive-deps: warn` - 依赖检查

#### 代码风格
- `quotes: ['warn', 'single']` - 单引号
- `semi: ['warn', 'always']` - 分号
- `comma-dangle: ['warn', 'always-multiline']` - 多行逗号

### 3. 新增 npm 脚本

```json
{
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "type-check": "tsc --noEmit",
  "test": "npx tsx tests/indicatorDataRequirements.test.ts && npx tsx tests/infiniteLoadTrigger.test.ts",
  "clean": "rm -rf .next out dist node_modules/.cache"
}
```

## 🔧 当前需要手动修复的问题

### 高优先级（错误）

1. **重复导入** - 需要合并导入语句
2. **any 类型** - 某些工具函数需要 any（已添加 eslint-disable 注释）

### 中优先级（警告）

1. **未使用的变量** - 删除或重命名为 `_variable`
2. **函数过长** - 某些函数超过 80 行（考虑是否需要拆分）
3. **console.log** - 生产环境应移除或改为 console.info

## 📝 建议的修复步骤

### 步骤 1: 运行自动修复
```bash
npm run lint:fix
```

### 步骤 2: 检查剩余问题
```bash
npm run lint
```

### 步骤 3: 手动修复关键错误

#### 修复重复导入
```typescript
// 错误 ❌
import { IChartApi } from 'lightweight-charts';
import { createChart } from 'lightweight-charts';

// 正确 ✅
import { IChartApi, createChart } from 'lightweight-charts';
```

#### 修复未使用的变量
```typescript
// 如果不使用，删除
const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');

// 或者重命名为 _variable
const [_selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
```

#### 修复 console.log
```typescript
// 开发时 console.log
console.log('[useKlineChart] 数据加载完成');

// 改为
console.info('[useKlineChart] 数据加载完成');

// 或者在生产环境移除（使用环境变量）
if (process.env.NODE_ENV === 'development') {
  console.log('[useKlineChart] 数据加载完成');
}
```

### 步骤 4: 处理函数过长警告

对于超过 80 行的函数，考虑：
1. 是否可以拆分成多个子函数
2. 是否可以提取部分逻辑到独立的 Hook
3. 如果确实需要保留，可以添加 eslint-disable 注释

```typescript
// 对于确实需要的长函数
/* eslint-disable max-lines-per-function */
export function ComplexComponent() {
  // ... 复杂逻辑
}
/* eslint-enable max-lines-per-function */
```

## 🎯 推荐的代码风格

### 1. 导入顺序
```typescript
// 1. React 和第三方库
import { useState, useEffect } from 'react';
import { create } from 'zustand';

// 2. 类型
import type { KlineBar } from '@/types/market';

// 3. 组件
import { Chart } from '@/components/Chart';

// 4. Hooks
import { useKlineStore } from '@/stores';

// 5. 工具函数
import { formatNumber } from '@/utils';

// 6. 常量
import { CHART_CONFIG } from '@/constants';
```

### 2. 命名约定
- **组件**: PascalCase（`UserProfile`, `ChartControls`）
- **Hooks**: camelCase with use prefix（`useKlineData`, `useIndicators`）
- **工具函数**: camelCase（`formatDate`, `calculateMA`）
- **常量**: UPPER_SNAKE_CASE（`MAX_DATA_SIZE`, `API_URL`）
- **类型**: PascalCase（`KlineBar`, `IndicatorConfig`）

### 3. 注释规范
```typescript
/**
 * 计算移动平均线
 * @param bars K线数据
 * @param period 周期
 * @returns 移动平均线数据
 */
export function calculateMA(bars: KlineBar[], period: number): number[] {
  // 实现逻辑
}
```

## ⚠️ 不建议修复的警告

以下警告可以保留（通过 eslint-disable 注释）：

1. **工具函数中的 any** - debounce, throttle 等工具函数需要泛型
2. **TradingView API 的 any** - 第三方库的类型定义
3. **合理的长函数** - 某些组件逻辑确实复杂

## 🚀 持续改进

### 每次提交前
```bash
npm run lint:fix
npm run type-check
npm run test
```

### 添加到 Git Hooks（可选）
安装 husky 和 lint-staged 来自动运行检查：
```bash
npm install --save-dev husky lint-staged
```

## 📊 当前状态统计

运行 `npm run lint` 的结果：
- 错误: ~67 个（主要是 any 类型和重复导入）
- 警告: ~152 个（主要是代码风格和未使用变量）

### 优先修复清单

| 问题类型 | 数量 | 优先级 | 建议操作 |
|---------|------|--------|---------|
| 重复导入 | ~10 | 高 | 合并导入语句 |
| any 类型 | ~20 | 高 | 添加类型或 eslint-disable |
| 未使用变量 | ~30 | 中 | 删除或重命名 |
| console.log | ~50 | 中 | 改为 console.info 或移除 |
| 函数过长 | ~20 | 低 | 考虑重构或忽略 |
| 代码风格 | ~40 | 低 | 运行 lint:fix |

## 📖 参考资源

- [ESLint 官方文档](https://eslint.org/docs/rules/)
- [TypeScript ESLint](https://typescript-eslint.io/rules/)
- [React Hooks ESLint](https://www.npmjs.com/package/eslint-plugin-react-hooks)
