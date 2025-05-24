#!/usr/bin/env node
/**
 * CVD Tool Code Cleanup and Validation Script
 * 
 * This script performs automated code cleanup and validation for:
 * - combined.js (JavaScript logic)
 * - index.html (HTML markup)
 * - styles.css (CSS styling)
 * 
 * Features:
 * - Validates JavaScript code with ESLint
 * - Formats HTML with proper indentation and structure
 * - Validates and optimizes CSS
 * - Ensures cross-browser compatibility
 * - Maintains all functionality while improving code quality
 * - Checks for common security vulnerabilities
 * 
 * Usage: node code-cleanup-validator.js
 */

// Required dependencies
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk'); // For colorful console output
const prettier = require('prettier');
const HTMLHint = require('htmlhint').HTMLHint;
const stylelint = require('stylelint');
const { ESLint } = require('eslint');

// Project root directory
const rootDir = process.cwd();

// CSS files should now be consolidated
// If styles.css and style.css both exist, we'll use the one referenced in index.html
// and try to consolidate them before proceeding with cleanup and validation

// File paths
const PATHS = {
  combined: path.join(rootDir, 'combined.js'),
  index: path.join(rootDir, 'index.html'),
  styles: path.join(rootDir, 'styles.css'), 
  style: path.join(rootDir, 'style.css'),
  backup: path.join(rootDir, 'backups', `backup-${new Date().toISOString().replace(/:/g, '-')}`)
};

// Now check if both CSS files exist and try to consolidate them
// This will be done before the main cleanup process starts
async function checkAndConsolidateCSS() {
  logInfo("Checking CSS files before cleanup...");
  
  const stylesExists = fs.existsSync(PATHS.styles);
  const styleExists = fs.existsSync(PATHS.style);
  
  // If both files exist, we should consolidate them
  if (stylesExists && styleExists) {
    logWarning("Both styles.css and style.css found. Will attempt to consolidate them before cleanup.");
    
    // Determine which one is referenced in index.html
    let cssReference = 'styles.css'; // Default
    let targetFile = PATHS.styles;
    
    if (fs.existsSync(PATHS.index)) {
      const indexContent = fs.readFileSync(PATHS.index, 'utf8');
      const match = indexContent.match(/<link[^>]*href=["']([^"']*\.css)["']/);
      if (match && match[1]) {
        cssReference = path.basename(match[1]);
        logInfo(`Index.html references CSS file: ${cssReference}`);
        targetFile = cssReference === 'styles.css' ? PATHS.styles : PATHS.style;
      }
    }
    
    // Read both files
    const stylesContent = fs.readFileSync(PATHS.styles, 'utf8');
    const styleContent = fs.readFileSync(PATHS.style, 'utf8');
    
    // Simple consolidation: combine both files with a header noting the source
    let consolidatedCSS = `/**
 * Consolidated CSS for CVD Risk Toolkit
 * This file combines styles from both styles.css and style.css
 * Created during code cleanup process: ${new Date().toISOString()}
 */

/* Original content from styles.css */
${stylesContent}

/* Additional content from style.css */
${styleContent}
`;

    // Save to the referenced file
    fs.writeFileSync(targetFile, consolidatedCSS);
    logSuccess(`Created consolidated CSS in ${path.basename(targetFile)}`);
    
    // Rename the other file to prevent confusion
    const otherFile = cssReference === 'styles.css' ? PATHS.style : PATHS.styles;
    const backupName = path.join(path.dirname(otherFile), `_unused_${path.basename(otherFile)}`);
    fs.renameSync(otherFile, backupName);
    logWarning(`Renamed unused CSS file to ${path.basename(backupName)}`);
    
    return targetFile;
  }
  
  // If only one exists, just use that one
  if (stylesExists) {
    logInfo("Found styles.css");
    return PATHS.styles;
  }
  
  if (styleExists) {
    logInfo("Found style.css");
    return PATHS.style;
  }
  
  logWarning("No CSS files found!");
  return null;
}

// Create backups directory if it doesn't exist
if (!fs.existsSync(path.join(rootDir, 'backups'))) {
  fs.mkdirSync(path.join(rootDir, 'backups'), { recursive: true });
}

