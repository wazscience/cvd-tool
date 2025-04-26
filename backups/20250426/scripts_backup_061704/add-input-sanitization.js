/**
 * scripts/add-input-sanitization.js
 * Implements input sanitization to protect against XSS and other injection attacks
 */
const fs = require('fs');
const path = require('path');

// Paths
const jsDir = path.join(process.cwd(), 'js');
const utilsDir = path.join(jsDir, 'utils');
const inputSanitizerPath = path.join(utilsDir, 'input-sanitizer.js');
const indexHtmlPath = path.join(process.cwd(), 'index.html');

// Create directories if they don't exist
if (!fs.existsSync(utilsDir)) {
  fs.mkdirSync(utilsDir, { recursive: true });
  console.log('Created utils directory');
}

// Create input sanitizer utility
console.log('Creating input sanitizer utility...');

const inputSanitizerContent = `/**
 * Input Sanitizer Utility
 * Provides functions to sanitize user input and prevent XSS/injection attacks
 */
const inputSanitizer = (function() {
  /**
   * Sanitize plain text input
   * @param {string} input - Text to sanitize
   * @returns {string} - Sanitized text
   */
  function sanitizeText(input) {
    if (!input || typeof input !== 'string') return '';
    
    // Basic HTML entity encoding
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  
  /**
   * Sanitize HTML content by removing potentially dangerous elements and attributes
   * @param {string} html - HTML content to sanitize
   * @returns {string} - Sanitized HTML
   */
  function sanitizeHTML(html) {
    if (!html || typeof html !== 'string') return '';
    
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // List of dangerous elements and attributes
    const dangerousElements = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'base'];
    const dangerousAttributes = ['onerror', 'onclick', 'onload', 'onmouseover', 'onsubmit', 'javascript:'];
    
    // Remove dangerous elements
    dangerousElements.forEach(tag => {
      const elements = doc.getElementsByTagName(tag);
      for (let i = elements.length - 1; i >= 0; i--) {
        elements[i].parentNode.removeChild(elements[i]);
      }
    });
    
    // Remove dangerous attributes from all elements
    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
      for (const attr of el.attributes) {
        const attrName = attr.name.toLowerCase();
        const attrValue = attr.value.toLowerCase();
        
        // Check for dangerous attributes
        if (dangerousAttributes.some(da => attrName.includes(da) || attrValue.includes(da))) {
          el.removeAttribute(attr.name);
        }
      }
    });
    
    return doc.body.innerHTML;
  }
  
  /**
   * Sanitize a URL to prevent javascript: protocols and other dangerous links
   * @param {string} url - URL to sanitize
   * @returns {string} - Sanitized URL or empty string if dangerous
   */
  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    
    // List of allowed protocols
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:', 'ftp:'];
    
    try {
      // Parse the URL
      const urlObj = new URL(url, window.location.origin);
      
      // Check if protocol is allowed
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return '';
      }
      
      return urlObj.toString();
    } catch (e) {
      // If URL is invalid, check for javascript: protocol
      if (url.trim().toLowerCase().startsWith('javascript:')) {
        return '';
      }
      
      // If it's a relative URL, it's probably safe
      if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        return url;
      }
      
      // Otherwise, return empty string to be safe
      return '';
    }
  }
  
  /**
   * Sanitize an input value based on its expected type
   * @param {string} value - Value to sanitize
   * @param {string} type - Expected data type (text, number, email, etc.)
   * @returns {string} - Sanitized value
   */
  function sanitizeByType(value, type) {
    if (!value) return '';
    
    switch (type) {
      case 'number':
        // Only allow digits, decimal point, and minus sign
        return value.toString().replace(/[^0-9.-]/g, '');
      
      case 'integer':
        // Only allow digits and minus sign
        return value.toString().replace(/[^0-9-]/g, '');
      
      case 'email':
        // Basic email sanitization
        return value.toString().replace(/[^a-zA-Z0-9.@_-]/g, '');
      
      case 'url':
        return sanitizeUrl(value);
      
      case 'html':
        return sanitizeHTML(value);
      
      case 'text':
      default:
        return sanitizeText(value);
    }
  }
  
  /**
   * Setup automatic input sanitization for a form
   * @param {string} formId - ID of the form to sanitize inputs for
   */
  function setupFormSanitization(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Get all input elements
    const inputs = form.querySelectorAll('input, textarea, select');
    
    // Add input event handlers to sanitize values
    inputs.forEach(input => {
      // Skip certain types of inputs
      if (['checkbox', 'radio', 'submit', 'button', 'reset', 'file'].includes(input.type)) {
        return;
      }
      
      // Determine input type for sanitization
      let sanitizeType = 'text';
      
      if (input.type === 'number') {
        sanitizeType = 'number';
      } else if (input.type === 'email') {
        sanitizeType = 'email';
      } else if (input.type === 'url') {
        sanitizeType = 'url';
      } else if (input.tagName.toLowerCase() === 'textarea' && input.getAttribute('data-rich-text')) {
        sanitizeType = 'html';
      }
      
      // Add sanitization to input events
      input.addEventListener('change', function() {
        const sanitized = sanitizeByType(this.value, sanitizeType);
        if (sanitized !== this.value) {
          this.value = sanitized;
        }
      });
      
      // Also sanitize on form submit
      form.addEventListener('submit', function(e) {
        inputs.forEach(input => {
          if (!['checkbox', 'radio', 'submit', 'button', 'reset', 'file'].includes(input.type)) {
            const sanitizeType = input.type === 'number' ? 'number' 
                               : input.type === 'email' ? 'email'
                               : input.type === 'url' ? 'url'
                               : input.tagName.toLowerCase() === 'textarea' && input.getAttribute('data-rich-text') ? 'html'
                               : 'text';
            
            input.value = sanitizeByType(input.value, sanitizeType);
          }
        });
      });
    });
    
    console.log(\`Sanitization configured for form: \${formId}\`);
  }
  
  /**
   * Setup sanitization for all forms on page
   */
  function setupAllForms() {
    document.querySelectorAll('form').forEach(form => {
      if (form.id) {
        setupFormSanitization(form.id);
      } else {
        // Generate an ID if not present
        form.id = 'form-' + Math.random().toString(36).substring(2, 11);
        setupFormSanitization(form.id);
      }
    });
  }
  
  /**
   * Sanitize form data before submission
   * @param {FormData} formData - Form data to sanitize
   * @returns {FormData} - Sanitized form data
   */
  function sanitizeFormData(formData) {
    const sanitizedData = new FormData();
    
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        sanitizedData.append(key, sanitizeText(value));
      } else {
        // Keep non-string values (like files) as is
        sanitizedData.append(key, value);
      }
    }
    
    return sanitizedData;
  }
  
  // Auto-initialize on DOM content loaded
  document.addEventListener('DOMContentLoaded', function() {
    setupAllForms();
    console.log('Input sanitization initialized for all forms');
  });
  
  // Public API
  return {
    sanitizeText,
    sanitizeHTML,
    sanitizeUrl,
    sanitizeByType,
    setupFormSanitization,
    setupAllForms,
    sanitizeFormData
  };
})();

// Make available globally
window.inputSanitizer = inputSanitizer;
`;

