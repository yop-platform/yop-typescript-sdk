import * as dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import { YopClient } from '../src/YopClient'; // Adjusted path
import { YopConfig } from '../src/types'; // Added YopConfig import and adjusted path
// Mock the external SDK dependency
jest.mock('yop-nodejs-sdk', () => ({
  RsaV3Util: {
    getAuthHeaders: jest.fn() as jest.Mock,
  },
  RsaV3Util: { // Keep the mocked structure
    getAuthHeaders: jest.fn() as jest.Mock,
  },
  VerifyUtils: { // Keep the mocked structure
    isValidRsaResult: jest.fn() as jest.Mock,
  },
}));
// Removed mock for local VerifyUtils

// Mock 全局 fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AbortController for timeout tests
const mockAbort = jest.fn();
const mockSignal = { aborted: false };
global.AbortController = jest.fn(() => ({
  abort: mockAbort,
  signal: mockSignal,
})) as any;


describe('YopClient', () => {
  let yopClient: YopClient;
  const mockApiUri = '/rest/v1.0/test/api';
  const mockParams = { param1: 'value1', param2: 'value2' };
  const mockConfig: YopConfig = { // Create mock config
    appKey: 'mock-app-key',
    secretKey: 'mock-secret-key', // Provide a mock secret key
    yeepayApiBaseUrl: 'https://mock-api.yeepay.com',
    yopPublicKey: 'mock-yop-public-key', // Provide a mock public key
    merchantNo: 'mock-merchant-no', // Provide a mock merchant number
    // Add other necessary fields from YopConfig if needed, e.g., timeout
    timeout: 30000, // Example timeout
  };
  const mockAuthHeaders = {
    'Authorization': 'YOP-RSA3-TEST test-app-key/test-signature', // Example auth header
    'x-yop-appkey': 'test-app-key',
    'x-yop-request-id': 'mock-request-id',
    'x-yop-date': new Date().toISOString(),
    'x-yop-sdk-version': 'yop-nodejs-sdk/4.0.0', // 根据实际使用的SDK版本调整
    'x-yop-sdk-lang': 'nodejs',
  };
  const mockSuccessResponseData = { code: 'OPR00000', message: 'Success', result: { data: 'ok' } };
  const mockYopSignHeader = 'mock-yop-sign-header';

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockSignal.aborted = false;

    // Mock the methods from the mocked 'yop-nodejs-sdk'
    // Need to import the mocked module to access its mocked functions
    const { RsaV3Util, VerifyUtils } = jest.requireMock('yop-nodejs-sdk');
    (RsaV3Util.getAuthHeaders as jest.Mock).mockReturnValue(mockAuthHeaders);
    (VerifyUtils.isValidRsaResult as jest.Mock).mockReturnValue(true);

    // Instantiate YopClient with mock config
    yopClient = new YopClient(mockConfig);
  });

  // --- 测试用例将写在这里 ---

  // REMOVED: Singleton test is no longer applicable

  test('should make a successful GET request', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-yop-sign': mockYopSignHeader }),
      json: jest.fn().mockResolvedValue(mockSuccessResponseData),
      text: jest.fn().mockResolvedValue(JSON.stringify(mockSuccessResponseData)), // Add text() method
    };
    mockFetch.mockResolvedValue(mockResponse);

    // Call 'get' without headers argument
    const result = await yopClient.get(mockApiUri, mockParams);

    // Check if getAuthHeaders was called with the correct object structure using mockConfig
    const { RsaV3Util } = jest.requireMock('yop-nodejs-sdk'); // Get mocked module again if needed
    expect(RsaV3Util.getAuthHeaders).toHaveBeenCalledWith({
        appKey: mockConfig.appKey,
        secretKey: mockConfig.secretKey,
        method: 'GET',
        url: mockApiUri, // Relative URL passed to SDK
        params: mockParams,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      // URL should include base URL from mockConfig
      expect.stringContaining(`${mockConfig.yeepayApiBaseUrl}${mockApiUri}?param1=value1&param2=value2`),
      {
        method: 'GET',
        headers: expect.any(Headers), // Headers object is created internally
        signal: mockSignal,
      }
    );
    // Check if isValidRsaResult was called with the correct object structure using mockConfig
    const { VerifyUtils } = jest.requireMock('yop-nodejs-sdk'); // Get mocked module again if needed
    expect(VerifyUtils.isValidRsaResult).toHaveBeenCalledWith({
        data: JSON.stringify(mockSuccessResponseData),
        sign: mockYopSignHeader,
        publicKey: mockConfig.yopPublicKey,
    });
    expect(result).toEqual(mockSuccessResponseData); // get returns the full response data
  });

  test('should make a successful POST request (form-urlencoded)', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-yop-sign': mockYopSignHeader }),
      json: jest.fn().mockResolvedValue(mockSuccessResponseData),
      text: jest.fn().mockResolvedValue(JSON.stringify(mockSuccessResponseData)), // Add text() method
    };
    mockFetch.mockResolvedValue(mockResponse);

    // Call 'post' without headers, default content type is form-urlencoded
    const result = await yopClient.post(mockApiUri, mockParams);

    // Check if getAuthHeaders was called correctly for POST using mockConfig
    const { RsaV3Util } = jest.requireMock('yop-nodejs-sdk');
    expect(RsaV3Util.getAuthHeaders).toHaveBeenCalledWith({
        appKey: mockConfig.appKey,
        secretKey: mockConfig.secretKey,
        method: 'POST',
        url: mockApiUri,
        params: mockParams, // Body is passed as params for signing
    });
    expect(mockFetch).toHaveBeenCalledWith(
      `${mockConfig.yeepayApiBaseUrl}${mockApiUri}`, // Full URL from mockConfig
      {
        method: 'POST',
        headers: expect.any(Headers), // Headers object created internally
        body: 'param1=value1&param2=value2', // Form encoded body
        signal: mockSignal,
      }
    );
    const { VerifyUtils } = jest.requireMock('yop-nodejs-sdk');
    expect(VerifyUtils.isValidRsaResult).toHaveBeenCalledWith({
        data: JSON.stringify(mockSuccessResponseData),
        sign: mockYopSignHeader,
        publicKey: mockConfig.yopPublicKey,
    });
    expect(result).toEqual(mockSuccessResponseData); // post returns the full response data
  });

   test('should make a successful POST request (json)', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-yop-sign': mockYopSignHeader }),
      json: jest.fn().mockResolvedValue(mockSuccessResponseData),
      text: jest.fn().mockResolvedValue(JSON.stringify(mockSuccessResponseData)), // Add text() method
    };
    mockFetch.mockResolvedValue(mockResponse);

    // Call 'postJson' without headers
    const result = await yopClient.postJson(mockApiUri, mockParams);

    // Check if getAuthHeaders was called correctly for POST JSON
    // Note: YopClient seems to pass the object itself, not stringified JSON to SDK
    const { RsaV3Util } = jest.requireMock('yop-nodejs-sdk');
    expect(RsaV3Util.getAuthHeaders).toHaveBeenCalledWith({
        appKey: mockConfig.appKey,
        secretKey: mockConfig.secretKey,
        method: 'POST',
        url: mockApiUri,
        params: mockParams, // Body object passed as params for signing
    });
    expect(mockFetch).toHaveBeenCalledWith(
      `${mockConfig.yeepayApiBaseUrl}${mockApiUri}`, // Full URL from mockConfig
      {
        method: 'POST',
        headers: expect.any(Headers), // Headers object created internally
        body: JSON.stringify(mockParams), // Body is JSON string for fetch
        signal: mockSignal,
      }
    );
     const { VerifyUtils } = jest.requireMock('yop-nodejs-sdk');
     expect(VerifyUtils.isValidRsaResult).toHaveBeenCalledWith({
        data: JSON.stringify(mockSuccessResponseData),
        sign: mockYopSignHeader,
        publicKey: mockConfig.yopPublicKey,
     });
    expect(result).toEqual(mockSuccessResponseData); // postJson returns the full response data
  });

  test('should handle Yop business error (code !== OPR00000)', async () => {
    const mockBusinessErrorData = { code: 'BIZ12345', message: 'Business Error', result: null };
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-yop-sign': mockYopSignHeader }),
      json: jest.fn().mockResolvedValue(mockBusinessErrorData),
      text: jest.fn().mockResolvedValue(JSON.stringify(mockBusinessErrorData)), // Add text() method
    };
    mockFetch.mockResolvedValue(mockResponse);

    // Check for standard Error with specific message
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      `Yeepay API Business Error: Code=${mockBusinessErrorData.code}, Message=${mockBusinessErrorData.message}`
    );

    // Signature should still be verified if present using mockConfig
    const { VerifyUtils } = jest.requireMock('yop-nodejs-sdk');
    expect(VerifyUtils.isValidRsaResult).toHaveBeenCalledWith({
        data: JSON.stringify(mockBusinessErrorData),
        sign: mockYopSignHeader,
        publicKey: mockConfig.yopPublicKey,
    });
  });

  test('should handle HTTP error (response.ok is false)', async () => {
    const mockHttpErrorResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(), // No sign header in HTTP error usually
      text: jest.fn().mockResolvedValue('Server error details'), // Use text() for non-JSON error body
    };
    mockFetch.mockResolvedValue(mockHttpErrorResponse);

    // Check for standard Error with specific message
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      `Yeepay API HTTP Error: Status=${mockHttpErrorResponse.status}, Body=Server error details`
    );

    // Signature verification might not happen or might fail depending on YopClient logic for HTTP errors
    // Based on YopClient code, it tries to read text() and then throws, so verify might not be called.
    const { VerifyUtils } = jest.requireMock('yop-nodejs-sdk');
    expect(VerifyUtils.isValidRsaResult).not.toHaveBeenCalled();
  });

  test('should handle signature verification failure', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-yop-sign': mockYopSignHeader }),
      json: jest.fn().mockResolvedValue(mockSuccessResponseData),
      text: jest.fn().mockResolvedValue(JSON.stringify(mockSuccessResponseData)), // Add text() method
    };
    mockFetch.mockResolvedValue(mockResponse);
    (VerifyUtils.isValidRsaResult as jest.Mock).mockReturnValue(false); // Simulate verification failure

    // Check for standard Error with specific message
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      'Invalid response signature from Yeepay'
    );

    const { VerifyUtils } = jest.requireMock('yop-nodejs-sdk');
    expect(VerifyUtils.isValidRsaResult).toHaveBeenCalledWith({
        data: JSON.stringify(mockSuccessResponseData),
        sign: mockYopSignHeader,
        publicKey: mockConfig.yopPublicKey,
    });
  });

  test('should handle missing x-yop-sign header', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(), // 缺少 x-yop-sign
      json: jest.fn().mockResolvedValue(mockSuccessResponseData),
      text: jest.fn().mockResolvedValue(JSON.stringify(mockSuccessResponseData)), // Add text() method
    };
    mockFetch.mockResolvedValue(mockResponse);

    // YopClient logs a warning but doesn't throw an error just for missing sign header on success
    // It proceeds to parse JSON. Let's test the successful return value.
    const result = await yopClient.get(mockApiUri, mockParams);
    expect(result).toEqual(mockSuccessResponseData);

    // Verification should not be called if header is missing
    const { VerifyUtils } = jest.requireMock('yop-nodejs-sdk');
    expect(VerifyUtils.isValidRsaResult).not.toHaveBeenCalled();
    // Check console.warn was called (optional, requires spyOn)
    // const warnSpy = jest.spyOn(console, 'warn');
    // expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing x-yop-sign header'));
    // warnSpy.mockRestore();
  });

  test('should handle fetch network error', async () => {
    const networkError = new Error('Network connection failed');
    mockFetch.mockRejectedValue(networkError);

    // Check for standard Error with specific message
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      `Network error calling Yeepay API: ${networkError.message}`
    );
     const { VerifyUtils } = jest.requireMock('yop-nodejs-sdk');
     expect(VerifyUtils.isValidRsaResult).not.toHaveBeenCalled();
  });

  test('should handle fetch timeout (AbortError)', async () => {
    // Create an error that mimics AbortError structure recognized by YopClient's catch block
    const abortError = new Error('The operation was aborted.'); // Message YopClient uses
    abortError.name = 'AbortError'; // Name YopClient checks
    mockFetch.mockRejectedValue(abortError);
    mockSignal.aborted = true; // Ensure signal state is consistent

    // Check for the specific timeout error message thrown by YopClient (line 159)
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
       /Yeepay API request timed out after \d+(\.\d+)? seconds./
    );
    const { VerifyUtils } = jest.requireMock('yop-nodejs-sdk');
    expect(VerifyUtils.isValidRsaResult).not.toHaveBeenCalled();
  });

   test('should handle invalid JSON response', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-yop-sign': mockYopSignHeader }),
      // Simulate text() returning invalid JSON, and json() failing
      text: jest.fn().mockResolvedValue('Invalid JSON String'),
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token I in JSON at position 0')),
    };
    mockFetch.mockResolvedValue(mockResponse);

    // Check for the specific JSON parsing error message from YopClient
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      'Invalid JSON response received from Yeepay API: Invalid JSON String' // Error includes raw text
    );
    // Signature verification happens *before* JSON parse attempt in YopClient
    const { VerifyUtils } = jest.requireMock('yop-nodejs-sdk');
    expect(VerifyUtils.isValidRsaResult).toHaveBeenCalledWith({
        data: 'Invalid JSON String', // Verification uses the raw text
        sign: mockYopSignHeader,
        publicKey: mockConfig.yopPublicKey,
    });
  });

  test('should handle invalid JSON response even if sign verification passes initially (edge case)', async () => {
    // 这个测试用例模拟一个不太可能但理论上可能的情况：
    // 响应头有签名，但响应体不是有效的JSON。
    // YopClient 设计上先验签（如果签名存在），再尝试解析JSON。
    const mockInvalidJsonResponseText = '<html><body>Error</body></html>';
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-yop-sign': mockYopSignHeader }),
      // Simulate text() returning invalid JSON, and json() failing
      text: jest.fn().mockResolvedValue(mockInvalidJsonResponseText),
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token < in JSON at position 0')),
    };
    mockFetch.mockResolvedValue(mockResponse);
    // Assume verification passes on the raw text for this edge case test
    (VerifyUtils.isValidRsaResult as jest.Mock).mockReturnValue(true);

    // Check for the specific JSON parsing error message
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      `Invalid JSON response received from Yeepay API: ${mockInvalidJsonResponseText}`
    );

    // Verification *is* called before JSON parsing attempt because sign header exists
    const { VerifyUtils } = jest.requireMock('yop-nodejs-sdk');
    expect(VerifyUtils.isValidRsaResult).toHaveBeenCalledWith({
        data: mockInvalidJsonResponseText,
        sign: mockYopSignHeader,
        publicKey: mockConfig.yopPublicKey,
    });
  });

});