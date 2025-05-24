javascript/**
 * Complete QRISK3 Implementation based on the official algorithm
 * This replaces the existing simplified QRISK3 calculation in the calculator
 */

/**
 * Calculate QRISK3 score using the official algorithm
 * @param {Object} data - Patient data from the form
 * @returns {Object} - Risk calculation results
 */
function qrisk3AlgorithmCalculator(data) {
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
 * Complete QRISK3 Implementation based on the official algorithm
 * This replaces the existing simplified QRISK3 calculation in the calculator
 */

/**
 * Calculate QRISK3 score using the official algorithm
 * @param {Object} data - Patient data from the form
 * @returns {Object} - Risk calculation results
 */
function qrisk3AlgorithmCalculator(data) {
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