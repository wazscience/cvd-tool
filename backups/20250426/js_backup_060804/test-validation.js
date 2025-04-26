const fs = require('fs');
const path = require('path');

console.log('Validating CVD Risk Toolkit enhancements...');

// Files that should exist after enhancements
const requiredFiles = [
  'js/calculations.js',
  'js/validation.js',
  'js/utils/secure-storage.js',
  'js/utils/loading-indicator.js',
  'styles.css'
];

// Check each required file
let missingFiles = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    missingFiles.push(file);
  }
}

// Check for CSP in index.html
let indexHtml = '';
let hasCsp = false;
try {
  indexHtml = fs.readFileSync('index.html', 'utf8');
  hasCsp = indexHtml.includes('Content-Security-Policy');
} catch (err) {
  console.error('Error reading index.html:', err);
}

// Print validation results
if (missingFiles.length > 0) {
  console.error('Validation failed: Missing files:');
  missingFiles.forEach(file => console.error(` - ${file}`));
  process.exit(1);
} else {
  console.log('✓ All required files exist');
}

if (!hasCsp) {
  console.error('Validation failed: Content Security Policy not found in index.html');
  process.exit(1);
} else {
  console.log('✓ Content Security Policy found in index.html');
}

console.log('All validations passed successfully!');
process.exit(0);
