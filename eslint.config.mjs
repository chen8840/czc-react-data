import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import eslintPluginImport from 'eslint-plugin-import';


export default defineConfig([
  { files: ['**/*.{ts}'], plugins: { js }, extends: ['js/recommended'] },
  { files: ['**/*.{ts}'], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended,
  {
    plugins: {
      import: eslintPluginImport,
    },
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'args': 'all',
          'argsIgnorePattern': '^_',
          'caughtErrors': 'all',
          'caughtErrorsIgnorePattern': '^_',
          'destructuredArrayIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'ignoreRestSiblings': true
        }
      ],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',    // Node.js 内置模块 (如 fs、path)
            'external',   // node_modules 中的第三方库
            'internal',   // 项目内部别名路径
            'parent',     // 父级目录的相对导入
            'sibling',    // 同级目录的相对导入
            'index'       // 当前目录的 index 文件
          ],
          pathGroupsExcludedImportTypes: ['builtin'],  // 排除内置模块的分类干扰
          'newlines-between': 'always'  // 不同组之间强制换行
        }
      ],
      'semi': [
        'error',
        'always'
      ],
      'quotes': [
        'warn',
        'single'
      ]
    }
  }
]);