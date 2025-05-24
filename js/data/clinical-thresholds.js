/**
 * Clinical Thresholds Service Module
 * @file /js/data/clinical-thresholds.js
 * @description Provides a safe and robust interface to access standardized clinical
 * thresholds and reference ranges. Includes an accessor function to handle
 * potential missing values gracefully.
 * @version 1.2.0
 * @exports ClinicalThresholdsService
 */

'use strict';

// --- Core Data (Kept Immutable) ---
const THRESHOLDS_DATA = Object.freeze({
    VERSION: "1.2.0",
    DATE_MODIFIED: "2025-05-22",
    SOURCE_INFO: "Based on general clinical guidelines (e.g., CCS, AHA/ACC); requires site-specific validation.",

    // --- Physiological Limits ---
    AGE: { MIN: 18, MAX: 120, DEFAULT: 55 },
    HEIGHT: { MIN_CM: 50, MAX_CM: 250, DEFAULT_CM: 170 },
    WEIGHT: { MIN_KG: 10, MAX_KG: 500, DEFAULT_KG: 75 },
    BMI: { MIN: 10, MAX: 70, UNDERWEIGHT: 18.5, NORMAL_MIN: 18.5, NORMAL_MAX: 24.9, OVERWEIGHT_MIN: 25, OVERWEIGHT_MAX: 29.9, OBESE_1: 30 },

    // --- Blood Pressure (mmHg) ---
    SBP: { MIN: 50, MAX: 300, OPTIMAL: 120, ELEVATED: 129, HYPERTENSION_1: 139, HYPERTENSION_2: 140, HYPERTENSIVE_CRISIS: 180 },
    DBP: { MIN: 30, MAX: 200, OPTIMAL: 80, ELEVATED: 80, HYPERTENSION_1: 89, HYPERTENSION_2: 90, HYPERTENSIVE_CRISIS: 120 },
    BP_TARGETS: {
        GENERAL: { SBP: 140, DBP: 90 },
        DIABETES: { SBP: 130, DBP: 80 },
        HIGH_RISK: { SBP: 130, DBP: 80 },
    },
    SBP_SD_HIGH_RISK: 10,

    // --- Lipids ---
    CONVERSION_FACTORS: {
        TC_HDL_LDL: 0.02586, // To convert mg/dL to mmol/L
        TRIGLYCERIDES: 0.01129, // To convert mg/dL to mmol/L
    },
    TOTAL_CHOLESTEROL: {
        DESIRABLE_MMOL: 5.2, BORDERLINE_MMOL: 6.2, HIGH_MMOL: 6.2,
        DESIRABLE_MG: 200, BORDERLINE_MG: 239, HIGH_MG: 240,
    },
    HDL: {
        LOW_MMOL_MALE: 1.0, LOW_MMOL_FEMALE: 1.3, HIGH_MMOL: 1.6,
        LOW_MG_MALE: 40, LOW_MG_FEMALE: 50, HIGH_MG: 60,
    },
    LDL: {
        OPTIMAL_MMOL: 2.6, NEAR_OPTIMAL_MMOL: 3.3, BORDERLINE_MMOL: 4.1, HIGH_MMOL: 4.9,
        OPTIMAL_MG: 100, NEAR_OPTIMAL_MG: 129, BORDERLINE_MG: 159, HIGH_MG: 190,
        LDL_TARGET_HIGH_RISK_MMOL: 1.8,
        LDL_TARGET_MODERATE_RISK_MMOL: 2.6,
    },
    TRIGLYCERIDES: {
        NORMAL_MMOL: 1.7, BORDERLINE_MMOL: 2.2, HIGH_MMOL: 5.6,
        NORMAL_MG: 150, BORDERLINE_MG: 199, HIGH_MG: 500,
    },
    NON_HDL: {
        OPTIMAL_MMOL: 3.3, BORDERLINE_MMOL: 4.1, HIGH_MMOL: 4.9,
        OPTIMAL_MG: 130, BORDERLINE_MG: 159, HIGH_MG: 190,
    },
    LPA: {
        HIGH_RISK_NMOL: 125,
        HIGH_RISK_MG: 50,
    },
    TC_HDL_RATIO: {
        OPTIMAL: 3.5, ACCEPTABLE: 5.0, HIGH_RISK: 6.0
    },

    // --- Risk Score Categories (10-Year Risk %) ---
    CVD_RISK_CATEGORY: {
        LOW_THRESHOLD: 10.0,
        INTERMEDIATE_THRESHOLD: 20.0,
        HIGH_THRESHOLD: 20.0,
    },

    // --- Diabetes Related ---
    HBA1C: {
        NORMAL: 6.0, PREDIABETES_MIN: 6.0, PREDIABETES_MAX: 6.4, DIABETES: 6.5,
        TARGET_GENERAL: 7.0, TARGET_TIGHT: 6.5,
    },
    FASTING_GLUCOSE: {
        NORMAL_MMOL: 5.6, PREDIABETES_MIN_MMOL: 5.6, PREDIABETES_MAX_MMOL: 6.9, DIABETES_MMOL: 7.0,
    },

    // --- Kidney Function ---
    EGFR: { NORMAL: 90, CKD_G2: 60, CKD_G3a: 45, CKD_G3b: 30, CKD_G4: 15, CKD_G5: 0 },
    ACR: { NORMAL: 2.0, MICROALBUMINURIA: 20.0, MACROALBUMINURIA: 20.0 },
});

