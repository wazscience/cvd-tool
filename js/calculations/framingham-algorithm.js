/**
 * Framingham Risk Score Algorithm Implementation (Operational & Integrated)
 * @file /js/calculations/framingham-algorithm.js
 * @description Advanced implementation of the 2008 Framingham Heart Study General CVD risk algorithm.
 * Designed to be a pure calculation engine, receiving pre-processed data.
 * Based on user's v3.0.0 [cite: uploaded:framingham-algorithm.js] and enhanced for service architecture.
 * @version 3.1.0
 * @author CVD Risk Assessment Team
 * @reference D'Agostino RB Sr, et al. General cardiovascular risk profile for use in primary care: the Framingham Heart Study. Circulation. 2008;117(6):743-53.
 */

'use strict';

class FraminghamRiskScore {
    /**
     * Constructor initializes all necessary calculator components.
     * @param {object} [dependencies={}] - Injected dependencies.
     * Expected: ErrorLogger, PerformanceMonitor (optional), ClinicalThresholds (optional for risk categories/modifiers).
     */
    constructor(dependencies = {}) {
        this.dependencies = {
            ErrorLogger: dependencies.ErrorLogger || { handleError: console.error, log: console.log },
            PerformanceMonitor: dependencies.PerformanceMonitor || { start: () => Date.now(), end: (label, startTime) => console.log(`${label} took ${Date.now() - startTime}ms`) },
            ClinicalThresholds: dependencies.ClinicalThresholds || window.ClinicalThresholds, // Assumes global if not passed
        };

        this.VERSION = '3.1.0';

        this.FEMALE = 0;
        this.MALE = 1;

        // Coefficients and Means from D'Agostino 2008, as provided by user [cite: uploaded:framingham-algorithm.js (lines 43-94)]
        // These are critical and assumed to be accurate per the publication.
        this.femaleCoefficients = {
            ln_age: 2.32888, ln_total_cholesterol: 1.20904, ln_hdl: -0.70833,
            ln_untreated_sbp: 2.82263, ln_treated_sbp: 2.76157,
            smoker: 0.52873, diabetes: 0.69154
        };
        this.maleCoefficients = {
            ln_age: 3.06117, ln_total_cholesterol: 1.12370, ln_hdl: -0.93263,
            ln_untreated_sbp: 1.93303, ln_treated_sbp: 1.99881,
            smoker: 0.65451, diabetes: 0.57367
        };
        this.femaleSurvival10 = 0.95012;
        this.maleSurvival10 = 0.88936;
        this.femaleMeans = { // Means of the (log-transformed) variables or binary indicators
            ln_age: 3.8686, ln_total_cholesterol: 5.2893, ln_hdl: 4.0333,
            ln_untreated_sbp: 4.2391, ln_treated_sbp: 1.9533,
            smoker: 0.3456, diabetes: 0.0892
        };
        this.maleMeans = {
            ln_age: 3.8498, ln_total_cholesterol: 5.2516, ln_hdl: 3.7853,
            ln_untreated_sbp: 4.3168, ln_treated_sbp: 1.7892,
            smoker: 0.3318, diabetes: 0.0899
        };

        this.initialized = true;
        this.dependencies.ErrorLogger.log?.('info', `FraminghamRiskScore Algorithm initialized (v${this.VERSION}).`, 'FRS-Init');
    }

    _log(level, message, data) {
        this.dependencies.ErrorLogger.log?.(level, `FRS-AlgoEngine: ${message}`, data);
    }
    _handleError(error, context, additionalData = {}) {
        const msg = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(msg, `FRS-AlgoEngine-${context}`, 'error', { originalError: error, ...additionalData });
    }

