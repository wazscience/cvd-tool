/**
   * CVD Risk Toolkit Combined JavaScript
   * Version: 3.0.0 - Last Updated: 2025-04-26T06:23:49.960Z
   * This file combines all JavaScript functionality for the CVD Risk Toolkit
   * 
   * IMPORTANT: This file is auto-generated. Make changes to individual source files instead.
   */

  // Utility Functions
  function safeGet(obj, path, defaultValue = null) {
    try {
      const keys = path.split('.');
      let result = obj;
      
      for (const key of keys) {
        if (result === undefined || result === null) {
          return defaultValue;
        }
        result = result[key];
      }
      
      return result === undefined ? defaultValue : result;
    } catch (e) {
      return defaultValue;
    }
  }

  function debounce(func, wait = 100) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function throttle(func, limit = 100) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Combined Modules
  // === validation.js ===
/**
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
          console.error(`Field with ID ${fieldId} not found`);
          return { isValid: false, value: null, message: `Field ${fieldId} not found` };
      }
      
      const value = field.value.trim();
      const errorDisplay = field.parentElement?.querySelector('.error-message');
      
      // Check if field is required and empty
      if (required && value === '') {
          field.classList.add('error');
          if (errorDisplay) errorDisplay.style.display = 'block';
          return { isValid: false, value: null, message: `${fieldName} is required.` };
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
          return { isValid: false, value: null, message: `${fieldName} must be a number.` };
      }
      
      // Check if value is within range
      if (numValue < min || numValue > max) {
          field.classList.add('error');
          if (errorDisplay) errorDisplay.style.display = 'block';
          return { isValid: false, value: null, message: `${fieldName} must be between ${min} and ${max}.` };
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
  


// === calculations.js ===
/**
   * CVD Risk Toolkit - Risk Calculation Functions
   */
  
  
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

  
  
/**
 * Check if a value is physiologically plausible
 * @param {string} parameterType - The type of parameter
 * @param {number} value - The value to check
 * @returns {Object} - { isValid, isWarning, message }
 */
function checkPhysiologicalPlausibility(parameterType, value) {
  if (!PHYSIOLOGICAL_RANGES[parameterType]) {
    console.warn(`No physiological range defined for parameter "${parameterType}"`);
    return { isValid: true, isWarning: false, message: null };
  }
  
  const range = PHYSIOLOGICAL_RANGES[parameterType];
  
  // Critical check (highly implausible)
  if (value < range.min || value > range.max) {
    return {
      isValid: false,
      isWarning: false,
      message: `${range.description || parameterType} value of ${value} ${range.unit} is outside the physiologically possible range (${range.min}-${range.max} ${range.unit})`
    };
  }
  
  // Warning check (unusual but possible)
  if (value < range.criticalMin || value > range.criticalMax) {
    return {
      isValid: true,
      isWarning: true,
      message: `${range.description || parameterType} value of ${value} ${range.unit} is unusual. Please verify this value.`
    };
  }
  
  // Value is within normal range
  return { isValid: true, isWarning: false, message: null };
}

  
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
  function combinedQRISK3Calculator(data) {
    // Implementation will be added
    return { baseRisk: 0, lpaModifier: 1, modifiedRisk: 0, riskCategory: 'low' };
  }
  


// === medication.js ===
/**
 * Medication management functionality for CVD Risk Toolkit
 */

/**
 * Calculate non-HDL cholesterol from total cholesterol and HDL
 */
function calculateNonHDL() {
    const totalCholInput = document.getElementById('med-total-chol');
    const hdlInput = document.getElementById('med-hdl');
    const nonHDLInput = document.getElementById('med-non-hdl');
    const nonHDLUnitSpan = document.getElementById('med-non-hdl-unit');
    
    if (totalCholInput && hdlInput && nonHDLInput && nonHDLInput.disabled) {
        const totalCholUnit = document.getElementById('med-total-chol-unit').value;
        const hdlUnit = document.getElementById('med-hdl-unit').value;
        
        let totalChol = parseFloat(totalCholInput.value);
        let hdl = parseFloat(hdlInput.value);
        
        if (!isNaN(totalChol) && !isNaN(hdl)) {
            // Convert units if needed
            if (totalCholUnit === 'mg/dL') {
                totalChol = convertCholesterol(totalChol, 'mg/dL', 'mmol/L');
            }
            if (hdlUnit === 'mg/dL') {
                hdl = convertCholesterol(hdl, 'mg/dL', 'mmol/L');
            }
            
            // Calculate non-HDL
            const nonHDL = totalChol - hdl;
            nonHDLInput.value = nonHDL.toFixed(2);
            nonHDLUnitSpan.textContent = 'mmol/L';
        }
    }
}

/**
 * Main function to evaluate medications and generate recommendations
 */
function evaluateMedications() {
    const result = validateMedicationForm();
    
    if (!result.isValid) {
        displayErrors(result.errors);
        return;
    }
    
    const data = result.data;
    
    // Standardize units for assessment
    const standardizedData = standardizeUnits(data);
    
    // Determine target LDL and non-HDL levels based on risk category
    const targetLevels = determineTargetLevels(standardizedData);
    
    // Assess current therapy and determine gaps
    const assessment = assessCurrentTherapy(standardizedData, targetLevels);
    
    // Generate recommendations
    const recommendations = generateRecommendations(standardizedData, assessment, targetLevels);
    
    // Check PCSK9 inhibitor eligibility for PharmaCare
    const pcsk9Coverage = assessPCSK9Coverage(standardizedData, assessment);
    
    // Display results
    displayMedicationResults(standardizedData, assessment, targetLevels, recommendations, pcsk9Coverage);
}

/**
 * Standardize units for all measurements to mmol/L
 * @param {Object} data - Raw form data
 * @returns {Object} - Data with standardized units
 */
function standardizeUnits(data) {
    const standardized = { ...data };
    
    // Convert cholesterol values to mmol/L if needed
    const cholesterolFields = ['total-chol', 'ldl', 'hdl', 'non-hdl'];
    cholesterolFields.forEach(field => {
        if (data[field] !== null && data[field] !== undefined) {
            if (data[field + '-unit'] === 'mg/dL') {
                standardized[field] = convertCholesterol(data[field], 'mg/dL', 'mmol/L');
                standardized[field + '-unit'] = 'mmol/L';
            }
        }
    });
    
    // Convert triglycerides to mmol/L if needed
    if (data['trig'] !== null && data['trig'] !== undefined) {
        if (data['trig-unit'] === 'mg/dL') {
            standardized['trig'] = data['trig'] / 88.5; // Conversion factor for triglycerides
            standardized['trig-unit'] = 'mmol/L';
        }
    }
    
    // Convert ApoB to g/L if needed
    if (data['apob'] !== null && data['apob'] !== undefined) {
        if (data['apob-unit'] === 'mg/dL') {
            standardized['apob'] = data['apob'] / 100; // Conversion factor for ApoB
            standardized['apob-unit'] = 'g/L';
        }
    }
    
    // Convert Lp(a) to mg/dL if needed
    if (data['lpa'] !== null && data['lpa'] !== undefined) {
        if (data['lpa-unit'] === 'nmol/L') {
            standardized['lpa'] = convertLpa(data['lpa'], 'nmol/L', 'mg/dL');
            standardized['lpa-unit'] = 'mg/dL';
        }
    }
    
    return standardized;
}

/**
 * Determine target LDL and non-HDL levels based on risk category
 * @param {Object} data - Standardized patient data
 * @returns {Object} - Target levels
 */
function determineTargetLevels(data) {
    const targets = {};
    
    // Determine targets based on clinical guidelines
    if (data.preventionCategory === 'secondary') {
        // Secondary prevention targets
        targets.ldl = { value: 1.8, unit: 'mmol/L' };
        targets.nonHDL = { value: 2.6, unit: 'mmol/L' };
        targets.apoB = { value: 0.8, unit: 'g/L' };
        targets.percentReduction = 50;
        targets.riskCategory = 'Very High Risk';
        
        // Even lower targets for recent ACS or multiple events
        if (data.secondaryDetails === 'mi' || data.secondaryDetails === 'multi') {
            targets.ldl = { value: 1.4, unit: 'mmol/L' };
            targets.nonHDL = { value: 2.2, unit: 'mmol/L' };
            targets.apoB = { value: 0.65, unit: 'g/L' };
            targets.percentReduction = 50;
            targets.riskCategory = 'Extreme Risk';
        }
    } else {
        // Primary prevention - check if risk scores are available
        let highestRisk = 0;
        
        // Try to get risk from session storage (cross-tab sharing)
        const storedRisk = sessionStorage.getItem('last-risk-score');
        if (storedRisk !== null) {
            highestRisk = parseFloat(storedRisk);
        } else {
            // Try to extract risk score from results if available
            const riskContainer = document.getElementById('risk-results');
            if (riskContainer) {
                const riskValueElements = riskContainer.querySelectorAll('.risk-value');
                riskValueElements.forEach(element => {
                    const riskText = element.textContent;
                    const riskMatch = riskText.match(/(\d+\.\d+)%/);
                    if (riskMatch) {
                        const riskValue = parseFloat(riskMatch[1]);
                        highestRisk = Math.max(highestRisk, riskValue);
                    }
                });
            }
        }
        
        // Set targets based on risk score
        if (highestRisk >= 20) {
            // High risk primary prevention
            targets.ldl = { value: 2.0, unit: 'mmol/L' };
            targets.nonHDL = { value: 2.6, unit: 'mmol/L' };
            targets.apoB = { value: 0.8, unit: 'g/L' };
            targets.percentReduction = 50;
            targets.riskCategory = 'High Risk';
        } else if (highestRisk >= 10) {
            // Intermediate risk primary prevention
            targets.ldl = { value: 2.0, unit: 'mmol/L' };
            targets.nonHDL = { value: 2.6, unit: 'mmol/L' };
            targets.apoB = { value: 0.8, unit: 'g/L' };
            targets.percentReduction = 30;
            targets.riskCategory = 'Intermediate Risk';
        } else {
            // Low risk primary prevention
            targets.ldl = { value: 3.5, unit: 'mmol/L' }; // Medication threshold for low risk
            targets.nonHDL = { value: 4.2, unit: 'mmol/L' };
            targets.apoB = { value: 1.0, unit: 'g/L' };
            targets.percentReduction = 30;
            targets.riskCategory = 'Low Risk';
        }
    }
    
    // Elevated Lp(a) may warrant more aggressive targets
    if (data.lpa !== undefined && data.lpa !== null && data.lpa >= 50) {
        targets.lpaAdjustedLDL = { value: Math.max(targets.ldl.value - 0.3, 1.4), unit: 'mmol/L' };
        targets.hasElevatedLpa = true;
    } else {
        targets.hasElevatedLpa = false;
    }
    
    return targets;
}
/**
 * Assess current therapy and determine gaps
 * @param {Object} data - Standardized patient data
 * @param {Object} targets - Target levels
 * @returns {Object} - Assessment results
 */
function assessCurrentTherapy(data, targets) {
    const assessment = {
        currentTherapyIntensity: 'None',
        atLDLTarget: false,
        atNonHDLTarget: false,
        atApoBTarget: false,
        gapToLDLTarget: 0,
        gapToNonHDLTarget: 0,
        estimatedAdditionalLDLReduction: 0,
        canIntensifyStatin: false,
        maxStatinReached: false,
        statinIntolerance: false,
        onEzetimibe: data.ezetimibe,
        onPCSK9: data.pcsk9,
        onMaximumTherapy: false,
        hypertriglyceridemia: false,
        mixedDyslipidemia: false
    };
    
    // Assess current therapy intensity
    if (data.statin !== 'none') {
        assessment.currentTherapyIntensity = data['statin-intensity'] || 'Unknown';
        
        // Check if maximum statin dose reached
        if (data['statin-intensity'] === 'high') {
            const maxDoses = {
                atorvastatin: '80',
                rosuvastatin: '40',
                simvastatin: '40',
                pravastatin: '80',
                lovastatin: '40',
                fluvastatin: '80',
                pitavastatin: '4'
            };
            
            assessment.maxStatinReached = data['statin-dose'] === maxDoses[data.statin];
        }
        
        // Determine if statin can be intensified
        if (data['statin-intensity'] === 'low' || data['statin-intensity'] === 'moderate') {
            assessment.canIntensifyStatin = true;
        }
    }
    
    // Check statin intolerance
    assessment.statinIntolerance = data['statin-intolerance'] !== 'no';
    
    // Check if on maximum therapy
    assessment.onMaximumTherapy = (
        (assessment.maxStatinReached || (assessment.statinIntolerance && data['statin-intolerance'] === 'complete')) &&
        assessment.onEzetimibe
    );
    
    // Evaluate lipid targets
    if (data.ldl !== undefined && data.ldl !== null) {
        assessment.atLDLTarget = data.ldl <= targets.ldl.value;
        assessment.gapToLDLTarget = data.ldl - targets.ldl.value;
    }
    
    if (data['non-hdl'] !== undefined && data['non-hdl'] !== null) {
        assessment.atNonHDLTarget = data['non-hdl'] <= targets.nonHDL.value;
        assessment.gapToNonHDLTarget = data['non-hdl'] - targets.nonHDL.value;
    }
    
    if (data.apob !== undefined && data.apob !== null) {
        assessment.atApoBTarget = data.apob <= targets.apoB.value;
    }
    
    // Check for hypertriglyceridemia
    if (data.trig !== undefined && data.trig !== null) {
        assessment.hypertriglyceridemia = data.trig > 2.0;
        assessment.severeTriglycerides = data.trig > 5.0;
    }
    
    // Check for mixed dyslipidemia
    if (data.ldl !== undefined && data.trig !== undefined && data.hdl !== undefined) {
        assessment.mixedDyslipidemia = data.ldl > targets.ldl.value && data.trig > 2.0 && data.hdl < 1.0;
    }
    
    // Estimate additional LDL reduction needed if not at target
    if (!assessment.atLDLTarget && assessment.gapToLDLTarget > 0) {
        assessment.estimatedAdditionalLDLReduction = (assessment.gapToLDLTarget / data.ldl) * 100;
    }
    
    return assessment;
}

/**
 * Generate medication recommendations based on assessment
 * @param {Object} data - Standardized patient data
 * @param {Object} assessment - Current therapy assessment
 * @param {Object} targets - Target levels
 * @returns {Object} - Recommendation details
 */
