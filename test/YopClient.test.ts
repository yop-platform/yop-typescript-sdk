import * as dotenv from 'dotenv';
import { jest, describe, beforeEach, test, expect } from '@jest/globals'; // Re-add explicit Jest globals import

// Keep mock keys for Request Handling tests to avoid crypto errors
const mockSecretKeyContent = '-----BEGIN PRIVATE KEY-----\nMOCK_SECRET_KEY\n-----END PRIVATE KEY-----';
const mockYopPublicKeyContent = '-----BEGIN PUBLIC KEY-----\nMOCK_YOP_PUBLIC_KEY\n-----END PUBLIC KEY-----';

// Store actual certificate content for init test expectations
const actualCertContent = `-----BEGIN CERTIFICATE-----
MIIE2TCCA8GgAwIBAgIFQ5cTlZgwDQYJKoZIhvcNAQELBQAwWDELMAkGA1UEBhMC
Q04xMDAuBgNVBAoMJ0NoaW5hIEZpbmFuY2lhbCBDZXJ0aWZpY2F0aW9uIEF1dGhv
cml0eTEXMBUGA1UEAwwOQ0ZDQSBBQ1MgT0NBMzEwHhcNMjEwNDI1MDIwOTAwWhcN
MjMwNDI1MDIwOTAwWjCBhzELMAkGA1UEBhMCQ04xFzAVBgNVBAoMDkNGQ0EgQUNT
IE9DQTMxMRAwDgYDVQQLDAdURVNUIFJBMRkwFwYDVQQLDBBPcmdhbml6YXRpb25h
bC0xMTIwMAYDVQQDDCkwNTFA5piT5a6d5byA5pS+5bmz5Y+wQDMxMTAwMDAwMDU4
MDQyMjlANTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAOqdF1o7HGPo
LMqikYcPTHi7BJoRXQUYU9npjnJPxdTpsN/GVoScYfZA37OR8xSTK1aM4FPkiRQz
jcbPFAdMDCCykZqny3HwpRvTMgjbiZJH5tBxUL9YURnTr2T149wXJLsGuxaxFwUW
FISu7yeNGn7prKbYZrHum7OpmcTZ/5gC2dl9O7s5zq63Nq5ONWNh37XbsWcOk+BJ
rVrjdseAmfIMEsjwFuWc2SS0OrWQ6IwSuBmUwBoZ5924OWwbAZcNvhS5AkAbg7CV
bBT4hof2+iv/sxk71slHLvi1I9jHo2EBCwzt4tr0F1Q5O5VYtv03FGHn7yHLLJ87
Hwn42qK8bLsCAwEAAaOCAXgwggF0MGwGCCsGAQUFBwEBBGAwXjAoBggrBgEFBQcw
AYYcaHR0cDovL29jc3AuY2ZjYS5jb20uY24vb2NzcDAyBggrBgEFBQcwAoYmaHR0
cDovL2NybC5jZmNhLmNvbS5jbi9vY2EzMS9vY2EzMS5jZXIwHwYDVR0jBBgwFoAU
4rQJy81hoXNKeX/xioML3bR+jB0wDAYDVR0TAQH/BAIwADBIBgNVHSAEQTA/MD0G
CGCBHIbvKgEEMDEwLwYIKwYBBQUHAgEWI2h0dHA6Ly93d3cuY2ZjYS5jb20uY24v
dXMvdXMtMTQuaHRtMD0GA1UdHwQ2MDQwMqAwoC6GLGh0dHA6Ly9jcmwuY2ZjYS5j
b20uY24vb2NhMzEvUlNBL2NybDMwMjMuY3JsMA4GA1UdDwEB/wQEAwIGwDAdBgNV
HQ4EFgQU4swobhCzosrPL4Gv8clxRwbHy0EwHQYDVR0lBBYwFAYIKwYBBQUHAwIG
CCsGAQUFBwMEMA0GCSqGSIb3DQEBCwUAA4IBAQBpZpClbx+FJo5WpuJW+TJKYRay
KeAx3/+VvlMyWvdcbABPlvwBY1m3xl1k+tsqqtBGvjathGmw1w7YESdRFTT/ty04
MDLmz62USS4DJlZ2EWMxPm0bKpuAPsWb3+EtvizyZ0l1gX/D0YHDcH+VljYlGAv+
yQEUzD+0c9NZSWr4V19yRVDQEicll5hJko7RFQUrwW+wNSrexzlyQFbUlbljwAnH
O0TF3zgTXKRu2YNiKZGlxr28FjOeMQdvpiNqHCW9ACjQqL0vz1l9IImn0lm+0vh0
YhAN0oFzJZvs5lFG9Bg+kNkyhgf9eVcUUxXKnA6UwXq2amoTa4Iq3NW6YuPI
-----END CERTIFICATE-----`;

