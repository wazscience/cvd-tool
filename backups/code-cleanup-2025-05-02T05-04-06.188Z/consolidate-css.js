#!/usr/bin/env node
/**
 * CSS File Consolidation for CVD Risk Toolkit
 * 
 * This script consolidates styles.css and style.css into a single comprehensive CSS file
 * that provides full implementation of all features.
 * 
 * Usage: node consolidate-css.js
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk'); // For colorful console output

// Configuration
const ROOT_DIR = process.cwd();
const CSS_FILES = {
  styles: path.join(ROOT_DIR, 'styles.css'),
  style: path.join(ROOT_DIR, 'style.css')
};
const INDEX_HTML = path.join(ROOT_DIR, 'index.html');
const BACKUP_DIR = path.join(ROOT_DIR, 'backups', `css-consolidation-${new Date().toISOString().replace(/:/g, '-')}`);

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

// Create backup directory
function createBackups() {
  logInfo('Creating backups...');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  // Backup styles.css if it exists
  if (fs.existsSync(CSS_FILES.styles)) {
    fs.copyFileSync(CSS_FILES.styles, path.join(BACKUP_DIR, 'styles.css'));
    logSuccess('Backed up styles.css');
  }
  
  // Backup style.css if it exists
  if (fs.existsSync(CSS_FILES.style)) {
    fs.copyFileSync(CSS_FILES.style, path.join(BACKUP_DIR, 'style.css'));
    logSuccess('Backed up style.css');
  }
  
  // Backup index.html since we may need to modify the CSS reference
  if (fs.existsSync(INDEX_HTML)) {
    fs.copyFileSync(INDEX_HTML, path.join(BACKUP_DIR, 'index.html'));
    logSuccess('Backed up index.html');
  }
}

// Consolidate CSS files
function consolidateCSS() {
  logInfo('Starting CSS consolidation...');
  
  // Check if files exist
  const stylesExists = fs.existsSync(CSS_FILES.styles);
  const styleExists = fs.existsSync(CSS_FILES.style);
  
  if (!stylesExists && !styleExists) {
    logError('No CSS files found to consolidate.');
    return false;
  }
  
  // Determine target filename from index.html reference
  let targetFile = CSS_FILES.styles; // Default to styles.css
  let cssReference = 'styles.css';
  
  if (fs.existsSync(INDEX_HTML)) {
    const indexContent = fs.readFileSync(INDEX_HTML, 'utf8');
    const match = indexContent.match(/<link[^>]*href=["']([^"']*\.css)["']/);
    if (match && match[1]) {
      cssReference = path.basename(match[1]);
      targetFile = path.join(ROOT_DIR, cssReference);
      logInfo(`Found CSS reference in index.html: ${cssReference}`);
    }
  }
  
  // Read content from both files if available
  let combinedCSS = '';
  let stylesContent = '';
  let styleContent = '';
  
  if (stylesExists) {
    stylesContent = fs.readFileSync(CSS_FILES.styles, 'utf8');
    logInfo(`Read ${stylesContent.length} bytes from styles.css`);
  }
  
  if (styleExists) {
    styleContent = fs.readFileSync(CSS_FILES.style, 'utf8');
    logInfo(`Read ${styleContent.length} bytes from style.css`);
  }
  
  // Start creating the consolidated CSS
  // Add file header
  combinedCSS = `/**
 * Consolidated CSS for CVD Risk Toolkit
 * This file combines styles from both styles.css and style.css
 * Created: ${new Date().toISOString()}
 */

`;

  // First add the primary reference file (the one referenced in index.html)
  if (cssReference === 'styles.css' && stylesExists) {
    combinedCSS += stylesContent;
    
    // If style.css also exists, merge its content
    if (styleExists) {
      // Add section separator
      combinedCSS += `

/* ====== Additional styles from style.css ====== */