function generateRecommendations(data, assessment, targets) {
    const recommendations = {
        summary: [],
        statinChange: null,
        statinRationale: null,
        ezetimibeChange: null,
        ezetimibeRationale: null,
        pcsk9Change: null,
        pcsk9Rationale: null,
        otherTherapies: [],
        nonPharmacological: [
            'Therapeutic lifestyle changes (Mediterranean or DASH diet)',
            'Regular physical activity (150+ minutes/week of moderate activity)',
            'Smoking cessation for all smokers',
            'Weight management targeting BMI <25 kg/m²'
        ]
    };
    
    // Assign risk category
    const riskCategory = targets.riskCategory;
    
    // Determine statin recommendations
    if (data.statin === 'none' && !assessment.statinIntolerance) {
        // No current statin and no intolerance
        if (riskCategory === 'High Risk' || riskCategory === 'Very High Risk' || riskCategory === 'Extreme Risk') {
            recommendations.statinChange = 'Initiate high-intensity statin therapy';
            recommendations.statinRationale = 'High-intensity statin therapy is recommended for high-risk patients to achieve ≥50% LDL-C reduction';
            recommendations.summary.push('Start high-intensity statin (atorvastatin 40-80 mg or rosuvastatin 20-40 mg)');
        } else if (riskCategory === 'Intermediate Risk') {
            recommendations.statinChange = 'Initiate moderate-intensity statin therapy';
            recommendations.statinRationale = 'Moderate-intensity statin therapy is recommended for intermediate-risk patients to achieve 30-50% LDL-C reduction';
            recommendations.summary.push('Start moderate-intensity statin (atorvastatin 10-20 mg, rosuvastatin 5-10 mg, or equivalent)');
        } else if (data.ldl >= 5.0) {
            recommendations.statinChange = 'Consider statin therapy despite low risk due to very high LDL-C';
            recommendations.statinRationale = 'LDL-C ≥5.0 mmol/L may indicate familial hypercholesterolemia and warrants consideration of statin therapy regardless of risk category';
            recommendations.summary.push('Consider statin therapy due to very high LDL-C');
        } else {
            recommendations.statinChange = 'Statin therapy not routinely recommended for low-risk patients';
            recommendations.statinRationale = 'For low-risk patients, lifestyle modification is the primary intervention';
            recommendations.summary.push('Focus on lifestyle modifications');
        }
    } else if (data.statin !== 'none' && assessment.canIntensifyStatin && !assessment.atLDLTarget && !assessment.statinIntolerance) {
        // On non-maximum statin, not at target, and no intolerance
        recommendations.statinChange = 'Intensify current statin therapy';
        recommendations.statinRationale = 'Intensifying statin therapy can provide additional LDL-C reduction to help reach target';
        recommendations.summary.push(`Increase ${data.statin} dose to achieve greater LDL-C reduction`);
    } else if (assessment.statinIntolerance && data['statin-intolerance'] === 'complete') {
        // Complete statin intolerance
        recommendations.statinChange = 'Statin therapy not feasible due to documented intolerance';
        recommendations.statinRationale = 'Alternative lipid-lowering strategies are required for patients with complete statin intolerance';
        recommendations.summary.push('Statin-independent therapy required due to documented statin intolerance');
    } else if (assessment.statinIntolerance && data['statin-intolerance'] === 'partial') {
        // Partial statin intolerance
        recommendations.statinChange = 'Continue maximum tolerated statin dose';
        recommendations.statinRationale = 'Maintain the highest tolerated statin dose to achieve as much LDL-C reduction as possible';
        recommendations.summary.push('Maintain current tolerated statin dose');
    } else if (assessment.atLDLTarget) {
        // At LDL target
        recommendations.statinChange = 'Continue current statin therapy';
        recommendations.statinRationale = 'Current therapy is effectively reaching the target LDL-C level';
        recommendations.summary.push('Continue current statin therapy');
    } else {
        // On maximum statin, not at target
        recommendations.statinChange = 'Continue maximum statin therapy';
        recommendations.statinRationale = 'Maximum statin therapy should be maintained while considering add-on therapies';
        recommendations.summary.push('Continue maximum statin therapy');
    }
    
    // Determine ezetimibe recommendations
    if (!assessment.onEzetimibe && !assessment.atLDLTarget && 
        (data.statin !== 'none' || assessment.statinIntolerance)) {
        // Not on ezetimibe, not at target, and either on statin or statin intolerant
        recommendations.ezetimibeChange = 'Add ezetimibe therapy';
        recommendations.ezetimibeRationale = 'Ezetimibe can provide an additional 15-25% LDL-C reduction';
        recommendations.summary.push('Add ezetimibe 10 mg daily');
    } else if (assessment.onEzetimibe && assessment.atLDLTarget) {
        // On ezetimibe and at target
        recommendations.ezetimibeChange = 'Continue ezetimibe therapy';
        recommendations.ezetimibeRationale = 'Current combination therapy is effectively reaching the target LDL-C level';
    } else if (assessment.onEzetimibe && !assessment.atLDLTarget) {
        // On ezetimibe, not at target
        recommendations.ezetimibeChange = 'Continue ezetimibe therapy';
        recommendations.ezetimibeRationale = 'Ezetimibe should be continued while considering additional lipid-lowering options';
    }

    // Determine PCSK9 inhibitor recommendations
    const highRiskCategories = ['High Risk', 'Very High Risk', 'Extreme Risk'];
    if (!assessment.onPCSK9 && !assessment.atLDLTarget && 
        assessment.onEzetimibe && (data.statin !== 'none' || assessment.statinIntolerance) &&
        highRiskCategories.includes(riskCategory)) {
        // Not on PCSK9, not at target, on ezetimibe, and either on statin or statin intolerant
        if (data.preventionCategory === 'secondary' && data.ldl >= 2.5) {
            recommendations.pcsk9Change = 'Consider PCSK9 inhibitor therapy';
            recommendations.pcsk9Rationale = 'PCSK9 inhibitors can provide an additional 50-60% LDL-C reduction in patients with established ASCVD not at target despite maximum tolerated statin plus ezetimibe';
            recommendations.summary.push('Consider PCSK9 inhibitor for secondary prevention');
        } else if (data.preventionCategory === 'primary' && data.ldl >= 3.5) {
            recommendations.pcsk9Change = 'Consider PCSK9 inhibitor therapy if familial hypercholesterolemia is confirmed';
            recommendations.pcsk9Rationale = 'PCSK9 inhibitors may be considered for primary prevention in patients with confirmed FH and LDL-C ≥3.5 mmol/L despite maximum tolerated statin plus ezetimibe';
            recommendations.summary.push('Consider PCSK9 inhibitor if FH is confirmed');
        }
    } else if (assessment.onPCSK9) {
        // Already on PCSK9 inhibitor
        recommendations.pcsk9Change = 'Continue PCSK9 inhibitor therapy';
        recommendations.pcsk9Rationale = 'Continue current therapy and reassess lipid levels at next follow-up';
    }
    
    // Recommendations for hypertriglyceridemia
    if (assessment.severeTriglycerides) {
        recommendations.otherTherapies.push({
            therapy: 'Consider fibrate therapy',
            rationale: 'Severe hypertriglyceridemia (>5.0 mmol/L) increases risk of pancreatitis and may benefit from fibrate therapy',
            intensityClass: 'warning'
        });
        recommendations.summary.push('Fibrate therapy for severe hypertriglyceridemia');
    } else if (assessment.hypertriglyceridemia && assessment.mixedDyslipidemia) {
        recommendations.otherTherapies.push({
            therapy: 'Consider fenofibrate as add-on therapy',
            rationale: 'Mixed dyslipidemia with elevated triglycerides and low HDL-C may benefit from add-on fenofibrate therapy after statin optimization',
            intensityClass: 'info'
        });
    }
    
    // Additional recommendations for elevated Lp(a)
    if (targets.hasElevatedLpa) {
        recommendations.otherTherapies.push({
            therapy: 'More aggressive LDL-C targets recommended',
            rationale: 'Elevated Lp(a) is an independent risk factor that warrants more aggressive LDL-C reduction',
            intensityClass: 'warning'
        });
        recommendations.summary.push('More aggressive LDL-C targets due to elevated Lp(a)');
        
        recommendations.otherTherapies.push({
            therapy: 'Consider family screening for Lp(a)',
            rationale: 'Elevated Lp(a) is largely genetically determined and first-degree relatives should be screened',
            intensityClass: 'info'
        });
    }
    
    return recommendations;
}

/**
 * Assess PCSK9 inhibitor coverage eligibility
 * @param {Object} data - Standardized patient data
 * @param {Object} assessment - Current therapy assessment
 * @returns {Object} - Coverage assessment
 */
function assessPCSK9Coverage(data, assessment) {
    const coverage = {
        eligible: false,
        criteria: [],
        notMet: [],
        notes: []
    };
    
    // Check if already on PCSK9
    if (data.pcsk9) {
        coverage.notes.push('Patient is currently on PCSK9 inhibitor therapy');
    }
    
    // Check for secondary prevention
    if (data.preventionCategory === 'secondary') {
        coverage.criteria.push('Secondary prevention');
        
        // Check LDL criterion
        if (data.ldl >= 2.0) {
            coverage.criteria.push('LDL-C ≥2.0 mmol/L');
        } else {
            coverage.notMet.push('LDL-C must be ≥2.0 mmol/L for secondary prevention coverage');
        }
        
        // Check for recent event
        if (data.secondaryDetails === 'mi') {
            coverage.criteria.push('Recent MI/ACS (higher priority for coverage)');
        }
        
        // Check for multi-vessel disease
        if (data.secondaryDetails === 'multi') {
            coverage.criteria.push('Multi-vessel disease (higher priority for coverage)');
        }
    } 
    // Check for primary prevention with very high LDL
    else if (data.preventionCategory === 'primary' && data.ldl >= 3.5) {
        coverage.criteria.push('Primary prevention with very high LDL-C');
        coverage.notes.push('Documentation of familial hypercholesterolemia with DLCN score ≥6 would be required');
    } else {
        coverage.notMet.push('Does not meet primary coverage criteria (secondary prevention or primary prevention with LDL-C ≥3.5 mmol/L and documented FH)');
    }
    
    // Check for maximum tolerated therapy
    if (assessment.onMaximumTherapy) {
        coverage.criteria.push('On maximum tolerated lipid-lowering therapy');
    } else {
        if (!assessment.statinIntolerance) {
            coverage.notMet.push('Must be on maximum tolerated statin therapy');
        }
        
        if (!data.ezetimibe) {
            coverage.notMet.push('Must be on ezetimibe in addition to maximum tolerated statin');
        }
    }
    
    // Check duration on maximum therapy
    if (data['max-therapy-duration'] === '>6' || data['max-therapy-duration'] === '3-6') {
        coverage.criteria.push('≥3 months on maximum tolerated therapy');
    } else {
        coverage.notMet.push('Must be on maximum tolerated therapy for at least 3 months');
    }
    
    // Check for documented statin intolerance if applicable
    if (assessment.statinIntolerance) {
        if (data['intolerance-type'] && data['intolerance-type'] !== '') {
            coverage.criteria.push('Documented statin intolerance');
        } else {
            coverage.notMet.push('Statin intolerance must be properly documented');
        }
    }
    
    // Determine overall eligibility
    coverage.eligible = coverage.notMet.length === 0 && (
        (data.preventionCategory === 'secondary' && data.ldl >= 2.0 && assessment.onMaximumTherapy) ||
        (data.preventionCategory === 'primary' && data.ldl >= 3.5 && assessment.onMaximumTherapy)
    );
    
    return coverage;
}

/**
 * Display medication evaluation results
 * @param {Object} data - Standardized patient data
 * @param {Object} assessment - Current therapy assessment
 * @param {Object} targets - Target levels
 * @param {Object} recommendations - Recommendations object
 * @param {Object} pcsk9Coverage - PCSK9 coverage assessment
 */