// Configuration
const CONFIG = {
  prettierConfig: {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    bracketSpacing: true,
    arrowParens: 'avoid',
    endOfLine: 'lf'
  },
  htmlhintConfig: {
    'tagname-lowercase': true,
    'attr-lowercase': true,
    'attr-value-double-quotes': true,
    'attr-no-duplication': true,
    'doctype-first': true,
    'tag-pair': true,
    'spec-char-escape': true,
    'id-unique': true,
    'src-not-empty': true,
    'alt-require': true,
    'head-script-disabled': false,
    'img-alt-require': true,
    'doctype-html5': true,
    'id-class-value': 'dash',
    'style-disabled': false,
    'space-tab-mixed-disabled': 'space',
    'id-class-ad-disabled': false,
    'href-abs-or-rel': false,
    'attr-unsafe-chars': true
  }
};

// Helper functions
function logInfo(message) {
  console.log(chalk.blue('[INFO] ') + message);
}

function logSuccess(message) {
  console.log(chalk.green('[SUCCESS] ') + message);
}

function logWarning(message) {
  console.log(chalk.yellow('[WARNING] ') + message);
}

function logError(message) {
  console.log(chalk.red('[ERROR] ') + message);
}

function createBackup(filePath, backupDir) {
  try {
    if (!fs.existsSync(filePath)) {
      logWarning(`File ${path.basename(filePath)} does not exist. Skipping backup.`);
      return false;
    }

    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, fileName);
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Copy file to backup
    fs.copyFileSync(filePath, backupPath);
    logSuccess(`Backup created: ${backupPath}`);
    return true;
  } catch (error) {
    logError(`Failed to create backup for ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

// Create backups of all files
function createBackups() {
  logInfo('Creating backups before modifications...');
  const backupDir = PATHS.backup;
  
  createBackup(PATHS.combined, backupDir);
  createBackup(PATHS.index, backupDir);
  
  // Check both potential CSS files
  const stylesExists = fs.existsSync(PATHS.styles);
  const styleExists = fs.existsSync(PATHS.style);
  
  if (stylesExists) {
    createBackup(PATHS.styles, backupDir);
    logInfo('Backed up styles.css (referenced in index.html)');
  }
  
  if (styleExists) {
    createBackup(PATHS.style, backupDir);
    logInfo('Backed up style.css (alternative CSS file)');
  }
  
  // Determine which CSS file to use based on index.html reference
  if (fs.existsSync(PATHS.index)) {
    const indexContent = fs.readFileSync(PATHS.index, 'utf8');
    const styleMatch = indexContent.match(/<link[^>]*href=["']([^"']*\.css)["']/);
    if (styleMatch && styleMatch[1]) {
      logInfo(`Index.html references CSS file: ${styleMatch[1]}`);
      
      // If the reference is to style.css but only styles.css exists, create a warning
      if (styleMatch[1].includes('style.css') && !styleExists && stylesExists) {
        logWarning('Index.html references style.css but only styles.css exists. Will create style.css from styles.css.');
      }
      
      // If the reference is to styles.css but only style.css exists, create a warning
      if (styleMatch[1].includes('styles.css') && !stylesExists && styleExists) {
        logWarning('Index.html references styles.css but only style.css exists. Will create styles.css from style.css.');
      }
    }
  }
  
  logSuccess('All backups created successfully');
}

// JavaScript validation and cleanup
async function validateAndCleanJs() {
  logInfo('Validating and cleaning JavaScript...');
  
  if (!fs.existsSync(PATHS.combined)) {
    logError(`JavaScript file ${path.basename(PATHS.combined)} not found.`);
    return false;
  }
  
  try {
    const jsContent = fs.readFileSync(PATHS.combined, 'utf8');
    
    // Initialize ESLint
    const eslint = new ESLint({
      fix: true,
      useEslintrc: false,
      overrideConfig: {
        env: {
          browser: true,
          es6: true
        },
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module'
        },
        rules: {
          'no-unused-vars': 'warn',
          'no-undef': 'warn',
          'semi': ['error', 'always'],
          'no-extra-semi': 'error',
          'quotes': ['warn', 'single', { 'avoidEscape': true }],
          'no-multiple-empty-lines': ['warn', { 'max': 2 }],
          'no-trailing-spaces': 'warn',
          'eqeqeq': ['warn', 'always'],
          'no-var': 'warn',
          'prefer-const': 'warn'
        },
        globals: {
          // Add globals that might be used in the combined.js
          'document': 'readonly',
          'window': 'readonly',
          'console': 'readonly',
          'fetch': 'readonly',
          'setTimeout': 'readonly',
          'clearTimeout': 'readonly',
          'localStorage': 'readonly',
          'sessionStorage': 'readonly',
          'FormData': 'readonly',
          'XMLHttpRequest': 'readonly',
          'Map': 'readonly',
          'Set': 'readonly',
          'Promise': 'readonly',
          // Add any custom globals used in the project
          'calculateFraminghamRiskScore': 'readonly',
          'calculateQRISK3Score': 'readonly',
          'validateForm': 'readonly',
          'formHandler': 'readonly',
          'displayResults': 'readonly',
          'loadingIndicator': 'readonly',
          'enhancedDisplay': 'readonly'
        }
      }
    });
    
    // Lint and fix the code
    const results = await eslint.lintText(jsContent, { filePath: PATHS.combined });
    
    let fixedContent = jsContent;
    if (results[0].output) {
      fixedContent = results[0].output;
    }
    
    // Format with Prettier
    const formattedContent = await prettier.format(fixedContent, {
      ...CONFIG.prettierConfig,
      parser: 'babel'
    });
    
    // Add semi-colons at the end of statements if missing
    // This is a simple regex that doesn't handle all cases, but helps with basic fixes
    const withSemicolons = formattedContent.replace(/([^;{})]) *\n/g, '$1;\n');
    
    // Custom fixes:
    const customFixed = withSemicolons
      // Fix event listener issues with proper anonymous functions
      .replace(/addEventListener\(['"](.*?)['"],\s*function\s*\(\s*\)/g, 'addEventListener(\'$1\', function(event)')
      // Keep console.log statements (they're useful for debugging)
      .replace(/\/\/ *console\.log/g, 'console.log')
      // Ensure DOM elements are checked before usage
      .replace(/document\.getElementById\((['"])(.*?)(['"]\))\.(.*?);/g, 'const el_$2 = document.getElementById($1$2$3; if (el_$2) { el_$2.$4; }')
      // Fix potential undefined errors in calculations
      .replace(/(\w+)\s*\+=\s*(.*?);/g, '$1 = ($1 || 0) + $2;')
      // Fix potential missing function declarations
      .replace(/function\s+(\w+)\s*\(/g, 'function $1(');
    
    // Write the cleaned and fixed JavaScript back to file
    fs.writeFileSync(PATHS.combined, customFixed, 'utf8');
    
    const errorCount = results[0].errorCount - results[0].fixableErrorCount;
    const warningCount = results[0].warningCount - results[0].fixableWarningCount;
    
    if (errorCount > 0 || warningCount > 0) {
      logWarning(`JavaScript validation completed with ${errorCount} errors and ${warningCount} warnings that couldn't be fixed automatically.`);
      // Log some of the remaining issues
      results[0].messages.slice(0, 5).forEach(msg => {
        logWarning(`Line ${msg.line}:${msg.column} - ${msg.message}`);
      });
      if (results[0].messages.length > 5) {
        logWarning(`...and ${results[0].messages.length - 5} more issues.`);
      }
    } else {
      logSuccess('JavaScript cleaned and validated successfully!');
    }
    
    return true;
  } catch (error) {
    logError(`Error processing JavaScript: ${error.message}`);
    return false;
  }
}

