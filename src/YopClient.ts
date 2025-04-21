import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url"; // Added for ESM __dirname equivalent
import { HttpUtils } from "./utils/HttpUtils.js"; // Import HttpUtils
import { RsaV3Util } from "./utils/RsaV3Util.js"; // Restore .js extension
import { VerifyUtils } from "./utils/VerifyUtils.js"; // Restore .js extension
import type {
  YopConfig,
  YopRequestOptions,
  ContentType,
  YopResponse,
  YopResponseMetadata, // Import YopResponseMetadata
} from "./types.js"; // Restore .js extension
import fetch, { Headers, RequestInit, Response } from 'node-fetch'; // Import fetch types
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
   * @throws Error if required configuration fields (appKey, secretKey) are missing or if public key loading fails definitively.
   */
  private _loadConfig(config?: YopConfig): YopConfig & { yopPublicKey: string | Buffer } { // Ensure return type includes yopPublicKey
    // ESM equivalent for __dirname
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const defaultBaseUrl = "https://openapi.yeepay.com";
    const defaultPublicKeyPath = path.resolve(
      __dirname,
      "assets/yop_platform_rsa_cert_rsa.pem",
    );

    const envBaseUrl = process.env.YOP_API_BASE_URL;
    const envAppKey = process.env.YOP_APP_KEY;
    const envSecretKey = process.env.YOP_APP_PRIVATE_KEY;
    const envYopPublicKey = process.env.YOP_PUBLIC_KEY; // Key as string
    const envYopPublicKeyPath = process.env.YOP_PUBLIC_KEY_PATH; // Path to key file

    let finalConfig: Partial<YopConfig> = {};
    let loadedYopPublicKeyInput: string | Buffer | undefined; // Store the raw input (string or buffer)
    let publicKeyLoadSource = "unknown";

    if (config) {
      finalConfig = { ...config };
      finalConfig.yopApiBaseUrl = config.yopApiBaseUrl ?? envBaseUrl ?? defaultBaseUrl;
      // Prioritize public key input from config object if provided
      if (config.yopPublicKey) {
        loadedYopPublicKeyInput = config.yopPublicKey;
        publicKeyLoadSource = "config object";
      }
    } else {
      finalConfig.appKey = envAppKey;
      finalConfig.secretKey = envSecretKey;
      finalConfig.yopApiBaseUrl = envBaseUrl ?? defaultBaseUrl;
    }

    // If public key input wasn't loaded from config object, apply prioritized loading
    if (!loadedYopPublicKeyInput) {
      if (envYopPublicKey) {
        // 1. Try YOP_PUBLIC_KEY environment variable (string)
        loadedYopPublicKeyInput = envYopPublicKey;
        publicKeyLoadSource = "YOP_PUBLIC_KEY env var";
      } else if (envYopPublicKeyPath) {
        // 2. Try YOP_PUBLIC_KEY_PATH environment variable
        publicKeyLoadSource = `YOP_PUBLIC_KEY_PATH env var (${envYopPublicKeyPath})`;
        try {
          const resolvedPath = path.resolve(envYopPublicKeyPath);
          loadedYopPublicKeyInput = fs.readFileSync(resolvedPath); // Read as Buffer
          console.info(`[YopClient Config] Loaded YOP public key from path: ${resolvedPath}`);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.warn(
            `[YopClient Config] Failed to load YOP public key from path specified in YOP_PUBLIC_KEY_PATH (${envYopPublicKeyPath}): ${errorMessage}. Falling back...`,
          );
        }
      }

      // 3. Fallback to default certificate file if still not loaded
      if (!loadedYopPublicKeyInput) {
        publicKeyLoadSource = `default file (${defaultPublicKeyPath})`;
        try {
          loadedYopPublicKeyInput = fs.readFileSync(defaultPublicKeyPath); // Read as Buffer
          console.info(
            `[YopClient Config] Loaded YOP public key from default file: ${defaultPublicKeyPath}`,
          );
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          throw new Error(
            `[YopClient Config] Failed to load YOP public key from default path (${defaultPublicKeyPath}): ${errorMessage}. Configuration failed.`,
          );
        }
      }
    }

    // Assign the loaded public key input to the final config
    finalConfig.yopPublicKey = loadedYopPublicKeyInput;

    // Validate required fields
    if (!finalConfig.appKey) {
      const errorMsg = config ? "Missing appKey in config" : "Missing YOP_APP_KEY env var";
      throw new Error(errorMsg);
    }
    if (!finalConfig.secretKey) {
      const errorMsg = config ? "Missing secretKey in config" : "Missing YOP_APP_PRIVATE_KEY env var";
      throw new Error(errorMsg);
    }
    if (!finalConfig.yopPublicKey) {
       // This should be unreachable if loading logic is correct
      throw new Error(`[YopClient Config] Critical Error: Failed to load required yopPublicKey from any source (${publicKeyLoadSource}).`);
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
      secretKey,
      // yopPublicKey, // No longer needed directly here
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
          secretKey,
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
          secretKey,
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
          secretKey,
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    let response: Response;
    try {
      console.info(`[YopClient] fetch URL: ${fullFetchUrl.toString()}`);
      const headersObject: Record<string, string> = {};
      fetchHeaders.forEach((value, key) => { headersObject[key] = value; });
      console.info(`[YopClient] fetch Method: ${fetchOptions.method}`);
      console.info(`[YopClient] fetch Headers: ${JSON.stringify(headersObject, null, 2)}`);
      console.info(`[YopClient] fetch Body: ${requestBodyString}`);
      response = await fetch(fullFetchUrl.toString(), fetchOptions);
      clearTimeout(timeoutId);
    } catch (fetchError: unknown) {
       clearTimeout(timeoutId);
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
      if (
        !VerifyUtils.isValidRsaResult({ // Use isValidRsaResult
          data: responseBodyText,
          sign: signatureToVerify,
          publicKey: yopPublicKeyObject, // Pass the KeyObject
        })
      ) {
        console.error("[YopClient] Response signature verification failed!");
        console.error("[YopClient] Response Body:", responseBodyText);
        console.error("[YopClient] Signature Used (Header/Body):", signatureToVerify);
        throw new Error("Invalid response signature from YeePay");
      } else {
        console.info("[YopClient] Response signature verification successful using signature from", yopSignHeader ? "header." : "body.");
      }
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