`;
      combinedCSS += styleContent;
    }
  } else if (cssReference === 'style.css' && styleExists) {
    combinedCSS += styleContent;
    
    // If styles.css also exists, merge its content
    if (stylesExists) {
      // Add section separator
      combinedCSS += `

/* ====== Additional styles from styles.css ====== */

`;
      combinedCSS += stylesContent;
    }
  } else {
    // If the referenced file doesn't exist, use whichever one does
    if (stylesExists) {
      combinedCSS += stylesContent;
    } else {
      combinedCSS += styleContent;
    }
  }
  
  // Deduplicate and clean up the CSS
  combinedCSS = deduplicateCSS(combinedCSS);
  
  // Write consolidated file to the referenced file path
  fs.writeFileSync(targetFile, combinedCSS);
  logSuccess(`Created consolidated CSS file: ${path.basename(targetFile)}`);
  
  // Update index.html if needed to ensure it references the right file
  updateIndexHTML(cssReference);
  
  // Remove the non-referenced file if it exists
  const nonReferencedFile = cssReference === 'styles.css' ? CSS_FILES.style : CSS_FILES.styles;
  if (fs.existsSync(nonReferencedFile)) {
    logInfo(`Removing unused CSS file: ${path.basename(nonReferencedFile)}`);
    fs.unlinkSync(nonReferencedFile);
    logSuccess(`Removed ${path.basename(nonReferencedFile)}`);
  }
  
  return true;
}

// Clean and deduplicate CSS
function deduplicateCSS(css) {
  logInfo('Deduplicating and optimizing CSS...');
  
  // Extract all CSS rule blocks
  const ruleRegex = /([^{]*){([^}]*)}/g;
  const rules = {};
  let match;
  
  // Extract all rules
  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    const properties = match[2].trim();
    
    if (!rules[selector]) {
      rules[selector] = properties;
    } else {
      // If we found a duplicate selector, merge the properties
      const existingProps = parseProperties(rules[selector]);
      const newProps = parseProperties(properties);
      
      // Merge properties, with newer ones overriding older ones
      const mergedProps = { ...existingProps, ...newProps };
      
      // Convert back to CSS string
      rules[selector] = Object.entries(mergedProps)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join('\n  ');
    }
  }
  
  // Regenerate CSS
  let dedupedCSS = '';
  for (const [selector, properties] of Object.entries(rules)) {
    // Skip empty rules
    if (!properties.trim()) continue;
    
    dedupedCSS += `${selector} {\n  ${properties}\n}\n\n`;
  }
  
  // Add some common sections for organization
  dedupedCSS = dedupedCSS
    .replace(/\/\* ===+ .* ===+ \*\/\n\n/g, '') // Remove existing section headers
    .replace(/(html|body|:root)[^{]*{/g, '/* ====== Base Styles ====== */\n\n$&') // Add base section
    .replace(/(@media[^{]*){/g, '\n/* ====== Media Queries ====== */\n\n$&') // Add media queries section
    .replace(/\.dark-theme[^{]*{/g, '\n/* ====== Theme Variables ====== */\n\n$&') // Add theme section
    .replace(/(@keyframes[^{]*){/g, '\n/* ====== Animations ====== */\n\n$&'); // Add animations section
  
  logSuccess('CSS deduplication and optimization complete');
  return dedupedCSS;
}

// Helper to parse CSS properties into an object
function parseProperties(propsString) {
  const result = {};
  const propsArray = propsString.split(';').filter(p => p.trim());
  
  for (const prop of propsArray) {
    const [name, ...valueParts] = prop.split(':');
    const value = valueParts.join(':').trim(); // Handle URLs which contain colons
    
    if (name && value) {
      result[name.trim()] = value;
    }
  }
  
  return result;
}

// Update index.html to reference the correct CSS file
function updateIndexHTML(cssReference) {
  if (!fs.existsSync(INDEX_HTML)) {
    logWarning('index.html not found, skipping update');
    return;
  }
  
  let indexContent = fs.readFileSync(INDEX_HTML, 'utf8');
  const match = indexContent.match(/<link[^>]*href=["']([^"']*\.css)["']/);
  
  if (match) {
    const currentRef = match[1];
    const baseName = path.basename(currentRef);
    
    // Only update if the reference doesn't match
    if (baseName !== cssReference) {
      logInfo(`Updating index.html to reference ${cssReference} instead of ${baseName}`);
      indexContent = indexContent.replace(
        /<link[^>]*href=["']([^"']*\.css)["']/,
        `<link rel="stylesheet" href="${cssReference}"`
      );
      
      fs.writeFileSync(INDEX_HTML, indexContent);
      logSuccess('Updated index.html CSS reference');
    }
  } else {
    logWarning('Could not find CSS link tag in index.html');
  }
}

// Analyze CSS file sizes and content
function analyzeCSS() {
  logInfo('Analyzing CSS files...');
  
  const stylesExists = fs.existsSync(CSS_FILES.styles);
  const styleExists = fs.existsSync(CSS_FILES.style);
  
  if (stylesExists) {
    const content = fs.readFileSync(CSS_FILES.styles, 'utf8');
    const ruleCount = (content.match(/{/g) || []).length;
    const mediaQueryCount = (content.match(/@media/g) || []).length;
    
    logInfo(`styles.css: ${content.length} bytes, ~${ruleCount} rules, ${mediaQueryCount} media queries`);
  }
  
  if (styleExists) {
    const content = fs.readFileSync(CSS_FILES.style, 'utf8');
    const ruleCount = (content.match(/{/g) || []).length;
    const mediaQueryCount = (content.match(/@media/g) || []).length;
    
    logInfo(`style.css: ${content.length} bytes, ~${ruleCount} rules, ${mediaQueryCount} media queries`);
  }
  
  // Check for overlap
  if (stylesExists && styleExists) {
    const stylesContent = fs.readFileSync(CSS_FILES.styles, 'utf8');
    const styleContent = fs.readFileSync(CSS_FILES.style, 'utf8');
    
    // Extract selectors from both files
    const stylesSelectors = extractSelectors(stylesContent);
    const styleSelectors = extractSelectors(styleContent);
    
    // Find overlaps
    const overlaps = stylesSelectors.filter(selector => styleSelectors.includes(selector));
    
    logInfo(`Found ${overlaps.length} overlapping selectors between the files`);
    
    if (overlaps.length > 0) {
      logInfo(`Sample overlapping selectors: ${overlaps.slice(0, 5).join(', ')}${overlaps.length > 5 ? '...' : ''}`);
    }
  }
}

// Extract selectors from CSS content
function extractSelectors(cssContent) {
  const selectors = [];
  const ruleRegex = /([^{]*){([^}]*)}/g;
  let match;
  
  while ((match = ruleRegex.exec(cssContent)) !== null) {
    selectors.push(match[1].trim());
  }
  
  return selectors;
}

// Main execution function
async function main() {
  console.log(chalk.bold('\n===== CVD Tool CSS Consolidation =====\n'));
  
  try {
    // Install required dependencies if missing
    try {
      require('chalk');
    } catch (error) {
      logWarning('Installing required dependencies...');
      require('child_process').execSync('npm install chalk', { stdio: 'inherit' });
    }
    
    // First analyze the CSS files
    analyzeCSS();
    
    // Create backups
    createBackups();
    
    // Consolidate CSS files
    const success = consolidateCSS();
    
    if (success) {
      console.log(chalk.bold.green('\nCSS consolidation completed successfully! 🎉'));
      console.log(chalk.bold(`All styles have been consolidated into a single CSS file referenced by index.html.`));
      console.log(chalk.bold(`Backups of the original files are available in: ${BACKUP_DIR}`));
    } else {
      console.log(chalk.bold.red('\nCSS consolidation failed.'));
      console.log(chalk.bold(`Please check the logs above for errors.`));
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