// utils.js - Common utility functions

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
