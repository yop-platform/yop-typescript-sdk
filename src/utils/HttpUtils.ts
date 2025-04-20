import { Request } from './types.js';

export class HttpUtils {
  /**
   * Normalizes a value by encoding special characters
   * @param value - The value to normalize
   * @returns Normalized string
   */
  /**
   * Normalizes a value by encoding special characters according to RFC 3986
   * @param value - The value to normalize
   * @returns Normalized string
   */
  static normalize(value: string | number | boolean | undefined | null): string {
    let vStr = "";
    if (value) {
      const bytes = Buffer.from(value.toString(), 'utf-8');
      for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        const s = String.fromCharCode(byte!); // Assert non-null: loop guarantees it's defined
        if (s.match(/[0-9a-zA-Z._~-]/)) {
          // RFC 3986 unreserved characters
          vStr += s;
        } else {
          // Handle special cases according to RFC 3986
          if (s === '+') {
            vStr += '%20'; // Convert + to %20
          } else if (s === '*') {
            vStr += '%2A'; // Convert * to %2A
          } else if (s === '%' && i + 2 < bytes.length) {
            // Check if this is %7E which should be converted to ~
            const nextTwoChars = String.fromCharCode(bytes[i+1]!) + String.fromCharCode(bytes[i+2]!);
            if (nextTwoChars.toUpperCase() === '7E') {
              vStr += '~';
              i += 2; // Skip the next two bytes
            } else {
              vStr += '%' + byte!.toString(16).toUpperCase();
            }
          } else {
            vStr += '%' + byte!.toString(16).toUpperCase();
          }
        }
      }
    }
    return vStr;
  }

  /**
   * Converts a string to bytes (UTF-8 encoding)
   * @param str - The string to convert
   * @returns Array of bytes
   */
  static stringToByte(str: string): number[] {
    const bytes: number[] = [];
    const len = str.length;
    for (let i = 0; i < len; i++) {
      const c = str.charCodeAt(i);
      if (c >= 0x010000 && c <= 0x10FFFF) {
        bytes.push(((c >> 18) & 0x07) | 0xF0);
        bytes.push(((c >> 12) & 0x3F) | 0x80);
        bytes.push(((c >> 6) & 0x3F) | 0x80);
        bytes.push((c & 0x3F) | 0x80);
      } else if (c >= 0x000800 && c <= 0x00FFFF) {
        bytes.push(((c >> 12) & 0x0F) | 0xE0);
        bytes.push(((c >> 6) & 0x3F) | 0x80);
        bytes.push((c & 0x3F) | 0x80);
      } else if (c >= 0x000080 && c <= 0x0007FF) {
        bytes.push(((c >> 6) & 0x1F) | 0xC0);
        bytes.push((c & 0x3F) | 0x80);
      } else {
        bytes.push(c & 0xFF);
      }
    }
    return bytes;
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
      // Cast v to any as HttpUtils.normalize is designed to handle various input types
      encoded[this.normalize(k)] = this.normalize(v as any);
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
    const temp = (haystack.length - needle.length);
    return temp >= 0;
  }
}

export default HttpUtils;