 Complete QRISK3 Code Patches

This document contains all the code patches required to update the CVD Risk Toolkit with a complete QRISK3 implementation. The patches are organized by file type and function.

## 1. QRISK3 Algorithm Implementation

```javascript
/**
 * Complete QRISK3 Implementation based on the official algorithm
 * This replaces the existing simplified QRISK3 calculation in the calculator
 */

/**
 * Calculate QRISK3 score using the official algorithm
 * @param {Object} data - Patient data from the form
 * @returns {Object} - Risk calculation results
 */
function calculateQRISK3Score(data) {
    // Convert units if needed
    let standardizedData = standardizeUnitsForQRISK3(data);
    
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
        0.2804031433299542500000000,
        0.5629899414207539800000000,
        0.2959000085111651600000000,
        0.0727853798779825450000000,
        -0.1707213550885731700000000,
        -0.3937104331487497100000000,
        -0.3263249528353027200000000,
        -0.1712705688324178400000000
    ];
    
    const Ismoke = [
        0,
        0.1338683378654626200000000,
        0.5620085801243853700000000,
        0.6674959337750254700000000,
        0.8494817764483084700000000
    ];

    // Applying fractional polynomial transforms
    let dage = age / 10;
    let age_1 = Math.pow(dage, -2);
    let age_2 = dage;
    
    let dbmi = bmi / 10;
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
    a += age_1 * -8.1388109247726188000000000;
    a += age_2 * 0.7973337668969909800000000;
    a += bmi_1 * 0.2923609227546005200000000;
    a += bmi_2 * -4.1513300213837665000000000;
    a += rati * 0.1533803582080255400000000;
    a += sbp * 0.0131314884071034240000000;
    a += sbps5 * 0.0078894541014586095000000;
    a += town * 0.0772237905885901080000000;

    // Sum from boolean values
    a += b_AF * 1.5923354969269663000000000;
    a += b_atypicalantipsy * 0.2523764207011555700000000;
    a += b_corticosteroids * 0.5952072530460185100000000;
    a += b_migraine * 0.3012672608703450000000000;
    a += b_ra * 0.2136480343518194200000000;
    a += b_renal * 0.6519456949384583300000000;
    a += b_semi * 0.1255530805882017800000000;
    a += b_sle * 0.7588093865426769300000000;
    a += b_treatedhyp * 0.5093159368342300400000000;
    a += b_type1 * 1.7267977510537347000000000;
    a += b_type2 * 1.0688773244615468000000000;
    a += fh_cvd * 0.4544531902089621300000000;

    // Sum from interaction terms
    a += age_1 * (smoke_cat == 1 ? 1 : 0) * -4.7057161785851891000000000;
    a += age_1 * (smoke_cat == 2 ? 1 : 0) * -2.7430383403573337000000000;
    a += age_1 * (smoke_cat == 3 ? 1 : 0) * -0.8660808882939218200000000;
    a += age_1 * (smoke_cat == 4 ? 1 : 0) * 0.9024156236971064800000000;
    a += age_1 * b_AF * 19.9380348895465610000000000;
    a += age_1 * b_corticosteroids * -0.9840804523593628100000000;
    a += age_1 * b_migraine * 1.7634979587872999000000000;
    a += age_1 * b_renal * -3.5874047731694114000000000;
    a += age_1 * b_sle * 19.6903037386382920000000000;
    a += age_1 * b_treatedhyp * 11.8728097339218120000000000;
    a += age_1 * b_type1 * -1.2444332714320747000000000;
    a += age_1 * b_type2 * 6.8652342000009599000000000;
    a += age_1 * bmi_1 * 23.8026234121417420000000000;
    a += age_1 * bmi_2 * -71.1849476920870070000000000;
    a += age_1 * fh_cvd * 0.9946780794043512700000000;
    a += age_1 * sbp * 0.0341318423386154850000000;
    a += age_1 * town * -1.0301180802035639000000000;
    a += age_2 * (smoke_cat == 1 ? 1 : 0) * -0.0755892446431930260000000;
    a += age_2 * (smoke_cat == 2 ? 1 : 0) * -0.1195119287486707400000000;
    a += age_2 * (smoke_cat == 3 ? 1 : 0) * -0.1036630639757192300000000;
    a += age_2 * (smoke_cat == 4 ? 1 : 0) * -0.1399185359171838900000000;
    a += age_2 * b_AF * -0.0761826510111625050000000;
    a += age_2 * b_corticosteroids * -0.1200536494674247200000000;
    a += age_2 * b_migraine * -0.0655869178986998590000000;
    a += age_2 * b_renal * -0.2268887308644250700000000;
    a += age_2 * b_sle * 0.0773479496790162730000000;
    a += age_2 * b_treatedhyp * 0.0009685782358817443600000;
    a += age_2 * b_type1 * -0.2872406462448894900000000;
    a += age_2 * b_type2 * -0.0971122525906954890000000;
    a += age_2 * bmi_1 * 0.5236995893366442900000000;
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
        0.2771924876030827900000000,
        0.4744636071493126800000000,
        0.5296172991968937100000000,
        0.0351001591862990170000000,
        -0.3580789966932791900000000,
        -0.4005648523216514000000000,
        -0.4152279288983017300000000,
        -0.2632134813474996700000000
    ];
    
    const Ismoke = [
        0,
        0.1912822286338898300000000,
        0.5524158819264555200000000,
        0.6383505302750607200000000,
        0.7898381988185801900000000
    ];

    // Applying fractional polynomial transforms
    let dage = age / 10;
    let age_1 = Math.pow(dage, -1);
    let age_2 = Math.pow(dage, 3);
    
    let dbmi = bmi / 10;
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
    a += age_1 * -17.8397816660055750000000000;
    a += age_2 * 0.0022964880605765492000000;
    a += bmi_1 * 2.4562776660536358000000000;
    a += bmi_2 * -8.3011122314711354000000000;
    a += rati * 0.1734019685632711100000000;
    a += sbp * 0.0129101265425533050000000;
    a += sbps5 * 0.0102519142912904560000000;
    a += town * 0.0332682012772872950000000;

    // Sum from boolean values
    a += b_AF * 0.8820923692805465700000000;
    a += b_atypicalantipsy * 0.1304687985517351300000000;
    a += b_corticosteroids * 0.4548539975044554300000000;
    a += b_impotence2 * 0.2225185908670538300000000;
    a += b_migraine * 0.2558417807415991300000000;
    a += b_ra * 0.2097065801395656700000000;
    a += b_renal * 0.7185326128827438400000000;
    a += b_semi * 0.1213303988204716400000000;
    a += b_sle * 0.4401572174457522000000000;
    a += b_treatedhyp * 0.5165987108269547400000000;
    a += b_type1 * 1.2343425521675175000000000;
    a += b_type2 * 0.8594207143093222100000000;
    a += fh_cvd * 0.5405546900939015600000000;

    // Sum from interaction terms
    a += age_1 * (smoke_cat == 1 ? 1 : 0) * -0.2101113393351634600000000;
    a += age_1 * (smoke_cat == 2 ? 1 : 0) * 0.7526867644750319100000000;
    a += age_1 * (smoke_cat == 3 ? 1 : 0) * 0.9931588755640579100000000;
    a += age_1 * (smoke_cat == 4 ? 1 : 0) * 2.1331163414389076000000000;
    a += age_1 * b_AF * 3.4896675530623207000000000;
    a += age_1 * b_corticosteroids * 1.1708133653489108000000000;
    a += age_1 * b_impotence2 * -1.5064009857454310000000000;
    a += age_1 * b_migraine * 2.3491159871402441000000000;
    a += age_1 * b_renal * -0.5065671632722369400000000;
    a += age_1 * b_treatedhyp * 6.5114581098532671000000000;
    a += age_1 * b_type1 * 5.3379864878006531000000000;
    a += age_1 * b_type2 * 3.6461817406221311000000000;
    a += age_1 * bmi_1 * 31.0049529560338860000000000;
    a += age_1 * bmi_2 * -111.2915718439164300000000000;
    a += age_1 * fh_cvd * 2.7808628508531887000000000;
    a += age_1 * sbp * 0.0188585244698658530000000;
    a += age_1 * town * -0.1007554870063731000000000;
    a += age_2 * (smoke_cat == 1 ? 1 : 0) * -0.0004985487027532612100000;
    a += age_2 * (smoke_cat == 2 ? 1 : 0) * -0.0007987563331738541400000;
    a += age_2 * (smoke_cat == 3 ? 1 : 0) * -0.0008370618426625129600000;
    a += age_2 * (smoke_cat == 4 ? 1 : 0) * -0.0007840031915563728900000;
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
```

