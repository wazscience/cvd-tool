/**
 * Input Sanitizer Service Module (Fused & Enhanced)
 * @file /js/utils/input-sanitizer.js
 * @description Provides robust methods for sanitizing inputs, leveraging DOMPurify
 * for HTML, and includes CSRF token utilities. Based on prior versions and
 * user's Implementation Guide PDF.
 * @version 1.1.0
 * @exports InputSanitizerService
 */

'use strict';

// DOMPurify should be loaded globally, e.g., via a script tag in index.html
// import DOMPurify from 'dompurify'; // If using a module bundler

class InputSanitizerService {
    /**
     * Creates or returns the singleton instance of InputSanitizerService.
     * @param {object} [options={}] - Configuration options.
     * @param {object} [options.domPurifyConfig={}] - Default DOMPurify configuration.
     * @param {string} [options.csrfTokenName='_csrfToken'] - Name for CSRF token field in forms.
     * @param {string} [options.csrfStorageKey='csrfToken'] - sessionStorage key for CSRF token.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (InputSanitizerService.instance) {
            return InputSanitizerService.instance;
        }

        this.options = {
            domPurifyConfig: { // Sensible defaults, can be overridden
                USE_PROFILES: { html: true, svg: false, mathMl: false },
                FORBID_TAGS: ['style', 'form', 'input', 'textarea', 'select', 'button', 'iframe', 'object', 'embed', 'video', 'audio'],
                FORBID_ATTR: [
                    'onerror', 'onload', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
                    'onselect', 'oninput', 'onabort', 'onbeforecopy', 'onbeforecut', 'onbeforepaste',
                    'oncopy', 'oncut', 'onpaste', 'ondrag', 'ondragend', 'ondragenter',
                    'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'onmousedown',
                    'onmousemove', 'onmouseout', 'onmouseup', 'onmousewheel', 'onscroll',
                    'oncontextmenu', 'oninvalid', 'formaction'
                ],
                ALLOW_DATA_ATTR: false, // Be cautious with allowing data attributes
                SAFE_FOR_TEMPLATES: false, // Set to true if using with JS template literals and know the risks
                WHOLE_DOCUMENT: false,
                RETURN_DOM: false,
                RETURN_DOM_FRAGMENT: false,
            },
            csrfTokenName: '_csrfToken',
            csrfStorageKey: 'csrfToken_app_session',
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger(),
            EventBus: window.EventBus,
            DOMPurify: window.DOMPurify, // Expect DOMPurify to be globally available
            CryptoService: window.CryptoService, // For CSRF token generation
            ...options.dependencies,
        };

        if (!this.dependencies.DOMPurify && this.options.domPurifyConfig.USE_PROFILES.html) {
            this._log('critical', 'DOMPurify library not found, but HTML sanitization is configured. HTML sanitization will be severely limited. Please include DOMPurify.');
        }
        if (!this.dependencies.CryptoService && this.options.csrfTokenName) {
             this._log('warn', 'CryptoService not found. CSRF token generation will be less secure.');
        }

        InputSanitizerService.instance = this;
        this._log('info', 'Input Sanitizer Service Initialized (v1.1.0).');
    }

    _getFallbackLogger() {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`InputSanitizer Fallback Logger [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => console[lvl]?.(`InputSanitizer Fallback Logger [${lvl}]: ${msg}`, data) || console.log(`InputSanitizer Fallback Logger [${lvl}]: ${msg}`, data)
        };
    }

    /**
     * Escapes HTML special characters in a string.
     * Use this for displaying user input as plain text within HTML.
     * Similar to `sanitize` in user's PDF for xss-protection.js.
     * @param {*} rawInput - The input to escape.
     * @returns {string} The escaped string.
     */
    escapeHTML(rawInput) {
        if (rawInput === null || rawInput === undefined) return '';
        const strInput = String(rawInput);
        return strInput
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;') // More robust than &apos;
            .replace(/\//g, '&#x2F;'); // Escape forward slash
    }

    /**
     * Sanitizes a string intended to be injected as HTML content.
     * Primarily uses DOMPurify if available.
     * @param {string} htmlString - The HTML string to sanitize.
     * @param {object} [customDomPurifyConfig] - Optional custom DOMPurify config for this call.
     * @returns {string} The sanitized HTML string.
     */
    sanitizeHTML(htmlString, customDomPurifyConfig) {
        if (htmlString === null || htmlString === undefined) return '';
        const strHtml = String(htmlString);

        if (this.dependencies.DOMPurify) {
            const config = { ...this.options.domPurifyConfig, ...customDomPurifyConfig };
            try {
                const clean = this.dependencies.DOMPurify.sanitize(strHtml, config);
                if (strHtml !== clean) {
                    this._log('debug', 'DOMPurify sanitized HTML input.', { original: strHtml.substring(0,100),_cleaned:clean.substring(0,100) });
                }
                return clean;
            } catch (error) {
                this._log('error', 'Error during DOMPurify sanitization. Falling back to basic escaping.', { error, input: strHtml.substring(0, 100) });
                return this.escapeHTML(strHtml); // Fallback on error
            }
        } else {
            this._log('warn', 'DOMPurify unavailable. Using basic HTML escaping (textContent equivalent).');
            return this.escapeHTML(strHtml);
        }
    }

    /**
     * Sanitizes a string for safe use in an HTML attribute value.
     * @param {*} rawInput - The input value.
     * @returns {string} Sanitized string suitable for HTML attributes.
     */
    sanitizeForAttribute(rawInput) {
        // Using escapeHTML is generally safe for attributes as it escapes quotes.
        return this.escapeHTML(rawInput);
    }

    /**
     * Basic sanitization for URLs to prevent javascript: or data: XSS.
     * @param {string} urlString - The URL to sanitize.
     * @returns {string} Sanitized URL, or empty string if potentially unsafe.
     */
    sanitizeURL(urlString) {
        if (urlString === null || urlString === undefined) return '';
        const strUrl = String(urlString).trim();

        const safeProtocolRegex = /^(https?|ftp|mailto|tel):/i;
        const dangerousProtocolRegex = /^(javascript|data|vbscript):/i;

        if (dangerousProtocolRegex.test(strUrl)) {
            this._log('warn', 'Dangerous URL protocol detected and blocked.', { url: strUrl });
            return ''; // Block dangerous protocols explicitly
        }

        if (!safeProtocolRegex.test(strUrl) && !strUrl.startsWith('/') && !strUrl.startsWith('#') && !strUrl.startsWith('?')) {
             // If it's not a known safe absolute URL or a relative path, treat with caution
            if (strUrl.includes(':') || strUrl.includes('//')) { // Might be an unknown protocol or malformed
                 this._log('warn', 'Potentially unsafe or malformed URL. Sanitizing to empty.', { url: strUrl });
                 return '';
            }
             // Otherwise, assume it's a relative path fragment and escape it for safety if used in HTML context later
             return this.escapeHTML(strUrl);
        }

        try {
            const parsedUrl = new URL(strUrl, window.location.origin); // Provide a base for relative URLs
            if (safeProtocolRegex.test(parsedUrl.protocol)) {
                return parsedUrl.href;
            } else if (dangerousProtocolRegex.test(parsedUrl.protocol)){
                 this._log('warn', 'URL protocol changed after parsing to dangerous. Blocking.', { original: strUrl, parsed: parsedUrl.href });
                 return '';
            } else {
                // If protocol is something else (e.g. blob, file), and not explicitly allowed, block.
                this._log('warn', 'URL protocol not in explicit whitelist after parsing. Blocking.', { original: strUrl, parsed: parsedUrl.href });
                return '';
            }
        } catch (e) {
            this._log('debug', 'Could not parse URL; returning escaped original (assuming relative path or fragment).', { url: strUrl });
            return this.escapeHTML(strUrl); // If it's not a valid URL, escape it for text display
        }
    }

    /**
     * Recursively sanitizes string properties of an object or elements of an array.
     * @param {object|Array<any>} data - The object or array to sanitize.
     * @param {Function} [stringSanitizerFn=this.escapeHTML] - The sanitizer function for strings.
     * @param {number} [_depth=0] - Current recursion depth.
     * @param {number} [_maxDepth=10] - Max recursion depth to prevent infinite loops.
     * @returns {object|Array<any>} The sanitized object or array.
     */
    sanitizeObjectOrArray(data, stringSanitizerFn, _depth = 0, _maxDepth = 10) {
        const sanitizer = typeof stringSanitizerFn === 'function' ? stringSanitizerFn : this.escapeHTML.bind(this);

        if (_depth > _maxDepth) {
            this._log('warn', 'Max recursion depth reached in sanitizeObjectOrArray. Halting deep sanitization.');
            return data; // Or throw error, or return a placeholder
        }

        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeObjectOrArray(item, sanitizer, _depth + 1, _maxDepth));
        } else if (data !== null && typeof data === 'object') {
            const sanitizedObject = {};
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    const value = data[key];
                    if (typeof value === 'string') {
                        sanitizedObject[key] = sanitizer(value);
                    } else {
                        sanitizedObject[key] = this.sanitizeObjectOrArray(value, sanitizer, _depth + 1, _maxDepth);
                    }
                }
            }
            return sanitizedObject;
        }
        if (typeof data === 'string') return sanitizer(data);
        return data; // Return non-string, non-object, non-array types as is
    }

    /**
     * Sanitizes all values in a FormData object.
     * Based on `sanitizeForm` from user's PDF.
     * @param {FormData} formData - The FormData object.
     * @returns {object} A new object with sanitized key-value pairs.
     */
    sanitizeFormData(formData) {
        const sanitizedData = {};
        if (!(formData instanceof FormData)) {
            this._log('error', 'sanitizeFormData: Input is not a FormData object.');
            return sanitizedData;
        }
        for (const [key, value] of formData.entries()) {
            if (typeof value === 'string') {
                // Using escapeHTML for general form data; use sanitizeHTML if HTML is expected.
                sanitizedData[key] = this.escapeHTML(value);
            } else {
                sanitizedData[key] = value; // Handle Files, etc., as is.
            }
        }
        // Note: Checkboxes not checked are not in FormData. This needs to be handled by the form processing logic.
        return sanitizedData;
    }

    /**
     * Safely sets the HTML content of an element.
     * If sanitize is true (default), uses `textContent` to prevent XSS.
     * If sanitize is false, uses `innerHTML` (use with extreme caution and only with trusted HTML).
     * Based on `setElementHTML` from user's PDF.
     * @param {HTMLElement} element - The target DOM element.
     * @param {string} html - The HTML string (if sanitize=false) or text string (if sanitize=true).
     * @param {boolean} [sanitizeOutput=true] - If true, sets as textContent. If false, uses innerHTML.
     */
    setElementContent(element, content, sanitizeOutput = true) {
        if (!element || !(element instanceof HTMLElement)) {
            this._log('error', 'setElementContent: Invalid target element.');
            return;
        }
        if (sanitizeOutput) {
            element.textContent = content; // Safest: treats content as plain text
        } else {
            // USE WITH EXTREME CAUTION: 'content' should be pre-sanitized (e.g. via sanitizeHTML)
            // or be from a fully trusted source if sanitizeOutput is false.
            this._log('warn', 'setElementContent called with sanitizeOutput=false. Ensure content is pre-sanitized or trusted.');
            element.innerHTML = content;
        }
    }

    /**
     * Creates a DOM element with sanitized attributes.
     * Based on `createElement` from user's PDF.
     * @param {string} tagName - The HTML tag name.
     * @param {object} [attributes={}] - Key-value pairs for attributes. Values will be sanitized.
     * @param {string|Node} [textContentOrNode=''] - Text content or a Node to append. Text will be sanitized.
     * @returns {HTMLElement|null} The created element or null on error.
     */
    createElement(tagName, attributes = {}, textContentOrNode = '') {
        if (!tagName || typeof tagName !== 'string') {
            this._log('error', 'createElement: Invalid tagName.');
            return null;
        }
        const element = document.createElement(tagName);
        for (const [key, value] of Object.entries(attributes)) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.startsWith('on') || ['href', 'src', 'action', 'formaction'].includes(lowerKey) && String(value).toLowerCase().startsWith('javascript:')) {
                this._log('warn', `createElement: Blocked potentially unsafe attribute: ${key} for tag ${tagName}`);
                continue;
            }
            element.setAttribute(key, this.sanitizeForAttribute(value));
        }

        if (textContentOrNode instanceof Node) {
            element.appendChild(textContentOrNode);
        } else if (textContentOrNode !== null && textContentOrNode !== undefined) {
            element.textContent = String(textContentOrNode); // Sets as text, naturally sanitized
        }
        return element;
    }


    // --- CSRF Token Management (Inspired by user's PDF for xss-protection.js) ---

    /**
     * Generates a cryptographically strong random token for CSRF protection.
     * Based on `_generateRandomToken` from user's PDF.
     * @param {number} [length=32] - Length of the token in bytes.
     * @returns {string|null} Hex-encoded token or null if crypto fails.
     */
    generateCsrfToken(length = 32) {
        if (!this.isCryptoAvailableForCsrf()) return this._fallbackCsrfToken();

        try {
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            this._log('error', 'Failed to generate secure CSRF token with window.crypto.', error);
            return this._fallbackCsrfToken();
        }
    }

    _fallbackCsrfToken(length = 32){
        let token = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < length * 2; i++) { // Approx hex length
            token += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        this._log('warn', 'Using fallback CSRF token generation.');
        return token;
    }

    isCryptoAvailableForCsrf(){
        return window.crypto && window.crypto.getRandomValues;
    }

    /**
     * Stores the CSRF token (e.g., in sessionStorage).
     * @param {string} token - The CSRF token.
     * @returns {boolean} True if successful.
     */
    storeCsrfToken(token) {
        if (!token) return false;
        try {
            sessionStorage.setItem(this.options.csrfStorageKey, token);
            return true;
        } catch (e) {
            this._log('error', 'Failed to store CSRF token in sessionStorage.', e);
            return false;
        }
    }

    /**
     * Retrieves the stored CSRF token.
     * @returns {string|null} The stored token or null.
     */
    getStoredCsrfToken() {
        try {
            return sessionStorage.getItem(this.options.csrfStorageKey);
        } catch (e) {
            this._log('error', 'Failed to retrieve CSRF token from sessionStorage.', e);
            return null;
        }
    }

    /**
     * Adds a CSRF token as a hidden field to a given form.
     * Generates and stores a new token if one isn't provided.
     * Based on `protectForm` from user's PDF.
     * @param {HTMLFormElement|string} formElementOrSelector - The form element or its selector.
     * @param {string} [token] - Optional token to use. If not provided, a new one is generated.
     * @returns {boolean} True if token was added successfully.
     */
    addCsrfTokenToForm(formElementOrSelector, token) {
        const form = typeof formElementOrSelector === 'string'
            ? document.querySelector(formElementOrSelector)
            : formElementOrSelector;

        if (!form || !(form instanceof HTMLFormElement)) {
            this._log('error', 'addCsrfTokenToForm: Invalid form element provided.');
            return false;
        }

        const tokenToUse = token || this.generateCsrfToken();
        if (!tokenToUse) {
             this._log('error', 'addCsrfTokenToForm: Failed to generate CSRF token.');
            return false;
        }

        this.storeCsrfToken(tokenToUse); // Store it for validation

        let tokenField = form.elements[this.options.csrfTokenName];
        if (!tokenField) {
            tokenField = document.createElement('input');
            tokenField.type = 'hidden';
            tokenField.name = this.options.csrfTokenName;
            form.appendChild(tokenField);
        }
        tokenField.value = tokenToUse;
        this._log('debug', `CSRF token added/updated for form "${form.id || form.name || 'unnamed'}".`);
        return true;
    }

    /**
     * Validates a submitted CSRF token against the stored one.
     * @param {string} submittedToken - The token from the form/request.
     * @returns {boolean} True if valid.
     */
    validateCsrfToken(submittedToken) {
        const storedToken = this.getStoredCsrfToken();
        if (!submittedToken || !storedToken || submittedToken !== storedToken) {
            this._log('warn', 'CSRF token validation failed.');
            return false;
        }
        // For single-use tokens (more secure), remove it after successful validation
        // sessionStorage.removeItem(this.options.csrfStorageKey);
        return true;
    }


    /** Internal logging helper. */
    _log(level, message, data) {
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `InputSanitizer: ${message}`;
        if (level === 'critical' && logger?.handleError) {
             logger.handleError(data || message, 'InputSanitizer', 'critical', data ? { msg: message } : {});
        } else if (level === 'error' && logger?.handleError) {
             logger.handleError(data || message, 'InputSanitizer', 'error', data ? { msg: message } : {});
        } else if (logger?.log) {
            logger.log(level, logMessage, data);
        } else {
            console[level]?.(logMessage, data);
        }
    }
}

// Instantiate and export the singleton service
const InputSanitizerInstance = new InputSanitizerService();
// window.InputSanitizer = InputSanitizerInstance; // Optional global
// export default InputSanitizerInstance;