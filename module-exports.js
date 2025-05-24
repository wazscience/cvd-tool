/**
 * module-exports.js
 * 
 * This file extracts key functions from combined.js and organizes them into
 * separate modules that can be imported for testing and maintenance.
 * 
 * This allows the CVD Risk Toolkit to maintain both the original combined.js
 * for production use and separate modules for development and testing.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const esprima = require('esprima');
const escodegen = require('escodegen');

// Configuration
const COMBINED_JS_PATH = path.join(process.cwd(), 'combined.js');
const OUTPUT_DIR = path.join(process.cwd(), 'modules');
const MODULE_CONFIG = [
  {
    name: 'calculators',
    fileName: 'calculators.js',
    functions: [
      'calculateLpaModifier',
      'getRiskCategory',
      'convertCholesterol',
      'convertLpa',
      'convertHeightToCm',
      'convertWeightToKg',
      'calculateBMI',
      'calculateFraminghamRiskScore',
      'calculateQRISK3Score',
      'convertEthnicity',
      'convertSmoking',
      'standardizeUnitsForQRISK3'
    ]
  },
  {
    name: 'validation',
    fileName: 'validation.js',
    functions: [
      'validateNumericInput',
      'validateSelectInput',
      'validateCheckbox',
      'validateForm',
      'validateFRSForm',
      'validateQRISKForm',
      'validateMedicationForm',
      'checkPhysiologicalPlausibility',
      'displayErrors'
    ]
  },
  {
    name: 'ui',
    fileName: 'ui.js',
    functions: [
      'displayFRSResults',
      'displayQRISKResults',
      'displayComparisonResults',
      'displayMedicationResults',
      'createComparisonChart',
      'updateComparisonTabStatus',
      'showModal',
      'showClinicalWarning'
    ]
  },
  {
    name: 'form-handler',
    fileName: 'form-handler.js',
    functions: [
      'resetForm',
      'calculateFRS',
      'calculateQRISK',
      'calculateBoth',
      'evaluateMedications',
      'handleFormSubmit'
    ]
  }
];

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

/**
 * Parse combined.js and extract functions
 */
function parseAndExtractFunctions() {
  logInfo('Parsing combined.js...');
  
  try {
    // Read the file content
    const content = fs.readFileSync(COMBINED_JS_PATH, 'utf8');
    
    // Parse the JavaScript file
    const ast = esprima.parseScript(content, { range: true, loc: true });
    
    // Extract function declarations
    const functions = {};
    
    // Recursively traverse the AST to find function declarations
    function traverseAst(node, parent) {
      // Function declaration
      if (node.type === 'FunctionDeclaration' && node.id) {
        const functionName = node.id.name;
        functions[functionName] = {
          node: node,
          content: content.substring(node.range[0], node.range[1]),
          dependencies: []
        };
      }
      
      // Function expression assigned to variable
      if (node.type === 'VariableDeclarator' && 
          node.init && 
          (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression') &&
          node.id) {
        const functionName = node.id.name;
        functions[functionName] = {
          node: node.init,
          content: content.substring(node.init.range[0], node.init.range[1]),
          dependencies: []
        };
      }
      
      // Continue traversing
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(item => {
              if (item && typeof item === 'object') {
                traverseAst(item, node);
              }
            });
          } else {
            traverseAst(node[key], node);
          }
        }
      }
    }
    
    // Start traversal
    traverseAst(ast, null);
    
    // Find function dependencies
    for (const name in functions) {
      const func = functions[name];
      // Find function calls within this function
      const regex = /\b([a-zA-Z][a-zA-Z0-9_]*)\s*\(/g;
      let match;
      while ((match = regex.exec(func.content)) !== null) {
        const calledFunction = match[1];
        if (functions[calledFunction] && calledFunction !== name) {
          func.dependencies.push(calledFunction);
        }
      }
    }
    
    logSuccess(`Found ${Object.keys(functions).length} functions in combined.js`);
    return functions;
    
  } catch (error) {
    logError(`Failed to parse combined.js: ${error.message}`);
    throw error;
  }
}

/**
 * Create module files with extracted functions
 * @param {Object} functions - Extracted functions
 */
