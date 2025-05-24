#!/usr/bin/env node
/**
 * unified-cleanup.js - Master script to run code cleanup, validation, and CSS consolidation
 * Updated to use ESM imports and modern chalk
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { execSync } from 'child_process';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create backup directory with timestamp
const TIMESTAMP = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const BACKUP_DIR = `backups/backup_${TIMESTAMP}`;

// Function to print colored log messages
function logInfo(message) {
  console.log(`${chalk.blue('[INFO]')} ${message}`);
}

function logSuccess(message) {
  console.log(`${chalk.green('[SUCCESS]')} ${message}`);
}

function logWarning(message) {
  console.log(`${chalk.yellow('[WARNING]')} ${message}`);
}

function logError(message) {
  console.log(`${chalk.red('[ERROR]')} ${message}`);
}

// Function to check if a script exists or needs to be downloaded
async function checkScript(scriptName, scriptUrl) {
  if (!fs.existsSync(scriptName)) {
    logWarning(`${scriptName} not found. Downloading...`);
    
    try {
      // Use fetch for downloading (modern alternative to curl)
      const response = await fetch(scriptUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }
      
      const scriptContent = await response.text();
      fs.writeFileSync(scriptName, scriptContent);
      fs.chmodSync(scriptName, 0o755); // Make executable
      
      logSuccess(`Downloaded ${scriptName} successfully`);
    } catch (error) {
      logError(`Failed to download ${scriptName}: ${error.message}`);
      return false;
    }
  } else {
    logInfo(`${scriptName} already exists`);
  }
  
  return true;
}

// Create backup function
function createBackup() {
  logInfo(`Creating backups in ${BACKUP_DIR}...`);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  // Copy files to backup directory
  const filesToBackup = [
    'combined.js',
    'index.html',
    'styles.css',
    'style.css'
  ];
  
  for (const file of filesToBackup) {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, `${BACKUP_DIR}/${file}`);
      logSuccess(`Backed up ${file}`);
    } else {
      logWarning(`${file} not found, skipping backup`);
    }
  }
}

// Step 1: Install Dependencies
async function installDependencies() {
  logInfo('Installing required dependencies...');
  
  // Check if Node.js is installed
  try {
    const nodeVersion = execSync('node -v').toString().trim();
    logSuccess(`Node.js version: ${nodeVersion}`);
  } catch (error) {
    logError('Node.js is not installed! Please install Node.js first.');
    process.exit(1);
  }
  
  // Check if npm is installed
  try {
    const npmVersion = execSync('npm -v').toString().trim();
    logSuccess(`npm version: ${npmVersion}`);
  } catch (error) {
    logError('npm is not installed! Please install npm first.');
    process.exit(1);
  }
  
  // Install required npm packages
  try {
    logInfo('Installing required packages...');
    execSync('npm install chalk@5.3.0 prettier htmlhint stylelint eslint', { stdio: 'inherit' });
    logSuccess('Dependencies installed successfully');
  } catch (error) {
    logError(`Failed to install dependencies: ${error.message}`);
    return false;
  }
  
  return true;
}

// Step 2: Consolidate CSS Files
async function consolidateCSS() {
  logInfo('Consolidating CSS files...');
  
  // Check if the CSS consolidation script exists
  if (fs.existsSync('consolidate-css.js')) {
    try {
      execSync('node consolidate-css.js', { stdio: 'inherit' });
      logSuccess('CSS consolidation completed');
      return true;
    } catch (error) {
      logError(`CSS consolidation encountered an error: ${error.message}`);
      return false;
    }
  } else {
    // Simple consolidation if the dedicated script doesn't exist
    logWarning('consolidate-css.js not found, performing basic consolidation');
    
    try {
      // Determine which CSS file to use as target
      let cssTarget = 'styles.css';
      
      if (fs.existsSync('index.html')) {
        const indexContent = fs.readFileSync('index.html', 'utf8');
        const match = indexContent.match(/<link[^>]*href=["']([^"']*\.css)["']/);
        if (match && match[1]) {
          cssTarget = path.basename(match[1]);
          logInfo(`Will consolidate to ${cssTarget} (referenced in index.html)`);
        }
      }
      
      // Check if both files exist
      if (fs.existsSync('styles.css') && fs.existsSync('style.css')) {
        // Create a consolidation header
        let combinedContent = `/**
 * Consolidated CSS for CVD Risk Toolkit
 * This file combines styles from both styles.css and style.css
 * Created: ${new Date().toISOString()}
 */

