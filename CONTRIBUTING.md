# 贡献指南

首先，感谢您考虑为 DeFi Trading Platform 做出贡献！正是像您这样的人让这个项目变得更好。

## 🤝 如何贡献

### 报告 Bug

如果您发现了 bug，请通过 [GitHub Issues](https://github.com/yourusername/defi-platform/issues) 报告，并包含以下信息：

- **清晰的标题**：简洁描述问题
- **复现步骤**：详细说明如何重现问题
- **预期行为**：您期望看到什么
- **实际行为**：实际发生了什么
- **环境信息**：浏览器版本、操作系统等
- **截图**：如果可能，提供截图或屏幕录制

### 提出功能请求

我们欢迎新功能建议！请通过 [GitHub Issues](https://github.com/yourusername/defi-platform/issues) 提交，并说明：

- **功能描述**：清晰描述您想要的功能
- **使用场景**：为什么需要这个功能
- **可选方案**：您考虑过的其他解决方案
- **示例**：如果可能，提供其他项目的类似功能参考

### 提交代码

#### 1. Fork 项目

点击页面右上角的 "Fork" 按钮，创建您自己的副本。

#### 2. 克隆到本地

```bash
git clone https://github.com/your-username/defi-platform.git
cd defi-platform
```

#### 3. 创建分支

```bash
git checkout -b feature/amazing-feature
# 或
git checkout -b fix/bug-description
```

分支命名规范：
- `feature/xxx` - 新功能
- `fix/xxx` - Bug 修复
- `docs/xxx` - 文档更新
- `refactor/xxx` - 代码重构
- `test/xxx` - 测试相关
- `chore/xxx` - 构建/工具相关

#### 4. 安装依赖

```bash
npm install
```

#### 5. 进行修改

遵循项目的代码规范：

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 添加必要的注释
- 保持代码简洁易读

#### 6. 测试您的更改

```bash
# 类型检查
npm run type-check

# ESLint 检查
npm run lint

# 构建测试
npm run build
```

#### 7. 提交更改

```bash
git add .
git commit -m "feat: add amazing feature"
```

提交信息规范（遵循 [Conventional Commits](https://www.conventionalcommits.org/)）：

- `feat:` - 新功能
- `fix:` - Bug 修复
- `docs:` - 文档更新
- `style:` - 代码格式调整（不影响功能）
- `refactor:` - 代码重构
- `perf:` - 性能优化
- `test:` - 测试相关
- `chore:` - 构建/工具相关

示例：
```
feat: add dark mode support
fix: resolve chart rendering issue on mobile
docs: update installation instructions
refactor: optimize WebSocket connection logic
```

#### 8. 推送到 GitHub

```bash
git push origin feature/amazing-feature
```

#### 9. 创建 Pull Request

1. 访问您 Fork 的仓库页面
2. 点击 "New Pull Request"
3. 填写 PR 标题和描述
4. 等待代码审查

### Pull Request 要求

- **清晰的标题**：简洁描述更改内容
- **详细的描述**：说明为什么要做这个更改，解决了什么问题
- **关联 Issue**：如果有相关 Issue，请在描述中引用（如 `Closes #123`）
- **测试截图**：对于 UI 更改，请提供前后对比截图
- **文档更新**：如果更改了 API 或添加了新功能，请更新相关文档

## 📝 代码规范

### TypeScript

```typescript
// ✅ 好的示例
interface UserData {
  id: string;
  name: string;
  balance: number;
}

function getUserData(userId: string): UserData {
  // 实现...
}

// ❌ 避免
function getData(id: any) {
  // 缺少类型定义
}
```

### React 组件

```typescript
// ✅ 好的示例
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button onClick={onClick} disabled={disabled} className="btn">
      {label}
    </button>
  );
};

// ❌ 避免
export const Button = (props: any) => {
  return <button onClick={props.onClick}>{props.label}</button>;
};
```

### 文件组织

- 每个组件一个文件
- 相关的 Hook 放在 `hooks/` 子目录
- 类型定义放在 `types/` 目录或组件同目录的 `.types.ts` 文件
- 常量提取到 `constants/` 目录

### 命名规范

- **组件**：PascalCase（如 `KlineChart.tsx`）
- **Hook**：camelCase，以 `use` 开头（如 `useKlineData.ts`）
- **类型/接口**：PascalCase（如 `interface UserData`）
- **函数**：camelCase（如 `fetchKlineData`）
- **常量**：UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）

## 🧪 测试

在提交 PR 前，请确保：

- [ ] 代码通过 TypeScript 类型检查
- [ ] 代码通过 ESLint 检查
- [ ] 代码可以成功构建
- [ ] 在本地测试过所有更改的功能
- [ ] 更新了相关文档

## 📚 开发资源

- [Next.js 文档](https://nextjs.org/docs)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [TradingView Lightweight Charts 文档](https://tradingview.github.io/lightweight-charts/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

## 💬 社区

- 加入我们的 [Discord](https://discord.gg/yourserver) 讨论
- 关注 [Twitter](https://twitter.com/yourhandle) 获取最新动态

## ⚖️ 行为准则

参与本项目即表示您同意遵守我们的[行为准则](./CODE_OF_CONDUCT.md)。

## 🎉 贡献者表彰

所有贡献者都会在 README 中被列出。感谢您的付出！

---

再次感谢您的贡献！🎉
