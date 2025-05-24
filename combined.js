// Add heart age for QRISK3
      if (data.calculationType === 'QRISK3') {
        riskTableBody.push(['Heart Age', `${data.heartAge} years`]);
      }
      
      // Add risk category
      riskTableBody.push(['Risk Category', data.riskCategory.charAt(0).toUpperCase() + data.riskCategory.slice(1)]);
      
      content.push({
        table: {
          headerRows: 1,
          widths: ['50%', '50%'],
          body: riskTableBody
        },
        margin: [0, 0, 0, 15]
      });
      
      // Lp(a) info if applicable
      if (data.lpaModifier > 1.0) {
        const percentIncrease = ((data.lpaModifier - 1) * 100).toFixed(0);
        content.push({
          text: `Note: Elevated Lp(a) has increased the risk by ${percentIncrease}%. The adjusted score accounts for this additional risk factor.`,
          style: 'note',
          margin: [0, 0, 0, 15]
        });
      }
      
      // Treatment recommendations
      content.push({
        text: 'Treatment Recommendations',
        style: 'sectionHeader',
        margin: [0, 5, 0, 5]
      });
      
      // Statin recommendation
      if (data.recommendations.statinRecommended) {
        content.push({
          text: `Statin Therapy: ${data.recommendations.statinIntensity.charAt(0).toUpperCase() + data.recommendations.statinIntensity.slice(1)} intensity statin therapy is recommended.`,
          margin: [0, 3, 0, 3]
        });
        
        // Statin options
        content.push({ text: 'Recommended Statin Options:', margin: [0, 3, 0, 0] });
        
        const statinList = [];
        data.recommendations.statinOptions.forEach(option => {
          statinList.push(`• ${option.name}: ${option.dose}`);
        });
        
        content.push({
          text: statinList.join('\n'),
          margin: [10, 0, 0, 10]
        });
      } else {
        content.push({
          text: 'Statin Therapy: Not currently recommended based on risk profile.',
          margin: [0, 3, 0, 10]
        });
      }
      
      // Treatment targets
      content.push({ text: 'Treatment Targets:', margin: [0, 3, 0, 0] });
      content.push({
        text: [
          `• LDL Cholesterol: < ${data.recommendations.ldlTarget.toFixed(1)} mmol/L (${Math.round(data.recommendations.ldlTarget * 38.67)} mg/dL)\n`,
          `• Non-HDL Cholesterol: < ${data.recommendations.nonHDLTarget.toFixed(1)} mmol/L (${Math.round(data.recommendations.nonHDLTarget * 38.67)} mg/dL)`
        ],
        margin: [10, 0, 0, 10]
      });
      
      // Follow-up
      content.push({
        text: `Follow-up: ${data.recommendations.followUp}`,
        margin: [0, 3, 0, 10]
      });
      
      // Additional tests if available
      if (data.recommendations.additionalTests.length > 0) {
        content.push({ text: 'Additional Tests/Monitoring:', margin: [0, 3, 0, 0] });
        
        const testsList = [];
        data.recommendations.additionalTests.forEach(test => {
          testsList.push(`• ${test}`);
        });
        
        content.push({
          text: testsList.join('\n'),
          margin: [10, 0, 0, 10]
        });
      }
      
      // Lifestyle advice
      content.push({ text: 'Lifestyle/**
 * Calculate SBP standard deviation from multiple readings
 * @param {string} prefix - Prefix for input field IDs (frs or qrisk)
 */
export function calculateSBPStandardDeviation(prefix) {
  // Get the readings
  const readings = [];
  for (let i = 1; i <= 6; i++) {
    const readingInput = document.getElementById(`${prefix}-sbp-reading-${i}`);
    if (readingInput && readingInput.value.trim() !== '') {
      const reading = parseFloat(readingInput.value);
      if (!isNaN(reading)) {
        readings.push(reading);
      }
    }
  }

  // Check if we have enough readings
  if (readings.length < 3) {
    showModal('Please enter at least 3 systolic blood pressure readings to calculate standard deviation.');
    return;
  }

  // Calculate mean
  const sum = readings.reduce((a, b) => a + b, 0);
  const mean = sum / readings.length;

  // Calculate sum of squared differences
  const squaredDifferencesSum = readings.reduce((sum, value) => {
    return sum + Math.pow(value - mean, 2);
  }, 0);

  // Calculate standard deviation
  const standardDeviation = Math.sqrt(squaredDifferencesSum / (readings.length - 1));

  // Display result and update input field
  const resultElement = document.getElementById(`${prefix}-sbp-sd-result`);
  if (resultElement) {
    resultElement.style.display = 'block';
    resultElement.textContent = `Standard Deviation: ${standardDeviation.toFixed(1)} mmHg (from ${readings.length} readings)`;
  }

  const sdInput = document.getElementById(`${prefix}-sbp-sd`);
  if (sdInput) {
    sdInput.value = standardDeviation.toFixed(1);
  }
}

// =============================================================================
// FORM VALIDATION LOGIC
// =============================================================================

/**
 * Validates the Framingham Risk Score (FRS) form
 * @returns {Object} - { isValid: boolean, data: Object, errors: Array }
 */
export function validateFRSForm() {
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
  data.totalCholUnit = document.getElementById('frs-total-chol-unit')?.value || 'mmol/L';

  // Validate HDL cholesterol
  const hdlResult = validateNumericInput('frs-hdl', 0.5, 3, 'HDL Cholesterol');
  if (!hdlResult.isValid) {errors.push(hdlResult.message);}
  data.hdl = hdlResult.value;
  data.hdlUnit = document.getElementById('frs-hdl-unit')?.value || 'mmol/L';
  
  // Check that HDL is not greater than total cholesterol
  if (data.totalChol && data.hdl) {
    let tcInMmol = data.totalChol;
    let hdlInMmol = data.hdl;
    
    // Convert to mmol/L if needed
    if (data.totalCholUnit === 'mg/dL') {
      tcInMmol = convertCholesterol(data.totalChol, 'mg/dL', 'mmol/L');
    }
    if (data.hdlUnit === 'mg/dL') {
      hdlInMmol = convertCholesterol(data.hdl, 'mg/dL', 'mmol/L');
    }
    
    if (hdlInMmol > tcInMmol) {
      errors.push('HDL cholesterol cannot be greater than total cholesterol.');
    }
  }

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
  data.diabetes = document.getElementById('frs-diabetes')?.value === 'yes';

  // Validate Lp(a) (not required)
  const lpaResult = validateNumericInput('frs-lpa', 0, 500, 'Lp(a) Level', false);
  if (!lpaResult.isValid && lpaResult.message) {errors.push(lpaResult.message);}
  data.lpa = lpaResult.value;
  data.lpaUnit = document.getElementById('frs-lpa-unit')?.value || 'mg/dL';

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

  // Validate physiological plausibility
  if (physiologicalValidation) {
    physiologicalValidation.validatePhysiologicalForm('frs-form');
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
export function validateQRISKForm() {
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
  const heightUnit = document.getElementById('qrisk-height-unit')?.value || 'cm';
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
      try {
        data.height = convertHeightToCm(feetResult.value, inches);
      } catch (error) {
        errors.push(`Height conversion error: ${error.message}`);
      }
    }
  }

  // Validate weight
  const weightResult = validateNumericInput('qrisk-weight', 30, 200, 'Weight');
  if (!weightResult.isValid) {errors.push(weightResult.message);}
  data.weight = weightResult.value;

  // Convert weight if needed
  if (data.weight) {
    const weightUnit = document.getElementById('qrisk-weight-unit')?.value || 'kg';
    if (weightUnit === 'lb') {
      try {
        data.weight = convertWeightToKg(data.weight);
      } catch (error) {
        errors.push(`Weight conversion error: ${error.message}`);
      }
    }
  }

  // Calculate BMI if we have height and weight
  if (data.height && data.weight) {
    try {
      data.bmi = calculateBMI(data.height, data.weight);
    } catch (error) {
      errors.push(`BMI calculation error: ${error.message}`);
    }
  }

  // Validate systolic blood pressure
  const sbpResult = validateNumericInput('qrisk-sbp', 70, 210, 'Systolic Blood Pressure');
  if (!sbpResult.isValid) {errors.push(sbpResult.message);}
  data.sbp = sbpResult.value;

  // Validate systolic blood pressure standard deviation (optional)
  const sbpSDResult = validateNumericInput('qrisk-sbp-sd', 0, 30, 'SBP Standard Deviation', false);
  if (!sbpSDResult.isValid && sbpSDResult.message) {errors.push(sbpSDResult.message);}
  data.sbpSD = sbpSDResult.value;

  // Validate BP treatment
  const bpTreatmentResult = validateSelectInput('qrisk-bp-treatment', 'blood pressure treatment status');
  if (!bpTreatmentResult.isValid) {errors.push(bpTreatmentResult.message);}
  data.onBloodPressureTreatment = bpTreatmentResult.value === 'yes';

  // Validate total cholesterol and HDL
  const totalCholResult = validateNumericInput('qrisk-total-chol', 1, 15, 'Total Cholesterol');
  if (!totalCholResult.isValid) {errors.push(totalCholResult.message);}
  data.totalChol = totalCholResult.value;
  data.totalCholUnit = document.getElementById('qrisk-total-chol-unit')?.value || 'mmol/L';

  const hdlResult = validateNumericInput('qrisk-hdl', 0.5, 3, 'HDL Cholesterol');
  if (!hdlResult.isValid) {errors.push(hdlResult.message);}
  data.hdl = hdlResult.value;
  data.hdlUnit = document.getElementById('qrisk-hdl-unit')?.value || 'mmol/L';
  
  // Check that HDL is not greater than total cholesterol
  if (data.totalChol && data.hdl) {
    let tcInMmol = data.totalChol;
    let hdlInMmol = data.hdl;
    
    // Convert to mmol/L if needed
    if (data.totalCholUnit === 'mg/dL') {
      tcInMmol = convertCholesterol(data.totalChol, 'mg/dL', 'mmol/L');
    }
    if (data.hdlUnit === 'mg/dL') {
      hdlInMmol = convertCholesterol(data.hdl, 'mg/dL', 'mmol/L');
    }
    
    if (hdlInMmol > tcInMmol) {
      errors.push('HDL cholesterol cannot be greater than total cholesterol.');
    }
  }

  // Additional QRISK3 inputs - all optional with validation
  
  // Diabetes status
  data.type1Diabetes = document.getElementById('qrisk-type1-diabetes')?.value === 'yes';
  data.type2Diabetes = document.getElementById('qrisk-type2-diabetes')?.value === 'yes';
  
  // Check if both type 1 and type 2 diabetes are marked as 'yes'
  if (data.type1Diabetes && data.type2Diabetes) {
    errors.push('Patient cannot have both Type 1 and Type 2 diabetes simultaneously.');
  }

  // Validate smoking status
  const smokingStatusResult = validateSelectInput('qrisk-smoking-status', 'smoking status');
  if (!smokingStatusResult.isValid) {errors.push(smokingStatusResult.message);}
  data.smokingStatus = smokingStatusResult.value;

  // Family history of coronary heart disease
  data.familyHistory = document.getElementById('qrisk-family-history')?.value === 'yes';

  // Chronic kidney disease
  data.ckd = document.getElementById('qrisk-ckd')?.value === 'yes';

  // Atrial fibrillation
  data.atrialFibrillation = document.getElementById('qrisk-atrial-fibrillation')?.value === 'yes';

  // Migraine
  data.migraine = document.getElementById('qrisk-migraine')?.value === 'yes';

  // Rheumatoid arthritis
  data.rheumatoidArthritis = document.getElementById('qrisk-rheumatoid-arthritis')?.value === 'yes';

  // Systemic lupus erythematosus
  data.sle = document.getElementById('qrisk-sle')?.value === 'yes';

  // Severe mental illness
  data.mentalIllness = document.getElementById('qrisk-mental-illness')?.value === 'yes';

  // On atypical antipsychotic medication
  data.atypicalAntipsychotics = document.getElementById('qrisk-atypical-antipsychotics')?.value === 'yes';

  // Taking corticosteroids
  data.corticosteroids = document.getElementById('qrisk-corticosteroids')?.value === 'yes';

  // Erectile dysfunction (only for males)
  if (data.sex === 'male') {
    data.erectileDysfunction = document.getElementById('qrisk-erectile-dysfunction')?.value === 'yes';
  }

  // Validate Lp(a) (not required)
  const lpaResult = validateNumericInput('qrisk-lpa', 0, 500, 'Lp(a) Level', false);
  if (!lpaResult.isValid && lpaResult.message) {errors.push(lpaResult.message);}
  data.lpa = lpaResult.value;
  if (data.lpa) {
    data.lpaUnit = document.getElementById('qrisk-lpa-unit')?.value || 'mg/dL';
  }

  // Validate physiological plausibility
  if (physiologicalValidation) {
    physiologicalValidation.validatePhysiologicalForm('qrisk-form');
  }

  return {
    isValid: errors.length === 0,
    data: data,
    errors: errors
  };
}

// =============================================================================
// UI INITIALIZATION AND EVENT HANDLERS
// =============================================================================

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
  // Unit conversion toggles
  setupUnitConversionHandlers();
  
  // Form submission handlers
  const frsForm = document.getElementById('frs-form');
  const qriskForm = document.getElementById('qrisk-form');
  
  if (frsForm) {
    frsForm.addEventListener('submit', handleFRSFormSubmit);
  }
  
  if (qriskForm) {
    qriskForm.addEventListener('submit', handleQRISKFormSubmit);
  }
  
  // Tab switching
  setupTabHandlers();
  
  // Non-HDL calculation
  setupNonHDLCalculation();
  
  // SBP standard deviation calculator
  setupSBPStandardDeviationCalculator();
  
  // Reset buttons
  document.querySelectorAll('.reset-form-button').forEach(button => {
    button.addEventListener('click', (event) => {
      const formId = event.target.getAttribute('data-form-id');
      if (formId) {
        resetForm(formId);
      }
    });
  });
  
  // Export buttons
  document.querySelectorAll('.export-pdf-button').forEach(button => {
    button.addEventListener('click', exportResultsAsPDF);
  });
  
  // Save/load calculations
  const saveButton = document.getElementById('save-calculation-button');
  if (saveButton) {
    saveButton.addEventListener('click', saveCurrentCalculation);
  }
  
  const loadButton = document.getElementById('load-calculation-button');
  if (loadButton) {
    loadButton.addEventListener('click', loadSavedCalculation);
  }
}

/**
 * Initialize modal close buttons
 */
function initializeModals() {
  // Get all close buttons and modal backgrounds
  document.querySelectorAll('.close-modal, .modal-background').forEach(element => {
    element.addEventListener('click', (event) => {
      // Close the parent modal
      const modal = event.target.closest('.modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
  });
  
  // Prevent closing when clicking inside modal content
  document.querySelectorAll('.modal-content').forEach(content => {
    content.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  });
  
  // Close modals when ESC key is pressed
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
    }
  });
}

/**
 * Set up unit conversion event handlers
 */
function setupUnitConversionHandlers() {
  // Height unit toggle
  const heightUnitSelects = document.querySelectorAll('.height-unit-select');
  heightUnitSelects.forEach(select => {
    select.addEventListener('change', (event) => {
      const unit = event.target.value;
      const formId = event.target.getAttribute('data-form-id');
      if (unit && formId) {
        toggleHeightUnit(unit, formId);
      }
    });
  });
  
  // Weight unit toggle
  const weightUnitSelects = document.querySelectorAll('.weight-unit-select');
  weightUnitSelects.forEach(select => {
    select.addEventListener('change', (event) => {
      const unit = event.target.value;
      const formId = event.target.getAttribute('data-form-id');
      if (unit && formId) {
        toggleWeightUnit(unit, formId);
      }
    });
  });
  
  // Cholesterol unit toggles
  const cholUnitSelects = document.querySelectorAll('.cholesterol-unit-select');
  cholUnitSelects.forEach(select => {
    select.addEventListener('change', (event) => {
      const unit = event.target.value;
      const fieldId = event.target.getAttribute('data-field-id');
      if (unit && fieldId) {
        convertCholesterolField(fieldId, unit);
      }
    });
  });
  
  // Lp(a) unit toggles
  const lpaUnitSelects = document.querySelectorAll('.lpa-unit-select');
  lpaUnitSelects.forEach(select => {
    select.addEventListener('change', (event) => {
      const unit = event.target.value;
      const fieldId = event.target.getAttribute('data-field-id');
      if (unit && fieldId) {
        convertLpaField(fieldId, unit);
      }
    });
  });
}

/**
 * Handle height unit toggle
 * @param {string} unit - New height unit ('cm' or 'ft/in')
 * @param {string} formId - The form ID
 */
function toggleHeightUnit(unit, formId) {
  const cmField = document.getElementById(`${formId}-height`);
  const feetField = document.getElementById(`${formId}-height-feet`);
  const inchesField = document.getElementById(`${formId}-height-inches`);
  const cmContainer = document.getElementById(`${formId}-height-cm-container`);
  const imperialContainer = document.getElementById(`${formId}-height-imperial-container`);
  
  if (!cmField || !feetField || !inchesField || !cmContainer || !imperialContainer) {
    console.error('Missing height fields for unit toggle');
    return;
  }
  
  if (unit === 'cm') {
    // Show cm field, hide feet/inches
    cmContainer.style.display = 'flex';
    imperialContainer.style.display = 'none';
    
    // Convert feet/inches to cm if values exist
    if (feetField.value && inchesField.value) {
      try {
        const feet = parseFloat(feetField.value) || 0;
        const inches = parseFloat(inchesField.value) || 0;
        cmField.value = convertHeightToCm(feet, inches).toFixed(1);
      } catch (error) {
        console.error('Error converting height:', error);
      }
    }
  } else {
    // Show feet/inches fields, hide cm
    cmContainer.style.display = 'none';
    imperialContainer.style.display = 'flex';
    
    // Convert cm to feet/inches if value exists
    if (cmField.value) {
      try {
        const { feet, inches } = convertHeightToFeetInches(parseFloat(cmField.value));
        feetField.value = feet;
        inchesField.value = inches;
      } catch (error) {
        console.error('Error converting height:', error);
      }
    }
  }
}

/**
 * Handle weight unit toggle
 * @param {string} unit - New weight unit ('kg' or 'lb')
 * @param {string} formId - The form ID
 */
function toggleWeightUnit(unit, formId) {
  const weightField = document.getElementById(`${formId}-weight`);
  if (!weightField) {
    console.error(`Weight field ${formId}-weight not found`);
    return;
  }
  
  const value = parseFloat(weightField.value);
  
  if (!value) {return;} // No value to convert
  
  try {
    if (unit === 'kg') {
      // Convert from pounds to kg
      weightField.value = convertWeightToKg(value).toFixed(1);
    } else {
      // Convert from kg to pounds
      weightField.value = convertWeightToPounds(value).toFixed(0);
    }
  } catch (error) {
    console.error('Error converting weight:', error);
  }
}

/**
 * Convert cholesterol field between mg/dL and mmol/L
 * @param {string} fieldId - Field ID to convert
 * @param {string} unit - New unit ('mg/dL' or 'mmol/L')
 */
function convertCholesterolField(fieldId, unit) {
  const field = document.getElementById(fieldId);
  if (!field || !field.value) {return;} // No field or value to convert
  
  const value = parseFloat(field.value);
  const previousUnit = unit === 'mg/dL' ? 'mmol/L' : 'mg/dL';
  
  try {
    field.value = convertCholesterol(value, previousUnit, unit).toFixed(unit === 'mmol/L' ? 2 : 0);
  } catch (error) {
    console.error('Error converting cholesterol:', error);
    showModal(`Error converting cholesterol value: ${error.message}`);
  }
}

/**
 * Convert Lp(a) field between mg/dL and nmol/L
 * @param {string} fieldId - Field ID to convert
 * @param {string} unit - New unit ('mg/dL' or 'nmol/L')
 */
function convertLpaField(fieldId, unit) {
  const field = document.getElementById(fieldId);
  if (!field || !field.value) {return;} // No field or value to convert
  
  const value = parseFloat(field.value);
  const previousUnit = unit === 'mg/dL' ? 'nmol/L' : 'mg/dL';
  
  try {
    field.value = convertLpa(value, previousUnit, unit).toFixed(0);
  } catch (error) {
    console.error('Error converting Lp(a):', error);
    showModal(`Error converting Lp(a) value: ${error.message}`);
  }
}

/**
 * Set up non-HDL calculation
 */
function setupNonHDLCalculation() {
  // Monitor total cholesterol and HDL input changes
  const totalCholInput = document.getElementById('med-total-chol');
  const hdlInput = document.getElementById('med-hdl');
  
  if (totalCholInput && hdlInput) {
    totalCholInput.addEventListener('input', calculateNonHDL);
    hdlInput.addEventListener('input', calculateNonHDL);
    
    // Total cholesterol unit change
    const totalCholUnit = document.getElementById('med-total-chol-unit');
    if (totalCholUnit) {
      totalCholUnit.addEventListener('change', calculateNonHDL);
    }
    
    // HDL unit change
    const hdlUnit = document.getElementById('med-hdl-unit');
    if (hdlUnit) {
      hdlUnit.addEventListener('change', calculateNonHDL);
    }
    
    // Calculate on page load if values exist
    if (totalCholInput.value && hdlInput.value) {
      calculateNonHDL();
    }
  }
}

/**
 * Set up SBP standard deviation calculator
 */
function setupSBPStandardDeviationCalculator() {
  // FRS form
  const frsCalculateButton = document.getElementById('frs-sbp-sd-calculate');
  if (frsCalculateButton) {
    frsCalculateButton.addEventListener('click', () => calculateSBPStandardDeviation('frs'));
  }
  
  // QRISK form
  const qriskCalculateButton = document.getElementById('qrisk-sbp-sd-calculate');
  if (qriskCalculateButton) {
    qriskCalculateButton.addEventListener('click', () => calculateSBPStandardDeviation('qrisk'));
  }
}

/**
 * Set up tab handling
 */
function setupTabHandlers() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (event) => {
      // Get the target content ID
      const targetId = event.currentTarget.getAttribute('data-target');
      if (!targetId) return;
      
      // Get the target content element
      const targetContent = document.getElementById(targetId);
      if (!targetContent) return;
      
      // Deactivate all tabs in this container
      const tabContainer = event.currentTarget.closest('.tabs');
      tabContainer.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      
      // Activate clicked tab
      event.currentTarget.classList.add('active');
      event.currentTarget.setAttribute('aria-selected', 'true');
      
      // Hide all tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.setAttribute('aria-hidden', 'true');
      });
      
      // Show target content
      targetContent.classList.add('active');
      targetContent.setAttribute('aria-hidden', 'false');
      
      // Store active tab in session
      try {
        sessionStorage.setItem('activeTab', targetId);
      } catch (error) {
        console.warn('Could not save active tab to session storage:', error);
      }
    });
  });
  
  // Initialize active tab from URL or session storage
  initializeActiveTab();
}

