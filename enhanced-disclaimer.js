  /**
   * Export compliance data as a CSV file
   * @returns {string} CSV content
   */
  function exportComplianceDataCSV() {
    if (_complianceLog.length === 0) {
      return 'No compliance data available';
    }
    
    // Get all possible keys from all events
    const allKeys = new Set();
    _complianceLog.forEach(event => {
      Object.keys(event).forEach(key => allKeys.add(key));
    });
    
    const headers = Array.from(allKeys);
    let csv = headers.join(',') + '\n';
    
    _complianceLog.forEach(event => {
      const row = headers.map(key => {
        const value = event[key];
        // Handle different types of values
        if (value === undefined || value === null) {
          return '';
        } else if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        } else {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
      });
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }  /**
   * Create disclaimer modal element with language selector
   * @returns {HTMLElement} The modal element
   */
  function createDisclaimerModal() {
    const modal = document.createElement('div');
    modal.id = config.modalId;
    modal.className = 'disclaimer-modal';
    
    // Get content based on region
    const content = getRegionalContent();
    
    // Create language selector
    const languageSelector = createLanguageSelector();
    
    modal.innerHTML = `
      <div class='modal-content'>
        <div class='modal-header'>
          <h3 class='modal-title'>${getTranslation('modalTitle') || content.title}</h3>
          ${languageSelector}
        </div>
        <div class='modal-body'>
          ${content.content}
          <div class='disclaimer-checkbox'>
            <input type='checkbox' id='disclaimer-checkbox'>
            <label for='disclaimer-checkbox'>${getTranslation('checkboxLabel')}</label>
          </div>
          <div class='disclaimer-checkbox'>
            <input type='checkbox' id='liability-checkbox'>
            <label for='liability-checkbox'>${getTranslation('liabilityLabel')}</label>
          </div>
        </div>
        <div class='modal-footer'>
          <button type='button' id='disclaimer-accept-btn' disabled>${getTranslation('acceptButton')}</button>
        </div>
      </div>
    `;
    
    // Add styles for the modal
    addModalStyles();
    
    // Add event listeners after DOM is available using MutationObserver
    const observer = new MutationObserver((mutations, obs) => {
      addDisclaimerModalEventListeners(modal);
      obs.disconnect(); // Stop observing once we've set up event listeners
    });
    
    // Start observing the modal element
    observer.observe(modal, { childList: true, subtree: true });
    
    return modal;
  }
  
  /**
   * Add event listeners to the disclaimer modal
   * @param {HTMLElement} modal - The modal element
   */
  function addDisclaimerModalEventListeners(modal) {
    const disclaimerCheckbox = document.getElementById('disclaimer-checkbox');
    const liabilityCheckbox = document.getElementById('liability-checkbox');
    const acceptBtn = document.getElementById('disclaimer-accept-btn');
    const langSelect = document.getElementById('language-select');
    
    // Check if elements exist before adding listeners
    if (!disclaimerCheckbox || !liabilityCheckbox || !acceptBtn) {
      log('error', 'Required elements not found in disclaimer modal');
      return;
    }
    
    // Enable the accept button only when both checkboxes are checked
    function updateAcceptButton() {
      acceptBtn.disabled = !(disclaimerCheckbox.checked && liabilityCheckbox.checked);
    }
    
    disclaimerCheckbox.addEventListener('change', updateAcceptButton);
    liabilityCheckbox.addEventListener('change', updateAcceptButton);
    
    if (langSelect) {
      langSelect.addEventListener('change', async function() {
        const newLanguage = this.value;
        _currentLanguage = newLanguage;
        setStorageItem(config.languageKey, newLanguage);
        
        // Load translations if needed
        if (!config.translations[newLanguage]) {
          try {
            await loadTranslationsWithTimeout(newLanguage);
          } catch (error) {
            log('error', `Failed to load translations: ${error.message}`);
          }
        }
        
        // Recreate the modal with new language
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
        showDisclaimerModal();
      });
    }
    
    acceptBtn.addEventListener('click', function() {
      acceptDisclaimer();
      closeModal(modal);
      
      // If in EU, show data processing notice
      if (_currentRegion === 'eu' && !_hasAcceptedDataProcessing) {
        showDataProcessingModal();
      }
    });
  }  /**
   * Log compliance events
   * @param {string} event - The event name
   * @param {Object} data - Event data
   */
  function logComplianceEvent(event, data = {}) {
    if (!config.complianceReportingEnabled) return;
    
    const eventData = {
      event,
      timestamp: new Date().toISOString(),
      region: _currentRegion,
      language: _currentLanguage,
      version: config.disclaimerVersion,
      ...data
    };
    
    // Remove PII if anonymized reporting is enabled
    if (config.anonymizedReporting) {
      // Remove any potentially identifying information
      delete eventData.ip;
      delete eventData.user_id;
      delete eventData.email;
      // Add other PII fields to remove as needed
    }
    
    // Add to log
    _complianceLog.push(eventData);
    
    // Save to storage
    try {
      setStorageItem(config.complianceLogKey, JSON.stringify(_complianceLog));
    } catch (error) {
      log('error', `Error saving compliance log: ${error.message}`);
    }
    
    // Send to server if batch size exceeds threshold or immediate reporting is needed
    if (event === 'disclaimer_accepted' || event === 'data_processing_accepted' || _complianceLog.length >= 10) {
      sendComplianceReport();
    }
  }
  
  /**
   * Send compliance report to server
   * @returns {Promise<void>}
   */
  async function sendComplianceReport() {
    if (!config.complianceReportingEnabled || _complianceLog.length === 0) return;
    
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(config.complianceEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events: _complianceLog,
          timestamp: new Date().toISOString(),
          version: config.disclaimerVersion
        }),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Clear log after successful submission
        _complianceLog = [];
        setStorageItem(config.complianceLogKey, '[]');
        log('info', 'Compliance report sent successfully');
        return true;
      } else {
        log('error', `Error sending compliance report: ${response.status}`);
        return false;
      }
    } catch (error) {
      log('error', `Error sending compliance report: ${error.message}`);
      // Keep the log for retry
      return false;
    }
  }
  
  /**
   * Get compliance report for download or audit
   * @returns {Object} Compliance report
   */
  function getComplianceReport() {
    return {
      events: _complianceLog,
      timestamp: new Date().toISOString(),
      version: config.disclaimerVersion,
      region: _currentRegion,
      language: _currentLanguage
    };
  }
  
  /**
   * Normalized logging function
   * @param {string} level - Log level ('error', 'warn', 'info', 'debug')
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  function log(level, message, data = {}) {
    if (!config.enableLogging) return;
    
    // Check if log level is high enough
    const levels = {
      'error': 3,
      'warn': 2,
      'info': 1,
      'debug': 0
    };
    
    if (levels[level] < levels[config.logLevel]) return;
    
    const logData = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    switch (level) {
      case 'error':
        console.error(message, logData);
        break;
      case 'warn':
        console.warn(message, logData);
        break;
      case 'info':
        console.info(message, logData);
        break;
      case 'debug':
        console.debug(message, logData);
        break;
      default:
        console.log(message, logData);
    }
  }  /**
   * Add styles for the modal
   */
  function addModalStyles() {
    if (!document.getElementById('disclaimer-styles')) {
      const style = document.createElement('style');
      style.id = 'disclaimer-styles';
      style.innerHTML = `
        .disclaimer-modal {
          display: none;
          position: fixed;
          z-index: 9999;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.6);
          overflow: auto;
          backdrop-filter: blur(3px);
        }
        
        .modal-content {
          background-color: #fff;
          margin: 10% auto;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          width: 80%;
          max-width: 700px;
          max-height: 80vh;
          overflow-y: auto;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity ${config.animationDuration}ms ease, transform ${config.animationDuration}ms ease;
        }
        
        .modal-header {
          border-bottom: 1px solid #eee;
          padding-bottom: 15px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .modal-title {
          margin: 0;
          color: #333;
          font-size: 20px;
        }
        
        .language-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .language-selector select {
          padding: 5px;
          border-radius: 4px;
          border: 1px solid #ccc;
        }
        
        .modal-body {
          margin-bottom: 20px;
        }
        
        .modal-body p {
          margin-bottom: 15px;
          line-height: 1.5;
        }
        
        .disclaimer-checkbox {
          margin: 20px 0;
        }
        
        .modal-footer {
          padding-top: 15px;
          border/**
 * Enhanced Comprehensive Medical Disclaimer Module
 * Provides robust legal disclaimer functionality for healthcare applications
 * Compliant with Canadian, American, European, and international legal requirements
 * Features robust geolocation, compliance reporting, and multilingual support
 * Version: 3.0.0
 */

const enhancedDisclaimer = (function() {
  // Configuration
  const config = {
    // Storage keys
    initialDisclaimerKey: 'cvd_disclaimer_accepted',
    privacyDisclaimerKey: 'cvd_privacy_accepted',
    dataProcessingKey: 'cvd_data_processing_accepted',
    regionalConsentKey: 'cvd_regional_consent',
    languageKey: 'cvd_language',
    complianceLogKey: 'cvd_compliance_log',
    
    // Versioning
    disclaimerVersion: '3.0.0',
    
    // DOM elements
    modalId: 'disclaimer-modal',
    privacyModalId: 'privacy-modal',
    dataProcessingModalId: 'data-processing-modal',
    languageSelectorId: 'language-selector-modal',
    
    // UI configuration
    animationDuration: 300,
    autoHideDuration: 0, // 0 means it will not auto-hide
    
    // Regional settings
    region: 'auto', // 'auto', 'us', 'canada', 'eu', 'uk', 'australia', 'japan', etc.
    language: 'auto', // 'auto', 'en', 'fr', 'es', 'de', etc.
    
    // Geolocation
    geoApiUrl: 'https://api.ipgeolocation.io/ipgeo', // Example service, replace with your preferred provider
    geoApiKey: '', // Your API key
    geoApiTimeout: 3000, // Timeout in milliseconds
    geoApiRetries: 2, // Number of retries if geolocation fails
    fallbackToNavigator: true, // Whether to use navigator.geolocation as fallback
    
    // Compliance reporting
    complianceEndpoint: '/api/compliance/report', // Endpoint for sending compliance reports
    complianceReportingEnabled: false, // Whether to send compliance reports
    anonymizedReporting: true, // Whether to anonymize data in compliance reports
    
    // Logging
    enableLogging: false,
    logLevel: 'error', // 'error', 'warn', 'info', 'debug'
    
    // Persistence options
    storageType: 'localStorage', // 'localStorage', 'sessionStorage', 'cookie'
    cookieExpiryDays: 365,
    
    // Internationalization
    supportedLanguages: ['en', 'fr', 'es', 'de', 'it', 'zh', 'ja', 'ru', 'ar'],
    defaultLanguage: 'en',
    translationEndpoint: '/api/translations', // Endpoint for loading translations
    translations: {
      en: {
        modalTitle: 'Important Medical Disclaimer',
        acceptButton: 'Accept & Continue',
        checkboxLabel: 'I understand and accept these terms',
        liabilityLabel: 'I acknowledge that the creators of this tool are not liable for any consequences resulting from its use',
        languageSelector: 'Language'
        // Other translations would be here
      },
      fr: {
        modalTitle: 'Avis Médical Important',
        acceptButton: 'Accepter et Continuer',
        checkboxLabel: 'Je comprends et j\'accepte ces termes',
        liabilityLabel: 'Je reconnais que les créateurs de cet outil ne sont pas responsables des conséquences résultant de son utilisation',
        languageSelector: 'Langue'
        // Other translations would be here
      },
      es: {
        modalTitle: 'Aviso Médico Importante',
        acceptButton: 'Aceptar y Continuar',
        checkboxLabel: 'Entiendo y acepto estos términos',
        liabilityLabel: 'Reconozco que los creadores de esta herramienta no son responsables de las consecuencias derivadas de su uso',
        languageSelector: 'Idioma'
        // Other translations would be here
      },
      // Additional languages would follow the same pattern
    },
    
    // Content configuration
    disclaimerTextByRegion: {
      us: {
        title: 'Important Medical Disclaimer & HIPAA Notice',
        content: `
          <p><strong>Healthcare Professional Use Only:</strong> This tool is designed to support clinical decision-making by licensed healthcare professionals, not to replace it.</p>
          <p>The information and tools provided through this application are not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare provider with any questions regarding a medical condition.</p>
          <p><strong>HIPAA Compliance Notice:</strong> This application is designed with privacy and security safeguards aligned with HIPAA requirements. However, no electronic transmission or storage is 100% secure.</p>
          <p>This application does not store any patient information on our servers. All calculations are performed within your browser.</p>
          <p>By accessing this application, you agree to maintain the confidentiality of any protected health information (PHI) you input or view, in accordance with HIPAA regulations.</p>
          <p>The estimates and calculations provided are based on population-level data and may not accurately reflect individual patient risks. Use your professional clinical judgment when interpreting results.</p>
        `
      },
      canada: {
        title: 'Important Medical Disclaimer & Privacy Notice',
        content: `
          <p><strong>Healthcare Professional Use Only:</strong> This tool is designed to support clinical decision-making by licensed healthcare professionals, not to replace it.</p>
          <p>The information and tools provided are in accordance with Health Canada guidelines but are not a substitute for professional medical advice, diagnosis, or treatment.</p>
          <p>This application does not store patient information. All calculations are performed within your browser in compliance with Canadian privacy laws.</p>
          <p>The cardiovascular risk estimates provided are based on population-level data and may not accurately reflect the risk for every individual. Always use your clinical judgment when interpreting results.</p>
          <p>The creators of this application make no representations or warranties about the accuracy, reliability, completeness, or timeliness of the content.</p>
        `
      },
      eu: {
        title: 'Important Medical Disclaimer & GDPR Notice',
        content: `
          <p><strong>Healthcare Professional Use Only:</strong> This tool is designed to support clinical decision-making by licensed healthcare professionals, not to replace it.</p>
          <p>The information and tools provided through this application are not a substitute for professional medical advice, diagnosis, or treatment.</p>
          <p><strong>GDPR Compliance:</strong> This application is designed with privacy by design principles. No personal data or patient information is collected, stored, or processed on our servers.</p>
          <p>All calculations are performed locally within your browser. As a data controller for any information you input, you are responsible for compliance with applicable data protection regulations.</p>
          <p>The cardiovascular risk estimates provided are based on population-level data and may not accurately reflect the risk for every individual. Always use your clinical judgment.</p>
          <p>This tool is not intended to be a medical device as defined under European Medical Device Regulations unless explicitly stated otherwise.</p>
        `
      },
      default: {
        title: 'Important Medical Disclaimer',
        content: `
          <p><strong>Healthcare Professional Use Only:</strong> This tool is designed to support clinical decision-making by licensed healthcare professionals, not to replace it.</p>
          <p>The cardiovascular risk estimates provided are based on population-level data and may not accurately reflect the risk for every individual. Always use your clinical judgment.</p>
          <p>This application does not store any patient information. All calculations are performed within your browser.</p>
          <p>This tool does not constitute medical advice and is not intended to diagnose, treat, cure, or prevent any disease or health condition.</p>
        `
      }
    }
  };
  
  // Private variables
  let _currentRegion = config.region;
  let _currentLanguage = config.language;
  let _hasAcceptedDisclaimer = false;
  let _hasAcceptedPrivacy = false;
  let _hasAcceptedDataProcessing = false;
  let _translationsLoaded = false;
  let _geolocationAttempted = false;
  let _complianceLog = [];
  
  /**
   * Check if a specific disclaimer has been accepted
   * @param {string} key - Storage key for the disclaimer
   * @returns {boolean} Whether the disclaimer has been accepted
   */
  function checkAcceptanceStatus(key) {
    const hasAccepted = getStorageItem(key);
    const currentVersion = getStorageItem('disclaimer_version');
    
    // If not accepted or version has changed, consider it not accepted
    return hasAccepted && currentVersion === config.disclaimerVersion;
  }
  
  /**
   * Get an item from storage based on config.storageType
   * @param {string} key - The storage key
   * @returns {string|null} The stored value or null
   */
  function getStorageItem(key) {
    try {
      switch (config.storageType) {
        case 'localStorage':
          return localStorage.getItem(key);
        case 'sessionStorage':
          return sessionStorage.getItem(key);
        case 'cookie':
          return getCookie(key);
        default:
          return localStorage.getItem(key);
      }
    } catch (error) {
      log('error', `Error getting storage item: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Set an item in storage based on config.storageType
   * @param {string} key - The storage key
   * @param {string} value - The value to store
   */
  function setStorageItem(key, value) {
    try {
      switch (config.storageType) {
        case 'localStorage':
          localStorage.setItem(key, value);
          break;
        case 'sessionStorage':
          sessionStorage.setItem(key, value);
          break;
        case 'cookie':
          setCookie(key, value, config.cookieExpiryDays);
          break;
        default:
          localStorage.setItem(key, value);
      }
    } catch (error) {
      log('error', `Error setting storage item: ${error.message}`);
    }
  }
  
  /**
   * Get a cookie value
   * @param {string} name - The cookie name
   * @returns {string|null} The cookie value or null
   */
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  }
  
  /**
   * Set a cookie
   * @param {string} name - The cookie name
   * @param {string} value - The cookie value
   * @param {number} days - Number of days until expiry
   */
  function setCookie(name, value, days) {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
  }
  
  /**
   * Close a modal element
   * @param {HTMLElement} modal - The modal to close
   */
  function closeModal(modal) {
    if (!modal) return;
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.style.opacity = '0';
      modalContent.style.transform = 'translateY(20px)';
    
      setTimeout(() => {
        modal.style.display = 'none';
      }, config.animationDuration);
    } else {
      modal.style.display = 'none';
    }
  }
  
  /**
   * Get content for the current region
   * @returns {Object} The title and content for the current region
   */
  function getRegionalContent() {
    const regionContent = config.disclaimerTextByRegion[_currentRegion] || config.disclaimerTextByRegion.default;
    
    // If we have translations, override the title with the translated version
    if (config.translations[_currentLanguage] && config.translations[_currentLanguage].modalTitle) {
      regionContent.title = config.translations[_currentLanguage].modalTitle;
    }
    
    return regionContent;
  }
  
  /**
   * Detect user's region using IP geolocation API
   * @returns {Promise<string>} Region code ('us', 'canada', 'eu', etc.)
   */
  async function detectRegionViaIP() {
    if (!config.geoApiKey || _geolocationAttempted) {
      return detectRegionViaNavigator();
    }
    
    _geolocationAttempted = true;
    
    try {
      const url = `${config.geoApiUrl}?apiKey=${config.geoApiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.geoApiTimeout);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Geolocation API error: ${response.status}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error(`Geolocation API returned invalid JSON: ${jsonError.message}`);
      }
      
      // Validate the response data
      if (!data || !data.country_code2) {
        throw new Error('Geolocation API returned invalid data format');
      }
      
      // Log the geolocation in compliance records
      logComplianceEvent('geolocation_success', {
        method: 'ip_api',
        country_code: data.country_code2,
        anonymized: config.anonymizedReporting
      });
      
      // Map country code to region
      return mapCountryToRegion(data.country_code2);
    } catch (error) {
      log('error', `Error detecting region via IP: ${error.message}`);
      
      // Log the geolocation failure
      logComplianceEvent('geolocation_failure', {
        method: 'ip_api',
        error: error.message,
        anonymized: config.anonymizedReporting
      });
      
      // Implement retry logic if configured
      if (config.geoApiRetries > 0) {
        config.geoApiRetries--;
        log('info', `Retrying geolocation, ${config.geoApiRetries} attempts remaining`);
        return detectRegionViaIP();
      }
      
      // Fall back to browser language detection
      return detectRegionViaNavigator();
    }
  }
  
  /**
   * Map country code to region for legal purposes
   * @param {string} countryCode - ISO 3166-1 alpha-2 country code
   * @returns {string} Region code ('us', 'canada', 'eu', etc.)
   */
  function mapCountryToRegion(countryCode) {
    // Validate input
    if (!countryCode || typeof countryCode !== 'string') {
      log('warn', `Invalid country code provided: ${countryCode}`);
      return 'default';
    }
    
    // Convert to uppercase for consistency
    countryCode = countryCode.toUpperCase();
    
    // Map country codes to regions
    const regionMap = {
      // North America
      'US': 'us',
      'CA': 'canada',
      
      // European Union members
      'AT': 'eu', 'BE': 'eu', 'BG': 'eu', 'HR': 'eu', 'CY': 'eu',
      'CZ': 'eu', 'DK': 'eu', 'EE': 'eu', 'FI': 'eu', 'FR': 'eu',
      'DE': 'eu', 'GR': 'eu', 'HU': 'eu', 'IE': 'eu', 'IT': 'eu',
      'LV': 'eu', 'LT': 'eu', 'LU': 'eu', 'MT': 'eu', 'NL': 'eu',
      'PL': 'eu', 'PT': 'eu', 'RO': 'eu', 'SK': 'eu', 'SI': 'eu',
      'ES': 'eu', 'SE': 'eu',
      
      // United Kingdom (post-Brexit)
      'GB': 'uk',
      
      // Australia and New Zealand
      'AU': 'australia',
      'NZ': 'australia', // Similar legal framework
      
      // Asia
      'JP': 'japan',
      'KR': 'korea',
      'CN': 'china',
      'IN': 'india',
      
      // Other regions can be added as needed
    };
    
    return regionMap[countryCode] || 'default';
  }
  
  /**
   * Detect user's region based on browser locale
   * @returns {string} Region code ('us', 'canada', 'eu', or 'default')
   */
  function detectRegionViaNavigator() {
    // Simple detection based on browser language
    const language = navigator.language || navigator.userLanguage;
    
    if (language) {
      const lang = language.toLowerCase();
      let detectedRegion = 'default';
      
      // Map language to region
      if (lang === 'en-us') detectedRegion = 'us';
      else if (lang === 'en-ca' || lang === 'fr-ca') detectedRegion = 'canada';
      else if (lang.startsWith('en-gb')) detectedRegion = 'uk';
      else if (lang.startsWith('en-au')) detectedRegion = 'australia';
      else if (lang.startsWith('ja')) detectedRegion = 'japan';
      else if (lang.startsWith('zh')) detectedRegion = 'china';
      else if (lang.startsWith('ko')) detectedRegion = 'korea';
      else if (lang.startsWith('hi')) detectedRegion = 'india';
      // European languages
      else if (lang.startsWith('de') || lang.startsWith('fr') || 
          lang.startsWith('es') || lang.startsWith('it') || 
          lang.startsWith('nl') || lang.startsWith('pt') || 
          lang.startsWith('sv') || lang.startsWith('da') || 
          lang.startsWith('fi') || lang.startsWith('el') || 
          lang.startsWith('pl') || lang.startsWith('hu')) {
        detectedRegion = 'eu';
      }
      
      // Log the geolocation using navigator
      logComplianceEvent('geolocation_success', {
        method: 'navigator_language',
        language: language,
        detected_region: detectedRegion,
        anonymized: config.anonymizedReporting
      });
      
      return detectedRegion;
    }
    
    return 'default';
  }
  
  /**
   * Detect user's preferred language
   * @returns {string} Language code ('en', 'fr', etc.)
   */
  function detectLanguage() {
    const language = navigator.language || navigator.userLanguage || 'en';
    const baseLang = language.split('-')[0].toLowerCase();
    
    // Check if the language is supported
    if (config.supportedLanguages.includes(baseLang)) {
      return baseLang;
    }
    
    return config.defaultLanguage;
  }
  
  /**
   * Initialize the disclaimer module
   * @param {Object} options - Custom configuration options
   * @returns {Promise<void>}
   */
  async function init(options = {}) {
    // Override default config with custom options using deep merge
    deepMerge(config, options);
    
    // Load saved compliance log if reporting is enabled
    if (config.complianceReportingEnabled) {
      const savedLog = getStorageItem(config.complianceLogKey);
      if (savedLog) {
        try {
          _complianceLog = JSON.parse(savedLog);
        } catch (error) {
          log('error', `Error parsing compliance log: ${error.message}`);
          _complianceLog = [];
        }
      }
    }
    
    // Log initialization
    logComplianceEvent('module_initialization', {
      version: config.disclaimerVersion,
      timestamp: new Date().toISOString(),
      anonymized: config.anonymizedReporting
    });
    
    // Detect language if set to auto
    if (config.language === 'auto') {
      _currentLanguage = detectLanguage();
    } else {
      _currentLanguage = config.language;
    }
    
    // Load translations if necessary
    if (_currentLanguage !== 'en') {
      try {
        await loadTranslationsWithTimeout(_currentLanguage);
      } catch (error) {
        log('error', `Failed to load translations: ${error.message}`);
        _currentLanguage = 'en'; // Fall back to English
      }
    }
    
    // Detect region if set to auto
    if (config.region === 'auto') {
      _currentRegion = await detectRegionViaIP();
    } else {
      _currentRegion = config.region;
    }
    
    // Check if user has already accepted disclaimers
    _hasAcceptedDisclaimer = checkAcceptanceStatus(config.initialDisclaimerKey);
    _hasAcceptedPrivacy = checkAcceptanceStatus(config.privacyDisclaimerKey);
    _hasAcceptedDataProcessing = checkAcceptanceStatus(config.dataProcessingKey);
    
    // Log initialization if logging is enabled
    log('info', 'Enhanced Disclaimer Module initialized', {
      region: _currentRegion,
      language: _currentLanguage,
      disclaimerAccepted: _hasAcceptedDisclaimer,
      privacyAccepted: _hasAcceptedPrivacy,
      dataProcessingAccepted: _hasAcceptedDataProcessing
    });
    
    // Show initial disclaimers if they haven't been accepted
    if (!_hasAcceptedDisclaimer) {
      showInitialDisclaimers();
    }
  }
  
  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object to merge into target
   * @returns {Object} The merged object
   */
  function deepMerge(target, source) {
    // Handle edge cases
    if (!source) return target;
    if (!target) return source;
    
    // Iterate through source properties
    Object.keys(source).forEach(key => {
      if (
        source[key] && 
        typeof source[key] === 'object' && 
        target[key] && 
        typeof target[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        // Recursively merge objects
        deepMerge(target[key], source[key]);
      } else if (source[key] !== undefined) {
        // Replace or add primitive values or arrays
        target[key] = source[key];
      }
    });
    
    return target;
  }
  
  /**
   * Load translations for a specific language with timeout
   * @param {string} language - Language code ('fr', 'es', etc.)
   * @param {number} [timeout=5000] - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async function loadTranslationsWithTimeout(language, timeout = 5000) {
    // If translations are already included in the config, use those
    if (config.translations[language]) {
      _translationsLoaded = true;
      return;
    }
    
    return Promise.race([
      loadTranslations(language),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Translation loading timed out')), timeout)
      )
    ]);
  }
  
  /**
   * Load translations for a specific language
   * @param {string} language - Language code ('fr', 'es', etc.)
   * @returns {Promise<void>}
   */
  async function loadTranslations(language) {
    try {
      // Attempt to load translations from the server
      const response = await fetch(`${config.translationEndpoint}/${language}`);
      if (!response.ok) {
        throw new Error(`Translation API returned ${response.status}`);
      }
      
      const translations = await response.json();
      config.translations[language] = translations;
      _translationsLoaded = true;
      
      log('info', `Translations loaded for ${language}`);
    } catch (error) {
      log('error', `Error loading translations: ${error.message}`);
      // Fall back to English
      _currentLanguage = 'en';
      throw error; // Re-throw to be handled by caller
    }
  }
  
  /**
   * Get a translated string
   * @param {string} key - The translation key
   * @returns {string} Translated string or the key if not found
   */
  function getTranslation(key) {
    const translations = config.translations[_currentLanguage] || config.translations.en;
    return translations[key] || key;
  }
  
  /**
   * Check if a specific disclaimer has been accepted
   * @param {string} key - Storage key for the disclaimer
   * @returns {boolean} Whether the disclaimer has been accepted
   */
  function checkAcceptanceStatus(key) {
    const hasAccepted = getStorageItem(key);
    const currentVersion = getStorageItem('disclaimer_version');
    
    // If not accepted or version has changed, consider it not accepted
    return hasAccepted && currentVersion === config.disclaimerVersion;
  }
  
  /**
   * Show initial legal disclaimers on first visit or when version changes
   */
  function showInitialDisclaimers() {
    log('info', 'Showing initial disclaimers');
    
    // Log the event
    logComplianceEvent('disclaimer_shown', {
      version: config.disclaimerVersion,
      region: _currentRegion,
      language: _currentLanguage,
      timestamp: new Date().toISOString(),
      anonymized: config.anonymizedReporting
    });
    
    showDisclaimerModal();
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
    setTimeout(() => {
      modal.querySelector('.modal-content').style.opacity = '1';
      modal.querySelector('.modal-content').style.transform = 'translateY(0)';
    }, 10);
  }
  
  /**
   * Create disclaimer modal element with language selector
   * @returns {HTMLElement} The modal element
   */
  function createDisclaimerModal() {
    const modal = document.createElement('div');
    modal.id = config.modalId;
    modal.className = 'disclaimer-modal';
    
    // Get content based on region
    const content = getRegionalContent();
    
    // Create language selector
    const languageSelector = createLanguageSelector();
    
    modal.innerHTML = `
      <div class='modal-content'>
        <div class='modal-header'>
          <h3 class='modal-title'>${getTranslation('modalTitle') || content.title}</h3>
          ${languageSelector}
        </div>
        <div class='modal-body'>
          ${content.content}
          <div class='disclaimer-checkbox'>
            <input type='checkbox' id='disclaimer-checkbox'>
            <label for='disclaimer-checkbox'>${getTranslation('checkboxLabel')}</label>
          </div>
          <div class='disclaimer-checkbox'>
            <input type='checkbox' id='liability-checkbox'>
            <label for='liability-checkbox'>${getTranslation('liabilityLabel')}</label>
          </div>
        </div>
        <div class='modal-footer'>
          <button type='button' id='disclaimer-accept-btn' disabled>${getTranslation('acceptButton')}</button>
        </div>
      </div>
    `;
    
    // Add styles for the modal
    addModalStyles();
    
    // Add event listeners
    setTimeout(() => {
      const disclaimerCheckbox = document.getElementById('disclaimer-checkbox');
      const liabilityCheckbox = document.getElementById('liability-checkbox');
      const acceptBtn = document.getElementById('disclaimer-accept-btn');
      const langSelect = document.getElementById('language-select');
      
      // Enable the accept button only when both checkboxes are checked
      function updateAcceptButton() {
        acceptBtn.disabled = !(disclaimerCheckbox.checked && liabilityCheckbox.checked);
      }
      
      disclaimerCheckbox.addEventListener('change', updateAcceptButton);
      liabilityCheckbox.addEventListener('change', updateAcceptButton);
      
      if (langSelect) {
        langSelect.addEventListener('change', async function() {
          const newLanguage = this.value;
          _currentLanguage = newLanguage;
          setStorageItem(config.languageKey, newLanguage);
          
          // Load translations if needed
          if (!config.translations[newLanguage]) {
            await loadTranslations(newLanguage);
          }
          
          // Recreate the modal with new language
          document.body.removeChild(modal);
          showDisclaimerModal();
        });
      }
      
      acceptBtn.addEventListener('click', function() {
        acceptDisclaimer();
        closeModal(modal);
        
        // If in EU, show data processing notice
        if (_currentRegion === 'eu' && !_hasAcceptedDataProcessing) {
          showDataProcessingModal();
        }
      });
    }, 100);
    
    return modal;
  }
  
  /**
   * Create language selector dropdown
   * @returns {string} HTML string for language selector
   */
  function createLanguageSelector() {
    if (config.supportedLanguages.length <= 1) {
      return '';
    }
    
    let options = '';
    config.supportedLanguages.forEach(lang => {
      const langName = getLanguageName(lang);
      const selected = lang === _currentLanguage ? 'selected' : '';
      options += `<option value="${lang}" ${selected}>${langName}</option>`;
    });
    
    return `
      <div class="language-selector">
        <label for="language-select">${getTranslation('languageSelector')}:</label>
        <select id="language-select">
          ${options}
        </select>
      </div>
    `;
  }
  
  /**
   * Get language name from code
   * @param {string} langCode - The language code ('en', 'fr', etc.)
   * @returns {string} The language name
   */
  function getLanguageName(langCode) {
    const languageNames = {
      'en': 'English',
      'fr': 'Français',
      'es': 'Español',
      'de': 'Deutsch',
      'it': 'Italiano',
      'zh': '中文',
      'ja': '日本語',
      'ru': 'Русский',
      'ar': 'العربية'
    };
    
    return languageNames[langCode] || langCode;
  }
  
  /**
   * Get content for the current region
   * @returns {Object} The title and content for the current region
   */
  function getRegionalContent() {
    return config.disclaimerTextByRegion[_currentRegion] || config.disclaimerTextByRegion.default;
  }
  
  /**
   * Add styles for the modal
   */
  function addModalStyles() {
    if (!document.getElementById('disclaimer-styles')) {
      const style = document.createElement('style');
      style.id = 'disclaimer-styles';
      style.innerHTML = `
        .disclaimer-modal {
          display: none;
          position: fixed;
          z-index: 9999;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.6);
          overflow: auto;
          backdrop-filter: blur(3px);
        }
        
        .modal-content {
          background-color: #fff;
          margin: 10% auto;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          width: 80%;
          max-width: 700px;
          max-height: 80vh;
          overflow-y: auto;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity ${config.animationDuration}ms ease, transform ${config.animationDuration}ms ease;
        }
        
        .modal-header {
          border-bottom: 1px solid #eee;
          padding-bottom: 15px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .modal-title {
          margin: 0;
          color: #333;
          font-size: 20px;
        }
        
        .language-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .language-selector select {
          padding: 5px;
          border-radius: 4px;
          border: 1px solid #ccc;
        }
        
        .modal-body {
          margin-bottom: 20px;
        }
        
        .modal-body p {
          margin-bottom: 15px;
          line-height: 1.5;
        }
        
        .disclaimer-checkbox {
          margin: 20px 0;
        }
        
        .modal-footer {
          padding-top: 15px;
          border-top: 1px solid #eee;
          text-align: right;
        }
        
        .modal-footer button {
          padding: 10px 20px;
          background-color: #4285f4;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.2s;
        }
        
        .modal-footer button:hover:not([disabled]) {
          background-color: #3367d6;
        }
        
        .modal-footer button[disabled] {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        /* RTL support for languages like Arabic */
        [dir="rtl"] .modal-content {
          text-align: right;
        }
        
        [dir="rtl"] .modal-footer {
          text-align: left;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          .modal-content {
            width: 95%;
            margin: 5% auto;
            padding: 15px;
          }
          
          .modal-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .language-selector {
            margin-top: 10px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Show the data processing modal (GDPR specific)
   */
  function showDataProcessingModal() {
    let modal = document.getElementById(config.dataProcessingModalId);
    if (!modal) {
      modal = createDataProcessingModal();
      document.body.appendChild(modal);
    }
    
    // Show the modal
    modal.style.display = 'block';
    setTimeout(() => {
      modal.querySelector('.modal-content').style.opacity = '1';
      modal.querySelector('.modal-content').style.transform = 'translateY(0)';
    }, 10);
    
    // Log the event
    logComplianceEvent('data_processing_notice_shown', {
      timestamp: new Date().toISOString(),
      anonymized: config.anonymizedReporting
    });
  }
  
  /**
   * Create data processing modal element (GDPR specific)
   * @returns {HTMLElement} The modal element
   */
  function createDataProcessingModal() {
    const modal = document.createElement('div');
    modal.id = config.dataProcessingModalId;
    modal.className = 'disclaimer-modal';
    
    // Get translations
    const title = getTranslation('dataProcessingTitle') || 'GDPR Data Processing Notice';
    const acceptButton = getTranslation('acceptButton') || 'Accept & Continue';
    const checkboxLabel = getTranslation('dataProcessingCheckboxLabel') || 
      'I understand my responsibilities under GDPR when using this application';
    
    // Complete set of translation keys for GDPR modal
    const dataProcessingIntro = getTranslation('dataProcessingIntro') || 
      'Under the General Data Protection Regulation (GDPR), we want to inform you about how this application handles data:';
    const dataProcessingPoint1 = getTranslation('dataProcessingPoint1') || 
      'This application processes all data locally in your browser.';
    const dataProcessingPoint2 = getTranslation('dataProcessingPoint2') || 
      'No personal data is transmitted to our servers or stored persistently unless explicitly stated.';
    const dataProcessingPoint3 = getTranslation('dataProcessingPoint3') || 
      'As a healthcare professional, you are considered a data controller for any patient data you input.';
    const dataProcessingPoint4 = getTranslation('dataProcessingPoint4') || 
      'You have the responsibility to ensure you have appropriate legal basis to process any patient data.';
    const dataProcessingPoint5 = getTranslation('dataProcessingPoint5') || 
      'The application includes technical measures to protect data confidentiality and integrity.';
    const dataProcessingPoint6 = getTranslation('dataProcessingPoint6') || 
      'In the event you discover a data breach related to your use of this application, you are obligated to report it to relevant authorities within 72 hours.';
    
    modal.innerHTML = `
      <div class='modal-content'>
        <div class='modal-header'>
          <h3 class='modal-title'>${title}</h3>
        </div>
        <div class='modal-body'>
          <p>${dataProcessingIntro}</p>
          <ol>
            <li>${dataProcessingPoint1}</li>
            <li>${dataProcessingPoint2}</li>
            <li>${dataProcessingPoint3}</li>
            <li>${dataProcessingPoint4}</li>
            <li>${dataProcessingPoint5}</li>
            <li>${dataProcessingPoint6}</li>
          </ol>
          <div class='disclaimer-checkbox'>
            <input type='checkbox' id='data-processing-checkbox'>
            <label for='data-processing-checkbox'>${checkboxLabel}</label>
          </div>
        </div>
        <div class='modal-footer'>
          <button type='button' id='data-processing-accept-btn' disabled>${acceptButton}</button>
        </div>
      </div>
    `;
    
    // Add event listeners after DOM is available using MutationObserver
    const observer = new MutationObserver((mutations, obs) => {
      addDataProcessingModalEventListeners(modal);
      obs.disconnect(); // Stop observing once we've set up event listeners
    });
    
    // Start observing the modal element
    observer.observe(modal, { childList: true, subtree: true });
    
    return modal;
  }
  
  /**
   * Add event listeners to the data processing modal
   * @param {HTMLElement} modal - The modal element
   */
  function addDataProcessingModalEventListeners(modal) {
    const checkbox = document.getElementById('data-processing-checkbox');
    const acceptBtn = document.getElementById('data-processing-accept-btn');
    
    // Check if elements exist before adding listeners
    if (!checkbox || !acceptBtn) {
      log('error', 'Required elements not found in data processing modal');
      return;
    }
    
    checkbox.addEventListener('change', function() {
      acceptBtn.disabled = !this.checked;
    });
    
    acceptBtn.addEventListener('click', function() {
      acceptDataProcessingTerms();
      closeModal(modal);
    });
  }
  
  /**
   * Close a modal element
   * @param {HTMLElement} modal - The modal to close
   */
  function closeModal(modal) {
    if (!modal) return;
    
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.opacity = '0';
    modalContent.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      modal.style.display = 'none';
    }, config.animationDuration);
  }
  
  /**
   * Accept the main disclaimer and save to storage
   */
  function acceptDisclaimer() {
    _hasAcceptedDisclaimer = true;
    setStorageItem(config.initialDisclaimerKey, 'true');
    setStorageItem('disclaimer_version', config.disclaimerVersion);
    
    // Log the acceptance for compliance reporting
    logComplianceEvent('disclaimer_accepted', {
      version: config.disclaimerVersion,
      timestamp: new Date().toISOString(),
      anonymized: config.anonymizedReporting
    });
    
    log('info', 'Disclaimer accepted');
  }
  
  /**
   * Accept the data processing terms (GDPR specific)
   */
  function acceptDataProcessingTerms() {
    _hasAcceptedDataProcessing = true;
    setStorageItem(config.dataProcessingKey, 'true');
    
    // Log the acceptance for compliance reporting
    logComplianceEvent('data_processing_accepted', {
      version: config.disclaimerVersion,
      timestamp: new Date().toISOString(),
      anonymized: config.anonymizedReporting
    });
    
    log('info', 'Data processing terms accepted');
  }
  
  /**
   * Download compliance data as a CSV file
   */
  function downloadComplianceDataCSV() {
    const csv = exportComplianceDataCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `compliance-report-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up by revoking the object URL
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }
  
  /**
   * Generate a compliance report PDF
   * @returns {Promise<Blob>} PDF document as a Blob
   */
  async function generateComplianceReportPDF() {
    // Dynamically load the jsPDF library
    try {
      // Check if jsPDF is already loaded
      if (typeof jsPDF === 'undefined') {
        // Create a script element to load jsPDF
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.async = true;
        
        // Wait for the script to load
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load jsPDF library'));
          document.head.appendChild(script);
        });
        
        // Give a bit more time for the library to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Check if jsPDF is available
      if (typeof jspdf === 'undefined') {
        throw new Error('jsPDF library not available');
      }
      
      // Create a new PDF document
      const { jsPDF } = jspdf;
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Compliance Report', 105, 15, { align: 'center' });
      
      // Add general information
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toISOString()}`, 20, 30);
      doc.text(`Software Version: ${config.disclaimerVersion}`, 20, 40);
      doc.text(`Region: ${_currentRegion}`, 20, 50);
      doc.text(`Language: ${_currentLanguage}`, 20, 60);
      
      // Add compliance events table
      doc.setFontSize(14);
      doc.text('Event Log', 105, 80, { align: 'center' });
      
      // Create table for events
      let yPosition = 90;
      const pageHeight = doc.internal.pageSize.height;
      
      // Table header
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Event', 20, yPosition);
      doc.text('Timestamp', 60, yPosition);
      doc.text('Details', 140, yPosition);
      yPosition += 7;
      
      doc.setDrawColor(0, 0, 0);
      doc.line(20, yPosition - 3, 190, yPosition - 3);
      
      // Table data
      doc.setFont('helvetica', 'normal');
      
      _complianceLog.forEach(event => {
        // Check if we need a new page
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Format details as string
        let details = '';
        Object.keys(event).forEach(key => {
          if (key !== 'event' && key !== 'timestamp') {
            let value = event[key];
            if (typeof value === 'object') {
              value = JSON.stringify(value);
            }
            details += `${key}: ${value}, `;
          }
        });
        
        // Trim the details
        details = details.substring(0, 40) + (details.length > 40 ? '...' : '');
        
        // Add row
        doc.text(event.event || '', 20, yPosition);
        doc.text(event.timestamp ? event.timestamp.substring(0, 19) : '', 60, yPosition);
        doc.text(details, 140, yPosition);
        
        yPosition += 7;
      });
      
      // Add footer with page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${pageCount}`, 105, pageHeight - 10, { align: 'center' });
      }
      
      // Save the PDF as a blob
      const pdfBlob = doc.output('blob');
      return pdfBlob;
    } catch (error) {
      log('error', `Error generating PDF: ${error.message}`);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }
  
  /**
   * Download compliance report as PDF
   * @returns {Promise<void>}
   */
  async function downloadComplianceReportPDF() {
    try {
      const blob = await generateComplianceReportPDF();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `compliance-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up by revoking the object URL
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      return true;
    } catch (error) {
      log('error', `Error downloading PDF: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Check if all required disclaimers have been accepted
   * @returns {boolean} Whether all required disclaimers have been accepted
   */
  function hasAcceptedAllRequiredDisclaimers() {
    // Basic disclaimer is always required
    if (!_hasAcceptedDisclaimer) return false;
    
    // Data processing notice is required in EU
    if (_currentRegion === 'eu' && !_hasAcceptedDataProcessing) return false;
    
    return true;
  }
  
  /**
   * Get an item from storage based on config.storageType
   * @param {string} key - The storage key
   * @returns {string|null} The stored value or null
   */
  function getStorageItem(key) {
    switch (config.storageType) {
      case 'localStorage':
        return localStorage.getItem(key);
      case 'sessionStorage':
        return sessionStorage.getItem(key);
      case 'cookie':
        return getCookie(key);
      default:
        return localStorage.getItem(key);
    }
  }
  
  /**
   * Set an item in storage based on config.storageType
   * @param {string} key - The storage key
   * @param {string} value - The value to store
   */
  function setStorageItem(key, value) {
    switch (config.storageType) {
      case 'localStorage':
        localStorage.setItem(key, value);
        break;
      case 'sessionStorage':
        sessionStorage.setItem(key, value);
        break;
      case 'cookie':
        setCookie(key, value, config.cookieExpiryDays);
        break;
      default:
        localStorage.setItem(key, value);
    }
  }
  
  /**
   * Get a cookie value
   * @param {string} name - The cookie name
   * @returns {string|null} The cookie value or null
   */
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  }
  
  /**
   * Set a cookie
   * @param {string} name - The cookie name
   * @param {string} value - The cookie value
   * @param {number} days - Number of days until expiry
   */
  function setCookie(name, value, days) {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
  }
  
  /**
   * Force show the disclaimer regardless of previous acceptance
   */
  function forceShowDisclaimer() {
    showDisclaimerModal();
  }
  
  /**
   * Reset all acceptance statuses, forcing disclaimers to be shown again
   */
  function resetAllDisclaimers() {
    _hasAcceptedDisclaimer = false;
    _hasAcceptedPrivacy = false;
    _hasAcceptedDataProcessing = false;
    
    // Clear storage
    setStorageItem(config.initialDisclaimerKey, '');
    setStorageItem(config.privacyDisclaimerKey, '');
    setStorageItem(config.dataProcessingKey, '');
    setStorageItem('disclaimer_version', '');
    
    if (config.enableLogging) {
      console.log('All disclaimers have been reset');
    }
  }
  
  /**
   * Set the region manually
   * @param {string} region - The region code ('us', 'canada', 'eu', or 'default')
   */
  function setRegion(region) {
    if (['us', 'canada', 'eu', 'default'].includes(region)) {
      _currentRegion = region;
      setStorageItem(config.regionalConsentKey, region);
      
      if (config.enableLogging) {
        console.log('Region set to', region);
      }
      
      // Re-check if all required disclaimers have been accepted
      if (!hasAcceptedAllRequiredDisclaimers()) {
        showInitialDisclaimers();
      }
    } else {
      console.error('Invalid region:', region);
    }
  }
  
  // Public API
  return {
    // Core functionality
    init,
    showInitialDisclaimers,
    showDisclaimerModal,
    hasAcceptedAllRequiredDisclaimers,
    forceShowDisclaimer,
    resetAllDisclaimers,
    
    // Regional & Language settings
    setRegion,
    getRegion: () => _currentRegion,
    setLanguage: async (language) => {
      if (config.supportedLanguages.includes(language)) {
        _currentLanguage = language;
        setStorageItem(config.languageKey, language);
        
        // Load translations if needed
        if (!config.translations[language]) {
          try {
            await loadTranslationsWithTimeout(language);
          } catch (error) {
            log('error', `Failed to load translations: ${error.message}`);
            return false;
          }
        }
        
        log('info', `Language set to ${language}`);
        return true;
      } else {
        log('error', `Unsupported language: ${language}`);
        return false;
      }
    },
    getLanguage: () => _currentLanguage,
    getSupportedLanguages: () => config.supportedLanguages,
    
    // Compliance reporting
    getComplianceReport,
    downloadComplianceDataCSV,
    generateComplianceReportPDF,
    downloadComplianceReportPDF,
    sendComplianceReport,
    
    // Configuration
    getConfig: () => ({ ...config }), // Return a copy to prevent modification
    setConfig: (newConfig) => {
      // Only allow changing certain settings
      const allowedKeys = [
        'enableLogging',
        'logLevel',
        'complianceReportingEnabled',
        'anonymizedReporting',
        'geoApiKey',
        'translationEndpoint',
        'complianceEndpoint'
      ];
      
      allowedKeys.forEach(key => {
        if (newConfig[key] !== undefined) {
          config[key] = newConfig[key];
        }
      });
      
      log('info', 'Configuration updated');
    }
  };
})();

