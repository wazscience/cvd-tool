const fs = require('fs');
const path = require('path');

// Path to the JavaScript files
const jsDir = path.join(process.cwd(), 'js');
if (!fs.existsSync(jsDir)) {
  fs.mkdirSync(jsDir, { recursive: true });
}

const calculationsJsPath = path.join(jsDir, 'calculations.js');
const validationJsPath = path.join(jsDir, 'validation.js');

// Read the files
let calculationsJs = fs.existsSync(calculationsJsPath) ? fs.readFileSync(calculationsJsPath, 'utf8') : '';
let validationJs = fs.existsSync(validationJsPath) ? fs.readFileSync(validationJsPath, 'utf8') : '';

// Add physiologically plausible value ranges
const physiologicalRanges = `
/**
 * Physiologically plausible ranges for clinical values
 */
const PHYSIOLOGICAL_RANGES = {
  age: { min: 18, max: 100, unit: 'years', criticalMin: 25, criticalMax: 85, 
        description: 'Age', category: 'Demographics' },
  sbp: { min: 70, max: 240, unit: 'mmHg', criticalMin: 90, criticalMax: 220, 
         description: 'Systolic Blood Pressure', category: 'Vitals' },
  dbp: { min: 40, max: 140, unit: 'mmHg', criticalMin: 60, criticalMax: 130, 
         description: 'Diastolic Blood Pressure', category: 'Vitals' },
  totalChol_mmol: { min: 1.0, max: 15.0, unit: 'mmol/L', criticalMin: 2.5, criticalMax: 12.0, 
                  description: 'Total Cholesterol', category: 'Lipids' },
  totalChol_mg: { min: 40, max: 580, unit: 'mg/dL', criticalMin: 100, criticalMax: 465, 
                 description: 'Total Cholesterol', category: 'Lipids' },
  hdl_mmol: { min: 0.5, max: 4.0, unit: 'mmol/L', criticalMin: 0.7, criticalMax: 3.0, 
             description: 'HDL Cholesterol', category: 'Lipids' },
  hdl_mg: { min: 20, max: 155, unit: 'mg/dL', criticalMin: 27, criticalMax: 116, 
           description: 'HDL Cholesterol', category: 'Lipids' },
  ldl_mmol: { min: 0.5, max: 10.0, unit: 'mmol/L', criticalMin: 1.0, criticalMax: 8.0, 
             description: 'LDL Cholesterol', category: 'Lipids' },
  ldl_mg: { min: 20, max: 400, unit: 'mg/dL', criticalMin: 40, criticalMax: 300, 
           description: 'LDL Cholesterol', category: 'Lipids' },
  // Add basic implausible combinations
  implausibleCombinations: [
    { 
      check: (values) => values.totalChol_mmol < values.hdl_mmol,
      message: 'Total cholesterol cannot be less than HDL cholesterol'
    },
    { 
      check: (values) => values.sbp < values.dbp,
      message: 'Systolic blood pressure cannot be less than diastolic blood pressure'
    }
  ]
};
`;

// Basic validation function
const basicValidationFunction = `
/**
 * Check if a value is physiologically plausible
 * @param {string} parameterType - The type of parameter
 * @param {number} value - The value to check
 * @returns {Object} - { isValid, isWarning, message }
 */
function checkPhysiologicalPlausibility(parameterType, value) {
  if (!PHYSIOLOGICAL_RANGES[parameterType]) {
    console.warn(\`No physiological range defined for parameter "\${parameterType}"\`);
    return { isValid: true, isWarning: false, message: null };
  }
  
  const range = PHYSIOLOGICAL_RANGES[parameterType];
  
  // Critical check (highly implausible)
  if (value < range.min || value > range.max) {
    return {
      isValid: false,
      isWarning: false,
      message: \`\${range.description || parameterType} value of \${value} \${range.unit} is outside the physiologically possible range (\${range.min}-\${range.max} \${range.unit})\`
    };
  }
  
  // Warning check (unusual but possible)
  if (value < range.criticalMin || value > range.criticalMax) {
    return {
      isValid: true,
      isWarning: true,
      message: \`\${range.description || parameterType} value of \${value} \${range.unit} is unusual. Please verify this value.\`
    };
  }
  
  // Value is within normal range
  return { isValid: true, isWarning: false, message: null };
}
`;

