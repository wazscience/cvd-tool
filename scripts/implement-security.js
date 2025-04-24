# Create script for implementing security enhancements
cat > scripts/implement-security.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Paths to files
const indexHtmlPath = path.join(process.cwd(), 'index.html');
const jsDir = path.join(process.cwd(), 'js');

// Ensure js directory exists
if (!fs.existsSync(jsDir)) {
  fs.mkdirSync(jsDir, { recursive: true });
}

// Read the index.html file if it exists
let indexHtml = '';
if (fs.existsSync(indexHtmlPath)) {
  indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
} else {
  // Create basic structure if file doesn't exist
  indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CVD Risk Toolkit with Lp(a) Post-Test Modifier</title>
</head>
<body>
    <!-- Content will be added by the script -->
</body>
</html>`;
}

// Add Content Security Policy
if (!indexHtml.includes('<meta http-equiv="Content-Security-Policy"')) {
  const cspMeta = `    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'">`;
  
  // Insert after other meta tags
  indexHtml = indexHtml.replace('</head>', `${cspMeta}\n</head>`);
  console.log('Added Content Security Policy meta tag');
}

// Create encrypted storage utility
const secureStoragePath = path.join(jsDir, 'utils', 'secure-storage.js');

// Ensure the utils directory exists
if (!fs.existsSync(path.join(jsDir, 'utils'))) {
  fs.mkdirSync(path.join(jsDir, 'utils'), { recursive: true });
}

const secureStorageContent = `/**
 * Secure Storage Utility
 * Provides encrypted local storage functionality
 */
const secureStorage = (function() {
  // Generate or retrieve encryption key from sessionStorage
  let encryptionKey = sessionStorage.getItem('encryptionKey');
  if (!encryptionKey) {
    // Generate a random key
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    encryptionKey = Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
    sessionStorage.setItem('encryptionKey', encryptionKey);
  }
  
  /**
   * Encrypt data before storing
   * @param {any} data - Data to encrypt
   * @returns {string} - Encrypted data
   */
  function encrypt(data) {
    try {
      // Convert to string if not already
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Use CryptoJS if available
      if (typeof CryptoJS !== 'undefined') {
        return CryptoJS.AES.encrypt(dataStr, encryptionKey).toString();
      }
      
      // Fallback for when CryptoJS is not available
      console.warn('CryptoJS not available, using basic encoding');
      return btoa(dataStr); // Basic encoding, not true encryption
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }
  
  /**
   * Decrypt stored data
   * @param {string} encryptedData - Encrypted data to decrypt
   * @returns {any} - Decrypted data
   */
  function decrypt(encryptedData) {
    try {
      if (!encryptedData) return null;
      
      // Use CryptoJS if available
      if (typeof CryptoJS !== 'undefined') {
        const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        
        try {
          // Try to parse as JSON
          return JSON.parse(decryptedString);
        } catch {
          // Return as string if not valid JSON
          return decryptedString;
        }
      }
      
      // Fallback for when CryptoJS is not available
      console.warn('CryptoJS not available, using basic decoding');
      const decodedStr = atob(encryptedData); // Basic decoding
      
      try {
        // Try to parse as JSON
        return JSON.parse(decodedStr);
      } catch {
        // Return as string if not valid JSON
        return decodedStr;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }
  
  /**
   * Store data securely
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   * @returns {boolean} - Success status
   */
  function setItem(key, data) {
    try {
      const encryptedData = encrypt(data);
      if (encryptedData) {
        localStorage.setItem('secure_' + key, encryptedData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('SecureStorage setItem error:', error);
      return false;
    }
  }
  
  /**
   * Retrieve securely stored data
   * @param {string} key - Storage key
   * @returns {any} - Retrieved data or null if not found
   */
  function getItem(key) {
    try {
      const encryptedData = localStorage.getItem('secure_' + key);
      if (!encryptedData) return null;
      
      return decrypt(encryptedData);
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return null;
    }
  }
  
  /**
   * Remove securely stored data
   * @param {string} key - Storage key to remove
   */
  function removeItem(key) {
    try {
      localStorage.removeItem('secure_' + key);
    } catch (error) {
      console.error('SecureStorage removeItem error:', error);
    }
  }
  
  /**
   * Clear all securely stored data
   */
  function clear() {
    try {
      // Only remove items with 'secure_' prefix
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key.startsWith('secure_')) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('SecureStorage clear error:', error);
    }
  }
  
  /**
   * Get a list of all secure storage keys
   * @returns {Array} - Array of keys (without the 'secure_' prefix)
   */
  function getKeys() {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('secure_')) {
          keys.push(key.substring(7)); // Remove 'secure_' prefix
        }
      }
    } catch (error) {
      console.error('SecureStorage getKeys error:', error);
    }
    return keys;
  }
  
  /**
   * Check if data is securely stored for a key
   * @param {string} key - Storage key
   * @returns {boolean} - Whether the key exists
   */
  function hasItem(key) {
    try {
      return localStorage.getItem('secure_' + key) !== null;
    } catch (error) {
      console.error('SecureStorage hasItem error:', error);
      return false;
    }
  }
  
  // Return the public API
  return {
    setItem,
    getItem,
    removeItem,
    clear,
    getKeys,
    hasItem
  };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = secureStorage;
}
`;

fs.writeFileSync(secureStoragePath, secureStorageContent, 'utf8');
console.log('Created secure storage utility at ' + secureStoragePath);

