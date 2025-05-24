/**
 * Treatment Recommendations Service (Guideline-Driven & Fused)
 * @file /js/calculations/treatment-recommendations.js
 * @description Provides evidence-based treatment recommendations based on risk assessment,
 * patient data, and CCS guidelines for dyslipidemia & PCSK9 inhibitors.
 * Fuses logic from user's enhanced-medication-module.js (MedicationEvaluator)
 * and medication.js.
 * Implements the TreatmentGuideline class concept from PDF.
 * @version 1.2.0
 * @exports TreatmentRecommendationsService
 */

'use strict';

class TreatmentRecommendationsService {
    /**
     * @param {object} [options={}] - Configuration options.
     * @param {string} [options.defaultRegion='CA'] - Default region for guidelines.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (TreatmentRecommendationsService.instance) {
            return TreatmentRecommendationsService.instance;
        }

        this.options = {
            defaultRegion: 'CA', // Canada, specifically BC for PCSK9 if applicable
            debugMode: false,
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || { handleError: console.error, log: console.log },
            EventBus: window.EventBus || { subscribe: () => {}, publish: () => {} },
            ClinicalThresholds: window.ClinicalThresholds,
            MedicationDatabase: window.MedicationDatabase,
            ValidationHelpers: window.ValidationHelpers,
            InputSanitizer: window.InputSanitizerService,
            ...options.dependencies,
        };

        this.VERSION = '1.2.0';
        this.currentRegion = this.options.defaultRegion; // Can be updated by events

        if (!this.dependencies.ClinicalThresholds || !this.dependencies.MedicationDatabase || !this.dependencies.ValidationHelpers || !this.dependencies.InputSanitizer) {
            this._handleError(new Error("Missing critical dependencies (ClinicalThresholds, MedicationDatabase, ValidationHelpers, InputSanitizer) for TreatmentRecommendationsService."), "Init");
            // Service might be non-functional without these.
        }

        // Load BC PCSK9 criteria from user's enhanced-medication-module.js
        // These could also be moved to ClinicalThresholds for easier updates.
        this.bcPCSK9Criteria = {
            baseRequirements: [
                "Patient diagnosed with heterozygous familial hypercholesterolemia (HeFH) confirmed by genetic testing OR clinical criteria (e.g., DLCN score ≥6).",
                "Patient diagnosed with atherosclerotic cardiovascular disease (ASCVD), defined as history of myocardial infarction, coronary revascularization (PCI/CABG), stroke, TIA, or symptomatic peripheral arterial disease."
            ],
            ldlThreshold_mmolL: 1.8, // Default LDL-C target for PCSK9 consideration post MTST+Ezetimibe
            maxTherapyRequirements: [
                "Patient is currently on maximally tolerated high-intensity statin therapy (or documented intolerance) for ≥ 3 months.",
                "Patient is currently on ezetimibe 10 mg daily for ≥ 3 months in addition to statin therapy (or as monotherapy if complete statin intolerance)."
            ],
            statinIntoleranceDefinition: "Documented inability to tolerate at least two different statins, including one at the lowest available starting dose (supported by objective evidence if muscle symptoms, e.g. CK levels, and resolution on dechallenge/rechallenge).",
            // ... (other exclusion, renewal criteria can be added based on full BC guidelines)
        };

        this._initializeEventListeners();

        TreatmentRecommendationsService.instance = this;
        this._log('info', `TreatmentRecommendationsService Initialized (v${this.VERSION}). Region: ${this.currentRegion}`);
    }

    _log(level, message, data) { this.dependencies.ErrorLogger.log?.(level, `TreatmentRecsSvc: ${message}`, data); }
    _handleError(error, context, additionalData = {}) {
        const msg = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(msg, `TreatmentRecsSvc-${context}`, 'error', { originalError: error, ...additionalData });
    }

    _initializeEventListeners() {
        this.dependencies.EventBus.subscribe('app:regionChanged', (payload) => {
            const newRegion = payload?.region?.toUpperCase();
            if (newRegion && this.dependencies.ClinicalThresholds?.get(`REGIONAL_GUIDELINE_SOURCES.${newRegion}`)) {
                this.currentRegion = newRegion;
                this._log('info', `Region updated to: ${this.currentRegion}.`);
            }
        });
    }

    setRegion(regionCode) { /* ... (Same as v1.1.0) ... */ }

    /**
     * Primary method to generate comprehensive recommendations.
     * @param {object} patientInputs - Validated, sanitized, and unit-normalized patient input data.
     * @param {object} riskResults - Results from FRS and/or QRISK3.
     * @param {Array<object>} [currentMedicationsInput=[]] - Array of current medication objects.
     * @returns {Promise<object|null>} Comprehensive recommendations object.
     */
    async generateComprehensiveRecommendations(patientInputs, riskResults, currentMedicationsInput = []) {
        if (!patientInputs || !riskResults) { this._handleError(new Error('Patient inputs and risk results required.'), 'GenRecs'); return this._getFallbackRecommendations('Missing input data.'); }
        this.dependencies.LoadingManager?.show('Generating Treatment Recommendations...');

        try {
            const S = this.dependencies.InputSanitizer;
            const CT = this.dependencies.ClinicalThresholds;

            // Internal data should already be normalized by RiskCalculator._prepareAndValidateData
            // but we ensure essential fields for recs are present and correctly typed.
            const internalData = this._prepareDataForRecommendations(patientInputs);

            const { primaryRiskPercent, primaryRiskCategoryName, drivingCalculator } = this._determinePrimaryRiskContext(riskResults, internalData);
            const riskCatKey = primaryRiskCategoryName.toUpperCase().replace(/\s+/G, '_');
            const riskCategoryDetails = CT.get(`RISK_CATEGORY_DETAILS.${riskCatKey}`) || CT.get('RISK_CATEGORY_DETAILS.MODERATE'); // Fallback

            const targets = this._determineLipidTargetsCCS(riskCategoryName, internalData, primaryRiskPercent); // Using CCS focus
            const currentTherapyEval = this._evaluateCurrentLipidTherapy(internalData, currentMedicationsInput);
            const targetsMet = this._areLipidTargetsMet(internalData, targets, currentTherapyEval);

            const recommendations = this._buildDetailedRecommendations(internalData, riskCategoryDetails, targets, currentTherapyEval, targetsMet, drivingCalculator);

            if (this.currentRegion === 'CA' || this.currentRegion === 'BC') { // BC specific criteria
                recommendations.pcsk9EligibilityBC = this._evaluateBCPCSK9Eligibility(internalData, riskCategoryDetails, currentTherapyEval, targets);
            }

            recommendations.guidelineSource = CT.get(`REGIONAL_GUIDELINE_SOURCES.${this.currentRegion}`) || `General Clinical Best Practices (Region: ${this.currentRegion})`;
            recommendations.summaryMessage = recommendations.summaryMessage || `Based on a ${drivingCalculator} assessment indicating ${primaryRiskCategoryName} risk (${primaryRiskPercent?.toFixed(1)}%), the following are considerations.`;

            const finalRecs = S.sanitizeObjectOrArray(recommendations, S.escapeHTML.bind(S));
            this.dependencies.EventBus.publish('recommendations:generated', { results: finalRecs });
            this._log('info', `Recommendations generated for ${drivingCalculator} (${primaryRiskCategoryName}).`);
            return finalRecs;
        } catch (error) {
            this._handleError(error, 'GenRecs', { patientInputs, riskResults });
            return this._getFallbackRecommendations(`Error generating recommendations: ${error.message}`);
        } finally {
            this.dependencies.LoadingManager?.hide();
        }
    }

    _prepareDataForRecommendations(patientInputs) { // Ensures data needed for recs is present and typed
        const V = this.dependencies.ValidationHelpers;
        const data = this._deepClone(patientInputs); // Work on a copy

        // Ensure essential lipids are numbers and in mmol/L (RiskCalculator should have done this)
        data.totalCholesterol = V.isNumber(data.totalCholesterol).isValid ? parseFloat(data.totalCholesterol) : null;
        data.hdl = V.isNumber(data.hdl).isValid ? parseFloat(data.hdl) : null;
        data.ldl = data.ldl !== undefined && V.isNumber(data.ldl).isValid ? parseFloat(data.ldl) : null;
        data.triglycerides = data.triglycerides !== undefined && V.isNumber(data.triglycerides).isValid ? parseFloat(data.triglycerides) : null;
        data.nonHdl = data.nonHdl !== undefined && V.isNumber(data.nonHdl).isValid ? parseFloat(data.nonHdl) : null;
        data.apoB = data.apoB !== undefined && V.isNumber(data.apoB).isValid ? parseFloat(data.apoB) : null;
        data.lpa = data.lpa !== undefined && V.isNumber(data.lpa).isValid ? parseFloat(data.lpa) : null;
        // Ensure lpaUnit is available if lpa is present
        if (data.lpa !== null && data.lpa !== undefined && !data.lpaUnit) data.lpaUnit = 'mg/dL'; // Default for internal logic

        // Calculate Non-HDL if missing (from medication.js)
        if ((data.nonHdl === null || data.nonHdl === undefined) && data.totalCholesterol !== null && data.hdl !== null) {
            data.nonHdl = parseFloat((data.totalCholesterol - data.hdl).toFixed(2));
        }
        // Calculate LDL (Friedewald) if missing (from enhanced-medication-module.js)
        if ((data.ldl === null || data.ldl === undefined) && data.totalCholesterol && data.hdl && data.triglycerides) {
            if (data.triglycerides < 4.5) { // Valid only if TG < 4.5 mmol/L
                data.ldl = parseFloat((data.totalCholesterol - data.hdl - (data.triglycerides / 2.2)).toFixed(2));
            }
        }
        // Ensure boolean flags are true booleans
        ['isSmoker', 'hasDiabetes', 'onBPMeds', 'hasASCVD', 'familialHypercholesterolemia', /* add all relevant flags from patientInputs */].forEach(flag => {
             data[flag] = (String(data[flag]).toLowerCase() === 'true' || data[flag] === 'yes' || data[flag] === 1);
        });
        return data;
    }

    _determinePrimaryRiskContext(riskResults, patientData) { /* ... (same as v1.1.0) ... */
        let primaryRiskPercent = 0; let primaryRiskCategoryName = 'LOW'; let drivingCalculator = 'N/A';
        const frsSuccess = riskResults.frs?.success; const qriskSuccess = riskResults.qrisk3?.success;
        const frsScore = frsSuccess ? (riskResults.frs.modifiedRiskPercent ?? riskResults.frs.tenYearRiskPercent) : -1;
        const qriskScore = qriskSuccess ? riskResults.qrisk3.tenYearRiskPercent : -1;

        if (this._hasConfirmedASCVD(patientData)) { // Use patientData here
            primaryRiskCategoryName = this._isPatientExtremeHighRisk(patientData) ? 'EXTREME' : 'VERY_HIGH'; // User's logic for extreme risk
            drivingCalculator = 'Clinical ASCVD'; primaryRiskPercent = Math.max(frsScore, qriskScore, 20);
        } else if (this._hasConfirmedFH(patientData)) {
            primaryRiskCategoryName = 'VERY_HIGH'; drivingCalculator = 'Familial Hypercholesterolemia'; primaryRiskPercent = Math.max(frsScore, qriskScore, 20);
        } else {
            if (frsSuccess && qriskSuccess) { primaryRiskPercent = Math.max(frsScore, qriskScore); drivingCalculator = frsScore >= qriskScore ? 'Framingham (Highest)' : 'QRISK3 (Highest)'; }
            else if (frsSuccess) { primaryRiskPercent = frsScore; drivingCalculator = 'Framingham'; }
            else if (qriskSuccess) { primaryRiskPercent = qriskScore; drivingCalculator = 'QRISK3'; }
            else { primaryRiskPercent = 0; drivingCalculator = 'Unavailable'; }
            primaryRiskCategoryName = this._determineRiskCategoryNameFromScore(primaryRiskPercent);
        }
        return { primaryRiskPercent, primaryRiskCategoryName, drivingCalculator };
    }

    _getRiskCategoryDetails(categoryName) { /* ... (same as v1.1.0) ... */
        const key = String(categoryName).toUpperCase().replace(/\s+/G, '_');
        return this.dependencies.ClinicalThresholds?.get(`RISK_CATEGORY_DETAILS.${key}`) ||
               this.dependencies.ClinicalThresholds?.get('RISK_CATEGORY_DETAILS.LOW'); // Sensible fallback
    }

    _determineRiskCategoryNameFromScore(riskScorePercent) { // Adapted from user's MedicationEvaluator & my previous.
        const V = this.dependencies.ValidationHelpers;
        const CT = this.dependencies.ClinicalThresholds;
        const score = V.isNumber(riskScorePercent).isValid ? parseFloat(riskScorePercent) : -1;

        const lowMax = CT?.get('CVD_RISK_CATEGORY.LOW_THRESHOLD', 10) || 10;
        const intMax = CT?.get('CVD_RISK_CATEGORY.INTERMEDIATE_THRESHOLD', 20) || 20;
        // Removed user's HIGH.threshold of 0.3 as it's covered by >= intMax
        // const veryHighMin = CT?.get('CVD_RISK_CATEGORY.VERY_HIGH_THRESHOLD', 30) || 30; // Example, if needed

        if (score < 0) return 'UNKNOWN';
        if (score < lowMax) return 'LOW';
        if (score < intMax) return 'MODERATE';
        // if (score < veryHighMin) return 'HIGH'; // This logic was in user's PDF for riskCategoryMappings
        return 'HIGH'; // CCS simplifies to Low, Intermediate, High for primary prevention FRS.
                       // Very high/Extreme are often clinical diagnoses (ASCVD, FH).
    }

    _determineLipidTargetsCCS(riskCategoryName, patientData) { // Focus on CCS 2021 logic from user's MedicationEvaluator
        const CT = this.dependencies.ClinicalThresholds;
        const targets = { ldl_mmolL: null, nonHdl_mmolL: null, apoB_gL: null, percentReductionLDL: 0, rationale: "" };

        const hasASCVD = this._hasConfirmedASCVD(patientData);
        const hasFH = this._hasConfirmedFH(patientData);
        const hasDiabetes = patientData.hasDiabetes === true;
        const isExtremeRisk = hasASCVD && this._isPatientExtremeHighRisk(patientData); // Based on user's definition

        if (isExtremeRisk) { // User's "specialPopulations.extremeHighRisk"
            targets.ldl_mmolL = CT?.get('LIPID_TARGETS.EXTREME_RISK_ASCVD.LDL_MMOL', 1.4);
            targets.nonHdl_mmolL = CT?.get('LIPID_TARGETS.EXTREME_RISK_ASCVD.NONHDL_MMOL', 2.0);
            targets.apoB_gL = CT?.get('LIPID_TARGETS.EXTREME_RISK_ASCVD.APOB_GL', 0.65);
            targets.percentReductionLDL = 50; // Still aim for at least 50%
            targets.rationale = "Extreme ASCVD risk: Very aggressive targets indicated.";
        } else if (hasASCVD) {
            targets.ldl_mmolL = CT?.get('LIPID_TARGETS.ASCVD.LDL_MMOL', 1.8);
            targets.nonHdl_mmolL = CT?.get('LIPID_TARGETS.ASCVD.NONHDL_MMOL', 2.4);
            targets.apoB_gL = CT?.get('LIPID_TARGETS.ASCVD.APOB_GL', 0.7);
            targets.percentReductionLDL = 50;
            targets.rationale = "Secondary prevention (ASCVD present).";
        } else if (hasFH) {
            targets.ldl_mmolL = CT?.get('LIPID_TARGETS.FH.LDL_MMOL', 2.0);
            targets.percentReductionLDL = 50;
            targets.nonHdl_mmolL = CT?.get('LIPID_TARGETS.FH.NONHDL_MMOL', 2.6);
            targets.apoB_gL = CT?.get('LIPID_TARGETS.FH.APOB_GL', 0.8);
            targets.rationale = "Primary prevention: Confirmed Familial Hypercholesterolemia.";
        } else if (hasDiabetes && this._hasAdditionalRiskFactorsForDiabetesCCS(patientData)) { // User's specific helper
            targets.ldl_mmolL = CT?.get('LIPID_TARGETS.DIABETES_HIGH_RISK.LDL_MMOL', 2.0);
            targets.percentReductionLDL = 50;
            targets.nonHdl_mmolL = CT?.get('LIPID_TARGETS.DIABETES_HIGH_RISK.NONHDL_MMOL', 2.6);
            targets.apoB_gL = CT?.get('LIPID_TARGETS.DIABETES_HIGH_RISK.APOB_GL', 0.8);
            targets.rationale = "Primary prevention: Diabetes with risk enhancers.";
        } else if (riskCategoryName === 'HIGH') {
            targets.ldl_mmolL = CT?.get('LIPID_TARGETS.PRIMARY_HIGH_RISK.LDL_MMOL', 2.0);
            targets.percentReductionLDL = 50;
            targets.nonHdl_mmolL = CT?.get('LIPID_TARGETS.PRIMARY_HIGH_RISK.NONHDL_MMOL', 2.6);
            targets.apoB_gL = CT?.get('LIPID_TARGETS.PRIMARY_HIGH_RISK.APOB_GL', 0.8);
            targets.rationale = "Primary prevention: High FRS/QRISK3 Risk.";
        } else if (riskCategoryName === 'MODERATE') {
            const ldlThresholdForTx = CT?.get('LIPID_TARGETS.PRIMARY_MODERATE_RISK_LDL_INITIATE_TX_MMOL', 3.5);
            if (patientData.ldl && patientData.ldl >= ldlThresholdForTx) {
                targets.ldl_mmolL = CT?.get('LIPID_TARGETS.PRIMARY_MODERATE_RISK_TREATED.LDL_MMOL', 2.0);
                targets.percentReductionLDL = 50;
            } else { // Statin discussion, less aggressive target if LDL < 3.5
                targets.ldl_mmolL = CT?.get('LIPID_TARGETS.PRIMARY_MODERATE_RISK.LDL_MMOL', 2.5);
                targets.percentReductionLDL = 30; // Or 50% if other risk enhancers
            }
            targets.nonHdl_mmolL = CT?.get('LIPID_TARGETS.PRIMARY_MODERATE_RISK.NONHDL_MMOL', 3.2);
            targets.apoB_gL = CT?.get('LIPID_TARGETS.PRIMARY_MODERATE_RISK.APOB_GL', 0.9);
            targets.rationale = "Primary prevention: Moderate FRS/QRISK3 Risk.";
        } else { // LOW risk
            const ldlThresholdForTxLowRisk = CT?.get('LIPID_TARGETS.PRIMARY_LOW_RISK_LDL_INITIATE_TX_MMOL', 5.0);
            if (patientData.ldl && patientData.ldl >= ldlThresholdForTxLowRisk) {
                targets.ldl_mmolL = CT?.get('LIPID_TARGETS.PRIMARY_LOW_RISK_TREATED.LDL_MMOL', 2.5); // Or less aggressive
                targets.percentReductionLDL = 50; // If LDL very high, still aim for 50%
            } else {
                targets.ldl_mmolL = CT?.get('LIPID_TARGETS.PRIMARY_LOW_RISK.LDL_MMOL', 3.5); // Threshold for consideration
                targets.percentReductionLDL = 0; // No specific % reduction if LDL below treatment threshold
            }
            targets.nonHdl_mmolL = CT?.get('LIPID_TARGETS.PRIMARY_LOW_RISK.NONHDL_MMOL', 4.2);
            targets.apoB_gL = CT?.get('LIPID_TARGETS.PRIMARY_LOW_RISK.APOB_GL', 1.05);
            targets.rationale = "Primary prevention: Low FRS/QRISK3 Risk. Lifestyle focus. Pharmacotherapy if LDL ≥5.0 mmol/L or risk enhancers present.";
        }

        // Lp(a) adjustment from user's enhanced-medication-module.js, using mg/dL internally for logic
        const lpaMgDl = (patientData.lpaUnit === 'nmol/L' && patientData.lpa) ? (patientData.lpa / (CT?.get('LPA.CONVERSION_NMOL_TO_MG', 2.17) || 2.17)) : patientData.lpa;
        if (lpaMgDl && lpaMgDl >= (CT?.get('LPA.HIGH_RISK_MG', 50) || 50)) {
            targets.ldl_mmolL = Math.min(targets.ldl_mmolL || Infinity, (CT?.get('LIPID_TARGETS.ELEVATED_LPA.LDL_MMOL', 1.8) || 1.8));
            if (targets.percentReductionLDL < 50) targets.percentReductionLDL = 50;
            targets.rationale += " Elevated Lp(a) present; consider more aggressive LDL-C target and ensure ≥50% LDL-C reduction.";
        }
        return targets;
    }

    _evaluateCurrentLipidTherapy(patientData, currentMedications) { /* ... (Same as v1.1.0), uses MedicationDatabase & ClinicalThresholds for effects ... */
        const S = this.dependencies.InputSanitizer; const MD = this.dependencies.MedicationDatabase; const CT = this.dependencies.ClinicalThresholds;
        const therapy = { statin: null, statinIntensity: 'none', isMaxStatinDose: false, hasEzetimibe: false, hasPCSK9: false, hasBempedoicAcid: false, hasFibrate: false, hasNiacin: false, hasBAS: false, otherLipidMeds: [], statinIntoleranceHistory: S.escapeHTML(patientData.statinIntoleranceType || 'none'), estimatedLDLReductionPercent: 0, estimatedBaselineLDL: null };
        (currentMedications || []).forEach(medInput => {
            const medName = S.escapeHTML(String(medInput.name)).toLowerCase(); const medInfo = MD?.getByName(medName);
            if (medInfo?.class === 'Statin') { therapy.statin = medInfo.name; therapy.statinIntensity = medInput.intensity?.toLowerCase() || medInfo.strength?.toLowerCase() || 'unknown';
                // Max dose determination needs detailed dose info in MedicationDatabase and current dose from patientData.
                // For now, 'high' intensity implies close to max.
                if (therapy.statinIntensity === 'high') therapy.isMaxStatinDose = true;
            }
            else if (medInfo?.name.toLowerCase().includes('ezetimibe')) therapy.hasEzetimibe = true;
            else if (medInfo?.class === 'PCSK9 Inhibitor') therapy.hasPCSK9 = true;
            else if (medInfo?.name.toLowerCase().includes('bempedoic acid')) therapy.hasBempedoicAcid = true;
            else if (medInfo?.class === 'Fibrate') therapy.hasFibrate = true;
            else if (medInfo?.name.toLowerCase().includes('niacin')) therapy.hasNiacin = true;
            else if (medInfo?.class === 'Bile Acid Sequestrant') therapy.hasBAS = true;
            else if (medInfo?.type === 'lipid') therapy.otherLipidMeds.push(medInfo.name);
        });
        const currentLdlReductionDecimal = this._calculateEstimatedLDLReduction(therapy);
        therapy.estimatedLDLReductionPercent = parseFloat((currentLdlReductionDecimal * 100).toFixed(0));
        if (patientData.ldl && currentLdlReductionDecimal > 0 && currentLdlReductionDecimal < 1) {
            therapy.estimatedBaselineLDL = parseFloat((patientData.ldl / (1 - currentLdlReductionDecimal)).toFixed(2));
        }
        return therapy;
    }

    _calculateEstimatedLDLReduction(currentTherapy) { /* ... (Same as v1.1.0), uses ClinicalThresholds for reduction %s ... */
        let ldlRemaining = 1.0; const CT = this.dependencies.ClinicalThresholds;
        if (currentTherapy.statinIntensity === 'low') ldlRemaining *= (1 - (CT?.get('STATIN_EFFECT.LOW.LDL_REDUCTION', 0.25)));
        else if (currentTherapy.statinIntensity === 'moderate') ldlRemaining *= (1 - (CT?.get('STATIN_EFFECT.MODERATE.LDL_REDUCTION', 0.35)));
        else if (currentTherapy.statinIntensity === 'high') ldlRemaining *= (1 - (CT?.get('STATIN_EFFECT.HIGH.LDL_REDUCTION', 0.50)));
        if (currentTherapy.hasEzetimibe) ldlRemaining *= (1 - (CT?.get('EZETIMIBE.ADDON_LDL_REDUCTION', 0.20)));
        if (currentTherapy.hasPCSK9) ldlRemaining *= (1 - (CT?.get('PCSK9I.ADDON_LDL_REDUCTION', 0.55)));
        if (currentTherapy.hasBempedoicAcid) ldlRemaining *= (1 - (CT?.get('BEMPEDOIC.ADDON_LDL_REDUCTION', 0.18)));
        if (currentTherapy.hasBAS) ldlRemaining *= (1 - (CT?.get('BAS.ADDON_LDL_REDUCTION', 0.15)));
        return Math.min(1 - ldlRemaining, 0.95); // Cap at 95%
    }

    _areLipidTargetsMet(patientData, targets, currentTherapyEval) { /* ... (Same as v1.1.0), more robust check for undefined targets ... */
        const V = this.dependencies.ValidationHelpers;
        const result = { ldl: null, nonHdl: null, apoB: null, percentReduction: null, overall: false };
        const ldl = patientData.ldl; const nonHdl = patientData.nonHdl; const apoB = patientData.apoB;

        if (targets.ldl_mmolL !== null && ldl !== null && V.isNumber(ldl).isValid) result.ldl = ldl <= targets.ldl_mmolL;
        if (targets.nonHdl_mmolL !== null && nonHdl !== null && V.isNumber(nonHdl).isValid) result.nonHdl = nonHdl <= targets.nonHdl_mmolL;
        if (targets.apoB_gL !== null && apoB !== null && V.isNumber(apoB).isValid) result.apoB = apoB <= targets.apoB_gL;

        if (targets.percentReductionLDL > 0 && currentTherapyEval?.estimatedBaselineLDL && ldl !== null) {
            const achievedReduction = ((currentTherapyEval.estimatedBaselineLDL - ldl) / currentTherapyEval.estimatedBaselineLDL) * 100;
            result.percentReduction = achievedReduction >= targets.percentReductionLDL;
        }

        // Overall: Must meet LDL absolute target OR LDL % reduction target. Also check non-HDL or ApoB if LDL not primary or met.
        // CCS Guideline: Primary target is LDL-C, with alternatives of non-HDL-C or ApoB.
        // If LDL target is met (either absolute or % reduction), overall is met.
        if (result.ldl === true || result.percentReduction === true) result.overall = true;
        // If LDL target not met/not assessable, check alternative targets if they are defined AND met.
        else if (targets.nonHdl_mmolL !== null && result.nonHdl === true) result.overall = true;
        else if (targets.apoB_gL !== null && result.apoB === true) result.overall = true;

        return result;
    }

    _buildDetailedRecommendations(patientData, riskCategoryDetails, targets, currentTherapyEval, targetsMet, drivingCalculator) {
        // Fuses logic from user's MedicationEvaluator & treatment-recommendations.js.
        const S = this.dependencies.InputSanitizer;
        const CT = this.dependencies.ClinicalThresholds;
        const MD = this.dependencies.MedicationDatabase;
        const recs = {
            summaryMessage: "", pharmacological: [], lifestyle: this._getBaseLifestyleRecs(patientData),
            monitoring: [], referral: [], additionalConsiderations: []
        };

        const currentLDL = patientData.ldl;
        const onMaxStatin = currentTherapyEval.isMaxStatinDose || currentTherapyEval.statinIntensity === 'high';
        const isStatinEffectivelyIntolerant = currentTherapyEval.statinIntoleranceHistory && currentTherapyEval.statinIntoleranceHistory !== 'none';

        if (targetsMet.overall) {
            recs.summaryMessage = `Lipid targets APPEAR MET for ${riskCategoryDetails.name} (based on available data). Continue current management and reinforce lifestyle.`;
            if (currentTherapyEval.statin) recs.pharmacological.push({ therapy: 'Current Statin', action: 'continue', details: `${currentTherapyEval.statin} (${currentTherapyEval.statinIntensity} intensity).` });
            if (currentTherapyEval.hasEzetimibe) recs.pharmacological.push({ therapy: 'Ezetimibe', action: 'continue', details: 'Continue ezetimibe 10mg daily.' });
            if (currentTherapyEval.hasPCSK9) recs.pharmacological.push({ therapy: 'PCSK9 Inhibitor', action: 'continue', details: 'Continue PCSK9 inhibitor therapy.' });
        } else {
            recs.summaryMessage = `Lipid targets for ${riskCategoryDetails.name} are NOT MET. Intensification of lipid-lowering therapy is recommended.`;
            let statinRecAdded = false;

            // Statin Logic
            if (currentTherapyEval.statinIntensity === 'none' && !isStatinEffectivelyIntolerant) {
                const intensity = (riskCategoryDetails.name === 'Low Risk' && (!currentLDL || currentLDL < (CT.get('LIPID_TARGETS.PRIMARY_LOW_RISK_THRESHOLD_LDL', 5.0)))) ? 'none' : (riskCategoryDetails.name === 'Moderate Risk' ? 'moderate' : 'high');
                if (intensity !== 'none') {
                    recs.pharmacological.push({ therapy: 'Statin', action: 'START', intensity: `${intensity}-intensity`, rationale: `Initiate ${intensity}-intensity statin. Target LDL <${targets.ldl_mmolL?.toFixed(1)} mmol/L or ≥${targets.percentReductionLDL}% reduction.` });
                    statinRecAdded = true;
                }
            } else if (currentTherapyEval.statinIntensity !== 'high' && !onMaxStatin && !isStatinEffectivelyIntolerant) {
                recs.pharmacological.push({ therapy: 'Statin', action: 'INTENSIFY', intensity: 'to higher or maximal tolerated dose', rationale: `Increase current statin. Target LDL <${targets.ldl_mmolL?.toFixed(1)} mmol/L or ≥${targets.percentReductionLDL}% reduction.` });
                statinRecAdded = true;
            }

            // If on statin (even if just continued/maxed out) or statin intolerant, consider add-ons
            if (statinRecAdded || currentTherapyEval.statin || isStatinEffectivelyIntolerant) {
                if (!currentTherapyEval.hasEzetimibe) {
                    recs.pharmacological.push({ therapy: 'Ezetimibe', action: 'ADD', rationale: `Add ezetimibe 10mg daily for further LDL reduction (target LDL <${targets.ldl_mmolL?.toFixed(1)} mmol/L). Provides approx. 15-25% additional LDL lowering.` });
                } else if (!targetsMet.overall) { // On statin + ezetimibe but still not at target
                    recs.pharmacological.push({ therapy: 'Ezetimibe', action: 'CONTINUE', rationale: 'Continue ezetimibe 10mg daily.' });
                    // Now consider PCSK9i or Bempedoic Acid if appropriate
                    if (!currentTherapyEval.hasPCSK9) {
                        // Full PCSK9 eligibility to be added in _evaluateBCPCSK9Eligibility
                        recs.pharmacological.push({ therapy: 'PCSK9 Inhibitor', action: 'CONSIDER', rationale: `If LDL remains ≥${targets.ldl_mmolL?.toFixed(1)} mmol/L despite max tolerated statin + ezetimibe, consider PCSK9 inhibitor based on specific eligibility (e.g., ASCVD, FH).` });
                    }
                    if (!currentTherapyEval.hasBempedoicAcid && (isStatinEffectivelyIntolerant || onMaxStatin)) {
                         recs.pharmacological.push({ therapy: 'Bempedoic Acid', action: 'CONSIDER', rationale: `Consider bempedoic acid if statin intolerant or further LDL lowering needed on max statin +/- ezetimibe (provides ~15-18% additional LDL reduction).` });
                    }
                }
            }
        }
        // ... (Add hypertriglyceridemia, lifestyle, monitoring, followUp sections - similar to previous version but ensure S.escapeHTML) ...
        recs.monitoring.push(S.escapeHTML(`Re-assess lipid profile in ${targetsMet.overall ? '6-12 months' : '6-12 weeks'} to evaluate response and tolerance.`));
        recs.monitoring.push(S.escapeHTML("Monitor for potential medication side effects (e.g., myalgia with statins, LFTs if indicated)."));
        recs.followUp = S.escapeHTML(targetsMet.overall ? "Routine follow-up based on overall risk." : "Close follow-up to ensure lipid targets are achieved and therapy is optimized.");
        return recs;
    }

    _getBaseLifestyleRecs(patientData) { /* ... (same as v1.1.0) ... */
        const S = this.dependencies.InputSanitizer; const lifestyle = [ S.escapeHTML("Adopt heart-healthy diet (e.g. Mediterranean, DASH, Portfolio)."), S.escapeHTML("Regular physical activity (150+ min/wk moderate or 75+ min/wk vigorous)."), S.escapeHTML("Maintain healthy body weight (BMI 18.5-24.9 kg/m², appropriate waist circumference)."), S.escapeHTML("Limit alcohol consumption per national guidelines."), S.escapeHTML("Manage stress effectively.")];
        if (patientData.isSmoker || patientData.smokingStatus !== 'non') lifestyle.unshift(S.escapeHTML("Smoking cessation is CRUCIAL. Offer counseling and pharmacotherapy (varenicline, bupropion, NRT).")); return lifestyle;
    }

    _addLpaConsiderations(recommendations, patientData) { /* ... (same as v1.1.0), ensure patientData.lpa is numeric ... */
        const S = this.dependencies.InputSanitizer; const CT = this.dependencies.ClinicalThresholds;
        const lpaValue = patientData.lpa ? parseFloat(patientData.lpa) : null; const lpaUnit = patientData.lpaUnit || 'nmol/L';
        const lpaHighNmol = CT?.get('LPA.HIGH_RISK_NMOL_CCS', 100) || 100; // CCS often uses 100 nmol/L as a key threshold
        const lpaHighMg = CT?.get('LPA.HIGH_RISK_MG_CCS', 50) || 50; // Approx 50 mg/dL
        let isLpaHigh = false;
        if (lpaValue !== null && !isNaN(lpaValue)) { if (lpaUnit.toLowerCase().includes('nmol')) isLpaHigh = lpaValue >= lpaHighNmol; else if (lpaUnit.toLowerCase().includes('mg')) isLpaHigh = lpaValue >= lpaHighMg; }
        if (isLpaHigh) { recommendations.additionalConsiderations.push(S.escapeHTML(`Elevated Lp(a) (${lpaValue.toFixed(1)} ${lpaUnit}) is an independent genetic risk factor. Intensify LDL-C lowering (e.g., target <1.8 mmol/L, or even <1.4 mmol/L in very high global risk if per guidelines) and aggressively manage ALL other modifiable risk factors. Consider aspirin if overall ASCVD risk warrants it and bleeding risk is low. Specific Lp(a)-lowering therapies are emerging.`));}
    }

    _enhanceWithQRISK3Factors(recommendations, patientData, qriskInputs) { /* ... (same as v1.1.0), ensure patientData keys match what QRISK3 calc expects for these flags ... */
        if (!qriskInputs || !recommendations.additionalConsiderations) return; const S = this.dependencies.InputSanitizer;
        if (qriskInputs.familyHistoryCVDParent) recommendations.additionalConsiderations.push(S.escapeHTML("QRISK3: Family history of premature CVD noted; reinforces need for optimal risk factor control."));
        if (qriskInputs.atrialFibrillation) recommendations.additionalConsiderations.push(S.escapeHTML("QRISK3: Atrial Fibrillation present. Assess stroke risk (e.g., CHA₂DS₂-VASc or CHADS-65) and anticoagulation needs independently."));
        if (qriskInputs.chronicKidneyDisease) recommendations.additionalConsiderations.push(S.escapeHTML("QRISK3: Chronic Kidney Disease present. Statin therapy often indicated. Monitor eGFR and adjust doses as needed."));
        if (qriskInputs.rheumatoidArthritis) recommendations.additionalConsiderations.push(S.escapeHTML("QRISK3: Rheumatoid Arthritis present. This is a risk enhancer; manage RA activity and CVD risk factors aggressively."));
        // ... Add for SLE, Migraines (esp. female), SevereMentalIllness/Atypicals, Steroids, ED (male) based on qriskInputs flags ...
    }

    _evaluateBCPCSK9Eligibility(patientData, riskCategoryDetails, currentTherapyEval, targets) { // From user's MedicationEvaluator, adapted to use CT
        const S = this.dependencies.InputSanitizer; const CT = this.dependencies.ClinicalThresholds;
        const result = { eligible: false, criteriaMet: [], criteriaNotMet: [], notes: [], rationale: "BC PharmaCare Special Authority criteria for PCSK9 inhibitors.", targetLDLForPCSK9Consideration_mmolL: CT?.get('PCSK9_ELIGIBILITY.BC.LDL_THRESHOLD_MMOL', 1.8) || 1.8, };
        const hasASCVD = this._hasConfirmedASCVD(patientData); const hasFH = this._hasConfirmedFH(patientData);

        if (hasASCVD) result.criteriaMet.push("Established ASCVD present."); else result.criteriaNotMet.push("No confirmed ASCVD diagnosis for BC PCSK9 criteria.");
        if (hasFH) result.criteriaMet.push("Confirmed Familial Hypercholesterolemia (HeFH)."); else if (!hasASCVD) result.criteriaNotMet.push("No confirmed HeFH diagnosis for BC PCSK9 criteria.");
        if (!hasASCVD && !hasFH) { result.notes.push("Patient does not meet primary eligibility (ASCVD or HeFH) for BC PCSK9i coverage."); return result; }

        const currentLDL = patientData.ldl; const ldlThreshold = result.targetLDLForPCSK9Consideration_mmolL;
        if (currentLDL && currentLDL >= ldlThreshold) result.criteriaMet.push(`Current LDL-C ≥ ${ldlThreshold} mmol/L (is ${currentLDL.toFixed(1)} mmol/L).`);
        else result.criteriaNotMet.push(`Current LDL-C is ${currentLDL?.toFixed(1) || 'N/A'} mmol/L (needs to be ≥ ${ldlThreshold} mmol/L).`);

        const isMaxStatin = currentTherapyEval.isMaxStatinDose; const isStatinIntolerant = currentTherapyEval.statinIntoleranceHistory && currentTherapyEval.statinIntoleranceHistory !== 'none';
        const onEzetimibe = currentTherapyEval.hasEzetimibe;
        const minDurationMonths = CT?.get('PCSK9_ELIGIBILITY.BC.MIN_THERAPY_DURATION_MONTHS', 3) || 3;
        const statinDurationOk = patientData.statinDurationMonths !== undefined ? patientData.statinDurationMonths >= minDurationMonths : false; // Requires this field in patientData
        const ezetimibeDurationOk = patientData.ezetimibeDurationMonths !== undefined ? patientData.ezetimibeDurationMonths >= minDurationMonths : false;

        if ((isMaxStatin && statinDurationOk) || (isStatinIntolerant /* implies proper trial & documentation */)) { result.criteriaMet.push("On maximally tolerated statin (or documented complete/partial intolerance) for ≥3 months."); }
        else { result.criteriaNotMet.push("Not on maximally tolerated statin for sufficient duration, or intolerance not sufficiently documented/defined in input."); }

        if (onEzetimibe && ezetimibeDurationOk) { result.criteriaMet.push("On ezetimibe 10mg daily for ≥3 months."); }
        else { result.criteriaNotMet.push("Not on ezetimibe 10mg daily for sufficient duration."); }

        // Simplified eligibility check - a real system would check each specific criterion from this.bcPCSK9Criteria
        if (result.criteriaMet.includes("Established ASCVD present.") && result.criteriaMet.some(c => c.startsWith("Current LDL-C ≥")) && result.criteriaMet.some(c=>c.startsWith("On maximally tolerated statin")) && result.criteriaMet.some(c=>c.startsWith("On ezetimibe 10mg"))) { result.eligible = true; }
        else if (result.criteriaMet.includes("Confirmed Familial Hypercholesterolemia (HeFH).") && result.criteriaMet.some(c => c.startsWith("Current LDL-C ≥")) && result.criteriaMet.some(c=>c.startsWith("On maximally tolerated statin")) && result.criteriaMet.some(c=>c.startsWith("On ezetimibe 10mg"))) { result.eligible = true; }


        if (result.eligible) { result.notes.push("Patient appears to meet key criteria for BC PharmaCare PCSK9i coverage. Verify all specific documentation."); }
        else { result.notes.push("Patient may not meet all criteria for BC PharmaCare PCSK9i coverage. Review specific requirements and documentation."); }
        return result;
    }

    // Helper methods from user's MedicationEvaluator
    _hasConfirmedASCVD(patientData) {
        // User's logic: ['prev_mi', 'stroke', 'pvd', 'coronary_artery_disease', 'cabg', 'pci', 'acs']
        // This needs to be mapped from patientInputs consistently. For now, assume a boolean flag.
        return patientData.hasASCVD === true;
    }
    _hasConfirmedFH(patientData) {
        // User's logic: 'familial_hypercholesterolemia' or dlcn_score >= 6
        return patientData.familialHypercholesterolemia === true || (patientData.dlcnScore && parseFloat(patientData.dlcnScore) >= 6);
    }
    _isPatientExtremeHighRisk(patientData) { // User's logic
        const CT = this.dependencies.ClinicalThresholds;
        const hasASCVD = this._hasConfirmedASCVD(patientData);
        const hasDiabetes = patientData.hasDiabetes === true;

        if (patientData.recentACSWithin12Months === true) return true;
        if (patientData.polyvascularDisease === true) return true;
        if (hasASCVD && hasDiabetes && ( (patientData.age >= (CT?.get('DIABETES.HIGH_RISK_AGE_WITH_ASCVD',55)||55)) || patientData.hasMicrovascularComplications === true ) ) return true;
        if (hasASCVD && patientData.chronicKidneyDisease === true && patientData.eGFR && (parseFloat(patientData.eGFR) < (CT?.get('CKD.SEVERE_EGFR_THRESHOLD',45)||45)) ) return true;
        if (hasASCVD && this._hasConfirmedFH(patientData)) return true;
        return false;
    }
    _hasAdditionalRiskFactorsForDiabetesCCS(patientData) { // User's logic
        if (patientData.age >= 40) return true;
        if (patientData.diabetesDurationYears && parseFloat(patientData.diabetesDurationYears) >= 15 && patientData.age >=30) return true;
        if (patientData.hasMicrovascularComplications === true) return true; // e.g. retinopathy, nephropathy
        // CCS also lists: eGFR < 60, ACR > 2, LVH, significant CAD on non-invasive testing
        if (patientData.eGFR && parseFloat(patientData.eGFR) < 60) return true;
        if (patientData.ACR && parseFloat(patientData.ACR) > 2.0) return true; // Assuming ACR in mg/mmol
        return false;
    }

    _getFallbackRecommendations(errorMessage = "Could not generate recommendations.") { /* ... (same as v1.1.0) ... */
        return { summaryMessage: errorMessage, pharmacological: [], lifestyle: ["Maintain healthy diet.", "Regular exercise.", "Avoid smoking."], monitoring: ["Consult provider."], referral: [], additionalNotes: [], guidelineSource: "General Best Practice", pcsk9EligibilityBC: {eligible: false, notes: ["N/A due to error"]} };
    }
    _deepClone(obj) { /* ... (same as v1.1.0) ... */
        if (obj === null || typeof obj !== 'object') return obj; try { return JSON.parse(JSON.stringify(obj)); } catch (e) { this._log('warn', 'Deep clone failed', e); return Array.isArray(obj) ? [...obj] : {...obj}; }
    }
}

// Instantiate and export the singleton service (typically done in main.js)
// const TreatmentRecommendationsServiceInstance = new TreatmentRecommendationsService({ /* dependencies */ });
// window.TreatmentRecommendationsService = TreatmentRecommendationsServiceInstance;
// export default TreatmentRecommendationsService;
