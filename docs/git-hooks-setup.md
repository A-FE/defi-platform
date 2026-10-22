# Git Commit 前 ESLint 校验配置

## ✅ 已完成配置

### 1. 安装的依赖

```json
{
  "husky": "^9.1.7",      // Git Hooks 管理
  "lint-staged": "^17.6.0", // 只对暂存文件运行检查
  "prettier": "^3.x"       // 代码格式化
}
```

### 2. Git Hook 配置

#### `.husky/pre-commit`
```bash
npx lint-staged
```

每次 `git commit` 时自动运行 lint-staged。

### 3. Lint-Staged 配置

#### `package.json` 中的配置
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings=0"
    ]
  }
}
```

**说明**：
- 只检查暂存的 `.ts` 和 `.tsx` 文件
- 自动修复可修复的问题（`--fix`）
- 不允许任何警告（`--max-warnings=0`）
- 如果有错误或警告，提交将被阻止

### 4. Prettier 配置

#### `.prettierrc.json`
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

## 🔧 工作流程

### 正常提交流程

```bash
# 1. 修改代码
vim components/Chart/ChartPanel.tsx

# 2. 暂存文件
git add components/Chart/ChartPanel.tsx

# 3. 提交（会自动运行 ESLint 检查）
git commit -m "feat: 优化图表性能"

# 如果有 ESLint 错误：
# ❌ 提交被阻止
# ⋯ Running tasks for staged files…
# ✖ eslint --fix --max-warnings=0
# ✖ Failed to run tasks for staged files!

# 如果通过检查：
# ✅ 提交成功
# ✔ Running tasks for staged files
# [main abc1234] feat: 优化图表性能
```

### 提交被阻止时的处理

#### 场景 1: 可自动修复的问题

```bash
# lint-staged 已经自动修复并暂存
git commit -m "feat: 优化图表性能"
# ✅ 第二次提交会成功
```

#### 场景 2: 需要手动修复的问题

```bash
# 1. 查看具体错误
npm run lint

# 2. 手动修复代码
vim components/Chart/ChartPanel.tsx

# 3. 重新暂存
git add components/Chart/ChartPanel.tsx

# 4. 再次提交
git commit -m "feat: 优化图表性能"
```

## ⚠️ 当前需要修复的问题

运行测试时发现以下问题需要修复才能提交：

### 高优先级（错误 - 必须修复）

1. **重复导入** - `useChartInit.ts`
   ```typescript
   // 错误 ❌
   import { IChartApi } from 'lightweight-charts';
   import { createChart } from 'lightweight-charts';
   
   // 正确 ✅
   import { IChartApi, createChart } from 'lightweight-charts';
   ```

### 中优先级（警告 - 建议修复）

1. **未使用的变量**
   ```typescript
   // 删除或重命名为 _variable
   const [_selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
   ```

2. **console.log 使用**
   ```typescript
   // 改为
   console.info('[Debug] 数据加载完成');
   ```

3. **函数过长**
   - 某些组件超过 80 行
   - 考虑拆分或添加 eslint-disable 注释

## 🚀 快速修复指南

### 步骤 1: 修复阻塞性错误

```bash
# 修复重复导入
vim components/Chart/hooks/useChartInit.ts

# 将两行 import 合并为一行
import { IChartApi, ISeriesApi, createChart } from 'lightweight-charts';
```

### 步骤 2: 修复警告（可选但推荐）

```bash
# 运行自动修复
npm run lint:fix

# 查看剩余问题
npm run lint
```

### 步骤 3: 临时跳过检查（不推荐）

```bash
# 仅在紧急情况下使用
git commit -m "fix: 紧急修复" --no-verify

# ⚠️ 警告：这会跳过所有检查，不建议使用
```

## 📋 配置的规则

### ESLint 规则优先级

| 类型 | 处理方式 |
|------|---------|
| **error** | 🔴 阻止提交 |
| **warning** | 🟡 允许提交（但 --max-warnings=0 会阻止） |

当前配置：`--max-warnings=0`，即**所有警告都会阻止提交**。

### 如果觉得规则太严格

可以修改 `package.json`：

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix"  // 移除 --max-warnings=0，允许警告
    ]
  }
}
```

或者调整 ESLint 规则级别（`eslint.config.mjs`）：

```javascript
{
  rules: {
    'no-console': 'off',  // 关闭规则
    'max-lines-per-function': 'off',  // 关闭函数行数限制
  }
}
```

## 🔄 常用命令

### 开发时检查

```bash
# 检查所有文件
npm run lint

# 自动修复
npm run lint:fix

# 类型检查
npm run type-check

# 运行测试
npm run test
```

### Git 相关

```bash
# 查看暂存的文件
git diff --cached --name-only

# 取消暂存
git reset HEAD <file>

# 跳过 Hook（紧急情况）
git commit --no-verify
```

## 📊 配置文件总览

```
defi-platform/
├── .husky/
│   └── pre-commit          # Git Hook 脚本
├── .prettierrc.json        # Prettier 配置
├── .prettierignore         # Prettier 忽略文件
├── eslint.config.mjs       # ESLint 配置
└── package.json            # lint-staged 配置
```

## 🎯 最佳实践

### 1. 提交前检查
```bash
# 养成习惯：提交前先运行检查
npm run lint
npm run type-check
git add .
git commit -m "feat: 新功能"
```

### 2. 小步提交
- 每次提交只包含相关的改动
- 避免一次提交大量文件
- 如果检查失败，影响范围小

### 3. 及时修复警告
- 不要累积大量警告
- 定期运行 `npm run lint:fix`
- 保持代码质量

### 4. 团队协作
- 所有成员使用相同的配置
- 提交前必须通过检查
- 代码风格统一

## 🆘 常见问题

### Q: 提交时卡住不动？
A: lint-staged 正在运行检查，等待完成。如果文件很多可能需要几秒钟。

### Q: 想跳过某次检查？
A: 使用 `git commit --no-verify`，但不建议频繁使用。

### Q: 某个文件无法通过检查？
A: 
1. 查看具体错误：`npm run lint`
2. 尝试自动修复：`npm run lint:fix`
3. 手动修复剩余问题
4. 或者在文件中添加 `eslint-disable` 注释

### Q: 如何关闭某个规则？
A: 修改 `eslint.config.mjs`，将规则设为 `'off'`。

## ✨ 配置效果

### 修改前 ❌
```bash
git commit -m "test"
# 提交成功，但代码可能有问题
```

### 修改后 ✅
```bash
git commit -m "test"
# ⋯ Running tasks for staged files…
# ✖ eslint --fix --max-warnings=0
# 
# /path/to/file.ts
#   10:5  error  Unexpected console statement
# 
# ✖ Failed to run tasks for staged files!
# 提交被阻止，必须修复错误
```

## 🎉 总结

现在每次 `git commit` 前都会：

1. ✅ 自动运行 ESLint 检查暂存的文件
2. ✅ 自动修复可修复的问题
3. ✅ 如果有错误或警告，阻止提交
4. ✅ 确保代码质量和一致性

**重要**：`--max-warnings=0` 意味着即使是警告也会阻止提交。如果觉得太严格，可以移除这个参数。
