/**
 * Core calculation functions for CVD Risk Toolkit
 * Clean implementation to replace problematic files
 */

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
    return 1.0 + (lpaValue - 30) * (0.3 / 20);
  }
  // Linear increase 1.3-1.6x for 50-100 mg/dL
  else if (lpaValue >= 50 && lpaValue < 100) {
    return 1.3 + (lpaValue - 50) * (0.3 / 50);
  }
  // Linear increase 1.6-2.0x for 100-200 mg/dL
  else if (lpaValue >= 100 && lpaValue < 200) {
    return 1.6 + (lpaValue - 100) * (0.4 / 100);
  }
  // Linear increase 2.0-3.0x for 200-300 mg/dL
  else if (lpaValue >= 200 && lpaValue < 300) {
    return 2.0 + (lpaValue - 200) * (1.0 / 100);
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

// Export if in a module environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateLpaModifier,
    getRiskCategory
  };
}