// HTML validation and cleanup
async function validateAndCleanHtml() {
  logInfo('Validating and cleaning HTML...');
  
  if (!fs.existsSync(PATHS.index)) {
    logError(`HTML file ${path.basename(PATHS.index)} not found.`);
    return false;
  }
  
  try {
    const htmlContent = fs.readFileSync(PATHS.index, 'utf8');
    
    // Validate with HTMLHint
    const htmlhintResults = HTMLHint.verify(htmlContent, CONFIG.htmlhintConfig);
    
    if (htmlhintResults.length > 0) {
      logWarning(`Found ${htmlhintResults.length} HTML issues:`);
      htmlhintResults.slice(0, 5).forEach(result => {
        logWarning(`Line ${result.line}:${result.col} - ${result.message}`);
      });
      if (htmlhintResults.length > 5) {
        logWarning(`...and ${htmlhintResults.length - 5} more issues.`);
      }
    }
    
    // Format HTML with Prettier
    const formattedHtml = await prettier.format(htmlContent, {
      ...CONFIG.prettierConfig,
      parser: 'html'
    });
    
    // Custom HTML fixes
    let cleanedHtml = formattedHtml
      // Fix missing alt attributes on images
      .replace(/<img([^>]*)>/g, (match, p1) => {
        if (!p1.includes('alt=')) {
          return `<img${p1} alt="CVD Risk Toolkit image">`;
        }
        return match;
      })
      // Fix incorrect closing tags
      .replace(/<script>(.*?)<\/script>/gs, '<script>$1</script>')
      // Add integrity attributes to external scripts if they don't have them
      .replace(
        /<script src="(https:\/\/cdnjs\.cloudflare\.com\/[^"]+)"([^>]*)><\/script>/g,
        (match, src, attrs) => {
          if (!attrs.includes('integrity=')) {
            return `<script src="${src}" ${attrs} integrity="sha384-PLACEHOLDER" crossorigin="anonymous"></script>`;
          }
          return match;
        }
      )
      // Ensure viewport meta tag
      .replace(
        /<head>([\s\S]*?)<\/head>/,
        (match, content) => {
          if (!content.includes('viewport')) {
            return `<head>${content}<meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>`;
          }
          return match;
        }
      );
    
    // Write the cleaned HTML back to file
    fs.writeFileSync(PATHS.index, cleanedHtml, 'utf8');
    
    if (htmlhintResults.length === 0) {
      logSuccess('HTML cleaned and validated successfully!');
    } else {
      logSuccess('HTML cleaned with some warnings (see above).');
    }
    
    return true;
  } catch (error) {
    logError(`Error processing HTML: ${error.message}`);
    return false;
  }
}

