#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

try {
  // Read package.json
  const packageJsonPath = join(projectRoot, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;

  if (!version || typeof version !== 'string') {
    throw new Error('Invalid version in package.json');
  }

  // Generate TypeScript content
  const content = `// Auto-generated file - DO NOT EDIT
// Generated from package.json version during build
// Run 'npm run build' to regenerate

/**
 * SDK version from package.json
 * @constant
 */
export const SDK_VERSION = '${version}';

/**
 * SDK package name
 * @constant
 */
export const SDK_NAME = '${packageJson.name}';
`;

  // Write to src/utils/version.ts
  const outputPath = join(projectRoot, 'src/utils/version.ts');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, 'utf8');

  console.log(`✓ Generated version.ts with SDK version: ${version}`);
} catch (error) {
  console.error('Failed to generate version.ts:', error.message);
  process.exit(1);
}