/**
 * Initialize active tab from URL or session storage
 */
function initializeActiveTab() {
  // Check for tab parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  
  if (tabParam) {
    // Activate tab from URL parameter
    const tab = document.querySelector(`.tab[data-target="${tabParam}"]`);
    if (tab) {
      // Trigger click event
      tab.click();
      return;
    }
  }
  
  // Check session storage
  try {
    const activeTab = sessionStorage.getItem('activeTab');
    if (activeTab) {
      const tab = document.querySelector(`.tab[data-target="${activeTab}"]`);
      if (tab) {
        // Trigger click event
        tab.click();
        return;
      }
    }
  } catch (error) {
    console.warn('Could not retrieve active tab from session storage:', error);
  }
  
  // Default: activate first tab
  const firstTab = document.querySelector('.tab');
  if (firstTab) {
    firstTab.click();
  }
}

/**
 * Set default units based on browser locale
 */
function setupDefaultUnits() {
  // Get user's locale
  const locale = navigator.language || navigator.userLanguage || 'en-US';
  
  // Default units for US
  const isUS = locale.includes('US') || locale.includes('us');
  
  // Set default cholesterol units
  document.querySelectorAll('.cholesterol-unit-select').forEach(select => {
    select.value = isUS ? 'mg/dL' : 'mmol/L';
    
    // Trigger the change event to update related fields
    try {
      const event = new Event('change');
      select.dispatchEvent(event);
    } catch (error) {
      console.error('Error dispatching change event:', error);
    }
  });
  
  // Set default height units
  document.querySelectorAll('.height-unit-select').forEach(select => {
    select.value = isUS ? 'ft/in' : 'cm';
    
    // Trigger the change event to show/hide fields
    try {
      const event = new Event('change');
      select.dispatchEvent(event);
    } catch (error) {
      console.error('Error dispatching change event:', error);
    }
  });
  
  // Set default weight units
  document.querySelectorAll('.weight-unit-select').forEach(select => {
    select.value = isUS ? 'lb' : 'kg';
  });
}

/**
 * Show the medical disclaimer on first visit
 */
