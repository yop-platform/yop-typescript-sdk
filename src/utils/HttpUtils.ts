import { Request } from './types.js';

export class HttpUtils {
  /**
   * Normalizes a value by encoding special characters according to RFC 3986
   *
   * 严格遵循 RFC 3986 标准进行 URL 编码：
   * - 保留非保留字符（unreserved characters）: [A-Za-z0-9-_.~]
   * - 空格编码为 %20 (不是 +)
   * - + 编码为 %2B
   * - * 编码为 %2A
   * - ~ 不编码（是非保留字符）
   * - 其他字符按 UTF-8 编码后转为 %XX 格式
   *
   * @param value - The value to normalize
   * @returns Normalized string according to RFC 3986
   */
  static normalize(
    value: string | number | boolean | undefined | null,
  ): string {
    if (value === undefined || value === null) {
      return '';
    }

    const valueStr = value.toString();

    let vStr = '';
    const bytes = Buffer.from(valueStr, 'utf-8');

    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      const s = String.fromCharCode(byte!); // Assert non-null: loop guarantees it's defined

      if (s.match(/[0-9a-zA-Z._~-]/)) {
        // RFC 3986 unreserved characters
        vStr += s;
      } else {
        // Handle special cases according to RFC 3986
        if (s === '+') {
          vStr += '%2B'; // Convert + to %2B (RFC 3986)
        } else if (s === '*') {
          vStr += '%2A'; // Convert * to %2A
        } else if (s === ' ') {
          vStr += '%20'; // Convert space to %20 (RFC 3986)
        } else if (s === '%' && i + 2 < bytes.length) {
          // Check if this is %7E which should be converted to ~
          const nextTwoChars =
            String.fromCharCode(bytes[i + 1]!) +
            String.fromCharCode(bytes[i + 2]!);
          if (nextTwoChars.toUpperCase() === '7E') {
            vStr += '~';
            i += 2; // Skip the next two bytes
          } else {
            // 确保十六进制值是两位数
            const hex = byte!.toString(16).toUpperCase();
            vStr += '%' + (hex.length === 1 ? '0' + hex : hex);
          }
        } else {
          // 确保十六进制值是两位数
          const hex = byte!.toString(16).toUpperCase();
          vStr += '%' + (hex.length === 1 ? '0' + hex : hex);
        }
      }
    }
    return vStr;
  }

  /**
   * Encodes parameters in a request
   * @param req - The request containing parameters
   * @returns Encoded parameters
   */
  static encodeParams(req: Request): Record<string, string> {
    const encoded: Record<string, string> = {};
    for (const k in req.paramMap) {
      const v = req.paramMap[k];
      // Cast v to the types that HttpUtils.normalize accepts
      encoded[this.normalize(k)] = this.normalize(
        v as string | number | boolean | undefined | null,
      );
    }
    return encoded;
  }

  /**
   * Checks if a string starts with a substring
   * @param haystack - The string to check
   * @param needle - The substring to look for
   * @returns True if haystack starts with needle
   */
  static startsWith(haystack: string, needle: string): boolean {
    if (!needle) {
      return true;
    }
    return haystack.lastIndexOf(needle) >= 0;
  }

  /**
   * Checks if a string ends with a substring
   * @param haystack - The string to check
   * @param needle - The substring to look for
   * @returns True if haystack ends with needle
   */
  static endsWith(haystack: string, needle: string): boolean {
    if (!needle) {
      return true;
    }
    const temp = haystack.length - needle.length;
    return temp >= 0;
  }
}

export default HttpUtils;
