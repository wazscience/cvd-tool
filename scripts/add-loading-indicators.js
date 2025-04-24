/**
 * scripts/add-loading-indicators.js
 * Implements loading indicators for improved user experience
 */
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
  console.log('Created utils directory');
}

// Create loading indicator utility
console.log('Creating loading indicator utility...');

const loadingIndicatorContent = `/**
 * Loading Indicator Utility
 * Provides functions for managing loading indicators throughout the application
 */
const loadingIndicator = (function() {
  // Configuration
  const config = {
    defaultDelay: 300, // ms before showing indicators (prevents flashing for fast operations)
    defaultMinDuration: 500, // ms minimum time to show indicators
    useOverlay: true, // whether to use a full-page overlay for global operations
    spinnerSize: 'medium', // small, medium, large
    spinnerColor: 'var(--secondary-color)', // CSS color
    spinnerThickness: 2, // px
    globalIndicatorId: 'global-loading-indicator',
    debugMode: false
  };
  
  // Store active indicators and their timers
  const activeIndicators = new Map();
  const pendingTimers = new Map();
  
  /**
   * Create an indicator DOM element
   * @param {string} id - Indicator ID
   * @param {string} type - Type of indicator ('spinner', 'progress', 'dots', 'pulse')
   * @param {string} size - Size of indicator ('small', 'medium', 'large')
   * @param {string} message - Loading message to display
   * @returns {HTMLElement} - Created indicator element
   */
  function createIndicatorElement(id, type = 'spinner', size = config.spinnerSize, message = 'Loading...') {
    // Create container
    const container = document.createElement('div');
    container.id = id;
    container.className = \`loading-indicator loading-indicator-\${type} loading-size-\${size}\`;
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    
    // Create inner content based on type
    let indicatorHtml = '';
    
    switch (type) {
      case 'spinner':
        indicatorHtml = \`
          <div class="spinner-container">
            <svg class="spinner" viewBox="0 0 50 50">
              <circle class="spinner-path" cx="25" cy="25" r="20" fill="none" stroke-width="\${config.spinnerThickness}"></circle>
            </svg>
          </div>
        \`;
        break;
        
      case 'progress':
        indicatorHtml = \`
          <div class="progress-container">
            <div class="progress-bar"></div>
          </div>
        \`;
        break;
        
      case 'dots':
        indicatorHtml = \`
          <div class="dots-container">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        \`;
        break;
        
      case 'pulse':
        indicatorHtml = \`
          <div class="pulse-container">
            <div class="pulse"></div>
          </div>
        \`;
        break;
        
      default:
        indicatorHtml = \`
          <div class="spinner-container">
            <svg class="spinner" viewBox="0 0 50 50">
              <circle class="spinner-path" cx="25" cy="25" r="20" fill="none" stroke-width="\${config.spinnerThickness}"></circle>
            </svg>
          </div>
        \`;
    }
    
    // Add message if provided
    if (message) {
      indicatorHtml += \`<div class="loading-message">\${message}</div>\`;
    }
    
    container.innerHTML = indicatorHtml;
    return container;
  }
  
  /**
   * Create a full-page loading overlay
   * @param {string} id - Overlay ID
   * @param {string} message - Loading message
   * @returns {HTMLElement} - Created overlay element
   */
  function createOverlay(id, message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.id = id + '-overlay';
    overlay.className = 'loading-overlay';
    
    // Create indicator
    const indicator = createIndicatorElement(id, 'spinner', 'large', message);
    overlay.appendChild(indicator);
    
    return overlay;
  }
  
  /**
   * Set progress for a progress-type indicator
   * @param {string} id - Indicator ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Optional updated message
   */
  function setProgress(id, progress, message = null) {
    const indicator = document.getElementById(id);
    if (!indicator) return;
    
    // Update progress bar if it exists
    const progressBar = indicator.querySelector('.progress-bar');
    if (progressBar) {
      progressBar.style.width = \`\${progress}%\`;
    }
    
    // Update message if provided
    if (message !== null) {
      const messageEl = indicator.querySelector('.loading-message');
      if (messageEl) {
        messageEl.textContent = message;
      }
    }
  }
  
  /**
   * Show a loading indicator
   * @param {string} id - Indicator ID
   * @param {Object} options - Indicator options
   * @returns {Promise} - Promise that resolves when indicator is shown
   */
  function show(id, options = {}) {
    return new Promise(resolve => {
      // Parse options with defaults
      const {
        target = document.body,
        type = 'spinner',
        size = config.spinnerSize,
        message = 'Loading...',
        delay = config.defaultDelay,
        minDuration = config.defaultMinDuration,
        useOverlay = config.useOverlay && id === config.globalIndicatorId,
        position = 'center', // center, top, bottom, prepend, append
        className = ''
      } = options;
      
      // Store start time
      const startTime = Date.now();
      activeIndicators.set(id, startTime);
      
      // Clear any existing pending timer
      if (pendingTimers.has(id)) {
        clearTimeout(pendingTimers.get(id));
        pendingTimers.delete(id);
      }
      
      // Set timer to show indicator after delay
      const timer = setTimeout(() => {
        // Create indicator element
        const indicatorElement = useOverlay ? 
          createOverlay(id, message) : 
          createIndicatorElement(id, type, size, message);
        
        // Add custom class if provided
        if (className) {
          indicatorElement.classList.add(className);
        }
        
        // Position the indicator
        switch (position) {
          case 'top':
            target.insertBefore(indicatorElement, target.firstChild);
            break;
          case 'bottom':
          case 'append':
            target.appendChild(indicatorElement);
            break;
          case 'prepend':
            target.insertBefore(indicatorElement, target.firstChild);
            break;
          case 'center':
          default:
            // Add centered positioning
            indicatorElement.classList.add('loading-centered');
            target.appendChild(indicatorElement);
            break;
        }
        
        // Show the indicator
        indicatorElement.classList.add('loading-visible');
        
        if (config.debugMode) {
          console.debug(\`Loading indicator '\${id}' shown\`);
        }
        
        pendingTimers.delete(id);
        resolve();
      }, delay);
      
      // Store the timer
      pendingTimers.set(id, timer);
    });
  }
  
  /**
   * Hide a loading indicator
   * @param {string} id - Indicator ID
   * @param {Object} options - Options for hiding
   * @returns {Promise} - Promise that resolves when indicator is hidden
   */
  function hide(id, options = {}) {
    return new Promise(resolve => {
      // Parse options with defaults
      const {
        minDuration = config.defaultMinDuration,
        fadeOutTime = 300
      } = options;
      
      // Check if this indicator is active
      if (!activeIndicators.has(id)) {
        resolve();
        return;
      }
      
      // Calculate time shown
      const startTime = activeIndicators.get(id);
      const timeShown = Date.now() - startTime;
      const remainingTime = Math.max(0, minDuration - timeShown);
      
      // Clear any pending timer
      if (pendingTimers.has(id)) {
        clearTimeout(pendingTimers.get(id));
        pendingTimers.delete(id);
      }
      
      // Wait for minimum duration before hiding
      setTimeout(() => {
        const element = document.getElementById(id);
        const overlay = document.getElementById(id + '-overlay');
        
        // Get the element to fade out (element or overlay)
        const targetElement = overlay || element;
        
        if (targetElement) {
          // Start fade out
          targetElement.classList.add('loading-hiding');
          targetElement.classList.remove('loading-visible');
          
          // Remove after fade out
          setTimeout(() => {
            if (targetElement.parentNode) {
              targetElement.parentNode.removeChild(targetElement);
            }
            
            activeIndicators.delete(id);
            
            if (config.debugMode) {
              console.debug(\`Loading indicator '\${id}' hidden\`);
            }
            
            resolve();
          }, fadeOutTime);
        } else {
          // No element found, remove from active list
          activeIndicators.delete(id);
          resolve();
        }
      }, remainingTime);
    });
  }
  
  /**
   * Show the global loading indicator
   * @param {string} message - Loading message
   * @returns {Promise} - Promise that resolves when indicator is shown
   */
  function showGlobal(message = 'Loading...') {
    return show(config.globalIndicatorId, {
      message: message,
      useOverlay: true,
      size: 'large'
    });
  }
  
  /**
   * Hide the global loading indicator
   * @returns {Promise} - Promise that resolves when indicator is hidden
   */
  function hideGlobal() {
    return hide(config.globalIndicatorId);
  }
  
  /**
   * Show loading indicator for a specific element
   * @param {string} elementId - ID of element to show indicator for
   * @param {string} message - Loading message
   * @returns {Promise} - Promise that resolves when indicator is shown
   */
  function showForElement(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(\`Element with ID '\${elementId}' not found for loading indicator\`);
      return Promise.resolve();
    }
    
    const indicatorId = \`\${elementId}-indicator\`;
    return show(indicatorId, {
      target: element,
      message: message
    });
  }
  
  /**
   * Hide loading indicator for a specific element
   * @param {string} elementId - ID of element to hide indicator for
   * @returns {Promise} - Promise that resolves when indicator is hidden
   */
  function hideForElement(elementId) {
    const indicatorId = \`\${elementId}-indicator\`;
    return hide(indicatorId);
  }
  
  /**
   * Show tab loading indicator
   * @param {string} tabId - ID of tab to show indicator for
   * @param {string} message - Loading message
   * @returns {Promise} - Promise that resolves when indicator is shown
   */
  function showForTab(tabId, message = 'Loading tab content...') {
    const tab = document.getElementById(tabId);
    if (!tab) {
      console.warn(\`Tab with ID '\${tabId}' not found for loading indicator\`);
      return Promise.resolve();
    }
    
    const indicatorId = \`\${tabId}-tab-indicator\`;
    return show(indicatorId, {
      target: tab,
      message: message,
      position: 'center'
    });
  }
  
  /**
   * Hide tab loading indicator
   * @param {string} tabId - ID of tab to hide indicator for
   * @returns {Promise} - Promise that resolves when indicator is hidden
   */
  function hideForTab(tabId) {
    const indicatorId = \`\${tabId}-tab-indicator\`;
    return hide(indicatorId);
  }
  
  /**
   * Show form submission loading indicator
   * @param {string} formId - ID of form to show indicator for
   * @param {string} message - Loading message
   * @returns {Promise} - Promise that resolves when indicator is shown
   */
  function showForForm(formId, message = 'Processing...') {
    const form = document.getElementById(formId);
    if (!form) {
      console.warn(\`Form with ID '\${formId}' not found for loading indicator\`);
      return Promise.resolve();
    }
    
    // Disable form elements
    const formElements = form.querySelectorAll('button, input, select, textarea');
    formElements.forEach(element => {
      if (!element.hasAttribute('data-loading-disabled')) {
        element.setAttribute('data-loading-disabled', element.disabled ? 'true' : 'false');
        element.disabled = true;
      }
    });
    
    const indicatorId = \`\${formId}-form-indicator\`;
    return show(indicatorId, {
      target: form,
      message: message,
      position: 'center',
      className: 'form-loading-indicator'
    });
  }
  
  /**
   * Hide form submission loading indicator
   * @param {string} formId - ID of form to hide indicator for
   * @returns {Promise} - Promise that resolves when indicator is hidden
   */
  function hideForForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      // Re-enable form elements
      const formElements = form.querySelectorAll('[data-loading-disabled]');
      formElements.forEach(element => {
        const wasDisabled = element.getAttribute('data-loading-disabled') === 'true';
        element.disabled = wasDisabled;
        element.removeAttribute('data-loading-disabled');
      });
    }
    
    const indicatorId = \`\${formId}-form-indicator\`;
    return hide(indicatorId);
  }
  
  /**
   * Utility to wrap a function with loading indicators
   * @param {Function} fn - Function to wrap
   * @param {string} indicatorId - ID of indicator to show
   * @param {Object} options - Indicator options
   * @returns {Function} - Wrapped function
   */
  function withLoading(fn, indicatorId, options = {}) {
    return async function(...args) {
      try {
        await show(indicatorId, options);
        const result = await Promise.resolve(fn(...args));
        await hide(indicatorId);
        return result;
      } catch (error) {
        await hide(indicatorId);
        throw error;
      }
    };
  }
  
  /**
   * Initialize page loading indicators
   */
  function initializePageLoadingIndicators() {
    // Create global loading indicator
    showGlobal('Initializing application...');
    
    // Add instrumentation for all tab switches
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      const originalClickHandler = tab.onclick;
      
      tab.onclick = async function(event) {
        // Get target tab ID
        const tabId = this.getAttribute('data-tab');
        if (!tabId) return;
        
        // Show loading indicator
        await showForTab(tabId);
        
        try {
          // Call original handler
          if (originalClickHandler) {
            originalClickHandler.call(this, event);
          }
          
          // Allow DOM to update
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Simulate delay for tabs that load instantly
          await new Promise(resolve => setTimeout(resolve, 300));
        } finally {
          // Hide loading indicator
          hideForTab(tabId);
        }
      };
    });
    
    // Add instrumentation for form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      if (!form.id) return;
      
      const formId = form.id;
      const calculationFunctions = {
        'frs-form': window.calculateFRS,
        'qrisk-form': window.calculateQRISK,
        'medication-form': window.evaluateMedications
      };
      
      const calculationFunction = calculationFunctions[formId];
      if (calculationFunction) {
        // Create wrapped calculation function
        window[calculationFunction.name] = withLoading(
          calculationFunction,
          \`\${formId}-calculation\`,
          {
            target: document.getElementById('results-container') || document.body,
            message: 'Calculating results...',
            position: 'top'
          }
        );
      }
      
      // Instrument submit buttons
      const submitButton = form.querySelector('button[type="submit"], button.primary-btn');
      if (submitButton) {
        const originalClickHandler = submitButton.onclick;
        
        submitButton.onclick = async function(event) {
          event.preventDefault();
          
          // Show loading indicator
          await showForForm(formId, 'Processing data...');
          
          try {
            // Call original handler or trigger calculation
            if (originalClickHandler) {
              await Promise.resolve(originalClickHandler.call(this, event));
            } else if (calculationFunction) {
              await Promise.resolve(window[calculationFunction.name]());
            }
          } finally {
            // Hide loading indicator
            hideForForm(formId);
          }
        };
      }
    });
    
    // Hide global loading indicator when page is fully loaded
    window.addEventListener('load', function() {
      setTimeout(hideGlobal, 500);
    });
  }
  
  // Add CSS styles for loading indicators
  function addLoadingStyles() {
    // Check if styles already exist
    if (document.getElementById('loading-indicator-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'loading-indicator-styles';
    styleElement.textContent = \`
      /* Loading Overlay */
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
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .dark-theme .loading-overlay {
        background-color: rgba(0, 0, 0, 0.7);
      }
      
      /* Loading Indicator */
      .loading-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--space-md);
        background-color: var(--card-color);
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-md);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .loading-visible {
        opacity: 1;
      }
      
      .loading-hiding {
        opacity: 0;
      }
      
      .loading-centered {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 100;
      }
      
      /* Size variants */
      .loading-size-small {
        padding: var(--space-sm);
      }
      
      .loading-size-small .spinner {
        width: 24px;
        height: 24px;
      }
      
      .loading-size-small .loading-message {
        font-size: var(--font-size-sm);
      }
      
      .loading-size-medium .spinner {
        width: 40px;
        height: 40px;
      }
      
      .loading-size-large {
        padding: var(--space-lg);
      }
      
      .loading-size-large .spinner {
        width: 60px;
        height: 60px;
      }
      
      .loading-size-large .loading-message {
        font-size: var(--font-size-lg);
      }
      
      /* Message styling */
      .loading-message {
        margin-top: var(--space-sm);
        color: var(--text-color);
      }
      
      /* Spinner Animation */
      .spinner-container {
        position: relative;
      }
      
      .spinner {
        animation: rotate 2s linear infinite;
      }
      
      .spinner-path {
        stroke: \${config.spinnerColor};
        stroke-linecap: round;
        animation: dash 1.5s ease-in-out infinite;
      }
      
      @keyframes rotate {
        100% {
          transform: rotate(360deg);
        }
      }
      
      @keyframes dash {
        0% {
          stroke-dasharray: 1, 150;
          stroke-dashoffset: 0;
        }
        50% {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -35;
        }
        100% {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -124;
        }
      }
      
      /* Progress Bar */
      .progress-container {
        width: 100%;
        height: 8px;
        background-color: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }
      
      .dark-theme .progress-container {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      .progress-bar {
        height: 100%;
        background-color: \${config.spinnerColor};
        width: 0%;
        transition: width 0.3s ease;
      }
      
      /* Dots Animation */
      .dots-container {
        display: flex;
      }
      
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: \${config.spinnerColor};
        margin: 0 4px;
        animation: pulse 1.5s infinite ease-in-out;
      }
      
      .dot:nth-child(2) {
        animation-delay: 0.3s;
      }
      
      .dot:nth-child(3) {
        animation-delay: 0.6s;
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(0.5);
          opacity: 0.5;
        }
        50% {
          transform: scale(1);
          opacity: 1;
        }
      }
      
      /* Pulse Animation */
      .pulse-container {
        position: relative;
      }
      
      .pulse {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: \${config.spinnerColor};
        animation: pulse-animation 1.5s infinite ease-in-out;
      }
      
      @keyframes pulse-animation {
        0% {
          transform: scale(0.7);
          opacity: 1;
        }
        50% {
          transform: scale(1);
          opacity: 0.5;
        }
        100% {
          transform: scale(0.7);
          opacity: 1;
        }
      }
      
      /* Form Loading Indicator */
      .form-loading-indicator {
        background-color: var(--card-color);
        border: 1px solid var(--border-color);
      }
    \`;
    
    document.head.appendChild(styleElement);
  }
  
  // Initialize
  document.addEventListener('DOMContentLoaded', function() {
    // Add styles
    addLoadingStyles();
    
    // Initialize page loading indicators
    initializePageLoadingIndicators();
  });
  
  // Configure with specific settings
  function configure(options = {}) {
    Object.assign(config, options);
  }
  
  // Return public API
  return {
    show,
    hide,
    showGlobal,
    hideGlobal,
    showForElement,
    hideForElement,
    showForTab,
    hideForTab,
    showForForm,
    hideForForm,
    setProgress,
    withLoading,
    configure
  };
})();

// Add to window object for global access
window.loadingIndicator = loadingIndicator;
`;