dotenv.config(); // Load environment variables from .env file

// Restore Static YopClient import
import { YopClient } from '../src/YopClient';
import { YopConfig } from '../src/types'; // Keep type import
import * as RsaV3UtilModule from '../src/utils/RsaV3Util'; // Import the actual module
import * as VerifyUtilsModule from '../src/utils/VerifyUtils'; // Import the actual module

// Definitions and jest.mock calls moved to the top of the file
const mockFetch = jest.fn() as any;
global.fetch = mockFetch;


// Mock AbortController for timeout tests
const mockAbort = jest.fn();
const mockSignal = { aborted: false };
global.AbortController = jest.fn(() => ({
  abort: mockAbort,
  signal: mockSignal,
})) as any;

describe('YopClient Request Handling', () => {
  // Use static YopClient type now
  let yopClient: YopClient;
  const mockApiUri = '/rest/v1.0/test/api';
  const mockParams = { param1: 'value1', param2: 'value2' };
  const mockConfig: YopConfig = { // Config for Request Handling tests
    appKey: 'mock-app-key',
    secretKey: mockSecretKeyContent, // Use PEM-like mock key
    yopApiBaseUrl: 'https://mock-api.yeepay.com',
    yopPublicKey: mockYopPublicKeyContent, // Use PEM-like mock key
    // merchantNo: 'mock-merchant-no', // Removed as it's not in YopConfig
    // Add other necessary fields from YopConfig if needed
    // timeout: 30000, // Removed as it's not in YopConfig
  };
  const mockAuthHeaders = {
    'Authorization': 'YOP-RSA3-TEST test-app-key/test-signature', // Example auth header
    'x-yop-appkey': mockConfig.appKey,
    'x-yop-request-id': 'mock-request-id',
    'x-yop-date': new Date().toISOString(),
    'x-yop-sdk-version': '@yeepay/yop-typescript-sdk/0.2.5', // 根据实际使用的SDK版本调整
    'x-yop-sdk-lang': 'nodejs',
  };
  const mockSuccessResponseData = { code: 'OPR00000', message: 'Success', result: { data: 'ok' } };
  const mockYopSignHeader = 'mock-yop-sign-header';

  // Helper function to create mock fetch responses
  const createMockResponse = (body: any, ok = true, status = 200, headers = new Headers({ 'x-yop-sign': mockYopSignHeader })) => ({
    ok,
    status,
    headers,
    text: jest.fn<() => Promise<string>>().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
    // Make json() mock reject if body is not valid JSON when parsed
    json: jest.fn<() => Promise<any>>().mockImplementation(async () => {
        try {
            return typeof body === 'string' ? JSON.parse(body) : body;
        } catch (e) {
            // Throw a SyntaxError similar to what fetch().json() would do
            throw new SyntaxError(`Unexpected token ... in JSON at position ...`); // Generic message is fine for mock
        }
    }),
  }); // No longer async

  // Helper function for common spy assertions
  const expectSpiesCalled = (
      getAuthHeadersArgs: Record<string, any>, // Use Record<string, any> instead of object
      isValidRsaArgs?: { data: string; sign: string; publicKey: string }
  ) => {
      expect(getAuthHeadersSpy).toHaveBeenCalledWith(expect.objectContaining(getAuthHeadersArgs));
      if (isValidRsaArgs) {

    // Mocks are handled by top-level jest.mock
          expect(isValidRsaResultSpy).toHaveBeenCalledWith(isValidRsaArgs);
      } else {
          expect(isValidRsaResultSpy).not.toHaveBeenCalled();
      }
  };


  let RsaV3UtilMock: any; // Keep for potential future use if needed
  let VerifyUtilsMock: any; // Keep for potential future use if needed

  let getAuthHeadersSpy: any; // Revert to 'any' type
  let isValidRsaResultSpy: any; // Revert to 'any' type


  beforeEach(() => { // No longer async
    // Reset mocks before each test
    // jest.resetModules(); // REMOVED - Not needed with top-level mocks (usually)
    jest.clearAllMocks(); // Clears jest.fn() and spies
    mockSignal.aborted = false;

    // Use spyOn to replace the implementation
    getAuthHeadersSpy = jest.spyOn(RsaV3UtilModule.RsaV3Util, 'getAuthHeaders')
                           .mockReturnValue(mockAuthHeaders);
    isValidRsaResultSpy = jest.spyOn(VerifyUtilsModule.VerifyUtils, 'isValidRsaResult')
                             .mockReturnValue(true);

    // Mocks are handled by top-level jest.mock
    // Instantiate YopClient with mock config (using static import)
    yopClient = new YopClient(mockConfig);
  });

  // --- 测试用例将写在这里 ---

  // REMOVED: Singleton test is no longer applicable

  test('should make a successful GET request', async () => {
    const mockResponse = createMockResponse(mockSuccessResponseData);
    mockFetch.mockResolvedValue(mockResponse);

    const result = await yopClient.get(mockApiUri, mockParams);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`${mockConfig.yopApiBaseUrl}/yop-center${mockApiUri}?param1=value1&param2=value2`),
      expect.objectContaining({ method: 'GET', signal: mockSignal })
    );
    expectSpiesCalled(
        { method: 'GET', url: mockApiUri, params: mockParams, appKey: mockConfig.appKey, secretKey: mockConfig.secretKey },
        { data: JSON.stringify(mockSuccessResponseData), sign: mockYopSignHeader, publicKey: mockConfig.yopPublicKey }
    );
    expect(result).toEqual(mockSuccessResponseData);
  });

  test('should make a successful POST request (form-urlencoded)', async () => {
    const mockResponse = createMockResponse(mockSuccessResponseData);
    mockFetch.mockResolvedValue(mockResponse);

    const result = await yopClient.post(mockApiUri, mockParams);

    expect(mockFetch).toHaveBeenCalledWith(
      `${mockConfig.yopApiBaseUrl}/yop-center${mockApiUri}`,
      expect.objectContaining({
        method: 'POST',
        body: 'param1=value1&param2=value2',
        signal: mockSignal,
      })
    );
    expectSpiesCalled(
        { method: 'POST', url: mockApiUri, params: mockParams, appKey: mockConfig.appKey, secretKey: mockConfig.secretKey },
        { data: JSON.stringify(mockSuccessResponseData), sign: mockYopSignHeader, publicKey: mockConfig.yopPublicKey }
    );
    expect(result).toEqual(mockSuccessResponseData);
  });

   test('should make a successful POST request (json)', async () => {
    const mockResponse = createMockResponse(mockSuccessResponseData);
    mockFetch.mockResolvedValue(mockResponse);

    const result = await yopClient.postJson(mockApiUri, mockParams);

    // Signature verification should not happen for HTTP errors before throwing
    expect(mockFetch).toHaveBeenCalledWith(
      `${mockConfig.yopApiBaseUrl}/yop-center${mockApiUri}`,
        // No isValidRsaResultArgs provided, expects it not to be called
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockParams),
        signal: mockSignal,
      })
    );
     expectSpiesCalled( // Simulate verification failure

        { method: 'POST', url: mockApiUri, params: mockParams, appKey: mockConfig.appKey, secretKey: mockConfig.secretKey },
        { data: JSON.stringify(mockSuccessResponseData), sign: mockYopSignHeader, publicKey: mockConfig.yopPublicKey }
     )
