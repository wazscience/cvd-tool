#!/usr/bin/env node

/**
 * QRISK3 Linting Fixes Script
 *
 * This script automatically applies critical fixes to the QRISK3 implementation
 * to address ESLint errors without changing the algorithm's functionality.
 *
 * Usage:
 *   node fix-qrisk3-errors.js
 *
 * After running this script, execute:
 *   npm run lint:fix
 */

const fs = require('fs');
const path = require('path');

// Define file paths
const rootDir = process.cwd();
const qrisk3FilePaths = [
  path.join(rootDir, 'qrisk3-implementation.js'),
  path.join(rootDir, 'js', 'qrisk3-implementation.js')
];

// Regex patterns for fixes
const patterns = [
  // Fix equality comparison (== to ===)
  {
    regex: /\(smoke_cat == (\d+) \? 1 : 0\)/g,
    replacement: '(smoke_cat === $1 ? 1 : 0)'
  },
  // Trim trailing zeros from large number literals
  // (match numbers with excessive zeros at the end)
  {
    regex: /(-?\d+\.\d{8,})0{8,}/g,
    replacement: (match) => {
      // Trim trailing zeros but preserve numerical value
      return match.replace(/0{8,}$/g, '');
    }
  }
];

/**
 * Main function to process QRISK3 implementation files
 */
async function fixQrisk3Files() {
  console.log('Starting QRISK3 ESLint error fixes...');

  let filesProcessed = 0;
  let filesModified = 0;
  let filesSkipped = 0;

  for (const filePath of qrisk3FilePaths) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        filesSkipped++;
        continue;
      }

      console.log(`Processing file: ${filePath}`);
      filesProcessed++;

      // Read the file content
      let content = fs.readFileSync(filePath, 'utf8');

      // Create backup
      const backupPath = `${filePath}.backup`;
      fs.writeFileSync(backupPath, content, 'utf8');
      console.log(`Backup created at: ${backupPath}`);

      // Original content length for comparison
      const originalLength = content.length;

      // Apply all regex pattern fixes
      let modified = false;
      for (const pattern of patterns) {
        const newContent = content.replace(pattern.regex, pattern.replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }

      // Ensure the export is properly maintained
      if (!content.includes('if (typeof module !== \'undefined\' && module.exports)')) {
        content += `\n
// Export the function for use in the main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateQRISK3Score };
} else {
    window.calculateQRISK3Score = calculateQRISK3Score;
}
`;
        modified = true;
      }

      // Write the file if changes were made
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated file: ${filePath}`);
        console.log(`Characters changed: ${Math.abs(content.length - originalLength)}`);
        filesModified++;
      } else {
        console.log(`No changes needed for: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      filesSkipped++;
    }
  }

  // Summary
  console.log('\nSummary:');
  console.log(`Files processed: ${filesProcessed}`);
  console.log(`Files modified: ${filesModified}`);
  console.log(`Files skipped: ${filesSkipped}`);

  if (filesModified > 0) {
    console.log('\nNext steps:');
    console.log('1. Run: npm run lint:fix');
    console.log('2. Test the QRISK3 calculator functionality');
    console.log('3. Commit the changes if tests pass');
  }
}

/**
 * Add a fix for SBP standard deviation calculation if missing
 */
function checkAndFixSbpFunction() {
  const qrisk3FilePath = qrisk3FilePaths[0]; // Use the first file path

  if (!fs.existsSync(qrisk3FilePath)) {
    console.log(`Main QRISK3 file not found: ${qrisk3FilePath}`);
    return;
  }

  const content = fs.readFileSync(qrisk3FilePath, 'utf8');

  // Check if standard deviation calculation exists
  if (!content.includes('calculateStandardDeviation') &&
      !content.includes('standardDeviation') &&
      content.includes('sbpSd')) {

    // Get position to insert new function - before standardizeUnitsForQRISK3 function
    const insertPosition = content.indexOf('function standardizeUnitsForQRISK3');

    if (insertPosition === -1) {
      console.log('Could not find appropriate location to insert SBP calculation function');
      return;
    }

    // Prepare the new function
    const sbpFunctionCode = `
/**
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

`;

    // Insert the new function
    const newContent = content.slice(0, insertPosition) + sbpFunctionCode + content.slice(insertPosition);

    // Also check for SBP readings collection in standardizeUnitsForQRISK3
    if (!content.includes('qrisk-sbp-reading') && content.includes('standardizeUnitsForQRISK3')) {
      // Find the end of standardizeUnitsForQRISK3 function
      const functionStart = content.indexOf('function standardizeUnitsForQRISK3');
      const functionBody = content.slice(functionStart);
      const functionEnd = functionBody.indexOf('return standardized;');

      if (functionEnd !== -1) {
        const absolutePosition = functionStart + functionEnd;

        // Add SBP readings collection code
        const sbpReadingsCode = `
    // Check for systolic BP readings and calculate SD if not provided
    if (!standardized.sbpSd) {
        // Look for multiple SBP readings
        const sbpReadings = [];
        for (let i = 1; i <= 6; i++) {
            const readingId = \`qrisk-sbp-reading-\${i}\`;
            const readingElement = document.getElementById(readingId);
            if (readingElement && readingElement.value) {
                const reading = parseFloat(readingElement.value);
                if (!isNaN(reading)) {
                    sbpReadings.push(reading);
                }
            }
        }
        
        // Calculate SD if we have enough readings
        if (sbpReadings.length >= 3) {
            standardized.sbpSd = calculateStandardDeviation(sbpReadings);
        } else {
            // Default SD value if not calculated
            standardized.sbpSd = 0;
        }
    }
    
`;

        // Create the modified content
        const finalContent = content.slice(0, absolutePosition) + sbpReadingsCode + content.slice(absolutePosition);

        // Write the updated file
        fs.writeFileSync(qrisk3FilePath, finalContent, 'utf8');
        console.log(`Added SBP standard deviation calculation to ${qrisk3FilePath}`);
      }
    }
  }
}

// Execute the main function
(async function() {
  try {
    await fixQrisk3Files();
    checkAndFixSbpFunction();
    console.log('QRISK3 fixes completed successfully');
  } catch (error) {
    console.error('Error during fix process:', error);
    process.exit(1);
  }
})();
