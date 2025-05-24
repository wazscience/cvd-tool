/**
 * Enhanced Input Sanitization Module
 * @file /js/utils/input-sanitizer.js
 * @description Advanced input sanitization and validation to prevent XSS and injection attacks
 * @version 2.0.1
 * @author CVD Risk Assessment Team
 */

import securityValidation from './security-validation.js';

/**
 * Class for handling input sanitization and validation
 */
class InputSanitizer {
    constructor() {
        this.validators = {
            // Common validators
            required: (value) => {
                return value !== null && 
                       value !== undefined && 
                       String(value).trim() !== '';
            },
            
            // Numeric validators with expanded ranges for clinical data
            numeric: (value) => {
                if (value === null || value === undefined || value === '') return true;
                return /^-?\d+(\.\d+)?$/.test(String(value).trim());
            },
            
            integer: (value) => {
                if (value === null || value === undefined || value === '') return true;
                return /^-?\d+$/.test(String(value).trim());
            },
            
            alphanumeric: (value) => {
                if (value === null || value === undefined || value === '') return true;
                return /^[a-zA-Z0-9]*$/.test(String(value).trim());
            },
            
            // Clinical data validators with expanded ranges
            age: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const age = parseFloat(value);
                return !isNaN(age) && age >= 18 && age <= 120;
            },
            
            systolicBP: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const sbp = parseFloat(value);
                return !isNaN(sbp) && sbp >= 70 && sbp <= 250;
            },
            
