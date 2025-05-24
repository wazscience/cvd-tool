const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        alert: 'writable',
        confirm: 'readonly',
        prompt: 'readonly',
        fetch: 'readonly',
        location: 'readonly',
        history: 'readonly',
        
        // Service Worker globals
        self: 'readonly',
        caches: 'readonly',
        importScripts: 'readonly',
        clients: 'readonly',
        skipWaiting: 'readonly',
        WorkerGlobalScope: 'readonly',
        ServiceWorkerGlobalScope: 'readonly',
        
        // Timer functions
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        
        // Node.js globals
        module: 'writable',
        exports: 'writable',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        
        // CVD Tool specific globals
        formHandler: 'writable',
        secureStorage: 'writable',
        loadingIndicator: 'writable',
        physiologicalValidation: 'writable',
        enhancedDisplay: 'writable',
        JunoIntegration: 'writable',
        
        // Main calculation functions
        calculateFRS: 'readonly',
        calculateQRISK: 'readonly',
        calculateQRISK3Score: 'readonly',
        calculateBoth: 'readonly',
        evaluateMedications: 'readonly',
        calculateFraminghamRiskScore: 'readonly',
        calculateLpaModifier: 'readonly',
        calculateNonHDL: 'readonly',
        calculateSBPStandardDeviation: 'readonly',
        calculateBMI: 'readonly',
        
        // UI functions
        resetForm: 'readonly',
        openTab: 'readonly',
        showModal: 'readonly',
        showClinicalWarning: 'readonly',
        exportResults: 'readonly',
        exportToCSV: 'readonly',
        showPdfPreview: 'readonly',
        toggleHeightInputs: 'readonly',
        updateComparisonTabStatus: 'readonly',
        initializeApp: 'readonly',
        
        // Display functions
        displayFRSResults: 'readonly',
        displayQRISKResults: 'readonly',
        displayComparisonResults: 'readonly',
        displayMedicationResults: 'readonly',
        displayErrors: 'readonly',
        createComparisonChart: 'readonly',
        
        // Validation functions
        validateNumericInput: 'readonly',
        validateSelectInput: 'readonly',
        validateCheckbox: 'readonly',
        validateForm: 'readonly',
        validateFRSForm: 'readonly',
        validateQRISKForm: 'readonly',
        validateMedicationForm: 'readonly',
        validatePhysiologicalValues: 'readonly',
        checkPhysiologicalPlausibility: 'readonly',
        addClinicalValidation: 'readonly',
        
        // Conversion functions
        convertCholesterol: 'readonly',
        convertLpa: 'readonly',
        convertHeightToCm: 'readonly',
        convertWeightToKg: 'readonly',
        convertEthnicity: 'readonly',
        convertSmoking: 'readonly',
        
        // Utility functions
        standardizeUnits: 'readonly',
        standardizeUnitsForQRISK3: 'readonly',
        getRiskCategory: 'readonly',
        getCCSRecommendation: 'readonly',
        getContributingFactors: 'readonly',
        getFormattedRecommendations: 'readonly',
        determineTargetLevels: 'readonly',
        assessCurrentTherapy: 'readonly',
        generateRecommendations: 'readonly',
        assessPCSK9Coverage: 'readonly',
        
        // QRISK3 algorithm functions
        calculateRawQRISK3: 'readonly',
        cvd_female_raw: 'readonly',
        cvd_male_raw: 'readonly',
        
        // Configuration objects
        PHYSIOLOGICAL_RANGES: 'readonly',
        JUNO_INTEGRATION: 'readonly',
        
        // Script-specific globals
        fs: 'readonly',
        path: 'readonly',
        babel: 'readonly',
        
        // DOM utilities
        FormData: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        
        // Other utilities
        Math: 'readonly',
        Date: 'readonly',
        JSON: 'readonly',
        Array: 'readonly',
        Object: 'readonly',
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        URLSearchParams: 'readonly',
        btoa: 'readonly',
        atob: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-console': 'off',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
      'indent': ['error', 2, { 'SwitchCase': 1 }],
      'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1 }],
      'comma-dangle': ['error', 'never'],
      'eol-last': ['error', 'always'],
      'no-trailing-spaces': 'error',
      'space-before-function-paren': ['error', {
        'anonymous': 'never',
        'named': 'never',
        'asyncArrow': 'always'
      }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'keyword-spacing': ['error', { 'before': true, 'after': true }],
      'space-infix-ops': 'error',
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
      'no-var': 'error',
      'prefer-const': 'warn',
      'arrow-spacing': ['error', { 'before': true, 'after': true }],
      'no-duplicate-imports': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-alert': 'off',
      'eqeqeq': ['error', 'always', { 'null': 'ignore' }],
      'dot-notation': 'error',
      'no-return-await': 'error',
      'no-throw-literal': 'error',
      'no-useless-catch': 'error',
      'prefer-promise-reject-errors': 'error',
      'max-len': ['warn', { 
        'code': 120, 
        'ignoreComments': true,
        'ignoreStrings': true,
        'ignoreTemplateLiterals': true,
        'ignoreRegExpLiterals': true,
        'ignoreUrls': true
      }]
    }
  },
  {
    files: ['service-worker.js', '**/sw.js', '**/serviceWorker.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        importScripts: 'readonly',
        clients: 'readonly',
        skipWaiting: 'readonly',
        WorkerGlobalScope: 'readonly',
        ServiceWorkerGlobalScope: 'readonly',
        addEventListener: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        fetch: 'readonly',
        console: 'readonly'
      }
    }
  },
  {
    files: ['**/*.test.js', '**/*.spec.js', '**/test-*.js'],
    rules: {
      'no-unused-expressions': 'off',
      'max-len': 'off',
      'no-unused-vars': 'warn'
    }
  },
  {
    files: ['scripts/**/*.js', 'hooks/**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        console: 'readonly'
      }
    },
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['combined/*.js', 'combined.js'],
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'max-len': 'off'
    }
  },
  {
    files: ['qrisk3-implementation.js', 'juno-integration.js', 'enhanced-display.js'],
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn'
    }
  }
];