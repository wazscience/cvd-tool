/**
 * Comprehensive Calculation Validation Module
 * @file calculation-validation.js
 * @description Advanced validation system for CVD risk calculator inputs with enhanced security features
 * @version 3.0.0
 * @author CVD Risk Assessment Team
 */

import { EventBus } from '../utils/event-bus.js';
import { LoggingService } from '../utils/logging-service.js';
import { UnitConverter } from '../utils/unit-converter.js';
import { InputSanitizer } from '../utils/input-sanitizer.js';

/**
 * CalculationValidator Class
 * Comprehensive validation for inputs to cardiovascular risk calculators
 * with enhanced security, data normalization, and unit conversion features
 */
class CalculationValidator {
    /**
     * Constructor initializes validation ranges and error handling
     */
    constructor() {
        // Initialize logging service
        this.logger = new LoggingService({
            component: 'CalculationValidator',
            logLevel: 'info',
            includeTimestamp: true
        });
        
        // Initialize input sanitizer
        this.sanitizer = new InputSanitizer({
            preventInjection: true,
            stripTags: true,
            sanitizeNumbers: true
        });
        
        // Initialize unit converter
        this.unitConverter = new UnitConverter();
        
        // Set up validation ranges with expanded tolerances for all calculator inputs
        this._initializeValidationRanges();
        
        // Set up format patterns
        this._initializeFormatPatterns();
        
        // Set up value converters for string normalization
        this._initializeValueConverters();
        
        // Initialize error tracking and display
        this._initializeErrorHandling();
        
        // Flag to indicate initialization status
        this.initialized = true;
        
        this.logger.info('CalculationValidator initialized successfully');
    }
    
    /**
     * Initialize validation ranges for all calculator inputs
     * Enhanced with detailed ranges and clinical validity checks
     * @private
     */
    _initializeValidationRanges() {
        this.validationRanges = {
            // Patient demographic parameters
            age: { 
                min: 18, 
                max: 120, 
                required: true, 
                dataType: 'integer',
                clinicalValidMin: 20,
                clinicalValidMax: 90,
                framinghamValidMin: 30,
                framinghamValidMax: 79,
                qriskValidMin: 25,
                qriskValidMax: 84,
                errorMsg: "Age must be between 18 and 120 years",
                warningMsg: "Age outside clinically validated range for selected calculator"
            },
            
            sex: { 
                required: true, 
                options: ['male', 'female'],
                alternateValues: {
                    'm': 'male',
                    'f': 'female',
                    'man': 'male',
                    'woman': 'female',
                    '1': 'male',
                    '2': 'female',
                    '0': 'female'
                },
                errorMsg: "Sex must be specified as male or female" 
            },
            
            ethnicity: {
                options: [
                    'white_or_not_stated', 'white_irish', 'white_gypsy', 'other_white',
                    'white_black_caribbean', 'white_black_african', 'white_asian', 'other_mixed',
                    'indian', 'pakistani', 'bangladeshi', 'other_asian',
                    'black_caribbean', 'black_african', 'other_black',
                    'chinese', 'other'
                ],
                alternateValues: {
                    'white': 'white_or_not_stated',
                    'caucasian': 'white_or_not_stated',
                    'south_asian': 'indian',
                    'black': 'black_african',
                    'east_asian': 'chinese',
                    'hispanic': 'other',
                    'latino': 'other',
                    'middle_eastern': 'other',
                    'arab': 'other'
                },
                qriskRequired: true,
                errorMsg: "Ethnicity must be a valid option"
            },
            
            // Physical measurements
            height: { 
                min: 100, 
                max: 250, 
                dataType: 'float',
                units: ['cm', 'in'],
                defaultUnit: 'cm',
                errorMsg: "Height must be between 100 and 250 cm" 
            },
            
            weight: { 
                min: 20, 
                max: 300, 
                dataType: 'float',
                units: ['kg', 'lb'],
                defaultUnit: 'kg',
                errorMsg: "Weight must be between 20 and 300 kg" 
            },
            
            bmi: { 
                min: 15, 
                max: 70, 
                dataType: 'float',
                clinicalValidMin: 15,
                clinicalValidMax: 47,
                errorMsg: "BMI must be between 15 and 70 kg/m²",
                warningMsg: "BMI outside clinically validated range"
            },
            
            // Blood pressure parameters
            sbp: { 
                min: 60, 
                max: 250, 
                required: true, 
                dataType: 'integer',
                clinicalValidMin: 70,
                clinicalValidMax: 210,
                errorMsg: "Systolic blood pressure must be between 60 and 250 mmHg",
                warningMsg: "Systolic BP outside clinically validated range"
            },
            
            dbp: { 
                min: 30, 
                max: 150, 
                dataType: 'integer',
                clinicalValidMin: 40,
                clinicalValidMax: 130,
                errorMsg: "Diastolic blood pressure must be between 30 and 150 mmHg",
                warningMsg: "Diastolic BP outside clinically validated range"
            },
            
            bpVariability: {
                min: 0,
                max: 50,
                dataType: 'float',
                clinicalValidMax: 40,
                errorMsg: "BP variability must be between 0 and 50 mmHg",
                warningMsg: "BP variability unusually high"
            },
            
            // Lipid parameters - mmol/L
            totalCholesterol_mmol: { 
                min: 1.0, 
                max: 20.0, 
                required: true, 
                dataType: 'float',
                clinicalValidMin: 1.5,
                clinicalValidMax: 15.0,
                errorMsg: "Total cholesterol must be between 1.0 and 20.0 mmol/L",
                warningMsg: "Total cholesterol outside typical clinical range"
            },
            
            ldl_mmol: { 
                min: 0.3, 
                max: 15.0, 
                dataType: 'float',
                clinicalValidMin: 0.5,
                clinicalValidMax: 10.0,
                errorMsg: "LDL cholesterol must be between 0.3 and 15.0 mmol/L",
                warningMsg: "LDL cholesterol outside typical clinical range"
            },
            
            hdl_mmol: { 
                min: 0.1, 
                max: 5.0, 
                required: true, 
                dataType: 'float',
                clinicalValidMin: 0.4,
                clinicalValidMax: 4.0,
                errorMsg: "HDL cholesterol must be between 0.1 and 5.0 mmol/L",
                warningMsg: "HDL cholesterol outside typical clinical range"
            },
            
            triglycerides_mmol: { 
                min: 0.2, 
                max: 20.0, 
                dataType: 'float',
                clinicalValidMin: 0.5,
                clinicalValidMax: 10.0,
                errorMsg: "Triglycerides must be between 0.2 and 20.0 mmol/L",
                warningMsg: "Triglycerides outside typical clinical range"
            },
            
            nonHdl_mmol: { 
                min: 0.5, 
                max: 18.0, 
                dataType: 'float',
                errorMsg: "Non-HDL cholesterol must be between 0.5 and 18.0 mmol/L" 
            },
            
            cholesterolRatio: {
                min: 1.0,
                max: 20.0,
                dataType: 'float',
                clinicalValidMin: 1.5,
                clinicalValidMax: 12.0,
                errorMsg: "Cholesterol ratio must be between 1.0 and 20.0",
                warningMsg: "Cholesterol ratio outside typical clinical range"
            },
            
            // Lipid parameters - mg/dL
            totalCholesterol_mg: { 
                min: 50, 
                max: 800, 
                required: true, 
                dataType: 'integer',
                errorMsg: "Total cholesterol must be between 50 and 800 mg/dL" 
            },
            
            ldl_mg: { 
                min: 20, 
                max: 600, 
                dataType: 'integer',
                errorMsg: "LDL cholesterol must be between 20 and 600 mg/dL" 
            },
            
            hdl_mg: { 
                min: 5, 
                max: 200, 
                required: true, 
                dataType: 'integer',
                errorMsg: "HDL cholesterol must be between 5 and 200 mg/dL" 
            },
            
            triglycerides_mg: { 
                min: 20, 
                max: 1800, 
                dataType: 'integer',
                errorMsg: "Triglycerides must be between 20 and 1800 mg/dL" 
            },
            
            nonHdl_mg: { 
                min: 20, 
                max: 700, 
                dataType: 'integer',
                errorMsg: "Non-HDL cholesterol must be between 20 and 700 mg/dL" 
            },
            
            // Advanced lipid parameters
            apoB_g: { 
                min: 0.1, 
                max: 3.0, 
                dataType: 'float',
                errorMsg: "Apolipoprotein B must be between 0.1 and 3.0 g/L" 
            },
            
            apoB_mg: { 
                min: 10, 
                max: 300, 
                dataType: 'integer',
                errorMsg: "Apolipoprotein B must be between 10 and 300 mg/dL" 
            },
            
            // Lipoprotein(a) parameters
            lpa_mg: { 
                min: 0, 
                max: 500, 
                dataType: 'float',
                errorMsg: "Lipoprotein(a) must be between 0 and 500 mg/dL" 
            },
            
            lpa_nmol: { 
                min: 0, 
                max: 1000, 
                dataType: 'float',
                errorMsg: "Lipoprotein(a) must be between 0 and 1000 nmol/L" 
            },
            
            // Blood glucose parameters
            hba1c_percent: { 
                min: 3.0, 
                max: 20.0, 
                dataType: 'float',
                errorMsg: "HbA1c must be between 3.0 and 20.0%" 
            },
            
            hba1c_mmol: { 
                min: 10, 
                max: 195, 
                dataType: 'float',
                errorMsg: "HbA1c must be between 10 and 195 mmol/mol" 
            },
            
            glucose_mmol: { 
                min: 2.0, 
                max: 30.0, 
                dataType: 'float',
                errorMsg: "Glucose must be between 2.0 and 30.0 mmol/L" 
            },
            
            glucose_mg: { 
                min: 36, 
                max: 540, 
                dataType: 'integer',
                errorMsg: "Glucose must be between 36 and 540 mg/dL" 
            },
            
            // Renal function parameters
            creatinine_umol: { 
                min: 20, 
                max: 1500, 
                dataType: 'integer',
                errorMsg: "Creatinine must be between 20 and 1500 μmol/L" 
            },
            
            creatinine_mg: { 
                min: 0.2, 
                max: 17.0, 
                dataType: 'float',
                errorMsg: "Creatinine must be between 0.2 and 17.0 mg/dL" 
            },
            
            egfr: { 
                min: 0, 
                max: 150, 
                dataType: 'float',
                errorMsg: "eGFR must be between 0 and 150 mL/min/1.73 m²" 
            },
            
            // QRISK3 specific parameters
            townsend: { 
                min: -10, 
                max: 15, 
                dataType: 'float',
                errorMsg: "Townsend deprivation score must be between -10 and 15" 
            },
            
            // Lifestyle parameters
            smoking: {
                options: ['non', 'ex', 'light', 'moderate', 'heavy'],
                alternateValues: {
                    'never': 'non',
                    'no': 'non',
                    'none': 'non',
                    'nonsmoker': 'non',
                    'non-smoker': 'non',
                    'former': 'ex',
                    'previous': 'ex',
                    'quit': 'ex',
                    'mild': 'light',
                    'occasional': 'light',
                    'regular': 'moderate',
                    'daily': 'moderate',
                    'severe': 'heavy'
                },
                required: true,
                errorMsg: "Smoking status must be one of: non, ex, light, moderate, heavy"
            },
            
            // Boolean parameters (stored as string or boolean)
            booleanParam: {
                options: [true, false, 'true', 'false', 'yes', 'no', 1, 0, '1', '0'],
                alternateValues: {
                    'y': true,
                    'n': false,
                    'yes': true,
                    'no': false,
                    'true': true,
                    'false': false,
                    '1': true,
                    '0': false,
                    1: true,
                    0: false
                },
                errorMsg: "Parameter must be a boolean value (true/false, yes/no, 1/0)"
            },
            
            // Diabetes status
            diabetes: {
                options: ['none', 'type1', 'type2'],
                alternateValues: {
                    'no': 'none',
                    'false': 'none',
                    '0': 'none',
                    'type 1': 'type1',
                    't1': 'type1',
                    't1dm': 'type1',
                    'iddm': 'type1',
                    'type 2': 'type2',
                    't2': 'type2',
                    't2dm': 'type2',
                    'niddm': 'type2',
                    'yes': 'type2' // Default to type2 if just "yes"
                },
                errorMsg: "Diabetes status must be one of: none, type1, type2"
            }
        };
    }
    
