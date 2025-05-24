/**
 * Unit Converter Service Module
 * @file /js/utils/unit-converter.js
 * @description Provides robust and accurate unit conversions for clinical and
 * anthropometric measurements used in the CVD Risk Toolkit.
 * @version 1.1.0
 * @exports UnitConverterService
 */

'use strict';

// Import custom error types if they are to be used for specific conversion errors.
// For now, basic error handling will be used.
// import { ApplicationError } from './error-types.js';

class UnitConverterService {
    /**
     * Conversion factors.
     * These are standard factors. For lipids, factors can vary slightly based on molar mass assumptions,
     * but these are widely accepted for clinical use.
     * @readonly
     */
    static CONVERSION_FACTORS = Object.freeze({
        CHOLESTEROL_MG_DL_TO_MMOL_L: 0.02586, // For TC, HDL, LDL, Non-HDL
        CHOLESTEROL_MMOL_L_TO_MG_DL: 38.67,   // 1 / 0.02586

        TRIGLYCERIDES_MG_DL_TO_MMOL_L: 0.01129,
        TRIGLYCERIDES_MMOL_L_TO_MG_DL: 88.57,  // 1 / 0.01129

        GLUCOSE_MG_DL_TO_MMOL_L: 0.0555,
        GLUCOSE_MMOL_L_TO_MG_DL: 18.018,    // 1 / 0.0555

        CREATININE_MG_DL_TO_UMOL_L: 88.4,
        CREATININE_UMOL_L_TO_MG_DL: 0.0113,  // 1 / 88.4

        LPA_MG_DL_TO_NMOL_L: 2.15, // Approximate, can vary by assay and particle size. Common clinical average.
        LPA_NMOL_L_TO_MG_DL: 0.465, // 1 / 2.15

        APOB_MG_DL_TO_G_L: 0.01,
        APOB_G_L_TO_MG_DL: 100,

        HBA1C_PERCENT_TO_MMOL_MOL: (percent) => (percent - 2.15) * 10.929,
        HBA1C_MMOL_MOL_TO_PERCENT: (mmol_mol) => (mmol_mol / 10.929) + 2.15,

        HEIGHT_IN_TO_CM: 2.54,
        HEIGHT_CM_TO_IN: 1 / 2.54,
        HEIGHT_FT_TO_CM: 30.48,

        WEIGHT_LB_TO_KG: 0.45359237,
        WEIGHT_KG_TO_LB: 1 / 0.45359237,
    });

    /**
     * Supported unit types for clarity.
     * @readonly
     * @enum {string}
     */
    static UNIT_TYPES = Object.freeze({
        CHOLESTEROL: 'cholesterol', // TC, HDL, LDL, Non-HDL
        TRIGLYCERIDES: 'triglycerides',
        GLUCOSE: 'glucose',
        CREATININE: 'creatinine',
        LPA: 'lpa',
        APOB: 'apob',
        HBA1C: 'hba1c',
        HEIGHT: 'height',
        WEIGHT: 'weight',
    });

    /**
     * Creates an instance of UnitConverterService.
     * @param {object} [options={}] - Configuration options.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     * Expected: ErrorLogger (optional).
     */
    constructor(options = {}) {
        if (UnitConverterService.instance) {
            return UnitConverterService.instance;
        }

        this.dependencies = {
            ErrorLogger: options.dependencies?.ErrorLogger || window.ErrorDetectionSystemInstance || console,
            ...options.dependencies,
        };
        this._log('info', 'UnitConverterService Initialized (v1.1.0).');
        UnitConverterService.instance = this;
    }

    _log(level, message, data) {
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `UnitConverter: ${message}`;
        if (logger?.log && typeof logger.log === 'function') {
            logger.log(level, logMessage, data);
        } else {
            console[level]?.(logMessage, data);
        }
    }

    /**
     * Generic conversion function.
     * @param {number} value - The numeric value to convert.
     * @param {string} fromUnit - The unit to convert from (e.g., 'mg/dL', 'cm', 'lb'). Case-insensitive.
     * @param {string} toUnit - The unit to convert to (e.g., 'mmol/L', 'in', 'kg'). Case-insensitive.
     * @param {UnitConverterService.UNIT_TYPES} measurementType - The type of measurement.
     * @returns {{value: number|null, unit: string|null, error: string|null}} Result object.
     */
    convert(value, fromUnit, toUnit, measurementType) {
        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) {
            return { value: null, unit: null, error: 'Invalid input value: Not a number.' };
        }

        const from = String(fromUnit).toLowerCase();
        const to = String(toUnit).toLowerCase();
        const type = String(measurementType).toLowerCase();

        if (from === to) {
            return { value: numericValue, unit: toUnit, error: null };
        }

        let convertedValue = null;
        const F = UnitConverterService.CONVERSION_FACTORS;

