/**
 * Comprehensive Calculation Validation Module
 * @file /js/utils/calculation-validation.js
 * @description Validates inputs for cardiovascular risk calculators and ensures accuracy
 * @version 2.0.1
 * @author CVD Risk Assessment Team
 */

import { inputSanitizer } from './input-sanitizer.js';
import { eventBus } from './event-bus.js';

/**
 * CalculationValidator Class
 * Provides validation for inputs to cardiovascular risk calculators
 */
class CalculationValidator {
    constructor() {
        // Validation ranges with expanded tolerances
        this.validationRanges = {
            // Common parameters
            age: { min: 20, max: 120, required: true, errorMsg: "Age must be between 20 and 120 years" },
            sex: { required: true, options: ['male', 'female'], errorMsg: "Sex must be specified as male or female" },
            height: { min: 100, max: 250, errorMsg: "Height must be between 100 and 250 cm" },
            weight: { min: 20, max: 300, errorMsg: "Weight must be between 20 and 300 kg" },
            bmi: { min: 10, max: 70, errorMsg: "BMI must be between 10 and 70 kg/m²" },
            
            // Blood pressure parameters
            sbp: { min: 70, max: 250, required: true, errorMsg: "Systolic blood pressure must be between 70 and 250 mmHg" },
            dbp: { min: 40, max: 150, errorMsg: "Diastolic blood pressure must be between 40 and 150 mmHg" },
            
            // Lipid parameters - mmol/L
            totalCholesterol_mmol: { min: 1.0, max: 20.0, required: true, errorMsg: "Total cholesterol must be between 1.0 and 20.0 mmol/L" },
            ldl_mmol: { min: 0.5, max: 15.0, errorMsg: "LDL cholesterol must be between 0.5 and 15.0 mmol/L" },
            hdl_mmol: { min: 0.1, max: 5.0, required: true, errorMsg: "HDL cholesterol must be between 0.1 and 5.0 mmol/L" },
            triglycerides_mmol: { min: 0.2, max: 20.0, errorMsg: "Triglycerides must be between 0.2 and 20.0 mmol/L" },
            nonHdl_mmol: { min: 0.5, max: 18.0, errorMsg: "Non-HDL cholesterol must be between 0.5 and 18.0 mmol/L" },
            
            // Lipid parameters - mg/dL
            totalCholesterol_mg: { min: 50, max: 800, required: true, errorMsg: "Total cholesterol must be between 50 and 800 mg/dL" },
            ldl_mg: { min: 20, max: 600, errorMsg: "LDL cholesterol must be between 20 and 600 mg/dL" },
            hdl_mg: { min: 5, max: 200, required: true, errorMsg: "HDL cholesterol must be between 5 and 200 mg/dL" },
            triglycerides_mg: { min: 20, max: 1800, errorMsg: "Triglycerides must be between 20 and 1800 mg/dL" },
            nonHdl_mg: { min: 20, max: 700, errorMsg: "Non-HDL cholesterol must be between 20 and 700 mg/dL" },
            
            // Advanced lipid parameters
            apoB_g: { min: 0.1, max: 3.0, errorMsg: "Apolipoprotein B must be between 0.1 and 3.0 g/L" },
            apoB_mg: { min: 10, max: 300, errorMsg: "Apolipoprotein B must be between 10 and 300 mg/dL" },
            
            // Lipoprotein(a) parameters
            lpa_mg: { min: 0, max: 500, errorMsg: "Lipoprotein(a) must be between 0 and 500 mg/dL" },
            lpa_nmol: { min: 0, max: 1000, errorMsg: "Lipoprotein(a) must be between 0 and 1000 nmol/L" },
            
            // Diabetes parameters
            hba1c: { min: 3.0, max: 20.0, errorMsg: "HbA1c must be between 3.0 and 20.0%" },
            
            // Other parameters
            creatinine: { min: 20, max: 1500, errorMsg: "Creatinine must be between 20 and 1500 μmol/L" },
            egfr: { min: 0, max: 150, errorMsg: "eGFR must be between 0 and 150 mL/min/1.73 m²" },
            
            // QRISK3 specific parameters
            townsend: { min: -10, max: 15, errorMsg: "Townsend deprivation score must be between -10 and 15" }
        };
        
        // Framingham risk score specific validations
        this.framinghamValidation = {
            age: { min: 30, max: 79, required: true, errorMsg: "Framingham Risk Score is validated for ages 30 to 79 years" },
            // Additional FRS-specific validations
        };
        
        // QRISK3 specific validations
        this.qriskValidation = {
            age: { min: 25, max: 84, required: true, errorMsg: "QRISK3 is validated for ages 25 to 84 years" },
            // Additional QRISK3-specific validations
        };
        
        // Initialize validation error subscriptions
        this._initializeErrorHandling();
    }
    
