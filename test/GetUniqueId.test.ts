import { describe, it, expect } from '@jest/globals';
import { getUniqueId } from '../src/utils/GetUniqueId';

describe('GetUniqueId', () => {
  describe('基本功能', () => {
    it('should generate a string of specified length', () => {
      const length = 16;
      const result = getUniqueId(length);
      expect(result).toHaveLength(length);
    });

    it('should generate a string with default length when called with typical values', () => {
      const result10 = getUniqueId(10);
      expect(result10).toHaveLength(10);

      const result20 = getUniqueId(20);
      expect(result20).toHaveLength(20);

      const result32 = getUniqueId(32);
      expect(result32).toHaveLength(32);
    });

    it('should only contain lowercase letters and digits', () => {
      const result = getUniqueId(100);
      const validCharPattern = /^[a-z0-9]+$/;
      expect(result).toMatch(validCharPattern);
    });

    it('should not contain uppercase letters or special characters', () => {
      const result = getUniqueId(100);
      expect(result).not.toMatch(/[A-Z]/); // 无大写字母
      expect(result).not.toMatch(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/); // 无特殊字符
      expect(result).not.toMatch(/\s/); // 无空格
    });
  });

  describe('边界情况', () => {
    it('should handle length of 1', () => {
      const result = getUniqueId(1);
      expect(result).toHaveLength(1);
      expect(result).toMatch(/^[a-z0-9]$/);
    });

    it('should handle length of 0', () => {
      const result = getUniqueId(0);
      expect(result).toBe('');
    });

    it('should handle very large lengths', () => {
      const largeLength = 10000;
      const result = getUniqueId(largeLength);
      expect(result).toHaveLength(largeLength);
      expect(result).toMatch(/^[a-z0-9]+$/);
    });

    it('should handle negative length gracefully', () => {
      // 负数长度应该返回空字符串（循环不执行）
      const result = getUniqueId(-5);
      expect(result).toBe('');
    });

    it('should handle floating point length by rounding', () => {
      // JavaScript for 循环比较时会将浮点数四舍五入
      const result = getUniqueId(10.7);
      expect(result).toHaveLength(11); // 10.7 rounds to 11
    });
  });

  describe('随机性与唯一性', () => {
    it('should generate different values on consecutive calls', () => {
      const id1 = getUniqueId(16);
      const id2 = getUniqueId(16);
      const id3 = getUniqueId(16);

      // 虽然理论上可能相同，但连续 3 次相同的概率极低
      expect(id1 === id2 && id2 === id3).toBe(false);
    });

    it('should have very low collision rate in 10,000 iterations', () => {
      const iterations = 10000;
      const length = 16;
      const ids = new Set<string>();

      for (let i = 0; i < iterations; i++) {
        ids.add(getUniqueId(length));
      }

      // 对于 16 字符（36^16 种可能），10,000 次应该几乎无碰撞
      // 允许极少量碰撞（< 0.1%）
      const uniqueCount = ids.size;
      const collisionRate = (iterations - uniqueCount) / iterations;
      expect(collisionRate).toBeLessThan(0.001); // 碰撞率 < 0.1%
    });

    it('should maintain uniqueness for shorter IDs (higher collision risk)', () => {
      const iterations = 1000;
      const length = 6; // 较短 ID，碰撞风险更高
      const ids = new Set<string>();

      for (let i = 0; i < iterations; i++) {
        ids.add(getUniqueId(length));
      }

      // 6 字符（36^6 ≈ 21 亿种可能），1,000 次应该大部分唯一
      const uniqueCount = ids.size;
      const collisionRate = (iterations - uniqueCount) / iterations;
      expect(collisionRate).toBeLessThan(0.05); // 碰撞率 < 5%
    });

    it('should generate IDs with relatively uniform character distribution', () => {
      const iterations = 10000;
      const length = 1;
      const charCounts: Record<string, number> = {};

      // 统计每个字符出现的次数
      for (let i = 0; i < iterations; i++) {
        const char = getUniqueId(length);
        charCounts[char] = (charCounts[char] || 0) + 1;
      }

      // 36 个字符，每个期望出现 ~277 次（10000/36）
      const expectedCount = iterations / 36;
      const tolerance = expectedCount * 0.3; // 允许 30% 偏差

      // 检查是否所有字符都出现了
      const validChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      for (const char of validChars) {
        expect(charCounts[char]).toBeDefined();
        expect(charCounts[char]).toBeGreaterThan(expectedCount - tolerance);
        expect(charCounts[char]).toBeLessThan(expectedCount + tolerance);
      }
    });
  });

  describe('性能测试', () => {
    it('should generate 100,000 IDs within reasonable time', () => {
      const iterations = 100000;
      const length = 16;

      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        getUniqueId(length);
      }
      const endTime = Date.now();

      const duration = endTime - startTime;
      // 100,000 次调用应在 1 秒内完成
      expect(duration).toBeLessThan(1000);
    });

    it('should generate long IDs (1000 chars) efficiently', () => {
      const length = 1000;

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        getUniqueId(length);
      }
      const endTime = Date.now();

      const duration = endTime - startTime;
      // 1,000 次生成 1,000 字符应在 500ms 内完成（更合理的性能阈值）
      expect(duration).toBeLessThan(500);
    });
  });

  describe('字符集验证', () => {
    it('should use exactly 36 characters (26 letters + 10 digits)', () => {
      const iterations = 10000;
      const allChars = new Set<string>();

      for (let i = 0; i < iterations; i++) {
        const id = getUniqueId(10);
        for (const char of id) {
          allChars.add(char);
        }
      }

      // 应该覆盖所有 36 个字符
      expect(allChars.size).toBe(36);

      // 验证字符集
      const expectedChars = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
      expectedChars.forEach(char => {
        expect(allChars.has(char)).toBe(true);
      });
    });

    it('should not include any characters outside the defined set', () => {
      const iterations = 1000;
      const validChars = new Set('abcdefghijklmnopqrstuvwxyz0123456789');

      for (let i = 0; i < iterations; i++) {
        const id = getUniqueId(20);
        for (const char of id) {
          expect(validChars.has(char)).toBe(true);
        }
      }
    });
  });

  describe('实际使用场景', () => {
    it('should work as order ID generator', () => {
      // 模拟生成订单 ID
      const orderIdPrefix = 'ORDER_';
      const orderId = orderIdPrefix + getUniqueId(16);

      expect(orderId).toMatch(/^ORDER_[a-z0-9]{16}$/);
      expect(orderId).toHaveLength(22); // 'ORDER_' (6) + 16 = 22
    });

    it('should work as request ID generator', () => {
      // 模拟生成请求 ID
      const requestId = getUniqueId(32);

      expect(requestId).toHaveLength(32);
      expect(requestId).toMatch(/^[a-z0-9]{32}$/);
    });

    it('should work in batch generation scenarios', () => {
      // 模拟批量生成场景
      const batchSize = 1000;
      const ids: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        ids.push(getUniqueId(12));
      }

      // 检查没有明显重复
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBeGreaterThan(batchSize * 0.99); // 至少 99% 唯一
    });

    it('should integrate with timestamp for better uniqueness', () => {
      // 模拟时间戳 + 随机 ID 组合
      const timestamp = Date.now().toString(36); // 36 进制时间戳
      const randomPart = getUniqueId(8);
      const compositeId = `${timestamp}-${randomPart}`;

      expect(compositeId).toMatch(/^[a-z0-9]+-[a-z0-9]{8}$/);
    });
  });

  describe('类型安全性', () => {
    it('should accept number type parameter', () => {
      const result = getUniqueId(10);
      expect(typeof result).toBe('string');
    });

    it('should return string type', () => {
      const result = getUniqueId(5);
      expect(typeof result).toBe('string');
    });

    it('should handle NaN gracefully', () => {
      // NaN 在循环中会被当作 0
      const result = getUniqueId(NaN);
      expect(result).toBe('');
    });

    it('should handle very large numbers without crashing', () => {
      // 测试较大但不会导致内存溢出的数字
      const result = getUniqueId(100000);
      expect(result).toHaveLength(100000);
      expect(result).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('边缘输入处理', () => {
    it('should handle very small positive lengths', () => {
      // JavaScript for 循环: i < n 会直接比较浮点数
      // 0 < 0.1 为 true，执行一次循环后 i=1，1 < 0.1 为 false
      expect(getUniqueId(0.1)).toHaveLength(1);
      expect(getUniqueId(0.4)).toHaveLength(1);
      expect(getUniqueId(0.9)).toHaveLength(1);
    });

    it('should handle string-coerced numbers (if applicable)', () => {
      // TypeScript 会阻止字符串传入，但测试运行时行为
      const result = getUniqueId(Number('10'));
      expect(result).toHaveLength(10);
    });
  });

  describe('回归测试', () => {
    it('should maintain backward compatibility with existing usage', () => {
      // 确保常用长度（10, 16, 32）正常工作
      const commonLengths = [10, 16, 32];

      commonLengths.forEach(length => {
        const id = getUniqueId(length);
        expect(id).toHaveLength(length);
        expect(id).toMatch(/^[a-z0-9]+$/);
      });
    });

    it('should not break when called multiple times in quick succession', () => {
      const ids: string[] = [];
      for (let i = 0; i < 100; i++) {
        ids.push(getUniqueId(10));
      }

      // 确保所有调用都成功
      expect(ids).toHaveLength(100);
      ids.forEach(id => {
        expect(id).toHaveLength(10);
        expect(id).toMatch(/^[a-z0-9]{10}$/);
      });
    });
  });
});
