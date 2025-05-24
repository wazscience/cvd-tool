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
    console.warn(`No physiological range defined for parameter '${parameterType}'`);
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
function calculateQRISK3Score(data) {
  // Implementation will be added
  return { baseRisk: 0, lpaModifier: 1, modifiedRisk: 0, riskCategory: 'low' };
}