fs.writeFileSync(loadingIndicatorPath, loadingIndicatorContent);
console.log('Loading indicator utility created successfully!');

// Add CSS for loading indicators
console.log('Adding CSS for loading indicators...');
let cssContent = '';

try {
  cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
} catch (error) {
  console.warn('Could not read existing CSS file. Creating new one.');
  cssContent = '/* CVD Risk Toolkit Styles */\n\n';
}

// Check if CSS already contains loading indicator styles
if (!cssContent.includes('.loading-indicator')) {
  // CSS will be added by the JavaScript utility, no need to add it here
  console.log('Loading indicator styles will be dynamically added by the JavaScript utility');
}

// Update index.html to include the loading indicator script
console.log('Updating index.html with loading indicator script...');
let indexHtml = '';
try {
  indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
} catch (error) {
  console.error('Error reading index.html:', error);
  process.exit(1);
}

// Check if script is already included
if (!indexHtml.includes('loading-indicator.js')) {
  // Add before closing body tag
  const loadingScript = '<script src="js/utils/loading-indicator.js"></script>';
  
  // Insert at appropriate location - after other utility scripts but before app scripts
  if (indexHtml.includes('<!-- Security and Privacy Utilities -->')) {
    // Add after security scripts
    indexHtml = indexHtml.replace('<!-- Security and Privacy Utilities -->', 
      '<!-- Security and Privacy Utilities -->\n    ' + loadingScript);
  } else {
    // Add before closing body tag
    indexHtml = indexHtml.replace('</body>', '    ' + loadingScript + '\n</body>');
  }
  
  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('Added loading indicator script to index.html');
}

