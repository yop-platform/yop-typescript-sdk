import { RsaV3Util } from './utils/RsaV3Util.js'; // Restore .js extension
import { VerifyUtils } from './utils/VerifyUtils.js'; // Restore .js extension
import type { YopConfig, YopRequestOptions, ContentType, YopResponse } from './types.js'; // Restore .js extension

export class YopClient {
  private config: YopConfig;
  private timeout = 10000; // Default timeout

  public constructor(config: YopConfig) {
    if (!config || !config.appKey || !config.secretKey || !config.yopPublicKey) {
        throw new Error('YopConfig is required with appKey, secretKey, and yopPublicKey.');
    }
    this.config = {
        ...config,
        yopApiBaseUrl: config.yopApiBaseUrl ?? 'https://openapi.yeepay.com', // Set default base URL
    };
  }

  public async request<T extends YopResponse = YopResponse>(options: YopRequestOptions): Promise<T> {
    const { method, apiUrl, params, body } = options;
    // Read config from instance property
    const { appKey, secretKey, yopPublicKey, yopApiBaseUrl: yopApiBaseUrl } = this.config;
    const timeout = options.timeout ?? this.timeout;
    const contentType = options.contentType ?? (method === 'POST' ? 'application/x-www-form-urlencoded' : 'application/json');
    let requestBodyString: string | undefined;

    let fullFetchUrl: URL;
    let sdkHeaders: Record<string, string> = {};
    
    // Construct the full URL, ensuring exactly one slash between base and api path
    const yopCenterBasePath = `${yopApiBaseUrl!.replace(/\/$/, '')}/yop-center`; // Ensure base ends without / and add /yop-center
    const cleanedApiUrl = apiUrl.startsWith('/') ? apiUrl.substring(1) : apiUrl; // Ensure api path starts without /
    const fullUrlString = `${yopCenterBasePath}/${cleanedApiUrl}`; // Join with exactly one /
    fullFetchUrl = new URL(fullUrlString); // Create URL object from the complete string

    if (method === 'GET' && params) {
       Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          fullFetchUrl.searchParams.append(key, String(value));
        }
      });
      try {
          sdkHeaders = RsaV3Util.getAuthHeaders({
            appKey,
            secretKey,
            method: 'GET',
            url: apiUrl,
            params: params,
          });
      } catch (sdkError) {
          throw new Error(`Failed to generate YOP headers (GET with params): ${(sdkError as Error).message}`);
      }
    } else if (method === 'POST' && body) {
      try {
          sdkHeaders = RsaV3Util.getAuthHeaders({
            appKey,
            secretKey,
            method: 'POST',
            url: apiUrl,
            params: body, // Pass body object as params for signing
          });
      } catch (sdkError) {
          throw new Error(`Failed to generate YOP headers (POST): ${(sdkError as Error).message}`);
      }

      if (contentType === 'application/json') {
          requestBodyString = JSON.stringify(body);
      } else {
          requestBodyString = new URLSearchParams(Object.entries(body).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)])).toString();
      }
    } else if (method === 'GET' && !params) {
         try {
             sdkHeaders = RsaV3Util.getAuthHeaders({
                appKey,
                secretKey,
                method: 'GET',
                url: apiUrl,
             });
         } catch (sdkError) {
             throw new Error(`Failed to generate YOP headers (GET no params): ${(sdkError as Error).message}`);
         }
    } else {
       if (method === 'POST' && !body) {
            throw new Error('Invalid request configuration: POST method requires a body.');
       }
       // Handle other invalid configurations if necessary, or let fetch handle them
       // throw new Error(`Invalid request configuration: method=${method}, params=${params ? 'present' : 'absent'}, body=${body ? 'present' : 'absent'}`);
    }

    const fetchHeaders = new Headers(sdkHeaders);

    if (method === 'POST' && body) {
        fetchHeaders.set('Content-Type', contentType);
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
      // console.info(`[YopClient] fetch: ${fullFetchUrl.toString()}`);
      response = await fetch(fullFetchUrl.toString(), fetchOptions);
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error(`Yeepay API request timed out after ${timeout / 1000} seconds.`);
      }
      throw new Error(`Network error calling Yeepay API: ${(fetchError as Error).message}`);
    }

    const responseBodyText = await response.text();

    const yopSign = response.headers.get('x-yop-sign');
    if (yopSign) {
        if (!VerifyUtils.isValidRsaResult({ data: responseBodyText, sign: yopSign, publicKey: yopPublicKey })) {
          throw new Error('Invalid response signature from Yeepay');
        }
    } else {
        // Decide if missing signature is always an error, or only for successful responses
        if (response.ok) {
             // Potentially throw an error here if signature is mandatory for success
             // console.info(`[YopClient] Missing x-yop-sign header in successful response: ${method} ${apiUrl} ${responseBodyText}`);
        }
    }

    if (!response.ok) {
        // Attempt to parse error response for more details
        let errorDetails = responseBodyText;
        try {
            const parsedError = JSON.parse(responseBodyText);
            errorDetails = `Code=${parsedError?.error?.code || parsedError?.code || 'N/A'}, Message=${parsedError?.error?.message || parsedError?.message || responseBodyText}`;
        } catch (e) {
            // Ignore parsing error, use raw text
        }
        throw new Error(`Yeepay API HTTP Error: Status=${response.status}, Details=${errorDetails}`);
    }

    let responseData: T;
    try {
        // console.info(`responseBodyText: ${responseBodyText}`);
        // Handle empty successful response gracefully
        if (response.ok && responseBodyText.trim() === '') {
            console.warn('[YopClient] Received empty response body for a successful request.');
            // Return a default structure or an empty object, cast as T.
            // Adjust this based on how downstream code expects to handle empty success.
            // Using an empty object might be safer if T is expected to be an object.
            responseData = {} as T;
        } else {
            responseData = JSON.parse(responseBodyText) as T;
        }
    } catch (parseError) {
        // Only throw parse error if the body was not empty
        if (responseBodyText.trim() !== '') {
            throw new Error(`Invalid JSON response received from Yeepay API: ${responseBodyText}`);
        } else {
            // If body was empty and parsing still failed (shouldn't happen with the check above),
            // re-throw or handle differently. For now, let's assume the check prevents this.
             console.error('[YopClient] Error parsing empty response body (unexpected).');
             responseData = {} as T; // Fallback
        }
    }

    // Optional: Centralized business error check based on YopResponse structure
    if (responseData.state && responseData.state !== 'SUCCESS') {
       const error = responseData.error;
       const errorMessage = `Yeepay API Business Error: State=${responseData.state}, Code=${error?.code || 'N/A'}, Message=${error?.message || 'Unknown error'}`;
       throw new Error(errorMessage);
    }
    // The old check might still be relevant if 'state' isn't always present
    // if (responseData.code && responseData.code !== 'OPR00000') { // Adjust 'OPR00000' if needed
    //    const errorMessage = `Yeepay API Business Error: Code=${responseData?.code}, Message=${responseData?.message || 'Unknown error'}`;
    //    throw new Error(errorMessage);
    // }

    return responseData;
  }

  public async get<T extends YopResponse = YopResponse>(apiUrl: string, params: Record<string, any>, timeout?: number): Promise<T> {
    return this.request<T>({ method: 'GET', apiUrl, params, timeout });
  }

  public async post<T extends YopResponse = YopResponse>(
      apiUrl: string,
      body: Record<string, any>,
      contentType: ContentType = 'application/x-www-form-urlencoded',
      timeout?: number
  ): Promise<T> {
    return this.request<T>({ method: 'POST', apiUrl, body, contentType, timeout });
  }

  public async postJson<T extends YopResponse = YopResponse>(
      apiUrl: string,
      body: Record<string, any>,
      timeout?: number
  ): Promise<T> {
    return this.request<T>({ method: 'POST', apiUrl, body, contentType: 'application/json', timeout });
  }
}