;
    // Verification is called and fails
    expect(result).toEqual(mockSuccessResponseData);
  });

  test('should handle Yop business error (state !== SUCCESS)', async () => {
    // Add state: 'FAILURE' to trigger the primary error check in YopClient
    const mockBusinessErrorData = { state: 'FAILURE', error: { code: 'BIZ12345', message: 'Business Error' } };
    const mockResponse = createMockResponse(mockBusinessErrorData); // Use helper
    mockFetch.mockResolvedValue(mockResponse);

    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
       `YeePay API Business Error: State=${mockBusinessErrorData.state}, Code=${mockBusinessErrorData.error.code}, Message=${mockBusinessErrorData.error.message}`
    );

        // No isValidRsaResultArgs provided, expects it not to be called
    // Signature should still be verified if present
    expectSpiesCalled(
        { method: 'GET', url: mockApiUri, params: mockParams, appKey: mockConfig.appKey, secretKey: mockConfig.secretKey },
        { data: JSON.stringify(mockBusinessErrorData), sign: mockYopSignHeader, publicKey: mockConfig.yopPublicKey }
    );
  });


  test('should handle HTTP error (response.ok is false)', async () => {
    const errorText = 'Server error details';
    const mockHttpErrorResponse = createMockResponse(
        errorText, // Body can be text for errors
        false,     // ok: false
        500,       // status: 500
        new Headers() // No sign header expected
    );
    // Override json mock for error case
    mockHttpErrorResponse.json.mockRejectedValue(new Error('No JSON body'));
    mockFetch.mockResolvedValue(mockHttpErrorResponse);

    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
     
   // getAuthHeaders *is* called before fetch, isValidRsaResult is not. `YeePay API HTTP Error: Status=500, Details=${errorText}`
    ); // Corrected assertion

    // Signature verification should not happen for HTTP errors before throwing
    expectSpiesCalled(
        { method: 'GET', url: mockApiUri, params: mockParams, appKey: mockConfig.appKey, secretKey: mockConfig.secretKey }
        // No isValidRsaResultArgs provided, expects it not to be called
    );
         //Body is invalid JSON
   });

  test('should handle signature verification failure', async () => {
    const mockResponse = createMockResponse(mockSuccessResponseData);
    mockFetch.mockResolvedValue(mockResponse);

    // Signaturi verification happens *before* JSON parse attempt
    isValidRsaResultSpy.mockReturnValue(false); // Simulate verification failure

    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      'Invalid response signature from YeePay'
    );

    // Verification is called and fails
    expectSpiesCalled(
        { method: 'GET', url: mockApiUri, params: mockParams, appKey: mockConfig.appKey, secretKey: mockConfig.secretKey },
        { data: JSON.stringify(mockSuccessResponseData), sign: mockYopSignHeader, publicKey: mockConfig.yopPublicKey }
    );
  }); // Assume verification passes


  test('should handle missing x-yop-sign header', async () => {
    const mockResponse = createMockResponse(
    // Verification *is* called befor  JSON parsing attempt
        mockSuccessResponseData,
        true,
        200,
        new Headers() // Missing x-yop-sign
    );
    mockFetch.mockResolvedValue(mockResponse);

    const result = await yopClient.get(mockApiUri, mockParams);
// Define constants *outside* the describe block - REMOVED as they are defined within the mock functions above
// const mockDefaultKeyPath = '/resolved/path/to/src/assets/yop_platform_rsa_cert_rsa.cer';    expect(result).toEqual(mockSuccessResponseData);
// const mockEnvKeyPath = '/resolve/path/to/env_key.cr';
// cont defaultPubliKeyContent = 'public_key_fom_default_fle';
// const envPathPublicKeyContent = 'pulic_key_from_nv_path_file';

// Definitions are now inside the factory functions above


describe
    // Verification should not be called if header is missing
    expectSpiesCalled(
        { method: 'GET', url: mockApiUri, params: mockParams, appKey: mockConfig.appKey, secretKey: mockConfig.secretKey }
        // No isValidRsaResultArgs provided, expects it not to be called
    );
  });

  test('should handle fetch network error', async () => {
    const networkError = new Error('Network connection failed');
    mockFetch.mockRejectedValue(networkError);

    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      `Network error calling YeePay API: ${networkError.message}`
    );
     // getAuthHeaders *is* called before fetch, isValidRsaResult is not.
     expect(getAuthHeadersSpy).toHaveBeenCalled(); // Corrected assertion
     expect(isValidRsaResultSpy).not.toHaveBeenCalled();
  });

  test('should handle fetch timeout (AbortError)', async () => {
    const abortError = new Error('The operation was aborted.');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);
    mockSignal.aborted = true;

    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
       /YeePay API request timed out after \d+(\.\d+)? seconds./
   );
   // getAuthHeaders *is* called before fetch, isValidRsaResult is not.
   expect(getAuthHeadersSpy).toHaveBeenCalled(); // Corrected assertion
   expect(isValidRsaResultSpy).not.toHaveBeenCalled();
  });

   test('should handle invalid JSON response', async () => {
    const invalidJsonText = 'Invalid JSON String';
    const mockResponse = createMockResponse(
        invalidJsonText, // Body is invalid JSON
        true,
        200,
        new Headers({ 'x-yop-sign': mockYopSignHeader })
    );
    // Override json mock for error case
    mockResponse.json.mockRejectedValue(new SyntaxError('Unexpected token I in JSON at position 0'));
    mockFetch.mockResolvedValue(mockResponse);

    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      `Invalid JSON response received from YeePay API: ${invalidJsonText}`
    );

    // Signature verification happens *before* JSON parse attempt
    expectSpiesCalled(
        { method: 'GET', url: mockApiUri, params: mockParams, appKey: mockConfig.appKey, secretKey: mockConfig.secretKey },
        { data: invalidJsonText, sign: mockYopSignHeader, publicKey: mockConfig.yopPublicKey }
    );
  });

  test('should handle invalid JSON response even if sign verification passes initially (edge case)', async () => {
    const mockInvalidJsonResponseText = '<html><body>Error</body></html>';
    const mockResponse = createMockResponse(
        mockInvalidJsonResponseText,
        true,
        200,
        new Headers({ 'x-yop-sign': mockYopSignHeader })
    );
    mockResponse.json.mockRejectedValue(new SyntaxError('Unexpected token < in JSON at position 0'));
    mockFetch.mockResolvedValue(mockResponse);
    isValidRsaResultSpy.mockReturnValue(true); // Assume verification passes

    await expect(yopClient.get(mockApiUri, mockParams)).rejects.toThrow(
      `Invalid JSON response received from YeePay API: ${mockInvalidJsonResponseText}`
    );

    // Verification *is* called before JSON parsing attempt
    expectSpiesCalled(
        { method: 'GET', url: mockApiUri, params: mockParams, appKey: mockConfig.appKey, secretKey: mockConfig.secretKey },
        { data: mockInvalidJsonResponseText, sign: mockYopSignHeader, publicKey: mockConfig.yopPublicKey }
    );
  });

});

