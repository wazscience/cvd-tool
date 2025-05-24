/**
 * Security Service Module (Fused & Enhanced)
 * @file /js/utils/security-service.js
 * @description Provides centralized security features: input validation, sanitization,
 * cryptographic utilities (via CryptoService), and request throttling.
 * Fuses user's SecurityValidationModule v2.0.1 [cite: uploaded:security-validation-module.js] with service architecture.
 * @version 2.1.0
 * @exports SecurityService
 */

'use strict';

// Assumes DOMPurify is loaded globally if HTML sanitization is used.
// import DOMPurify from 'dompurify'; // If using modules and bundling DOMPurify

class SecurityService {
    /**
     * Creates or returns the singleton instance of SecurityService.
     * @param {object} [options={}] - Configuration options.
     * @param {object} [options.customPatterns] - Custom regex patterns to merge with defaults.
     * @param {object} [options.customRanges] - Custom physiological ranges to merge.
     * @param {object} [options.domPurifyConfig] - Custom DOMPurify config for HTML sanitization.
     * @param {number} [options.maxRequestsPerMinute=100] - For throttling.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (SecurityService.instance) {
            return SecurityService.instance;
        }

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || { handleError: console.error, log: console.log },
            InputSanitizer: window.InputSanitizerService,
            CryptoService: window.CryptoService,
            ValidationHelpers: window.ValidationHelpers,
            EventBus: window.EventBus,
            ...options.dependencies,
        };

        // From user's security-validation-module.js [cite: uploaded:security-validation-module.js (lines 20-61)]
        this.patterns = {
            alphanumeric: /^[a-zA-Z0-9]+$/,
            numeric: /^-?\d+(\.\d+)?$/,
            integer: /^-?\d+$/,
            name: /^[a-zA-Z\s'-]{1,100}$/, // Allows spaces, hyphens, apostrophes
            email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, // Basic email regex
            age: /^(?:[1-9][0-9]?|1[0-4][0-9]|150)$/, // Age 1-150
            cholesterol: /^(?:0|[1-9]\d{0,3})(?:\.\d{1,2})?$/, // Positive numbers, up to 9999.99
            bloodPressure: /^(?:[1-9][0-9]|1\d{2}|2[0-4]\d|250)$/, // BP 10-250
            weight: /^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/, // Weight 0-999.99
            height: /^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/, // Height 0-999.99
            patientId: /^[A-Za-z0-9-_:.]{1,64}$/,
            medicalRecordNumber: /^[A-Za-z0-9-_:.]{1,64}$/,
            ...(options.customPatterns || {})
        };
        this.ranges = { // Physiological ranges
            age: { min: 18, max: 120, strict: false }, // Toolkit typically for adults
            sbp: { min: 50, max: 300, strict: false }, // Broader than user's for general validation
            dbp: { min: 30, max: 200, strict: false },
            totalCholesterol_mmolL: { min: 1.0, max: 20.0, strict: false },
            ldl_mmolL: { min: 0.5, max: 15.0, strict: false },
            hdl_mmolL: { min: 0.2, max: 5.0, strict: false }, // HDL can be low
            triglycerides_mmolL: { min: 0.1, max: 30.0, strict: false }, // Broader range
            weight_kg: { min: 10, max: 500, strict: false },
            height_cm: { min: 50, max: 250, strict: false },
            bmi: { min: 10, max: 70, strict: false },
            // ... (add more from user's list, ensuring units are clear or handled by ValidationHelpers)
            ...(options.customRanges || {})
        };

        this.domPurifyConfig = {
            ...(this.dependencies.InputSanitizer?.options?.domPurifyConfig || {}), // Base from InputSanitizer
            // Override with specific stricter defaults for SecurityService if needed
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'style', 'link'],
            FORBID_ATTR: ['onerror', 'onload', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'oninput', 'oninvalid', 'formaction', 'style'], // Forbid style attribute too
            ...(options.domPurifyConfig || {})
        };

        this.throttleMap = new Map(); // For request throttling
        this.maxRequestsPerMinute = options.maxRequestsPerMinute || 100;

        if (!this.dependencies.InputSanitizer) this._log('warn', 'InputSanitizerService dependency missing. Sanitization capabilities limited.');
        if (!this.dependencies.CryptoService) this._log('warn', 'CryptoService dependency missing. Crypto operations will fail.');
        if (!this.dependencies.ValidationHelpers) this._log('warn', 'ValidationHelpers dependency missing. Some validations may be limited.');

        SecurityService.instance = this;
        this._log('info', 'SecurityService Initialized (v2.1.0).');
    }

    _log(level, message, data) { this.dependencies.ErrorLogger.log?.(level, `SecurityService: ${message}`, data); }
    _handleError(error, context, additionalData = {}) {
        const msg = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(msg, `SecurityService-${context}`, 'error', { originalError: error, ...additionalData });
    }

    // --- Sanitization Methods (Primarily delegates to InputSanitizerService but can add layers) ---

    /**
     * Sanitizes HTML content using DOMPurify via InputSanitizerService.
     * @param {string} htmlString - The HTML string.
     * @param {object} [customDomPurifyConfig] - Optional DOMPurify config for this call.
     * @returns {string} Sanitized HTML string.
     */
    sanitizeHTML(htmlString, customDomPurifyConfig) {
        if (!this.dependencies.InputSanitizer) return this._basicEscapeHTML(htmlString); // Basic fallback
        const config = customDomPurifyConfig ? this._deepMerge({}, this.domPurifyConfig, customDomPurifyConfig) : this.domPurifyConfig;
        return this.dependencies.InputSanitizer.sanitizeHTML(htmlString, config);
    }

