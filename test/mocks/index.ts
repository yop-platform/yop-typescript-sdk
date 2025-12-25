/**
 * Test Mocks Index
 *
 * 集中导出所有测试 Mock 处理器
 *
 * @example
 * ```typescript
 * import { mockYopApi, MockScenarios } from './mocks';
 *
 * beforeEach(() => {
 *   global.fetch = MockScenarios.allSuccess();
 * });
 * ```
 */

export * from './yop-handlers.js';