// Export to window
window.enhancedDisclaimer = enhancedDisclaimer;

/**
 * Initialize the disclaimer on page load with default settings
 */
document.addEventListener('DOMContentLoaded', function() {
  enhancedDisclaimer.init().catch(error => {
    console.error('Error initializing disclaimer:', error);
  });
});,
    forceShowDisclaimer,
    resetAllDisclaimers,
    
    // Regional & Language settings
    setRegion,
    getRegion: () => _currentRegion,
    setLanguage: async (language) => {
      if (config.supportedLanguages.includes(language)) {
        _currentLanguage = language;
        setStorageItem(config.languageKey, language);
        
        // Load translations if needed
        if (!config.translations[language]) {
          await loadTranslations(language);
        }
        
        log('info', `Language set to ${language}`);
        return true;
      } else {
        log('error', `Unsupported language: ${language}`);
        return false;
      }
    },
    getLanguage: () => _currentLanguage,
    getSupportedLanguages: () => config.supportedLanguages,
    
    // Compliance reporting
    getComplianceReport,
    downloadComplianceDataCSV,
    generateComplianceReportPDF,
    sendComplianceReport,
    
    // Configuration
    getConfig: () => ({ ...config }), // Return a copy to prevent modification
    setConfig: (newConfig) => {
      // Only allow changing certain settings
      const allowedKeys = [
        'enableLogging',
        'logLevel',
        'complianceReportingEnabled',
        'anonymizedReporting',
        'geoApiKey',
        'translationEndpoint',
        'complianceEndpoint'
      ];
      
      allowedKeys.forEach(key => {
        if (newConfig[key] !== undefined) {
          config[key] = newConfig[key];
        }
      });
      
      log('info', 'Configuration updated');
    }
  };
})();

// Export to window
window.enhancedDisclaimer = enhancedDisclaimer;

/**
 * Initialize the disclaimer on page load with default settings
 */
document.addEventListener('DOMContentLoaded', function() {
  enhancedDisclaimer.init().catch(error => {
    console.error('Error initializing disclaimer:', error);
  });
});
