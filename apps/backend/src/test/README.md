# 测试目录结构说明

## 📁 目录结构

```
src/test/
├── README.md                    # 测试说明文档
├── TEST_RESULTS.md             # 测试结果总结
├── setup.ts                    # Jest 全局设置
├── test-utils.ts              # 测试工具类
├── unit/                      # 单元测试
│   ├── basic/                 # 基础功能测试
│   │   ├── simple.spec.ts     # 简单测试用例
│   │   └── test-basic-service.spec.ts  # 基础服务测试
│   └── modules/               # 模块测试
│       ├── sentiment/         # 情绪分析模块测试
│       │   └── sentiment.service.spec.ts
│       ├── market-data/       # 市场数据模块测试
│       │   └── market-data.service.spec.ts
│       ├── data-collection/   # 数据采集模块测试
│       │   └── data-collection.service.spec.ts
│       └── data-aggregation/  # 数据聚合模块测试
│           └── (待添加)
└── integration/               # 集成测试
    └── sentiment-flow.integration.spec.ts
```

## 🎯 测试分类

### **单元测试 (Unit Tests)**
- **位置**: `src/test/unit/`
- **目的**: 测试单个函数、类或组件的功能
- **特点**: 
  - 快速执行
  - 隔离依赖
  - 覆盖边界情况

### **集成测试 (Integration Tests)**
- **位置**: `src/test/integration/`
- **目的**: 测试多个组件或服务之间的协作
- **特点**:
  - 使用真实数据库
  - 测试完整流程
  - 验证端到端功能

## 🛠️ 测试工具

### **测试框架**
- **Jest**: 主要测试框架
- **Supertest**: HTTP 接口测试
- **TypeORM**: 数据库测试支持

### **Mock 工具**
- **axios**: HTTP 请求模拟
- **moment**: 时间处理模拟
- **TypeORM Repository**: 数据库操作模拟

### **测试工具类**
- **MockDataFactory**: 创建模拟数据
- **MockRepositoryFactory**: 创建模拟仓库
- **TestModuleBuilder**: 构建测试模块
- **TestAssertions**: 通用断言工具

## 🚀 运行测试

### **运行所有测试**
```bash
npm test
# 或
pnpm test
```

### **运行单元测试**
```bash
npx jest src/test/unit
```

### **运行集成测试**
```bash
npx jest src/test/integration
```

### **运行特定模块测试**
```bash
npx jest src/test/unit/modules/sentiment
```

### **监听模式**
```bash
npm run test:watch
```

### **覆盖率报告**
```bash
npm run test:cov
```

## 📋 测试规范

### **文件命名**
- 单元测试: `*.spec.ts`
- 集成测试: `*.integration.spec.ts`
- 测试工具: `*.test-utils.ts`

### **测试结构**
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  
  beforeEach(async () => {
    // 设置测试环境
  });
  
  describe('methodName', () => {
    it('should do something', async () => {
      // 测试逻辑
    });
  });
});
```

### **测试原则**
1. **AAA模式**: Arrange, Act, Assert
2. **单一职责**: 每个测试只验证一个功能点
3. **独立性**: 测试之间不应有依赖关系
4. **可读性**: 测试名称要清晰描述测试意图
5. **完整性**: 覆盖正常情况、边界情况和异常情况

## 🎉 测试状态

### ✅ **已完成的测试**
- 基础功能测试 (100%)
- 情绪分析服务 (96%)
- 市场数据服务 (85%)
- 数据采集服务 (72%)

### 🔄 **进行中的测试**
- 数据聚合服务测试
- 更多集成测试场景

### 📈 **测试覆盖率目标**
- 单元测试覆盖率: > 80%
- 集成测试覆盖率: > 60%
- 关键业务逻辑: 100%

---

**注意**: 测试是确保代码质量的重要手段，请在开发新功能时同步编写测试用例。