/**
 * scripts/add-physiological-checks.js
 * Adds physiologically plausible value range checks and warnings
 */
const fs = require('fs');
const path = require('path');

// Paths
const jsDir = path.join(process.cwd(), 'js');
const utilsDir = path.join(jsDir, 'utils');
const validationUtilPath = path.join(utilsDir, 'physiological-validation.js');
const cssPath = path.join(process.cwd(), 'styles.css');
const indexHtmlPath = path.join(process.cwd(), 'index.html');

// Create directories if they don't exist
if (!fs.existsSync(utilsDir)) {
  fs.mkdirSync(utilsDir, { recursive: true });
  console.log('Created utils directory');
}

// Create physiological validation module
console.log('Creating physiological validation module...');

const physiologicalValidationContent = `/**;
 * Physiological Validation Utility
 * Provides validation for physiologically plausible values in clinical data
 */
const physiologicalValidation = (function() {
  // Physiologically plausible ranges for clinical values
  const PHYSIOLOGICAL_RANGES = {
    // Demographics
    age: { 
      min: 18, max: 100, unit: 'years', 
      criticalMin: 25, criticalMax: 85,
      description: 'Age', 
      category: 'Demographics',
      note: 'Values outside 25-85 may be outside validated ranges for risk calculators'
    },
    
    // Vitals
    sbp: { 
      min: 70, max: 240, unit: 'mmHg', 
      criticalMin: 90, criticalMax: 210,
      description: 'Systolic Blood Pressure', 
      category: 'Vitals',
      note: 'Values below 90 mmHg may indicate hypotension; values above 180 mmHg indicate severe hypertension requiring urgent medical attention'
    },
    dbp: { 
      min: 40, max: 140, unit: 'mmHg', 
      criticalMin: 60, criticalMax: 120,
      description: 'Diastolic Blood Pressure', 
      category: 'Vitals',
      note: 'Values below 60 mmHg may indicate hypotension; values above 120 mmHg indicate severe hypertension requiring urgent medical attention'
    },
    
    // Lipids in mmol/L
    totalChol_mmol: { 
      min: 1.0, max: 15.0, unit: 'mmol/L', 
      criticalMin: 2.5, criticalMax: 12.0,
      description: 'Total Cholesterol', 
      category: 'Lipids',
      note: 'Values below 2.5 mmol/L are extremely rare; values above 8.0 mmol/L may indicate familial hypercholesterolemia'
    },
    hdl_mmol: { 
      min: 0.5, max: 4.0, unit: 'mmol/L', 
      criticalMin: 0.7, criticalMax: 3.0,
      description: 'HDL Cholesterol', 
      category: 'Lipids',
      note: 'Values below 0.7 mmol/L indicate very low HDL; values above 2.5 mmol/L are rare but beneficial'
    },
    ldl_mmol: { 
      min: 0.5, max: 10.0, unit: 'mmol/L', 
      criticalMin: 1.0, criticalMax: 8.0,
      description: 'LDL Cholesterol', 
      category: 'Lipids',
      note: 'Values below 1.0 mmol/L are rare; values above 5.0 mmol/L may indicate familial hypercholesterolemia'
    },
    trig_mmol: { 
      min: 0.5, max: 15.0, unit: 'mmol/L', 
      criticalMin: 0.8, criticalMax: 10.0,
      description: 'Triglycerides', 
      category: 'Lipids',
      note: 'Values above 5.0 mmol/L increase risk of pancreatitis'
    },
    nonHDL_mmol: { 
      min: 0.5, max: 14.0, unit: 'mmol/L', 
      criticalMin: 1.5, criticalMax: 10.0,
      description: 'Non-HDL Cholesterol', 
      category: 'Lipids',
      note: 'Values above 6.0 mmol/L may indicate familial hypercholesterolemia'
    },
    
    // Lipids in mg/dL
    totalChol_mg: { 
      min: 40, max: 580, unit: 'mg/dL', 
      criticalMin: 100, criticalMax: 465,
      description: 'Total Cholesterol', 
      category: 'Lipids',
      note: 'Values below 100 mg/dL are extremely rare; values above 300 mg/dL may indicate familial hypercholesterolemia'
    },
    hdl_mg: { 
      min: 20, max: 155, unit: 'mg/dL', 
      criticalMin: 27, criticalMax: 116,
      description: 'HDL Cholesterol', 
      category: 'Lipids',
      note: 'Values below 27 mg/dL indicate very low HDL; values above 100 mg/dL are rare but beneficial'
    },
    ldl_mg: { 
      min: 20, max: 400, unit: 'mg/dL', 
      criticalMin: 40, criticalMax: 300,
      description: 'LDL Cholesterol', 
      category: 'Lipids',
      note: 'Values below 40 mg/dL are rare; values above 190 mg/dL may indicate familial hypercholesterolemia'
    },
    trig_mg: { 
      min: 40, max: 1300, unit: 'mg/dL', 
      criticalMin: 70, criticalMax: 900,
      description: 'Triglycerides', 
      category: 'Lipids',
      note: 'Values above 450 mg/dL increase risk of pancreatitis'
    },
    nonHDL_mg: { 
      min: 20, max: 530, unit: 'mg/dL', 
      criticalMin: 70, criticalMax: 400,
      description: 'Non-HDL Cholesterol', 
      category: 'Lipids',
      note: 'Values above 220 mg/dL may indicate familial hypercholesterolemia'
    },
    
    // Lp(a) values
    lpa_mg: { 
      min: 0, max: 500, unit: 'mg/dL', 
      criticalMin: 0, criticalMax: 300,
      description: 'Lipoprotein(a)', 
      category: 'Lipids',
      note: 'Values above 30-50 mg/dL associated with increased cardiovascular risk'
    },
    lpa_nmol: { 
      min: 0, max: 1000, unit: 'nmol/L', 
      criticalMin: 0, criticalMax: 750,
      description: 'Lipoprotein(a)', 
      category: 'Lipids',
      note: 'Values above 75-125 nmol/L associated with increased cardiovascular risk'
    },
    
    // ApoB values
    apob_g: { 
      min: 0.2, max: 2.5, unit: 'g/L', 
      criticalMin: 0.4, criticalMax: 2.0,
      description: 'Apolipoprotein B', 
      category: 'Lipids',
      note: 'Values above 1.2 g/L associated with increased cardiovascular risk'
    },
    apob_mg: { 
      min: 20, max: 250, unit: 'mg/dL', 
      criticalMin: 40, criticalMax: 200,
      description: 'Apolipoprotein B', 
      category: 'Lipids',
      note: 'Values above 120 mg/dL associated with increased cardiovascular risk'
    },
    
    // Anthropometrics
    bmi: { 
      min: 10, max: 100, unit: 'kg/m²', 
      criticalMin: 15, criticalMax: 60,
      description: 'Body Mass Index', 
      category: 'Anthropometrics',
      note: 'BMI below 18.5 is underweight; above 30 is obese; values outside 15-60 range are extremely rare'
    },
    height_cm: { 
      min: 100, max: 250, unit: 'cm', 
      criticalMin: 140, criticalMax: 220,
      description: 'Height', 
      category: 'Anthropometrics',
      note: 'Adult height outside this range is extremely rare'
    },
    height_in: { 
      min: 39, max: 98, unit: 'inches', 
      criticalMin: 55, criticalMax: 87,
      description: 'Height', 
      category: 'Anthropometrics',
      note: 'Adult height outside this range is extremely rare'
    },
    weight_kg: { 
      min: 30, max: 250, unit: 'kg', 
      criticalMin: 40, criticalMax: 200,
      description: 'Weight', 
      category: 'Anthropometrics',
      note: 'Adult weight outside this range is extremely rare'
    },
    weight_lb: { 
      min: 66, max: 550, unit: 'lb', 
      criticalMin: 88, criticalMax: 440,
      description: 'Weight', 
      category: 'Anthropometrics',
      note: 'Adult weight outside this range is extremely rare'
    }
  };
  
  // Implausible clinical combinations - checks functions
  const IMPLAUSIBLE_COMBINATIONS = [;
    { 
      check: function(values) {
        return typeof values.totalChol_mmol === 'number' && 
               typeof values.hdl_mmol === 'number' && 
               values.totalChol_mmol < values.hdl_mmol;
      },
      message: 'Total cholesterol cannot be less than HDL cholesterol'
    },
    { 
      check: function(values) {
        return typeof values.totalChol_mmol === 'number' && 
               typeof values.ldl_mmol === 'number' && 
               values.totalChol_mmol < values.ldl_mmol;
      },
      message: 'Total cholesterol cannot be less than LDL cholesterol'
    },
    { 
      check: function(values) {
        return typeof values.totalChol_mmol === 'number' && 
               typeof values.hdl_mmol === 'number' && 
               typeof values.ldl_mmol === 'number' && 
               typeof values.trig_mmol === 'number' && 
               Math.abs((values.ldl_mmol + values.hdl_mmol + (values.trig_mmol / 2.2)) - values.totalChol_mmol) > 1.0;
      },
      message: 'Lipid values do not follow the expected relationship: TC ≈ LDL + HDL + (TG/2.2)'
    },
    { 
      check: function(values) {
        return typeof values.hdl_mmol === 'number' && 
               typeof values.totalChol_mmol === 'number' && 
               values.hdl_mmol / values.totalChol_mmol > 0.8;
      },
      message: 'HDL cholesterol is unusually high relative to total cholesterol'
    },
    { 
      check: function(values) {
        return typeof values.sbp === 'number' && 
               typeof values.dbp === 'number' && 
               values.sbp < values.dbp;
      },
      message: 'Systolic blood pressure cannot be less than diastolic blood pressure'
    },
    { 
      check: function(values) {
        return typeof values.sbp === 'number' && 
               typeof values.dbp === 'number' && 
               values.sbp > 180 && values.dbp < 90 && 
               (values.sbp - values.dbp) > 100;
      },
      message: 'Extremely wide pulse pressure (difference between systolic and diastolic) is unusual'
    },
    {
      check: function(values) {
        return typeof values.bmi === 'number' && 
               typeof values.totalChol_mmol === 'number' && 
               values.bmi > 40 && values.totalChol_mmol < 3.0;
      },
      message: 'Severely obese patients rarely have very low cholesterol levels'
    },
    {
      check: function(values) {
        return typeof values.age === 'number' && 
               typeof values.totalChol_mmol === 'number' && 
               typeof values.trig_mmol === 'number' && 
               values.age < 40 && values.totalChol_mmol > 8.0 && values.trig_mmol < 1.0;
      },
      message: 'Young patient with very high cholesterol but normal triglycerides suggests familial hypercholesterolemia'
    }
  ];
  
  /**
   * Check if a value is physiologically plausible
   * @param {string} parameterType - The type of parameter
   * @param {number} value - The value to check
   * @returns {Object} - { isValid, isWarning, message, note }
   */
  function checkPhysiologicalPlausibility(parameterType, value) {
    if (!PHYSIOLOGICAL_RANGES[parameterType]) {
      console.warn(\`No physiological range defined for parameter '\${parameterType}'\`);
      return { isValid: true, isWarning: false, message: null, note: null };
    }
    
    const range = PHYSIOLOGICAL_RANGES[parameterType];
    
    // Critical check (highly implausible)
    if (value < range.min || value > range.max) {
      return {
        isValid: false,
        isWarning: false,
        message: \`\${range.description || parameterType} value of \${value} \${range.unit} is outside the physiologically possible range (\${range.min}-\${range.max} \${range.unit})\`,
        note: range.note || null,
        category: range.category || 'Other'
      };
    }
    
    // Warning check (unusual but possible)
    if (value < range.criticalMin || value > range.criticalMax) {
      return {
        isValid: true,
        isWarning: true,
        message: \`\${range.description || parameterType} value of \${value} \${range.unit} is unusual. Please verify this value.\`,
        note: range.note || null,
        category: range.category || 'Other'
      };
    }
    
    // Value is within normal range
    return { isValid: true, isWarning: false, message: null, note: null, category: range.category || 'Other' };
  }
  
  /**
   * Get parameter type with unit suffix based on field and unit
   * @param {string} parameterType - Base parameter type
   * @param {string} unit - Unit selected
   * @returns {string} - Parameter type with unit suffix
   */
  function getParameterTypeWithUnit(parameterType, unit) {
    switch (parameterType) {
      case 'totalChol':
        return unit === 'mmol/L' ? 'totalChol_mmol' : 'totalChol_mg';
      case 'hdl':
        return unit === 'mmol/L' ? 'hdl_mmol' : 'hdl_mg';
      case 'ldl':
        return unit === 'mmol/L' ? 'ldl_mmol' : 'ldl_mg';
      case 'trig':
        return unit === 'mmol/L' ? 'trig_mmol' : 'trig_mg';
      case 'nonHDL':
        return unit === 'mmol/L' ? 'nonHDL_mmol' : 'nonHDL_mg';
      case 'lpa':
        return unit === 'mg/dL' ? 'lpa_mg' : 'lpa_nmol';
      case 'apob':
        return unit === 'g/L' ? 'apob_g' : 'apob_mg';
      case 'height':
        return unit === 'cm' ? 'height_cm' : 'height_in';
      case 'weight':
        return unit === 'kg' ? 'weight_kg' : 'weight_lb';
      default:
        return parameterType;
    }
  }
  
  /**
   * Check for physiologically implausible combinations
   * @param {Object} values - Object with clinical values
   * @returns {Array} - Array of warning messages for implausible combinations
   */
  function checkImplausibleCombinations(values) {
    const warnings = [];
    
    // Standardize units for comparison if needed
    const standardizedValues = { ...values };
    
    // Convert mg/dL to mmol/L for lipids if needed
    ['totalChol', 'ldl', 'hdl', 'trig', 'nonHDL'].forEach(param => {
      if (standardizedValues[param] !== undefined && standardizedValues[param + 'Unit'] === 'mg/dL') {
        switch (param) {
          case 'trig':
            standardizedValues[param + '_mmol'] = standardizedValues[param] / 88.5;
            break;
          default:
            standardizedValues[param + '_mmol'] = standardizedValues[param] / 38.67;
            break;
        }
      } else if (standardizedValues[param] !== undefined) {
        standardizedValues[param + '_mmol'] = standardizedValues[param];
      }
    });
    
    // Check each combination
    IMPLAUSIBLE_COMBINATIONS.forEach(combination => {
      try {
        if (combination.check(standardizedValues)) {
          warnings.push(combination.message);
        }
      } catch (error) {
        console.warn('Error checking clinical combination:', error);
      }
    });
    
    return warnings;
  }
  
  /**
   * Display a physiological warning for a field
   * @param {string} fieldId - The ID of the input field
   * @param {string} message - Warning message
   * @param {boolean} isError - Whether this is an error (false = warning)
   * @param {string} note - Additional clinical note
   */
  function showPhysiologicalWarning(fieldId, message, isError = false, note = null) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Create or get warning element
    let warningElement = document.getElementById(fieldId + '-physiological-warning');
    if (!warningElement) {
      warningElement = document.createElement('div');
      warningElement.id = fieldId + '-physiological-warning';
      warningElement.className = isError ? 'physiological-error' : 'physiological-warning';
      
      // Insert after field's parent (likely the form group)
      const formGroup = field.closest('.form-group');
      if (formGroup) {
        // Insert after the error message if it exists
        const errorMessage = formGroup.querySelector('.error-message');
        if (errorMessage) {
          formGroup.insertBefore(warningElement, errorMessage.nextSibling);
        } else {
          formGroup.appendChild(warningElement);
        }
      } else {
        field.parentElement.appendChild(warningElement);
      }
    }
    
    // Set message and show
    if (note) {
      warningElement.innerHTML = \`<div class='warning-message'>\${message}</div><div class='warning-note'>\${note}</div>\`;
    } else {
      warningElement.textContent = message;
    }
    warningElement.style.display = 'block';
    
    // Highlight the field
    field.classList.add(isError ? 'physiological-error-input' : 'physiological-warning-input');
    
    // Add icon to field
    addWarningIcon(field, isError, message);
  }
  
  /**
   * Add warning icon to a field
   * @param {HTMLElement} field - The input field
   * @param {boolean} isError - Whether this is an error
   * @param {string} message - The warning message
   */
  function addWarningIcon(field, isError, message) {
    // Check if icon already exists
    let iconWrapper = field.parentElement.querySelector('.field-warning-icon');
    
    if (!iconWrapper) {
      // Create icon wrapper
      iconWrapper = document.createElement('div');
      iconWrapper.className = 'field-warning-icon';
      
      // Create icon
      const icon = document.createElement('span');
      icon.className = isError ? 'error-icon' : 'warning-icon';
      icon.innerHTML = isError ? 
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' :
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      
      // Add tooltip
      icon.setAttribute('data-tooltip', message);
      
      // Append to wrapper
      iconWrapper.appendChild(icon);
      
      // Add to input container
      const inputGroup = field.closest('.input-group');
      if (inputGroup) {
        inputGroup.appendChild(iconWrapper);
      } else {
        // Position relative to field
        const fieldRect = field.getBoundingClientRect();
        iconWrapper.style.position = 'absolute';
        iconWrapper.style.right = '10px';
        iconWrapper.style.top = '50%';
        iconWrapper.style.transform = 'translateY(-50%)';
        
        // Make parent relative if not already
        const parent = field.parentElement;
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.position === 'static') {
          parent.style.position = 'relative';
        }
        
        parent.appendChild(iconWrapper);
      }
    } else {
      // Update existing icon
      const icon = iconWrapper.querySelector('span');
      if (icon) {
        icon.className = isError ? 'error-icon' : 'warning-icon';
        icon.setAttribute('data-tooltip', message);
      }
    }
  }
  
  /**
   * Clear physiological warning for a field
   * @param {string} fieldId - The ID of the input field
   */
  function clearPhysiologicalWarning(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Remove warning display
    const warningElement = document.getElementById(fieldId + '-physiological-warning');
    if (warningElement) {
      warningElement.style.display = 'none';
    }
    
    // Remove field highlighting
    field.classList.remove('physiological-error-input', 'physiological-warning-input');
    
    // Remove warning icon
    const iconWrapper = field.parentElement.querySelector('.field-warning-icon');
    if (iconWrapper) {
      iconWrapper.remove();
    }
  }
  
  /**
   * Validate physiological plausibility of a field value
   * @param {string} fieldId - ID of the field to validate
   * @param {string} parameterType - Type of parameter from PHYSIOLOGICAL_RANGES
   * @returns {boolean} - Whether validation passed (true) or found a critical error (false)
   */
  function validatePhysiologicalInput(fieldId, parameterType) {
    const field = document.getElementById(fieldId);
    if (!field) return true;
    
    // Clear any existing warnings first
    clearPhysiologicalWarning(fieldId);
    
    // Skip empty values
    if (field.value.trim() === '') {
      return true;
    }
    
    // Parse numeric value
    const numValue = parseFloat(field.value);
    if (isNaN(numValue)) {
      return true; // Let regular validation handle non-numeric values
    }
    
    // Get unit suffix if needed
    let actualParameterType = parameterType;
    const unitSelect = field.parentElement.querySelector('select');
    if (unitSelect) {
      const unit = unitSelect.value;
      actualParameterType = getParameterTypeWithUnit(parameterType, unit);
    }
    
    // Check physiological plausibility
    const result = checkPhysiologicalPlausibility(actualParameterType, numValue);
    
    // Display warning or error if needed
    if (!result.isValid) {
      showPhysiologicalWarning(fieldId, result.message, true, result.note);
      return false; // Critical error
    } else if (result.isWarning) {
      showPhysiologicalWarning(fieldId, result.message, false, result.note);
    }
    
    return true; // Validation passed (or only showed a warning)
  }
  
  /**
   * Display warnings for implausible combination values
   * @param {Array} warnings - Array of warning messages
   * @param {string} containerId - ID of the container to display warnings in
   */
  function displayCombinationWarnings(warnings, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Look for existing warnings container or create one
    let warningsContainer = container.querySelector('.combination-warnings');
    
    if (!warningsContainer && warnings.length > 0) {
      // Create warnings container
      warningsContainer = document.createElement('div');
      warningsContainer.className = 'combination-warnings';
      
      // Find appropriate place to insert
      const form = container.querySelector('form');
      if (form) {
        const formActions = form.querySelector('.form-actions');
        if (formActions) {
          form.insertBefore(warningsContainer, formActions);
        } else {
          form.appendChild(warningsContainer);
        }
      } else {
        container.appendChild(warningsContainer);
      }
    }
    
    // If no warnings, hide or remove container
    if (warnings.length === 0) {
      if (warningsContainer) {
        warningsContainer.style.display = 'none';
      }
      return;
    }
    
    // Update warnings container
    warningsContainer.style.display = 'block';
    warningsContainer.innerHTML = \`
      <div class='combination-warnings-header'>
        <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'></path><line x1='12' y1='9' x2='12' y2='13'></line><line x1='12' y1='17' x2='12.01' y2='17'></line></svg>
        <h4>Physiologically Implausible Combinations</h4>
      </div>
      <ul>
        \${warnings.map(warning => \`<li>\${warning}</li>\`).join('')}
      </ul>
      <p class='combination-warnings-note'>Please review the highlighted values and correct if needed. If these values are correct, please add a note indicating this is an unusual clinical presentation.</p>
    \`;
  }
  
  /**
   * Check all form inputs on a tab for physiologically implausible combinations
   * @param {string} tabId - ID of the tab containing the form
   * @returns {boolean} - Whether validation passed (no critical errors)
   */
  function validatePhysiologicalCombinations(tabId) {
    const tab = document.getElementById(tabId);
    if (!tab) return true;
    
    // Get all input values
    const inputs = tab.querySelectorAll('input[type="number"], select');
    const values = {};
    
    inputs.forEach(input => {
      if (input.type === 'number' && input.value.trim() !== '') {
        // Get base name without prefix
        let name = input.id.replace(/^(frs|qrisk|med)-/, '');
        values[name] = parseFloat(input.value);
        
        // Get unit if available
        const unitSelect = input.parentElement.querySelector('select');
        if (unitSelect) {
          values[name + 'Unit'] = unitSelect.value;
        }
      }
    });
    
    // Check for implausible combinations
    const warnings = checkImplausibleCombinations(values);
    
    // Display warnings
    displayCombinationWarnings(warnings, tabId);
    
    // No critical errors, just warnings
    return true;
  }
  
  /**
   * Setup validation for specific input field
   * @param {string} fieldId - ID of input field
   * @param {string} parameterType - Type of parameter for validation
   */
  function setupFieldValidation(fieldId, parameterType) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.setAttribute('data-parameter-type', parameterType);
    
    // Add event listeners for validation
    field.addEventListener('change', function() {
      validatePhysiologicalInput(fieldId, parameterType);
    });
    
    field.addEventListener('blur', function() {
      validatePhysiologicalInput(fieldId, parameterType);
    });
    
    // Handle unit changes for fields with units
    const unitSelect = field.parentElement.querySelector('select');
    if (unitSelect) {
      unitSelect.addEventListener('change', function() {
        // Revalidate with new unit
        if (field.value.trim() !== '') {
          validatePhysiologicalInput(fieldId, parameterType);
        }
      });
    }
  }
  
  /**
   * Setup validation for a form
   * @param {string} formId - ID of the form
   * @param {Object} fieldMappings - Map of field IDs to parameter types
   */
  function setupFormValidation(formId, fieldMappings) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Setup each field
    Object.keys(fieldMappings).forEach(fieldId => {
      setupFieldValidation(fieldId, fieldMappings[fieldId]);
    });
    
    // Add form submission validation
    form.addEventListener('submit', function(event) {
      // Get tab ID
      const tabId = form.closest('.tab-content')?.id;
      if (!tabId) return;
      
      // Validate combinations
      const isValid = validatePhysiologicalCombinations(tabId);
      
      // Stop submission if critical errors
      if (!isValid) {
        event.preventDefault();
      }
    });
  }
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Define field mappings for each form
    const fieldMappings = {
      // FRS form fields
      'frs-form': {
        'frs-age': 'age',
        'frs-sbp': 'sbp',
        'frs-total-chol': 'totalChol',
        'frs-hdl': 'hdl',
        'frs-ldl': 'ldl',
        'frs-lpa': 'lpa'
      },
      
      // QRISK form fields
      'qrisk-form': {
        'qrisk-age': 'age',
        'qrisk-sbp': 'sbp',
        'qrisk-total-chol': 'totalChol',
        'qrisk-hdl': 'hdl',
        'qrisk-ldl': 'ldl',
        'qrisk-height': 'height',
        'qrisk-weight': 'weight',
        'qrisk-lpa': 'lpa'
      },
      
      // Medication form fields
      'medication-form': {
        'med-total-chol': 'totalChol',
        'med-ldl': 'ldl',
        'med-hdl': 'hdl',
        'med-trig': 'trig',
        'med-non-hdl': 'nonHDL',
        'med-lpa': 'lpa',
        'med-apob': 'apob'
      }
    };
    
    // Setup validation for each form
    Object.keys(fieldMappings).forEach(formId => {
      setupFormValidation(formId, fieldMappings[formId]);
    });
    
    console.log('Physiological validation initialized');
  });
  
  // Return public API
  return {
    checkPhysiologicalPlausibility,
    validatePhysiologicalInput,
    validatePhysiologicalCombinations,
    setupFieldValidation,
    setupFormValidation,
    getPhysiologicalRanges: function() { return PHYSIOLOGICAL_RANGES; }
  };
})();

// Add to window object for global access
window.physiologicalValidation = physiologicalValidation;
`;

