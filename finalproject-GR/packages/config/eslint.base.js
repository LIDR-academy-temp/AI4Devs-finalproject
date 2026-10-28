const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');

/** Shared base ESLint flat config. Each workspace imports this and appends its own overrides. */
module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'build/**', '.next/**', 'node_modules/**'],
  },
  {
    // Convention: a leading underscore marks a required-but-unused parameter
    // (e.g. matching a callback signature) as intentional.
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Config files (eslint.config.js, jest.config.js, etc.) are plain Node CommonJS
    // by ESLint's/Jest's own convention, not application source.
    files: ['**/*.config.js', '**/*.config.cjs'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
