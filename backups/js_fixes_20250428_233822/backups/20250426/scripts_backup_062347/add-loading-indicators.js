const fs = require('fs');
const path = require('path');

// Paths
const jsDir = path.join(process.cwd(), 'js');
const utilsDir = path.join(jsDir, 'utils');
const loadingIndicatorPath = path.join(utilsDir, 'loading-indicator.js');
const cssPath = path.join(process.cwd(), 'styles.css');
const indexHtmlPath = path.join(process.cwd(), 'index.html');

// Create directories if they don't exist
if (!fs.existsSync(utilsDir)) {
  fs.mkdirSync(utilsDir, { recursive: true });
}

// Create loading indicator utility
console.log('Creating basic loading indicator utility...');

const loadingIndicatorContent = `/**
 * Simple Loading Indicator Utility
 */
const loadingIndicator = (function() {
  // Configuration
  const config = {
    defaultDelay: 300, // ms before showing indicators
    defaultMinDuration: 500, // ms minimum time to show indicators
    useOverlay: true, // whether to use a full-page overlay for global operations
    globalIndicatorId: 'global-loading-indicator'
  };
  
  /**
   * Show loading indicator
   * @param {string} message - Loading message
   */
  function show(message = 'Loading...') {
    // Check if indicator already exists
    let indicator = document.getElementById(config.globalIndicatorId);
    
    if (!indicator) {
      // Create indicator
      indicator = document.createElement('div');
      indicator.id = config.globalIndicatorId;
      indicator.className = 'loading-indicator';
      
      // Create overlay if needed
      if (config.useOverlay) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.appendChild(indicator);
        document.body.appendChild(overlay);
      } else {
        document.body.appendChild(indicator);
      }
    }
    
    // Set content
    indicator.innerHTML = \`
      <div class="spinner"></div>
      <div class="loading-message">\${message}</div>
    \`;
    
    // Show indicator
    indicator.style.display = 'flex';
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.style.display = 'flex';
  }
  
  /**
   * Hide loading indicator
   */
  function hide() {
    const indicator = document.getElementById(config.globalIndicatorId);
    if (indicator) {
      const overlay = document.querySelector('.loading-overlay');
      if (overlay) overlay.style.display = 'none';
      indicator.style.display = 'none';
    }
  }
  
  // Return public API
  return {
    show,
    hide
  };
})();
`;

fs.writeFileSync(loadingIndicatorPath, loadingIndicatorContent, 'utf8');
console.log('Created loading indicator utility');

// Add CSS for loading indicators
let cssContent = '';
try {
  cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
} catch (error) {
  console.warn('Could not read existing CSS file. Creating new one.');
  cssContent = '/* CVD Risk Toolkit Styles */\n\n';
}

const loadingCss = `
/* Loading Indicator Styles */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-indicator {
  display: none;
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
`;

if (!cssContent.includes('.loading-indicator')) {
  cssContent += loadingCss;
  fs.writeFileSync(cssPath, cssContent, 'utf8');
  console.log('Added loading indicator CSS styles');
}

// Update index.html to include the loading indicator script
let indexHtml = '';
try {
  indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
} catch (error) {
  console.error('Error reading index.html:', error);
  return;
}

if (!indexHtml.includes('loading-indicator.js')) {
  // Add after security script
  if (indexHtml.includes('secure-storage.js')) {
    indexHtml = indexHtml.replace('<script src="js/utils/secure-storage.js"></script>', 
      '<script src="js/utils/secure-storage.js"></script>\n    <script src="js/utils/loading-indicator.js"></script>');
  } else {
    // Add before closing body tag
    indexHtml = indexHtml.replace('</body>', '    <script src="js/utils/loading-indicator.js"></script>\n</body>');
  }
  
  fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
  console.log('Added loading indicator script to index.html');
}

console.log('Loading indicator implementation complete!');
