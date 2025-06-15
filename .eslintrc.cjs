module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'prettier', // Add prettier plugin
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from @typescript-eslint/eslint-plugin
    // 'plugin:@typescript-eslint/recommended-requiring-type-checking', // Consider adding later for stricter rules needing type info
    'prettier', // Make sure this is last to override other configs
  ],
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
    project: './tsconfig.json', // Point to your tsconfig.json for type-aware linting rules (if using recommended-requiring-type-checking)
  },
  env: {
    node: true, // Enable Node.js global variables and Node.js scoping.
    es6: true, // Enable ES6 features automatically.
    jest: true, // Add Jest global variables.
  },
  rules: {
    // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
    // e.g. "@typescript-eslint/explicit-function-return-type": "off",
    'prettier/prettier': 'warn', // Show Prettier errors as warnings
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }], // Warn on unused vars, except those starting with _
    '@typescript-eslint/no-explicit-any': 'warn', // Warn on explicit 'any'
    // Add other custom rules here
  },
  ignorePatterns: [
      'node_modules/',
      'dist/',
      '.eslintrc.js', // Don't lint itself
      'jest.config.js', // Or other config files if needed
  ],
};