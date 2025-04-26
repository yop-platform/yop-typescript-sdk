export interface RequestOptions {
  appKey: string;
  appPrivateKey: string;
  serverRoot?: string;
  yopPublicKey?: string;
  config?: {
    contentType: string;
  };
}

export interface AuthHeaderOptions extends RequestOptions {
  method: 'GET' | 'POST'; // Use string literal type
  url: string;
  params?: Record<string, unknown>; // Use unknown for safer type checking
}

export interface RequestParams {
  url: string;
  params?: Record<string, unknown>; // Use unknown for safer type checking
  method: 'GET' | 'POST'; // Use string literal type
  // responseType?: ResponseType; // Removed axios specific type
}

export interface ParamMap {
  [key: string]: unknown; // Use unknown for safer type checking
}

export interface Request {
  paramMap: ParamMap;
}