        try {
            switch (type) {
                case UnitConverterService.UNIT_TYPES.CHOLESTEROL:
                    if (from === 'mg/dl' && to === 'mmol/l') convertedValue = numericValue * F.CHOLESTEROL_MG_DL_TO_MMOL_L;
                    else if (from === 'mmol/l' && to === 'mg/dl') convertedValue = numericValue * F.CHOLESTEROL_MMOL_L_TO_MG_DL;
                    break;
                case UnitConverterService.UNIT_TYPES.TRIGLYCERIDES:
                    if (from === 'mg/dl' && to === 'mmol/l') convertedValue = numericValue * F.TRIGLYCERIDES_MG_DL_TO_MMOL_L;
                    else if (from === 'mmol/l' && to === 'mg/dl') convertedValue = numericValue * F.TRIGLYCERIDES_MMOL_L_TO_MG_DL;
                    break;
                case UnitConverterService.UNIT_TYPES.GLUCOSE:
                    if (from === 'mg/dl' && to === 'mmol/l') convertedValue = numericValue * F.GLUCOSE_MG_DL_TO_MMOL_L;
                    else if (from === 'mmol/l' && to === 'mg/dl') convertedValue = numericValue * F.GLUCOSE_MMOL_L_TO_MG_DL;
                    break;
                case UnitConverterService.UNIT_TYPES.CREATININE:
                    if (from === 'mg/dl' && to === 'umol/l') convertedValue = numericValue * F.CREATININE_MG_DL_TO_UMOL_L;
                    else if (from === 'umol/l' && to === 'mg/dl') convertedValue = numericValue * F.CREATININE_UMOL_L_TO_MG_DL;
                    break;
                case UnitConverterService.UNIT_TYPES.LPA:
                    if (from === 'mg/dl' && to === 'nmol/l') convertedValue = numericValue * F.LPA_MG_DL_TO_NMOL_L;
                    else if (from === 'nmol/l' && to === 'mg/dl') convertedValue = numericValue * F.LPA_NMOL_L_TO_MG_DL;
                    break;
                case UnitConverterService.UNIT_TYPES.APOB:
                    if (from === 'mg/dl' && to === 'g/l') convertedValue = numericValue * F.APOB_MG_DL_TO_G_L;
                    else if (from === 'g/l' && to === 'mg/dl') convertedValue = numericValue * F.APOB_G_L_TO_MG_DL;
                    break;
                case UnitConverterService.UNIT_TYPES.HBA1C:
                    if (from === '%' && to === 'mmol/mol') convertedValue = F.HBA1C_PERCENT_TO_MMOL_MOL(numericValue);
                    else if (from === 'mmol/mol' && to === '%') convertedValue = F.HBA1C_MMOL_MOL_TO_PERCENT(numericValue);
                    break;
                case UnitConverterService.UNIT_TYPES.HEIGHT:
                    if (from === 'in' && to === 'cm') convertedValue = numericValue * F.HEIGHT_IN_TO_CM;
                    else if (from === 'cm' && to === 'in') convertedValue = numericValue * F.HEIGHT_CM_TO_IN;
                    else if (from === 'ft' && to === 'cm') convertedValue = numericValue * F.HEIGHT_FT_TO_CM;
                    // Add ft to in, cm to ft etc. if needed
                    break;
                case UnitConverterService.UNIT_TYPES.WEIGHT:
                    if (from === 'lb' && to === 'kg') convertedValue = numericValue * F.WEIGHT_LB_TO_KG;
                    else if (from === 'kg' && to === 'lb') convertedValue = numericValue * F.WEIGHT_KG_TO_LB;
                    break;
                default:
                    return { value: null, unit: null, error: `Unsupported measurement type: ${measurementType}` };
            }

            if (convertedValue === null || isNaN(convertedValue)) {
                 return { value: null, unit: null, error: `Conversion failed for ${measurementType} from ${fromUnit} to ${toUnit}. Units may be incompatible or not supported for this type.` };
            }

            // Round to a reasonable number of decimal places
            // This can be made more sophisticated based on measurement type
            let decimals = 2;
            if (type === UnitConverterService.UNIT_TYPES.CHOLESTEROL && to === 'mmol/l') decimals = 2;
            else if (type === UnitConverterService.UNIT_TYPES.CHOLESTEROL && to === 'mg/dl') decimals = 0;
            else if (type === UnitConverterService.UNIT_TYPES.TRIGLYCERIDES && to === 'mmol/l') decimals = 2;
            else if (type === UnitConverterService.UNIT_TYPES.TRIGLYCERIDES && to === 'mg/dl') decimals = 0;
            else if (type === UnitConverterService.UNIT_TYPES.LPA && to === 'nmol/l') decimals = 0;
            else if (type === UnitConverterService.UNIT_TYPES.LPA && to === 'mg/dl') decimals = 1;
            else if (type === UnitConverterService.UNIT_TYPES.HEIGHT && to === 'cm') decimals = 1;
            else if (type === UnitConverterService.UNIT_TYPES.HEIGHT && to === 'in') decimals = 1;
            else if (type === UnitConverterService.UNIT_TYPES.WEIGHT && to === 'kg') decimals = 1;
            else if (type === UnitConverterService.UNIT_TYPES.WEIGHT && to === 'lb') decimals = 1;


            return { value: parseFloat(convertedValue.toFixed(decimals)), unit: toUnit, error: null };

        } catch (e) {
            this._log('error', `Unit conversion error: ${e.message}`, { value, fromUnit, toUnit, measurementType, error: e });
            return { value: null, unit: null, error: e.message || 'An unexpected error occurred during conversion.' };
        }
    }

    /**
     * Converts height from feet and inches to centimeters.
     * @param {number} feet - The feet part of the height.
     * @param {number} [inches=0] - The inches part of the height.
     * @returns {{value: number|null, unit: string|null, error: string|null}}
     */
    convertFeetInchesToCm(feet, inches = 0) {
        const numFeet = parseFloat(feet);
        const numInches = parseFloat(inches);

        if (isNaN(numFeet) || isNaN(numInches)) {
            return { value: null, unit: null, error: 'Invalid input: Feet and inches must be numbers.' };
        }
        if (numFeet < 0 || numInches < 0) {
            return { value: null, unit: null, error: 'Invalid input: Height cannot be negative.' };
        }

        const totalInches = (numFeet * 12) + numInches;
        const cm = totalInches * UnitConverterService.CONVERSION_FACTORS.HEIGHT_IN_TO_CM;
        return { value: parseFloat(cm.toFixed(1)), unit: 'cm', error: null };
    }

    /**
     * Converts centimeters to feet and inches.
     * @param {number} cm - Height in centimeters.
     * @returns {{feet: number|null, inches: number|null, error: string|null}}
     */
    convertCmToFeetInches(cm) {
        const numCm = parseFloat(cm);
        if (isNaN(numCm) || numCm < 0) {
            return { feet: null, inches: null, error: 'Invalid input: Centimeters must be a non-negative number.' };
        }
        const totalInches = numCm * UnitConverterService.CONVERSION_FACTORS.HEIGHT_CM_TO_IN;
        const feet = Math.floor(totalInches / 12);
        const inches = parseFloat((totalInches % 12).toFixed(1));
        return { feet, inches, error: null };
    }

    // --- Specific common conversion methods for convenience ---

    cholesterolMgDlToMmolL(value) { return this.convert(value, 'mg/dL', 'mmol/L', UnitConverterService.UNIT_TYPES.CHOLESTEROL); }
    cholesterolMmolLToMgDl(value) { return this.convert(value, 'mmol/L', 'mg/dL', UnitConverterService.UNIT_TYPES.CHOLESTEROL); }

    triglyceridesMgDlToMmolL(value) { return this.convert(value, 'mg/dL', 'mmol/L', UnitConverterService.UNIT_TYPES.TRIGLYCERIDES); }
    triglyceridesMmolLToMgDl(value) { return this.convert(value, 'mmol/L', 'mg/dL', UnitConverterService.UNIT_TYPES.TRIGLYCERIDES); }

    lpaMgDlToNmolL(value) { return this.convert(value, 'mg/dL', 'nmol/L', UnitConverterService.UNIT_TYPES.LPA); }
    lpaNmolLToMgDl(value) { return this.convert(value, 'nmol/L', 'mg/dL', UnitConverterService.UNIT_TYPES.LPA); }

    apoBMgDlToGL(value) { return this.convert(value, 'mg/dL', 'g/L', UnitConverterService.UNIT_TYPES.APOB); }
    apoBGLToMgDl(value) { return this.convert(value, 'g/L', 'mg/dL', UnitConverterService.UNIT_TYPES.APOB); }

    hba1cPercentToMmolMol(value) { return this.convert(value, '%', 'mmol/mol', UnitConverterService.UNIT_TYPES.HBA1C); }
    hba1cMmolMolToPercent(value) { return this.convert(value, 'mmol/mol', '%', UnitConverterService.UNIT_TYPES.HBA1C); }

    heightInToCm(value) { return this.convert(value, 'in', 'cm', UnitConverterService.UNIT_TYPES.HEIGHT); }
    heightCmToIn(value) { return this.convert(value, 'cm', 'in', UnitConverterService.UNIT_TYPES.HEIGHT); }

    weightLbToKg(value) { return this.convert(value, 'lb', 'kg', UnitConverterService.UNIT_TYPES.WEIGHT); }
    weightKgToLb(value) { return this.convert(value, 'kg', 'lb', UnitConverterService.UNIT_TYPES.WEIGHT); }
}

// Instantiate and export the singleton service
// const UnitConverterInstance = new UnitConverterService();
// window.UnitConverter = UnitConverterInstance; // Optional global access
// export default UnitConverterInstance;
