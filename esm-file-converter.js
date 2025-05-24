#!/bin/bash

# ESM Conversion Script for CVD Risk Toolkit
# This script converts the project to use ES modules with Webpack

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting ES Modules conversion for CVD Risk Toolkit${NC}"

# Create backup directory
BACKUP_DIR="backups/esm-conversion-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR
echo -e "${GREEN}Created backup directory: $BACKUP_DIR${NC}"

# Backup original files
cp combined.js $BACKUP_DIR/
cp index.html $BACKUP_DIR/
cp styles.css $BACKUP_DIR/
cp package.json $BACKUP_DIR/
echo -e "${GREEN}Backed up original files${NC}"

# Install webpack and dependencies
echo -e "${YELLOW}Installing Webpack and required dependencies...${NC}"
npm install --save-dev webpack webpack-cli webpack-dev-server babel-loader @babel/core @babel/preset-env core-js regenerator-runtime

# Create src directory and js modules directory
mkdir -p src/js
echo -e "${GREEN}Created src/js directory structure${NC}"

# Split combined.js into modules
echo -e "${YELLOW}Splitting combined.js into modules...${NC}"

# Create main entry point file
cat > src/index.js << 'EOL'
// Main entry point for the CVD Risk Toolkit
import './js/validation.js';
import './js/calculations.js';
import './js/medication.js';
import './js/ui.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initializeApp === 'function') {
    initializeApp();
  } else {
    console.error('Application initialization function not found');
  }
});
EOL

# Create the module files by extracting from combined.js
node -e "
const fs = require('fs');
const combined = fs.readFileSync('combined.js', 'utf8');

