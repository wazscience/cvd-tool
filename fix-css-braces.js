#!/usr/bin/env node
/**
 * fix-css-braces.js
 * Script to fix unbalanced braces in CSS files
 */

// Import dependencies using ESM syntax
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = process.cwd();
const BACKUP_DIR = path.join(ROOT_DIR, 'backups', `css-fix-${new Date().toISOString().replace(/:/g, '-')}`);
const CSS_FILE_PATH = path.join(ROOT_DIR, 'styles.css');

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

// Create backup
function createBackup() {
  logInfo('Creating backup...');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  try {
    fs.copyFileSync(CSS_FILE_PATH, path.join(BACKUP_DIR, 'styles.css.bak'));
    logSuccess('Backup created at ' + path.join(BACKUP_DIR, 'styles.css.bak'));
    return true;
  } catch (error) {
    logError(`Failed to create backup: ${error.message}`);
    return false;
  }
}

// Check for unbalanced braces
function checkBraces(content) {
  let openBraces = 0;
  let closeBraces = 0;
  const bracePositions = [];
  
  // Count braces and track positions
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') {
      openBraces++;
      bracePositions.push({ type: 'open', position: i, line: getLineNumber(content, i) });
    } else if (content[i] === '}') {
      closeBraces++;
      bracePositions.push({ type: 'close', position: i, line: getLineNumber(content, i) });
    }
  }
  
  logInfo(`Found ${openBraces} opening braces and ${closeBraces} closing braces`);
  
  return {
    balanced: openBraces === closeBraces,
    openBraces,
    closeBraces,
    diff: openBraces - closeBraces,
    bracePositions
  };
}

// Get line number for a position in the string
function getLineNumber(content, position) {
  const lines = content.substring(0, position).split('\n');
  return lines.length;
}

// Find unbalanced braces and fix them
function fixUnbalancedBraces(content) {
  const braceCheck = checkBraces(content);
  
  if (braceCheck.balanced) {
    logSuccess('CSS file has balanced braces. No fix needed.');
    return content;
  }
  
  logWarning(`Unbalanced braces: ${braceCheck.diff} more ${braceCheck.diff > 0 ? 'opening' : 'closing'} braces`);
  
  // Create an array of brace objects for matching
  const braces = [];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') {
      braces.push({ type: 'open', position: i, matched: false });
    } else if (content[i] === '}') {
      // Find the most recent unmatched opening brace
      let matchedIndex = -1;
      for (let j = braces.length - 1; j >= 0; j--) {
        if (braces[j].type === 'open' && !braces[j].matched) {
          braces[j].matched = true;
          matchedIndex = j;
          break;
        }
      }
      
      if (matchedIndex === -1) {
        // No matching opening brace found for this closing brace
        braces.push({ type: 'close', position: i, matched: false });
      } else {
        braces.push({ type: 'close', position: i, matched: true });
      }
    }
  }
  
  // Find unmatched braces
  const unmatchedBraces = braces.filter(brace => !brace.matched);
  logInfo(`Found ${unmatchedBraces.length} unmatched braces`);
  
  // Fix the CSS based on the unmatched braces
  let fixedContent = content;
  
  if (braceCheck.diff > 0) {
    // More opening braces, need to add closing braces
    logInfo('Adding missing closing braces...');
    
    // Sort unmatched open braces by position (descending)
    const unmatchedOpenBraces = unmatchedBraces
      .filter(brace => brace.type === 'open')
      .sort((a, b) => b.position - a.position);
    
    // Insert closing braces for each unmatched opening brace
    let insertedCount = 0;
    for (const brace of unmatchedOpenBraces) {
      // Find an appropriate position to insert a closing brace
      // Look for the next rule start or the end of the file
      const nextRuleRegex = /\n\s*([a-zA-Z#.][^{]*{)/g;
      nextRuleRegex.lastIndex = brace.position;
      const match = nextRuleRegex.exec(fixedContent);
      
      let insertPosition;
      if (match) {
        // Insert before the next rule
        insertPosition = match.index;
      } else {
        // Insert at the end of the file
        insertPosition = fixedContent.length;
      }
      
      // Insert the closing brace
      fixedContent = fixedContent.substring(0, insertPosition) + 
                    '\n} /* auto-added closing brace */\n' + 
                    fixedContent.substring(insertPosition);
      
      insertedCount++;
      
      if (insertedCount >= braceCheck.diff) {
        break; // Only add as many braces as needed
      }
    }
    
    logSuccess(`Added ${insertedCount} closing braces to balance the CSS`);
    
  } else if (braceCheck.diff < 0) {
    // More closing braces, need to remove some
    logInfo('Removing extra closing braces...');
    
    // Sort unmatched close braces by position (descending)
    const unmatchedCloseBraces = unmatchedBraces
      .filter(brace => brace.type === 'close')
      .sort((a, b) => b.position - a.position);
    
    // Remove extra closing braces
    let removedCount = 0;
    for (const brace of unmatchedCloseBraces) {
      // Get a small window around the brace for context
      const start = Math.max(0, brace.position - 20);
      const end = Math.min(fixedContent.length, brace.position + 20);
      const context = fixedContent.substring(start, end);
      
      logInfo(`Removing closing brace near: ${context.replace(/\n/g, ' ')}`);
      
      // Remove the closing brace
      fixedContent = fixedContent.substring(0, brace.position) + 
                    '/* removed extra closing brace */' + 
                    fixedContent.substring(brace.position + 1);
      
      removedCount++;
      
      if (removedCount >= Math.abs(braceCheck.diff)) {
        break; // Only remove as many braces as needed
      }
    }
    
    logSuccess(`Removed ${removedCount} extra closing braces`);
  }
  
  // Verify that the fix worked
  const verificationCheck = checkBraces(fixedContent);
  if (verificationCheck.balanced) {
    logSuccess('Successfully balanced all braces!');
  } else {
    logWarning(`Braces are still unbalanced: ${verificationCheck.diff} more ${verificationCheck.diff > 0 ? 'opening' : 'closing'} braces`);
    logInfo('You may need to manually fix the remaining issues');
  }
  
  return fixedContent;
}

// Detect CSS files
function detectCSSFiles() {
  logInfo('Detecting CSS files...');
  
  const cssFiles = [];
  
  // Check for the default CSS file
  if (fs.existsSync(CSS_FILE_PATH)) {
    cssFiles.push(CSS_FILE_PATH);
  }
  
  // Check for style.css
  const styleFilePath = path.join(ROOT_DIR, 'style.css');
  if (fs.existsSync(styleFilePath)) {
    cssFiles.push(styleFilePath);
  }
  
  // Check for reference in index.html
  const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');
    const matches = indexContent.match(/<link[^>]*href=["']([^"']*\.css)["']/g);
    
    if (matches) {
      for (const match of matches) {
        const hrefMatch = match.match(/href=["']([^"']*)["']/);
        if (hrefMatch && hrefMatch[1]) {
          const cssPath = path.join(ROOT_DIR, hrefMatch[1]);
          if (fs.existsSync(cssPath) && !cssFiles.includes(cssPath)) {
            cssFiles.push(cssPath);
          }
        }
      }
    }
  }
  
  return cssFiles;
}

