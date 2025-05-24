/**
 * Validator Extension Service Module (Enhanced)
 * @file /js/utils/validator-extension.js
 * @description Allows registration, configuration, and execution of custom, complex,
 * or domain-specific validation functions, extending base validation capabilities.
 * Incorporates configuration concepts from user's "Advanced Validator Content".
 * @version 1.1.0
 * @exports ValidatorExtensionService
 */

'use strict';

class ValidatorExtensionService {
    /**
     * Creates or returns the singleton instance of ValidatorExtensionService.
     * @param {object} [options={}] - Configuration options.
     * @param {object} [options.initialCustomConfigs] - Initial custom validation configurations.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     * Expected: ErrorLogger, ValidationHelpers, InputSanitizerService, EventBus.
     */
    constructor(options = {}) {
        if (ValidatorExtensionService.instance) {
            return ValidatorExtensionService.instance;
        }

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || { handleError: console.error, log: console.log },
            ValidationHelpers: window.ValidationHelpers,
            InputSanitizer: window.InputSanitizerService,
            EventBus: window.EventBus || { publish: () => {} },
            ...options.dependencies,
        };

        // Configuration from user's "Advanced Validator Content" (validator-extension.js with validateEmail etc.)
        // This config can be used by registered custom validators.
        this.validationConfigs = {
            dateFormats: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'], // [cite: uploaded:validator-extension.js (Advanced Validator Content)]
            phoneFormats: { // [cite: uploaded:validator-extension.js (Advanced Validator Content)]
                US: /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
                UK: /^\+?44?[-.\s]?(?:\(?0\)?[-.\s]?)?([1-9][0-9]{2,4})[-.\s]?([0-9]{3,4})[-.\s]?([0-9]{3,4})$/,
                CA: /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/, // Example for CA
                INTL: /^\+[1-9]\d{1,14}$/
            },
            postalCodes: { // [cite: uploaded:validator-extension.js (Advanced Validator Content)]
                US: /^\d{5}(-\d{4})?$/,
                UK: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
                CA: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i
            },
            urlProtocols: ['http', 'https', 'ftp', 'mailto', 'tel'], // [cite: uploaded:validator-extension.js (Advanced Validator Content)]
            maxLengths: { // [cite: uploaded:validator-extension.js (Advanced Validator Content)]
                email: 254, username: 50, password: 128, comment: 5000, address: 200
            },
            passwordStrengthOptions: { // Default options for a custom password strength validator
                minLength: 8, requireUppercase: true, requireLowercase: true,
                requireNumbers: true, requireSpecial: true,
                preventCommonPatterns: true, preventRepeating: true
            },
            ...(options.initialCustomConfigs || {}) // Allow overriding/extending defaults
        };

        this.customValidators = new Map(); // Stores { validatorName: validationFunction }

        if (!this.dependencies.ValidationHelpers) this._log('warn', 'ValidationHelpers dependency missing.');
        if (!this.dependencies.InputSanitizer) this._log('warn', 'InputSanitizerService dependency missing.');

        ValidatorExtensionService.instance = this;
        this._log('info', 'ValidatorExtensionService Initialized (v1.1.0).');
    }

    _log(level, message, data) { this.dependencies.ErrorLogger.log?.(level, `ValidatorExt: ${message}`, data); }
    _handleError(error, context, additionalData = {}) {
        const msg = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(msg, `ValidatorExt-${context}`, 'error', { originalError: error, ...additionalData });
    }

    /**
     * Registers a custom validation function.
     * @param {string} validatorName - A unique name for the custom validator.
     * @param {Function} validationFn - The custom validation function.
     * It should accept `(value, fieldName, formData, dependencies, serviceConfigs)` and
     * return an object `{ isValid: boolean, message: string, normalizedValue?: any }`.
     * `dependencies` includes ValidationHelpers, InputSanitizer.
     * `serviceConfigs` provides access to this.validationConfigs.
     * @returns {boolean} True if registration was successful.
     */
    registerExtension(validatorName, validationFn) {
        if (typeof validatorName !== 'string' || !validatorName.trim()) { this._handleError(new Error('Validator name required.'), 'Register'); return false; }
        if (typeof validationFn !== 'function') { this._handleError(new Error(`Fn for "${validatorName}" invalid.`), 'Register'); return false; }
        if (this.customValidators.has(validatorName)) this._log('warn', `Validator "${validatorName}" overwritten.`);

        this.customValidators.set(validatorName, validationFn);
        this._log('info', `Custom validator "${validatorName}" registered.`);
        this.dependencies.EventBus?.publish('validatorExtension:registered', { name: validatorName });
        return true;
    }

    unregisterExtension(validatorName) { /* ... (same as v1.0.0 [cite: validator_extension_service_v1_0_0]) ... */
        if (this.customValidators.has(validatorName)) { this.customValidators.delete(validatorName); this._log('info', `Validator "${validatorName}" unregistered.`); this.dependencies.EventBus?.publish('validatorExtension:unregistered', { name: validatorName }); return true; }
        this._log('warn', `Unregister failed: Validator "${validatorName}" not found.`); return false;
    }

    /**
     * Executes a registered custom validation function.
     * @param {string} validatorName - The name of the custom validator.
     * @param {*} value - The primary value to validate.
     * @param {string} [fieldName] - Optional name of the field being validated.
     * @param {object} [formData] - Optional full form data object for context.
     * @returns {{isValid: boolean, message: string, value?: any, normalizedValue?: any}}
     * The `value` property in the return is the original or normalized value.
     */
    validate(validatorName, value, fieldName, formData) {
        const validatorFn = this.customValidators.get(validatorName);
        if (!validatorFn) {
            const msg = `Custom validator "${validatorName}" not found.`;
            this._log('error', msg);
            return { isValid: false, message: msg, value };
        }

        try {
            this.dependencies.EventBus?.publish('validatorExtension:beforeValidate', { validatorName, value, fieldName });
            const result = validatorFn(value, fieldName, formData,
                { // Pass relevant dependencies to the custom validation function
                    ValidationHelpers: this.dependencies.ValidationHelpers,
                    InputSanitizer: this.dependencies.InputSanitizer,
                    ErrorLogger: this.dependencies.ErrorLogger
                },
                this.validationConfigs // Pass service's own configs (dateFormats, etc.)
            );

            if (typeof result !== 'object' || typeof result.isValid !== 'boolean' || typeof result.message !== 'string') {
                throw new Error(`Validator "${validatorName}" returned invalid format. Expected {isValid, message}.`);
            }
            this.dependencies.EventBus?.publish('validatorExtension:afterValidate', { validatorName, value, fieldName, result });
            return { ...result, value: result.normalizedValue !== undefined ? result.normalizedValue : value }; // Ensure original or normalized value is part of result
        } catch (error) {
            this._handleError(error, `Validate-${validatorName}`, { value, fieldName });
            return { isValid: false, message: `Error in validator "${validatorName}": ${error.message}`, value };
        }
    }

    hasExtension(validatorName) { return this.customValidators.has(validatorName); }
    getRegisteredExtensions() { return Array.from(this.customValidators.keys()); }

    /**
     * Utility to update or add configurations to this.validationConfigs.
     * @param {object} newConfigs - Configs to merge (e.g., { phoneFormats: { ... }, newCategory: { ... } }).
     */
    updateValidationConfigs(newConfigs) {
        if (typeof newConfigs === 'object' && newConfigs !== null) {
            this.validationConfigs = this._deepMerge(this.validationConfigs, newConfigs);
            this._log('info', 'ValidatorExtensionService configs updated.');
        }
    }

    _deepMerge(target, source) { // Simple deep merge
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
                    target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
                    this._deepMerge(target[key], source[key]);
                } else if (source[key] !== undefined) {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }
}

