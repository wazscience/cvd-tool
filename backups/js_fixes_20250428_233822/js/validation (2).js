/**
 * validation.js
 * Handles form validation, error display, and unit conversions
 */

/**
 * Validates a numeric input field
 * @param {string} fieldId - The ID of the input field
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {string} fieldName - Human-readable field name for error messages
 * @param {boolean} required - Whether the field is required
 * @returns {Object} - { isValid: boolean, value: number|null, message: string|null }
 */
function validateNumericInput(fieldId, min, max, fieldName, required = true) {
  const field = document.getElementById(fieldId);
  if (!field) {
    console.error(`Field with ID ${fieldId} not found`);
    return {
      isValid: false,
      value: null,
      message: `Internal error: Field ${fieldId} not found.`
    };
  }

  const value = field.value.trim();
  const errorDisplay = field.parentElement.querySelector('.error-message') ||
                        field.closest('.form-group')?.querySelector('.error-message');

  // Check if field is required and empty
  if (required && value === '') {
    field.classList.add('error');
    if (errorDisplay) {errorDisplay.style.display = 'block';}
    return {
      isValid: false,
      value: null,
      message: `${fieldName} is required.`
    };
  }

  // If field is not required and empty, return valid
  if (!required && value === '') {
    field.classList.remove('error');
    if (errorDisplay) {errorDisplay.style.display = 'none';}
    return {
      isValid: true,
      value: null,
      message: null
    };
  }

  // Check if input is a number
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    field.classList.add('error');
    if (errorDisplay) {errorDisplay.style.display = 'block';}
    return {
      isValid: false,
      value: null,
      message: `${fieldName} must be a number. Please enter a valid numeric value.`
    };
  }

  // Check if value is within range
  if (numValue < min || numValue > max) {
    field.classList.add('error');
    if (errorDisplay) {errorDisplay.style.display = 'block';}
    return {
      isValid: false,
      value: null,
      message: `${fieldName} must be between ${min} and ${max}.`
    };
  }

  // Input is valid
  field.classList.remove('error');
  if (errorDisplay) {errorDisplay.style.display = 'none';}
  return {
    isValid: true,
    value: numValue,
    message: null
  };
}

/**
 * Validates a select field
 * @param {string} fieldId - The ID of the select field
 * @param {string} fieldName - Human-readable field name for error messages
 * @param {boolean} required - Whether the field is required
 * @returns {Object} - { isValid: boolean, value: string|null, message: string|null }
 */
function validateSelectInput(fieldId, fieldName, required = true) {
  const field = document.getElementById(fieldId);
  if (!field) {
    console.error(`Field with ID ${fieldId} not found`);
    return {
      isValid: false,
      value: null,
      message: `Internal error: Field ${fieldId} not found.`
    };
  }

  const value = field.value;
  const errorDisplay = field.parentElement.querySelector('.error-message') ||
                       field.closest('.form-group')?.querySelector('.error-message');

  // Check if field is required and empty or default option
  if (required && (value === '' || value === null || field.selectedIndex === 0 && field.options[0].disabled)) {
    field.classList.add('error');
    if (errorDisplay) {errorDisplay.style.display = 'block';}
    return {
      isValid: false,
      value: null,
      message: `Please select a ${fieldName}.`
    };
  }

  // Input is valid
  field.classList.remove('error');
  if (errorDisplay) {errorDisplay.style.display = 'none';}
  return {
    isValid: true,
    value: value,
    message: null
  };
}

/**
 * Validates a checkbox
 * @param {string} fieldId - The ID of the checkbox
 * @param {string} fieldName - Human-readable field name for error messages
 * @param {boolean} required - Whether the checkbox must be checked
 * @returns {Object} - { isValid: boolean, value: boolean, message: string|null }
 */