    /** Basic HTML escaping as a fallback or for non-HTML contexts. */
    escapeHTML(rawInput) {
        if (!this.dependencies.InputSanitizer) return this._basicEscapeHTML(rawInput);
        return this.dependencies.InputSanitizer.escapeHTML(rawInput);
    }
    _basicEscapeHTML(rawInput){ // Fallback from user's code
        if (rawInput === null || rawInput === undefined) return '';
        return String(rawInput).replace(/[&<>"'`]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'})[m]);
    }

    sanitizeForAttribute(rawInput) {
        if (!this.dependencies.InputSanitizer) return this._basicEscapeHTML(rawInput);
        return this.dependencies.InputSanitizer.sanitizeForAttribute(rawInput);
    }

    sanitizeURL(urlString) {
        if (!this.dependencies.InputSanitizer) return ''; // Risky to have a basic fallback here
        return this.dependencies.InputSanitizer.sanitizeURL(urlString);
    }

    sanitizeObjectOrArray(data, stringSanitizerFn) {
        if (!this.dependencies.InputSanitizer) return data; // Cannot sanitize without service
        const sanitizer = stringSanitizerFn || ((val) => this.escapeHTML(val));
        return this.dependencies.InputSanitizer.sanitizeObjectOrArray(data, sanitizer);
    }

    // --- Validation Methods (Using defined patterns and ranges, and ValidationHelpers) ---

    /**
     * Validates an input string against a predefined or custom regex pattern.
     * @param {string} input - The input string to validate.
     * @param {string} patternKey - Key of the pattern in `this.patterns` or a custom regex.
     * @returns {{isValid: boolean, message: string, value: string}}
     */
    validateInputPattern(input, patternKey) {
        const S = this.dependencies.InputSanitizer;
        const V = this.dependencies.ValidationHelpers;
        const value = S ? S.escapeHTML(String(input || '')) : this._basicEscapeHTML(String(input || '')); // Sanitize for safety before regex

        const pattern = this.patterns[patternKey] || (patternKey instanceof RegExp ? patternKey : null);
        if (!pattern) {
            this._log('warn', `Validation pattern not found for key: ${patternKey}`);
            return { isValid: false, message: `Invalid validation type: ${patternKey}`, value };
        }
        const isValid = pattern.test(value);
        return {
            isValid,
            message: isValid ? '' : `Invalid format for ${patternKey}.`,
            value: isValid ? value : '' // Return sanitized value if valid, or empty
        };
    }

    /**
     * Validates a physiological value against defined ranges.
     * Uses ValidationHelpers for core range check.
     * @param {number|string} value - The value to validate.
     * @param {string} typeKey - Key for `this.ranges` (e.g., 'sbp', 'totalCholesterol_mmolL').
     * @returns {{isValid: boolean, isWarning: boolean, message: string, value: number|null}}
     */
    validatePhysiologicalValue(value, typeKey) {
        const S = this.dependencies.InputSanitizer;
        const V = this.dependencies.ValidationHelpers;

        const sanitizedValue = S ? S.escapeHTML(String(value || '')) : this._basicEscapeHTML(String(value || ''));
        const numCheck = V ? V.isNumber(sanitizedValue) : {isValid: !isNaN(parseFloat(sanitizedValue)), value: parseFloat(sanitizedValue)};

        if (!numCheck.isValid) {
            return { isValid: false, isWarning: false, message: `Invalid number for ${typeKey}.`, value: null };
        }
        const numValue = Number(numCheck.value); // Use the number from isNumber if it returns it

        const range = this.ranges[typeKey];
        if (!range) {
            this._log('warn', `No validation range defined for type: ${typeKey}`);
            return { isValid: true, isWarning: false, message: '', value: numValue }; // No range, assume valid
        }

        const rangeCheck = V ? V.isInRange(numValue, range.min, range.max) : {isValid: numValue >= range.min && numValue <= range.max};

        if (!rangeCheck.isValid) {
            const message = `Value ${numValue} for ${typeKey} is outside the typical range of ${range.min}-${range.max}.`;
            if (range.strict) {
                return { isValid: false, isWarning: false, message, value: null };
            } else {
                return { isValid: true, isWarning: true, message, value: numValue };
            }
        }
        return { isValid: true, isWarning: false, message: '', value: numValue };
    }

    // --- Cryptographic Utilities (Delegates to CryptoService) ---

    async encryptDataForStorage(data) {
        if (!this.dependencies.CryptoService || !this.dependencies.CryptoService.isSupported) {
            this._log('warn', 'CryptoService not available. Returning data unencrypted (stringified).');
            return JSON.stringify(data); // Not secure, but better than failing if crypto is optional
        }
        try {
            // SecureStorage handles its own key. This method assumes a general app key if needed.
            // For now, this method is conceptual as SecureStorage handles its own encryption.
            // If this service were to encrypt arbitrary data with its own key:
            // if (!this.appEncryptionKey) this.appEncryptionKey = await this.dependencies.CryptoService.generateAesGcmKey();
            // const { ciphertextBase64, ivBase64 } = await this.dependencies.CryptoService.encryptStringToBase64(JSON.stringify(data), this.appEncryptionKey);
            // return JSON.stringify({ _appEnc: true, iv: ivBase64, ct: ciphertextBase64 });
            throw new Error("Direct encryption via SecurityService is conceptual; use SecureStorageService for localStorage encryption.");
        } catch (error) {
            this._handleError(error, 'EncryptData');
            throw new Error('Data encryption failed.'); // Re-throw
        }
    }

    async decryptDataFromStorage(encryptedPayloadString) {
        // ... (Conceptual, as SecureStorage handles its decryption) ...
        throw new Error("Direct decryption via SecurityService is conceptual; use SecureStorageService.");
    }

    async computeIntegrityHash(data) {
        if (!this.dependencies.CryptoService || !this.dependencies.CryptoService.isSupported) {
            this._log('warn', 'CryptoService not available for hashing.');
            return null;
        }
        try {
            const stringData = typeof data === 'string' ? data : JSON.stringify(data);
            return await this.dependencies.CryptoService.hashData(stringData);
        } catch (error) {
            this._handleError(error, 'ComputeHash');
            return null;
        }
    }

    async verifyIntegrity(data, expectedHash) {
        if (!expectedHash) return false;
        const computedHash = await this.computeIntegrityHash(data);
        return computedHash === expectedHash;
    }

    // --- Request Throttling (From user's security-validation-module.js [cite: uploaded:security-validation-module.js (lines 182-204)]) ---
    checkThrottle(action, userId = null) {
        const key = userId ? `${this.dependencies.InputSanitizer.escapeHTML(action)}_${this.dependencies.InputSanitizer.escapeHTML(userId)}` : this.dependencies.InputSanitizer.escapeHTML(action);
        const now = Date.now();
        let history = this.throttleMap.get(key) || [];
        history = history.filter(time => now - time < 60000); // Keep requests from last minute

        if (history.length >= this.maxRequestsPerMinute) {
            this._log('warn', `Request throttled for action: "${key}". Count: ${history.length}`);
            this.dependencies.EventBus.publish('security:throttled', { action: key });
            return false;
        }
        history.push(now);
        this.throttleMap.set(key, history);
        return true;
    }

    // --- CSRF Token Management (Delegates to InputSanitizerService) ---
    generateCsrfToken(length = 32) {
        if (!this.dependencies.InputSanitizer) { this._log('error', 'InputSanitizer for CSRF not available.'); return null;}
        return this.dependencies.InputSanitizer.generateCsrfToken(length);
    }
    storeCsrfToken(token) {
        if (!this.dependencies.InputSanitizer) return false;
        return this.dependencies.InputSanitizer.storeCsrfToken(token);
    }
    getStoredCsrfToken() {
        if (!this.dependencies.InputSanitizer) return null;
        return this.dependencies.InputSanitizer.getStoredCsrfToken();
    }
    addCsrfTokenToForm(formElementOrSelector, token) {
        if (!this.dependencies.InputSanitizer) return false;
        return this.dependencies.InputSanitizer.addCsrfTokenToForm(formElementOrSelector, token);
    }
    validateCsrfToken(submittedToken) {
        if (!this.dependencies.InputSanitizer) return false;
        return this.dependencies.InputSanitizer.validateCsrfToken(submittedToken);
    }

    // Utility for deep merging configs (can be moved to a general utility if needed)
    _deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();
        if (typeof target === 'object' && target !== null && typeof source === 'object' && source !== null) {
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
        }
        return this._deepMerge(target, ...sources);
    }
}

// Instantiate and export the singleton service
// const SecurityServiceInstance = new SecurityService({
//     dependencies: { /* ... pass actual instances from main.js ... */ }
// });
// window.SecurityService = SecurityServiceInstance;
// export default SecurityServiceInstance;
