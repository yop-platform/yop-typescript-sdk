# YOP TypeScript SDK (@yeepay/yop-typescript-sdk)

[![npm version](https://img.shields.io/npm/v/@yeepay/yop-typescript-sdk.svg)](https://www.npmjs.com/package/@yeepay/yop-typescript-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@yeepay/yop-typescript-sdk.svg)](https://www.npmjs.com/package/@yeepay/yop-typescript-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[阅读中文文档](README_zh-CN.md)

A TypeScript SDK designed for seamless interaction with the YOP (YeePay Open Platform) API. This SDK is built using modern JavaScript features, leveraging ES Modules and the native `fetch` API for optimal performance and compatibility.

## Overview

This SDK provides a convenient way to integrate YeePay payment and other services into your TypeScript or JavaScript applications. It handles request signing, signature verification, and API communication, allowing you to focus on your application logic.

**Key Features:**

- **TypeScript First:** Fully typed for better developer experience and safety.
- **ES Modules:** Modern module system for better tree-shaking and compatibility.
- **Native `fetch`:** Uses the standard Fetch API, available in Node.js (v18+) and modern browsers.
- **Secure:** Implements YOP API's RSA signature requirements with UTF-8 support for international characters.
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

1.  **Via Environment Variables (Recommended for simplicity):**
    If no configuration object is passed to the constructor, the SDK will automatically attempt to load the required configuration from the following environment variables:
    - `YOP_APP_KEY`: (Required) Your YeePay Application Key.
    - `YOP_APP_PRIVATE_KEY`: (Required) Your application's private key (raw string, PEM format PKCS#1 or PKCS#8). The SDK will automatically format the key if it's not already in PEM format. **Keep this secure!**
    - `YOP_PUBLIC_KEY`: (Required) The YeePay platform's public key (raw string, PEM format). This is the key *content*, not a file path. Download from the YeePay developer portal.
    - `YOP_API_BASE_URL`: (Optional) The base URL for the YeePay API. Defaults to production (`https://openapi.yeepay.com`).

    *Example `.env` file:*
    ```dotenv
    YOP_APP_KEY=your_app_key
    YOP_APP_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'
    YOP_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----'
    # YOP_API_BASE_URL=https://sandbox.yeepay.com # Optional for sandbox
    ```

    *Example Initialization:*
    ```typescript
    import { YopClient } from '@yeepay/yop-typescript-sdk';
    import dotenv from 'dotenv';

    // Load environment variables (e.g., from a .env file)
    dotenv.config();

    // Initialize YopClient using environment variables
    try {
      // No config object passed, SDK uses environment variables
      const yopClient = new YopClient();
      console.log('YopClient initialized successfully using environment variables!');
      // Use yopClient for API calls...
    } catch (error) {
      console.error('Failed to initialize YopClient from environment variables:', error);
      // Ensure all required environment variables (YOP_APP_KEY, YOP_APP_PRIVATE_KEY, YOP_PUBLIC_KEY) are set.
    }
    ```

2.  **Via Explicit `YopConfig` Object:**
    You can explicitly pass a configuration object to the `YopClient` constructor. **This method takes precedence** if both environment variables and a config object are provided (values in the object override corresponding environment variables).

    *Example Initialization:*
    ```typescript
    import { YopClient } from '@yeepay/yop-typescript-sdk';
    import type { YopConfig } from '@yeepay/yop-typescript-sdk';
    import dotenv from 'dotenv'; // Still useful for loading parts of the config

    dotenv.config(); // Load any potential fallbacks or other env vars

    // Prepare the configuration object explicitly
    const yopConfig: YopConfig = {
      appKey: process.env.MY_CUSTOM_APP_KEY || 'defaultAppKey', // Example: Using different env var or default
      appPrivateKey: process.env.MY_SECRET_KEY!, // Example: Sourcing from a specific variable
      yopPublicKey: process.env.YOP_PUBLIC_KEY!, // Can still load from standard env var if desired
      // yeepayApiBaseUrl: 'https://sandbox.yeepay.com' // Example: Overriding the base URL
    };

    // Create a YopClient instance with the explicit config
    const yopClient = new YopClient(yopConfig);

    console.log('YopClient initialized successfully with explicit config!');
    ```

**Configuration Options (when using `YopConfig` object):**

These options are used when you pass a configuration object to the `YopClient` constructor. If an option is omitted from the object, the SDK will attempt to fall back to the corresponding environment variable.

- `appKey` (string, required): Your unique application identifier provided by YeePay. (Falls back to `process.env.YOP_APP_KEY`).
- `appPrivateKey` (string, required): Your application's private key (in PEM format, as a raw string). The SDK will automatically format the key if it's not already in PEM format. **Keep this secure!** (Falls back to `process.env.YOP_APP_PRIVATE_KEY`).
- `yopPublicKey` (string, required): The YeePay platform's public key (in PEM format, as a raw string) used to verify responses. This must be the key *content*, not a file path. (Falls back to `process.env.YOP_PUBLIC_KEY`).
- `yeepayApiBaseUrl` (string, optional): The base URL for the YeePay API. (Falls back to `process.env.YOP_API_BASE_URL`, then defaults to `https://openapi.yeepay.com`).

## Usage / Quick Start

Once the `YopClient` is configured, you can make API calls using its methods.

**Example: Creating a Pre-payment Order**

```typescript
import type { YopResponse } from "@yeepay/yop-typescript-sdk";
// Assuming yopClient is already configured and initialized as shown above

async function createPayment() {
  const paymentData = {
    parentMerchantNo: process.env.YOP_PARENT_MERCHANT_NO!, // Your parent merchant number
    merchantNo: process.env.YOP_MERCHANT_NO!, // Your merchant number
    orderId: `SDK_TEST_${Date.now()}`, // Unique order ID
    orderAmount: "0.01", // Amount as string
    goodsName: "SDK Test Product", // Supports UTF-8 characters (e.g., Chinese)
    notifyUrl: process.env.YOP_NOTIFY_URL!, // URL for receiving payment notifications
    userIp: "127.0.0.1", // End-user's IP address
    scene: "ONLINE", // Transaction scene
    channel: "WECHAT", // Payment channel
    // ... include any other necessary fields required by the specific API endpoint
  };

  try {
    console.log("Sending pre-pay request:", paymentData);
    // Use post() for default 'application/x-www-form-urlencoded' requests
    const response = await yopClient.post<YopResponse>(
      "/rest/v1.0/aggpay/pre-pay",
      paymentData
    );
    console.log("Received pre-pay response:", response);

    if (response.state === "SUCCESS" && response.result?.code === "00000") {
      console.log("Pre-pay successful:", response.result);
      // Process successful response: extract prePayTn, orderId, etc.
      // const prePayTn = response.result.prePayTn;
    } else {
      // Handle API errors or unsuccessful states
      const errorInfo =
        response.state === "FAILURE" ? response.error : response.result;
      console.error("Pre-pay failed:", errorInfo);
    }
  } catch (error) {
    // Handle network errors or issues during the request/response process
    console.error("Error during pre-pay request execution:", error);
  }
}

createPayment();
```

**Example: Querying a Payment Order**

```typescript
import type { YopResponse } from "@yeepay/yop-typescript-sdk";
// Assuming yopClient is already configured and initialized

async function queryPayment(orderId: string) {
  const queryData = {
    parentMerchantNo: process.env.YOP_PARENT_MERCHANT_NO!,
    merchantNo: process.env.YOP_MERCHANT_NO!,
    orderId: orderId, // The ID of the order you want to query
    // queryType: 'PAYMENT', // Example: Specify query type if needed
  };

  try {
    console.log("Sending query request for order:", orderId);
    // Use get() for GET requests
    const response = await yopClient.get<YopResponse>(
      "/rest/v1.0/trade/order/query",
      queryData
    );
    console.log("Received query response:", response);

    if (response.state === "SUCCESS" && response.result?.code === "00000") {
      console.log("Query successful:", response.result);
      // Process the order details: response.result.status, response.result.orderAmount etc.
    } else {
      const errorInfo =
        response.state === "FAILURE" ? response.error : response.result;
      console.error("Query failed:", errorInfo);
    }
  } catch (error) {
    console.error("Error during query request execution:", error);
  }
}

// Example call: Replace with an actual order ID
// queryPayment('SDK_TEST_1678886400000');
```

## API Reference

### `new YopClient(config: YopConfig)`

Creates and initializes a new YOP client instance.

- `config`: A `YopConfig` object containing your credentials and settings. See [Configuration](#configuration) and `src/types.ts`.

### `yopClient.get<T>(apiUrl: string, params: Record<string, any>, timeout?: number): Promise<T>`

Sends an HTTP GET request to the specified YOP API endpoint.

- `apiUrl`: The API path relative to the `yeepayApiBaseUrl` (e.g., `/rest/v1.0/trade/order/query`).
- `params`: An object containing the query parameters for the request.
- `timeout` (optional): Request timeout in milliseconds.
- Returns: A `Promise` that resolves with the parsed API response of type `T`.

### `yopClient.post<T>(apiUrl: string, body: Record<string, any>, contentType?: ContentType, timeout?: number): Promise<T>`

Sends an HTTP POST request to the specified YOP API endpoint. Defaults to `application/x-www-form-urlencoded` content type.

- `apiUrl`: The API path relative to the `yeepayApiBaseUrl`.
- `body`: An object containing the data to be sent in the request body.
- `contentType` (optional): The content type of the request. Defaults to `ContentType.FORM_URLENCODED`. Use `ContentType.JSON` for JSON payloads (or use `postJson`).
- `timeout` (optional): Request timeout in milliseconds.
- Returns: A `Promise` that resolves with the parsed API response of type `T`.

### `yopClient.postJson<T>(apiUrl: string, body: Record<string, any>, timeout?: number): Promise<T>`

A convenience method for sending an HTTP POST request with `application/json` content type.

- `apiUrl`: The API path relative to the `yeepayApiBaseUrl`.
- `body`: An object containing the data to be sent as JSON in the request body.
- `timeout` (optional): Request timeout in milliseconds.
- Returns: A `Promise` that resolves with the parsed API response of type `T`.

### Types

Detailed type definitions for configuration (`YopConfig`), responses (`YopResponse`), errors, and content types can be found in `src/types.ts`.

## Contributing

Contributions are highly welcome! We appreciate your help in improving the SDK. Here's how you can contribute:

**Reporting Bugs:**

- If you find a bug, please check the [Issues](https://github.com/yop-platform/yop-typescript-sdk/issues) section to see if it has already been reported.
- If not, open a new issue. Provide a clear title, a detailed description of the bug, steps to reproduce it, and the expected vs. actual behavior. Include relevant code snippets or error messages if possible.

**Suggesting Enhancements:**

- If you have an idea for a new feature or an improvement to an existing one, open a new issue.
- Clearly describe the proposed enhancement, its use case, and why it would be beneficial.

**Pull Requests:**

1.  **Fork the repository:** Click the "Fork" button on the top right of the repository page.
2.  **Clone your fork:** `git clone https://github.com/yop-platform/yop-typescript-sdk.git`
3.  **Create a branch:** `git checkout -b feature/your-feature-name` or `bugfix/issue-number`.
4.  **Make your changes:** Implement your feature or fix the bug.
5.  **Add/Update Tests:** Ensure your changes are covered by tests. Add new tests if necessary.
6.  **Run Tests:** Make sure all tests pass: `npm test`
7.  **Lint Code:** Ensure your code adheres to the project's style guidelines: `npm run lint` (fix any reported issues).
8.  **Commit your changes:** `git commit -m "feat: Describe your feature" -m "Detailed description..."` (Follow conventional commit messages if applicable).
9.  **Push to your fork:** `git push origin feature/your-feature-name`
10. **Open a Pull Request:** Go to the original repository and click "New pull request". Compare your branch with the main branch of the original repository.
11. **Describe your PR:** Provide a clear title and description of your changes in the Pull Request. Link to any relevant issues (e.g., "Closes #123").

We will review your contribution as soon as possible. Thank you for contributing!

## License

This project is licensed under the [MIT License](LICENSE).