async function showDisclaimerIfFirstVisit() {
  try {
    const hasShownDisclaimer = await secureStorage.getItem('hasShownDisclaimer');
    
    if (!hasShownDisclaimer) {
      // Show the disclaimer modal
      const disclaimerModal = document.getElementById('disclaimer-modal');
      if (disclaimerModal) {
        disclaimerModal.style.display = 'block';
        
        // Add event listener to accept button
        const acceptButton = document.getElementById('accept-disclaimer-button');
        if (acceptButton) {
          acceptButton.addEventListener('click', async () => {
            await secureStorage.setItem('hasShownDisclaimer', true);
            disclaimerModal.style.display = 'none';
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking disclaimer status:', error);
  }
}

/**
 * Validates and handles FRS form submission
 * @param {Event} event - Form submission event
 */
async function handleFRSFormSubmit(event) {
  event.preventDefault();
  
  // Show loading indicator
  loadingIndicator.show('Calculating Framingham Risk Score...');
  
  // Small delay to allow UI to update
  setTimeout(async () => {
    try {
      // Validate form
      const validationResult = validateFRSForm();
      
      if (!validationResult.isValid) {
        displayErrors(validationResult.errors);
        loadingIndicator.hide();
        return;
      }
      
      // Store data for visualizations
      window.lastFRSFormData = validationResult.data;
      
      // Calculate FRS risk score
      const riskResult = calculateFraminghamRiskScore(validationResult.data);
      
      // Get treatment recommendations
      const recommendations = calculateTreatmentRecommendations({
        ...validationResult.data,
        ...riskResult
      });
      
      // Display results
      displayFRSResults(riskResult, recommendations);
      
      // Scroll to results
      const resultsEl = document.getElementById('frs-results');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      console.error('Error calculating FRS:', error);
      showModal('An error occurred during calculation: ' + error.message);
    } finally {
      // Hide loading indicator
      loadingIndicator.hide();
    }
  }, 100);
}

/**
 * Display FRS results
 * @param {Object} results - Risk calculation results
 * @param {Object} recommendations - Treatment recommendations
 */
function displayFRSResults(results, recommendations) {
  const resultsElement = document.getElementById('frs-results');
  if (!resultsElement) return;
  
  // Make sure results are visible
  resultsElement.style.display = 'block';
  
  // Format risk scores
  const riskPercentage = parseFloat(results.risk).toFixed(1);
  const adjustedRiskPercentage = parseFloat(results.adjustedRisk).toFixed(1);
  const relativeRisk = parseFloat(results.relativeRisk).toFixed(1);
  
  // Set risk score elements
  const riskScoreEl = document.getElementById('frs-risk-score');
  const adjustedRiskScoreEl = document.getElementById('frs-adjusted-risk-score');
  const relativeRiskEl = document.getElementById('frs-relative-risk');
  
  if (riskScoreEl) riskScoreEl.textContent = riskPercentage + '%';
  if (adjustedRiskScoreEl) adjustedRiskScoreEl.textContent = adjustedRiskPercentage + '%';
  if (relativeRiskEl) relativeRiskEl.textContent = relativeRisk + 'x';
  
  // Set risk category and styling
  const riskCategoryElement = document.getElementById('frs-risk-category');
  if (riskCategoryElement) {
    const category = results.category;
    riskCategoryElement.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    
    // Reset classes
    riskCategoryElement.classList.remove('risk-low', 'risk-moderate', 'risk-high');
    riskCategoryElement.classList.add('risk-' + category);
  }
  
  // Show the appropriate heart risk image
  const heartRiskLow = document.getElementById('heart-risk-low');
  const heartRiskModerate = document.getElementById('heart-risk-moderate');
  const heartRiskHigh = document.getElementById('heart-risk-high');
  
  if (heartRiskLow && heartRiskModerate && heartRiskHigh) {
    heartRiskLow.style.display = results.category === 'low' ? 'inline-block' : 'none';
    heartRiskModerate.style.display = results.category === 'moderate' ? 'inline-block' : 'none';
    heartRiskHigh.style.display = results.category === 'high' ? 'inline-block' : 'none';
  }
  
  // Display Lp(a) information if applicable
  const lpaInfoElement = document.getElementById('frs-lpa-info');
  if (lpaInfoElement) {
    if (results.lpaModifier > 1.0) {
      const percentIncrease = ((results.lpaModifier - 1) * 100).toFixed(0);
      lpaInfoElement.innerHTML = inputSanitizer.sanitizeHTML(`
        <div class="alert alert-info">
          <strong>Lp(a) Modified Score:</strong> Elevated Lp(a) has increased the risk by ${percentIncrease}%. 
          The adjusted score accounts for this additional risk factor.
        </div>
      `);
      lpaInfoElement.style.display = 'block';
    } else {
      lpaInfoElement.style.display = 'none';
    }
  }
  
  // Display treatment recommendations
  displayTreatmentRecommendations(recommendations, 'frs');
  
  // Create or update visualizations if available
  if (window.riskVisualization) {
    window.riskVisualization.createFRSCharts(results);
  }
  
  // Update data for PDF export
  window.pdfExportData = {
    calculationType: 'Framingham Risk Score',
    riskPercentage: riskPercentage,
    adjustedRiskPercentage: adjustedRiskPercentage,
    relativeRisk: relativeRisk,
    riskCategory: results.category,
    lpaModifier: results.lpaModifier,
    recommendations: recommendations
  };
}

/**
 * Validates and handles QRISK3 form submission
 * @param {Event} event - Form submission event
 */
async function handleQRISKFormSubmit(event) {
  event.preventDefault();
  
  // Show loading indicator
  loadingIndicator.show('Calculating QRISK3 Score...');
  
  // Small delay to allow UI to update
  setTimeout(async () => {
    try {
      // Validate form
      const validationResult = validateQRISKForm();
      
      if (!validationResult.isValid) {
        displayErrors(validationResult.errors);
        loadingIndicator.hide();
        return;
      }
      
      // Store data for visualizations
      window.lastQRISKFormData = validationResult.data;
      
      // Update loading progress
      loadingIndicator.setProgress(30, 'Running algorithm...');
      
      // Calculate QRISK3 score
      const riskResult = await calculateQRISK3(validationResult.data);
      
      // Update loading progress
      loadingIndicator.setProgress(70, 'Generating recommendations...');
      
      // Get treatment recommendations
      const recommendations = calculateTreatmentRecommendations({
        ...validationResult.data,
        ...riskResult
      });
      
      // Update loading progress
      loadingIndicator.setProgress(90, 'Finishing...');
      
      // Display results
      displayQRISKResults(riskResult, recommendations);
      
      // Scroll to results
      const resultsEl = document.getElementById('qrisk-results');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      console.error('Error calculating QRISK3:', error);
      showModal('An error occurred during calculation: ' + error.message);
    } finally {
      // Hide loading indicator
      loadingIndicator.hide();
    }
  }, 100);
}

/**
 * Display treatment recommendations
 * @param {Object} recommendations - Treatment recommendations
 * @param {string} prefix - Prefix for element IDs (frs or qrisk)
 */
function displayTreatmentRecommendations(recommendations, prefix) {
  // Treatment summary
  const treatmentSummaryElement = document.getElementById(`${prefix}-treatment-summary`);
  if (treatmentSummaryElement) {
    let summaryHTML = '';
    
    // Statin recommendation
    if (recommendations.statinRecommended) {
      summaryHTML += `<p><strong>Statin Therapy:</strong> ${recommendations.statinIntensity.charAt(0).toUpperCase() + recommendations.statinIntensity.slice(1)} intensity statin therapy is recommended.</p>`;
    } else {
      summaryHTML += '<p><strong>Statin Therapy:</strong> Not currently recommended based on risk profile.</p>';
    }
    
    // LDL and non-HDL targets
    summaryHTML += `
      <p><strong>Treatment Targets:</strong></p>
      <ul>
        <li>LDL Cholesterol: &lt; ${recommendations.ldlTarget.toFixed(1)} mmol/L (${Math.round(recommendations.ldlTarget * 38.67)} mg/dL)</li>
        <li>Non-HDL Cholesterol: &lt; ${recommendations.nonHDLTarget.toFixed(1)} mmol/L (${Math.round(recommendations.nonHDLTarget * 38.67)} mg/dL)</li>
      </ul>
    `;
    
    // Follow-up recommendation
    summaryHTML += `<p><strong>Follow-up:</strong> ${recommendations.followUp}</p>`;
    
    treatmentSummaryElement.innerHTML = inputSanitizer.sanitizeHTML(summaryHTML);
  }
  
  // Statin options
  const statinOptionsElement = document.getElementById(`${prefix}-statin-options`);
  if (statinOptionsElement) {
    if (recommendations.statinRecommended) {
      let optionsHTML = '<ul>';
      recommendations.statinOptions.forEach(option => {
        optionsHTML += `<li><strong>${inputSanitizer.sanitizeString(option.name)}:</strong> ${inputSanitizer.sanitizeString(option.dose)}</li>`;
      });
      optionsHTML += '</ul>';
      statinOptionsElement.innerHTML = optionsHTML;
      statinOptionsElement.style.display = 'block';
    } else {
      statinOptionsElement.style.display = 'none';
    }
  }
  
  // Additional tests
  const additionalTestsElement = document.getElementById(`${prefix}-additional-tests`);
  if (additionalTestsElement) {
    if (recommendations.additionalTests.length > 0) {
      let testsHTML = '<ul>';
      recommendations.additionalTests.forEach(test => {
        testsHTML += `<li>${inputSanitizer.sanitizeString(test)}</li>`;
      });
      testsHTML += '</ul>';
      additionalTestsElement.innerHTML = testsHTML;
      additionalTestsElement.style.display = 'block';
    } else {
      additionalTestsElement.style.display = 'none';
    }
  }
  
  // Lifestyle advice
  const lifestyleAdviceElement = document.getElementById(`${prefix}-lifestyle-advice`);
  if (lifestyleAdviceElement) {
    let adviceHTML = '<ul>';
    recommendations.lifestyleAdvice.forEach(advice => {
      adviceHTML += `<li>${inputSanitizer.sanitizeString(advice)}</li>`;
    });
    adviceHTML += '</ul>';
    lifestyleAdviceElement.innerHTML = adviceHTML;
  }
}

/**
 * Reset form to default values
 * @param {string} formId - Form ID to reset
 */
function resetForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  
  // Reset the form inputs
  form.reset();
  
  // Hide any displayed errors
  form.querySelectorAll('.error-message').forEach(el => {
    el.style.display = 'none';
  });
  
  // Remove error styling from inputs
  form.querySelectorAll('.error').forEach(el => {
    el.classList.remove('error');
  });
  
  // Hide results section
  const resultsId = formId.replace('-form', '-results');
  const resultsElement = document.getElementById(resultsId);
  if (resultsElement) {
    resultsElement.style.display = 'none';
  }
  
  // Reset physiological validation warnings
  if (physiologicalValidation) {
    // Clear individual field warnings
    form.querySelectorAll('input[type="number"]').forEach(input => {
      physiologicalValidation.clearPhysiologicalWarning(input.id);
    });
    
    // Hide combination warnings if present
    const warningsContainer = document.getElementById(`${formId}-combination-warnings`);
    if (warningsContainer) {
      warningsContainer.style.display = 'none';
    }
    
    // Clear all warnings (this will remove DOM elements)
    physiologicalValidation.clearAllWarnings();
  }
}

/**
 * Export current results as PDF
 */
async function exportResultsAsPDF() {
  // Check if we have data to export
  if (!window.pdfExportData) {
    showModal('No calculation results available to export.');
    return;
  }
  
  // Check if pdfMake is available
  if (typeof pdfMake === 'undefined') {
    showModal('PDF export functionality is not available. Please ensure pdfmake.js is loaded.');
    return;
  }
  
  // Show loading indicator
  loadingIndicator.show('Generating PDF...');
  
  // Small delay to let the UI update
  setTimeout(() => {
    try {
      // Get the data
      const data = window.pdfExportData;
      
      // Create PDF content
      const content = [];
      
      // Title
      content.push({
        text: 'Cardiovascular Disease Risk Assessment',
        style: 'header',
        margin: [0, 0, 0, 10]
      });
      
      // Calculation type
      content.push({
        text: `Risk Assessment Method: ${data.calculationType}`,
        style: 'subheader',
        margin: [0, 5, 0, 15]
      });
      
      // Results summary
      content.push({
        text: 'Risk Assessment Results',
        style: 'sectionHeader',
        margin: [0, 10, 0, 5]
      });
      
      // Risk table
      const riskTableBody = [
        [{ text: 'Measure', style: 'tableHeader' }, { text: 'Result', style: 'tableHeader' }],
        ['10-year CVD Risk', `${data.riskPercentage}%`],
        ['Adjusted Risk (with Lp(a))', `${data.adjustedRiskPercentage}%`],
        ['Relative Risk', `${data.relativeRisk}x`]
      ];
      
      // Add heart age for QRISK3
      if (data.calculationType === 'QRISK3') {
        riskTableBody.push(['Heart Age', `${data.heartAge} years`]);
      }
      
      // Add risk category
      riskTableBody.push(['Risk Category', data.riskCategory.charAt(0).toUpperCase() + data.riskCategory.slice(1)]);
      
      content.push({
        table: {
          headerRows: 1,
          widths: ['50%', '50%'],
          body: riskTableBody
        },
        margin: [0, 0, 0, 15]
      });/**
 * CVD Risk Toolkit with Lp(a) Post-Test Modifier
 * Enhanced Combined JavaScript File - ESM Version
 * 
 * Version: 1.3.2
 * Last Updated: 2025-05-04
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
 */

// =============================================================================
// MODULE IMPORTS AND DEPENDENCIES
// =============================================================================

// Import dependencies - these would be managed by a build system in production
let Chart; // Will be loaded dynamically if needed
let QRISK3; // Will be loaded dynamically if needed
let pdfMake; // Will be loaded dynamically if needed

// Constants for unit conversions
const CONVERSION = {
  CHOL_MMOL_TO_MGDL: 38.67,
  TG_MMOL_TO_MGDL: 88.5,
  LPA_NMOL_TO_MGDL: 0.4,
  LPA_MGDL_TO_NMOL: 2.5
};

// App assets to be cached by service worker
const APP_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/combined.js',
  '/js/qrisk3-algorithm.js',
  '/js/qrisk3-implementation.js',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/icons/heart-risk-low.svg',
  '/icons/heart-risk-moderate.svg',
  '/icons/heart-risk-high.svg'
];

/**
 * Check dependency availability and load if needed
 * @returns {Promise<boolean>} - Whether all dependencies are available
 */
export async function checkDependencies() {
  // Track any failed dependencies
  const failures = [];
  
  // Check each dependency and attempt to load if missing
  try {
    // Check QRISK3
    if (!QRISK3 && !window.QRISK3) {
      if (!await loadQRISK3(2)) { // Try loading with 2 retries
        failures.push('QRISK3');
      }
    }
    
    // Check Chart.js
    if (!Chart && !window.Chart) {
      if (!await loadChartJS(2)) { // Try loading with 2 retries
        failures.push('Chart.js');
      }
    }
    
    // Check pdfMake
    if (!window.pdfMake) {
      if (!await loadPDFMake(2)) { // Try loading with 2 retries
        failures.push('pdfMake');
      }
    }
    
    // If any dependencies failed to load, show a message
    if (failures.length > 0) {
      const missingDeps = failures.join(', ');
      console.warn(`Some dependencies could not be loaded: ${missingDeps}`);
      showModal(`Some components failed to load (${missingDeps}). Some features may be limited.`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking dependencies:', error);
    return false;
  }
}

/**
 * Load QRISK3 algorithm dynamically with retry capability
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<boolean>} - Whether loaded successfully
 */
export async function loadQRISK3(retries = 2) {
  if (window.QRISK3) {
    QRISK3 = window.QRISK3;
    return true;
  }
  
  try {
    const script = document.createElement('script');
    script.src = './js/qrisk3-algorithm.js';
    script.async = true;
    script.onerror = (e) => console.error('Failed to load QRISK3:', e);
    
    const loadPromise = new Promise((resolve, reject) => {
      script.onload = () => {
        if (window.QRISK3) {
          QRISK3 = window.QRISK3;
          resolve(true);
        } else {
          reject(new Error('QRISK3 loaded but not available in window context'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load QRISK3 algorithm'));
    });
    
    document.head.appendChild(script);
    return await loadPromise;
  } catch (error) {
    console.error('Error loading QRISK3:', error);
    
    // Retry loading if attempts remain
    if (retries > 0) {
      console.log(`Retrying QRISK3 load, ${retries} attempts remaining`);
      return await loadQRISK3(retries - 1);
    }
    
    return false;
  }
}

/**
 * Load Chart.js dynamically with retry capability
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<boolean>} - Whether loaded successfully
 */
export async function loadChartJS(retries = 2) {
  if (window.Chart) {
    Chart = window.Chart;
    return true;
  }
  
  try {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
    script.integrity = 'sha384-NeNyJFH+Otf7mrUZeRCeHH1Sv9QrAbvWrIGZF8FeTRI+LTqQTh6dq5TVOArAj1fS';
    script.crossOrigin = 'anonymous';
    script.async = true;
    
    const loadPromise = new Promise((resolve, reject) => {
      script.onload = () => {
        if (window.Chart) {
          Chart = window.Chart;
          
          // Set global defaults for all charts
          Chart.defaults.font.family = "var(--font-sans)";
          Chart.defaults.color = "var(--text-color)";
          Chart.defaults.backgroundColor = "var(--background-color)";
          
          resolve(true);
        } else {
          reject(new Error('Chart.js loaded but not available in window context'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Chart.js'));
    });
    
    document.head.appendChild(script);
    return await loadPromise;
  } catch (error) {
    console.error('Error loading Chart.js:', error);
    
    // Retry loading if attempts remain
    if (retries > 0) {
      console.log(`Retrying Chart.js load, ${retries} attempts remaining`);
      return await loadChartJS(retries - 1);
    }
    
    return false;
  }
}

/**
 * Load pdfMake dynamically with retry capability
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<boolean>} - Whether loaded successfully
 */
export async function loadPDFMake(retries = 2) {
  if (window.pdfMake) {
    return true;
  }
  
  try {
    // Check if already loaded
    if (document.querySelector('script[src*="pdfmake"]')) {
      if (window.pdfMake) {
        return true;
      } else {
        // Script tag exists but library not loaded - may be loading
        await new Promise(resolve => setTimeout(resolve, 500));
        if (window.pdfMake) {
          return true;
        }
      }
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
    script.integrity = 'sha512-a9NgEEK7tsCvABL7KqtUTQjl69z7091EVPpw5KxPlZ93T141ffe1woLtbXTX+r2/8TtTvRX/v4zTL2UlMUPgwg==';
    script.crossOrigin = 'anonymous';
    script.async = true;
    
    // Load fonts
    const fontScript = document.createElement('script');
    fontScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js';
    fontScript.integrity = 'sha512-P0bOMePRS378NwmPDVPU456LNKK0ndTM6LCqm0q1i7oKYgH2WigS2Wv+ZJ+5YYsj1r+QIXrJ1mua4cHQcAxwZg==';
    fontScript.crossOrigin = 'anonymous';
    fontScript.async = true;
    
    const loadPromise = new Promise((resolve, reject) => {
      script.onload = () => {
        // Load fonts after main script
        document.head.appendChild(fontScript);
        
        fontScript.onload = () => {
          if (window.pdfMake) {
            resolve(true);
          } else {
            reject(new Error('pdfMake loaded but not available in window context'));
          }
        };
        
        fontScript.onerror = () => reject(new Error('Failed to load pdfMake fonts'));
      };
      script.onerror = () => reject(new Error('Failed to load pdfMake'));
    });
    
    document.head.appendChild(script);
    return await loadPromise;
  } catch (error) {
    console.error('Error loading pdfMake:', error);
    
    // Retry loading if attempts remain
    if (retries > 0) {
      console.log(`Retrying pdfMake load, ${retries} attempts remaining`);
      return await loadPDFMake(retries - 1);
    }
    
    return false;
  }
}

// =============================================================================
// CORE UTILITY FUNCTIONS
// =============================================================================

/**
 * Safely access nested properties without errors
 * @param {Object} obj - Object to access
 * @param {string} path - Dot-separated path to property
 * @param {*} defaultValue - Default value if property doesn't exist
 * @returns {*} - Property value or default value
 */
export function safeGet(obj, path, defaultValue = null) {
  try {
    if (obj === null || obj === undefined) {
      return defaultValue;
    }
    
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
    console.error(`Error accessing property path ${path}:`, e);
    return defaultValue;
  }
}

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 100) {
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function as first argument');
  }
  
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * Throttle function for performance optimization
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit time in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit = 100) {
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function as first argument');
  }
  
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoization for expensive calculations
 * @param {Function} fn - Function to memoize
 * @returns {Function} - Memoized function
 */
export const memoize = (fn) => {
  if (typeof fn !== 'function') {
    throw new TypeError('Expected a function as argument');
  }
  
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Error boundary wrapper for critical functions
 * @param {Function} fn - Function to wrap
 * @param {*} fallback - Fallback value on error
 * @returns {Function} - Wrapped function
 */
export function withErrorBoundary(fn, fallback = null) {
  if (typeof fn !== 'function') {
    throw new TypeError('Expected a function as first argument');
  }
  
  return function(...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      console.error(`Error in function ${fn.name || 'anonymous'}:`, error);
      if (window.enhancedDisplay && typeof window.enhancedDisplay.showError === 'function') {
        window.enhancedDisplay.showError('An error occurred. Please try again.');
      } else {
        showModal('An error occurred. Please try again.');
      }
      return fallback;
    }
  };
}

/**
 * Deep clone an object without reference
 * @param {*} obj - Object to clone
 * @returns {*} - Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error('Error deep cloning object:', e);
    
    // Fallback method if JSON serialization fails
    if (Array.isArray(obj)) {
      const copy = [];
      for (let i = 0, len = obj.length; i < len; i++) {
        copy[i] = deepClone(obj[i]);
      }
      return copy;
    }
    
    const copy = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = deepClone(obj[key]);
      }
    }
    return copy;
  }
}

/**
 * Log an event to console with timestamp
 * @param {string} type - Event type 
 * @param {string} message - Event message
 * @param {Object} data - Additional data
 */
export function logEvent(type, message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [${type}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] [${type}] ${message}`);
  }
}

// =============================================================================
// INPUT VALIDATION AND SANITIZATION
// =============================================================================

/**
 * Input Sanitizer Module
 * Provides methods to sanitize and validate various types of input
 */
export const inputSanitizer = (() => {
  /**
   * Sanitize a string to prevent XSS attacks
   * @param {string} str - String to sanitize
   * @returns {string} - Sanitized string
   */
  function sanitizeString(str) {
    if (str === undefined || str === null) {
      return '';
    }
    
    // Convert to string if not already
    if (typeof str !== 'string') {
      str = String(str);
    }
    
    // Replace HTML special characters with their entities
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * Sanitize HTML content with a restricted set of allowed tags
   * @param {string} html - HTML content to sanitize
   * @returns {string} - Sanitized HTML
   */
  function sanitizeHTML(html) {
    if (html === undefined || html === null) {
      return '';
    }
    
    // Convert to string if not already
    if (typeof html !== 'string') {
      html = String(html);
    }
    
    // DOMPurify is preferred, but as a simple fallback use a basic approach
    // This is not comprehensive - in production, use a proper sanitizer library
    
    // Replace script tags
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove event attributes
    const eventAttributes = [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onmousedown', 
      'onmouseup', 'onkeydown', 'onkeypress', 'onkeyup', 'onchange', 'onsubmit',
      'onfocus', 'onblur'
    ];
    
    eventAttributes.forEach(attr => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*(['"]).*?\\1`, 'gi');
      html = html.replace(regex, '');
    });
    
    return html;
  }
  
  /**
   * Sanitize and validate a number value
   * @param {string|number} value - Value to sanitize
   * @param {Object} options - Validation options
   * @returns {number|null} - Sanitized number or null if invalid
   */
  function sanitizeNumber(value, options = {}) {
    const { min, max, decimal = false } = options;
    
    // Convert to string if not already
    if (typeof value !== 'string') {
      value = String(value);
    }
    
    // Remove any non-numeric characters except decimal point
    let sanitized = decimal ? 
      value.replace(/[^\d.-]/g, '') : 
      value.replace(/[^\d-]/g, '');
    
    // Convert to number
    let num = decimal ? parseFloat(sanitized) : parseInt(sanitized, 10);
    
    // Check if valid number
    if (isNaN(num)) {
      return null;
    }
    
    // Apply min/max constraints if provided
    if (min !== undefined && num < min) {
      num = min;
    }
    
    if (max !== undefined && num > max) {
      num = max;
    }
    
    return num;
  }
  
  /**
   * Sanitize a URL
   * @param {string} url - URL to sanitize
   * @returns {string} - Sanitized URL or # if invalid
   */
  function sanitizeURL(url) {
    if (typeof url !== 'string') {
      return '#';
    }
    
    url = url.trim();
    
    // Check for javascript: or data: protocols
    if (/^(javascript|data|vbscript):/i.test(url)) {
      return '#';
    }
    
    // Validate URL format
    try {
      new URL(url);
      return url;
    } catch (e) {
      // If URL is relative, prepend with origin
      if (url.startsWith('/')) {
        return window.location.origin + url;
      }
      return '#';
    }
  }
  
  /**
   * Validate input against common patterns
   * @param {string} value - Value to validate
   * @param {string} type - Validation type (TEXT, NUMBER, EMAIL, URL)
   * @returns {boolean} - Whether the input is valid
   */
  function validateInput(value, type) {
    if (value === undefined || value === null) {
      return false;
    }
    
    // Convert to string if not already
    if (typeof value !== 'string') {
      value = String(value);
    }
    
    const patterns = {
      TEXT: /^[^<>]*$/,
      NUMBER: /^-?\d+(\.\d+)?$/,
      EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      URL: /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/
    };
    
    if (!patterns[type]) {
      return false;
    }
    
    return patterns[type].test(value);
  }
  
  /**
   * Validate numeric input with min/max constraints
   * @param {string} fieldId - Field ID to validate
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {string} fieldName - Field name for error messages
   * @param {boolean} required - Whether the field is required
   * @returns {Object} - { isValid, value, message }
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
      if (errorDisplay) errorDisplay.style.display = 'block';
      return {
        isValid: false,
        value: null,
        message: `Please enter a ${fieldName}.`
      };
    }
    
    // If not required and empty, return valid
    if (!required && value === '') {
      field.classList.remove('error');
      if (errorDisplay) errorDisplay.style.display = 'none';
      return {
        isValid: true,
        value: null,
        message: null
      };
    }
    
    // Check if value is a valid number
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      field.classList.add('error');
      if (errorDisplay) errorDisplay.style.display = 'block';
      return {
        isValid: false,
        value: null,
        message: `Please enter a valid ${fieldName}.`
      };
    }
    
    // Check if value is within range
    if (numValue < min || numValue > max) {
      field.classList.add('error');
      if (errorDisplay) errorDisplay.style.display = 'block';
      return {
        isValid: false,
        value: numValue,
        message: `${fieldName} must be between ${min} and ${max}.`
      };
    }
    
    // Input is valid
    field.classList.remove('error');
    if (errorDisplay) errorDisplay.style.display = 'none';
    return {
      isValid: true,
      value: numValue,
      message: null
    };
  }
  
  return {
    sanitizeString,
    sanitizeHTML,
    sanitizeNumber,
    sanitizeURL,
    validateInput,
    validateNumericInput
  };
})();

/**
 * Physiological Validation Module
 * Provides additional medical/physiological validation for health data
 */
export const physiologicalValidation = (() => {
  // Normal ranges for physiological values
  const NORMAL_RANGES = {
    // Basic vitals
    age: { min: 18, max: 110, unit: 'years' },
    height: { min: 100, max: 250, unit: 'cm' },
    weight: { min: 30, max: 200, unit: 'kg' },
    sbp: { min: 70, max: 210, unit: 'mmHg' },
    dbp: { min: 40, max: 130, unit: 'mmHg' },
    
    // Lipid panel (in mmol/L)
    totalChol: { min: 1.0, max: 15.0, unit: 'mmol/L' },
    ldl: { min: 0.5, max: 10.0, unit: 'mmol/L' },
    hdl: { min: 0.5, max: 4.0, unit: 'mmol/L' },
    triglycerides: { min: 0.2, max: 10.0, unit: 'mmol/L' },
    lpa: { min: 0, max: 300, unit: 'mg/dL' }
  };
  
  // List of active warnings to track
  const activeWarnings = new Set();
  
  /**
   * Validate a physiological value against normal ranges
   * @param {string} fieldId - Field ID to validate
   * @param {string} physiologicalType - Type of value (e.g., 'age', 'sbp')
   * @returns {boolean} - Whether the value is within normal range
   */
  function validatePhysiologicalValue(fieldId, physiologicalType) {
    const field = document.getElementById(fieldId);
    if (!field) return true; // Can't validate missing field
    
    const value = parseFloat(field.value);
    if (isNaN(value)) return true; // Can't validate non-numeric value
    
    const normalRange = NORMAL_RANGES[physiologicalType];
    if (!normalRange) return true; // No defined range for this type
    
    // Check against normal range
    const isNormal = value >= normalRange.min && value <= normalRange.max;
    
    // Create or clear warning
    if (!isNormal) {
      createPhysiologicalWarning(fieldId, physiologicalType, value, normalRange);
      activeWarnings.add(fieldId);
    } else {
      clearPhysiologicalWarning(fieldId);
      activeWarnings.delete(fieldId);
    }
    
    return isNormal;
  }
  
  /**
   * Create a warning message for abnormal physiological value
   * @param {string} fieldId - Field ID with abnormal value
   * @param {string} physiologicalType - Type of value
   * @param {number} value - Actual value
   * @param {Object} normalRange - Normal range for this type
   */
  function createPhysiologicalWarning(fieldId, physiologicalType, value, normalRange) {
    // Check if warning already exists
    let warningEl = document.getElementById(`${fieldId}-warning`);
    
    if (!warningEl) {
      // Create warning element
      warningEl = document.createElement('div');
      warningEl.id = `${fieldId}-warning`;
      warningEl.className = 'physiological-warning';
      
      // Insert after the field or its parent form group
      const field = document.getElementById(fieldId);
      const formGroup = field.closest('.form-group');
      const parentEl = formGroup || field.parentElement;
      
      parentEl.appendChild(warningEl);
    }
    
    // Set warning message
    const humanReadableType = physiologicalType
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
    
    const lowOrHigh = value < normalRange.min ? 'low' : 'high';
    
    warningEl.innerHTML = `
      <div class="physiological-warning-icon">⚠️</div>
      <div class="physiological-warning-message">
        <strong>Unusual ${humanReadableType}:</strong> ${value} ${normalRange.unit} seems ${lowOrHigh}.
        <br>Normal range is ${normalRange.min} - ${normalRange.max} ${normalRange.unit}.
        <div class="physiological-warning-note">
          <small>*Please double-check this value. If correct, proceed.</small>
        </div>
      </div>
    `;
    
    // Add CSS for warning styling
    if (!document.getElementById('physiological-warning-styles')) {
      const style = document.createElement('style');
      style.id = 'physiological-warning-styles';
      style.textContent = `
        .physiological-warning {
          margin-top: var(--space-sm, 0.5rem);
          padding: var(--space-sm, 0.5rem) var(--space-md, 1rem);
          border-radius: var(--radius-md, 0.375rem);
          background-color: rgba(237, 137, 54, 0.1);
          border-left: 3px solid var(--warning-color, #dd6b20);
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm, 0.5rem);
          animation: fadeIn 0.3s ease-in-out;
        }
        
        .physiological-warning-icon {
          font-size: 1.25rem;
          line-height: 1;
        }
        
        .physiological-warning-message {
          font-size: var(--font-size-sm, 0.875rem);
          color: var(--text-color, #2d3748);
        }
        
        .physiological-warning-note {
          margin-top: var(--space-xs, 0.25rem);
          color: var(--text-light, #718096);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Clear a physiological warning for a field
   * @param {string} fieldId - Field ID to clear warning for
   */
  function clearPhysiologicalWarning(fieldId) {
    const warningEl = document.getElementById(`${fieldId}-warning`);
    if (warningEl) {
      warningEl.remove();
      activeWarnings.delete(fieldId);
    }
  }
  
  /**
   * Clear all physiological warnings
   */
  function clearAllWarnings() {
    activeWarnings.forEach(fieldId => {
      clearPhysiologicalWarning(fieldId);
    });
    activeWarnings.clear();
  }
  
  /**
   * Validate an entire form for physiological plausibility
   * @param {string} formId - Form ID to validate
   * @returns {boolean} - Whether all values are physiologically plausible
   */
  function validatePhysiologicalForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return true;
    
    // Find form inputs and validate them against physiological ranges
    const numericInputs = form.querySelectorAll('input[type="number"]');
    let allValid = true;
    
    numericInputs.forEach(input => {
      const fieldId = input.id;
      
      // Extract physiological type from field ID
      // Assumption: field IDs follow pattern like 'form-type' or 'form-type-sub'
      const parts = fieldId.split('-');
      if (parts.length < 2) return;
      
      const typeMatch = parts.slice(1).join('-');
      
      // Try to find a matching physiological type
      let matchedType = null;
      for (const type in NORMAL_RANGES) {
        if (typeMatch.includes(type)) {
          matchedType = type;
          break;
        }
      }
      
      if (matchedType) {
        const isValid = validatePhysiologicalValue(fieldId, matchedType);
        if (!isValid) allValid = false;
      }
    });
    
    // Check for combination warnings (multiple values that together are concerning)
    validateCombinations(formId);
    
    return allValid;
  }
  
  /**
   * Validate combinations of values that together might be concerning
   * @param {string} formId - Form ID to validate combinations for
   */
  function validateCombinations(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const warnings = [];
    
    // Check for low HDL and high LDL
    const hdlField = form.querySelector('input[id*="hdl"]');
    const ldlField = form.querySelector('input[id*="ldl"]');
    
    if (hdlField && ldlField) {
      const hdl = parseFloat(hdlField.value);
      const ldl = parseFloat(ldlField.value);
      
      if (!isNaN(hdl) && !isNaN(ldl) && hdl < 1.0 && ldl > 4.5) {
        warnings.push(`Low HDL (${hdl} mmol/L) combined with high LDL (${ldl} mmol/L) indicates very high cardiovascular risk.`);
      }
    }
    
    // Check for high systolic with normal diastolic (isolated systolic hypertension)
    const sbpField = form.querySelector('input[id*="sbp"]');
    const dbpField = form.querySelector('input[id*="dbp"]');
    
    if (sbpField && dbpField) {
      const sbp = parseFloat(sbpField.value);
      const dbp = parseFloat(dbpField.value);
      
      if (!isNaN(sbp) && !isNaN(dbp) && sbp > 160 && dbp < 90) {
        warnings.push(`Isolated systolic hypertension detected (SBP ${sbp} mmHg with DBP ${dbp} mmHg). This pattern is common in older adults.`);
      }
    }
    
    // Add combination warnings to the form
    if (warnings.length > 0) {
      displayCombinationWarnings(formId, warnings);
    } else {
      clearCombinationWarnings(formId);
    }
  }
  
  /**
   * Display warnings for concerning combinations of values
   * @param {string} formId - Form ID to display warnings for
   * @param {Array} warnings - Array of warning messages
   */
  function displayCombinationWarnings(formId, warnings) {
    let warningsContainer = document.getElementById(`${formId}-combination-warnings`);
    
    if (!warningsContainer) {
      warningsContainer = document.createElement('div');
      warningsContainer.id = `${formId}-combination-warnings`;
      warningsContainer.className = 'combination-warnings';
      
      const form = document.getElementById(formId);
      const submitButton = form.querySelector('button[type="submit"]');
      
      if (submitButton) {
        submitButton.parentElement.insertBefore(warningsContainer, submitButton);
      } else {
        form.appendChild(warningsContainer);
      }
    }
    
    let warningsHTML = '<div class="warning-header">Clinical Observations:</div><ul>';
    warnings.forEach(warning => {
      warningsHTML += `<li>${warning}</li>`;
    });
    warningsHTML += '</ul>';
    
    warningsContainer.innerHTML = warningsHTML;
    warningsContainer.style.display = 'block';
    
    // Add CSS if not already added
    if (!document.getElementById('combination-warnings-styles')) {
      const style = document.createElement('style');
      style.id = 'combination-warnings-styles';
      style.textContent = `
        .combination-warnings {
          margin: var(--space-lg, 1.5rem) 0;
          padding: var(--space-md, 1rem);
          border-radius: var(--radius-md, 0.375rem);
          background-color: rgba(49, 130, 206, 0.1);
          border-left: 3px solid var(--info-color, #3182ce);
        }
        
        .combination-warnings .warning-header {
          font-weight: var(--font-weight-semibold, 600);
          margin-bottom: var(--space-sm, 0.5rem);
          color: var(--info-color, #3182ce);
        }
        
        .combination-warnings ul {
          margin-bottom: 0;
          padding-left: var(--space-lg, 1.5rem);
        }
        
        .combination-warnings li {
          margin-bottom: var(--space-xs, 0.25rem);
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Clear combination warnings
   * @param {string} formId - Form ID to clear warnings for
   */
  function clearCombinationWarnings(formId) {
    const warningsContainer = document.getElementById(`${formId}-combination-warnings`);
    if (warningsContainer) {
      warningsContainer.style.display = 'none';
    }
  }
  
  return {
    validatePhysiologicalValue,
    createPhysiologicalWarning,
    clearPhysiologicalWarning,
    clearAllWarnings,
    validatePhysiologicalForm,
    validateCombinations
  };
})();

// =============================================================================
// RISK CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate treatment recommendations based on risk score and lipid levels
 * @param {Object} data - Patient data including risk score and lipid levels
 * @returns {Object} - Treatment recommendations
 */
export function calculateTreatmentRecommendations(data) {
  // Validate input
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data object provided');
  }
  
  if (data.adjustedRisk === undefined && data.risk === undefined) {
    throw new Error('Missing risk score data');
  }

  // Default recommendations object
  const recommendations = {
    riskCategory: '',
    statinRecommended: false,
    statinIntensity: '',
    statinOptions: [],
    ldlTarget: null,
    nonHDLTarget: null,
    followUp: '',
    additionalTests: [],
    lifestyleAdvice: []
  };
  
  // Get risk category
  const riskPercentage = data.adjustedRisk !== undefined ? data.adjustedRisk : data.risk;
  recommendations.riskCategory = getRiskCategory(riskPercentage);
  
  // Convert LDL to mmol/L if needed for consistent comparison
  let ldl = data.ldl;
  if (ldl !== undefined) {
    if (data.ldlUnit === 'mg/dL') {
      ldl = convertCholesterol(ldl, 'mg/dL', 'mmol/L');
    }
  } else {
    ldl = 0; // Default if not provided
  }
  
  // Check if family history present or other high-risk factors
  const hasHighRiskFactors = data.familyHistory || 
                            (ldl >= 4.9) || 
                            (data.lpa && data.lpa >= 50 && data.lpaUnit === 'mg/dL') ||
                            (data.lpa && data.lpa >= 125 && data.lpaUnit === 'nmol/L');
  
  // Determine statin recommendation based on risk category and LDL
  if (recommendations.riskCategory === 'high' || hasHighRiskFactors) {
    recommendations.statinRecommended = true;
    recommendations.statinIntensity = 'high';
    recommendations.ldlTarget = 1.8; // mmol/L
    recommendations.nonHDLTarget = 2.6; // mmol/L
    recommendations.statinOptions = [
      { name: 'Atorvastatin', dose: '40-80 mg daily', intensity: 'high' },
      { name: 'Rosuvastatin', dose: '20-40 mg daily', intensity: 'high' }
    ];
    recommendations.followUp = '4-12 weeks after initiating therapy';
    recommendations.additionalTests = [
      'Liver function tests at baseline, 8-12 weeks after starting therapy, and annually thereafter',
      'HbA1c or fasting glucose at baseline and after 3 months'
    ];
  } else if (recommendations.riskCategory === 'moderate') {
    recommendations.statinRecommended = true;
    recommendations.statinIntensity = 'moderate';
    recommendations.ldlTarget = 2.6; // mmol/L
    recommendations.nonHDLTarget = 3.4; // mmol/L
    recommendations.statinOptions = [
      { name: 'Atorvastatin', dose: '10-20 mg daily', intensity: 'moderate' },
      { name: 'Rosuvastatin', dose: '5-10 mg daily', intensity: 'moderate' },
      { name: 'Simvastatin', dose: '20-40 mg daily', intensity: 'moderate' }
    ];
    recommendations.followUp = '4-12 weeks after initiating therapy';
    recommendations.additionalTests = [
      'Liver function tests at baseline, 8-12 weeks after starting therapy, and annually thereafter'
    ];
  } else {
    // Low risk
    recommendations.statinRecommended = false;
    recommendations.statinIntensity = 'none';
    recommendations.ldlTarget = 3.4; // mmol/L
    recommendations.nonHDLTarget = 4.1; // mmol/L
    recommendations.followUp = 'Reassess cardiovascular risk in 5 years';
    recommendations.additionalTests = [];
  }
  
  // Add lifestyle advice for all patients
  recommendations.lifestyleAdvice = [
    'Mediterranean diet rich in fruits, vegetables, whole grains, and fish',
    'Regular physical activity (150+ minutes moderate or 75+ minutes vigorous per week)',
    'Smoking cessation if applicable',
    'Maintain healthy weight (BMI 18.5-24.9)',
    'Limit alcohol consumption',
    'Reduce dietary saturated and trans fats'
  ];
  
  // Special recommendations for elevated Lp(a)
  if (data.lpa) {
    let lpaValue = data.lpa;
    let lpaUnit = data.lpaUnit || 'mg/dL';
    
    // Convert to mg/dL for assessment if needed
    if (lpaUnit === 'nmol/L') {
      lpaValue = convertLpa(lpaValue, 'nmol/L', 'mg/dL');
      lpaUnit = 'mg/dL';
    }
    
    if (lpaValue >= 50) {
      // Add Lp(a)-specific recommendations
      recommendations.additionalTests.push('Consider repeat Lp(a) measurement to confirm elevation');
      recommendations.additionalTests.push('Consider cascade screening for first-degree relatives');
      
      // More intensive goals for very high Lp(a)
      if (lpaValue >= 100) {
        recommendations.ldlTarget = Math.min(recommendations.ldlTarget, 1.4); // Lower LDL target
        recommendations.nonHDLTarget = Math.min(recommendations.nonHDLTarget, 2.2);
        recommendations.statinIntensity = 'high';
        recommendations.statinRecommended = true;
        recommendations.followUp = '4-8 weeks after initiating therapy';
        
        // Update statin options for high intensity
        recommendations.statinOptions = [
          { name: 'Atorvastatin', dose: '40-80 mg daily', intensity: 'high' },
          { name: 'Rosuvastatin', dose: '20-40 mg daily', intensity: 'high' }
        ];
        
        // Consider additional therapy
        recommendations.additionalTests.push('Consider referral to lipid specialist for additional therapy beyond statins');
      }
    }
  }
  
  return recommendations;
}

/**
 * Calculate Framingham Risk Score
 * @param {Object} data - Form data
 * @returns {Object} - Risk calculation results
 */
export function calculateFraminghamRiskScore(data) {
  // Input validation
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data object provided to risk calculator');
  }
  
  if (!data.age || !data.sex || !data.totalChol || !data.hdl || !data.sbp) {
    throw new Error('Missing required parameters for risk calculation');
  }
  
  // Constants for FRS calculation
  const COEFFICIENTS = {
    male: {
      age: 3.06117,
      totalChol: 1.12370,
      hdl: -0.93263,
      sbp_untreated: 1.93303,
      sbp_treated: 1.99881,
      smoker: 0.65451,
      diabetes: 0.57367
    },
    female: {
      age: 2.32888,
      totalChol: 1.20904,
      hdl: -0.70833,
      sbp_untreated: 2.76157,
      sbp_treated: 2.82263,
      smoker: 0.52873,
      diabetes: 0.69154
    }
  };

  const AVERAGES = {
    male: {
      age: 49.9, // years
      totalChol: 5.04, // mmol/L
      hdl: 1.24, // mmol/L
      sbp: 129.7, // mmHg
      smoker: 0.5, // 50% prevalence
      diabetes: 0.06 // 6% prevalence
    },
    female: {
      age: 49.1, // years
      totalChol: 5.20, // mmol/L
      hdl: 1.53, // mmol/L
      sbp: 125.8, // mmHg
      smoker: 0.4, // 40% prevalence
      diabetes: 0.04 // 4% prevalence
    }
  };

  const BASELINE_SURVIVAL = {
    male: 0.88936,   // 10-year survival rate
    female: 0.95012  // 10-year survival rate
  };

  try {
    // Extract data and prepare variables
    const sex = data.sex;
    if (sex !== 'male' && sex !== 'female') {
      throw new Error('Sex must be either "male" or "female"');
    }
    
    const smoker = data.smoker ? 1 : 0;
    const diabetes = data.diabetes ? 1 : 0;
    const bpTreated = data.bpTreatment ? 1 : 0;
    
    // Convert cholesterol to mmol/L if needed
    let totalChol = data.totalChol;
    let hdl = data.hdl;
    
    if (data.totalCholUnit === 'mg/dL') {
      totalChol = convertCholesterol(totalChol, 'mg/dL', 'mmol/L');
    }
    
    if (data.hdlUnit === 'mg/dL') {
      hdl = convertCholesterol(hdl, 'mg/dL', 'mmol/L');
    }
    
    // Validate lab values
    if (totalChol <= 0 || hdl <= 0) {
      throw new Error('Cholesterol values must be greater than zero');
    }
    
    if (hdl > totalChol) {
      throw new Error('HDL cholesterol cannot be greater than total cholesterol');
    }
    
    // Validate age (FRS is valid for ages 30-74)
    if (data.age < 30 || data.age > 74) {
      console.warn('Framingham risk score is validated for ages 30-74. Results may be less accurate.');
    }
    
    // Calculate the sum based on coefficients
    let sum = 0;
    
    // Age
    sum += COEFFICIENTS[sex].age * Math.log(data.age);
    
    // Total Cholesterol
    sum += COEFFICIENTS[sex].totalChol * Math.log(totalChol);
    
    // HDL Cholesterol
    sum += COEFFICIENTS[sex].hdl * Math.log(hdl);
    
    // Systolic Blood Pressure
    if (bpTreated) {
      sum += COEFFICIENTS[sex].sbp_treated * Math.log(data.sbp);
    } else {
      sum += COEFFICIENTS[sex].sbp_untreated * Math.log(data.sbp);
    }
    
    // Smoking
    if (smoker) {
      sum += COEFFICIENTS[sex].smoker;
    }
    
    // Diabetes
    if (diabetes) {
      sum += COEFFICIENTS[sex].diabetes;
    }
    
    // Calculate risk
    const survival = BASELINE_SURVIVAL[sex];
    if (!survival || survival <= 0 || survival >= 1) {
      throw new Error('Invalid baseline survival rate');
    }
    
    const risk = 1 - Math.pow(survival, Math.exp(sum));
    if (isNaN(risk)) {
      throw new Error('Error calculating risk score. Check input values.');
    }
    
    const risk_percentage = risk * 100;
    
    // Calculate relative risk compared to average person
    let averageSum = 0;
    averageSum += COEFFICIENTS[sex].age * Math.log(AVERAGES[sex].age);
    averageSum += COEFFICIENTS[sex].totalChol * Math.log(AVERAGES[sex].totalChol);
    averageSum += COEFFICIENTS[sex].hdl * Math.log(AVERAGES[sex].hdl);
    averageSum += COEFFICIENTS[sex].sbp_untreated * Math.log(AVERAGES[sex].sbp);
    averageSum += COEFFICIENTS[sex].smoker * AVERAGES[sex].smoker;
    averageSum += COEFFICIENTS[sex].diabetes * AVERAGES[sex].diabetes;
    
    const averageRisk = 1 - Math.pow(survival, Math.exp(averageSum));
    const relativeRisk = risk / averageRisk;
    
    // Apply Lp(a) modifier if available
    let lpaModifier = 1.0;
    if (data.lpa && data.lpa > 0) {
      // Convert Lp(a) to mg/dL if in nmol/L
      let lpaValue = data.lpa;
      if (data.lpaUnit === 'nmol/L') {
        lpaValue = convertLpa(lpaValue, 'nmol/L', 'mg/dL');
      }
      
      // Calculate modifier
      lpaModifier = calculateLpaModifier(lpaValue);
    }
    
    // Adjusted risk with Lp(a)
    const adjustedRisk = Math.min(risk_percentage * lpaModifier, 99.9);
    
    return {
      risk: risk_percentage,
      adjustedRisk: adjustedRisk, 
      relativeRisk: relativeRisk,
      category: getRiskCategory(adjustedRisk),
      lpaModifier: lpaModifier
    };
  } catch (error) {
    console.error('Error calculating Framingham risk score:', error);
    throw new Error('Failed to calculate risk score: ' + error.message);
  }
}

/**
 * Calculate QRISK3 risk score
 * @param {Object} data - Form data
 * @returns {Object} - Risk calculation results
 */
export async function calculateQRISK3(data) {
  // Input validation
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data object provided to risk calculator');
  }
  
  if (!data.age || !data.sex || !data.sbp) {
    throw new Error('Missing required parameters for QRISK3 calculation');
  }
  
  // Load QRISK3 algorithm if not already loaded
  if (!QRISK3) {
    const loaded = await loadQRISK3();
    if (!loaded) {
      throw new Error('QRISK3 algorithm could not be loaded');
    }
  }

  try {
    // Prepare input data
    const input = {};
    
    // Required fields
    input.age = data.age;
    input.gender = data.sex === 'male' ? 1 : 0;
    
    // Map ethnicity to the QRISK3 codes
    const ethnicityMap = {
      'white': 0,
      'white-british': 1,
      'white-irish': 2,
      'white-other': 3,
      'indian': 4,
      'pakistani': 5,
      'bangladeshi': 6,
      'other-asian': 7,
      'black-caribbean': 8,
      'black-african': 9,
      'black-other': 10,
      'chinese': 11,
      'other': 12
    };
    
    input.ethnicity = ethnicityMap[data.ethnicity] || 0;
    
    // Physical measurements
    input.height = data.height; // in cm
    input.weight = data.weight; // in kg
    
    // Calculate BMI if not provided
    if (!data.bmi && data.height && data.weight) {
      input.bmi = calculateBMI(data.height, data.weight);
    } else {
      input.bmi = data.bmi;
    }
    
    // Blood pressure
    input.sbp = data.sbp;
    input.sbp_std = data.sbpSD || 0; // Default to 0 if not provided
    
    // Cholesterol
    let cholRatio = 0;
    
    // Convert cholesterol to mmol/L if needed and calculate ratio
    if (data.totalChol && data.hdl) {
      let totalChol = data.totalChol;
      let hdl = data.hdl;
      
      if (data.totalCholUnit === 'mg/dL') {
        totalChol = convertCholesterol(totalChol, 'mg/dL', 'mmol/L');
      }
      
      if (data.hdlUnit === 'mg/dL') {
        hdl = convertCholesterol(hdl, 'mg/dL', 'mmol/L');
      }
      
      // Validate lab values
      if (hdl > totalChol) {
        throw new Error('HDL cholesterol cannot be greater than total cholesterol');
      }
      
      // Calculate cholesterol ratio
      if (hdl > 0) {
        cholRatio = totalChol / hdl;
      }
    }
    
    input.ratio = cholRatio;
    
    // Risk factors
    input.smoker = data.smokingStatus === 'non' ? 0 : 
                  (data.smokingStatus === 'ex' ? 1 : 
                  (data.smokingStatus === 'light' ? 2 : 
                  (data.smokingStatus === 'moderate' ? 3 : 4)));
                  
    input.diabetes = data.type1Diabetes ? 1 : (data.type2Diabetes ? 2 : 0);
    input.famhist = data.familyHistory ? 1 : 0;
    input.atrial_fib = data.atrialFibrillation ? 1 : 0;
    input.renal = data.ckd ? 1 : 0;
    input.bp_med = data.onBloodPressureTreatment ? 1 : 0;
    input.migraine = data.migraine ? 1 : 0;
    input.rheumatoid_arthritis = data.rheumatoidArthritis ? 1 : 0;
    input.sle = data.sle ? 1 : 0;
    input.severe_mental_illness = data.mentalIllness ? 1 : 0;
    input.antipsychotics = data.atypicalAntipsychotics ? 1 : 0;
    input.corticosteroids = data.corticosteroids ? 1 : 0;
    
    // Erectile dysfunction (only for males)
    input.erectile_dysfunction = data.sex === 'male' && data.erectileDysfunction ? 1 : 0;
    
    // Townsend score (deprivation) - defaults to average (0)
    input.townsend = data.townsend || 0;
    
    // Validate age (QRISK3 is valid for ages 25-84)
    if (data.age < 25 || data.age > 84) {
      console.warn('QRISK3 is validated for ages 25-84. Results may be less accurate.');
    }
    
    // Calculate risk using QRISK3 algorithm
    const result = QRISK3.calculate_risk(input);
    
    if (!result || typeof result !== 'object') {
      throw new Error('QRISK3 calculation failed to return valid results');
    }
    
    // Calculate relative risk compared to a "healthy" person
    const healthyInput = {...input};
    
    // A "healthy" person has:
    healthyInput.smoker = 0; // non-smoker
    healthyInput.bmi = 25; // normal BMI
    healthyInput.ethnicity = 1; // white British
    healthyInput.townsend = 0; // average deprivation
    healthyInput.sbp = 125; // normal blood pressure
    healthyInput.sbp_std = 0; // no variability
    healthyInput.ratio = 4; // normal cholesterol ratio
    
    // No health conditions
    healthyInput.diabetes = 0;
    healthyInput.famhist = 0;
    healthyInput.atrial_fib = 0;
    healthyInput.renal = 0;
    healthyInput.bp_med = 0;
    healthyInput.migraine = 0;
    healthyInput.rheumatoid_arthritis = 0;
    healthyInput.sle = 0;
    healthyInput.severe_mental_illness = 0;
    healthyInput.antipsychotics = 0;
    healthyInput.corticosteroids = 0;
    healthyInput.erectile_dysfunction = 0;
    
    const healthyResult = QRISK3.calculate_risk(healthyInput);
    
    // Apply Lp(a) modifier if available
    let lpaModifier = 1.0;
    if (data.lpa && data.lpa > 0) {
      // Convert Lp(a) to mg/dL if in nmol/L
      let lpaValue = data.lpa;
      if (data.lpaUnit === 'nmol/L') {
        lpaValue = convertLpa(lpaValue, 'nmol/L', 'mg/dL');
      }
      
      // Calculate modifier
      lpaModifier = calculateLpaModifier(lpaValue);
    }
    
    // Adjusted risk with Lp(a)
    const adjustedRisk = Math.min(result.score * lpaModifier, 99.9);
    
    return {
      risk: result.score,
      adjustedRisk: adjustedRisk,
      relativeRisk: result.score / healthyResult.score,
      heartAge: result.heart_age,
      lpaModifier: lpaModifier,
      category: getRiskCategory(adjustedRisk)
    };
  } catch (error) {
    console.error('Error calculating QRISK3 score:', error);
    throw new Error('Failed to calculate QRISK3 score: ' + error.message);
  }
}

// =============================================================================
// UNIT CONVERSION FUNCTIONS
// =============================================================================

/**
 * Helper function to convert height from feet/inches to cm
 * @param {number} feet - Height in feet
 * @param {number} inches - Height in inches
 * @returns {number} - Height in cm
 */
export function convertHeightToCm(feet, inches) {
  if (feet === null && inches === null) {
    return null;
  }
  
  // Input validation
  feet = parseFloat(feet) || 0;
  inches = parseFloat(inches) || 0;
  
  if (feet < 0 || inches < 0) {
    throw new Error('Height values cannot be negative');
  }
  
  if (inches >= 12) {
    // Convert excess inches to feet
    feet += Math.floor(inches / 12);
    inches = inches % 12;
  }
  
  return ((feet * 12) + inches) * 2.54;
}

/**
 * Helper function to convert height from cm to feet/inches
 * @param {number} cm - Height in cm
 * @returns {Object} - { feet, inches }
 */
export function convertHeightToFeetInches(cm) {
  if (cm === null || cm === undefined) {
    return { feet: null, inches: null };
  }
  
  // Input validation
  cm = parseFloat(cm);
  
  if (isNaN(cm)) {
    throw new Error('Invalid height value');
  }
  
  if (cm < 0) {
    throw new Error('Height value cannot be negative');
  }
  
  // 1 inch = 2.54 cm
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  
  // Handle case where inches rounds to 12
  if (inches === 12) {
    return { feet: feet + 1, inches: 0 };
  }
  
  return { feet, inches };
}

/**
 * Helper function to convert weight from pounds to kg
 * @param {number} pounds - Weight in pounds
 * @returns {number} - Weight in kg
 */
export function convertWeightToKg(pounds) {
  if (pounds === null || pounds === undefined) {
    return null;
  }
  
  // Input validation
  pounds = parseFloat(pounds);
  
  if (isNaN(pounds)) {
    throw new Error('Invalid weight value');
  }
  
  if (pounds < 0) {
    throw new Error('Weight value cannot be negative');
  }
  
  return pounds * 0.45359237;
}

/**
 * Helper function to convert weight from kg to pounds
 * @param {number} kg - Weight in kg
 * @returns {number} - Weight in pounds
 */
export function convertWeightToPounds(kg) {
  if (kg === null || kg === undefined) {
    return null;
  }
  
  // Input validation
  kg = parseFloat(kg);
  
  if (isNaN(kg)) {
    throw new Error('Invalid weight value');
  }
  
  if (kg < 0) {
    throw new Error('Weight value cannot be negative');
  }
  
  return kg / 0.45359237;
}

/**
 * Helper function to convert cholesterol between mg/dL and mmol/L
 * @param {number} value - Cholesterol value
 * @param {string} fromUnit - Original unit ('mg/dL' or 'mmol/L')
 * @param {string} toUnit - Target unit ('mg/dL' or 'mmol/L')
 * @returns {number} - Converted cholesterol value
 */
export function convertCholesterol(value, fromUnit, toUnit) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Input validation
  value = parseFloat(value);
  
  if (isNaN(value)) {
    throw new Error('Invalid cholesterol value');
  }
  
  if (value < 0) {
    throw new Error('Cholesterol value cannot be negative');
  }
  
  if (fromUnit === toUnit) {
    return value;
  }
  
  if (fromUnit === 'mg/dL' && toUnit === 'mmol/L') {
    return value / CONVERSION.CHOL_MMOL_TO_MGDL;
  }
  
  if (fromUnit === 'mmol/L' && toUnit === 'mg/dL') {
    return value * CONVERSION.CHOL_MMOL_TO_MGDL;
  }
  
  throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`);
}

/**
 * Helper function to convert triglycerides between mg/dL and mmol/L
 * @param {number} value - Triglyceride value
 * @param {string} fromUnit - Original unit ('mg/dL' or 'mmol/L')
 * @param {string} toUnit - Target unit ('mg/dL' or 'mmol/L')
 * @returns {number} - Converted triglyceride value
 */
export function convertTriglycerides(value, fromUnit, toUnit) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Input validation
  value = parseFloat(value);
  
  if (isNaN(value)) {
    throw new Error('Invalid triglyceride value');
  }
  
  if (value < 0) {
    throw new Error('Triglyceride value cannot be negative');
  }
  
  if (fromUnit === toUnit) {
    return value;
  }
  
  if (fromUnit === 'mg/dL' && toUnit === 'mmol/L') {
    return value / CONVERSION.TG_MMOL_TO_MGDL;
  }
  
  if (fromUnit === 'mmol/L' && toUnit === 'mg/dL') {
    return value * CONVERSION.TG_MMOL_TO_MGDL;
  }
  
  throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`);
}

/**
 * Helper function to convert Lp(a) between mg/dL and nmol/L
 * @param {number} value - Lp(a) value
 * @param {string} fromUnit - Original unit ('mg/dL' or 'nmol/L')
 * @param {string} toUnit - Target unit ('mg/dL' or 'nmol/L')
 * @returns {number} - Converted Lp(a) value
 */
export function convertLpa(value, fromUnit, toUnit) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Input validation
  value = parseFloat(value);
  
  if (isNaN(value)) {
    throw new Error('Invalid Lp(a) value');
  }
  
  if (value < 0) {
    throw new Error('Lp(a) value cannot be negative');
  }
  
  if (fromUnit === toUnit) {
    return value;
  }
  
  if (fromUnit === 'mg/dL' && toUnit === 'nmol/L') {
    return value * CONVERSION.LPA_MGDL_TO_NMOL;
  }
  
  if (fromUnit === 'nmol/L' && toUnit === 'mg/dL') {
    return value * CONVERSION.LPA_NMOL_TO_MGDL;
  }
  
  throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`);
}

/**
 * Calculates BMI from height and weight
 * @param {number} height - Height in cm
 * @param {number} weight - Weight in kg
 * @returns {number} - BMI value
 */
export function calculateBMI(height, weight) {
  if (!height || !weight) {
    return null;
  }
  
  // Input validation
  height = parseFloat(height);
  weight = parseFloat(weight);
  
  if (isNaN(height) || isNaN(weight)) {
    throw new Error('Invalid height or weight values');
  }
  
  if (height <= 0 || weight <= 0) {
    throw new Error('Height and weight must be positive values');
  }
  
  // Convert height from cm to meters
  const heightInM = height / 100;
  
  const bmi = weight / (heightInM * heightInM);
  
  // Check for unrealistic values
  if (bmi < 10 || bmi > 100) {
    console.warn('Calculated BMI is outside normal range:', bmi);
  }
  
  return bmi;
}

/**
 * Format BMI with risk category
 * @param {number} bmi - BMI value
 * @returns {string} - Formatted BMI with category
 */
export function formatBMI(bmi) {
  if (!bmi) {
    return 'Not available';
  }
  
  // Input validation
  bmi = parseFloat(bmi);
  
  if (isNaN(bmi)) {
    throw new Error('Invalid BMI value');
  }
  
  let category;
  if (bmi < 18.5) {
    category = 'Underweight';
  } else if (bmi < 25) {
    category = 'Normal weight';
  } else if (bmi < 30) {
    category = 'Overweight';
  } else if (bmi < 35) {
    category = 'Obese (Class I)';
  } else if (bmi < 40) {
    category = 'Obese (Class II)';
  } else {
    category = 'Obese (Class III)';
  }
  
  return bmi.toFixed(1) + ' kg/m² (' + category + ')';
}

// =============================================================================
// LP(A) MODIFIER CALCULATION
// =============================================================================

/**
 * Calculate Lp(a) risk modifier based on concentration
 * Reference: Willeit P, et al. Lancet 2018;392:1311-1320
 * @param {number} lpaValue - Lp(a) concentration in mg/dL
 * @returns {number} - Risk multiplier
 */
export function calculateLpaModifier(lpaValue) {
  // Input validation
  if (lpaValue === null || lpaValue === undefined) {
    return 1.0; // No modification if no value
  }
  
  lpaValue = parseFloat(lpaValue);
  
  if (isNaN(lpaValue)) {
    throw new Error('Invalid Lp(a) value');
  }
  
  if (lpaValue < 0) {
    throw new Error('Lp(a) value cannot be negative');
  }
  
  // No additional risk below 30 mg/dL (based on literature)
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

// Apply memoization to improve performance
export const memoizedLpaModifier = memoize(calculateLpaModifier);

/**
 * Determine risk category based on percentage
 * @param {number} riskPercentage - Risk percentage value
 * @returns {string} - Risk category (low, moderate, high)
 */
export function getRiskCategory(riskPercentage) {
  // Input validation
  if (riskPercentage === null || riskPercentage === undefined) {
    throw new Error('Risk percentage not provided');
  }
  
  riskPercentage = parseFloat(riskPercentage);
  
  if (isNaN(riskPercentage)) {
    throw new Error('Invalid risk percentage');
  }
  
  if (riskPercentage < 0) {
    throw new Error('Risk percentage cannot be negative');
  }
  
  // Risk categories based on standard clinical guidelines
  if (riskPercentage < 10) {
    return 'low';
  } else if (riskPercentage < 20) {
    return 'moderate';
  } else {
    return 'high';
  }
}

// =============================================================================
// SECURE STORAGE IMPLEMENTATION
// =============================================================================

/**
 * Secure Storage Module
 * Provides encrypted local storage functionality using Web Crypto API
 */
export const secureStorage = (() => {
  // Storage prefix to identify encrypted data
  const STORAGE_PREFIX = 'secure_';
  
  // Salt for key derivation
  const SALT = new Uint8Array([
    115, 97, 108, 116, 95, 118, 97, 108, 117, 101,  // "salt_value"
    95, 102, 111, 114, 95, 99, 118, 100, 95, 116,   // "_for_cvd_t"
    111, 111, 108, 95, 115, 116, 111, 114, 97, 103, // "ool_storag"
    101, 95, 50, 48, 50, 53                        // "e_2025"
  ]);
  
  // Encryption key storage
  let cryptoKey = null;
  
  /**
   * Initialize the secure storage system
   * @returns {Promise<boolean>} Success status
   */
  async function initialize() {
    try {
      // Check if Web Crypto is available
      if (!window.crypto || !window.crypto.subtle) {
        console.warn('Web Crypto API not available. Falling back to basic storage.');
        return false;
      }
      
      // Get or create app password from local storage (used for key derivation)
      let storedPassword = localStorage.getItem('app_password');
      if (!storedPassword) {
        // Generate random password if none exists
        const randArray = new Uint8Array(32);
        window.crypto.getRandomValues(randArray);
        storedPassword = Array.from(randArray, b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem('app_password', storedPassword);
      }
      
      // Convert password to bytes
      const passwordBytes = new TextEncoder().encode(storedPassword);
      
      // Derive key material from password
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      // Derive the actual encryption key
      cryptoKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: SALT,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      
      return true;
    } catch (error) {
      console.error('Error initializing secure storage:', error);
      return false;
    }
  }
  
  /**
   * Encrypt data for storage
   * @param {any} data - Data to encrypt 
   * @returns {Promise<string|null>} - Base64 encoded encrypted data
   */
  async function encryptData(data) {
    try {
      if (!cryptoKey) {
        const initialized = await initialize();
        if (!initialized) {
          return fallbackEncodeData(data);
        }
      }
      
      // Convert data to JSON string
      const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Convert to bytes
      const dataBytes = new TextEncoder().encode(jsonData);
      
      // Generate random IV (Initialization Vector)
      const iv = new Uint8Array(12);
      window.crypto.getRandomValues(iv);
      
      // Encrypt the data
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        cryptoKey,
        dataBytes
      );
      
      // Combine IV and encrypted data for storage
      const combinedArray = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combinedArray.set(iv);
      combinedArray.set(new Uint8Array(encryptedBuffer), iv.length);
      
      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combinedArray));
    } catch (error) {
      console.error('Error encrypting data:', error);
      return fallbackEncodeData(data);
    }
  }
  
  /**
   * Decrypt data from storage
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @returns {Promise<any|null>} - Decrypted data
   */
  async function decryptData(encryptedData) {
    try {
      // Check if this is encrypted with Web Crypto
      if (encryptedData.startsWith('FALLBACK:')) {
        return fallbackDecodeData(encryptedData.substring(9));
      }
      
      if (!cryptoKey) {
        const initialized = await initialize();
        if (!initialized) {
          return fallbackDecodeData(encryptedData);
        }
      }
      
      // Convert from base64
      const combinedArray = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract IV and encrypted data
      const iv = combinedArray.slice(0, 12);
      const encryptedBuffer = combinedArray.slice(12);
      
      // Decrypt the data
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        cryptoKey,
        encryptedBuffer
      );
      
      // Convert bytes to string
      const decryptedText = new TextDecoder().decode(decryptedBuffer);
      
      // Parse JSON if needed
      try {
        return JSON.parse(decryptedText);
      } catch {
        return decryptedText;
      }
    } catch (error) {
      console.error('Error decrypting data:', error);
      return fallbackDecodeData(encryptedData);
    }
  }
  
  /**
   * Fallback encryption for browsers without Web Crypto support
   * @param {any} data - Data to encode
   * @returns {string} - Encoded data
   */
  function fallbackEncodeData(data) {
    try {
      // Simple encoding - not secure but better than nothing
      if (typeof data !== 'string') {
        data = JSON.stringify(data);
      }
      
      // Base64 encode the data with prefix to identify fallback method
      return 'FALLBACK:' + btoa(unescape(encodeURIComponent(data)));
    } catch (error) {
      console.error('Error in fallback encoding:', error);
      return null;
    }
  }
  
  /**
   * Fallback decryption for browsers without Web Crypto support
   * @param {string} encoded - Encoded data
   * @returns {any} - Decoded data
   */
  function fallbackDecodeData(encoded) {
    try {
      // Remove fallback prefix if present
      if (encoded.startsWith('FALLBACK:')) {
        encoded = encoded.substring(9);
      }
      
      // Decode the data
      const decoded = decodeURIComponent(escape(atob(encoded)));
      
      // Parse JSON if possible
      try {
        return JSON.parse(decoded);
      } catch {
        return decoded;
      }
    } catch (error) {
      console.error('Error in fallback decoding:', error);
      return null;
    }
  }
  
  /**
   * Store data securely
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   * @returns {Promise<boolean>} - Success status
   */
  async function setItem(key, data) {
    try {
      const encrypted = await encryptData(data);
      if (!encrypted) {
        return false;
      }
      
      localStorage.setItem(STORAGE_PREFIX + key, encrypted);
      return true;
    } catch (error) {
      console.error('SecureStorage setItem error:', error);
      return false;
    }
  }
  
  /**
   * Retrieve securely stored data
   * @param {string} key - Storage key
   * @returns {Promise<any>} - Retrieved data or null if not found
   */
  async function getItem(key) {
    try {
      const encrypted = localStorage.getItem(STORAGE_PREFIX + key);
      if (!encrypted) {
        return null;
      }
      
      return await decryptData(encrypted);
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return null;
    }
  }
  
  /**
   * Remove securely stored data
   * @param {string} key - Storage key to remove
   * @returns {Promise<boolean>} - Success status
   */
  async function removeItem(key) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return true;
    } catch (error) {
      console.error('SecureStorage removeItem error:', error);
      return false;
    }
  }
  
  /**
   * Clear all securely stored data
   * @returns {Promise<boolean>} - Success status
   */
  async function clear() {
    try {
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('SecureStorage clear error:', error);
      return false;
    }
  }
  
  // Initialize on load
  initialize().catch(error => console.error('Error during secure storage initialization:', error));
  
  // Return the public API
  return {
    setItem,
    getItem,
    removeItem,
    clear
  };
})();

// =============================================================================
// LOADING INDICATOR
// =============================================================================

/**
 * Loading Indicator Module
 * Shows/hides loading indicators for async operations
 */
export const loadingIndicator = (() => {
  // Configuration
  const config = {
    defaultDelay: 300, // ms before showing indicators
    defaultMinDuration: 500, // ms minimum time to show indicators
    useOverlay: true, // whether to use a full-page overlay for global operations
    globalIndicatorId: 'global-loading-indicator'
  };

  // Active indicators
  const activeIndicators = new Set();
  let showTimeout = null;
  let hideTimeout = null;

  /**
   * Show loading indicator
   * @param {string} message - Loading message
   * @param {string} id - Optional identifier for specific indicator
   */
  function show(message = 'Loading...', id = 'global') {
    clearTimeout(showTimeout);
    clearTimeout(hideTimeout);
    
    // Add to active indicators
    activeIndicators.add(id);
    
    // Delay showing to prevent flicker for fast operations
    showTimeout = setTimeout(() => {
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
        <div class="loading-message">${inputSanitizer.sanitizeString(message)}</div>
      `;

      // Show indicator
      indicator.style.display = 'flex';
      const overlay = document.querySelector('.loading-overlay');
      if (overlay) {overlay.style.display = 'flex';}
    }, config.defaultDelay);
  }
  
  /**
   * Hide loading indicator
   * @param {string} id - Optional identifier for specific indicator
   */
  function hide(id = 'global') {
    // Remove from active indicators
    activeIndicators.delete(id);
    
    // If there are still active indicators, don't hide the global one
    if (activeIndicators.size > 0) {
      return;
    }
    
    // Clear any pending show operations
    clearTimeout(showTimeout);
    
    // Ensure minimum display time
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      const indicator = document.getElementById(config.globalIndicatorId);
      if (!indicator) return;
      
      const overlay = document.querySelector('.loading-overlay');
      
      // Hide with fade-out animation
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.style.display = 'none';
          overlay.style.opacity = '1';
        }, 300);
      } else {
        indicator.style.opacity = '0';
        setTimeout(() => {
          indicator.style.display = 'none';
          indicator.style.opacity = '1';
        }, 300);
      }
    }, config.defaultMinDuration);
  }
  
  /**
   * Update loading message
   * @param {string} message - New loading message
   */
  function updateMessage(message) {
    const indicator = document.getElementById(config.globalIndicatorId);
    if (!indicator) return;
    
    const messageEl = indicator.querySelector('.loading-message');
    if (messageEl) {
      messageEl.textContent = inputSanitizer.sanitizeString(message);
    }
  }
  
  /**
   * Set loading progress
   * @param {number} percent - Progress percentage (0-100)
   * @param {string} stage - Current stage description
   */
  function setProgress(percent, stage = null) {
    const indicator = document.getElementById(config.globalIndicatorId);
    if (!indicator) return;
    
    // Ensure percent is between 0 and 100
    percent = Math.max(0, Math.min(100, percent));
    
    // Update or create progress bar
    let progressBar = indicator.querySelector('.progress-bar-fill');
    let progressContainer = indicator.querySelector('.progress-bar');
    
    if (!progressContainer) {
      const progressHTML = `
        <div class="progress-bar">
          <div class="progress-bar-fill"></div>
        </div>
        <div class="progress-text">
          <span class="progress-percentage">0%</span>
          ${stage ? `<span class="progress-stage">${inputSanitizer.sanitizeString(stage)}</span>` : ''}
        </div>
      `;
      
      const progressElement = document.createElement('div');
      progressElement.className = 'loading-progress';
      progressElement.innerHTML = progressHTML;
      
      indicator.appendChild(progressElement);
      
      progressBar = indicator.querySelector('.progress-bar-fill');
      progressContainer = indicator.querySelector('.progress-bar');
    }
    
    // Set progress bar width
    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }
    
    // Update percentage text
    const percentageEl = indicator.querySelector('.progress-percentage');
    if (percentageEl) {
      percentageEl.textContent = `${Math.round(percent)}%`;
      percentageEl.classList.add('animate');
      setTimeout(() => percentageEl.classList.remove('animate'), 500);
    }
    
    // Update stage text if provided
    if (stage) {
      let stageEl = indicator.querySelector('.progress-stage');
      if (!stageEl) {
        stageEl = document.createElement('span');
        stageEl.className = 'progress-stage';
        indicator.querySelector('.progress-text')?.appendChild(stageEl);
      }
      
      if (stageEl) {
        stageEl.textContent = inputSanitizer.sanitizeString(stage);
      }
    }
  }
  
  /**
   * Create CSS styles for loading indicator
   * Ensures styling is consistent with the main CSS theme
   */
  function createStyles() {
    if (document.getElementById('loading-indicator-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'loading-indicator-styles';
    style.textContent = `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: var(--z-index-modal-backdrop, 1040);
        transition: opacity 0.3s ease;
      }
      
      .loading-indicator {
        display: none;
        flex-direction: column;
        align-items: center;
        padding: 2rem;
        background-color: white;
        border-radius: var(--radius-lg, 0.5rem);
        box-shadow: var(--shadow-xl, 0 20px 25px rgba(0, 0, 0, 0.15));
        z-index: var(--z-index-modal, 1050);
        max-width: 320px;
        width: 90%;
        position: relative;
        overflow: hidden;
      }
      
      .dark-theme .loading-indicator {
        background-color: var(--card-color, #2d3748);
        color: var(--text-color, #f7fafc);
      }
      
      .loading-indicator::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 5px;
        background-image: 
          linear-gradient(to right, 
            var(--low-risk-color, #38a169),
            var(--moderate-risk-color, #dd6b20),
            var(--high-risk-color, #e53e3e));
      }
      
      .spinner {
        width: 60px;
        height: 60px;
        position: relative;
        margin-bottom: 1.5rem;
        transform-origin: center;
        animation: heartbeat 1.2s ease-in-out infinite;
      }
      
      .spinner::before,
      .spinner::after {
        content: '';
        position: absolute;
        top: 0;
        width: 30px;
        height: 50px;
        border-radius: 50px 50px 0 0;
        background: var(--heart-color, #e53e3e);
      }
      
      .spinner::before {
        left: 30px;
        transform: rotate(-45deg);
        transform-origin: 0 100%;
      }
      
      .spinner::after {
        left: 0;
        transform: rotate(45deg);
        transform-origin: 100% 100%;
      }
      
      @keyframes heartbeat {
        0%, 100% { transform: scale(0.8); }
        50% { transform: scale(1); }
      }
      
      .loading-message {
        margin-top: 1rem;
        font-weight: var(--font-weight-medium, 500);
        text-align: center;
        color: var(--text-color, #2c3e50);
      }
      
      .loading-progress {
        width: 100%;
        margin-top: 1rem;
      }
      
      .progress-bar {
        height: 8px;
        background-color: rgba(43, 108, 176, 0.1);
        border-radius: 9999px;
        overflow: hidden;
        margin-bottom: 0.5rem;
        position: relative;
      }
      
      .progress-bar-fill {
        height: 100%;
        border-radius: 9999px;
        width: 0;
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        background: linear-gradient(to right, var(--secondary-color, #2b6cb0), var(--tertiary-color, #319795));
      }
      
      .progress-bar-fill::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url("data:image/svg+xml,%3Csvg width='100' height='8' viewBox='0 0 100 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,4 L20,4 L25,0 L30,8 L35,0 L40,8 L45,4 L100,4' stroke='%23ffffff' stroke-width='1' fill='none' stroke-opacity='0.5'/%3E%3C/svg%3E");
        background-repeat: repeat-x;
        background-size: 50px 8px;
        animation: progress-pulse 1.5s infinite linear;
      }
      
      @keyframes progress-pulse {
        0% { background-position: 0px 0; }
        100% { background-position: -50px 0; }
      }
      
      .progress-text {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--text-light, #718096);
      }
      
      .progress-percentage {
        font-family: var(--font-mono, monospace);
        color: var(--secondary-color, #2b6cb0);
        font-weight: var(--font-weight-bold, 700);
        transition: transform 0.3s ease;
      }
      
      .progress-percentage.animate {
        animation: pulse-text 0.5s ease-in-out;
      }
      
      @keyframes pulse-text {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // Create styles when module is loaded
  if (typeof document !== 'undefined') {
    createStyles();
  }
  
  // Return public API
  return {
    show,
    hide,
    updateMessage,
    setProgress
  };
})();

// =============================================================================
// THEME INTEGRATION
// =============================================================================

/**
 * Theme Handler Module
 * Manages theme switching and persistence
 */
export const themeHandler = (() => {
  /**
   * Initialize theme based on saved preference or system setting
   */
  function initialize() {
    const savedTheme = localStorage.getItem('preferred-theme');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Apply saved theme if available
    if (savedTheme) {
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    } 
    // Otherwise, apply system preference
    else if (prefersDarkScheme.matches) {
      document.body.classList.add('dark-theme');
    }
    
    // Update theme toggle button if present
    updateToggleButton();
  }
  
  /**
   * Setup theme toggle button
   */
  function setupThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;
    
    // Toggle theme when button is clicked
    themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }
  
  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const isDarkTheme = document.body.classList.toggle('dark-theme');
    
    // Save preference
    localStorage.setItem('preferred-theme', isDarkTheme ? 'dark' : 'light');
    
    // Update button
    updateToggleButton();
    
    // Update charts if they exist
    if (window.riskVisualization && typeof window.riskVisualization.updateChartThemes === 'function') {
      window.riskVisualization.updateChartThemes();
    }
  }
  
  /**
   * Update theme toggle button appearance
   */
  function updateToggleButton() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;
    
    const isDarkTheme = document.body.classList.contains('dark-theme');
    
    // Update icon based on current theme
    themeToggleBtn.innerHTML = isDarkTheme ? 
      '☀️' : // Sun icon for dark mode (to switch to light)
      '🌙'; // Moon icon for light mode (to switch to dark)
    
    // Update button title/tooltip
    themeToggleBtn.title = isDarkTheme ? 
      'Switch to light theme' : 
      'Switch to dark theme';
  }
  
  /**
   * Get a CSS variable value
   * @param {string} variableName - CSS variable name
   * @param {string} fallback - Fallback value
   * @returns {string} - CSS variable value or fallback
   */
  function getCSSVariable(variableName, fallback = '') {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variableName).trim() || fallback;
  }
  
  /**
   * Get animation speed from CSS variables
   * @param {string} type - Speed type (normal, fast, slow, heartbeat)
   * @returns {number} - Animation speed in milliseconds
   */
  function getAnimationSpeed(type = 'normal') {
    const speedVar = `--animation-speed-${type}`;
    const defaultSpeed = type === 'heartbeat' ? 0.8 : 
                        type === 'fast' ? 0.2 :
                        type === 'slow' ? 0.5 : 0.3;
                        
    return parseFloat(getCSSVariable(speedVar, defaultSpeed)) * 1000;
  }
  
  // Return public API
  return {
    initialize,
    setupThemeToggle,
    toggleTheme,
    getCSSVariable,
    getAnimationSpeed
  };
})();

// =============================================================================
// RESPONSIVE DESIGN HANDLERS
// =============================================================================

/**
 * Responsive Design Handler Module
 * Manages responsive behavior and layout adjustments
 */
export const responsiveHandler = (() => {
  // Track responsive breakpoints from CSS
  const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280
  };
  
  // Current screen size category
  let currentBreakpoint = '';
  
  /**
   * Initialize responsive handlers
   */
  function initialize() {
    // Determine initial breakpoint
    updateCurrentBreakpoint();
    
    // Set up resize observer for more efficient handling than resize event
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(debounce(() => {
        const oldBreakpoint = currentBreakpoint;
        updateCurrentBreakpoint();
        
        // Only trigger actions if breakpoint changed
        if (oldBreakpoint !== currentBreakpoint) {
          handleBreakpointChange(oldBreakpoint, currentBreakpoint);
        }
        
        // Always resize charts
        resizeVisualElements();
      }, 250));
      
      resizeObserver.observe(document.body);
    } 
    // Fallback to window resize event
    else {
      window.addEventListener('resize', debounce(() => {
        const oldBreakpoint = currentBreakpoint;
        updateCurrentBreakpoint();
        
        if (oldBreakpoint !== currentBreakpoint) {
          handleBreakpointChange(oldBreakpoint, currentBreakpoint);
        }
        
        resizeVisualElements();
      }, 250));
    }
  }
  
  /**
   * Update current breakpoint based on window width
   */
  function updateCurrentBreakpoint() {
    const width = window.innerWidth;
    
    if (width < breakpoints.sm) {
      currentBreakpoint = 'xs';
    } else if (width < breakpoints.md) {
      currentBreakpoint = 'sm';
    } else if (width < breakpoints.lg) {
      currentBreakpoint = 'md';
    } else if (width < breakpoints.xl) {
      currentBreakpoint = 'lg';
    } else {
      currentBreakpoint = 'xl';
    }
    
    // Add current breakpoint as a class to body
    document.body.classList.remove('bp-xs', 'bp-sm', 'bp-md', 'bp-lg', 'bp-xl');
    document.body.classList.add(`bp-${currentBreakpoint}`);
  }
  
  /**
   * Handle breakpoint changes
   * @param {string} oldBreakpoint - Previous breakpoint
   * @param {string} newBreakpoint - New breakpoint
   */
  function handleBreakpointChange(oldBreakpoint, newBreakpoint) {
    console.log(`Breakpoint changed: ${oldBreakpoint} -> ${newBreakpoint}`);
    
    // Adjust UI elements based on breakpoint
    adjustFormsForBreakpoint(newBreakpoint);
    adjustTabsForBreakpoint(newBreakpoint);
  }
  
  /**
   * Adjust form layouts based on breakpoint
   * @param {string} breakpoint - Current breakpoint
   */
  function adjustFormsForBreakpoint(breakpoint) {
    const isSmall = breakpoint === 'xs' || breakpoint === 'sm';
    
    // Make form rows stack on small screens
    document.querySelectorAll('.form-row').forEach(row => {
      if (isSmall) {
        row.style.flexDirection = 'column';
      } else {
        row.style.flexDirection = 'row';
      }
    });
  }
  
  /**
   * Adjust tabs based on breakpoint
   * @param {string} breakpoint - Current breakpoint
   */
  function adjustTabsForBreakpoint(breakpoint) {
    const isSmall = breakpoint === 'xs' || breakpoint === 'sm';
    
    // Adjust tab container for small screens
    document.querySelectorAll('.tabs').forEach(tabs => {
      if (isSmall) {
        tabs.style.flexWrap = 'nowrap';
        tabs.style.overflowX = 'auto';
      } else {
        tabs.style.flexWrap = 'wrap';
        tabs.style.overflowX = 'visible';
      }
    });
  }
  
  /**
   * Resize visual elements like charts
   */
  function resizeVisualElements() {
    // Resize charts if visualization module is available
    if (window.riskVisualization && typeof window.riskVisualization.resizeCharts === 'function') {
      window.riskVisualization.resizeCharts();
    }
  }
  
  // Return public API
  return {
    initialize,
    getCurrentBreakpoint: () => currentBreakpoint,
    resizeVisualElements
  };
})();

// =============================================================================
// ENHANCED ERROR HANDLING
// =============================================================================

/**
 * Error Handling Module
 * Provides enhanced error tracking and user-friendly error notifications
 */
export const errorHandler = (() => {
  // Keep track of reported errors to avoid duplicates
  const reportedErrors = new Set();
  
  /**
   * Report an error with context
   * @param {Error|string} error - Error object or message
   * @param {string} context - Context where error occurred
   * @param {boolean} showNotification - Whether to show a visible notification
   */
  function reportError(error, context = 'general', showNotification = true) {
    // Convert string errors to Error objects
    if (typeof error === 'string') {
      error = new Error(error);
    }
    
    // Generate error ID to track duplicates
    const errorId = `${context}:${error.message}`;
    
    // Skip if this exact error was already reported
    if (reportedErrors.has(errorId)) {
      return;
    }
    
    // Add to reported errors
    reportedErrors.add(errorId);
    
    // Log to console
    console.error(`[${context}]`, error);
    
    // Show notification if requested
    if (showNotification) {
      showErrorNotification(error, context);
    }
    
    // Optional: send to error tracking service
    if (window.errorTrackingService) {
      window.errorTrackingService.captureError(error, { context });
    }
  }
  
  /**
   * Show a user-friendly error notification
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   */
  function showErrorNotification(error, context) {
    // Create notification element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    
    // Set content based on context
    let errorTitle, errorMessage;
    
    switch (context) {
      case 'calculation':
        errorTitle = 'Calculation Error';
        errorMessage = 'There was a problem with your risk calculation. Please check your inputs and try again.';
        break;
      case 'storage':
        errorTitle = 'Storage Error';
        errorMessage = 'Unable to save your data. Your changes may not be preserved.';
        break;
      case 'network':
        errorTitle = 'Network Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        break;
      default:
        errorTitle = 'Application Error';
        errorMessage = 'An unexpected error occurred. Please try again or reload the page.';
    }
    
    // Create error notification HTML
    errorDiv.innerHTML = `
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <div class="error-title">${inputSanitizer.sanitizeString(errorTitle)}</div>
        <div class="error-message">${inputSanitizer.sanitizeString(errorMessage)}</div>
        <div class="error-details">${inputSanitizer.sanitizeString(error.message)}</div>
      </div>
      <button class="error-close" aria-label="Close error notification">×</button>
    `;
    
    // Add to document
    document.body.appendChild(errorDiv);
    
    // Set ARIA attributes for accessibility
    errorDiv.setAttribute('role', 'alert');
    errorDiv.setAttribute('aria-live', 'assertive');
    
    // Add CSS if needed
    if (!document.getElementById('error-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'error-notification-styles';
      style.textContent = `
        .error-notification {
          position: fixed;
          bottom: 20px;
          right: 20px;
          max-width: 350px;
          background-color: white;
          border-left: 4px solid var(--error-color, #e53e3e);
          border-radius: var(--radius-md, 0.375rem);
          box-shadow: var(--shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
          padding: 16px;
          display: flex;
          align-items: flex-start;
          z-index: var(--z-index-tooltip, 1070);
          animation: slideInRight 0.3s var(--ease-out-back, cubic-bezier(0.34, 1.56, 0.64, 1));
          opacity: 0;
          transform: translateX(50px);
        }
        
        @keyframes slideInRight {
          to { opacity: 1; transform: translateX(0); }
        }
        
        .error-icon {
          font-size: 24px;
          margin-right: 12px;
          flex-shrink: 0;
        }
        
        .error-content {
          flex: 1;
        }
        
        .error-title {
          font-weight: var(--font-weight-bold, 700);
          margin-bottom: 4px;
          color: var(--error-color, #e53e3e);
        }
        
        .error-message {
          margin-bottom: 8px;
          color: var(--text-color, #2d3748);
        }
        
        .error-details {
          font-size: var(--font-size-sm, 0.875rem);
          color: var(--text-light, #718096);
          word-break: break-word;
        }
        
        .error-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: var(--gray-500, #a0aec0);
          padding: 4px;
          margin-left: 8px;
          flex-shrink: 0;
          transition: color 0.2s ease;
        }
        
        .error-close:hover {
          color: var(--gray-700, #4a5568);
        }
        
        .dark-theme .error-notification {
          background-color: var(--card-color, #2d3748);
        }
        
        .dark-theme .error-message {
          color: var(--text-color, #f7fafc);
        }
        
        .dark-theme .error-details {
          color: var(--text-light, #e2e8f0);
        }
      `;
      
      document.head.appendChild(style);
    }
    
    // Animate in
    requestAnimationFrame(() => {
      errorDiv.style.opacity = '1';
      errorDiv.style.transform = 'translateX(0)';
    });
    
    // Close button event
    const closeBtn = errorDiv.querySelector('.error-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transform = 'translateX(50px)';
        
        // Remove after animation
        setTimeout(() => {
          if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
          }
        }, 300);
      });
    }
    
    // Auto-remove after delay
    setTimeout(() => {
      errorDiv.style.opacity = '0';
      errorDiv.style.transform = 'translateX(50px)';
      
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 300);
    }, 8000);
  }
  
  /**
   * Clear all error notifications
   */
  function clearAllNotifications() {
    document.querySelectorAll('.error-notification').forEach(notification => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(50px)';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
  }
  
  // Setup global error handler
  window.addEventListener('error', (event) => {
    reportError(event.error || new Error(event.message), 'uncaught');
    // Don't prevent default - let the error propagate to console
  });
  
  // Setup promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? 
      event.reason : new Error(String(event.reason));
    reportError(error, 'promise');
  });
  
  // Return public API
  return {
    reportError,
    showErrorNotification,
    clearAllNotifications
  };
})();

// =============================================================================
// ACCESSIBILITY ENHANCEMENTS
// =============================================================================

/**
 * Accessibility Enhancement Module
 * Improves application accessibility for all users
 */
export const accessibilityEnhancer = (() => {
  /**
   * Initialize accessibility enhancements
   */
  function initialize() {
    enhanceFormAccessibility();
    setupKeyboardNavigation();
    addARIAAttributes();
    setupFocusIndicators();
  }
  
  /**
   * Enhance form element accessibility
   */
  function enhanceFormAccessibility() {
    // Add aria attributes to form elements
    document.querySelectorAll('input, select').forEach(el => {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label && !el.getAttribute('aria-labelledby')) {
        const labelId = `${el.id}-label`;
        label.id = labelId;
        el.setAttribute('aria-labelledby', labelId);
      }
      
      // Add appropriate roles
      if (el.type === 'checkbox') {
        el.setAttribute('role', 'checkbox');
      }
      
      // Add required attribute for screen readers
      if (el.required || el.classList.contains('required')) {
        el.setAttribute('aria-required', 'true');
      }
    });
    
    // Make error messages accessible
    document.querySelectorAll('.error-message').forEach(el => {
      el.setAttribute('role', 'alert');
      el.setAttribute('aria-live', 'assertive');
    });
    
    // Add error state attributes
    document.addEventListener('input', (event) => {
      if (event.target.classList.contains('error')) {
        event.target.setAttribute('aria-invalid', 'true');
        
        const errorMessage = event.target.parentElement.querySelector('.error-message') ||
                            event.target.closest('.form-group')?.querySelector('.error-message');
        
        if (errorMessage) {
          const errorId = `${event.target.id}-error`;
          errorMessage.id = errorId;
          event.target.setAttribute('aria-describedby', errorId);
        }
      } else {
        event.target.removeAttribute('aria-invalid');
      }
    });
  }
  
  /**
   * Setup keyboard navigation enhancements
   */
  function setupKeyboardNavigation() {
    // Make card headers keyboard accessible
    document.querySelectorAll('.card-header').forEach(header => {
      if (!header.hasAttribute('tabindex')) {
        header.setAttribute('tabindex', '0');
        header.setAttribute('role', 'button');
        header.setAttribute('aria-expanded', header.classList.contains('active') ? 'true' : 'false');
        
        // Add keyboard event for enter/space to toggle
        header.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            
            // Find click handler and trigger it
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            header.dispatchEvent(clickEvent);
          }
        });
      }
    });
    
    // Enhance tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
      if (!tab.hasAttribute('tabindex')) {
        tab.setAttribute('tabindex', '0');
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');
        
        // Add keyboard navigation
        tab.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            
            // Trigger click event
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            tab.dispatchEvent(clickEvent);
          }
        });
      }
    });
  }
  
  /**
   * Add ARIA attributes to improve screen reader experience
   */
  function addARIAAttributes() {
    // Add attributes to tab content sections
    document.querySelectorAll('.tab-content').forEach(content => {
      content.setAttribute('role', 'tabpanel');
      content.setAttribute('aria-hidden', content.classList.contains('active') ? 'false' : 'true');
    });
    
    // Set up tab panels
    document.querySelectorAll('.tabs').forEach(tabContainer => {
      tabContainer.setAttribute('role', 'tablist');
      
      // Connect tabs to their panels
      const tabs = tabContainer.querySelectorAll('.tab');
      const panels = document.querySelectorAll('.tab-content');
      
      tabs.forEach((tab, index) => {
        if (panels[index]) {
          const tabId = `tab-${index}`;
          const panelId = `panel-${index}`;
          
          tab.id = tabId;
          panels[index].id = panelId;
          
          tab.setAttribute('aria-controls', panelId);
          panels[index].setAttribute('aria-labelledby', tabId);
        }
      });
    });
    
    // Add attributes to collapsible sections
    document.querySelectorAll('.card-header').forEach((header, index) => {
      const body = header.nextElementSibling;
      if (body && body.classList.contains('card-body')) {
        const headerId = `card-header-${index}`;
        const bodyId = `card-body-${index}`;
        
        header.id = headerId;
        body.id = bodyId;
        
        header.setAttribute('aria-controls', bodyId);
        body.setAttribute('aria-labelledby', headerId);
        body.setAttribute('role', 'region');
      }
    });
  }
  
  /**
   * Setup visible focus indicators for keyboard navigation
   */
  function setupFocusIndicators() {
    // Add CSS for focus styles if needed
    if (!document.getElementById('focus-styles')) {
      const style = document.createElement('style');
      style.id = 'focus-styles';
      style.textContent = `
        .focus-visible:focus {
          outline: none !important;
          box-shadow: var(--shadow-outline, 0 0 0 3px rgba(66, 153, 225, 0.6)) !important;
          position: relative;
          z-index: 1;
        }
        
        /* Only show focus styles for keyboard interaction */
        .js-focus-visible :focus:not(.focus-visible) {
          outline: none;
          box-shadow: none;
        }
        
        .skip-to-content {
          position: absolute;
          left: -9999px;
          top: auto;
          width: 1px;
          height: 1px;
          overflow: hidden;
          z-index: -999;
        }
        
        .skip-to-content:focus {
          left: 0;
          top: 0;
          width: auto;
          height: auto;
          padding: 8px 16px;
          background-color: var(--secondary-color, #2b6cb0);
          color: white;
          font-weight: 600;
          z-index: 9999;
          text-decoration: none;
        }
      `;
      
      document.head.appendChild(style);
    }
    
    // Add a skip to content link for keyboard users
    if (!document.querySelector('.skip-to-content')) {
      const skipLink = document.createElement('a');
      skipLink.href = '#main';
      skipLink.className = 'skip-to-content';
      skipLink.textContent = 'Skip to main content';
      
      document.body.insertBefore(skipLink, document.body.firstChild);
      
      // Ensure main content has an ID to link to
      const mainContent = document.querySelector('.main-content');
      if (mainContent && !mainContent.id) {
        mainContent.id = 'main';
      }
    }
    
    // Mark all interactive elements as focusable
    document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex="0"]')
      .forEach(el => {
        el.classList.add('focus-visible');
      });
  }
  
  // Return public API
  return {
    initialize,
    enhanceFormAccessibility,
    setupKeyboardNavigation
  };
})();

// =============================================================================
// PRINT HANDLING
// =============================================================================

/**
 * Print Handler Module
 * Manages print functionality with enhanced formatting
 */
export const printHandler = (() => {
  /**
   * Setup print buttons and functionality
   */
  function initialize() {
    const printButtons = document.querySelectorAll('.print-button');
    
    printButtons.forEach(button => {
      button.addEventListener('click', () => {
        preparePrint();
      });
    });
    
    // Listen for print media query changes
    if (window.matchMedia) {
      const mediaQueryList = window.matchMedia('print');
      mediaQueryList.addEventListener('change', (mql) => {
        if (mql.matches) {
          // Print mode is active
          onBeforePrint();
        } else {
          // Print mode is complete
          onAfterPrint();
        }
      });
    }
    
    // Fallback for browsers that don't support media query listeners
    window.onbeforeprint = onBeforePrint;
    window.onafterprint = onAfterPrint;
  }
  
  /**
   * Prepare document for printing
   */
  function preparePrint() {
    // Add temporary print-specific classes
    document.body.classList.add('preparing-print');
    
    // Expand all collapsed sections for printing
    expandAllSections();
    
    // Wait a moment for sections to expand
    setTimeout(() => {
      window.print();
      
      // Remove temporary classes after print dialog
      setTimeout(() => {
        document.body.classList.remove('preparing-print');
        restoreCollapsedSections();
      }, 1000);
    }, 300);
  }
  
  /**
   * Expand all collapsible sections for printing
   */
  function expandAllSections() {
    // Store original states to restore later
    const sections = [];
    
    document.querySelectorAll('.card').forEach(card => {
      const header = card.querySelector('.card-header');
      const body = card.querySelector('.card-body');
      
      if (header && body) {
        const wasActive = header.classList.contains('active');
        
        // Store original state
        sections.push({
          card,
          header,
          body,
          wasActive
        });
        
        // Expand section
        if (!wasActive) {
          card.classList.add('temp-expanded');
          body.style.display = 'block';
          body.style.height = 'auto';
          body.style.opacity = '1';
          body.style.transform = 'none';
        }
      }
    });
    
    // Store sections data for restoration
    window.expandedSectionsData = sections;
  }
  
  /**
   * Restore collapsed sections after printing
   */
  function restoreCollapsedSections() {
    const sections = window.expandedSectionsData || [];
    
    sections.forEach(section => {
      if (!section.wasActive) {
        section.card.classList.remove('temp-expanded');
        section.body.style.display = 'none';
      }
    });
    
    // Clear stored data
    window.expandedSectionsData = null;
  }
  
  /**
   * Handle actions before printing starts
   */
  function onBeforePrint() {
    // Same actions as preparePrint but without triggering print
    document.body.classList.add('printing');
    expandAllSections();
  }
  
  /**
   * Handle actions after printing completes
   */
  function onAfterPrint() {
    document.body.classList.remove('printing');
    restoreCollapsedSections();
  }
  
  // Return public API
  return {
    initialize,
    preparePrint
  };
})();

// =============================================================================
// PWA SUPPORT
// =============================================================================

/**
 * Progressive Web App Support Module
 * Handles service worker registration and PWA functionality
 */
export const pwaSupport = (() => {
  /**
   * Register service worker for offline support
   * @returns {Promise<boolean>} - Whether registration was successful
   */
  async function registerServiceWorker() {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service workers are not supported in this browser');
        return false;
      }
      
      // Check if already registered
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('Service worker already registered');
        return true;
      }
      
      // Register the service worker
      const reg = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      console.log('Service worker registration successful with scope: ', reg.scope);
      return true;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return false;
    }
  }
  
  /**
   * Setup installation prompt handling
   */
  function setupInstallPrompt() {
    let deferredPrompt;
    
    // Save the install prompt event for later use
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      
      // Show install button or notification if available
      const installButton = document.getElementById('install-app-button');
      if (installButton) {
        installButton.style.display = 'block';
        
        installButton.addEventListener('click', async () => {
          if (!deferredPrompt) return;
          
          // Show the install prompt
          deferredPrompt.prompt();
          
          // Wait for the user to respond to the prompt
          const choiceResult = await deferredPrompt.userChoice;
          
          // Reset the deferred prompt variable
          deferredPrompt = null;
          
          // Hide the install button
          installButton.style.display = 'none';
          
          console.log('User installation choice:', choiceResult.outcome);
        });
      }
    });
    
    // Handle successful installation
    window.addEventListener('appinstalled', (evt) => {
      console.log('Application was installed');
      // Hide install button if present
      const installButton = document.getElementById('install-app-button');
      if (installButton) {
        installButton.style.display = 'none';
      }
    });
  }
  
  /**
   * Check for service worker updates
   * @returns {Promise<boolean>} - Whether updates were found and applied
   */
  async function checkForUpdates() {
    try {
      if (!('serviceWorker' in navigator)) {
        return false;
      }
      
      // Get the registration
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return false;
      }
      
      // Check for updates
      await registration.update();
      
      if (registration.waiting) {
        // Show update notification
        showUpdateNotification(registration);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  }
  
  /**
   * Show update notification and handle update application
   * @param {ServiceWorkerRegistration} registration - Service worker registration
   */
  function showUpdateNotification(registration) {
    // Create notification if it doesn't exist
    let updateNotification = document.getElementById('update-notification');
    
    if (!updateNotification) {
      updateNotification = document.createElement('div');
      updateNotification.id = 'update-notification';
      updateNotification.className = 'update-notification';
      
      updateNotification.innerHTML = `
        <div class="update-message">
          <strong>Update Available</strong>
          <p>A new version of the app is available.</p>
        </div>
        <div class="update-actions">
          <button id="apply-update-button" class="update-button">Update Now</button>
          <button id="dismiss-update-button" class="dismiss-button">Later</button>
        </div>
      `;
      
      document.body.appendChild(updateNotification);
      
      // Add CSS if needed
      if (!document.getElementById('update-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'update-notification-styles';
        style.textContent = `
          .update-notification {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background-color: white;
            border-radius: var(--radius-md, 0.375rem);
            box-shadow: var(--shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
            padding: 16px;
            z-index: var(--z-index-tooltip, 1070);
            max-width: 320px;
            border-left: 4px solid var(--info-color, #3182ce);
            animation: slideInUp 0.3s var(--ease-pulse);
          }
          
          @keyframes slideInUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          .update-message {
            margin-bottom: 12px;
          }
          
          .update-message strong {
            display: block;
            font-weight: var(--font-weight-bold, 700);
            margin-bottom: 4px;
            color: var(--info-color, #3182ce);
          }
          
          .update-actions {
            display: flex;
            gap: 8px;
          }
          
          .update-button {
            padding: 6px 12px;
            background-color: var(--info-color, #3182ce);
            color: white;
            border: none;
            border-radius: var(--radius-md, 0.375rem);
            font-weight: var(--font-weight-medium, 500);
            cursor: pointer;
            transition: background-color 0.2s ease;
          }
          
          .update-button:hover {
            background-color: var(--primary-color, #2c5282);
          }
          
          .dismiss-button {
            padding: 6px 12px;
            background-color: transparent;
            color: var(--text-light, #718096);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: var(--radius-md, 0.375rem);
            cursor: pointer;
            transition: background-color 0.2s ease;
          }
          
          .dismiss-button:hover {
            background-color: var(--background-secondary, #f0f5fa);
          }
          
          .dark-theme .update-notification {
            background-color: var(--card-color, #2d3748);
            color: var(--text-color, #f7fafc);
          }
          
          .dark-theme .dismiss-button {
            color: var(--text-light, #e2e8f0);
            border-color: var(--border-color, #4a5568);
          }
          
          .dark-theme .dismiss-button:hover {
            background-color: rgba(255, 255, 255, 0.05);
          }
        `;
        
        document.head.appendChild(style);
      }
      
      // Handle button clicks
      const applyButton = updateNotification.querySelector('#apply-update-button');
      const dismissButton = updateNotification.querySelector('#dismiss-update-button');
      
      if (applyButton) {
        applyButton.addEventListener('click', () => {
          // Skip waiting to activate the new service worker
          if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          
          // Reload the page
          window.location.reload();
        });
      }
      
      if (dismissButton) {
        dismissButton.addEventListener('click', () => {
          if (updateNotification.parentNode) {
            updateNotification.parentNode.removeChild(updateNotification);
          }
        });
      }
    }
  }
  
  /**
   * Create service worker script content
   * @returns {string} - Service worker JavaScript content
   */
  function generateServiceWorkerContent() {
    return `
// Service Worker for CVD Risk Toolkit
const CACHE_NAME = 'cvd-risk-toolkit-v1.3.2';
const ASSETS = ${JSON.stringify(APP_ASSETS)};

// Install event - cache app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(ASSETS);
      })
      .catch((error) => {
        console.error('Error caching assets:', error);
      })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim clients immediately
  return self.clients.claim();
});

// Listen for message to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return cached response
        if (response) {
          return response;
        }
        
        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Invalid response or non-GET request
          if (!response || response.status !== 200 || response.type !== 'basic' || event.request.method !== 'GET') {
            return response;
          }
          
          // Clone the response because it's a one-time use stream
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              // Store response in cache
              cache.put(event.request, responseToCache);
            })
            .catch(error => {
              console.error('Error caching response:', error);
            });
            
          return response;
        });
      })
      .catch(error => {
        console.error('Fetch error:', error);
        // Optionally return a custom offline page here
        // return caches.match('/offline.html');
      })
  );
});

// Handle background sync for offline calculations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-saved-calculations') {
    event.waitUntil(syncSavedCalculations());
  }
});

// Function to sync saved calculations with server
async function syncSavedCalculations() {
  // In a real app, we'd sync with a server here
  // For this app, we're using local storage, so no action needed
  console.log('Background sync completed for saved calculations');
  return true;
}
    `;
  }
})();

// =============================================================================
// PWA SUPPORT
// =============================================================================

/**
 * Progressive Web App Support Module
 * Handles service worker registration and PWA functionality
 */
export const pwaSupport = (() => {
  /**
   * Register service worker for offline support
   * @returns {Promise<boolean>} - Whether registration was successful
   */
  async function registerServiceWorker() {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service workers are not supported in this browser');
        return false;
      }
      
      // Check if already registered
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('Service worker already registered');
        return true;
      }
      
      // Register the service worker
      const reg = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      console.log('Service worker registration successful with scope: ', reg.scope);
      return true;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return false;
    }
  }
  
  /**
   * Setup installation prompt handling
   */
  function setupInstallPrompt() {
    let deferredPrompt;
    
    // Save the install prompt event for later use
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      
      // Show install button or notification if available
      const installButton = document.getElementById('install-app-button');
      if (installButton) {
        installButton.style.display = 'block';
        
        installButton.addEventListener('click', async () => {
          if (!deferredPrompt) return;
          
          // Show the install prompt
          deferredPrompt.prompt();
          
          // Wait for the user to respond to the prompt
          const choiceResult = await deferredPrompt.userChoice;
          
          // Reset the deferred prompt variable
          deferredPrompt = null;
          
          // Hide the install button
          installButton.style.display = 'none';
          
          console.log('User installation choice:', choiceResult.outcome);
        });
      }
    });
    
    // Handle successful installation
    window.addEventListener('appinstalled', (evt) => {
      console.log('Application was installed');
      // Hide install button if present
      const installButton = document.getElementById('install-app-button');
      if (installButton) {
        installButton.style.display = 'none';
      }
    });
  }
  
  /**
   * Check for service worker updates
   * @returns {Promise<boolean>} - Whether updates were found and applied
   */
  async function checkForUpdates() {
    try {
      if (!('serviceWorker' in navigator)) {
        return false;
      }
      
      // Get the registration
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return false;
      }
      
      // Check for updates
      await registration.update();
      
      if (registration.waiting) {
        // Show update notification
        showUpdateNotification(registration);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  }
  
  /**
   * Show update notification and handle update application
   * @param {ServiceWorkerRegistration} registration - Service worker registration
   */
  function showUpdateNotification(registration) {
    // Create notification if it doesn't exist
    let updateNotification = document.getElementById('update-notification');
    
    if (!updateNotification) {
      updateNotification = document.createElement('div');
      updateNotification.id = 'update-notification';
      updateNotification.className = 'update-notification';
      
      updateNotification.innerHTML = `
        <div class="update-message">
          <strong>Update Available</strong>
          <p>A new version of the app is available.</p>
        </div>
        <div class="update-actions">
          <button id="apply-update-button" class="update-button">Update Now</button>
          <button id="dismiss-update-button" class="dismiss-button">Later</button>
        </div>
      `;
      
      document.body.appendChild(updateNotification