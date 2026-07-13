module.exports = {
  root: true,
  extends: ['expo', 'eslint:recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'dist-test/',
    'dist_tests/',
    'web-build/',
    '.expo/',
    'package-lock.json',
  ],
  env: {
    es2022: true,
    node: true,
    'react-native/react-native': true,
  },
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'off',
  },
};
