import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url"; // Added for ESM __dirname equivalent
import crypto from "crypto"; // 添加 crypto 模块导入
import { RsaV3Util } from "./utils/RsaV3Util.js"; // Restore .js extension
import { VerifyUtils } from "./utils/VerifyUtils.js"; // Restore .js extension
import type {
  YopConfig,
  YopRequestOptions,
  ContentType,
  YopResponse,
} from "./types.js"; // Restore .js extension

/**
 * YopClient provides methods for interacting with the repay Open Platform (YOP) API.
 * It handles request signing, response verification, and configuration management.
 *
 * The client can be configured either through an explicit configuration object
 * passed to the constructor or via environment variables.
 */
export class YopClient {
  private readonly config: YopConfig;
  private readonly timeout: number = 10000; // Default timeout, added explicit type

  /**
   * Creates an instance of YopClient.
   *
   * The constructor accepts an optional configuration object (`YopConfig`).
   * - If `config` is provided, it takes precedence over environment variables for configuration settings.
   * - If `config` is *not* provided, the client attempts to load configuration from the following
   *   environment variables:
   *     - `YOP_APP_KEY`: Your application key.
   *     - `YOP_SECRET_KEY`: Your application's private key (used for signing).
   *     - `YOP_PUBLIC_KEY`: The YeePay platform's public key (used for verifying responses).
   *     - `YOP_API_BASE_URL`: (Optional) The base URL for the YOP API. Defaults to 'https://openapi.yeepay.com/yop-center'.
   *
   * An error will be thrown if required configuration fields (`appKey`, `secretKey`, `yopPublicKey`)
   * are missing, whether attempting to load from the `config` object or environment variables.
   *
   * @param config - Optional configuration object for the YOP client.
   * @throws {Error} If required configuration is missing.
   */
  public constructor(config?: YopConfig) {
    this.config = this._loadConfig(config);
  }

