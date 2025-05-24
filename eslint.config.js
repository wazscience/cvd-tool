export default {
  rules: {
    'no-undef': 'warn',
    'no-unused-vars': ['warn', { 'varsIgnorePattern': '^_', 'argsIgnorePattern': '^_' }],
    'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
    'no-loss-of-precision': 'warn',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { 'allowTemplateLiterals': true }]
  },
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    globals: {
      'window': 'readonly',
      'document': 'readonly',
      'localStorage': 'readonly',
      'sessionStorage': 'readonly',
      'console': 'readonly',
      'setTimeout': 'readonly',
      'CryptoJS': 'readonly',
      'Node': 'readonly',
      'Element': 'readonly',
      'URL': 'readonly'
    }
  }
};
