// Main entry point for the CVD Risk Toolkit
import './js/validation.js';
import './js/calculations.js';
import './js/medication.js';
import './js/ui.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initializeApp === 'function') {
    initializeApp();
  } else {
    console.error('Application initialization function not found');
  }
});
