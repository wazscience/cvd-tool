const fs = require('fs');
const path = require('path');

// Path to the combined.js file
const combinedJsPath = path.join(process.cwd(), 'combined.js');

// Check if combined.js exists
if (!fs.existsSync(combinedJsPath)) {
  console.log('combined.js does not exist, creating new file');

  // Create basic structure if file doesn't exist
  const basicCombinedJs = `// CVD Risk Toolkit Combined JavaScript

/**
 * Utility functions for edge case handling, enhanced compatibility,
 * and performance optimization.
 */

// Safely access nested properties without errors
function safeGet(obj, path, defaultValue = null) {
  try {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === undefined || result === null) {
        return defaultValue;
      }
      result = result[key];
    }
    
    return result === undefined ? defaultValue : result;
  } catch (e) {
    return defaultValue;
  }
}

// Debounce function for performance optimization
function debounce(func, wait = 100) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Throttle function for performance optimization
function throttle(func, limit = 100) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Enhanced Form functionality
 */
document.addEventListener("DOMContentLoaded", function() {
  // Toggle manual non-HDL entry
  const toggleManualNonHDL = document.getElementById("toggle-manual-non-hdl");
  if (toggleManualNonHDL) {
    toggleManualNonHDL.addEventListener("click", function() {
      const nonHDLInput = document.getElementById("med-non-hdl");
      if (nonHDLInput) {
        nonHDLInput.disabled = !nonHDLInput.disabled;
        this.textContent = nonHDLInput.disabled ? "Enter manually" : "Use auto-calculation";
      }
    });
  }
  
  // Add statin selection handler
  const statinSelect = document.getElementById("med-statin");
  if (statinSelect) {
    statinSelect.addEventListener("change", function() {
      const doseSelect = document.getElementById("med-statin-dose");
      if (doseSelect) {
        doseSelect.disabled = this.value === "none";
        doseSelect.innerHTML = "<option value=\\"\\" selected>Select dose</option>";
        
        if (this.value !== "none") {
          // Define statin doses
          const doses = {
            atorvastatin: [
              {value: "10", text: "10 mg", intensity: "moderate"},
              {value: "20", text: "20 mg", intensity: "moderate"},
              {value: "40", text: "40 mg", intensity: "high"},
              {value: "80", text: "80 mg", intensity: "high"}
            ],
            rosuvastatin: [
              {value: "5", text: "5 mg", intensity: "moderate"},
              {value: "10", text: "10 mg", intensity: "moderate"},
              {value: "20", text: "20 mg", intensity: "high"},
              {value: "40", text: "40 mg", intensity: "high"}
            ]
          };
          
          if (doses[this.value]) {
            doses[this.value].forEach(dose => {
              const option = document.createElement("option");
              option.value = dose.value;
              option.textContent = dose.text;
              option.dataset.intensity = dose.intensity;
              doseSelect.appendChild(option);
            });
          }
        }
      }
    });
  }
  
  // Initialize loading indicators if available
  if (window.loadingIndicator) {
    const calculateButtons = document.querySelectorAll('.primary-btn');
    calculateButtons.forEach(button => {
      button.addEventListener('click', function() {
        if (this.textContent.includes('Calculate')) {
          window.loadingIndicator.show('Processing...');
          
          // Hide after a short delay to simulate processing
          setTimeout(() => {
            window.loadingIndicator.hide();
          }, 1000);
        }
      });
    });
  }
});
`;

  fs.writeFileSync(combinedJsPath, basicCombinedJs);
  console.log('Created basic combined.js file');
} else {
  console.log('combined.js exists, enhancing it');

  // Read the existing file
  let combinedJs = fs.readFileSync(combinedJsPath, 'utf8');

  // Check if the loading indicator is already implemented
  if (!combinedJs.includes('window.loadingIndicator')) {
    const loadingIndicatorCode = `
// Initialize loading indicators if available
if (window.loadingIndicator) {
  const calculateButtons = document.querySelectorAll('.primary-btn');
  calculateButtons.forEach(button => {
    button.addEventListener('click', function() {
      if (this.textContent.includes('Calculate')) {
        window.loadingIndicator.show('Processing...');
        
        // Hide after a short delay to simulate processing
        setTimeout(() => {
          window.loadingIndicator.hide();
        }, 1000);
      }
    });
  });
}`;

    // Find the DOMContentLoaded event listener
    const insertPosition = combinedJs.indexOf('document.addEventListener("DOMContentLoaded", function() {');

    if (insertPosition !== -1) {
      // Find the end of the DOMContentLoaded function
      const closingBracePosition = combinedJs.indexOf('});', insertPosition);

      if (closingBracePosition !== -1) {
        // Insert the loading indicator code before the closing braces
        combinedJs = combinedJs.substring(0, closingBracePosition) +
                     loadingIndicatorCode +
                     combinedJs.substring(closingBracePosition);

        fs.writeFileSync(combinedJsPath, combinedJs);
        console.log('Enhanced combined.js with loading indicator support');
      } else {
        console.error('Could not find the end of the DOMContentLoaded function');
      }
    } else {
      // Add a new DOMContentLoaded listener at the end
      combinedJs += `\n\n// Add loading indicator support
document.addEventListener("DOMContentLoaded", function() {
  ${loadingIndicatorCode}
});\n`;

      fs.writeFileSync(combinedJsPath, combinedJs);
      console.log('Added loading indicator support to combined.js');
    }
  } else {
    console.log('Loading indicator already implemented in combined.js');
  }

  // Add physiological validation support if not already present
  if (!combinedJs.includes('physiologicalValidation')) {
    const validationCode = `
// Add support for physiological validation
function validatePhysiologicalValues() {
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
}

// Initialize validation on load
document.addEventListener('DOMContentLoaded', function() {
  validatePhysiologicalValues();
});`;

    combinedJs += validationCode;
    fs.writeFileSync(combinedJsPath, combinedJs);
    console.log('Added physiological validation support to combined.js');
  } else {
    console.log('Physiological validation already implemented in combined.js');
  }
}

console.log('combined.js update complete');