    /**
     * Processes inputs specifically for the Framingham algorithm's internal calculations.
     * Assumes data is already validated, sanitized, and unit-converted by RiskCalculator.
     * @param {object} validatedData - Data from RiskCalculator._prepareAndValidateData.
     * Expected fields: age (number), sex ('male'/'female'), totalCholesterol (number, mmol/L),
     * hdl (number, mmol/L), systolicBP (number), onBPMeds (boolean),
     * isSmoker (boolean), hasDiabetes (boolean). Optional: lpa, lpaUnit, familyHistory, isSouthAsian.
     * @returns {object} Data processed for the Framingham formula (e.g., log-transformed values).
     * @private
     */
    _processInputsForAlgorithm(validatedData) {
        const perfId = this.dependencies.PerformanceMonitor.start('FRS_Algo_processInputs');
        const p = {}; // processed data for algorithm
        try {
            p.sex = (String(validatedData.sex).toLowerCase() === 'female') ? this.FEMALE : this.MALE;
            p.age = Number(validatedData.age);
            p.ln_age = Math.log(p.age);

            p.total_cholesterol = Number(validatedData.totalCholesterol);
            p.ln_total_cholesterol = Math.log(p.total_cholesterol);
            p.hdl = Number(validatedData.hdl);
            p.ln_hdl = Math.log(p.hdl);

            p.sbp = Number(validatedData.systolicBP);
            const ln_sbp_val = Math.log(p.sbp);

            p.bp_treatment = validatedData.onBPMeds ? 1 : 0;
            if (p.bp_treatment === 1) {
                p.ln_treated_sbp = ln_sbp_val;
                p.ln_untreated_sbp = 0; // Per common implementation structure for (Xi - Mi)
            } else {
                p.ln_treated_sbp = 0;
                p.ln_untreated_sbp = ln_sbp_val;
            }

            p.smoker = validatedData.isSmoker ? 1 : 0;
            p.diabetes = validatedData.hasDiabetes ? 1 : 0;

            // Carry over modifier-related fields if present in validatedData
            p.lpa = validatedData.lpa !== undefined ? Number(validatedData.lpa) : undefined;
            p.lpaUnit = validatedData.lpaUnit || this.dependencies.ClinicalThresholds?.get('LPA.DEFAULT_UNIT', 'mg/dL') || 'mg/dL';
            p.familyHistory = validatedData.familyHistory ? 1 : 0;
            p.isSouthAsian = validatedData.isSouthAsian ? 1 : 0;

            // Input validation for critical algorithm inputs (secondary check)
            const criticalFields = {age: p.age, total_cholesterol: p.total_cholesterol, hdl: p.hdl, sbp: p.sbp};
            for(const field in criticalFields){
                if(isNaN(criticalFields[field]) || criticalFields[field] <= 0){ // Log values are derived, so check original
                     throw new Error(`Invalid or non-positive critical value for ${field}: ${criticalFields[field]}`);
                }
            }
            if(p.hdl <=0) throw new Error('HDL must be positive for log transformation.');


        } catch (error) {
            this._handleError(error, 'ProcessInputs', { inputDataSnippet: JSON.stringify(validatedData).substring(0,100) });
            throw error; // Re-throw to be caught by calculateRisk
        }
        this.dependencies.PerformanceMonitor.end(perfId);
        return p;
    }

    _calculateFraminghamSum(data) {
        const perfId = this.dependencies.PerformanceMonitor.start('FRS_Algo_calculateSum');
        const coeffs = data.sex === this.FEMALE ? this.femaleCoefficients : this.maleCoefficients;
        const means = data.sex === this.FEMALE ? this.femaleMeans : this.maleMeans;
        let sum = 0;
        try {
            sum += coeffs.ln_age * (data.ln_age - means.ln_age);
            sum += coeffs.ln_total_cholesterol * (data.ln_total_cholesterol - means.ln_total_cholesterol);
            sum += coeffs.ln_hdl * (data.ln_hdl - means.ln_hdl);
            if (data.bp_treatment === 1) {
                sum += coeffs.ln_treated_sbp * (data.ln_treated_sbp - means.ln_treated_sbp);
            } else {
                sum += coeffs.ln_untreated_sbp * (data.ln_untreated_sbp - means.ln_untreated_sbp);
            }
            sum += coeffs.smoker * (data.smoker - means.smoker);
            sum += coeffs.diabetes * (data.diabetes - means.diabetes);
        } catch (error) {
            this._handleError(error, 'CalculateSum', { data });
            throw new Error(`Error during Framingham sum calculation: ${error.message}`);
        }
        this.dependencies.PerformanceMonitor.end(perfId);
        return sum;
    }

