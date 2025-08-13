#!/bin/bash

# 智能投研辅助交易系统 - 项目初始化脚本

set -e

echo "🚀 开始初始化智能投研辅助交易系统..."

# 检查Node.js版本
echo "📋 检查环境要求..."
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_NODE_VERSION="22.0.0"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js >= 22.0"
    exit 1
fi

# 检查pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装，正在安装 pnpm..."
    npm install -g pnpm@latest
fi

echo "✅ 环境检查通过"
echo "   Node.js: $(node --version)"
echo "   pnpm: $(pnpm --version)"

# 安装依赖
echo "📦 安装项目依赖..."
pnpm install

# 创建环境变量文件
echo "⚙️  创建环境配置文件..."
if [ ! -f "apps/backend/.env" ]; then
    cp apps/backend/env.example apps/backend/.env
    echo "✅ 已创建 apps/backend/.env"
fi

# 创建数据目录
echo "📂 创建数据目录..."
mkdir -p apps/backend/data
mkdir -p apps/backend/logs

# 构建共享包
echo "🔨 构建共享包..."
pnpm --filter @sentiment-analysis/shared build

# 运行类型检查
echo "🔍 运行类型检查..."
pnpm type-check

echo "🎉 项目初始化完成！"
echo ""
echo "📚 接下来你可以："
echo "   pnpm dev              # 启动开发环境（前后端同时启动）"
echo "   pnpm backend:dev      # 仅启动后端服务"
echo "   pnpm frontend:dev     # 仅启动前端服务"
echo "   pnpm build            # 构建所有项目"
echo "   pnpm test             # 运行测试"
echo ""
echo "🌐 服务地址："
echo "   前端应用: http://localhost:5173"
echo "   后端API:  http://localhost:3000"
echo "   API文档:  http://localhost:3000/api/docs"
echo ""
echo "📖 更多信息请查看 README.md"