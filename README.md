# YOP TypeScript SDK (yop-typescript-sdk)

A TypeScript SDK for interacting with the YOP (Yeepay Open Platform) API. Built with ES Modules and uses native `fetch`.

## Installation

```bash
npm install yop-typescript-sdk
# or
yarn add yop-typescript-sdk
```

## Quick Start

```typescript
import { YopClient } from 'yop-typescript-sdk';
import type { YopConfig, YopResponse } from 'yop-typescript-sdk';
import dotenv from 'dotenv';
import fs from 'fs';

// 1. Load your configuration securely (e.g., from environment variables)
dotenv.config();

// 2. Prepare the configuration object
const yopConfig: YopConfig = {
  appKey: process.env.YEEPAY_APP_KEY!,
  secretKey: process.env.YEEPAY_SECRET_KEY!, // Provide the raw private key string content
  yopPublicKey: fs.readFileSync('./path/to/yop_platform_rsa_cert_rsa.cer', 'utf-8'), // Provide the raw public key string content
  yeepayApiBaseUrl: process.env.YEEPAY_API_BASE_URL || 'https://openapi.yeepay.com', // Optional
};

// 3. Create a YopClient instance
const yopClient = new YopClient(yopConfig); // Use constructor

// 4. Make API calls
async function createPayment() {
  const paymentData = {
    parentMerchantNo: process.env.YEEPAY_PARENT_MERCHANT_NO!, // Get these from env or secure source
    merchantNo: process.env.YEEPAY_MERCHANT_NO!,
    orderId: `SDK_TEST_${Date.now()}`,
    orderAmount: '0.01', // Amount as string
    goodsName: 'SDK Test Product',
    notifyUrl: process.env.YEEPAY_NOTIFY_URL!,
    userIp: '127.0.0.1',
    scene: 'ONLINE', // Correct scene parameter
    channel: 'WECHAT',
    // ... other necessary fields
  };

  try {
    // Use post for form-urlencoded (default)
    const response = await yopClient.post<YopResponse>('/rest/v1.0/aggpay/pre-pay', paymentData);

    if (response.state === 'SUCCESS' && response.result?.code === '00000') {
      console.log('Pre-pay successful:', response.result);
      // Extract needed info: response.result.prePayTn, response.result.orderId, etc.
    } else {
      console.error('Pre-pay failed:', response.state === 'FAILURE' ? response.error : response.result);
    }
  } catch (error) {
    console.error('Error during pre-pay request:', error);
  }
}

createPayment();

async function queryPayment(orderId: string) {
   const queryData = {
     parentMerchantNo: process.env.YEEPAY_PARENT_MERCHANT_NO!,
     merchantNo: process.env.YEEPAY_MERCHANT_NO!,
     orderId: orderId,
   };
   try {
     const response = await yopClient.get<YopResponse>('/rest/v1.0/trade/order/query', queryData);
     console.log('Query response:', response);
     // Process response...
   } catch (error) {
     console.error('Error during query request:', error);
   }
}

// queryPayment('some-order-id');
```

## API Reference

*   **`new YopClient(config: YopConfig)`**: Creates a new client instance.
*   **`yopClient.get<T>(apiUrl: string, params: Record<string, any>, timeout?: number): Promise<T>`**: Sends a GET request.
*   **`yopClient.post<T>(apiUrl: string, body: Record<string, any>, contentType?: ContentType, timeout?: number): Promise<T>`**: Sends a POST request. Defaults to `application/x-www-form-urlencoded`.
*   **`yopClient.postJson<T>(apiUrl: string, body: Record<string, any>, timeout?: number): Promise<T>`**: Sends a POST request with `application/json`.

See `src/types.ts` for `YopConfig`, `YopResponse`, and other related types.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request. Ensure tests pass (`npm test`) and code is linted (`npm run lint`).

## License

[MIT](LICENSE)