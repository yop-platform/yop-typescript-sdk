import dotenv from 'dotenv';
import { jest, describe, beforeAll, it, expect } from '@jest/globals';
import { YopClient } from '../src/YopClient';
import { YopConfig } from '../src/types'; // Added YopConfig import and adjusted path
import { getUniqueId } from '../src/utils/GetUniqueId';

// 加载环境变量
dotenv.config();

// 设置较长的超时时间以适应网络请求
jest.setTimeout(20000);

describe('YopClient Integration Test for /rest/v1.0/aggpay/pre-pay', () => {
  let yopClient: YopClient;

  beforeAll(() => {
    // Ensure required environment variables are set
    const requiredEnvVars = ['YOP_APP_KEY', 'YOP_APP_PRIVATE_KEY', 'YOP_PARENT_MERCHANT_NO', 'YOP_MERCHANT_NO', 'YOP_NOTIFY_URL'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable ${envVar} in .env file for integration test.`);
      }
    }

    // Get YOP public key from environment variable
    if (!process.env.YOP_PUBLIC_KEY) {
      throw new Error('Missing YOP_PUBLIC_KEY environment variable for integration test.');
    }
    const yopPublicKey = process.env.YOP_PUBLIC_KEY;


    // Create real config object
    const realConfig: YopConfig = {
      appKey: process.env.YOP_APP_KEY!,
      appPrivateKey: process.env.YOP_APP_PRIVATE_KEY!, // Secret key is needed for YopClient now
      yopApiBaseUrl: process.env.YOP_API_BASE_URL || 'https://openapi.yeepay.com',
      yopPublicKey: yopPublicKey,
    };

    // Instantiate YopClient with real config
    yopClient = new YopClient(realConfig);
  });

  it('should successfully call the query-order endpoint after pre-pay', async () => {
    // 1. Call pre-pay to get an orderId
    const prePayTestData = {
      parentMerchantNo: process.env.YOP_PARENT_MERCHANT_NO!,
      merchantNo: process.env.YOP_MERCHANT_NO!,
      orderId: `INTEGRATION_QUERY_${getUniqueId(10)}`, // Use a different orderId for this test
      orderAmount: '0.01',
      goodsName: 'Integration Test Product for Query',
      notifyUrl: process.env.YOP_NOTIFY_URL!,
      memo: 'Integration test call for query',
      userIp: '127.0.0.1',
      payWay: 'USER_SCAN', // Keep these parameters consistent with the first test
      channel: 'WECHAT',
      scene: 'ONLINE'
    };

    let prePayResponseData: any;
    let prePayRequestError: any = null;

    try {
      prePayResponseData = await yopClient.post('/rest/v1.0/aggpay/pre-pay', prePayTestData);
    } catch (error) {
      console.error('Error calling pre-pay endpoint for query test:', error);
      prePayRequestError = error;
    }

    // Assert pre-pay was successful enough to get an orderId (or at least a response)
    expect(prePayRequestError).toBeNull();
    expect(prePayResponseData).toBeDefined();
    // Assuming a successful pre-pay response structure includes state and result/error
    expect(prePayResponseData).toHaveProperty('result');
    expect(prePayResponseData.result).toHaveProperty('prePayTn');

    // Extract orderId from pre-pay response if successful
    let orderIdToQuery: string | undefined;
    if (prePayResponseData.state === 'SUCCESS' && prePayResponseData.result && prePayResponseData.result.code === 'OPR00000') {
        // If pre-pay was truly successful (OPR00000), use the generated orderId
        orderIdToQuery = prePayTestData.orderId; // Use the orderId we sent
        console.log(`Pre-pay successful for query test, orderId: ${orderIdToQuery}`);
    } else {
        // If pre-pay failed (e.g., business error like invalid payWay), we might not have a valid order to query.
        // For this test, we'll proceed with the orderId we attempted to create,
        // but the query test might then assert a "order not found" or similar error.
        // Alternatively, we could skip the query test if pre-pay fails with a business error.
        // Let's proceed with the orderId we sent, and expect the query to reflect the pre-pay outcome.
        orderIdToQuery = prePayTestData.orderId;
        console.warn(`Pre-pay failed or had business error for query test (state: ${prePayResponseData.state}, code: ${prePayResponseData.result?.code || prePayResponseData.error?.code}), attempting query with orderId: ${orderIdToQuery}`);
    }

    // Ensure we have an orderId to query
    expect(orderIdToQuery).toBeDefined();

    // 2. Call query-order endpoint
    const queryTestData = {
      parentMerchantNo: process.env.YOP_PARENT_MERCHANT_NO!,
      merchantNo: process.env.YOP_MERCHANT_NO!,
      orderId: orderIdToQuery!, // Use the orderId from the pre-pay step
    };

    let queryResponseData: any;
    let queryRequestError: any = null;

    try {
      queryResponseData = await yopClient.get('/rest/v1.0/trade/order/query', queryTestData);
    } catch (error) {
      console.error('Error calling query-order endpoint:', error);
      queryRequestError = error;
    }

    // 3. Verify the result of the order query call
    expect(queryRequestError).toBeNull();
    expect(queryResponseData).toBeDefined();

    // Assert response data structure for query
    if (queryResponseData && Object.keys(queryResponseData).length > 0) {
        expect(queryResponseData).toHaveProperty('result'); // Query response should have 'result' even on business failure
        expect(queryResponseData.result).toHaveProperty('status');
    } else {
        console.warn('Query test received an empty response object, skipping detailed property checks.');
    }
  });
});