/**
 * Validator Extension Module
 * Provides advanced validation functions for complex data types,
 * cross-field validation, and conditional validation rules
 */
const validatorExtension = (function() {
    // Configuration
    const config = {
        dateFormats: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'],
        phoneFormats: {
            US: /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
            UK: /^\+?44?[-.\s]?(?:\(?0\)?[-.\s]?)?([1-9][0-9]{2,4})[-.\s]?([0-9]{3,4})[-.\s]?([0-9]{3,4})$/,
            INTL: /^\+[1-9]\d{1,14}$/
        },
        postalCodes: {
            US: /^\d{5}(-\d{4})?$/,
            UK: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
            CA: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i
        },
        urlProtocols: ['http', 'https', 'ftp', 'mailto'],
        maxLengths: {
            email: 254,
            username: 50,
            password: 128,
            comment: 5000,
            address: 200
        }
    };
    
    /**
     * Validate email with comprehensive rules
     * @param {string} email - Email address to validate
     * @param {Object} options - Validation options
     * @returns {Object} - Validation result
     */
    function validateEmail(email, options = {}) {
        if (!email || typeof email !== 'string') {
            return {
                isValid: false,
                message: 'Email is required',
                details: { type: 'required' }
            };
        }
        
        email = email.trim().toLowerCase();
        
        // Check length
        if (email.length > config.maxLengths.email) {
            return {
                isValid: false,
                message: `Email must not exceed ${config.maxLengths.email} characters`,
                details: { type: 'length', max: config.maxLengths.email }
            };
        }
        
        // Basic format validation
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        if (!emailRegex.test(email)) {
            return {
                isValid: false,
                message: 'Invalid email format',
                details: { type: 'format' }
            };
        }
        
        // Split into local and domain parts
        const [localPart, domain] = email.split('@');
        
        // Validate local part
        if (localPart.length > 64) {
            return {
                isValid: false,
                message: 'Email local part must not exceed 64 characters',
                details: { type: 'local_part_length' }
            };
        }
        
        // Check for consecutive dots
        if (localPart.includes('..') || domain.includes('..')) {
            return {
                isValid: false,
                message: 'Email cannot contain consecutive dots',
                details: { type: 'consecutive_dots' }
            };
        }
        
        // Check for dot at start or end
        if (localPart.startsWith('.') || localPart.endsWith('.') || 
            domain.startsWith('.') || domain.endsWith('.')) {
            return {
                isValid: false,
                message: 'Email cannot start or end with a dot',
                details: { type: 'dot_position' }
            };
        }
        
        // Domain validation
        const domainParts = domain.split('.');
        if (domainParts.length < 2) {
            return {
                isValid: false,
                message: 'Invalid domain format',
                details: { type: 'domain_format' }
            };
        }
        
        // TLD validation
        const tld = domainParts[domainParts.length - 1];
        if (tld.length < 2) {
            return {
                isValid: false,
                message: 'Invalid top-level domain',
                details: { type: 'tld' }
            };
        }
        
        // Check for allowed domains (if specified)
        if (options.allowedDomains && !options.allowedDomains.includes(domain)) {
            return {
                isValid: false,
                message: `Email domain not allowed. Must be one of: ${options.allowedDomains.join(', ')}`,
                details: { type: 'domain_not_allowed', allowedDomains: options.allowedDomains }
            };
        }
        
        // Check for blocked domains (if specified)
        if (options.blockedDomains && options.blockedDomains.includes(domain)) {
            return {
                isValid: false,
                message: 'Email domain is blocked',
                details: { type: 'domain_blocked' }
            };
        }
        
        return {
            isValid: true,
            message: null,
            details: { type: 'valid', email, localPart, domain }
        };
    }
    
    /**
     * Validate phone number with international support
     * @param {string} phone - Phone number to validate
     * @param {Object} options - Validation options
     * @returns {Object} - Validation result
     */
    function validatePhoneNumber(phone, options = {}) {
        if (!phone || typeof phone !== 'string') {
            return {
                isValid: false,
                message: 'Phone number is required',
                details: { type: 'required' }
            };
        }
        
        // Remove whitespace and special characters for validation
        const cleanPhone = phone.replace(/[\s()-]/g, '');
        
        // Determine which format to use
        const format = options.format || 'INTL';
        const regex = config.phoneFormats[format];
        
        if (!regex) {
            return {
                isValid: false,
                message: 'Invalid phone format specified',
                details: { type: 'invalid_format' }
            };
        }
        
        if (!regex.test(phone)) {
            return {
                isValid: false,
                message: `Invalid ${format} phone number format`,
                details: { type: 'format', format }
            };
        }
        
        // Additional validation for mobile numbers
        if (options.mobileOnly) {
            // Simple mobile number check (this would need to be more sophisticated in production)
            const mobileRegex = /^(\+\d{1,3}[- ]?)?\(?([2-9][0-9]{2})\)?[- ]?([0-9]{3})[- ]?([0-9]{4})$/;
            if (!mobileRegex.test(cleanPhone)) {
                return {
                    isValid: false,
                    message: 'Must be a mobile phone number',
                    details: { type: 'mobile_only' }
                };
            }
        }
        
        return {
            isValid: true,
            message: null,
            details: { type: 'valid', phone, cleanPhone, format }
        };
    }
    
    /**
     * Validate password with strength requirements
     * @param {string} password - Password to validate
     * @param {Object} options - Validation options
     * @returns {Object} - Validation result
     */
    function validatePassword(password, options = {}) {
        if (!password || typeof password !== 'string') {
            return {
                isValid: false,
                message: 'Password is required',
                details: { type: 'required' }
            };
        }
        
        const minLength = options.minLength || 8;
        const maxLength = options.maxLength || config.maxLengths.password;
        
        // Length validation
        if (password.length < minLength) {
            return {
                isValid: false,
                message: `Password must be at least ${minLength} characters`,
                details: { type: 'length', minLength }
            };
        }
        
        if (password.length > maxLength) {
            return {
                isValid: false,
                message: `Password must not exceed ${maxLength} characters`,
                details: { type: 'length', maxLength }
            };
        }
        
        // Strength requirements
        const requirements = [];
        const failedRequirements = [];
        
        if (options.requireUppercase !== false) {
            requirements.push('uppercase letter');
            if (!/[A-Z]/.test(password)) {
                failedRequirements.push('uppercase letter');
            }
        }
        
        if (options.requireLowercase !== false) {
            requirements.push('lowercase letter');
            if (!/[a-z]/.test(password)) {
                failedRequirements.push('lowercase letter');
            }
        }
        
        if (options.requireNumbers !== false) {
            requirements.push('number');
            if (!/\d/.test(password)) {
                failedRequirements.push('number');
            }
        }
        
        if (options.requireSpecial !== false) {
            requirements.push('special character');
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                failedRequirements.push('special character');
            }
        }
        
        if (failedRequirements.length > 0) {
            return {
                isValid: false,
                message: `Password must contain at least one ${failedRequirements.join(', ')}`,
                details: { type: 'strength', failedRequirements }
            };
        }
        
        // Check for common patterns
        if (options.preventCommonPatterns !== false) {
            const commonPatterns = [
                /^(password|pass|admin|user|demo)/i,
                /^12345/,
                /^qwerty/i,
                /^abc123/i
            ];
            
            for (const pattern of commonPatterns) {
                if (pattern.test(password)) {
                    return {
                        isValid: false,
                        message: 'Password is too common or follows a predictable pattern',
                        details: { type: 'common_pattern' }
                    };
                }
            }
        }
        
        // Check for repeated characters
        if (options.preventRepeating !== false) {
            if (/(.)\1{2,}/.test(password)) {
                return {
                    isValid: false,
                    message: 'Password contains too many repeated characters',
                    details: { type: 'repeated_characters' }
                };
            }
        }
        
        // Password strength score
        let strengthScore = 0;
        strengthScore += password.length >= 12 ? 2 : 1;
        strengthScore += /[A-Z]/.test(password) ? 1 : 0;
        strengthScore += /[a-z]/.test(password) ? 1 : 0;
        strengthScore += /\d/.test(password) ? 1 : 0;
        strengthScore += /[^A-Za-z0-9]/.test(password) ? 2 : 0;
        
        const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
        const strengthLevel = strengthLevels[Math.min(strengthScore - 1, strengthLevels.length - 1)];
        
        return {
            isValid: true,
            message: null,
            details: { 
                type: 'valid', 
                strengthScore, 
                strengthLevel,
                requirements,
                length: password.length
            }
        };
    }
    
    /**
     * Validate date with format flexibility
     * @param {string|Date} date - Date to validate
     * @param {Object} options - Validation options
     * @returns {Object} - Validation result
     */
    function validateDate(date, options = {}) {
        if (!date) {
            return {
                isValid: false,
                message: 'Date is required',
                details: { type: 'required' }
            };
        }
        
        let dateObj;
        
        if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string') {
            // Try to parse with different formats
            const formats = options.formats || config.dateFormats;
            
            for (const format of formats) {
                dateObj = parseDate(date, format);
                if (dateObj && !isNaN(dateObj.getTime())) {
                    break;
                }
            }
        }
        
        if (!dateObj || isNaN(dateObj.getTime())) {
            return {
                isValid: false,
                message: 'Invalid date format',
                details: { type: 'format' }
            };
        }
        
        // Check date range
        if (options.min) {
            const minDate = new Date(options.min);
            if (dateObj < minDate) {
                return {
                    isValid: false,
                    message: `Date must be on or after ${minDate.toLocaleDateString()}`,
                    details: { type: 'min', min: options.min }
                };
            }
        }
        
        if (options.max) {
            const maxDate = new Date(options.max);
            if (dateObj > maxDate) {
                return {
                    isValid: false,
                    message: `Date must be on or before ${maxDate.toLocaleDateString()}`,
                    details: { type: 'max', max: options.max }
                };
            }
        }
        
        // Check for future dates
        if (options.noFuture && dateObj > new Date()) {
            return {
                isValid: false,
                message: 'Future dates are not allowed',
                details: { type: 'future' }
            };
        }
        
        // Check for past dates
        if (options.noPast && dateObj < new Date()) {
            return {
                isValid: false,
                message: 'Past dates are not allowed',
                details: { type: 'past' }
            };
        }
        
        // Check for weekend dates
        if (options.noWeekends) {
            const dayOfWeek = dateObj.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                return {
                    isValid: false,
                    message: 'Weekend dates are not allowed',
                    details: { type: 'weekend' }
                };
            }
        }
        
        return {
            isValid: true,
            message: null,
            details: { type: 'valid', date: dateObj }
        };
    }
    
    /**
     * Validate URL with protocol and domain checks
     * @param {string} url - URL to validate
     * @param {Object} options - Validation options
     * @returns {Object} - Validation result
     */
    function validateURL(url, options = {}) {
        if (!url || typeof url !== 'string') {
            return {
                isValid: false,
                message: 'URL is required',
                details: { type: 'required' }
            };
        }
        
        url = url.trim();
        
        // URL regex pattern
        const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        
        if (!urlRegex.test(url)) {
            return {
                isValid: false,
                message: 'Invalid URL format',
                details: { type: 'format' }
            };
        }
        
        try {
            // Try to parse URL
            let urlObj;
            if (url.startsWith('http://') || url.startsWith('https://')) {
                urlObj = new URL(url);
            } else {
                urlObj = new URL('http://' + url);
            }
            
            // Protocol validation
            if (options.allowedProtocols) {
                if (!options.allowedProtocols.includes(urlObj.protocol.replace(':', ''))) {
                    return {
                        isValid: false,
                        message: `Protocol must be one of: ${options.allowedProtocols.join(', ')}`,
                        details: { type: 'protocol', protocol: urlObj.protocol }
                    };
                }
            } else if (!config.urlProtocols.includes(urlObj.protocol.replace(':', ''))) {
                return {
                    isValid: false,
                    message: 'Unsupported protocol',
                    details: { type: 'protocol', protocol: urlObj.protocol }
                };
            }
            
            // Domain validation
            if (options.allowedDomains) {
                if (!options.allowedDomains.includes(urlObj.hostname)) {
                    return {
                        isValid: false,
                        message: `Domain must be one of: ${options.allowedDomains.join(', ')}`,
                        details: { type: 'domain', domain: urlObj.hostname }
                    };
                }
            }
            
            if (options.blockedDomains) {
                if (options.blockedDomains.includes(urlObj.hostname)) {
                    return {
                        isValid: false,
                        message: 'Domain is blocked',
                        details: { type: 'domain_blocked', domain: urlObj.hostname }
                    };
                }
            }
            
            // Check for localhost/private IPs
            if (options.noLocalhost) {
                const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(urlObj.hostname) ||
                                  /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(urlObj.hostname);
                
                if (isLocalhost) {
                    return {
                        isValid: false,
                        message: 'Local URLs are not allowed',
                        details: { type: 'localhost', hostname: urlObj.hostname }
                    };
                }
            }
            
            return {
                isValid: true,
                message: null,
                details: { 
                    type: 'valid', 
                    url: urlObj.href,
                    protocol: urlObj.protocol,
                    hostname: urlObj.hostname,
                    pathname: urlObj.pathname
                }
            };
        } catch (error) {
            return {
                isValid: false,
                message: 'Invalid URL',
                details: { type: 'parse_error', error: error.message }
            };
        }
    }
    
    /**
     * Validate postal/zip code
     * @param {string} code - Postal code to validate
     * @param {Object} options - Validation options
     * @returns {Object} - Validation result
     */
    function validatePostalCode(code, options = {}) {
        if (!code || typeof code !== 'string') {
            return {
                isValid: false,
                message: 'Postal code is required',
                details: { type: 'required' }
            };
        }
        
        code = code.trim().toUpperCase();
        
        const country = options.country || 'US';
        const regex = config.postalCodes[country];
        
        if (!regex) {
            return {
                isValid: false,
                message: 'Unsupported country for postal code validation',
                details: { type: 'unsupported_country', country }
            };
        }
        
        if (!regex.test(code)) {
            return {
                isValid: false,
                message: `Invalid ${country} postal code format`,
                details: { type: 'format', country }
            };
        }
        
        return {
            isValid: true,
            message: null,
            details: { type: 'valid', code, country }
        };
    }
    
    /**
     * Validate credit card number (Luhn algorithm)
     * @param {string} cardNumber - Credit card number to validate
     * @returns {Object} - Validation result
     */
    function validateCreditCard(cardNumber) {
        if (!cardNumber || typeof cardNumber !== 'string') {
            return {
                isValid: false,
                message: 'Credit card number is required',
                details: { type: 'required' }
            };
        }
        
        // Remove spaces and dashes
        const cleanNumber = cardNumber.replace(/[\s-]/g, '');
        
        // Check if only digits
        if (!/^\d+$/.test(cleanNumber)) {
            return {
                isValid: false,
                message: 'Credit card number must contain only digits',
                details: { type: 'format' }
            };
        }
        
        // Check length
        if (cleanNumber.length < 13 || cleanNumber.length > 19) {
            return {
                isValid: false,
                message: 'Invalid credit card number length',
                details: { type: 'length' }
            };
        }
        
        // Luhn algorithm
        let sum = 0;
        let isEven = false;
        
        for (let i = cleanNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cleanNumber.charAt(i));
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        if (sum % 10 !== 0) {
            return {
                isValid: false,
                message: 'Invalid credit card number',
                details: { type: 'luhn' }
            };
        }
        
        // Detect card type
        let cardType = 'Unknown';
        if (/^4/.test(cleanNumber)) {
            cardType = 'Visa';
        } else if (/^5[1-5]/.test(cleanNumber)) {
            cardType = 'MasterCard';
        } else if (/^3[47]/.test(cleanNumber)) {
            cardType = 'American Express';
        } else if (/^6(?:011|5)/.test(cleanNumber)) {
            cardType = 'Discover';
        }
        
        return {
            isValid: true,
            message: null,
            details: { 
                type: 'valid', 
                cardType,
                lastFour: cleanNumber.slice(-4),
                length: cleanNumber.length
            }
        };
    }
    
    /**
     * Validate complex data with nested rules
     * @param {any} data - Data to validate
     * @param {Object} rules - Validation rules
     * @returns {Object} - Validation result
     */
    function validateComplexData(data, rules) {
        const errors = [];
        
        function validateField(value, fieldRules, path = '') {
            for (const rule of fieldRules) {
                switch (rule.type) {
                    case 'required':
                        if (value === undefined || value === null || value === '') {
                            errors.push({
                                path,
                                message: rule.message || `${path} is required`,
                                rule: 'required'
                            });
                        }
                        break;
                        
                    case 'type':
                        if (typeof value !== rule.expected) {
                            errors.push({
                                path,
                                message: rule.message || `${path} must be of type ${rule.expected}`,
                                rule: 'type',
                                expected: rule.expected,
                                actual: typeof value
                            });
                        }
                        break;
                        
                    case 'min':
                        if (typeof value === 'number' && value < rule.value) {
                            errors.push({
                                path,
                                message: rule.message || `${path} must be at least ${rule.value}`,
                                rule: 'min',
                                value: rule.value
                            });
                        } else if (typeof value === 'string' && value.length < rule.value) {
                            errors.push({
                                path,
                                message: rule.message || `${path} must have at least ${rule.value} characters`,
                                rule: 'min',
                                value: rule.value
                            });
                        }
                        break;
                        
                    case 'max':
                        if (typeof value === 'number' && value > rule.value) {
                            errors.push({
                                path,
                                message: rule.message || `${path} must be at most ${rule.value}`,
                                rule: 'max',
                                value: rule.value
                            });
                        } else if (typeof value === 'string' && value.length > rule.value) {
                            errors.push({
                                path,
                                message: rule.message || `${path} must have at most ${rule.value} characters`,
                                rule: 'max',
                                value: rule.value
                            });
                        }
                        break;
                        
                    case 'pattern':
                        if (typeof value === 'string' && !rule.regex.test(value)) {
                            errors.push({
                                path,
                                message: rule.message || `${path} does not match required pattern`,
                                rule: 'pattern'
                            });
                        }
                        break;
                        
                    case 'enum':
                        if (!rule.values.includes(value)) {
                            errors.push({
                                path,
                                message: rule.message || `${path} must be one of: ${rule.values.join(', ')}`,
                                rule: 'enum',
                                values: rule.values
                            });
                        }
                        break;
                        
                    case 'custom':
                        const result = rule.validator(value, data, path);
                        if (result !== true) {
                            errors.push({
                                path,
                                message: typeof result === 'string' ? result : rule.message || `${path} validation failed`,
                                rule: 'custom'
                            });
                        }
                        break;
                        
                    case 'array':
                        if (!Array.isArray(value)) {
                            errors.push({
                                path,
                                message: rule.message || `${path} must be an array`,
                                rule: 'array'
                            });
                        } else if (rule.itemRules) {
                            value.forEach((item, index) => {
                                validateField(item, rule.itemRules, `${path}[${index}]`);
                            });
                        }
                        break;
                        
                    case 'object':
                        if (typeof value !== 'object' || value === null) {
                            errors.push({
                                path,
                                message: rule.message || `${path} must be an object`,
                                rule: 'object'
                            });
                        } else if (rule.properties) {
                            Object.keys(rule.properties).forEach(key => {
                                validateField(value[key], rule.properties[key], `${path}.${key}`);
                            });
                        }
                        break;
                }
            }
        }
        
        validateField(data, rules);
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate with conditional rules
     * @param {Object} data - Data to validate
     * @param {Function} rulesGenerator - Function that generates rules based on data
     * @returns {Object} - Validation result
     */
    function validateConditional(data, rulesGenerator) {
        const rules = rulesGenerator(data);
        return validateComplexData(data, rules);
    }
    
    /**
     * Parse date from string with format
     * @private
     */
    function parseDate(dateStr, format) {
        // Simple date parsing implementation
        // In production, use a library like moment.js or date-fns
        try {
            if (format === 'YYYY-MM-DD') {
                const [year, month, day] = dateStr.split('-').map(Number);
                return new Date(year, month - 1, day);
            } else if (format === 'DD/MM/YYYY') {
                const [day, month, year] = dateStr.split('/').map(Number);
                return new Date(year, month - 1, day);
            } else if (format === 'MM/DD/YYYY') {
                const [month, day, year] = dateStr.split('/').map(Number);
                return new Date(year, month - 1, day);
            }
            return new Date(dateStr);
        } catch (error) {
            return null;
        }
    }
    
    // Public API
    return {
        validateEmail,
        validatePhoneNumber,
        validatePassword,
        validateDate,
        validateURL,
        validatePostalCode,
        validateCreditCard,
        validateComplexData,
        validateConditional,
        config
    };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = validatorExtension;
} else {
    window.validatorExtension = validatorExtension;
}