// Create XSS protection utility
const xssProtectionPath = path.join(jsDir, 'utils', 'xss-protection.js');
const xssProtectionContent = `/**
 * XSS Protection Utility
 * Provides functions to sanitize input and prevent XSS attacks
 */
const xssProtection = (function() {
  /**
   * Sanitize string input to prevent XSS
   * @param {string} input - String to sanitize
   * @returns {string} - Sanitized string
   */
  function sanitizeString(input) {
    if (!input) return '';
    
    // Create an HTML element to use the browser's built-in sanitization
    const doc = new DOMParser().parseFromString('<!DOCTYPE html><html><body></body></html>', 'text/html');
    const div = doc.createElement('div');
    div.textContent = input;
    
    return div.innerHTML;
  }
  
  /**
   * Sanitize HTML content to prevent XSS
   * @param {string} html - HTML string to sanitize
   * @returns {string} - Sanitized HTML
   */
  function sanitizeHTML(html) {
    if (!html) return '';
    
    // Create a DOMParser to parse the HTML
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    // Remove potentially dangerous elements and attributes
    const dangerousElements = ['script', 'iframe', 'object', 'embed', 'form', 'base', 'link'];
    const dangerousAttributes = [
      'onerror', 'onclick', 'onload', 'onmouseover', 'onmouseout', 
      'onkeydown', 'onkeypress', 'onkeyup', 'onchange', 'onfocus', 
      'onblur', 'formaction', 'href', 'xlink:href', 'src', 'style',
      'onsubmit', 'onreset', 'onselect', 'onscroll'
    ];
    
    dangerousElements.forEach(tag => {
      const elements = doc.getElementsByTagName(tag);
      for (let i = elements.length - 1; i >= 0; i--) {
        elements[i].parentNode.removeChild(elements[i]);
      }
    });
    
    // Remove dangerous attributes from all elements
    const allElements = doc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i];
      
      dangerousAttributes.forEach(attr => {
        if (element.hasAttribute(attr)) {
          element.removeAttribute(attr);
        }
      });
      
      // Convert javascript: URLs
      if (element.hasAttribute('href') && element.getAttribute('href').toLowerCase().startsWith('javascript:')) {
        element.setAttribute('href', '#');
      }
      
      if (element.hasAttribute('src') && element.getAttribute('src').toLowerCase().startsWith('javascript:')) {
        element.removeAttribute('src');
      }
      
      // Remove data: URLs except for images with safe formats
      if (element.hasAttribute('src') && element.getAttribute('src').toLowerCase().startsWith('data:')) {
        const srcAttr = element.getAttribute('src').toLowerCase();
        if (!(element.tagName === 'IMG' && 
             (srcAttr.startsWith('data:image/png') || 
              srcAttr.startsWith('data:image/jpeg') || 
              srcAttr.startsWith('data:image/gif') || 
              srcAttr.startsWith('data:image/svg+xml')))) {
          element.removeAttribute('src');
        }
      }
    }
    
    return doc.body.innerHTML;
  }
  
  /**
   * Safely set innerHTML with XSS protection
   * @param {HTMLElement} element - Element to update
   * @param {string} html - HTML content
   */
  function safeInnerHTML(element, html) {
    if (!element) return;
    element.innerHTML = sanitizeHTML(html);
  }
  
  /**
   * Sanitize a form input on input/change
   * @param {string} inputId - ID of the input element
   */
  function setupInputSanitization(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Only apply to text and textarea inputs
    if (input.type === 'text' || input.tagName.toLowerCase() === 'textarea') {
      input.addEventListener('input', function() {
        // Sanitize the input value
        const sanitized = sanitizeString(this.value);
        if (sanitized !== this.value) {
          this.value = sanitized;
        }
      });
    }
  }
  
  /**
   * Setup XSS protection for all text inputs in a form
   * @param {string} formId - ID of the form
   */
  function protectForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const inputs = form.querySelectorAll('input[type="text"], textarea');
    inputs.forEach(input => {
      input.addEventListener('input', function() {
        // Sanitize the input value
        const sanitized = sanitizeString(this.value);
        if (sanitized !== this.value) {
          this.value = sanitized;
        }
      });
    });
  }
  
  /**
   * Validate URL for safety
   * @param {string} url - URL to validate
   * @returns {boolean} - Whether the URL is safe
   */
  function isSafeUrl(url) {
    if (!url) return false;
    
    // Check for javascript: protocol
    if (url.toLowerCase().startsWith('javascript:')) {
      return false;
    }
    
    // Check for data: URLs (except safe image formats)
    if (url.toLowerCase().startsWith('data:')) {
      const safeDataUrlStart = [
        'data:image/png', 
        'data:image/jpeg', 
        'data:image/gif', 
        'data:image/svg+xml'
      ];
      
      return safeDataUrlStart.some(safe => url.toLowerCase().startsWith(safe));
    }
    
    // Allow http: and https: protocols
    if (url.toLowerCase().startsWith('http:') || url.toLowerCase().startsWith('https:')) {
      return true;
    }
    
    // Allow relative URLs
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../') || !url.includes(':')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Sanitize a URL
   * @param {string} url - URL to sanitize
   * @returns {string} - Sanitized URL
   */
  function sanitizeUrl(url) {
    if (!url) return '#';
    
    return isSafeUrl(url) ? url : '#';
  }
  
  /**
   * Create a safe DOM element with sanitized attributes
   * @param {string} tag - HTML tag name
   * @param {Object} attributes - Attributes to set on the element
   * @param {string|HTMLElement} content - Inner content or child element
   * @returns {HTMLElement} - Created element
   */
  function createSafeElement(tag, attributes = {}, content = null) {
    const element = document.createElement(tag);
    
    // Set sanitized attributes
    Object.keys(attributes).forEach(key => {
      // Skip dangerous attributes
      const dangerousAttributes = [
        'onerror', 'onclick', 'onload', 'onmouseover', 'onmouseout', 
        'onkeydown', 'onkeypress', 'onkeyup', 'onchange', 'onfocus', 
        'onblur', 'formaction'
      ];
      
      if (dangerousAttributes.includes(key.toLowerCase())) {
        return;
      }
      
      // Sanitize URLs
      if (key === 'href' || key === 'src') {
        element.setAttribute(key, sanitizeUrl(attributes[key]));
      } else {
        element.setAttribute(key, attributes[key]);
      }
    });
    
    // Set content
    if (content) {
      if (typeof content === 'string') {
        element.textContent = content;
      } else if (content instanceof HTMLElement) {
        element.appendChild(content);
      }
    }
    
    return element;
  }
  
  return {
    sanitizeString,
    sanitizeHTML,
    safeInnerHTML,
    setupInputSanitization,
    protectForm,
    isSafeUrl,
    sanitizeUrl,
    createSafeElement
  };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = xssProtection;
}
`;

