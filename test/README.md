# YOP TypeScript SDK 测试基础设施

本目录包含 YOP TypeScript SDK 的完整测试套件和测试基础设施。

## 目录结构

```
test/
├── fixtures/           # 测试数据固定装置
│   ├── crypto-keys.ts     # 加密密钥测试数据
│   ├── api-responses.ts   # API 响应测试数据
│   └── index.ts          # 统一导出
├── helpers/            # 测试辅助函数
│   ├── assertions.ts      # 自定义断言函数
│   ├── test-utils.ts      # 测试工具函数
│   └── index.ts          # 统一导出
├── mocks/              # Mock 处理器
│   ├── yop-handlers.ts    # YOP API Mock 处理器
│   └── index.ts          # 统一导出
├── *.test.ts           # 测试文件
└── README.md           # 本文件
```

## 测试分类

### 单元测试 (Unit Tests)

- **GetUniqueId.test.ts** - 唯一 ID 生成函数测试 (29 测试用例)
- **HttpUtils.test.ts** - HTTP 工具函数测试 (30 测试用例)
- **HttpUtils.boundary.test.ts** - HTTP 工具边界测试 (52 测试用例)
- **RsaV3Util.test.ts** - RSA 签名工具测试 (1,119 行)
- **VerifyUtils.test.ts** - 签名验证工具测试 (1,353 行)

### 客户端测试 (Client Tests)

- **YopClient.test.ts** - 主客户端功能测试 (1,028 行)
- **YopClient.config.test.ts** - 配置加载优先级测试 (21 测试用例)
- **YopClient.timeout.test.ts** - 超时机制测试 (23 测试用例)
- **YopClient.concurrency.test.ts** - 并发请求测试 (20 测试用例)
- **YopClient.serialization.test.ts** - 请求序列化测试 (36 测试用例)

### 集成测试 (Integration Tests)

- **YopClient.integration.test.ts** - 端到端集成测试 (148 行)

## 使用测试基础设施

### 1. 使用 Fixtures（测试数据）

```typescript
import { CryptoFixtures, ApiResponseFixtures } from './fixtures';

test('使用预定义的密钥', () => {
  const publicKey = CryptoFixtures.rsa.publicKey.pem;
  // 使用 publicKey 进行测试
});

test('使用预定义的 API 响应', () => {
  const response = ApiResponseFixtures.success.prePay;
  expect(response.state).toBe('SUCCESS');
});
```

**可用的 Fixtures：**

- `CryptoFixtures.rsa.publicKey` - RSA 公钥（PEM/Base64/DER 格式）
- `CryptoFixtures.rsa.privateKey` - RSA 私钥（PKCS#8/PKCS#1/加密格式）
- `CryptoFixtures.certificates` - X.509 证书（有效/过期）
- `ApiResponseFixtures.success` - 成功响应（预支付/查询/退款）
- `ApiResponseFixtures.businessErrors` - 业务错误（余额不足/订单不存在等）
- `ApiResponseFixtures.systemErrors` - 系统错误（签名错误/参数错误等）
- `ApiResponseFixtures.edgeCases` - 边缘情况（空结果/分页/特殊字符等）

### 2. 使用 Helpers（辅助函数）

#### 自定义断言

```typescript
import {
  expectValidSignature,
  expectApiSuccess,
  expectRfc3986Encoding,
} from './helpers';

test('签名验证', () => {
  const signature = 'YOP-RSA2048-SHA256$abc123...';
  expectValidSignature(signature);
});

test('API 成功响应', () => {
  const response = { state: 'SUCCESS', result: { code: 'OPR00000' } };
  expectApiSuccess(response);
});

test('URL 编码验证', () => {
  const encoded = 'hello%20world';
  expectRfc3986Encoding(encoded);
});
```

#### 测试工具函数

```typescript
import {
  createMockSuccessResponse,
  waitFor,
  retry,
  measureTime,
} from './helpers';

test('创建 Mock 响应', () => {
  const response = createMockSuccessResponse({ orderId: '123' });
  expect(response.status).toBe(200);
});

test('等待条件满足', async () => {
  let ready = false;
  setTimeout(() => (ready = true), 100);

  await waitFor(() => ready, 5000);
});

test('重试操作', async () => {
  let attempts = 0;
  const result = await retry(async () => {
    attempts++;
    if (attempts < 3) throw new Error('Not ready');
    return 'success';
  });

  expect(result).toBe('success');
  expect(attempts).toBe(3);
});

test('测量执行时间', async () => {
  const { duration, result } = await measureTime(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return 'done';
  });

  expect(duration).toBeGreaterThanOrEqual(100);
  expect(result).toBe('done');
});
```

### 3. 使用 Mocks（模拟处理器）

