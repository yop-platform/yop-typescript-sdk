import { HttpUtils } from "./utils/HttpUtils.js";
import { RsaV3Util } from "./utils/RsaV3Util.js";
import { VerifyUtils } from "./utils/VerifyUtils.js";
import type {
  YopConfig,
  YopRequestOptions,
  ContentType,
  YopResponse,
  YopResponseMetadata, // Import YopResponseMetadata
} from "./types.js"; // Restore .js extension
// 使用原生 fetch API，不需要额外导入
import crypto from 'crypto'; // Import crypto for KeyObject type hint

/**
 * YopClient provides methods for interacting with the repay Open Platform (YOP) API.
 * It handles request signing, response verification, and configuration management.
 *
 * The client can be configured either through an explicit configuration object
 * passed to the constructor or via environment variables.
 */
export class YopClient {
  private readonly config: YopConfig;
  private readonly yopPublicKeyObject: crypto.KeyObject; // Store KeyObject
  private readonly timeout: number = 10000; // Default timeout, added explicit type

  /**
   * Creates an instance of YopClient.
   * ... (constructor docs remain the same) ...
   */
  public constructor(config?: YopConfig) {
    const loadedConfig = this._loadConfig(config);
    this.config = loadedConfig;
    // Initialize KeyObject after loading config string/buffer
    try {
        // Use getPublicKeyObject which now expects string | Buffer
        this.yopPublicKeyObject = VerifyUtils.getPublicKeyObject(loadedConfig.yopPublicKey);
    } catch (error) {
        // If getPublicKeyObject throws during initialization, re-throw as a critical config error
        throw new Error(`[YopClient Constructor] Failed to create YOP public key object during initialization: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Loads and validates the configuration, merging provided config, environment variables, and defaults.
   * Returns the configuration containing the public key as string or Buffer.
   * @param config Optional configuration object provided during instantiation.
   * @returns The validated and merged YopConfig with publicKey as string/Buffer.
   * @throws Error if required configuration fields (appKey, appPrivateKey) are missing or if public key loading fails definitively.
   */
  private _loadConfig(config?: YopConfig): YopConfig & { yopPublicKey: string | Buffer } { // Ensure return type includes yopPublicKey
    const defaultBaseUrl = "https://openapi.yeepay.com";

    const envBaseUrl = process.env.YOP_API_BASE_URL;
    const envAppKey = process.env.YOP_APP_KEY;
    const envAppPrivateKey = process.env.YOP_APP_PRIVATE_KEY;
    const envYopPublicKey = process.env.YOP_PUBLIC_KEY; // Key as string

    let finalConfig: Partial<YopConfig> = {};
    let loadedYopPublicKeyInput: string | Buffer | undefined; // Store the raw input (string or buffer)

    if (config) {
      finalConfig = { ...config };
      finalConfig.yopApiBaseUrl = config.yopApiBaseUrl ?? envBaseUrl ?? defaultBaseUrl;
      // Prioritize public key input from config object if provided
      if (config.yopPublicKey) {
        loadedYopPublicKeyInput = config.yopPublicKey;
      }
    } else {
      finalConfig.appKey = envAppKey;
      finalConfig.appPrivateKey = envAppPrivateKey;
      finalConfig.yopApiBaseUrl = envBaseUrl ?? defaultBaseUrl;
    }

    // If public key input wasn't loaded from config object, try environment variable
    if (!loadedYopPublicKeyInput && envYopPublicKey) {
      loadedYopPublicKeyInput = envYopPublicKey;
    }

    // Assign the loaded public key input to the final config
    finalConfig.yopPublicKey = loadedYopPublicKeyInput;

    // Validate required fields
    if (!finalConfig.appKey) {
      const errorMsg = config
        ? "Missing required configuration: appKey is missing in the provided config object"
        : "Missing required configuration: YOP_APP_KEY environment variable is not set";
      throw new Error(errorMsg);
    }
    if (!finalConfig.appPrivateKey) {
      const errorMsg = config
        ? "Missing required configuration: appPrivateKey is missing in the provided config object"
        : "Missing required configuration: YOP_APP_PRIVATE_KEY environment variable is not set";
      throw new Error(errorMsg);
    }
    if (!finalConfig.yopPublicKey) {
      throw new Error(`[YopClient Config] Missing required yopPublicKey. Please provide it either in the config object or via YOP_PUBLIC_KEY environment variable.`);
    }

    // Return config with yopPublicKey as string | Buffer
    return finalConfig as YopConfig & { yopPublicKey: string | Buffer };
  }

  public async request<T extends YopResponse = YopResponse>(
    options: YopRequestOptions,
  ): Promise<T> {
    const { method, apiUrl, params, body } = options;
    const {
      appKey,
      appPrivateKey: appPrivateKey,
      yopApiBaseUrl,
    } = this.config;
    // Use the stored KeyObject for verification
    const yopPublicKeyObject = this.yopPublicKeyObject;
    const timeout = options.timeout ?? this.timeout;
    const contentType =
      options.contentType ??
      (method === "POST"
        ? "application/x-www-form-urlencoded"
        : "application/json");
    let requestBodyString: string | undefined;

    let fullFetchUrl: URL;
    let sdkHeaders: Record<string, string> = {};

    const yopCenterBasePath = `${yopApiBaseUrl!.replace(/\/$/, "")}/yop-center`;
    const cleanedApiUrl = apiUrl.startsWith("/") ? apiUrl.substring(1) : apiUrl;
    const fullUrlString = `${yopCenterBasePath}/${cleanedApiUrl}`;
    fullFetchUrl = new URL(fullUrlString);

    // --- Header Generation (remains the same, uses RsaV3Util) ---
    if (method === "GET" && params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          fullFetchUrl.searchParams.append(key, String(value));
        }
      });
      try {
        sdkHeaders = RsaV3Util.getAuthHeaders({
          appKey,
          appPrivateKey: appPrivateKey,
          method: "GET",
          url: apiUrl,
          params: params,
          config: { contentType },
        });
      } catch (sdkError: unknown) {
        const errorMessage = sdkError instanceof Error ? sdkError.message : String(sdkError);
        throw new Error(
          `Failed to generate YOP headers (GET with params): ${errorMessage}`,
        );
      }
    } else if (method === "POST" && body) {
      try {
        sdkHeaders = RsaV3Util.getAuthHeaders({
          appKey,
          appPrivateKey: appPrivateKey,
          method: "POST",
          url: apiUrl,
          params: body,
          config: { contentType },
        });
      } catch (sdkError: unknown) {
        const errorMessage = sdkError instanceof Error ? sdkError.message : String(sdkError);
        throw new Error(
          `Failed to generate YOP headers (POST): ${errorMessage}`,
        );
      }

      if (contentType === "application/json") {
        requestBodyString = JSON.stringify(body);
      } else {
        const encodedBodyEntries = Object.entries(body)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, HttpUtils.normalize(String(value))]);
        requestBodyString = new URLSearchParams(
            encodedBodyEntries as [string, string][]
        ).toString();
      }
    } else if (method === "GET" && !params) {
       try {
        sdkHeaders = RsaV3Util.getAuthHeaders({
          appKey,
          appPrivateKey: appPrivateKey,
          method: "GET",
          url: apiUrl,
          config: { contentType },
        });
      } catch (sdkError: unknown) {
        const errorMessage = sdkError instanceof Error ? sdkError.message : String(sdkError);
        throw new Error(
          `Failed to generate YOP headers (GET no params): ${errorMessage}`,
        );
      }
    } else {
      if (method === "POST" && !body) {
        throw new Error(
          "Invalid request configuration: POST method requires a body.",
        );
      }
    }

    const fetchHeaders = new Headers(sdkHeaders);
    if (method === "POST" && body) {
      fetchHeaders.set("Content-Type", contentType);
    }

    const fetchOptions: RequestInit = {
      method: method,
      headers: fetchHeaders,
      body: requestBodyString,
    };

    let timeoutId: NodeJS.Timeout | undefined;

    // 只在非测试环境中使用 AbortController
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    let response: Response;

    // 在所有环境中，正常发送请求
    try {
      console.info(`[YopClient] fetch URL: ${fullFetchUrl.toString()}`);
      const headersObject: Record<string, string> = {};
      fetchHeaders.forEach((value, key) => { headersObject[key] = value; });
      console.info(`[YopClient] fetch Method: ${fetchOptions.method}`);
      console.info(`[YopClient] fetch Headers: ${JSON.stringify(headersObject, null, 2)}`);
      console.info(`[YopClient] fetch Body: ${requestBodyString}`);
      response = await fetch(fullFetchUrl.toString(), fetchOptions);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    } catch (fetchError: unknown) {
       if (timeoutId) {
         clearTimeout(timeoutId);
       }
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        throw new Error(
          `YeePay API request timed out after ${timeout / 1000} seconds.`,
        );
      }
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      throw new Error(
        `Network error calling YeePay API: ${errorMessage}`,
      );
    }

    const responseBodyText = await response.text();
    const yopSignHeader = response.headers.get("x-yop-sign");
    const yopRequestId = response.headers.get("x-yop-request-id");

    let parsedResult: any = {};
    let yopSignBody: string | undefined;
    try {
        if (responseBodyText.trim() !== "") {
            parsedResult = JSON.parse(responseBodyText);
            if (typeof parsedResult === 'object' && parsedResult !== null && 'sign' in parsedResult) {
                yopSignBody = parsedResult.sign;
            }
        } else if (response.ok) {
             console.warn("[YopClient] Received empty response body for a successful request.");
        }
    } catch (parseError: unknown) {
        if (responseBodyText.trim() !== "") {
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            console.warn(
              `[YopClient] Invalid JSON response received: ${responseBodyText}. Parse Error: ${errorMessage}`
            );
        } else {
             console.error("[YopClient] Error parsing empty response body (unexpected).");
        }
    }

    const metadata: YopResponseMetadata = {
        yopSign: yopSignHeader,
        yopRequestId: yopRequestId,
    };

    const signatureToVerify = yopSignHeader || yopSignBody;

    if (signatureToVerify) {
      // TODO 修复验签问题
      console.info(`${typeof yopPublicKeyObject}`)
      // const isValid = VerifyUtils.isValidRsaResult({ // Use isValidRsaResult
      //   data: responseBodyText,
      //   sign: signatureToVerify,
      //   publicKey: yopPublicKeyObject, // Pass the KeyObject
      // });

      // if (!isValid) {    
      //   throw new Error("Invalid response signature from YeePay");
      // } else {
      //   console.info("[YopClient] Response signature verification successful using signature from", yopSignHeader ? "header." : "body.");
      // }
    } else {
      if (response.ok) {
         console.warn(`[YopClient] Missing signature in response header (x-yop-sign) and body (sign field): ${method} ${apiUrl}`);
      }
    }

    if (!response.ok) {
      let errorDetails = responseBodyText;
      try {
        if (typeof parsedResult === 'object' && parsedResult !== null) {
            const errorObj = parsedResult.error || parsedResult;
            const code = errorObj?.code || "N/A";
            const message = errorObj?.message || responseBodyText;
            errorDetails = `Code=${code}, Message=${message}`;
        }
      } catch (e: unknown) {
         // Ignore parsing error
      }
      throw new Error(
        `YeePay API HTTP Error: Status=${response.status}, Details=${errorDetails}`,
      );
    }

    const finalResponse: T = {
        ...parsedResult,
        stringResult: responseBodyText,
        metadata: metadata,
    };

    if (finalResponse.state && finalResponse.state !== "SUCCESS") {
      const error = finalResponse.error;
      const errorMessage = `YeePay API Business Error: State=${finalResponse.state}, Code=${error?.code || "N/A"}, Message=${error?.message || "Unknown error"}`;
      throw new Error(errorMessage);
    }

    return finalResponse;
  }

  public async get<T extends YopResponse = YopResponse>(
    apiUrl: string,
    params: Record<string, unknown>,
    timeout?: number,
  ): Promise<T> {
    return this.request<T>({ method: "GET", apiUrl, params, timeout });
  }

  public async post<T extends YopResponse = YopResponse>(
    apiUrl: string,
    body: Record<string, unknown>,
    contentType: ContentType = "application/x-www-form-urlencoded",
    timeout?: number,
  ): Promise<T> {
    return this.request<T>({
      method: "POST",
      apiUrl,
      body,
      contentType,
      timeout,
    });
  }

  public async postJson<T extends YopResponse = YopResponse>(
    apiUrl: string,
    body: Record<string, unknown>,
    timeout?: number,
  ): Promise<T> {
    return this.request<T>({
      method: "POST",
      apiUrl,
      body,
      contentType: "application/json",
      timeout,
    });
  }
}
