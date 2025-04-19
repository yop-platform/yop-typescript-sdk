// import { Method } from "axios"; // Removed axios import
// import { ResponseType } from "axios"; // Removed axios import
export interface RequestOptions {
  appKey: string;
  secretKey: string;
  serverRoot?: string;
  yopPublicKey?: string;
  config?: {
    contentType: string;
  };
}

export interface AuthHeaderOptions extends RequestOptions {
  method: 'GET' | 'POST'; // Use string literal type
  url: string;
  params?: Record<string, any>;
}

export interface RequestParams {
  url: string;
  params?: Record<string, any>;
  method: 'GET' | 'POST'; // Use string literal type
  // responseType?: ResponseType; // Removed axios specific type
}

export interface ParamMap {
  [key: string]: any;
}

export interface Request {
  paramMap: ParamMap;
}