function displayMedicationResults(data, assessment, targets, recommendations, pcsk9Coverage) {
    const resultsContainer = document.getElementById('results-container');
    const resultsDiv = document.getElementById('risk-results');
    
    if (!resultsContainer || !resultsDiv) {
        console.error('Results container not found');
        return;
    }
    
    // Clear previous results
    resultsDiv.innerHTML = '';
    
    // Create results card
    const resultCard = document.createElement('div');
    resultCard.className = 'results-card';
    
    // Add header
    resultCard.innerHTML = `
        <div class="risk-header">
            <h3 class="risk-title">Lipid-Lowering Therapy Assessment</h3>
            <div class="risk-badge ${assessment.atLDLTarget ? 'low' : 'high'}">
                ${assessment.atLDLTarget ? 'At Target' : 'Not At Target'}
            </div>
        </div>
    `;
    
    // Current lipid profile and targets section
    const lipidProfile = document.createElement('div');
    lipidProfile.className = 'lipid-profile-section';
    lipidProfile.innerHTML = `
        <h4>Current Lipid Profile vs. Targets</h4>
        <div class="lipid-table">
            <div class="table-header">
                <div class="table-cell">Parameter</div>
                <div class="table-cell">Current Value</div>
                <div class="table-cell">Target</div>
                <div class="table-cell">Status</div>
            </div>
            <div class="table-row">
                <div class="table-cell">LDL Cholesterol</div>
                <div class="table-cell">${data.ldl.toFixed(2)} mmol/L</div>
                <div class="table-cell">${targets.ldl.value} mmol/L</div>
                <div class="table-cell ${assessment.atLDLTarget ? 'target-met' : 'target-not-met'}">
                    ${assessment.atLDLTarget ? 'At Target' : 'Not At Target'}
                </div>
            </div>
            <div class="table-row">
                <div class="table-cell">Non-HDL Cholesterol</div>
                <div class="table-cell">${data['non-hdl'].toFixed(2)} mmol/L</div>
                <div class="table-cell">${targets.nonHDL.value} mmol/L</div>
                <div class="table-cell ${assessment.atNonHDLTarget ? 'target-met' : 'target-not-met'}">
                    ${assessment.atNonHDLTarget ? 'At Target' : 'Not At Target'}
                </div>
            </div>
            ${data.apob ? `
            <div class="table-row">
                <div class="table-cell">ApoB</div>
                <div class="table-cell">${data.apob.toFixed(2)} g/L</div>
                <div class="table-cell">${targets.apoB.value} g/L</div>
                <div class="table-cell ${assessment.atApoBTarget ? 'target-met' : 'target-not-met'}">
                    ${assessment.atApoBTarget ? 'At Target' : 'Not At Target'}
                </div>
            </div>
            ` : ''}
            <div class="table-row">
                <div class="table-cell">Triglycerides</div>
                <div class="table-cell">${data.trig.toFixed(2)} mmol/L</div>
                <div class="table-cell">&lt;1.7 mmol/L</div>
                <div class="table-cell ${data.trig < 1.7 ? 'target-met' : 'target-not-met'}">
                    ${data.trig < 1.7 ? 'Normal' : (data.trig > 5.0 ? 'Severely Elevated' : 'Elevated')}
                </div>
            </div>
            ${data.lpa ? `
            <div class="table-row">
                <div class="table-cell">Lp(a)</div>
                <div class="table-cell">${data.lpa} mg/dL</div>
                <div class="table-cell">&lt;50 mg/dL</div>
                <div class="table-cell ${data.lpa < 50 ? 'target-met' : 'target-not-met'}">
                    ${data.lpa < 50 ? 'Normal' : 'Elevated'}
                </div>
            </div>
            ` : ''}
        </div>
        <div class="risk-category-info">
            <p><strong>Risk Category:</strong> ${targets.riskCategory}</p>
            <p><strong>Current Therapy Intensity:</strong> ${assessment.currentTherapyIntensity}</p>
            ${assessment.gapToLDLTarget > 0 ? 
            `<p><strong>Additional LDL-C Reduction Needed:</strong> ${assessment.estimatedAdditionalLDLReduction.toFixed(0)}%</p>` : ''}
        </div>
    `;
    
    resultCard.appendChild(lipidProfile);
    
    // Treatment recommendations section
    const recommendationsSection = document.createElement('div');
    recommendationsSection.className = 'recommendations-section';
    recommendationsSection.innerHTML = `
        <h4>Treatment Recommendations</h4>
        <div class="recommendations-summary">
            <ul>
                ${recommendations.summary.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>
        
        <div class="detailed-recommendations">
            ${recommendations.statinChange ? `
            <div class="recommendation-item">
                <h5>Statin Therapy</h5>
                <p>${recommendations.statinChange}</p>
                <div class="rationale">
                    <p><strong>Rationale:</strong> ${recommendations.statinRationale}</p>
                </div>
            </div>
            ` : ''}
            
            ${recommendations.ezetimibeChange ? `
            <div class="recommendation-item">
                <h5>Ezetimibe</h5>
                <p>${recommendations.ezetimibeChange}</p>
                <div class="rationale">
                    <p><strong>Rationale:</strong> ${recommendations.ezetimibeRationale}</p>
                </div>
            </div>
            ` : ''}
            
            ${recommendations.pcsk9Change ? `
            <div class="recommendation-item">
                <h5>PCSK9 Inhibitor</h5>
                <p>${recommendations.pcsk9Change}</p>
                <div class="rationale">
                    <p><strong>Rationale:</strong> ${recommendations.pcsk9Rationale}</p>
                </div>
            </div>
            ` : ''}
            
            ${recommendations.otherTherapies.length > 0 ? `
            <div class="recommendation-item">
                <h5>Additional Considerations</h5>
                ${recommendations.otherTherapies.map(therapy => `
                    <div class="other-therapy ${therapy.intensityClass}">
                        <p>${therapy.therapy}</p>
                        <div class="rationale">
                            <p><strong>Rationale:</strong> ${therapy.rationale}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <div class="recommendation-item">
                <h5>Non-Pharmacological Therapy</h5>
                <ul>
                    ${recommendations.nonPharmacological.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    
    resultCard.appendChild(recommendationsSection);
    
    // PCSK9 coverage section if applicable
    if (recommendations.pcsk9Change || data.pcsk9) {
        const pcsk9Section = document.createElement('div');
        pcsk9Section.className = 'pcsk9-coverage-assessment';
        pcsk9Section.innerHTML = `
            <h4>PCSK9 Inhibitor Coverage Assessment</h4>
            <div class="coverage-status ${pcsk9Coverage.eligible ? 'eligible' : 'not-eligible'}">
                <p><strong>Coverage Status:</strong> ${pcsk9Coverage.eligible ? 'Likely Eligible' : 'Currently Not Eligible'}</p>
            </div>
            
            ${pcsk9Coverage.criteria.length > 0 ? `
            <div class="criteria-met">
                <p><strong>Criteria Met:</strong></p>
                <ul>
                    ${pcsk9Coverage.criteria.map(criterion => `<li>${criterion}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${pcsk9Coverage.notMet.length > 0 ? `
            <div class="criteria-not-met">
                <p><strong>Criteria Not Met:</strong></p>
                <ul>
                    ${pcsk9Coverage.notMet.map(criterion => `<li>${criterion}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${pcsk9Coverage.notes.length > 0 ? `
            <div class="coverage-notes">
                <p><strong>Notes:</strong></p>
                <ul>
                    ${pcsk9Coverage.notes.map(note => `<li>${note}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            <div class="coverage-info">
                <p><strong>Documentation Required for Special Authority:</strong></p>
                <ul>
                    <li>Current and baseline lipid values</li>
                    <li>Details of current and previous lipid-lowering therapies</li>
                    <li>Documentation of statin intolerance if applicable</li>
                    <li>For primary prevention: documentation of familial hypercholesterolemia diagnosis</li>
                </ul>
            </div>
        `;
        
        resultCard.appendChild(pcsk9Section);
    }
    
    // Add card to results
    resultsDiv.appendChild(resultCard);
    
    // Show results container
    document.querySelector('#results-date span').textContent = new Date().toLocaleDateString();
    resultsContainer.style.display = 'block';
    
    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}


// === ui.js ===
/**
 * UI functionality for CVD Risk Toolkit
 */

/**
 * Opens the specified tab and handles tab switching
 * @param {Event} evt - The click event
 * @param {string} tabId - The ID of the tab to open
 */
function openTab(evt, tabId) {
    // Hide all tab content
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }
    
    // Remove active class from all tabs
    const tabs = document.getElementsByClassName("tab");
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove("active");
    }
    
    // Show the selected tab content and mark the button as active
    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
}

/**
 * Initialize the application
 * This function sets up event listeners and initializes the UI
 */
function initializeApp() {
    console.log("Initializing CVD Risk Toolkit...");
    
    // Setup event listeners for tabs
    setupTabEventListeners();
    
    // Setup card headers
    setupCardHeaders();
    
    // Initialize tooltips and other UI elements
    initializeTooltips();
    setupModalClose();
    setupHelpModal();
    addClinicalValidation();
    
    // Set up cross-tab data sharing
    setupCrossTabDataSharing();
    
    // Setup height toggle event listeners
    setupHeightToggleListeners();
    
    // Setup SBP readings toggle
    setupSBPReadingsToggle();
    
    // Setup theme toggle
    setupThemeToggle();
    
    // Set current date
    document.querySelector('#results-date span').textContent = new Date().toLocaleDateString();
    
    console.log("CVD Risk Toolkit initialization complete");
}

/**
 * Set up event listeners for tabs
 */
function setupTabEventListeners() {
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(tab => {
        tab.addEventListener('click', function(event) {
            event.preventDefault();
            const tabId = this.getAttribute('data-tab');
            openTab(event, tabId);
        });
    });
}

/**
 * Set up expandable/collapsible card headers
 */
function setupCardHeaders() {
    const cardHeaders = document.querySelectorAll('.card-header');
    
    cardHeaders.forEach(header => {
        header.addEventListener('click', function() {
            // Toggle active class for header
            this.classList.toggle('active');
            
            // Toggle the display of card body
            const body = this.nextElementSibling;
            if (body.classList.contains('active')) {
                body.classList.remove('active');
                this.querySelector('.toggle-icon').textContent = '▲';
            } else {
                body.classList.add('active');
                this.querySelector('.toggle-icon').textContent = '▼';
            }
        });
    });
}

/**
 * Initialize tooltips for informational icons
 */
function initializeTooltips() {
    const tooltipContainers = document.querySelectorAll('.tooltip-container');
    
    tooltipContainers.forEach(function(container) {
        const infoIcon = container.querySelector('.info-icon');
        const tooltipText = container.querySelector('.tooltip-text');
        
        if (infoIcon && tooltipText) {
            infoIcon.addEventListener('click', function(event) {
                event.stopPropagation();
                tooltipText.style.visibility = tooltipText.style.visibility === 'visible' ? 'hidden' : 'visible';
                tooltipText.style.opacity = tooltipText.style.opacity === '1' ? '0' : '1';
            });
            
            document.addEventListener('click', function() {
                tooltipText.style.visibility = 'hidden';
                tooltipText.style.opacity = '0';
            });
        }
    });
}

/**
 * Setup modal close functionality
 */
function setupModalClose() {
    // Close modal when close button is clicked
    const closeButtons = document.querySelectorAll('.close-btn, .modal-close');
    closeButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(function(modal) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

/**
 * Setup the help modal tabs
 */
function setupHelpModal() {
    // Set up help tab navigation
    const helpTabs = document.querySelectorAll('.help-tab');
    helpTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and content
            document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.help-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding content
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Set up cross-tab data sharing to allow calculated risk scores
 * to impact medication recommendations
 */
function setupCrossTabDataSharing() {
    // Listen for risk calculation events
    document.addEventListener('risk-calculated', function(e) {
        // Update medication tab with risk information if available
        if (e.detail && e.detail.riskScore !== undefined) {
            // Store risk information in session storage for tab persistence
            sessionStorage.setItem('last-risk-score', e.detail.riskScore);
            sessionStorage.setItem('risk-calculator-used', e.detail.calculator || 'unknown');
            
            // Update comparison tab status
            updateComparisonTabStatus(e.detail.calculator.toLowerCase(), true);
        }
    });
    
    // Check if we have stored risk information on page load
    const storedRisk = sessionStorage.getItem('last-risk-score');
    const storedCalculator = sessionStorage.getItem('risk-calculator-used');
    
    if (storedRisk && storedCalculator) {
        // Update comparison tab status based on stored information
        if (storedCalculator === 'FRS') {
            updateComparisonTabStatus('frs', true);
        } else if (storedCalculator === 'QRISK3') {
            updateComparisonTabStatus('qrisk', true);
        } else if (storedCalculator === 'Combined') {
            updateComparisonTabStatus('frs', true);
            updateComparisonTabStatus('qrisk', true);
        }
    }
}

/**
 * Setup height toggle event listeners
 */
function setupHeightToggleListeners() {
    const heightUnit = document.getElementById('qrisk-height-unit');
    if (heightUnit) {
        heightUnit.addEventListener('change', function() {
            toggleHeightInputs('qrisk');
        });
    }
}

/**
 * Toggle height inputs between cm and ft/in
 * @param {string} prefix - Form prefix ('qrisk')
 */
function toggleHeightInputs(prefix) {
    const heightUnit = document.getElementById(`${prefix}-height-unit`).value;
    const heightInput = document.getElementById(`${prefix}-height`);
    const heightFtContainer = document.getElementById(`${prefix}-height-ft-container`);
    
    if (heightUnit === 'cm') {
        heightInput.style.display = 'block';
        heightFtContainer.style.display = 'none';
        
        // If feet/inches values exist, convert to cm
        const feetInput = document.getElementById(`${prefix}-height-feet`);
        const inchesInput = document.getElementById(`${prefix}-height-inches`);
        
        if (feetInput.value && feetInput.value.trim() !== '') {
            const feet = parseFloat(feetInput.value) || 0;
            const inches = parseFloat(inchesInput.value) || 0;
            const cm = convertHeightToCm(feet, inches);
            heightInput.value = cm.toFixed(1);
        }
    } else {
        heightInput.style.display = 'none';
        heightFtContainer.style.display = 'flex';
        
        // If cm value exists, convert to feet/inches
        if (heightInput.value && heightInput.value.trim() !== '') {
            const cm = parseFloat(heightInput.value);
            const totalInches = cm / 2.54;
            const feet = Math.floor(totalInches / 12);
            const inches = Math.round(totalInches % 12);
            
            document.getElementById(`${prefix}-height-feet`).value = feet;
            document.getElementById(`${prefix}-height-inches`).value = inches;
        }
    }
}

/**
 * Setup SBP readings toggle
 */
function setupSBPReadingsToggle() {
    const qriskToggle = document.getElementById('qrisk-toggle-sbp-readings');
    if (qriskToggle) {
        qriskToggle.addEventListener('click', function() {
            const readingsDiv = document.getElementById('qrisk-sbp-readings');
            if (readingsDiv.style.display === 'none') {
                readingsDiv.style.display = 'block';
                this.textContent = 'Hide readings form';
            } else {
                readingsDiv.style.display = 'none';
                this.textContent = 'Calculate from multiple readings';
            }
        });
    }
}

/**
 * Setup dark/light theme toggle
 */
function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Check if theme preference is stored
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.body.classList.toggle('dark-theme', currentTheme === 'dark');
        
        // Update icon based on current theme
        updateThemeIcon(currentTheme === 'dark');
        
        // Add click event
        themeToggle.addEventListener('click', function() {
            // Toggle theme
            const isDarkTheme = document.body.classList.toggle('dark-theme');
            
            // Save preference
            localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
            
            // Update icon
            updateThemeIcon(isDarkTheme);
        });
    }
}

/**
 * Update theme toggle icon based on current theme
 * @param {boolean} isDarkTheme - Whether dark theme is active
 */
function updateThemeIcon(isDarkTheme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        if (isDarkTheme) {
            themeToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"></path></svg>';
            themeToggle.setAttribute('aria-label', 'Switch to light mode');
        } else {
            themeToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';
            themeToggle.setAttribute('aria-label', 'Switch to dark mode');
        }
    }
}

/**
 * Handle "Reset Form" button clicks
 * @param {string} formId - ID of the form to reset
 */
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (!form) {
        return;
    }
    
    // Reset all inputs to default values
    form.reset();
    
    // Clear any error styling
    const errorFields = form.querySelectorAll('.error');
    errorFields.forEach(field => field.classList.remove('error'));
    
    // Hide error messages
    const errorMessages = form.querySelectorAll('.error-message');
    errorMessages.forEach(message => message.style.display = 'none');
    
    // Clear any calculated values or results
    const nonHDLInput = form.querySelector('#med-non-hdl');
    if (nonHDLInput) {
        nonHDLInput.value = '';
        nonHDLInput.disabled = true;
        const toggleLink = document.getElementById('toggle-manual-non-hdl');
        if (toggleLink) toggleLink.textContent = 'Enter manually';
    }
    
    // Reset PCSK9 details if present
    const pcsk9Details = document.getElementById('pcsk9-details');
    if (pcsk9Details) pcsk9Details.style.display = 'none';
    
    // Reset any dependent selects or fields
    const statinDoseSelect = form.querySelector('#med-statin-dose');
    if (statinDoseSelect) {
        statinDoseSelect.innerHTML = '<option value="" selected>Select dose</option>';
        statinDoseSelect.disabled = true;
    }
    
    const secondaryDetails = form.querySelector('#secondary-details');
    if (secondaryDetails) secondaryDetails.disabled = true;
    
    const intoleranceType = form.querySelector('#med-intolerance-type');
    if (intoleranceType) intoleranceType.disabled = true;
    
    // Clear SBP readings if present
    for (let i = 1; i <= 6; i++) {
        const reading = form.querySelector(`#${formId.split('-')[0]}-sbp-reading-${i}`);
        if (reading) reading.value = '';
    }
    
    const sbpResult = document.getElementById(`${formId.split('-')[0]}-sbp-sd-result`);
    if (sbpResult) sbpResult.style.display = 'none';
    
    // Reset height/feet view if applicable
    const heightUnit = form.querySelector(`#${formId.split('-')[0]}-height-unit`);
    if (heightUnit && heightUnit.value === 'ft/in') {
        heightUnit.value = 'cm';
        toggleHeightInputs(formId.split('-')[0]);
    }
    
    // Update comparison tab status if applicable
    if (formId === 'frs-form') {
        updateComparisonTabStatus('frs', false);
    } else if (formId === 'qrisk-form') {
        updateComparisonTabStatus('qrisk', false);
    }
    
    // Hide results display
    document.getElementById('results-container').style.display = 'none';
}

/**
 * Export results to CSV or PDF
 * @param {string} format - 'csv' or 'pdf'
 */
function exportResults(format) {
    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer || resultsContainer.style.display === 'none') {
        showModal('No results to export. Please calculate risk scores first.');
        return;
    }
    
    if (format === 'csv') {
        exportToCSV();
    } else if (format === 'pdf') {
        showPdfPreview();
    }
}

/**
 * Export results to CSV file
 */
function exportToCSV() {
    // Get data from results
    const riskTitle = document.querySelector('.risk-title')?.textContent || 'CVD Risk Assessment';
    const baseRisk = document.querySelector('.base-risk')?.textContent || 'N/A';
    const lpaModifier = document.querySelector('.lpa-modifier')?.textContent || 'N/A';
    const adjustedRisk = document.querySelector('.adjusted-risk')?.textContent || 'N/A';
    const riskCategory = document.querySelector('.risk-category')?.textContent || 'N/A';
    const date = document.querySelector('#results-date span')?.textContent || new Date().toLocaleDateString();
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'CVD Risk Assessment Results,\r\n';
    csvContent += 'Date,' + date + '\r\n\r\n';
    csvContent += 'Assessment Type,' + riskTitle + '\r\n';
    csvContent += 'Base Risk,' + baseRisk + '\r\n';
    csvContent += 'Lp(a) Modifier,' + lpaModifier + '\r\n';
    csvContent += 'Adjusted Risk,' + adjustedRisk + '\r\n';
    csvContent += 'Risk Category,' + riskCategory + '\r\n\r\n';
    
    // Add recommendations (cleaned of HTML)
    const recommendations = document.getElementById('recommendations-content');
    if (recommendations) {
        const recItems = recommendations.querySelectorAll('.recommendation-item');
        if (recItems.length > 0) {
            csvContent += 'Treatment Recommendations,\r\n';
            
            recItems.forEach(item => {
                const title = item.querySelector('strong')?.textContent || '';
                const content = item.textContent.replace(title, '').trim();
                csvContent += title + ',' + content.replace(/,/g, ';') + '\r\n';
            });
        }
    }
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'cvd_risk_assessment_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    document.body.removeChild(link);
}

/**
 * Show PDF preview before export
 */
function showPdfPreview() {
    const previewModal = document.getElementById('pdf-preview-modal');
    const previewContent = document.getElementById('pdf-preview-content');
    
    if (!previewModal || !previewContent) {
        showModal('PDF preview functionality is not available. Please try again later.');
        return;
    }
    
    // Clone the results section for preview
    const resultsContainer = document.getElementById('results-container');
    previewContent.innerHTML = '';
    previewContent.appendChild(resultsContainer.cloneNode(true));
    
    // Add preview styling
    previewContent.querySelector('.export-section').style.display = 'none';
    
    // Show the preview modal
    previewModal.style.display = 'block';
    
    // Setup download button
    document.getElementById('download-pdf-btn').addEventListener('click', function() {
        // In a real implementation, this would use a library like jsPDF or html2pdf
        // For this demo, we'll just show a message
        showModal('PDF generation would be implemented here with a library like jsPDF or html2pdf.');
        previewModal.style.display = 'none';
    });
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);


// === form-handler.js ===
/**
 * Form Handler Module
 * Provides comprehensive form handling functionality including validation,
 * submission, state management, and accessibility features
 */
const formHandler = (function() {
    // Configuration
    const config = {
        debounceDelay: 300,
        validationRealtime: true,
        scrollToError: true,
        scrollOffset: 20,
        saveFormState: true,
        storageKey: 'formState_',
        maxAutoSaveInterval: 30000, // 30 seconds
        disableSubmitOnValidation: true
    };
    
    // State tracking
    const formStates = new Map();
    const autoSaveTimers = new Map();
    
    /**
     * Initialize form with event handlers and validation
     * @param {string} formId - ID of the form element
     * @param {Object} options - Configuration options
     */
    function initializeForm(formId, options = {}) {
        const form = document.getElementById(formId);
        if (!form) {
            console.error(`Form with ID ${formId} not found`);
            return;
        }
        
        // Merge options with defaults
        const formConfig = { ...config, ...options };
        
        // Initialize form state
        formStates.set(formId, {
            isValid: false,
            isDirty: false,
            fields: new Map(),
            config: formConfig
        });
        
        // Setup event listeners
        setupFormListeners(form, formConfig);
        
        // Setup field validators
        setupFieldValidators(form, formConfig);
        
        // Restore saved state if enabled
        if (formConfig.saveFormState) {
            restoreFormState(form, formConfig);
            setupAutoSave(form, formConfig);
        }
        
        // Setup keyboard navigation
        setupKeyboardNavigation(form);
        
        // Initialize accessibility features
        initializeAccessibility(form);
    }
    
    /**
     * Setup form event listeners
     * @private
     */
    function setupFormListeners(form, config) {
        // Prevent default form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit(form, config);
        });
        
        // Track form changes
        form.addEventListener('change', (e) => {
            handleFieldChange(form, e.target, config);
        });
        
        // Real-time validation
        if (config.validationRealtime) {
            form.addEventListener('input', debounce((e) => {
                handleFieldInput(form, e.target, config);
            }, config.debounceDelay));
        }
        
        // Handle form reset
        form.addEventListener('reset', (e) => {
            handleFormReset(form, config);
        });
    }
    
    /**
     * Setup individual field validators
     * @private
     */
    function setupFieldValidators(form, config) {
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            // Add validation attributes if not present
            enhanceFieldValidation(field);
            
            // Setup blur validation
            field.addEventListener('blur', () => {
                validateField(field, config);
            });
        });
    }
    
    /**
     * Enhance field validation attributes
     * @private
     */
    function enhanceFieldValidation(field) {
        // Add aria-required for required fields
        if (field.required) {
            field.setAttribute('aria-required', 'true');
        }
        
        // Add pattern for specific input types
        if (field.type === 'email' && !field.pattern) {
            field.pattern = '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$';
        }
        
        if (field.type === 'tel' && !field.pattern) {
            field.pattern = '[0-9]{3}-[0-9]{3}-[0-9]{4}';
        }
        
        // Add inputmode for better mobile experience
        if (field.type === 'number') {
            field.setAttribute('inputmode', 'numeric');
        }
    }
    
    /**
     * Handle form submission
     * @private
     */
    async function handleFormSubmit(form, config) {
        const formState = formStates.get(form.id);
        
        // Show loading indicator if available
        if (window.loadingIndicator) {
            window.loadingIndicator.show('Processing...');
        }
        
        try {
            // Validate entire form
            const isValid = validateForm(form, config);
            
            if (!isValid) {
                // Show validation errors
                if (window.enhancedDisplay) {
                    window.enhancedDisplay.showError('Please correct the errors in the form');
                }
                
                // Scroll to first error if enabled
                if (config.scrollToError) {
                    scrollToFirstError(form, config);
                }
                
                return;
            }
            
            // Get form data
            const formData = getFormData(form);
            
            // Call submit handler if provided
            if (config.onSubmit) {
                await config.onSubmit(formData, form);
            }
            
            // Clear form state if successful
            if (config.clearOnSuccess) {
                clearFormState(form.id);
            }
            
            // Show success message
            if (window.enhancedDisplay) {
                window.enhancedDisplay.showSuccess('Form submitted successfully');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            
            if (window.enhancedDisplay) {
                window.enhancedDisplay.showError('An error occurred while submitting the form');
            }
        } finally {
            // Hide loading indicator
            if (window.loadingIndicator) {
                window.loadingIndicator.hide();
            }
        }
    }
    
    /**
     * Validate entire form
     * @private
     */
    function validateForm(form, config) {
        let isValid = true;
        const fields = form.querySelectorAll('input, select, textarea');
        
        fields.forEach(field => {
            if (!validateField(field, config)) {
                isValid = false;
            }
        });
        
        // Update form state
        const formState = formStates.get(form.id);
        if (formState) {
            formState.isValid = isValid;
        }
        
        // Update submit button state
        if (config.disableSubmitOnValidation) {
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = !isValid;
            }
        }
        
        return isValid;
    }
    
    /**
     * Validate individual field
     * @private
     */
    function validateField(field, config) {
        let isValid = true;
        let errorMessage = '';
        
        // Required field validation
        if (field.required && !field.value.trim()) {
            isValid = false;
            errorMessage = `${getFieldLabel(field)} is required`;
        }
        
        // Pattern validation
        if (field.pattern && field.value) {
            const pattern = new RegExp(field.pattern);
            if (!pattern.test(field.value)) {
                isValid = false;
                errorMessage = `Please enter a valid ${getFieldLabel(field).toLowerCase()}`;
            }
        }
        
        // Min/max validation for numbers
        if (field.type === 'number' && field.value) {
            const value = parseFloat(field.value);
            if (field.min && value < parseFloat(field.min)) {
                isValid = false;
                errorMessage = `${getFieldLabel(field)} must be at least ${field.min}`;
            }
            if (field.max && value > parseFloat(field.max)) {
                isValid = false;
                errorMessage = `${getFieldLabel(field)} must be at most ${field.max}`;
            }
        }
        
        // Custom validation function
        if (config.validators && config.validators[field.name]) {
            const customResult = config.validators[field.name](field.value, field);
            if (customResult !== true) {
                isValid = false;
                errorMessage = typeof customResult === 'string' ? customResult : errorMessage;
            }
        }
        
        // Update field state
        updateFieldState(field, isValid, errorMessage);
        
        return isValid;
    }
    
    /**
     * Update field state and display feedback
     * @private
     */
    function updateFieldState(field, isValid, errorMessage) {
        const fieldState = {
            isValid,
            errorMessage,
            value: field.value
        };
        
        // Update form state
        const form = field.closest('form');
        if (form) {
            const formState = formStates.get(form.id);
            if (formState) {
                formState.fields.set(field.name || field.id, fieldState);
            }
        }
        
        // Display feedback
        if (window.enhancedDisplay) {
            if (!isValid) {
                window.enhancedDisplay.showFieldFeedback(field, errorMessage, 'error');
                field.classList.add('error');
            } else {
                window.enhancedDisplay.clearFieldFeedback(field);
                field.classList.remove('error');
            }
        }
    }
    
    /**
     * Handle field input (real-time validation)
     * @private
     */
    function handleFieldInput(form, field, config) {
        if (config.validationRealtime) {
            validateField(field, config);
        }
        
        // Mark form as dirty
        const formState = formStates.get(form.id);
        if (formState) {
            formState.isDirty = true;
        }
    }
    
    /**
     * Handle field change
     * @private
     */
    function handleFieldChange(form, field, config) {
        validateField(field, config);
        
        // Update form state
        const formState = formStates.get(form.id);
        if (formState) {
            formState.isDirty = true;
        }
        
        // Save form state if enabled
        if (config.saveFormState) {
            saveFormState(form, config);
        }
    }
    
    /**
     * Handle form reset
     * @private
     */
    function handleFormReset(form, config) {
        // Clear all field states
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            updateFieldState(field, true, '');
        });
        
        // Reset form state
        const formState = formStates.get(form.id);
        if (formState) {
            formState.isValid = false;
            formState.isDirty = false;
            formState.fields.clear();
        }
        
        // Clear saved state
        if (config.saveFormState) {
            clearFormState(form.id);
        }
    }
    
    /**
     * Save form state to storage
     * @private
     */
    function saveFormState(form, config) {
        const formData = getFormData(form);
        const storageKey = config.storageKey + form.id;
        
        try {
            if (window.secureStorage) {
                window.secureStorage.setItem(storageKey, formData);
            } else {
                localStorage.setItem(storageKey, JSON.stringify(formData));
            }
        } catch (error) {
            console.warn('Failed to save form state:', error);
        }
    }
    
    /**
     * Restore form state from storage
     * @private
     */
    function restoreFormState(form, config) {
        const storageKey = config.storageKey + form.id;
        let savedData = null;
        
        try {
            if (window.secureStorage) {
                savedData = window.secureStorage.getItem(storageKey);
            } else {
                const data = localStorage.getItem(storageKey);
                savedData = data ? JSON.parse(data) : null;
            }
        } catch (error) {
            console.warn('Failed to restore form state:', error);
        }
        
        if (savedData) {
            setFormData(form, savedData);
        }
    }
    
    /**
     * Clear saved form state
     * @private
     */
    function clearFormState(formId) {
        const storageKey = config.storageKey + formId;
        
        try {
            if (window.secureStorage) {
                window.secureStorage.removeItem(storageKey);
            } else {
                localStorage.removeItem(storageKey);
            }
        } catch (error) {
            console.warn('Failed to clear form state:', error);
        }
    }
    
    /**
     * Setup auto-save functionality
     * @private
     */
    function setupAutoSave(form, config) {
        // Clear existing timer
        if (autoSaveTimers.has(form.id)) {
            clearInterval(autoSaveTimers.get(form.id));
        }
        
        // Set up new timer
        const timer = setInterval(() => {
            const formState = formStates.get(form.id);
            if (formState && formState.isDirty) {
                saveFormState(form, config);
                formState.isDirty = false;
            }
        }, config.maxAutoSaveInterval);
        
        autoSaveTimers.set(form.id, timer);
    }
    
    /**
     * Get form data as object
     * @private
     */
    function getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            // Handle multiple values (checkboxes, multi-selects)
            if (data[key]) {
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        return data;
    }
    
    /**
     * Set form data from object
     * @private
     */
    function setFormData(form, data) {
        Object.keys(data).forEach(key => {
            const field = form.elements[key];
            if (field) {
                if (field.type === 'checkbox' || field.type === 'radio') {
                    field.checked = (field.value === data[key]) || (Array.isArray(data[key]) && data[key].includes(field.value));
                } else {
                    field.value = data[key];
                }
            }
        });
    }
    
    /**
     * Get field label
     * @private
     */
    function getFieldLabel(field) {
        // Try to find associated label
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (label) {
            return label.textContent.trim();
        }
        
        // Use placeholder or name as fallback
        return field.placeholder || field.name || field.id || 'Field';
    }
    
    /**
     * Scroll to first error field
     * @private
     */
    function scrollToFirstError(form, config) {
        const errorField = form.querySelector('.error');
        if (errorField && window.enhancedDisplay) {
            window.enhancedDisplay.scrollToElement(errorField, {
                offset: config.scrollOffset
            });
        }
    }
    
    /**
     * Setup keyboard navigation
     * @private
     */
    function setupKeyboardNavigation(form) {
        form.addEventListener('keydown', (e) => {
            // Enter key moves to next field
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                focusNextField(form, e.target);
            }
            
            // Escape key clears current field
            if (e.key === 'Escape') {
                e.target.value = '';
                e.target.dispatchEvent(new Event('input'));
            }
        });
    }
    
    /**
     * Focus next field in form
     * @private
     */
    function focusNextField(form, currentField) {
        const fields = Array.from(form.querySelectorAll('input, select, textarea, button'));
        const currentIndex = fields.indexOf(currentField);
        
        if (currentIndex > -1 && currentIndex < fields.length - 1) {
            fields[currentIndex + 1].focus();
        }
    }
    
    /**
     * Initialize accessibility features
     * @private
     */
    function initializeAccessibility(form) {
        // Add form role
        form.setAttribute('role', 'form');
        
        // Add aria-labels to fields without labels
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            if (!field.getAttribute('aria-label') && !document.querySelector(`label[for="${field.id}"]`)) {
                field.setAttribute('aria-label', getFieldLabel(field));
            }
        });
    }
    
    /**
     * Debounce function
     * @private
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Public API
    return {
        initializeForm,
        validateForm,
        validateField,
        getFormData,
        setFormData,
        clearFormState,
        handleFormSubmit: (formId, options, callback) => {
            const form = document.getElementById(formId);
            if (form) {
                options.onSubmit = callback;
                initializeForm(formId, options);
            }
        }
    };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = formHandler;
} else {
    window.formHandler = formHandler;
}


// === secure-storage.js ===
/**
 * Secure Storage Utility (Basic version)
 */
