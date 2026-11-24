import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['build/**', 'node_modules/**', 'drizzle/**', 'coverage/**'],
  },
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      quotes: ['error', 'single', { avoidEscape: false, allowTemplateLiterals: true }],
      'no-trailing-spaces': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]