// Create script to enhance form submissions with loading indicators
const formEnhancerPath = path.join(jsDir, 'form-submission-enhancer.js');
console.log('Creating form submission enhancer script...');

const formEnhancerContent = `/**
 * Form Submission Enhancer
 * Enhances form submissions with loading indicators and keyboard handling
 */
document.addEventListener('DOMContentLoaded', function() {
  // Process all forms
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    if (!form.id) {
      // Generate ID if not present
      form.id = 'form-' + Math.random().toString(36).substring(2, 9);
    }
    
    const formId = form.id;
    
    // Map calculation functions for known forms
    const calculationFunctions = {
      'frs-form': 'calculateFRS',
      'qrisk-form': 'calculateQRISK',
      'medication-form': 'evaluateMedications',
      'both-calc-form': 'calculateBoth'
    };
    
    // Find submission button
    const submitButton = form.querySelector('button[type="button"].primary-btn, button[type="submit"]');
    
    if (submitButton) {
      // Wrap original click handler
      const originalClickHandler = submitButton.onclick;
      
      submitButton.onclick = async function(event) {
        // Prevent default to handle submission manually
        event.preventDefault();
        
        // Validate form
        let isValid = true;
        if (typeof window.validateForm === 'function') {
          const validationResult = window.validateForm(formId);
          isValid = validationResult.isValid;
          
          if (!isValid) {
            // Display errors
            if (typeof window.displayErrors === 'function') {
              window.displayErrors(validationResult.errors);
            } else {
              alert('Please correct the errors in the form.');
            }
            return;
          }
        }
        
        // If validation passes, show loading indicator
        if (window.loadingIndicator) {
          await window.loadingIndicator.showForForm(formId, 'Processing...');
        }
        
        try {
          // Call appropriate calculation function
          const calculationFunctionName = calculationFunctions[formId];
          if (calculationFunctionName && typeof window[calculationFunctionName] === 'function') {
            await Promise.resolve(window[calculationFunctionName]());
          } else if (originalClickHandler) {
            // Call original handler if no matching function
            await Promise.resolve(originalClickHandler.call(this, event));
          }
        } catch (error) {
          console.error('Error processing form:', error);
          alert('An error occurred while processing the form. Please try again.');
        } finally {
          // Hide loading indicator
          if (window.loadingIndicator) {
            await window.loadingIndicator.hideForForm(formId);
          }
        }
      };
    }
    
    // Add keyboard handling for form submission
    form.addEventListener('keydown', function(event) {
      // Check for Enter key
      if (event.key === 'Enter' || event.keyCode === 13) {
        const activeElement = document.activeElement;
        
        // Skip if in textarea or button
        if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'BUTTON') {
          return;
        }
        
        // Skip if in select dropdown
        if (activeElement.tagName === 'SELECT' && activeElement.size > 1) {
          return;
        }
        
        // Prevent default Enter behavior
        event.preventDefault();
        
        // If in input field, trigger validation on that field
        if (activeElement.tagName === 'INPUT') {
          // Trigger change event to validate
          const changeEvent = new Event('change', { bubbles: true });
          activeElement.dispatchEvent(changeEvent);
          
          // Focus next field if available
          const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea'));
          const currentIndex = inputs.indexOf(activeElement);
          
          if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
            inputs[currentIndex + 1].focus();
            return;
          }
        }
        
        // If Enter is pressed and we're at the end of inputs or not in an input,
        // trigger form submission via the submit button
        if (submitButton) {
          submitButton.click();
        }
      }
    });
  });
  
  // Enhance tab navigation with loading indicators
  const tabButtons = document.querySelectorAll('.tab');
  
  tabButtons.forEach(button => {
    const originalClickHandler = button.onclick;
    const tabId = button.getAttribute('data-tab');
    
    if (!tabId) return;
    
    button.onclick = async function(event) {
      // Don't do anything if the tab is already active
      if (this.classList.contains('active')) {
        return;
      }
      
      // Show loading indicator
      if (window.loadingIndicator) {
        await window.loadingIndicator.showForTab(tabId);
      }
      
      try {
        // Call original handler or do default tab switching
        if (originalClickHandler) {
          originalClickHandler.call(this, event);
        } else {
          // Default tab switching behavior
          document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
          
          this.classList.add('active');
          document.getElementById(tabId).classList.add('active');
        }
        
        // Allow time for tab to load
        await new Promise(resolve => setTimeout(resolve, 300));
      } finally {
        // Hide loading indicator
        if (window.loadingIndicator) {
          await window.loadingIndicator.hideForTab(tabId);
        }
      }
    };
  });
});
`;