fs.writeFileSync(xssProtectionPath, xssProtectionContent, 'utf8');
console.log('Created XSS protection utility at ' + xssProtectionPath);

// Create CSRF protection utility
const csrfProtectionPath = path.join(jsDir, 'utils', 'csrf-protection.js');
const csrfProtectionContent = `/**
 * CSRF Protection Utility
 * Provides functions to prevent Cross-Site Request Forgery attacks
 */
const csrfProtection = (function() {
  // Generate a CSRF token
  let csrfToken = '';
  
  /**
   * Generate a new CSRF token
   * @returns {string} - Generated token
   */
  function generateToken() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    csrfToken = Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
    
    // Store in sessionStorage
    try {
      sessionStorage.setItem('csrf_token', csrfToken);
    } catch (error) {
      console.error('Error storing CSRF token:', error);
    }
    
    return csrfToken;
  }
  
  /**
   * Get the current CSRF token, generating a new one if needed
   * @returns {string} - CSRF token
   */
  function getToken() {
    // Try to get from sessionStorage first
    try {
      const storedToken = sessionStorage.getItem('csrf_token');
      if (storedToken) {
        csrfToken = storedToken;
        return csrfToken;
      }
    } catch (error) {
      console.warn('Error retrieving CSRF token:', error);
    }
    
    // Generate a new token if none exists
    if (!csrfToken) {
      return generateToken();
    }
    
    return csrfToken;
  }
  
  /**
   * Add CSRF token to a form
   * @param {HTMLFormElement} form - Form to protect
   */
  function protectForm(form) {
    if (!form) return;
    
    // Check if form already has a CSRF token
    if (form.querySelector('input[name="csrf_token"]')) {
      return;
    }
    
    // Create hidden input for token
    const tokenInput = document.createElement('input');
    tokenInput.type = 'hidden';
    tokenInput.name = 'csrf_token';
    tokenInput.value = getToken();
    
    // Add to form
    form.appendChild(tokenInput);
  }
  
  /**
   * Validate a CSRF token
   * @param {string} token - Token to validate
   * @returns {boolean} - Whether the token is valid
   */
  function validateToken(token) {
    return token === getToken();
  }
  
  /**
   * Add CSRF protection to fetch requests
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @returns {Promise} - Fetch promise
   */
  function fetchWithProtection(url, options = {}) {
    // Clone options to avoid modifying the original
    const protectedOptions = { ...options };
    
    // Add headers if not present
    if (!protectedOptions.headers) {
      protectedOptions.headers = {};
    }
    
    // Add CSRF token to headers
    protectedOptions.headers['X-CSRF-Token'] = getToken();
    
    // Make the fetch request
    return fetch(url, protectedOptions);
  }
  
  /**
   * Add CSRF protection to all forms on the page
   */
  function protectAllForms() {
    document.querySelectorAll('form').forEach(protectForm);
  }
  
  // Initialize CSRF protection when the DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Generate initial token
    generateToken();
    
    // Protect all existing forms
    protectAllForms();
    
    // Watch for new forms being added to the DOM
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(function(node) {
            // Check if the node is a form
            if (node.tagName === 'FORM') {
              protectForm(node);
            }
            
            // Check for forms within the added node
            if (node.querySelectorAll) {
              node.querySelectorAll('form').forEach(protectForm);
            }
          });
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });
  });
  
  // Return public API
  return {
    generateToken,
    getToken,
    protectForm,
    validateToken,
    fetchWithProtection,
    protectAllForms
  };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = csrfProtection;
}
`;

fs.writeFileSync(csrfProtectionPath, csrfProtectionContent, 'utf8');
console.log('Created CSRF protection utility at ' + csrfProtectionPath);

