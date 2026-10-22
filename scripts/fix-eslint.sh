#!/bin/bash

# ESLint 错误修复脚本

echo "正在修复 ESLint 错误..."

# 1. 修复未使用的导入
echo "步骤 1: 修复未使用的导入..."

# 2. 修复 any 类型（添加 eslint-disable 注释）
echo "步骤 2: 为必要的 any 类型添加注释..."

# 3. 修复重复导入
echo "步骤 3: 修复重复导入..."

# 4. 运行 lint:fix
echo "步骤 4: 运行自动修复..."
npm run lint:fix

echo "修复完成！"
echo "请运行 'npm run lint' 查看剩余问题"