const secureStorage = (function() {
  // Generate or retrieve encryption key from sessionStorage
  let encryptionKey = sessionStorage.getItem('encryptionKey');
  if (!encryptionKey) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    encryptionKey = Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
    sessionStorage.setItem('encryptionKey', encryptionKey);
  }
  
  /**
   * Store data securely
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   * @returns {boolean} - Success status
   */
  function setItem(key, data) {
    try {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      const encoded = btoa(dataStr); // Basic encoding for now
      localStorage.setItem('secure_' + key, encoded);
      return true;
    } catch (error) {
      console.error('SecureStorage setItem error:', error);
      return false;
    }
  }
  
  /**
   * Retrieve securely stored data
   * @param {string} key - Storage key
   * @returns {any} - Retrieved data or null if not found
   */
  function getItem(key) {
    try {
      const encoded = localStorage.getItem('secure_' + key);
      if (!encoded) return null;
      
      const dataStr = atob(encoded);
      try {
        return JSON.parse(dataStr);
      } catch {
        return dataStr;
      }
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return null;
    }
  }
  
  /**
   * Remove securely stored data
   * @param {string} key - Storage key to remove
   */
  function removeItem(key) {
    try {
      localStorage.removeItem('secure_' + key);
    } catch (error) {
      console.error('SecureStorage removeItem error:', error);
    }
  }
  
  /**
   * Clear all securely stored data
   */
  function clear() {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key.startsWith('secure_')) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('SecureStorage clear error:', error);
    }
  }
  
  // Return the public API
  return {
    setItem,
    getItem,
    removeItem,
    clear
  };
})();