```typescript
import { mockYopApi, MockScenarios, createFetchMock } from './mocks';

describe('YopClient 集成测试', () => {
  beforeEach(() => {
    // 使用预定义场景
    global.fetch = MockScenarios.allSuccess();
  });

  test('所有接口成功', async () => {
    const client = new YopClient(config);
    const result = await client.post('/rest/v1.0/aggpay/pre-pay', {});
    expect(result.state).toBe('SUCCESS');
  });
});

describe('错误处理测试', () => {
  test('订单不存在', async () => {
    global.fetch = MockScenarios.orderNotFound();

    const client = new YopClient(config);
    const result = await client.get('/rest/v1.0/aggpay/query-order', {
      orderId: 'NOT_FOUND',
    });

    expect(result.error?.code).toBe('BIZ002');
  });

  test('网络延迟', async () => {
    global.fetch = MockScenarios.withDelay(1000);

    const start = Date.now();
    const client = new YopClient(config);
    await client.get('/rest/v1.0/aggpay/query-order', {});

    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  });
});

describe('自定义 Mock 配置', () => {
  test('自定义响应', async () => {
    const mockFetch = createFetchMock({
      '/rest/v1.0/aggpay/pre-pay': {
        customResponse: {
          state: 'SUCCESS',
          result: { code: 'OPR00000', customField: 'test' },
        },
      },
    });

    global.fetch = mockFetch;

    const client = new YopClient(config);
    const result = await client.post('/rest/v1.0/aggpay/pre-pay', {});

    expect(result.result?.customField).toBe('test');
  });
});
```

**可用的 Mock 场景：**

- `MockScenarios.allSuccess()` - 所有接口成功
- `MockScenarios.allFailed(errorCode)` - 所有接口失败
- `MockScenarios.withDelay(ms)` - 模拟网络延迟
- `MockScenarios.orderNotFound()` - 订单不存在
- `MockScenarios.insufficientBalance()` - 余额不足
- `MockScenarios.invalidSignature()` - 签名错误

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行特定测试文件

```bash
npm test -- YopClient.test.ts
npm test -- HttpUtils.test.ts
```

### 运行测试并生成覆盖率报告

```bash
npm test -- --coverage
```

### 运行测试并监听文件变化

```bash
npm run build:watch  # 终端 1
npm test -- --watch  # 终端 2
```

### 运行测试（详细输出）

```bash
npm test -- --verbose
```

## 测试覆盖率目标

| 模块 | 当前覆盖率 | 目标覆盖率 |
|------|-----------|-----------|
| YopClient | ~70% | 90% |
| RsaV3Util | ~90% | 95% |
| VerifyUtils | ~85% | 95% |
| HttpUtils | ~80% | 90% |
| GetUniqueId | 100% | 100% |
| **总体** | **60%** | **85%+** |

## 测试最佳实践

### 1. 测试命名

使用中文描述测试场景，代码使用英文：

```typescript
describe('YopClient - 配置加载', () => {
  test('[P0] 显式 config.yopPublicKey 应优先于环境变量', () => {
    // 测试代码
  });
});
```

**优先级标记：**

- `[P0]` - 关键功能，必须通过
- `[P1]` - 重要功能，高优先级
- `[P2]` - 一般功能，中优先级
- `[P3]` - 边缘情况，低优先级

### 2. 测试结构（AAA 模式）

```typescript
test('示例测试', async () => {
  // Arrange（准备）
  const mockFetch = jest.fn();
  global.fetch = mockFetch;
  const client = new YopClient(config);

  // Act（执行）
  const result = await client.get('/api/test', {});

  // Assert（断言）
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(result.state).toBe('SUCCESS');
});
```

### 3. Mock 清理

```typescript
describe('测试套件', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('测试1', () => {
    // ...
  });
});
```

### 4. 异步测试

```typescript
// 使用 async/await
test('异步操作', async () => {
  const result = await someAsyncOperation();
  expect(result).toBe('expected');
});

// 使用 expectAsyncThrow 辅助函数
test('异步错误', async () => {
  await expectAsyncThrow(
    () => someFailingOperation(),
    /expected error message/
  );
});
```

### 5. 使用 Fake Timers

```typescript
describe('超时测试', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('10秒超时', async () => {
    const promise = someOperationWithTimeout();

    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow(/timeout/);
  });
});
```

## 常见问题

### Q: 如何调试失败的测试？

```bash
# 运行单个测试文件并显示详细输出
npm test -- YopClient.test.ts --verbose

# 使用 Node.js 调试器
node --inspect-brk node_modules/.bin/jest YopClient.test.ts
```

### Q: 如何跳过特定测试？

```typescript
test.skip('暂时跳过的测试', () => {
  // ...
});

describe.skip('暂时跳过的测试套件', () => {
  // ...
});
```

### Q: 如何只运行特定测试？

```typescript
test.only('只运行这个测试', () => {
  // ...
});

describe.only('只运行这个测试套件', () => {
  // ...
});
```

### Q: 测试运行很慢怎么办？

1. 使用 `--maxWorkers=4` 限制并发数
2. 使用 `--testPathPattern` 只运行部分测试
3. 检查是否有不必要的真实网络请求
4. 使用 fake timers 替代真实等待

```bash
npm test -- --maxWorkers=4 --testPathPattern=YopClient
```

## 贡献指南

### 添加新测试

1. 确定测试类别（单元/集成/边缘）
2. 创建测试文件（使用 `.test.ts` 后缀）
3. 使用测试基础设施（fixtures/helpers/mocks）
4. 遵循测试最佳实践
5. 确保测试通过并提交

### 添加新 Fixtures

1. 在 `fixtures/` 目录创建新文件
2. 导出数据结构和类型
3. 在 `fixtures/index.ts` 中导出
4. 更新本 README 文档

### 添加新 Helpers

1. 在 `helpers/` 目录创建新函数
2. 添加 JSDoc 注释和使用示例
3. 在 `helpers/index.ts` 中导出
4. 添加对应的单元测试

## 参考资源

- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [YOP SDK 官方文档](https://open.yeepay.com/docs)
