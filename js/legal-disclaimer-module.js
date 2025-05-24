    /**
     * Returns HTML content for specific PCSK9 inhibitor disclaimer
     * @returns {string} HTML content
     * @private
     */
    _getPCSK9DisclaimerContent() {
        return `
            <div class="disclaimer-section">
                <h3>PCSK9 INHIBITOR RECOMMENDATIONS SPECIFIC DISCLAIMER</h3>
                <p><strong>Last Updated:</strong> ${this.disclaimerVersions.clinical.lastUpdated}</p>
                <p><strong>Version:</strong> ${this.disclaimerVersions.clinical.version}</p>
                
                <div class="disclaimer-alert">
                    <strong>IMPORTANT:</strong> This disclaimer specifically addresses PCSK9 inhibitor eligibility assessments and recommendations provided by the Application.
                </div>
                
                <h4>1. PCSK9 INHIBITOR ELIGIBILITY ASSESSMENT LIMITATIONS</h4>
                <p>The Application's implementation of BC PharmaCare Special Authority criteria for PCSK9 inhibitors:</p>
                
                <ul>
                    <li>Is based on publicly available information about BC PharmaCare Special Authority criteria as understood by the Application's creators at the time of development;</li>
                    <li>May not reflect the most current BC PharmaCare Special Authority criteria, which may change at any time;</li>
                    <li>Is not an official implementation, interpretation, or representation of BC PharmaCare's actual coverage determination process;</li>
                    <li>Has not been endorsed, approved, or verified by BC PharmaCare, the British Columbia Ministry of Health, or any other governmental body;</li>
                    <li>Does not guarantee that a patient deemed "eligible" by the Application will actually receive coverage approval from BC PharmaCare or any other payer;</li>
                    <li>May not account for additional requirements, special circumstances, or exceptions that BC PharmaCare may apply in individual cases.</li>
                </ul>
                
                <h4>2. PCSK9 INHIBITOR CLINICAL CONSIDERATIONS</h4>
                <p>PCSK9 inhibitors are advanced lipid-lowering therapies with specific clinical considerations that may not be fully captured by the Application's recommendations:</p>
                
                <ul>
                    <li>The Application does not comprehensively screen for all possible contraindications, drug interactions, or adverse effects associated with PCSK9 inhibitors;</li>
                    <li>The Application does not account for all factors that might influence the clinical appropriateness of PCSK9 inhibitors for individual patients;</li>
                    <li>The Application does not provide guidance on the administration, monitoring, or management of PCSK9 inhibitor therapy;</li>
                    <li>Healthcare professionals must consult the current product monograph and other authoritative sources before prescribing PCSK9 inhibitors.</li>
                </ul>
                
                <h4>3. COST AND COVERAGE CONSIDERATIONS</h4>
                <p>PCSK9 inhibitors are costly medications with complex coverage considerations:</p>
                
                <ul>
                    <li>The Application's assessment of BC PharmaCare coverage eligibility does not address coverage by other public payers or private insurance plans;</li>
                    <li>Coverage criteria vary significantly between public payers across different provinces and territories in Canada;</li>
                    <li>Private insurance plans may have their own distinct coverage criteria for PCSK9 inhibitors;</li>
                    <li>The Application does not provide information about patient support programs, compassionate access programs, or other potential sources of assistance;</li>
                    <li>Healthcare professionals should verify current coverage criteria directly with the relevant payer and consider the financial impact on patients before initiating therapy.</li>
                </ul>
                
                <h4>4. DOCUMENTATION REQUIREMENTS</h4>
                <p>Special Authority requests for PCSK9 inhibitors require specific documentation:</p>
                
                <ul>
                    <li>The Application does not generate or provide the official forms required for BC PharmaCare Special Authority requests;</li>
                    <li>The Application does not specify all supporting documentation that may be required for a successful coverage application;</li>
                    <li>Healthcare professionals are solely responsible for obtaining, completing, and submitting all required forms and supporting documentation correctly;</li>
                    <li>The Application's suggestions regarding documentation should not be considered exhaustive or authoritative.</li>
                </ul>
                
                <h4>5. REGULATORY AND LEGAL STATUS</h4>
                <p>The regulatory status of PCSK9 inhibitors and related legal considerations:</p>
                
                <ul>
                    <li>PCSK9 inhibitors are prescription medications approved by Health Canada for specific indications;</li>
                    <li>The Application's recommendations regarding PCSK9 inhibitors are not intended to promote off-label use;</li>
                    <li>Healthcare professionals must prescribe within the approved indications and in accordance with applicable laws and regulations;</li>
                    <li>The Application does not provide legal advice regarding prescription practices, coverage applications, or potential liability associated with PCSK9 inhibitor therapy.</li>
                </ul>
                
                <h4>6. NO LIABILITY FOR PCSK9 INHIBITOR RECOMMENDATIONS</h4>
                <p>THE CREATORS, DEVELOPERS, CONTRIBUTORS, AND ANY AFFILIATED PARTIES EXPLICITLY DISCLAIM ANY RESPONSIBILITY OR LIABILITY FOR:</p>
                
                <ul>
                    <li>Any discrepancies between the Application's eligibility assessment and actual coverage determinations made by BC PharmaCare or any other payer;</li>
                    <li>Any adverse outcomes, side effects, or complications associated with PCSK9 inhibitor therapy initiated based on the Application's recommendations;</li>
                    <li>Any financial consequences to patients or healthcare systems resulting from reliance on the Application's PCSK9 inhibitor eligibility assessments or recommendations;</li>
                    <li>Any delays, denials, or complications in the coverage approval process that may occur despite the Application's eligibility assessment;</li>
                    <li>Any misinterpretation or misapplication of BC PharmaCare Special Authority criteria or other coverage criteria implemented in the Application.</li>
                </ul>
                
                <h4>7. ACKNOWLEDGMENT</h4>
                <p>By accepting this disclaimer, you acknowledge that you have read, understood, and agree to be bound by all of the terms set forth herein. You acknowledge that you understand the specific limitations of the Application's PCSK9 inhibitor eligibility assessments and recommendations, and agree to exercise appropriate professional judgment when using these assessments and recommendations in your clinical practice.</p>
                
                <p>You further acknowledge that you will verify current BC PharmaCare Special Authority criteria or other applicable coverage criteria directly with the relevant payer before initiating PCSK9 inhibitor therapy or submitting coverage applications based on the Application's eligibility assessments.</p>
            </div>
        `;
    }/**
 * Comprehensive Legal Disclaimer Module
 * @file /js/utils/legal-disclaimers.js
 * @description Manages all legal disclaimers and consent requirements for the application
 * @version 2.0.1
 * @author CVD Risk Assessment Team
 * @legal-review Approved by Legal Counsel (05/01/2025)
 */