fs.writeFileSync(inputSanitizerPath, inputSanitizerContent);
console.log('Input sanitizer utility created successfully!');

// Update index.html to include the input sanitizer script
console.log('Updating index.html to include input sanitizer...');
let indexHtml = '';
try {
  indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
} catch (error) {
  console.error('Error reading index.html:', error);
  process.exit(1);
}

// Check if input sanitizer is already included
if (!indexHtml.includes('input-sanitizer.js')) {
  // Add before closing body tag
  indexHtml = indexHtml.replace('</body>', '    <script src="js/utils/input-sanitizer.js"></script>\n</body>');
  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('Added input sanitizer script to index.html');
}

// Create a script to modify form initialization to use input sanitization
const formHandlerPath = path.join(jsDir, 'form-handler.js');
console.log('Creating form handler with sanitization...');

const formHandlerContent = `/**
 * Form Handler with Input Sanitization
 * Enhances form handling with input sanitization and validation
 */
document.addEventListener('DOMContentLoaded', function() {
  // Find all forms in the document
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    // Setup input sanitization for this form
    if (window.inputSanitizer) {
      window.inputSanitizer.setupFormSanitization(form.id || form.name || 'anonymous-form');
    }
    
    // Add submit event handling
    form.addEventListener('submit', function(event) {
      // Prevent default submission
      event.preventDefault();
      
      // Perform input sanitization
      if (window.inputSanitizer) {
        const formData = new FormData(form);
        const sanitizedData = window.inputSanitizer.sanitizeFormData(formData);
        
        // Now use sanitizedData for your form processing
        console.log('Form submitted with sanitized data');
        
        // Process form data based on form ID
        if (form.id === 'frs-form') {
          calculateFRS();
        } else if (form.id === 'qrisk-form') {
          calculateQRISK();
        } else if (form.id === 'medication-form') {
          evaluateMedications();
        }
      } else {
        // Fall back to normal processing if sanitizer not available
        if (form.id === 'frs-form') {
          calculateFRS();
        } else if (form.id === 'qrisk-form') {
          calculateQRISK();
        } else if (form.id === 'medication-form') {
          evaluateMedications();
        }
      }
    });
    
    // Add keyboard submission handling
    form.addEventListener('keydown', function(event) {
      // Check if Enter key is pressed
      if (event.key === 'Enter' || event.keyCode === 13) {
        const activeElement = document.activeElement;
        
        // If active element is not a textarea or a button, handle the Enter key
        if (activeElement.tagName !== 'TEXTAREA' && activeElement.tagName !== 'BUTTON') {
          // Prevent default behavior
          event.preventDefault();
          
          // If active element is an input field, perform validation on it first
          if (activeElement.tagName === 'INPUT') {
            // Trigger input validation
            const event = new Event('change');
            activeElement.dispatchEvent(event);
          }
          
          // Submit the form with proper validation and sanitization
          const submitEvent = new Event('submit', { cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      }
    });
  });
});
`;