    /**
     * Initialize format patterns for validation
     * @private
     */
    _initializeFormatPatterns() {
        this.formatPatterns = {
            // Standard number formats
            integer: /^-?\d+$/,
            float: /^-?\d+(\.\d+)?$/,
            
            // Date formats
            date: /^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})$/,
            
            // Special formats
            postalCode: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
            
            // Height and weight with units
            heightWithUnit: /^(\d+(\.\d+)?)\s*(cm|in|inches|ft|feet|'|"|foot)$/i,
            weightWithUnit: /^(\d+(\.\d+)?)\s*(kg|lbs?|pounds|kilos?)$/i,
            
            // BP readings with units
            bpWithUnit: /^(\d+)(?:\s*\/\s*(\d+))?\s*(mmHg)?$/i,
            
            // Cholesterol values with units
            cholWithUnit: /^(\d+(\.\d+)?)\s*(mmol\/L|mg\/dL)$/i
        };
    }
    
    /**
     * Initialize value converters for string normalization
     * @private
     */
    _initializeValueConverters() {
        this.valueConverters = {
            // Common height format converters
            height: {
                // Convert feet'inches" to cm
                feetInches: (value) => {
                    const match = value.match(/(\d+)'?\s*(\d+(?:\.\d+)?)?\"?/);
                    if (match) {
                        const feet = parseFloat(match[1]);
                        const inches = match[2] ? parseFloat(match[2]) : 0;
                        return { value: (feet * 30.48) + (inches * 2.54), unit: 'cm' };
                    }
                    return null;
                },
                
                // Extract value and unit
                withUnit: (value) => {
                    const match = value.match(this.formatPatterns.heightWithUnit);
                    if (match) {
                        const numValue = parseFloat(match[1]);
                        let unit = match[3].toLowerCase();
                        
                        // Normalize unit
                        if (['in', 'inches', '"', "'"].includes(unit)) {
                            unit = 'in';
                        } else if (['ft', 'feet', 'foot'].includes(unit)) {
                            return { value: numValue * 30.48, unit: 'cm' };
                        } else {
                            unit = 'cm';
                        }
                        
                        return { value: numValue, unit };
                    }
                    return null;
                }
            },
            
            // Common weight format converters
            weight: {
                // Extract value and unit
                withUnit: (value) => {
                    const match = value.match(this.formatPatterns.weightWithUnit);
                    if (match) {
                        const numValue = parseFloat(match[1]);
                        let unit = match[3].toLowerCase();
                        
                        // Normalize unit
                        if (unit.startsWith('lb') || unit === 'pounds') {
                            unit = 'lb';
                        } else {
                            unit = 'kg';
                        }
                        
                        return { value: numValue, unit };
                    }
                    return null;
                }
            },
            
            // Blood pressure format converters
            bp: {
                // Extract systolic and diastolic
                withSlash: (value) => {
                    const match = value.match(/^(\d+)(?:\s*\/\s*(\d+))?/);
                    if (match) {
                        return {
                            systolic: parseInt(match[1]),
                            diastolic: match[2] ? parseInt(match[2]) : null
                        };
                    }
                    return null;
                }
            },
            
            // Cholesterol value format converters
            cholesterol: {
                // Extract value and unit
                withUnit: (value) => {
                    const match = value.match(this.formatPatterns.cholWithUnit);
                    if (match) {
                        const numValue = parseFloat(match[1]);
                        const unit = match[3]?.toLowerCase() || 'mmol/L';
                        
                        return { value: numValue, unit };
                    }
                    return null;
                }
            }
        };
    }
    
    /**
     * Initialize error handling
     * @private
     */
    _initializeErrorHandling() {
        // Subscribe to validation error events
        EventBus.subscribe('validation-error', (error) => {
            this.logger.warn('Validation error:', error);
            
            // Display error in UI if available
            if (error.fieldId && error.formId) {
                this.displayFieldError(error.formId, error.fieldId, error.message);
            }
        });
    }
    
    /**
     * Display a validation error for a specific field
     * @param {string} formId - Form ID
     * @param {string} fieldId - Field ID
     * @param {string} errorMessage - Error message
     * @public
     */
    displayFieldError(formId, fieldId, errorMessage) {
        try {
            // Find the form and field
            const form = document.getElementById(formId);
            const field = document.getElementById(fieldId);
            
            if (!form || !field) return;
            
            // Add error class to field
            field.classList.add('validation-error');
            
            // Find or create error message container
            let errorContainer = document.getElementById(`${fieldId}-validation`);
            if (!errorContainer) {
                errorContainer = document.createElement('div');
                errorContainer.id = `${fieldId}-validation`;
                errorContainer.className = 'validation-error-message';
                field.parentNode.insertBefore(errorContainer, field.nextSibling);
            }
            
            // Set error message
            errorContainer.innerText = errorMessage;
            errorContainer.style.display = 'block';
            
            // Add accessibility attributes
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-describedby', `${fieldId}-validation`);
            
            // Scroll to error if needed
            if (field.offsetParent) {
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (error) {
            this.logger.error('Error displaying field error:', error);
        }
    }
    
    /**
     * Display a validation warning for a specific field
     * @param {string} formId - Form ID
     * @param {string} fieldId - Field ID
     * @param {string} warningMessage - Warning message
     * @public
     */
    displayFieldWarning(formId, fieldId, warningMessage) {
        try {
            // Find the form and field
            const form = document.getElementById(formId);
            const field = document.getElementById(fieldId);
            
            if (!form || !field) return;
            
            // Add warning class to field
            field.classList.add('validation-warning');
            
            // Find or create warning message container
            let warningContainer = document.getElementById(`${fieldId}-warning`);
            if (!warningContainer) {
                warningContainer = document.createElement('div');
                warningContainer.id = `${fieldId}-warning`;
                warningContainer.className = 'validation-warning-message';
                field.parentNode.insertBefore(warningContainer, field.nextSibling);
            }
            
            // Set warning message
            warningContainer.innerText = warningMessage;
            warningContainer.style.display = 'block';
            
            // Add accessibility attributes
            field.setAttribute('aria-describedby', `${fieldId}-warning`);
        } catch (error) {
            this.logger.error('Error displaying field warning:', error);
        }
    }
    
    /**
     * Clear validation errors for a form
     * @param {string} formId - Form ID
     * @public
     */
    clearValidationErrors(formId) {
        try {
            const form = document.getElementById(formId);
            if (!form) return;
            
            // Remove error classes from fields
            const errorFields = form.querySelectorAll('.validation-error');
            errorFields.forEach(field => {
                field.classList.remove('validation-error');
                field.removeAttribute('aria-invalid');
                field.removeAttribute('aria-describedby');
            });
            
            // Hide error messages
            const errorMessages = form.querySelectorAll('.validation-error-message');
            errorMessages.forEach(message => {
                message.style.display = 'none';
                message.innerText = '';
            });
            
            // Remove warning classes
            const warningFields = form.querySelectorAll('.validation-warning');
            warningFields.forEach(field => {
                field.classList.remove('validation-warning');
            });
            
            // Hide warning messages
            const warningMessages = form.querySelectorAll('.validation-warning-message');
            warningMessages.forEach(message => {
                message.style.display = 'none';
                message.innerText = '';
            });
        } catch (error) {
            this.logger.error('Error clearing validation errors:', error);
        }
    }
    
    /**
     * Validate a complete Framingham Risk Score form
     * @param {HTMLFormElement} form - Form element to validate
     * @returns {Object} Validation result with isValid flag and errors
     * @public
     */
    validateFraminghamForm(form) {
        try {
            if (!form) {
                return { isValid: false, errors: { general: 'Form not found' } };
            }
            
            const formData = new FormData(form);
            const data = {};
            const errors = {};
            const warnings = {};
            
            // Extract form data
            for (const [name, value] of formData.entries()) {
                data[name] = value;
            }
            
            // Validate required fields
            const requiredFields = {
                'frs-age': { field: 'age', framinghamRequired: true },
                'frs-sex': { field: 'sex', framinghamRequired: true },
                'frs-sbp': { field: 'sbp', framinghamRequired: true },
                'frs-total-cholesterol': { field: 'totalCholesterol', framinghamRequired: true, unitField: 'frs-cholesterol-unit' },
                'frs-hdl': { field: 'hdl', framinghamRequired: true, unitField: 'frs-cholesterol-unit' },
                'frs-smoker': { field: 'booleanParam', framinghamRequired: true },
                'frs-diabetes': { field: 'booleanParam', framinghamRequired: true },
                'frs-bp-treatment': { field: 'booleanParam', framinghamRequired: true }
            };
            
            // Validate optional fields
            const optionalFields = {
                'frs-ldl': { field: 'ldl', unitField: 'frs-cholesterol-unit' },
                'frs-triglycerides': { field: 'triglycerides', unitField: 'frs-cholesterol-unit' },
                'frs-lipoprotein-a': { field: 'lpa', unitField: 'frs-lpa-unit' },
                'frs-family-history': { field: 'booleanParam' },
                'frs-south-asian': { field: 'booleanParam' },
                'frs-height': { field: 'height', unitField: 'frs-height-unit' },
                'frs-weight': { field: 'weight', unitField: 'frs-weight-unit' },
                'frs-bmi': { field: 'bmi' }
            };
            
            // Validate all fields
            const allFields = { ...requiredFields, ...optionalFields };
            
            for (const [fieldId, validation] of Object.entries(allFields)) {
                const value = data[fieldId];
                const unitField = validation.unitField ? data[validation.unitField] : null;
                
                // Skip empty optional fields
                if (!value && !validation.framinghamRequired) {
                    continue;
                }
                
                // Check if required field is empty
                if (validation.framinghamRequired && (!value || value === '')) {
                    errors[fieldId] = `This field is required for Framingham Risk Score calculation`;
                    continue;
                }
                
                // Validate field
                const validationResult = this.validateValue(value, validation.field, {
                    unit: unitField,
                    calculator: 'framingham'
                });
                
                if (!validationResult.isValid) {
                    errors[fieldId] = validationResult.message;
                } else if (validationResult.warning) {
                    warnings[fieldId] = validationResult.warning;
                }
                
                // Store normalized value if available
                if (validationResult.normalizedValue !== undefined) {
                    data[fieldId] = validationResult.normalizedValue;
                }
                
                // Store unit conversion if available
                if (validationResult.convertedValue !== undefined && validationResult.convertedUnit !== undefined) {
                    data[`${fieldId}_converted`] = validationResult.convertedValue;
                    data[`${fieldId}_converted_unit`] = validationResult.convertedUnit;
                }
            }
            
            // Additional validation for specific scenarios
            // Multiple SBP readings validation
            if (data['frs-multiple-sbp'] === 'on' || data['frs-multiple-sbp'] === true) {
                const sbpReadings = [
                    data['frs-sbp-1'],
                    data['frs-sbp-2'],
                    data['frs-sbp-3'],
                    data['frs-sbp-4']
                ].filter(reading => reading && reading !== '');
                
                if (sbpReadings.length < 2) {
                    errors['frs-sbp-1'] = 'At least two SBP readings are required when multiple readings is enabled';
                }
                
                // Validate each reading
                sbpReadings.forEach((reading, index) => {
                    const fieldId = `frs-sbp-${index + 1}`;
                    
                    const validationResult = this.validateValue(reading, 'sbp', {
                        calculator: 'framingham'
                    });
                    
                    if (!validationResult.isValid) {
                        errors[fieldId] = validationResult.message;
                    } else if (validationResult.warning) {
                        warnings[fieldId] = validationResult.warning;
                    }
                });
            }
            
            // Calculate isValid flag
            const isValid = Object.keys(errors).length === 0;
            
            // Display errors and warnings in UI if validation failed
            if (!isValid) {
                for (const [fieldId, errorMessage] of Object.entries(errors)) {
                    this.displayFieldError(form.id, fieldId, errorMessage);
                }
            }
            
            // Display warnings
            for (const [fieldId, warningMessage] of Object.entries(warnings)) {
                this.displayFieldWarning(form.id, fieldId, warningMessage);
            }
            
            // Publish validation result event
            if (!isValid) {
                EventBus.publish('validation-error', {
                    formId: form.id,
                    errors: errors,
                    message: 'Framingham Risk Score validation failed'
                });
            } else {
                EventBus.publish('validation-success', {
                    formId: form.id,
                    warnings: warnings,
                    message: 'Framingham Risk Score validation successful'
                });
            }
            
            return { 
                isValid, 
                errors, 
                warnings,
                data,
                normalizedData: this.getNormalizedFormData(form, allFields)
            };
        } catch (error) {
            this.logger.error('Error validating Framingham form:', error);
            
            // Publish error event
            EventBus.publish('validation-error', {
                formId: form?.id,
                error: error.message,
                stack: error.stack
            });
            
            return {
                isValid: false,
                errors: { general: `Validation error: ${error.message}` }
            };
        }
    }
    
    /**
     * Validate a complete QRISK3 form
     * @param {HTMLFormElement} form - Form element to validate
     * @returns {Object} Validation result with isValid flag and errors
     * @public
     */
    validateQRISK3Form(form) {
        try {
            if (!form) {
                return { isValid: false, errors: { general: 'Form not found' } };
            }
            
            const formData = new FormData(form);
            const data = {};
            const errors = {};
            const warnings = {};
            
            // Extract form data
            for (const [name, value] of formData.entries()) {
                data[name] = value;
            }
            
            // Validate required fields
            const requiredFields = {
                'qrisk-age': { field: 'age', qriskRequired: true },
                'qrisk-sex': { field: 'sex', qriskRequired: true },
                'qrisk-ethnicity': { field: 'ethnicity', qriskRequired: true },
                'qrisk-sbp': { field: 'sbp', qriskRequired: true },
                'qrisk-total-cholesterol': { field: 'totalCholesterol', qriskRequired: true, unitField: 'qrisk-cholesterol-unit' },
                'qrisk-hdl': { field: 'hdl', qriskRequired: true, unitField: 'qrisk-cholesterol-unit' },
                'qrisk-smoking-status': { field: 'smoking', qriskRequired: true }
            };
            
            // Validate optional fields
            const optionalFields = {
                'qrisk-height': { field: 'height', unitField: 'qrisk-height-unit' },
                'qrisk-weight': { field: 'weight', unitField: 'qrisk-weight-unit' },
                'qrisk-bmi': { field: 'bmi' },
                'qrisk-systolic-bp-sd': { field: 'bpVariability' },
                'qrisk-cholesterol-ratio': { field: 'cholesterolRatio' },
                'qrisk-bp-treatment': { field: 'booleanParam' },
                'qrisk-family-history': { field: 'booleanParam' },
                'qrisk-af': { field: 'booleanParam' },
                'qrisk-ra': { field: 'booleanParam' },
                'qrisk-ckd': { field: 'booleanParam' },
                'qrisk-migraines': { field: 'booleanParam' },
                'qrisk-sle': { field: 'booleanParam' },
                'qrisk-severe-mental-illness': { field: 'booleanParam' },
                'qrisk-atypical-antipsychotics': { field: 'booleanParam' },
                'qrisk-regular-steroids': { field: 'booleanParam' },
                'qrisk-erectile-dysfunction': { field: 'booleanParam' },
                'qrisk-diabetes-status': { field: 'diabetes' },
                'qrisk-townsend': { field: 'townsend' }
            };
            
            // Validate all fields
            const allFields = { ...requiredFields, ...optionalFields };
            
            for (const [fieldId, validation] of Object.entries(allFields)) {
                const value = data[fieldId];
                const unitField = validation.unitField ? data[validation.unitField] : null;
                
                // Skip empty optional fields
                if (!value && !validation.qriskRequired) {
                    continue;
                }
                
                // Check if required field is empty
                if (validation.qriskRequired && (!value || value === '')) {
                    errors[fieldId] = `This field is required for QRISK3 calculation`;
                    continue;
                }
                
                // Validate field
                const validationResult = this.validateValue(value, validation.field, {
                    unit: unitField,
                    calculator: 'qrisk'
                });
                
                if (!validationResult.isValid) {
                    errors[fieldId] = validationResult.message;
                } else if (validationResult.warning) {
                    warnings[fieldId] = validationResult.warning;
                }
                
                // Store normalized value if available
                if (validationResult.normalizedValue !== undefined) {
                    data[fieldId] = validationResult.normalizedValue;
                }
                
                // Store unit conversion if available
                if (validationResult.convertedValue !== undefined && validationResult.convertedUnit !== undefined) {
                    data[`${fieldId}_converted`] = validationResult.convertedValue;
                    data[`${fieldId}_converted_unit`] = validationResult.convertedUnit;
                }
            }
            
            // Additional QRISK3-specific validations
            
            // Male-only fields
            if (data['qrisk-sex'] === 'female' && data['qrisk-erectile-dysfunction'] === 'true') {
                warnings['qrisk-erectile-dysfunction'] = 'Erectile dysfunction is only applicable for male patients';
            }
            
            // Validate either BMI or height and weight
            if (!data['qrisk-bmi'] && (!data['qrisk-height'] || !data['qrisk-weight'])) {
                warnings['qrisk-bmi'] = 'Either BMI or both height and weight should be provided';
            }
            
            // Multiple SBP readings validation
            if (data['qrisk-multiple-sbp'] === 'on' || data['qrisk-multiple-sbp'] === true) {
                const sbpReadings = [
                    data['qrisk-sbp-1'],
                    data['qrisk-sbp-2'],
                    data['qrisk-sbp-3'],
                    data['qrisk-sbp-4']
                ].filter(reading => reading && reading !== '');
                
                if (sbpReadings.length < 2) {
                    errors['qrisk-sbp-1'] = 'At least two SBP readings are required when multiple readings is enabled';
                }
                
                // Validate each reading
                sbpReadings.forEach((reading, index) => {
                    const fieldId = `qrisk-sbp-${index + 1}`;
                    
                    const validationResult = this.validateValue(reading, 'sbp', {
                        calculator: 'qrisk'
                    });
                    
                    if (!validationResult.isValid) {
                        errors[fieldId] = validationResult.message;
                    } else if (validationResult.warning) {
                        warnings[fieldId] = validationResult.warning;
                    }
                });
            }
            
            // Calculate isValid flag
            const isValid = Object.keys(errors).length === 0;
            
            // Display errors and warnings in UI if validation failed
            if (!isValid) {
                for (const [fieldId, errorMessage] of Object.entries(errors)) {
                    this.displayFieldError(form.id, fieldId, errorMessage);
                }
            }
            
            // Display warnings
            for (const [fieldId, warningMessage] of Object.entries(warnings)) {
                this.displayFieldWarning(form.id, fieldId, warningMessage);
            }
            
            // Publish validation result event
            if (!isValid) {
                EventBus.publish('validation-error', {
                    formId: form.id,
                    errors: errors,
                    message: 'QRISK3 validation failed'
                });
            } else {
                EventBus.publish('validation-success', {
                    formId: form.id,
                    warnings: warnings,
                    message: 'QRISK3 validation successful'
                });
            }
            
            return { 
                isValid, 
                errors, 
                warnings,
                data,
                normalizedData: this.getNormalizedFormData(form, allFields)
            };
        } catch (error) {
            this.logger.error('Error validating QRISK3 form:', error);
            
            // Publish error event
            EventBus.publish('validation-error', {
                formId: form?.id,
                error: error.message,
                stack: error.stack
            });
            
            return {
                isValid: false,
                errors: { general: `Validation error: ${error.message}` }
            };
        }
    }
    
    /**
     * Validate a medication evaluation form
     * @param {HTMLFormElement} form - Form element to validate
     * @returns {Object} Validation result with isValid flag and errors
     * @public
     */
    validateMedicationForm(form) {
        try {
            if (!form) {
                return { isValid: false, errors: { general: 'Form not found' } };
            }
            
            const formData = new FormData(form);
            const data = {};
            const errors = {};
            const warnings = {};
            
            // Extract form data
            for (const [name, value] of formData.entries()) {
                data[name] = value;
            }
            
            // Define fields to validate - most are optional in medication form
            const fieldsToValidate = {
                'patient-age': { field: 'age' },
                'patient-sex': { field: 'sex' },
                'patient-height': { field: 'height', unitField: 'height-unit' },
                'patient-weight': { field: 'weight', unitField: 'weight-unit' },
                'patient-bmi': { field: 'bmi' },
                'systolic-bp': { field: 'sbp' },
                'diastolic-bp': { field: 'dbp' },
                'total-cholesterol': { field: 'totalCholesterol', unitField: 'cholesterol-unit' },
                'hdl-cholesterol': { field: 'hdl', unitField: 'cholesterol-unit' },
                'ldl-cholesterol': { field: 'ldl', unitField: 'cholesterol-unit' },
                'triglycerides': { field: 'triglycerides', unitField: 'cholesterol-unit' },
                'lipoprotein-a': { field: 'lpa', unitField: 'lpa-unit' },
                'apolipoprotein-b': { field: 'apoB', unitField: 'apob-unit' },
                'has-diabetes': { field: 'booleanParam' },
                'diabetes-type': { field: 'diabetes' },
                'is-smoker': { field: 'booleanParam' },
                'has-family-history': { field: 'booleanParam' },
                'has-ckd': { field: 'booleanParam' },
                'has-af': { field: 'booleanParam' },
                'has-ra': { field: 'booleanParam' }
            };
            
            // Validate all fields
            for (const [fieldId, validation] of Object.entries(fieldsToValidate)) {
                // Skip if not present in the form
                if (!(fieldId in data)) continue;
                
                const value = data[fieldId];
                
                // Skip empty fields
                if (!value || value === '') {
                    continue;
                }
                
                const unitField = validation.unitField ? data[validation.unitField] : null;
                
                // Validate field
                const validationResult = this.validateValue(value, validation.field, {
                    unit: unitField
                });
                
                if (!validationResult.isValid) {
                    errors[fieldId] = validationResult.message;
                } else if (validationResult.warning) {
                    warnings[fieldId] = validationResult.warning;
                }
                
                // Store normalized value if available
                if (validationResult.normalizedValue !== undefined) {
                    data[fieldId] = validationResult.normalizedValue;
                }
                
                // Store unit conversion if available
                if (validationResult.convertedValue !== undefined && validationResult.convertedUnit !== undefined) {
                    data[`${fieldId}_converted`] = validationResult.convertedValue;
                    data[`${fieldId}_converted_unit`] = validationResult.convertedUnit;
                }
            }
            
            // Medication-specific validations
            
            // If diabetes is checked, diabetes type should be selected
            if (data['has-diabetes'] === 'true' || data['has-diabetes'] === 'on') {
                if (!data['diabetes-type'] || data['diabetes-type'] === '') {
                    errors['diabetes-type'] = 'Please select diabetes type';
                }
            }
            
            // If smoker is checked, smoking status should be selected
            if (data['is-smoker'] === 'true' || data['is-smoker'] === 'on') {
                if (!data['smoking-status'] || data['smoking-status'] === '') {
                    errors['smoking-status'] = 'Please select smoking status';
                }
            }
            
            // Validate medication doses and duration if provided
            const medicationFields = Object.keys(data).filter(name => name.startsWith('bp-med-') || name.startsWith('lipid-med-'));
            
            medicationFields.forEach(fieldId => {
                // If medication name is provided, the dose should be too
                if (data[fieldId] && fieldId.includes('-med-') && !fieldId.includes('-dose') && !fieldId.includes('-duration')) {
                    const doseFieldId = fieldId.replace('-med-', '-med-dose-');
                    
                    if (data[fieldId] !== '' && (!data[doseFieldId] || data[doseFieldId] === '')) {
                        errors[doseFieldId] = 'Please provide the medication dose';
                    }
                    
                    // Validate duration if provided
                    const durationFieldId = fieldId.replace('-med-', '-med-duration-');
                    
                    if (data[durationFieldId] && data[durationFieldId] !== '') {
                        const duration = parseFloat(data[durationFieldId]);
                        
                        if (isNaN(duration) || duration < 0 || duration > 600) {
                            errors[durationFieldId] = 'Duration must be between 0 and 600 months';
                        }
                    }
                }
            });
            
            // Calculate isValid flag
            const isValid = Object.keys(errors).length === 0;
            
            // Display errors and warnings in UI if validation failed
            if (!isValid) {
                for (const [fieldId, errorMessage] of Object.entries(errors)) {
                    this.displayFieldError(form.id, fieldId, errorMessage);
                }
            }
            
            // Display warnings
            for (const [fieldId, warningMessage] of Object.entries(warnings)) {
                this.displayFieldWarning(form.id, fieldId, warningMessage);
            }
            
            // Publish validation result event
            if (!isValid) {
                EventBus.publish('validation-error', {
                    formId: form.id,
                    errors: errors,
                    message: 'Medication form validation failed'
                });
            } else {
                EventBus.publish('validation-success', {
                    formId: form.id,
                    warnings: warnings,
                    message: 'Medication form validation successful'
                });
            }
            
            return { 
                isValid, 
                errors, 
                warnings,
                data,
                normalizedData: this.getNormalizedFormData(form, fieldsToValidate)
            };
        } catch (error) {
            this.logger.error('Error validating medication form:', error);
            
            // Publish error event
            EventBus.publish('validation-error', {
                formId: form?.id,
                error: error.message,
                stack: error.stack
            });
            
            return {
                isValid: false,
                errors: { general: `Validation error: ${error.message}` }
            };
        }
    }
    
    /**
     * Get normalized form data based on field definitions
     * @param {HTMLFormElement} form - Form element
     * @param {Object} fields - Field definitions
     * @returns {Object} Normalized form data
     * @private
     */
    getNormalizedFormData(form, fields) {
        try {
            const formData = new FormData(form);
            const normalizedData = {};
            
            // Create field map for easy lookup
            const fieldMap = {};
            for (const [fieldId, validation] of Object.entries(fields)) {
                const fieldName = fieldId.replace(/^(frs|qrisk)-/, '').replace(/-/g, '_');
                fieldMap[fieldId] = {
                    type: validation.field,
                    name: fieldName,
                    unitField: validation.unitField
                };
            }
            
            // Process form data
            for (const [name, value] of formData.entries()) {
                // Skip empty values
                if (!value || value === '') continue;
                
                // Find field definition
                const fieldDef = fieldMap[name];
                if (!fieldDef) continue;
                
                // Get unit if applicable
                const unit = fieldDef.unitField ? formData.get(fieldDef.unitField) : null;
                
                // Validate and normalize value
                const validationResult = this.validateValue(value, fieldDef.type, { unit });
                
                if (validationResult.isValid) {
                    // Use normalized value if available
                    if (validationResult.normalizedValue !== undefined) {
                        normalizedData[fieldDef.name] = validationResult.normalizedValue;
                    } else {
                        normalizedData[fieldDef.name] = value;
                    }
                    
                    // Add unit if applicable
                    if (unit) {
                        normalizedData[`${fieldDef.name}_unit`] = unit;
                    }
                    
                    // Add converted value if available
                    if (validationResult.convertedValue !== undefined && validationResult.convertedUnit !== undefined) {
                        normalizedData[`${fieldDef.name}_converted`] = validationResult.convertedValue;
                        normalizedData[`${fieldDef.name}_converted_unit`] = validationResult.convertedUnit;
                    }
                }
            }
            
            // Process checkboxes (may not be in formData if unchecked)
            const checkboxes = form.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                const fieldDef = fieldMap[checkbox.id];
                if (fieldDef) {
                    normalizedData[fieldDef.name] = checkbox.checked;
                }
            });
            
            return normalizedData;
        } catch (error) {
            this.logger.error('Error normalizing form data:', error);
            return {};
        }
    }
    
    /**
     * Validate a single value
     * Enhanced with unit conversions, format recognition, and clinical validation
     * 
     * @param {*} value - Value to validate
     * @param {string} fieldType - Type of field
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     * @public
     */
    validateValue(value, fieldType, options = {}) {
        try {
            // Set default options
            const defaultOptions = {
                unit: null,
                calculator: null,
                allowOutliers: false
            };
            
            options = { ...defaultOptions, ...options };
            
            // Sanitize input
            let sanitizedValue = value;
            if (typeof value === 'string') {
                sanitizedValue = this.sanitizer.sanitizeInput(value);
            }
            
            // Try to auto-detect format and convert if needed
            if (typeof sanitizedValue === 'string') {
                const formatResult = this._detectFormat(sanitizedValue, fieldType);
                if (formatResult) {
                    sanitizedValue = formatResult.value;
                    options.unit = formatResult.unit || options.unit;
                }
            }
            
            // Get validation rules for the field
            let validationRules;
            if (fieldType === 'totalCholesterol' || fieldType === 'ldl' || 
                fieldType === 'hdl' || fieldType === 'triglycerides' || fieldType === 'nonHdl') {
                // For lipid parameters, use appropriate rules based on unit
                const unitSuffix = (options.unit === 'mg/dL' || options.unit === 'mg/dl') ? '_mg' : '_mmol';
                validationRules = this.validationRanges[`${fieldType}${unitSuffix}`];
            } else if (fieldType === 'lpa') {
                // For Lp(a), use appropriate rules based on unit
                const unitSuffix = (options.unit === 'nmol/L' || options.unit === 'nmol/l') ? '_nmol' : '_mg';
                validationRules = this.validationRanges[`lpa${unitSuffix}`];
            } else if (fieldType === 'apoB') {
                // For ApoB, use appropriate rules based on unit
                const unitSuffix = (options.unit === 'mg/dL' || options.unit === 'mg/dl') ? '_mg' : '_g';
                validationRules = this.validationRanges[`apoB${unitSuffix}`];
            } else if (fieldType === 'hba1c') {
                // For HbA1c, use appropriate rules based on unit
                const unitSuffix = (options.unit === 'mmol/mol') ? '_mmol' : '_percent';
                validationRules = this.validationRanges[`hba1c${unitSuffix}`];
            } else if (fieldType === 'glucose') {
                // For glucose, use appropriate rules based on unit
                const unitSuffix = (options.unit === 'mg/dL' || options.unit === 'mg/dl') ? '_mg' : '_mmol';
                validationRules = this.validationRanges[`glucose${unitSuffix}`];
            } else if (fieldType === 'creatinine') {
                // For creatinine, use appropriate rules based on unit
                const unitSuffix = (options.unit === 'mg/dL' || options.unit === 'mg/dl') ? '_mg' : '_umol';
                validationRules = this.validationRanges[`creatinine${unitSuffix}`];
            } else {
                // For other parameters, use the fieldType directly
                validationRules = this.validationRanges[fieldType];
            }
            
            // If no rules found, return error
            if (!validationRules) {
                return {
                    isValid: false,
                    message: `Unknown field type: ${fieldType}`
                };
            }
            
            // For binary parameters, convert to boolean
            if (fieldType === 'booleanParam') {
                const booleanResult = this._validateBooleanParameter(sanitizedValue);
                
                if (!booleanResult.isValid) {
                    return booleanResult;
                }
                
                return {
                    isValid: true,
                    normalizedValue: booleanResult.value
                };
            }
            
            // For sex parameter
            if (fieldType === 'sex') {
                const sexResult = this._validateSexParameter(sanitizedValue);
                
                if (!sexResult.isValid) {
                    return sexResult;
                }
                
                return {
                    isValid: true,
                    normalizedValue: sexResult.value
                };
            }
            
            // For ethnicity parameter
            if (fieldType === 'ethnicity') {
                const ethnicityResult = this._validateEthnicityParameter(sanitizedValue);
                
                if (!ethnicityResult.isValid) {
                    return ethnicityResult;
                }
                
                return {
                    isValid: true,
                    normalizedValue: ethnicityResult.value
                };
            }
            
            // For diabetes parameter
            if (fieldType === 'diabetes') {
                const diabetesResult = this._validateDiabetesParameter(sanitizedValue);
                
                if (!diabetesResult.isValid) {
                    return diabetesResult;
                }
                
                return {
                    isValid: true,
                    normalizedValue: diabetesResult.value
                };
            }
            
            // For smoking parameter
            if (fieldType === 'smoking') {
                const smokingResult = this._validateSmokingParameter(sanitizedValue);
                
                if (!smokingResult.isValid) {
                    return smokingResult;
                }
                
                return {
                    isValid: true,
                    normalizedValue: smokingResult.value
                };
            }
            
            // For numeric parameters
            if (validationRules.dataType === 'integer' || validationRules.dataType === 'float') {
                const numericResult = this._validateNumericParameter(sanitizedValue, validationRules, options);
                
                if (!numericResult.isValid) {
                    return numericResult;
                }
                
                // Return with any unit conversions
                const result = {
                    isValid: true,
                    normalizedValue: numericResult.value
                };
                
                // Add warning if outside clinical range
                if (numericResult.warning) {
                    result.warning = numericResult.warning;
                }
                
                // If a unit is provided, add converted value
                if (options.unit && validationRules.units) {
                    const conversionResult = this._convertUnits(numericResult.value, options.unit, validationRules.defaultUnit, fieldType);
                    
                    if (conversionResult.isValid) {
                        result.convertedValue = conversionResult.value;
                        result.convertedUnit = conversionResult.unit;
                    }
                }
                
                return result;
            }
            
            // For string parameters with options
            if (validationRules.options) {
                const optionResult = this._validateOptionParameter(sanitizedValue, validationRules);
                
                if (!optionResult.isValid) {
                    return optionResult;
                }
                
                return {
                    isValid: true,
                    normalizedValue: optionResult.value
                };
            }
            
            // Default validation - just return as is
            return {
                isValid: true,
                normalizedValue: sanitizedValue
            };
        } catch (error) {
            this.logger.error('Error validating value:', error);
            return {
                isValid: false,
                message: `Validation error: ${error.message}`
            };
        }
    }
    
    /**
     * Detect format of a string value
     * @param {string} value - Value to detect format of
     * @param {string} fieldType - Type of field
     * @returns {Object|null} Detected format result
     * @private
     */
    _detectFormat(value, fieldType) {
        try {
            // Check for height format with unit
            if (fieldType === 'height') {
                // Try feet and inches format first
                const feetInchesResult = this.valueConverters.height.feetInches(value);
                if (feetInchesResult) {
                    return feetInchesResult;
                }
                
                // Try with unit format
                const withUnitResult = this.valueConverters.height.withUnit(value);
                if (withUnitResult) {
                    return withUnitResult;
                }
            }
            
            // Check for weight format with unit
            if (fieldType === 'weight') {
                const withUnitResult = this.valueConverters.weight.withUnit(value);
                if (withUnitResult) {
                    return withUnitResult;
                }
            }
            
            // Check for blood pressure format
            if (fieldType === 'sbp' || fieldType === 'dbp') {
                const bpResult = this.valueConverters.bp.withSlash(value);
                if (bpResult) {
                    // Return appropriate value based on field type
                    return {
                        value: fieldType === 'sbp' ? bpResult.systolic : bpResult.diastolic
                    };
                }
            }
            
            // Check for cholesterol format with unit
            if (fieldType === 'totalCholesterol' || fieldType === 'ldl' || 
                fieldType === 'hdl' || fieldType === 'triglycerides' || 
                fieldType === 'nonHdl') {
                const cholResult = this.valueConverters.cholesterol.withUnit(value);
                if (cholResult) {
                    return cholResult;
                }
            }
            
            // No special format detected
            return null;
        } catch (error) {
            this.logger.error('Error detecting format:', error);
            return null;
        }
    }
    
    /**
     * Validate a boolean parameter
     * @param {*} value - Value to validate
     * @returns {Object} Validation result
     * @private
     */
    _validateBooleanParameter(value) {
        const validationRules = this.validationRanges.booleanParam;
        
        // Check if valid option
        const normalizedValue = value.toString().toLowerCase();
        
        if (validationRules.options.includes(normalizedValue)) {
            // Direct match
            return {
                isValid: true,
                value: normalizedValue === 'true' || 
                      normalizedValue === 'yes' || 
                      normalizedValue === '1' || 
                      normalizedValue === 1 || 
                      value === true
            };
        } else if (normalizedValue in validationRules.alternateValues) {
            // Alternate value
            return {
                isValid: true,
                value: validationRules.alternateValues[normalizedValue]
            };
        } else {
            // Invalid value
            return {
                isValid: false,
                message: validationRules.errorMsg
            };
        }
    }
    
    /**
     * Validate a sex parameter
     * @param {*} value - Value to validate
     * @returns {Object} Validation result
     * @private
     */
    _validateSexParameter(value) {
        const validationRules = this.validationRanges.sex;
        
        // Normalize to lowercase string
        const normalizedValue = value.toString().toLowerCase();
        
        // Direct match to options
        if (validationRules.options.includes(normalizedValue)) {
            return {
                isValid: true,
                value: normalizedValue
            };
        }
        
        // Check for alternate values
        if (normalizedValue in validationRules.alternateValues) {
            return {
                isValid: true,
                value: validationRules.alternateValues[normalizedValue]
            };
        }
        
        // Invalid value
        return {
            isValid: false,
            message: validationRules.errorMsg
        };
    }
    
    /**
     * Validate an ethnicity parameter
     * @param {*} value - Value to validate
     * @returns {Object} Validation result
     * @private
     */
    _validateEthnicityParameter(value) {
        const validationRules = this.validationRanges.ethnicity;
        
        // Normalize to lowercase string
        const normalizedValue = value.toString().toLowerCase();
        
        // Direct match to options
        if (validationRules.options.includes(normalizedValue)) {
            return {
                isValid: true,
                value: normalizedValue
            };
        }
        
        // Check for alternate values
        if (normalizedValue in validationRules.alternateValues) {
            return {
                isValid: true,
                value: validationRules.alternateValues[normalizedValue]
            };
        }
        
        // Invalid value
        return {
            isValid: false,
            message: validationRules.errorMsg
        };
    }
    
    /**
     * Validate a diabetes parameter
     * @param {*} value - Value to validate
     * @returns {Object} Validation result
     * @private
     */
    _validateDiabetesParameter(value) {
        const validationRules = this.validationRanges.diabetes;
        
        // Normalize to lowercase string
        const normalizedValue = value.toString().toLowerCase();
        
        // Direct match to options
        if (validationRules.options.includes(normalizedValue)) {
            return {
                isValid: true,
                value: normalizedValue
            };
        }
        
        // Check for alternate values
        if (normalizedValue in validationRules.alternateValues) {
            return {
                isValid: true,
                value: validationRules.alternateValues[normalizedValue]
            };
        }
        
        // Invalid value
        return {
            isValid: false,
            message: validationRules.errorMsg
        };
    }
    
    /**
     * Validate a smoking parameter
     * @param {*} value - Value to validate
     * @returns {Object} Validation result
     * @private
     */
    _validateSmokingParameter(value) {
        const validationRules = this.validationRanges.smoking;
        
        // Normalize to lowercase string
        const normalizedValue = value.toString().toLowerCase();
        
        // Direct match to options
        if (validationRules.options.includes(normalizedValue)) {
            return {
                isValid: true,
                value: normalizedValue
            };
        }
        
        // Check for alternate values
        if (normalizedValue in validationRules.alternateValues) {
            return {
                isValid: true,
                value: validationRules.alternateValues[normalizedValue]
            };
        }
        
        // Invalid value
        return {
            isValid: false,
            message: validationRules.errorMsg
        };
    }
    
    /**
     * Validate a numeric parameter
     * @param {*} value - Value to validate
     * @param {Object} rules - Validation rules
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     * @private
     */
    _validateNumericParameter(value, rules, options) {
        let numericValue;
        
        // Convert to number
        if (typeof value === 'string') {
            numericValue = rules.dataType === 'integer' ? parseInt(value, 10) : parseFloat(value);
        } else {
            numericValue = value;
        }
        
        // Check if numeric
        if (isNaN(numericValue)) {
            return {
                isValid: false,
                message: `Must be a valid number`
            };
        }
        
        // Round to integer if required
        if (rules.dataType === 'integer') {
            numericValue = Math.round(numericValue);
        }
        
        // Check min/max
        if (rules.min !== undefined && numericValue < rules.min) {
            return {
                isValid: false,
                message: rules.errorMsg || `Value must be at least ${rules.min}`
            };
        }
        
        if (rules.max !== undefined && numericValue > rules.max) {
            return {
                isValid: false,
                message: rules.errorMsg || `Value must be at most ${rules.max}`
            };
        }
        
        // Check calculator-specific limits
        if (options.calculator === 'framingham') {
            if (rules.framinghamValidMin !== undefined && numericValue < rules.framinghamValidMin) {
                return {
                    isValid: false,
                    message: `For Framingham Risk Score, ${rules.errorMsg || `value must be at least ${rules.framinghamValidMin}`}`
                };
            }
            
            if (rules.framinghamValidMax !== undefined && numericValue > rules.framinghamValidMax) {
                return {
                    isValid: false,
                    message: `For Framingham Risk Score, ${rules.errorMsg || `value must be at most ${rules.framinghamValidMax}`}`
                };
            }
        } else if (options.calculator === 'qrisk') {
            if (rules.qriskValidMin !== undefined && numericValue < rules.qriskValidMin) {
                return {
                    isValid: false,
                    message: `For QRISK3, ${rules.errorMsg || `value must be at least ${rules.qriskValidMin}`}`
                };
            }
            
            if (rules.qriskValidMax !== undefined && numericValue > rules.qriskValidMax) {
                return {
                    isValid: false,
                    message: `For QRISK3, ${rules.errorMsg || `value must be at most ${rules.qriskValidMax}`}`
                };
            }
        }
        
        // Check clinical ranges if not allowing outliers
        let warning = null;
        if (!options.allowOutliers) {
            if (rules.clinicalValidMin !== undefined && numericValue < rules.clinicalValidMin) {
                warning = rules.warningMsg || `Value ${numericValue} is below typical clinical range (${rules.clinicalValidMin})`;
            } else if (rules.clinicalValidMax !== undefined && numericValue > rules.clinicalValidMax) {
                warning = rules.warningMsg || `Value ${numericValue} is above typical clinical range (${rules.clinicalValidMax})`;
            }
        }
        
        return {
            isValid: true,
            value: numericValue,
            warning
        };
    }
    
    /**
     * Validate an option parameter
     * @param {*} value - Value to validate
     * @param {Object} rules - Validation rules
     * @returns {Object} Validation result
     * @private
     */
    _validateOptionParameter(value, rules) {
        // Normalize to lowercase string
        const normalizedValue = value.toString().toLowerCase();
        
        // Direct match to options
        if (rules.options.includes(normalizedValue)) {
            return {
                isValid: true,
                value: normalizedValue
            };
        }
        
        // Check for alternate values if defined
        if (rules.alternateValues && normalizedValue in rules.alternateValues) {
            return {
                isValid: true,
                value: rules.alternateValues[normalizedValue]
            };
        }
        
        // Invalid value
        return {
            isValid: false,
            message: rules.errorMsg || `Must be one of: ${rules.options.join(', ')}`
        };
    }
    
    /**
     * Convert units
     * @param {number} value - Value to convert
     * @param {string} fromUnit - Source unit
     * @param {string} toUnit - Target unit
     * @param {string} fieldType - Type of field
     * @returns {Object} Conversion result
     * @private
     */
    _convertUnits(value, fromUnit, toUnit, fieldType) {
        try {
            // If units are the same, no conversion needed
            if (fromUnit === toUnit) {
                return {
                    isValid: true,
                    value: value,
                    unit: fromUnit
                };
            }
            
            // Perform conversion based on field type
            let convertedValue;
            
            switch (fieldType) {
                case 'height':
                    if (fromUnit === 'in' && toUnit === 'cm') {
                        convertedValue = value * 2.54;
                    } else if (fromUnit === 'cm' && toUnit === 'in') {
                        convertedValue = value / 2.54;
                    } else {
                        throw new Error(`Unsupported unit conversion: ${fromUnit} to ${toUnit}`);
                    }
                    break;
                    
                case 'weight':
                    if (fromUnit === 'lb' && toUnit === 'kg') {
                        convertedValue = value * 0.453592;
                    } else if (fromUnit === 'kg' && toUnit === 'lb') {
                        convertedValue = value / 0.453592;
                    } else {
                        throw new Error(`Unsupported unit conversion: ${fromUnit} to ${toUnit}`);
                    }
                    break;
                    
                case 'totalCholesterol':
                case 'ldl':
                case 'hdl':
                case 'triglycerides':
                case 'nonHdl':
                    if ((fromUnit === 'mg/dL' || fromUnit === 'mg/dl') && (toUnit === 'mmol/L' || toUnit === 'mmol/l')) {
                        // Convert from mg/dL to mmol/L
                        const conversionFactor = fieldType === 'triglycerides' ? 0.01129 : 0.02586;
                        convertedValue = value * conversionFactor;
                    } else if ((fromUnit === 'mmol/L' || fromUnit === 'mmol/l') && (toUnit === 'mg/dL' || toUnit === 'mg/dl')) {
                        // Convert from mmol/L to mg/dL
                        const conversionFactor = fieldType === 'triglycerides' ? 88.57 : 38.67;
                        convertedValue = value * conversionFactor;
                    } else {
                        throw new Error(`Unsupported unit conversion: ${fromUnit} to ${toUnit}`);
                    }
                    break;
                    
                case 'lpa':
                    if (fromUnit === 'mg/dL' && toUnit === 'nmol/L') {
                        // Convert from mg/dL to nmol/L (approximate conversion)
                        convertedValue = value * 2.5;
                    } else if (fromUnit === 'nmol/L' && toUnit === 'mg/dL') {
                        // Convert from nmol/L to mg/dL (approximate conversion)
                        convertedValue = value / 2.5;
                    } else {
                        throw new Error(`Unsupported unit conversion: ${fromUnit} to ${toUnit}`);
                    }
                    break;
                    
                case 'apoB':
                    if (fromUnit === 'mg/dL' && toUnit === 'g/L') {
                        // Convert from mg/dL to g/L
                        convertedValue = value / 100;
                    } else if (fromUnit === 'g/L' && toUnit === 'mg/dL') {
                        // Convert from g/L to mg/dL
                        convertedValue = value * 100;
                    } else {
                        throw new Error(`Unsupported unit conversion: ${fromUnit} to ${toUnit}`);
                    }
                    break;
                    
                case 'hba1c':
                    if (fromUnit === '%' && toUnit === 'mmol/mol') {
                        // Convert from % to mmol/mol
                        convertedValue = (value - 2.15) * 10.929;
                    } else if (fromUnit === 'mmol/mol' && toUnit === '%') {
                        // Convert from mmol/mol to %
                        convertedValue = (value / 10.929) + 2.15;
                    } else {
                        throw new Error(`Unsupported unit conversion: ${fromUnit} to ${toUnit}`);
                    }
                    break;
                    
                case 'glucose':
                    if (fromUnit === 'mg/dL' && toUnit === 'mmol/L') {
                        // Convert from mg/dL to mmol/L
                        convertedValue = value * 0.0555;
                    } else if (fromUnit === 'mmol/L' && toUnit === 'mg/dL') {
                        // Convert from mmol/L to mg/dL
                        convertedValue = value * 18.02;
                    } else {
                        throw new Error(`Unsupported unit conversion: ${fromUnit} to ${toUnit}`);
                    }
                    break;
                    
                case 'creatinine':
                    if (fromUnit === 'mg/dL' && toUnit === 'umol/L') {
                        // Convert from mg/dL to umol/L
                        convertedValue = value * 88.4;
                    } else if (fromUnit === 'umol/L' && toUnit === 'mg/dL') {
                        // Convert from umol/L to mg/dL
                        convertedValue = value / 88.4;
                    } else {
                        throw new Error(`Unsupported unit conversion: ${fromUnit} to ${toUnit}`);
                    }
                    break;
                    
                default:
                    throw new Error(`Unsupported field type for unit conversion: ${fieldType}`);
            }
            
            // Round to reasonable precision
            if (fieldType === 'height' || fieldType === 'weight') {
                convertedValue = Math.round(convertedValue * 10) / 10;
            } else if (fieldType === 'totalCholesterol' || fieldType === 'ldl' || 
                      fieldType === 'hdl' || fieldType === 'triglycerides' || 
                      fieldType === 'nonHdl' || fieldType === 'apoB') {
                if (toUnit === 'mmol/L' || toUnit === 'mmol/l' || toUnit === 'g/L') {
                    convertedValue = Math.round(convertedValue * 100) / 100;
                } else {
                    convertedValue = Math.round(convertedValue);
                }
            } else if (fieldType === 'lpa') {
                if (toUnit === 'mg/dL') {
                    convertedValue = Math.round(convertedValue * 10) / 10;
                } else {
                    convertedValue = Math.round(convertedValue);
                }
            } else if (fieldType === 'hba1c') {
                if (toUnit === '%') {
                    convertedValue = Math.round(convertedValue * 10) / 10;
                } else {
                    convertedValue = Math.round(convertedValue);
                }
            } else {
                convertedValue = Math.round(convertedValue * 100) / 100;
            }
            
            return {
                isValid: true,
                value: convertedValue,
                unit: toUnit
            };
        } catch (error) {
            this.logger.error('Error converting units:', error);
            return {
                isValid: false,
                message: `Unit conversion error: ${error.message}`
            };
        }
    }
    
    /**
     * Calculate standard deviation for blood pressure readings
     * @param {Array<number>} readings - Array of BP readings
     * @returns {Object} Calculation result
     * @public
     */
    calculateBPStandardDeviation(readings) {
        try {
            // Filter out invalid values
            const validReadings = readings.filter(reading => !isNaN(parseFloat(reading)));
            
            // Need at least 2 readings
            if (validReadings.length < 2) {
                return {
                    isValid: false,
                    message: 'At least 2 valid readings are required'
                };
            }
            
            // Convert to numbers
            const numericReadings = validReadings.map(reading => parseFloat(reading));
            
            // Calculate mean
            const mean = numericReadings.reduce((sum, reading) => sum + reading, 0) / numericReadings.length;
            
            // Calculate sum of squared differences
            const sumSquaredDiffs = numericReadings.reduce((sum, reading) => {
                return sum + Math.pow(reading - mean, 2);
            }, 0);
            
            // Calculate standard deviation
            const sd = Math.sqrt(sumSquaredDiffs / numericReadings.length);
            
            // Round to 1 decimal place
            const roundedSD = Math.round(sd * 10) / 10;
            
            return {
                isValid: true,
                standardDeviation: roundedSD,
                mean: Math.round(mean),
                readings: numericReadings,
                count: numericReadings.length
            };
        } catch (error) {
            this.logger.error('Error calculating BP standard deviation:', error);
            return {
                isValid: false,
                message: `Calculation error: ${error.message}`
            };
        }
    }
    
    /**
     * Calculate cholesterol ratio from total and HDL
     * @param {number} totalCholesterol - Total cholesterol
     * @param {number} hdl - HDL cholesterol
     * @returns {Object} Calculation result
     * @public
     */
    calculateCholesterolRatio(totalCholesterol, hdl) {
        try {
            // Parse input values
            const tc = parseFloat(totalCholesterol);
            const hdlVal = parseFloat(hdl);
            
            // Validate inputs
            if (isNaN(tc) || isNaN(hdlVal)) {
                return {
                    isValid: false,
                    message: 'Invalid cholesterol values'
                };
            }
            
            if (hdlVal <= 0) {
                return {
                    isValid: false,
                    message: 'HDL must be greater than 0'
                };
            }
            
            // Calculate ratio
            const ratio = tc / hdlVal;
            
            // Round to 1 decimal place
            const roundedRatio = Math.round(ratio * 10) / 10;
            
            return {
                isValid: true,
                ratio: roundedRatio
            };
        } catch (error) {
            this.logger.error('Error calculating cholesterol ratio:', error);
            return {
                isValid: false,
                message: `Calculation error: ${error.message}`
            };
        }
    }
    
    /**
     * Calculate non-HDL cholesterol
     * @param {number} totalCholesterol - Total cholesterol
     * @param {number} hdl - HDL cholesterol
     * @returns {Object} Calculation result
     * @public
     */
    calculateNonHDL(totalCholesterol, hdl) {
        try {
            // Parse input values
            const tc = parseFloat(totalCholesterol);
            const hdlVal = parseFloat(hdl);
            
            // Validate inputs
            if (isNaN(tc) || isNaN(hdlVal)) {
                return {
                    isValid: false,
                    message: 'Invalid cholesterol values'
                };
            }
            
            // Calculate non-HDL
            const nonHDL = tc - hdlVal;
            
            // Round to 1 decimal place
            const roundedNonHDL = Math.round(nonHDL * 10) / 10;
            
            return {
                isValid: true,
                nonHDL: roundedNonHDL
            };
        } catch (error) {
            this.logger.error('Error calculating non-HDL cholesterol:', error);
            return {
                isValid: false,
                message: `Calculation error: ${error.message}`
            };
        }
    }
    
    /**
     * Calculate LDL using Friedewald formula
     * @param {number} totalCholesterol - Total cholesterol
     * @param {number} hdl - HDL cholesterol
     * @param {number} triglycerides - Triglycerides
     * @param {string} unit - Unit ('mmol/L' or 'mg/dL')
     * @returns {Object} Calculation result
     * @public
     */
    calculateLDL(totalCholesterol, hdl, triglycerides, unit = 'mmol/L') {
        try {
            // Parse input values
            const tc = parseFloat(totalCholesterol);
            const hdlVal = parseFloat(hdl);
            const tg = parseFloat(triglycerides);
            
            // Validate inputs
            if (isNaN(tc) || isNaN(hdlVal) || isNaN(tg)) {
                return {
                    isValid: false,
                    message: 'Invalid lipid values'
                };
            }
            
            // Avoid division by small values
            if (unit.toLowerCase() === 'mmol/l' && tg >= 4.5) {
                return {
                    isValid: false,
                    message: 'Friedewald formula is not valid for triglycerides ≥ 4.5 mmol/L'
                };
            } else if (unit.toLowerCase() === 'mg/dl' && tg >= 400) {
                return {
                    isValid: false,
                    message: 'Friedewald formula is not valid for triglycerides ≥ 400 mg/dL'
                };
            }
            
            // Calculate LDL based on unit
            let ldl;
            if (unit.toLowerCase() === 'mmol/l') {
                ldl = tc - hdlVal - (tg / 2.2);
            } else {
                ldl = tc - hdlVal - (tg / 5);
            }
            
            // Round to 1 decimal place
            const roundedLDL = Math.round(ldl * 10) / 10;
            
            return {
                isValid: true,
                ldl: roundedLDL
            };
        } catch (error) {
            this.logger.error('Error calculating LDL cholesterol:', error);
            return {
                isValid: false,
                message: `Calculation error: ${error.message}`
            };
        }
    }
    
    /**
     * Calculate BMI from height and weight
     * @param {number} height - Height
     * @param {string} heightUnit - Height unit ('cm' or 'in')
     * @param {number} weight - Weight
     * @param {string} weightUnit - Weight unit ('kg' or 'lb')
     * @returns {Object} Calculation result
     * @public
     */
    calculateBMI(height, heightUnit, weight, weightUnit) {
        try {
            // Parse input values
            const heightVal = parseFloat(height);
            const weightVal = parseFloat(weight);
            
            // Validate inputs
            if (isNaN(heightVal) || isNaN(weightVal)) {
                return {
                    isValid: false,
                    message: 'Invalid height or weight values'
                };
            }
            
            if (heightVal <= 0 || weightVal <= 0) {
                return {
                    isValid: false,
                    message: 'Height and weight must be greater than 0'
                };
            }
            
            // Convert to standard units (m and kg)
            let heightM, weightKg;
            
            if (heightUnit === 'in') {
                heightM = heightVal * 0.0254;
            } else {
                heightM = heightVal / 100;
            }
            
            if (weightUnit === 'lb') {
                weightKg = weightVal * 0.453592;
            } else {
                weightKg = weightVal;
            }
            
            // Calculate BMI
            const bmi = weightKg / (heightM * heightM);
            
            // Round to 1 decimal place
            const roundedBMI = Math.round(bmi * 10) / 10;
            
            return {
                isValid: true,
                bmi: roundedBMI,
                category: this._getBMICategory(roundedBMI)
            };
        } catch (error) {
            this.logger.error('Error calculating BMI:', error);
            return {
                isValid: false,
                message: `Calculation error: ${error.message}`
            };
        }
    }
    
    /**
     * Get BMI category
     * @param {number} bmi - BMI value
     * @returns {string} BMI category
     * @private
     */
    _getBMICategory(bmi) {
        if (bmi < 18.5) {
            return 'underweight';
        } else if (bmi < 25) {
            return 'normal';
        } else if (bmi < 30) {
            return 'overweight';
        } else if (bmi < 35) {
            return 'obese-1';
        } else if (bmi < 40) {
            return 'obese-2';
        } else {
            return 'obese-3';
        }
    }
    
    /**
     * Convert systolic blood pressure readings to a standard format with BP variability
     * @param {Array<number>} readings - Array of SBP readings
     * @returns {Object} Processed BP data
     * @public
     */
    processBPReadings(readings) {
        try {
            // Calculate average and standard deviation
            const sdResult = this.calculateBPStandardDeviation(readings);
            
            if (!sdResult.isValid) {
                return sdResult;
            }
            
            // Return formatted result
            return {
                isValid: true,
                averageSBP: sdResult.mean,
                sbpVariability: sdResult.standardDeviation,
                readings: sdResult.readings,
                count: sdResult.count
            };
        } catch (error) {
            this.logger.error('Error processing BP readings:', error);
            return {
                isValid: false,
                message: `Processing error: ${error.message}`
            };
        }
    }
}

export default CalculationValidator;