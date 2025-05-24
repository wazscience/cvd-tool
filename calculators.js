/**
 * calculators.js
 * Isolated module for CVD Risk calculation functions
 * 
 * This file extracts the core calculator functions from combined.js
 * to enable proper unit testing and modular code organization.
 */

// Create a module using the revealing module pattern
const CVDCalculators = (function() {
  'use strict';
  
  /**
   * Calculate Lp(a) risk modifier based on concentration
   * @param {number} lpaValue - Lp(a) concentration in mg/dL
   * @returns {number} - Risk multiplier
   */
  function calculateLpaModifier(lpaValue) {
    // No additional risk below 30 mg/dL
    if (lpaValue < 30) {
      return 1.0;
    }
    // Linear increase 1.0-1.3x for 30-50 mg/dL
    else if (lpaValue >= 30 && lpaValue < 50) {
      return 1.0 + (lpaValue - 30) * 0.015; // Simplified from (0.3 / 20)
    }
    // Linear increase 1.3-1.6x for 50-100 mg/dL
    else if (lpaValue >= 50 && lpaValue < 100) {
      return 1.3 + (lpaValue - 50) * 0.006; // Simplified from (0.3 / 50)
    }
    // Linear increase 1.6-2.0x for 100-200 mg/dL
    else if (lpaValue >= 100 && lpaValue < 200) {
      return 1.6 + (lpaValue - 100) * 0.004; // Simplified from (0.4 / 100)
    }
    // Linear increase 2.0-3.0x for 200-300 mg/dL
    else if (lpaValue >= 200 && lpaValue < 300) {
      return 2.0 + (lpaValue - 200) * 0.01; // Simplified from (1.0 / 100)
    }
    // Maximum 3.0x increase for values ≥300 mg/dL
    else {
      return 3.0;
    }
  }

  /**
   * Determine risk category based on percentage
   * @param {number} riskPercentage - Risk percentage value
   * @returns {string} - Risk category (low, moderate, high)
   */
  function getRiskCategory(riskPercentage) {
    if (riskPercentage < 10) {
      return 'low';
    } else if (riskPercentage < 20) {
      return 'moderate';
    } else {
      return 'high';
    }
  }

  /**
   * Helper function to convert cholesterol between mg/dL and mmol/L
   * @param {number} value - Cholesterol value
   * @param {string} fromUnit - Original unit ('mg/dL' or 'mmol/L')
   * @param {string} toUnit - Target unit ('mg/dL' or 'mmol/L')
   * @returns {number} - Converted cholesterol value
   */
  function convertCholesterol(value, fromUnit, toUnit) {
    if (value === null || value === undefined) return null;
    
    if (fromUnit === toUnit) {
      return parseFloat(value);
    }
    
    if (fromUnit === 'mg/dL' && toUnit === 'mmol/L') {
      const converted = parseFloat(value) / 38.67;
      return parseFloat(converted.toFixed(3)); // Round to 3 decimal places
    }
    
    if (fromUnit === 'mmol/L' && toUnit === 'mg/dL') {
      const converted = parseFloat(value) * 38.67;
      return parseFloat(converted.toFixed(3)); // Round to 3 decimal places
    }
    
    return parseFloat(value);
  }

  /**
   * Helper function to convert Lp(a) between mg/dL and nmol/L
   * @param {number} value - Lp(a) value
   * @param {string} fromUnit - Original unit ('mg/dL' or 'nmol/L')
   * @param {string} toUnit - Target unit ('mg/dL' or 'nmol/L')
   * @returns {number} - Converted Lp(a) value
   */
  function convertLpa(value, fromUnit, toUnit) {
    if (value === null || value === undefined) return null;
    
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

  /**
   * Helper function to convert height from feet/inches to cm
   * @param {number} feet - Height in feet
   * @param {number} inches - Height in inches
   * @returns {number} - Height in cm
   */
  function convertHeightToCm(feet, inches) {
    if (feet === null && inches === null) return null;
    feet = feet || 0;
    inches = inches || 0;
    return ((feet * 12) + parseFloat(inches)) * 2.54;
  }

  /**
   * Helper function to convert weight from pounds to kg
   * @param {number} pounds - Weight in pounds
   * @returns {number} - Weight in kg
   */
  function convertWeightToKg(pounds) {
    if (pounds === null || pounds === undefined) return null;
    return pounds * 0.45359237;
  }

  /**
   * Calculates BMI from height and weight
   * @param {number} height - Height in cm
   * @param {number} weight - Weight in kg
   * @returns {number} - BMI value
   */
  function calculateBMI(height, weight) {
    if (!height || !weight) return null;
    // Convert height from cm to meters
    const heightInM = height / 100;
    return weight / (heightInM * heightInM);
  }

  /**
   * Calculates Framingham Risk Score
   * @param {Object} data - Patient data from the form
   * @returns {Object} - Risk calculation results
   */
  function calculateFraminghamRiskScore(data) {
    // Validate input data
    if (!data || typeof data !== 'object') {
      console.error('Invalid data provided to Framingham calculator');
      return { baseRisk: 0, lpaModifier: 1, modifiedRisk: 0, riskCategory: 'error' };
    }
    
    // Ensure age is within valid range
    if (data.age < 30 || data.age > 74) {
      console.warn('Age outside valid range for Framingham (30-74)');
    }
    
    // Convert units if needed
    let totalChol = data.totalChol;
    let hdl = data.hdl;
    
    if (data.totalCholUnit === 'mg/dL') {
      totalChol = convertCholesterol(totalChol, 'mg/dL', 'mmol/L');
    }
    
    if (data.hdlUnit === 'mg/dL') {
      hdl = convertCholesterol(hdl, 'mg/dL', 'mmol/L');
    }
    
    // Variables for calculation
    const age = data.age;
    const isMale = data.sex === 'male';
    const isSmoker = data.smoker === true;
    const isDiabetic = data.diabetes === true;
    const isTreated = data.bpTreatment === true;
    const sbp = data.sbp;
    
    // Logarithmic transformations for Framingham equation
    const lnAge = Math.log(age);
    const lnTotalChol = Math.log(totalChol);
    const lnHDL = Math.log(hdl);
    const lnSBP = Math.log(sbp);
    
    let risk;
    
    if (isMale) {
      // Coefficients for men
      risk = 
        (lnAge * 3.11296) + 
        (lnTotalChol * 1.12370) - 
        (lnHDL * 0.93263) + 
        (lnSBP * (isTreated ? 1.99881 : 1.93303)) + 
        (isSmoker ? 0.65451 : 0) + 
        (isDiabetic ? 0.57367 : 0) - 
        23.9802;
      
      // Calculate 10-year risk percentage
      const baselineSurvival = 0.88431;
      const tenYearRisk = 1 - Math.pow(baselineSurvival, Math.exp(risk));
      var riskPercentage = tenYearRisk * 100;
      
    } else {
      // Coefficients for women
      risk = 
        (lnAge * 2.72107) + 
        (lnTotalChol * 1.20904) - 
        (lnHDL * 0.70833) + 
        (lnSBP * (isTreated ? 2.82263 : 2.76157)) + 
        (isSmoker ? 0.52873 : 0) + 
        (isDiabetic ? 0.69154 : 0) - 
        26.1931;
      
      // Calculate 10-year risk percentage
      const baselineSurvival = 0.94833;
      const tenYearRisk = 1 - Math.pow(baselineSurvival, Math.exp(risk));
      var riskPercentage = tenYearRisk * 100;
    }
    
    // Ensure risk is within reasonable bounds
    riskPercentage = Math.min(Math.max(riskPercentage, 0), 100);
    
    // Apply Lp(a) modifier if available
    let modifiedRiskPercentage = riskPercentage;
    let lpaModifier = 1.0;
    
    if (data.lpa !== null && data.lpa !== undefined) {
      // Convert Lp(a) to mg/dL if needed
      let lpaValue = data.lpa;
      if (data.lpaUnit === 'nmol/L') {
        lpaValue = convertLpa(lpaValue, 'nmol/L', 'mg/dL');
      }
      
      // Calculate modifier based on Lp(a) level
      lpaModifier = calculateLpaModifier(lpaValue);
      modifiedRiskPercentage = riskPercentage * lpaModifier;
    }
    
    return {
      baseRisk: riskPercentage,
      lpaModifier: lpaModifier,
      modifiedRisk: modifiedRiskPercentage,
      riskCategory: getRiskCategory(modifiedRiskPercentage)
    };
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
   * Calculates QRISK3 score using simplified algorithm
   * Note: This is a simplified implementation for educational purposes
   * and should not be used for clinical decision making without validation
   * @param {Object} data - Patient data from the form
   * @returns {Object} - Risk calculation results
   */
  function calculateQRISK3Score(data) {
    // Validate input data
    if (!data || typeof data !== 'object') {
      console.error('Invalid data provided to QRISK3 calculator');
      return { baseRisk: 0, lpaModifier: 1, modifiedRisk: 0, riskCategory: 'error' };
    }
    
    // Ensure values are within physiological limits
    if (data.age < 25 || data.age > 84) {
      console.warn('Age outside valid range for QRISK3 (25-84)');
    }
    
    if (data.sbp < 70 || data.sbp > 210) {
      console.warn('Systolic BP outside valid range for QRISK3 (70-210 mmHg)');
    }
    
    // Standardize units if needed
    const standardizedData = standardizeUnitsForQRISK3(data);
    
    // Process ethnicity and smoking status
    const ethrisk = convertEthnicity(standardizedData.ethnicity);
    const smoke_cat = convertSmoking(standardizedData.smoker);
    
    // Set boolean values for conditions
    const isFemale = standardizedData.sex === 'female';
    const b_AF = standardizedData.atrialFibrillation ? 1 : 0;
    const b_atypicalantipsy = standardizedData.atypicalAntipsychotics ? 1 : 0;
    const b_corticosteroids = standardizedData.corticosteroids ? 1 : 0;
    const b_impotence2 = (!isFemale && standardizedData.erectileDysfunction) ? 1 : 0;
    const b_migraine = standardizedData.migraine ? 1 : 0;
    const b_ra = standardizedData.rheumatoidArthritis ? 1 : 0;
    const b_renal = standardizedData.chronicKidneyDisease ? 1 : 0;
    const b_semi = standardizedData.severeMetalIllness ? 1 : 0;
    const b_sle = standardizedData.sle ? 1 : 0;
    const b_treatedhyp = standardizedData.bpTreatment ? 1 : 0;
    const b_type1 = (standardizedData.diabetes === 'type1') ? 1 : 0;
    const b_type2 = (standardizedData.diabetes === 'type2') ? 1 : 0;
    
    // Get continuous variables
    const age = standardizedData.age;
    const bmi = standardizedData.bmi;
    const sbp = standardizedData.sbp;
    const sbps5 = standardizedData.sbpSd || 0; // Standard deviation of SBP
    const rati = standardizedData.cholRatio; // Total cholesterol / HDL ratio
    const town = standardizedData.townsend || 0; // Default to 0 if not provided
    const fh_cvd = standardizedData.familyHistory ? 1 : 0;
    
    // Simplified QRISK3 algorithm - adjust weights based on medical literature
    let baseRisk = 0;
    
    // Base age risk
    if (isFemale) {
      baseRisk = 0.7 * (age - 25);
    } else {
      baseRisk = 0.9 * (age - 25);
    }
    
    // Adjust for ethnicity
    const ethnicityFactors = {
      1: 1.0,  // White
      2: 1.3,  // Indian
      3: 1.4,  // Pakistani
      4: 1.5,  // Bangladeshi
      5: 1.2,  // Other Asian
      6: 0.85, // Black Caribbean
      7: 0.75, // Black African
      8: 0.7,  // Chinese
      9: 0.95  // Other
    };
    baseRisk *= ethnicityFactors[ethrisk] || 1.0;
    
    // Adjust for smoking
    const smokingFactors = [0, 1.6, 1.9, 2.2, 2.5]; // Non, Ex, Light, Moderate, Heavy
    baseRisk *= 1 + (smokingFactors[smoke_cat] - 1) * 0.5;
    
    // Adjust for BMI
    if (bmi) {
      if (bmi < 20) {
        baseRisk *= 0.9;
      } else if (bmi >= 25 && bmi < 30) {
        baseRisk *= 1.3;
      } else if (bmi >= 30 && bmi < 35) {
        baseRisk *= 1.6;
      } else if (bmi >= 35) {
        baseRisk *= 2.0;
      }
    }
    
    // Adjust for systolic BP
    if (sbp < 120) {
      baseRisk *= 0.8;
    } else if (sbp >= 140 && sbp < 160) {
      baseRisk *= 1.4;
      // Add effect of BP variability if available
      if (sbps5 > 0) {
        baseRisk *= 1 + (sbps5 / 20) * 0.2;
      }
    } else if (sbp >= 160) {
      baseRisk *= 1.9;
      // Add effect of BP variability if available
      if (sbps5 > 0) {
        baseRisk *= 1 + (sbps5 / 20) * 0.3;
      }
    }
    
    // Adjust for BP treatment
    if (b_treatedhyp) {
      baseRisk *= 1.2;
    }
    
    // Adjust for cholesterol ratio
    if (rati > 4) {
      baseRisk *= 1 + (rati - 4) * 0.2;
    }
    
    // Adjust for diabetes
    if (b_type1) {
      baseRisk *= 2.5;
    } else if (b_type2) {
      baseRisk *= 1.9;
    }
    
    // Adjust for family history
    if (fh_cvd) {
      baseRisk *= 1.5;
    }
    
    // Adjust for medical conditions
    if (b_AF) baseRisk *= 2.0;
    if (b_ra) baseRisk *= 1.4;
    if (b_renal) baseRisk *= 1.7;
    if (b_atypicalantipsy) baseRisk *= 1.1;
    if (b_corticosteroids) baseRisk *= 1.3;
    if (b_migraine) baseRisk *= 1.3;
    if (b_semi) baseRisk *= 1.1;
    if (b_sle) baseRisk *= 1.5;
    if (b_impotence2) baseRisk *= 1.2;
    
    // Calculate final 10-year risk percentage
    let riskPercentage = baseRisk;
    
    // Ensure risk is within reasonable bounds
    riskPercentage = Math.min(Math.max(riskPercentage, 0), 99);
    
    // Apply Lp(a) modifier if available
    let modifiedRiskPercentage = riskPercentage;
    let lpaModifier = 1.0;
    
    if (standardizedData.lpa !== null && standardizedData.lpa !== undefined) {
      // Convert Lp(a) to mg/dL if needed
      let lpaValue = standardizedData.lpa;
      if (standardizedData.lpaUnit === 'nmol/L') {
        lpaValue = convertLpa(lpaValue, 'nmol/L', 'mg/dL');
      }
      
      // Calculate modifier based on Lp(a) level
      lpaModifier = calculateLpaModifier(lpaValue);
      modifiedRiskPercentage = riskPercentage * lpaModifier;
    }
    
    return {
      baseRisk: riskPercentage,
      lpaModifier: lpaModifier,
      modifiedRisk: modifiedRiskPercentage,
      riskCategory: getRiskCategory(modifiedRiskPercentage)
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

  // Public API
  return {
    calculateLpaModifier,
    getRiskCategory,
    convertCholesterol,
    convertLpa,
    convertHeightToCm,
    convertWeightToKg,
    calculateBMI,
    calculateFraminghamRiskScore,
    calculateQRISK3Score,
    convertEthnicity,
    convertSmoking,
    standardizeUnitsForQRISK3
  };
})();

// For Node.js compatibility (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CVDCalculators;
}

// For browser compatibility
if (typeof window !== 'undefined') {
  window.CVDCalculators = CVDCalculators;
}