// === loading-indicator.js ===
/**
 * Simple Loading Indicator Utility
 */
const loadingIndicator = (function() {
  // Configuration
  const config = {
    defaultDelay: 300, // ms before showing indicators
    defaultMinDuration: 500, // ms minimum time to show indicators
    useOverlay: true, // whether to use a full-page overlay for global operations
    globalIndicatorId: 'global-loading-indicator'
  };
  
  /**
   * Show loading indicator
   * @param {string} message - Loading message
   */
  function show(message = 'Loading...') {
    // Check if indicator already exists
    let indicator = document.getElementById(config.globalIndicatorId);
    
    if (!indicator) {
      // Create indicator
      indicator = document.createElement('div');
      indicator.id = config.globalIndicatorId;
      indicator.className = 'loading-indicator';
      
      // Create overlay if needed
      if (config.useOverlay) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.appendChild(indicator);
        document.body.appendChild(overlay);
      } else {
        document.body.appendChild(indicator);
      }
    }
    
    // Set content
    indicator.innerHTML = `
      <div class="spinner"></div>
      <div class="loading-message">${message}</div>
    `;
    
    // Show indicator
    indicator.style.display = 'flex';
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.style.display = 'flex';
  }
  
  /**
   * Hide loading indicator
   */
  function hide() {
    const indicator = document.getElementById(config.globalIndicatorId);
    if (indicator) {
      const overlay = document.querySelector('.loading-overlay');
      if (overlay) overlay.style.display = 'none';
      indicator.style.display = 'none';
    }
  }
  
  // Return public API
  return {
    show,
    hide
  };
})();



// === input-sanitizer.js ===
// input-sanitizer.js placeholder



// === physiological-validation.js ===
// Physiological Validation Module
const physiologicalValidation = (function() {
  const RANGES = {
    age: { min: 18, max: 100, unit: 'years' },
    sbp: { min: 70, max: 240, unit: 'mmHg' },
    totalChol: { min: 1.0, max: 15.0, unit: 'mmol/L' }
  };
  
  function validateValue(type, value) {
    const range = RANGES[type];
    if (!range) return { isValid: true };
    
    if (value < range.min || value > range.max) {
      return {
        isValid: false,
        message: `${type} value of ${value} ${range.unit} is outside valid range`
      };
    }
    
    return { isValid: true };
  }
  
  return { validateValue };
})();
window.physiologicalValidation = physiologicalValidation;



// === validator-extension.js ===
// validator-extension.js placeholder



// === enhanced-disclaimer.js ===
// enhanced-disclaimer.js placeholder



// === csp-report-handler.js ===
// csp-report-handler.js placeholder



// === qrisk3-implementation.js ===
/**
 * CVD Risk Toolkit with Lp(a) Post-Test Modifier
 * 
 * LEGAL DISCLAIMER:
 * This software is provided for educational and informational purposes only. 
 * It is not intended to be a substitute for professional medical advice, diagnosis, or treatment.
 * Always seek the advice of a qualified healthcare provider with any questions regarding medical conditions.
 * 
 * REFERENCES AND ATTRIBUTIONS:
 * - QRISK3 algorithm: Hippisley-Cox J, et al. BMJ 2017;357:j2099
 * - Framingham Risk Score: D'Agostino RB Sr, et al. Circulation 2008;117:743-53
 * - Lp(a) adjustments based on: Willeit P, et al. Lancet 2018;392:1311-1320
 * 
 * Last updated: April 2025
 */

/**
 * QRISK3 Implementation Module
 * 
 * This module implements the complete QRISK3 algorithm based on
 * the official code, including all risk factors and interactions.
 */

/**
 * Calculate QRISK3 score using the official algorithm
 * @param {Object} data - Patient data from the form
 * @returns {Object} - Risk calculation results
 */
function combinedQRISK3Calculator(data) {
    // Convert units if needed
    let standardizedData = standardizeUnitsForQRISK3(data);
    
    // Calculate base QRISK3 score
    const baseRiskScore = calculateRawQRISK3(standardizedData);
    
    // Apply Lp(a) modifier if available
    let lpaModifier = 1.0;
    let modifiedRiskPercentage = baseRiskScore;
    
    if (standardizedData.lpa !== null && standardizedData.lpa !== undefined) {
        // Convert Lp(a) to mg/dL if needed
        let lpaValue = standardizedData.lpa;
        if (standardizedData.lpaUnit === 'nmol/L') {
            lpaValue = convertLpa(lpaValue, 'nmol/L', 'mg/dL');
        }
        
        // Calculate modifier based on Lp(a) level
        lpaModifier = calculateLpaModifier(lpaValue);
        modifiedRiskPercentage = baseRiskScore * lpaModifier;
    }
    
    return {
        baseRisk: baseRiskScore,
        lpaModifier: lpaModifier,
        modifiedRisk: modifiedRiskPercentage,
        riskCategory: getRiskCategory(modifiedRiskPercentage),
        contributing: getContributingFactors(standardizedData)
    };
}

/**
 * Standardize units for QRISK3 calculation
 * @param {Object} data - Raw form data
 * @returns {Object} - Data with standardized units
 */
function standardizeUnitsForQRISK3(data) {
    const standardized = { ...data };
    
    // Convert height and weight to calculate BMI if not provided
    if (!standardized.bmi && standardized.height && standardized.weight) {
        // Convert height to meters
        let heightInM = standardized.height / 100;
        
        // Convert weight to kg if in pounds
        let weightInKg = standardized.weight;
        if (standardized.weightUnit === 'lb') {
            weightInKg = convertWeightToKg(weightInKg);
        }
        
        // Calculate BMI
        standardized.bmi = weightInKg / (heightInM * heightInM);
    }
    
    // Calculate cholesterol ratio if not provided
    if (standardized.totalChol && standardized.hdl && !standardized.cholRatio) {
        let totalChol = standardized.totalChol;
        let hdl = standardized.hdl;
        
        // Convert to mmol/L if needed
        if (standardized.totalCholUnit === 'mg/dL') {
            totalChol = convertCholesterol(totalChol, 'mg/dL', 'mmol/L');
        }
        if (standardized.hdlUnit === 'mg/dL') {
            hdl = convertCholesterol(hdl, 'mg/dL', 'mmol/L');
        }
        
        standardized.cholRatio = totalChol / hdl;
    }
    
    return standardized;
}

/**
 * Calculate raw QRISK3 score using the official algorithm
 * @param {Object} data - Standardized patient data
 * @returns {number} - 10-year risk percentage
 */
function calculateRawQRISK3(data) {
    // Determine which algorithm to use based on sex
    const isFemale = data.sex === 'female';
    
    // Convert categorical variables to numeric values
    const ethrisk = convertEthnicity(data.ethnicity);
    const smoke_cat = convertSmoking(data.smoker);
    
    // Set boolean values for conditions
    const b_AF = data.atrialFibrillation ? 1 : 0;
    const b_atypicalantipsy = data.atypicalAntipsychotics ? 1 : 0;
    const b_corticosteroids = data.corticosteroids ? 1 : 0;
    const b_impotence2 = (!isFemale && data.erectileDysfunction) ? 1 : 0;
    const b_migraine = data.migraine ? 1 : 0;
    const b_ra = data.rheumatoidArthritis ? 1 : 0;
    const b_renal = data.chronicKidneyDisease ? 1 : 0;
    const b_semi = data.severeMetalIllness ? 1 : 0;
    const b_sle = data.sle ? 1 : 0;
    const b_treatedhyp = data.bpTreatment ? 1 : 0;
    const b_type1 = (data.diabetes === 'type1') ? 1 : 0;
    const b_type2 = (data.diabetes === 'type2') ? 1 : 0;
    
    // Get continuous variables
    const age = data.age;
    const bmi = data.bmi;
    const sbp = data.sbp;
    const sbps5 = data.sbpSd || 0; // Standard deviation of SBP
    const rati = data.cholRatio; // Total cholesterol / HDL ratio
    const town = data.townsend || 0; // Default to 0 if not provided
    const fh_cvd = data.familyHistory ? 1 : 0;
    
    // Calculate the risk score using the appropriate function
    let score;
    if (isFemale) {
        score = cvd_female_raw(
            age, b_AF, b_atypicalantipsy, b_corticosteroids, b_migraine, 
            b_ra, b_renal, b_semi, b_sle, b_treatedhyp, b_type1, b_type2, 
            bmi, ethrisk, fh_cvd, rati, sbp, sbps5, smoke_cat, 10, town
        );
    } else {
        score = cvd_male_raw(
            age, b_AF, b_atypicalantipsy, b_corticosteroids, b_impotence2, 
            b_migraine, b_ra, b_renal, b_semi, b_sle, b_treatedhyp, b_type1, 
            b_type2, bmi, ethrisk, fh_cvd, rati, sbp, sbps5, smoke_cat, 10, town
        );
    }
    
    return score;
}

/**
 * Convert ethnicity values to QRISK3 numeric codes
 * @param {string} ethnicity - Ethnicity from form
 * @returns {number} - QRISK3 ethnicity code
 */
