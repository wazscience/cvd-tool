/**
 * Validation Helpers Service Module (Comprehensive & Enhanced)
 * @file /js/utils/validation-helpers.js
 * @description Provides a robust collection of reusable functions for input validation,
 * data normalization, and related calculations. Fuses logic from various existing
 * validation modules and incorporates calculator-specific contexts (FRS, QRISK3).
 * Enhanced for edge cases, extreme values, and detailed error/warning feedback.
 * @version 2.1.0
 * @exports ValidationHelpersService
 */

'use strict';

// Dependencies are expected to be injected or available on window.
// import ClinicalThresholds from '../data/clinical-thresholds.js';
// import UnitConverterService from './unit-converter.js';
// import InputSanitizerService from './input-sanitizer.js';
// import { LoggingService } from './logging-service.js';
// import { ValidationError } from './error-types.js'; // For throwing specific validation errors

class ValidationHelpersService {
    /**
     * Creates or returns the singleton instance of ValidationHelpersService.
     * @param {object} [options={}] - Configuration options.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (ValidationHelpersService.instance && !options.forceNewInstance) {
            return ValidationHelpersService.instance;
        }

        this.dependencies = {
            ErrorLogger: options.dependencies?.ErrorLogger || window.ErrorDetectionSystemInstance || console,
            ClinicalThresholds: options.dependencies?.ClinicalThresholds || window.ClinicalThresholds,
            UnitConverter: options.dependencies?.UnitConverterService || window.UnitConverterServiceInstance,
            InputSanitizer: options.dependencies?.InputSanitizerService || window.InputSanitizerService,
            // LoggingServiceClass: options.dependencies?.LoggingServiceClass || window.LoggingService, // If logger is to be instantiated here
            ...options.dependencies,
        };

        // Instantiate its own logger if LoggingService class is provided
        // if (this.dependencies.LoggingServiceClass && typeof this.dependencies.LoggingServiceClass === 'function') {
        //     this.logger = new this.dependencies.LoggingServiceClass({ componentName: 'ValidationHelpers' });
        // } else {
             this.logger = this.dependencies.ErrorLogger; // Use ErrorLogger directly for logging
        // }


        if (!this.dependencies.ClinicalThresholds) {
            this._log('critical', 'ClinicalThresholds dependency is missing! Validation ranges will be limited.');
        }
        if (!this.dependencies.UnitConverter) {
            this._log('critical', 'UnitConverterService dependency is missing! Unit-aware validation will be limited.');
        }
        if (!this.dependencies.InputSanitizer) {
            this._log('warn', 'InputSanitizerService dependency is missing! Input sanitization might be less robust.');
        }

        this.patterns = {
            numeric: /^-?\d+(\.\d+)?$/,
            integer: /^-?\d+$/,
            positiveInteger: /^\d+$/,
            positiveNumeric: /^\d*(\.\d+)?$/, // Allows .5, 0.5, 5
            name: /^[a-zA-Z\s'-.]{1,150}$/, // Allow periods in names
            email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, // Simpler, more permissive email regex
            // Add more patterns as needed from validator-extension.js if they become core
        };
        
        // Define default messages
        this.defaultErrorMessages = {
            required: (fieldName) => `${fieldName} is required.`,
            notANumber: (fieldName) => `${fieldName} must be a valid number.`,
            notAnInteger: (fieldName) => `${fieldName} must be a whole number.`,
            outOfRange: (fieldName, min, max, unit) => `${fieldName} must be between ${min}${unit ? ' ' + unit : ''} and ${max}${unit ? ' ' + unit : ''}.`,
            invalidFormat: (fieldName, formatHint) => `Invalid ${fieldName.toLowerCase()} format.${formatHint ? ' ' + formatHint : ''}`,
            invalidOption: (fieldName, options) => `${fieldName} has an invalid selection. Allowed: ${options.join(', ')}.`,
            generic: (fieldName) => `Invalid input for ${fieldName}.`
        };

        ValidationHelpersService.instance = this;
        this._log('info', 'ValidationHelpersService Initialized (v2.1.0).');
    }

    _log(level, message, data) {
        const logMessage = `ValidationHelpers: ${message}`;
        if (this.logger?.log && typeof this.logger.log === 'function') {
            this.logger.log(level, logMessage, data);
        } else if (this.logger?.handleError && (level === 'error' || level === 'critical')) {
            this.logger.handleError(message, 'ValidationHelpers', level, data);
        } else {
            console[level === 'critical' ? 'error' : level]?.(logMessage, data || '');
        }
    }

    _sanitize(value, type = 'string') {
        if (this.dependencies.InputSanitizer?.sanitizeText) { // Check specific method
            if (value === null || value === undefined) return value;
            const strValue = String(value).trim();
            if (type === 'number') {
                return strValue.replace(/[^-0-9.,]/g, '').replace(/,/g, '.'); // Allow comma as decimal, then replace
            }
            return this.dependencies.InputSanitizer.sanitizeText(strValue);
        }
        return (value === null || value === undefined) ? value : String(value).trim(); // Basic trim fallback
    }

    _createReturnObject(isValid, message, value, normalizedValue, warning = null) {
        const result = { isValid, message, value: value }; // Always include original value
        if (normalizedValue !== undefined) result.normalizedValue = normalizedValue;
        if (warning) result.warning = warning;
        return result;
    }

    // --- Basic Validation Methods ---

    isNotEmpty(value, fieldName = 'Field') {
        const sanitizedValue = (typeof value === 'string') ? value.trim() : value;
        const isValid = sanitizedValue !== null && sanitizedValue !== undefined && String(sanitizedValue) !== '';
        return this._createReturnObject(isValid, isValid ? '' : this.defaultErrorMessages.required(fieldName), value, sanitizedValue);
    }

    isNumber(value, fieldName = 'Value') {
        const notEmptyCheck = this.isNotEmpty(value, fieldName);
        if (!notEmptyCheck.isValid && value !== 0 && value !== "0") { // Allow 0 to pass isNotEmpty check here
             return this._createReturnObject(false, this.defaultErrorMessages.required(fieldName), value, null);
        }
        
        const sanitizedStr = this._sanitize(value, 'number');
        if (sanitizedStr === null || sanitizedStr === undefined || String(sanitizedStr).trim() === '') {
             return this._createReturnObject(false, this.defaultErrorMessages.notANumber(fieldName), value, null);
        }

        const num = parseFloat(sanitizedStr);
        const isValid = !isNaN(num) && isFinite(num);
        return this._createReturnObject(isValid, isValid ? '' : this.defaultErrorMessages.notANumber(fieldName), value, isValid ? num : null);
    }

    isInteger(value, fieldName = 'Value') {
        const numCheck = this.isNumber(value, fieldName);
        if (!numCheck.isValid) return numCheck;
        const isValid = Number.isInteger(numCheck.normalizedValue); // Use normalized value
        return this._createReturnObject(isValid, isValid ? '' : this.defaultErrorMessages.notAnInteger(fieldName), value, isValid ? numCheck.normalizedValue : null);
    }

    isInRange(value, min, max, fieldName = 'Value', unit = '', allowZero = false) {
        const numCheck = this.isNumber(value, fieldName);
        if (!numCheck.isValid) {
            // If value is exactly 0 and allowZero is true, and the error was "required", override to valid
            if (allowZero && (value === 0 || value === "0") && numCheck.message === this.defaultErrorMessages.required(fieldName)) {
                 // This case is tricky. isNumber might fail if isNotEmpty fails.
                 // Let's re-evaluate for 0 specifically if allowZero.
                 if (value === 0 || value === "0") {
                    const numValueZero = 0;
                    const isValidZero = numValueZero >= min && numValueZero <= max;
                    return this._createReturnObject(isValidZero, isValidZero ? '' : this.defaultErrorMessages.outOfRange(fieldName, min, max, unit), value, numValueZero);
                 }
            }
            return numCheck;
        }


        const numValue = numCheck.normalizedValue;
        if (numValue === null) return this._createReturnObject(false, this.defaultErrorMessages.notANumber(fieldName), value, null);

        const isValid = numValue >= min && numValue <= max;
        return this._createReturnObject(isValid, isValid ? '' : this.defaultErrorMessages.outOfRange(fieldName, min, max, unit), value, numValue);
    }
    
    matchesRegex(value, pattern, fieldName = 'Value', formatHint = '') {
        const strValue = this._sanitize(String(value)); // Sanitize before regex
        const isValid = pattern.test(strValue);
        return this._createReturnObject(isValid, isValid ? '' : this.defaultErrorMessages.invalidFormat(fieldName, formatHint), value, strValue);
    }

    isEmail(email) {
        return this.matchesRegex(email, this.patterns.email, 'Email');
    }

    // --- Clinical Value Validations (Enhanced) ---

    isValidAge(age, calculatorContext = null, fieldName = 'Age') {
        const ageCheck = this.isInteger(age, fieldName);
        if (!ageCheck.isValid) return ageCheck;

        const ageNum = ageCheck.normalizedValue;
        const CT = this.dependencies.ClinicalThresholds;
        if (!CT) return this._createReturnObject(false, "ClinicalThresholds not available for age validation.", age, ageNum);

        let minAge = CT.get('AGE.MIN_VALID', 18);
        let maxAge = CT.get('AGE.MAX_VALID', 120);
        let specificMessage = this.defaultErrorMessages.outOfRange(fieldName, minAge, maxAge, 'years');
        let warning = null;

        if (calculatorContext === 'FRS') {
            minAge = CT.get('AGE.MIN_FRS', 30);
            maxAge = CT.get('AGE.MAX_FRS', 79);
            specificMessage = `For Framingham, ${fieldName.toLowerCase()} must be between ${minAge} and ${maxAge} years.`;
        } else if (calculatorContext === 'QRISK3') {
            minAge = CT.get('AGE.MIN_QRISK3', 25);
            maxAge = CT.get('AGE.MAX_QRISK3', 84);
            specificMessage = `For QRISK3, ${fieldName.toLowerCase()} must be between ${minAge} and ${maxAge} years.`;
        }

        const rangeCheck = this.isInRange(ageNum, minAge, maxAge, fieldName, 'years');
        if (!rangeCheck.isValid) {
            return this._createReturnObject(false, specificMessage, age, ageNum);
        }

        const physiologicalMin = CT.get('PHYSIOLOGICAL_RANGES.AGE.PLAUSIBLE_MIN', 20);
        const physiologicalMax = CT.get('PHYSIOLOGICAL_RANGES.AGE.PLAUSIBLE_MAX', 110);
        if (ageNum < physiologicalMin || ageNum > physiologicalMax) {
            warning = `Age ${ageNum} is outside the typical plausible range (${physiologicalMin}-${physiologicalMax}). Please verify.`;
        }

        return this._createReturnObject(true, '', age, ageNum, warning);
    }

    isValidSBP(sbp, fieldName = 'Systolic BP') {
        const sbpCheck = this.isInteger(sbp, fieldName);
        if (!sbpCheck.isValid) return sbpCheck;

        const sbpNum = sbpCheck.normalizedValue;
        const CT = this.dependencies.ClinicalThresholds;
        if (!CT) return this._createReturnObject(false, "ClinicalThresholds not available for SBP validation.", sbp, sbpNum);

        const minSbp = CT.get('SBP.MIN_VALID', 60);
        const maxSbp = CT.get('SBP.MAX_VALID', 300);

        const rangeCheck = this.isInRange(sbpNum, minSbp, maxSbp, fieldName, 'mmHg');
        if (!rangeCheck.isValid) return rangeCheck;

        let warning = null;
        const physiologicalMin = CT.get('PHYSIOLOGICAL_RANGES.SBP.PLAUSIBLE_MIN', 70);
        const physiologicalMax = CT.get('PHYSIOLOGICAL_RANGES.SBP.PLAUSIBLE_MAX', 250);
        const crisisThreshold = CT.get('SBP.HYPERTENSIVE_CRISIS', 180);

        if (sbpNum < physiologicalMin || sbpNum > physiologicalMax) {
            warning = `${fieldName} ${sbpNum} mmHg is physiologically unusual. Please verify.`;
        }
        if (sbpNum >= crisisThreshold) {
            warning = (warning ? warning + " " : "") + `SBP at or above ${crisisThreshold} mmHg may indicate hypertensive urgency/emergency.`;
        }
        return this._createReturnObject(true, '', sbp, sbpNum, warning);
    }
    
    isValidDBP(dbp, fieldName = 'Diastolic BP') {
        const dbpCheck = this.isInteger(dbp, fieldName);
        if (!dbpCheck.isValid) return dbpCheck;

        const dbpNum = dbpCheck.normalizedValue;
        const CT = this.dependencies.ClinicalThresholds;
        if (!CT) return this._createReturnObject(false, "ClinicalThresholds not available for DBP validation.", dbp, dbpNum);

        const minDbp = CT.get('DBP.MIN_VALID', 30);
        const maxDbp = CT.get('DBP.MAX_VALID', 160);

        const rangeCheck = this.isInRange(dbpNum, minDbp, maxDbp, fieldName, 'mmHg');
        if (!rangeCheck.isValid) return rangeCheck;

        let warning = null;
        const physiologicalMin = CT.get('PHYSIOLOGICAL_RANGES.DBP.PLAUSIBLE_MIN', 40);
        const physiologicalMax = CT.get('PHYSIOLOGICAL_RANGES.DBP.PLAUSIBLE_MAX', 140);
         const crisisThreshold = CT.get('DBP.HYPERTENSIVE_CRISIS', 120);


        if (dbpNum < physiologicalMin || dbpNum > physiologicalMax) {
            warning = `${fieldName} ${dbpNum} mmHg is physiologically unusual. Please verify.`;
        }
         if (dbpNum >= crisisThreshold) {
            warning = (warning ? warning + " " : "") + `DBP at or above ${crisisThreshold} mmHg may indicate hypertensive urgency/emergency.`;
        }
        return this._createReturnObject(true, '', dbp, dbpNum, warning);
    }

    isValidLipid(value, lipidType, unit, fieldName, allowZero = false) {
        const typeUpper = String(lipidType).toUpperCase();
        const fName = fieldName || typeUpper.replace('_', ' ');

        const numCheck = this.isNumber(value, fName);
         if (!numCheck.isValid) {
            // Allow 0 if specified and the error was "required"
            if (allowZero && (value === 0 || value === "0") && numCheck.message === this.defaultErrorMessages.required(fName)) {
                 // Proceed to range check for 0
            } else {
                return numCheck;
            }
        }
        
        const originalValue = (value === 0 || value === "0") ? 0 : numCheck.normalizedValue;
        let valueForRangeCheck = originalValue;
        let unitForRangeCheck = String(unit).toLowerCase();
        let normalizedValueStandardUnit = null; // e.g., always mmol/L for internal comparison
        const standardUnit = (typeUpper === 'TRIGLYCERIDES' || typeUpper === 'CHOLESTEROL' || typeUpper === 'HDL' || typeUpper === 'LDL' || typeUpper === 'NON_HDL') ? 'mmol/l' : 
                             (typeUpper === 'LPA') ? 'nmol/l' :
                             (typeUpper === 'APOB') ? 'g/l' : unitForRangeCheck;


        if (this.dependencies.UnitConverter) {
            const convResult = this.dependencies.UnitConverter.convert(originalValue, unitForRangeCheck, standardUnit, typeUpper);
            if (convResult.error && originalValue !== 0) { // Don't fail conversion for 0
                 return this._createReturnObject(false, `Unit error for ${fName}: ${convResult.error}`, value, originalValue);
            }
            if (convResult.value !== null) {
                valueForRangeCheck = convResult.value;
                unitForRangeCheck = convResult.unit; // This is now the standard unit
                normalizedValueStandardUnit = convResult.value;
            }
        } else if (unitForRangeCheck !== standardUnit && originalValue !== 0) {
            return this._createReturnObject(false, `Cannot validate ${fName} in ${unit} without UnitConverterService. Expected ${standardUnit}.`, value, originalValue);
        }

        const CT = this.dependencies.ClinicalThresholds;
        if (!CT) return this._createReturnObject(false, `ClinicalThresholds not available for ${fName} validation.`, value, originalValue);

        const minVal = CT.get(`${typeUpper}.MIN_VALID_${standardUnit.replace('/','_').toUpperCase()}`, 0.01);
        const maxVal = CT.get(`${typeUpper}.MAX_VALID_${standardUnit.replace('/','_').toUpperCase()}`, 99);

        // If allowZero is true, and value is 0, it bypasses the minVal check if minVal > 0
        let isValidInRange;
        if (allowZero && valueForRangeCheck === 0) {
            isValidInRange = (0 <= maxVal); // Check if 0 is less than or equal to max
        } else {
            isValidInRange = (valueForRangeCheck >= minVal && valueForRangeCheck <= maxVal);
        }

        if (!isValidInRange) {
            // For error message, convert min/max back to original unit if necessary
            let displayMin = minVal, displayMax = maxVal, displayUnit = standardUnit;
            if (this.dependencies.UnitConverter && unit.toLowerCase() !== standardUnit) {
                const convMin = this.dependencies.UnitConverter.convert(minVal, standardUnit, unit.toLowerCase(), typeUpper);
                const convMax = this.dependencies.UnitConverter.convert(maxVal, standardUnit, unit.toLowerCase(), typeUpper);
                if (!convMin.error) displayMin = convMin.value;
                if (!convMax.error) displayMax = convMax.value;
                displayUnit = unit;
            }
             const dec = (displayUnit === 'mg/dl' || displayUnit === 'nmol/l') ? 0 : (typeUpper === 'APOB' && displayUnit === 'g/l' ? 2:1);
            return this._createReturnObject(false, this.defaultErrorMessages.outOfRange(fName, displayMin.toFixed(dec), displayMax.toFixed(dec), displayUnit), value, originalValue);
        }
        
        let warning = null;
        const plausibleMin = CT.get(`PHYSIOLOGICAL_RANGES.${typeUpper}_${standardUnit.replace('/','_').toUpperCase()}.PLAUSIBLE_MIN`, minVal);
        const plausibleMax = CT.get(`PHYSIOLOGICAL_RANGES.${typeUpper}_${standardUnit.replace('/','_').toUpperCase()}.PLAUSIBLE_MAX`, maxVal);

        if (valueForRangeCheck < plausibleMin || valueForRangeCheck > plausibleMax) {
            if (!(allowZero && valueForRangeCheck === 0 && plausibleMin > 0)) { // Don't warn if 0 is allowed and plausible_min is > 0
                 warning = `${fName} ${valueForRangeCheck.toFixed(standardUnit === 'mg/dl' ? 0:1)} ${standardUnit} is outside typical plausible range. Please verify.`;
            }
        }
        // Specific clinical warnings
        if (typeUpper === 'LDL' && valueForRangeCheck >= CT.get('LDL.VERY_HIGH_RISK_THRESHOLD_MMOL_L', 5.0)) {
            warning = (warning ? warning + " " : "") + `Strongly consider Familial Hypercholesterolemia.`;
        }
        if (typeUpper === 'TRIGLYCERIDES' && valueForRangeCheck >= CT.get('TRIGLYCERIDES.PANCREATITIS_RISK_THRESHOLD_MMOL_L', 10.0)) {
            warning = (warning ? warning + " " : "") + `High risk of pancreatitis.`;
        }
        if (typeUpper === 'LPA' && valueForRangeCheck >= CT.get('LPA.HIGH_RISK_THRESHOLD_NMOL_L', 100.0)) {
             warning = (warning ? warning + " " : "") + `Elevated Lp(a) is an independent CVD risk factor.`;
        }


        return this._createReturnObject(true, '', value, originalValue, warning);
    }


    isValidOption(value, allowedOptions, fieldName = 'Selection', caseSensitive = false, allowEmpty = false) {
        const strValue = String(value); // Handle null/undefined by converting to string "null"/"undefined"
        
        if (allowEmpty && (value === null || value === undefined || strValue.trim() === '')) {
            return this._createReturnObject(true, '', value, value);
        }

        const notEmptyCheck = this.isNotEmpty(value, fieldName);
        if(!notEmptyCheck.isValid) return notEmptyCheck;

        if (!Array.isArray(allowedOptions) || allowedOptions.length === 0) {
            this._log('warn', `No allowed options provided for ${fieldName}.`);
            return this._createReturnObject(true, '', value, value); // Or false if options are mandatory
        }
        const valToCompare = caseSensitive ? strValue : strValue.toLowerCase();
        const optionsToCompare = caseSensitive ? allowedOptions.map(String) : allowedOptions.map(opt => String(opt).toLowerCase());

        const isValid = optionsToCompare.includes(valToCompare);
        return this._createReturnObject(isValid, isValid ? '' : this.defaultErrorMessages.invalidOption(fieldName, allowedOptions), value, value);
    }

    /**
     * Validates a set of data against a rules object.
     * Rules object format: { fieldName: [ruleFn1, ruleFn2, ...], ... }
     * Each ruleFn is a bound method of this service (e.g., this.isNotEmpty.bind(this))
     * or a custom function: (value, fieldName, allData) => {isValid, message, value, warning}
     * @param {object} data - Data object (e.g., form data).
     * @param {object} rules - Validation rules object. { fieldName: { rules: [fn1, fn2], options: {calculatorContext: 'FRS'} } }
     * @returns {{isValid: boolean, errors: object, warnings: object, validatedData: object}}
     */
    validateSet(data, rules) {
        const errors = {};
        const warnings = {};
        let overallIsValid = true;
        const validatedData = this._sanitize(data); // Sanitize the whole object initially if possible

        for (const fieldName in rules) {
            if (Object.prototype.hasOwnProperty.call(rules, fieldName)) {
                const fieldRuleConfig = rules[fieldName];
                const fieldRules = Array.isArray(fieldRuleConfig) ? fieldRuleConfig : fieldRuleConfig.rules;
                const ruleOptions = Array.isArray(fieldRuleConfig) ? {} : (fieldRuleConfig.options || {});

                let fieldValue = validatedData[fieldName]; // Use potentially sanitized value

                for (const rule of fieldRules) {
                    if (typeof rule !== 'function') {
                        this._log('error', `Invalid rule for ${fieldName}: not a function.`);
                        errors[fieldName] = 'Internal validation configuration error.';
                        overallIsValid = false;
                        break;
                    }
                    // Pass current field value, field name, full dataset, and rule-specific options
                    const result = rule(fieldValue, fieldName, validatedData, ruleOptions);
                    
                    if (!result.isValid) {
                        errors[fieldName] = result.message;
                        overallIsValid = false;
                        break; 
                    }
                    if (result.warning) {
                        warnings[fieldName] = (warnings[fieldName] || []).concat(result.warning);
                    }
                    if (result.normalizedValue !== undefined) {
                        fieldValue = result.normalizedValue;
                        validatedData[fieldName] = result.normalizedValue;
                    } else if (result.value !== undefined) { // Fallback if only 'value' is returned
                        fieldValue = result.value;
                        validatedData[fieldName] = result.value;
                    }
                }
            }
        }
        return { isValid: overallIsValid, errors, warnings, validatedData };
    }