fs.writeFileSync(formHandlerPath, formHandlerContent);
console.log('Form handler with sanitization created successfully!');

// Update index.html to include the form handler
if (!indexHtml.includes('form-handler.js')) {
  // Add before closing body tag but after input sanitizer
  indexHtml = indexHtml.replace('<script src="js/utils/input-sanitizer.js"></script>', 
    '<script src="js/utils/input-sanitizer.js"></script>\n    <script src="js/form-handler.js"></script>');
  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('Added form handler script to index.html');
}

// Create a validator extension that uses both standard and physiological validation
const validatorExtensionPath = path.join(jsDir, 'utils', 'validator-extension.js');
console.log('Creating validator extension...');

const validatorExtensionContent = `/**
 * Validator Extension
 * Extends validation with additional checks and integration with input sanitization
 */
const validatorExtension = (function() {
  /**
   * Enhance a standard validation function with sanitization
   * @param {Function} validationFn - Original validation function
   * @param {string} inputType - Type of input for sanitization
   * @returns {Function} - Enhanced validation function
   */
  function withSanitization(validationFn, inputType = 'text') {
    return function(fieldId, min, max, fieldName, required = true) {
      // Get the field
      const field = document.getElementById(fieldId);
      if (!field) return { isValid: false, value: null, message: \`Field \${fieldId} not found\` };
      
      // Sanitize the input first if sanitizer is available
      if (window.inputSanitizer) {
        const sanitized = window.inputSanitizer.sanitizeByType(field.value, inputType);
        if (sanitized !== field.value) {
          field.value = sanitized;
        }
      }
      
      // Now run the original validation
      return validationFn(fieldId, min, max, fieldName, required);
    };
  }
  
  /**
   * Validate form with enhanced security
   * @param {string} formId - ID of the form to validate
   * @returns {Object} - Validation result
   */
  function validateFormSecurely(formId) {
    // Get the form element
    const form = document.getElementById(formId);
    if (!form) return { isValid: false, errors: ['Form not found'] };
    
    // Sanitize all inputs
    if (window.inputSanitizer) {
      window.inputSanitizer.setupFormSanitization(formId);
    }
    
    // Perform standard validation
    const validationResult = typeof validateForm === 'function' 
      ? validateForm(formId) 
      : { isValid: true, errors: [] };
    
    // Perform additional checks if validation passed
    if (validationResult.isValid) {
      // Check for suspicious patterns in inputs
      const suspiciousPatterns = [
        /[<>]/, // Potential HTML tags
        /javascript:/i, // JavaScript protocol
        /\\\\x[0-9a-f]{2}/i, // Hex escape sequences
        /on\\w+\\s*=/i, // Event handlers
        /\\\\u[0-9a-f]{4}/i // Unicode escape sequences
      ];
      
      const inputs = form.querySelectorAll('input[type="text"], textarea');
      inputs.forEach(input => {
        const value = input.value;
        
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            validationResult.isValid = false;
            validationResult.errors = validationResult.errors || [];
            validationResult.errors.push(\`Potentially unsafe input detected in \${input.id || 'a field'}\`);
            break;
          }
        }
      });
    }
    
    return validationResult;
  }
  
  /**
   * Add physiological validation to numeric inputs
   * @param {string} formId - ID of the form to enhance
   */
  function addPhysiologicalValidation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Map of input fields to their physiological parameter types
    const parameterMap = {
      // FRS form fields
      'frs-age': 'age',
      'frs-sbp': 'sbp',
      'frs-total-chol': 'totalChol',
      'frs-hdl': 'hdl',
      'frs-ldl': 'ldl',
      
      // QRISK form fields
      'qrisk-age': 'age',
      'qrisk-sbp': 'sbp',
      'qrisk-total-chol': 'totalChol',
      'qrisk-hdl': 'hdl',
      'qrisk-ldl': 'ldl',
      'qrisk-height': 'height',
      'qrisk-weight': 'weight',
      
      // Medication form fields
      'med-total-chol': 'totalChol',
      'med-ldl': 'ldl',
      'med-hdl': 'hdl',
      'med-trig': 'trig',
      'med-lpa': 'lpa',
      'med-apob': 'apob'
    };
    
    // Find all numeric inputs
    const numericInputs = form.querySelectorAll('input[type="number"]');
    numericInputs.forEach(input => {
      if (parameterMap[input.id]) {
        input.setAttribute('data-param-type', parameterMap[input.id]);
      }
    });
  }
  
  // Return public API
  return {
    withSanitization,
    validateFormSecurely,
    addPhysiologicalValidation
  };
})();

// If the main validation functions exist, enhance them
document.addEventListener('DOMContentLoaded', function() {
  if (typeof validateNumericInput === 'function') {
    window.originalValidateNumericInput = validateNumericInput;
    window.validateNumericInput = validatorExtension.withSanitization(validateNumericInput, 'number');
  }
  
  if (typeof validateSelectInput === 'function') {
    window.originalValidateSelectInput = validateSelectInput;
    window.validateSelectInput = validatorExtension.withSanitization(validateSelectInput, 'text');
  }
  
  if (typeof validateForm === 'function') {
    window.originalValidateForm = validateForm;
    window.validateForm = validatorExtension.validateFormSecurely;
  }
  
  // Add physiological validation to all appropriate forms
  ['frs-form', 'qrisk-form', 'medication-form'].forEach(formId => {
    validatorExtension.addPhysiologicalValidation(formId);
  });
  
  console.log('Validator extensions initialized');
});
`;

fs.writeFileSync(validatorExtensionPath, validatorExtensionContent);
console.log('Validator extension created successfully!');

// Update index.html to include the validator extension
if (!indexHtml.includes('validator-extension.js')) {
  // Add before closing body tag but after input sanitizer
  indexHtml = indexHtml.replace('<script src="js/utils/input-sanitizer.js"></script>', 
    '<script src="js/utils/input-sanitizer.js"></script>\n    <script src="js/utils/validator-extension.js"></script>');
  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('Added validator extension script to index.html');
}

console.log('Input sanitization implementation complete!');