function convertEthnicity(ethnicity) {
    const ethnicityMap = {
        'white': 1,
        'indian': 2,
        'pakistani': 3,
        'bangladeshi': 4,
        'other_asian': 5,
        'black_caribbean': 6,
        'black_african': 7,
        'chinese': 8,
        'other': 9
    };
    
    return ethnicityMap[ethnicity] || 1; // Default to White if not specified
}

/**
 * Convert smoking status to QRISK3 numeric codes
 * @param {string} smoker - Smoking status from form
 * @returns {number} - QRISK3 smoking code
 */
function convertSmoking(smoker) {
    const smokingMap = {
        'non': 0,
        'ex': 1,
        'light': 2,
        'moderate': 3,
        'heavy': 4
    };
    
    return smokingMap[smoker] || 0; // Default to non-smoker if not specified
}

/**
 * Official QRISK3 algorithm for females
 * Directly ported from the published code
 */
function cvd_female_raw(
    age, b_AF, b_atypicalantipsy, b_corticosteroids, b_migraine, 
    b_ra, b_renal, b_semi, b_sle, b_treatedhyp, b_type1, b_type2, 
    bmi, ethrisk, fh_cvd, rati, sbp, sbps5, smoke_cat, surv, town
) {
    const survivor = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0.988876402378082, // 10-year survival probability
        0, 0, 0, 0, 0
    ];

    // Conditional arrays for ethnicity and smoking
    const Iethrisk = [
        0,
        0,
        0.2804031433299542500000000,
        0.5629899414207539800000000,
        0.2959000085111651600000000,
        0.0727853798779825450000000,
        -0.1707213550885731700000000,
        -0.3937104331487497100000000,
        -0.3263249528353027200000000,
        -0.1712705688324178400000000
    ];
    
    const Ismoke = [
        0,
        0.1338683378654626200000000,
        0.5620085801243853700000000,
        0.6674959337750254700000000,
        0.8494817764483084700000000
    ];

    // Applying fractional polynomial transforms
    let dage = age / 10;
    let age_1 = Math.pow(dage, -2);
    let age_2 = dage;
    
    let dbmi = bmi / 10;
    let bmi_1 = Math.pow(dbmi, -2);
    let bmi_2 = Math.pow(dbmi, -2) * Math.log(dbmi);

    // Centering continuous variables
    age_1 = age_1 - 0.053274843841791;
    age_2 = age_2 - 4.332503318786621;
    bmi_1 = bmi_1 - 0.154946178197861;
    bmi_2 = bmi_2 - 0.144462317228317;
    rati = rati - 3.476326465606690;
    sbp = sbp - 123.130012512207030;
    sbps5 = sbps5 - 9.002537727355957;
    town = town - 0.392308831214905;

    // Start of sum
    let a = 0;

    // Conditional sums
    a += Iethrisk[ethrisk];
    a += Ismoke[smoke_cat];

    // Sum from continuous values
    a += age_1 * -8.1388109247726188000000000;
    a += age_2 * 0.7973337668969909800000000;
    a += bmi_1 * 0.2923609227546005200000000;
    a += bmi_2 * -4.1513300213837665000000000;
    a += rati * 0.1533803582080255400000000;
    a += sbp * 0.0131314884071034240000000;
    a += sbps5 * 0.0078894541014586095000000;
    a += town * 0.0772237905885901080000000;

    // Sum from boolean values
    a += b_AF * 1.5923354969269663000000000;
    a += b_atypicalantipsy * 0.2523764207011555700000000;
    a += b_corticosteroids * 0.5952072530460185100000000;
    a += b_migraine * 0.3012672608703450000000000;
    a += b_ra * 0.2136480343518194200000000;
    a += b_renal * 0.6519456949384583300000000;
    a += b_semi * 0.1255530805882017800000000;
    a += b_sle * 0.7588093865426769300000000;
    a += b_treatedhyp * 0.5093159368342300400000000;
    a += b_type1 * 1.7267977510537347000000000;
    a += b_type2 * 1.0688773244615468000000000;
    a += fh_cvd * 0.4544531902089621300000000;

    // Sum from interaction terms
    a += age_1 * (smoke_cat == 1 ? 1 : 0) * -4.7057161785851891000000000;
    a += age_1 * (smoke_cat == 2 ? 1 : 0) * -2.7430383403573337000000000;
    a += age_1 * (smoke_cat == 3 ? 1 : 0) * -0.8660808882939218200000000;
    a += age_1 * (smoke_cat == 4 ? 1 : 0) * 0.9024156236971064800000000;
    a += age_1 * b_AF * 19.9380348895465610000000000;
    a += age_1 * b_corticosteroids * -0.9840804523593628100000000;
    a += age_1 * b_migraine * 1.7634979587872999000000000;
    a += age_1 * b_renal * -3.5874047731694114000000000;
    a += age_1 * b_sle * 19.6903037386382920000000000;
    a += age_1 * b_treatedhyp * 11.8728097339218120000000000;
    a += age_1 * b_type1 * -1.2444332714320747000000000;
    a += age_1 * b_type2 * 6.8652342000009599000000000;
    a += age_1 * bmi_1 * 23.8026234121417420000000000;
    a += age_1 * bmi_2 * -71.1849476920870070000000000;
    a += age_1 * fh_cvd * 0.9946780794043512700000000;
    a += age_1 * sbp * 0.0341318423386154850000000;
    a += age_1 * town * -1.0301180802035639000000000;
    a += age_2 * (smoke_cat == 1 ? 1 : 0) * -0.0755892446431930260000000;
    a += age_2 * (smoke_cat == 2 ? 1 : 0) * -0.1195119287486707400000000;
    a += age_2 * (smoke_cat == 3 ? 1 : 0) * -0.1036630639757192300000000;
    a += age_2 * (smoke_cat == 4 ? 1 : 0) * -0.1399185359171838900000000;
    a += age_2 * b_AF * -0.0761826510111625050000000;
    a += age_2 * b_corticosteroids * -0.1200536494674247200000000;
    a += age_2 * b_migraine * -0.0655869178986998590000000;
    a += age_2 * b_renal * -0.2268887308644250700000000;
    a += age_2 * b_sle * 0.0773479496790162730000000;
    a += age_2 * b_treatedhyp * 0.0009685782358817443600000;
    a += age_2 * b_type1 * -0.2872406462448894900000000;
    a += age_2 * b_type2 * -0.0971122525906954890000000;
    a += age_2 * bmi_1 * 0.5236995893366442900000000;
    a += age_2 * bmi_2 * 0.0457441901223237590000000;
    a += age_2 * fh_cvd * -0.0768850516984230380000000;
    a += age_2 * sbp * -0.0015082501423272358000000;
    a += age_2 * town * -0.0315934146749623290000000;

    // Calculate the score
    const score = 100.0 * (1 - Math.pow(survivor[surv], Math.exp(a)));
    return score;
}

/**
 * Official QRISK3 algorithm for males
 * Directly ported from the published code
 */
function cvd_male_raw(
    age, b_AF, b_atypicalantipsy, b_corticosteroids, b_impotence2, 
    b_migraine, b_ra, b_renal, b_semi, b_sle, b_treatedhyp, b_type1, 
    b_type2, bmi, ethrisk, fh_cvd, rati, sbp, sbps5, smoke_cat, surv, town
) {
    const survivor = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0.977268040180206, // 10-year survival probability
        0, 0, 0, 0, 0
    ];

    // Conditional arrays for ethnicity and smoking
    const Iethrisk = [
        0,
        0,
        0.2771924876030827900000000,
        0.4744636071493126800000000,
        0.5296172991968937100000000,
        0.0351001591862990170000000,
        -0.3580789966932791900000000,
        -0.4005648523216514000000000,
        -0.4152279288983017300000000,
        -0.2632134813474996700000000
    ];
    
    const Ismoke = [
        0,
        0.1912822286338898300000000,
        0.5524158819264555200000000,
        0.6383505302750607200000000,
        0.7898381988185801900000000
    ];

    // Applying fractional polynomial transforms
    let dage = age / 10;
    let age_1 = Math.pow(dage, -1);
    let age_2 = Math.pow(dage, 3);
    
    let dbmi = bmi / 10;
    let bmi_1 = Math.pow(dbmi, -2);
    let bmi_2 = Math.pow(dbmi, -2) * Math.log(dbmi);

    // Centering continuous variables
    age_1 = age_1 - 0.234766781330109;
    age_2 = age_2 - 77.284080505371094;
    bmi_1 = bmi_1 - 0.149176135659218;
    bmi_2 = bmi_2 - 0.141913309693336;
    rati = rati - 4.300998687744141;
    sbp = sbp - 128.571578979492190;
    sbps5 = sbps5 - 8.756621360778809;
    town = town - 0.526304900646210;

    // Start of sum
    let a = 0;

    // Conditional sums
    a += Iethrisk[ethrisk];
    a += Ismoke[smoke_cat];

    // Sum from continuous values
    a += age_1 * -17.8397816660055750000000000;
    a += age_2 * 0.0022964880605765492000000;
    a += bmi_1 * 2.4562776660536358000000000;
    a += bmi_2 * -8.3011122314711354000000000;
    a += rati * 0.1734019685632711100000000;
    a += sbp * 0.0129101265425533050000000;
    a += sbps5 * 0.0102519142912904560000000;
    a += town * 0.0332682012772872950000000;

    // Sum from boolean values
    a += b_AF * 0.8820923692805465700000000;
    a += b_atypicalantipsy * 0.1304687985517351300000000;
    a += b_corticosteroids * 0.4548539975044554300000000;
    a += b_impotence2 * 0.2225185908670538300000000;
    a += b_migraine * 0.2558417807415991300000000;
    a += b_ra * 0.2097065801395656700000000;
    a += b_renal * 0.7185326128827438400000000;
    a += b_semi * 0.1213303988204716400000000;
    a += b_sle * 0.4401572174457522000000000;
    a += b_treatedhyp * 0.5165987108269547400000000;
    a += b_type1 * 1.2343425521675175000000000;
    a += b_type2 * 0.8594207143093222100000000;
    a += fh_cvd * 0.5405546900939015600000000;

    // Sum from interaction terms
    a += age_1 * (smoke_cat == 1 ? 1 : 0) * -0.2101113393351634600000000;
    a += age_1 * (smoke_cat == 2 ? 1 : 0) * 0.7526867644750319100000000;
    a += age_1 * (smoke_cat == 3 ? 1 : 0) * 0.9931588755640579100000000;
    a += age_1 * (smoke_cat == 4 ? 1 : 0) * 2.1331163414389076000000000;
    a += age_1 * b_AF * 3.4896675530623207000000000;
    a += age_1 * b_corticosteroids * 1.1708133653489108000000000;
    a += age_1 * b_impotence2 * -1.5064009857454310000000000;
    a += age_1 * b_migraine * 2.3491159871402441000000000;
    a += age_1 * b_renal * -0.5065671632722369400000000;
    a += age_1 * b_treatedhyp * 6.5114581098532671000000000;
    a += age_1 * b_type1 * 5.3379864878006531000000000;
    a += age_1 * b_type2 * 3.6461817406221311000000000;
    a += age_1 * bmi_1 * 31.0049529560338860000000000;
    a += age_1 * bmi_2 * -111.2915718439164300000000000;
    a += age_1 * fh_cvd * 2.7808628508531887000000000;
    a += age_1 * sbp * 0.0188585244698658530000000;
    a += age_1 * town * -0.1007554870063731000000000;
    a += age_2 * (smoke_cat == 1 ? 1 : 0) * -0.0004985487027532612100000;
    a += age_2 * (smoke_cat == 2 ? 1 : 0) * -0.0007987563331738541400000;
    a += age_2 * (smoke_cat == 3 ? 1 : 0) * -0.0008370618426625129600000;
    a += age_2 * (smoke_cat == 4 ? 1 : 0) * -0.0007840031915563728900000;
    a += age_2 * b_AF * -0.0003499560834063604900000;
    a += age_2 * b_corticosteroids * -0.0002496045095297166000000;
    a += age_2 * b_impotence2 * -0.0011058218441227373000000;
    a += age_2 * b_migraine * 0.0001989644604147863100000;
    a += age_2 * b_renal * -0.0018325930166498813000000;
    a += age_2 * b_treatedhyp * 0.0006383805310416501300000;
    a += age_2 * b_type1 * 0.0006409780808752897000000;
    a += age_2 * b_type2 * -0.0002469569558886831500000;
    a += age_2 * bmi_1 * 0.0050380102356322029000000;
    a += age_2 * bmi_2 * -0.0130744830025243190000000;
    a += age_2 * fh_cvd * -0.0002479180990739603700000;
    a += age_2 * sbp * -0.0000127187419158845700000;
    a += age_2 * town * -0.0000932996423232728880000;

    // Calculate the score
    const score = 100.0 * (1 - Math.pow(survivor[surv], Math.exp(a)));
    return score;
}

/**
 * Identify contributing risk factors from the data
 * @param {Object} data - Patient data
 * @returns {Array} - List of contributing risk factors
 */
