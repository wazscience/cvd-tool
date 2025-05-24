/**
 * Simple Loading Indicator Utility
 */
const loadingIndicator = window.loadingIndicator = window.loadingIndicator = (function() {
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
    indicator.innerHTML = `
      <div class="spinner"></div>
      <div class="loading-message">${message}</div>
    `;

    // Show indicator
    indicator.style.display = 'flex';
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {overlay.style.display = 'flex';}
  }

  /**
   * Hide loading indicator
   */
  function hide() {
    const indicator = document.getElementById(config.globalIndicatorId);
    if (indicator) {
      const overlay = document.querySelector('.loading-overlay');
      if (overlay) {overlay.style.display = 'none';}
      indicator.style.display = 'none';
    }
  }

  // Return public API
  return {
    show,
    hide
  };
})();
