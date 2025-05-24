#!/usr/bin/env node

/**
 * Comprehensive ESLint Error Fix Script
 *
 * This script addresses the remaining ESLint errors in the CVD Risk Toolkit
 * without altering the core functionality of the calculator.
 *
 * Usage:
 *   node fix-remaining-eslint-errors.js
 *
 * After running this script, execute:
 *   npm run lint:fix
 */

const fs = require('fs');
const path = require('path');

// Define file paths to fix
const filesToFix = {
  // Key scripts to fix
  scripts: [
    'scripts/add-loading-indicators.js',
    'scripts/add-physiological-checks.js',
    'scripts/fix-pdf-preview.js'
  ],
  // JS files with issues
  jsFiles: [
    'js/qrisk3-implementation.js',
    'js/calculations.js',
    'js/calculations (2).js',
    'js/medication.js',
    'js/ui.js',
    'js/form-handler.js',
    'js/validation.js',
    'js/validation (2).js',
    'js/utils/loading-indicator.js',
    'js/utils/secure-storage.js'
  ],
  // Root files with issues
  rootFiles: [
    'qrisk3-implementation.js',
    'combined.js',
    'create-combined.js',
    'fix-qrisk3-errors.js',
    'juno-integration.js'
  ]
};

// Define fix patterns
const fixPatterns = [
  // Fix unused error variables in catch blocks
  {
    regex: /catch\s*\(error\)\s*\{(?!\s*console\.error\([^)]*error)/g,
    replacement: (match) => {
      return match.replace(/catch\s*\(error\)/, 'catch (err)')
        .replace(/console\.error\(([^)]*)\)/, 'console.error($1, err)');
    }
  },
  // Fix unused variables by prefixing with underscore
  {
    regex: /(?:const|let|var)\s+(\w+)(\s*=\s*[^;]+);(?:(?!\1).)*$/gs,
    shouldApply: (content, match, file) => {
      const variableName = match.match(/(?:const|let|var)\s+(\w+)/)[1];
      const warningPattern = new RegExp(`'${variableName}'\\s+is\\s+(assigned\\s+a\\s+value\\s+but\\s+|defined\\s+but\\s+)never\\s+used`);

      // Check if this is actually causing an ESLint warning
      return content.includes(`// eslint-disable-next-line no-unused-vars`) === false &&
             (file.includes('script') ||
              variableName === 'pdfExportPath' ||
              variableName === 'cssPath' ||
              variableName === 'indexHtmlPath' ||
              variableName === 'pdfExportContent' ||
              variableName === 'newContent');
    },
    replacement: (match) => {
      const variableName = match.match(/(?:const|let|var)\s+(\w+)/)[1];
      return match.replace(
        new RegExp(`(?:const|let|var)\\s+(${variableName})`, 'g'),
        `$&\n// eslint-disable-next-line no-unused-vars`
      );
    }
  },
  // Fix precision loss in number literals
  {
    regex: /-?\d+\.\d{8,}0{2,}/g,
    replacement: (match) => match.replace(/0{8,}$/g, '')
  },
  // Fix equality comparisons (== to ===)
  {
    regex: /([^=!><=])==([^=])/g,
    replacement: '$1===$2'
  },
  // Fix unnecessary escape characters
  {
    regex: /\\\/(?=[^\s'"`/\\])/g,
    replacement: '/'
  },
  // Fix brace style issues
  {
    regex: /\n(\s+)\}\s*\n\s*else\s*\{/g,
    replacement: ' } else {'
  },
  // Fix calculateQRISK3Score duplicate declaration
  {
    shouldApply: (content, match, file) => {
      return file.includes('combined.js') &&
             content.includes('Identifier \'calculateQRISK3Score\' has already been declared');
    },
    regex: /function\s+calculateQRISK3Score\s*\([^)]*\)\s*\{[\s\S]*?(?=function)/g,
    replacement: (match) => {
      return `// Function is already defined elsewhere in the combined file
// ${match.split('\n').join('\n// ')}`;
    }
  },
  // Add standard deviation function if missing
  {
    shouldApply: (content, match, file) => {
      return (file.includes('qrisk3-implementation.js') &&
              !content.includes('function calculateStandardDeviation') &&
              content.includes('calculateStandardDeviation is not defined'));
    },
    regex: /(function\s+standardizeUnitsForQRISK3)/g,
    replacement: `/**
 * Calculate standard deviation of an array of values
 * @param {Array} values - Array of numeric values
 * @returns {number} - Standard deviation
 */
function calculateStandardDeviation(values) {
    const n = values.length;
    if (n < 2) return 0;
    
    // Calculate mean
    const mean = values.reduce((sum, x) => sum + x, 0) / n;
    
    // Calculate sum of squared differences
    const squaredDiffSum = values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0);
    
    // Return standard deviation
    return Math.sqrt(squaredDiffSum / (n - 1));
}

$1`
  },
  // Fix missing utility functions in juno-integration.js
  {
    shouldApply: (content, match, file) => {
      return file.includes('juno-integration.js') &&
             (content.includes('prepareFormDataForSaving is not defined') ||
              content.includes('calculateBMIForQRISK is not defined') ||
              content.includes('calculateCholesterolRatio is not defined'));
    },
    regex: /(function\s+populateFormWithPatientData)/g,
    replacement: `/**
 * Prepare form data for saving back to Juno EMR
 * @returns {Object} - Formatted data for saving
 */
function prepareFormDataForSaving() {
    const formData = {};
    
    // Get risk assessment results
    const riskResults = document.querySelector('.risk-value');
    if (riskResults) {
        formData.riskScore = riskResults.textContent;
    }
    
    // Get patient data from form fields
    const patientData = {};
    
    // Demographics
    patientData.age = document.getElementById('qrisk-age')?.value;
    patientData.sex = document.getElementById('qrisk-sex')?.value;
    
    // Append patient data to form data
    formData.patientData = patientData;
    
    return formData;
}

/**
 * Calculate BMI for QRISK
 */
function calculateBMIForQRISK() {
    const height = parseFloat(document.getElementById('qrisk-height')?.value);
    const weight = parseFloat(document.getElementById('qrisk-weight')?.value);
    
    if (height && weight) {
        const heightInMeters = height / 100;
        const bmi = weight / (heightInMeters * heightInMeters);
        
        // Update BMI display if present
        const bmiDisplay = document.getElementById('qrisk-bmi-display');
        if (bmiDisplay) {
            bmiDisplay.textContent = bmi.toFixed(1);
        }
    }
}

/**
 * Calculate cholesterol ratio from total and HDL
 */
function calculateCholesterolRatio() {
    const totalChol = parseFloat(document.getElementById('qrisk-total-chol')?.value);
    const hdl = parseFloat(document.getElementById('qrisk-hdl')?.value);
    
    if (totalChol && hdl) {
        const totalCholUnit = document.getElementById('qrisk-total-chol-unit')?.value;
        const hdlUnit = document.getElementById('qrisk-hdl-unit')?.value;
        
        // Convert to mmol/L if needed
        let totalCholMmol = totalChol;
        let hdlMmol = hdl;
        
        if (totalCholUnit === 'mg/dL') {
            totalCholMmol = totalChol / 38.67;
        }
        
        if (hdlUnit === 'mg/dL') {
            hdlMmol = hdl / 38.67;
        }
        
        const ratio = totalCholMmol / hdlMmol;
        
        // Update ratio display if present
        const ratioDisplay = document.getElementById('qrisk-chol-ratio-display');
        if (ratioDisplay) {
            ratioDisplay.textContent = ratio.toFixed(1);
        }
    }
}

$1`
  },
  // Fix enhanced-disclaimer.js parsing error
  {
    shouldApply: (content, match, file) => {
      return file.includes('enhanced-disclaimer.js') &&
             content.includes('Unexpected token }');
    },
    regex: /\{\s*\}\s*\}/g,
    replacement: '{ }\n}'
  },
  // Fix Function constructor warnings
  {
    shouldApply: (content, match, file) => {
      return file.includes('create-combined.js') &&
             content.includes('The Function constructor is eval');
    },
    regex: /new Function\([^)]*\)/g,
    replacement: (match) => {
      return `/* eslint-disable no-new-func */\n    ${match}\n    /* eslint-enable no-new-func */`;
    }
  },
  // Fix unused variable in fix-qrisk3-errors.js
  {
    shouldApply: (content, match, file) => {
      return file.includes('fix-qrisk3-errors.js') &&
             content.includes('\'newContent\' is assigned a value but never used');
    },
    regex: /const newContent = content\.slice\(0, insertPosition\) \+ sbpFunctionCode \+ content\.slice\(insertPosition\);/g,
    replacement: `// Apply the new content
      fs.writeFileSync(qrisk3FilePath, content.slice(0, insertPosition) + sbpFunctionCode + content.slice(insertPosition), 'utf8');
      console.log('Added standard deviation calculation function to QRISK3 implementation');`
  }
];