    _convertSumToRisk(sumValue, sex) {
        const baselineSurvival = (sex === this.FEMALE) ? this.femaleSurvival10 : this.maleSurvival10;
        if (isNaN(sumValue) || !isFinite(sumValue)) {
            this._handleError(new Error('Framingham sum is not a finite number.'), 'ConvertSumToRisk', { sumValue });
            return NaN; // Propagate NaN
        }
        const riskExp = Math.exp(sumValue);
        if (!isFinite(riskExp)) { // Check if exp(sum) overflows
             this._log('warn', `Exponentiation of sum resulted in non-finite number (sum: ${sumValue}). Risk will be capped.`, 'ConvertSumToRisk');
             // If exp(sum) is very large, risk approaches 1. If very small, risk approaches 0.
             return riskExp > 0 ? 1.0 : 0.0;
        }
        const risk = 1 - Math.pow(baselineSurvival, riskExp);
        return Math.max(0, Math.min(1, risk)); // Clamp between 0 and 1
    }

    _applyRiskModifiers(baseRiskProportion, processedData) {
        let modifiedRisk = baseRiskProportion;
        const modifiersAppliedDetails = []; // Changed from modifiersApplied to avoid conflict with a potential input field
        const CT = this.dependencies.ClinicalThresholds;

        try {
            // Lp(a) modifier
            if (processedData.lpa !== undefined && !isNaN(processedData.lpa)) {
                let lpaStdMgDl = processedData.lpa;
                if (String(processedData.lpaUnit).toLowerCase().includes('nmol')) {
                    const conversionFactor = CT?.get('LPA.CONVERSION_NMOL_TO_MG', 2.17) || 2.17;
                    lpaStdMgDl = processedData.lpa / conversionFactor;
                }
                let factor = 1.0;
                const lpaVeryHighMgDl = CT?.get('LPA.VERY_HIGH_RISK_MG', 100) || 100;
                const lpaHighMgDl = CT?.get('LPA.HIGH_RISK_MG', 50) || 50;
                const lpaModerateMgDl = CT?.get('LPA.MODERATE_RISK_MG', 30) || 30;

                if (lpaStdMgDl >= lpaVeryHighMgDl) factor = CT?.get('RISK_MODIFIERS.LPA_VERY_HIGH_FACTOR', 1.7) || 1.7;
                else if (lpaStdMgDl >= lpaHighMgDl) factor = CT?.get('RISK_MODIFIERS.LPA_HIGH_FACTOR', 1.4) || 1.4;
                else if (lpaStdMgDl >= lpaModerateMgDl) factor = CT?.get('RISK_MODIFIERS.LPA_MODERATE_FACTOR', 1.2) || 1.2;

                if (factor > 1.0) {
                    modifiedRisk *= factor;
                    modifiersAppliedDetails.push({ type: 'Lp(a)', factor: parseFloat(factor.toFixed(2)), value: `${processedData.lpa} ${processedData.lpaUnit}`, effect: `~${Math.round((factor - 1) * 100)}% risk increase` });
                }
            }
            // Family history modifier
            if (processedData.familyHistory === 1) {
                const factor = CT?.get('RISK_MODIFIERS.FAMILY_HISTORY_FRS_FACTOR', 1.6) || 1.6;
                modifiedRisk *= factor;
                modifiersAppliedDetails.push({ type: 'Family History of Premature CVD', factor: parseFloat(factor.toFixed(2)), effect: `~${Math.round((factor - 1) * 100)}% risk increase` });
            }
            // South Asian ethnicity modifier
            if (processedData.isSouthAsian === 1) {
                const factor = CT?.get('RISK_MODIFIERS.SOUTH_ASIAN_FRS_FACTOR', 1.5) || 1.5;
                modifiedRisk *= factor;
                modifiersAppliedDetails.push({ type: 'South Asian Ancestry', factor: parseFloat(factor.toFixed(2)), effect: `~${Math.round((factor - 1) * 100)}% risk increase` });
            }
        } catch (error) {
            this._handleError(error, 'ApplyRiskModifiers', { baseRisk, processedData });
            // Return base risk if modifiers fail, do not alter it further.
            return { modifiedRisk: Math.max(0, Math.min(baseRiskProportion, 0.999)), modifiersApplied: [] };
        }
        return { modifiedRisk: Math.max(0, Math.min(modifiedRisk, 0.999)), modifiersApplied: modifiersAppliedDetails };
    }

