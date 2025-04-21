// test/__mocks__/yop-typescript-sdk.ts
export const RsaV3Util = {
  buildAuthorizationHeader: jest.fn().mockReturnValue({
    'x-yop-appkey': 'mock-appkey',
    'x-yop-request-id': 'mock-request-id',
    'Authorization': 'mock-authorization',
  }),
};

export const VerifyUtils = {
  isValidRsaResult: jest.fn().mockReturnValue(true), // Default to valid signature
};