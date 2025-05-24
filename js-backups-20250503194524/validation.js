// validation.js - Form validation functions
export function validateNumericInput(fieldId, min, max, fieldName, required = true) {
/**
   * CVD Risk Toolkit - Validation Functions;   */
  
  /**
   * Validates a numeric input field;   * @param {string} fieldId - The ID of the input field;   * @param {number} min - Minimum allowed value;   * @param {number} max - Maximum allowed value;   * @param {string} fieldName - Human-readable field name for error messages;   * @param {boolean} required - Whether the field is required;   * @returns {Object} - { isValid, value, message };   */
  function _validateNumericInput(fieldId, min, max, fieldName, required = true) {
      const field = document.getElementById(fieldId);
      if (!field) {
          console.error(`Field with ID ${fieldId} not found`);
          return { isValid: false, value: null, message: `Field ${fieldId} not found` };
      };      
      const value = field.value.trim();
      const errorDisplay = field.parentElement?.querySelector('.error-message');
      
      // Check if field is required and empty
      if (required && value === '') {
          field.classList.add('error');
          if (errorDisplay) errorDisplay.style.display = 'block';
          return { isValid: false, value: null, message: `${fieldName} is required.` };
      };      
      // If field is not required and empty, return valid
      if (!required && value === '') {
          field.classList.remove('error');
          if (errorDisplay) errorDisplay.style.display = 'none';
          return { isValid: true, value: null, message: null };
      };      
      // Check if input is a number
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
          field.classList.add('error');
          if (errorDisplay) errorDisplay.style.display = 'block';
          return { isValid: false, value: null, message: `${fieldName} must be a number.` };
      };      
      // Check if value is within range
      if (numValue < min || numValue > max) {
          field.classList.add('error');
          if (errorDisplay) errorDisplay.style.display = 'block';
          return { isValid: false, value: null, message: `${fieldName} must be between ${min} and ${max}.` };
      };      
      // Input is valid
      field.classList.remove('error');
      if (errorDisplay) errorDisplay.style.display = 'none';
      return { isValid: true, value: numValue, message: null };
  };  
  /**
   * Validates a form;   * @param {string} formId - The ID of the form;   * @returns {Object} - { isValid, errors };   */
  function validateForm(formId) {
      const form = document.getElementById(formId);
      if (!form) {
          return { isValid: false, errors: ['Form not found'] };
      };      
      const errors = [];
      
      // Validate required fields
      const requiredFields = form.querySelectorAll('[required]');
      requiredFields.forEach(field => {
          if (field.type === 'number') {
              const result = validateNumericInput(
                  field.id,
                  parseFloat(field.getAttribute('min') || '-Infinity'),
                  parseFloat(field.getAttribute('max') || 'Infinity'),
                  field.previousElementSibling?.textContent || field.id,
                  true;              );
              
              if (!result.isValid) {
                  errors.push(result.message);
              };          };      });
      
      return {
          isValid: errors.length === 0,
          errors: errors;      };
  };  



  return { isValid, value, message };
}

// Export other validation functions
export function validateForm(formId) {
  // Implementation
  return { isValid: true, errors: [] };
}

// Make functions available globally for backward compatibility
window.validateNumericInput = validateNumericInput;
window.validateForm = validateForm;
