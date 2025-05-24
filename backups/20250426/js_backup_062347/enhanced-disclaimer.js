/**
 * Enhanced Disclaimer Module
 * Provides comprehensive medical disclaimer functionality with
 * acknowledgment tracking, legal compliance, and user consent management
 */
const enhancedDisclaimer = (function() {
    // Configuration
    const config = {
        disclaimerVersion: '1.0.0',
        storageKey: 'cvd_toolkit_disclaimer_',
        consentDuration: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
        showOnEverySession: false,
        enforceScroll: true,
        requireCheckbox: true,
        blockFeatures: true,
        legalRequirements: {
            hipaa: true,
            gdpr: true,
            localRegulations: true
        }
    };
    
    // State tracking
    let isAcknowledged = false;
    let consentData = null;
    let disclaimerElement = null;
    
    /**
     * Initialize the disclaimer system
     * @param {Object} options - Configuration options
     */
    function initialize(options = {}) {
        // Merge options with defaults
        Object.assign(config, options);
        
        // Check for existing consent
        checkExistingConsent();
        
        // Create disclaimer element
        createDisclaimerElement();
        
        // Show initial disclaimers if needed
        if (shouldShowDisclaimer()) {
            showInitialDisclaimers();
        }
        
        // Setup event listeners
        setupEventListeners();
    }
    
    /**
     * Check for existing consent in storage
     * @private
     */
    function checkExistingConsent() {
        try {
            const storageKey = config.storageKey + config.disclaimerVersion;
            let storedConsent;
            
            if (window.secureStorage) {
                storedConsent = window.secureStorage.getItem(storageKey);
            } else {
                storedConsent = localStorage.getItem(storageKey);
                if (storedConsent) {
                    storedConsent = JSON.parse(storedConsent);
                }
            }
            
            if (storedConsent && validateConsent(storedConsent)) {
                consentData = storedConsent;
                isAcknowledged = true;
            }
        } catch (error) {
            console.warn('Error checking existing consent:', error);
        }
    }
    
    /**
     * Validate stored consent data
     * @private
     */
    function validateConsent(consent) {
        if (!consent || !consent.timestamp) return false;
        
        // Check expiration
        const now = Date.now();
        if (now - consent.timestamp > config.consentDuration) {
            return false;
        }
        
        // Check version
        if (consent.version !== config.disclaimerVersion) {
            return false;
        }
        
        // Check session enforcement
        if (config.showOnEverySession && 
            (!consent.sessionTimestamp || consent.sessionTimestamp !== getSessionId())) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get current session ID
     * @private
     */
    function getSessionId() {
        // Use session storage for session-specific ID
        let sessionId = sessionStorage.getItem('cvd_toolkit_session_id');
        if (!sessionId) {
            sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('cvd_toolkit_session_id', sessionId);
        }
        return sessionId;
    }
    
    /**
     * Create the disclaimer element
     * @private
     */
    function createDisclaimerElement() {
        disclaimerElement = document.createElement('div');
        disclaimerElement.id = 'enhanced-disclaimer';
        disclaimerElement.className = 'disclaimer-modal';
        disclaimerElement.setAttribute('role', 'dialog');
        disclaimerElement.setAttribute('aria-modal', 'true');
        disclaimerElement.setAttribute('aria-labelledby', 'disclaimer-title');
        
        disclaimerElement.innerHTML = `
            <div class="disclaimer-overlay"></div>
            <div class="disclaimer-content">
                <h2 id="disclaimer-title">IMPORTANT MEDICAL DISCLAIMER</h2>
                
                <div class="disclaimer-body" ${config.enforceScroll ? 'onscroll="enhancedDisclaimer.trackScroll(this)"' : ''}>
                    <p><strong>HEALTHCARE PROFESSIONAL USE ONLY:</strong> This cardiovascular risk assessment tool is designed solely for use by qualified healthcare professionals in clinical practice. It is not intended for patient self-assessment or general public use.</p>
                    
                    <h3>Clinical Decision Support Tool Limitations</h3>
                    <p>This tool provides risk estimates based on established algorithms (Framingham Risk Score and QRISK3) and serves as a clinical decision support system. However:</p>
                    <ul>
                        <li>Results should always be interpreted within the context of the individual patient's complete clinical presentation, medical history, and examination findings</li>
                        <li>This tool does not replace professional clinical judgment or comprehensive patient evaluation</li>
                        <li>Risk calculations have inherent limitations and may not accurately predict individual patient outcomes</li>
                        <li>Additional risk factors not captured by these algorithms may significantly impact patient risk</li>
                    </ul>
                    
                    <h3>Treatment Decision Making</h3>
                    <p>All treatment decisions remain the sole responsibility of the qualified healthcare provider and should consider:</p>
                    <ul>
                        <li>Current clinical practice guidelines</li>
                        <li>Patient preferences and values</li>
                        <li>Benefit-risk assessment specific to the individual patient</li>
                        <li>Full spectrum of cardiovascular risk factors</li>
                        <li>Comorbidities and contraindications</li>
                    </ul>
                    
                    <h3>Data Privacy and Regulatory Compliance</h3>
                    <p>This tool:</p>
                    <ul>
                        <li>Does not store or transmit patient data</li>
                        <li>Performs all calculations locally in your browser</li>
                        <li>Should be used in compliance with applicable privacy regulations (HIPAA, GDPR, etc.)</li>
                        <li>Requires healthcare professionals to maintain appropriate patient data security</li>
                    </ul>
                    
                    <h3>Professional Liability</h3>
                    <p>By using this tool, you acknowledge that:</p>
                    <ul>
                        <li>You are a qualified healthcare professional authorized to make clinical decisions</li>
                        <li>You maintain full responsibility for all clinical decisions and patient care</li>
                        <li>The developers and providers of this tool accept no liability for clinical outcomes</li>
                        <li>You will use this tool in accordance with your professional standards and judgment</li>
                    </ul>
                    
                    <div class="version-info">
                        Version: ${config.disclaimerVersion}<br>
                        Last Updated: ${new Date().toLocaleDateString()}
                    </div>
                </div>
                
                <div class="disclaimer-footer">
                    ${config.requireCheckbox ? `
                    <div class="consent-checkbox">
                        <input type="checkbox" id="disclaimer-consent-checkbox">
                        <label for="disclaimer-consent-checkbox">
                            I confirm that I am a qualified healthcare professional and have read and understood this disclaimer
                        </label>
                    </div>
                    ` : ''}
                    
                    <div class="disclaimer-actions">
                        <button id="disclaimer-reject-btn" class="btn-secondary">
                            I Do Not Accept
                        </button>
                        <button id="disclaimer-accept-btn" class="btn-primary" ${config.enforceScroll ? 'disabled' : ''}>
                            I Accept and Understand
                        </button>
                    </div>
                    
                    <p class="legal-notice">
                        Your acceptance constitutes a legally binding acknowledgment
                    </p>
                </div>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.getElementById('enhanced-disclaimer-styles')) {
            const style = document.createElement('style');
            style.id = 'enhanced-disclaimer-styles';
            style.textContent = `
                .disclaimer-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                }
                
                .disclaimer-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(5px);
                }
                
                .disclaimer-content {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 800px;
                    width: 90%;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }
                
                .disclaimer-content h2 {
                    color: #d32f2f;
                    margin: 0 0 20px;
                    font-size: 24px;
                    text-align: center;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #f0f0f0;
                }
                
                .disclaimer-content h3 {
                    color: #333;
                    margin: 20px 0 10px;
                    font-size: 18px;
                }
                
                .disclaimer-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 20px;
                    margin: 0 -20px;
                }
                
                .disclaimer-body p {
                    margin: 10px 0;
                    line-height: 1.6;
                }
                
                .disclaimer-body ul {
                    margin: 10px 0 10px 20px;
                }
                
                .disclaimer-body li {
                    margin: 5px 0;
                    line-height: 1.5;
                }
                
                .disclaimer-footer {
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 2px solid #f0f0f0;
                }
                
                .consent-checkbox {
                    margin-bottom: 20px;
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }
                
                .consent-checkbox input[type="checkbox"] {
                    margin-top: 4px;
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    min-width: 150px;
                    transition: all 0.2s ease;
                }
                
                .disclaimer-actions .btn-primary {
                    background: #1976d2;
                    color: white;
                    border: none;
                }
                
                .disclaimer-actions .btn-primary:hover:not(:disabled) {
                    background: #1565c0;
                    transform: translateY(-1px);
                }
                
                .disclaimer-actions .btn-primary:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                
                .disclaimer-actions .btn-secondary {
                    background: #fff;
                    color: #333;
                    border: 2px solid #ccc;
                }
                
                .disclaimer-actions .btn-secondary:hover {
                    background: #f5f5f5;
                    border-color: #999;
                }
                
                .legal-notice {
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    margin-top: 15px;
                    font-style: italic;
                }
                
                .version-info {
                    margin-top: 20px;
                    padding: 10px;
                    background: #f5f5f5;
                    border-radius: 6px;
                    font-size: 12px;
                    color: #666;
                }
                
                @media (max-width: 600px) {
                    .disclaimer-content {
                        width: 95%;
                        padding: 16px;
                    }
                    
                    .disclaimer-body {
                        padding: 0 10px;
                    }
                    
                    .disclaimer-actions {
                        flex-direction: column;
                    }
                    
                    .disclaimer-actions button {
                        width: 100%;
                    }
                }
                
                .disclaimer-show-animation {
                    animation: disclaimerFadeIn 0.3s ease-out;
                }
                
                @keyframes disclaimerFadeIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -45%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
                
                .feature-blocked {
                    pointer-events: none;
                    opacity: 0.5;
                    filter: blur(2px);
                    position: relative;
                }
                
                .feature-blocked::after {
                    content: 'Please accept the disclaimer to use this feature';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-size: 14px;
                    white-space: nowrap;
                    z-index: 1000;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(disclaimerElement);
    }
    
    /**
     * Setup event listeners
     * @private
     */
    function setupEventListeners() {
        // Accept button
        const acceptBtn = document.getElementById('disclaimer-accept-btn');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', handleAccept);
        }
        
        // Reject button
        const rejectBtn = document.getElementById('disclaimer-reject-btn');
        if (rejectBtn) {
            rejectBtn.addEventListener('click', handleReject);
        }
        
        // Checkbox change
        if (config.requireCheckbox) {
            const checkbox = document.getElementById('disclaimer-consent-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', handleCheckboxChange);
            }
        }
        
        // Escape key to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && disclaimerElement.style.display === 'block') {
                handleReject();
            }
        });
    }
    
    /**
     * Determine if disclaimer should be shown
     * @private
     */
    function shouldShowDisclaimer() {
        // Always show if not acknowledged
        if (!isAcknowledged) return true;
        
        // Show if configured for every session
        if (config.showOnEverySession && 
            consentData.sessionTimestamp !== getSessionId()) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Show initial disclaimers
     */
    function showInitialDisclaimers() {
        if (!disclaimerElement) {
            createDisclaimerElement();
        }
        
        // Reset scroll tracking
        if (config.enforceScroll) {
            const disclaimerBody = disclaimerElement.querySelector('.disclaimer-body');
            if (disclaimerBody) {
                disclaimerBody.scrollTop = 0;
                updateAcceptButtonState(false);
            }
        }
        
        // Reset checkbox
        if (config.requireCheckbox) {
            const checkbox = document.getElementById('disclaimer-consent-checkbox');
            if (checkbox) {
                checkbox.checked = false;
            }
        }
        
        // Show disclaimer
        disclaimerElement.style.display = 'block';
        disclaimerElement.querySelector('.disclaimer-content').classList.add('disclaimer-show-animation');
        
        // Block features if configured
        if (config.blockFeatures) {
            blockFeatures(true);
        }
        
        // Focus on the first button
        setTimeout(() => {
            const firstButton = disclaimerElement.querySelector('button');
            if (firstButton) firstButton.focus();
        }, 300);
        
        // Add aria attributes
        document.body.setAttribute('aria-hidden', 'true');
        disclaimerElement.setAttribute('aria-hidden', 'false');
    }
    
    /**
     * Handle accept action
     * @private
     */
    function handleAccept() {
        // Validate requirements
        if (config.requireCheckbox) {
            const checkbox = document.getElementById('disclaimer-consent-checkbox');
            if (!checkbox || !checkbox.checked) {
                if (window.enhancedDisplay) {
                    window.enhancedDisplay.showError('Please check the confirmation box to proceed');
                } else {
                    alert('Please check the confirmation box to proceed');
                }
                return;
            }
        }
        
        // Create consent record
        consentData = {
            version: config.disclaimerVersion,
            timestamp: Date.now(),
            sessionTimestamp: getSessionId(),
            consentType: 'explicit',
            userAgent: navigator.userAgent,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        // Store consent
        try {
            const storageKey = config.storageKey + config.disclaimerVersion;
            if (window.secureStorage) {
                window.secureStorage.setItem(storageKey, consentData);
            } else {
                localStorage.setItem(storageKey, JSON.stringify(consentData));
            }
        } catch (error) {
            console.error('Failed to store consent:', error);
        }
        
        // Update state
        isAcknowledged = true;
        
        // Hide disclaimer
        hideDisclaimer();
        
        // Unblock features
        if (config.blockFeatures) {
            blockFeatures(false);
        }
        
        // Trigger consent event
        const event = new CustomEvent('disclaimerAccepted', {
            detail: { consent: consentData }
        });
        document.dispatchEvent(event);
        
        // Show confirmation if available
        if (window.enhancedDisplay) {
            window.enhancedDisplay.showSuccess('Disclaimer accepted. You may now use the tool.');
        }
    }
    
    /**
     * Handle reject action
     * @private
     */
    function handleReject() {
        // Create rejection record
        const rejectionData = {
            version: config.disclaimerVersion,
            timestamp: Date.now(),
            action: 'rejected',
            userAgent: navigator.userAgent
        };
        
        // Store rejection (for analytics if needed)
        try {
            const storageKey = config.storageKey + 'rejections';
            let rejections = [];
            
            if (window.secureStorage) {
                rejections = window.secureStorage.getItem(storageKey) || [];
            } else {
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    rejections = JSON.parse(stored);
                }
            }
            
            rejections.push(rejectionData);
            
            if (window.secureStorage) {
                window.secureStorage.setItem(storageKey, rejections);
            } else {
                localStorage.setItem(storageKey, JSON.stringify(rejections));
            }
        } catch (error) {
            console.error('Failed to store rejection:', error);
        }
        
        // Trigger rejection event
        const event = new CustomEvent('disclaimerRejected', {
            detail: { rejection: rejectionData }
        });
        document.dispatchEvent(event);
        
        // Show rejection message
        if (window.enhancedDisplay) {
            window.enhancedDisplay.showWarning(
                'Access to the CVD Risk Toolkit is restricted to healthcare professionals who accept the disclaimer.',
                { timeout: 5000 }
            );
        } else {
            alert('Access to the CVD Risk Toolkit is restricted to healthcare professionals who accept the disclaimer.');
        }
        
        // Redirect if configured
        if (config.redirectOnReject) {
            setTimeout(() => {
                window.location.href = config.redirectUrl || '/';
            }, 2000);
        }
    }
    
    /**
     * Handle checkbox change
     * @private
     */
    function handleCheckboxChange(e) {
        updateAcceptButtonState();
    }
    
    /**
     * Update accept button state based on requirements
     * @private
     */
    function updateAcceptButtonState(hasScrolled = null) {
        const acceptBtn = document.getElementById('disclaimer-accept-btn');
        if (!acceptBtn) return;
        
        let canAccept = true;
        
        // Check scroll requirement
        if (config.enforceScroll && hasScrolled !== null) {
            canAccept = canAccept && hasScrolled;
        }
        
        // Check checkbox requirement
        if (config.requireCheckbox) {
            const checkbox = document.getElementById('disclaimer-consent-checkbox');
            canAccept = canAccept && (checkbox && checkbox.checked);
        }
        
        acceptBtn.disabled = !canAccept;
    }
    
    /**
     * Track scroll position
     * @param {HTMLElement} element - The scrolling element
     */
    function trackScroll(element) {
        if (!config.enforceScroll) return;
        
        const isScrolledToBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 10;
        updateAcceptButtonState(isScrolledToBottom);
    }
    
    /**
     * Hide disclaimer
     * @private
     */
    function hideDisclaimer() {
        if (disclaimerElement) {
            disclaimerElement.style.display = 'none';
            document.body.removeAttribute('aria-hidden');
            disclaimerElement.setAttribute('aria-hidden', 'true');
        }
    }
    
    /**
     * Block or unblock features
     * @private
     */
    function blockFeatures(block) {
        const forms = document.querySelectorAll('form');
        const buttons = document.querySelectorAll('button[type="submit"], .primary-btn');
        const inputs = document.querySelectorAll('input, select, textarea');
        
        const elements = [...forms, ...buttons, ...inputs];
        
        elements.forEach(element => {
            if (block) {
                element.classList.add('feature-blocked');
                element.setAttribute('tabindex', '-1');
                element.setAttribute('aria-disabled', 'true');
            } else {
                element.classList.remove('feature-blocked');
                element.removeAttribute('tabindex');
                element.removeAttribute('aria-disabled');
            }
        });
    }
    
    /**
     * Get consent status
     * @returns {Object} - Consent status
     */
    function getConsentStatus() {
        return {
            isAcknowledged,
            consentData,
            version: config.disclaimerVersion
        };
    }
    
    /**
     * Revoke consent
     */
    function revokeConsent() {
        try {
            const storageKey = config.storageKey + config.disclaimerVersion;
            
            if (window.secureStorage) {
                window.secureStorage.removeItem(storageKey);
            } else {
                localStorage.removeItem(storageKey);
            }
            
            isAcknowledged = false;
            consentData = null;
            
            // Show disclaimer again
            showInitialDisclaimers();
        } catch (error) {
            console.error('Failed to revoke consent:', error);
        }
    }
    
    /**
     * Update disclaimer content
     * @param {string} content - New content HTML
     */
    function updateContent(content) {
        const disclaimerBody = disclaimerElement?.querySelector('.disclaimer-body');
        if (disclaimerBody && content) {
            disclaimerBody.innerHTML = content;
        }
    }
    
    // Public API
    return {
        initialize,
        showInitialDisclaimers,
        getConsentStatus,
        revokeConsent,
        updateContent,
        trackScroll,
        config
    };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    enhancedDisclaimer.initialize();
});

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = enhancedDisclaimer;
} else {
    window.enhancedDisclaimer = enhancedDisclaimer;
}

                });
                
                .consent-checkbox label {
                    font-weight: 500;
                    cursor: pointer;
                    user-select: none;
                }
                
                .disclaimer-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                
                .disclaimer-actions button {
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;