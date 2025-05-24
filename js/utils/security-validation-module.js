/**
 * Security and Input Validation Module
 * @file /js/utils/security-validation.js
 * @description Provides enhanced security features and input validation for the application
 * @version 2.0.1
 * @author CVD Risk Assessment Team
 */

// Import DOMPurify for XSS protection
import DOMPurify from 'dompurify';

// Import CryptoJS for encryption
import CryptoJS from 'crypto-js';

/**
 * Security and validation utility for the application
 */
class SecurityValidation {
    constructor() {
        // Initialize DOMPurify with additional configuration
        this._initializeDOMPurify();
        
        // Define validation patterns
        this.patterns = {
            // Basic patterns
            alphanumeric: /^[a-zA-Z0-9]+$/,
            numeric: /^-?\d+(\.\d+)?$/,
            integer: /^-?\d+$/,
            name: /^[a-zA-Z\s'-]{1,100}$/,
            email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            
            // Medical data patterns
            age: /^(?:[1-9][0-9]?|1[0-4][0-9]|150)$/,
            cholesterol: /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/,
            bloodPressure: /^(?:[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|250)$/,
            weight: /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/,
            height: /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/,
            
            // Identifiers
            patientId: /^[A-Za-z0-9-_:.]{1,64}$/,
            medicalRecordNumber: /^[A-Za-z0-9-_:.]{1,64}$/
        };
        
        // Define physiological value ranges
        this.ranges = {
            age: { min: 20, max: 120, strict: false },
            sbp: { min: 70, max: 250, strict: false },
            dbp: { min: 40, max: 150, strict: false },
            totalCholesterol: { min: 1.0, max: 20.0, strict: false },
            ldl: { min: 0.5, max: 15.0, strict: false },
            hdl: { min: 0.1, max: 5.0, strict: false },
            triglycerides: { min: 0.2, max: 20.0, strict: false },
            weight_kg: { min: 20, max: 300, strict: false },
            height_cm: { min: 100, max: 250, strict: false },
            bmi: { min: 10, max: 70, strict: false },
            waist_cm: { min: 40, max: 200, strict: false },
            hba1c: { min: 3.0, max: 20.0, strict: false },
            glucose: { min: 2.0, max: 30.0, strict: false },
            creatinine: { min: 20, max: 1500, strict: false }, // μmol/L
            egfr: { min: 0, max: 150, strict: false },
            lpa_mg_dl: { min: 0, max: 500, strict: false },
            lpa_nmol_L: { min: 0, max: 1000, strict: false },
            apob_g_L: { min: 0.1, max: 5.0, strict: false }
        };
        
        // Security key for local encryption
        this.securityKey = this._generateOrRetrieveSecurityKey();
        
        // Throttling parameters for DoS protection
        this.throttleMap = new Map();
        this.maxRequestsPerMinute = 100;
        
        // Initialize security event listeners
        this._initializeSecurityListeners();
    }
    
    /**
     * Initializes DOMPurify with additional configuration
     * @private
     */
    _initializeDOMPurify() {
        if (typeof DOMPurify !== 'undefined') {
            // Configure DOMPurify for maximum security
            DOMPurify.setConfig({
                ALLOWED_TAGS: [
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span', 'a', 'ul', 'ol', 'li',
                    'b', 'strong', 'i', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
                    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption',
                    'br', 'hr', 'code', 'pre'
                ],
                ALLOWED_ATTR: [
                    'href', 'target', 'title', 'class', 'id', 'style',
                    'aria-label', 'aria-hidden', 'tabindex', 'role'
                ],
                ALLOW_DATA_ATTR: false,
                USE_PROFILES: { html: true },
                FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
                FORBID_CONTENTS: ['script'],
                WHOLE_DOCUMENT: false,
                RETURN_DOM: false,
                RETURN_DOM_FRAGMENT: false,
                RETURN_DOM_IMPORT: false,
                SANITIZE_DOM: true,
                KEEP_CONTENT: true,
                IN_PLACE: false,
                ADD_URI_SAFE_ATTR: []
            });
            
            // Add additional hooks
            DOMPurify.addHook('afterSanitizeAttributes', function(node) {
                // Set all links to noopener and noreferrer
                if ('target' in node) {
                    node.setAttribute('rel', 'noopener noreferrer');
                }
                
                // Set all external links to open in new window
                if (node.tagName === 'A' && node.getAttribute('href') && node.getAttribute('href').startsWith('http')) {
                    node.setAttribute('target', '_blank');
                }
            });
        } else {
            console.error('DOMPurify library not found. XSS protection not initialized.');
        }
    }
    
    /**
     * Generates or retrieves a security key for local encryption
     * @returns {string} Security key
     * @private
     */
    _generateOrRetrieveSecurityKey() {
        try {
            let key = localStorage.getItem('security_key');
            if (!key) {
                // Generate a random key if none exists
                const randomArray = new Uint8Array(32);
                if (window.crypto && window.crypto.getRandomValues) {
                    window.crypto.getRandomValues(randomArray);
                } else {
                    // Fallback for older browsers
                    for (let i = 0; i < randomArray.length; i++) {
                        randomArray[i] = Math.floor(Math.random() * 256);
                    }
                }
                
                // Convert to hex string
                key = Array.from(randomArray).map(b => b.toString(16).padStart(2, '0')).join('');
                localStorage.setItem('security_key', key);
            }
            return key;
        } catch (e) {
            console.warn('Failed to generate or retrieve security key:', e);
            // Use a default key - not ideal but better than no encryption
            return '3d2f7b9a1c5e8f4d6b0a2c5e8f7d9b3a';
        }
    }
    
    /**
     * Sets up security-related event listeners
     * @private
     */
    _initializeSecurityListeners() {
        // Monitor for suspicious activities
        if (typeof document !== 'undefined') {
            // Add a mutation observer to detect DOM modifications
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    // Check for suspicious script injections
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeName === 'SCRIPT' || 
                                (node.nodeName === 'LINK' && node.rel === 'stylesheet')) {
                                console.warn('Suspicious DOM modification detected', node);
                                // Remove potentially malicious node
                                node.parentNode.removeChild(node);
                            }
                        }
                    }
                }
            });
            
            // Start observing once DOM is ready
            document.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        }
    }
    
    /**
     * Sanitizes HTML content to prevent XSS attacks
     * @param {string} html - HTML content to sanitize
     * @returns {string} Sanitized HTML
     * @public
     */
    sanitizeHTML(html) {
        if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(html);
        } else {
            // Basic fallback if DOMPurify is not available
            return this._basicHTMLSanitizer(html);
        }
    }
    
    /**
     * Basic HTML sanitizer as fallback
     * @param {string} html - HTML content to sanitize
     * @returns {string} Sanitized HTML
     * @private
     */
    _basicHTMLSanitizer(html) {
        // Replace < and > with their entity equivalents
        // This is a very basic sanitizer and not recommended for production
        return html
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;');
    }
    
    /**
     * Sanitizes user input based on expected type
     * @param {string} input - User input
     * @param {string} type - Expected input type
     * @returns {string} Sanitized input
     * @throws {Error} If input does not match expected pattern
     * @public
     */
    sanitizeInput(input, type) {
        if (input === null || input === undefined) {
            return '';
        }
        
        // Convert to string
        const str = String(input).trim();
        
        // Check if empty
        if (str === '') {
            return '';
        }
        
        // Validate based on type
        if (this.patterns[type]) {
            if (!this.patterns[type].test(str)) {
                throw new Error(`Invalid ${type} format`);
            }
        }
        
        // Additional sanitization for special types
        switch (type) {
            case 'html':
                return this.sanitizeHTML(str);
                
            case 'script':
                // Reject any attempt to input script
                throw new Error('Script input not allowed');
                
            case 'numeric':
            case 'integer':
            case 'age':
            case 'cholesterol':
            case 'bloodPressure':
            case 'weight':
            case 'height':
                // Ensure it's a valid number and within reasonable bounds
                const num = parseFloat(str);
                if (isNaN(num)) {
                    throw new Error(`Invalid number: ${str}`);
                }
                return num.toString();
                
            default:
                // General purpose sanitization for other types
                return str
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;')
                    .replace(/`/g, '&#96;');
        }
    }
    
    /**
     * Validates physiological value is within expected range
     * @param {number} value - Value to validate
     * @param {string} type - Type of physiological parameter
     * @returns {Object} Validation result with isValid and messages
     * @public
     */
    validatePhysiologicalValue(value, type) {
        // Handle empty values
        if (value === null || value === undefined || value === '') {
            return { 
                isValid: true, 
                isWarning: false,
                message: null 
            };
        }
        
        // Check if type has defined ranges
        if (!this.ranges[type]) {
            console.warn(`No validation range defined for type: ${type}`);
            return { 
                isValid: true, 
                isWarning: false,
                message: null 
            };
        }
        
        const range = this.ranges[type];
        const numValue = parseFloat(value);
        
        // Check if valid number
        if (isNaN(numValue)) {
            return {
                isValid: false,
                isWarning: false,
                message: `Invalid numeric value: ${value}`
            };
        }
        
        // Check if within range
        if (numValue < range.min || numValue > range.max) {
            // If strict validation, return invalid
            if (range.strict) {
                return {
                    isValid: false,
                    isWarning: false,
                    message: `Value must be between ${range.min} and ${range.max}`
                };
            } else {
                // Warning only
                return {
                    isValid: true,
                    isWarning: true,
                    message: `Unusual value detected. Please confirm ${type} is ${numValue}`
                };
            }
        }
        
        // Value is valid
        return {
            isValid: true,
            isWarning: false,
            message: null
        };
    }
    
    /**
     * Encrypts sensitive data for local storage
     * @param {any} data - Data to encrypt
     * @returns {string} Encrypted data
     * @public
     */
    encryptData(data) {
        try {
            if (typeof CryptoJS === 'undefined') {
                console.warn('CryptoJS not available. Data will not be encrypted.');
                return JSON.stringify(data);
            }
            
            const jsonString = JSON.stringify(data);
            return CryptoJS.AES.encrypt(jsonString, this.securityKey).toString();
        } catch (e) {
            console.error('Error encrypting data:', e);
            throw new Error('Failed to encrypt data');
        }
    }
    
    /**
     * Decrypts data from local storage
     * @param {string} encryptedData - Encrypted data
     * @returns {any} Decrypted data
     * @public
     */
    decryptData(encryptedData) {
        try {
            if (typeof CryptoJS === 'undefined') {
                console.warn('CryptoJS not available. Assuming data is not encrypted.');
                return JSON.parse(encryptedData);
            }
            
            const bytes = CryptoJS.AES.decrypt(encryptedData, this.securityKey);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            return JSON.parse(decryptedString);
        } catch (e) {
            console.error('Error decrypting data:', e);
            throw new Error('Failed to decrypt data');
        }
    }
    
    /**
     * Checks if a request should be throttled to prevent DoS attacks
     * @param {string} action - Action identifier
     * @param {string} [userId=null] - Optional user identifier
     * @returns {boolean} True if request should proceed, false if throttled
     * @public
     */
    checkThrottle(action, userId = null) {
        const key = userId ? `${action}_${userId}` : action;
        const now = Date.now();
        
        // Get request history for this action/user
        let history = this.throttleMap.get(key) || [];
        
        // Remove requests older than 1 minute
        history = history.filter(time => now - time < 60000);
        
        // Check if over limit
        if (history.length >= this.maxRequestsPerMinute) {
            console.warn(`Request throttled: ${key}`);
            return false;
        }
        
        // Add current request time
        history.push(now);
        this.throttleMap.set(key, history);
        
        return true;
    }
    
    /**
     * Generates a secure random token for session verification
     * @param {number} [length=32] - Token length
     * @returns {string} Secure random token
     * @public
     */
    generateSecureToken(length = 32) {
        try {
            const buffer = new Uint8Array(length);
            if (window.crypto && window.crypto.getRandomValues) {
                window.crypto.getRandomValues(buffer);
            } else {
                // Fallback for older browsers
                for (let i = 0; i < buffer.length; i++) {
                    buffer[i] = Math.floor(Math.random() * 256);
                }
            }
            
            return Array.from(buffer)
                .map(byte => byte.toString(16).padStart(2, '0'))
                .join('');
        } catch (e) {
            console.error('Error generating secure token:', e);
            // Fallback
            return Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
        }
    }
    
    /**
     * Validates and sanitizes a full form submission
     * @param {HTMLFormElement} form - Form element
     * @returns {Object} Sanitized form data or null if invalid
     * @public
     */
    validateForm(form) {
        if (!form || !(form instanceof HTMLFormElement)) {
            console.error('Invalid form element');
            return null;
        }
        
        const formData = new FormData(form);
        const sanitizedData = {};
        const errors = {};
        
        for (const [name, value] of formData.entries()) {
            try {
                // Determine input type for validation
                const element = form.elements[name];
                const validationType = element.getAttribute('data-validation-type') || 'text';
                
                // Sanitize the input
                sanitizedData[name] = this.sanitizeInput(value, validationType);
                
                // Check physiological values if applicable
                if (element.hasAttribute('data-physiological')) {
                    const paramType = element.getAttribute('data-param-type');
                    const validation = this.validatePhysiologicalValue(sanitizedData[name], paramType);
                    
                    if (!validation.isValid) {
                        errors[name] = validation.message;
                    } else if (validation.isWarning) {
                        // Store warnings for display but don't block submission
                        if (!errors._warnings) errors._warnings = {};
                        errors._warnings[name] = validation.message;
                    }
                }
            } catch (e) {
                errors[name] = e.message;
            }
        }
        
        // Check if there are actual errors (not just warnings)
        const hasErrors = Object.keys(errors).filter(key => key !== '_warnings').length > 0;
        
        return {
            data: sanitizedData,
            errors: errors,
            isValid: !hasErrors
        };
    }
    
    /**
     * Applies visual error indicators to form fields
     * @param {HTMLFormElement} form - Form element
     * @param {Object} errors - Validation errors
     * @public
     */
    markFieldErrors(form, errors) {
        if (!form || !errors) return;
        
        // Reset all error states first
        Array.from(form.elements).forEach(element => {
            if (element.id) {
                element.classList.remove('error', 'warning');
                const errorDisplay = document.getElementById(`${element.id}-validation`);
                if (errorDisplay) {
                    errorDisplay.textContent = '';
                    errorDisplay.style.display = 'none';
                }
            }
        });
        
        // Mark errors
        Object.keys(errors).forEach(fieldName => {
            if (fieldName === '_warnings') return;
            
            const element = form.elements[fieldName];
            if (element) {
                element.classList.add('error');
                const errorDisplay = document.getElementById(`${element.id}-validation`);
                if (errorDisplay) {
                    errorDisplay.textContent = errors[fieldName];
                    errorDisplay.style.display = 'block';
                }
            }
        });
        
        // Mark warnings
        if (errors._warnings) {
            Object.keys(errors._warnings).forEach(fieldName => {
                const element = form.elements[fieldName];
                if (element) {
                    element.classList.add('warning');
                    const errorDisplay = document.getElementById(`${element.id}-validation`);
                    if (errorDisplay) {
                        errorDisplay.textContent = errors._warnings[fieldName];
                        errorDisplay.style.display = 'block';
                    }
                }
            });
        }
    }
    
    /**
     * Computes a hash of data for integrity verification
     * @param {any} data - Data to hash
     * @returns {string} Hash value
     * @public
     */
    computeIntegrityHash(data) {
        try {
            if (typeof CryptoJS === 'undefined') {
                console.warn('CryptoJS not available. Integrity hash cannot be computed.');
                return '';
            }
            
            const jsonString = JSON.stringify(data);
            return CryptoJS.SHA256(jsonString).toString();
        } catch (e) {
            console.error('Error computing integrity hash:', e);
            return '';
        }
    }
    
    /**
     * Verifies the integrity of data using a previously computed hash
     * @param {any} data - Data to verify
     * @param {string} expectedHash - Expected hash value
     * @returns {boolean} Whether integrity check passed
     * @public
     */
    verifyIntegrity(data, expectedHash) {
        try {
            const computedHash = this.computeIntegrityHash(data);
            return computedHash === expectedHash;
        } catch (e) {
            console.error('Error verifying integrity:', e);
            return false;
        }
    }
}

// Export a singleton instance
const securityValidation = new SecurityValidation();
export default securityValidation;