    // --- Calculation Helpers (Enhanced) ---

    calculateBMI(height, weight, heightUnit = 'cm', weightUnit = 'kg', fieldNamePrefix = '') {
        const hCheck = this.isNumber(height, `${fieldNamePrefix}Height`);
        const wCheck = this.isNumber(weight, `${fieldNamePrefix}Weight`);

        if (!hCheck.isValid || !wCheck.isValid) {
            return this._createReturnObject(false, hCheck.message || wCheck.message, null, null);
        }

        let heightM = hCheck.normalizedValue;
        if (this.dependencies.UnitConverter) {
            const convH = this.dependencies.UnitConverter.convert(heightM, heightUnit, 'm', 'height');
            if (convH.error) return this._createReturnObject(false, `Height unit conversion error: ${convH.error}`, null, null);
            heightM = convH.value;
        } else if (heightUnit.toLowerCase() === 'cm') heightM /= 100;
          else if (heightUnit.toLowerCase() === 'in') heightM *= 0.0254;
          else return this._createReturnObject(false, 'Invalid height unit for BMI (no converter).', null, null);


        let weightKg = wCheck.normalizedValue;
         if (this.dependencies.UnitConverter) {
            const convW = this.dependencies.UnitConverter.convert(weightKg, weightUnit, 'kg', 'weight');
            if (convW.error) return this._createReturnObject(false, `Weight unit conversion error: ${convW.error}`, null, null);
            weightKg = convW.value;
        } else if (weightUnit.toLowerCase() === 'lb') weightKg *= 0.45359237;
          else if (weightUnit.toLowerCase() !== 'kg') return this._createReturnObject(false, 'Invalid weight unit for BMI (no converter).', null, null);


        if (heightM === null || heightM <= 0) return this._createReturnObject(false, 'Height must be positive for BMI calculation.', null, null);
        if (weightKg === null || weightKg <=0) return this._createReturnObject(false, 'Weight must be positive for BMI calculation.', null, null);

        const bmi = weightKg / (heightM * heightM);
        const roundedBmi = parseFloat(bmi.toFixed(1));

        const CT = this.dependencies.ClinicalThresholds;
        if (!CT) return this._createReturnObject(true, '', roundedBmi, roundedBmi); // No thresholds to check against

        const minBmi = CT.get('BMI.MIN_VALID', 10);
        const maxBmi = CT.get('BMI.MAX_VALID', 70);
        let warning = null;

        if (roundedBmi < minBmi || roundedBmi > maxBmi) {
            return this._createReturnObject(false, `Calculated BMI (${roundedBmi}) is outside plausible range (${minBmi}-${maxBmi}).`, roundedBmi, roundedBmi);
        }
        
        const plausibleMin = CT.get('PHYSIOLOGICAL_RANGES.BMI.PLAUSIBLE_MIN', 15);
        const plausibleMax = CT.get('PHYSIOLOGICAL_RANGES.BMI.PLAUSIBLE_MAX', 50);
        if (roundedBmi < plausibleMin || roundedBmi > plausibleMax) {
            warning = `Calculated BMI (${roundedBmi}) is physiologically unusual. Please verify height/weight.`;
        }

        return this._createReturnObject(true, '', roundedBmi, roundedBmi, warning);
    }