    _determineRiskCategory(riskPercent) {
        const CT = this.dependencies.ClinicalThresholds;
        const lowMax = CT?.get('CVD_RISK_CATEGORY.LOW_THRESHOLD', 10) || 10;
        const intMax = CT?.get('CVD_RISK_CATEGORY.INTERMEDIATE_THRESHOLD', 20) || 20;

        if (isNaN(riskPercent) || riskPercent < 0) return { category: 'unknown', description: 'Risk Undetermined (Invalid Input)' };
        if (riskPercent < lowMax) return { category: 'low', description: `Low Risk (<${lowMax}%)` };
        if (riskPercent < intMax) return { category: 'intermediate', description: `Intermediate Risk (${lowMax}% to <${intMax}%)` }; // Corrected range display
        return { category: 'high', description: `High Risk (≥${intMax}%)` };
    }

    _estimateHeartAge(processedDataForHeartAge, actualRiskProportion) {
        const perfId = this.dependencies.PerformanceMonitor.start('FRS_Algo_estimateHeartAge');
        try {
            const CT = this.dependencies.ClinicalThresholds;
            // Create a baseline person with same non-modifiable characteristics (sex)
            // but ideal modifiable risk factors. Age will be iterated.
            const idealInputs = {
                sex: processedDataForHeartAge.sex, // Keep original sex
                // Ideal values (log-transformed where necessary)
                ln_total_cholesterol: Math.log(CT?.get('LIPIDS.IDEAL_TC_MMOL', 4.0) || 4.0),
                ln_hdl: Math.log(CT?.get('LIPIDS.IDEAL_HDL_MMOL', 1.5) || 1.5),
                ln_untreated_sbp: Math.log(CT?.get('BP.IDEAL_SBP', 110) || 110),
                ln_treated_sbp: 0, // Ideal is not on BP meds
                bp_treatment: 0,
                smoker: 0,
                diabetes: 0,
                // Modifiers are not typically included in ideal heart age calculation
                lpa: undefined, lpaUnit: undefined, familyHistory: 0, isSouthAsian: 0
            };

            if (isNaN(actualRiskProportion) || actualRiskProportion < 0.0001) { // If actual risk is effectively zero or invalid
                this._log('debug', 'Actual risk too low or invalid for heart age estimation, returning chronological age.', {actualRiskProportion});
                this.dependencies.PerformanceMonitor.end(perfId);
                return processedDataForHeartAge.age;
            }

            let minSearchAge = CT?.get('AGE.MIN_HEART_AGE_CALC', 20) || 20;
            let maxSearchAge = CT?.get('AGE.MAX_HEART_AGE_CALC', 90) || 90;
            let estimatedHeartAge = processedDataForHeartAge.age; // Start guess at chronological age
            let iterations = 0;
            const MAX_ITERATIONS = 25;
            const TOLERANCE = 0.0005; // Risk proportion tolerance

            while (iterations < MAX_ITERATIONS && (maxSearchAge - minSearchAge) > 0.1) {
                const testAge = (minSearchAge + maxSearchAge) / 2;
                if (testAge <= 0 || testAge > 150) { // Safety break for age
                    this._log('warn', 'Heart age search out of plausible bounds.', {testAge});
                    break;
                }
                const testDataForHeartAgeCalc = { ...idealInputs, ln_age: Math.log(testAge) };
                const sumAtTestAge = this._calculateFraminghamSum(testDataForHeartAgeCalc);
                const riskAtTestAge = this._convertSumToRisk(sumAtTestAge, idealInputs.sex);

                if (isNaN(riskAtTestAge)) { // Problem with calculation for this testAge
                     this._log('warn', 'Risk at test age is NaN during heart age estimation.', {testAge});
                     // Adjust search range based on which side failed, or break
                     if (riskAtTestAge < actualRiskProportion) minSearchAge = testAge + 0.1; else maxSearchAge = testAge - 0.1;
                     iterations++;
                     continue;
                }

                if (Math.abs(riskAtTestAge - actualRiskProportion) < TOLERANCE) {
                    estimatedHeartAge = testAge;
                    break;
                }
                if (riskAtTestAge < actualRiskProportion) {
                    minSearchAge = testAge;
                } else {
                    maxSearchAge = testAge;
                }
                estimatedHeartAge = (minSearchAge + maxSearchAge) / 2; // Update for next iteration or if loop finishes by iteration count
                iterations++;
            }
            this.dependencies.PerformanceMonitor.end(perfId);
            return Math.max(20, Math.min(95, Math.round(estimatedHeartAge))); // Bound heart age
        } catch (error) {
            this._handleError(error, 'EstimateHeartAge', {processedDataForHeartAge, actualRiskProportion});
            this.dependencies.PerformanceMonitor.end(perfId);
            return null;
        }
    }