// Create calculation.js if it doesn't exist
if (!calculationsJs) {
  calculationsJs = `/**
   * CVD Risk Toolkit - Risk Calculation Functions
   */
  
  ${physiologicalRanges}
  
  ${basicValidationFunction}
  
  // Risk calculation functions
  
  /**
   * Calculates Framingham Risk Score
   * @param {Object} data - Patient data
   * @returns {Object} - Risk calculation results
   */
  function calculateFraminghamRiskScore(data) {
    // Implementation will be added
    return { baseRisk: 0, lpaModifier: 1, modifiedRisk: 0, riskCategory: 'low' };
  }
  
  /**
   * Calculates QRISK3 Score
   * @param {Object} data - Patient data
   * @returns {Object} - Risk calculation results
   */
  function calculateQRISK3Score(data) {
    // Implementation will be added
    return { baseRisk: 0, lpaModifier: 1, modifiedRisk: 0, riskCategory: 'low' };
  }
  `;

  fs.writeFileSync(calculationsJsPath, calculationsJs, 'utf8');
  console.log('Created calculations.js with clinical validation functions');
} else {
  // Update existing file with ranges
  if (!calculationsJs.includes('PHYSIOLOGICAL_RANGES')) {
    calculationsJs = physiologicalRanges + '\n\n' + calculationsJs;
  }

  if (!calculationsJs.includes('checkPhysiologicalPlausibility')) {
    calculationsJs = calculationsJs.replace(/\/\/ Risk calculation functions/m,
      basicValidationFunction + '\n\n// Risk calculation functions');
  }

  fs.writeFileSync(calculationsJsPath, calculationsJs, 'utf8');
  console.log('Updated calculations.js with clinical validation functions');
}

// Create validation.js with basic functions if it doesn't exist
if (!validationJs) {
  validationJs = `/**
   * CVD Risk Toolkit - Validation Functions
   */
  
  /**
   * Validates a numeric input field
   * @param {string} fieldId - The ID of the input field
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   * @param {string} fieldName - Human-readable field name for error messages
   * @param {boolean} required - Whether the field is required
   * @returns {Object} - { isValid, value, message }
   */
  function validateNumericInput(fieldId, min, max, fieldName, required = true) {
      const field = document.getElementById(fieldId);
      if (!field) {
          console.error(\`Field with ID \${fieldId} not found\`);
          return { isValid: false, value: null, message: \`Field \${fieldId} not found\` };
      }
      
      const value = field.value.trim();
      const errorDisplay = field.parentElement?.querySelector('.error-message');
      
      // Check if field is required and empty
      if (required && value === '') {
          field.classList.add('error');
          if (errorDisplay) errorDisplay.style.display = 'block';
          return { isValid: false, value: null, message: \`\${fieldName} is required.\` };
      }
      
      // If field is not required and empty, return valid
      if (!required && value === '') {
          field.classList.remove('error');
          if (errorDisplay) errorDisplay.style.display = 'none';
          return { isValid: true, value: null, message: null };
      }
      
      // Check if input is a number
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
          field.classList.add('error');
          if (errorDisplay) errorDisplay.style.display = 'block';
          return { isValid: false, value: null, message: \`\${fieldName} must be a number.\` };
      }
      
      // Check if value is within range
      if (numValue < min || numValue > max) {
          field.classList.add('error');
          if (errorDisplay) errorDisplay.style.display = 'block';
          return { isValid: false, value: null, message: \`\${fieldName} must be between \${min} and \${max}.\` };
      }
      
      // Input is valid
      field.classList.remove('error');
      if (errorDisplay) errorDisplay.style.display = 'none';
      return { isValid: true, value: numValue, message: null };
  }
  
  /**
   * Validates a form
   * @param {string} formId - The ID of the form
   * @returns {Object} - { isValid, errors }
   */
  function validateForm(formId) {
      const form = document.getElementById(formId);
      if (!form) {
          return { isValid: false, errors: ['Form not found'] };
      }
      
      const errors = [];
      
      // Validate required fields
      const requiredFields = form.querySelectorAll('[required]');
      requiredFields.forEach(field => {
          if (field.type === 'number') {
              const result = validateNumericInput(
                  field.id,
                  parseFloat(field.getAttribute('min') || '-Infinity'),
                  parseFloat(field.getAttribute('max') || 'Infinity'),
                  field.previousElementSibling?.textContent || field.id,
                  true
              );
              
              if (!result.isValid) {
                  errors.push(result.message);
              }
          }
      });
      
      return {
          isValid: errors.length === 0,
          errors: errors
      };
  }
  `;

  fs.writeFileSync(validationJsPath, validationJs, 'utf8');
  console.log('Created validation.js with validation functions');
}

console.log('Clinical validation enhancements completed successfully');