fs.writeFileSync(formEnhancerPath, formEnhancerContent);
console.log('Form submission enhancer created successfully!');

// Update index.html to include the form enhancer script
if (!indexHtml.includes('form-submission-enhancer.js')) {
  // Add after loading indicator script
  if (indexHtml.includes('loading-indicator.js')) {
    indexHtml = indexHtml.replace('<script src="js/utils/loading-indicator.js"></script>', 
      '<script src="js/utils/loading-indicator.js"></script>\n    <script src="js/form-submission-enhancer.js"></script>');
  } else {
    // Add before closing body tag
    indexHtml = indexHtml.replace('</body>', '    <script src="js/form-submission-enhancer.js"></script>\n</body>');
  }
  
  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('Added form submission enhancer script to index.html');
}

// Create initialization wrapper to improve page loading performance
const initializerPath = path.join(jsDir, 'app-initializer.js');
console.log('Creating application initializer script...');

const initializerContent = `/**
 * Application Initializer
 * Improves page loading performance by controlling script execution timing
 */
(function() {
  // Store original DOMContentLoaded callbacks
  const originalCallbacks = [];
  
  // Track if DOMContentLoaded has fired
  let domContentLoaded = false;
  
  // Override addEventListener for DOMContentLoaded
  const originalAddEventListener = document.addEventListener;
  
  document.addEventListener = function(event, callback, options) {
    if (event === 'DOMContentLoaded') {
      // Store callback for later controlled execution
      originalCallbacks.push({ callback, options });
      
      // If DOM is already loaded, don't add the event listener
      if (domContentLoaded) {
        return;
      }
    }
    
    // Call original method for other events
    return originalAddEventListener.call(this, event, callback, options);
  };
  
  // Add our own DOMContentLoaded listener that runs first
  originalAddEventListener.call(document, 'DOMContentLoaded', function() {
    // Mark DOM as loaded
    domContentLoaded = true;
    
    // Show initial loading indicator
    if (window.loadingIndicator && window.loadingIndicator.showGlobal) {
      window.loadingIndicator.showGlobal('Initializing application...');
    }
    
    // Execute critical initialization first
    executeInitializationPhase('critical', function() {
      // Then execute normal initialization
      executeInitializationPhase('normal', function() {
        // Finally execute deferred initialization
        executeInitializationPhase('deferred', function() {
          // Hide loading indicator
          if (window.loadingIndicator && window.loadingIndicator.hideGlobal) {
            window.loadingIndicator.hideGlobal();
          }
          
          console.log('Application initialization complete');
        });
      });
    });
  }, { once: true });
  
  /**
   * Execute initialization callbacks in phases
   * @param {string} phase - Initialization phase (critical, normal, deferred)
   * @param {Function} onComplete - Callback to run when phase completes
   */
  function executeInitializationPhase(phase, onComplete) {
    let delayBetweenCallbacks = 0;
    
    switch (phase) {
      case 'critical':
        // Critical initialization - runs immediately
        console.log('Executing critical initialization...');
        
        // Initialize core utilities first (loading indicator, security)
        initializeUtilities();
        
        // Execute immediate callbacks (marked with data-init="critical")
        executeCallbacksByAttribute('data-init', 'critical');
        
        // Execute critical original callbacks
        executeBatchOfCallbacks(getCriticalCallbacks(), 10, onComplete);
        break;
        
      case 'normal':
        // Normal initialization - slight delay to allow UI to respond
        console.log('Executing normal initialization...');
        delayBetweenCallbacks = 10;
        
        // Execute normal callbacks (marked with data-init="normal")
        executeCallbacksByAttribute('data-init', 'normal');
        
        // Execute normal original callbacks
        executeBatchOfCallbacks(getNormalCallbacks(), delayBetweenCallbacks, onComplete);
        break;
        
      case 'deferred':
        // Deferred initialization - longer delay for non-critical tasks
        console.log('Executing deferred initialization...');
        delayBetweenCallbacks = 20;
        
        // Execute deferred callbacks (marked with data-init="deferred")
        executeCallbacksByAttribute('data-init', 'deferred');
        
        // Execute remaining original callbacks
        executeBatchOfCallbacks(getDeferredCallbacks(), delayBetweenCallbacks, onComplete);
        break;
    }
  }
  
  /**
   * Execute a batch of callbacks with delays to prevent UI blocking
   * @param {Array} callbacks - Array of callbacks to execute
   * @param {number} delay - Delay between callbacks in ms
   * @param {Function} onComplete - Callback to run when all complete
   */
  function executeBatchOfCallbacks(callbacks, delay, onComplete) {
    let index = 0;
    
    function executeNext() {
      if (index >= callbacks.length) {
        // All callbacks executed
        if (onComplete) {
          onComplete();
        }
        return;
      }
      
      try {
        // Execute callback
        const callback = callbacks[index].callback;
        callback.call(document);
      } catch (error) {
        console.error('Error in initialization callback:', error);
      }
      
      // Move to next callback
      index++;
      
      // Schedule next callback with delay
      if (delay > 0) {
        setTimeout(executeNext, delay);
      } else {
        executeNext();
      }
    }
    
    // Start execution
    executeNext();
  }
  
  /**
   * Filter callbacks by criticality
   * @param {string} level - Criticality level (critical, normal, deferred)
   * @returns {Array} - Filtered callbacks
   */
  function filterCallbacksByCriticality(level) {
    return originalCallbacks.filter(item => {
      const callback = item.callback;
      
      // Check if callback has a priority marker
      if (callback.criticality === level) {
        return true;
      }
      
      // Check callback name and content for criticality hints
      const callbackString = callback.toString().toLowerCase();
      
      switch (level) {
        case 'critical':
          // Critical initialization (security, core UI, validation)
          return (
            callbackString.includes('security') ||
            callbackString.includes('validator') ||
            callbackString.includes('critical') ||
            callbackString.includes('initialize core') ||
            callbackString.includes('loading indicator')
          );
          
        case 'normal':
          // Normal initialization (form handlers, tabs)
          return (
            callbackString.includes('form') ||
            callbackString.includes('tab') ||
            callbackString.includes('setup') ||
            callbackString.includes('normal')
          );
          
        case 'deferred':
          // Everything else
          return true;
      }
      
      return false;
    });
  }
  
  /**
   * Get critical callbacks
   * @returns {Array} - Critical callbacks
   */
  function getCriticalCallbacks() {
    return filterCallbacksByCriticality('critical');
  }
  
  /**
   * Get normal callbacks
   * @returns {Array} - Normal callbacks
   */
  function getNormalCallbacks() {
    return filterCallbacksByCriticality('normal');
  }
  
  /**
   * Get deferred callbacks
   * @returns {Array} - Deferred callbacks
   */
  function getDeferredCallbacks() {
    const critical = getCriticalCallbacks();
    const normal = getNormalCallbacks();
    
    // Return callbacks not in critical or normal
    return originalCallbacks.filter(item => 
      !critical.includes(item) && !normal.includes(item)
    );
  }
  
  /**
   * Execute callbacks for script tags with specific data-init attributes
   * @param {string} attribute - Attribute name
   * @param {string} value - Attribute value
   */
  function executeCallbacksByAttribute(attribute, value) {
    const scripts = document.querySelectorAll(\`script[\${attribute}="\${value}"]\`);
    
    scripts.forEach(script => {
      try {
        // Get callback function
        const callbackName = script.getAttribute('data-callback');
        if (callbackName && window[callbackName]) {
          window[callbackName]();
        }
      } catch (error) {
        console.error(\`Error executing \${attribute}="\${value}" callback:, error\`);
      }
    });
  }
  
  /**
   * Initialize core utilities that might be needed by other initialization code
   */
  function initializeUtilities() {
    // Initialize loading indicator if available
    if (window.loadingIndicator) {
      // Already initialized
    }
    
    // Initialize security utilities if available
    if (window.inputSanitizer) {
      // Already initialized
    }
    
    // Initialize error logging if available
    if (window.errorLogger) {
      // Already initialized
    }
  }
  
  // Add utility to mark callback criticality
  window.markInitializationCriticality = function(callback, level) {
    if (typeof callback === 'function') {
      callback.criticality = level;
    }
    return callback;
  };
})();

/**
 * Mark form validation as critical initialization
 */
if (typeof window.validateForm === 'function') {
  window.validateForm = window.markInitializationCriticality(window.validateForm, 'critical');
}

/**
 * Mark XSS protection as critical initialization
 */
if (typeof window.inputSanitizer && window.inputSanitizer.setupAllForms) {
  window.inputSanitizer.setupAllForms = window.markInitializationCriticality(
    window.inputSanitizer.setupAllForms, 
    'critical'
  );
}
`;

fs.writeFileSync(initializerPath, initializerContent);
console.log('Application initializer created successfully!');

// Update index.html to include the app initializer script at the beginning
if (!indexHtml.includes('app-initializer.js')) {
  // Add as first script in head
  if (indexHtml.includes('<head>')) {
    indexHtml = indexHtml.replace('<head>', 
      '<head>\n    <script src="js/app-initializer.js"></script>');
  }
  
  fs.writeFileSync(indexHtmlPath, indexHtml);
  console.log('Added application initializer script to index.html');
}

console.log('Loading indicator implementation complete!');