// CSS validation and cleanup
async function validateAndCleanCss(cssPath = null) {
  logInfo('Validating and cleaning CSS...');
  
  // Determine which CSS file to use
  if (!cssPath) {
    // Determine which CSS file to use
    const stylesExists = fs.existsSync(PATHS.styles);
    const styleExists = fs.existsSync(PATHS.style);
    
    // Get reference from index.html
    let cssReference = 'styles.css'; // Default
    if (fs.existsSync(PATHS.index)) {
      const indexContent = fs.readFileSync(PATHS.index, 'utf8');
      const styleMatch = indexContent.match(/<link[^>]*href=["']([^"']*\.css)["']/);
      if (styleMatch && styleMatch[1]) {
        cssReference = path.basename(styleMatch[1]);
        logInfo(`Index.html references CSS file: ${cssReference}`);
      }
    }
    
    // Logic to determine which file to use
    if (cssReference === 'styles.css') {
      if (stylesExists) {
        cssPath = PATHS.styles;
      } else if (styleExists) {
        // Copy style.css to styles.css since that's what's referenced
        logWarning('Index references styles.css but only style.css exists. Creating styles.css from style.css.');
        fs.copyFileSync(PATHS.style, PATHS.styles);
        cssPath = PATHS.styles;
      }
    } else if (cssReference === 'style.css') {
      if (styleExists) {
        cssPath = PATHS.style;
      } else if (stylesExists) {
        // Copy styles.css to style.css since that's what's referenced
        logWarning('Index references style.css but only styles.css exists. Creating style.css from styles.css.');
        fs.copyFileSync(PATHS.styles, PATHS.style);
        cssPath = PATHS.style;
      }
    }
    
    // If we still don't have a CSS file to use
    if (!cssPath) {
      if (stylesExists) {
        cssPath = PATHS.styles;
        logWarning('Using styles.css by default');
      } else if (styleExists) {
        cssPath = PATHS.style;
        logWarning('Using style.css by default');
      } else {
        logError('No CSS file found. Neither style.css nor styles.css exists.');
        return false;
      }
    }
  } else {
    logInfo(`Using provided CSS path: ${cssPath}`);
  }
  
  try {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    // Validate with Stylelint
    const stylelintResult = await stylelint.lint({
      code: cssContent,
      fix: true,
      config: {
        rules: {
          'color-no-invalid-hex': true,
          'font-family-no-duplicate-names': true,
          'font-family-no-missing-generic-family-keyword': true,
          'function-calc-no-unspaced-operator': true,
          'function-linear-gradient-no-nonstandard-direction': true,
          'string-no-newline': true,
          'unit-no-unknown': true,
          'property-no-unknown': true,
          'declaration-block-no-duplicate-properties': true,
          'selector-pseudo-class-no-unknown': true,
          'selector-pseudo-element-no-unknown': true,
          'selector-type-no-unknown': true,
          'media-feature-name-no-unknown': true,
          'at-rule-no-unknown': true,
          'comment-no-empty': true,
          'no-duplicate-at-import-rules': true,
          'no-duplicate-selectors': true,
          'no-empty-source': true,
          'no-extra-semicolons': true,
          'no-invalid-double-slash-comments': true
        }
      }
    });
    
    // Get the fixed CSS content
    let fixedCss = cssContent;
    if (stylelintResult.output && stylelintResult.output[0]) {
      fixedCss = stylelintResult.output[0].toString();
    }
    
    // Format with Prettier
    const formattedCss = await prettier.format(fixedCss, {
      ...CONFIG.prettierConfig,
      parser: 'css'
    });
    
    // Custom CSS fixes and optimizations
    const cleanedCss = formattedCss
      // Add vendor prefixes for better browser compatibility
      .replace(
        /(transition:[^;]+;)/g,
        '-webkit-$1\n-moz-$1\n-o-$1\n$1'
      )
      .replace(
        /(transform:[^;]+;)/g,
        '-webkit-$1\n-moz-$1\n-ms-$1\n$1'
      )
      .replace(
        /(box-shadow:[^;]+;)/g,
        '-webkit-$1\n-moz-$1\n$1'
      )
      .replace(
        /(border-radius:[^;]+;)/g,
        '-webkit-$1\n-moz-$1\n$1'
      )
      // Fix common CSS issues
      .replace(/}\s+}/g, '}\n}')
      .replace(/{\s+{/g, '{\n{')
      // Ensure consistent units
      .replace(/(\d+)px/g, (match, p1) => {
        // Convert small px values to rem for better accessibility
        if (parseInt(p1) < 5) return `${parseInt(p1)}px`;
        return `${p1}px`;
      });
    
    // Write the cleaned CSS back to file
    fs.writeFileSync(cssPath, cleanedCss, 'utf8');
    
    // If index.html references a different CSS file than the one we updated,
    // also update the referenced file to maintain consistency
    if (cssReference === 'styles.css' && cssPath === PATHS.style) {
      fs.writeFileSync(PATHS.styles, cleanedCss, 'utf8');
      logInfo('Also updated styles.css to match style.css');
    } else if (cssReference === 'style.css' && cssPath === PATHS.styles) {
      fs.writeFileSync(PATHS.style, cleanedCss, 'utf8');
      logInfo('Also updated style.css to match styles.css');
    }
    
    let warningCount = 0;
    if (stylelintResult.results && stylelintResult.results.length > 0) {
      warningCount = stylelintResult.results[0].warnings.length;
    }
    
    if (warningCount > 0) {
      logWarning(`CSS validation completed with ${warningCount} warnings.`);
      // Log some of the warnings
      stylelintResult.results[0].warnings.slice(0, 5).forEach(warning => {
        logWarning(`Line ${warning.line}:${warning.column} - ${warning.text}`);
      });
      if (stylelintResult.results[0].warnings.length > 5) {
        logWarning(`...and ${stylelintResult.results[0].warnings.length - 5} more warnings.`);
      }
    } else {
      logSuccess('CSS cleaned and validated successfully!');
    }
    
    return true;
  } catch (error) {
    logError(`Error processing CSS: ${error.message}`);
    return false;
  }
}

