import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'screenshots/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // `x == null` is the single idiomatic test for "null or undefined";
      // everything else must be strict.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Node-side tooling. Last, so these overrides win. typescript-eslint turns
    // `no-undef` off for .ts (the compiler already checks it), but these are
    // plain .mjs/.js and need their globals declared.
    files: ['scripts/**/*.mjs', '*.config.{js,mjs,ts}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: { 'no-console': 'off' },
  },
);