fs.writeFileSync(validationUtilPath, physiologicalValidationContent);
console.log('Physiological validation module created successfully!');

// Add CSS for validation warnings
console.log('Adding CSS for physiological validation warnings...');
let cssContent = '';

try {
  cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
} catch (error) {
  console.warn('Could not read existing CSS file. Creating new one.');
  cssContent = '/* CVD Risk Toolkit Styles */\n\n';
}

const validationCss = `;
/* Physiological Validation Styles */
.physiological-warning {
  padding: var(--space-xs) var(--space-sm);
  background-color: rgba(243, 156, 18, 0.1);
  border-left: 3px solid var(--moderate-risk-color);
  color: var(--moderate-risk-color);
  font-size: var(--font-size-sm);
  margin-top: var(--space-xs);
  display: none;
  border-radius: var(--border-radius-sm);
  animation: fadeIn 0.3s ease-in-out;
}

.physiological-error {
  padding: var(--space-xs) var(--space-sm);
  background-color: rgba(192, 57, 43, 0.1);
  border-left: 3px solid var(--high-risk-color);
  color: var(--high-risk-color);
  font-size: var(--font-size-sm);
  margin-top: var(--space-xs);
  display: none;
  border-radius: var(--border-radius-sm);
  animation: fadeIn 0.3s ease-in-out;
}

.warning-message {
  font-weight: 500;
  margin-bottom: var(--space-xs);
}

.warning-note {
  font-size: 0.85em;
  opacity: 0.9;
}

.physiological-warning-input {
  border-color: var(--moderate-risk-color) !important;
  background-color: rgba(243, 156, 18, 0.05) !important;
}

.physiological-error-input {
  border-color: var(--high-risk-color) !important;
  background-color: rgba(192, 57, 43, 0.05) !important;
}

.field-warning-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  cursor: help;
}

.field-warning-icon .warning-icon {
  color: var(--moderate-risk-color);
}

.field-warning-icon .error-icon {
  color: var(--high-risk-color);
}

.field-warning-icon [data-tooltip] {
  position: relative;
}

.field-warning-icon [data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  top: -35px;
  right: 0;
  width: 200px;
  background-color: var(--primary-color);
  color: white;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  font-weight: normal;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
  text-align: left;
  line-height: 1.4;
  box-shadow: var(--shadow-md);
}

.field-warning-icon [data-tooltip]:hover::after {
  opacity: 1;
}

.combination-warnings {
  margin: var(--space-lg) 0;
  padding: var(--space-md);
  background-color: rgba(243, 156, 18, 0.1);
  border: 1px solid var(--moderate-risk-color);
  border-radius: var(--border-radius);
  display: none;
  animation: fadeIn 0.5s ease-in-out;
}

.combination-warnings-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.combination-warnings h4 {
  margin: 0;
  color: var(--moderate-risk-color);
  font-weight: 600;
}

.combination-warnings ul {
  margin-bottom: var(--space-md);
}

.combination-warnings-note {
  font-size: var(--font-size-sm);
  color: var(--text-light);
  font-style: italic;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

// Check if styles already exist
if (!cssContent.includes('.physiological-warning')) {
  cssContent += validationCss;
  fs.writeFileSync(cssPath, cssContent);
  console.log('Added physiological validation CSS styles');
}

// Update index.html to include the validation script
console.log('Updating index.html with physiological validation script...');
let indexHtml = '';
try {
  indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
} catch (error) {
  console.error('Error reading index.html:', error);
  process.exit(1);
}

// Check if validation script is already included
if (!indexHtml.includes('physiological-validation.js')) {
  // Add before closing body tag
  const validationScript = '<script src="js/utils/physiological-validation.js"></script>';

  // Insert at appropriate location in script loading sequence
  if (indexHtml.includes('<!-- Security and Privacy Utilities -->')) {
    // Add after security scripts
    indexHtml = indexHtml.replace('<!-- Initialize Security Framework -->',
      '<!-- Initialize Security Framework -->\n    ' + validationScript);
  } else {
    // Add before closing body tag
    indexHtml = indexHtml.replace('</body>', '    ' + validationScript + '\n</body>');
  }

  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('Added physiological validation script to index.html');
}

// Create a more prominent legal disclaimer implementation
console.log('Creating enhanced legal disclaimer implementation...');
const enhanceDisclaimerPath = path.join(jsDir, 'utils', 'enhanced-disclaimer.js');

const enhancedDisclaimerContent = `/**;
 * Enhanced Legal Disclaimer Module
 * Provides a more prominent and comprehensive legal disclaimer
 */