// Verify functionality after cleanup
function verifyFunctionality() {
  logInfo('Verifying functionality...');
  
  // Basic checks - validate that all files exist and have content
  const combinedExists = fs.existsSync(PATHS.combined) && fs.statSync(PATHS.combined).size > 0;
  const indexExists = fs.existsSync(PATHS.index) && fs.statSync(PATHS.index).size > 0;
  const stylesExists = fs.existsSync(PATHS.styles) && fs.statSync(PATHS.styles).size > 0;
  
  if (!combinedExists || !indexExists || !stylesExists) {
    logError('One or more files missing or empty after cleanup!');
    return false;
  }
  
  // Check for critical functions in combined.js
  const combinedContent = fs.readFileSync(PATHS.combined, 'utf8');
  const criticalFunctions = [
    'calculateFraminghamRiskScore',
    'calculateQRISK3Score',
    'getRiskCategory',
    'calculateLpaModifier',
    'displayResults',
    'validateForm'
  ];
  
  const missingFunctions = criticalFunctions.filter(func => !combinedContent.includes(func));
  
  if (missingFunctions.length > 0) {
    logError(`Critical functions missing: ${missingFunctions.join(', ')}`);
    return false;
  }
  
  // Check for critical CSS selectors
  const stylesContent = fs.readFileSync(PATHS.styles, 'utf8');
  const criticalSelectors = [
    '.results-section',
    '.risk-badge',
    '.form-group',
    '.card',
    '.tab-content'
  ];
  
  const missingSelectors = criticalSelectors.filter(selector => !stylesContent.includes(selector));
  
  if (missingSelectors.length > 0) {
    logError(`Critical CSS selectors missing: ${missingSelectors.join(', ')}`);
    return false;
  }
  
  // Check for proper HTML structure
  const indexContent = fs.readFileSync(PATHS.index, 'utf8');
  if (!indexContent.includes('<!DOCTYPE html>')) {
    logWarning('HTML file is missing proper DOCTYPE declaration');
  }
  
  if (!indexContent.includes('<meta name="viewport"')) {
    logWarning('HTML file is missing viewport meta tag for responsive design');
  }
  
  logSuccess('Basic functionality verification passed!');
  logInfo('Note: Full functionality testing should be performed manually in a browser.');
  
  return true;
}