// --- Example Custom Validators (to be registered by application) ---
// These would typically be in separate files or in main.js during setup.

/**
 * Example: Custom Email Validator (using service configs)
 * This function would be registered with ValidatorExtensionServiceInstance.registerExtension('advancedEmail', validateAdvancedEmail);
 */
/*
function validateAdvancedEmail(email, fieldName, formData, deps, serviceConfigs) {
    const S = deps.InputSanitizer;
    const V = deps.ValidationHelpers;
    const E = deps.ErrorLogger;

    if (!V.isNotEmpty(email).isValid) return { isValid: false, message: 'Email is required.' };
    email = S.escapeHTML(String(email)).trim().toLowerCase();

    if (email.length > serviceConfigs.maxLengths.email) {
        return { isValid: false, message: `Email exceeds max length of ${serviceConfigs.maxLengths.email}.` };
    }

    const basicFormatCheck = V.isEmail(email); // Use basic check from ValidationHelpers
    if (!basicFormatCheck.isValid) return basicFormatCheck;

    // Add more specific checks from user's "Advanced Validator Content"
    const [localPart, domain] = email.split('@');
    if (localPart.length > 64) return { isValid: false, message: 'Email local part too long.' };
    if (localPart.includes('..') || domain.includes('..')) return { isValid: false, message: 'Email has consecutive dots.' };
    // ... more checks ...

    return { isValid: true, message: '', normalizedValue: email };
}
*/

/**
 * Example: Complex Form-Level Validator for FRS (conceptual)
 * This function would be registered, e.g., ValidatorExtensionServiceInstance.registerExtension('frsCrossFieldCheck', validateFRSCrossChecks);
 * And then called by AppUI._validateForm for the FRS form *after* individual field validations.
 */
/*
function validateFRSCrossChecks(value, fieldName, formData, deps, serviceConfigs) {
    // formData contains all (sanitized) data from the FRS form
    // deps contains ValidationHelpers, InputSanitizer, ErrorLogger
    // serviceConfigs contains this.validationConfigs from the service

    // Example: If age > 75 and smoker, add a specific warning or mark as less reliable
    if (Number(formData['frs-age']) > 75 && formData['frs-smoker'] === 'yes') {
        // This isn't a validation failure, but a contextual message.
        // The return structure might need to accommodate warnings or info messages.
        // For now, let's assume it's still 'valid' but we could log or publish an event.
        deps.ErrorLogger.log?.('info', 'FRS: Patient >75 and smoker, FRS may underestimate risk.', 'FRSCrossCheck');
    }
    // Example: Check if SBP is unusually low for someone on BP meds
    if (formData['frs-bp-treatment'] === 'yes' && Number(formData['frs-sbp']) < 100) {
        return { isValid: true, message: 'Warning: SBP is low for a patient on BP medication. Verify reading.', isWarning: true };
    }

    return { isValid: true, message: '' }; // No cross-field validation errors found
}
*/

// Instantiate and export the singleton service
// const ValidatorExtensionServiceInstance = new ValidatorExtensionService();
// window.ValidatorExtensionService = ValidatorExtensionServiceInstance;
// export default ValidatorExtensionServiceInstance;