    calculateNonHDL(totalCholesterol, hdl, unit = 'mmol/L', fieldNamePrefix = '') {
        // Validate TC and HDL in their original units first
        const tcValidation = this.isValidLipid(totalCholesterol, 'TOTAL_CHOLESTEROL', unit, `${fieldNamePrefix}Total Cholesterol`);
        const hdlValidation = this.isValidLipid(hdl, 'HDL', unit, `${fieldNamePrefix}HDL Cholesterol`);

        if (!tcValidation.isValid) return tcValidation;
        if (!hdlValidation.isValid) return hdlValidation;

        // Use normalized (standard unit, e.g. mmol/L) values for calculation
        const tcValStd = tcValidation.normalizedValueMmolL !== undefined ? tcValidation.normalizedValueMmolL : 
                         (this.dependencies.UnitConverter ? this.dependencies.UnitConverter.convert(tcValidation.value, unit, 'mmol/L', 'TOTAL_CHOLESTEROL').value : tcValidation.value);
        const hdlValStd = hdlValidation.normalizedValueMmolL !== undefined ? hdlValidation.normalizedValueMmolL : 
                         (this.dependencies.UnitConverter ? this.dependencies.UnitConverter.convert(hdlValidation.value, unit, 'mmol/L', 'HDL').value : hdlValidation.value);
        
        if (tcValStd === null || hdlValStd === null) {
            return this._createReturnObject(false, "Could not normalize TC or HDL to standard units for Non-HDL calculation.", null, null);
        }

        const nonHdlStd = tcValStd - hdlValStd;
        if (nonHdlStd < 0) {
             return this._createReturnObject(false, 'Non-HDL cholesterol cannot be negative (TC < HDL).', null, null);
        }
        
        // Convert back to original unit for display if needed, or keep in standard
        let finalNonHdlValue = nonHdlStd;
        let finalUnit = 'mmol/L';

        if (this.dependencies.UnitConverter && unit.toLowerCase() !== 'mmol/l') {
            const convBack = this.dependencies.UnitConverter.convert(nonHdlStd, 'mmol/L', unit.toLowerCase(), 'NON_HDL');
            if (!convBack.error && convBack.value !== null) {
                finalNonHdlValue = convBack.value;
                finalUnit = convBack.unit;
            }
        }
        
        const decimals = (finalUnit === 'mg/dl') ? 0 : 1;
        const roundedNonHdl = parseFloat(finalNonHdlValue.toFixed(decimals));

        return this._createReturnObject(true, '', roundedNonHdl, roundedNonHdl);
    }


