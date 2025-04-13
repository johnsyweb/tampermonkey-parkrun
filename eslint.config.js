import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        document: 'readonly',
        window: 'readonly',
        Chart: 'readonly',
        DOMParser: 'readonly',
        fetch: 'readonly'
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-unused-vars': 'error',
      'no-undef': 'error'
    }
  }
];