// Create data privacy utility
const dataPrivacyPath = path.join(jsDir, 'utils', 'data-privacy.js');
const dataPrivacyContent = `/**
 * Data Privacy Utility
 * Provides functions to enhance data privacy and anonymization
 */
const dataPrivacy = (function() {
  /**
   * Anonymize a patient identifier
   * @param {string} identifier - Patient identifier to anonymize
   * @returns {string} - Anonymized identifier
   */
  function anonymizeIdentifier(identifier) {
    if (!identifier) return 'anonymous';
    
    // Generate a hash of the identifier
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to positive hex string and take first 8 characters
    return 'p' + Math.abs(hash).toString(16).substring(0, 8);
  }
  
  /**
   * Create an anonymous session identifier
   * @returns {string} - Anonymous session ID
   */
  function createAnonymousSession() {
    // Create a random ID
    const array = new Uint8Array(8);
    window.crypto.getRandomValues(array);
    const sessionId = Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
    
    // Store session ID
    try {
      if (typeof secureStorage !== 'undefined' && secureStorage.setItem) {
        secureStorage.setItem('anonymous_session', sessionId);
      } else {
        sessionStorage.setItem('anonymous_session', sessionId);
      }
    } catch (error) {
      console.warn('Error storing anonymous session:', error);
    }
    
    return sessionId;
  }
  
  /**
   * Get the current anonymous session ID, creating one if needed
   * @returns {string} - Session ID
   */
  function getAnonymousSession() {
    let sessionId;
    
    // Try to get from storage
    try {
      if (typeof secureStorage !== 'undefined' && secureStorage.getItem) {
        sessionId = secureStorage.getItem('anonymous_session');
      } else {
        sessionId = sessionStorage.getItem('anonymous_session');
      }
    } catch (error) {
      console.warn('Error retrieving anonymous session:', error);
    }
    
    // Create new session if none exists
    if (!sessionId) {
      sessionId = createAnonymousSession();
    }
    
    return sessionId;
  }
  
  /**
   * Anonymize patient data for research
   * @param {Object} patientData - Patient data to anonymize
   * @returns {Object} - Anonymized data
   */
  function anonymizeForResearch(patientData) {
    if (!patientData) return {};
    
    // Clone the data to avoid modifying the original
    const anonymized = JSON.parse(JSON.stringify(patientData));
    
    // Remove direct identifiers
    const identifiers = [
      'id', 'name', 'firstName', 'lastName', 'fullName', 'email', 
      'phone', 'address', 'city', 'zip', 'postalCode', 'ssn', 
      'socialSecurityNumber', 'mrn', 'medicalRecordNumber', 'patientId'
    ];
    
    identifiers.forEach(id => {
      if (anonymized[id] !== undefined) {
        delete anonymized[id];
      }
    });
    
    // Add anonymous identifier
    anonymized.anonymousId = getAnonymousSession();
    
    // Age buckets instead of exact age for patients over 89
    if (anonymized.age && anonymized.age > 89) {
      anonymized.ageGroup = '90+';
      delete anonymized.age;
    } else if (anonymized.age) {
      // Keep age for younger patients, but could group into 5-year buckets
      // anonymized.ageGroup = Math.floor(anonymized.age / 5) * 5 + '-' + (Math.floor(anonymized.age / 5) * 5 + 4);
    }
    
    // Remove exact dates, keep year or month/year
    if (anonymized.birthDate) {
      const birthDate = new Date(anonymized.birthDate);
      anonymized.birthYear = birthDate.getFullYear();
      delete anonymized.birthDate;
    }
    
    // Replace exact dates with month/year for other dates
    const dateFields = ['diagnosisDate', 'admissionDate', 'dischargeDate', 'procedureDate', 'visitDate'];
    dateFields.forEach(field => {
      if (anonymized[field]) {
        const date = new Date(anonymized[field]);
        anonymized[field + 'MonthYear'] = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        delete anonymized[field];
      }
    });
    
    // Zip code truncation to first 3 digits
    if (anonymized.zipCode) {
      anonymized.zipCode = anonymized.zipCode.substring(0, 3) + 'XX';
    }
    
    return anonymized;
  }
  
  /**
   * Create a consent record
   * @param {string} purpose - Purpose of data collection
   * @param {Array} dataTypes - Types of data being collected
   * @param {Date} expiryDate - Date when consent expires
   * @returns {Object} - Consent record
   */
  function createConsentRecord(purpose, dataTypes, expiryDate) {
    const consentId = 'consent_' + Date.now();
    const consentDate = new Date();
    
    const consentRecord = {
      id: consentId,
      purpose: purpose,
      dataTypes: dataTypes,
      consentDate: consentDate.toISOString(),
      expiryDate: expiryDate ? expiryDate.toISOString() : null,
      anonymousId: getAnonymousSession()
    };
    
    // Store consent record
    try {
      if (typeof secureStorage !== 'undefined' && secureStorage.getItem) {
        const existingConsents = secureStorage.getItem('consent_records') || [];
        existingConsents.push(consentRecord);
        secureStorage.setItem('consent_records', existingConsents);
      }
    } catch (error) {
      console.warn('Error storing consent record:', error);
    }
    
    return consentRecord;
  }
  
  /**
   * Check if consent exists for a specific purpose
   * @param {string} purpose - Purpose to check consent for
   * @returns {boolean} - Whether consent exists
   */
  function hasConsentFor(purpose) {
    try {
      if (typeof secureStorage !== 'undefined' && secureStorage.getItem) {
        const existingConsents = secureStorage.getItem('consent_records') || [];
        
        // Check if any valid consents exist for purpose
        const now = new Date();
        return existingConsents.some(consent => 
          consent.purpose === purpose && 
          (!consent.expiryDate || new Date(consent.expiryDate) > now)
        );
      }
    } catch (error) {
      console.warn('Error checking consent:', error);
    }
    
    return false;
  }
  
  /**
   * Remove all data for privacy cleanup
   */
  function purgeAllData() {
    try {
      // Clear secure storage
      if (typeof secureStorage !== 'undefined' && secureStorage.clear) {
        secureStorage.clear();
      }
      
      // Clear session storage
      sessionStorage.clear();
      
      // Clear local storage
      localStorage.clear();
    } catch (error) {
      console.error('Error purging data:', error);
    }
  }
  
  // Return public API
  return {
    anonymizeIdentifier,
    createAnonymousSession,
    getAnonymousSession,
    anonymizeForResearch,
    createConsentRecord,
    hasConsentFor,
    purgeAllData
  };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = dataPrivacy;
}
`;

fs.writeFileSync(dataPrivacyPath, dataPrivacyContent, 'utf8');
console.log('Created data privacy utility at ' + dataPrivacyPath);

