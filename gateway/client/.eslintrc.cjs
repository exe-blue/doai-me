/**
 * ESLint config (Vite + React + TypeScript)
 *
 * - console 직접 호출은 금지한다.
 * - 프로젝트가 이미 TypeScript strict 이므로, lint는 최소 규칙부터 적용한다.
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true }
  },
  plugins: ['@typescript-eslint', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    // React 17+ (automatic JSX runtime)
    'plugin:react/jsx-runtime',
    'plugin:@typescript-eslint/recommended'
  ],
  settings: {
    react: { version: 'detect' }
  },
  rules: {
    // 프로젝트 룰: console 금지 (logger 사용)
    'no-console': 'error',

    // 기존 코드 호환: 점진적으로 강화
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

    // 타입스크립트에서 const 권장 (가독성/안전성)
    'prefer-const': 'warn'
  }
};

