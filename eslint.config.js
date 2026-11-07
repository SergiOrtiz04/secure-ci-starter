// ESLint flat config (ESLint 9+/10). Type-aware rules are enabled so that
// floating promises and unsafe `any` usage fail CI, not just style nits.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Security-leaning rules that are cheap and catch real bugs.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-console': 'off', // this is a server; structured logging is out of scope
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // supertest types `res.body` as `any`. Asserting on it is the whole point
    // of an API test, so relax the unsafe-any rules for tests only.
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    // The config file itself is plain JS; don't require type info for it.
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
);