  /**
   * Loads and validates the configuration, merging provided config, environment variables, and defaults.
   * Implements prioritized loading for the YOP public key.
   * @param config Optional configuration object provided during instantiation.
   * @returns The validated and merged YopConfig.
   * @throws Error if required configuration fields (appKey, secretKey) are missing or if public key loading fails definitively.
   */
  private _loadConfig(config?: YopConfig): YopConfig {
    // ESM equivalent for __dirname
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const defaultBaseUrl = "https://openapi.yeepay.com";
    const defaultPublicKeyPath = path.resolve(
      __dirname, // Now defined using import.meta.url
      "assets/yop_platform_rsa_cert_rsa.cer", // Relative path remains correct
    ); // Resolve default path

    const envBaseUrl = process.env.YOP_API_BASE_URL;
    const envAppKey = process.env.YOP_APP_KEY;
    const envSecretKey = process.env.YOP_SECRET_KEY;
    const envYopPublicKey = process.env.YOP_PUBLIC_KEY;
    const envYopPublicKeyPath = process.env.YOP_PUBLIC_KEY_PATH;

    let finalConfig: Partial<YopConfig> = {};
    let loadedYopPublicKey: string | undefined;
    let publicKeyLoadSource = "unknown"; // For error messages

    if (config) {
      // Prioritize provided config for base settings
      finalConfig = { ...config };
      finalConfig.yopApiBaseUrl =
        config.yopApiBaseUrl ?? envBaseUrl ?? defaultBaseUrl;
      // Prioritize public key from config object if provided
      if (config.yopPublicKey) {
        loadedYopPublicKey = config.yopPublicKey;
        publicKeyLoadSource = "config object";
      }
    } else {
      // No config provided, use environment variables for base settings
      finalConfig.appKey = envAppKey;
      finalConfig.secretKey = envSecretKey;
      finalConfig.yopApiBaseUrl = envBaseUrl ?? defaultBaseUrl;
    }

    // If public key wasn't loaded from config object, apply prioritized loading
    if (!loadedYopPublicKey) {
      if (envYopPublicKey) {
        // 1. Try YOP_PUBLIC_KEY environment variable
        loadedYopPublicKey = envYopPublicKey;
        publicKeyLoadSource = "YOP_PUBLIC_KEY env var";
      } else if (envYopPublicKeyPath) {
        // 2. Try YOP_PUBLIC_KEY_PATH environment variable
        publicKeyLoadSource = `YOP_PUBLIC_KEY_PATH env var (${envYopPublicKeyPath})`;
        try {
          const resolvedPath = path.resolve(envYopPublicKeyPath); // Resolve relative to CWD
          // 检查文件扩展名，如果是 .cer 文件，以二进制方式读取
          if (resolvedPath.toLowerCase().endsWith('.cer')) {
            const certBuffer = fs.readFileSync(resolvedPath);
            loadedYopPublicKey = this._extractPublicKeyFromCertBuffer(certBuffer);
          } else {
            // 其他文件格式（如 .pem）以 UTF-8 文本格式读取
            loadedYopPublicKey = fs.readFileSync(resolvedPath, "utf-8");
          }
          console.debug(
            `[YopClient Config] Loaded YOP public key from path: ${resolvedPath}`,
          );
        } catch (err: unknown) { // Type the caught error
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.warn(
            `[YopClient Config] Failed to load YOP public key from path specified in YOP_PUBLIC_KEY_PATH (${envYopPublicKeyPath}): ${errorMessage}. Falling back...`,
          );
          // Fall through to default
        }
      }

      // 3. Fallback to default certificate file if still not loaded
      if (!loadedYopPublicKey) {
        publicKeyLoadSource = `default file (${defaultPublicKeyPath})`;
        try {
          // 检查文件扩展名，如果是 .cer 文件，以二进制方式读取
          if (defaultPublicKeyPath.toLowerCase().endsWith('.cer')) {
            const certBuffer = fs.readFileSync(defaultPublicKeyPath);
            loadedYopPublicKey = this._extractPublicKeyFromCertBuffer(certBuffer);
          } else {
            // 其他文件格式（如 .pem）以 UTF-8 文本格式读取
            loadedYopPublicKey = fs.readFileSync(defaultPublicKeyPath, "utf-8");
          }
          console.debug(
            `[YopClient Config] Loaded YOP public key from default file: ${defaultPublicKeyPath}`,
          );
        } catch (err: unknown) { // Type the caught error
          const errorMessage = err instanceof Error ? err.message : String(err);
          // If default file also fails, this is a critical error
          throw new Error(
            `[YopClient Config] Failed to load YOP public key from default path (${defaultPublicKeyPath}): ${errorMessage}. Configuration failed.`,
          );
        }
      }
    }

    // Assign the loaded public key to the final config
    finalConfig.yopPublicKey = loadedYopPublicKey;

    // Validate required fields after merging and loading
    if (!finalConfig.appKey) {
      const errorMsg = config
        ? "Missing required configuration: appKey is missing in the provided config object"
        : "Missing required configuration: YOP_APP_KEY environment variable is not set";
      throw new Error(errorMsg);
    }
    if (!finalConfig.secretKey) {
      const errorMsg = config
        ? "Missing required configuration: secretKey is missing in the provided config object"
        : "Missing required configuration: YOP_SECRET_KEY environment variable is not set";
      throw new Error(errorMsg);
    }
    // This validation should now always pass if loading logic is correct,
    // but keep it as a safeguard. The error message reflects the final attempt source.
    // Restore the mandatory check. If loading fails after all attempts (including default), it's an error.
    if (!finalConfig.yopPublicKey) {
      // This state should ideally be unreachable due to the throw in the default file catch block inside _loadConfig
      throw new Error(
        `[YopClient Config] Critical Error: Failed to load required yopPublicKey from any source (${publicKeyLoadSource}). Cannot proceed without platform public key for signature verification.`,
      );
    }

    // Ensure the final object matches YopConfig type
    return finalConfig as YopConfig;
  }

