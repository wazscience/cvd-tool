/**
 * Enhanced Medication Evaluation Module
 * @file /js/calculations/medication-evaluation.js
 * @description Evaluates current medications and provides recommendations based on risk assessment
 * @version 2.0.1
 * @author CVD Risk Assessment Team
 */

// Import necessary utilities and validation
import { isValidNumber, convertUnits } from '../utils/validation-helpers.js';
import { LipidThresholds } from '../data/clinical-thresholds.js';
import { Medications } from '../data/medication-database.js';
import { EventBus } from '../utils/event-bus.js';

class MedicationEvaluator {
    constructor() {
        this.riskCategories = {
            LOW: { name: 'Low Risk', threshold: 0.1, ldlTarget: 3.5, nonHdlTarget: 4.2, apoBTarget: 1.05 },
            MODERATE: { name: 'Moderate Risk', threshold: 0.2, ldlTarget: 2.5, nonHdlTarget: 3.2, apoBTarget: 0.85 },
            HIGH: { name: 'High Risk', threshold: 0.3, ldlTarget: 2.0, nonHdlTarget: 2.6, apoBTarget: 0.7 },
            VERY_HIGH: { name: 'Very High Risk', threshold: Number.MAX_VALUE, ldlTarget: 1.8, nonHdlTarget: 2.4, apoBTarget: 0.65 }
        };
        
        this.medications = {
            statins: {
                lowIntensity: ['fluvastatin', 'lovastatin', 'pravastatin', 'simvastatin_low'],
                moderateIntensity: ['atorvastatin_low', 'fluvastatin_high', 'lovastatin_high', 'pitavastatin', 'pravastatin_high', 'rosuvastatin_low', 'simvastatin_high'],
                highIntensity: ['atorvastatin_high', 'rosuvastatin_high']
            },
            nonStatins: {
                ezetimibe: ['ezetimibe'],
                pcsk9i: ['evolocumab', 'alirocumab'],
                inclisiran: ['inclisiran'],
                other: ['bempedoic_acid', 'colesevelam', 'colestipol', 'cholestyramine', 'niacin', 'icosapent_ethyl', 'gemfibrozil', 'fenofibrate']
            }
        };
        
        // BC PharmaCare Special Authority coverage criteria for PCSK9 inhibitors
        // Updated to match current BC PharmaCare Special Authority criteria as of 2023
        this.bcPCSK9Criteria = {
            baseRequirements: [
                "Patient diagnosed with heterozygous familial hypercholesterolemia (HeFH) confirmed by genetic testing OR clinical criteria",
                "Patient diagnosed with atherosclerotic cardiovascular disease (ASCVD), defined as history of myocardial infarction, coronary revascularization, stroke, TIA, or symptomatic peripheral arterial disease"
            ],
            additionalRequirements: [
                "LDL-C ≥ 1.8 mmol/L (≥ 70 mg/dL) despite maximally tolerated statin therapy AND ezetimibe",
                "Patient is currently on maximally tolerated high-intensity statin therapy for ≥ 3 months",
                "Patient is currently on ezetimibe 10 mg daily for ≥ 3 months in addition to statin therapy",
                "For statin intolerance: documented inability to tolerate at least two different statins at the lowest daily starting dose (supported by CK levels if muscle symptoms present)"
            ],
            exclusionCriteria: [
                "Hypersensitivity to PCSK9 inhibitors or any component of the formulation",
                "Pregnancy or breastfeeding",
                "Secondary causes of hyperlipidemia (e.g., untreated hypothyroidism, uncontrolled diabetes, obstructive liver disease)",
                "Age < 18 years"
            ],
            renewalCriteria: [
                "Documented LDL-C reduction of ≥ 10% from baseline after 3 months of therapy",
                "Continued adherence to background lipid-lowering therapy (statin and/or ezetimibe)",
                "Renewal recommended every 12 months with documentation of continued clinical benefit and adherence"
            ],
            specialPopulations: {
                extremeHighRisk: {
                    definition: [
                        "Recent ACS or MI (within 12 months)",
                        "Recurrent cardiovascular events despite optimal LDL-C lowering therapy",
                        "ASCVD with diabetes, CKD, or FH",
                        "Polyvascular disease (≥ 2 vascular beds affected)"
                    ],
                    targetLDL: "1.4 mmol/L or ≥ 60% reduction from baseline"
                }
            },
            documentationRequired: [
                "Baseline and current lipid profile (within last 30 days)",
                "Documentation of statin therapy (including doses tried and reasons for intolerance if applicable)",
                "Documentation of ezetimibe therapy",
                "Documentation of FH diagnosis (if applicable)",
                "Documentation of ASCVD events (if applicable)"
            ]
        };
        
        // Initialize event listeners for cross-module communication
        this._initializeEvents();
    }
    
    /**
     * Initialize event listeners for cross-module communication
     * @private
     */
    _initializeEvents() {
        // Listen for risk calculation events
        EventBus.subscribe('risk-calculated', (data) => {
            // Store risk data for medication evaluation
            this.lastRiskData = data;
        });
        
        // Listen for medication update events
        EventBus.subscribe('medications-updated', (medications) => {
            this.currentMedications = medications;
        });
    }
    
