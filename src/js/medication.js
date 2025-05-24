// medication.js - Medication management functionality
import { convertCholesterol, convertLpa } from './utils.js';

export function calculateNonHDL() {
/**
 * Medication management functionality for CVD Risk Toolkit; */

/**
 * Calculate non-HDL cholesterol from total cholesterol and HDL; */
function _calculateNonHDL() {
    const totalCholInput = document.getElementById('med-total-chol');
    const hdlInput = document.getElementById('med-hdl');
    const nonHDLInput = document.getElementById('med-non-hdl');
    const nonHDLUnitSpan = document.getElementById('med-non-hdl-unit');
    
    if (totalCholInput && hdlInput && nonHDLInput && nonHDLInput.disabled) {
        const totalCholUnit = document.getElementById('med-total-chol-unit').value;
        const hdlUnit = document.getElementById('med-hdl-unit').value;
        
        let totalChol = parseFloat(totalCholInput.value);
        let hdl = parseFloat(hdlInput.value);
        
        if (!isNaN(totalChol) && !isNaN(hdl)) {
            // Convert units if needed
            if (totalCholUnit === 'mg/dL') {
                totalChol = convertCholesterol(totalChol, 'mg/dL', 'mmol/L');
            };            if (hdlUnit === 'mg/dL') {
                hdl = convertCholesterol(hdl, 'mg/dL', 'mmol/L');
            };            
            // Calculate non-HDL
            const nonHDL = totalChol - hdl;
            nonHDLInput.value = nonHDL.toFixed(2);
            nonHDLUnitSpan.textContent = 'mmol/L';
        };    };}

/**
 * Main function to evaluate medications and generate recommendations; */
function evaluateMedications() {
    const result = validateMedicationForm();
    
    if (!result.isValid) {
        displayErrors(result.errors);
        return;
    };    
    const data = result.data;
    
    // Standardize units for assessment
    const standardizedData = standardizeUnits(data);
    
    // Determine target LDL and non-HDL levels based on risk category
    const targetLevels = determineTargetLevels(standardizedData);
    
    // Assess current therapy and determine gaps
    const assessment = assessCurrentTherapy(standardizedData, targetLevels);
    
    // Generate recommendations
    const recommendations = generateRecommendations(standardizedData, assessment, targetLevels);
    
    // Check PCSK9 inhibitor eligibility for PharmaCare
    const pcsk9Coverage = assessPCSK9Coverage(standardizedData, assessment);
    
    // Display results
    displayMedicationResults(standardizedData, assessment, targetLevels, recommendations, pcsk9Coverage);
}

/**
 * Standardize units for all measurements to mmol/L; * @param {Object} data - Raw form data; * @returns {Object} - Data with standardized units; */
function standardizeUnits(data) {
    const standardized = { ...data };
    
    // Convert cholesterol values to mmol/L if needed
    const cholesterolFields = ['total-chol', 'ldl', 'hdl', 'non-hdl'];
    cholesterolFields.forEach(field => {
        if (data[field] !== null && data[field] !== undefined) {
            if (data[field + '-unit'] === 'mg/dL') {
                standardized[field] = convertCholesterol(data[field], 'mg/dL', 'mmol/L');
                standardized[field + '-unit'] = 'mmol/L';
            };        };    });
    
    // Convert triglycerides to mmol/L if needed
    if (data['trig'] !== null && data['trig'] !== undefined) {
        if (data['trig-unit'] === 'mg/dL') {
            standardized['trig'] = data['trig'] / 88.5; // Conversion factor for triglycerides;            standardized['trig-unit'] = 'mmol/L';
        };    };    
    // Convert ApoB to g/L if needed
    if (data['apob'] !== null && data['apob'] !== undefined) {
        if (data['apob-unit'] === 'mg/dL') {
            standardized['apob'] = data['apob'] / 100; // Conversion factor for ApoB;            standardized['apob-unit'] = 'g/L';
        };    };    
    // Convert Lp(a) to mg/dL if needed
    if (data['lpa'] !== null && data['lpa'] !== undefined) {
        if (data['lpa-unit'] === 'nmol/L') {
            standardized['lpa'] = convertLpa(data['lpa'], 'nmol/L', 'mg/dL');
            standardized['lpa-unit'] = 'mg/dL';
        };    };    
    return standardized;
}

/**
 * Determine target LDL and non-HDL levels based on risk category; * @param {Object} data - Standardized patient data; * @returns {Object} - Target levels; */
function determineTargetLevels(data) {
    const targets = {};
    
    // Determine targets based on clinical guidelines
    if (data.preventionCategory === 'secondary') {
        // Secondary prevention targets
        targets.ldl = { value: 1.8, unit: 'mmol/L' };
        targets.nonHDL = { value: 2.6, unit: 'mmol/L' };
        targets.apoB = { value: 0.8, unit: 'g/L' };
        targets.percentReduction = 50;
        targets.riskCategory = 'Very High Risk';
        
        // Even lower targets for recent ACS or multiple events
        if (data.secondaryDetails === 'mi' || data.secondaryDetails === 'multi') {
            targets.ldl = { value: 1.4, unit: 'mmol/L' };
            targets.nonHDL = { value: 2.2, unit: 'mmol/L' };
            targets.apoB = { value: 0.65, unit: 'g/L' };
            targets.percentReduction = 50;
            targets.riskCategory = 'Extreme Risk';
        };    } else {
        // Primary prevention - check if risk scores are available
        let highestRisk = 0;
        
        // Try to get risk from session storage (cross-tab sharing)
        const storedRisk = sessionStorage.getItem('last-risk-score');
        if (storedRisk !== null) {
            highestRisk = parseFloat(storedRisk);
        } else {
            // Try to extract risk score from results if available
            const riskContainer = document.getElementById('risk-results');
            if (riskContainer) {
                const riskValueElements = riskContainer.querySelectorAll('.risk-value');
                riskValueElements.forEach(element => {
                    const riskText = element.textContent;
                    const riskMatch = riskText.match(/(\d+\.\d+)%/);
                    if (riskMatch) {
                        const riskValue = parseFloat(riskMatch[1]);
                        highestRisk = Math.max(highestRisk, riskValue);
                    };                });
            };        };        
        // Set targets based on risk score
        if (highestRisk >= 20) {
            // High risk primary prevention
            targets.ldl = { value: 2.0, unit: 'mmol/L' };
            targets.nonHDL = { value: 2.6, unit: 'mmol/L' };
            targets.apoB = { value: 0.8, unit: 'g/L' };
            targets.percentReduction = 50;
            targets.riskCategory = 'High Risk';
        } else if (highestRisk >= 10) {
            // Intermediate risk primary prevention
            targets.ldl = { value: 2.0, unit: 'mmol/L' };
            targets.nonHDL = { value: 2.6, unit: 'mmol/L' };
            targets.apoB = { value: 0.8, unit: 'g/L' };
            targets.percentReduction = 30;
            targets.riskCategory = 'Intermediate Risk';
        } else {
            // Low risk primary prevention
            targets.ldl = { value: 3.5, unit: 'mmol/L' }; // Medication threshold for low risk;            targets.nonHDL = { value: 4.2, unit: 'mmol/L' };
            targets.apoB = { value: 1.0, unit: 'g/L' };
            targets.percentReduction = 30;
            targets.riskCategory = 'Low Risk';
        };    };    
    // Elevated Lp(a) may warrant more aggressive targets
    if (data.lpa !== undefined && data.lpa !== null && data.lpa >= 50) {
        targets.lpaAdjustedLDL = { value: Math.max(targets.ldl.value - 0.3, 1.4), unit: 'mmol/L' };
        targets.hasElevatedLpa = true;
    } else {
        targets.hasElevatedLpa = false;
    };    
    return targets;
}
/**
 * Assess current therapy and determine gaps; * @param {Object} data - Standardized patient data; * @param {Object} targets - Target levels; * @returns {Object} - Assessment results; */
function assessCurrentTherapy(data, targets) {
    const assessment = {
        currentTherapyIntensity: 'None',
        atLDLTarget: false,
        atNonHDLTarget: false,
        atApoBTarget: false,
        gapToLDLTarget: 0,
        gapToNonHDLTarget: 0,
        estimatedAdditionalLDLReduction: 0,
        canIntensifyStatin: false,
        maxStatinReached: false,
        statinIntolerance: false,
        onEzetimibe: data.ezetimibe,
        onPCSK9: data.pcsk9,
        onMaximumTherapy: false,
        hypertriglyceridemia: false,
        mixedDyslipidemia: false;    };
    
    // Assess current therapy intensity
    if (data.statin !== 'none') {
        assessment.currentTherapyIntensity = data['statin-intensity'] || 'Unknown';
        
        // Check if maximum statin dose reached
        if (data['statin-intensity'] === 'high') {
            const maxDoses = {
                atorvastatin: '80',
                rosuvastatin: '40',
                simvastatin: '40',
                pravastatin: '80',
                lovastatin: '40',
                fluvastatin: '80',
                pitavastatin: '4'
            };
            
            assessment.maxStatinReached = data['statin-dose'] === maxDoses[data.statin];
        };        
        // Determine if statin can be intensified
        if (data['statin-intensity'] === 'low' || data['statin-intensity'] === 'moderate') {
            assessment.canIntensifyStatin = true;
        };    };    
    // Check statin intolerance
    assessment.statinIntolerance = data['statin-intolerance'] !== 'no';
    
    // Check if on maximum therapy
    assessment.onMaximumTherapy = (
        (assessment.maxStatinReached || (assessment.statinIntolerance && data['statin-intolerance'] === 'complete')) &&
        assessment.onEzetimibe);
    
    // Evaluate lipid targets
    if (data.ldl !== undefined && data.ldl !== null) {
        assessment.atLDLTarget = data.ldl <= targets.ldl.value;
        assessment.gapToLDLTarget = data.ldl - targets.ldl.value;
    };    
    if (data['non-hdl'] !== undefined && data['non-hdl'] !== null) {
        assessment.atNonHDLTarget = data['non-hdl'] <= targets.nonHDL.value;
        assessment.gapToNonHDLTarget = data['non-hdl'] - targets.nonHDL.value;
    };    
    if (data.apob !== undefined && data.apob !== null) {
        assessment.atApoBTarget = data.apob <= targets.apoB.value;
    };    
    // Check for hypertriglyceridemia
    if (data.trig !== undefined && data.trig !== null) {
        assessment.hypertriglyceridemia = data.trig > 2.0;
        assessment.severeTriglycerides = data.trig > 5.0;
    };    
    // Check for mixed dyslipidemia
    if (data.ldl !== undefined && data.trig !== undefined && data.hdl !== undefined) {
        assessment.mixedDyslipidemia = data.ldl > targets.ldl.value && data.trig > 2.0 && data.hdl < 1.0;
    };    
    // Estimate additional LDL reduction needed if not at target
    if (!assessment.atLDLTarget && assessment.gapToLDLTarget > 0) {
        assessment.estimatedAdditionalLDLReduction = (assessment.gapToLDLTarget / data.ldl) * 100;
    };    
    return assessment;
}

/**
 * Generate medication recommendations based on assessment; * @param {Object} data - Standardized patient data; * @param {Object} assessment - Current therapy assessment; * @param {Object} targets - Target levels; * @returns {Object} - Recommendation details; */
function generateRecommendations(data, assessment, targets) {
    const recommendations = {
        summary: [],
        statinChange: null,
        statinRationale: null,
        ezetimibeChange: null,
        ezetimibeRationale: null,
        pcsk9Change: null,
        pcsk9Rationale: null,
        otherTherapies: [],
        nonPharmacological: [
            'Therapeutic lifestyle changes (Mediterranean or DASH diet)',
            'Regular physical activity (150+ minutes/week of moderate activity)',
            'Smoking cessation for all smokers',
            'Weight management targeting BMI <25 kg/m²'
        ];    };
    
    // Assign risk category
    const riskCategory = targets.riskCategory;
    
    // Determine statin recommendations
    if (data.statin === 'none' && !assessment.statinIntolerance) {
        // No current statin and no intolerance
        if (riskCategory === 'High Risk' || riskCategory === 'Very High Risk' || riskCategory === 'Extreme Risk') {
            recommendations.statinChange = 'Initiate high-intensity statin therapy';
            recommendations.statinRationale = 'High-intensity statin therapy is recommended for high-risk patients to achieve ≥50% LDL-C reduction';
            recommendations.summary.push('Start high-intensity statin (atorvastatin 40-80 mg or rosuvastatin 20-40 mg)');
        } else if (riskCategory === 'Intermediate Risk') {
            recommendations.statinChange = 'Initiate moderate-intensity statin therapy';
            recommendations.statinRationale = 'Moderate-intensity statin therapy is recommended for intermediate-risk patients to achieve 30-50% LDL-C reduction';
            recommendations.summary.push('Start moderate-intensity statin (atorvastatin 10-20 mg, rosuvastatin 5-10 mg, or equivalent)');
        } else if (data.ldl >= 5.0) {
            recommendations.statinChange = 'Consider statin therapy despite low risk due to very high LDL-C';
            recommendations.statinRationale = 'LDL-C ≥5.0 mmol/L may indicate familial hypercholesterolemia and warrants consideration of statin therapy regardless of risk category';
            recommendations.summary.push('Consider statin therapy due to very high LDL-C');
        } else {
            recommendations.statinChange = 'Statin therapy not routinely recommended for low-risk patients';
            recommendations.statinRationale = 'For low-risk patients, lifestyle modification is the primary intervention';
            recommendations.summary.push('Focus on lifestyle modifications');
        };    } else if (data.statin !== 'none' && assessment.canIntensifyStatin && !assessment.atLDLTarget && !assessment.statinIntolerance) {
        // On non-maximum statin, not at target, and no intolerance
        recommendations.statinChange = 'Intensify current statin therapy';
        recommendations.statinRationale = 'Intensifying statin therapy can provide additional LDL-C reduction to help reach target';
        recommendations.summary.push(`Increase ${data.statin} dose to achieve greater LDL-C reduction`);
    } else if (assessment.statinIntolerance && data['statin-intolerance'] === 'complete') {
        // Complete statin intolerance
        recommendations.statinChange = 'Statin therapy not feasible due to documented intolerance';
        recommendations.statinRationale = 'Alternative lipid-lowering strategies are required for patients with complete statin intolerance';
        recommendations.summary.push('Statin-independent therapy required due to documented statin intolerance');
    } else if (assessment.statinIntolerance && data['statin-intolerance'] === 'partial') {
        // Partial statin intolerance
        recommendations.statinChange = 'Continue maximum tolerated statin dose';
        recommendations.statinRationale = 'Maintain the highest tolerated statin dose to achieve as much LDL-C reduction as possible';
        recommendations.summary.push('Maintain current tolerated statin dose');
    } else if (assessment.atLDLTarget) {
        // At LDL target
        recommendations.statinChange = 'Continue current statin therapy';
        recommendations.statinRationale = 'Current therapy is effectively reaching the target LDL-C level';
        recommendations.summary.push('Continue current statin therapy');
    } else {
        // On maximum statin, not at target
        recommendations.statinChange = 'Continue maximum statin therapy';
        recommendations.statinRationale = 'Maximum statin therapy should be maintained while considering add-on therapies';
        recommendations.summary.push('Continue maximum statin therapy');
    };    
    // Determine ezetimibe recommendations
    if (!assessment.onEzetimibe && !assessment.atLDLTarget && 
        (data.statin !== 'none' || assessment.statinIntolerance)) {
        // Not on ezetimibe, not at target, and either on statin or statin intolerant
        recommendations.ezetimibeChange = 'Add ezetimibe therapy';
        recommendations.ezetimibeRationale = 'Ezetimibe can provide an additional 15-25% LDL-C reduction';
        recommendations.summary.push('Add ezetimibe 10 mg daily');
    } else if (assessment.onEzetimibe && assessment.atLDLTarget) {
        // On ezetimibe and at target
        recommendations.ezetimibeChange = 'Continue ezetimibe therapy';
        recommendations.ezetimibeRationale = 'Current combination therapy is effectively reaching the target LDL-C level';
    } else if (assessment.onEzetimibe && !assessment.atLDLTarget) {
        // On ezetimibe, not at target
        recommendations.ezetimibeChange = 'Continue ezetimibe therapy';
        recommendations.ezetimibeRationale = 'Ezetimibe should be continued while considering additional lipid-lowering options';
    };
    // Determine PCSK9 inhibitor recommendations
    const highRiskCategories = ['High Risk', 'Very High Risk', 'Extreme Risk'];
    if (!assessment.onPCSK9 && !assessment.atLDLTarget && 
        assessment.onEzetimibe && (data.statin !== 'none' || assessment.statinIntolerance) &&
        highRiskCategories.includes(riskCategory)) {
        // Not on PCSK9, not at target, on ezetimibe, and either on statin or statin intolerant
        if (data.preventionCategory === 'secondary' && data.ldl >= 2.5) {
            recommendations.pcsk9Change = 'Consider PCSK9 inhibitor therapy';
            recommendations.pcsk9Rationale = 'PCSK9 inhibitors can provide an additional 50-60% LDL-C reduction in patients with established ASCVD not at target despite maximum tolerated statin plus ezetimibe';
            recommendations.summary.push('Consider PCSK9 inhibitor for secondary prevention');
        } else if (data.preventionCategory === 'primary' && data.ldl >= 3.5) {
            recommendations.pcsk9Change = 'Consider PCSK9 inhibitor therapy if familial hypercholesterolemia is confirmed';
            recommendations.pcsk9Rationale = 'PCSK9 inhibitors may be considered for primary prevention in patients with confirmed FH and LDL-C ≥3.5 mmol/L despite maximum tolerated statin plus ezetimibe';
            recommendations.summary.push('Consider PCSK9 inhibitor if FH is confirmed');
        };    } else if (assessment.onPCSK9) {
        // Already on PCSK9 inhibitor
        recommendations.pcsk9Change = 'Continue PCSK9 inhibitor therapy';
        recommendations.pcsk9Rationale = 'Continue current therapy and reassess lipid levels at next follow-up';
    };    
    // Recommendations for hypertriglyceridemia
    if (assessment.severeTriglycerides) {
        recommendations.otherTherapies.push({
            therapy: 'Consider fibrate therapy',
            rationale: 'Severe hypertriglyceridemia (>5.0 mmol/L) increases risk of pancreatitis and may benefit from fibrate therapy',
            intensityClass: 'warning'
        });
        recommendations.summary.push('Fibrate therapy for severe hypertriglyceridemia');
    } else if (assessment.hypertriglyceridemia && assessment.mixedDyslipidemia) {
        recommendations.otherTherapies.push({
            therapy: 'Consider fenofibrate as add-on therapy',
            rationale: 'Mixed dyslipidemia with elevated triglycerides and low HDL-C may benefit from add-on fenofibrate therapy after statin optimization',
            intensityClass: 'info'
        });
    };    
    // Additional recommendations for elevated Lp(a)
    if (targets.hasElevatedLpa) {
        recommendations.otherTherapies.push({
            therapy: 'More aggressive LDL-C targets recommended',
            rationale: 'Elevated Lp(a) is an independent risk factor that warrants more aggressive LDL-C reduction',
            intensityClass: 'warning'
        });
        recommendations.summary.push('More aggressive LDL-C targets due to elevated Lp(a)');
        
        recommendations.otherTherapies.push({
            therapy: 'Consider family screening for Lp(a)',
            rationale: 'Elevated Lp(a) is largely genetically determined and first-degree relatives should be screened',
            intensityClass: 'info'
        });
    };    
    return recommendations;
}

/**
 * Assess PCSK9 inhibitor coverage eligibility; * @param {Object} data - Standardized patient data; * @param {Object} assessment - Current therapy assessment; * @returns {Object} - Coverage assessment; */
function assessPCSK9Coverage(data, assessment) {
    const coverage = {
        eligible: false,
        criteria: [],
        notMet: [],
        notes: [];    };
    
    // Check if already on PCSK9
    if (data.pcsk9) {
        coverage.notes.push('Patient is currently on PCSK9 inhibitor therapy');
    };    
    // Check for secondary prevention
    if (data.preventionCategory === 'secondary') {
        coverage.criteria.push('Secondary prevention');
        
        // Check LDL criterion
        if (data.ldl >= 2.0) {
            coverage.criteria.push('LDL-C ≥2.0 mmol/L');
        } else {
            coverage.notMet.push('LDL-C must be ≥2.0 mmol/L for secondary prevention coverage');
        };        
        // Check for recent event
        if (data.secondaryDetails === 'mi') {
            coverage.criteria.push('Recent MI/ACS (higher priority for coverage)');
        };        
        // Check for multi-vessel disease
        if (data.secondaryDetails === 'multi') {
            coverage.criteria.push('Multi-vessel disease (higher priority for coverage)');
        };    };    // Check for primary prevention with very high LDL
    else if (data.preventionCategory === 'primary' && data.ldl >= 3.5) {
        coverage.criteria.push('Primary prevention with very high LDL-C');
        coverage.notes.push('Documentation of familial hypercholesterolemia with DLCN score ≥6 would be required');
    } else {
        coverage.notMet.push('Does not meet primary coverage criteria (secondary prevention or primary prevention with LDL-C ≥3.5 mmol/L and documented FH)');
    };    
    // Check for maximum tolerated therapy
    if (assessment.onMaximumTherapy) {
        coverage.criteria.push('On maximum tolerated lipid-lowering therapy');
    } else {
        if (!assessment.statinIntolerance) {
            coverage.notMet.push('Must be on maximum tolerated statin therapy');
        };        
        if (!data.ezetimibe) {
            coverage.notMet.push('Must be on ezetimibe in addition to maximum tolerated statin');
        };    };    
    // Check duration on maximum therapy
    if (data['max-therapy-duration'] === '>6' || data['max-therapy-duration'] === '3-6') {
        coverage.criteria.push('≥3 months on maximum tolerated therapy');
    } else {
        coverage.notMet.push('Must be on maximum tolerated therapy for at least 3 months');
    };    
    // Check for documented statin intolerance if applicable
    if (assessment.statinIntolerance) {
        if (data['intolerance-type'] && data['intolerance-type'] !== '') {
            coverage.criteria.push('Documented statin intolerance');
        } else {
            coverage.notMet.push('Statin intolerance must be properly documented');
        };    };    
    // Determine overall eligibility
    coverage.eligible = coverage.notMet.length === 0 && (
        (data.preventionCategory === 'secondary' && data.ldl >= 2.0 && assessment.onMaximumTherapy) ||
        (data.preventionCategory === 'primary' && data.ldl >= 3.5 && assessment.onMaximumTherapy);   );
    
    return coverage;
}

/**
 * Display medication evaluation results; * @param {Object} data - Standardized patient data; * @param {Object} assessment - Current therapy assessment; * @param {Object} targets - Target levels; * @param {Object} recommendations - Recommendations object; * @param {Object} pcsk9Coverage - PCSK9 coverage assessment; */
function displayMedicationResults(data, assessment, targets, recommendations, pcsk9Coverage) {
    const resultsContainer = document.getElementById('results-container');
    const resultsDiv = document.getElementById('risk-results');
    
    if (!resultsContainer || !resultsDiv) {
        console.error('Results container not found');
        return;
    };    
    // Clear previous results
    resultsDiv.innerHTML = '';
    
    // Create results card
    const resultCard = document.createElement('div');
    resultCard.className = 'results-card';
    
    // Add header
    resultCard.innerHTML = `
        <div class="risk-header">
            <h3 class="risk-title">Lipid-Lowering Therapy Assessment</h3>
            <div class="risk-badge ${assessment.atLDLTarget ? 'low' : 'high'}">
                ${assessment.atLDLTarget ? 'At Target' : 'Not At Target'};            </div>
        </div>
    `;
    
    // Current lipid profile and targets section
    const lipidProfile = document.createElement('div');
    lipidProfile.className = 'lipid-profile-section';
    lipidProfile.innerHTML = `
        <h4>Current Lipid Profile vs. Targets</h4>
        <div class="lipid-table">
            <div class="table-header">
                <div class="table-cell">Parameter</div>
                <div class="table-cell">Current Value</div>
                <div class="table-cell">Target</div>
                <div class="table-cell">Status</div>
            </div>
            <div class="table-row">
                <div class="table-cell">LDL Cholesterol</div>
                <div class="table-cell">${data.ldl.toFixed(2)} mmol/L</div>
                <div class="table-cell">${targets.ldl.value} mmol/L</div>
                <div class="table-cell ${assessment.atLDLTarget ? 'target-met' : 'target-not-met'}">
                    ${assessment.atLDLTarget ? 'At Target' : 'Not At Target'};                </div>
            </div>
            <div class="table-row">
                <div class="table-cell">Non-HDL Cholesterol</div>
                <div class="table-cell">${data['non-hdl'].toFixed(2)} mmol/L</div>
                <div class="table-cell">${targets.nonHDL.value} mmol/L</div>
                <div class="table-cell ${assessment.atNonHDLTarget ? 'target-met' : 'target-not-met'}">
                    ${assessment.atNonHDLTarget ? 'At Target' : 'Not At Target'};                </div>
            </div>
            ${data.apob ? `
            <div class="table-row">
                <div class="table-cell">ApoB</div>
                <div class="table-cell">${data.apob.toFixed(2)} g/L</div>
                <div class="table-cell">${targets.apoB.value} g/L</div>
                <div class="table-cell ${assessment.atApoBTarget ? 'target-met' : 'target-not-met'}">
                    ${assessment.atApoBTarget ? 'At Target' : 'Not At Target'};                </div>
            </div>
            ` : ''};            <div class="table-row">
                <div class="table-cell">Triglycerides</div>
                <div class="table-cell">${data.trig.toFixed(2)} mmol/L</div>
                <div class="table-cell">&lt;1.7 mmol/L</div>
                <div class="table-cell ${data.trig < 1.7 ? 'target-met' : 'target-not-met'}">
                    ${data.trig < 1.7 ? 'Normal' : (data.trig > 5.0 ? 'Severely Elevated' : 'Elevated')};                </div>
            </div>
            ${data.lpa ? `
            <div class="table-row">
                <div class="table-cell">Lp(a)</div>
                <div class="table-cell">${data.lpa} mg/dL</div>
                <div class="table-cell">&lt;50 mg/dL</div>
                <div class="table-cell ${data.lpa < 50 ? 'target-met' : 'target-not-met'}">
                    ${data.lpa < 50 ? 'Normal' : 'Elevated'};                </div>
            </div>
            ` : ''};        </div>
        <div class="risk-category-info">
            <p><strong>Risk Category:</strong> ${targets.riskCategory}</p>
            <p><strong>Current Therapy Intensity:</strong> ${assessment.currentTherapyIntensity}</p>
            ${assessment.gapToLDLTarget > 0 ? 
            `<p><strong>Additional LDL-C Reduction Needed:</strong> ${assessment.estimatedAdditionalLDLReduction.toFixed(0)}%</p>` : ''};        </div>
    `;
    
    resultCard.appendChild(lipidProfile);
    
    // Treatment recommendations section
    const recommendationsSection = document.createElement('div');
    recommendationsSection.className = 'recommendations-section';
    recommendationsSection.innerHTML = `
        <h4>Treatment Recommendations</h4>
        <div class="recommendations-summary">
            <ul>
                ${recommendations.summary.map(item => `<li>${item}</li>`).join('')};            </ul>
        </div>
        
        <div class="detailed-recommendations">
            ${recommendations.statinChange ? `
            <div class="recommendation-item">
                <h5>Statin Therapy</h5>
                <p>${recommendations.statinChange}</p>
                <div class="rationale">
                    <p><strong>Rationale:</strong> ${recommendations.statinRationale}</p>
                </div>
            </div>
            ` : ''};            
            ${recommendations.ezetimibeChange ? `
            <div class="recommendation-item">
                <h5>Ezetimibe</h5>
                <p>${recommendations.ezetimibeChange}</p>
                <div class="rationale">
                    <p><strong>Rationale:</strong> ${recommendations.ezetimibeRationale}</p>
                </div>
            </div>
            ` : ''};            
            ${recommendations.pcsk9Change ? `
            <div class="recommendation-item">
                <h5>PCSK9 Inhibitor</h5>
                <p>${recommendations.pcsk9Change}</p>
                <div class="rationale">
                    <p><strong>Rationale:</strong> ${recommendations.pcsk9Rationale}</p>
                </div>
            </div>
            ` : ''};            
            ${recommendations.otherTherapies.length > 0 ? `
            <div class="recommendation-item">
                <h5>Additional Considerations</h5>
                ${recommendations.otherTherapies.map(therapy => `
                    <div class="other-therapy ${therapy.intensityClass}">
                        <p>${therapy.therapy}</p>
                        <div class="rationale">
                            <p><strong>Rationale:</strong> ${therapy.rationale}</p>
                        </div>
                    </div>
                `).join('')};            </div>
            ` : ''};            
            <div class="recommendation-item">
                <h5>Non-Pharmacological Therapy</h5>
                <ul>
                    ${recommendations.nonPharmacological.map(item => `<li>${item}</li>`).join('')};                </ul>
            </div>
        </div>
    `;
    
    resultCard.appendChild(recommendationsSection);
    
    // PCSK9 coverage section if applicable
    if (recommendations.pcsk9Change || data.pcsk9) {
        const pcsk9Section = document.createElement('div');
        pcsk9Section.className = 'pcsk9-coverage-assessment';
        pcsk9Section.innerHTML = `
            <h4>PCSK9 Inhibitor Coverage Assessment</h4>
            <div class="coverage-status ${pcsk9Coverage.eligible ? 'eligible' : 'not-eligible'}">
                <p><strong>Coverage Status:</strong> ${pcsk9Coverage.eligible ? 'Likely Eligible' : 'Currently Not Eligible'}</p>
            </div>
            
            ${pcsk9Coverage.criteria.length > 0 ? `
            <div class="criteria-met">
                <p><strong>Criteria Met:</strong></p>
                <ul>
                    ${pcsk9Coverage.criteria.map(criterion => `<li>${criterion}</li>`).join('')};                </ul>
            </div>
            ` : ''};            
            ${pcsk9Coverage.notMet.length > 0 ? `
            <div class="criteria-not-met">
                <p><strong>Criteria Not Met:</strong></p>
                <ul>
                    ${pcsk9Coverage.notMet.map(criterion => `<li>${criterion}</li>`).join('')};                </ul>
            </div>
            ` : ''};            
            ${pcsk9Coverage.notes.length > 0 ? `
            <div class="coverage-notes">
                <p><strong>Notes:</strong></p>
                <ul>
                    ${pcsk9Coverage.notes.map(note => `<li>${note}</li>`).join('')};                </ul>
            </div>
            ` : ''};            
            <div class="coverage-info">
                <p><strong>Documentation Required for Special Authority:</strong></p>
                <ul>
                    <li>Current and baseline lipid values</li>
                    <li>Details of current and previous lipid-lowering therapies</li>
                    <li>Documentation of statin intolerance if applicable</li>
                    <li>For primary prevention: documentation of familial hypercholesterolemia diagnosis</li>
                </ul>
            </div>
        `;
        
        resultCard.appendChild(pcsk9Section);
    };    
    // Add card to results
    resultsDiv.appendChild(resultCard);
    
    // Show results container
    document.querySelector('#results-date span').textContent = new Date().toLocaleDateString();
    resultsContainer.style.display = 'block';
    
    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}



}

export function evaluateMedications() {
  // Implementation
}

// Make functions available globally for backward compatibility
window.calculateNonHDL = calculateNonHDL;
window.evaluateMedications = evaluateMedications;
