# YOP TypeScript SDK (@yeepay/yop-typescript-sdk)

[![npm version](https://img.shields.io/npm/v/@yeepay/yop-typescript-sdk.svg)](https://www.npmjs.com/package/@yeepay/yop-typescript-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@yeepay/yop-typescript-sdk.svg)](https://www.npmjs.com/package/@yeepay/yop-typescript-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/yop-platform/yop-typescript-sdk/workflows/CI/badge.svg)](https://github.com/yop-platform/yop-typescript-sdk/actions)
[![codecov](https://codecov.io/gh/yop-platform/yop-typescript-sdk/branch/main/graph/badge.svg)](https://codecov.io/gh/yop-platform/yop-typescript-sdk)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/yop-platform/yop-typescript-sdk)

[Read this document in English](README.md)

一个专为与 YOP（易宝开放平台）API 进行无缝交互而设计的 TypeScript SDK。此 SDK 采用现代 JavaScript 特性构建，利用 ES Modules 和原生 `fetch` API 以实现最佳性能和兼容性。

## 概述

此 SDK 提供了一种便捷的方式，可将易宝支付及其他服务集成到您的 TypeScript 或 JavaScript 应用中。它负责处理请求签名、签名验证和 API 通信，让您可以专注于您的应用逻辑。

**主要特性：**

- **TypeScript 优先：** 完全类型化，提供更好的开发者体验和安全性。
- **ES Modules：** 现代模块系统，实现更好的 tree-shaking 和兼容性。
- **原生 `fetch`：** 使用标准的 Fetch API，在 Node.js (v18+) 和现代浏览器中可用。
- **安全：** 实现 YOP API 的 RSA 签名要求，支持 UTF-8 编码处理国际字符。
- **灵活：** 支持 `application/x-www-form-urlencoded` 和 `application/json` 两种请求类型。

## 安装

使用您偏好的包管理器安装此包：

```bash
npm install @yeepay/yop-typescript-sdk
# 或
yarn add @yeepay/yop-typescript-sdk
# 或
pnpm add @yeepay/yop-typescript-sdk
```

## 配置

`YopClient` 可以通过以下两种方式进行配置：

1.  **通过环境变量（推荐，更简单）：**
    如果在构造函数中未传递配置对象，SDK 将自动尝试从以下环境变量加载所需配置：
    - `YOP_APP_KEY`: (必需) 您的易宝应用 AppKey。
    - `YOP_SECRET_KEY`: (必需) 您应用的私钥（原始字符串，PEM 格式 PKCS#1 或 PKCS#8）。SDK 会自动格式化非 PEM 格式的私钥。**请妥善保管！**
    - `YOP_PUBLIC_KEY`: (必需) 易宝平台的公钥（原始字符串，PEM 格式）。这是公钥*内容*，不是文件路径。请从易宝开发者门户下载。
    - `YOP_API_BASE_URL`: (可选) 易宝 API 的基础 URL。默认为生产环境 (`https://openapi.yeepay.com`)。

    *示例 `.env` 文件：*
    ```dotenv
    YOP_APP_KEY=your_app_key
    YOP_SECRET_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'
    YOP_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----'
    # YOP_API_BASE_URL=https://sandbox.yeepay.com # 可选，用于沙箱环境
    ```

    *示例初始化：*
    ```typescript
    import { YopClient } from '@yeepay/yop-typescript-sdk';
    import dotenv from 'dotenv';

    // 加载环境变量（例如，从 .env 文件）
    dotenv.config();

    // 使用环境变量初始化 YopClient
    try {
      // 未传递配置对象，SDK 使用环境变量
      const yopClient = new YopClient();
      console.log('YopClient 使用环境变量初始化成功！');
      // 使用 yopClient 进行 API 调用...
    } catch (error) {
      console.error('从环境变量初始化 YopClient 失败：', error);
      // 请确保所有必需的环境变量（YOP_APP_KEY, YOP_SECRET_KEY, YOP_PUBLIC_KEY）都已设置。
    }
    ```

2.  **通过显式 `YopConfig` 对象：**
    您可以显式地将配置对象传递给 `YopClient` 构造函数。**如果同时设置了环境变量并传递了配置对象，则此方法优先**（对象中的值会覆盖相应的环境变量）。

    *示例初始化：*
    ```typescript
    import { YopClient } from '@yeepay/yop-typescript-sdk';
    import type { YopConfig } from '@yeepay/yop-typescript-sdk';
    import dotenv from 'dotenv'; // 仍然可用于加载部分配置

    dotenv.config(); // 加载任何潜在的回退或其他环境变量

    // 显式准备配置对象
    const yopConfig: YopConfig = {
      appKey: process.env.MY_CUSTOM_APP_KEY || 'defaultAppKey', // 示例：使用不同的环境变量或默认值
      secretKey: process.env.MY_SECRET_KEY!, // 示例：从特定变量获取
      yopPublicKey: process.env.YOP_PUBLIC_KEY!, // 如果需要，仍可从标准环境变量加载
      // yeepayApiBaseUrl: 'https://sandbox.yeepay.com' // 示例：覆盖基础 URL
    };

    // 使用显式配置创建 YopClient 实例
    const yopClient = new YopClient(yopConfig);

    console.log('YopClient 使用显式配置初始化成功！');
    ```

**配置选项（当使用 `YopConfig` 对象时）：**

当您向 `YopClient` 构造函数传递配置对象时，将使用这些选项。如果对象中省略了某个选项，SDK 将尝试回退到相应的环境变量。

- `appKey` (string, 必需): 您的唯一应用标识符，由易宝提供。（回退到 `process.env.YOP_APP_KEY`）。
- `secretKey` (string, 必需): 您应用的私钥（PEM 格式的原始字符串）。SDK 会自动格式化非 PEM 格式的私钥。**请妥善保管！**（回退到 `process.env.YOP_SECRET_KEY`）。
- `yopPublicKey` (string, 必需): 用于验证响应的易宝平台公钥（PEM 格式的原始字符串）。这必须是密钥*内容*，而不是文件路径。（回退到 `process.env.YOP_PUBLIC_KEY`）。
- `yeepayApiBaseUrl` (string, 可选): 易宝 API 的基础 URL。（回退到 `process.env.YOP_API_BASE_URL`，然后默认为 `https://openapi.yeepay.com`）。

## 用法 / 快速开始

配置好 `YopClient` 后，您可以使用其方法进行 API 调用。

**示例：创建预支付订单**

```typescript
import type { YopResponse } from "@yeepay/yop-typescript-sdk";
// 假设 yopClient 已按上述方式配置和初始化

async function createPayment() {
  const paymentData = {
    parentMerchantNo: process.env.YOP_PARENT_MERCHANT_NO!, // 您的父商户编号
    merchantNo: process.env.YOP_MERCHANT_NO!, // 您的商户编号
    orderId: `SDK_TEST_${Date.now()}`, // 唯一的订单 ID
    orderAmount: "0.01", // 金额（字符串格式）
    goodsName: "SDK Test Product", // 支持 UTF-8 字符（如中文）
    notifyUrl: process.env.YOP_NOTIFY_URL!, // 用于接收支付通知的 URL
    userIp: "127.0.0.1", // 终端用户的 IP 地址
    scene: "ONLINE", // 交易场景
    channel: "WECHAT", // 支付渠道
    // ... 包含特定 API 端点所需的任何其他必要字段
  };

  try {
    console.log("发送预支付请求：", paymentData);
    // 使用 post() 发送默认的 'application/x-www-form-urlencoded' 请求
    const response = await yopClient.post<YopResponse>(
      "/rest/v1.0/aggpay/pre-pay",
      paymentData
    );
    console.log("收到预支付响应：", response);

    if (response.state === "SUCCESS" && response.result?.code === "00000") {
      console.log("预支付成功：", response.result);
      // 处理成功响应：提取 prePayTn、orderId 等
      // const prePayTn = response.result.prePayTn;
    } else {
      // 处理 API 错误或不成功的状态
      const errorInfo =
        response.state === "FAILURE" ? response.error : response.result;
      console.error("预支付失败：", errorInfo);
    }
  } catch (error) {
    // 处理请求/响应过程中的网络错误或问题
    console.error("执行预支付请求时出错：", error);
  }
}

createPayment();
```

**示例：查询支付订单**

```typescript
import type { YopResponse } from "@yeepay/yop-typescript-sdk";
// 假设 yopClient 已配置和初始化

async function queryPayment(orderId: string) {
  const queryData = {
    parentMerchantNo: process.env.YOP_PARENT_MERCHANT_NO!,
    merchantNo: process.env.YOP_MERCHANT_NO!,
    orderId: orderId, // 您要查询的订单 ID
    // queryType: 'PAYMENT', // 示例：如果需要，指定查询类型
  };

  try {
    console.log("发送订单查询请求：", orderId);
    // 使用 get() 发送 GET 请求
    const response = await yopClient.get<YopResponse>(
      "/rest/v1.0/trade/order/query",
      queryData
    );
    console.log("收到查询响应：", response);

    if (response.state === "SUCCESS" && response.result?.code === "00000") {
      console.log("查询成功：", response.result);
      // 处理订单详情：response.result.status、response.result.orderAmount 等
    } else {
      const errorInfo =
        response.state === "FAILURE" ? response.error : response.result;
      console.error("查询失败：", errorInfo);
    }
  } catch (error) {
    console.error("执行查询请求时出错：", error);
  }
}

// 示例调用：替换为实际的订单 ID
// queryPayment('SDK_TEST_1678886400000');
```

## API 参考

### `new YopClient(config: YopConfig)`

创建并初始化一个新的 YOP 客户端实例。

- `config`: 一个包含您的凭证和设置的 `YopConfig` 对象。请参阅 [配置](#configuration) 和 `src/types.ts`。

### `yopClient.get<T>(apiUrl: string, params: Record<string, any>, timeout?: number): Promise<T>`

向指定的 YOP API 端点发送 HTTP GET 请求。

- `apiUrl`: 相对于 `yeepayApiBaseUrl` 的 API 路径（例如 `/rest/v1.0/trade/order/query`）。
- `params`: 包含请求查询参数的对象。
- `timeout` (可选): 请求超时时间（毫秒）。
- 返回：一个解析为 `T` 类型 API 响应的 `Promise`。

### `yopClient.post<T>(apiUrl: string, body: Record<string, any>, contentType?: ContentType, timeout?: number): Promise<T>`

向指定的 YOP API 端点发送 HTTP POST 请求。默认为 `application/x-www-form-urlencoded` 内容类型。

- `apiUrl`: 相对于 `yeepayApiBaseUrl` 的 API 路径。
- `body`: 包含要在请求体中发送的数据的对象。
- `contentType` (可选): 请求的内容类型。默认为 `ContentType.FORM_URLENCODED`。对于 JSON 负载，请使用 `ContentType.JSON`（或使用 `postJson`）。
- `timeout` (可选): 请求超时时间（毫秒）。
- 返回：一个解析为 `T` 类型 API 响应的 `Promise`。

### `yopClient.postJson<T>(apiUrl: string, body: Record<string, any>, timeout?: number): Promise<T>`

一个用于发送 `application/json` 内容类型的 HTTP POST 请求的便捷方法。

- `apiUrl`: 相对于 `yeepayApiBaseUrl` 的 API 路径。
- `body`: 包含要在请求体中作为 JSON 发送的数据的对象。
- `timeout` (可选): 请求超时时间（毫秒）。
- 返回：一个解析为 `T` 类型 API 响应的 `Promise`。

### 类型

有关配置 (`YopConfig`)、响应 (`YopResponse`)、错误和内容类型的详细类型定义，请参见 `src/types.ts`。

## 系统要求

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 4.5.0（如果使用 TypeScript）
- **包管理器**: npm、yarn 或 pnpm

## 测试和质量保证

此 SDK 包含全面的测试和质量保证措施：

- **单元测试**: 对所有核心功能进行全面的测试覆盖
- **集成测试**: 真实 API 集成测试（配置后）
- **类型安全**: 完整的 TypeScript 支持，严格的类型检查
- **代码覆盖率**: 最低 60% 覆盖率要求
- **持续集成**: 在多个 Node.js 版本（18.x、20.x）上自动测试
- **安全扫描**: 使用 Snyk 进行自动漏洞扫描
- **代码质量**: ESLint 和 Prettier 确保一致的代码风格

### 运行测试

```bash
# 运行所有测试
npm test

# 运行带覆盖率的测试
npm test -- --coverage

# 运行代码检查
npm run lint

# 构建项目
npm run build
```

## 故障排除

### 常见问题

**1. "签名无效" 或 "签名验证失败" 错误：**

- 确保您的 `YOP_SECRET_KEY` 格式正确（PEM 格式）
- 验证您的 `YOP_PUBLIC_KEY` 与易宝开发者门户中的公钥匹配
- 检查您的系统时间是否同步（签名包含时间戳）

**2. "缺少必需的环境变量" 错误：**

- 验证所有必需的环境变量都已设置：`YOP_APP_KEY`、`YOP_SECRET_KEY`、`YOP_PUBLIC_KEY`
- 检查您的 `.env` 文件是否在正确位置且格式正确

**3. 网络或超时错误：**

- 检查您的网络连接
- 验证 `YOP_API_BASE_URL` 是否正确（测试时使用沙箱 URL）
- 考虑在 API 调用中增加超时参数

**4. TypeScript 编译错误：**

- 确保您使用的是 Node.js >= 18.0.0
- 检查您的 TypeScript 版本是否 >= 4.5.0
- 验证您的 `tsconfig.json` 包含 ES2020+ 目标和 ESNext 模块

### 获取帮助

- 查看 [Issues](https://github.com/yop-platform/yop-typescript-sdk/issues) 页面了解已知问题
- 查阅 [易宝 API 文档](https://open.yeepay.com/docs)
- 创建新的 issue，提供详细的错误信息和重现步骤

## 安全

此 SDK 实现了行业标准的安全实践：

- **RSA 签名**: 所有请求都使用 RSA-SHA256 进行签名
- **请求验证**: 所有响应都经过真实性验证
- **安全密钥处理**: 私钥在内存中安全处理
- **无密钥存储**: 密钥永远不会写入磁盘或日志
- **UTF-8 支持**: 正确处理签名中的国际字符

有关安全漏洞，请参阅我们的[安全策略](SECURITY.md)。

## 贡献

非常欢迎贡献！感谢您帮助改进此 SDK。以下是您可以贡献的方式：

**报告 Bug：**

- 如果您发现了一个 bug，请检查 [Issues](https://github.com/yop-platform/yop-typescript-sdk/issues) 部分，看看是否已经有人报告过。
- 如果没有，请创建一个新的 issue。提供清晰的标题、详细的 bug 描述、重现步骤以及预期行为与实际行为的对比。如果可能，请包含相关的代码片段或错误消息。

**建议增强功能：**

- 如果您对新功能或改进现有功能有想法，请创建一个新的 issue。
- 清晰地描述建议的增强功能、其用例以及它为何有益。

**Pull Request：**

1.  **Fork 仓库：** 点击仓库页面右上角的“Fork”按钮。
2.  **克隆您的 fork：** `git clone https://github.com/yop-platform/yop-typescript-sdk.git`
3.  **创建分支：** `git checkout -b feature/your-feature-name` 或 `bugfix/issue-number`。
4.  **进行更改：** 实现您的功能或修复 bug。
5.  **添加/更新测试：** 确保您的更改被测试覆盖。如有必要，添加新测试。
6.  **运行测试：** 确保所有测试通过：`npm test`
7.  **Lint 代码：** 确保您的代码符合项目的风格指南：`npm run lint`（修复任何报告的问题）。
8.  **提交您的更改：** `git commit -m "feat: 描述您的功能" -m "详细描述..."`（如果适用，请遵循 conventional commit 消息规范）。
9.  **推送到您的 fork：** `git push origin feature/your-feature-name`
10. **创建 Pull Request：** 转到原始仓库并点击“New pull request”。将您的分支与原始仓库的主分支进行比较。
11. **描述您的 PR：** 在 Pull Request 中提供清晰的标题和更改描述。链接到任何相关的 issue（例如，“Closes #123”）。

我们会尽快审查您的贡献。感谢您的贡献！

## 许可证

本项目根据 [MIT 许可证](LICENSE) 授权。