    /**
     * Evaluates the current medications and provides recommendations
     * @param {Object} patientData - Patient clinical data
     * @param {Object} riskData - Risk calculation data
     * @param {Array} currentMedications - List of current medications
     * @returns {Object} Evaluation results and recommendations
     */
    evaluateMedications(patientData, riskData, currentMedications = []) {
        if (!patientData || !riskData) {
            throw new Error('Patient data and risk data are required for medication evaluation');
        }
        
        // Clone objects to prevent mutations
        patientData = JSON.parse(JSON.stringify(patientData));
        riskData = JSON.parse(JSON.stringify(riskData));
        
        // Normalize units for consistency
        this._normalizeUnits(patientData);
        
        // Determine risk category and targets
        const riskCategory = this._determineRiskCategory(riskData);
        const targets = this._determineLipidTargets(riskCategory, patientData);
        
        // Evaluate current therapy if provided
        const currentTherapy = currentMedications && currentMedications.length > 0 
            ? this._evaluateCurrentTherapy(patientData, currentMedications)
            : null;
        
        // Generate recommendations
        const recommendations = this._generateRecommendations(
            patientData, 
            riskCategory, 
            targets, 
            currentTherapy
        );
        
        // Check eligibility for PCSK9 inhibitors
        const pcsk9Eligibility = this._evaluatePCSK9Eligibility(
            patientData, 
            riskCategory, 
            currentTherapy
        );
        
        // Prepare the full evaluation result
        const result = {
            riskCategory: riskCategory,
            targets: targets,
            currentValues: {
                ldl: patientData.ldl || null,
                nonHdl: patientData.nonHdl || this._calculateNonHDL(patientData),
                apoB: patientData.apoB || null
            },
            targetsMet: this._areTargetsMet(patientData, targets),
            currentTherapy: currentTherapy,
            recommendations: recommendations,
            pcsk9Eligibility: pcsk9Eligibility,
            treatmentIntensification: this._recommendTreatmentIntensification(
                patientData, 
                targets, 
                currentTherapy
            ),
            alternativeOptions: this._getAlternativeOptions(
                patientData, 
                currentTherapy, 
                recommendations
            )
        };
        
        // Publish the evaluation results for other modules
        EventBus.publish('medication-evaluation-complete', result);
        
        return result;
    }
    
dL' && patientData.nonHdl) {
            patientData.nonHdl = convertUnits(patientData.nonHdl, 'mg/dL', 'mmol/L', 'nonHdl');
        }
        
        if (patientData.apoBUnit === 'mg/dL' && patientData.apoB) {
            patientData.apoB = convertUnits(patientData.apoB, 'mg/dL', 'g/L', 'apoB');
        }
        
        if (patientData.lpaUnit === 'mg/dL' && patientData.lpa) {
            patientData.lpa = patientData.lpa; // Already in correct unit, no conversion needed
        }
    }
    
    /**
     * Calculates any derived values that can be determined from existing data
     * @param {Object} patientData - Patient clinical data
     * @private 
     */
    _calculateDerivedValues(patientData) {
        // Calculate non-HDL if missing but total cholesterol and HDL are available
        if (patientData.nonHdl === null || patientData.nonHdl === undefined) {
            if (patientData.totalChol !== null && patientData.totalChol !== undefined &&
                patientData.hdl !== null && patientData.hdl !== undefined) {
                patientData.nonHdl = parseFloat(patientData.totalChol) - parseFloat(patientData.hdl);
                console.log('Calculated non-HDL cholesterol:', patientData.nonHdl);
            }
        }
        
        // Calculate LDL using Friedewald formula if missing but other values available
        if ((patientData.ldl === null || patientData.ldl === undefined) &&
            patientData.totalChol !== null && patientData.totalChol !== undefined &&
            patientData.hdl !== null && patientData.hdl !== undefined) {
            
            // Check if triglycerides are available and less than 4.5 mmol/L
            if (patientData.trig !== null && patientData.trig !== undefined && 
                parseFloat(patientData.trig) < 4.5) {
                // Friedewald formula: LDL = TC - HDL - (TG/2.2)
                patientData.ldl = parseFloat(patientData.totalChol) - 
                                 parseFloat(patientData.hdl) - 
                                 (parseFloat(patientData.trig) / 2.2);
                patientData.ldl = Math.max(0, Math.round(patientData.ldl * 100) / 100);
                console.log('Calculated LDL cholesterol using Friedewald formula:', patientData.ldl);
            } else if (patientData.nonHdl !== null && patientData.nonHdl !== undefined) {
                // Estimate LDL from non-HDL (less accurate)
                patientData.ldl = parseFloat(patientData.nonHdl) * 0.8;
                patientData.ldl = Math.round(patientData.ldl * 100) / 100;
                console.log('Estimated LDL cholesterol from non-HDL:', patientData.ldl);
            }
        }
        
        // Calculate total cholesterol/HDL ratio if needed
        if (patientData.cholRatio === null || patientData.cholRatio === undefined) {
            if (patientData.totalChol !== null && patientData.totalChol !== undefined &&
                patientData.hdl !== null && patientData.hdl !== undefined &&
                parseFloat(patientData.hdl) > 0) {
                patientData.cholRatio = parseFloat(patientData.totalChol) / parseFloat(patientData.hdl);
                patientData.cholRatio = Math.round(patientData.cholRatio * 10) / 10;
                console.log('Calculated total cholesterol to HDL ratio:', patientData.cholRatio);
            }
        }
    }
    
    /**
     * Determines the risk category based on calculated risk and Canadian Cardiovascular Society Guidelines
     * Reference: 2021 Canadian Cardiovascular Society Guidelines for the Management of Dyslipidemia
     * @param {Object} riskData - Risk calculation data
     * @param {Object} patientData - Patient clinical data (for special considerations)
     * @returns {Object} Risk category
     * @private
     */
    _determineRiskCategory(riskData, patientData = {}) {
        // Get the modified risk or base risk
        const calculatedRisk = riskData.modifiedRisk || riskData.baseRisk || 0;
        
        // Check for clinical atherosclerotic cardiovascular disease (ASCVD) - automatic high risk
        const ascvdConditions = ['prev_mi', 'stroke', 'pvd', 'previous_cardiovascular_event', 
                               'coronary_artery_disease', 'carotid_stenosis', 'peripheral_arterial_disease'];
        
        const hasASCVD = ascvdConditions.some(condition => {
            return patientData.medicalConditions && 
                  (patientData.medicalConditions.includes(condition) || 
                   patientData[condition] === true);
        });
        
        if (hasASCVD) {
            console.log('Patient has clinical ASCVD - high risk category');
            return this.riskCategories.HIGH;
        }
        
        // Check for other very high risk conditions per Canadian guidelines
        // Familial hypercholesterolemia
        if (patientData.medicalConditions && 
            (patientData.medicalConditions.includes('familial_hypercholesterolemia') || 
             patientData.familial_hypercholesterolemia === true)) {
            console.log('Patient has familial hypercholesterolemia - very high risk category');
            return this.riskCategories.VERY_HIGH;
        }
        
        // Chronic kidney disease (CKD)
        const hasCKD = patientData.medicalConditions && 
                     (patientData.medicalConditions.includes('ckd') || 
                      patientData.chronic_kidney_disease === true);
        
        // Diabetes with target organ damage or duration >15 years
        const hasDiabetes = patientData.diabetes === true || patientData.diabetes === 'yes' || 
                           (patientData.diabetes_type && patientData.diabetes_type !== 'none');
        
        const hasLongDiabetes = hasDiabetes && 
                              ((patientData.diabetes_duration && patientData.diabetes_duration >= 15) || 
                               patientData.diabetes_complications === true);
        
        if (hasCKD || hasLongDiabetes) {
            console.log('Patient has CKD or long-standing diabetes - high risk category');
            return this.riskCategories.HIGH;
        }
        
        // Check for elevated Lp(a) - adjustment to risk per 2021 CCS Guidelines
        const hasElevatedLpa = patientData.lpa && patientData.lpa >= 50; // ≥50 mg/dL
        
        if (hasElevatedLpa && calculatedRisk >= 0.05) { // If Framingham risk ≥5%
            // Per CCS Guidelines, elevated Lp(a) can bump up the risk category
            console.log('Patient has elevated Lp(a) - increasing risk category');
            if (calculatedRisk < 0.1) {
                // Move from low to moderate risk
                return this.riskCategories.MODERATE;
            } else if (calculatedRisk < 0.2) {
                // Move from moderate to high risk
                return this.riskCategories.HIGH;
            }
        }
        
        // Determine risk category based on calculated risk
        if (calculatedRisk < this.riskCategories.LOW.threshold) {
            return this.riskCategories.LOW;
        } else if (calculatedRisk < this.riskCategories.MODERATE.threshold) {
            return this.riskCategories.MODERATE;
        } else if (calculatedRisk < this.riskCategories.HIGH.threshold) {
            return this.riskCategories.HIGH;
        } else {
            return this.riskCategories.VERY_HIGH;
        }
    }
    
    /**
     * Determines lipid targets based on risk category and patient data
     * according to the 2021 Canadian Cardiovascular Society Guidelines
     * @param {Object} riskCategory - Risk category
     * @param {Object} patientData - Patient clinical data
     * @returns {Object} Lipid targets
     * @private
     */
    _determineLipidTargets(riskCategory, patientData) {
        // Initialize targets based on Canadian guidelines
        let targets = {
            ldl: null,
            nonHdl: null,
            apoB: null,
            percentReduction: null,
            alternativeGoal: false
        };
        
        // Identify clinical ASCVD (secondary prevention)
        const ascvdConditions = [
            'prev_mi', 'stroke', 'pvd', 'previous_cardiovascular_event', 
            'coronary_artery_disease', 'carotid_stenosis', 'peripheral_arterial_disease'
        ];
        
        const hasASCVD = ascvdConditions.some(condition => {
            return patientData.medicalConditions && 
                  (patientData.medicalConditions.includes(condition) || 
                   patientData[condition] === true);
        });
        
        // Check for familial hypercholesterolemia (FH)
        const hasFH = patientData.medicalConditions && 
                     (patientData.medicalConditions.includes('familial_hypercholesterolemia') || 
                      patientData.familial_hypercholesterolemia === true);
        
        // 1. Secondary Prevention (ASCVD) - CCS 2021 Guidelines
        if (hasASCVD) {
            targets.ldl = 1.8;           // < 1.8 mmol/L
            targets.percentReduction = 50; // or > 50% reduction from baseline
            targets.nonHdl = 2.4;        // < 2.4 mmol/L
            targets.apoB = 0.7;          // < 0.7 g/L
            
            // For very high-risk ASCVD, even lower targets apply
            const veryHighRiskFeatures = this._hasVeryHighRiskFeatures(patientData);
            if (veryHighRiskFeatures) {
                targets.ldl = 1.4;       // < 1.4 mmol/L 
                targets.percentReduction = 60; // or > 60% reduction
                targets.nonHdl = 2.0;    // < 2.0 mmol/L
                targets.apoB = 0.65;     // < 0.65 g/L
            }
        }
        // 2. Primary Prevention - FH
        else if (hasFH) {
            targets.ldl = 2.0;           // < 2.0 mmol/L
            targets.percentReduction = 50; // or > 50% reduction
            targets.nonHdl = 2.6;        // < 2.6 mmol/L
            targets.apoB = 0.8;          // < 0.8 g/L
            
            // If FH + high risk features
            if (this._hasAdditionalRiskFactors(patientData)) {
                targets.ldl = 1.8;       // < 1.8 mmol/L
                targets.nonHdl = 2.4;    // < 2.4 mmol/L
                targets.apoB = 0.7;      // < 0.7 g/L
            }
        }
        // 3. Primary Prevention - Diabetes with risk factors
        else if ((patientData.diabetes === true || patientData.diabetes === 'yes') && 
                this._hasAdditionalRiskFactors(patientData)) {
            targets.ldl = 2.0;           // < 2.0 mmol/L
            targets.percentReduction = 50; // or > 50% reduction
            targets.nonHdl = 2.6;        // < 2.6 mmol/L
            targets.apoB = 0.8;          // < 0.8 g/L
        }
        // 4. Primary Prevention - High Risk (Framingham ≥ 20% 10-year risk)
        else if (riskCategory.name === 'High Risk' || riskCategory.name === 'Very High Risk') {
            targets.ldl = 2.0;           // < 2.0 mmol/L
            targets.percentReduction = 50; // or > 50% reduction
            targets.nonHdl = 2.6;        // < 2.6 mmol/L
            targets.apoB = 0.8;          // < 0.8 g/L
        }
        // 5. Primary Prevention - Intermediate Risk (10-19% 10-year risk)
        else if (riskCategory.name === 'Moderate Risk') {
            // Determine if LDL ≥ 3.5 mmol/L - then treat to < 2.0 mmol/L
            if (patientData.ldl && patientData.ldl >= 3.5) {
                targets.ldl = 2.0;
                targets.percentReduction = 50;
                targets.nonHdl = 2.6;
                targets.apoB = 0.8;
            }
            // Otherwise, treat to < 2.5 mmol/L or > 30% reduction
            else {
                targets.ldl = 2.5;
                targets.percentReduction = 30;
                targets.nonHdl = 3.2;
                targets.apoB = 0.9;
            }
            
            // Check for elevated Lp(a)
            if (patientData.lpa && patientData.lpa >= 50) { // ≥50 mg/dL is considered elevated
                targets.ldl = 2.0;       // More aggressive target with elevated Lp(a)
                targets.percentReduction = 50;
                targets.nonHdl = 2.6;
                targets.apoB = 0.8;
            }
        }
        // 6. Primary Prevention - Low Risk (<10% 10-year risk)
        else {
            // Determine if LDL ≥ 5.0 mmol/L - then treat
            if (patientData.ldl && patientData.ldl >= 5.0) {
                targets.ldl = 2.5;
                targets.percentReduction = 50;
                targets.nonHdl = 3.2;
                targets.apoB = 0.9;
            }
            // Otherwise, pharmacotherapy generally not recommended unless other factors
            else {
                targets.alternativeGoal = true;
                targets.ldl = 3.5; // General threshold for consideration
                targets.nonHdl = 4.2;
                targets.apoB = 1.05;
            }
        }
        
        return targets;
    }
    
    /**
     * Checks if patient has very high-risk features according to CCS Guidelines
     * @param {Object} patientData - Patient clinical data
     * @returns {boolean} Whether the patient has very high-risk features
     * @private
     */
    _hasVeryHighRiskFeatures(patientData) {
        // Polyvascular disease (>1 vascular bed)
        const vascularBeds = ['coronary_artery_disease', 'carotid_stenosis', 
                             'peripheral_arterial_disease', 'prev_mi', 'stroke', 'pvd'];
        
        let vascularBedCount = 0;
        vascularBeds.forEach(condition => {
            if (patientData.medicalConditions && 
                (patientData.medicalConditions.includes(condition) || 
                 patientData[condition] === true)) {
                vascularBedCount++;
            }
        });
        
        // Recurrent ACS within 2 years on optimal LDL-C lowering therapy
        const hasRecentACS = patientData.recurrent_acs === true;
        
        // ASCVD + Diabetes
        const hasASCVD = vascularBedCount > 0;
        const hasDiabetes = patientData.diabetes === true || patientData.diabetes === 'yes';
        
        // ASCVD + CKD
        const hasCKD = patientData.medicalConditions && 
                     (patientData.medicalConditions.includes('ckd') || 
                      patientData.chronic_kidney_disease === true);
        
        // ASCVD + FH
        const hasFH = patientData.medicalConditions && 
                     (patientData.medicalConditions.includes('familial_hypercholesterolemia') || 
                      patientData.familial_hypercholesterolemia === true);
        
        // ASCVD + elevated Lp(a)
        const hasElevatedLpa = patientData.lpa && patientData.lpa >= 50; // ≥50 mg/dL
        
        return (vascularBedCount >= 2) || 
               hasRecentACS || 
               (hasASCVD && hasDiabetes) || 
               (hasASCVD && hasCKD) || 
               (hasASCVD && hasFH) ||
               (hasASCVD && hasElevatedLpa);
    }
    
    /**
     * Checks if patient has additional risk factors that modify treatment decisions
     * @param {Object} patientData - Patient clinical data
     * @returns {boolean} Whether patient has additional risk factors
     * @private
     */
    _hasAdditionalRiskFactors(patientData) {
        // Age ≥ 40 for diabetes
        const isOlderThan40 = patientData.age && parseFloat(patientData.age) >= 40;
        
        // Duration of diabetes >15 years and age >30 years
        const hasLongDiabetes = patientData.diabetes_duration && 
                              parseFloat(patientData.diabetes_duration) > 15 && 
                              patientData.age && parseFloat(patientData.age) > 30;
        
        // Microvascular complications: retinopathy, nephropathy, neuropathy
        const hasMicrovascularComplications = patientData.microvascular_complications === true ||
                                            patientData.retinopathy === true ||
                                            patientData.nephropathy === true ||
                                            patientData.neuropathy === true;
        
        // eGFR <60 mL/min/1.73 m² or ACR >3 mg/mmol
        const hasRenalImpairment = (patientData.egfr && parseFloat(patientData.egfr) < 60) ||
                                 (patientData.acr && parseFloat(patientData.acr) > 3);
        
        // Hypertension
        const hasHypertension = patientData.hypertension === true || 
                              (patientData.medicalConditions && 
                               patientData.medicalConditions.includes('hypertension'));
        
        // Non-alcoholic steatohepatitis
        const hasNASH = patientData.nash === true ||
                      (patientData.medicalConditions && 
                       patientData.medicalConditions.includes('nash'));
        
        // Elevated Lp(a)
        const hasElevatedLpa = patientData.lpa && patientData.lpa >= 50; // ≥50 mg/dL
        
        // Premature family history of CVD
        const hasFamilyHistory = patientData.family_history === true || 
                               patientData.family_history_cvd === true;
        
        return isOlderThan40 || 
               hasLongDiabetes || 
               hasMicrovascularComplications || 
               hasRenalImpairment || 
               hasHypertension || 
               hasNASH || 
               hasElevatedLpa || 
               hasFamilyHistory;
    }
    
    /**
     * Evaluates the current therapy
     * @param {Object} patientData - Patient clinical data
     * @param {Array} medications - Current medications
     * @returns {Object} Evaluation of current therapy
     * @private
     */
    _evaluateCurrentTherapy(patientData, medications) {
        // Extract statin information
        const statins = medications.filter(med => {
            return this._getMedicationCategory(med) === 'statin';
        });
        
        // Determine statin intensity
        let statinIntensity = 'none';
        if (statins.length > 0) {
            // Find the highest intensity statin in the list
            for (const statin of statins) {
                const intensity = this._getStatinIntensity(statin);
                if (intensity === 'high') {
                    statinIntensity = 'high';
                    break;
                } else if (intensity === 'moderate' && statinIntensity !== 'high') {
                    statinIntensity = 'moderate';
                } else if (intensity === 'low' && statinIntensity === 'none') {
                    statinIntensity = 'low';
                }
            }
        }
        
        // Check for ezetimibe
        const hasEzetimibe = medications.some(med => {
            return med.toLowerCase().includes('ezetimibe');
        });
        
        // Check for PCSK9 inhibitors
        const hasPCSK9 = medications.some(med => {
            return med.toLowerCase().includes('evolocumab') || 
                   med.toLowerCase().includes('alirocumab') ||
                   med.toLowerCase().includes('inclisiran');
        });
        
        // Check for other lipid-lowering therapies
        const otherTherapies = medications.filter(med => {
            const category = this._getMedicationCategory(med);
            return category !== 'statin' && 
                   category !== 'ezetimibe' && 
                   category !== 'pcsk9i' &&
                   category !== 'none';
        });
        
        // Calculate estimated LDL reduction based on therapy
        const estimatedLDLReduction = this._estimateLDLReduction(
            statinIntensity, 
            hasEzetimibe, 
            hasPCSK9, 
            otherTherapies
        );
        
        // Estimate what LDL would be without therapy
        let estimatedBaselineLDL = null;
        if (patientData.ldl) {
            // Calculate what LDL would theoretically be without treatment
            // LDL current = LDL baseline * (1 - reduction)
            // So LDL baseline = LDL current / (1 - reduction)
            estimatedBaselineLDL = patientData.ldl / (1 - estimatedLDLReduction);
        }
        
        // Return the evaluation
        return {
            statinIntensity: statinIntensity,
            statins: statins,
            hasEzetimibe: hasEzetimibe,
            hasPCSK9: hasPCSK9,
            otherTherapies: otherTherapies,
            estimatedLDLReduction: estimatedLDLReduction,
            estimatedBaselineLDL: estimatedBaselineLDL
        };
    }
    
    /**
     * Generates medication recommendations
     * @param {Object} patientData - Patient clinical data
     * @param {Object} riskCategory - Risk category
     * @param {Object} targets - Lipid targets
     * @param {Object} currentTherapy - Current therapy evaluation
     * @returns {Object} Recommendations
     * @private
     */
    _generateRecommendations(patientData, riskCategory, targets, currentTherapy) {
        const targetsMet = this._areTargetsMet(patientData, targets);
        
        // If no current therapy information, provide initial recommendations
        if (!currentTherapy) {
            return this._generateInitialRecommendations(patientData, riskCategory, targets);
        }
        
        // If targets are met, recommend maintaining current therapy
        if (targetsMet.overall) {
            return {
                recommendation: 'maintain',
                message: 'Lipid targets are currently met. Continue current therapy and monitor lipids annually.',
                nextSteps: [
                    'Continue current therapy',
                    'Monitor lipid panel annually',
                    'Reassess cardiovascular risk with any significant health changes'
                ]
            };
        }
        
        // If targets are not met, recommend intensification
        return this._recommendTreatmentIntensification(patientData, targets, currentTherapy);
    }
    
    /**
     * Generates initial recommendations for a patient not on therapy
     * @param {Object} patientData - Patient clinical data
     * @param {Object} riskCategory - Risk category
     * @param {Object} targets - Lipid targets
     * @returns {Object} Initial recommendations
     * @private
     */
    _generateInitialRecommendations(patientData, riskCategory, targets) {
        const targetsMet = this._areTargetsMet(patientData, targets);
        
        // If targets are already met without therapy
        if (targetsMet.overall) {
            return {
                recommendation: 'lifestyle',
                message: 'Lipid targets are currently met without pharmacotherapy. Focus on lifestyle measures and monitor lipids annually.',
                nextSteps: [
                    'Emphasize healthy diet, regular exercise, and avoiding tobacco',
                    'Monitor lipid panel annually',
                    'Reassess cardiovascular risk periodically'
                ]
            };
        }
        
        // Determine how far above target the patient is
        let ldlPercentAboveTarget = null;
        if (patientData.ldl && targets.ldl) {
            ldlPercentAboveTarget = (patientData.ldl - targets.ldl) / targets.ldl * 100;
        }
        
        // Recommendations based on risk category and current lipid levels
        if (riskCategory.name === 'Low Risk' || riskCategory.name === 'Moderate Risk') {
            if (ldlPercentAboveTarget && ldlPercentAboveTarget < 20) {
                return {
                    recommendation: 'lifestyle_primary',
                    message: 'Initial approach with lifestyle modification for 3-6 months before considering pharmacotherapy.',
                    nextSteps: [
                        'Emphasize healthy diet, regular exercise, and avoiding tobacco',
                        'Consider plant sterols/stanols and soluble fiber',
                        'Reassess lipids in 3-6 months',
                        'If targets not met after lifestyle changes, consider statin therapy'
                    ]
                };
            } else {
                return {
                    recommendation: 'statin_moderate',
                    message: 'Recommend starting a moderate-intensity statin along with lifestyle measures.',
                    nextSteps: [
                        'Start moderate-intensity statin (e.g., atorvastatin 10-20 mg or rosuvastatin 5-10 mg)',
                        'Emphasize healthy diet, regular exercise, and avoiding tobacco',
                        'Reassess lipids in 6-12 weeks after starting therapy',
                        'Adjust therapy as needed to achieve targets'
                    ],
                    medications: [
                        { name: 'Atorvastatin', dosage: '10-20 mg daily' },
                        { name: 'Rosuvastatin', dosage: '5-10 mg daily' }
                    ]
                };
            }
        } else {
            // High or Very High Risk
            return {
                recommendation: 'statin_high',
                message: 'Recommend starting a high-intensity statin immediately along with lifestyle measures.',
                nextSteps: [
                    'Start high-intensity statin (e.g., atorvastatin 40-80 mg or rosuvastatin 20-40 mg)',
                    'Emphasize healthy diet, regular exercise, and avoiding tobacco',
                    'Reassess lipids in 6-12 weeks after starting therapy',
                    'Consider adding ezetimibe if targets not met on maximum tolerated statin'
                ],
                medications: [
                    { name: 'Atorvastatin', dosage: '40-80 mg daily' },
                    { name: 'Rosuvastatin', dosage: '20-40 mg daily' }
                ]
            };
        }
    }
    
    /**
     * Recommends treatment intensification if targets are not met
     * @param {Object} patientData - Patient clinical data
     * @param {Object} targets - Lipid targets
     * @param {Object} currentTherapy - Current therapy evaluation
     * @returns {Object} Treatment intensification recommendations
     * @private
     */
    _recommendTreatmentIntensification(patientData, targets, currentTherapy) {
        // If no current therapy, return initial recommendations
        if (!currentTherapy) {
            return this._generateInitialRecommendations(patientData, this._determineRiskCategory({ baseRisk: 0.1 }), targets);
        }
        
        const { statinIntensity, hasEzetimibe, hasPCSK9 } = currentTherapy;
        
        // Calculate how far from targets
        const ldlGap = patientData.ldl ? patientData.ldl - targets.ldl : null;
        const percentReductionNeeded = ldlGap && patientData.ldl ? ldlGap / patientData.ldl * 100 : null;
        
        // Intensification logic
        if (statinIntensity === 'none') {
            // Not on a statin yet
            return {
                recommendation: 'start_statin',
                message: 'Recommend starting a moderate or high-intensity statin based on risk category.',
                nextSteps: [
                    'Start appropriate intensity statin therapy',
                    'Reassess lipids in 6-12 weeks',
                    'Adjust therapy as needed to achieve targets'
                ],
                medications: [
                    { name: 'Atorvastatin', dosage: '20-80 mg daily' },
                    { name: 'Rosuvastatin', dosage: '10-40 mg daily' }
                ]
            };
        } else if (statinIntensity === 'low') {
            // On low-intensity statin
            return {
                recommendation: 'increase_statin',
                message: 'Recommend increasing to a moderate or high-intensity statin to better achieve lipid targets.',
                nextSteps: [
                    'Increase to moderate or high-intensity statin therapy',
                    'Reassess lipids in 6-12 weeks',
                    'Consider adding ezetimibe if targets still not met'
                ],
                medications: [
                    { name: 'Atorvastatin', dosage: '20-80 mg daily' },
                    { name: 'Rosuvastatin', dosage: '10-40 mg daily' }
                ]
            };
        } else if (statinIntensity === 'moderate' && !hasEzetimibe) {
            // On moderate-intensity statin without ezetimibe
            return {
                recommendation: 'add_ezetimibe',
                message: 'Recommend adding ezetimibe to current statin therapy.',
                nextSteps: [
                    'Add ezetimibe 10 mg daily to current statin',
                    'Consider increasing statin to high-intensity if tolerated',
                    'Reassess lipids in 6-12 weeks'
                ],
                medications: [
                    { name: 'Ezetimibe', dosage: '10 mg daily' }
                ]
            };
        } else if (statinIntensity === 'moderate' && hasEzetimibe) {
            // On moderate-intensity statin with ezetimibe
            return {
                recommendation: 'increase_to_high_intensity',
                message: 'Recommend increasing to high-intensity statin while continuing ezetimibe.',
                nextSteps: [
                    'Increase to high-intensity statin (e.g., atorvastatin 40-80 mg or rosuvastatin 20-40 mg)',
                    'Continue ezetimibe 10 mg daily',
                    'Reassess lipids in 6-12 weeks',
                    'Consider PCSK9 inhibitor if targets still not met'
                ],
                medications: [
                    { name: 'Atorvastatin', dosage: '40-80 mg daily' },
                    { name: 'Rosuvastatin', dosage: '20-40 mg daily' }
                ]
            };
        } else if (statinIntensity === 'high' && !hasEzetimibe) {
            // On high-intensity statin without ezetimibe
            return {
                recommendation: 'add_ezetimibe_to_high',
                message: 'Recommend adding ezetimibe to current high-intensity statin therapy.',
                nextSteps: [
                    'Add ezetimibe 10 mg daily to current high-intensity statin',
                    'Reassess lipids in 6-12 weeks',
                    'Consider PCSK9 inhibitor if targets still not met'
                ],
                medications: [
                    { name: 'Ezetimibe', dosage: '10 mg daily' }
                ]
            };
        } else if (statinIntensity === 'high' && hasEzetimibe && !hasPCSK9) {
            // On high-intensity statin with ezetimibe but without PCSK9i
            // Check for PCSK9i eligibility
            const pcsk9Eligibility = this._evaluatePCSK9Eligibility(patientData, { name: 'High Risk' }, currentTherapy);
            
            if (pcsk9Eligibility.eligible) {
                return {
                    recommendation: 'consider_pcsk9',
                    message: 'Consider adding a PCSK9 inhibitor to current therapy. Patient meets eligibility criteria.',
                    nextSteps: [
                        'Continue high-intensity statin and ezetimibe',
                        'Add PCSK9 inhibitor (evolocumab 140 mg SC q2wk or alirocumab 75-150 mg SC q2wk)',
                        'Reassess lipids in 6-12 weeks',
                        'Monitor for side effects'
                    ],
                    medications: [
                        { name: 'Evolocumab', dosage: '140 mg subcutaneously every 2 weeks' },
                        { name: 'Alirocumab', dosage: '75-150 mg subcutaneously every 2 weeks' }
                    ],
                    eligibilityCriteria: pcsk9Eligibility.criteria
                };
            } else {
                return {
                    recommendation: 'maximize_current_therapy',
                    message: 'Maximize current therapy and ensure adherence. Consider clinical trial or additional therapies.',
                    nextSteps: [
                        'Verify adherence to high-intensity statin and ezetimibe',
                        'Optimize lifestyle modifications',
                        'Consider additional therapies (bempedoic acid, bile acid sequestrants)',
                        'Consider referral to lipid specialist'
                    ],
                    medications: [
                        { name: 'Bempedoic acid', dosage: '180 mg daily' },
                        { name: 'Colesevelam', dosage: '3.75 g daily' }
                    ]
                };
            }
        } else if (hasPCSK9) {
            // Already on PCSK9i
            return {
                recommendation: 'maximize_all_therapy',
                message: 'Patient is on maximum available therapy. Focus on adherence and lifestyle optimization.',
                nextSteps: [
                    'Verify adherence to all medications',
                    'Emphasize lifestyle modifications',
                    'Consider referral to lipid specialist',
                    'Monitor lipids every 3-6 months'
                ]
            };
        }
        
        // Default recommendation if none of the above conditions apply
        return {
            recommendation: 'review_therapy',
            message: 'Review current therapy and ensure adherence. Consider referral to a lipid specialist.',
            nextSteps: [
                'Review current medications and adherence',
                'Optimize lifestyle modifications',
                'Consider referral to lipid specialist for personalized recommendations'
            ]
        };
    }
    
    /**
     * Gets alternative medication options
     * @param {Object} patientData - Patient clinical data
     * @param {Object} currentTherapy - Current therapy evaluation
     * @param {Object} recommendations - Primary recommendations
     * @returns {Array} Alternative medication options
     * @private
     */
    _getAlternativeOptions(patientData, currentTherapy, recommendations) {
        // Define alternative options based on current therapy and recommendations
        const alternatives = [];
        
        // If no current therapy, return standard first-line alternatives
        if (!currentTherapy) {
            return [
                {
                    name: 'Standard Approach',
                    description: 'Start with a moderate-intensity statin and titrate up as needed',
                    medications: [
                        { name: 'Atorvastatin', dosage: '10-20 mg daily', notes: 'First-line option' },
                        { name: 'Rosuvastatin', dosage: '5-10 mg daily', notes: 'Alternative first-line' }
                    ]
                },
                {
                    name: 'Statin Intolerance Approach',
                    description: 'For patients with history of statin-associated muscle symptoms',
                    medications: [
                        { name: 'Rosuvastatin', dosage: '5 mg 2-3 times weekly', notes: 'Intermittent dosing' },
                        { name: 'Ezetimibe', dosage: '10 mg daily', notes: 'Non-statin option' }
                    ]
                }
            ];
        }
        
        // Determine options based on current therapy
        const { statinIntensity, hasEzetimibe, hasPCSK9 } = currentTherapy;
        
        // Alternative for statin intolerance
        if (recommendations.recommendation && recommendations.recommendation.includes('statin')) {
            alternatives.push({
                name: 'Statin Intolerance Alternative',
                description: 'For patients who cannot tolerate recommended statin intensity',
                medications: [
                    { name: 'Rosuvastatin', dosage: 'Lower dose or intermittent dosing', notes: 'Try 5-10 mg 2-3 times weekly' },
                    { name: 'Ezetimibe', dosage: '10 mg daily', notes: 'Add to lower statin dose or use alone if needed' },
                    { name: 'Bempedoic acid', dosage: '180 mg daily', notes: 'Consider in statin intolerant patients' }
                ]
            });
        }
        
        // Alternative for patients needing additional LDL lowering
        if ((statinIntensity === 'high' && hasEzetimibe) || 
            (statinIntensity === 'moderate' && hasEzetimibe)) {
            alternatives.push({
                name: 'Additional LDL Lowering Options',
                description: 'When targets not achieved with statin + ezetimibe',
                medications: [
                    { name: 'Bempedoic acid', dosage: '180 mg daily', notes: 'Adds approximately 15-25% LDL reduction' },
                    { name: 'Colesevelam', dosage: '3.75 g daily', notes: 'Adds approximately 10-15% LDL reduction' },
                    { name: 'Icosapent ethyl', dosage: '2 g twice daily', notes: 'For elevated triglycerides, cardiovascular risk reduction' }
                ]
            });
        }
        
        // Options for very high-risk patients
        if (recommendations.recommendation === 'consider_pcsk9' || hasPCSK9) {
            alternatives.push({
                name: 'Very High-Risk Patient Options',
                description: 'For patients with atherosclerotic cardiovascular disease or FH',
                medications: [
                    { name: 'Inclisiran', dosage: '284 mg SC initially, again at 3 months, then every 6 months', notes: 'PCSK9 siRNA therapy' },
                    { name: 'LDL apheresis', dosage: 'Procedure every 2-4 weeks', notes: 'For homozygous FH or severe hypercholesterolemia' }
                ]
            });
        }
        
        // Always include lifestyle optimization
        alternatives.push({
            name: 'Lifestyle Optimization',
            description: 'Non-pharmacological approaches to enhance lipid management',
            medications: [
                { name: 'Plant sterols/stanols', dosage: '2-3 g daily', notes: 'Can lower LDL by 5-10%' },
                { name: 'Soluble fiber', dosage: '10-25 g daily', notes: 'Can lower LDL by 3-5%' },
                { name: 'Mediterranean diet', dosage: 'Dietary pattern', notes: 'Reduces cardiovascular events' }
            ]
        });
        
        return alternatives;
    }
    
    /**
     * Evaluates eligibility for PCSK9 inhibitors based on BC PharmaCare Special Authority criteria
     * @param {Object} patientData - Patient clinical data
     * @param {Object} riskCategory - Risk category
     * @param {Object} currentTherapy - Current therapy evaluation
     * @returns {Object} Eligibility assessment
     * @private
     */
    _evaluatePCSK9Eligibility(patientData, riskCategory, currentTherapy) {
        try {
            // Default to not eligible
            const result = {
                eligible: false,
                criteria: {
                    met: [],
                    notMet: [...this.bcPCSK9Criteria.baseRequirements],
                    additionalNotMet: [...this.bcPCSK9Criteria.additionalRequirements],
                    exclusionCriteria: [],
                    specialConsiderations: []
                },
                recommendations: [],
                documentation: {
                    required: [...this.bcPCSK9Criteria.documentationRequired],
                    provided: []
                },
                targetLDL: null,
                alternativeOptions: []
            };
            
            // Validate input data
            if (!patientData) {
                console.warn('No patient data provided for PCSK9 eligibility evaluation');
                result.recommendations.push("Patient data incomplete - unable to fully evaluate eligibility");
                return result;
            }
            
            // Check for exclusion criteria first
            // Age < 18 years
            if (patientData.age && parseFloat(patientData.age) < 18) {
                result.exclusionCriteria.push(this.bcPCSK9Criteria.exclusionCriteria[3]);
                result.eligible = false;
                result.recommendations.push("Patient is under age 18 - not eligible for PCSK9 inhibitor coverage");
                return result;
            }
            
            // Pregnancy or breastfeeding
            if (patientData.pregnancy === true || patientData.breastfeeding === true) {
                result.exclusionCriteria.push(this.bcPCSK9Criteria.exclusionCriteria[1]);
                result.eligible = false;
                result.recommendations.push("PCSK9 inhibitors contraindicated during pregnancy/breastfeeding");
                return result;
            }
            
            // Secondary causes of hyperlipidemia
            const secondaryCauses = this._checkSecondaryDyslipidemiaCauses(patientData);
            if (secondaryCauses.length > 0) {
                result.exclusionCriteria.push(this.bcPCSK9Criteria.exclusionCriteria[2]);
                result.recommendations.push("Treat underlying secondary causes of dyslipidemia first: " + secondaryCauses.join(", "));
                return result;
            }
            
            // No evaluation possible without current therapy information
            if (!currentTherapy) {
                result.recommendations.push("Current therapy information required for complete evaluation");
                return result;
            }
            
            // === BASE REQUIREMENTS ===
            
            // Check for HeFH
            const hasFH = this._hasConfirmedFH(patientData);
            
            // Check for ASCVD
            const hasASCVD = this._hasConfirmedASCVD(patientData);
            
            // Check base requirements
            if (hasFH) {
                const fhRequirement = this.bcPCSK9Criteria.baseRequirements[0];
                result.criteria.met.push(fhRequirement);
                result.criteria.notMet = result.criteria.notMet.filter(item => item !== fhRequirement);
                result.documentation.provided.push("FH diagnosis documentation");
            }
            
            if (hasASCVD) {
                const ascvdRequirement = this.bcPCSK9Criteria.baseRequirements[1];
                result.criteria.met.push(ascvdRequirement);
                result.criteria.notMet = result.criteria.notMet.filter(item => item !== ascvdRequirement);
                result.documentation.provided.push("ASCVD event documentation");
            }
            
            // If neither FH nor ASCVD, not eligible (base requirement not met)
            if (!hasFH && !hasASCVD) {
                result.recommendations.push("Patient does not meet base eligibility criteria (requires FH or ASCVD diagnosis)");
                return result;
            }
            
            // === ADDITIONAL REQUIREMENTS ===
            
            // Check LDL ≥ 1.8 mmol/L despite therapy
            if (patientData.ldl && patientData.ldl >= 1.8) {
                const ldlRequirement = this.bcPCSK9Criteria.additionalRequirements[0];
                result.criteria.met.push(ldlRequirement);
                result.criteria.additionalNotMet = result.criteria.additionalNotMet.filter(item => item !== ldlRequirement);
                result.documentation.provided.push("Current lipid profile");
            } else if (patientData.ldl) {
                result.recommendations.push(`Current LDL-C is ${patientData.ldl} mmol/L, below the required threshold of 1.8 mmol/L for coverage`);
            } else {
                result.recommendations.push("Recent LDL-C measurement required for eligibility assessment");
            }
            
            // Check if on maximally tolerated high-intensity statin therapy for ≥ 3 months
            if (currentTherapy.statinIntensity === 'high') {
                if (patientData.statin_duration && parseFloat(patientData.statin_duration) >= 3) {
                    const statinRequirement = this.bcPCSK9Criteria.additionalRequirements[1];
                    result.criteria.met.push(statinRequirement);
                    result.criteria.additionalNotMet = result.criteria.additionalNotMet.filter(item => item !== statinRequirement);
                    result.documentation.provided.push("High-intensity statin therapy ≥ 3 months");
                } else {
                    result.recommendations.push("High-intensity statin must be used for at least 3 months before PCSK9 inhibitor eligibility");
                }
            } else if (patientData.statin_intolerance === true) {
                // Check for documented statin intolerance
                if (patientData.statin_intolerance_documented === true && patientData.statins_tried && 
                    Array.isArray(patientData.statins_tried) && patientData.statins_tried.length >= 2) {
                    const intoleranceRequirement = this.bcPCSK9Criteria.additionalRequirements[3];
                    result.criteria.met.push(intoleranceRequirement);
                    result.criteria.additionalNotMet = result.criteria.additionalNotMet.filter(item => item !== intoleranceRequirement);
                    result.documentation.provided.push("Documented statin intolerance to multiple statins");
                } else {
                    result.recommendations.push("Documentation of intolerance to at least two different statins required");
                }
            } else {
                result.recommendations.push("Patient must be on high-intensity statin or have documented statin intolerance");
            }
            
            // Check if on ezetimibe for ≥ 3 months
            if (currentTherapy.hasEzetimibe) {
                if (patientData.ezetimibe_duration && parseFloat(patientData.ezetimibe_duration) >= 3) {
                    const ezetimibeRequirement = this.bcPCSK9Criteria.additionalRequirements[2];
                    result.criteria.met.push(ezetimibeRequirement);
                    result.criteria.additionalNotMet = result.criteria.additionalNotMet.filter(item => item !== ezetimibeRequirement);
                    result.documentation.provided.push("Ezetimibe therapy ≥ 3 months");
                } else {
                    result.recommendations.push("Ezetimibe must be used for at least 3 months before PCSK9 inhibitor eligibility");
                }
            } else {
                result.recommendations.push("Patient must be on ezetimibe 10 mg daily in addition to statin therapy");
            }
            
            // === CHECK EXTREME HIGH RISK STATUS ===
            const isExtremeHighRisk = this._isExtremeHighRiskForPCSK9(patientData, currentTherapy);
            if (isExtremeHighRisk.status) {
                result.specialConsiderations.push(`Patient meets criteria for extreme high-risk: ${isExtremeHighRisk.reasons.join(', ')}`);
                result.targetLDL = this.bcPCSK9Criteria.specialPopulations.extremeHighRisk.targetLDL;
            }
            
            // === ELIGIBILITY DETERMINATION ===
            
            // Check if patient meets criteria for coverage
            // Need both a base requirement AND all three additional requirements (or appropriate alternatives)
            const hasBaseRequirement = result.criteria.met.some(criterion => 
                this.bcPCSK9Criteria.baseRequirements.includes(criterion));
            
            const hasAllAdditionalRequirements = result.criteria.additionalNotMet.length === 0;
            
            result.eligible = hasBaseRequirement && (
                // Either all three standard additional requirements
                hasAllAdditionalRequirements || 
                // Or appropriate alternatives (statin intolerance documented + ezetimibe + LDL threshold)
                (result.criteria.met.some(c => c === this.bcPCSK9Criteria.additionalRequirements[3]) && 
                 result.criteria.met.some(c => c === this.bcPCSK9Criteria.additionalRequirements[0]) &&
                 result.criteria.met.some(c => c === this.bcPCSK9Criteria.additionalRequirements[2]))
            );
            
            // Add final recommendations
            if (result.eligible) {
                result.recommendations.push("Patient meets BC PharmaCare Special Authority criteria for PCSK9 inhibitor coverage");
                result.recommendations.push("Complete Special Authority Request Form and submit required documentation");
                
                if (isExtremeHighRisk.status) {
                    result.recommendations.push(`Recommend target LDL-C of ${result.targetLDL} for this extreme high-risk patient`);
                } else {
                    result.recommendations.push("Recommend target LDL-C of <1.8 mmol/L or ≥50% reduction from baseline");
                }
                
                // Add information about renewal criteria
                result.recommendations.push("For renewal, document ≥10% LDL-C reduction after 3 months of therapy");
            } else if (hasBaseRequirement) {
                result.recommendations.push("Patient has qualifying diagnosis but does not meet all criteria for coverage at this time");
                
                if (!result.criteria.met.some(c => c === this.bcPCSK9Criteria.additionalRequirements[0])) {
                    result.recommendations.push("Optimize current therapy to see if LDL-C rises to qualifying threshold of ≥1.8 mmol/L");
                }
                
                this._addAlternativeLipidOptions(result, currentTherapy, patientData);
            } else {
                result.recommendations.push("Patient does not qualify for PCSK9 inhibitor coverage under BC PharmaCare criteria");
                this._addAlternativeLipidOptions(result, currentTherapy, patientData);
            }
            
            return result;
            
        } catch (error) {
            console.error('Error evaluating PCSK9 eligibility:', error);
            return {
                eligible: false,
                error: error.message,
                recommendations: ["An error occurred during eligibility evaluation. Please review patient data manually."]
            };
        }
    }
    
    /**
     * Checks if patient has confirmed familial hypercholesterolemia
     * @param {Object} patientData - Patient clinical data
     * @returns {boolean} Whether patient has confirmed FH
     * @private
     */
    _hasConfirmedFH(patientData) {
        // Check for FH diagnosis
        const hasFHDiagnosis = patientData.medicalConditions && 
                              (patientData.medicalConditions.includes('familial_hypercholesterolemia') || 
                               patientData.familial_hypercholesterolemia === true);
        
        // Check for genetic testing confirmation
        const hasGeneticConfirmation = patientData.fh_genetic_testing === true;
        
        // Check for clinical criteria confirmation (Dutch Lipid Clinic Network Score ≥ 6)
        const hasClinicalConfirmation = patientData.dlcn_score && patientData.dlcn_score >= 6;
        
        // Check for very high LDL-C (males >5.0 mmol/L, females >4.5 mmol/L) with family history
        const hasVeryHighLDL = patientData.ldl && 
                             ((patientData.sex === 'male' && patientData.ldl > 5.0) || 
                              (patientData.sex === 'female' && patientData.ldl > 4.5));
        
        const hasFHFamilyHistory = patientData.fh_family_history === true;
        
        // Check specific FH genes if available
        const hasFHGene = patientData.fh_gene && 
                        ['LDLR', 'APOB', 'PCSK9'].includes(patientData.fh_gene);
        
        return hasFHDiagnosis && (hasGeneticConfirmation || hasClinicalConfirmation || 
                                (hasVeryHighLDL && hasFHFamilyHistory) || hasFHGene);
    }
    
    /**
     * Checks if patient has confirmed atherosclerotic cardiovascular disease
     * @param {Object} patientData - Patient clinical data
     * @returns {boolean} Whether patient has confirmed ASCVD
     * @private
     */
    _hasConfirmedASCVD(patientData) {
        // Define ASCVD conditions per BC PharmaCare Special Authority criteria
        const ascvdConditions = [
            'prev_mi', 'myocardial_infarction', 'acute_coronary_syndrome',
            'stroke', 'tia', 'transient_ischemic_attack',
            'pvd', 'peripheral_arterial_disease', 'peripheral_vascular_disease',
            'coronary_revascularization', 'pci', 'cabg',
            'carotid_stenosis', 'symptomatic_carotid_disease',
            'previous_cardiovascular_event', 'ascvd'
        ];
        
        // Check for any ASCVD condition
        return ascvdConditions.some(condition => {
            return patientData.medicalConditions && 
                  (patientData.medicalConditions.includes(condition) || 
                   patientData[condition] === true);
        });
    }
    
    /**
     * Checks for secondary causes of dyslipidemia
     * @param {Object} patientData - Patient clinical data
     * @returns {Array} Array of secondary causes found
     * @private
     */
    _checkSecondaryDyslipidemiaCauses(patientData) {
        const secondaryCauses = [];
        
        // Check for untreated hypothyroidism
        if (patientData.hypothyroidism === true && patientData.treated_hypothyroidism !== true) {
            secondaryCauses.push("Untreated hypothyroidism");
        }
        
        // Check for uncontrolled diabetes
        if (patientData.diabetes === true && 
            patientData.hba1c && parseFloat(patientData.hba1c) > 8.5) {
            secondaryCauses.push("Uncontrolled diabetes");
        }
        
        // Check for obstructive liver disease
        if (patientData.obstructive_liver_disease === true || 
            patientData.cholestatic_liver_disease === true) {
            secondaryCauses.push("Obstructive liver disease");
        }
        
        // Check for nephrotic syndrome
        if (patientData.nephrotic_syndrome === true) {
            secondaryCauses.push("Nephrotic syndrome");
        }
        
        // Check for medications that cause dyslipidemia
        const dyslipidemiaInducingMeds = [
            'corticosteroids', 'anabolic_steroids', 'cyclosporine',
            'antiretrovirals', 'second_generation_antipsychotics'
        ];
        
        if (patientData.medications) {
            dyslipidemiaInducingMeds.forEach(med => {
                if (patientData.medications.includes(med)) {
                    secondaryCauses.push(`Medication-induced (${med.replace('_', ' ')})`);
                }
            });
        }
        
        return secondaryCauses;
    }
    
    /**
     * Checks if patient meets extreme high-risk criteria for PCSK9 inhibitor use
     * @param {Object} patientData - Patient clinical data
     * @param {Object} currentTherapy - Current therapy evaluation
     * @returns {Object} Whether patient is extreme high-risk and reasons
     * @private
     */
    _isExtremeHighRiskForPCSK9(patientData, currentTherapy) {
        const result = {
            status: false,
            reasons: []
        };
        
        // Recent ACS or MI (within 12 months)
        if (patientData.recent_acs === true || patientData.recent_mi === true || 
           (patientData.acs_date && this._isWithinMonths(patientData.acs_date, 12)) ||
           (patientData.mi_date && this._isWithinMonths(patientData.mi_date, 12))) {
            result.status = true;
            result.reasons.push("Recent ACS/MI within 12 months");
        }
        
        // Recurrent cardiovascular events despite optimal therapy
        if (patientData.recurrent_cv_events === true || patientData.recurrent_acs === true) {
            result.status = true;
            result.reasons.push("Recurrent CV events despite therapy");
        }
        
        // Polyvascular disease
        const vascularBeds = {
            coronary: ['coronary_artery_disease', 'prev_mi', 'acute_coronary_syndrome', 'myocardial_infarction'],
            cerebral: ['stroke', 'tia', 'carotid_stenosis', 'cerebrovascular_disease'],
            peripheral: ['pvd', 'peripheral_arterial_disease', 'peripheral_vascular_disease']
        };
        
        let affectedBeds = 0;
        for (const bed in vascularBeds) {
            if (vascularBeds[bed].some(condition => {
                return patientData.medicalConditions && 
                      (patientData.medicalConditions.includes(condition) || patientData[condition] === true);
            })) {
                affectedBeds++;
            }
        }
        
        if (affectedBeds >= 2) {
            result.status = true;
            result.reasons.push("Polyvascular disease (≥2 vascular beds)");
        }
        
        // ASCVD with diabetes
        const hasASCVD = this._hasConfirmedASCVD(patientData);
        const hasDiabetes = patientData.diabetes === true || patientData.diabetes === 'yes';
        
        if (hasASCVD && hasDiabetes) {
            result.status = true;
            result.reasons.push("ASCVD with diabetes");
        }
        
        // ASCVD with CKD
        const hasCKD = patientData.medicalConditions && 
                     (patientData.medicalConditions.includes('ckd') || 
                      patientData.chronic_kidney_disease === true);
        
        if (hasASCVD && hasCKD) {
            result.status = true;
            result.reasons.push("ASCVD with chronic kidney disease");
        }
        
        // ASCVD with FH
        const hasFH = this._hasConfirmedFH(patientData);
        
        if (hasASCVD && hasFH) {
            result.status = true;
            result.reasons.push("ASCVD with familial hypercholesterolemia");
        }
        
        return result;
    }
    
    /**
     * Checks if a date is within specified months from now
     * @param {string} dateString - Date string to check
     * @param {number} months - Number of months
     * @returns {boolean} Whether the date is within specified months
     * @private
     */
    _isWithinMonths(dateString, months) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            
            // Calculate the difference in months
            const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + 
                             (now.getMonth() - date.getMonth());
            
            return diffMonths <= months;
        } catch (error) {
            console.warn('Error checking date:', error);
            return false;
        }
    }
    
    /**
     * Adds alternative lipid-lowering options to the result
     * @param {Object} result - Eligibility result object
     * @param {Object} currentTherapy - Current therapy evaluation
     * @param {Object} patientData - Patient clinical data
     * @private
     */
    _addAlternativeLipidOptions(result, currentTherapy, patientData) {
        // If not on high-intensity statin, suggest that first
        if (!currentTherapy || currentTherapy.statinIntensity !== 'high') {
            result.alternativeOptions.push(
                "Optimize statin therapy to high-intensity if tolerated"
            );
        }
        
        // If not on ezetimibe, suggest adding it
        if (!currentTherapy || !currentTherapy.hasEzetimibe) {
            result.alternativeOptions.push(
                "Add ezetimibe 10 mg daily to current statin therapy"
            );
        }
        
        // Suggest other non-PCSK9 options
        result.alternativeOptions.push(
            "Consider bempedoic acid if eligible (not covered by BC PharmaCare)"
        );
        
        // Suggest bile acid sequestrants if appropriate
        if (patientData.triglycerides && parseFloat(patientData.triglycerides) < 3.0) {
            result.alternativeOptions.push(
                "Consider bile acid sequestrants if triglycerides remain < 3.0 mmol/L"
            );
        }
        
        // Suggest lifestyle optimization
        result.alternativeOptions.push(
            "Optimize lifestyle interventions (Mediterranean diet, increased physical activity, weight management)"
        );
        
        return result;
    }
    
    /**
     * Calculates the estimated LDL reduction based on current therapy regimen
     * @param {Object} currentTherapy - Current therapy details
     * @returns {number} Percentage reduction as a decimal
     * @private
     */
    _calculateEstimatedLDLReduction(currentTherapy) {
        let totalReduction = 0;
        
        // Apply statin reduction based on intensity
        if (currentTherapy.statinIntensity === 'high') {
            totalReduction = 0.50; // 50% reduction
        } else if (currentTherapy.statinIntensity === 'moderate') {
            totalReduction = 0.35; // 35% reduction
        } else if (currentTherapy.statinIntensity === 'low') {
            totalReduction = 0.20; // 20% reduction
        }
        
        // Add ezetimibe effect (additional 24% of remaining LDL)
        if (currentTherapy.hasEzetimibe) {
            const remainingLDL = 1 - totalReduction;
            const ezetimibeReduction = remainingLDL * 0.24;
            totalReduction += ezetimibeReduction;
        }
        
        // Add PCSK9 inhibitor effect (additional 60% of remaining LDL)
        if (currentTherapy.hasPCSK9) {
            const remainingLDL = 1 - totalReduction;
            const pcsk9Reduction = remainingLDL * 0.60;
            totalReduction += pcsk9Reduction;
        }
        
        // Add bempedoic acid effect if present (additional 18% of remaining LDL)
        if (currentTherapy.hasBempedoicAcid) {
            const remainingLDL = 1 - totalReduction;
            const bempedoicAcidReduction = remainingLDL * 0.18;
            totalReduction += bempedoicAcidReduction;
        }
        
        // Add bile acid sequestrant effect if present (additional 15-30% of remaining LDL)
        if (currentTherapy.hasBileAcidSequestrant) {
            const remainingLDL = 1 - totalReduction;
            const sequestrantReduction = remainingLDL * 0.20; // Use 20% as an average
            totalReduction += sequestrantReduction;
        }
        
        return Math.min(totalReduction, 0.90); // Cap at 90% as maximum plausible reduction
    }
        
    
    /**
     * Checks if lipid targets are met
     * @param {Object} patientData - Patient clinical data
     * @param {Object} targets - Lipid targets
     * @returns {Object} Assessment of whether targets are met
     * @private
     */
    _areTargetsMet(patientData, targets) {
        const result = {
            ldl: false,
            nonHdl: false,
            apoB: false,
            overall: false
        };
        
        // Check LDL target
        if (patientData.ldl !== null && patientData.ldl !== undefined && targets.ldl) {
            result.ldl = patientData.ldl <= targets.ldl;
        }
        
        // Check non-HDL target
        let nonHdl = patientData.nonHdl;
        if (nonHdl === null || nonHdl === undefined) {
            nonHdl = this._calculateNonHDL(patientData);
        }
        
        if (nonHdl !== null && nonHdl !== undefined && targets.nonHdl) {
            result.nonHdl = nonHdl <= targets.nonHdl;
        }
        
        // Check apoB target
        if (patientData.apoB !== null && patientData.apoB !== undefined && targets.apoB) {
            result.apoB = patientData.apoB <= targets.apoB;
        }
        
        // Overall assessment - requires at least one target to be assessed
        const assessedTargets = [result.ldl, result.nonHdl, result.apoB].filter(target => target !== null);
        if (assessedTargets.length > 0) {
            // If primary target (LDL) is met or at least half of the assessed targets are met
            result.overall = result.ldl || 
                            (assessedTargets.filter(target => target === true).length / assessedTargets.length >= 0.5);
        }
        
        return result;
    }
    
    /**
     * Calculates non-HDL cholesterol if not provided
     * @param {Object} patientData - Patient clinical data
     * @returns {number|null} Calculated non-HDL or null if cannot calculate
     * @private
     */
    _calculateNonHDL(patientData) {
        if (patientData.totalChol !== null && patientData.totalChol !== undefined && 
            patientData.hdl !== null && patientData.hdl !== undefined) {
            return patientData.totalChol - patientData.hdl;
        }
        return null;
    }
    
    /**
     * Gets medication category
     * @param {string} medication - Medication name
     * @returns {string} Category
     * @private
     */
    _getMedicationCategory(medication) {
        const med = medication.toLowerCase();
        
        // Check all medication categories
        for (const intensity in this.medications.statins) {
            if (this.medications.statins[intensity].some(statin => med.includes(statin.toLowerCase()))) {
                return 'statin';
            }
        }
        
        for (const category in this.medications.nonStatins) {
            if (this.medications.nonStatins[category].some(drug => med.includes(drug.toLowerCase()))) {
                return category;
            }
        }
        
        return 'none';
    }
    
    /**
     * Gets statin intensity
     * @param {string} statin - Statin name
     * @returns {string} Intensity (low, moderate, high, or none)
     * @private
     */
    _getStatinIntensity(statin) {
        const med = statin.toLowerCase();
        
        // Check each intensity level
        for (const intensity in this.medications.statins) {
            if (this.medications.statins[intensity].some(s => med.includes(s.toLowerCase()))) {
                return intensity.replace('Intensity', '');
            }
        }
        
        return 'none';
    }
    
    /**
     * Estimates LDL reduction based on therapy
     * @param {string} statinIntensity - Statin intensity
     * @param {boolean} hasEzetimibe - Whether patient is on ezetimibe
     * @param {boolean} hasPCSK9 - Whether patient is on PCSK9 inhibitor
     * @param {Array} otherTherapies - Other lipid-lowering therapies
     * @returns {number} Estimated LDL reduction as a decimal
     * @private
     */
    _estimateLDLReduction(statinIntensity, hasEzetimibe, hasPCSK9, otherTherapies) {
        // Initial LDL reduction based on statin intensity
        let ldlRemaining = 1.0; // 100% of baseline LDL
        
        // Statin reduction (approximate based on clinical data)
        if (statinIntensity === 'low') {
            // ~20% reduction from statin
            ldlRemaining *= 0.80; // 80% of LDL remains
        } else if (statinIntensity === 'moderate') {
            // ~35% reduction from statin
            ldlRemaining *= 0.65; // 65% of LDL remains
        } else if (statinIntensity === 'high') {
            // ~50% reduction from statin
            ldlRemaining *= 0.50; // 50% of LDL remains
        }
        
        // Ezetimibe adds ~24% reduction to remaining LDL
        if (hasEzetimibe) {
            ldlRemaining *= 0.76; // 76% of remaining LDL remains after ezetimibe
        }
        
        // PCSK9 inhibitors add ~60% reduction to remaining LDL
        if (hasPCSK9) {
            ldlRemaining *= 0.40; // 40% of remaining LDL remains after PCSK9 inhibitor
        }
        
        // Other therapies
        if (otherTherapies && otherTherapies.length > 0) {
            for (const therapy of otherTherapies) {
                const therapyLower = therapy.toLowerCase();
                
                // Apply reductions for each additional therapy
                if (therapyLower.includes('bempedoic')) {
                    // Bempedoic acid: ~18% additional reduction of remaining LDL
                    ldlRemaining *= 0.82;
                } else if (therapyLower.includes('colesevelam') || 
                          therapyLower.includes('colestipol') || 
                          therapyLower.includes('cholestyramine')) {
                    // Bile acid sequestrants: ~15-20% additional reduction of remaining LDL
                    ldlRemaining *= 0.82;
                } else if (therapyLower.includes('niacin')) {
                    // Niacin: ~15-20% additional reduction of remaining LDL
                    ldlRemaining *= 0.83;
                } else if (therapyLower.includes('fibrate')) {
                    // Fibrates: ~5-10% additional reduction of remaining LDL in some patients
                    ldlRemaining *= 0.93;
                }
            }
        }
        
        // Calculate total reduction from remaining
        const totalReduction = 1 - ldlRemaining;
        
        // Cap at 90% reduction as a reasonable physiological maximum
        return Math.min(totalReduction, 0.90);
    }number} Estimated LDL reduction as a decimal
     * @private
     */
    _estimateLDLReduction(statinIntensity, hasEzetimibe, hasPCSK9, otherTherapies) {
        let reduction = 0;
        
        // Statin reduction (approximate based on clinical data)
        if (statinIntensity === 'low') {
            reduction = 0.20; // ~20% reduction
        } else if (statinIntensity === 'moderate') {
            reduction = 0.35; // ~35% reduction
        } else if (statinIntensity === 'high') {
            reduction = 0.50; // ~50% reduction
        }
        
        // Ezetimibe adds ~18% reduction to statin therapy
        if (hasEzetimibe) {
            // Apply additional reduction to remaining LDL
            reduction = reduction + (1 - reduction) * 0.18;
        }
        
        // PCSK9 inhibitors add ~60% reduction to existing therapy
        if (hasPCSK9) {
            // Apply additional reduction to remaining LDL
            reduction = reduction + (1 - reduction) * 0.60;
        }
        
        // Other therapies
        if (otherTherapies && otherTherapies.length > 0) {
            otherTherapies.forEach(therapy => {
                const therapyLower = therapy.toLowerCase();
                
                // Apply reductions for each additional therapy
                if (therapyLower.includes('bempedoic')) {
                    reduction = reduction + (1 - reduction) * 0.18; // ~18% additional
                } else if (therapyLower.includes('colesevelam') || 
                          therapyLower.includes('colestipol') || 
                          therapyLower.includes('cholestyramine')) {
                    reduction = reduction + (1 - reduction) * 0.15; // ~15% additional
                } else if (therapyLower.includes('niacin')) {
                    reduction = reduction + (1 - reduction) * 0.15; // ~15% additional
                }
            });
        }
        
        return Math.min(reduction, 0.90); // Cap at 90% reduction as a reasonable maximum
    }
}

export default new MedicationEvaluator();