            diastolicBP: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const dbp = parseFloat(value);
                return !isNaN(dbp) && dbp >= 40 && dbp <= 150;
            },
            
            cholesterol_mmol: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const chol = parseFloat(value);
                return !isNaN(chol) && chol >= 0.5 && chol <= 20.0;
            },
            
            cholesterol_mg: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const chol = parseFloat(value);
                return !isNaN(chol) && chol >= 20 && chol <= 800;
            },
            
            hdl_mmol: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const hdl = parseFloat(value);
                return !isNaN(hdl) && hdl >= 0.1 && hdl <= 5.0;
            },
            
            hdl_mg: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const hdl = parseFloat(value);
                return !isNaN(hdl) && hdl >= 5 && hdl <= 200;
            },
            
            ldl_mmol: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const ldl = parseFloat(value);
                return !isNaN(ldl) && ldl >= 0.3 && ldl <= 15.0;
            },
            
            ldl_mg: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const ldl = parseFloat(value);
                return !isNaN(ldl) && ldl >= 10 && ldl <= 600;
            },
            
            triglycerides_mmol: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const trig = parseFloat(value);
                return !isNaN(trig) && trig >= 0.2 && trig <= 20.0;
            },
            
            triglycerides_mg: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const trig = parseFloat(value);
                return !isNaN(trig) && trig >= 20 && trig <= 1800;
            },
            
            weight_kg: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const weight = parseFloat(value);
                return !isNaN(weight) && weight >= 20 && weight <= 300;
            },
            
            weight_lb: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const weight = parseFloat(value);
                return !isNaN(weight) && weight >= 45 && weight <= 660;
            },
            
            height_cm: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const height = parseFloat(value);
                return !isNaN(height) && height >= 100 && height <= 250;
            },
            
            height_in: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const height = parseFloat(value);
                return !isNaN(height) && height >= 39 && height <= 98;
            },
            
            bmi: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const bmi = parseFloat(value);
                return !isNaN(bmi) && bmi >= 10 && bmi <= 70;
            },
            
            hba1c: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const hba1c = parseFloat(value);
                return !isNaN(hba1c) && hba1c >= 3.0 && hba1c <= 20.0;
            },
            
            lpa_mg: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const lpa = parseFloat(value);
                return !isNaN(lpa) && lpa >= 0 && lpa <= 500;
            },
            
            lpa_nmol: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const lpa = parseFloat(value);
                return !isNaN(lpa) && lpa >= 0 && lpa <= 1000;
            },
            
            apob_g: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const apob = parseFloat(value);
                return !isNaN(apob) && apob >= 0.1 && apob <= 5.0;
            },
            
            apob_mg: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const apob = parseFloat(value);
                return !isNaN(apob) && apob >= 10 && apob <= 500;
            },
            
            egfr: (value) => {
                if (value === null || value === undefined || value === '') return true;
                const egfr = parseFloat(value);
                return !isNaN(egfr) && egfr >= 0 && egfr <= 150;
            }
        };
        
        // Set up special character blacklist for text inputs
        this.specialCharBlacklist = ['<', '>', '{', '}', '(', ')', '[', ']', '&', '%', ', '#', '@', '!', '*', '=', ';'];
        
        // Input field type mappings (to apply appropriate validation)
        this.fieldTypeMap = {
            // FRS form fields
            'frs-age': 'age',
            'frs-height': 'height',
            'frs-weight': 'weight',
            'frs-sbp': 'systolicBP',
            'frs-total-chol': 'cholesterol',
            'frs-hdl': 'hdl',
            'frs-ldl': 'ldl',
            'frs-trig': 'triglycerides',
            'frs-nonhdl': 'cholesterol',
            'frs-apob': 'apob',
            'frs-lpa': 'lpa',
            
            // QRISK form fields
            'qrisk-age': 'age',
            'qrisk-height': 'height',
            'qrisk-weight': 'weight',
            'qrisk-sbp': 'systolicBP',
            'qrisk-total-chol': 'cholesterol',
            'qrisk-hdl': 'hdl',
            'qrisk-cholesterol-ratio': 'numeric',
            
            // Medication form fields
            'med-age': 'age',
            'med-ldl': 'ldl',
            'med-total-chol': 'cholesterol',
            'med-hdl': 'hdl',
            'med-trig': 'triglycerides',
            'med-nonhdl': 'cholesterol',
            'med-apob': 'apob',
            'med-lpa': 'lpa'
        };
    }
    
    /**
     * Sanitizes input based on the field name and expected type
     * @param {string} value - Input value
     * @param {string} fieldName - Field name
     * @param {string} [explicitType=null] - Override field type
     * @returns {string} Sanitized input
     * @throws {Error} If validation fails
     * @public
     */
    sanitizeFieldInput(value, fieldName, explicitType = null) {
        try {
            // Handle empty values
            if (value === null || value === undefined || value === '') {
                return '';
            }
            
            // Determine type to validate against
            const type = explicitType || this._determineFieldType(fieldName);
            
            // Basic sanitization for all inputs
            let sanitized = this._basicSanitize(String(value).trim());
            
            // Apply type-specific sanitization and validation
            return this._typedSanitize(sanitized, type, fieldName);
        } catch (error) {
            console.error(`Sanitization error for field ${fieldName}:`, error);
            throw new Error(`Invalid input for ${fieldName}: ${error.message}`);
        }
    }
    
    /**
     * Determines field type based on field name
     * @param {string} fieldName - Field name
     * @returns {string} Field type
     * @private
     */
    _determineFieldType(fieldName) {
        // Check in field type map
        if (this.fieldTypeMap[fieldName]) {
            return this.fieldTypeMap[fieldName];
        }
        
        // Use patterns to determine type
        if (fieldName.includes('age')) return 'age';
        if (fieldName.includes('height')) return 'height';
        if (fieldName.includes('weight')) return 'weight';
        if (fieldName.includes('sbp') || fieldName.includes('systolic')) return 'systolicBP';
        if (fieldName.includes('dbp') || fieldName.includes('diastolic')) return 'diastolicBP';
        if (fieldName.includes('chol') && !fieldName.includes('hdl') && !fieldName.includes('ratio')) return 'cholesterol';
        if (fieldName.includes('hdl')) return 'hdl';
        if (fieldName.includes('ldl')) return 'ldl';
        if (fieldName.includes('trig')) return 'triglycerides';
        if (fieldName.includes('nonhdl')) return 'cholesterol';
        if (fieldName.includes('apob')) return 'apob';
        if (fieldName.includes('lpa')) return 'lpa';
        
        // Default to text
        return 'text';
    }
    
    /**
     * Basic sanitization for all inputs
     * @param {string} value - Input value
     * @returns {string} Sanitized value
     * @private
     */
    _basicSanitize(value) {
        // Convert to string and trim
        let sanitized = String(value).trim();
        
        // Check for script tags or dangerous patterns - hard rejection
        if (/<script|javascript:|data:|vbscript:|<iframe|<object|<embed|<img|<meta|<link|<style|<form|<input/i.test(sanitized)) {
            throw new Error('Potentially harmful content detected');
        }
        
        // Use DOMPurify for HTML context
        if (sanitized.includes('<') || sanitized.includes('>')) {
            sanitized = securityValidation.sanitizeHTML(sanitized);
        }
        
        return sanitized;
    }
    
    /**
     * Type-specific sanitization and validation
     * @param {string} value - Input value
     * @param {string} type - Field type
     * @param {string} fieldName - Field name (for error messages)
     * @returns {string} Sanitized and validated value
     * @private
     */
    _typedSanitize(value, type, fieldName) {
        // Handle numeric types
        if (['numeric', 'integer', 'age', 'systolicBP', 'diastolicBP', 'cholesterol', 
             'hdl', 'ldl', 'triglycerides', 'weight', 'height', 'bmi', 'hba1c', 
             'lpa', 'apob', 'egfr'].includes(type)) {
            
            // Filter out any non-numeric characters except decimal point and minus sign
            let numericValue = value.replace(/[^\d.-]/g, '');
            
            // Ensure proper decimal format
            numericValue = numericValue.replace(/^([^.]*\.)(.*)$/, (match, p1, p2) => 
                p1 + p2.replace(/\./g, '')
            );
            
            // Validate the numeric value based on type
            const validatorKey = this._getValidatorKeyForNumericType(type, fieldName);
            
            if (this.validators[validatorKey] && !this.validators[validatorKey](numericValue)) {
                throw new Error(`Value out of range for ${type}`);
            }
            
            return numericValue;
        }
        
        // Handle text values
        if (type === 'text' || type === 'name') {
            // For text, check for blacklisted special characters
            for (const char of this.specialCharBlacklist) {
                if (value.includes(char)) {
                    throw new Error(`Invalid character "${char}" in text field`);
                }
            }
            
            // Limit length to prevent DoS
            if (value.length > 500) {
                throw new Error('Text input too long');
            }
            
            return value;
        }
        
        // Default pass-through for other types
        return value;
    }
    
    /**
     * Gets validator key for numeric type, considering unit
     * @param {string} type - Basic field type
     * @param {string} fieldName - Field name (to check for unit)
     * @returns {string} Validator key
     * @private
     */
    _getValidatorKeyForNumericType(type, fieldName) {
        // Determine unit from field name or default to standard units
        let unit = 'standard';
        
        // Check for unit suffix in field name
        if (fieldName.includes('-unit')) {
            const unitValue = document.getElementById(fieldName)?.value;
            if (unitValue) {
                if (['mg/dL', 'mg/dl'].includes(unitValue)) {
                    unit = 'mg';
                } else if (unitValue === 'nmol/L') {
                    unit = 'nmol';
                } else if (unitValue === 'g/L') {
                    unit = 'g';
                } else if (unitValue === 'lb') {
                    unit = 'lb';
                } else if (unitValue === 'in') {
                    unit = 'in';
                }
            }
        } else {
            // Check for related unit field
            const unitField = document.getElementById(`${fieldName}-unit`);
            if (unitField) {
                if (['mg/dL', 'mg/dl'].includes(unitField.value)) {
                    unit = 'mg';
                } else if (unitField.value === 'nmol/L') {
                    unit = 'nmol';
                } else if (unitField.value === 'g/L') {
                    unit = 'g';
                } else if (unitField.value === 'lb') {
                    unit = 'lb';
                } else if (unitField.value === 'in') {
                    unit = 'in';
                }
            }
        }
        
        // Build validator key based on type and unit
        if (type === 'cholesterol' || type === 'hdl' || type === 'ldl' || type === 'triglycerides') {
            return unit === 'mg' ? `${type}_mg` : `${type}_mmol`;
        } else if (type === 'weight') {
            return unit === 'lb' ? 'weight_lb' : 'weight_kg';
        } else if (type === 'height') {
            return unit === 'in' ? 'height_in' : 'height_cm';
        } else if (type === 'lpa') {
            return unit === 'nmol' ? 'lpa_nmol' : 'lpa_mg';
        } else if (type === 'apob') {
            return unit === 'mg' ? 'apob_mg' : 'apob_g';
        }
        
        // Default to basic type
        return type;
    }
    
    /**
     * Sanitizes an entire form
     * @param {HTMLFormElement} form - Form element
     * @returns {Object} Sanitized form data or null if validation fails
     * @public
     */
    sanitizeForm(form) {
        if (!form || !(form instanceof HTMLFormElement)) {
            console.error('Invalid form element');
            return null;
        }
        
        const formData = new FormData(form);
        const sanitizedData = {};
        const errors = {};
        
        for (const [name, value] of formData.entries()) {
            try {
                sanitizedData[name] = this.sanitizeFieldInput(value, name);
            } catch (error) {
                errors[name] = error.message;
                
                // Mark field as invalid visually
                const field = form.elements[name];
                if (field) {
                    field.classList.add('error');
                    
                    // Display error message if error element exists
                    const errorElement = document.getElementById(`${name}-validation`);
                    if (errorElement) {
                        errorElement.textContent = error.message;
                        errorElement.style.display = 'block';
                    }
                }
            }
        }
        
        if (Object.keys(errors).length > 0) {
            return {
                data: null,
                errors: errors,
                isValid: false
            };
        }
        
        return {
            data: sanitizedData,
            errors: {},
            isValid: true
        };
    }
    
    /**
     * Safely sanitizes HTML content to prevent XSS
     * @param {string} html - HTML content
     * @returns {string} Sanitized HTML
     * @public
     */
    sanitizeHTML(html) {
        return securityValidation.sanitizeHTML(html);
    }
    
    /**
     * Validates a physiological value against expected ranges
     * @param {number} value - Value to validate
     * @param {string} type - Type of value (e.g., 'ldl', 'bp')
     * @returns {Object} Validation result
     * @public
     */
    validatePhysiologicalValue(value, type) {
        return securityValidation.validatePhysiologicalValue(value, type);
    }
    
    /**
     * Displays validation errors on a form
     * @param {HTMLFormElement} form - Form element
     * @param {Object} errors - Validation errors
     * @public
     */
    displayValidationErrors(form, errors) {
        if (!form || !errors) return;
        
        // Clear existing errors
        const errorElements = form.querySelectorAll('.error-message');
        errorElements.forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        
        const formElements = form.elements;
        for (let i = 0; i < formElements.length; i++) {
            formElements[i].classList.remove('error', 'warning');
        }
        
        // Display new errors
        for (const field in errors) {
            const element = form.elements[field];
            const errorMessage = errors[field];
            
            if (element) {
                element.classList.add('error');
                
                // Find and update error message element
                const errorElement = document.getElementById(`${field}-validation`);
                if (errorElement) {
                    errorElement.textContent = errorMessage;
                    errorElement.style.display = 'block';
                }
                
                // Scroll to first error
                if (element.offsetParent) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.focus();
                    break;
                }
            }
        }
    }
}

// Create a singleton instance
const inputSanitizer = new InputSanitizer();
export default inputSanitizer;