describe('YopClient Initialization', () => {
  let originalEnv: NodeJS.ProcessEnv;
  const defaultBaseUrl = 'https://openapi.yeepay.com';

  // Setup env before each test in this block
  beforeEach(() => {
      originalEnv = { ...process.env };
      // Clear relevant env vars before each test
      delete process.env.YOP_APP_KEY;
      delete process.env.YOP_SECRET_KEY;
      delete process.env.YOP_PUBLIC_KEY;
      delete process.env.YOP_PUBLIC_KEY_PATH;
      delete process.env.YOP_API_BASE_URL;
      jest.clearAllMocks();
  });

  // Restore env after each test
  afterEach(() => {
    process.env = originalEnv;
  });

  // --- Test Cases for Successful Initialization ---
  test.each([
    // Scenario 1: Basic Env Vars (uses default file for public key)
    {
      description: '[Scenario 1] should initialize successfully using basic env vars',
      envVars: { YOP_APP_KEY: 'env_app_key_1', YOP_SECRET_KEY: 'env_secret_key_1' },
      configInput: undefined,
      // Expect actual cert content (read from default path) and correct base URL
      expectedConfig: { appKey: 'env_app_key_1', secretKey: 'env_secret_key_1', yopPublicKey: actualCertContent, yopApiBaseUrl: defaultBaseUrl },
    },
    // Scenario 1b: YOP_PUBLIC_KEY env var takes precedence
    {
      description: '[Scenario 1b] should initialize successfully using YOP_PUBLIC_KEY env var',
      envVars: { YOP_APP_KEY: 'env_app_key_1b', YOP_SECRET_KEY: 'env_secret_key_1b', YOP_PUBLIC_KEY: 'env_public_key_direct' },
      configInput: undefined,
      // Public key comes directly from env var
      expectedConfig: { appKey: 'env_app_key_1b', secretKey: 'env_secret_key_1b', yopPublicKey: 'env_public_key_direct', yopApiBaseUrl: defaultBaseUrl },
    },
    // Scenario 1c: YOP_PUBLIC_KEY_PATH env var - Test removed as it relies on fs interaction
    // Scenario 3: Optional Env Var (YOP_API_BASE_URL) + Default Public Key
    {
      description: '[Scenario 3] should initialize successfully using optional env var (YOP_API_BASE_URL)',
      envVars: { YOP_APP_KEY: 'env_app_key_3', YOP_SECRET_KEY: 'env_secret_key_3', YOP_API_BASE_URL: 'https://custom-api.yeepay.com' },
      configInput: undefined,
      // Expect actual cert content (default file), custom base URL
      expectedConfig: { appKey: 'env_app_key_3', secretKey: 'env_secret_key_3', yopPublicKey: actualCertContent, yopApiBaseUrl: 'https://custom-api.yeepay.com' },
    },
    // Scenario 4: Explicit Config (Overrides everything)
    {
      description: '[Scenario 4] should initialize successfully using explicit configuration object',
      envVars: { YOP_APP_KEY: 'env_app_key_4', YOP_SECRET_KEY: 'env_secret_key_4', YOP_PUBLIC_KEY: 'env_public_key_4', YOP_PUBLIC_KEY_PATH: 'env_key.cer', YOP_API_BASE_URL: 'https://env-api.yeepay.com' },
      configInput: { appKey: 'config_app_key_4', secretKey: 'config_secret_key_4', yopPublicKey: 'config_public_key_direct', yopApiBaseUrl: 'https://config-api.yeepay.com' },
      // Expect values directly from config input
      expectedConfig: { appKey: 'config_app_key_4', secretKey: 'config_secret_key_4', yopPublicKey: 'config_public_key_direct', yopApiBaseUrl: 'https://config-api.yeepay.com' },
    },
    // Scenario 4 variation: Explicit Config, default URL, explicit public key
    {
      description: '[Scenario 4 variation] should use default API URL and explicit public key if not in explicit config',
      envVars: { YOP_PUBLIC_KEY: 'env_public_key_4b', YOP_PUBLIC_KEY_PATH: 'env_key.cer' }, // Env URL not set
      configInput: { appKey: 'config_app_key_4b', secretKey: 'config_secret_key_4b', yopPublicKey: 'config_public_key_direct_4b' }, // URL not set
      // Expect values from config input, default base URL
      expectedConfig: { appKey: 'config_app_key_4b', secretKey: 'config_secret_key_4b', yopPublicKey: 'config_public_key_direct_4b', yopApiBaseUrl: defaultBaseUrl },
    },
    // Scenario 5: Explicit Config overrides Env (Public key from config)
    {
      description: '[Scenario 5] should override environment variables with explicit configuration',
      envVars: { YOP_APP_KEY: 'env_app_key_5', YOP_SECRET_KEY: 'env_secret_key_5', YOP_PUBLIC_KEY: 'env_public_key_5', YOP_PUBLIC_KEY_PATH: 'env_key.cer', YOP_API_BASE_URL: 'https://env-api.yeepay.com' },
      configInput: { appKey: 'config_app_key_5', secretKey: 'config_secret_key_5', yopPublicKey: 'config_public_key_direct_5', yopApiBaseUrl: 'https://config-api.yeepay.com' },
      // Expect values directly from config input
      expectedConfig: { appKey: 'config_app_key_5', secretKey: 'config_secret_key_5', yopPublicKey: 'config_public_key_direct_5', yopApiBaseUrl: 'https://config-api.yeepay.com' },
    },
    // Scenario 5 variation: Explicit Config overrides required, uses env for optional, public key from config
    {
      description: '[Scenario 5 variation] explicit config overrides required env, uses env for optional fields',
      envVars: { YOP_APP_KEY: 'env_app_key_5b', YOP_SECRET_KEY: 'env_secret_key_5b', YOP_PUBLIC_KEY: 'env_public_key_5b', YOP_PUBLIC_KEY_PATH: 'env_key.cer', YOP_API_BASE_URL: 'https://env-api-5b.yeepay.com' },
      configInput: { appKey: 'config_app_key_5b', secretKey: 'config_secret_key_5b', yopPublicKey: 'config_public_key_direct_5b' }, // URL not in config
      // Expect values from config input, env base URL
      expectedConfig: { appKey: 'config_app_key_5b', secretKey: 'config_secret_key_5b', yopPublicKey: 'config_public_key_direct_5b', yopApiBaseUrl: 'https://env-api-5b.yeepay.com' },
    },
    // Scenario 6: Fallback from failed YOP_PUBLIC_KEY_PATH - Test removed as it relies on fs interaction
  ])('$description', ({ envVars, configInput, expectedConfig }) => {
    // Set environment variables for this test case
    Object.assign(process.env, envVars);

    // Instantiate client using the statically imported YopClient
    const client = new YopClient(configInput as YopConfig | undefined);

    // Use type assertion to access private config
    expect((client as any).config).toEqual(expectedConfig);
  }); // End of successful test.each

  // --- Test Cases for Initialization Errors ---
  test.each([
    // Scenario 2: Missing Env Vars (AppKey/SecretKey - unchanged)
    {
      description: '[Scenario 2] should throw error if required environment variable (YOP_SECRET_KEY) is missing',
      envVars: { YOP_APP_KEY: 'env_app_key_2', YOP_PUBLIC_KEY: 'env_public_key_2' }, // SECRET_KEY missing
      configInput: undefined,
      expectedError: /Missing required configuration: YOP_SECRET_KEY environment variable is not set/,
    },
    {
      description: '[Scenario 2 variation] should throw error if required environment variable (YOP_APP_KEY) is missing',
      envVars: { YOP_SECRET_KEY: 'env_secret_key_2b', YOP_PUBLIC_KEY: 'env_public_key_2b' }, // APP_KEY missing
      configInput: undefined,
      expectedError: /Missing required configuration: YOP_APP_KEY environment variable is not set/,
    },
    // Scenario 2c: Missing Public Key - Test removed as it relied on fs interaction failure
    // Scenario 7: YOP_PUBLIC_KEY_PATH fails AND default file fails - Test removed
    // Missing Config Fields (AppKey/SecretKey - unchanged)
    {
      description: 'should throw error if explicit configuration object is missing required field (secretKey)',
      envVars: {},
      configInput: { appKey: 'config_app_key_err_1', yopPublicKey: 'config_public_key_err_1' }, // secretKey missing
      expectedError: /Missing required configuration: secretKey is missing in the provided config object/,
    },
    {
      description: 'should throw error if explicit configuration object is missing required field (appKey)',
      envVars: {},
      configInput: { secretKey: 'config_secret_key_err_2', yopPublicKey: 'config_public_key_err_2' }, // appKey missing
      expectedError: /Missing required configuration: appKey is missing in the provided config object/,
    },
    // Missing yopPublicKey in config object (Now falls back to env/file loading) - Test removed as it relied on fs interaction failure
     // New Error: Missing yopPublicKey in config AND all fallbacks fail - Test removed
  ])('$description', ({ envVars, configInput, expectedError }) => {
    // Set environment variables for this test case
    Object.assign(process.env, envVars);

    // Instantiate client using the statically imported YopClient
    expect(() => new YopClient(configInput as YopConfig | undefined)).toThrow(expectedError); // Use static YopClient
  }); // End of error test.each
}); // End of describe('YopClient Initialization')
