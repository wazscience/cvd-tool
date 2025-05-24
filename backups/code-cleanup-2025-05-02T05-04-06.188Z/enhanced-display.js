// Enhanced Display Module
const enhancedDisplay = (function() {
  function showError(message, type = 'error') {
    const errorDiv = document.createElement('div');
    errorDiv.className = `enhanced-error ${type}`;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  function showLoadingOverlay(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'enhanced-loading-overlay';
    overlay.innerHTML = `<div class="loading-content"><div class="spinner"></div><p>${message}</p></div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function hideLoadingOverlay(overlay) {
    if (overlay) {overlay.remove();}
  }

  return { showError, showLoadingOverlay, hideLoadingOverlay };
})();
window.enhancedDisplay = enhancedDisplay;
