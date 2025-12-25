# SDK Version Management

## Overview

This SDK uses **build-time code generation** for version management. The version is automatically read from `package.json` during the build process and injected into the codebase as TypeScript constants.

## How It Works

1. **Single Source of Truth**: Version is maintained only in [`package.json`](../package.json)
2. **Build-time Generation**: The script [`scripts/generate-version.js`](../scripts/generate-version.js) reads `package.json` and generates [`src/utils/version.ts`](../src/utils/version.ts)
3. **Auto-generated File**: `src/utils/version.ts` is git-ignored and recreated on every build
4. **Compile-time Constants**: Generated constants are inlined during TypeScript compilation

## Benefits

- ✅ **Single source of truth**: Only update `package.json`
- ✅ **Zero manual synchronization**: Fully automated
- ✅ **Reliable as dependency**: No runtime file I/O or path resolution issues
- ✅ **Build-time safety**: Build fails if version generation fails
- ✅ **Zero runtime overhead**: Constants are inlined at compile time

## Usage

### For SDK Developers

#### Updating the Version

1. Update version in `package.json`:

   ```json
   {
     "version": "4.0.15"
   }
   ```

2. Run build:

   ```bash
   npm run build
   ```

3. Commit changes (only `package.json` and `package-lock.json`):

   ```bash
   git add package.json package-lock.json
   git commit -m "chore: bump version to 4.0.15"
   ```

The version will automatically propagate to all code and HTTP headers.

#### First-time Setup

```bash
npm install
npm run build  # Generates version.ts for the first time
```

### For SDK Consumers

The SDK version is exposed in the `x-yop-sdk-version` HTTP header for all API requests. You can also programmatically access it:

```typescript
import { SDK_VERSION } from '@yeepay/yop-typescript-sdk';

console.log(`Using SDK version: ${SDK_VERSION}`); // "4.0.16"
```

## Technical Details

### Generated File Structure

The auto-generated [`src/utils/version.ts`](../src/utils/version.ts) looks like:

```typescript
// Auto-generated file - DO NOT EDIT
// Generated from package.json version during build
// Run 'npm run build' to regenerate

/**
 * SDK version from package.json
 * @constant
 */
export const SDK_VERSION = '4.0.16';

/**
 * SDK package name
 * @constant
 */
export const SDK_NAME = '@yeepay/yop-typescript-sdk';
```

### Build Process

The build pipeline executes in this order:

```bash
clean → generate:version → lint → tsc → copy-assets
```

This ensures `version.ts` exists before TypeScript compilation and linting.

### Files Involved

- **Source of truth**: [`package.json`](../package.json) - Contains the actual version
- **Generator script**: [`scripts/generate-version.js`](../scripts/generate-version.js) - Reads package.json and generates version.ts
- **Generated file**: `src/utils/version.ts` - Auto-generated, git-ignored
- **Usage in code**: [`src/utils/RsaV3Util.ts`](../src/utils/RsaV3Util.ts) - Imports and uses SDK_VERSION
- **Usage in tests**: [`test/RsaV3Util.test.ts`](../test/RsaV3Util.test.ts) - Tests verify correct version

### Git Configuration

The auto-generated file is excluded from version control:

```gitignore
# Auto-generated files
src/utils/version.ts
```

This ensures developers cannot accidentally commit the generated file.

## Troubleshooting

### "Cannot find module './version.js'"

**Cause**: `version.ts` has not been generated yet.

**Solution**: Run the build script:

```bash
npm run build
```

Or just the generation script:

```bash
npm run generate:version
```

### Tests Failing with Version Mismatch

**Cause**: Tests import `SDK_VERSION` dynamically, so they always reflect the current package.json version.

**Solution**: This is expected behavior. Update `package.json` version if needed, then rebuild:

```bash
npm run build
```

### Version Not Updating After package.json Change

**Cause**: `version.ts` is cached and not regenerated.

**Solution**: Run the build script to regenerate:

```bash
npm run build
```

The `build` script always runs `generate:version`, ensuring version is current.

## Migration Notes

This version management system was introduced to replace manual version synchronization across multiple files:

- **Before**: Version had to be manually updated in `package.json`, `RsaV3Util.ts`, and test files
- **After**: Version only needs to be updated in `package.json`

Previous locations where version was manually maintained:

- ~~`src/utils/RsaV3Util.ts:108`~~ - Now imports from `version.ts`
- ~~`test/RsaV3Util.test.ts:876`~~ - Now imports from `version.ts`

## Related Files

- [package.json](../package.json) - Version source of truth
- [scripts/generate-version.js](../scripts/generate-version.js) - Version generation script
- [src/utils/RsaV3Util.ts](../src/utils/RsaV3Util.ts) - Uses SDK_VERSION in HTTP headers
- [test/RsaV3Util.test.ts](../test/RsaV3Util.test.ts) - Tests version header
- [.gitignore](../.gitignore) - Excludes auto-generated version.ts