// --- Service Class (Provides Safe Access) ---
class ClinicalThresholdsService {
    constructor() {
        if (ClinicalThresholdsService.instance) {
            return ClinicalThresholdsService.instance;
        }
        this.thresholds = THRESHOLDS_DATA;
        ClinicalThresholdsService.instance = this;
    }

    /**
     * Safely retrieves a threshold value using a dot-notation path.
     * This is the core enhancement for robustness. It prevents errors when a
     * module requests a threshold that doesn't exist or is nested.
     *
     * @param {string} path - The dot-notation path (e.g., 'SBP.OPTIMAL', 'LDL.LDL_TARGET_HIGH_RISK_MMOL').
     * @param {*} [defaultValue=undefined] - The value to return if the path is not found.
     * @returns {*} The threshold value or the default value.
     *
     * @example
     * const optimalSbp = ClinicalThresholds.get('SBP.OPTIMAL', 120);
     * const nonExistent = ClinicalThresholds.get('SOME.NON_EXISTENT_VALUE'); // Returns undefined
     * const nonExistentWithDefault = ClinicalThresholds.get('SOME.NON_EXISTENT_VALUE', 'N/A'); // Returns 'N/A'
     */
    get(path, defaultValue = undefined) {
        if (!path || typeof path !== 'string') {
            console.warn(`ClinicalThresholdsService: Invalid path provided: ${path}`);
            return defaultValue;
        }

        const keys = path.split('.');
        let current = this.thresholds;

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (current === null || typeof current !== 'object' || !current.hasOwnProperty(key)) {
                console.warn(`ClinicalThresholdsService: Path not found: ${path}. Returning default.`);
                return defaultValue;
            }
            current = current[key];
        }

        return current;
    }

    /**
     * Returns the entire (frozen) thresholds object.
     * Use with caution; prefer the `get` method for safety.
     * @returns {object} The complete, immutable thresholds data object.
     */
    getAll() {
        return this.thresholds;
    }

    /**
     * Returns the conversion factor for a given unit type.
     * @param {'TC_HDL_LDL' | 'TRIGLYCERIDES'} type - The type of lipid.
     * @returns {number|undefined} The conversion factor or undefined if not found.
     */
    getConversionFactor(type) {
        return this.get(`CONVERSION_FACTORS.${type}`);
    }
}

// Instantiate and export the singleton service
const ClinicalThresholds = new ClinicalThresholdsService();

// Optional: Make it globally accessible (though ES modules are preferred)
// window.ClinicalThresholds = ClinicalThresholds;

// Use this line if using ES modules natively or with a bundler
// export default ClinicalThresholds;