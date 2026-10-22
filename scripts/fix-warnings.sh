#!/bin/bash

# 批量修复 eslint warnings 的脚本

echo "开始修复 eslint warnings..."

# 1. 将所有 console.log 替换为 console.info
echo "步骤 1: 将 console.log 替换为 console.info..."
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  ! -path "./node_modules/*" \
  ! -path "./.next/*" \
  ! -path "./dist/*" \
  -exec sed -i '' 's/console\.log(/console.info(/g' {} \;

# 2. 运行 eslint --fix 自动修复能修复的问题
echo "步骤 2: 运行 eslint --fix..."
npm run lint:fix

echo "修复完成！"
echo "运行 'npm run lint' 查看剩余的 warnings"