class LegalDisclaimerManager {
    constructor() {
        this.disclaimerVersions = {
            general: {
                version: '3.1.2',
                lastUpdated: '2025-05-01'
            },
            clinical: {
                version: '2.4.0',
                lastUpdated: '2025-04-15'
            },
            dataPrivacy: {
                version: '3.0.1',
                lastUpdated: '2025-03-10'
            }
        };
        
        this.acceptedDisclaimers = {};
        this._loadAcceptedDisclaimers();
    }
    
    /**
     * Initializes disclaimer behaviors throughout the application
     * @public
     */
    initialize() {
        // Attach disclaimer events to all required elements
        this._attachDisclaimerEvents();
        
        // Check if disclaimer acceptance is required
        this._checkRequiredDisclaimers();
        
        // Initialize tooltips for disclaimer references
        this._initDisclaimerTooltips();
    }
    
    /**
     * Shows the appropriate disclaimer modal based on type
     * @param {string} type - Type of disclaimer (general, clinical, dataPrivacy)
     * @param {Function} callback - Optional callback after acceptance
     * @public
     */
    showDisclaimer(type, callback = null) {
        const disclaimerContent = this._getDisclaimerContent(type);
        if (!disclaimerContent) {
            console.error(`Disclaimer type '${type}' not found`);
            return;
        }
        
        // Create and show modal with disclaimer content
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('id', `${type}-disclaimer-modal`);
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-container" role="dialog" aria-modal="true">
                <div class="modal-header">
                    <h2>${disclaimerContent.title}</h2>
                    <button class="modal-close" aria-label="Close disclaimer">&times;</button>
                </div>
                <div class="modal-body disclaimer-content">
                    ${disclaimerContent.content}
                    <div class="disclaimer-acknowledgment">
                        <label class="checkbox-container">
                            <input type="checkbox" id="${type}-disclaimer-acknowledge" class="disclaimer-checkbox">
                            <span class="checkbox-label">I acknowledge that I have read, understood, and agree to the above disclaimer.</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="button button-secondary modal-close" id="${type}-disclaimer-decline">Decline</button>
                    <button class="button button-primary" id="${type}-disclaimer-accept" disabled>Accept</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeButtons = modal.querySelectorAll('.modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this._closeDisclaimer(modal);
            });
        });
        
        const acknowledgeCheckbox = document.getElementById(`${type}-disclaimer-acknowledge`);
        const acceptButton = document.getElementById(`${type}-disclaimer-accept`);
        const declineButton = document.getElementById(`${type}-disclaimer-decline`);
        
        if (acknowledgeCheckbox && acceptButton) {
            acknowledgeCheckbox.addEventListener('change', () => {
                acceptButton.disabled = !acknowledgeCheckbox.checked;
            });
            
            acceptButton.addEventListener('click', () => {
                this._acceptDisclaimer(type);
                this._closeDisclaimer(modal);
                if (callback) callback(true);
            });
            
            declineButton.addEventListener('click', () => {
                this._declineDisclaimer(type);
                this._closeDisclaimer(modal);
                if (callback) callback(false);
            });
        }
        
        // Show the modal
        setTimeout(() => {
            modal.classList.add('active');
        }, 50);
    }
    
    /**
     * Checks if a specific disclaimer has been accepted
     * @param {string} type - Type of disclaimer
     * @returns {boolean} Whether the disclaimer has been accepted
     * @public
     */
    isDisclaimerAccepted(type) {
        if (!this.acceptedDisclaimers[type]) return false;
        
        // Check if the accepted version matches the current version
        return this.acceptedDisclaimers[type].version === this.disclaimerVersions[type].version;
    }
    
    /**
     * Gets the appropriate disclaimer content for a specific type
     * @param {string} type - Type of disclaimer
     * @returns {Object|null} Disclaimer content or null if not found
     * @private
     */
    _getDisclaimerContent(type) {
        switch(type) {
            case 'general':
                return {
                    title: 'General Terms of Use',
                    content: this._getGeneralDisclaimerContent()
                };
            case 'clinical':
                return {
                    title: 'Clinical Use Disclaimer',
                    content: this._getClinicalDisclaimerContent()
                };
            case 'dataPrivacy':
                return {
                    title: 'Data Privacy and Security Notice',
                    content: this._getDataPrivacyDisclaimerContent()
                };
            case 'medication':
                return {
                    title: 'Medication Recommendations Disclaimer',
                    content: this._getMedicationDisclaimerContent()
                };
            case 'canadian':
                return {
                    title: 'Canadian Cardiovascular Risk Calculator Disclaimer',
                    content: this._getCanadianCalculatorDisclaimerContent()
                };
            case 'pcsk9':
                return {
                    title: 'PCSK9 Inhibitor Recommendations Disclaimer',
                    content: this._getPCSK9DisclaimerContent()
                };
            default:
                return null;
        }
    }
    
    /**
     * Closes the disclaimer modal
     * @param {HTMLElement} modal - Modal element
     * @private
     */
    _closeDisclaimer(modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
    
    /**
     * Marks a disclaimer as accepted
     * @param {string} type - Type of disclaimer
     * @private
     */
    _acceptDisclaimer(type) {
        this.acceptedDisclaimers[type] = {
            version: this.disclaimerVersions[type].version,
            acceptedOn: new Date().toISOString()
        };
        
        // Save to localStorage
        try {
            localStorage.setItem('acceptedDisclaimers', JSON.stringify(this.acceptedDisclaimers));
        } catch (e) {
            console.warn('Failed to save disclaimer acceptance to localStorage:', e);
            // Fall back to session storage
            try {
                sessionStorage.setItem('acceptedDisclaimers', JSON.stringify(this.acceptedDisclaimers));
            } catch (e) {
                console.error('Failed to save disclaimer acceptance to sessionStorage:', e);
            }
        }
    }
    
    /**
     * Handles disclaimer decline
     * @param {string} type - Type of disclaimer
     * @private
     */
    _declineDisclaimer(type) {
        // If clinical disclaimer is declined, redirect to disclaimer page
        if (type === 'clinical') {
            this._showDisclaimerDeclinedMessage();
        }
    }
    
    /**
     * Shows a message when disclaimers are declined
     * @private
     */
    _showDisclaimerDeclinedMessage() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('id', 'disclaimer-declined-modal');
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-container" role="dialog" aria-modal="true">
                <div class="modal-header">
                    <h2>Application Use Restricted</h2>
                </div>
                <div class="modal-body">
                    <div class="disclaimer-declined-message">
                        <p>You must accept the clinical use disclaimer to use this application. This application is intended for use by qualified healthcare professionals only as a supplementary aid in cardiovascular risk assessment and management.</p>
                        <p>By declining the disclaimer, you have indicated that you do not agree to the terms of use. This application cannot be used without accepting these terms.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="button button-secondary" id="reconsider-disclaimer">Reconsider</button>
                    <button class="button button-primary" id="exit-application">Exit Application</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const reconsiderButton = document.getElementById('reconsider-disclaimer');
        const exitButton = document.getElementById('exit-application');
        
        if (reconsiderButton) {
            reconsiderButton.addEventListener('click', () => {
                this._closeDisclaimer(modal);
                // Show the clinical disclaimer again
                setTimeout(() => {
                    this.showDisclaimer('clinical');
                }, 300);
            });
        }
        
        if (exitButton) {
            exitButton.addEventListener('click', () => {
                this._closeDisclaimer(modal);
                // Disable application functionality
                this._disableApplication();
            });
        }
        
        // Show the modal
        setTimeout(() => {
            modal.classList.add('active');
        }, 50);
    }
    
    /**
     * Disables application functionality
     * @private
     */
    _disableApplication() {
        // Overlay the entire application with a disabled message
        const overlay = document.createElement('div');
        overlay.className = 'application-disabled-overlay';
        overlay.innerHTML = `
            <div class="disabled-content">
                <h2>Application Access Restricted</h2>
                <p>You must accept the required terms of use to access this application.</p>
                <p>Please refresh the page to restart and accept the terms of use.</p>
                <button id="refresh-page" class="button button-primary">Refresh Page</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add event listener to refresh button
        const refreshButton = document.getElementById('refresh-page');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }
    
    /**
     * Loads previously accepted disclaimers from storage
     * @private
     */
    _loadAcceptedDisclaimers() {
        try {
            // Try localStorage first
            const savedDisclaimers = localStorage.getItem('acceptedDisclaimers');
            if (savedDisclaimers) {
                this.acceptedDisclaimers = JSON.parse(savedDisclaimers);
                return;
            }
            
            // Try sessionStorage as fallback
            const sessionDisclaimers = sessionStorage.getItem('acceptedDisclaimers');
            if (sessionDisclaimers) {
                this.acceptedDisclaimers = JSON.parse(sessionDisclaimers);
            }
        } catch (e) {
            console.error('Failed to load saved disclaimers:', e);
            this.acceptedDisclaimers = {};
        }
    }
    
    /**
     * Checks if required disclaimers have been accepted, shows them if not
     * @private
     */
    _checkRequiredDisclaimers() {
        // Clinical disclaimer is required
        if (!this.isDisclaimerAccepted('clinical')) {
            // Show on slight delay to allow page to render
            setTimeout(() => {
                this.showDisclaimer('clinical', (accepted) => {
                    if (!accepted) {
                        // If not accepted, disable application
                        this._disableApplication();
                    }
                });
            }, 500);
        }
    }
    
    /**
     * Attaches event handlers to disclaimer-related elements
     * @private
     */
    _attachDisclaimerEvents() {
        // Attach events to disclaimer links in the footer
        document.addEventListener('DOMContentLoaded', () => {
            const disclaimerLinks = {
                'show-terms': 'general',
                'show-clinical-disclaimer': 'clinical',
                'show-privacy': 'dataPrivacy'
            };
            
            for (const [id, type] of Object.entries(disclaimerLinks)) {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showDisclaimer(type);
                    });
                }
            }
            
            // Attach event to disclaimer alert close button
            const alertCloseButton = document.querySelector('#disclaimer-alert .alert-close');
            if (alertCloseButton) {
                alertCloseButton.addEventListener('click', () => {
                    const alert = document.getElementById('disclaimer-alert');
                    if (alert) {
                        alert.style.display = 'none';
                    }
                });
            }
        });
    }
    
    /**
     * Initializes tooltips for disclaimer references
     * @private
     */
    _initDisclaimerTooltips() {
        document.addEventListener('DOMContentLoaded', () => {
            const disclaimerReferences = document.querySelectorAll('.disclaimer-reference');
            disclaimerReferences.forEach(reference => {
                // Add tooltip behavior
                reference.addEventListener('mouseenter', (e) => {
                    const type = e.target.getAttribute('data-disclaimer-type');
                    const tooltipText = this._getShortDisclaimerText(type);
                    
                    const tooltip = document.createElement('div');
                    tooltip.className = 'disclaimer-tooltip';
                    tooltip.textContent = tooltipText;
                    
                    document.body.appendChild(tooltip);
                    
                    // Position the tooltip
                    const rect = e.target.getBoundingClientRect();
                    tooltip.style.left = `${rect.left + window.scrollX}px`;
                    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
                    
                    // Store reference to the tooltip
                    e.target.tooltip = tooltip;
                });
                
                reference.addEventListener('mouseleave', (e) => {
                    if (e.target.tooltip) {
                        e.target.tooltip.remove();
                        e.target.tooltip = null;
                    }
                });
                
                // Make clickable to show full disclaimer
                reference.addEventListener('click', (e) => {
                    const type = e.target.getAttribute('data-disclaimer-type');
                    if (type) {
                        this.showDisclaimer(type);
                    }
                });
            });
        });
    }
    
    /**
     * Returns a short form of the disclaimer for tooltips
     * @param {string} type - Type of disclaimer
     * @returns {string} Short disclaimer text
     * @private
     */
    _getShortDisclaimerText(type) {
        switch(type) {
            case 'general':
                return 'This application is provided "as is" without warranty of any kind. Click to view full terms.';
            case 'clinical':
                return 'For use by healthcare professionals only. Not a substitute for clinical judgment. Click to view full disclaimer.';
            case 'dataPrivacy':
                return 'This application processes data locally and does not store patient data outside your device. Click for details.';
            default:
                return 'Click to view disclaimer.';
        }
    }
    
    /**
     * Returns HTML content for the general disclaimer
     * @returns {string} HTML content
     * @private
     */
    _getGeneralDisclaimerContent() {
        return `
            <div class="disclaimer-section">
                <h3>GENERAL TERMS OF USE</h3>
                <p><strong>Last Updated:</strong> ${this.disclaimerVersions.general.lastUpdated}</p>
                <p><strong>Version:</strong> ${this.disclaimerVersions.general.version}</p>
                
                <h4>1. SCOPE AND ACCEPTANCE</h4>
                <p>These Terms of Use govern your access to and use of the Enhanced CVD Risk Toolkit (the "Application"). By accessing or using the Application, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you must not access or use the Application.</p>
                
                <h4>2. DISCLAIMER OF WARRANTIES</h4>
                <p>THE APPLICATION IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. THE CREATORS, DEVELOPERS, CONTRIBUTORS, AND ANY AFFILIATED PARTIES DO NOT WARRANT THAT: (A) THE APPLICATION WILL FUNCTION UNINTERRUPTED, SECURE, OR AVAILABLE AT ANY PARTICULAR TIME OR LOCATION; (B) ANY ERRORS OR DEFECTS WILL BE CORRECTED; (C) THE APPLICATION IS FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS; OR (D) THE RESULTS OF USING THE APPLICATION WILL MEET YOUR REQUIREMENTS.</p>
                
                <h4>3. LIMITATION OF LIABILITY</h4>
                <p>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE CREATORS, DEVELOPERS, CONTRIBUTORS, AND ANY AFFILIATED PARTIES BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, THAT RESULT FROM THE USE OF, OR INABILITY TO USE, THE APPLICATION.</p>
                
                <p>IN NO EVENT SHALL THE AGGREGATE LIABILITY OF THE CREATORS, DEVELOPERS, CONTRIBUTORS, AND ANY AFFILIATED PARTIES, WHETHER IN CONTRACT, WARRANTY, TORT (INCLUDING NEGLIGENCE, WHETHER ACTIVE, PASSIVE, OR IMPUTED), PRODUCT LIABILITY, STRICT LIABILITY, OR OTHER THEORY, ARISING OUT OF OR RELATING TO THE USE OF THE APPLICATION EXCEED ANY COMPENSATION PAID BY YOU FOR ACCESS TO OR USE OF THE APPLICATION.</p>
                
                <h4>4. INDEMNIFICATION</h4>
                <p>You agree to defend, indemnify, and hold harmless the creators, developers, contributors, and any affiliated parties, including their respective officers, directors, employees, and agents, from and against any claims, liabilities, damages, losses, and expenses, including, without limitation, reasonable legal and accounting fees, arising out of or in any way connected with your access to or use of the Application, your violation of these Terms, or your violation of any rights of another.</p>
                
                <h4>5. MODIFICATIONS</h4>
                <p>The creators reserve the right, at their sole discretion, to modify or replace these Terms at any time. It is your responsibility to check these Terms periodically for changes. Your continued use of the Application following the posting of any changes to these Terms constitutes acceptance of those changes.</p>
                
                <h4>6. GOVERNING LAW</h4>
                <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which the creators are located, without regard to its conflict of law provisions.</p>
                
                <h4>7. SEVERABILITY</h4>
                <p>If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect.</p>
            </div>
        `;
    }
    
    /**
     * Returns HTML content for the clinical disclaimer with enhanced Canadian focus
     * @returns {string} HTML content
     * @private
     */
    _getClinicalDisclaimerContent() {
        return `
            <div class="disclaimer-section">
                <h3>CLINICAL USE DISCLAIMER</h3>
                <p><strong>Last Updated:</strong> ${this.disclaimerVersions.clinical.lastUpdated}</p>
                <p><strong>Version:</strong> ${this.disclaimerVersions.clinical.version}</p>
                
                <div class="disclaimer-alert">
                    <strong>IMPORTANT:</strong> This Application is intended for use by qualified healthcare professionals only. It is not intended for use by patients or the general public.
                </div>
                
                <h4>1. MEDICAL DISCLAIMER</h4>
                <p>The Enhanced CVD Risk Toolkit (the "Application") is provided for informational and educational purposes only and is not intended as, and shall not be understood or construed as, professional medical advice, diagnosis, or treatment. The information provided by the Application is not a substitute for the professional judgment of qualified healthcare providers.</p>
                
                <p>NO DOCTOR-PATIENT RELATIONSHIP IS CREATED BY USE OF THE APPLICATION. THE APPLICATION DOES NOT REPLACE THE NEED FOR EVALUATION, TESTING, AND TREATMENT BY A HEALTHCARE PROFESSIONAL. ALWAYS SEEK THE ADVICE OF YOUR PHYSICIAN OR OTHER QUALIFIED HEALTHCARE PROVIDER WITH ANY QUESTIONS YOU MAY HAVE REGARDING A MEDICAL CONDITION.</p>
                
                <h4>2. ACCURACY, LIMITATIONS, AND JURISDICTIONAL CONSIDERATIONS</h4>
                <p>The Application provides cardiovascular risk estimates based on established risk algorithms, including the Framingham Risk Score and QRISK3, which have their own inherent limitations and were developed based on specific populations that may not represent all patients.</p>
                
                <p>While the Application incorporates recommendations from the Canadian Cardiovascular Society (CCS) Guidelines for the Management of Dyslipidemia, these guidelines may not be applicable to patients in all jurisdictions. Healthcare professionals should consult local guidelines applicable to their specific jurisdiction and practice setting.</p>
                
                <p>The risk calculations are statistical estimates based on population data and may not accurately predict individual risk. Many factors that could influence cardiovascular risk are not included in these algorithms. The Application makes no representation or warranty regarding the accuracy, reliability, or completeness of any risk estimate or recommendation provided.</p>
                
                <p>The medication recommendations provided by the Application are based on clinical guidelines and do not account for all patient-specific factors that may influence medication selection, such as allergies, contraindications, drug interactions, comorbidities, insurance coverage, cost considerations, or patient preferences.</p>
                
                <p>The specific BC PharmaCare coverage criteria implemented in this Application are subject to change by the British Columbia Ministry of Health. Healthcare professionals should verify current coverage criteria directly with BC PharmaCare prior to initiating coverage applications.</p>
                
                <h4>3. USE IN CLINICAL PRACTICE</h4>
                <p>Healthcare professionals using this Application must exercise their independent professional judgment in evaluating the information provided by the Application. The Application should be used only as a supplementary tool to support clinical decision-making and not as a replacement for clinical expertise, judgment, or patient-specific evaluation.</p>
                
                <p>Users of the Application are solely responsible for all clinical decisions made based on its output, including but not limited to diagnosis, treatment plans, medication prescriptions, and patient management strategies.</p>
                
                <p>The healthcare professional using this Application bears the responsibility of communicating to patients that any decisions regarding their care are based on the healthcare professional's clinical judgment, taking into account the Application's output as just one of many factors in the decision-making process.</p>
                
                <h4>4. GUIDELINE UPDATES</h4>
                <p>The Application's recommendations are based on clinical practice guidelines that may change over time. The creators of the Application make no guarantee that the information and recommendations are current with the most recent medical guidelines or research findings. Healthcare professionals are responsible for staying informed about changes in guidelines and standards of care in their practice areas.</p>
                
                <p>The medication recommendations are substantially based on the 2021 Canadian Cardiovascular Society Guidelines for the Management of Dyslipidemia for the Prevention of Cardiovascular Disease in the Adult. The creators make no representation regarding their applicability to other jurisdictions or their currency beyond the last published update of the Application.</p>
                
                <h4>5. NO LIABILITY FOR CLINICAL OUTCOMES</h4>
                <p>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, THE CREATORS, DEVELOPERS, CONTRIBUTORS, AND ANY AFFILIATED PARTIES, INCLUDING BUT NOT LIMITED TO ANY HOSPITALS, HEALTHCARE SYSTEMS, EDUCATIONAL INSTITUTIONS, OR PROFESSIONAL ORGANIZATIONS ASSOCIATED WITH THE DEVELOPMENT, PUBLICATION, OR DISTRIBUTION OF THE APPLICATION, EXPLICITLY DISCLAIM ANY RESPONSIBILITY OR LIABILITY FOR ANY ADVERSE OUTCOME, HARM TO PATIENTS, MISDIAGNOSIS, TREATMENT ERRORS, OR OTHER CLINICAL DECISIONS RESULTING FROM THE USE OF THIS APPLICATION OR ANY INFORMATION IT PROVIDES.</p>
                
                <p>THE CREATORS, DEVELOPERS, CONTRIBUTORS, AND ANY AFFILIATED PARTIES WILL NOT BE LIABLE FOR ANY DAMAGES OR CLAIMS, INCLUDING BUT NOT LIMITED TO, DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OF ANY KIND ARISING FROM OR IN CONNECTION WITH ANY USE OF, INABILITY TO USE, RELIANCE ON, OR ERRORS OR OMISSIONS IN THE INFORMATION, CONTENT, MATERIALS, OR CALCULATIONS INCLUDED IN OR ACCESSIBLE THROUGH THIS APPLICATION.</p>
                
                <h4>6. PROFESSIONAL REQUIREMENTS AND LICENSURE</h4>
                <p>Users of the Application are responsible for complying with all professional requirements, standards, regulations, and laws applicable to their professional practice, including licensure requirements, standards of care, and professional ethics.</p>
                
                <p>By using this Application, you represent and warrant that you are a qualified healthcare professional with appropriate education, training, and licensure to interpret and apply the information provided by the Application in your clinical practice and in the jurisdiction in which you practice.</p>
                
                <p>The use of this Application does not substitute for or fulfill any continuing education requirements, certification, or recertification requirements that may apply to healthcare professionals under applicable laws or professional regulations.</p>
                
                <h4>7. THIRD-PARTY CONTENT AND LINKS</h4>
                <p>The Application may include references to third-party content, such as clinical practice guidelines, research studies, or links to external resources. These references or links are provided for informational purposes only and do not constitute an endorsement of the third-party content or resources.</p>
                
                <p>The creators of the Application have no control over the content, accuracy, or availability of third-party resources and disclaim any responsibility for any information, products, or services offered by third parties.</p>
                
                <h4>8. INTELLECTUAL PROPERTY PROTECTION</h4>
                <p>The algorithms, medical information, clinical recommendations, and all content provided by this Application are protected by intellectual property laws. The Application may incorporate proprietary algorithms and data processing methods that are the exclusive property of the creators. No part of this Application may be reproduced, distributed, or transmitted in any form or by any means without the prior written permission of the creators.</p>
                
                <h4>9. JURISDICTIONAL LIMITATIONS</h4>
                <p>The Application incorporates clinical guidelines and recommendations that may be specific to Canada and may not be applicable in other jurisdictions. Healthcare professionals practicing outside of Canada should consult guidelines applicable to their jurisdiction.</p>
                
                <p>The medication recommendations, particularly those related to coverage criteria for PCSK9 inhibitors, are based on British Columbia PharmaCare Special Authority criteria and may not be applicable to other provinces, territories, or countries.</p>
                
                <h4>10. ACKNOWLEDGMENT</h4>
                <p>By accepting this disclaimer, you acknowledge that you have read, understood, and agree to be bound by all of the terms set forth herein. You acknowledge that you understand the Application's limitations and agree to exercise appropriate professional judgment when using it in clinical practice.</p>
                
                <p>You further acknowledge that you will not rely solely on the information provided by the Application for any clinical decision and that you will independently verify any information that may affect patient care.</p>
            </div>
        `;
    }
    
    /**
     * Returns HTML content for the data privacy disclaimer with enhanced protections
     * @returns {string} HTML content
     * @private
     */
    _getDataPrivacyDisclaimerContent() {
        return `
            <div class="disclaimer-section">
                <h3>DATA PRIVACY AND SECURITY NOTICE</h3>
                <p><strong>Last Updated:</strong> ${this.disclaimerVersions.dataPrivacy.lastUpdated}</p>
                <p><strong>Version:</strong> ${this.disclaimerVersions.dataPrivacy.version}</p>
                
                <h4>1. DATA PROCESSING INFORMATION</h4>
                <p>The Enhanced CVD Risk Toolkit (the "Application") is designed to process data locally within your browser. The Application does not transmit patient data to external servers except where explicitly indicated (such as when validating calculations against official APIs or when integrating with electronic medical record systems).</p>
                
                <h4>2. DATA COLLECTION AND STORAGE</h4>
                <p>The Application may temporarily store data in your browser's local storage or session storage for the purposes of cross-tab synchronization, saving form state, and recording your preferences. This data remains on your device and is not accessible to the Application's creators or any third parties.</p>
                
                <p>Any data entered into the Application is stored exclusively on the device being used and is not transmitted to or stored on any external servers, except when explicitly initiating optional features that require data transmission.</p>
                
                <p>If you choose to enable optional features that involve data transmission (such as EMR integration), additional consent will be requested, and clear information about data transmission will be provided before any transmission occurs.</p>
                
                <h4>3. PATIENT PRIVACY AND CONFIDENTIALITY</h4>
                <p>As a healthcare professional using this Application, you remain solely responsible for protecting patient privacy and maintaining confidentiality in accordance with applicable laws, regulations, and professional standards, including but not limited to:</p>
                
                <ul>
                    <li>In Canada: Personal Information Protection and Electronic Documents Act (PIPEDA), provincial health information protection acts such as the Personal Health Information Protection Act (PHIPA) in Ontario, the Personal Information Protection Act (PIPA) in British Columbia and Alberta, or the Act respecting the protection of personal information in the private sector in Quebec;</li>
                    <li>In the United States: Health Insurance Portability and Accountability Act (HIPAA);</li>
                    <li>In the European Economic Area, UK and Switzerland: General Data Protection Regulation (GDPR) and UK GDPR;</li>
                    <li>Any other applicable data protection laws in your jurisdiction.</li>
                </ul>
                
                <p>It is your responsibility to ensure that your use of the Application complies with your legal and ethical obligations to protect patient privacy, including obtaining any necessary patient consent before entering their information into the Application.</p>
                
                <p>YOU ACKNOWLEDGE THAT THE CREATORS OF THIS APPLICATION HAVE NO ABILITY TO MONITOR OR CONTROL THE DATA YOU ENTER INTO THE APPLICATION AND THEREFORE HAVE NO LIABILITY FOR ANY BREACH OF PATIENT CONFIDENTIALITY OR PRIVACY THAT MAY RESULT FROM YOUR USE OF THE APPLICATION.</p>
                
                <h4>4. SECURITY MEASURES</h4>
                <p>The Application implements reasonable security measures, including data validation, sanitization of inputs, and secure transmission of data when external connections are used. These measures include:</p>
                
                <ul>
                    <li>Input sanitization to prevent cross-site scripting (XSS) attacks;</li>
                    <li>Content Security Policy (CSP) implementation to mitigate various types of attacks;</li>
                    <li>HTTPS encryption for any data that may be transmitted;</li>
                    <li>Secure storage mechanisms for any locally stored data;</li>
                    <li>Regular security audits and updates.</li>
                </ul>
                
                <p>However, no method of electronic storage or transmission is 100% secure, and the creators cannot guarantee absolute security.</p>
                
                <p>YOU ACKNOWLEDGE THAT ELECTRONIC COMMUNICATIONS AND DATABASES ARE SUBJECT TO SECURITY BREACHES, TECHNICAL MALFUNCTIONS, AND HUMAN ERROR, AND THAT THE CREATORS, DEVELOPERS, CONTRIBUTORS, AND ANY AFFILIATED PARTIES CANNOT GUARANTEE ABSOLUTE SECURITY OF DATA, WHETHER STORED LOCALLY OR TRANSMITTED.</p>
                
                <h4>5. DATA MINIMIZATION AND ANONYMIZATION</h4>
                <p>The Application is designed to collect and process only the minimum amount of data necessary to perform its intended functions. Users are strongly encouraged to anonymize or de-identify patient data before entering it into the Application whenever possible.</p>
                
                <p>THE CREATORS RECOMMEND THAT YOU DO NOT ENTER FULL PATIENT NAMES, IDENTIFICATION NUMBERS, OR OTHER DIRECT IDENTIFIERS INTO THE APPLICATION. INSTEAD, USE ANONYMIZED IDENTIFIERS OR REFERENCE NUMBERS THAT CANNOT BE LINKED BACK TO INDIVIDUAL PATIENTS EXCEPT THROUGH A SEPARATE, SECURE SYSTEM UNDER YOUR CONTROL.</p>
                
                <h4>6. DATA EXPORT AND SHARING</h4>
                <p>The Application provides features to export calculation results in various formats (PDF, CSV). Once data is exported from the Application, you are solely responsible for the security and appropriate handling of that data.</p>
                
                <p>If you choose to share exported data with patients, colleagues, or other third parties, you must ensure that such sharing complies with all applicable privacy laws and regulations.</p>
                
                <p>THE CREATORS HAVE NO CONTROL OVER AND ASSUME NO RESPONSIBILITY FOR HOW YOU USE, STORE, OR DISTRIBUTE ANY DATA EXPORTED FROM THE APPLICATION.</p>
                
                <h4>7. COOKIES AND TRACKING</h4>
                <p>The Application may use cookies or similar technologies for essential functionality, such as maintaining session state or remembering your preferences. The Application does not use cookies or other tracking mechanisms for advertising, analytics, or tracking purposes.</p>
                
                <p>The Application does not contain any third-party analytics, tracking scripts, or social media integration that could potentially compromise user privacy.</p>
                
                <h4>8. THIRD-PARTY SERVICES</h4>
                <p>If the Application integrates with third-party services (such as electronic medical record systems or external calculation validation APIs), those services may have their own privacy policies and terms of use. You are encouraged to review those policies before using such features.</p>
                
                <p>The creators do not endorse and are not responsible for the privacy practices or content of any third-party services that may be integrated with the Application.</p>
                
                <h4>9. DATA BREACH NOTIFICATION</h4>
                <p>In the unlikely event of a security breach affecting the Application that could compromise user data, the creators will make reasonable efforts to notify affected users as promptly as possible and in accordance with applicable laws.</p>
                
                <p>However, since the Application processes data locally on your device, most potential security vulnerabilities would need to be exploited at the device or browser level, which may be outside the creators' control.</p>
                
                <h4>10. CHANGES TO THIS PRIVACY NOTICE</h4>
                <p>This Privacy Notice may be updated from time to time. You will be notified of any significant changes when you next use the Application after such changes have been made.</p>
                
                <p>It is your responsibility to review this Privacy Notice periodically to stay informed about our data practices.</p>
                
                <h4>11. CONTACT INFORMATION</h4>
                <p>If you have questions or concerns about this Privacy Notice or the data practices of the Application, please contact the developers through the provided contact information.</p>
                
                <h4>12. LEGAL BASIS FOR PROCESSING (WHERE APPLICABLE)</h4>
                <p>If you are located in a jurisdiction where laws such as the GDPR apply, the legal basis for processing data through this Application is:</p>
                
                <ul>
                    <li>Consent: You have given clear consent to process personal data for the specific purpose of using this Application.</li>
                    <li>Contract: Processing is necessary for the performance of a contract with you or to take steps at your request before entering into a contract.</li>
                    <li>Legal obligation: Processing is necessary for compliance with a legal obligation to which you are subject.</li>
                    <li>Legitimate interests: Processing is necessary for the legitimate interests pursued by you as a healthcare professional or by a third party (such as your patient), except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject.</li>
                </ul>
            </div>
        `;
    }
    
    /**
     * Returns HTML content for additional medication recommendations disclaimer
     * @returns {string} HTML content
     * @private
     */
    _getMedicationDisclaimerContent() {
        return `
            <div class="disclaimer-section">
                <h3>MEDICATION RECOMMENDATIONS DISCLAIMER</h3>
                <p><strong>Last Updated:</strong> ${this.disclaimerVersions.clinical.lastUpdated}</p>
                <p><strong>Version:</strong> ${this.disclaimerVersions.clinical.version}</p>
                
                <div class="disclaimer-alert">
                    <strong>IMPORTANT:</strong> This disclaimer specifically addresses the medication recommendations provided by the Application.
                </div>
                
                <h4>1. MEDICATION RECOMMENDATIONS LIMITATIONS</h4>
                <p>The medication recommendations provided by this Application are generated based on guidelines from the Canadian Cardiovascular Society (CCS) for the Management of Dyslipidemia, and are intended to serve as general guidance only. These recommendations:</p>
                
                <ul>
                    <li>Do not account for all possible individual patient factors such as allergies, contraindications, drug-drug interactions, comorbidities, or individual patient preferences;</li>
                    <li>May not reflect the most current guidelines or evidence as medical knowledge evolves;</li>
                    <li>Are not a substitute for a qualified healthcare professional's clinical judgment;</li>
                    <li>Do not constitute medical advice, prescription, or treatment recommendations;</li>
                    <li>Are not intended to be the sole basis for any specific treatment decision.</li>
                </ul>
                
                <h4>2. PRESCRIBING RESPONSIBILITY</h4>
                <p>The healthcare professional using this Application bears full and sole responsibility for any prescribing decisions made based on the Application's recommendations. Before prescribing any medication suggested by this Application, the healthcare professional must:</p>
                
                <ul>
                    <li>Verify the appropriateness of the medication for the specific patient;</li>
                    <li>Check for potential contraindications, allergies, and drug interactions;</li>
                    <li>Review the complete prescribing information for the medication;</li>
                    <li>Consider the patient's complete medical history, current condition, and preferences;</li>
                    <li>Exercise independent medical judgment regarding the appropriateness of the medication.</li>
                </ul>
                
                <p>THE APPLICATION DOES NOT INDEPENDENTLY VERIFY OR CHECK FOR DRUG ALLERGIES, CONTRAINDICATIONS, OR INTERACTIONS WITH OTHER MEDICATIONS THE PATIENT MAY BE TAKING.</p>
                
                <h4>3. MEDICATION DOSING CONSIDERATIONS</h4>
                <p>When medication dosages are mentioned in the Application:</p>
                
                <ul>
                    <li>These are suggested standard dosages based on general guidelines and may not be appropriate for all patients;</li>
                    <li>Dosages may need to be adjusted based on individual patient factors such as age, weight, renal function, hepatic function, or other clinical considerations;</li>
                    <li>The healthcare professional bears sole responsibility for determining the appropriate dosage for each individual patient.</li>
                </ul>
                
                <h4>4. MEDICATION COVERAGE AND COST CONSIDERATIONS</h4>
                <p>While the Application may include information about medication coverage criteria, such as those for BC PharmaCare:</p>
                
                <ul>
                    <li>Coverage criteria and formularies change over time and may not be current;</li>
                    <li>Coverage varies by jurisdiction, insurance plan, and individual patient factors;</li>
                    <li>The Application cannot account for the specific insurance coverage or financial situation of individual patients;</li>
                    <li>Healthcare professionals should verify current coverage criteria with the relevant payer before initiating coverage applications or prescribing medications based on assumed coverage.</li>
                </ul>
                
                <h4>5. EMERGING MEDICATIONS AND THERAPIES</h4>
                <p>The field of cardiovascular risk management is continually evolving, with new medications and therapies emerging regularly. The Application may not include the most recently approved medications or therapeutic approaches. Healthcare professionals should consult current literature and guidelines for information on the latest treatment options.</p>
                
                <h4>6. PHARMACEUTICAL MANUFACTURER INFORMATION</h4>
                <p>The Application may mention specific medication brand names or manufacturers for informational purposes only. This does not constitute an endorsement of any specific product or manufacturer. The creators of the Application have no financial relationship with any pharmaceutical manufacturer and receive no compensation for mentioning any specific medication or brand.</p>
                
                <h4>7. MEDICATION SAFETY MONITORING</h4>
                <p>The Application does not provide guidance on monitoring for medication side effects, adverse events, or efficacy. Healthcare professionals remain solely responsible for:</p>
                
                <ul>
                    <li>Implementing appropriate monitoring protocols for prescribed medications;</li>
                    <li>Educating patients about potential side effects and when to seek medical attention;</li>
                    <li>Monitoring treatment efficacy and making adjustments as needed;</li>
                    <li>Reporting adverse events to appropriate regulatory authorities.</li>
                </ul>
                
                <h4>8. NO LIABILITY FOR MEDICATION-RELATED OUTCOMES</h4>
                <p>THE CREATORS, DEVELOPERS, CONTRIBUTORS, AND ANY AFFILIATED PARTIES EXPLICITLY DISCLAIM ANY RESPONSIBILITY OR LIABILITY FOR ANY ADVERSE OUTCOMES, HARM TO PATIENTS, TREATMENT ERRORS, OR OTHER NEGATIVE CONSEQUENCES RESULTING FROM MEDICATION CHOICES OR PRESCRIBING DECISIONS MADE IN CONNECTION WITH THE USE OF THIS APPLICATION.</p>
                
                <h4>9. ACKNOWLEDGMENT</h4>
                <p>By accepting this disclaimer, you acknowledge that you have read, understood, and agree to be bound by all of the terms set forth herein. You acknowledge that you understand the inherent limitations of algorithmically generated medication recommendations and agree to exercise appropriate professional judgment when using the Application's recommendations in your clinical practice.</p>
            </div>
        `;
    }
    
    /**
     * Returns HTML content for Canadian-specific calculator disclaimer
     * @returns {string} HTML content
     * @private
     */
    _getCanadianCalculatorDisclaimerContent() {
        return `
            <div class="disclaimer-section">
                <h3>CANADIAN CARDIOVASCULAR RISK CALCULATOR DISCLAIMER</h3>
                <p><strong>Last Updated:</strong> ${this.disclaimerVersions.clinical.lastUpdated}</p>
                <p><strong>Version:</strong> ${this.disclaimerVersions.clinical.version}</p>
                
                <div class="disclaimer-alert">
                    <strong>IMPORTANT:</strong> This disclaimer specifically addresses the Canadian aspects of the cardiovascular risk calculators provided by the Application.
                </div>
                
                <h4>1. CANADIAN GUIDELINES IMPLEMENTATION</h4>
                <p>This Application implements risk assessment and management recommendations based on the 2021 Canadian Cardiovascular Society Guidelines for the Management of Dyslipidemia for the Prevention of Cardiovascular Disease in the Adult. While we strive for accuracy in implementing these guidelines, the Application:</p>
                
                <ul>
                    <li>May not capture all nuances and exceptions detailed in the full guidelines;</li>
                    <li>May not reflect updates or changes to the guidelines that occurred after the Application's last update;</li>
                    <li>Should not be considered an official implementation or representation of the Canadian Cardiovascular Society guidelines;</li>
                    <li>Has not been endorsed by the Canadian Cardiovascular Society or any provincial regulatory college or medical association.</li>
                </ul>
                
                <h4>2. POPULATION CONSIDERATIONS</h4>
                <p>The risk calculators and algorithms implemented in this Application, including the Framingham Risk Score and QRISK3, were developed using specific population cohorts that may not fully represent the diverse Canadian population. In particular:</p>
                
                <ul>
                    <li>The Framingham Risk Score was developed primarily using data from a white, suburban U.S. population;</li>
                    <li>The QRISK3 calculator was developed using data from the UK population;</li>
                    <li>These calculators may not accurately predict risk in specific Canadian population groups, including but not limited to Indigenous peoples, recent immigrants, and certain ethnic minorities;</li>
                    <li>Healthcare professionals should consider these limitations when applying risk calculations to specific patient populations.</li>
                </ul>
                
                <h4>3. PROVINCIAL HEALTHCARE DIFFERENCES</h4>
                <p>Healthcare delivery, medication coverage, and clinical practice may vary significantly across Canadian provinces and territories. The Application:</p>
                
                <ul>
                    <li>Incorporates BC PharmaCare Special Authority criteria for PCSK9 inhibitors, which may not apply to other provinces or territories;</li>
                    <li>Does not account for provincial variations in medication formularies, coverage criteria, or availability;</li>
                    <li>Does not account for province-specific clinical practice guidelines that may differ from the national CCS guidelines;</li>
                    <li>Should be used with consideration of the specific healthcare context of your province or territory.</li>
                </ul>
                
                <h4>4. REGULATORY COMPLIANCE</h4>
                <p>This Application:</p>
                
                <ul>
                    <li>Is not a licensed medical device under Health Canada regulations;</li>
                    <li>Has not undergone review or approval by Health Canada as a medical device;</li>
                    <li>Does not make therapeutic claims or diagnoses;</li>
                    <li>Is intended solely as a calculation tool to support healthcare professional decision-making.</li>
                </ul>
                
                <p>Healthcare professionals using this Application remain solely responsible for ensuring their practice complies with all applicable provincial and federal regulations, including those of their provincial regulatory college.</p>
                
                <h4>5. PROFESSIONAL STANDARDS AND SCOPE OF PRACTICE</h4>
                <p>This Application is designed for use by healthcare professionals within their authorized scope of practice as defined by their provincial regulatory college. By using this Application, you represent that:</p>
                
                <ul>
                    <li>You are licensed and in good standing with your provincial regulatory college;</li>
                    <li>You are using the Application within your authorized scope of practice;</li>
                    <li>Your use of the Application complies with all applicable standards of practice and ethical guidelines established by your regulatory college;</li>
                    <li>You understand that the Application does not expand your scope of practice beyond what is authorized by your regulatory college.</li>
                </ul>
                
                <h4>6. NO LIABILITY FOR REGIONAL GUIDELINE VARIATIONS</h4>
                <p>THE CREATORS, DEVELOPERS, CONTRIBUTORS, AND ANY AFFILIATED PARTIES EXPLICITLY DISCLAIM ANY RESPONSIBILITY OR LIABILITY FOR ANY DISCREPANCIES BETWEEN THE APPLICATION'S IMPLEMENTATIONS OF GUIDELINES AND ANY PROVINCIAL, TERRITORIAL, OR LOCAL CLINICAL PRACTICE GUIDELINES THAT MAY DIFFER FROM THE CANADIAN CARDIOVASCULAR SOCIETY GUIDELINES.</p>
                
                <h4>7. ACKNOWLEDGMENT</h4>
                <p>By accepting this disclaimer, you acknowledge that you have read, understood, and agree to be bound by all of the terms set forth herein. You acknowledge that you understand the Canadian-specific limitations of the Application and agree to exercise appropriate professional judgment when using the Application in your clinical practice within the Canadian healthcare context.</p>
            </div>
        `;
    }
    }
}

// Export singleton instance
const LegalDisclaimers = new LegalDisclaimerManager();
export default LegalDisclaimers;

/**
 * Adds disclaimer components to the application
 * @file /js/components/disclaimer-components.js
 */
export const initializeDisclaimerComponents = () => {
    // Add disclaimer alert to the application
    const addDisclaimerAlert = () => {
        const disclaimerAlert = document.createElement('div');
        disclaimerAlert.className = 'disclaimer-alert';
        disclaimerAlert.id = 'disclaimer-alert';
        disclaimerAlert.innerHTML = `
            <div class="alert alert-warning">
                <p><strong>Medical Disclaimer:</strong> This tool is intended for use by healthcare professionals only as a supplementary aid in cardiovascular risk assessment and management. The results provided are based on epidemiological data and should not replace clinical judgment. Individual patient factors may not be fully captured by these risk algorithms.</p>
                <p>Treatment recommendations are based on the most recent clinical guidelines for the management of dyslipidemia for the prevention of cardiovascular disease. These guidelines may change over time, and users should refer to the most current recommendations.</p>
                <p>By using this application, you acknowledge that you have read and agreed to the <a href="#" id="show-clinical-disclaimer" class="disclaimer-link">Clinical Use Disclaimer</a> and <a href="#" id="show-terms" class="disclaimer-link">Terms of Use</a>.</p>
                <button class="alert-close" aria-label="Close disclaimer">×</button>
            </div>
        `;
        
        // Check if disclaimer section exists
        const disclaimerSection = document.querySelector('.tool-description');
        if (disclaimerSection) {
            // Replace existing disclaimer alert if it exists
            const existingAlert = disclaimerSection.querySelector('.alert');
            if (existingAlert) {
                existingAlert.parentNode.replaceChild(disclaimerAlert, existingAlert);
            } else {
                // Otherwise append to the disclaimer section
                disclaimerSection.appendChild(disclaimerAlert);
            }
        } else {
            // If no disclaimer section, add to the main content
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.insertBefore(disclaimerAlert, mainContent.firstChild);
            }
        }
    };
    
    // Add disclaimer footer
    const addDisclaimerFooter = () => {
        const disclaimerFooter = document.createElement('div');
        disclaimerFooter.className = 'footer-disclaimers';
        disclaimerFooter.innerHTML = `
            <p>This application should be used only as a supplementary tool to support clinical decision-making. Always exercise professional judgment when interpreting results.</p>
            <div class="footer-links">
                <a href="#" id="show-terms">Terms of Use</a>
                <a href="#" id="show-clinical-disclaimer">Clinical Disclaimer</a>
                <a href="#" id="show-privacy">Privacy Notice</a>
            </div>
        `;
        
        // Add to footer if it exists
        const footerInfo = document.querySelector('.footer-info');
        if (footerInfo) {
            footerInfo.appendChild(disclaimerFooter);
        }
    };
    
    // Add disclaimer references
    const addDisclaimerReferences = () => {
        // Add references to all results sections
        const resultsContainers = document.querySelectorAll('.results-container');
        resultsContainers.forEach(container => {
            const referenceDiv = document.createElement('div');
            referenceDiv.className = 'results-disclaimer';
            referenceDiv.innerHTML = `
                <p><small>The calculations and recommendations provided are based on statistical models and clinical guidelines. They should be interpreted in context with the patient's overall clinical picture. <span class="disclaimer-reference" data-disclaimer-type="clinical">See Clinical Disclaimer</span></small></p>
            `;
            container.appendChild(referenceDiv);
        });
        
        // Add references to medication recommendations
        const medicationPanels = document.querySelectorAll('.medication-panel, .treatment-recommendations');
        medicationPanels.forEach(panel => {
            const referenceDiv = document.createElement('div');
            referenceDiv.className = 'medication-disclaimer';
            referenceDiv.innerHTML = `
                <p><small>Medication recommendations are for reference only and do not replace clinical judgment. Consider individual patient factors, contraindications, and current prescribing information. <span class="disclaimer-reference" data-disclaimer-type="clinical">See Clinical Disclaimer</span></small></p>
            `;
            panel.appendChild(referenceDiv);
        });
    };
    
    // Initialize all disclaimer components
    document.addEventListener('DOMContentLoaded', () => {
        addDisclaimerAlert();
        addDisclaimerFooter();
        addDisclaimerReferences();
        
        // Initialize the disclaimer manager
        LegalDisclaimers.initialize();
    });
};