## 2. HTML Form Updates

```html
<!-- QRISK3 Tab -->
<div id='qrisk-tab' class='tab-content'>
    <form id='qrisk-form' class='clinical-form'>
        <div class='form-header'>
            <h2 class='section-title'>QRISK3 Calculator</h2>
            <p class='section-description'>QRISK3 estimates 10-year cardiovascular risk, accounting for multiple factors including ethnicity, medical conditions, and medications.</p>
        </div>
        
        <!-- Patient Demographics Card -->
        <div class='card'>
            <div class='card-header active'>
                <h3>Patient Demographics</h3>
                <span class='toggle-icon'>▼</span>
            </div>
            <div class='card-body active'>
                <div class='form-row'>
                    <div class='form-group'>
                        <label class='required'>Age</label>
                        <input type='number' id='qrisk-age' min='25' max='84' placeholder='25-84 years' required>
                        <div class='error-message'>Please enter a valid age between 25 and 84</div>
                    </div>
                    
                    <div class='form-group'>
                        <label class='required'>Sex</label>
                        <select id='qrisk-sex' required>
                            <option value='' selected disabled>Select</option>
                            <option value='male'>Male</option>
                            <option value='female'>Female</option>
                        </select>
                        <div class='error-message'>Please select sex</div>
                    </div>
                </div>
                
                <div class='form-row'>
                    <div class='form-group'>
                        <label class='required'>Ethnicity</label>
                        <select id='qrisk-ethnicity' required>
                            <option value='' selected disabled>Select</option>
                            <option value='white'>White</option>
                            <option value='indian'>Indian</option>
                            <option value='pakistani'>Pakistani</option>
                            <option value='bangladeshi'>Bangladeshi</option>
                            <option value='other_asian'>Other Asian</option>
                            <option value='black_caribbean'>Black Caribbean</option>
                            <option value='black_african'>Black African</option>
                            <option value='chinese'>Chinese</option>
                            <option value='other'>Other</option>
                        </select>
                        <div class='error-message'>Please select ethnicity</div>
                    </div>
                    
                    <div class='form-group'>
                        <label>Townsend Deprivation Score
                            <div class='tooltip-container'>
                                <div class='info-icon'>i</div>
                                <div class='tooltip-text'>A measure of material deprivation. UK average is 0. Higher scores indicate more deprived areas. If unknown, leave at default value of 0.</div>
                            </div>
                        </label>
                        <input type='number' id='qrisk-townsend' min='-6' max='10' placeholder='Default: 0' value='0' step='0.1'>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Physical Measurements Card -->
        <div class='card'>
            <div class='card-header active'>
                <h3>Physical Measurements</h3>
                <span class='toggle-icon'>▼</span>
            </div>
            <div class='card-body active'>
                <div class='form-row'>
                    <div class='form-group'>
                        <label class='required'>Height</label>
                        <div class='input-group'>
                            <input type='number' id='qrisk-height' min='100' max='250' placeholder='Enter value' required>
                            <select id='qrisk-height-unit' class='unit-selector' onchange='toggleHeightInputs('qrisk')'>
                                <option value='cm'>cm</option>
                                <option value='ft/in'>ft/in</option>
                            </select>
                        </div>
                        <div id='qrisk-height-ft-container' class='height-ft-container' style='display: none;'>
                            <input type='number' id='qrisk-height-feet' min='3' max='7' placeholder='Feet'>
                            <input type='number' id='qrisk-height-inches' min='0' max='11' placeholder='Inches'>
                        </div>
                        <div class='error-message'>Please enter a valid height</div>
                    </div>
                    
                    <div class='form-group'>
                        <label class='required'>Weight</label>
                        <div class='input-group'>
                            <input type='number' id='qrisk-weight' min='30' max='200' placeholder='Enter value' required>
                            <select id='qrisk-weight-unit' class='unit-selector'>
                                <option value='kg'>kg</option>
                                <option value='lb'>lb</option>
                            </select>
                        </div>
                        <div class='error-message'>Please enter a valid weight between 30 and 200</div>
                    </div>
                </div>
                
                <div class='form-row'>
                    <div class='form-group'>
                        <label>Body Mass Index (BMI)</label>
                        <div class='input-group'>
                            <input type='text' id='qrisk-bmi-display' disabled placeholder='Auto-calculated'>
                            <span class='unit-selector'>kg/m²</span>
                        </div>
                        <!-- Hidden field to store the actual numeric BMI value for calculations -->
                        <input type='hidden' id='qrisk-bmi'>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Blood Pressure Card -->
        <div class='card'>
            <div class='card-header active'>
                <h3>Blood Pressure</h3>
                <span class='toggle-icon'>▼</span>
            </div>
            <div class='card-body active'>
                <div class='form-row'>
                    <div class='form-group'>
                        <label class='required'>Systolic Blood Pressure</label>
                        <div class='input-group'>
                            <input type='number' id='qrisk-sbp' min='70' max='210' placeholder='Enter value' required>
                            <span class='unit-selector'>mmHg</span>
                        </div>
                        <div class='error-message'>Please enter a valid value between 70 and 210</div>
                    </div>
                    
                    <div class='form-group'>
                        <label>Standard Deviation of SBP</label>
                        <div class='input-group'>
                            <input type='number' id='qrisk-sbp-sd' min='0' max='30' placeholder='Enter if known'>
                            <span class='unit-selector'>mmHg</span>
                        </div>
                        <a class='toggle-link' id='qrisk-toggle-sbp-readings'>Calculate from multiple readings</a>
                        
                        <div id='qrisk-sbp-readings' style='display: none; margin-top: 10px;'>
                            <div class='sbp-readings-container'>
                                <div class='sbp-reading'>
                                    <label for='qrisk-sbp-reading-1'>Reading 1</label>
                                    <input type='number' id='qrisk-sbp-reading-1' min='70' max='210' placeholder='mmHg'>
                                </div>
                                <div class='sbp-reading'>
                                    <label for='qrisk-sbp-reading-2'>Reading 2</label>
                                    <input type='number' id='qrisk-sbp-reading-2' min='70' max='210' placeholder='mmHg'>
                                </div>
                                <div class='sbp-reading'>
                                    <label for='qrisk-sbp-reading-3'>Reading 3</label>
                                    <input type='number' id='qrisk-sbp-reading-3' min='70' max='210' placeholder='mmHg'>
                                </div>
                                <div class='sbp-reading'>
                                    <label for='qrisk-sbp-reading-4'>Reading 4</label>
                                    <input type='number' id='qrisk-sbp-reading-4' min='70' max='210' placeholder='mmHg'>
                                </div>
                                <div class='sbp-reading'>
                                    <label for='qrisk-sbp-reading-5'>Reading 5</label>
                                    <input type='number' id='qrisk-sbp-reading-5' min='70' max='210' placeholder='mmHg'>
                                </div>
                                <div class='sbp-reading'>
                                    <label for='qrisk-sbp-reading-6'>Reading 6</label>
                                    <input type='number' id='qrisk-sbp-reading-6' min='70' max='210' placeholder='mmHg'>
                                </div>
                            </div>
                            <div class='checkbox-item' style='margin-top: 10px;'>
                                <input type='checkbox' id='qrisk-single-sbp-reading'>
                                <label for='qrisk-single-sbp-reading'>I only have 1 systolic reading</label>
                            </div>
                            <button type='button' class='sbp-calc-btn' onclick='calculateSBPStandardDeviation('qrisk')'>Calculate SD</button>
                            <div id='qrisk-sbp-sd-result' class='sbp-result'></div>
                        </div>
                    </div>
                </div>
                
                <div class='form-row'>
                    <div class='form-group'>
                        <label>On Blood Pressure Treatment</label>
                        <select id='qrisk-bp-treatment'>
                            <option value='no' selected>No</option>
                            <option value='yes'>Yes</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Lipid Profile Card -->
        <div class='card'>
            <div class='card-header active'>
                <h3>Lipid Profile</h3>
                <span class='toggle-icon'>▼</span>
            </div>
            <div class='card-body active'>
                <div class='form-row'>
                    <div class='form-group'>
                        <label class='required'>Total Cholesterol</label>
                        <div class='input-group'>
                            <input type='number' id='qrisk-total-chol' min='1' max='15' placeholder='Enter value' required step='0.1'>
                            <select id='qrisk-total-chol-unit' class='unit-selector'>
                                <option value='mmol/L'>mmol/L</option>
                                <option value='mg/dL'>mg/dL</option>
                            </select>
                        </div>
                        <div class='error-message'>Please enter a valid value between 1 and 15</div>
                    </div>
                    
                    <div class='form-group'>
                        <label class='required'>HDL Cholesterol</label>
                        <div class='input-group'>
                            <input type='number' id='qrisk-hdl' min='0.5' max='3' placeholder='Enter value' required step='0.1'>
                            <select id='qrisk-hdl-unit' class='unit-selector'>
                                <option value='mmol/L'>mmol/L</option>
                                <option value='mg/dL'>mg/dL</option>
                            </select>
                        </div>
                        <div class='error-message'>Please enter a valid value between 0.5 and 3</div>
                    </div>
                </div>
                
                <div class='form-row'>
                    <div class='form-group'>
                        <label>LDL Cholesterol
                            <div class='tooltip-container'>
                                <div class='info-icon'>i</div>
                                <div class='tooltip-text'>LDL cholesterol level is used to determine specific treatment recommendations according to clinical guidelines.</div>
                            </div>
                        </label>
                        <div class='input-group'>
                            <input type='number' id='qrisk-ldl' min='0.5' max='10' placeholder='Enter value (optional)' step='0.1'>
                            <select id='qrisk-ldl-unit' class='unit-selector'>
                                <option value='mmol/L'>mmol/L</option>
                                <option value='mg/dL'>mg/dL</option>
                            </select>
                        </div>
                        <div class='error-message'>Please enter a valid value between 0.5 and 10</div>
                    </div>
                    
                    <div class='form-group'>
                        <label>Total Cholesterol:HDL Ratio</label>
                        <div class='input-group'>
                            <input type='text' id='qrisk-ratio-display' disabled placeholder='Auto-calculated'>
                            <span class='unit-selector'>ratio</span>
                        </div>
                        <!-- Hidden field to store the actual numeric ratio value for calculations -->
                        <input type='hidden' id='qrisk-chol-ratio'>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Risk Factors Card -->
        <div class='card'>
            <div class='card-header active'>
                <h3>Risk Factors</h3>
                <span class='toggle-icon'>▼</span>
            </div>
            <div class='card-body active'>
                <div class='form-row'>
                    <div class='form-group'>
                        <label class='required'>Smoker Status</label>
                        <select id='qrisk-smoker' required>
                            <option value='' selected disabled>Select</option>
                            <option value='non'>Non-smoker</option>
                            <option value='ex'>Ex-smoker</option>
                            <option value='light'>Light smoker (< 10/day)</option>
                            <option value='moderate'>Moderate smoker (10-19/day)</option>
                            <option value='heavy'>Heavy smoker (20+/day)</option>
                        </select>
                        <div class='error-message'>Please select smoker status</div>
                    </div>
                    
                    <div class='form-group'>
                        <label class='required'>Diabetes Status</label>
                        <select id='qrisk-diabetes' required>
                            <option value='' selected disabled>Select</option>
                            <option value='none'>None</option>
                            <option value='type1'>Type 1</option>
                            <option value='type2'>Type 2</option>
                        </select>
                        <div class='error-message'>Please select diabetes status</div>
                    </div>
                </div>
                
                <div class='form-row'>
                    <div class='form-group'>
                        <label class='required'>Family History of CVD</label>
                        <select id='qrisk-family-history' required>
                            <option value='' selected disabled>Select</option>
                            <option value='yes'>Yes</option>
                            <option value='no'>No</option>
                        </select>
                        <div class='error-message'>Please select an option</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Medical Conditions Card -->
        <div class='card'>
            <div class='card-header active'>
                <h3>Medical Conditions</h3>
                <span class='toggle-icon'>▼</span>
            </div>
            <div class='card-body active'>
                <div class='checkbox-group'>
                    <div class='checkbox-item'>
                        <input type='checkbox' id='qrisk-af'>
                        <label for='qrisk-af'>Atrial Fibrillation</label>
                    </div>
                    
                    <div class='checkbox-item'>
                        <input type='checkbox' id='qrisk-ra'>
                        <label for='qrisk-ra'>Rheumatoid Arthritis</label>
                    </div>
                    
                    <div class='checkbox-item'>
                        <input type='checkbox' id='qrisk-ckd'>
                        <label for='qrisk-ckd'>Chronic Kidney Disease (Stage 3, 4, or 5)</label>
                    </div>
                    
                    <div class='checkbox-item'>
                        <input type='checkbox' id='qrisk-migraine'>
                        <label for='qrisk-migraine'>Migraine</label>
                    </div>
                    
                    <div class='checkbox-item'>
                        <input type='checkbox' id='qrisk-sle'>
                        <label for='qrisk-sle'>Systemic Lupus Erythematosus (SLE)</label>
                    </div>
                    
                    <div class='checkbox-item'>
                        <input type='checkbox' id='qrisk-semi'>
                        <label for='qrisk-semi'>Severe Mental Illness</label>
                    </div>
                    
                    <div class='checkbox-item' id='qrisk-ed-container' style='display: none;'>
                        <input type='checkbox' id='qrisk-ed'>
                        <label for='qrisk-ed'>Erectile Dysfunction/Impotence</label>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Medications Card -->
        <div class='card'>
            <div class='card-header active'>
                <h3>Medications</h3>
                <span class='toggle-icon'>▼</span>
            </div>
            <div class='card-body active'>
                <div class='checkbox-group'>
                    <div class='checkbox-item'>
                        <input type='checkbox' id='qrisk-atypical-antipsychotics'>
                        <label for='qrisk-atypical-antipsychotics'>On Atypical Antipsychotics</label>
                    </div>
                    
                    <div class='checkbox-item'>
                        <input type='checkbox' id='qrisk-corticosteroids'>
                        <label for='qrisk-corticosteroids'>On Regular Corticosteroids</label>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Lipoprotein(a) Modifier Card -->
        <div class='card'>
            <div class='card-header'>
                <h3>Lipoprotein(a) Modifier</h3>
                <span class='toggle-icon'>▼</span>
            </div>
            <div class='card-body'>
                <!-- Area for Lp(a) research update notices (empty by default) -->
                <div id='qrisk-lpa-research-updates' class='research-update-container' style='display: none;'>
                    <!-- Dynamically updated with new research -->
                </div>
                
                <div class='form-row'>
                    <div class='form-group'>
                        <label>Lp(a) Level
                            <div class='tooltip-container'>
                                <div class='info-icon'>i</div>
                                <div class='tooltip-text' id='qrisk-lpa-tooltip'>Elevated Lp(a) (≥50 mg/dL or ≥100 nmol/L) is an independent risk factor that increases cardiovascular risk.</div>
                            </div>
                        </label>
                        <div class='input-group'>
                            <input type='number' id='qrisk-lpa' min='0' max='500' placeholder='Enter value (optional)' step='1'>
                            <select id='qrisk-lpa-unit' class='unit-selector'>
                                <option value='mg/dL'>mg/dL</option>
                                <option value='nmol/L'>nmol/L</option>
                            </select>
                        </div>
                        <div class='error-message'>Please enter a valid value between 0 and 500</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class='form-actions'>
            <button type='button' class='secondary-btn' onclick='resetForm('qrisk-form')'>
                <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'></path><path d='M3 3v5h5'></path></svg>
                Reset Form
            </button>
            <button type='button' class='primary-btn' onclick='calculateQRISK()'>
                <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 3v18h18'></path><path d='m19 9-5 5-4-4-3 3'></path></svg>
                Calculate QRISK3 Score
            </button>
        </div>
    </form>
</div>
```

