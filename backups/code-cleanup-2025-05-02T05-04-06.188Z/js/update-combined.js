// update-combined.js
const fs = require('fs');
const path = require('path');

function updateCombinedJS() {
  const combinedPath = path.join(process.cwd(), 'combined.js');
  let js = '';

  if (fs.existsSync(combinedPath)) {
    js = fs.readFileSync(combinedPath, 'utf8');
  } else {
    // Create basic structure if file doesn't exist
    js = `// CVD Risk Toolkit Combined JavaScript\n\n`;
  }

  // Add version comment if not present
  if (!js.includes('// Version:')) {
    js = `// Version: 1.1.0 - Last Updated: ${new Date().toISOString()}\n\n` + js;
  }

  // Add utility function integration if not already present
  const utilityIntegration = `
/**
 * Enhanced Integration with New Utilities
 */
document.addEventListener("DOMContentLoaded", function() {
  // Initialize physiological validation
  if (window.physiologicalValidation) {
    const numericInputs = document.querySelectorAll('input[type="number"]');
    numericInputs.forEach(input => {
      input.addEventListener('change', function() {
        const fieldId = this.id;
        const parameterType = this.dataset.parameterType || fieldId.replace(/^(frs|qrisk|med)-/, '');
        
        if (window.physiologicalValidation.validatePhysiologicalInput) {
          window.physiologicalValidation.validatePhysiologicalInput(fieldId, parameterType);
        }
      });
    });
  }
  
  // Initialize enhanced validation
  if (window.validatorExtension) {
    console.info('Enhanced validation ready');
  }
  
  // Initialize input sanitization
  if (window.inputSanitizer) {
    console.info('Input sanitization ready');
  }
});
`;

  // Add error boundary wrapper
  const errorBoundary = `
// Error boundary wrapper for critical functions
function withErrorBoundary(fn, fallback = null) {
  return function(...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      console.error('Error in function:', fn.name, error);
      if (window.enhancedDisplay) {
        window.enhancedDisplay.showError('An error occurred. Please try again.');
      }
      return fallback;
    }
  };
}

// Wrap critical functions with error boundary
if (typeof calculateFRS === 'function') {
  calculateFRS = withErrorBoundary(calculateFRS);
}
if (typeof calculateQRISK === 'function') {
  calculateQRISK = withErrorBoundary(calculateQRISK);
}
if (typeof evaluateMedications === 'function') {
  evaluateMedications = withErrorBoundary(evaluateMedications);
}
`;

  // Add enhanced form handlers
  const enhancedFormHandlers = `
// Enhanced form submission protection
function enhanceFormSubmission() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      // Check if we're already handling this form
      if (this.dataset.enhanced) return;
      
      // Mark as enhanced
      this.dataset.enhanced = 'true';
      
      // Get all input values
      const formData = new FormData(this);
      const data = {};
      
      for (let [key, value] of formData.entries()) {
        // Sanitize input values
        if (window.inputSanitizer && typeof value === 'string') {
          data[key] = window.inputSanitizer.sanitizeText(value);
        } else {
          data[key] = value;
        }
      }
      
      // Update form values with sanitized data
      for (let key in data) {
        const input = this.elements[key];
        if (input && input.value !== data[key]) {
          input.value = data[key];
        }
      }
    });
  });
}

// Initialize enhanced form submission
document.addEventListener('DOMContentLoaded', enhanceFormSubmission);
`;

  // Add performance optimizations
  const performanceOptimizations = `
// Memoization for expensive calculations
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Optimize frequently used functions
if (typeof calculateLpaModifier === 'function') {
  calculateLpaModifier = memoize(calculateLpaModifier);
}
`;

  // Check if pieces don't exist before adding
  if (!js.includes('Enhanced Integration with New Utilities')) {
    js += utilityIntegration;
  }

  if (!js.includes('withErrorBoundary')) {
    js += errorBoundary;
  }

  if (!js.includes('enhanceFormSubmission')) {
    js += enhancedFormHandlers;
  }

  if (!js.includes('memoize')) {
    js += performanceOptimizations;
  }

  // Write the updated file
  fs.writeFileSync(combinedPath, js, 'utf8');
  console.log('Updated combined.js successfully');
  console.log('Created backup at combined.js.bak');

  // Create a backup
  fs.writeFileSync(combinedPath + '.bak', js, 'utf8');
}

// Run the update
updateCombinedJS();