function validateCheckbox(fieldId, fieldName, required = false) {
  const field = document.getElementById(fieldId);
  if (!field) {
    console.error(`Field with ID ${fieldId} not found`);
    return {
      isValid: false,
      value: false,
      message: `Internal error: Field ${fieldId} not found.`
    };
  }

  const checked = field.checked;
  const errorDisplay = field.parentElement.querySelector('.error-message') ||
                       field.closest('.form-group')?.querySelector('.error-message');

  // Check if checkbox is required and not checked
  if (required && !checked) {
    field.classList.add('error');
    if (errorDisplay) {errorDisplay.style.display = 'block';}
    return {
      isValid: false,
      value: false,
      message: `${fieldName} must be checked.`
    };
  }

  // Input is valid
  field.classList.remove('error');
  if (errorDisplay) {errorDisplay.style.display = 'none';}
  return {
    isValid: true,
    value: checked,
    message: null
  };
}

/**
 * Displays validation errors to the user
 * @param {Array} errors - Array of error messages
 */
function displayErrors(errors) {
  if (errors.length === 0) {return;}

  const errorMessage = errors.join('\n• ');
  showModal('Please correct the following errors:\n\n• ' + errorMessage);
}

/**
 * Shows a modal with a message
 * @param {string} message - Message to display in modal
 */
function showModal(message) {
  document.getElementById('modal-message').innerHTML = message.replace(/\n/g, '<br>');
  document.getElementById('warning-modal').style.display = 'block';
}

/**
 * Shows a clinical warning message
 * @param {string} title - Warning title
 * @param {string} message - Warning message
 */