function createModuleFiles(functions) {
  logInfo('Creating module files...');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Process each module config
  MODULE_CONFIG.forEach(moduleConfig => {
    const { name, fileName, functions: functionList } = moduleConfig;
    
    logInfo(`Creating module: ${name}...`);
    
    // Get requested functions and their dependencies
    const moduleFunctions = new Set();
    const queue = [...functionList];
    
    while (queue.length > 0) {
      const funcName = queue.shift();
      
      if (moduleFunctions.has(funcName)) {
        continue;
      }
      
      if (functions[funcName]) {
        moduleFunctions.add(funcName);
        // Add dependencies to the queue
        functions[funcName].dependencies.forEach(dep => {
          if (!moduleFunctions.has(dep)) {
            queue.push(dep);
          }
        });
      } else {
        logWarning(`Function "${funcName}" not found in combined.js`);
      }
    }
    
    // Generate module content
    let moduleContent = `/**
 * ${fileName}
 * Generated from combined.js
 * 
 * This module contains functions related to ${name} from the CVD Risk Toolkit.
 */

// Module wrapper
(function(exports) {
  'use strict';

`;
    
    // Add each function
    [...moduleFunctions].forEach(funcName => {
      const func = functions[funcName];
      moduleContent += `  // ${funcName}\n`;
      
      // For function declarations
      if (func.node.type === 'FunctionDeclaration') {
        const code = escodegen.generate(func.node);
        moduleContent += `  ${code}\n\n`;
      } 
      // For function expressions
      else {
        moduleContent += `  const ${funcName} = ${func.content};\n\n`;
      }
    });
    
    // Export the functions
    moduleContent += '  // Public API\n';
    moduleContent += '  const api = {\n';
    functionList.forEach(funcName => {
      if (moduleFunctions.has(funcName)) {
        moduleContent += `    ${funcName},\n`;
      }
    });
    moduleContent += '  };\n\n';
    
    // Export for different module systems
    moduleContent += `  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    // CommonJS
    module.exports = api;
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define([], function() { return api; });
  } else {
    // Browser global
    exports.${name} = api;
  }
})(typeof window !== 'undefined' ? window : this);
`;
    
    // Write module file
    const outputPath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(outputPath, moduleContent);
    logSuccess(`Created module: ${outputPath}`);
  });
}

/**
 * Create an index file to bring all modules together
 */
function createIndexFile() {
  logInfo('Creating index.js...');
  
  let indexContent = `/**
 * index.js
 * Entry point for CVD Risk Toolkit modular version
 */

// Import modules
`;

  MODULE_CONFIG.forEach(moduleConfig => {
    indexContent += `const ${moduleConfig.name} = require('./${moduleConfig.fileName}');\n`;
  });
  
  indexContent += `
// Combine modules into a single export
module.exports = {
${MODULE_CONFIG.map(config => `  ...${config.name}`).join(',\n')}
};

// For browser environments
if (typeof window !== 'undefined') {
  window.CVDToolkit = module.exports;
}
`;

  const indexPath = path.join(OUTPUT_DIR, 'index.js');
  fs.writeFileSync(indexPath, indexContent);
  logSuccess(`Created index file: ${indexPath}`);
}

/**
 * Create a package.json file for the module
 */
function createPackageJson() {
  logInfo('Creating package.json...');
  
  const packageJson = {
    name: 'cvd-toolkit',
    version: '1.0.0',
    description: 'CVD Risk Toolkit with Lp(a) Post-Test Modifier',
    main: 'index.js',
    scripts: {
      test: 'mocha'
    },
    keywords: [
      'cvd',
      'cardiovascular',
      'risk-assessment',
      'qrisk3',
      'framingham',
      'medical',
      'healthcare'
    ],
    author: 'CVD Risk Toolkit Team',
    license: 'ISC',
    dependencies: {},
    devDependencies: {
      mocha: '^11.1.0',
      chai: '^5.2.0',
      sinon: '^17.0.1',
      jsdom: '^22.1.0'
    }
  };
  
  const packagePath = path.join(OUTPUT_DIR, 'package.json');
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  logSuccess(`Created package.json: ${packagePath}`);
}

/**
 * Create README file for the module
 */
function createReadme() {
  logInfo('Creating README.md...');
  
  const readme = `# CVD Risk Toolkit

A modular toolkit for cardiovascular disease risk assessment with Lp(a) Post-Test Modifier.

## Modules

The toolkit is organized into the following modules:

${MODULE_CONFIG.map(config => `- **${config.name}**: ${config.fileName} - Contains functions for ${config.name}`).join('\n')}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`javascript
// Using the entire toolkit
const CVDToolkit = require('./index');

// Calculate Framingham Risk Score
const riskScore = CVDToolkit.calculateFraminghamRiskScore(patientData);

// Using specific modules
const calculators = require('./calculators');
const riskScore = calculators.calculateFraminghamRiskScore(patientData);
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

## License

ISC
`;

  const readmePath = path.join(OUTPUT_DIR, 'README.md');
  fs.writeFileSync(readmePath, readme);
  logSuccess(`Created README.md: ${readmePath}`);
}

/**
 * Main execution function
 */
async function main() {
  console.log(chalk.bold('\n===== CVD Toolkit Module Exports =====\n'));
  
  try {
    // Check if combined.js exists
    if (!fs.existsSync(COMBINED_JS_PATH)) {
      logError('combined.js not found!');
      return;
    }
    
    // Install dependencies if necessary
    try {
      require.resolve('esprima');
      require.resolve('escodegen');
    } catch (error) {
      logInfo('Installing required dependencies...');
      require('child_process').execSync('npm install esprima escodegen --save-dev', { stdio: 'inherit' });
    }
    
    // Parse and extract functions
    const functions = parseAndExtractFunctions();
    
    // Create module files
    createModuleFiles(functions);
    
    // Create index file
    createIndexFile();
    
    // Create package.json
    createPackageJson();
    
    // Create README
    createReadme();
    
    // Success message
    console.log(chalk.bold('\n===== Summary =====\n'));
    console.log(`Successfully created modular version of CVD Toolkit in: ${OUTPUT_DIR}`);
    console.log('To use the modular version:');
    console.log('1. cd modules');
    console.log('2. npm install');
    console.log('3. npm test');
    
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});