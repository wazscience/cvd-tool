/**
 * Enhanced Disclaimer Module
 * Provides legal disclaimer functionality
 */

const enhancedDisclaimer = (function() {
  // Configuration
  const config = {
    initialDisclaimerKey: 'cvd_disclaimer_accepted',
    privacyDisclaimerKey: 'cvd_privacy_accepted',
    disclaimerVersion: '1.0.2',
    modalId: 'disclaimer-modal'
  };
  
  /**
   * Show initial legal disclaimers on first visit
   */
  function showInitialDisclaimers() {
    const hasAccepted = localStorage.getItem(config.initialDisclaimerKey);
    const currentVersion = localStorage.getItem('disclaimer_version');
    
    if (!hasAccepted || currentVersion !== config.disclaimerVersion) {
      showDisclaimerModal();
    }
  }
  
  /**
   * Show the disclaimer modal
   */
  function showDisclaimerModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById(config.modalId);
    if (!modal) {
      modal = createDisclaimerModal();
      document.body.appendChild(modal);
    }
    
    // Show the modal
    modal.style.display = 'block';
  }
  
  /**
   * Create disclaimer modal element
   */
  function createDisclaimerModal() {
    const modal = document.createElement('div');
    modal.id = config.modalId;
    modal.className = 'modal';
    
    modal.innerHTML = `
      <div class='modal-content'>
        <div class='modal-header'>
          <h3 class='modal-title'>Important Medical Disclaimer</h3>
        </div>
        <div class='modal-body'>
          <p><strong>Healthcare Professional Use Only:</strong> This tool is designed to support clinical decision-making by licensed healthcare professionals, not to replace it.</p>
          <p>The cardiovascular risk estimates provided are based on population-level data and may not accurately reflect the risk for every individual. Always use your clinical judgment.</p>
          <p>This application does not store any patient information. All calculations are performed within your browser.</p>
          <div class='disclaimer-checkbox'>
            <input type='checkbox' id='disclaimer-checkbox'>
            <label for='disclaimer-checkbox'>I understand and accept these terms</label>
          </div>
        </div>
        <div class='modal-footer'>
          <button type='button' id='disclaimer-accept-btn' disabled>Accept & Continue</button>
        </div>
      </div>
    `;
    
    // Add event listeners
    setTimeout(() => {
      const checkbox = document.getElementById('disclaimer-checkbox');
      const acceptBtn = document.getElementById('disclaimer-accept-btn');
      
      checkbox.addEventListener('change', function() {
        acceptBtn.disabled = !this.checked;
      });
      
      acceptBtn.addEventListener('click', function() {
        acceptDisclaimer();
        modal.style.display = 'none';
      });
    }, 100);
    
    return modal;
  }
  
  /**
   * Accept the disclaimer and save to localStorage
   */
  function acceptDisclaimer() {
    localStorage.setItem(config.initialDisclaimerKey, 'true');
    localStorage.setItem('disclaimer_version', config.disclaimerVersion);
  }
  
  // Public API
  return {
    showInitialDisclaimers,
    showDisclaimerModal
  };
})();

// Export to window
window.enhancedDisclaimer = enhancedDisclaimer;