const enhancedDisclaimer = (function() {
  // Configuration
  const config = {
    disclaimerShown: false,
    requireAcknowledgment: true,
    persistAcknowledgment: true,
    disclaimerExpiry: 7 // days
  };
  
  // Disclaimer content
  const disclaimerContent = {
    title: 'IMPORTANT: Healthcare Professional Use Only',
    content: \`
      <p><strong>This clinical calculator is intended for use by healthcare professionals only.</strong></p>
      
      <p>This tool is designed to support clinical decision-making, not replace it. The calculations and recommendations provided are based on established risk algorithms and guidelines but have inherent limitations.</p>
      
      <p>Key limitations to be aware of:</p>
      <ul>
        <li>Risk calculations are estimates and may not accurately predict individual outcomes</li>
        <li>The Lp(a) risk modification is based on current evidence but is an evolving area of research</li>
        <li>Treatment recommendations are based on guidelines and may not account for all patient-specific factors</li>
        <li>This tool does not store or transmit patient information. All calculations are performed locally in your browser</li>
      </ul>
      
      <p>Always exercise clinical judgment when applying these results to patient care decisions and refer to updated guidelines.</p>
    \`,
    acknowledgmentText: 'I acknowledge that I am a healthcare professional and understand the limitations of this tool',
    reminderText: 'This tool is for healthcare professional use only. Clinical judgment required.'
  };
  
  /**
   * Show the disclaimer modal
   * @param {boolean} forceShow - Whether to show even if previously acknowledged
   */
  function showDisclaimerModal(forceShow = false) {
    // Check if we should show the disclaimer
    if (!forceShow) {
      if (config.disclaimerShown) return;
      
      // Check if previously acknowledged
      if (config.persistAcknowledgment && hasValidAcknowledgment()) {
        config.disclaimerShown = true;
        return;
      }
    }
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('enhanced-disclaimer-modal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'enhanced-disclaimer-modal';
      modal.className = 'modal enhanced-disclaimer-modal';
      
      modal.innerHTML = \`
        <div class='modal-content'>
          <div class='modal-header disclaimer-header'>
            <h3 class='modal-title'>
              <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'></path><line x1='12' y1='9' x2='12' y2='13'></line><line x1='12' y1='17' x2='12.01' y2='17'></line></svg>
              \${disclaimerContent.title}
            </h3>
          </div>
          <div class='modal-body'>
            <div class='disclaimer-content'>
              \${disclaimerContent.content}
            </div>
            
            \${config.requireAcknowledgment ? \`
            <div class='disclaimer-acknowledgment'>
              <label>
                <input type='checkbox' id='disclaimer-acknowledgment-checkbox'>
                <span>\${disclaimerContent.acknowledgmentText}</span>
              </label>
            </div>
            \` : ''}
          </div>
          <div class='modal-footer'>
            <button type='button' class='primary-btn' id='disclaimer-accept-btn' \${config.requireAcknowledgment ? 'disabled' : ''}>
              I Understand
            </button>
          </div>
        </div>
      \`;
      
      document.body.appendChild(modal);
      
      // Add event listeners
      if (config.requireAcknowledgment) {
        const checkbox = document.getElementById('disclaimer-acknowledgment-checkbox');
        const acceptBtn = document.getElementById('disclaimer-accept-btn');
        
        checkbox.addEventListener('change', function() {
          acceptBtn.disabled = !this.checked;
        });
      }
      
      document.getElementById('disclaimer-accept-btn').addEventListener('click', function() {
        acceptDisclaimer();
        modal.style.display = 'none';
      });
    }
    
    // Show the modal
    modal.style.display = 'block';
  }
  
  /**
   * Check if there is a valid stored acknowledgment
   * @returns {boolean} - Whether a valid acknowledgment exists
   */
  function hasValidAcknowledgment() {
    try {
      // Try to get acknowledgment from secure storage first
      if (window.secureStorage) {
        const acknowledgment = window.secureStorage.getItem('disclaimerAcknowledgment');
        if (acknowledgment && acknowledgment.timestamp) {
          // Check if expired
          const now = new Date();
          const acknowledged = new Date(acknowledgment.timestamp);
          const daysSinceAcknowledged = (now - acknowledged) / (1000 * 60 * 60 * 24);
          
          return daysSinceAcknowledged < config.disclaimerExpiry;
        }
      }
      
      // Fallback to local storage if needed
      const acknowledgment = localStorage.getItem('disclaimerAcknowledgment');
      if (acknowledgment) {
        try {
          const parsed = JSON.parse(acknowledgment);
          if (parsed.timestamp) {
            const now = new Date();
            const acknowledged = new Date(parsed.timestamp);
            const daysSinceAcknowledged = (now - acknowledged) / (1000 * 60 * 60 * 24);
            
            return daysSinceAcknowledged < config.disclaimerExpiry;
          }
        } catch (e) {
          return false;
        }
      }
    } catch (error) {
      console.warn('Error checking disclaimer acknowledgment:', error);
    }
    
    return false;
  }
  
  /**
   * Accept the disclaimer and store acknowledgment
   */
  function acceptDisclaimer() {
    config.disclaimerShown = true;
    
    if (config.persistAcknowledgment) {
      const acknowledgment = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };
      
      try {
        // Store in secure storage if available
        if (window.secureStorage) {
          window.secureStorage.setItem('disclaimerAcknowledgment', acknowledgment);
        } else {
          // Fallback to local storage
          localStorage.setItem('disclaimerAcknowledgment', JSON.stringify(acknowledgment));
        }
      } catch (error) {
        console.warn('Error storing disclaimer acknowledgment:', error);
      }
    }
    
    // Update banner with reminder text
    updateDisclaimerBanner();
  }
  
  /**
   * Update the disclaimer banner with reminder text
   */
  function updateDisclaimerBanner() {
    const banners = document.querySelectorAll('.legal-disclaimer-banner');
    banners.forEach(banner => {
      // Add a class to indicate acknowledged state
      banner.classList.add('disclaimer-acknowledged');
      
      // Update content with reminder
      banner.innerHTML = \`
        <p>
          <strong>Healthcare Professional Use Only:</strong> 
          \${disclaimerContent.reminderText}
        </p>
        <button class='disclaimer-info-btn' onclick='enhancedDisclaimer.showDisclaimerModal(true)'>
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'></circle><line x1='12' y1='16' x2='12' y2='12'></line><line x1='12' y1='8' x2='12.01' y2='8'></line></svg>
        </button>
      \`;
    });
  }
  
  /**
   * Set configuration options
   * @param {Object} options - Configuration options
   */
  function configure(options) {
    Object.assign(config, options);
  }
  
  /**
   * Set disclaimer content
   * @param {Object} content - Disclaimer content object
   */
  function setContent(content) {
    Object.assign(disclaimerContent, content);
  }
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Add CSS for disclaimer
    addDisclaimerStyles();
    
    // Show disclaimer modal
    showDisclaimerModal();
    
    // Make existing disclaimer banners clickable
    const banners = document.querySelectorAll('.legal-disclaimer-banner');
    banners.forEach(banner => {
      banner.style.cursor = 'pointer';
      banner.addEventListener('click', function() {
        showDisclaimerModal(true);
      });
    });
    
    // If already acknowledged, update banner
    if (hasValidAcknowledgment()) {
      config.disclaimerShown = true;
      updateDisclaimerBanner();
    }
  });
  
  /**
   * Add CSS styles for enhanced disclaimer
   */
  function addDisclaimerStyles() {
    // Check if styles already exist
    if (document.getElementById('enhanced-disclaimer-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'enhanced-disclaimer-styles';
    styleElement.textContent = \`
      .enhanced-disclaimer-modal .modal-content {
        max-width: 700px;
      }
      
      .disclaimer-header {
        background-color: var(--moderate-risk-color);
      }
      
      .disclaimer-content {
        margin-bottom: var(--space-lg);
      }
      
      .disclaimer-content p {
        margin-bottom: var(--space-md);
      }
      
      .disclaimer-content ul {
        margin-bottom: var(--space-md);
      }
      
      .disclaimer-acknowledgment {
        background-color: rgba(0, 0, 0, 0.05);
        padding: var(--space-md);
        border-radius: var(--border-radius);
        margin-bottom: var(--space-md);
      }
      
      .dark-theme .disclaimer-acknowledgment {
        background-color: rgba(255, 255, 255, 0.05);
      }
      
      .disclaimer-acknowledgment label {
        display: flex;
        align-items: flex-start;
        gap: var(--space-sm);
        cursor: pointer;
      }
      
      .disclaimer-acknowledgment input[type='checkbox'] {
        margin-top: 3px;
      }
      
      .legal-disclaimer-banner.disclaimer-acknowledged {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .disclaimer-info-btn {
        background: none;
        border: none;
        color: var(--secondary-color);
        cursor: pointer;
        padding: var(--space-xs);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .disclaimer-info-btn:hover {
        background-color: rgba(52, 152, 219, 0.1);
      }
    \`;
    
    document.head.appendChild(styleElement);
  }
  
  // Return public API
  return {
    showDisclaimerModal,
    acceptDisclaimer,
    configure,
    setContent,
    hasValidAcknowledgment
  };
})();

// Add to window object for global access
window.enhancedDisclaimer = enhancedDisclaimer;
`;

fs.writeFileSync(enhanceDisclaimerPath, enhancedDisclaimerContent);
console.log('Enhanced legal disclaimer implementation created successfully!');

// Update index.html to include the enhanced disclaimer script
if (!indexHtml.includes('enhanced-disclaimer.js')) {
  // Add before closing body tag
  const disclaimerScript = '<script src="js/utils/enhanced-disclaimer.js"></script>';

  // Insert before closing body tag
  indexHtml = indexHtml.replace('</body>', '    ' + disclaimerScript + '\n</body>');

  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('Added enhanced disclaimer script to index.html');
}

console.log('Physiological validation implementation complete!');
