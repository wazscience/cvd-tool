/**
 * Input Sanitizer Module
 * Provides comprehensive input sanitization and validation functions
 * to prevent XSS, injection attacks, and ensure data integrity
 */
const inputSanitizer = (function() {
  // Configuration
  const config = {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
      '*': ['class', 'id']
    },
    allowedProtocols: ['http', 'https', 'mailto'],
    maxLength: {
      text: 1000,
      textarea: 5000,
      email: 254,
      url: 2048,
      phone: 20
    },
    patterns: {
      email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      phone: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
      url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
      alphanumeric: /^[a-zA-Z0-9]+$/,
      numeric: /^[0-9]+$/,
      decimal: /^[0-9]*\.?[0-9]+$/
    }
  };

  /**
     * Sanitize string input by removing dangerous characters
     * @param {string} input - String to sanitize
     * @param {Object} options - Sanitization options
     * @returns {string} - Sanitized string
     */
  function sanitizeString(input, options = {}) {
    if (typeof input !== 'string') {
      return '';
    }

    // Trim whitespace
    let sanitized = input.trim();

    // Apply max length
    const maxLength = options.maxLength || config.maxLength.text;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Escape special characters
    sanitized = escapeHtml(sanitized);

    // Remove non-printable characters
    sanitized = sanitized.replace(/[^\x20-\x7E]/g, '');

    // Additional pattern-based sanitization if specified
    if (options.pattern && config.patterns[options.pattern]) {
      if (!config.patterns[options.pattern].test(sanitized)) {
        return '';
      }
    }

    return sanitized;
  }

  /**
     * Sanitize HTML content
     * @param {string} html - HTML string to sanitize
     * @param {Object} options - Sanitization options
     * @returns {string} - Sanitized HTML
     */
  function sanitizeHTML(html, options = {}) {
    if (typeof html !== 'string') {
      return '';
    }

    // Create a temporary DOM element
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Get all elements
    const elements = temp.getElementsByTagName('*');

    // Process elements from the end to avoid issues with removal
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];

      // Remove disallowed tags
      if (!isAllowedTag(element.tagName.toLowerCase(), options)) {
        element.parentNode.removeChild(element);
        continue;
      }

      // Process attributes
      sanitizeAttributes(element, options);
    }

    return temp.innerHTML;
  }

  /**
     * Sanitize email address
     * @param {string} email - Email address to sanitize
     * @returns {string} - Sanitized email
     */
  function sanitizeEmail(email) {
    if (typeof email !== 'string') {
      return '';
    }

    let sanitized = email.trim().toLowerCase();

    // Remove any characters that aren't typically in emails
    sanitized = sanitized.replace(/[^\w\-@.+]/g, '');

    // Validate email format
    if (!config.patterns.email.test(sanitized)) {
      return '';
    }

    // Apply max length
    if (sanitized.length > config.maxLength.email) {
      return '';
    }

    return sanitized;
  }

  /**
     * Sanitize URL
     * @param {string} url - URL to sanitize
     * @returns {string} - Sanitized URL
     */
  function sanitizeURL(url) {
    if (typeof url !== 'string') {
      return '';
    }

    let sanitized = url.trim();

    // Decode URL to handle encoded characters
    try {
      sanitized = decodeURIComponent(sanitized);
    } catch (e) {
      // If decoding fails, continue with original
    }

    // Remove javascript: and data: URLs
    if (sanitized.match(/^(javascript|data):/i)) {
      return '';
    }

    // Check protocol
    const protocolMatch = sanitized.match(/^([a-zA-Z]+):/);
    if (protocolMatch && !config.allowedProtocols.includes(protocolMatch[1].toLowerCase())) {
      return '';
    }

    // Apply max length
    if (sanitized.length > config.maxLength.url) {
      return '';
    }

    // Encode special characters
    return encodeURI(sanitized);
  }

  /**
     * Sanitize phone number
     * @param {string} phone - Phone number to sanitize
     * @returns {string} - Sanitized phone number
     */
  function sanitizePhone(phone) {
    if (typeof phone !== 'string') {
      return '';
    }

    let sanitized = phone.trim();

    // Remove all non-numeric characters except +, -, (), and spaces
    sanitized = sanitized.replace(/[^\d\s+\-()]/g, '');

    // Validate phone format
    if (!config.patterns.phone.test(sanitized)) {
      return '';
    }

    // Apply max length
    if (sanitized.length > config.maxLength.phone) {
      return '';
    }

    return sanitized;
  }

  /**
     * Sanitize numeric input
     * @param {string|number} value - Value to sanitize
     * @param {Object} options - Options (min, max, decimal)
     * @returns {number|null} - Sanitized number or null if invalid
     */
  function sanitizeNumber(value, options = {}) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    let num;

    // Handle string input
    if (typeof value === 'string') {
      // Remove non-numeric characters except decimal point and minus
      const cleaned = value.replace(/[^\d.-]/g, '');

      // Parse as float or int
      num = options.decimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
    } else {
      num = Number(value);
    }

    // Check if valid number
    if (isNaN(num)) {
      return null;
    }

    // Apply min/max constraints
    if (options.min !== undefined && num < options.min) {
      return options.min;
    }
    if (options.max !== undefined && num > options.max) {
      return options.max;
    }

    // Round to specified decimal places
    if (options.decimalPlaces !== undefined) {
      const factor = Math.pow(10, options.decimalPlaces);
      num = Math.round(num * factor) / factor;
    }

    return num;
  }

  /**
     * Sanitize file name
     * @param {string} filename - File name to sanitize
     * @returns {string} - Sanitized file name
     */
  function sanitizeFileName(filename) {
    if (typeof filename !== 'string') {
      return '';
    }

    // Remove path components
    let sanitized = filename.replace(/^.*[\\\/]/, '');

    // Remove unsafe characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Prevent directory traversal
    sanitized = sanitized.replace(/\.\./g, '');

    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.split('.').pop();
      const base = sanitized.substring(0, 250 - ext.length);
      sanitized = base + '.' + ext;
    }

    return sanitized;
  }

  /**
     * Sanitize SQL input
     * @param {string} input - SQL input to sanitize
     * @returns {string} - Sanitized SQL string
     */
  function sanitizeSQL(input) {
    if (typeof input !== 'string') {
      return '';
    }

    // Escape single quotes
    let sanitized = input.replace(/'/g, '\'\'');

    // Remove comments
    sanitized = sanitized.replace(/--.*$/gm, '');
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');

    // Remove semicolons to prevent statement termination
    sanitized = sanitized.replace(/;/g, '');

    return sanitized;
  }

  /**
     * Sanitize JSON input
     * @param {string} json - JSON string to sanitize
     * @returns {Object|null} - Parsed and sanitized JSON object or null
     */
  function sanitizeJSON(json) {
    if (typeof json !== 'string') {
      return null;
    }

    try {
      // Parse JSON
      const parsed = JSON.parse(json);

      // Recursively sanitize object values
      return sanitizeObject(parsed);
    } catch (e) {
      console.warn('Invalid JSON input:', e);
      return null;
    }
  }

  /**
     * Sanitize object recursively
     * @param {Object} obj - Object to sanitize
     * @returns {Object} - Sanitized object
     */
  function sanitizeObject(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }

    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize key
        const sanitizedKey = sanitizeString(key, { pattern: 'alphanumeric' });

        // Sanitize value
        let value = obj[key];
        if (typeof value === 'string') {
          value = sanitizeString(value);
        } else if (typeof value === 'object') {
          value = sanitizeObject(value);
        }

        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  /**
     * Escape HTML special characters
     * @private
     */
  function escapeHtml(str) {
    const htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return str.replace(/[&<>"'`=\/]/g, char => htmlEscapes[char]);
  }

  /**
     * Check if tag is allowed
     * @private
     */
  function isAllowedTag(tagName, options) {
    const allowedTags = options.allowedTags || config.allowedTags;
    return allowedTags.includes(tagName.toLowerCase());
  }

  /**
     * Sanitize element attributes
     * @private
     */
  function sanitizeAttributes(element, options) {
    const allowedAttributes = options.allowedAttributes || config.allowedAttributes;
    const attributes = Array.from(element.attributes);

    attributes.forEach(attr => {
      const attrName = attr.name.toLowerCase();
      const tagName = element.tagName.toLowerCase();

      // Check if attribute is allowed
      let isAllowed = false;

      if (allowedAttributes[tagName] && allowedAttributes[tagName].includes(attrName)) {
        isAllowed = true;
      } else if (allowedAttributes['*'] && allowedAttributes['*'].includes(attrName)) {
        isAllowed = true;
      }

      if (!isAllowed) {
        element.removeAttribute(attr.name);
        return;
      }

      // Sanitize attribute value
      let value = attr.value;

      // Special handling for href and src
      if (attrName === 'href' || attrName === 'src') {
        value = sanitizeURL(value);
      }

      // Special handling for event handlers
      if (attrName.startsWith('on')) {
        element.removeAttribute(attr.name);
        return;
      }

      element.setAttribute(attr.name, value);
    });
  }

  /**
     * Create a sanitized DOM element
     * @param {string} tagName - Element tag name
     * @param {Object} attributes - Element attributes
     * @param {string} content - Element content
     * @returns {HTMLElement} - Sanitized element
     */
  function createSafeElement(tagName, attributes = {}, content = '') {
    // Sanitize tag name
    const safeTagName = sanitizeString(tagName, { pattern: 'alphanumeric' });

    if (!isAllowedTag(safeTagName, {})) {
      throw new Error(`Tag "${tagName}" is not allowed`);
    }

    const element = document.createElement(safeTagName);

    // Add attributes
    for (const [key, value] of Object.entries(attributes)) {
      const safeKey = sanitizeString(key, { pattern: 'alphanumeric' });
      let safeValue = value;

      if (safeKey === 'href' || safeKey === 'src') {
        safeValue = sanitizeURL(value);
      } else {
        safeValue = sanitizeString(value);
      }

      element.setAttribute(safeKey, safeValue);
    }

    // Add content
    if (content) {
      element.textContent = sanitizeString(content);
    }

    return element;
  }

  /**
     * Sanitize form data
     * @param {Object} formData - Form data object
     * @param {Object} rules - Sanitization rules
     * @returns {Object} - Sanitized form data
     */
  function sanitizeFormData(formData, rules = {}) {
    const sanitized = {};

    for (const [key, value] of Object.entries(formData)) {
      const rule = rules[key] || {};

      switch (rule.type) {
        case 'email':
          sanitized[key] = sanitizeEmail(value);
          break;
        case 'url':
          sanitized[key] = sanitizeURL(value);
          break;
        case 'phone':
          sanitized[key] = sanitizePhone(value);
          break;
        case 'number':
          sanitized[key] = sanitizeNumber(value, rule.options);
          break;
        case 'html':
          sanitized[key] = sanitizeHTML(value, rule.options);
          break;
        default:
          sanitized[key] = sanitizeString(value, rule.options);
      }
    }

    return sanitized;
  }

  // Public API
  return {
    sanitizeString,
    sanitizeHTML,
    sanitizeEmail,
    sanitizeURL,
    sanitizePhone,
    sanitizeNumber,
    sanitizeFileName,
    sanitizeSQL,
    sanitizeJSON,
    sanitizeObject,
    createSafeElement,
    sanitizeFormData,
    escapeHtml,
    config
  };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = inputSanitizer;
} else {
  window.inputSanitizer = inputSanitizer;
}
