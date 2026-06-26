import js from '@eslint/js';
import globals from 'globals';

const vitestGlobals = {
  describe: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  vi: 'readonly',
};

export default [
  { ignores: ['node_modules/', 'coverage/', 'dist/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'warn',
    },
  },
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: { globals: { ...globals.node, ...vitestGlobals } },
  },
];
