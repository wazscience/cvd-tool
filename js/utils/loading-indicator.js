/**
 * Loading Indicator Utility
 * Provides functions for managing loading states throughout the application
 */
const loadingIndicator = (function() {
  // Configuration
  const config = {
    defaultDelay: 300, // ms before showing indicator
    defaultMinDuration: 500, // ms minimum time to show indicator
    defaultText: 'Loading...',
    indicatorId: 'loading-indicator',
    overlayId: 'loading-overlay',
    zIndex: 1000
  };
  
  // State tracking
  let isVisible = false;
  let showTimer = null;
  let hideTimer = null;
  let startTime = 0;
  
  /**
   * Create loading indicator elements if they don't exist
   * @private
   */
  function createElements() {
    // Check if elements already exist
    if (document.getElementById(config.indicatorId)) {
      return;
    }
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = config.overlayId;
    overlay.className = 'loading-overlay';
    
    // Create indicator
    const indicator = document.createElement('div');
    indicator.id = config.indicatorId;
    indicator.className = 'loading-indicator';
    indicator.innerHTML = `
      <div class="spinner"></div>
      <div class="loading-message">${config.defaultText}</div>
    `;
    
    // Add to DOM
    overlay.appendChild(indicator);
    document.body.appendChild(overlay);
  }
  
  /**
   * Show loading indicator
   * @param {string} message - Optional custom message to display
   * @param {Object} options - Optional configuration overrides
   * @returns {Promise} - Resolves when indicator is shown
   */
  function show(message, options = {}) {
    return new Promise(resolve => {
      // Create elements if needed
      createElements();
      
      // Get elements
      const overlay = document.getElementById(config.overlayId);
      const indicator = document.getElementById(config.indicatorId);
      const messageElement = indicator.querySelector('.loading-message');
      
      // Update message if provided
      if (message) {
        messageElement.textContent = message;
      } else {
        messageElement.textContent = config.defaultText;
      }
      
      // Clear any existing timers
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
      
      // Set delay
      const delay = options.delay !== undefined ? options.delay : config.defaultDelay;
      
      // Set show timer with delay
      showTimer = setTimeout(() => {
        // Record start time for minimum duration
        startTime = Date.now();
        
        // Show elements
        overlay.style.display = 'flex';
        indicator.style.display = 'flex';
        
        // Mark as visible
        isVisible = true;
        
        // Resolve promise
        resolve();
      }, delay);
    });
  }
  
  /**
   * Hide loading indicator
   * @param {Object} options - Optional configuration overrides
   * @returns {Promise} - Resolves when indicator is hidden
   */
  function hide(options = {}) {
    return new Promise(resolve => {
      // If not visible, resolve immediately
      if (!isVisible) {
        resolve();
        return;
      }
      
      // Get elements
      const overlay = document.getElementById(config.overlayId);
      const indicator = document.getElementById(config.indicatorId);
      
      // Clear any existing timers
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
      
      // Calculate time shown so far
      const timeShown = Date.now() - startTime;
      
      // Set minimum duration
      const minDuration = options.minDuration !== undefined ? options.minDuration : config.defaultMinDuration;
      
      // Calculate remaining time to meet minimum duration
      const remainingTime = Math.max(0, minDuration - timeShown);
      
      // Set hide timer
      hideTimer = setTimeout(() => {
        // Hide elements
        if (overlay) overlay.style.display = 'none';
        if (indicator) indicator.style.display = 'none';
        
        // Mark as hidden
        isVisible = false;
        
        // Resolve promise
        resolve();
      }, remainingTime);
    });
  }
  
  // Return public API
  return {
    show,
    hide,
    isVisible: () => isVisible
  };
})();

// Make available globally
if (typeof window !== 'undefined') {
  window.loadingIndicator = loadingIndicator;
}
