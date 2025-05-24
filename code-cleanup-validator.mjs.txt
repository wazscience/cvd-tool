#!/usr/bin/env node
/**
 * Code Cleanup and Validation Tool for CVD Risk Toolkit
 * 
 * This script performs code cleanup and validation for JavaScript, HTML, and CSS files
 * to ensure consistency and best practices.
 * 
 * Usage: node code-cleanup-validator.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Get current file's directory (ES Module equivalent to __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a require function for this module
const require = createRequire(import.meta.url);

// Simple color function for console output without dependencies
const colors = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  // Simple emulation of chalk's methods
  bold: {
    blue: (text) => `\x1b[1m\x1b[34m${text}\x1b[0m`,
    green: (text) => `\x1b[1m\x1b[32m${text}\x1b[0m`, 
    red: (text) => `\x1b[1m\x1b[31m${text}\x1b[0m`
  }
};

// Configuration
const ROOT_DIR = process.cwd();
const BACKUP_DIR = path.join(ROOT_DIR, 'backups', `code-cleanup-${new Date().toISOString().replace(/:/g, '-')}`);

// Helper functions
function logInfo(message) {
  console.log(colors.blue('[INFO] ') + message);
}

function logSuccess(message) {
  console.log(colors.green('[SUCCESS] ') + message);
}

function logWarning(message) {
  console.log(colors.yellow('[WARNING] ') + message);
}

function logError(message) {
  console.log(colors.red('[ERROR] ') + message);
}

// Create backup directory
function createBackups() {
  logInfo('Creating code backups...');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  // Backup JavaScript files
  backupFiles(ROOT_DIR, BACKUP_DIR, '.js');
  
  // Backup HTML files
  backupFiles(ROOT_DIR, BACKUP_DIR, '.html');
  
  // Backup CSS files
  backupFiles(ROOT_DIR, BACKUP_DIR, '.css');
  
  logSuccess('Backups created successfully');
}

// Backup files of a specific extension
function backupFiles(sourceDir, targetDir, extension) {
  const files = findFiles(sourceDir, extension);
  
  files.forEach(file => {
    const relativePath = path.relative(ROOT_DIR, file);
    const targetFile = path.join(targetDir, relativePath);
    const targetFolder = path.dirname(targetFile);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    
    // Copy file
    fs.copyFileSync(file, targetFile);
    logInfo(`Backed up ${relativePath}`);
  });
}

// Find files with a specific extension
function findFiles(dir, extension) {
  let results = [];
  
  // Skip node_modules and backup directories
  if (dir.includes('node_modules') || dir.includes('backups')) {
    return results;
  }
  
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively search subdirectories
      results = results.concat(findFiles(filePath, extension));
    } else if (file.endsWith(extension)) {
      results.push(filePath);
    }
  });
  
  return results;
}

// Validate and fix JavaScript files
function processJavaScriptFiles() {
  logInfo('Processing JavaScript files...');
  
  const jsFiles = findFiles(ROOT_DIR, '.js');
  let validFiles = 0;
  let fixedFiles = 0;
  
  jsFiles.forEach(file => {
    // Skip node_modules and libraries
    if (file.includes('node_modules') || file.includes('lib/') || file.includes('vendor/')) {
      return;
    }
    
    try {
      // Read file content
      const content = fs.readFileSync(file, 'utf8');
      
      // Basic validation using Node's parser
      try {
        // Use dynamic import for eval to avoid security issues
        new Function(content);
        validFiles++;
      } catch (parseError) {
        logError(`Syntax error in ${file}: ${parseError.message}`);
        // No automatic fixing of syntax errors
        return;
      }
      
      // Check for common issues and fix them
      let updatedContent = content;
      let changes = 0;
      
      // Fix missing semicolons
      updatedContent = fixMissingSemicolons(updatedContent);
      if (updatedContent !== content) changes++;
      
      // Fix console.log statements (remove or comment in production)
      updatedContent = fixConsoleStatements(updatedContent);
      if (updatedContent !== content) changes++;
      
      // Fix inconsistent quotes
      updatedContent = fixInconsistentQuotes(updatedContent);
      if (updatedContent !== content) changes++;
      
      // Save changes if needed
      if (updatedContent !== content) {
        fs.writeFileSync(file, updatedContent);
        fixedFiles++;
        logSuccess(`Fixed ${changes} issues in ${file}`);
      }
    } catch (error) {
      logError(`Error processing ${file}: ${error.message}`);
    }
  });
  
  logInfo(`Processed ${jsFiles.length} JavaScript files, ${validFiles} valid, ${fixedFiles} fixed`);
  return fixedFiles;
}

// Fix missing semicolons
function fixMissingSemicolons(content) {
  // This is a simplistic approach and won't catch all cases
  // For a proper fix, a JavaScript parser like Esprima would be needed
  return content.replace(/\b(const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*([^;{}\n]+)(\n|$)/g, '$1 $2 = $3;$4');
}

// Fix console.log statements
function fixConsoleStatements(content) {
  // Comment out console.log statements but keep console.error
  return content.replace(/^(\s*)(console\.log\(.*\))(\s*(?:\/\/.*)?)?$/gm, '$1// $2$3');
}

// Fix inconsistent quotes
function fixInconsistentQuotes(content) {
  // Replace double quotes with single quotes for strings
  // This is a simplistic approach and won't handle all cases correctly
  let result = content;
  
  // Replace double quotes with single quotes when not inside single quotes
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inRegex = false;
  let inComment = false;
  let inMultilineComment = false;
  let newContent = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1] || '';
    const prevChar = content[i - 1] || '';
    
    // Handle comments
    if (!inSingleQuote && !inDoubleQuote && !inRegex) {
      if (!inComment && !inMultilineComment && char === '/' && nextChar === '/') {
        inComment = true;
      } else if (!inComment && !inMultilineComment && char === '/' && nextChar === '*') {
        inMultilineComment = true;
      } else if (inMultilineComment && prevChar === '*' && char === '/') {
        inMultilineComment = false;
      }
    }
    
    // Skip processing in comments
    if (inComment || inMultilineComment) {
      newContent += char;
      if (inComment && char === '\n') {
        inComment = false;
      }
      continue;
    }
    
    // Handle string and regex boundaries
    if (char === '/' && prevChar === '=' && !inSingleQuote && !inDoubleQuote) {
      // Possible regex start
      inRegex = true;
      newContent += char;
    } else if (char === '/' && inRegex && prevChar !== '\\') {
      // Regex end
      inRegex = false;
      newContent += char;
    } else if (char === "'" && !inDoubleQuote && !inRegex && prevChar !== '\\') {
      // Single quote boundary
      inSingleQuote = !inSingleQuote;
      newContent += char;
    } else if (char === '"' && !inSingleQuote && !inRegex && prevChar !== '\\') {
      // Double quote boundary
      if (inDoubleQuote) {
        inDoubleQuote = false;
        newContent += "'";
      } else {
        inDoubleQuote = true;
        newContent += "'";
      }
    } else if (inDoubleQuote && char === "'") {
      // Escape single quotes inside double quotes being converted
      newContent += "\\'";
    } else {
      newContent += char;
    }
  }
  
  return newContent;
}

// Validate and fix HTML files
function processHTMLFiles() {
  logInfo('Processing HTML files...');
  
  const htmlFiles = findFiles(ROOT_DIR, '.html');
  let validFiles = 0;
  let fixedFiles = 0;
  
  htmlFiles.forEach(file => {
    try {
      // Read file content
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for common issues and fix them
      let updatedContent = content;
      let changes = 0;
      
      // Fix missing DOCTYPE
      if (!updatedContent.includes('<!DOCTYPE')) {
        updatedContent = '<!DOCTYPE html>\n' + updatedContent;
        changes++;
      }
      
      // Fix missing lang attribute in html tag
      const htmlTagFix = updatedContent.replace(/<html(?!\s+[^>]*lang=)/i, '<html lang="en"');
      if (htmlTagFix !== updatedContent) {
        updatedContent = htmlTagFix;
        changes++;
      }
      
      // Fix missing meta viewport
      if (!updatedContent.includes('<meta name="viewport"')) {
        const headEndMatch = updatedContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        if (headEndMatch) {
          const headContent = headEndMatch[1];
          const newHeadContent = headContent + '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
          updatedContent = updatedContent.replace(headContent, newHeadContent);
          changes++;
        }
      }
      
      // Save changes if needed
      if (updatedContent !== content) {
        fs.writeFileSync(file, updatedContent);
        fixedFiles++;
        logSuccess(`Fixed ${changes} issues in ${file}`);
      } else {
        validFiles++;
      }
    } catch (error) {
      logError(`Error processing ${file}: ${error.message}`);
    }
  });
  
  logInfo(`Processed ${htmlFiles.length} HTML files, ${validFiles} valid, ${fixedFiles} fixed`);
  return fixedFiles;
}

// Validate and fix CSS files
function processCSSFiles() {
  logInfo('Processing CSS files...');
  
  const cssFiles = findFiles(ROOT_DIR, '.css');
  let validFiles = 0;
  let fixedFiles = 0;
  
  cssFiles.forEach(file => {
    try {
      // Read file content
      const content = fs.readFileSync(file, 'utf8');
      
      // Basic validation - check for matching braces
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        logError(`CSS validation error in ${file}: Unmatched braces (${openBraces} open, ${closeBraces} close)`);
        return;
      }
      
      // Check for common issues and fix them
      let updatedContent = content;
      let changes = 0;
      
      // Fix missing semicolons in CSS
      const fixedSemicolons = updatedContent.replace(/([^;{}])\s*}/g, '$1;}');
      if (fixedSemicolons !== updatedContent) {
        updatedContent = fixedSemicolons;
        changes++;
      }
      
      // Add trailing newline if missing
      if (!updatedContent.endsWith('\n')) {
        updatedContent += '\n';
        changes++;
      }
      
      // Save changes if needed
      if (updatedContent !== content) {
        fs.writeFileSync(file, updatedContent);
        fixedFiles++;
        logSuccess(`Fixed ${changes} issues in ${file}`);
      } else {
        validFiles++;
      }
    } catch (error) {
      logError(`Error processing ${file}: ${error.message}`);
    }
  });
  
  logInfo(`Processed ${cssFiles.length} CSS files, ${validFiles} valid, ${fixedFiles} fixed`);
  return fixedFiles;
}

// Main function
async function main() {
  console.log('\n===== CVD Tool Code Cleanup and Validation =====\n');
  
  try {
    // Create backups
    createBackups();
    
    // Process files
    const jsFixed = processJavaScriptFiles();
    const htmlFixed = processHTMLFiles();
    const cssFixed = processCSSFiles();
    
    // Output summary
    console.log('\n===== Summary =====');
    logInfo(`JavaScript files fixed: ${jsFixed}`);
    logInfo(`HTML files fixed: ${htmlFixed}`);
    logInfo(`CSS files fixed: ${cssFixed}`);
    
    const totalFixed = jsFixed + htmlFixed + cssFixed;
    if (totalFixed > 0) {
      logSuccess(`${totalFixed} files were fixed. Backups are available in: ${BACKUP_DIR}`);
    } else {
      logSuccess('No issues found that needed fixing!');
    }
    
    return 0;
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    return 1;
  }
}

// Run the main function
main().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});