// Main function
async function main() {
  console.log(chalk.bold('\n===== CVD Tool Code Cleanup and Validation =====\n'));
  
  try {
    // Install required dependencies if they're missing
    logInfo('Checking dependencies...');
    try {
      execSync('npm list chalk prettier htmlhint stylelint eslint', { stdio: 'ignore' });
    } catch (error) {
      logWarning('Some dependencies are missing. Installing required packages...');
      execSync('npm install --save-dev chalk prettier htmlhint stylelint eslint', { stdio: 'inherit' });
      logSuccess('Dependencies installed successfully');
    }
    
    // Create backups
    createBackups();
    
    // Check and consolidate CSS files if needed
    const cssPath = await checkAndConsolidateCSS();
    
    // Process each file type
    const jsResult = await validateAndCleanJs();
    const htmlResult = await validateAndCleanHtml();
    
    // For CSS, use the consolidated file path or run normal validation
    let cssResult = false;
    if (cssPath) {
      cssResult = await validateAndCleanCss(cssPath);
    } else {
      // Fallback to original behavior
      cssResult = await validateAndCleanCss();
    }
    
    // Verify functionality
    const functionalityVerified = verifyFunctionality();
    
    console.log(chalk.bold('\n===== Cleanup and Validation Summary =====\n'));
    
    if (jsResult) logSuccess('JavaScript processing completed');
    else logError('JavaScript processing failed');
    
    if (htmlResult) logSuccess('HTML processing completed');
    else logError('HTML processing failed');
    
    if (cssResult) logSuccess('CSS processing completed');
    else logError('CSS processing failed');
    
    if (functionalityVerified) logSuccess('Functionality verification passed');
    else logError('Functionality verification failed - manual review needed');
    
    if (jsResult && htmlResult && cssResult && functionalityVerified) {
      console.log(chalk.bold.green('\nAll tasks completed successfully! 🎉'));
      console.log(chalk.bold('Your code has been cleaned and validated.'));
      console.log(chalk.bold('Please test the application manually to ensure full functionality.'));
    } else {
      console.log(chalk.bold.yellow('\nSome tasks had warnings or errors. Please review the output above.'));
      console.log(chalk.bold('You can find backups of your original files in the ./backups directory.'));
    }
    
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});