## 3. JavaScript Unit Conversion and BMI Calculation Functions

```javascript
/**
 * Add event listeners for QRISK3 form elements
 */
function setupQRISK3FormInteractions() {
    // Toggle erectile dysfunction field based on sex
    document.getElementById('qrisk-sex').addEventListener('change', function() {
        const edContainer = document.getElementById('qrisk-ed-container');
        if (this.value === 'male') {
            edContainer.style.display = 'block';
        } else {
            edContainer.style.display = 'none';
            document.getElementById('qrisk-ed').checked = false;
        }
    });
    
    // Auto-calculate BMI when height or weight changes
    document.getElementById('qrisk-height').addEventListener('change', calculateBMIForQRISK);
    document.getElementById('qrisk-weight').addEventListener('change', calculateBMIForQRISK);
    document.getElementById('qrisk-height-feet').addEventListener('change', calculateBMIForQRISK);
    document.getElementById('qrisk-height-inches').addEventListener('change', calculateBMIForQRISK);
    document.getElementById('qrisk-height-unit').addEventListener('change', calculateBMIForQRISK);
    document.getElementById('qrisk-weight-unit').addEventListener('change', calculateBMIForQRISK);
    
    // Auto-calculate cholesterol ratio
    document.getElementById('qrisk-total-chol').addEventListener('change', calculateCholesterolRatio);
    document.getElementById('qrisk-hdl').addEventListener('change', calculateCholesterolRatio);
    document.getElementById('qrisk-total-chol-unit').addEventListener('change', calculateCholesterolRatio);
    document.getElementById('qrisk-hdl-unit').addEventListener('change', calculateCholesterolRatio);
    
    // SBP standard deviation checkbox handler
    document.getElementById('qrisk-single-sbp-reading').addEventListener('change', function() {
        const readings = document.querySelectorAll('#qrisk-sbp-readings input[type='number']');
        if (this.checked) {
            // If checkbox is checked, disable all inputs except the first one
            for (let i = 1; i < readings.length; i++) {
                readings[i].disabled = true;
                readings[i].value = '';
            }
        } else {
            // If checkbox is unchecked, enable all inputs
            for (let i = 1; i < readings.length; i++) {
                readings[i].disabled = false;
            }
        }
    });
}

/**
 * Calculate BMI for QRISK3 form
 * Handles unit conversions and updates BMI display field
 */
function calculateBMIForQRISK() {
    const heightUnitSelect = document.getElementById('qrisk-height-unit');
    const heightUnit = heightUnitSelect.value;
    const weightUnitSelect = document.getElementById('qrisk-weight-unit');
    const weightUnit = weightUnitSelect.value;
    
    let height, weight;
    
    // Get height in cm
    if (heightUnit === 'cm') {
        height = parseFloat(document.getElementById('qrisk-height').value);
    } else if (heightUnit === 'ft/in') {
        const feet = parseFloat(document.getElementById('qrisk-height-feet').value) || 0;
        const inches = parseFloat(document.getElementById('qrisk-height-inches').value) || 0;
        if (feet === 0 && inches === 0) {
            return; // Not enough data to calculate
        }
        height = convertHeightToCm(feet, inches);
        
        // Update the hidden height value for the algorithm
        document.getElementById('qrisk-height').value = height.toFixed(1);
    }
    
    // Get weight in kg
    weight = parseFloat(document.getElementById('qrisk-weight').value);
    if (isNaN(weight) || weight <= 0) {
        return; // Invalid weight
    }
    
    let weightInKg = weight;
    if (weightUnit === 'lb') {
        weightInKg = convertWeightToKg(weight);
    }
    
    // Calculate BMI if we have both height and weight
    if (height && weightInKg) {
        const heightInM = height / 100;
        const bmi = weightInKg / (heightInM * heightInM);
        
        // Store BMI value for calculations
        document.getElementById('qrisk-bmi').value = bmi.toFixed(2);
        
        // Display BMI with appropriate formatting
        const bmiDisplay = document.getElementById('qrisk-bmi-display');
        
        // Add interpretation to the display
        let bmiCategory = '';
        if (bmi < 18.5) {
            bmiCategory = ' (Underweight)';
        } else if (bmi < 25) {
            bmiCategory = ' (Normal weight)';
        } else if (bmi < 30) {
            bmiCategory = ' (Overweight)';
        } else if (bmi < 35) {
            bmiCategory = ' (Obese Class I)';
        } else if (bmi < 40) {
            bmiCategory = ' (Obese Class II)';
        } else {
            bmiCategory = ' (Obese Class III)';
        }
        
        bmiDisplay.value = bmi.toFixed(1) + ' kg/m²' + bmiCategory;
    }
}

/**
 * Calculate cholesterol ratio for QRISK3
 * Handles unit conversions and updates ratio display field
 */
function calculateCholesterolRatio() {
    const totalCholInput = document.getElementById('qrisk-total-chol');
    const hdlInput = document.getElementById('qrisk-hdl');
    const ratioDisplay = document.getElementById('qrisk-ratio-display');
    const ratioInput = document.getElementById('qrisk-chol-ratio'); // Hidden input for calculations
    
    const totalCholUnit = document.getElementById('qrisk-total-chol-unit').value;
    const hdlUnit = document.getElementById('qrisk-hdl-unit').value;
    
    let totalChol = parseFloat(totalCholInput.value);
    let hdl = parseFloat(hdlInput.value);
    
    if (!isNaN(totalChol) && !isNaN(hdl) && hdl > 0) {
        // Convert to mmol/L if needed for consistent ratio calculation
        let totalCholMmol = totalChol;
        let hdlMmol = hdl;
        
        if (totalCholUnit === 'mg/dL') {
            totalCholMmol = convertCholesterol(totalChol, 'mg/dL', 'mmol/L');
        }
        
        if (hdlUnit === 'mg/dL') {
            hdlMmol = convertCholesterol(hdl, 'mg/dL', 'mmol/L');
        }
        
        // Calculate and display ratio
        const ratio = totalCholMmol / hdlMmol;
        
        // Store ratio for calculations
        if (ratioInput) {
            ratioInput.value = ratio.toFixed(2);
        }
        
        // Format with interpretation
        let ratioCategory = '';
        if (ratio < 3.5) {
            ratioCategory = ' (Optimal)';
        } else if (ratio < 5.0) {
            ratioCategory = ' (Moderate risk)';
        } else {
            ratioCategory = ' (High risk)';
        }
        
        ratioDisplay.value = ratio.toFixed(2) + ratioCategory;
    } else {
        ratioDisplay.value = '';
        if (ratioInput) {
            ratioInput.value = '';
        }
    }
}

/**
 * Calculate SBP standard deviation from multiple readings
 * @param {string} prefix - Prefix for input field IDs (qrisk)
 */
function calculateSBPStandardDeviation(prefix) {
    // Check if single reading checkbox is checked
    const singleReading = document.getElementById(`${prefix}-single-sbp-reading`).checked;
    
    // Get the readings
    const readings = [];
    for (let i = 1; i <= 6; i++) {
        const readingInput = document.getElementById(`${prefix}-sbp-reading-${i}`);
        const reading = parseFloat(readingInput.value);
        if (!isNaN(reading) && !readingInput.disabled) {
            readings.push(reading);
        }
    }
    
    // Error handling
    if (singleReading) {
        // If only one reading allowed, check if we have it
        if (readings.length === 0) {
            showModal('Please enter at least one systolic blood pressure reading.');
            return;
        }
        
        // Set SD to 0 since we only have one reading
        document.getElementById(`${prefix}-sbp-sd`).value = '0';
        document.getElementById(`${prefix}-sbp-sd-result`).style.display = 'block';
        document.getElementById(`${prefix}-sbp-sd-result`).textContent = 
            `Standard Deviation: 0 mmHg (from single reading)`;
            
        // Also set main SBP value to the single reading
        document.getElementById(`${prefix}-sbp`).value = readings[0];
        
        return;
    } else if (readings.length < 3) {
        showModal('Please enter at least 3 systolic blood pressure readings to calculate standard deviation, or check the 'I only have 1 systolic reading' box.');
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
        `Standard Deviation: ${standardDeviation.toFixed(1)}