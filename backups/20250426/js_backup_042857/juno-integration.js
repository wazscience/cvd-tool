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