// Update index.html to include the security scripts
const securityScriptTags = `
    <!-- Security Enhancements -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js" integrity="sha512-E8QSvWZ0eCLGk4km3hxSsNmGWbLtSCSUcewDQPQWZF6pEU8GlT8a5fF32wOl1i8ftdMhssTrF/OhyGWwonTcXA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="js/utils/secure-storage.js"></script>
    <script src="js/utils/xss-protection.js"></script>
    <script src="js/utils/csrf-protection.js"></script>
    <script src="js/utils/data-privacy.js"></script>`;

if (!indexHtml.includes('secure-storage.js')) {
  // Add before closing body tag
  indexHtml = indexHtml.replace('</body>', `${securityScriptTags}\n</body>`);
}

// Add initialization of XSS protection
const securityInitCode = `
    <!-- Initialize Security Features -->
    <script>
      // Initialize XSS protection
      document.addEventListener('DOMContentLoaded', function() {
        // Protect all forms
        if (typeof xssProtection !== 'undefined') {
          document.querySelectorAll('form').forEach(form => {
            xssProtection.protectForm(form.id);
          });
        }
        
        // Show security features in console
        console.info('Security features initialized: XSS Protection, CSRF Protection, Secure Storage, Data Privacy');
      });
    </script>`;

if (!indexHtml.includes('Initialize Security Features')) {
  // Add the initialization script before closing body tag
  indexHtml = indexHtml.replace('</body>', `${securityInitCode}\n</body>`);
}

// Write updated HTML
fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');

// Create error logging and monitoring utility
const errorLoggingPath = path.join(jsDir, 'utils', 'error-logging.js');
const errorLoggingContent = `/**
 * Error Logging and Monitoring Utility
 * Provides functions for error detection, logging, and reporting
 */
const errorLogger = (function() {
  // Configuration
  const config = {
    enabled: true,
    logToConsole: true,
    useSentry: false,
    sentryDsn: '', // Set this to your Sentry DSN if using Sentry
    errorLimit: 50, // Maximum number of errors to store locally
    samplingRate: 1.0 // 1.0 = log all errors, 0.5 = log 50% of errors, etc.
  };
  
  // Local error storage
  let errorLog = [];
  
  /**
   * Initialize error logging
   * @param {Object} options - Configuration options
   */
  function init(options = {}) {
    // Update config with provided options
    Object.assign(config, options);
    
    // Load existing error log from storage
    try {
      if (typeof secureStorage !== 'undefined' && secureStorage.getItem) {
        errorLog = secureStorage.getItem('error_log') || [];
      }
    } catch (error) {
      console.warn('Error loading error log:', error);
      errorLog = [];
    }
    
    // Initialize Sentry if enabled
    if (config.useSentry && config.sentryDsn && typeof Sentry !== 'undefined') {
      Sentry.init({
        dsn: config.sentryDsn,
        tracesSampleRate: config.samplingRate,
        environment: window.location.hostname === 'localhost' ? 'development' : 'production'
      });
    }
    
    // Set up global error handler
    window.addEventListener('error', captureError);
    window.addEventListener('unhandledrejection', capturePromiseError);
    
    // Add console error interceptor
    if (config.logToConsole) {
      const originalConsoleError = console.error;
      console.error = function() {
        // Call original console.error
        originalConsoleError.apply(console, arguments);
        
        // Log the error
        const errorMessage = Array.from(arguments).map(arg => {
          return arg instanceof Error ? arg.stack || arg.message : String(arg);
        }).join(' ');
        
        logError({
          type: 'console.error',
          message: errorMessage,
          timestamp: new Date().toISOString(),
          location: getCurrentLocation()
        });
      };
    }
  }
  
  /**
   * Capture JavaScript errors
   * @param {ErrorEvent} event - Error event
   */
  function captureError(event) {
    // Check if logging is enabled
    if (!config.enabled) return;
    
    // Apply sampling rate
    if (Math.random() > config.samplingRate) return;
    
    const error = {
      type: 'javascript',
      message: event.message,
      stack: event.error ? event.error.stack : null,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString(),
      location: getCurrentLocation()
    };
    
    logError(error);
    
    // Send to Sentry if enabled
    if (config.useSentry && typeof Sentry !== 'undefined') {
      Sentry.captureException(event.error || new Error(event.message));
    }
  }
  
  /**
   * Capture unhandled promise rejections
   * @param {PromiseRejectionEvent} event - Promise rejection event
   */
  function capturePromiseError(event) {
    // Check if logging is enabled
    if (!config.enabled) return;
    
    // Apply sampling rate
    if (Math.random() > config.samplingRate) return;
    
    const error = {
      type: 'unhandledrejection',
      message: event.reason instanceof Error ? event.reason.message : String(event.reason),
      stack: event.reason instanceof Error ? event.reason.stack : null,
      timestamp: new Date().toISOString(),
      location: getCurrentLocation()
    };
    
    logError(error);
    
    // Send to Sentry if enabled
    if (config.useSentry && typeof Sentry !== 'undefined') {
      Sentry.captureException(event.reason);
    }
  }
  
  /**
   * Log a manual error
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context information
   */
  function logManualError(error, context = {}) {
    // Check if logging is enabled
    if (!config.enabled) return;
    
    // Apply sampling rate
    if (Math.random() > config.samplingRate) return;
    
    const errorData = {
      type: 'manual',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      context: context,
      timestamp: new Date().toISOString(),
      location: getCurrentLocation()
    };
    
    logError(errorData);
    
    // Send to Sentry if enabled
    if (config.useSentry && typeof Sentry !== 'undefined') {
      if (error instanceof Error) {
        Sentry.captureException(error, { extra: context });
      } else {
        Sentry.captureMessage(String(error), { extra: context });
      }
    }
  }
  
  /**
   * Log error to storage
   * @param {Object} error - Error data
   */
  function logError(error) {
    // Add to local error log
    errorLog.push(error);
    
    // Trim error log if it exceeds limit
    if (errorLog.length > config.errorLimit) {
      errorLog = errorLog.slice(-config.errorLimit);
    }
    
    // Save error log to storage
    try {
      if (typeof secureStorage !== 'undefined' && secureStorage.setItem) {
        secureStorage.setItem('error_log', errorLog);
      }
    } catch (storageError) {
      console.warn('Error saving error log:', storageError);
    }
    
    // Log to console if enabled
    if (config.logToConsole && error.type !== 'console.error') {
      console.warn('Error logged:', error);
    }
  }
  
  /**
   * Get current location information
   * @returns {Object} - Location information
   */
  function getCurrentLocation() {
    return {
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    };
  }
  
  /**
   * Get all logged errors
   * @returns {Array} - Error log
   */
  function getErrorLog() {
    return [...errorLog];
  }
  
  /**
   * Clear error log
   */
  function clearErrorLog() {
    errorLog = [];
    
    // Clear from storage
    try {
      if (typeof secureStorage !== 'undefined' && secureStorage.setItem) {
        secureStorage.setItem('error_log', []);
      }
    } catch (error) {
      console.warn('Error clearing error log:', error);
    }
  }
  
  /**
   * Enable or disable error logging
   * @param {boolean} enabled - Whether error logging is enabled
   */
  function setEnabled(enabled) {
    config.enabled = enabled;
  }
  
  // Initialize with default settings
  init();
  
  // Return public API
  return {
    init,
    logError: logManualError,
    getErrorLog,
    clearErrorLog,
    setEnabled
  };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = errorLogger;
}
`;

