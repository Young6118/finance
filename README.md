# 智能投研辅助交易系统

> 基于市场情绪分析的智能投资决策辅助工具

## 🎯 项目简介

智能投研辅助交易系统是一个专注于**市场情绪分析**的量化投资工具，旨在帮助个人投资者克服"胆怯和不客观"的投资决策困境，通过科学的数据分析建立投资信心。

### 核心价值
- **情绪量化**：将市场恐惧贪婪指数量化为0-100分
- **多维分析**：整合涨跌家数比、成交量、资金流向等5个核心指标
- **投资建议**：基于情绪状态提供买入/观望/卖出建议
- **历史验证**：通过回测验证策略有效性

## 🚀 技术特色

### 技术栈
- **后端**: NestJS + TypeORM + Bull Queue
- **前端**: Vue3 + TypeScript + Element Plus + ECharts
- **数据**: 免费API + 数据爬虫
- **存储**: SQLite / MySQL
- **架构**: pnpm + Node22 + Monorepo

### 架构特点
- **现代化技术栈**：使用最新的Node.js 22和TypeScript
- **Monorepo架构**：统一管理多个包，代码共享更高效
- **类型安全**：全栈TypeScript，编译时错误检查
- **企业级框架**：NestJS提供强大的依赖注入和模块化
- **零成本启动**：使用免费数据源，本地运行
- **渐进式发展**：从MVP到完整产品的清晰路径

## 📊 主要功能

### 第一阶段 MVP（市场情绪分析仪表板）
- [x] 实时情绪指数计算（0-100分）
- [x] 5个核心指标监控
- [x] 情绪状态可视化展示
- [x] 历史数据对比分析
- [x] 投资操作建议

### 未来扩展
- [ ] 个股技术分析
- [ ] 量化策略回测
- [ ] 智能选股推荐
- [ ] 移动端应用
- [ ] 实时预警通知

## 🛠️ 快速开始

### 环境要求
- Node.js >= 22.0
- pnpm >= 9.0

### 环境升级指南
如果您的环境版本过低，请按以下步骤升级：

```bash
# 升级Node.js（推荐使用nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22

# 或直接从官网下载 Node.js 22: https://nodejs.org

# 升级pnpm到最新版本
npm install -g pnpm@latest

# 验证版本
node --version  # 应该 >= v22.0.0
pnpm --version  # 应该 >= 9.0.0
```

### 快速初始化（推荐）
```bash
# 克隆项目
git clone <repository-url>
cd sentiment-analysis

# 一键初始化（自动安装依赖、配置环境、构建项目）
./scripts/init.sh

# 启动开发环境
pnpm dev
```

### 手动安装
```bash
# 安装依赖（根目录执行，会安装所有包的依赖）
pnpm install

# 复制环境变量文件
cp apps/backend/env.example apps/backend/.env

# 构建共享包
pnpm --filter @sentiment-analysis/shared build

# 启动开发环境（同时启动前后端）
pnpm dev

# 或者分别启动
pnpm backend:dev    # 启动后端服务
pnpm frontend:dev   # 启动前端服务

# 构建项目
pnpm build

# 运行测试
pnpm test
```

### 访问应用
- 前端界面：http://localhost:5173
- 后端API：http://localhost:3000

## 📁 项目结构

```
sentiment-analysis/                    # Monorepo根目录
├── README.md                         # 项目说明文档  
├── LICENSE                          # MIT开源许可证
├── package.json                     # 根package.json(workspace配置)
├── pnpm-workspace.yaml              # pnpm工作空间配置
├── tsconfig.json                    # TypeScript根配置
├── .gitignore                       # Git忽略文件
├── prd.md                          # 产品需求文档
├── solution.md                     # 技术实现方案
├── CHANGELOG.md                    # 版本更新日志
├── apps/                           # 应用程序目录
│   ├── backend/                    # NestJS后端应用
│   │   ├── src/
│   │   │   ├── modules/           # 业务模块
│   │   │   │   ├── sentiment/     # 情绪分析模块
│   │   │   │   ├── market-data/   # 市场数据模块
│   │   │   │   └── health/        # 健康检查模块
│   │   │   ├── config/           # 配置文件
│   │   │   ├── main.ts           # 应用入口
│   │   │   └── app.module.ts     # 根模块
│   │   ├── package.json          # 后端依赖配置
│   │   ├── nest-cli.json         # NestJS CLI配置
│   │   └── tsconfig.json         # 后端TS配置
│   └── frontend/                   # Vue3前端应用
│       ├── src/
│       │   ├── components/        # Vue组件
│       │   ├── views/            # 页面视图
│       │   ├── stores/           # Pinia状态管理
│       │   ├── apis/             # API调用
│       │   ├── types/            # 类型定义
│       │   └── utils/            # 工具函数
│       ├── package.json          # 前端依赖配置
│       ├── vite.config.ts        # Vite配置
│       ├── tsconfig.json         # 前端TS配置
│       └── index.html            # 入口HTML
└── packages/                      # 共享包目录
    └── shared/                    # 共享类型和工具
        ├── src/
        │   ├── types/            # 共享类型定义
        │   ├── utils/            # 共享工具函数
        │   ├── constants/        # 共享常量
        │   └── index.ts          # 入口文件
        ├── package.json          # 共享包配置
        └── tsconfig.json         # 共享包TS配置
```

## 📚 文档说明

| 文档 | 用途 | 目标读者 |
|------|------|----------|
| [PRD.md](./prd.md) | 产品需求文档 | 产品经理、投资人、业务人员 |
| [solution.md](./solution.md) | 技术实现方案 | 开发人员、技术人员 |

## 🔍 核心算法

### 情绪指数计算
```
情绪指数 = VIX恐慌指数(30%) + 涨跌家数比(25%) + 成交量比率(20%) + 融资融券变化(15%) + 北上资金(10%)
```

### 情绪分级
- **0-25**: 极度恐慌 → 逢低布局
- **25-40**: 恐慌 → 关注机会  
- **40-60**: 中性 → 适度参与
- **60-75**: 贪婪 → 观望
- **75-100**: 极度贪婪 → 谨慎

## 📈 项目路线图

- **第1个月**: MVP开发完成
- **第2-3个月**: 功能优化，提升准确率
- **第4-6个月**: 个股分析功能
- **第6-12个月**: 完整量化策略系统

## ⚠️ 风险提示

本系统仅作为**投资辅助工具**，不构成具体的投资建议。投资有风险，决策需谨慎。

## 🤝 贡献指南

欢迎贡献代码、提出建议或报告问题！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 [MIT License](./LICENSE) 开源协议。

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 创建 [Issue](../../issues)
- 发起 [Discussion](../../discussions)

---

⭐ 如果这个项目对你有帮助，欢迎给个 Star！