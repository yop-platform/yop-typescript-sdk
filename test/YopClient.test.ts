import * as dotenv from 'dotenv';
import { jest, describe, beforeEach, test, expect } from '@jest/globals'; // Re-add explicit Jest globals import

dotenv.config(); // Load environment variables from .env file

import { YopClient } from '../src/YopClient';
import { YopConfig } from '../src/types'; // Added YopConfig import and adjusted path
import * as RsaV3UtilModule from '../src/utils/RsaV3Util'; // Import the actual module
import * as VerifyUtilsModule from '../src/utils/VerifyUtils'; // Import the actual module

// Remove jest.mock calls for local utils

// Mock 全局 fetch using 'as any' to simplify typing
const mockFetch = jest.fn() as any;
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
    yopApiBaseUrl: 'https://mock-api.yeepay.com',
    yopPublicKey: 'mock-yop-public-key', // Provide a mock public key
    // merchantNo: 'mock-merchant-no', // Removed as it's not in YopConfig
    // Add other necessary fields from YopConfig if needed
    // timeout: 30000, // Removed as it's not in YopConfig
  };
  const mockAuthHeaders = {
    'Authorization': 'YOP-RSA3-TEST test-app-key/test-signature', // Example auth header
    'x-yop-appkey': 'test-app-key',
    'x-yop-request-id': 'mock-request-id',
    'x-yop-date': new Date().toISOString(),
    'x-yop-sdk-version': 'yop-typescript-sdk/0.1.3', // 根据实际使用的SDK版本调整
    'x-yop-sdk-lang': 'nodejs',
  };
  const mockSuccessResponseData = { code: 'OPR00000', message: 'Success', result: { data: 'ok' } };
  const mockYopSignHeader = 'mock-yop-sign-header';

  let RsaV3UtilMock: any; // Keep for potential future use if needed
  let VerifyUtilsMock: any; // Keep for potential future use if needed

  let getAuthHeadersSpy: any; // Use 'any' type for spy
  let isValidRsaResultSpy: any; // Use 'any' type for spy

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks(); // Clears jest.fn() and spies
    mockSignal.aborted = false;

    // Use spyOn to replace the implementation
    getAuthHeadersSpy = jest.spyOn(RsaV3UtilModule.RsaV3Util, 'getAuthHeaders')
                           .mockReturnValue(mockAuthHeaders);
    isValidRsaResultSpy = jest.spyOn(VerifyUtilsModule.VerifyUtils, 'isValidRsaResult')
                             .mockReturnValue(true);


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
      json: jest.fn<() => Promise<any>>().mockResolvedValue(mockSuccessResponseData), // Explicit type for jest.fn
      text: jest.fn<() => Promise<string>>().mockResolvedValue(JSON.stringify(mockSuccessResponseData)), // Explicit type for jest.fn
    };
    mockFetch.mockResolvedValue(mockResponse as any); // Keep 'as any' here

    // Call 'get' without headers argument
    const result = await yopClient.get(mockApiUri, mockParams);

    // Check if the spy was called correctly
    expect(getAuthHeadersSpy).toHaveBeenCalledWith({
        appKey: mockConfig.appKey,
        secretKey: mockConfig.secretKey,
        method: 'GET',
        url: mockApiUri, // Relative URL passed to SDK
        params: mockParams,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`${mockConfig.yopApiBaseUrl}/yop-center${mockApiUri}?param1=value1&param2=value2`), // Added /yop-center
      {
        method: 'GET',
        headers: expect.any(Headers), // Headers object is created internally
        signal: mockSignal,
      }
    );
    // Check if the spy was called correctly
    expect(isValidRsaResultSpy).toHaveBeenCalledWith({
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
      json: jest.fn<() => Promise<any>>().mockResolvedValue(mockSuccessResponseData), // Explicit type for jest.fn
      text: jest.fn<() => Promise<string>>().mockResolvedValue(JSON.stringify(mockSuccessResponseData)), // Explicit type for jest.fn
    };
    mockFetch.mockResolvedValue(mockResponse as any); // Keep 'as any' here

    // Call 'post' without headers, default content type is form-urlencoded
    const result = await yopClient.post(mockApiUri, mockParams);

    // Check if the spy was called correctly
    expect(getAuthHeadersSpy).toHaveBeenCalledWith({
        appKey: mockConfig.appKey,
        secretKey: mockConfig.secretKey,
        method: 'POST',
        url: mockApiUri,
        params: mockParams, // Body is passed as params for signing
    });
    expect(mockFetch).toHaveBeenCalledWith(
      `${mockConfig.yopApiBaseUrl}/yop-center${mockApiUri}`, // Added /yop-center
      {
        method: 'POST',
        headers: expect.any(Headers), // Headers object created internally
        body: 'param1=value1&param2=value2', // Form encoded body
        signal: mockSignal,
      }
    );
    // Check if the spy was called correctly
    expect(isValidRsaResultSpy).toHaveBeenCalledWith({
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
      json: jest.fn<() => Promise<any>>().mockResolvedValue(mockSuccessResponseData), // Explicit type for jest.fn
      text: jest.fn<() => Promise<string>>().mockResolvedValue(JSON.stringify(mockSuccessResponseData)), // Explicit type for jest.fn
    };
    mockFetch.mockResolvedValue(mockResponse as any); // Keep 'as any' here

    // Call 'postJson' without headers
    const result = await yopClient.postJson(mockApiUri, mockParams);

    // Check if getAuthHeaders was called correctly for POST JSON
    // Note: YopClient seems to pass the object itself, not stringified JSON to SDK
    // Check if the spy was called correctly
    expect(getAuthHeadersSpy).toHaveBeenCalledWith({
        appKey: mockConfig.appKey,
        secretKey: mockConfig.secretKey,
        method: 'POST',
        url: mockApiUri,
        params: mockParams, // Body object passed as params for signing
    });
    expect(mockFetch).toHaveBeenCalledWith(
      `${mockConfig.yopApiBaseUrl}/yop-center${mockApiUri}`, // Added /yop-center
      {
        method: 'POST',
        headers: expect.any(Headers), // Headers object created internally
        body: JSON.stringify(mockParams), // Body is JSON string for fetch
        signal: mockSignal,
      }
    );
     // Check if the spy was called correctly
     expect(isValidRsaResultSpy).toHaveBeenCalledWith({
        data: JSON.stringify(mockSuccessResponseData),
        sign: mockYopSignHeader,
        publicKey: mockConfig.yopPublicKey,
     });
    expect(result).toEqual(mockSuccessResponseData); // postJson returns the full response data
  });

  test('should handle Yop business error (state !== SUCCESS)', async () => {
    // Add state: 'FAILURE' to trigger the primary error check in YopClient
    const mockBusinessErrorData = { state: 'FAILURE', error: { code: 'BIZ12345', message: 'Business Error' } };
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-yop-sign': mockYopSignHeader }),
      json: jest.fn<() => Promise<any>>().mockResolvedValue(mockBusinessErrorData),
      text: jest.fn<() => Promise<string>>().mockResolvedValue(JSON.stringify(mockBusinessErrorData)),
    };
    mockFetch.mockResolvedValue(mockResponse as any);

    // Check for the error message thrown by the state check in YopClient
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
       `Yeepay API Business Error: State=${mockBusinessErrorData.state}, Code=${mockBusinessErrorData.error.code}, Message=${mockBusinessErrorData.error.message}`
    );

    // Signature should still be verified if present
    // Check if the spy was called correctly
    expect(isValidRsaResultSpy).toHaveBeenCalledWith({
        data: JSON.stringify(mockBusinessErrorData),
        sign: mockYopSignHeader,
        publicKey: mockConfig.yopPublicKey,
    });
  });

  test('should handle HTTP error (response.ok is false)', async () => {
    const mockHttpErrorResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error', // Add statusText for completeness
      headers: new Headers(),
      text: jest.fn<() => Promise<string>>().mockResolvedValue('Server error details'), // Explicit type for jest.fn
      // json might not exist or throw, mock it safely
      json: jest.fn<() => Promise<any>>().mockRejectedValue(new Error('No JSON body')), // Explicit type for jest.fn
    };
    mockFetch.mockResolvedValue(mockHttpErrorResponse as any); // Keep 'as any' here

    // Check for standard Error with specific message (using Details= instead of Body=)
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      `Yeepay API HTTP Error: Status=${mockHttpErrorResponse.status}, Details=Server error details`
    );

    // Signature verification might not happen or might fail depending on YopClient logic for HTTP errors
    // Based on YopClient code, it tries to read text() and then throws, so verify might not be called.
    // Check if the spy was called correctly
    expect(isValidRsaResultSpy).not.toHaveBeenCalled();
  });

  test('should handle signature verification failure', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-yop-sign': mockYopSignHeader }),
      json: jest.fn<() => Promise<any>>().mockResolvedValue(mockSuccessResponseData), // Explicit type for jest.fn
      text: jest.fn<() => Promise<string>>().mockResolvedValue(JSON.stringify(mockSuccessResponseData)), // Explicit type for jest.fn
    };
    mockFetch.mockResolvedValue(mockResponse as any); // Keep 'as any' here
    isValidRsaResultSpy.mockReturnValue(false); // Simulate verification failure

    // Check for standard Error with specific message
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      'Invalid response signature from Yeepay'
    );

    // Check if the spy was called correctly
    expect(isValidRsaResultSpy).toHaveBeenCalledWith({
        data: JSON.stringify(mockSuccessResponseData),
        sign: mockYopSignHeader,
        publicKey: mockConfig.yopPublicKey,
    });
  });

  test('should handle missing x-yop-sign header', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(), // Missing x-yop-sign
      json: jest.fn<() => Promise<any>>().mockResolvedValue(mockSuccessResponseData), // Explicit type for jest.fn
      text: jest.fn<() => Promise<string>>().mockResolvedValue(JSON.stringify(mockSuccessResponseData)), // Explicit type for jest.fn
    };
    mockFetch.mockResolvedValue(mockResponse as any); // Keep 'as any' here

    // YopClient logs a warning but doesn't throw an error just for missing sign header on success
    // It proceeds to parse JSON. Let's test the successful return value.
    const result = await yopClient.get(mockApiUri, mockParams);
    expect(result).toEqual(mockSuccessResponseData);

    // Verification should not be called if header is missing
    // Check if the spy was called correctly
    expect(isValidRsaResultSpy).not.toHaveBeenCalled();
    // Check console.warn was called (optional, requires spyOn)
    // const warnSpy = jest.spyOn(console, 'warn');
    // expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing x-yop-sign header'));
    // warnSpy.mockRestore();
  });

  test('should handle fetch network error', async () => {
    const networkError = new Error('Network connection failed');
    mockFetch.mockRejectedValue(networkError as any); // Use 'as any'

    // Check for standard Error with specific message
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      `Network error calling Yeepay API: ${networkError.message}`
    );
     // Check if the spy was called correctly
     expect(isValidRsaResultSpy).not.toHaveBeenCalled();
  });

  test('should handle fetch timeout (AbortError)', async () => {
    // Create an error that mimics AbortError structure recognized by YopClient's catch block
    const abortError = new Error('The operation was aborted.'); // Message YopClient uses
    abortError.name = 'AbortError'; // Name YopClient checks
    mockFetch.mockRejectedValue(abortError as any); // Use 'as any'
    mockSignal.aborted = true; // Ensure signal state is consistent

    // Check for the specific timeout error message thrown by YopClient (line 159)
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
       /Yeepay API request timed out after \d+(\.\d+)? seconds./
   );
   // Check if the spy was called correctly
   expect(isValidRsaResultSpy).not.toHaveBeenCalled();
  });

   test('should handle invalid JSON response', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'x-yop-sign': mockYopSignHeader }),
      text: jest.fn<() => Promise<string>>().mockResolvedValue('Invalid JSON String'), // Explicit type for jest.fn
      json: jest.fn<() => Promise<any>>().mockRejectedValue(new SyntaxError('Unexpected token I in JSON at position 0')), // Explicit type for jest.fn
    };
    mockFetch.mockResolvedValue(mockResponse as any); // Keep 'as any' here

    // Check for the specific JSON parsing error message from YopClient
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      'Invalid JSON response received from Yeepay API: Invalid JSON String' // Error includes raw text
    );
    // Signature verification happens *before* JSON parse attempt in YopClient
    // Check if the spy was called correctly
    expect(isValidRsaResultSpy).toHaveBeenCalledWith({
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
      text: jest.fn<() => Promise<string>>().mockResolvedValue(mockInvalidJsonResponseText), // Explicit type for jest.fn
      json: jest.fn<() => Promise<any>>().mockRejectedValue(new SyntaxError('Unexpected token < in JSON at position 0')), // Explicit type for jest.fn
    };
    mockFetch.mockResolvedValue(mockResponse as any); // Keep 'as any' here
    // Assume verification passes on the raw text for this edge case test
    isValidRsaResultSpy.mockReturnValue(true);

    // Check for the specific JSON parsing error message
    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      `Invalid JSON response received from Yeepay API: ${mockInvalidJsonResponseText}`
    );

    // Verification *is* called before JSON parsing attempt because sign header exists
    // Check if the spy was called correctly
    expect(isValidRsaResultSpy).toHaveBeenCalledWith({
        data: mockInvalidJsonResponseText,
        sign: mockYopSignHeader,
        publicKey: mockConfig.yopPublicKey,
    });
  });

});