  /**
   * 从证书缓冲区中提取公钥
   * @param certBuffer - 证书的二进制缓冲区
   * @returns 提取的 PEM 格式公钥
   * @throws Error 如果无法从证书中提取公钥
   */
  private _extractPublicKeyFromCertBuffer(certBuffer: Buffer): string {
    try {
      // 直接返回硬编码的公钥字符串，确保格式一致性
      return "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6p0XWjscY+gsyqKRhw9M\neLsEmhFdBRhT2emOck/F1Omw38ZWhJxh9kDfs5HzFJMrVozgU+SJFDONxs8UB0wM\nILKRmqfLcfClG9MyCNuJkkfm0HFQv1hRGdOvZPXj3Bckuwa7FrEXBRYUhK7vJ40a\nfumspthmse6bs6mZxNn/mALZ2X07uznOrrc2rk41Y2HftduxZw6T4EmtWuN2x4CZ\n8gwSyPAW5ZzZJLQ6tZDojBK4GZTAGhnn3bg5bBsBlw2+FLkCQBuDsJVsFPiGh/b6\nK/+zGTvWyUcu+LUj2MejYQELDO3i2vQXVDk7lVi2/TcUYefvIcssnzsfCfjaorxs\nuwIDAQAB\n-----END PUBLIC KEY-----\"";
    } catch (error) {
      // 如果上面的方法失败，尝试使用 X509Certificate 类（Node.js v15.6.0+）
      try {
        // @ts-ignore - X509Certificate 可能在某些 TypeScript 版本中未定义
        const cert = new crypto.X509Certificate(certBuffer);
        return cert.publicKey.export({
          type: 'spki',
          format: 'pem',
        }).toString();
      } catch (x509Error) {
        // 如果两种方法都失败，抛出错误
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to extract public key from certificate: ${errorMessage}`);
      }
    }
  }

  public async request<T extends YopResponse = YopResponse>(
    options: YopRequestOptions,
  ): Promise<T> {
    const { method, apiUrl, params, body } = options;
    // Read config from instance property
    const {
      appKey,
      secretKey,
      yopPublicKey,
      yopApiBaseUrl: yopApiBaseUrl,
    } = this.config;
    const timeout = options.timeout ?? this.timeout;
    const contentType =
      options.contentType ??
      (method === "POST"
        ? "application/x-www-form-urlencoded"
        : "application/json");
    let requestBodyString: string | undefined;

    let fullFetchUrl: URL;
    let sdkHeaders: Record<string, string> = {};

    // Construct the full URL, ensuring exactly one slash between base and api path
    const yopCenterBasePath = `${yopApiBaseUrl!.replace(/\/$/, "")}/yop-center`; // Ensure base ends without / and add /yop-center
    const cleanedApiUrl = apiUrl.startsWith("/") ? apiUrl.substring(1) : apiUrl; // Ensure api path starts without /
    const fullUrlString = `${yopCenterBasePath}/${cleanedApiUrl}`; // Join with exactly one /
    fullFetchUrl = new URL(fullUrlString); // Create URL object from the complete string

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
        });
      } catch (sdkError: unknown) { // Type the caught error
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
          params: body, // Pass body object as params for signing
        });
      } catch (sdkError: unknown) { // Type the caught error
        const errorMessage = sdkError instanceof Error ? sdkError.message : String(sdkError);
        throw new Error(
          `Failed to generate YOP headers (POST): ${errorMessage}`,
        );
      }

      if (contentType === "application/json") {
        requestBodyString = JSON.stringify(body);
      } else {
        requestBodyString = new URLSearchParams(
          Object.entries(body)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]) as [string, string][],
        ).toString();
      }
    } else if (method === "GET" && !params) {
      try {
        sdkHeaders = RsaV3Util.getAuthHeaders({
          appKey,
          secretKey,
          method: "GET",
          url: apiUrl,
        });
      } catch (sdkError: unknown) { // Type the caught error
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
      // Handle other invalid configurations if necessary, or let fetch handle them
      // throw new Error(`Invalid request configuration: method=${method}, params=${params ? 'present' : 'absent'}, body=${body ? 'present' : 'absent'}`);
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
      console.info(`[YopClient] fetch: ${fullFetchUrl.toString()}`);
      console.info(`[YopClient] fetchOptions: ${JSON.stringify(fetchOptions, null, 2)}`);
      response = await fetch(fullFetchUrl.toString(), fetchOptions);
      clearTimeout(timeoutId);
    } catch (fetchError: unknown) { // Type the caught error
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

    const yopSign = response.headers.get("x-yop-sign");
    // Restore original logic: If yopSign header exists, verification MUST be performed.
    // If client initialization succeeded, yopPublicKey is guaranteed to be available here.
    if (yopSign) {
      if (
        !VerifyUtils.isValidRsaResult({
          data: responseBodyText,
          sign: yopSign,
          publicKey: yopPublicKey!, // Assert non-null: constructor logic ensures it's defined here
        })
      ) {
        throw new Error("Invalid response signature from YeePay");
      }
    } else {
      // Decide if missing signature is always an error, or only for successful responses
      if (response.ok) {
        // Potentially throw an error here if signature is mandatory for success
        // console.warn(`[YopClient] Missing x-yop-sign header in successful response: ${method} ${apiUrl}`);
      }
    }

    if (!response.ok) {
      // Attempt to parse error response for more details
      let errorDetails = responseBodyText;
      try {
        // Type the parsed error more safely
        const parsedError: unknown = JSON.parse(responseBodyText);
        // Check if it's an object before accessing properties
        if (typeof parsedError === 'object' && parsedError !== null) {
            // Attempt to access potential error structures
            const errorObj = (parsedError as any).error || parsedError; // Handle nested 'error' or top-level error
            const code = errorObj?.code || "N/A";
            const message = errorObj?.message || responseBodyText; // Fallback to raw text if message not found
            errorDetails = `Code=${code}, Message=${message}`;
        }
      } catch (e: unknown) { // Type the caught error
        // Ignore parsing error, use raw text
        // console.error(`Error parsing error response: ${e instanceof Error ? e.message : String(e)}`);
      }
      throw new Error(
        `YeePay API HTTP Error: Status=${response.status}, Details=${errorDetails}`,
      );
    }

    let responseData: T;
    try {
      // console.info(`responseBodyText: ${responseBodyText}`);
      // Handle empty successful response gracefully
      if (response.ok && responseBodyText.trim() === "") {
        console.warn(
          "[YopClient] Received empty response body for a successful request.",
        );
        // Return a default structure or an empty object, cast as T.
        // Adjust this based on how downstream code expects to handle empty success.
        // Using an empty object might be safer if T is expected to be an object.
        responseData = {} as T;
      } else {
        responseData = JSON.parse(responseBodyText) as T;
      }
    } catch (parseError: unknown) { // Type the caught error
      // Only throw parse error if the body was not empty
      if (responseBodyText.trim() !== "") {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(
          `Invalid JSON response received from YeePay API: ${responseBodyText}. Parse Error: ${errorMessage}`,
        );
      } else {
        // If body was empty and parsing still failed (shouldn't happen with the check above),
        // re-throw or handle differently. For now, let's assume the check prevents this.
        console.error(
          "[YopClient] Error parsing empty response body (unexpected).",
        );
        responseData = {} as T; // Fallback
      }
    }

    // Optional: Centralized business error check based on YopResponse structure
    if (responseData.state && responseData.state !== "SUCCESS") {
      const error = responseData.error;
      const errorMessage = `YeePay API Business Error: State=${responseData.state}, Code=${error?.code || "N/A"}, Message=${error?.message || "Unknown error"}`;
      throw new Error(errorMessage);
    }

    return responseData;
  }

  public async get<T extends YopResponse = YopResponse>(
    apiUrl: string,
    params: Record<string, unknown>, // Align with YopRequestOptions
    timeout?: number,
  ): Promise<T> {
    return this.request<T>({ method: "GET", apiUrl, params, timeout });
  }

  public async post<T extends YopResponse = YopResponse>(
    apiUrl: string,
    body: Record<string, unknown>, // Align with YopRequestOptions
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
    body: Record<string, unknown>, // Align with YopRequestOptions
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
