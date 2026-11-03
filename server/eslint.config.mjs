// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Disallow 'any' — use 'unknown' or proper types (CQ-003)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow unused vars prefixed with _ (convention for unused params)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Prefer nullish coalescing over || for defaults
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      // Prefer optional chaining
      '@typescript-eslint/prefer-optional-chain': 'warn',
      // Require explicit return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // No floating promises
      '@typescript-eslint/no-floating-promises': 'error',
      // Consistent type imports
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
    ignores: ['dist/', 'node_modules/'],
  }
);