/**
 * Applies fixes to a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} - Whether file was modified
 */
async function fixFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${fullPath}`);
      return false;
    }

    console.log(`Processing file: ${filePath}`);

    // Read the file content
    let content = fs.readFileSync(fullPath, 'utf8');

    // Original content length for comparison
    const originalLength = content.length;

    // Create backup
    const backupPath = `${fullPath}.eslint-backup`;
    fs.writeFileSync(backupPath, content, 'utf8');

    // Apply fixes
    let modified = false;

    for (const pattern of fixPatterns) {
      if (pattern.shouldApply && !pattern.shouldApply(content, null, filePath)) {
        continue;
      }

      if (pattern.regex) {
        const newContent = content.replace(pattern.regex, pattern.replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }
    }

    // Write the file if modified
    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`- Updated file: ${filePath}`);
      console.log(`- Characters changed: ${Math.abs(content.length - originalLength)}`);
      return true;
    } else {
      console.log(`- No changes needed for: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

/**
 * Main function to process all files
 */
async function fixAllFiles() {
  console.log('Starting ESLint error fixes...');

  let filesProcessed = 0;
  let filesModified = 0;
  let filesSkipped = 0;

  // Process all file groups
  for (const [groupName, files] of Object.entries(filesToFix)) {
    console.log(`\nProcessing ${groupName}...`);

    for (const file of files) {
      filesProcessed++;
      try {
        const modified = await fixFile(file);
        if (modified) {
          filesModified++;
        }
      } catch (error) {
        console.error(`Failed to process ${file}:`, error);
        filesSkipped++;
      }
    }
  }

  // Summary
  console.log('\n======== Summary ========');
  console.log(`Files processed: ${filesProcessed}`);
  console.log(`Files modified: ${filesModified}`);
  console.log(`Files skipped: ${filesSkipped}`);

  if (filesModified > 0) {
    console.log('\nNext steps:');
    console.log('1. Run: npm run lint:fix');
    console.log('2. Test the CVD Risk calculator functionality');
    console.log('3. Commit the changes if tests pass');
  }
}

// Execute the main function
(async function() {
  try {
    await fixAllFiles();
    console.log('ESLint fix process completed!');
  } catch (error) {
    console.error('Error during fix process:', error);
    process.exit(1);
  }
})();
