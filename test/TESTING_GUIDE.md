# YOP TypeScript SDK 测试指南

快速开始使用 YOP SDK 测试基础设施。

## 🚀 快速开始

### 运行所有测试

```bash
npm test
```

### 运行特定测试文件

```bash
npm test -- YopClient.test.ts
npm test -- RsaV3Util.test.ts
```

### 生成覆盖率报告

```bash
npm test -- --coverage
```

### 监听模式（开发时）

```bash
npm run build:watch  # 终端 1
npm test -- --watch  # 终端 2
```

## 📚 使用测试基础设施

### 1. 使用 Fixtures (测试数据)

```typescript
import { CryptoFixtures, ApiResponseFixtures } from './fixtures';

test('使用预定义的密钥', () => {
  const publicKey = CryptoFixtures.rsa.publicKey.pem;
  // 使用 publicKey 进行测试
});
```

### 2. 使用 Helpers (辅助函数)

```typescript
import {
  expectValidSignature,
  expectApiSuccess,
  createMockSuccessResponse,
} from './helpers';

test('API 成功响应', () => {
  const response = createMockSuccessResponse({ orderId: '123' });
  expectApiSuccess(response);
});
```

### 3. 使用 Mocks (模拟处理器)

```typescript
import { MockScenarios } from './mocks';

describe('YopClient 测试', () => {
  beforeEach(() => {
    global.fetch = MockScenarios.allSuccess();
  });

  test('所有接口成功', async () => {
    const client = new YopClient(config);
    const result = await client.post('/api/pre-pay', {});
    expect(result.state).toBe('SUCCESS');
  });
});
```

## 📊 覆盖率报告

查看详细的覆盖率总结报告:

```bash
cat test/COVERAGE_REPORT.md
```

当前覆盖率: **90.89%** ✅

## 🎯 测试最佳实践

### AAA 模式

```typescript
test('示例测试', async () => {
  // Arrange - 准备
  const mockFetch = jest.fn();
  global.fetch = mockFetch;
  
  // Act - 执行
  const result = await someFunction();
  
  // Assert - 断言
  expect(result).toBe('expected');
});
```

### 测试命名

- 使用中文描述业务场景
- 添加优先级标记: [P0], [P1], [P2], [P3]
- 代码使用英文

```typescript
test('[P0] 应正确处理用户登录请求', () => {
  // ...
});
```

### Mock 清理

```typescript
describe('测试套件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理环境
  });
});
```

## 📖 参考资源

- [测试覆盖率报告](./COVERAGE_REPORT.md) - 详细的覆盖率分析
- [测试基础设施文档](./README.md) - 完整的测试说明
- [Jest 官方文档](https://jestjs.io/)

## ✅ 测试清单

- [ ] 所有新功能都有单元测试
- [ ] 覆盖率 > 85%
- [ ] 所有测试通过
- [ ] 错误处理已测试
- [ ] 边界情况已测试
