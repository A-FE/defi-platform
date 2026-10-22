import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // ========== 文件大小限制 ==========
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],

      // ========== 复杂度限制 ==========
      'complexity': ['warn', 15],
      'max-depth': ['warn', 4],
      'max-nested-callbacks': ['warn', 3],
      'max-params': ['warn', 5],

      // ========== TypeScript 规则 ==========
      '@typescript-eslint/no-explicit-any': 'warn', // 临时降级为 warning
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // ========== 代码质量 ==========
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'warn',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'warn',
      'no-return-await': 'warn',

      // ========== React 规则 ==========
      'react/prop-types': 'off', // TypeScript 已经提供类型检查
      'react/react-in-jsx-scope': 'off', // Next.js 不需要
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unescaped-entities': 'off',

      // ========== 代码风格 ==========
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'curly': ['warn', 'all'],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      'semi': ['warn', 'always'],
      'comma-dangle': ['warn', 'always-multiline'],
      'arrow-spacing': 'warn',
      'object-curly-spacing': ['warn', 'always'],
      'array-bracket-spacing': ['warn', 'never'],

      // ========== 最佳实践 ==========
      'no-implicit-coercion': 'warn',
      'prefer-template': 'warn',
      'no-lonely-if': 'warn',
      'no-else-return': 'warn',
      'no-unneeded-ternary': 'warn',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores:
    "*.config.js",
    "*.config.mjs",
    "node_modules/**",
    "dist/**",
    ".turbo/**",
    "coverage/**",
    "tests/**", // 测试文件使用独立的配置
  ]),
]);

export default eslintConfig;