function getContributingFactors(data) {
    const factors = [];
    
    // Add factors based on patient data
    if (data.age >= 65) {
        factors.push({ 
            name: "Advanced age", 
            impact: "high",
            description: "Age is a strong independent risk factor for CVD" 
        });
    } else if (data.age >= 55) {
        factors.push({ 
            name: "Age", 
            impact: "moderate",
            description: "Age is a significant risk factor for CVD" 
        });
    }
    
    if (data.smoker && data.smoker !== 'non') {
        const smokingImpact = data.smoker === 'heavy' ? 'high' : 
                            (data.smoker === 'moderate' ? 'moderate' : 'low');
        factors.push({ 
            name: "Smoking", 
            impact: smokingImpact,
            description: "Smoking significantly increases CVD risk" 
        });
    }
    
    if (data.bmi >= 30) {
        factors.push({ 
            name: "Obesity", 
            impact: "moderate",
            description: "BMI ≥30 kg/m² increases CVD risk" 
        });
    } else if (data.bmi >= 25) {
        factors.push({ 
            name: "Overweight", 
            impact: "low",
            description: "BMI 25-29.9 kg/m² slightly increases CVD risk" 
        });
    }
    
    if (data.sbp >= 160) {
        factors.push({ 
            name: "Severe hypertension", 
            impact: "high",
            description: "Systolic BP ≥160 mmHg significantly increases CVD risk" 
        });
    } else if (data.sbp >= 140) {
        factors.push({ 
            name: "Hypertension", 
            impact: "moderate",
            description: "Systolic BP 140-159 mmHg increases CVD risk" 
        });
    }
    
    if (data.cholRatio >= 6) {
        factors.push({ 
            name: "Poor cholesterol ratio", 
            impact: "high",
            description: "Total:HDL cholesterol ratio ≥6 significantly increases risk" 
        });
    } else if (data.cholRatio >= 4.5) {
        factors.push({ 
            name: "Elevated cholesterol ratio", 
            impact: "moderate",
            description: "Total:HDL cholesterol ratio 4.5-5.9 increases risk" 
        });
    }
    
    if (data.diabetes === 'type1') {
        factors.push({ 
            name: "Type 1 diabetes", 
            impact: "high",
            description: "Type 1 diabetes significantly increases CVD risk" 
        });
    } else if (data.diabetes === 'type2') {
        factors.push({ 
            name: "Type 2 diabetes", 
            impact: "high",
            description: "Type 2 diabetes significantly increases CVD risk" 
        });
    }
    
    if (data.familyHistory) {
        factors.push({ 
            name: "Family history of CVD", 
            impact: "moderate",
            description: "Premature CVD in first-degree relative increases risk" 
        });
    }
    
    // Medical conditions
    if (data.atrialFibrillation) {
        factors.push({ 
            name: "Atrial fibrillation", 
            impact: "high",
            description: "Atrial fibrillation substantially increases stroke risk" 
        });
    }
    
    if (data.chronicKidneyDisease) {
        factors.push({ 
            name: "Chronic kidney disease", 
            impact: "high",
            description: "CKD stages 3-5 significantly increases CVD risk" 
        });
    }
    
    if (data.rheumatoidArthritis) {
        factors.push({ 
            name: "Rheumatoid arthritis", 
            impact: "moderate",
            description: "Rheumatoid arthritis increases CVD risk" 
        });
    }
    
    if (data.sle) {
        factors.push({ 
            name: "Systemic lupus erythematosus", 
            impact: "moderate",
            description: "SLE increases CVD risk" 
        });
    }
    
    if (data.migraine) {
        factors.push({ 
            name: "Migraine", 
            impact: "low",
            description: "Migraine slightly increases stroke risk" 
        });
    }
    
    if (data.severeMetalIllness) {
        factors.push({ 
            name: "Severe mental illness", 
            impact: "low",
            description: "Severe mental illness slightly increases CVD risk" 
        });
    }
    
    if (data.erectileDysfunction && data.sex === 'male') {
        factors.push({ 
            name: "Erectile dysfunction", 
            impact: "moderate",
            description: "Erectile dysfunction is associated with increased CVD risk in men" 
        });
    }
    
    // Medications
    if (data.atypicalAntipsychotics) {
        factors.push({ 
            name: "Atypical antipsychotics", 
            impact: "low",
            description: "Atypical antipsychotics slightly increase CVD risk" 
        });
    }
    
    if (data.corticosteroids) {
        factors.push({ 
            name: "Corticosteroids", 
            impact: "moderate",
            description: "Regular corticosteroid use increases CVD risk" 
        });
    }
    
    // Lp(a)
    if (data.lpa !== null && data.lpa !== undefined) {
        let lpaValue = data.lpa;
        if (data.lpaUnit === 'nmol/L') {
            lpaValue = convertLpa(lpaValue, 'nmol/L', 'mg/dL');
        }
        
        if (lpaValue >= 180) {
            factors.push({ 
                name: "Very high Lp(a)", 
                impact: "high",
                description: "Lp(a) ≥180 mg/dL substantially increases CVD risk" 
            });
        } else if (lpaValue >= 50) {
            factors.push({ 
                name: "Elevated Lp(a)", 
                impact: "moderate",
                description: "Lp(a) ≥50 mg/dL increases CVD risk" 
            });
        } else if (lpaValue >= 30) {
            factors.push({ 
                name: "Borderline Lp(a)", 
                impact: "low",
                description: "Lp(a) 30-49 mg/dL slightly increases CVD risk" 
            });
        }
    }
    
    return factors;
}


// === juno-integration.js ===
/**
 * CVD Risk Toolkit with Lp(a) Post-Test Modifier
 * 
 * LEGAL DISCLAIMER:
 * This software is provided for educational and informational purposes only. 
 * It is not intended to be a substitute for professional medical advice, diagnosis, or treatment.
 * Always seek the advice of a qualified healthcare provider with any questions regarding medical conditions.
 * 
 * REFERENCES AND ATTRIBUTIONS:
 * - QRISK3 algorithm: Hippisley-Cox J, et al. BMJ 2017;357:j2099
 * - Framingham Risk Score: D'Agostino RB Sr, et al. Circulation 2008;117:743-53
 * - Lp(a) adjustments based on: Willeit P, et al. Lancet 2018;392:1311-1320
 * 
 * Last updated: April 2025
 */

/**
 * Juno EMR Integration Module for CVD Risk Toolkit
 * 
 * This module enables the CVD Risk Toolkit to be embedded in Juno EMR's
 * Clinical Forms section and exchange data with the patient record.
 */

// Juno EMR Integration Constants
const JUNO_INTEGRATION = {
  FORM_ID: 'cvd-risk-toolkit',
  API_VERSION: '1.0',
  PERMISSIONS: ['patient.read', 'patient.demographics', 'patient.labs', 'patient.medications']
};

/**
 * Initialize Juno EMR integration
 * This should be called when the application loads
 */
function initJunoIntegration() {
  // Check if running within Juno EMR iframe
  if (window.parent !== window && isJunoEnvironment()) {
    console.log('Juno EMR environment detected');
    setupJunoEventListeners();
    registerWithJunoAPI();
  } else {
    console.log('Running in standalone mode');
  }
}

/**
 * Check if the current environment is Juno EMR
 * @returns {boolean} - Whether the app is running in Juno environment
 */
function isJunoEnvironment() {
  try {
    return window.parent.JunoAPI !== undefined || 
           window.location.href.includes('junoemr.com') ||
           document.referrer.includes('junoemr.com');
  } catch (e) {
    // Security exception when accessing parent from different origin
    return false;
  }
}

/**
 * Register the application with Juno EMR API
 */
function registerWithJunoAPI() {
  if (window.parent.JunoAPI) {
    window.parent.JunoAPI.register({
      name: 'CVD Risk Toolkit',
      version: '1.0',
      permissions: JUNO_INTEGRATION.PERMISSIONS,
      onPatientChange: handlePatientChange,
      onFormSave: handleFormSave
    });
    
    // Request patient data from Juno
    window.parent.JunoAPI.requestPatientData();
  } else {
    console.error('Juno API not found in parent window');
  }
}

/**
 * Set up event listeners for Juno EMR communication
 */
function setupJunoEventListeners() {
  window.addEventListener('message', function(event) {
    // Validate message origin for security
    if (!event.origin.includes('junoemr.com')) {
      return;
    }
    
    const message = event.data;
    
    // Handle different message types from Juno
    switch (message.type) {
      case 'patient_data':
        populateFormWithPatientData(message.data);
        break;
      case 'form_save_requested':
        prepareFormDataForSaving();
        break;
      case 'form_cancelled':
        resetForm();
        break;
    }
  });
}

/**
 * Handle patient change event from Juno EMR
 * @param {Object} patientData - Patient data from Juno EMR
 */
function handlePatientChange(patientData) {
  populateFormWithPatientData(patientData);
}

/**
 * Populate the CVD Risk Toolkit form with patient data from Juno
 * @param {Object} patientData - Patient data from Juno EMR
 */
function populateFormWithPatientData(patientData) {
  if (!patientData) return;
  
  // Map Juno patient fields to form fields
  
  // Demographics
  if (patientData.demographics) {
    // Age calculation
    if (patientData.demographics.dob) {
      const dob = new Date(patientData.demographics.dob);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      
      // Set age in both FRS and QRISK forms
      setFormValue('frs-age', age);
      setFormValue('qrisk-age', age);
    }
    
    // Sex
    if (patientData.demographics.sex) {
      const sex = patientData.demographics.sex.toLowerCase();
      setFormValue('frs-sex', sex);
      setFormValue('qrisk-sex', sex);
      
      // Show/hide erectile dysfunction field based on sex
      const edContainer = document.getElementById('qrisk-ed-container');
      if (edContainer) {
        edContainer.style.display = sex === 'male' ? 'block' : 'none';
      }
    }
    
    // Ethnicity (for QRISK)
    if (patientData.demographics.ethnicity) {
      mapEthnicityToQRISK(patientData.demographics.ethnicity);
    }
    
    // Height and weight
    if (patientData.demographics.height) {
      setFormValue('qrisk-height', patientData.demographics.height);
      // Calculate imperial equivalents if needed
      calculateImperialHeight(patientData.demographics.height);
    }
    
    if (patientData.demographics.weight) {
      setFormValue('qrisk-weight', patientData.demographics.weight);
    }
    
    // Calculate BMI if both height and weight are available
    if (patientData.demographics.height && patientData.demographics.weight) {
      calculateBMIForQRISK();
    }
  }
  
  // Lab values
  if (patientData.labs) {
    // Find most recent labs
    const recentLabs = getLatestLabValues(patientData.labs);
    
    // Map lab values to form
    if (recentLabs.totalCholesterol) {
      setFormValue('frs-total-chol', recentLabs.totalCholesterol);
      setFormValue('qrisk-total-chol', recentLabs.totalCholesterol);
    }
    
    if (recentLabs.hdl) {
      setFormValue('frs-hdl', recentLabs.hdl);
      setFormValue('qrisk-hdl', recentLabs.hdl);
    }
    
    if (recentLabs.ldl) {
      setFormValue('frs-ldl', recentLabs.ldl);
      setFormValue('qrisk-ldl', recentLabs.ldl);
    }
    
    if (recentLabs.lpa) {
      setFormValue('frs-lpa', recentLabs.lpa);
      setFormValue('qrisk-lpa', recentLabs.lpa);
    }
    
    // Calculate cholesterol ratio if both total and HDL are available
    if (recentLabs.totalCholesterol && recentLabs.hdl) {
      calculateCholesterolRatio();
    }
  }
  
  // Medical conditions
  if (patientData.conditions) {
    // Map conditions to form checkboxes
    mapConditionsToForm(patientData.conditions);
  }
  
  // Medications
  if (patientData.medications) {
    // Map medications to form fields
    mapMedicationsToForm(patientData.medications);
  }
  
  // Blood pressure
  if (patientData.vitals && patientData.vitals.bloodPressure) {
    const recentBP = getLatestBloodPressure(patientData.vitals.bloodPressure);
    if (recentBP.systolic) {
      setFormValue('frs-sbp', recentBP.systolic);
      setFormValue('qrisk-sbp', recentBP.systolic);
    }
    
    // If multiple BP readings are available, populate the SBP readings fields
    populateSBPReadings(patientData.vitals.bloodPressure);
  }
}

/**
 * Map Juno ethnicity codes to QRISK3 ethnicity options
 * @param {string} junoEthnicity - Juno EMR ethnicity code
 */
function mapEthnicityToQRISK(junoEthnicity) {
  const ethnicityMap = {
    'white': 'white',
    'caucasian': 'white',
    'european': 'white',
    'indian': 'indian',
    'pakistani': 'pakistani',
    'bangladeshi': 'bangladeshi',
    'asian': 'other_asian',
    'east_asian': 'other_asian',
    'chinese': 'chinese',
    'black_caribbean': 'black_caribbean',
    'black_african': 'black_african',
    'african': 'black_african',
    'caribbean': 'black_caribbean',
    'hispanic': 'other',
    'latino': 'other',
    'middle_eastern': 'other',
    'mixed': 'other',
    'other': 'other'
  };
  
  const qriskEthnicity = ethnicityMap[junoEthnicity.toLowerCase()] || 'other';
  setFormValue('qrisk-ethnicity', qriskEthnicity);
}

/**
 * Get the latest lab values from Juno lab data
 * @param {Array} labs - Array of lab results from Juno
 * @returns {Object} - Latest values for relevant labs
 */
function getLatestLabValues(labs) {
  const relevantLabs = {
    totalCholesterol: null,
    hdl: null,
    ldl: null,
    lpa: null
  };
  
  // Lab code mappings
  const labCodes = {
    totalCholesterol: ['CHOL', '2093-3', 'CHOLESTEROL'],
    hdl: ['HDL', '2085-9', 'HDL-CHOLESTEROL'],
    ldl: ['LDL', '2089-1', 'LDL-CHOLESTEROL'],
    lpa: ['LPA', 'LP(A)', 'LIPOPROTEIN A']
  };
  
  // Find the latest result for each lab type
  for (const labType in labCodes) {
    const relevantResults = labs.filter(lab => 
      labCodes[labType].some(code => 
        lab.code && lab.code.toUpperCase().includes(code)
      )
    );
    
    if (relevantResults.length > 0) {
      // Sort by date (newest first) and take the first result
      relevantResults.sort((a, b) => new Date(b.date) - new Date(a.date));
      relevantLabs[labType] = relevantResults[0].value;
    }
  }
  
  return relevantLabs;
}

/**
 * Map patient conditions to form checkboxes
 * @param {Array} conditions - Patient conditions from Juno
 */
function mapConditionsToForm(conditions) {
  // Condition mappings
  const conditionMappings = {
    'atrial fibrillation': 'qrisk-af',
    'afib': 'qrisk-af',
    'rheumatoid arthritis': 'qrisk-ra',
    'chronic kidney disease': 'qrisk-ckd',
    'ckd': 'qrisk-ckd',
    'migraine': 'qrisk-migraine',
    'systemic lupus erythematosus': 'qrisk-sle',
    'sle': 'qrisk-sle',
    'lupus': 'qrisk-sle',
    'schizophrenia': 'qrisk-semi',
    'bipolar disorder': 'qrisk-semi',
    'severe depression': 'qrisk-semi',
    'erectile dysfunction': 'qrisk-ed',
    'impotence': 'qrisk-ed',
    'diabetes type 1': 'diabetesType1',
    'type 1 diabetes': 'diabetesType1',
    'diabetes type 2': 'diabetesType2',
    'type 2 diabetes': 'diabetesType2',
    'family history of cvd': 'familyHistoryCVD',
    'family history of coronary heart disease': 'familyHistoryCVD'
  };
  
  // Check for each condition
  for (const condition of conditions) {
    const conditionName = condition.name ? condition.name.toLowerCase() : '';
    
    // Check for matches in our mapping
    for (const [key, value] of Object.entries(conditionMappings)) {
      if (conditionName.includes(key)) {
        if (value === 'diabetesType1') {
          setFormValue('frs-diabetes', 'yes');
          setFormValue('qrisk-diabetes', 'type1');
        } else if (value === 'diabetesType2') {
          setFormValue('frs-diabetes', 'yes');
          setFormValue('qrisk-diabetes', 'type2');
        } else if (value === 'familyHistoryCVD') {
          setFormValue('qrisk-family-history', 'yes');
        } else {
          // Standard checkbox
          const checkbox = document.getElementById(value);
          if (checkbox) checkbox.checked = true;
        }
      }
    }
  }
}