    /**
     * Main public method for FRS risk calculation.
     * @param {object} rawPatientData - Patient data from RiskCalculator.
     * Expected to be pre-validated, sanitized, and unit-converted (lipids to mmol/L).
     * @returns {object} Calculation results.
     */
    calculateRisk(rawPatientData) {
        const perfId = this.dependencies.PerformanceMonitor.start('FRS_calculateRisk_Main');
        try {
            if (!this.initialized) {
                throw new Error('Framingham calculator not properly initialized.');
            }
            this._log('debug', 'FRS Algo: Received data for calculation.', { dataKeys: Object.keys(rawPatientData) });

            const processedData = this._processInputsForAlgorithm(rawPatientData);
            const framinghamSum = this._calculateFraminghamSum(processedData);
            const baseRiskProportion = this._convertSumToRisk(framinghamSum, processedData.sex);

            if (isNaN(baseRiskProportion)) {
                throw new Error('Base risk calculation resulted in NaN.');
            }

            const { modifiedRisk: modifiedRiskProportion, modifiersApplied } = this._applyRiskModifiers(baseRiskProportion, processedData);
            if (isNaN(modifiedRiskProportion)) {
                throw new Error('Modified risk calculation resulted in NaN.');
            }

            const baseRiskPercent = parseFloat((baseRiskProportion * 100).toFixed(1));
            const modifiedRiskPercentFinal = parseFloat((modifiedRiskProportion * 100).toFixed(1));

            const heartAge = this._estimateHeartAge(processedData, modifiedRiskProportion);
            const { category: riskCategory, description: categoryDescription } = this._determineRiskCategory(modifiedRiskPercentFinal);

            const result = {
                success: true,
                tenYearRiskPercent: baseRiskPercent, // Primary reported risk from core FRS formula
                baseRiskPercent: baseRiskPercent,
                modifiedRiskPercent: modifiedRiskPercentFinal, // Risk after local modifiers (Lp(a), FH, SA)
                riskCategory: riskCategory,
                categoryDescription: categoryDescription,
                heartAge: heartAge,
                inputParameters: rawPatientData, // Original (but validated/mapped by RiskCalculator) inputs
                modifiersApplied: modifiersApplied,
                algorithm: 'Framingham-2008-General-CVD',
                calculationDate: new Date().toISOString(),
                version: this.VERSION
            };
            this.dependencies.PerformanceMonitor.end(perfId);
            return result;

        } catch (error) {
            this._handleError(error, 'CalculateRiskMain');
            this.dependencies.PerformanceMonitor.end(perfId);
            return {
                success: false, error: `Error in Framingham calculation: ${error.message}`,
                calculationDate: new Date().toISOString(), version: this.VERSION
            };
        }
    }
}

// export default FraminghamRiskScore;