function showClinicalWarning(title, message) {
  document.getElementById('clinical-info-content').innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
    `;
  document.getElementById('clinical-info-modal').style.display = 'block';
}

/**
 * Unit conversion functions for various measurements
 */

/**
 * Helper function to convert height from feet/inches to cm
 * @param {number} feet - Height in feet
 * @param {number} inches - Height in inches
 * @returns {number} - Height in cm
 */
function convertHeightToCm(feet, inches) {
  if (feet === null && inches === null) {return null;}
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
  if (pounds === null) {return null;}
  return pounds * 0.45359237;
}

/**
 * Helper function to convert cholesterol between mg/dL and mmol/L
 * @param {number} value - Cholesterol value
 * @param {string} fromUnit - Original unit ('mg/dL' or 'mmol/L')
 * @param {string} toUnit - Target unit ('mg/dL' or 'mmol/L')
 * @returns {number} - Converted cholesterol value
 */
function convertCholesterol(value, fromUnit, toUnit) {
  if (value === null) {return null;}

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

/**
 * Helper function to convert Lp(a) between mg/dL and nmol/L
 * @param {number} value - Lp(a) value
 * @param {string} fromUnit - Original unit ('mg/dL' or 'nmol/L')
 * @param {string} toUnit - Target unit ('mg/dL' or 'nmol/L')
 * @returns {number} - Converted Lp(a) value
 */
function convertLpa(value, fromUnit, toUnit) {
  if (value === null) {return null;}

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
 * Calculates BMI from height and weight
 * @param {number} height - Height in cm
 * @param {number} weight - Weight in kg
 * @returns {number} - BMI value
 */
function calculateBMI(height, weight) {
  if (!height || !weight) {return null;}
  // Convert height from cm to meters
  const heightInM = height / 100;
  return weight / (heightInM * heightInM);
}

/**
 * Format BMI with risk category
 * @param {number} bmi - BMI value
 * @returns {string} - Formatted BMI with category
 */
function formatBMI(bmi) {
  if (!bmi) {return 'Not available';}

  let category;
  if (bmi < 18.5) {
    category = 'Underweight';
  } else if (bmi < 25) {
    category = 'Normal weight';
  } else if (bmi < 30) {
    category = 'Overweight';
  } else {
    category = 'Obese';
  }

  return bmi.toFixed(1) + ' kg/m² (' + category + ')';
}

/**
 * Validates the Framingham Risk Score (FRS) form
 * @returns {Object} - { isValid: boolean, data: Object, errors: Array }
 */
function validateFRSForm() {
  const errors = [];
  const data = {};

  // Validate age
  const ageResult = validateNumericInput('frs-age', 30, 74, 'Age');
  if (!ageResult.isValid) {errors.push(ageResult.message);}
  data.age = ageResult.value;

  // Validate sex
  const sexResult = validateSelectInput('frs-sex', 'sex');
  if (!sexResult.isValid) {errors.push(sexResult.message);}
  data.sex = sexResult.value;

  // Validate total cholesterol
  const totalCholResult = validateNumericInput('frs-total-chol', 1, 15, 'Total Cholesterol');
  if (!totalCholResult.isValid) {errors.push(totalCholResult.message);}
  data.totalChol = totalCholResult.value;
  data.totalCholUnit = document.getElementById('frs-total-chol-unit').value;

  // Validate HDL cholesterol
  const hdlResult = validateNumericInput('frs-hdl', 0.5, 3, 'HDL Cholesterol');
  if (!hdlResult.isValid) {errors.push(hdlResult.message);}
  data.hdl = hdlResult.value;
  data.hdlUnit = document.getElementById('frs-hdl-unit').value;

  // Validate systolic blood pressure
  const sbpResult = validateNumericInput('frs-sbp', 90, 200, 'Systolic Blood Pressure');
  if (!sbpResult.isValid) {errors.push(sbpResult.message);}
  data.sbp = sbpResult.value;

  // Validate BP treatment
  const bpTreatmentResult = validateSelectInput('frs-bp-treatment', 'blood pressure treatment status');
  if (!bpTreatmentResult.isValid) {errors.push(bpTreatmentResult.message);}
  data.bpTreatment = bpTreatmentResult.value === 'yes';

  // Validate smoker status
  const smokerResult = validateSelectInput('frs-smoker', 'smoker status');
  if (!smokerResult.isValid) {errors.push(smokerResult.message);}
  data.smoker = smokerResult.value === 'yes';

  // Validate diabetes (not required)
  data.diabetes = document.getElementById('frs-diabetes').value === 'yes';

  // Validate Lp(a) (not required)
  const lpaResult = validateNumericInput('frs-lpa', 0, 500, 'Lp(a) Level', false);
  if (!lpaResult.isValid && lpaResult.message) {errors.push(lpaResult.message);}
  data.lpa = lpaResult.value;
  data.lpaUnit = document.getElementById('frs-lpa-unit').value;

  // Add the LDL-C value if provided for treatment recommendations
  const ldlInput = document.getElementById('frs-ldl');
  if (ldlInput) {
    const ldlResult = validateNumericInput('frs-ldl', 0.5, 10, 'LDL Cholesterol', false);
    if (!ldlResult.isValid && ldlResult.message) {errors.push(ldlResult.message);}
    data.ldl = ldlResult.value;
    if (data.ldl) {
      data.ldlUnit = document.getElementById('frs-ldl-unit')?.value || 'mmol/L';
    }
  }

  return {
    isValid: errors.length === 0,
    data: data,
    errors: errors
  };
}

/**
 * Validates the QRISK3 form
 * @returns {Object} - { isValid: boolean, data: Object, errors: Array }
 */
function validateQRISKForm() {
  const errors = [];
  const data = {};

  // Validate age
  const ageResult = validateNumericInput('qrisk-age', 25, 84, 'Age');
  if (!ageResult.isValid) {errors.push(ageResult.message);}
  data.age = ageResult.value;

  // Validate sex
  const sexResult = validateSelectInput('qrisk-sex', 'sex');
  if (!sexResult.isValid) {errors.push(sexResult.message);}
  data.sex = sexResult.value;

  // Validate ethnicity
  const ethnicityResult = validateSelectInput('qrisk-ethnicity', 'ethnicity');
  if (!ethnicityResult.isValid) {errors.push(ethnicityResult.message);}
  data.ethnicity = ethnicityResult.value;

  // Validate height
  const heightUnit = document.getElementById('qrisk-height-unit').value;
  let heightResult;

  if (heightUnit === 'cm') {
    heightResult = validateNumericInput('qrisk-height', 100, 250, 'Height');
    if (!heightResult.isValid) {errors.push(heightResult.message);}
    data.height = heightResult.value;
  } else {
    // Validate feet and inches
    const feetResult = validateNumericInput('qrisk-height-feet', 3, 7, 'Height (feet)', true);
    const inchesResult = validateNumericInput('qrisk-height-inches', 0, 11, 'Height (inches)', false);

    if (!feetResult.isValid) {errors.push(feetResult.message);}
    if (!inchesResult.isValid && inchesResult.message) {errors.push(inchesResult.message);}

    if (feetResult.isValid) {
      const inches = inchesResult.value || 0;
      data.height = convertHeightToCm(feetResult.value, inches);
    }
  }

  // Validate weight
  const weightResult = validateNumericInput('qrisk-weight', 30, 200, 'Weight');
  if (!weightResult.isValid) {errors.push(weightResult.message);}
  data.weight = weightResult.value;

  // Convert weight if needed
  if (data.weight && document.getElementById('qrisk-weight-unit').value === 'lb') {
    data.weight = convertWeightToKg(data.weight);
  }

  // Calculate BMI if we have height and weight
  if (data.height && data.weight) {
    data.bmi = calculateBMI(data.height, data.weight);
  }

  // Validate systolic blood pressure
  const sbpResult = validateNumericInput('qrisk-sbp', 70, 210, 'Systolic Blood Pressure');
  if (!sbpResult.isValid) {errors.push(sbpResult.message);}
  data.sbp = sbpResult.value;

  // Validate SD of SBP (not required)
  const sbpSdResult = validateNumericInput('qrisk-sbp-sd', 0, 30, 'Standard Deviation of SBP', false);
  if (!sbpSdResult.isValid && sbpSdResult.message) {errors.push(sbpSdResult.message);}
  data.sbpSd = sbpSdResult.value;

  // Validate total cholesterol
  const totalCholResult = validateNumericInput('qrisk-total-chol', 1, 15, 'Total Cholesterol');
  if (!totalCholResult.isValid) {errors.push(totalCholResult.message);}
  data.totalChol = totalCholResult.value;
  data.totalCholUnit = document.getElementById('qrisk-total-chol-unit').value;

  // Validate HDL cholesterol
  const hdlResult = validateNumericInput('qrisk-hdl', 0.5, 3, 'HDL Cholesterol');
  if (!hdlResult.isValid) {errors.push(hdlResult.message);}
  data.hdl = hdlResult.value;
  data.hdlUnit = document.getElementById('qrisk-hdl-unit').value;

  // Validate smoker status
  const smokerResult = validateSelectInput('qrisk-smoker', 'smoker status');
  if (!smokerResult.isValid) {errors.push(smokerResult.message);}
  data.smoker = smokerResult.value;

  // Validate diabetes
  const diabetesResult = validateSelectInput('qrisk-diabetes', 'diabetes status');
  if (!diabetesResult.isValid) {errors.push(diabetesResult.message);}
  data.diabetes = diabetesResult.value;

  // Validate family history of CVD
  const familyHistoryResult = validateSelectInput('qrisk-family-history', 'family history of CVD');
  if (!familyHistoryResult.isValid) {errors.push(familyHistoryResult.message);}
  data.familyHistory = familyHistoryResult.value === 'yes';

  // Validate BP treatment (not required)
  data.bpTreatment = document.getElementById('qrisk-bp-treatment').value === 'yes';

  // Get medical conditions
  data.atrialFibrillation = document.getElementById('qrisk-af').checked;
  data.rheumatoidArthritis = document.getElementById('qrisk-ra').checked;
  data.chronicKidneyDisease = document.getElementById('qrisk-ckd').checked;

  // Validate Lp(a) (not required)
  const lpaResult = validateNumericInput('qrisk-lpa', 0, 500, 'Lp(a) Level', false);
  if (!lpaResult.isValid && lpaResult.message) {errors.push(lpaResult.message);}
  data.lpa = lpaResult.value;
  data.lpaUnit = document.getElementById('qrisk-lpa-unit').value;

  // Add the LDL-C value if provided for treatment recommendations
  const ldlInput = document.getElementById('qrisk-ldl');
  if (ldlInput) {
    const ldlResult = validateNumericInput('qrisk-ldl', 0.5, 10, 'LDL Cholesterol', false);
    if (!ldlResult.isValid && ldlResult.message) {errors.push(ldlResult.message);}
    data.ldl = ldlResult.value;
    if (data.ldl) {
      data.ldlUnit = document.getElementById('qrisk-ldl-unit')?.value || 'mmol/L';
    }
  }

  return {
    isValid: errors.length === 0,
    data: data,
    errors: errors
  };
}

/**
 * Validate the medication form
 * @returns {Object} - Validation results: { isValid, data, errors }
 */
function validateMedicationForm() {
  const errors = [];
  const data = {};

  // Validate prevention category
  const preventionCategoryResult = validateSelectInput('prevention-category', 'Prevention Category');
  if (!preventionCategoryResult.isValid) {errors.push(preventionCategoryResult.message);}
  data.preventionCategory = preventionCategoryResult.value;

  // Validate secondary details if applicable
  if (data.preventionCategory === 'secondary') {
    const secondaryDetailsResult = validateSelectInput('secondary-details', 'Secondary Prevention Details');
    if (!secondaryDetailsResult.isValid) {errors.push(secondaryDetailsResult.message);}
    data.secondaryDetails = secondaryDetailsResult.value;
  }

  // Validate lipid values
  const lipidFields = [
    { id: 'med-total-chol', name: 'Total Cholesterol', min: 1, max: 15 },
    { id: 'med-ldl', name: 'LDL Cholesterol', min: 0.5, max: 10 },
    { id: 'med-hdl', name: 'HDL Cholesterol', min: 0.5, max: 3 },
    { id: 'med-trig', name: 'Triglycerides', min: 0.5, max: 15 }
  ];

  lipidFields.forEach(field => {
    const result = validateNumericInput(field.id, field.min, field.max, field.name);
    if (!result.isValid) {errors.push(result.message);}
    data[field.id.replace('med-', '')] = result.value;
    data[field.id.replace('med-', '') + '-unit'] = document.getElementById(field.id + '-unit').value;
  });

  // Get non-HDL
  const nonHDLInput = document.getElementById('med-non-hdl');
  if (nonHDLInput) {
    if (nonHDLInput.disabled) {
      // Auto-calculated value
      calculateNonHDL();
      data['non-hdl'] = parseFloat(nonHDLInput.value);
      data['non-hdl-unit'] = 'mmol/L';
    } else {
      // Manually entered value
      const result = validateNumericInput('med-non-hdl', 0.5, 12, 'Non-HDL Cholesterol');
      if (!result.isValid) {errors.push(result.message);}
      data['non-hdl'] = result.value;
      data['non-hdl-unit'] = document.getElementById('med-non-hdl-unit').textContent;
    }
  }

  // Get optional values
  // ApoB
  const apoBInput = document.getElementById('med-apob');
  if (apoBInput && apoBInput.value) {
    const result = validateNumericInput('med-apob', 0.2, 2.5, 'ApoB', false);
    if (!result.isValid && result.message) {errors.push(result.message);}
    data.apob = result.value;
    data['apob-unit'] = document.getElementById('med-apob-unit').value;
  }

  // Lp(a)
  const lpaInput = document.getElementById('med-lpa');
  if (lpaInput && lpaInput.value) {
    const result = validateNumericInput('med-lpa', 0, 500, 'Lp(a)', false);
    if (!result.isValid && result.message) {errors.push(result.message);}
    data.lpa = result.value;
    data['lpa-unit'] = document.getElementById('med-lpa-unit').value;
  }

  // Get medication data
  // Statin
  data.statin = document.getElementById('med-statin').value;
  if (data.statin !== 'none') {
    const statinDoseSelect = document.getElementById('med-statin-dose');
    const statinDoseResult = validateSelectInput('med-statin-dose', 'Statin Dose');
    if (!statinDoseResult.isValid) {errors.push(statinDoseResult.message);}
    data['statin-dose'] = statinDoseResult.value;

    // Get statin intensity
    const selectedOption = statinDoseSelect.options[statinDoseSelect.selectedIndex];
    data['statin-intensity'] = selectedOption ? selectedOption.dataset.intensity : null;
  }

  // Statin intolerance
  data['statin-intolerance'] = document.getElementById('med-statin-intolerance').value;
  if (data['statin-intolerance'] !== 'no') {
    const intoleranceTypeResult = validateSelectInput('med-intolerance-type', 'Intolerance Type');
    if (!intoleranceTypeResult.isValid) {errors.push(intoleranceTypeResult.message);}
    data['intolerance-type'] = intoleranceTypeResult.value;
  }

  // Other medications
  data.ezetimibe = document.getElementById('med-ezetimibe').checked;
  data.pcsk9 = document.getElementById('med-pcsk9').checked;
  data.fibrate = document.getElementById('med-fibrate').checked;
  data.niacin = document.getElementById('med-niacin').checked;
  data['bile-acid'] = document.getElementById('med-bile-acid').checked;

  // PCSK9 inhibitor details
  if (data.pcsk9) {
    const pcsk9TypeResult = validateSelectInput('med-pcsk9-type', 'PCSK9 Inhibitor Type');
    if (!pcsk9TypeResult.isValid) {errors.push(pcsk9TypeResult.message);}
    data['pcsk9-type'] = pcsk9TypeResult.value;

    const pcsk9DoseResult = validateSelectInput('med-pcsk9-dose', 'PCSK9 Inhibitor Dose');
    if (!pcsk9DoseResult.isValid) {errors.push(pcsk9DoseResult.message);}
    data['pcsk9-dose'] = pcsk9DoseResult.value;

    const maxTherapyDurationResult = validateSelectInput('med-max-therapy-duration', 'Duration on Maximum Therapy');
    if (!maxTherapyDurationResult.isValid) {errors.push(maxTherapyDurationResult.message);}
    data['max-therapy-duration'] = maxTherapyDurationResult.value;

    const ldlReductionResult = validateNumericInput('med-ldl-reduction', 0, 100, 'LDL Reduction on Current Therapy', false);
    if (!ldlReductionResult.isValid && ldlReductionResult.message) {errors.push(ldlReductionResult.message);}
    data['ldl-reduction'] = ldlReductionResult.value;
  }

  return {
    isValid: errors.length === 0,
    data: data,
    errors: errors
  };
}

/**
 * Add clinical validation for abnormal values
 */
function addClinicalValidation() {
  // Add validation for common clinical fields
  const clinicalFields = [
    { id: 'frs-total-chol', name: 'Total Cholesterol', min: 1, max: 15, unit: 'frs-total-chol-unit' },
    { id: 'frs-hdl', name: 'HDL Cholesterol', min: 0.5, max: 3, unit: 'frs-hdl-unit' },
    { id: 'frs-sbp', name: 'Systolic Blood Pressure', min: 90, max: 200 },
    { id: 'qrisk-total-chol', name: 'Total Cholesterol', min: 1, max: 15, unit: 'qrisk-total-chol-unit' },
    { id: 'qrisk-hdl', name: 'HDL Cholesterol', min: 0.5, max: 3, unit: 'qrisk-hdl-unit' },
    { id: 'qrisk-sbp', name: 'Systolic Blood Pressure', min: 70, max: 210 },
    { id: 'med-total-chol', name: 'Total Cholesterol', min: 1, max: 15, unit: 'med-total-chol-unit' },
    { id: 'med-ldl', name: 'LDL Cholesterol', min: 0.5, max: 10, unit: 'med-ldl-unit' },
    { id: 'med-hdl', name: 'HDL Cholesterol', min: 0.5, max: 3, unit: 'med-hdl-unit' },
    { id: 'med-trig', name: 'Triglycerides', min: 0.5, max: 15, unit: 'med-trig-unit' }
  ];

  clinicalFields.forEach(field => {
    const element = document.getElementById(field.id);
    if (element) {
      element.addEventListener('change', function() {
        validateClinicalValue(field.id, field.name, field.min, field.max, field.unit);
      });
    }
  });
}

/**
 * Validate a clinical value and show warnings for abnormal values
 * @param {string} fieldId - Field ID
 * @param {string} fieldName - Human-readable field name
 * @param {number} min - Minimum normal value
 * @param {number} max - Maximum normal value
 * @param {string} unitFieldId - ID of unit selector field (optional)
 */
function validateClinicalValue(fieldId, fieldName, min, max, unitFieldId) {
  const field = document.getElementById(fieldId);
  if (!field) {return;}

  const value = parseFloat(field.value);
  if (isNaN(value)) {return;}

  let unitFactor = 1;
  let unitText = '';

  // Handle unit conversion for display if unit field exists
  if (unitFieldId) {
    const unitField = document.getElementById(unitFieldId);
    if (unitField) {
      const unit = unitField.value;
      unitText = unit;

      // For displaying in message, standardize to mmol/L
      if (unit === 'mg/dL') {
        if (fieldName.includes('Cholesterol')) {
          unitFactor = 1 / 38.67; // Convert to mmol/L for cholesterol
        } else if (fieldName.includes('Triglycerides')) {
          unitFactor = 1 / 88.5; // Convert to mmol/L for triglycerides
        }
      }
    }
  }

  // Check for clinically significant abnormal values
  if (value * unitFactor < min * 0.7) {
    showClinicalWarning(
      `Low ${fieldName} Alert`,
      `The ${fieldName.toLowerCase()} value of ${(value * unitFactor).toFixed(1)} ${unitText || 'mmol/L'} is unusually low. Please verify this measurement.`
    );
  } else if (value * unitFactor > max * 1.3) {
    // Special handling for SBP
    if (fieldName.includes('Systolic Blood Pressure') && value >= 180) {
      showClinicalWarning(
        'High Blood Pressure Alert',
        `The systolic blood pressure of ${value} mmHg is severely elevated. This may indicate hypertensive urgency or emergency. Confirm with repeat measurement and consider immediate clinical assessment.`
      );
    } else {
    // Special handling for LDL
    else if (fieldName.includes('LDL') && value * unitFactor >= 5.0) {
      showClinicalWarning(
        'Very High LDL Alert',
        `The LDL cholesterol value of ${(value * unitFactor).toFixed(1)} ${unitText || 'mmol/L'} is severely elevated. Consider genetic testing for familial hypercholesterolemia.`
      );
    } else {
    // Special handling for triglycerides
    else if (fieldName.includes('Triglycerides') && value * unitFactor >= 10.0) {
      showClinicalWarning(
        'Very High Triglyceride Alert',
        `The triglyceride value of ${(value * unitFactor).toFixed(1)} ${unitText || 'mmol/L'} is severely elevated. This increases risk of pancreatitis. Consider urgent fibrate therapy and dietary counseling.`
      );
    } else {
    // General high value warning
    else {
      showClinicalWarning(
        `High ${fieldName} Alert`,
        `The ${fieldName.toLowerCase()} value of ${(value * unitFactor).toFixed(1)} ${unitText || 'mmol/L'} is unusually high. Please verify this measurement.`
      );
    }
  }
}

/**
 * Reset form to default values
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
    if (toggleLink) {toggleLink.textContent = 'Enter manually';}
  }

  // Reset PCSK9 details if present
  const pcsk9Details = document.getElementById('pcsk9-details');
  if (pcsk9Details) {pcsk9Details.style.display = 'none';}

  // Reset any dependent selects or fields
  const statinDoseSelect = form.querySelector('#med-statin-dose');
  if (statinDoseSelect) {
    statinDoseSelect.innerHTML = '<option value="" selected>Select dose</option>';
    statinDoseSelect.disabled = true;
  }

  const secondaryDetails = form.querySelector('#secondary-details');
  if (secondaryDetails) {secondaryDetails.disabled = true;}

  const intoleranceType = form.querySelector('#med-intolerance-type');
  if (intoleranceType) {intoleranceType.disabled = true;}

  // Clear SBP readings if present
  for (let i = 1; i <= 6; i++) {
    const reading = form.querySelector(`#${formId.split('-')[0]}-sbp-reading-${i}`);
    if (reading) {reading.value = '';}
  }

  const sbpResult = document.getElementById(`${formId.split('-')[0]}-sbp-sd-result`);
  if (sbpResult) {sbpResult.style.display = 'none';}

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