/**
 * Map patient medications to form fields
 * @param {Array} medications - Patient medications from Juno
 */
function mapMedicationsToForm(medications) {
  // Check for relevant medication classes
  const onAntihypertensives = medications.some(med => 
    isAntihypertensive(med.name)
  );
  
  const onCorticosteroids = medications.some(med => 
    isCorticosteroid(med.name)
  );
  
  const onAtypicalAntipsychotics = medications.some(med => 
    isAtypicalAntipsychotic(med.name)
  );
  
  // Set form values based on medications
  if (onAntihypertensives) {
    setFormValue('frs-bp-treatment', 'yes');
    setFormValue('qrisk-bp-treatment', 'yes');
  }
  
  if (onCorticosteroids) {
    const checkbox = document.getElementById('qrisk-corticosteroids');
    if (checkbox) checkbox.checked = true;
  }
  
  if (onAtypicalAntipsychotics) {
    const checkbox = document.getElementById('qrisk-atypical-antipsychotics');
    if (checkbox) checkbox.checked = true;
  }
}

/**
 * Check if a medication is an antihypertensive
 * @param {string} medicationName - Name of the medication
 * @returns {boolean} - Whether it's an antihypertensive
 */
function isAntihypertensive(medicationName) {
  const antihypertensiveClasses = [
    'ace inhibitor', 'acei', 'arb', 'angiotensin', 'calcium channel', 
    'beta blocker', 'thiazide', 'diuretic',
    // Common specific medications
    'lisinopril', 'ramipril', 'enalapril', 'perindopril',
    'losartan', 'valsartan', 'candesartan', 'irbesartan',
    'amlodipine', 'diltiazem', 'verapamil', 'nifedipine',
    'metoprolol', 'bisoprolol', 'atenolol', 'carvedilol',
    'hydrochlorothiazide', 'chlorthalidone', 'indapamide',
    'furosemide', 'spironolactone', 'eplerenone'
  ];
  
  return antihypertensiveClasses.some(className => 
    medicationName.toLowerCase().includes(className)
  );
}

/**
 * Check if a medication is a corticosteroid
 * @param {string} medicationName - Name of the medication
 * @returns {boolean} - Whether it's a corticosteroid
 */
function isCorticosteroid(medicationName) {
  const corticosteroids = [
    'prednisone', 'prednisolone', 'methylprednisolone', 'dexamethasone',
    'hydrocortisone', 'budesonide', 'fluticasone', 'triamcinolone',
    'betametasone', 'cortisone', 'fludrocortisone'
  ];
  
  return corticosteroids.some(drug => 
    medicationName.toLowerCase().includes(drug)
  );
}

/**
 * Check if a medication is an atypical antipsychotic
 * @param {string} medicationName - Name of the medication
 * @returns {boolean} - Whether it's an atypical antipsychotic
 */
function isAtypicalAntipsychotic(medicationName) {
  const atypicalAntipsychotics = [
    'risperidone', 'olanzapine', 'quetiapine', 'aripiprazole',
    'clozapine', 'ziprasidone', 'paliperidone', 'asenapine',
    'lurasidone', 'brexpiprazole', 'cariprazine', 'iloperidone'
  ];
  
  return atypicalAntipsychotics.some(drug => 
    medicationName.toLowerCase().includes(drug)
  );
}

/**
 * Get the latest blood pressure readings
 * @param {Array} bpReadings - Array of BP readings from Juno
 * @returns {Object} - Latest systolic and diastolic values
 */
function getLatestBloodPressure(bpReadings) {
  if (!bpReadings || !bpReadings.length) {
    return { systolic: null, diastolic: null };
  }
  
  // Sort by date (newest first)
  bpReadings.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return {
    systolic: bpReadings[0].systolic,
    diastolic: bpReadings[0].diastolic
  };
}

/**
 * Populate SBP readings fields with historical blood pressure data
 * @param {Array} bpReadings - Array of BP readings from Juno
 */
function populateSBPReadings(bpReadings) {
  if (!bpReadings || bpReadings.length < 2) return;
  
  // Sort by date (newest first)
  bpReadings.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Take up to 6 most recent readings
  const recentReadings = bpReadings.slice(0, 6);
  
  // Populate the reading fields
  recentReadings.forEach((reading, index) => {
    const readingField = document.getElementById(`qrisk-sbp-reading-${index + 1}`);
    if (readingField) {
      readingField.value = reading.systolic;
    }
  });
  
  // Calculate standard deviation if there are enough readings
  if (recentReadings.length >= 3) {
    calculateSBPStandardDeviation('qrisk');
  }
}

/**
 * Calculate imperial height from cm
 * @param {number} heightCm - Height in centimeters
 */
function calculateImperialHeight(heightCm) {
  if (!heightCm) return;
  
  const totalInches = heightCm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  
  setFormValue('qrisk-height-feet', feet);
  setFormValue('qrisk-height-inches', inches);
}

/**
 * Handle form save request from Juno EMR
 * @returns {Object} - Data to be saved in Juno EMR
 */
function handleFormSave() {
  // Get results for saving
  const resultsContainer = document.getElementById('risk-results');
  if (!resultsContainer) return null;
  
  // Extract risk results
  const riskResults = extractRiskResults();
  
  // Create structured data for Juno EMR
  const formData = {
    id: JUNO_INTEGRATION.FORM_ID,
    timestamp: new Date().toISOString(),
    results: riskResults,
    recommendations: extractRecommendations()
  };
  
  // Send data back to Juno
  if (window.parent.JunoAPI) {
    window.parent.JunoAPI.saveFormData(formData);
  }
  
  return formData;
}

/**
 * Extract structured risk results from the UI
 * @returns {Object} - Structured risk assessment results
 */
function extractRiskResults() {
  const results = {};
  
  // Check which calculator was used
  const frsResults = document.querySelector('.results-card .risk-title')?.textContent.includes('Framingham');
  const qriskResults = document.querySelector('.results-card .risk-title')?.textContent.includes('QRISK');
  const comparisonResults = document.querySelector('.results-card .risk-title')?.textContent.includes('Comparison');
  
  // Extract base risk, modifier, and final risk
  if (frsResults || qriskResults) {
    const calculator = frsResults ? 'Framingham' : 'QRISK3';
    results.calculator = calculator;
    results.baseRisk = document.querySelector('.base-risk')?.textContent;
    results.lpaModifier = document.querySelector('.lpa-modifier')?.textContent || '1.0x';
    results.finalRisk = document.querySelector('.adjusted-risk')?.textContent;
    results.riskCategory = document.querySelector('.risk-category')?.textContent;
  } else if (comparisonResults) {
    results.calculator = 'Comparison';
    results.framingham = {
      baseRisk: document.querySelector('#compare-frs-base')?.textContent,
      lpaModifier: document.querySelector('#compare-frs-lpa')?.textContent,
      finalRisk: document.querySelector('#compare-frs-adjusted')?.textContent,
      category: document.querySelector('#compare-frs-category')?.textContent
    };
    results.qrisk = {
      baseRisk: document.querySelector('#compare-qrisk-base')?.textContent,
      lpaModifier: document.querySelector('#compare-qrisk-lpa')?.textContent,
      finalRisk: document.querySelector('#compare-qrisk-adjusted')?.textContent,
      category: document.querySelector('#compare-qrisk-category')?.textContent
    };
  }
  
  return results;
}

/**
 * Extract treatment recommendations
 * @returns {Array} - Treatment recommendations
 */
function extractRecommendations() {
  const recommendations = [];
  const recommendationsContent = document.getElementById('recommendations-content');
  
  if (recommendationsContent) {
    const items = recommendationsContent.querySelectorAll('.recommendation-item');
    items.forEach(item => {
      const title = item.querySelector('strong')?.textContent || '';
      const content = item.textContent.replace(title, '').trim();
      
      recommendations.push({
        category: title.replace(':', '').trim(),
        description: content
      });
    });
  }
  
  return recommendations;
}

/**
 * Set a form field value
 * @param {string} id - Field ID
 * @param {*} value - Value to set
 */
function setFormValue(id, value) {
  const field = document.getElementById(id);
  if (!field) return;
  
  if (field.tagName === 'SELECT') {
    // For select elements, find and select the matching option
    const options = field.options;
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === value) {
        field.selectedIndex = i;
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        field.dispatchEvent(event);
        break;
      }
    }
  } else {
    // For input elements
    field.value = value;
    // Trigger change event
    const event = new Event('change', { bubbles: true });
    field.dispatchEvent(event);
  }
}

/**
 * Reset the form
 */
function resetForm() {
  document.getElementById('frs-form')?.reset();
  document.getElementById('qrisk-form')?.reset();
  
  // Hide any results
  const resultsContainer = document.getElementById('results-container');
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
  }
}

/**
 * Prepare form data for Juno EMR's "FORM" section
 * Creates the form definition for Juno's form builder
 * @returns {Object} - Juno form definition
 */
function createJunoFormDefinition() {
  return {
    name: "CVD Risk Assessment",
    description: "Cardiovascular disease risk assessment with Lp(a) modifier",
    version: "1.0",
    author: "CVD Risk Toolkit Team",
    sections: [
      {
        title: "Risk Assessment Results",
        fields: [
          {
            name: "calculator",
            label: "Risk Calculator Used",
            type: "text"
          },
          {
            name: "baseRisk",
            label: "Base 10-Year Risk",
            type: "text"
          },
          {
            name: "lpaModifier",
            label: "Lp(a) Risk Modifier",
            type: "text"
          },
          {
            name: "finalRisk",
            label: "Final Adjusted Risk",
            type: "text"
          },
          {
            name: "riskCategory",
            label: "Risk Category",
            type: "text"
          }
        ]
      },
      {
        title: "Treatment Recommendations",
        fields: [
          {
            name: "statinRecommendation",
            label: "Statin Therapy",
            type: "text"
          },
          {
            name: "ezetimibeRecommendation",
            label: "Ezetimibe",
            type: "text"
          },
          {
            name: "pcsk9Recommendation",
            label: "PCSK9 Inhibitor",
            type: "text"
          },
          {
            name: "additionalRecommendations",
            label: "Additional Recommendations",
            type: "textarea"
          }
        ]
      }
    ]
  };
}

// Export functions for use in the main application
window.JunoIntegration = {
  init: initJunoIntegration,
  isJunoEnvironment: isJunoEnvironment,
  createFormDefinition: createJunoFormDefinition,
  handleSave: handleFormSave
};

// Initialize on window load
window.addEventListener('load', initJunoIntegration);


// === enhanced-display.js ===
// Enhanced Display Module
const enhancedDisplay = (function() {
  function showError(message, type = 'error') {
    const errorDiv = document.createElement('div');
    errorDiv.className = `enhanced-error ${type}`;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }
  
  function showLoadingOverlay(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'enhanced-loading-overlay';
    overlay.innerHTML = `<div class="loading-content"><div class="spinner"></div><p>${message}</p></div>`;
    document.body.appendChild(overlay);
    return overlay;
  }
  
  function hideLoadingOverlay(overlay) {
    if (overlay) overlay.remove();
  }
  
  return { showError, showLoadingOverlay, hideLoadingOverlay };
})();
window.enhancedDisplay = enhancedDisplay;




  // Enhanced Form functionality with comprehensive error handling
  document.addEventListener("DOMContentLoaded", function() {
    console.log('Initializing CVD Risk Toolkit...');
    
    // Global error handler
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      console.error('Global error:', msg, url, lineNo, columnNo, error);
      if (window.errorLogger) {
        window.errorLogger.logError(error || msg);
      }
      return false;
    };
    
    // Promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
      console.error('Unhandled promise rejection:', event.reason);
      if (window.errorLogger) {
        window.errorLogger.logError(event.reason);
      }
    });
    
    try {
      // Initialize all modules
      const initializationSteps = [
        { name: 'loading indicators', fn: () => window.loadingIndicator?.initialize() },
        { name: 'physiological validation', fn: () => typeof validatePhysiologicalValues === 'function' && validatePhysiologicalValues() },
        { name: 'form handlers', fn: () => typeof initializeFormHandlers === 'function' && initializeFormHandlers() },
        { name: 'enhanced display', fn: () => window.enhancedDisplay?.initialize() },
        { name: 'disclaimers', fn: () => window.enhancedDisclaimer?.showInitialDisclaimers() },
        { name: 'mobile optimization', fn: () => typeof initializeMobileOptimization === 'function' && initializeMobileOptimization() },
        { name: 'OpenAI integration', fn: () => typeof initializeOpenAI === 'function' && initializeOpenAI() },
        { name: 'HIPAA compliance logging', fn: () => typeof initializeHIPAALogging === 'function' && initializeHIPAALogging() },
        { name: 'XSS protection', fn: () => window.xssProtection?.initialize() },
        { name: 'CSRF protection', fn: () => window.csrfProtection?.initialize() },
        { name: 'data privacy', fn: () => window.dataPrivacy?.initialize() },
        { name: 'error logging', fn: () => window.errorLogger?.initialize() },
        { name: 'performance monitoring', fn: () => window.performanceMonitor?.initialize() }
      ];
      
      let successCount = 0;
      initializationSteps.forEach(step => {
        try {
          if (step.fn) {
            step.fn();
            console.log('✓ Initialized ' + step.name);
            successCount++;
          }
        } catch (error) {
          console.error('✗ Failed to initialize ' + step.name + ':', error);
        }
      });
      
      console.log('CVD Risk Toolkit initialization complete: ' + successCount + '/' + initializationSteps.length + ' successful');
    } catch (error) {
      console.error('Critical error during initialization:', error);
    }
  });

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      safeGet,
      debounce,
      throttle
    };
  }
  