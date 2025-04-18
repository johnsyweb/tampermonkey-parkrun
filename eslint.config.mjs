import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    { files: ['**/*.{js,mjs,cjs}'], plugins: { js }, extends: ['js/recommended'] },
    { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
    { files: ['**/*.{js,mjs,cjs}'], languageOptions: { globals: globals.browser } },
    {
        files: ['**/*.test.js', '**/*.spec.js', '**/__tests__/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.node,
            },
        },
    },
]);