// Fix all CSS files
function fixAllCSSFiles() {
  const cssFiles = detectCSSFiles();
  
  if (cssFiles.length === 0) {
    logWarning('No CSS files found to fix');
    return false;
  }
  
  logInfo(`Found ${cssFiles.length} CSS files: ${cssFiles.map(file => path.basename(file)).join(', ')}`);
  
  let fixedAny = false;
  
  for (const cssFile of cssFiles) {
    logInfo(`Processing ${path.basename(cssFile)}...`);
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // Create backup
    const backupPath = path.join(BACKUP_DIR, `${path.basename(cssFile)}.bak`);
    fs.copyFileSync(cssFile, backupPath);
    logSuccess(`Backed up ${path.basename(cssFile)} to ${path.basename(backupPath)}`);
    
    // Read and fix CSS
    const content = fs.readFileSync(cssFile, 'utf8');
    const braceCheck = checkBraces(content);
    
    if (!braceCheck.balanced) {
      const fixedContent = fixUnbalancedBraces(content);
      
      // Save the fixed content
      fs.writeFileSync(cssFile, fixedContent);
      logSuccess(`Fixed and saved ${path.basename(cssFile)}`);
      
      fixedAny = true;
    } else {
      logSuccess(`${path.basename(cssFile)} already has balanced braces, no fix needed`);
    }
  }
  
  return fixedAny;
}

// Main execution
async function main() {
  console.log(chalk.bold('\n===== CSS Brace Balance Checker =====\n'));
  
  try {
    const success = fixAllCSSFiles();
    
    if (success) {
      console.log(chalk.bold.green('\nCSS files fixed successfully! 🎉'));
      console.log(chalk.bold(`Backups of the original files are available in: ${BACKUP_DIR}`));
    } else {
      console.log(chalk.yellow('\nNo CSS files needed fixing.'));
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