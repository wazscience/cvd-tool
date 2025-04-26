// update-styles.js
const fs = require('fs');
const path = require('path');

function updateStyles() {
  const stylesPath = path.join(process.cwd(), 'styles.css');
  let css = '';
  
  if (fs.existsSync(stylesPath)) {
    css = fs.readFileSync(stylesPath, 'utf8');
  } else {
    // Create basic structure if file doesn't exist
    css = `/* CVD Risk Toolkit Styles */\n\n`;
  }
  
  // Add version comment if not present
  if (!css.includes('/* Version:')) {
    css = `/* Version: 1.1.0 - Last Updated: ${new Date().toISOString()} */\n\n` + css;
  }
  
  // Add new styles if they don't exist
  const newStyles = `
/* Enhanced Display Styles */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 400px;
}

.toast {
  padding: 12px 20px;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  animation: slideIn 0.3s ease-out;
}

.toast-info {
  border-left: 4px solid #3498db;
}

.toast-success {
  border-left: 4px solid #2ecc71;
}

.toast-warning {
  border-left: 4px solid #f39c12;
}

.toast-error {
  border-left: 4px solid #e74c3c;
}

.toast-close {
  position: absolute;
  right: 8px;
  top: 8px;
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #999;
}

.toast-close:hover {
  color: #333;
}

/* Loading Indicator Styles */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1001;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-message {
  margin-top: 10px;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-out {
  animation: slideOut 0.3s ease-in;
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* Physiological Warning Styles */
.physiological-warning {
  padding: 8px 12px;
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
  color: #856404;
  font-size: 14px;
  margin-top: 4px;
  border-radius: 4px;
}

.physiological-error {
  padding: 8px 12px;
  background-color: #f8d7da;
  border-left: 4px solid #dc3545;
  color: #721c24;
  font-size: 14px;
  margin-top: 4px;
  border-radius: 4px;
}

/* Enhanced Disclaimer Styles */
.disclaimer-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  justify-content: center;
  align-items: center;
}

.disclaimer-content {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.disclaimer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.decline-btn {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.accept-btn {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

/* Form enhancement styles */
.error-highlight {
  border-color: #dc3545 !important;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}

.success-highlight {
  border-color: #28a745 !important;
  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
}

/* Utility classes */
.d-none {
  display: none !important;
}

.d-flex {
  display: flex !important;
}

.justify-content-center {
  justify-content: center !important;
}

.align-items-center {
  align-items: center !important;
}
`;
  
  // Check if these styles already exist
  if (!css.includes('.toast-container')) {
    css += newStyles;
  }
  
  // Write the updated file
  fs.writeFileSync(stylesPath, css, 'utf8');
  console.log('Updated styles.css successfully');
  console.log('Created backup at styles.css.bak');
  
  // Create a backup
  fs.writeFileSync(stylesPath + '.bak', css, 'utf8');
}

// Run the update
updateStyles();