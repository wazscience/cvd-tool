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
function calculateQRISK3Score(data) {
  // Convert units if needed
  const standardizedData = standardizeUnitsForQRISK3(data);

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
    const heightInM = standardized.height / 100;

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


  // Check for systolic BP readings and calculate SD if not provided
  if (!standardized.sbpSd) {
    // Look for multiple SBP readings
    const sbpReadings = [];
    for (let i = 1; i <= 6; i++) {
      const readingId = `qrisk-sbp-reading-${i}`;
      const readingElement = document.getElementById(readingId);
      if (readingElement && readingElement.value) {
        const reading = parseFloat(readingElement.value);
        if (!isNaN(reading)) {
          sbpReadings.push(reading);
        }
      }
    }

    // Calculate SD if we have enough readings
    if (sbpReadings.length >= 3) {
      standardized.sbpSd = calculateStandardDeviation(sbpReadings);
    } else {
      // Default SD value if not calculated
      standardized.sbpSd = 0;
    }
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
    0.28040314332995425,
    0.56298994142075398,
    0.29590000851116516,
    0.0727853798779825450000000,
    -0.17072135508857317,
    -0.39371043314874971,
    -0.32632495283530272,
    -0.17127056883241784
  ];

  const Ismoke = [
    0,
    0.13386833786546262,
    0.56200858012438537,
    0.66749593377502547,
    0.84948177644830847
  ];

  // Applying fractional polynomial transforms
  const dage = age / 10;
  let age_1 = Math.pow(dage, -2);
  let age_2 = dage;

  const dbmi = bmi / 10;
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
  a += age_1 * -8.1388109247726188;
  a += age_2 * 0.79733376689699098;
  a += bmi_1 * 0.29236092275460052;
  a += bmi_2 * -4.1513300213837665;
  a += rati * 0.15338035820802554;
  a += sbp * 0.0131314884071034240000000;
  a += sbps5 * 0.0078894541014586095000000;
  a += town * 0.0772237905885901080000000;

  // Sum from boolean values
  a += b_AF * 1.5923354969269663;
  a += b_atypicalantipsy * 0.25237642070115557;
  a += b_corticosteroids * 0.59520725304601851;
  a += b_migraine * 0.301267260870345;
  a += b_ra * 0.21364803435181942;
  a += b_renal * 0.65194569493845833;
  a += b_semi * 0.12555308058820178;
  a += b_sle * 0.75880938654267693;
  a += b_treatedhyp * 0.50931593683423004;
  a += b_type1 * 1.7267977510537347;
  a += b_type2 * 1.0688773244615468;
  a += fh_cvd * 0.45445319020896213;

  // Sum from interaction terms
  a += age_1 * (smoke_cat === 1 ? 1 : 0) * -4.7057161785851891;
  a += age_1 * (smoke_cat === 2 ? 1 : 0) * -2.7430383403573337;
  a += age_1 * (smoke_cat === 3 ? 1 : 0) * -0.86608088829392182;
  a += age_1 * (smoke_cat === 4 ? 1 : 0) * 0.90241562369710648;
  a += age_1 * b_AF * 19.938034889546561;
  a += age_1 * b_corticosteroids * -0.98408045235936281;
  a += age_1 * b_migraine * 1.7634979587872999;
  a += age_1 * b_renal * -3.5874047731694114;
  a += age_1 * b_sle * 19.690303738638292;
  a += age_1 * b_treatedhyp * 11.872809733921812;
  a += age_1 * b_type1 * -1.2444332714320747;
  a += age_1 * b_type2 * 6.8652342000009599;
  a += age_1 * bmi_1 * 23.802623412141742;
  a += age_1 * bmi_2 * -71.184947692087007;
  a += age_1 * fh_cvd * 0.99467807940435127;
  a += age_1 * sbp * 0.0341318423386154850000000;
  a += age_1 * town * -1.0301180802035639;
  a += age_2 * (smoke_cat === 1 ? 1 : 0) * -0.0755892446431930260000000;
  a += age_2 * (smoke_cat === 2 ? 1 : 0) * -0.11951192874867074;
  a += age_2 * (smoke_cat === 3 ? 1 : 0) * -0.10366306397571923;
  a += age_2 * (smoke_cat === 4 ? 1 : 0) * -0.13991853591718389;
  a += age_2 * b_AF * -0.0761826510111625050000000;
  a += age_2 * b_corticosteroids * -0.12005364946742472;
  a += age_2 * b_migraine * -0.0655869178986998590000000;
  a += age_2 * b_renal * -0.22688873086442507;
  a += age_2 * b_sle * 0.0773479496790162730000000;
  a += age_2 * b_treatedhyp * 0.0009685782358817443600000;
  a += age_2 * b_type1 * -0.28724064624488949;
  a += age_2 * b_type2 * -0.0971122525906954890000000;
  a += age_2 * bmi_1 * 0.52369958933664429;
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
    0.27719248760308279,
    0.47446360714931268,
    0.52961729919689371,
    0.0351001591862990170000000,
    -0.35807899669327919,
    -0.4005648523216514,
    -0.41522792889830173,
    -0.26321348134749967
  ];

  const Ismoke = [
    0,
    0.19128222863388983,
    0.55241588192645552,
    0.63835053027506072,
    0.78983819881858019
  ];

  // Applying fractional polynomial transforms
  const dage = age / 10;
  let age_1 = Math.pow(dage, -1);
  let age_2 = Math.pow(dage, 3);

  const dbmi = bmi / 10;
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
  a += age_1 * -17.839781666005575;
  a += age_2 * 0.0022964880605765492000000;
  a += bmi_1 * 2.4562776660536358;
  a += bmi_2 * -8.3011122314711354;
  a += rati * 0.17340196856327111;
  a += sbp * 0.0129101265425533050000000;
  a += sbps5 * 0.0102519142912904560000000;
  a += town * 0.0332682012772872950000000;

  // Sum from boolean values
  a += b_AF * 0.88209236928054657;
  a += b_atypicalantipsy * 0.13046879855173513;
  a += b_corticosteroids * 0.45485399750445543;
  a += b_impotence2 * 0.22251859086705383;
  a += b_migraine * 0.25584178074159913;
  a += b_ra * 0.20970658013956567;
  a += b_renal * 0.71853261288274384;
  a += b_semi * 0.12133039882047164;
  a += b_sle * 0.4401572174457522;
  a += b_treatedhyp * 0.51659871082695474;
  a += b_type1 * 1.2343425521675175;
  a += b_type2 * 0.85942071430932221;
  a += fh_cvd * 0.54055469009390156;

  // Sum from interaction terms
  a += age_1 * (smoke_cat === 1 ? 1 : 0) * -0.21011133933516346;
  a += age_1 * (smoke_cat === 2 ? 1 : 0) * 0.75268676447503191;
  a += age_1 * (smoke_cat === 3 ? 1 : 0) * 0.99315887556405791;
  a += age_1 * (smoke_cat === 4 ? 1 : 0) * 2.1331163414389076;
  a += age_1 * b_AF * 3.4896675530623207;
  a += age_1 * b_corticosteroids * 1.1708133653489108;
  a += age_1 * b_impotence2 * -1.506400985745431;
  a += age_1 * b_migraine * 2.3491159871402441;
  a += age_1 * b_renal * -0.50656716327223694;
  a += age_1 * b_treatedhyp * 6.5114581098532671;
  a += age_1 * b_type1 * 5.3379864878006531;
  a += age_1 * b_type2 * 3.6461817406221311;
  a += age_1 * bmi_1 * 31.004952956033886;
  a += age_1 * bmi_2 * -111.29157184391643;
  a += age_1 * fh_cvd * 2.7808628508531887;
  a += age_1 * sbp * 0.0188585244698658530000000;
  a += age_1 * town * -0.1007554870063731;
  a += age_2 * (smoke_cat === 1 ? 1 : 0) * -0.0004985487027532612100000;
  a += age_2 * (smoke_cat === 2 ? 1 : 0) * -0.0007987563331738541400000;
  a += age_2 * (smoke_cat === 3 ? 1 : 0) * -0.0008370618426625129600000;
  a += age_2 * (smoke_cat === 4 ? 1 : 0) * -0.0007840031915563728900000;
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
      name: 'Advanced age',
      impact: 'high',
      description: 'Age is a strong independent risk factor for CVD'
    });
  } else if (data.age >= 55) {
    factors.push({
      name: 'Age',
      impact: 'moderate',
      description: 'Age is a significant risk factor for CVD'
    });
  }

  if (data.smoker && data.smoker !== 'non') {
    const smokingImpact = data.smoker === 'heavy' ? 'high' :
      (data.smoker === 'moderate' ? 'moderate' : 'low');
    factors.push({
      name: 'Smoking',
      impact: smokingImpact,
      description: 'Smoking significantly increases CVD risk'
    });
  }

  if (data.bmi >= 30) {
    factors.push({
      name: 'Obesity',
      impact: 'moderate',
      description: 'BMI ≥30 kg/m² increases CVD risk'
    });
  } else if (data.bmi >= 25) {
    factors.push({
      name: 'Overweight',
      impact: 'low',
      description: 'BMI 25-29.9 kg/m² slightly increases CVD risk'
    });
  }

  if (data.sbp >= 160) {
    factors.push({
      name: 'Severe hypertension',
      impact: 'high',
      description: 'Systolic BP ≥160 mmHg significantly increases CVD risk'
    });
  } else if (data.sbp >= 140) {
    factors.push({
      name: 'Hypertension',
      impact: 'moderate',
      description: 'Systolic BP 140-159 mmHg increases CVD risk'
    });
  }

  if (data.cholRatio >= 6) {
    factors.push({
      name: 'Poor cholesterol ratio',
      impact: 'high',
      description: 'Total:HDL cholesterol ratio ≥6 significantly increases risk'
    });
  } else if (data.cholRatio >= 4.5) {
    factors.push({
      name: 'Elevated cholesterol ratio',
      impact: 'moderate',
      description: 'Total:HDL cholesterol ratio 4.5-5.9 increases risk'
    });
  }

  if (data.diabetes === 'type1') {
    factors.push({
      name: 'Type 1 diabetes',
      impact: 'high',
      description: 'Type 1 diabetes significantly increases CVD risk'
    });
  } else if (data.diabetes === 'type2') {
    factors.push({
      name: 'Type 2 diabetes',
      impact: 'high',
      description: 'Type 2 diabetes significantly increases CVD risk'
    });
  }

  if (data.familyHistory) {
    factors.push({
      name: 'Family history of CVD',
      impact: 'moderate',
      description: 'Premature CVD in first-degree relative increases risk'
    });
  }

  // Medical conditions
  if (data.atrialFibrillation) {
    factors.push({
      name: 'Atrial fibrillation',
      impact: 'high',
      description: 'Atrial fibrillation substantially increases stroke risk'
    });
  }

  if (data.chronicKidneyDisease) {
    factors.push({
      name: 'Chronic kidney disease',
      impact: 'high',
      description: 'CKD stages 3-5 significantly increases CVD risk'
    });
  }

  if (data.rheumatoidArthritis) {
    factors.push({
      name: 'Rheumatoid arthritis',
      impact: 'moderate',
      description: 'Rheumatoid arthritis increases CVD risk'
    });
  }

  if (data.sle) {
    factors.push({
      name: 'Systemic lupus erythematosus',
      impact: 'moderate',
      description: 'SLE increases CVD risk'
    });
  }

  if (data.migraine) {
    factors.push({
      name: 'Migraine',
      impact: 'low',
      description: 'Migraine slightly increases stroke risk'
    });
  }

  if (data.severeMetalIllness) {
    factors.push({
      name: 'Severe mental illness',
      impact: 'low',
      description: 'Severe mental illness slightly increases CVD risk'
    });
  }

  if (data.erectileDysfunction && data.sex === 'male') {
    factors.push({
      name: 'Erectile dysfunction',
      impact: 'moderate',
      description: 'Erectile dysfunction is associated with increased CVD risk in men'
    });
  }

  // Medications
  if (data.atypicalAntipsychotics) {
    factors.push({
      name: 'Atypical antipsychotics',
      impact: 'low',
      description: 'Atypical antipsychotics slightly increase CVD risk'
    });
  }

  if (data.corticosteroids) {
    factors.push({
      name: 'Corticosteroids',
      impact: 'moderate',
      description: 'Regular corticosteroid use increases CVD risk'
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
        name: 'Very high Lp(a)',
        impact: 'high',
        description: 'Lp(a) ≥180 mg/dL substantially increases CVD risk'
      });
    } else if (lpaValue >= 50) {
      factors.push({
        name: 'Elevated Lp(a)',
        impact: 'moderate',
        description: 'Lp(a) ≥50 mg/dL increases CVD risk'
      });
    } else if (lpaValue >= 30) {
      factors.push({
        name: 'Borderline Lp(a)',
        impact: 'low',
        description: 'Lp(a) 30-49 mg/dL slightly increases CVD risk'
      });
    }
  }

  return factors;
}


// Export the function for use in the main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateQRISK3Score };
} else {
  window.calculateQRISK3Score = calculateQRISK3Score;
}
