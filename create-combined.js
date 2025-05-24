const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

function safeExecute(fn, errorMsg) {
  try {
    return fn();
  } catch (error) {
    console.error(`${errorMsg}: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

function autoFixSyntax(code, filename) {
  code = code.replace(/\}\s*\)/g, '});');
  code = code.replace(/\n\s*\n\s*\n/g, '\n\n');
  code = code.replace(/,\s*}/g, '}');
  code = code.replace(/function\s+(\w+)\s*\(\s*\)\s*{/g, 'function $1() {');

  try {
    const result = babel.transformSync(code, {
      presets: ['@babel/preset-env'],
      filename: filename,
      compact: false,
      comments: true
    });
    return result.code;
  } catch (babelError) {
    console.warn(`Babel transform failed for ${filename}, using original code`);
    return code;
  }
}

function validateJavaScript(code, filename) {
  try {
    new Function(code);
    return { valid: true, code: code };
  } catch (error) {
    console.warn(`Syntax error in ${filename}: ${error.message}`);
    console.log(`Attempting to auto-fix syntax issues...`);

    const fixedCode = autoFixSyntax(code, filename);

    try {
      new Function(fixedCode);
      console.log(`Successfully fixed syntax issues in ${filename}`);
      return { valid: true, code: fixedCode };
    } catch (fixError) {
      console.error(`Unable to fix syntax in ${filename}: ${fixError.message}`);
      return { valid: false, code: code };
    }
  }
}

function createCompleteCombinedJS() {
  const jsDir = path.join(process.cwd(), 'js');
  const combinedPath = path.join(process.cwd(), 'combined.js');

  console.log('Starting combined.js creation...');

  function readJSFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const filename = path.basename(filePath);

        const { valid, code } = validateJavaScript(content, filename);

        if (!valid) {
          console.warn(`Skipping ${filename} due to unfixable syntax errors`);
          return `// ${filename} skipped due to syntax errors\n`;
        }

        console.log(`Successfully processed: ${filename}`);
        return `// === ${filename} ===\n${code}\n\n`;
      }
      console.log(`File not found: ${filePath}`);
      return `// ${path.basename(filePath)} not found\n\n`;
    } catch (error) {
      console.warn(`Could not read ${filePath}: ${error.message}`);
      return `// Error reading ${path.basename(filePath)}: ${error.message}\n\n`;
    }
  }

  // Define the correct order based on your file structure
  const fileOrder = [;
    // Core functionality files
    'validation.js',
    'calculations.js',
    'medication.js',
    'ui.js',
    'form-handler.js',

    // Utility files
    'utils/secure-storage.js',
    'utils/loading-indicator.js',
    'utils/input-sanitizer.js',
    'utils/physiological-validation.js',
    'utils/validator-extension.js',
    'utils/enhanced-disclaimer.js',
    'utils/csp-report-handler.js',

    // Implementation files from root
    '../qrisk3-implementation.js',
    '../juno-integration.js',
    '../enhanced-display.js'
  ];

  // Read all JS files in order
  const jsFiles = {};
  fileOrder.forEach(file => {
    let fullPath;
    if (file.startsWith('utils/')) {
      fullPath = path.join(jsDir, file);
    } else if (file.startsWith('../')) {
      fullPath = path.join(process.cwd(), file.substring(3));
    } else {
      fullPath = path.join(jsDir, file);
    }

    const key = file.replace(/[\/\\]/g, '_').replace('.js', '').replace('..', 'root');
    jsFiles[key] = readJSFile(fullPath);
  });

  // Create comprehensive combined.js content
  const combinedContent = `/**;
   * CVD Risk Toolkit Combined JavaScript
   * Version: 3.0.0 - Last Updated: ${new Date().toISOString()}
   * This file combines all JavaScript functionality for the CVD Risk Toolkit
   * 
   * IMPORTANT: This file is auto-generated. Make changes to individual source files instead.
   */

  // Utility Functions
  function safeGet(obj, path, defaultValue = null) {
    try {
      const keys = path.split('.');
      let result = obj;
      
      for (const key of keys) {
        if (result === undefined || result === null) {
          return defaultValue;
        }
        result = result[key];
      }
      
      return result === undefined ? defaultValue : result;
    } catch (e) {
      return defaultValue;
    }
  }

  function debounce(func, wait = 100) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function throttle(func, limit = 100) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Combined Modules
  ${Object.values(jsFiles).join('\n')}

  // Enhanced Form functionality with comprehensive error handling
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing CVD Risk Toolkit...');
    
    // Global error handler
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      console.error('Global error:', msg, url, lineNo, columnNo, error);
      if (window.errorLogger) {
        window.errorLogger.logError(error || msg);
      }
      return false;
    };
    
    // Promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
      console.error('Unhandled promise rejection:', event.reason);
      if (window.errorLogger) {
        window.errorLogger.logError(event.reason);
      }
    });
    
    try {
      // Initialize all modules
      const initializationSteps = [;
        { name: 'loading indicators', fn: () => window.loadingIndicator?.initialize() },
        { name: 'physiological validation', fn: () => typeof validatePhysiologicalValues === 'function' && validatePhysiologicalValues() },
        { name: 'form handlers', fn: () => typeof initializeFormHandlers === 'function' && initializeFormHandlers() },
        { name: 'enhanced display', fn: () => window.enhancedDisplay?.initialize() },
        { name: 'disclaimers', fn: () => window.enhancedDisclaimer?.showInitialDisclaimers() },
        { name: 'mobile optimization', fn: () => typeof initializeMobileOptimization === 'function' && initializeMobileOptimization() },
        { name: 'OpenAI integration', fn: () => typeof initializeOpenAI === 'function' && initializeOpenAI() },
        { name: 'HIPAA compliance logging', fn: () => typeof initializeHIPAALogging === 'function' && initializeHIPAALogging() },
        { name: 'XSS protection', fn: () => window.xssProtection?.initialize() },
        { name: 'CSRF protection', fn: () => window.csrfProtection?.initialize() },
        { name: 'data privacy', fn: () => window.dataPrivacy?.initialize() },
        { name: 'error logging', fn: () => window.errorLogger?.initialize() },
        { name: 'performance monitoring', fn: () => window.performanceMonitor?.initialize() }
      ];
      
      let successCount = 0;
      initializationSteps.forEach(step => {
        try {
          if (step.fn) {
            step.fn();
            console.log('✓ Initialized ' + step.name);
            successCount++;
          }
        } catch (error) {
          console.error('✗ Failed to initialize ' + step.name + ':', error);
        }
      });
      
      console.log('CVD Risk Toolkit initialization complete: ' + successCount + '/' + initializationSteps.length + ' successful');
    } catch (error) {
      console.error('Critical error during initialization:', error);
    }
  });

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      safeGet,
      debounce,
      throttle
    };
  }
  `;

  // Write the file
  fs.writeFileSync(combinedPath, combinedContent, 'utf8');
  console.log('Successfully created comprehensive combined.js');
}

// Run the function
createCompleteCombinedJS();
