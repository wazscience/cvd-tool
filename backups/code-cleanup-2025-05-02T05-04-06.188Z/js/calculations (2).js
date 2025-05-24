/**
 * calculations.js
 * Core calculation functions for CVD Risk Toolkit
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
  } else {
  // Linear increase 1.0-1.3x for 30-50 mg/dL
  else if (lpaValue >= 30 && lpaValue < 50) {
    return 1.0 + (lpaValue - 30) * (0.3 / 20);
  } else {
  // Linear increase 1.3-1.6x for 50-100 mg/dL
  else if (lpaValue >= 50 && lpaValue < 100) {
    return 1.3 + (lpaValue - 50) * (0.3 / 50);
  } else {
  // Linear increase 1.6-2.0x for 100-200 mg/dL
  else if (lpaValue >= 100 && lpaValue < 200) {
    return 1.6 + (lpaValue - 100) * (0.4 / 100);
  } else {
  // Linear increase 2.0-3.0x for 200-300 mg/dL
  else if (lpaValue >= 200 && lpaValue < 300) {
    return 2.0 + (lpaValue - 200) * (1.0 / 100);
  } else {
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
 * Calculates Framingham Risk Score
 * @param {Object} data - Validated data from the FRS form
 * @returns {Object} - Risk calculation results
 */
