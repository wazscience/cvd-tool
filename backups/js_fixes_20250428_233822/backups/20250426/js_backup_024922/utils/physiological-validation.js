// Physiological Validation Module
const physiologicalValidation = (function() {
  const RANGES = {
    age: { min: 18, max: 100, unit: 'years' },
    sbp: { min: 70, max: 240, unit: 'mmHg' },
    totalChol: { min: 1.0, max: 15.0, unit: 'mmol/L' }
  };

  function validateValue(type, value) {
    const range = RANGES[type];
    if (!range) {return { isValid: true };}

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