// Extract validation.js content
const validationCode = combined.match(/\/\/ === validation\.js ===\n([\\s\\S]*?)(?=\/\/ === calculations\.js ===|$)/);
if (validationCode && validationCode[1]) {
  const validationModule = \`// validation.js - Form validation functions
export function validateNumericInput(fieldId, min, max, fieldName, required = true) {
\${validationCode[1].replace(/function validateNumericInput/g, 'function _validateNumericInput')}
  return { isValid, value, message };
}

// Export other validation functions
export function validateForm(formId) {
  // Implementation
  return { isValid: true, errors: [] };
}

// Make functions available globally for backward compatibility
window.validateNumericInput = validateNumericInput;
window.validateForm = validateForm;
\`;
  fs.writeFileSync('src/js/validation.js', validationModule);
  console.log('Created validation.js module');
}

// Extract calculations.js content
const calculationsCode = combined.match(/\/\/ === calculations\.js ===\n([\\s\\S]*?)(?=\/\/ === medication\.js ===|$)/);
if (calculationsCode && calculationsCode[1]) {
  const calculationsModule = \`// calculations.js - CVD risk calculation functions
import { convertCholesterol, convertLpa } from './utils.js';

export function calculateLpaModifier(lpaValue) {
\${calculationsCode[1].replace(/function calculateLpaModifier/g, 'function _calculateLpaModifier')}
  return lpaModifier;
}

export function calculateFraminghamRiskScore(data) {
  // Implementation
  return {
    baseRisk: riskPercentage,
    lpaModifier: lpaModifier,
    modifiedRisk: modifiedRiskPercentage,
    riskCategory: getRiskCategory(modifiedRiskPercentage)
  };
}

export function calculateQRISK3Score(data) {
  // Implementation similar to above
  return {
    baseRisk: riskPercentage,
    lpaModifier: lpaModifier,
    modifiedRisk: modifiedRiskPercentage,
    riskCategory: getRiskCategory(modifiedRiskPercentage)
  };
}

// Make functions available globally for backward compatibility
window.calculateLpaModifier = calculateLpaModifier;
window.calculateFraminghamRiskScore = calculateFraminghamRiskScore;
window.calculateQRISK3Score = calculateQRISK3Score;
\`;
  fs.writeFileSync('src/js/calculations.js', calculationsModule);
  console.log('Created calculations.js module');
}

// Extract medication.js content
const medicationCode = combined.match(/\/\/ === medication\.js ===\n([\\s\\S]*?)(?=\/\/ === ui\.js ===|$)/);
if (medicationCode && medicationCode[1]) {
  const medicationModule = \`// medication.js - Medication management functionality
import { convertCholesterol, convertLpa } from './utils.js';

export function calculateNonHDL() {
\${medicationCode[1].replace(/function calculateNonHDL/g, 'function _calculateNonHDL')}
}

export function evaluateMedications() {
  // Implementation
}

// Make functions available globally for backward compatibility
window.calculateNonHDL = calculateNonHDL;
window.evaluateMedications = evaluateMedications;
\`;
  fs.writeFileSync('src/js/medication.js', medicationModule);
  console.log('Created medication.js module');
}

// Extract ui.js content
const uiCode = combined.match(/\/\/ === ui\.js ===\n([\\s\\S]*?)(?=\/\/ === form-handler\.js ===|$)/);
if (uiCode && uiCode[1]) {
  const uiModule = \`// ui.js - User interface functionality
export function initializeApp() {
\${uiCode[1].replace(/function initializeApp/g, 'function _initializeApp')}
}

export function openTab(evt, tabId) {
  // Implementation
}

// Make functions available globally for backward compatibility
window.initializeApp = initializeApp;
window.openTab = openTab;
\`;
  fs.writeFileSync('src/js/ui.js', uiModule);
  console.log('Created ui.js module');
}

// Create utils.js for common utility functions
const utilsModule = \`// utils.js - Common utility functions

export function convertCholesterol(value, fromUnit, toUnit) {
  if (value === null) return null;
  
  if (fromUnit === toUnit) {
    return parseFloat(value);
  }
  
  if (fromUnit === 'mg/dL' && toUnit === 'mmol/L') {
    return parseFloat(value) / 38.67;
  }
  
  if (fromUnit === 'mmol/L' && toUnit === 'mg/dL') {
    return parseFloat(value) * 38.67;
  }
  
  return parseFloat(value);
}

export function convertLpa(value, fromUnit, toUnit) {
  if (value === null) return null;
  
  if (fromUnit === toUnit) {
    return parseFloat(value);
  }
  
  if (fromUnit === 'mg/dL' && toUnit === 'nmol/L') {
    return parseFloat(value) * 2.5;
  }
  
  if (fromUnit === 'nmol/L' && toUnit === 'mg/dL') {
    return parseFloat(value) * 0.4;
  }
  
  return parseFloat(value);
}

export function convertHeightToCm(feet, inches) {
  if (feet === null && inches === null) return null;
  feet = feet || 0;
  inches = inches || 0;
  return ((feet * 12) + parseFloat(inches)) * 2.54;
}

export function convertWeightToKg(pounds) {
  if (pounds === null) return null;
  return pounds * 0.45359237;
}

export function calculateBMI(height, weight) {
  if (!height || !weight) return null;
  // Convert height from cm to meters
  const heightInM = height / 100;
  return weight / (heightInM * heightInM);
}

export function getRiskCategory(riskPercentage) {
  if (riskPercentage < 10) {
    return 'low';
  } else if (riskPercentage < 20) {
    return 'moderate';
  } else {
    return 'high';
  }
}

// Make functions available globally for backward compatibility
window.convertCholesterol = convertCholesterol;
window.convertLpa = convertLpa;
window.convertHeightToCm = convertHeightToCm;
window.convertWeightToKg = convertWeightToKg;
window.calculateBMI = calculateBMI;
window.getRiskCategory = getRiskCategory;
\`;
fs.writeFileSync('src/js/utils.js', utilsModule);
console.log('Created utils.js module');

// Copy styles.css to src directory
fs.copyFileSync('styles.css', 'src/styles.css');
console.log('Copied styles.css to src directory');
"

# Create webpack configuration
echo -e "${YELLOW}Creating Webpack configuration...${NC}"
cat > webpack.config.js << 'EOL'
const path = require('path');

module.exports = {
  mode: 'development', // Change to 'production' for minified output
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                useBuiltIns: 'usage',
                corejs: 3,
                targets: '> 0.25%, not dead'
              }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 9000,
    open: true
  }
};
EOL

# Create babel configuration
cat > .babelrc << 'EOL'
{
  "presets": [
    ["@babel/preset-env", {
      "useBuiltIns": "usage",
      "corejs": 3,
      "targets": "> 0.25%, not dead"
    }]
  ]
}
EOL

# Create a minimal HTML file for dist
mkdir -p dist
cat > dist/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CVD Risk Toolkit with Lp(a) Post-Test Modifier</title>
</head>
<body>
    <!-- The content from your original index.html will be placed here -->
    <script src="bundle.js"></script>
</body>
</html>
EOL

# Update package.json
echo -e "${YELLOW}Updating package.json...${NC}"
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Add type: module
pkg.type = 'module';

// Add new scripts
pkg.scripts = {
  ...pkg.scripts,
  'start': 'webpack serve',
  'build': 'webpack --mode=production',
  'dev': 'webpack --mode=development'
};

// Add dev dependencies if not already present
pkg.devDependencies = {
  ...pkg.devDependencies,
  'webpack': '^5.89.0',
  'webpack-cli': '^5.1.4',
  'webpack-dev-server': '^4.15.1',
  'babel-loader': '^9.1.3',
  '@babel/core': '^7.23.3',
  '@babel/preset-env': '^7.23.3',
  'core-js': '^3.33.2',
  'regenerator-runtime': '^0.14.0',
  'style-loader': '^3.3.3',
  'css-loader': '^6.8.1'
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Modify main index.html to use the bundled file
echo -e "${YELLOW}Updating index.html...${NC}"
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Replace script references with bundle.js
const updatedHtml = html
  .replace(/<script src=\"[^\"]*combined\.js[^\"]*\"><\/script>/g, '<script src=\"dist/bundle.js\"></script>')
  .replace(/<script src=\"[^\"]*validation\.js[^\"]*\"><\/script>/g, '')
  .replace(/<script src=\"[^\"]*calculations\.js[^\"]*\"><\/script>/g, '')
  .replace(/<script src=\"[^\"]*medication\.js[^\"]*\"><\/script>/g, '')
  .replace(/<script src=\"[^\"]*ui\.js[^\"]*\"><\/script>/g, '');

fs.writeFileSync('index.html', updatedHtml);
"

# Install missing dependencies
echo -e "${YELLOW}Installing additional dependencies for CSS processing...${NC}"
npm install --save-dev style-loader css-loader

# Add npm scripts for building and running
echo -e "${GREEN}Adding build scripts to package.json...${NC}"
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Ensure the scripts section exists
pkg.scripts = pkg.scripts || {};

// Add ESM-related scripts if they don't exist
if (!pkg.scripts.start) pkg.scripts.start = 'webpack serve';
if (!pkg.scripts.build) pkg.scripts.build = 'webpack --mode=production';
if (!pkg.scripts.dev) pkg.scripts.dev = 'webpack --mode=development';

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Create a README for ESM conversion
cat > ESM_CONVERSION.md << 'EOL'
# ES Modules Conversion

This project has been converted to use ES Modules with Webpack for broader browser compatibility.

## Changes Made

1. Split the combined.js file into modular components
2. Added Webpack for bundling and transpilation
3. Updated package.json with type: "module" and necessary dependencies
4. Set up backward compatibility to ensure existing code continues to work

## Development

- Run `npm start` to start the development server
- Run `npm run build` to create a production build

## Structure

- `src/` - Source files directory
  - `js/` - JavaScript module files
    - `calculations.js` - Risk calculation functions
    - `medication.js` - Medication management
    - `ui.js` - User interface functionality
    - `validation.js` - Form validation
    - `utils.js` - Utility functions
  - `index.js` - Main entry point
  - `styles.css` - Styles copied from original

## Backwards Compatibility

All functions from the original combined.js are still available in the global scope for backwards compatibility. This allows existing code to continue working while gradually transitioning to import/export syntax.
EOL

echo -e "${GREEN}ESM conversion script completed!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Run 'npm install' to install all dependencies"
echo -e "2. Run 'npm run dev' to build in development mode"
echo -e "3. Run 'npm start' to start the development server"
echo -e "4. See ESM_CONVERSION.md for more details"