fs.writeFileSync(errorLoggingPath, errorLoggingContent, 'utf8');
console.log('Created error logging utility at ' + errorLoggingPath);

// Create performance monitoring utility
const performancePath = path.join(jsDir, 'utils', 'performance-monitoring.js');
const performanceContent = `/**
 * Performance Monitoring Utility
 * Provides functions for tracking and analyzing application performance
 */
const performanceMonitor = (function() {
  // Configuration
  const config = {
    enabled: true,
    logToConsole: true,
    trackResources: true,
    trackNavigationTiming: true,
    trackUserInteractions: true,
    trackLongTasks: true,
    trackMemory: true,
    samplingRate: 1.0, // 1.0 = track all events, 0.5 = track 50% of events, etc.
    eventLimit: 100 // Maximum number of events to store locally
  };
  
  // Local performance events storage
  let performanceEvents = [];
  
  // Timing marks for custom measurements
  const timingMarks = {};
  
  /**
   * Initialize performance monitoring
   * @param {Object} options - Configuration options
   */
  function init(options = {}) {
    // Update config with provided options
    Object.assign(config, options);
    
    // Load existing performance events from storage
    try {
      if (typeof secureStorage !== 'undefined' && secureStorage.getItem) {
        performanceEvents = secureStorage.getItem('performance_events') || [];
      }
    } catch (error) {
      console.warn('Error loading performance events:', error);
      performanceEvents = [];
    }
    
    // Set up performance monitoring
    if (config.enabled) {
      // Track navigation timing
      if (config.trackNavigationTiming && window.performance && window.performance.timing) {
        window.addEventListener('load', trackNavigationTiming);
      }
      
      // Track resource timing
      if (config.trackResources && window.performance && window.performance.getEntriesByType) {
        window.addEventListener('load', function() {
          setTimeout(trackResourceTiming, 1000); // Delay to ensure all resources are loaded
        });
      }
      
      // Track user interactions
      if (config.trackUserInteractions) {
        setupInteractionTracking();
      }
      
      // Track long tasks
      if (config.trackLongTasks && window.PerformanceObserver) {
        setupLongTasksTracking();
      }
      
      // Track memory usage
      if (config.trackMemory) {
        setupMemoryTracking();
      }
    }
  }
  
  /**
   * Track navigation timing
   */
  function trackNavigationTiming() {
    // Check if performance API is available
    if (!window.performance || !window.performance.timing) return;
    
    // Apply sampling rate
    if (Math.random() > config.samplingRate) return;
    
    const timing = window.performance.timing;
    const navigationStart = timing.navigationStart;
    
    const navigationTimings = {
      type: 'navigation',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      metrics: {
        dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcpConnection: timing.connectEnd - timing.connectStart,
        request: timing.responseStart - timing.requestStart,
        response: timing.responseEnd - timing.responseStart,
        domProcessing: timing.domComplete - timing.domLoading,
        domInteractive: timing.domInteractive - navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
        loadEvent: timing.loadEventEnd - navigationStart,
        totalPageLoad: timing.loadEventEnd - navigationStart
      }
    };
    
    logPerformanceEvent(navigationTimings);
  }
  
  /**
   * Track resource timing
   */
  function trackResourceTiming() {
    // Check if performance API is available
    if (!window.performance || !window.performance.getEntriesByType) return;
    
    // Apply sampling rate
    if (Math.random() > config.samplingRate) return;
    
    const resources = window.performance.getEntriesByType('resource');
    const summary = {
      type: 'resources',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      resourceCount: resources.length,
      totalSize: 0,
      totalDuration: 0,
      resourcesByType: {},
      slowestResources: []
    };
    
    // Process resource entries
    resources.forEach(resource => {
      // Get resource type
      const type = resource.initiatorType || 'other';
      
      // Calculate resource size
      const size = resource.transferSize || 0;
      
      // Initialize type in summary if not present
      if (!summary.resourcesByType[type]) {
        summary.resourcesByType[type] = {
          count: 0,
          totalSize: 0,
          totalDuration: 0
        };
      }
      
      // Update type statistics
      summary.resourcesByType[type].count++;
      summary.resourcesByType[type].totalSize += size;
      summary.resourcesByType[type].totalDuration += resource.duration;
      
      // Update overall statistics
      summary.totalSize += size;
      summary.totalDuration += resource.duration;
      
      // Store slowest resources (top 5)
      if (summary.slowestResources.length < 5 || resource.duration > summary.slowestResources[4].duration) {
        const resourceInfo = {
          name: resource.name,
          type: type,
          duration: resource.duration,
          size: size
        };
        
        summary.slowestResources.push(resourceInfo);
        
        // Sort and keep only top 5
        summary.slowestResources.sort((a, b) => b.duration - a.duration);
        if (summary.slowestResources.length > 5) {
          summary.slowestResources = summary.slowestResources.slice(0, 5);
        }
      }
    });
    
    // Calculate averages
    Object.keys(summary.resourcesByType).forEach(type => {
      const typeStats = summary.resourcesByType[type];
      if (typeStats.count > 0) {
        typeStats.averageSize = typeStats.totalSize / typeStats.count;
        typeStats.averageDuration = typeStats.totalDuration / typeStats.count;
      }
    });
    
    logPerformanceEvent(summary);
  }
  
  /**
   * Setup tracking for user interactions
   */
  function setupInteractionTracking() {
    // Track clicks
    document.addEventListener('click', function(event) {
      // Apply sampling rate
      if (Math.random() > config.samplingRate) return;
      
      // Get target element
      const target = event.target;
      
      // Get element description
      let elementDesc = target.tagName.toLowerCase();
      if (target.id) {
        elementDesc += '#' + target.id;
      } else if (target.className && typeof target.className === 'string') {
        elementDesc += '.' + target.className.replace(/\s+/g, '.');
      }
      
      // Get interaction details
      const interaction = {
        type: 'click',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        element: elementDesc,
        position: {
          x: event.clientX,
          y: event.clientY
        },
        text: target.textContent ? target.textContent.trim().substring(0, 50) : null
      };
      
      logPerformanceEvent(interaction);
    });
    
    // Track form submissions
    document.addEventListener('submit', function(event) {
      // Apply sampling rate
      if (Math.random() > config.samplingRate) return;
      
      // Get form element
      const form = event.target;
      
      // Get form description
      let formDesc = 'form';
      if (form.id) {
        formDesc += '#' + form.id;
      } else if (form.name) {
        formDesc += '[name="' + form.name + '"]';
      }
      
      // Get form fields (excluding sensitive data)
      const fields = Array.from(form.elements).map(element => {
        // Skip password fields and hidden fields
        if (element.type === 'password' || element.type === 'hidden') {
          return null;
        }
        
        // Return field name
        return element.name || element.id;
      }).filter(Boolean);
      
      // Get interaction details
      const interaction = {
        type: 'form_submission',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        element: formDesc,
        fields: fields
      };
      
      logPerformanceEvent(interaction);
    });
  }
  
  /**
   * Setup tracking for long tasks
   */
  function setupLongTasksTracking() {
    // Check if PerformanceObserver API is available
    if (!window.PerformanceObserver) return;
    
    // Create observer for long tasks
    try {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          // Apply sampling rate
          if (Math.random() > config.samplingRate) return;
          
          const longTask = {
            type: 'long_task',
            timestamp: new Date().toISOString(),
            url: window.location.href,
            duration: entry.duration,
            startTime: entry.startTime,
            attribution: entry.attribution ? Array.from(entry.attribution).map(attr => attr.name) : []
          };
          
          logPerformanceEvent(longTask);
        });
      });
      
      // Start observing long tasks
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long tasks tracking not supported:', error);
    }
  }
  
  /**
   * Setup memory usage tracking
   */
  function setupMemoryTracking() {
    // Check if performance.memory is available (Chrome only)
    const trackMemory = () => {
      // Apply sampling rate
      if (Math.random() > config.samplingRate) return;
      
      if (window.performance && window.performance.memory) {
        const memory = {
          type: 'memory',
          timestamp: new Date().toISOString(),
          url: window.location.href,
          totalJSHeapSize: window.performance.memory.totalJSHeapSize,
          usedJSHeapSize: window.performance.memory.usedJSHeapSize,
          jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
        };
        
        logPerformanceEvent(memory);
      }
    };
    
    // Track memory usage every 30 seconds
    setInterval(trackMemory, 30000);
    
    // Track memory usage on load
    window.addEventListener('load', trackMemory);
  }
  
  /**
   * Start timing a custom operation
   * @param {string} name - Name of the operation
   */
  function startTiming(name) {
    if (!config.enabled || !name) return;
    
    // Apply sampling rate
    if (Math.random() > config.samplingRate) return;
    
    // Use performance.mark if available
    if (window.performance && window.performance.mark) {
      window.performance.mark('start_' + name);
    }
    
    // Store start time
    timingMarks[name] = {
      start: performance.now(),
      measurements: {}
    };
  }
  
  /**
   * End timing a custom operation
   * @param {string} name - Name of the operation
   * @param {Object} additionalData - Additional data to log
   */
  function endTiming(name, additionalData = {}) {
    if (!config.enabled || !name || !timingMarks[name]) return;
    
    // Use performance.measure if available
    if (window.performance && window.performance.measure) {
      try {
        window.performance.measure(name, 'start_' + name);
      } catch (error) {
        console.warn('Error measuring performance:', error);
      }
    }
    
    // Calculate duration
    const duration = performance.now() - timingMarks[name].start;
    
    // Create timing event
    const timingEvent = {
      type: 'custom_timing',
      name: name,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      duration: duration,
      measurements: timingMarks[name].measurements,
      data: additionalData
    };
    
    // Log timing event
    logPerformanceEvent(timingEvent);
    
    // Clean up
    delete timingMarks[name];
  }
  
  /**
   * Add a measurement point to a running timer
   * @param {string} timerName - Name of the timer
   * @param {string} measurementName - Name of the measurement point
   */
  function addTimingMeasurement(timerName, measurementName) {
    if (!config.enabled || !timerName || !timingMarks[timerName]) return;
    
    timingMarks[timerName].measurements[measurementName] = performance.now() - timingMarks[timerName].start;
  }
  
  /**
   * Log a performance event
   * @param {Object} event - Performance event data
   */
  function logPerformanceEvent(event) {
    // Add to local storage
    performanceEvents.push(event);
    
    // Trim events if they exceed limit
    if (performanceEvents.length > config.eventLimit) {
      performanceEvents = performanceEvents.slice(-config.eventLimit);
    }
    
    // Save events to storage
    try {
      if (typeof secureStorage !== 'undefined' && secureStorage.setItem) {
        secureStorage.setItem('performance_events', performanceEvents);
      }
    } catch (error) {
      console.warn('Error saving performance events:', error);
    }
    
    // Log to console if enabled
    if (config.logToConsole) {
      console.debug('Performance:', event);
    }
  }
  
  /**
   * Get all performance events
   * @returns {Array} - Performance events
   */
  function getPerformanceEvents() {
    return [...performanceEvents];
  }
  
  /**
   * Clear performance events
   */
  function clearPerformanceEvents() {
    performanceEvents = [];
    
    // Clear from storage
    try {
      if (typeof secureStorage !== 'undefined' && secureStorage.setItem) {
        secureStorage.setItem('performance_events', []);
      }
    } catch (error) {
      console.warn('Error clearing performance events:', error);
    }
  }
  
  /**
   * Enable or disable performance monitoring
   * @param {boolean} enabled - Whether performance monitoring is enabled
   */
  function setEnabled(enabled) {
    config.enabled = enabled;
  }
  
  /**
   * Get performance statistics
   * @returns {Object} - Performance statistics
   */
  function getStatistics() {
    const stats = {
      eventCount: performanceEvents.length,
      eventsByType: {},
      pageLoadTimes: [],
      slowestResources: [],
      longTasks: []
    };
    
    // Process events
    performanceEvents.forEach(event => {
      // Count events by type
      if (!stats.eventsByType[event.type]) {
        stats.eventsByType[event.type] = 0;
      }
      stats.eventsByType[event.type]++;
      
      // Collect page load times
      if (event.type === 'navigation') {
        stats.pageLoadTimes.push({
          url: event.url,
          timestamp: event.timestamp,
          totalPageLoad: event.metrics.totalPageLoad
        });
      }
      
      // Collect slowest resources
      if (event.type === 'resources' && event.slowestResources) {
        event.slowestResources.forEach(resource => {
          stats.slowestResources.push({
            url: resource.name,
            type: resource.type,
            duration: resource.duration,
            size: resource.size
          });
        });
      }
      
      // Collect long tasks
      if (event.type === 'long_task') {
        stats.longTasks.push({
          timestamp: event.timestamp,
          duration: event.duration,
          url: event.url
        });
      }
    });
    
    // Sort page load times
    stats.pageLoadTimes.sort((a, b) => b.totalPageLoad - a.totalPageLoad);
    
    // Sort and limit slowest resources
    stats.slowestResources.sort((a, b) => b.duration - a.duration);
    stats.slowestResources = stats.slowestResources.slice(0, 10);
    
    // Sort and limit long tasks
    stats.longTasks.sort((a, b) => b.duration - a.duration);
    stats.longTasks = stats.longTasks.slice(0, 10);
    
    return stats;
  }
  
  // Initialize with default settings
  init();
  
  // Return public API
  return {
    init,
    startTiming,
    endTiming,
    addTimingMeasurement,
    getPerformanceEvents,
    clearPerformanceEvents,
    setEnabled,
    getStatistics
  };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = performanceMonitor;
}
`;