    calculateCholesterolRatio(totalCholesterol, hdl, unit = 'mmol/L', fieldNamePrefix = '') {
        const tcValidation = this.isValidLipid(totalCholesterol, 'TOTAL_CHOLESTEROL', unit, `${fieldNamePrefix}Total Cholesterol`);
        const hdlValidation = this.isValidLipid(hdl, 'HDL', unit, `${fieldNamePrefix}HDL Cholesterol`);

        if (!tcValidation.isValid) return tcValidation;
        if (!hdlValidation.isValid) return hdlValidation;
        
        // Use original validated values as they are already in the same unit by this point
        const tcVal = tcValidation.value;
        const hdlVal = hdlValidation.value;

        if (hdlVal === null || hdlVal <= 0) return this._createReturnObject(false, 'HDL must be positive for ratio calculation.', null, null);
        if (tcVal === null) return this._createReturnObject(false, 'Total Cholesterol value is missing for ratio.', null, null);


        const ratio = tcVal / hdlVal;
        const roundedRatio = parseFloat(ratio.toFixed(1));

        // Plausibility for ratio
        const CT = this.dependencies.ClinicalThresholds;
        let warning = null;
        if (CT) {
            const minRatio = CT.get('CHOLESTEROL_RATIO.MIN_VALID', 1.0);
            const maxRatio = CT.get('CHOLESTEROL_RATIO.MAX_VALID', 15.0);
            if (roundedRatio < minRatio || roundedRatio > maxRatio) {
                warning = `Calculated TC:HDL ratio (${roundedRatio}) is outside plausible range (${minRatio}-${maxRatio}). Please verify inputs.`;
            }
        }

        return this._createReturnObject(true, '', roundedRatio, roundedRatio, warning);
    }

    calculateBPStandardDeviation(readings, fieldNamePrefix = '') {
        if (!Array.isArray(readings)) {
            return this._createReturnObject(false, 'Input for SBP readings must be an array.', null, null);
        }

        const validReadings = readings
            .map((r, i) => {
                const check = this.isValidSBP(r, `${fieldNamePrefix}SBP Reading ${i+1}`);
                return check.isValid ? check.normalizedValue : null;
            })
            .filter(r => r !== null);

        if (validReadings.length < 2) {
            return this._createReturnObject(false, 'At least two valid SBP readings are required to calculate Standard Deviation.', null, null, { count: validReadings.length });
        }

        const n = validReadings.length;
        const mean = validReadings.reduce((sum, val) => sum + val, 0) / n;
        const variance = validReadings.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        const result = {
            stdDev: parseFloat(stdDev.toFixed(1)),
            mean: parseFloat(mean.toFixed(0)),
            count: n,
        };
        return this._createReturnObject(true, '', result, result);
    }
}

// Export the class for instantiation in main.js
export default ValidationHelpersService;
