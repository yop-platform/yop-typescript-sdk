# YOP TypeScript SDK (@yeepay/yop-typescript-sdk)

[![npm version](https://img.shields.io/npm/v/@yeepay/yop-typescript-sdk.svg)](https://www.npmjs.com/package/@yeepay/yop-typescript-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@yeepay/yop-typescript-sdk.svg)](https://www.npmjs.com/package/@yeepay/yop-typescript-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/yop-platform/yop-typescript-sdk/workflows/CI/badge.svg)](https://github.com/yop-platform/yop-typescript-sdk/actions)
[![codecov](https://codecov.io/gh/yop-platform/yop-typescript-sdk/branch/main/graph/badge.svg)](https://codecov.io/gh/yop-platform/yop-typescript-sdk)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/yop-platform/yop-typescript-sdk)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fyop-platform%2Fyop-typescript-sdk.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fyop-platform%2Fyop-typescript-sdk?ref=badge_shield)

[阅读中文文档](README_zh-CN.md)

A TypeScript SDK designed for seamless interaction with YOP (YeePay Open Platform) APIs. This SDK is built with modern JavaScript features, leveraging ES Modules and native `fetch` API for optimal performance and compatibility.

## Overview

This SDK provides a convenient way to integrate YeePay payment and other services into your TypeScript or JavaScript applications. It handles request signing, signature verification, and API communication, allowing you to focus on your application logic.

**Key Features:**

- **TypeScript First:** Fully typed for better developer experience and safety.
- **ES Modules:** Modern module system for better tree-shaking and compatibility.
- **Native `fetch`:** Uses the standard Fetch API, available in Node.js (v18+) and modern browsers.
- **Secure:** Implements YOP API's RSA signature requirements with UTF-8 encoding support for international characters.
- **Flexible:** Supports both `application/x-www-form-urlencoded` and `application/json` request types.

## Installation

Install the package using your preferred package manager:

```bash
npm install @yeepay/yop-typescript-sdk
# or
yarn add @yeepay/yop-typescript-sdk
# or
pnpm add @yeepay/yop-typescript-sdk
```

## Configuration

The `YopClient` can be configured in two ways:

1. **Via Environment Variables (Recommended for simplicity):**
   If no configuration object is passed to the constructor, the SDK will automatically attempt to load the required configuration from the following environment variables:
   - `YOP_APP_KEY`: (Required) Your YeePay Application Key.
   - `YOP_SECRET_KEY`: (Required) Your application's private key (raw string, PEM format PKCS#1 or PKCS#8). The SDK will automatically format the key if it's not already in PEM format. **Keep this secure!**
   - `YOP_PUBLIC_KEY`: (Required) YeePay platform's public key (raw string, PEM format). This is the key *content*, not a file path. Download from YeePay developer portal.
   - `YOP_API_BASE_URL`: (Optional) The base URL for the YeePay API. Defaults to production (`https://openapi.yeepay.com`).

   *Example `.env` file:*

   ```dotenv
   YOP_APP_KEY=your_app_key
   YOP_SECRET_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'
   YOP_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----'
   # YOP_API_BASE_URL=https://sandbox.yeepay.com # Optional for sandbox environment
   ```

   *Example initialization:*

   ```typescript
   import { YopClient } from '@yeepay/yop-typescript-sdk';
   import dotenv from 'dotenv';

   // Load environment variables (e.g., from a .env file)
   dotenv.config();

   // Initialize YopClient using environment variables
   try {
     // No configuration object passed, SDK uses environment variables
     const yopClient = new YopClient();
     console.log('YopClient initialized successfully using environment variables!');
     // Use yopClient for API calls...
   } catch (error) {
     console.error('Failed to initialize YopClient from environment variables:', error);
     // Make sure all required environment variables (YOP_APP_KEY, YOP_SECRET_KEY, YOP_PUBLIC_KEY) are set.
   }
   ```

2. **Via Explicit `YopConfig` Object:**
   You can explicitly pass a configuration object to the `YopClient` constructor. **If both environment variables are set and a configuration object is passed, this method takes precedence** (values in the object will override corresponding environment variables).

   *Example initialization:*

   ```typescript
   import { YopClient } from '@yeepay/yop-typescript-sdk';
   import type { YopConfig } from '@yeepay/yop-typescript-sdk';
   import dotenv from 'dotenv'; // Still useful for loading partial configuration

   dotenv.config(); // Load any potential fallbacks or other env vars

   // Explicitly prepare the configuration object
   const yopConfig: YopConfig = {
     appKey: process.env.MY_CUSTOM_APP_KEY || 'defaultAppKey', // Example: Using different env var or default
     secretKey: process.env.MY_SECRET_KEY!,
     yopPublicKey: process.env.YOP_PUBLIC_KEY!,
     // yopApiBaseUrl: 'https://sandbox.yeepay.com' // Example: Override base URL
   };

   // Create YopClient instance using explicit configuration
   const yopClient = new YopClient(yopConfig);

   console.log('YopClient initialized successfully using explicit configuration!');
   ```

**Configuration Options (when using `YopConfig` object):**

When you pass a configuration object to the `YopClient` constructor, these options will be used. If an option is omitted from the object, the SDK will attempt to fall back to the corresponding environment variable.

- `appKey` (string, required): Your unique application identifier provided by YeePay. (Falls back to `process.env.YOP_APP_KEY`).
- `secretKey` (string, required): Your application's private key (in PEM format, as a raw string). The SDK will automatically format the key if it's not already in PEM format. **Keep this secure!** (Falls back to `process.env.YOP_SECRET_KEY`).
- `yopPublicKey` (string, required): The YeePay platform's public key (in PEM format, as a raw string) used to verify responses. This must be the key *content*, not a file path. (Falls back to `process.env.YOP_PUBLIC_KEY`).
- `yopApiBaseUrl` (string, optional): The base URL for the YeePay API. (Falls back to `process.env.YOP_API_BASE_URL`, then defaults to `https://openapi.yeepay.com`).

## Usage / Quick Start

Once you have configured the `YopClient`, you can use its methods to make API calls.

### Example: Creating a Pre-payment Order

```typescript
import type { YopResponse } from "@yeepay/yop-typescript-sdk";
// Assume yopClient is configured and initialized as shown above

async function createPayment() {
  const paymentData = {
    parentMerchantNo: process.env.YOP_PARENT_MERCHANT_NO!, // Your parent merchant number
    merchantNo: process.env.YOP_MERCHANT_NO!, // Your merchant number
    orderId: `SDK_TEST_${Date.now()}`, // Unique order ID
    orderAmount: "0.01", // Amount (string format)
    goodsName: "SDK Test Product", // Supports UTF-8 characters (e.g., Chinese)
    notifyUrl: process.env.YOP_NOTIFY_URL!, // URL for receiving payment notifications
    userIp: "127.0.0.1", // End user's IP address
    scene: "ONLINE", // Transaction scenario
    channel: "WECHAT", // Payment channel
    // ... include any other necessary fields required by the specific API endpoint
  };

  try {
    console.log("Sending pre-payment request:", paymentData);
    // Use post() to send default 'application/x-www-form-urlencoded' request
    const response = await yopClient.post<YopResponse>(
      "/rest/v1.0/aggpay/pre-pay",
      paymentData
    );
    console.log("Received pre-payment response:", response);

    if (response.state === "SUCCESS" && response.result?.code === "00000") {
      console.log("Pre-payment successful:", response.result);
      // Handle successful response: extract prePayTn, orderId, etc.
      // const prePayTn = response.result.prePayTn;
    } else {
      // Handle API errors or unsuccessful states
      const errorInfo =
        response.state === "FAILURE" ? response.error : response.result;
      console.error("Pre-payment failed:", errorInfo);
    }
  } catch (error) {
    // Handle network errors or issues during request/response
    console.error("Error executing pre-payment request:", error);
  }
}

createPayment();
```

### Example: Querying Payment Order

```typescript
import type { YopResponse } from "@yeepay/yop-typescript-sdk";
// Assume yopClient is configured and initialized

async function queryPayment(orderId: string) {
  const queryData = {
    parentMerchantNo: process.env.YOP_PARENT_MERCHANT_NO!,
    merchantNo: process.env.YOP_MERCHANT_NO!,
    orderId: orderId, // The order ID you want to query
    // queryType: 'PAYMENT', // Example: specify query type if needed
  };

  try {
    console.log("Sending order query request:", orderId);
    // Use get() to send GET request
    const response = await yopClient.get<YopResponse>(
      "/rest/v1.0/trade/order/query",
      queryData
    );
    console.log("Received query response:", response);

    if (response.state === "SUCCESS" && response.result?.code === "00000") {
      console.log("Query successful:", response.result);
      // Handle order details: response.result.status, response.result.orderAmount, etc.
    } else {
      const errorInfo =
        response.state === "FAILURE" ? response.error : response.result;
      console.error("Query failed:", errorInfo);
    }
  } catch (error) {
    console.error("Error executing query request:", error);
  }
}

// Example call: replace with actual order ID
// queryPayment('SDK_TEST_1678886400000');
```

## API Reference

### `new YopClient(config?: YopConfig)`

Creates and initializes a new YOP client instance.

- `config` (optional): A `YopConfig` object containing your credentials and settings. If omitted, the SDK will attempt to load configuration from environment variables. See [Configuration](#configuration) and `src/types.ts`.

### `yopClient.get<T>(apiUrl: string, params: Record<string, any>, timeout?: number): Promise<T>`

Sends an HTTP GET request to the specified YOP API endpoint.

- `apiUrl`: The API path relative to the `yopApiBaseUrl` (e.g., `/rest/v1.0/trade/order/query`).
- `params`: An object containing the request query parameters.
- `timeout` (optional): Request timeout in milliseconds.
- Returns: A `Promise` that resolves with the parsed API response of type `T`.

### `yopClient.post<T>(apiUrl: string, body: Record<string, any>, contentType?: ContentType, timeout?: number): Promise<T>`

Sends an HTTP POST request to the specified YOP API endpoint. Defaults to `application/x-www-form-urlencoded` content type.

- `apiUrl`: The API path relative to the `yopApiBaseUrl`.
- `body`: An object containing the data to be sent in the request body.
- `contentType` (optional): The content type of the request. Defaults to `ContentType.FORM_URLENCODED`. For JSON payloads, use `ContentType.JSON` (or use `postJson`).
- `timeout` (optional): Request timeout in milliseconds.
- Returns: A `Promise` that resolves with the parsed API response of type `T`.

### `yopClient.postJson<T>(apiUrl: string, body: Record<string, any>, timeout?: number): Promise<T>`

A convenience method for sending an HTTP POST request with `application/json` content type.

- `apiUrl`: The API path relative to the `yopApiBaseUrl`.
- `body`: An object containing the data to be sent as JSON in the request body.
- `timeout` (optional): Request timeout in milliseconds.
- Returns: A `Promise` that resolves with the parsed API response of type `T`.

### Types

Detailed type definitions for configuration (`YopConfig`), responses (`YopResponse`), errors, and content types can be found in `src/types.ts`.

## Requirements

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 4.5.0 (if using TypeScript)
- **Package Manager**: npm, yarn, or pnpm

## Testing and Quality Assurance

This SDK includes comprehensive testing and quality assurance measures:

- **Unit Tests**: Comprehensive test coverage for all core functionality
- **Integration Tests**: Real API integration testing (when configured)
- **Type Safety**: Full TypeScript support with strict type checking
- **Code Coverage**: Minimum 60% coverage requirement
- **Continuous Integration**: Automated testing on multiple Node.js versions (18.x, 20.x)
- **Security Scanning**: Automated vulnerability scanning with Snyk
- **Code Quality**: ESLint and Prettier for consistent code style

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run linting
npm run lint

# Build the project
npm run build
```

## Troubleshooting

### Common Issues

**1. "Invalid signature" or "Signature verification failed" errors:**

- Ensure your `YOP_SECRET_KEY` is in correct PEM format
- Verify that your `YOP_PUBLIC_KEY` matches the one from YeePay developer portal
- Check that your system time is synchronized (signature includes timestamp)

**2. "Missing required environment variables" errors:**

- Verify all required environment variables are set: `YOP_APP_KEY`, `YOP_SECRET_KEY`, `YOP_PUBLIC_KEY`
- Check your `.env` file is in the correct location and properly formatted

**3. Network or timeout errors:**

- Check your internet connection
- Verify the `YOP_API_BASE_URL` is correct (use sandbox URL for testing)
- Consider increasing the timeout parameter in your API calls

**4. TypeScript compilation errors:**

- Ensure you're using Node.js >= 18.0.0
- Check that your TypeScript version is >= 4.5.0
- Verify your `tsconfig.json` includes ES2020+ target and ESNext modules

### Getting Help

- Check the [Issues](https://github.com/yop-platform/yop-typescript-sdk/issues) page for known problems
- Review the [YeePay API documentation](https://open.yeepay.com/docs)
- Create a new issue with detailed error information and reproduction steps

## Security

This SDK implements industry-standard security practices:

- **RSA Signature**: All requests are signed using RSA-SHA256
- **Request Verification**: All responses are verified for authenticity
- **Secure Key Handling**: Private keys are handled securely in memory
- **No Key Storage**: Keys are never written to disk or logs
- **UTF-8 Support**: Proper handling of international characters in signatures

For security vulnerabilities, please see our [Security Policy](SECURITY.md).

## Contributing

Contributions are highly welcome! We appreciate your help in improving the SDK. Here's how you can contribute:

**Reporting Bugs:**

- If you find a bug, please check the [Issues](https://github.com/yop-platform/yop-typescript-sdk/issues) section to see if it has already been reported.
- If not, open a new issue. Provide a clear title, a detailed description of the bug, steps to reproduce it, and the expected vs. actual behavior. Include relevant code snippets or error messages if possible.

**Suggesting Enhancements:**

- If you have an idea for a new feature or an improvement to an existing one, open a new issue.
- Clearly describe the proposed enhancement, its use case, and why it would be beneficial.

**Pull Requests:**

1. **Fork the repository:** Click the "Fork" button on the top right of the repository page.
2. **Clone your fork:** `git clone https://github.com/yop-platform/yop-typescript-sdk.git`
3. **Create a branch:** `git checkout -b feature/your-feature-name` or `bugfix/issue-number`.
4. **Make your changes:** Implement your feature or fix the bug.
5. **Add/Update Tests:** Ensure your changes are covered by tests. Add new tests if necessary.
6. **Run Tests:** Make sure all tests pass: `npm test`
7. **Lint Code:** Ensure your code adheres to the project's style guidelines: `npm run lint` (fix any reported issues).
8. **Commit your changes:** `git commit -m "feat: Describe your feature" -m "Detailed description..."` (Follow conventional commit messages if applicable).
9. **Push to your fork:** `git push origin feature/your-feature-name`
10. **Open a Pull Request:** Go to the original repository and click "New pull request". Compare your branch with the main branch of the original repository.
11. **Describe your PR:** Provide a clear title and description of your changes in the Pull Request. Link to any relevant issues (e.g., "Closes #123").

We will review your contribution as soon as possible. Thank you for contributing!

## License

This project is licensed under the [MIT License](LICENSE).


[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fyop-platform%2Fyop-typescript-sdk.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fyop-platform%2Fyop-typescript-sdk?ref=badge_large)