    /**
     * Initialize error handling and event subscriptions
     * @private
     */
    _initializeErrorHandling() {
        // Subscribe to validation error events
        eventBus.subscribe('validation-error', (error) => {
            console.error('Calculation validation error:', error);
            
            // Display error in UI if available
            if (error.fieldId && error.formId) {
                this._displayFieldError(error.formId, error.fieldId, error.message);
            }
        });
    }
    
    /**
     * Display a validation error for a specific field
     * @param {string} formId - Form ID
     * @param {string} fieldId - Field ID
     * @param {string} errorMessage - Error message
     * @private
     */
    _displayFieldError(formId, fieldId, errorMessage) {
        // Find the form and field
        const form = document.getElementById(formId);
        const field = document.getElementById(fieldId);
        
        if (!form || !field) return;
        
        // Add error class to field
        field.classList.add('error');
        
        // Find or create error message container
        let errorContainer = document.getElementById(`${fieldId}-validation`);
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = `${fieldId}-validation`;
            errorContainer.className = 'error-message';
            field.parentNode.insertBefore(errorContainer, field.nextSibling);
        }
        
        // Set error message
        errorContainer.innerText = errorMessage;
        errorContainer.style.display = 'block';
        
        // Scroll to error if needed
        if (field.offsetParent) {
            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    /**
     * Clear validation errors for a form
     * @param {string} formId - Form ID
     * @public
     */
    clearValidationErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        // Remove error classes from fields
        const fields = form.querySelectorAll('.error');
        fields.forEach(field => {
            field.classList.remove('error');
        });
        
        // Hide error messages
        const errorMessages = form.querySelectorAll('.error-message');
        errorMessages.forEach(message => {
            message.style.display = 'none';
            message.innerText = '';
        });
    }
    