fs.writeFileSync(performancePath, performanceContent, 'utf8');
console.log('Created performance monitoring utility at ' + performancePath);

// Add scripts to HTML
const monitoringScripts = `
    <!-- Monitoring and Performance -->
    <script src="js/utils/error-logging.js"></script>
    <script src="js/utils/performance-monitoring.js"></script>
    <script>
      // Initialize monitoring with custom settings
      document.addEventListener('DOMContentLoaded', function() {
        // Initialize error logging
        if (typeof errorLogger !== 'undefined') {
          errorLogger.init({
            logToConsole: true,
            useSentry: false
          });
        }
        
        // Initialize performance monitoring
        if (typeof performanceMonitor !== 'undefined') {
          performanceMonitor.init({
            logToConsole: false,
            trackUserInteractions: true
          });
          
          // Track initial page load
          performanceMonitor.startTiming('pageLoad');
          window.addEventListener('load', function() {
            performanceMonitor.endTiming('pageLoad');
          });
        }
      });
    </script>
`;

if (!indexHtml.includes('performance-monitoring.js')) {
  // Add monitoring scripts before security init
  if (indexHtml.includes('<!-- Initialize Security Features -->')) {
    indexHtml = indexHtml.replace('<!-- Initialize Security Features -->', monitoringScripts + '\n