`;
        
        // Add the content of both files
        combinedContent += `/* Original content from styles.css */\n`;
        combinedContent += fs.readFileSync('styles.css', 'utf8');
        combinedContent += `\n\n/* Additional content from style.css */\n`;
        combinedContent += fs.readFileSync('style.css', 'utf8');
        
        // Replace the target with the consolidated file
        fs.writeFileSync(cssTarget, combinedContent);
        
        // Remove the non-target CSS file
        if (cssTarget === 'styles.css') {
          fs.renameSync('style.css', 'style.css.bak');
          logInfo('Renamed style.css to style.css.bak');
        } else {
          fs.renameSync('styles.css', 'styles.css.bak');
          logInfo('Renamed styles.css to styles.css.bak');
        }
        
        logSuccess('Basic CSS consolidation completed');
        return true;
      } else {
        logInfo('Only one CSS file found, no consolidation needed');
        return true;
      }
    } catch (error) {
      logError(`Error during basic CSS consolidation: ${error.message}`);
      return false;
    }
  }
}

// Step 3: Run Code Cleanup and Validation
async function runCodeCleanup() {
  logInfo('Running code cleanup and validation...');
  
  // Check if the cleanup script exists
  if (fs.existsSync('code-cleanup-validator.js')) {
    try {
      execSync('node code-cleanup-validator.js', { stdio: 'inherit' });
      logSuccess('Code cleanup and validation completed');
      return true;
    } catch (error) {
      logError(`Code cleanup and validation encountered an error: ${error.message}`);
      return false;
    }
  } else {
    // Perform basic cleanup if the dedicated script doesn't exist
    logWarning('code-cleanup-validator.js not found! Performing basic code validation instead.');
    
    let hasErrors = false;
    
    // Check combined.js syntax
    if (fs.existsSync('combined.js')) {
      try {
        execSync('node --check combined.js');
        logSuccess('combined.js syntax validation passed');
      } catch (error) {
        logError(`combined.js contains syntax errors: ${error.message}`);
        hasErrors = true;
      }
    } else {
      logWarning('combined.js not found, skipping validation');
    }
    
    // Check index.html basic structure
    if (fs.existsSync('index.html')) {
      const htmlContent = fs.readFileSync('index.html', 'utf8');
      if (!htmlContent.includes('<!DOCTYPE html>') || !htmlContent.includes('<html')) {
        logError('index.html may be missing proper HTML structure!');
        hasErrors = true;
      } else {
        logSuccess('index.html basic structure validation passed');
      }
    } else {
      logWarning('index.html not found, skipping validation');
    }
    
    return !hasErrors;
  }
}

// Step 4: Fix Common Issues
async function fixCommonIssues() {
  logInfo('Fixing common issues...');
  
  // Check if the fix script exists
  if (fs.existsSync('fix-common-issues.js')) {
    try {
      execSync('node fix-common-issues.js', { stdio: 'inherit' });
      logSuccess('Common issues fixed');
      return true;
    } catch (error) {
      logError(`Common issues fixing encountered an error: ${error.message}`);
      return false;
    }
  } else {
    logWarning('fix-common-issues.js not found, skipping this step');
    return true;
  }
}

// Step 5: Fix CSS braces if needed
async function fixCSSBraces() {
  logInfo('Checking CSS files for brace balance issues...');
  
  // Check if the fix script exists
  if (fs.existsSync('fix-css-braces.js')) {
    try {
      execSync('node fix-css-braces.js', { stdio: 'inherit' });
      logSuccess('CSS brace check and fix completed');
      return true;
    } catch (error) {
      logError(`CSS brace fixing encountered an error: ${error.message}`);
      return false;
    }
  } else {
    logWarning('fix-css-braces.js not found, performing basic check');
    
    // Basic check for CSS brace balance
    const cssFiles = [];
    if (fs.existsSync('styles.css')) cssFiles.push('styles.css');
    if (fs.existsSync('style.css')) cssFiles.push('style.css');
    
    if (cssFiles.length === 0) {
      logWarning('No CSS files found to check');
      return true;
    }
    
    let hasErrors = false;
    
    for (const cssFile of cssFiles) {
      const cssContent = fs.readFileSync(cssFile, 'utf8');
      const openBraces = (cssContent.match(/{/g) || []).length;
      const closeBraces = (cssContent.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        logError(`${cssFile} has unmatched braces! Open: ${openBraces}, Close: ${closeBraces}`);
        hasErrors = true;
      } else {
        logSuccess(`${cssFile} has balanced braces (${openBraces} pairs)`);
      }
    }
    
    return !hasErrors;
  }
}

// Step 6: Verify Results
async function verifyResults() {
  logInfo('Verifying results...');
  
  let hasErrors = false;
  
  // Check if the critical files exist
  if (!fs.existsSync('combined.js')) {
    logError('combined.js is missing!');
    hasErrors = true;
  }
  
  if (!fs.existsSync('index.html')) {
    logError('index.html is missing!');
    hasErrors = true;
  }
  
  // Find the CSS file referenced in index.html
  let cssRef = null;
  if (fs.existsSync('index.html')) {
    const indexContent = fs.readFileSync('index.html', 'utf8');
    const match = indexContent.match(/<link[^>]*href=["']([^"']*\.css)["']/);
    if (match && match[1]) {
      cssRef = path.basename(match[1]);
    }
  }
  
  if (cssRef && !fs.existsSync(cssRef)) {
    logError(`Referenced CSS file ${cssRef} is missing!`);
    hasErrors = true;
  }
  
  // Basic validation of JS file
  if (fs.existsSync('combined.js')) {
    try {
      execSync('node --check combined.js');
      logSuccess('combined.js syntax validation passed');
    } catch (error) {
      logError(`combined.js contains syntax errors!`);
      hasErrors = true;
    }
  }
  
  // Check index.html basic structure
  if (fs.existsSync('index.html')) {
    const indexContent = fs.readFileSync('index.html', 'utf8');
    if (!indexContent.includes('<!DOCTYPE html>') || !indexContent.includes('<html')) {
      logError('index.html may be missing proper HTML structure!');
      hasErrors = true;
    } else {
      logSuccess('index.html structure validation passed');
    }
  }
  
  // CSS validation - check for matching braces
  if (cssRef && fs.existsSync(cssRef)) {
    const cssContent = fs.readFileSync(cssRef, 'utf8');
    const openBraces = (cssContent.match(/{/g) || []).length;
    const closeBraces = (cssContent.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      logError(`${cssRef} has unmatched braces! Open: ${openBraces}, Close: ${closeBraces}`);
      hasErrors = true;
    } else {
      logSuccess(`${cssRef} has balanced braces (${openBraces} pairs)`);
    }
  } else {
    logWarning('No CSS file found to validate');
  }
  
  if (!hasErrors) {
    logSuccess('Basic validation passed. Please test the application thoroughly.');
  }
  
  return !hasErrors;
}

// Main execution
async function main() {
  console.log(chalk.bold('\n========================================================'));
  console.log(chalk.bold('         UNIFIED CVD TOOL CLEANUP AND VALIDATION          '));
  console.log(chalk.bold('========================================================\n'));
  
  logInfo('Starting unified cleanup process...');
  
  // Create backups first
  createBackup();
  
  // Check and run each step
  const dependenciesInstalled = await installDependencies();
  if (!dependenciesInstalled) {
    logError('Failed to install dependencies, skipping remaining steps.');
    process.exit(1);
  }
  
  const cssFixed = await fixCSSBraces();
  
  const cssConsolidated = await consolidateCSS();
  
  const codeCleanedUp = await runCodeCleanup();
  
  const issuesFixed = await fixCommonIssues();
  
  const verified = await verifyResults();
  
  // Check overall result
  if (cssFixed && cssConsolidated && codeCleanedUp && issuesFixed && verified) {
    console.log('\n========================================================');
    logSuccess('Unified cleanup process completed successfully!');
    console.log('Your code has been cleaned, validated, and CSS files have been consolidated.');
    console.log(`Backups of original files are available in: ${BACKUP_DIR}`);
    console.log('Please test the application thoroughly to ensure all functionality works.');
    console.log('========================================================');
    process.exit(0);
  } else {
    console.log('\n========================================================');
    logError('Unified cleanup process encountered errors.');
    console.log('Please check the output above for details.');
    console.log(`Backups of original files are available in: ${BACKUP_DIR}`);
    console.log('========================================================');
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});