    /**
     * Validate a complete Framingham Risk Score form
     * @param {HTMLFormElement} form - Form element to validate
     * @returns {Object} Validation result with isValid flag and errors
     * @public
     */
    validateFraminghamForm(form) {
        if (!form) {
            return { isValid: false, errors: { general: 'Form not found' } };
        }
        
        const formData = new FormData(form);
        const data = {};
        const errors = {};
        
        // Extract form data
        for (const [name, value] of formData.entries()) {
            data[name] = value;
        }
        
        // Validate required fields
        const requiredFields = {
            'frs-age': this.framinghamValidation.age,
            'frs-sex': this.validationRanges.sex,
            'frs-sbp': this.validationRanges.sbp,
            'frs-total-chol': 'totalCholesterol',
            'frs-hdl': 'hdl',
            'frs-smoker': { required: true, errorMsg: "Smoking status is required" },
            'frs-diabetes': { required: true, errorMsg: "Diabetes status is required" }
        };
        
        for (const [fieldId, validation] of Object.entries(requiredFields)) {
            const value = data[fieldId];
            
            // Check if required field is empty
            if (typeof validation === 'object' && validation.required && (!value || value === '')) {
                errors[fieldId] = validation.errorMsg || `${fieldId} is required`;
                continue;
            }
            
            // Skip further validation if field is empty and not required
            if (!value || value === '') {
                continue;
            }
            
            // Validate numeric fields with ranges
            if (typeof validation === 'object' && ('min' in validation || 'max' in validation)) {
                const numValue = parseFloat(value);
                
                // Check if it's a valid number
                if (isNaN(numValue)) {
                    errors[fieldId] = `${fieldId} must be a valid number`;
                    continue;
                }
                
                // Check min/max range
                if ('min' in validation && numValue < validation.min) {
                    errors[fieldId] = validation.errorMsg || `${fieldId} must be at least ${validation.min}`;
                    continue;
                }
                
                if ('max' in validation && numValue > validation.max) {
                    errors[fieldId] = validation.errorMsg || `${fieldId} must not exceed ${validation.max}`;
                    continue;
                }
            }
            
            // Validate options for select fields
            if (typeof validation === 'object' && validation.options && validation.options.length > 0) {
                if (!validation.options.includes(value)) {
                    errors[fieldId] = validation.errorMsg || `${fieldId} must be one of: ${validation.options.join(', ')}`;
                    continue;
                }
            }
            
            // Special validation for lipid values based on units
            if (fieldId === 'frs-total-chol' || fieldId === 'frs-hdl' || fieldId === 'frs-ldl' || 
                fieldId === 'frs-trig' || fieldId === 'frs-nonhdl' || fieldId === 'frs-apob') {
                
                const unitFieldId = `${fieldId}-unit`;
                const unit = data[unitFieldId];
                
                // Determine validation range based on unit
                let rangeKey = null;
                if (fieldId === 'frs-total-chol') {
                    rangeKey = unit === 'mmol/L' ? 'totalCholesterol_mmol' : 'totalCholesterol_mg';
                } else if (fieldId === 'frs-hdl') {
                    rangeKey = unit === 'mmol/L' ? 'hdl_mmol' : 'hdl_mg';
                } else if (fieldId === 'frs-ldl') {
                    rangeKey = unit === 'mmol/L' ? 'ldl_mmol' : 'ldl_mg';
                } else if (fieldId === 'frs-trig') {
                    rangeKey = unit === 'mmol/L' ? 'triglycerides_mmol' : 'triglycerides_mg';
                } else if (fieldId === 'frs-nonhdl') {
                    rangeKey = unit === 'mmol/L' ? 'nonHdl_mmol' : 'nonHdl_mg';
                } else if (fieldId === 'frs-apob') {
                    rangeKey = unit === 'g/L' ? 'apoB_g' : 'apoB_mg';
                }
                
                // Apply validation if range exists
                if (rangeKey && this.validationRanges[rangeKey]) {
                    const range = this.validationRanges[rangeKey];
                    const numValue = parseFloat(value);
                    
                    if (isNaN(numValue)) {
                        errors[fieldId] = `${fieldId} must be a valid number`;
                        continue;
                    }
                    
                    if (numValue < range.min || numValue > range.max) {
                        errors[fieldId] = range.errorMsg;
                        continue;
                    }
                }
            }
            
            // Validate Lp(a) based on unit
            if (fieldId === 'frs-lpa' && value) {
                const unitFieldId = `${fieldId}-unit`;
                const unit = data[unitFieldId];
                
                const rangeKey = unit === 'mg/dL' ? 'lpa_mg' : 'lpa_nmol';
                const range = this.validationRanges[rangeKey];
                const numValue = parseFloat(value);
                
                if (isNaN(numValue)) {
                    errors[fieldId] = `${fieldId} must be a valid number`;
                    continue;
                }
                
                if (numValue < range.min || numValue > range.max) {
                    errors[fieldId] = range.errorMsg;
                    continue;
                }
            }
        }
        
        // Additional validation for specific scenarios
        if (data['frs-multiple-sbp'] === 'on') {
            // Validate multiple SBP readings if enabled
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
                const numReading = parseFloat(reading);
                
                if (isNaN(numReading)) {
                    errors[fieldId] = 'SBP reading must be a valid number';
                } else if (numReading < this.validationRanges.sbp.min || numReading > this.validationRanges.sbp.max) {
                    errors[fieldId] = this.validationRanges.sbp.errorMsg;
                }
            });
        }
        
        // Calculate isValid flag
        const isValid = Object.keys(errors).length === 0;
        
        // Display errors in UI if validation failed
        if (!isValid) {
            for (const [fieldId, errorMessage] of Object.entries(errors)) {
                this._displayFieldError(form.id, fieldId, errorMessage);
            }
            
            // Publish validation error event
            eventBus.publish('validation-error', {
                formId: form.id,
                errors: errors,
                message: 'Framingham Risk Score validation failed'
            });
        }
        
        return { isValid, errors, data };
    }
    
    /**
     * Validate a complete QRISK3 form
     * @param {HTMLFormElement} form - Form element to validate
     * @returns {Object} Validation result with isValid flag and errors
     * @public
     */
    validateQRISK3Form(form) {
        if (!form) {
            return { isValid: false, errors: { general: 'Form not found' } };
        }
        
        const formData = new FormData(form);
        const data = {};
        const errors = {};
        
        // Extract form data
        for (const [name, value] of formData.entries()) {
            data[name] = value;
        }
        
        // Validate required fields
        const requiredFields = {
            'qrisk-age': this.qriskValidation.age,
            'qrisk-sex': this.validationRanges.sex,
            'qrisk-ethnicity': { required: true, errorMsg: "Ethnicity is required" },
            'qrisk-sbp': this.validationRanges.sbp,
            'qrisk-total-chol': 'totalCholesterol',
            'qrisk-hdl': 'hdl',
            'qrisk-smoker': { required: true, errorMsg: "Smoking status is required" }
        };
        
        for (const [fieldId, validation] of Object.entries(requiredFields)) {
            const value = data[fieldId];
            
            // Check if required field is empty
            if (typeof validation === 'object' && validation.required && (!value || value === '')) {
                errors[fieldId] = validation.errorMsg || `${fieldId} is required`;
                continue;
            }
            
            // Skip further validation if field is empty and not required
            if (!value || value === '') {
                continue;
            }
            
            // Validate numeric fields with ranges
            if (typeof validation === 'object' && ('min' in validation || 'max' in validation)) {
                const numValue = parseFloat(value);
                
                // Check if it's a valid number
                if (isNaN(numValue)) {
                    errors[fieldId] = `${fieldId} must be a valid number`;
                    continue;
                }
                
                // Check min/max range
                if ('min' in validation && numValue < validation.min) {
                    errors[fieldId] = validation.errorMsg || `${fieldId} must be at least ${validation.min}`;
                    continue;
                }
                
                if ('max' in validation && numValue > validation.max) {
                    errors[fieldId] = validation.errorMsg || `${fieldId} must not exceed ${validation.max}`;
                    continue;
                }
            }
            
            // Validate options for select fields
            if (typeof validation === 'object' && validation.options && validation.options.length > 0) {
                if (!validation.options.includes(value)) {
                    errors[fieldId] = validation.errorMsg || `${fieldId} must be one of: ${validation.options.join(', ')}`;
                    continue;
                }
            }
            
            // Special validation for lipid values based on units
            if (fieldId === 'qrisk-total-chol' || fieldId === 'qrisk-hdl') {
                const unitFieldId = `${fieldId}-unit`;
                const unit = data[unitFieldId];
                
                // Determine validation range based on unit
                let rangeKey = null;
                if (fieldId === 'qrisk-total-chol') {
                    rangeKey = unit === 'mmol/L' ? 'totalCholesterol_mmol' : 'totalCholesterol_mg';
                } else if (fieldId === 'qrisk-hdl') {
                    rangeKey = unit === 'mmol/L' ? 'hdl_mmol' : 'hdl_mg';
                }
                
                // Apply validation if range exists
                if (rangeKey && this.validationRanges[rangeKey]) {
                    const range = this.validationRanges[rangeKey];
                    const numValue = parseFloat(value);
                    
                    if (isNaN(numValue)) {
                        errors[fieldId] = `${fieldId} must be a valid number`;
                        continue;
                    }
                    
                    if (numValue < range.min || numValue > range.max) {
                        errors[fieldId] = range.errorMsg;
                        continue;
                    }
                }
            }
        }
        
        // Validate Townsend score if provided
        if (data['qrisk-townsend']) {
            const townsend = parseFloat(data['qrisk-townsend']);
            const range = this.validationRanges.townsend;
            
            if (isNaN(townsend)) {
                errors['qrisk-townsend'] = 'Townsend score must be a valid number';
            } else if (townsend < range.min || townsend > range.max) {
                errors['qrisk-townsend'] = range.errorMsg;
            }
        }
        
        // Additional validation for multiple SBP readings if enabled
        if (data['qrisk-multiple-sbp'] === 'on') {
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
                const numReading = parseFloat(reading);
                
                if (isNaN(numReading)) {
                    errors[fieldId] = 'SBP reading must be a valid number';
                } else if (numReading < this.validationRanges.sbp.min || numReading > this.validationRanges.sbp.max) {
                    errors[fieldId] = this.validationRanges.sbp.errorMsg;
                }
            });
        }
        
        // Calculate isValid flag
        const isValid = Object.keys(errors).length === 0;
        
        // Display errors in UI if validation failed
        if (!isValid) {
            for (const [fieldId, errorMessage] of Object.entries(errors)) {
                this._displayFieldError(form.id, fieldId, errorMessage);
            }
            
            // Publish validation error event
            eventBus.publish('validation-error', {
                formId: form.id,
                errors: errors,
                message: 'QRISK3 validation failed'
            });
        }
        
        return { isValid, errors, data };
    }
    
    /**
     * Validate a medication evaluation form
     * @param {HTMLFormElement} form - Form element to validate
     * @returns {Object} Validation result with isValid flag and errors
     * @public
     */
    validateMedicationForm(form) {
        if (!form) {
            return { isValid: false, errors: { general: 'Form not found' } };
        }
        
        const formData = new FormData(form);
        const data = {};
        const errors = {};
        
        // Extract form data
        for (const [name, value] of formData.entries()) {
            data[name] = value;
        }
        
        // Define fields to validate - most are optional in medication form
        const fieldsToValidate = {
            'med-age': this.validationRanges.age,
            'med-ldl': 'ldl',
            'med-total-chol': 'totalCholesterol',
            'med-hdl': 'hdl',
            'med-trig': 'triglycerides',
            'med-nonhdl': 'nonHdl',
            'med-apob': 'apoB',
            'med-lpa': 'lpa'
        };
        
        for (const [fieldId, validation] of Object.entries(fieldsToValidate)) {
            const value = data[fieldId];
            
            // Skip validation if field is empty (most fields optional in medication form)
            if (!value || value === '') {
                continue;
            }
            
            // Validate numeric fields with ranges
            if (typeof validation === 'object' && ('min' in validation || 'max' in validation)) {
                const numValue = parseFloat(value);
                
                // Check if it's a valid number
                if (isNaN(numValue)) {
                    errors[fieldId] = `${fieldId} must be a valid number`;
                    continue;
                }
                
                // Check min/max range
                if ('min' in validation && numValue < validation.min) {
                    errors[fieldId] = validation.errorMsg || `${fieldId} must be at least ${validation.min}`;
                    continue;
                }
                
                if ('max' in validation && numValue > validation.max) {
                    errors[fieldId] = validation.errorMsg || `${fieldId} must not exceed ${validation.max}`;
                    continue;
                }
            }
            
            // Special validation for lipid values based on units
            if (fieldId === 'med-ldl' || fieldId === 'med-total-chol' || fieldId === 'med-hdl' || 
                fieldId === 'med-trig' || fieldId === 'med-nonhdl' || fieldId === 'med-apob') {
                const unitFieldId = `${fieldId}-unit`;
                const unit = data[unitFieldId];
                
                // Determine validation range based on unit
                let rangeKey = null;
                if (fieldId === 'med-total-chol') {
                    rangeKey = unit === 'mmol/L' ? 'totalCholesterol_mmol' : 'totalCholesterol_mg';
                } else if (fieldId === 'med-hdl') {
                    rangeKey = unit === 'mmol/L' ? 'hdl_mmol' : 'hdl_mg';
                } else if (fieldId === 'med-ldl') {
                    rangeKey = unit === 'mmol/L' ? 'ldl_mmol' : 'ldl_mg';
                } else if (fieldId === 'med-trig') {
                    rangeKey = unit === 'mmol/L' ? 'triglycerides_mmol' : 'triglycerides_mg';
                } else if (fieldId === 'med-nonhdl') {
                    rangeKey = unit === 'mmol/L' ? 'nonHdl_mmol' : 'nonHdl_mg';
                } else if (fieldId === 'med-apob') {
                    rangeKey = unit === 'g/L' ? 'apoB_g' : 'apoB_mg';
                }
                
                // Apply validation if range exists
                if (rangeKey && this.validationRanges[rangeKey]) {
                    const range = this.validationRanges[rangeKey];
                    const numValue = parseFloat(value);
                    
                    if (isNaN(numValue)) {
                        errors[fieldId] = `${fieldId} must be a valid number`;
                        continue;
                    }
                    
                    if (numValue < range.min || numValue > range.max) {
                        errors[fieldId] = range.errorMsg;
                        continue;
                    }
                }
            }
            
            // Validate Lp(a) based on unit
            if (fieldId === 'med-lpa' && value) {
                const unitFieldId = `${fieldId}-unit`;
                const unit = data[unitFieldId];
                
                const rangeKey = unit === 'mg/dL' ? 'lpa_mg' : 'lpa_nmol';
                const range = this.validationRanges[rangeKey];
                const numValue = parseFloat(value);
                
                if (isNaN(numValue)) {
                    errors[fieldId] = `${fieldId} must be a valid number`;
                    continue;
                }
                
                if (numValue < range.min || numValue > range.max) {
                    errors[fieldId] = range.errorMsg;
                    continue;
                }
            }
        }
        
        // Validate medication doses and duration if provided
        const medicationFields = Object.keys(data).filter(name => name.startsWith('med-medication-'));
        medicationFields.forEach(fieldId => {
            // If medication name is provided, the dose should be too
            if (data[fieldId] && fieldId.includes('-name-')) {
                const doseFieldId = fieldId.replace('-name-', '-dose-');
                if (!data[doseFieldId]) {
                    errors[doseFieldId] = 'Please provide the medication dose';
                }
                
                // Validate duration if provided
                const durationFieldId = fieldId.replace('-name-', '-duration-');
                if (data[durationFieldId]) {
                    const duration = parseFloat(data[durationFieldId]);
                    if (isNaN(duration) || duration < 0 || duration > 600) {
                        errors[durationFieldId] = 'Duration must be between 0 and 600 months';
                    }
                }
            }
        });
        
        // Calculate isValid flag
        const isValid = Object.keys(errors).length === 0;
        
        // Display errors in UI if validation failed
        if (!isValid) {
            for (const [fieldId, errorMessage] of Object.entries(errors)) {
                this._displayFieldError(form.id, fieldId, errorMessage);
            }
            
            // Publish validation error event
            eventBus.publish('validation-error', {
                formId: form.id,
                errors: errors,
                message: 'Medication evaluation validation failed'
            });
        }
        
        return { isValid, errors, data };
    }
    
    /**
     * Validate unit conversions for a field
     * @param {string} value - Field value
     * @param {string} fromUnit - Source unit
     * @param {string} toUnit - Target unit
     * @param {string} fieldType - Field type (e.g., 'ldl', 'totalCholesterol')
     * @returns {Object} Validation result with isValid flag and convertedValue
     * @public
     */
    validateUnitConversion(value, fromUnit, toUnit, fieldType) {
        if (!value || value === '') {
            return { isValid: true, convertedValue: null };
        }
        
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            return { 
                isValid: false, 
                error: `${fieldType} must be a valid number` 
            };
        }
        
        // Determine source and target validation ranges
        const fromRangeKey = `${fieldType}_${fromUnit === 'mmol/L' ? 'mmol' : 
                            fromUnit === 'g/L' ? 'g' : 'mg'}`;
        const toRangeKey = `${fieldType}_${toUnit === 'mmol/L' ? 'mmol' : 
                            toUnit === 'g/L' ? 'g' : 'mg'}`;
        
        // Validate source value
        if (this.validationRanges[fromRangeKey]) {
            const range = this.validationRanges[fromRangeKey];
            if (numValue < range.min || numValue > range.max) {
                return { 
                    isValid: false, 
                    error: range.errorMsg 
                };
            }
        }
        
        // If units are the same, no conversion needed
        if (fromUnit === toUnit) {
            return { isValid: true, convertedValue: numValue };
        }
        
        // Perform conversion
        let convertedValue = null;
        
        // Lipid conversions (mmol/L ↔ mg/dL)
        if ((fromUnit === 'mmol/L' && toUnit === 'mg/dL') || 
            (fromUnit === 'mg/dL' && toUnit === 'mmol/L')) {
            if (fieldType === 'ldl' || fieldType === 'hdl' || 
                fieldType === 'totalCholesterol' || fieldType === 'nonHdl') {
                // Cholesterol conversion factor: 1 mmol/L = 38.67 mg/dL
                if (fromUnit === 'mmol/L') {
                    convertedValue = numValue * 38.67;
                } else {
                    convertedValue = numValue / 38.67;
                }
            } else if (fieldType === 'triglycerides') {
                // Triglycerides conversion factor: 1 mmol/L = 88.57 mg/dL
                if (fromUnit === 'mmol/L') {
                    convertedValue = numValue * 88.57;
                } else {
                    convertedValue = numValue / 88.57;
                }
            }
        }
        
        // ApoB conversions (g/L ↔ mg/dL)
        if (fieldType === 'apoB' && 
            ((fromUnit === 'g/L' && toUnit === 'mg/dL') || 
             (fromUnit === 'mg/dL' && toUnit === 'g/L'))) {
            if (fromUnit === 'g/L') {
                convertedValue = numValue * 100;
            } else {
                convertedValue = numValue / 100;
            }
        }
        
        // Lp(a) conversions (mg/dL ↔ nmol/L) - approximate
        if (fieldType === 'lpa' && 
            ((fromUnit === 'mg/dL' && toUnit === 'nmol/L') || 
             (fromUnit === 'nmol/L' && toUnit === 'mg/dL'))) {
            if (fromUnit === 'mg/dL') {
                convertedValue = numValue * 2.5;
            } else {
                convertedValue = numValue / 2.5;
            }
        }
        
        // Validate converted value
        if (convertedValue !== null && this.validationRanges[toRangeKey]) {
            const range = this.validationRanges[toRangeKey];
            if (convertedValue < range.min || convertedValue > range.max) {
                return { 
                    isValid: false, 
                    error: `Converted value (${convertedValue.toFixed(2)} ${toUnit}) is outside valid range` 
                };
            }
        }
        
        return { 
            isValid: convertedValue !== null, 
            convertedValue: convertedValue !== null ? convertedValue : numValue,
            error: convertedValue === null ? `Unable to convert ${fieldType} from ${fromUnit} to ${toUnit}` : null
        };
    }
}

// Create and export a singleton instance
const calculationValidator = new CalculationValidator();
export default calculationValidator;