function calculateFraminghamRiskScore(data) {
  // Convert units if needed
  let totalChol = data.totalChol;
  let hdl = data.hdl;

  if (data.totalCholUnit === 'mg/dL') {
    totalChol = convertCholesterol(totalChol, 'mg/dL', 'mmol/L');
  }

  if (data.hdlUnit === 'mg/dL') {
    hdl = convertCholesterol(hdl, 'mg/dL', 'mmol/L');
  }

  const lnAge = Math.log(data.age);
  const lnTotalChol = Math.log(totalChol);
  const lnHdl = Math.log(hdl);
  const lnSbp = Math.log(data.sbp);

  let risk;

  if (data.sex === 'male') {
    // Coefficients for men
    risk = (lnAge * 3.11296) +
               (lnTotalChol * 1.12370) -
               (lnHdl * 0.93263) +
               (lnSbp * (data.bpTreatment ? 1.99881 : 1.93303)) +
               (data.smoker ? 0.65451 : 0) +
               (data.diabetes ? 0.57367 : 0) -
               23.9802;
  } else {
    // Coefficients for women
    risk = (lnAge * 2.72107) +
               (lnTotalChol * 1.20904) -
               (lnHdl * 0.70833) +
               (lnSbp * (data.bpTreatment ? 2.82263 : 2.76157)) +
               (data.smoker ? 0.52873 : 0) +
               (data.diabetes ? 0.69154 : 0) -
               26.1931;
  }

  // Calculate 10-year risk
  const baselineSurvival = data.sex === 'male' ? 0.88431 : 0.94833;
  const tenYearRisk = 1 - Math.pow(baselineSurvival, Math.exp(risk));
  const riskPercentage = tenYearRisk * 100;

  // Apply Lp(a) modifier if available
  let modifiedRiskPercentage = riskPercentage;
  let lpaModifier = 1.0;

  if (data.lpa !== null) {
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
 * Calculates QRISK3 score (simplified version)
 * @param {Object} data - Validated data from the QRISK form
 * @returns {Object} - Risk calculation results
 */
function calculateQRISK3Score(data) {
  // Convert units if needed
  let totalChol = data.totalChol;
  let hdl = data.hdl;

  if (data.totalCholUnit === 'mg/dL') {
    totalChol = convertCholesterol(totalChol, 'mg/dL', 'mmol/L');
  }

  if (data.hdlUnit === 'mg/dL') {
    hdl = convertCholesterol(hdl, 'mg/dL', 'mmol/L');
  }

  // Calculate cholesterol ratio
  const cholRatio = totalChol / hdl;

  // Process smoking status
  let smokerScore;
  switch (data.smoker) {
    case 'non': smokerScore = 0; break;
    case 'ex': smokerScore = 1; break;
    case 'light': smokerScore = 2; break;
    case 'moderate': smokerScore = 3; break;
    case 'heavy': smokerScore = 4; break;
    default: smokerScore = 0;
  }

  // Process ethnicity risk factor
  let ethnicityFactor;
  switch (data.ethnicity) {
    case 'white': ethnicityFactor = 1.0; break;
    case 'indian': ethnicityFactor = 1.3; break;
    case 'pakistani': ethnicityFactor = 1.4; break;
    case 'bangladeshi': ethnicityFactor = 1.5; break;
    case 'other_asian': ethnicityFactor = 1.2; break;
    case 'black_caribbean': ethnicityFactor = 0.85; break;
    case 'black_african': ethnicityFactor = 0.75; break;
    case 'chinese': ethnicityFactor = 0.7; break;
    case 'other': ethnicityFactor = 0.95; break;
    default: ethnicityFactor = 1.0;
  }

  // Base risk based on age and sex
  let baseRisk;
  if (data.sex === 'male') {
    baseRisk = (data.age - 25) * 0.79;
  } else {
    baseRisk = (data.age - 25) * 0.53;
  }

  // Adjust for BMI
  let bmiAdjustment = 0;
  if (data.bmi) {
    if (data.bmi < 20) {
      bmiAdjustment = -0.5;
    } else if (data.bmi >= 25 && data.bmi < 30) {
      bmiAdjustment = 1.5;
    } else if (data.bmi >= 30) {
      bmiAdjustment = 2.5;
    }
  }

  // Adjust for systolic BP
  let sbpAdjustment = 0;
  if (data.sbp < 120) {
    sbpAdjustment = -0.5;
  } else if (data.sbp >= 140) {
    sbpAdjustment = 1.5 + (data.sbpSd ? data.sbpSd / 10 : 0);
  }

  // Adjust for cholesterol ratio
  let cholAdjustment = 0;
  if (cholRatio > 4) {
    cholAdjustment = (cholRatio - 4) * 0.5;
  }

  // Adjust for smoking
  const smokerAdjustment = smokerScore * 0.65;

  // Adjust for diabetes
  let diabetesAdjustment = 0;
  if (data.diabetes === 'type1') {
    diabetesAdjustment = 4.2;
  } else if (data.diabetes === 'type2') {
    diabetesAdjustment = 2.8;
  }

  // Adjust for family history
  const familyHistoryAdjustment = data.familyHistory ? 1.6 : 0;

  // Adjust for medical conditions
  let medicalAdjustment = 0;
  if (data.atrialFibrillation) {medicalAdjustment += 2.0;}
  if (data.rheumatoidArthritis) {medicalAdjustment += 1.5;}
  if (data.chronicKidneyDisease) {medicalAdjustment += 1.8;}

  // Calculate total risk percentage
  let riskPercentage = baseRisk + bmiAdjustment + sbpAdjustment +
                        cholAdjustment + smokerAdjustment +
                        diabetesAdjustment + familyHistoryAdjustment +
                        medicalAdjustment;

  // Apply ethnicity factor
  riskPercentage *= ethnicityFactor;

  // Ensure risk is within reasonable bounds
  riskPercentage = Math.max(0, Math.min(riskPercentage, 99));

  // Apply Lp(a) modifier if available
  let modifiedRiskPercentage = riskPercentage;
  let lpaModifier = 1.0;

  if (data.lpa !== null) {
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
 * Calculate SBP standard deviation from multiple readings
 * @param {string} prefix - Prefix for input field IDs (frs or qrisk)
 */
function calculateSBPStandardDeviation(prefix) {
  // Get the readings
  const readings = [];
  for (let i = 1; i <= 6; i++) {
    const reading = parseFloat(document.getElementById(`${prefix}-sbp-reading-${i}`).value);
    if (!isNaN(reading)) {
      readings.push(reading);
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
  document.getElementById(`${prefix}-sbp-sd-result`).style.display = 'block';
  document.getElementById(`${prefix}-sbp-sd-result`).textContent =
        `Standard Deviation: ${standardDeviation.toFixed(1)} mmHg (from ${readings.length} readings)`;

  document.getElementById(`${prefix}-sbp-sd`).value = standardDeviation.toFixed(1);
}

/**
 * Calculates Framingham Risk Score and displays results
 */
function calculateFRS() {
  const result = validateFRSForm();

  if (!result.isValid) {
    displayErrors(result.errors);
    return;
  }

  const data = result.data;
  const results = calculateFraminghamRiskScore(data);

  // Get LDL value for treatment recommendations if available
  let ldlValue = null;
  if (data.ldl !== null) {
    ldlValue = data.ldl;
    if (data.ldlUnit === 'mg/dL') {
      ldlValue = convertCholesterol(ldlValue, 'mg/dL', 'mmol/L');
    }
  }

  // Get treatment recommendations
  const recommendations = getCCSRecommendation(
    results.modifiedRisk,
    ldlValue,
    data.diabetes,
    data.age
  );

  displayFRSResults(data, results, recommendations);

  // Dispatch event with risk data for cross-tab sharing
  document.dispatchEvent(new CustomEvent('risk-calculated', {
    detail: {
      riskScore: results.modifiedRisk,
      calculator: 'FRS'
    }
  }));

  // Update the comparison tab status
  updateComparisonTabStatus('frs', true);
}

/**
 * Calculates QRISK3 score and displays results
 */
function calculateQRISK() {
  const result = validateQRISKForm();

  if (!result.isValid) {
    displayErrors(result.errors);
    return;
  }

  const data = result.data;
  const results = calculateQRISK3Score(data);

  // Get LDL value for treatment recommendations if available
  let ldlValue = null;
  if (data.ldl !== null) {
    ldlValue = data.ldl;
    if (data.ldlUnit === 'mg/dL') {
      ldlValue = convertCholesterol(ldlValue, 'mg/dL', 'mmol/L');
    }
  }

  // Get treatment recommendations
  const recommendations = getCCSRecommendation(
    results.modifiedRisk,
    ldlValue,
    data.diabetes !== 'none',
    data.age
  );

  displayQRISKResults(data, results, recommendations);

  // Dispatch event with risk data for cross-tab sharing
  document.dispatchEvent(new CustomEvent('risk-calculated', {
    detail: {
      riskScore: results.modifiedRisk,
      calculator: 'QRISK3'
    }
  }));

  // Update the comparison tab status
  updateComparisonTabStatus('qrisk', true);
}

/**
 * Calculates both FRS and QRISK3 scores and displays results
 */
function calculateBoth() {
  // First check if both calculators have been filled in
  const frsStatus = document.getElementById('frs-status').textContent;
  const qriskStatus = document.getElementById('qrisk-status').textContent;

  if (frsStatus === 'Not completed' || qriskStatus === 'Not completed') {
    showModal('Please complete both the FRS and QRISK3 calculators before comparing results.');
    return;
  }

  const frsResult = validateFRSForm();
  const qriskResult = validateQRISKForm();

  const errors = [...frsResult.errors, ...qriskResult.errors];

  if (errors.length > 0) {
    displayErrors(errors);
    return;
  }

  const frsData = frsResult.data;
  const qriskData = qriskResult.data;

  // Calculate FRS
  const frsResults = calculateFraminghamRiskScore(frsData);

  // Calculate QRISK3
  const qriskResults = calculateQRISK3Score(qriskData);

  // Use the higher of the two risks for recommendations
  const highestRisk = Math.max(frsResults.modifiedRisk, qriskResults.modifiedRisk);

  // Get LDL value for treatment recommendations
  let ldlValue = null;
  if (frsData.ldl !== null) {
    ldlValue = frsData.ldl;
    if (frsData.ldlUnit === 'mg/dL') {
      ldlValue = convertCholesterol(ldlValue, 'mg/dL', 'mmol/L');
    }
  } else if (qriskData.ldl !== null) {
    ldlValue = qriskData.ldl;
    if (qriskData.ldlUnit === 'mg/dL') {
      ldlValue = convertCholesterol(ldlValue, 'mg/dL', 'mmol/L');
    }
  }

  // Get treatment recommendations based on highest risk
  const hasDiabetes = frsData.diabetes || qriskData.diabetes !== 'none';
  const recommendations = getCCSRecommendation(
    highestRisk,
    ldlValue,
    hasDiabetes,
    frsData.age
  );

  displayComparisonResults(frsData, frsResults, qriskData, qriskResults, recommendations);

  // Dispatch event with highest risk data for cross-tab sharing
  document.dispatchEvent(new CustomEvent('risk-calculated', {
    detail: {
      riskScore: highestRisk,
      calculator: 'Combined'
    }
  }));
}

/**
 * Update the status display on the comparison tab
 * @param {string} calculator - 'frs' or 'qrisk'
 * @param {boolean} completed - Whether the calculator has been completed
 */
function updateComparisonTabStatus(calculator, completed) {
  const statusElement = document.getElementById(`${calculator}-status`);
  const iconElement = document.getElementById(`${calculator}-status-icon`);

  if (statusElement && iconElement) {
    if (completed) {
      statusElement.textContent = 'Completed';
      statusElement.classList.add('status-complete');

      // Update icon to checkmark
      iconElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>';
      iconElement.classList.add('status-icon-complete');
    } else {
      statusElement.textContent = 'Not completed';
      statusElement.classList.remove('status-complete');

      // Update icon to X
      iconElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>';
      iconElement.classList.remove('status-icon-complete');
    }
  }
}

/**
 * Determine treatment recommendation based on CCS guidelines and risk score
 * @param {number} riskScore - 10-year CVD risk percentage
 * @param {number} ldl - LDL cholesterol value (if available)
 * @param {boolean} hasDiabetes - Whether patient has diabetes
 * @param {number} age - Patient age
 * @returns {string} - HTML-formatted treatment recommendation
 */
function getCCSRecommendation(riskScore, ldl = null, hasDiabetes = false, age = null) {
  // Determine if Lp(a) is elevated based on global variables or DOM elements
  let hasHighLpa = false;

  // Try to get Lp(a) value from FRS form
  const frsLpa = document.getElementById('frs-lpa');
  if (frsLpa && frsLpa.value) {
    let lpaValue = parseFloat(frsLpa.value);
    const lpaUnit = document.getElementById('frs-lpa-unit').value;

    if (lpaUnit === 'nmol/L') {
      lpaValue = convertLpa(lpaValue, 'nmol/L', 'mg/dL');
    }

    hasHighLpa = lpaValue >= 50; // 50 mg/dL threshold for "elevated"
  }

  // If not found in FRS form, try QRISK form
  if (!hasHighLpa) {
    const qriskLpa = document.getElementById('qrisk-lpa');
    if (qriskLpa && qriskLpa.value) {
      let lpaValue = parseFloat(qriskLpa.value);
      const lpaUnit = document.getElementById('qrisk-lpa-unit').value;

      if (lpaUnit === 'nmol/L') {
        lpaValue = convertLpa(lpaValue, 'nmol/L', 'mg/dL');
      }

      hasHighLpa = lpaValue >= 50; // 50 mg/dL threshold for "elevated"
    }
  }

  // Get enhanced recommendations that include rationales
  const recommendations = {
    statinChange: null,
    ezetimibeChange: null,
    pcsk9Change: null,
    otherChanges: [],
    nonPharmacological: [
      'Reinforce therapeutic lifestyle changes including Mediterranean or DASH diet',
      'Encourage regular physical activity (150+ minutes/week of moderate activity)',
      'Smoking cessation for all smokers'
    ]
  };

  // High risk (≥20%)
  if (riskScore >= 20) {
    recommendations.statinChange = 'High-intensity statin therapy is strongly recommended';

    if (ldl !== null && ldl >= 1.8) {
      recommendations.ezetimibeChange = 'Add ezetimibe if LDL-C remains ≥1.8 mmol/L despite maximum statin';

      if (ldl >= 2.5) {
        recommendations.pcsk9Change = 'Consider PCSK9 inhibitor if LDL-C remains ≥2.5 mmol/L despite maximum tolerated statin plus ezetimibe';
      }
    }

    if (hasHighLpa) {
      recommendations.otherChanges.push('More aggressive LDL-C targets may be beneficial with elevated Lp(a)');
    }
  } else {
  // Intermediate risk (10-19.9%)
  else if (riskScore >= 10) {
    if (ldl !== null && ldl >= 3.5) {
      recommendations.statinChange = 'Statin therapy recommended as LDL-C ≥3.5 mmol/L';
    } else if (hasDiabetes && age >= 40) {
      recommendations.statinChange = 'Statin therapy recommended for diabetes patients ≥40 years';
    } else {
      recommendations.statinChange = 'Consider moderate to high-intensity statin therapy';
    }

    if (ldl !== null && ldl >= 2.0) {
      recommendations.ezetimibeChange = 'Consider adding ezetimibe if LDL-C remains ≥2.0 mmol/L despite statin';
    }
  } else {
  // Low risk (<10%)
  else {
    if (ldl !== null && ldl >= 5.0) {
      recommendations.statinChange = 'Consider statin therapy as LDL-C ≥5.0 mmol/L';
      recommendations.otherChanges.push('Consider referral for genetic testing for familial hypercholesterolemia');
    } else {
      recommendations.statinChange = 'Pharmacotherapy generally not recommended';
    }
  }

  const targets = {
    riskCategory: riskScore >= 20 ? 'High Risk' : (riskScore >= 10 ? 'Intermediate Risk' : 'Low Risk'),
    hasElevatedLpa: hasHighLpa
  };

  const assessment = {
    atLDLTarget: ldl !== null ? (ldl < (riskScore >= 20 ? 1.8 : 2.0)) : false,
    gapToLDLTarget: ldl !== null ? (ldl - (riskScore >= 20 ? 1.8 : 2.0)) : 0
  };

  // Return formatted recommendations
  return getFormattedRecommendations(recommendations, targets, assessment);
}

/**
 * Format recommendations with guideline citations and rationales
 * @param {Object} recommendations - Treatment recommendations
 * @param {Object} targets - Target levels
 * @param {Object} assessment - Current therapy assessment
 * @returns {string} - Formatted HTML for recommendations
 */
function getFormattedRecommendations(recommendations, targets, assessment) {
  let html = '';

  // Statin recommendations with guideline support
  if (recommendations.statinChange) {
    html += `<div class="recommendation-item">
            <p><strong>Statin Therapy:</strong> ${recommendations.statinChange}</p>
            <div class="guideline-rationale">
                <p><strong>Guideline Rationale:</strong> `;

    if (recommendations.statinChange.includes('high-intensity')) {
      html += `CCS Guidelines recommend high-intensity statin therapy for patients with LDL-C ≥3.5 mmol/L, 
                    established ASCVD, or high cardiovascular risk. High-intensity statin therapy is associated with 
                    ≥50% reduction in LDL-C <span class="evidence-quality high">High-Quality Evidence</span>`;
    } else if (recommendations.statinChange.includes('moderate-intensity')) {
      html += `CCS Guidelines recommend moderate-intensity statin therapy for intermediate risk patients 
                    to achieve 30-50% reduction in LDL-C <span class="evidence-quality moderate">Moderate-Quality Evidence</span>`;
    } else if (recommendations.statinChange.includes('not recommended')) {
      html += `CCS Guidelines recommend pharmacotherapy only for specific indications in low-risk patients, 
                    emphasizing lifestyle modifications as primary preventive strategy 
                    <span class="evidence-quality high">High-Quality Evidence</span>`;
    }

    html += `</p>
            </div>
        </div>`;
  }

  // Ezetimibe recommendations with guideline support
  if (recommendations.ezetimibeChange) {
    html += `<div class="recommendation-item">
            <p><strong>Ezetimibe:</strong> ${recommendations.ezetimibeChange}</p>
            <div class="guideline-rationale">
                <p><strong>Guideline Rationale:</strong> CCS Guidelines recommend adding ezetimibe for patients not at target 
                despite maximum tolerated statin therapy. Ezetimibe typically provides an additional 15-25% 
                reduction in LDL-C <span class="evidence-quality high">High-Quality Evidence</span>`;

    if (!assessment.atLDLTarget) {
      html += ` Current LDL-C of ${assessment.gapToLDLTarget.toFixed(2)} mmol/L above target.`;
    }

    html += `</p>
            </div>
        </div>`;
  }

  // PCSK9 inhibitor recommendations with guideline support
  if (recommendations.pcsk9Change) {
    html += `<div class="recommendation-item">
            <p><strong>PCSK9 Inhibitor:</strong> ${recommendations.pcsk9Change}</p>
            <div class="guideline-rationale">
                <p><strong>Guideline Rationale:</strong> CCS Guidelines recommend considering PCSK9 inhibitors for 
                patients with established ASCVD, FH, or high cardiovascular risk who have not achieved target LDL-C 
                despite maximum tolerated statin and ezetimibe therapy <span class="evidence-quality high">High-Quality Evidence</span>. 
                PCSK9 inhibitors typically reduce LDL-C by an additional 50-60%.`;

    if (targets.riskCategory.includes('High')) {
      html += ` For ${targets.riskCategory} patients, more aggressive LDL-C lowering provides additional 
                    benefit (CCS Guidelines 2021).`;
    }

    html += `</p>
            </div>
        </div>`;
  }

  // Additional recommendations
  if (recommendations.otherChanges.length > 0) {
    html += `<div class="recommendation-item">
            <p><strong>Additional Recommendations:</strong></p>
            <ul>
                ${recommendations.otherChanges.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
            <div class="guideline-rationale">
                <p><strong>Guideline Rationale:</strong> `;

    if (recommendations.otherChanges.some(rec => rec.includes('Lp(a)'))) {
      html += `CCS Guidelines recognize elevated Lp(a) (≥50 mg/dL or ≥100 nmol/L) as an independent risk 
                    factor warranting more aggressive LDL-C targets and family screening 
                    <span class="evidence-quality moderate">Moderate-Quality Evidence</span>. `;
    }

    if (recommendations.otherChanges.some(rec => rec.includes('genetic'))) {
      html += `LDL-C ≥5.0 mmol/L may indicate familial hypercholesterolemia, which requires specific 
                    management and family screening <span class="evidence-quality high">High-Quality Evidence</span>. `;
    }

    html += `</p>
            </div>
        </div>`;
  }

  // Non-pharmacological recommendations
  if (recommendations.nonPharmacological.length > 0) {
    html += `<div class="recommendation-item">
            <p><strong>Non-Pharmacological Therapy:</strong></p>
            <ul>
                ${recommendations.nonPharmacological.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
            <div class="guideline-rationale">
                <p><strong>Guideline Rationale:</strong> CCS Guidelines emphasize that lifestyle modifications should 
                be prescribed in all patients, including nutritional counseling and regular physical activity, 
                independent of pharmacologic therapy <span class="evidence-quality high">High-Quality Evidence</span>.</p>
            </div>
        </div>`;
  }

  // Add final guideline reference
  html += `
        <div class="guideline-citation">
            <p><strong>References:</strong></p>
            <ol>
                <li>Pearson GJ, et al. 2021 Canadian Cardiovascular Society Guidelines for the Management of Dyslipidemia for the Prevention of Cardiovascular Disease in Adults. Can J Cardiol. 2021;37(8):1129-1150.</li>
                <li>Anderson TJ, et al. 2016 Canadian Cardiovascular Society Guidelines for the Management of Dyslipidemia for the Prevention of Cardiovascular Disease in the Adult. Can J Cardiol. 2016;32(11):1263-1282.</li>
            </ol>
        </div>
    `;

  return html;
}

/**
 * Display FRS results in the results section
 * @param {Object} data - Input data from the form
 * @param {Object} results - Calculation results
 * @param {string} recommendations - HTML-formatted treatment recommendations
 */
function displayFRSResults(data, results, recommendations) {
  const resultsContainer = document.getElementById('results-container');
  const resultsDiv = document.getElementById('risk-results');

  if (!resultsContainer || !resultsDiv) {
    console.error('Results container not found');
    return;
  }

  // Get result template
  const template = document.getElementById('single-risk-template');
  if (!template) {
    console.error('Result template not found');
    return;
  }

  // Clear previous results
  resultsDiv.innerHTML = '';

  // Clone template
  const resultCard = template.content.cloneNode(true);

  // Set title
  resultCard.querySelector('.risk-title').textContent = 'Framingham Risk Score Results';

  // Set risk values
  resultCard.querySelector('.risk-value').textContent = `${results.modifiedRisk.toFixed(1)}%`;
  resultCard.querySelector('.base-risk').textContent = `${results.baseRisk.toFixed(1)}%`;

  // Set Lp(a) modifier
  const modifierRow = resultCard.querySelector('.lpa-modifier-row');
  if (results.lpaModifier > 1.0) {
    resultCard.querySelector('.lpa-modifier').textContent = `${results.lpaModifier.toFixed(1)}x`;
  } else {
    modifierRow.style.display = 'none';
  }

  resultCard.querySelector('.adjusted-risk').textContent = `${results.modifiedRisk.toFixed(1)}%`;
  resultCard.querySelector('.risk-badge').textContent = results.riskCategory.charAt(0).toUpperCase() + results.riskCategory.slice(1);
  resultCard.querySelector('.risk-badge').classList.add(results.riskCategory);

  // Risk category in results
  resultCard.querySelector('.risk-category').textContent =
        results.riskCategory.charAt(0).toUpperCase() + results.riskCategory.slice(1) + ' Risk';

  // Set interpretation
  resultCard.querySelector('.risk-interpretation').innerHTML = `
        <p>Based on the FRS calculator, this individual has a ${results.modifiedRisk.toFixed(1)}% risk of experiencing a cardiovascular event in the next 10 years, which is classified as <strong>${results.riskCategory} risk</strong>.</p>
        ${data.lpa ? `<p>The baseline risk of ${results.baseRisk.toFixed(1)}% has been modified by a factor of ${results.lpaModifier.toFixed(1)}x due to the Lp(a) level.</p>` : ''}
    `;

  // Add to results
  resultsDiv.appendChild(resultCard);

  // Show treatment recommendations
  document.getElementById('recommendations-content').innerHTML = recommendations;

  // Set date and show results container
  document.querySelector('#results-date span').textContent = new Date().toLocaleDateString();
  resultsContainer.style.display = 'block';

  // Scroll to results
  resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Display QRISK3 results in the results section
 * @param {Object} data - Input data from the form
 * @param {Object} results - Calculation results
 * @param {string} recommendations - HTML-formatted treatment recommendations
 */
function displayQRISKResults(data, results, recommendations) {
  const resultsContainer = document.getElementById('results-container');
  const resultsDiv = document.getElementById('risk-results');

  if (!resultsContainer || !resultsDiv) {
    console.error('Results container not found');
    return;
  }

  // Get result template
  const template = document.getElementById('single-risk-template');
  if (!template) {
    console.error('Result template not found');
    return;
  }

  // Clear previous results
  resultsDiv.innerHTML = '';

  // Clone template
  const resultCard = template.content.cloneNode(true);

  // Set title
  resultCard.querySelector('.risk-title').textContent = 'QRISK3 Results';

  // Set risk values
  resultCard.querySelector('.risk-value').textContent = `${results.modifiedRisk.toFixed(1)}%`;
  resultCard.querySelector('.base-risk').textContent = `${results.baseRisk.toFixed(1)}%`;

  // Set Lp(a) modifier
  const modifierRow = resultCard.querySelector('.lpa-modifier-row');
  if (results.lpaModifier > 1.0) {
    resultCard.querySelector('.lpa-modifier').textContent = `${results.lpaModifier.toFixed(1)}x`;
  } else {
    modifierRow.style.display = 'none';
  }

  resultCard.querySelector('.adjusted-risk').textContent = `${results.modifiedRisk.toFixed(1)}%`;
  resultCard.querySelector('.risk-badge').textContent = results.riskCategory.charAt(0).toUpperCase() + results.riskCategory.slice(1);
  resultCard.querySelector('.risk-badge').classList.add(results.riskCategory);

  // Risk category in results
  resultCard.querySelector('.risk-category').textContent =
        results.riskCategory.charAt(0).toUpperCase() + results.riskCategory.slice(1) + ' Risk';

  // Additional factors considered by QRISK3
  const additionalFactors = [];
  if (data.familyHistory) {additionalFactors.push('Family history of CVD');}
  if (data.ethnicityFactor !== 1.0) {additionalFactors.push('Ethnicity factors');}
  if (data.atrialFibrillation) {additionalFactors.push('Atrial fibrillation');}
  if (data.rheumatoidArthritis) {additionalFactors.push('Rheumatoid arthritis');}
  if (data.chronicKidneyDisease) {additionalFactors.push('Chronic kidney disease');}

  // Set interpretation
  resultCard.querySelector('.risk-interpretation').innerHTML = `
        <p>Based on the QRISK3 calculator, this individual has a ${results.modifiedRisk.toFixed(1)}% risk of experiencing a cardiovascular event in the next 10 years, which is classified as <strong>${results.riskCategory} risk</strong>.</p>
        ${data.lpa ? `<p>The baseline risk of ${results.baseRisk.toFixed(1)}% has been modified by a factor of ${results.lpaModifier.toFixed(1)}x due to the Lp(a) level.</p>` : ''}
        ${additionalFactors.length > 0 ? `<p>Additional factors considered in QRISK3: ${additionalFactors.join(', ')}.</p>` : ''}
    `;

  // Add to results
  resultsDiv.appendChild(resultCard);

  // Show treatment recommendations
  document.getElementById('recommendations-content').innerHTML = recommendations;

  // Set date and show results container
  document.querySelector('#results-date span').textContent = new Date().toLocaleDateString();
  resultsContainer.style.display = 'block';

  // Scroll to results
  resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Display comparison results in the results section
 * @param {Object} frsData - FRS input data
 * @param {Object} frsResults - FRS calculation results
 * @param {Object} qriskData - QRISK input data
 * @param {Object} qriskResults - QRISK calculation results
 * @param {string} recommendations - HTML-formatted treatment recommendations
 */
function displayComparisonResults(frsData, frsResults, qriskData, qriskResults, recommendations) {
  const resultsContainer = document.getElementById('results-container');
  const resultsDiv = document.getElementById('risk-results');

  if (!resultsContainer || !resultsDiv) {
    console.error('Results container not found');
    return;
  }

  // Get comparison template
  const template = document.getElementById('comparison-risk-template');
  if (!template) {
    console.error('Comparison template not found');
    return;
  }

  // Clear previous results
  resultsDiv.innerHTML = '';

  // Clone template
  const resultCard = template.content.cloneNode(true);

  // Fill in comparison table
  document.getElementById('compare-frs-base').textContent = `${frsResults.baseRisk.toFixed(1)}%`;
  document.getElementById('compare-qrisk-base').textContent = `${qriskResults.baseRisk.toFixed(1)}%`;

  document.getElementById('compare-frs-lpa').textContent = `${frsResults.lpaModifier.toFixed(1)}x`;
  document.getElementById('compare-qrisk-lpa').textContent = `${qriskResults.lpaModifier.toFixed(1)}x`;

  document.getElementById('compare-frs-adjusted').textContent = `${frsResults.modifiedRisk.toFixed(1)}%`;
  document.getElementById('compare-qrisk-adjusted').textContent = `${qriskResults.modifiedRisk.toFixed(1)}%`;

  document.getElementById('compare-frs-category').textContent = frsResults.riskCategory.charAt(0).toUpperCase() + frsResults.riskCategory.slice(1);
  document.getElementById('compare-qrisk-category').textContent = qriskResults.riskCategory.charAt(0).toUpperCase() + qriskResults.riskCategory.slice(1);

  // Create comparison chart
  createComparisonChart(frsResults, qriskResults);

  // Set clinical interpretation
  const difference = Math.abs(frsResults.modifiedRisk - qriskResults.modifiedRisk);
  const percentDifference = (difference / ((frsResults.modifiedRisk + qriskResults.modifiedRisk) / 2)) * 100;

  let interpretationText = '';
  if (percentDifference < 10) {
    interpretationText = `The Framingham Risk Score and QRISK3 provide similar risk estimates (${frsResults.modifiedRisk.toFixed(1)}% vs ${qriskResults.modifiedRisk.toFixed(1)}%), suggesting a consistent risk assessment.`;
  } else if (percentDifference < 30) {
    interpretationText = `There is a moderate difference between the Framingham Risk Score (${frsResults.modifiedRisk.toFixed(1)}%) and QRISK3 (${qriskResults.modifiedRisk.toFixed(1)}%). This may be due to the additional factors considered in QRISK3 or differences in the underlying populations used to develop these scores.`;
  } else {
    interpretationText = `There is a substantial difference between the Framingham Risk Score (${frsResults.modifiedRisk.toFixed(1)}%) and QRISK3 (${qriskResults.modifiedRisk.toFixed(1)}%). This significant variation suggests that the additional factors considered in QRISK3 (such as ethnicity, family history, or medical conditions) may have a major impact on this individual's risk assessment.`;
  }

  // Add which score is higher
  if (frsResults.modifiedRisk > qriskResults.modifiedRisk) {
    interpretationText += ` The Framingham Risk Score gives a higher risk estimate, which may be more conservative for treatment decisions.`;
  } else if (qriskResults.modifiedRisk > frsResults.modifiedRisk) {
    interpretationText += ` QRISK3 gives a higher risk estimate, which may account for additional risk factors not captured in the Framingham score.`;
  }

  // Add treatment considerations
  interpretationText += ` Based on the higher risk score of ${Math.max(frsResults.modifiedRisk, qriskResults.modifiedRisk).toFixed(1)}%, this patient falls into the ${Math.max(frsResults.modifiedRisk, qriskResults.modifiedRisk) >= 20 ? 'high' : (Math.max(frsResults.modifiedRisk, qriskResults.modifiedRisk) >= 10 ? 'intermediate' : 'low')} risk category for treatment considerations.`;

  document.getElementById('comparison-interpretation').textContent = interpretationText;

  // Add result card to results div
  resultsDiv.appendChild(resultCard);

  // Show treatment recommendations
  document.getElementById('recommendations-content').innerHTML = recommendations;

  // Set date and show results container
  document.querySelector('#results-date span').textContent = new Date().toLocaleDateString();
  resultsContainer.style.display = 'block';

  // Scroll to results
  resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Create comparison chart for FRS and QRISK3 results
 * @param {Object} frsResults - FRS calculation results
 * @param {Object} qriskResults - QRISK3 calculation results
 */
function createComparisonChart(frsResults, qriskResults) {
  // Simple bar chart using div elements
  const chartContainer = document.getElementById('comparison-chart-container');
  if (!chartContainer) {return;}

  // Clear previous chart
  chartContainer.innerHTML = '';

  // Create chart HTML
  chartContainer.innerHTML = `
        <div class="comparison-bars">
            <div class="chart-bar-container">
                <div class="chart-label">Framingham</div>
                <div class="chart-bar-wrapper">
                    <div class="chart-bar frs-bar" style="height: ${Math.min(frsResults.modifiedRisk * 2, 100)}%;">
                        <span class="chart-value">${frsResults.modifiedRisk.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
            <div class="chart-bar-container">
                <div class="chart-label">QRISK3</div>
                <div class="chart-bar-wrapper">
                    <div class="chart-bar qrisk-bar" style="height: ${Math.min(qriskResults.modifiedRisk * 2, 100)}%;">
                        <span class="chart-value">${qriskResults.modifiedRisk.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="chart-axis">
            <div class="axis-label">0%</div>
            <div class="axis-line"></div>
            <div class="axis-marker" style="bottom: 20%;">10%</div>
            <div class="axis-marker" style="bottom: 40%;">20%</div>
            <div class="axis-marker" style="bottom: 60%;">30%</div>
            <div class="axis-marker" style="bottom: 80%;">40%</div>
            <div class="axis-marker" style="bottom: 100%;">50%+</div>
        </div>
    `;
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
