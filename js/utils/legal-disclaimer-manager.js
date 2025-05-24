/**
 * Legal Disclaimer Manager
 * @file /js/utils/legal-disclaimer-manager.js
 * @description Manages all legal disclaimers, consent, and compliance logging.
 * Fuses functionalities from enhanced-disclaimer.js and legal-disclaimer-module.js.
 * Provides region-specific content (Canada, USA, Europe) and addresses data privacy
 * compliance concepts (HIPAA, PIPEDA, GDPR).
 * @version 3.0.0
 * @exports LegalDisclaimerManager
 */

'use strict';

// Dependencies are expected to be available on window or injected.
// E.g., ErrorLogger, EventBus, CryptoService (if encrypting logs), PDFService (for report export).

class LegalDisclaimerManager {
    /**
     * Creates or returns the singleton instance of LegalDisclaimerManager.
     * @param {object} [options={}] - Configuration options.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (LegalDisclaimerManager.instance && !options.forceNewInstance) {
            return LegalDisclaimerManager.instance;
        }

        this.options = {
            defaultLanguage: 'en',
            supportedLanguages: ['en', 'fr', 'es'], // Example
            modalIdBase: 'legal-disclaimer-modal',
            storageKeyPrefix: 'cvd_toolkit_legal_',
            acceptanceSuffix: '_acceptance',
            complianceLogSuffix: '_compliance_log',
            complianceReportingEnabled: true,
            complianceEndpoint: null, // URL to send compliance logs
            complianceLogMaxEntries: 50, // Send report when log reaches this size
            anonymizedReporting: false, // If true, strips identifiable info from compliance logs sent to server
            blockAppUntilAccepted: ['clinical'], // Array of disclaimer keys that must be accepted
            autoDetectRegion: true,
            defaultRegion: 'default', // 'default', 'CA', 'US', 'EU'
            geoApiUrl: 'https://api.ipgeolocation.io/ipgeo',
            geoApiKey: '4bb974362542440a97cb782274bfb8d6', // User-provided API key [cite: uploaded:enhanced-disclaimer.js]
            geoApiTimeout: 3000,
            regionStorageKeySuffix: '_region',
            languageStorageKeySuffix: '_language',
            focusTrapEnabled: true,
            animationDuration: 300, // ms for modal transitions
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger('ErrorLogger'),
            EventBus: window.EventBus,
            CryptoService: window.CryptoServiceInstance,
            PDFService: window.PDFServiceInstance,
            InputSanitizer: window.InputSanitizerServiceInstance, // Expecting instance
            HelperFunctions: window.HelperFunctions || { deepMerge: this._deepMergeFallback.bind(this), generateUUID: () => `uuid-${Date.now()}-${Math.random().toString(36).substring(2,9)}` },
            ...options.dependencies,
        };

        // Disclaimer content and versions (fused from legal-disclaimer-module.js)
        this.disclaimerDefinitions = {
            general: { version: '3.1.2', lastUpdated: '2025-05-01', titleKey: 'generalTermsTitle', contentFn: '_getGeneralDisclaimerContent' },
            clinical: { version: '2.4.0', lastUpdated: '2025-04-15', titleKey: 'clinicalUseTitle', contentFn: '_getClinicalDisclaimerContent' },
            dataPrivacy: { version: '3.0.1', lastUpdated: '2025-03-10', titleKey: 'dataPrivacyTitle', contentFn: '_getDataPrivacyDisclaimerContent' },
            medication: { version: '1.0.0', lastUpdated: '2025-05-23', titleKey: 'medicationRecTitle', contentFn: '_getMedicationDisclaimerContent' },
            canadianSpecifics: { version: '1.0.0', lastUpdated: '2025-05-23', titleKey: 'canadianCalcTitle', contentFn: '_getCanadianCalculatorDisclaimerContent' },
            pcsk9: { version: '1.0.0', lastUpdated: '2025-05-23', titleKey: 'pcsk9Title', contentFn: '_getPCSK9DisclaimerContent' },
        };

        this.translations = { // Base translations, can be extended/overridden
            en: {
                generalTermsTitle: "General Terms of Use",
                clinicalUseTitle: "Clinical Use Disclaimer",
                dataPrivacyTitle: "Data Privacy and Security Notice",
                medicationRecTitle: "Medication Recommendations Disclaimer",
                canadianCalcTitle: "Canadian Cardiovascular Risk Calculator Disclaimer",
                pcsk9Title: "PCSK9 Inhibitor Recommendations Disclaimer",
                acceptButton: "Accept & Continue",
                declineButton: "Decline",
                acknowledgeCheckbox: "I acknowledge that I have read, understood, and agree to the above.",
                closeButtonLabel: "Close",
                languageSelectorLabel: "Language:",
                complianceReportTitle: "Disclaimer Compliance Log",
                appRestrictedTitle: "Application Use Restricted",
                appRestrictedMessage: "You must accept the required terms of use to use this application. This application is intended for use by qualified healthcare professionals only.",
                reconsiderButton: "Review Terms",
                exitButton: "Exit Application",
                refreshButton: "Refresh Page"
            },
            fr: { // Example French translations
                generalTermsTitle: "Conditions Générales d'Utilisation",
                clinicalUseTitle: "Avis de Non-Responsabilité Clinique",
                dataPrivacyTitle: "Avis de Confidentialité et Sécurité des Données",
                acceptButton: "Accepter et Continuer",
                declineButton: "Refuser",
                acknowledgeCheckbox: "Je reconnais avoir lu, compris et accepté les termes ci-dessus.",
                languageSelectorLabel: "Langue :",
                // ... other French translations
            },
            es: { // Example Spanish translations
                generalTermsTitle: "Términos Generales de Uso",
                clinicalUseTitle: "Descargo de Responsabilidad Clínica",
                dataPrivacyTitle: "Aviso de Privacidad y Seguridad de Datos",
                acceptButton: "Aceptar y Continuar",
                declineButton: "Rechazar",
                acknowledgeCheckbox: "Reconozco que he leído, entendido y acepto los términos anteriores.",
                languageSelectorLabel: "Idioma:",
                // ... other Spanish translations
            }
        };

        this.acceptedDisclaimers = {};
        this._currentLanguage = this.options.defaultLanguage;
        this._currentRegion = this.options.defaultRegion;
        this._complianceLog = [];
        this.activeModalInstance = null;

        this._loadAcceptedDisclaimers();
        this._loadComplianceLog();
        this.initPromise = this._initialize();

        LegalDisclaimerManager.instance = this;
        this._log('info', 'LegalDisclaimerManager Initialized (v3.0.0).');
    }

    _getFallbackLogger(serviceName) {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`${serviceName} Fallback [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => (console[lvl] || console.log)(`${serviceName} Fallback [${lvl}]: ${msg}`, data)
        };
    }
    _log(level, message, data = {}) { this.dependencies.ErrorLogger.log?.(level, `LegalDisclaimerMgr: ${message}`, data); }
    _handleError(error, context, additionalData = {}) {
        const msg = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(msg, `LegalDisclaimerMgr-${context}`, 'error', { originalError: error, ...additionalData });
    }
    _deepMergeFallback(target, ...sources) {
        if (!sources.length) return target; const source = sources.shift();
        if (typeof target === 'object' && target !== null && typeof source === 'object' && source !== null) {
            for (const key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) { this._deepMergeFallback(target[key], source[key]); }
                else if (source[key] !== undefined) { target[key] = source[key]; }
            }}
        } return this._deepMergeFallback(target, ...sources);
    }

    async _initialize() {
        if (this.options.autoDetectLanguage && !this.options.language) {
            this._currentLanguage = this._detectBrowserLanguage();
        }
        // TODO: Implement _loadExternalTranslations if needed
        // await this._loadExternalTranslations(this._currentLanguage);

        if (this.options.autoDetectRegion && !this.options.region) {
            this._currentRegion = await this._determineRegion();
        }
        this._setStorageItem(this.options.languageStorageKeySuffix, this._currentLanguage);
        this._setStorageItem(this.options.regionStorageKeySuffix, this._currentRegion);

        this._log('info', `Determined Region: ${this._currentRegion}, Language: ${this._currentLanguage}`);
        this._checkRequiredDisclaimers();
        this._attachGlobalDisclaimerEventListeners();
        this.dependencies.EventBus?.publish('legalDisclaimerManager:initialized', this.getCurrentState());
    }

    _getStorageItem(keySuffix) {
        const key = `${this.options.storageKeyPrefix}${keySuffix}`;
        try { return window.localStorage.getItem(key); }
        catch (e) { this._log('error', `Error getting from localStorage: ${key}`, e); return null; }
    }
    _setStorageItem(keySuffix, value) {
        const key = `${this.options.storageKeyPrefix}${keySuffix}`;
        try { window.localStorage.setItem(key, value); }
        catch (e) { this._log('error', `Error setting to localStorage: ${key}`, e); }
    }
    _removeStorageItem(keySuffix) {
        const key = `${this.options.storageKeyPrefix}${keySuffix}`;
        try { window.localStorage.removeItem(key); }
        catch (e) { this._log('error', `Error removing from localStorage: ${key}`, e); }
    }
    _getAcceptanceStorageKey(disclaimerKey, version) {
        return `${disclaimerKey}${this.options.acceptanceSuffix}_v${version}`;
    }

    async showDisclaimer(disclaimerKey, callbackOnClose = null, forceShow = false) {
        await this.initPromise;
        const definition = this.disclaimerDefinitions[disclaimerKey];
        if (!definition) { this._handleError(new Error(`Disclaimer definition for key "${disclaimerKey}" not found.`), 'ShowDisclaimer'); return; }
        if (!forceShow && this.isDisclaimerAccepted(disclaimerKey, definition.version)) {
            this._log('info', `Disclaimer "${disclaimerKey}" v${definition.version} already accepted. Not showing.`);
            callbackOnClose?.(true); return;
        }
        if (this.activeModalInstance) { this._log('warn', `Modal for "${this.activeModalInstance.dataset.disclaimerKey}" already active. Ignoring show request for "${disclaimerKey}".`); return; }
        this._logComplianceEvent('shown', { disclaimerKey, version: definition.version });
        this._createAndShowModal(disclaimerKey, definition, callbackOnClose);
    }

    isDisclaimerAccepted(disclaimerKey, version) {
        const definition = this.disclaimerDefinitions[disclaimerKey];
        const targetVersion = version || definition?.version;
        if (!definition || !targetVersion) return false;
        const storageKey = this._getAcceptanceStorageKey(disclaimerKey, targetVersion);
        const rawData = this._getStorageItem(storageKey);
        if (!rawData) return false;
        try {
            const acceptanceData = JSON.parse(rawData);
            return acceptanceData?.version === targetVersion && acceptanceData.accepted === true;
        } catch (e) { this._log('error', `Error reading acceptance for "${disclaimerKey}" v${targetVersion}.`, e); return false; }
    }

    resetAcceptance(disclaimerKey, version) { /* ... (same as previous version) ... */
        const definition = this.disclaimerDefinitions[disclaimerKey]; const targetVersion = version || definition?.version; if (!definition || !targetVersion) return;
        const storageKey = this._getAcceptanceStorageKey(disclaimerKey, targetVersion); this._removeStorageItem(storageKey);
        if (this.acceptedDisclaimers[disclaimerKey]?.version === targetVersion) delete this.acceptedDisclaimers[disclaimerKey];
        this._logComplianceEvent('acceptance_reset', { disclaimerKey, version: targetVersion });
        this.dependencies.EventBus?.publish(`disclaimer:${disclaimerKey}:acceptanceReset`, this.getCurrentState(disclaimerKey));
        this._log('info', `Acceptance reset for "${disclaimerKey}" v${targetVersion}.`);
        if (this.options.blockAppUntilAccepted.includes(disclaimerKey)) { this.showDisclaimer(disclaimerKey, null, true); }
    }

    getDisclaimerContentForType(disclaimerKey) {
        const definition = this.disclaimerDefinitions[disclaimerKey];
        if (!definition || typeof this[definition.contentFn] !== 'function') {
            this._log('warn', `No content definition or function for disclaimer key: ${disclaimerKey}`);
            return null;
        }
        const title = this._getTranslation(definition.titleKey, this._currentLanguage);
        const rawHtmlContent = this[definition.contentFn](this._currentRegion, this._currentLanguage);
        return { title, content: rawHtmlContent, version: definition.version, lastUpdated: definition.lastUpdated, key: disclaimerKey };
    }

    _createAndShowModal(disclaimerKey, definition, callbackOnClose) {
        const modalId = `${this.options.modalIdBase}-${disclaimerKey.replace(/[^a-zA-Z0-9]/g, '-')}`; // Sanitize key for ID
        let modalElement = document.getElementById(modalId);
        if (modalElement) modalElement.remove();

        const S = this.dependencies.InputSanitizer;
        const titleText = this._getTranslation(definition.titleKey, this._currentLanguage);
        const bodyHtml = this[definition.contentFn](this._currentRegion, this._currentLanguage);

        modalElement = document.createElement('div');
        modalElement.id = modalId;
        this.activeModalInstance = modalElement;
        modalElement.dataset.disclaimerKey = disclaimerKey; // Store for reference

        modalElement.className = 'enhanced-disclaimer-modal';
        modalElement.setAttribute('role', 'dialog');
        modalElement.setAttribute('aria-modal', 'true');
        modalElement.setAttribute('aria-labelledby', `${modalId}-title`);

        const acceptButtonText = this._getTranslation('acceptButton', this._currentLanguage);
        const declineButtonText = this._getTranslation('declineButton', this._currentLanguage);
        const checkboxLabel = this._getTranslation('acknowledgeCheckbox', this._currentLanguage);

        modalElement.innerHTML = `
            <div class="modal-content-wrapper">
                <div class="modal-header">
                    <h3 class="modal-title" id="${modalId}-title">${S ? S.escapeHTML(titleText) : titleText}</h3>
                    ${this._createLanguageSelectorHTML(modalId)}
                </div>
                <div class="modal-body-content">
                    ${S ? S.sanitizeHTML(bodyHtml, { USE_PROFILES: { html: true } }) : bodyHtml}
                </div>
                <div class="modal-checkboxes">
                    <div class="disclaimer-checkbox-item">
                        <input type="checkbox" id="${modalId}-acknowledge-checkbox" name="acknowledge">
                        <label for="${modalId}-acknowledge-checkbox">${S ? S.escapeHTML(checkboxLabel) : checkboxLabel}</label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="secondary-btn" data-disclaimer-decline>${S ? S.escapeHTML(declineButtonText) : declineButtonText}</button>
                    <button type="button" class="primary-btn" data-disclaimer-accept disabled>${S ? S.escapeHTML(acceptButtonText) : acceptButtonText}</button>
                </div>
            </div>`;
        document.body.appendChild(modalElement);
        this._addModalStyles(modalId);

        const acceptBtn = modalElement.querySelector('[data-disclaimer-accept]');
        const declineBtn = modalElement.querySelector('[data-disclaimer-decline]');
        const acknowledgeCheckbox = modalElement.querySelector(`#${modalId}-acknowledge-checkbox`);
        const langSelector = modalElement.querySelector(`#${modalId}-language-selector`);

        acknowledgeCheckbox.addEventListener('change', () => { acceptBtn.disabled = !acknowledgeCheckbox.checked; });
        acceptBtn.addEventListener('click', () => { this._handleAcceptance(disclaimerKey, definition.version); this._closeModal(modalElement, callbackOnClose, true); });
        declineBtn.addEventListener('click', () => {
            this._logComplianceEvent('declined', { disclaimerKey, version: definition.version });
            this._closeModal(modalElement, callbackOnClose, false);
            if (this.options.blockAppUntilAccepted.includes(disclaimerKey)) { this._showApplicationRestrictedMessage(); }
        });
        if (langSelector) {
            langSelector.addEventListener('change', async (e) => {
                await this.setLanguage(e.target.value);
                this._closeModal(modalElement, null, false);
                this.showDisclaimer(disclaimerKey, callbackOnClose, true);
            });
        }
        modalElement.style.display = 'flex';
        setTimeout(() => {
            modalElement.classList.add('show');
            const wrapper = modalElement.querySelector('.modal-content-wrapper');
            if(wrapper) { wrapper.style.opacity = '1'; wrapper.style.transform = 'translateY(0)';}
            if (this.options.focusTrapEnabled) this._updateFocusableElements(modalElement);
        }, 10);
    }

    _closeModal(modalElement, callback, acceptedStatus) { /* ... (same as previous) ... */
        if (!modalElement) return; const wrapper = modalElement.querySelector('.modal-content-wrapper');
        if(wrapper) { wrapper.style.opacity = '0'; wrapper.style.transform = 'translateY(20px)';}
        modalElement.classList.remove('show');
        setTimeout(() => {
            modalElement.remove(); if (this.activeModalInstance === modalElement) { this.activeModalInstance = null; }
            callback?.(acceptedStatus);
        }, this.options.animationDuration);
    }

    _handleAcceptance(disclaimerKey, version) { /* ... (same as previous) ... */
        const storageKey = this._getAcceptanceStorageKey(disclaimerKey, version);
        const acceptanceData = { version, accepted: true, timestamp: new Date().toISOString(), language: this._currentLanguage, region: this._currentRegion, userAgent: navigator.userAgent };
        this._setStorageItem(storageKey, JSON.stringify(acceptanceData));
        this.acceptedDisclaimers[disclaimerKey] = acceptanceData;
        this._logComplianceEvent('accepted', { disclaimerKey, version });
        this.dependencies.EventBus?.publish(`disclaimer:${disclaimerKey}:accepted`, this.getCurrentState(disclaimerKey));
        this._log('info', `Disclaimer "${disclaimerKey}" v${version} accepted.`);
    }

    _createLanguageSelectorHTML(modalId) { /* ... (same as previous) ... */
        if (this.options.supportedLanguages.length <= 1) return ''; const S = this.dependencies.InputSanitizer;
        const langSelectorLabel = this._getTranslation('languageSelectorLabel', this._currentLanguage);
        let selectorHtml = `<div class="language-selector-container"><label for="${modalId}-language-selector">${S ? S.escapeHTML(langSelectorLabel) : langSelectorLabel}</label><select id="${modalId}-language-selector">`;
        this.options.supportedLanguages.forEach(lang => { selectorHtml += `<option value="${lang}" ${lang === this._currentLanguage ? 'selected' : ''}>${this._getLanguageDisplayName(lang)}</option>`; });
        selectorHtml += `</select></div>`; return selectorHtml;
    }
    async setLanguage(languageCode) { /* ... (same as previous) ... */
        if (this.options.supportedLanguages.includes(languageCode) && languageCode !== this._currentLanguage) {
            this._currentLanguage = languageCode; this._setStorageItem(this.options.languageStorageKeySuffix, languageCode);
            this._logComplianceEvent('language_changed', { newLanguage: languageCode });
            this.dependencies.EventBus?.publish('disclaimer:languageChanged', { newLanguage: languageCode });
            this._log('info', `Language changed to ${languageCode}.`); return true;
        } return false;
    }
    _getLanguageDisplayName(langCode){ /* ... (same as previous) ... */ const names = {'en': 'English', 'fr': 'Français', 'es': 'Español'}; return names[langCode] || langCode.toUpperCase(); }

    async _determineRegion() { /* ... (same as previous, ensure S is defined or handled) ... */
        if (!this.options.autoDetectRegion) return this.options.defaultRegion; let detectedCountry = null; const S = this.dependencies.InputSanitizer;
        if (this.options.geoApiKey && this.options.geoApiKey !== 'YOUR_GEO_API_KEY_HERE_OR_LEAVE_EMPTY_FOR_NAVIGATOR_FALLBACK' && this.options.geoApiUrl && this.options.geoApiUrl.includes('ipgeolocation.io')) {
            try { const safeUrl = S ? S.sanitizeURL(this.options.geoApiUrl) : this.options.geoApiUrl; const url = `${safeUrl}?apiKey=${this.options.geoApiKey}`;
                const response = await fetch(url, { signal: AbortSignal.timeout(this.options.geoApiTimeout) }); if (!response.ok) throw new Error(`GeoIP API (ipgeolocation.io) status ${response.status}`);
                const data = await response.json(); detectedCountry = data?.country_code2?.toUpperCase();
                if (detectedCountry) this._logComplianceEvent('geolocation_success', { method: 'ip_api_ipgeolocation', country: detectedCountry });
            } catch (e) { this._log('error', 'ipgeolocation.io API failed or timed out', e); }
        }
        if (!detectedCountry) {
            try { const safeIpapiUrl = S ? S.sanitizeURL('https://ipapi.co/json/') : 'https://ipapi.co/json/';
                const response = await fetch(safeIpapiUrl, { signal: AbortSignal.timeout(this.options.geoApiTimeout) }); if (!response.ok) throw new Error('ipapi.co status ' + response.status);
                const data = await response.json(); detectedCountry = data?.country_code?.toUpperCase();
                if (detectedCountry) this._logComplianceEvent('geolocation_success', { method: 'ip_api_ipapi', country: detectedCountry });
            } catch (e) { this._log('error', 'GeoIP (ipapi.co) failed or timed out.', e); }
        }
        if (detectedCountry) return this._mapCountryToRegion(detectedCountry);
        const lang = (navigator.language || navigator.userLanguage || '').toLowerCase(); this._logComplianceEvent('geolocation_fallback', { method: 'navigator_lang', lang });
        if (lang.includes('-ca')) return 'CA'; if (lang.includes('-us')) return 'US';
        if (['gb', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'se', 'dk', 'fi', 'el', 'pl', 'hu', 'ie', 'at', 'be', 'bg', 'hr', 'cy', 'cz', 'ee', 'lv', 'lt', 'lu', 'mt', 'ro', 'sk', 'si'].some(euPrefix => lang.startsWith(euPrefix) || lang.includes(`-${euPrefix}`))) return 'EU';
        return this.options.defaultRegion;
    }
    _mapCountryToRegion(countryCode) { /* ... (same as previous) ... */
        const cc = String(countryCode).toUpperCase(); const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB'];
        if (cc === 'US') return 'US'; if (cc === 'CA') return 'CA'; if (euCountries.includes(cc)) return 'EU'; return this.options.defaultRegion;
    }
    _detectBrowserLanguage() { /* ... (same as previous) ... */ const lang = (navigator.language || navigator.userLanguage || this.options.defaultLanguage).split('-')[0].toLowerCase(); return this.options.supportedLanguages.includes(lang) ? lang : this.options.defaultLanguage; }

    _logComplianceEvent(eventSuffix, details = {}) { /* ... (same as previous) ... */
        if (!this.options.complianceReportingEnabled) return;
        const eventData = { eventId: this.dependencies.HelperFunctions.generateUUID(), event: `disclaimer_${eventSuffix}`, timestamp: new Date().toISOString(), region: this._currentRegion, language: this._currentLanguage, appVersion: window.CVDApp?.config?.version || 'unknown', ...details };
        if (this.options.anonymizedReporting && eventData.details) { delete eventData.details.ip; delete eventData.details.userId; }
        this._complianceLog.push(eventData); this._saveComplianceLog();
        if (this.options.complianceEndpoint && (this._complianceLog.length >= this.options.complianceLogMaxEntries || ['accepted', 'declined'].includes(eventSuffix))) { this.sendComplianceReportToServer(); }
    }
    _loadComplianceLog() { /* ... (same as previous) ... */ if (!this.options.complianceReportingEnabled) return; const key = this.options.complianceLogSuffix; const savedLog = this._getStorageItem(key); if (savedLog) { try { this._complianceLog = JSON.parse(savedLog); } catch (e) { this._log('error', 'Error parsing compliance log.', e); this._complianceLog = []; } } }
    _saveComplianceLog() { /* ... (same as previous) ... */ if (!this.options.complianceReportingEnabled) return; const key = this.options.complianceLogSuffix; try { this._setStorageItem(key, JSON.stringify(this._complianceLog)); } catch (e) { this._log('error', 'Error saving compliance log.', e); } }
    async sendComplianceReportToServer() { /* ... (same as previous) ... */
        if (!this.options.complianceReportingEnabled || !this.options.complianceEndpoint || this._complianceLog.length === 0) return false;
        const reportToSend = [...this._complianceLog]; this._log('info', `Sending compliance report (${reportToSend.length} events)`);
        try {
            const response = await fetch(this.options.complianceEndpoint, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ events: reportToSend}) });
            if (response.ok) { this._complianceLog = this._complianceLog.slice(reportToSend.length); this._saveComplianceLog(); this._log('info', 'Compliance report sent.'); return true; }
            else { this._log('error', `Error sending compliance report: ${response.status}`); return false; }
        } catch (error) { this._log('error', `Exception sending compliance report: ${error.message}`); return false; }
    }
    async getComplianceReport(format = 'json') { /* ... (same as previous, ensure PDFServiceInstance is used correctly) ... */
        if (format === 'csv') { if (this._complianceLog.length === 0) return 'No compliance data'; const keys = new Set(); this._complianceLog.forEach(e => Object.keys(e).forEach(k=>keys.add(k))); const headers = Array.from(keys); let csv = headers.join(',') + '\n'; this._complianceLog.forEach(e => { csv += headers.map(k => { const v = e[k]; if (v==null) return ''; const sV = typeof v === 'object' ? JSON.stringify(v) : String(v); return `"${sV.replace(/"/g, '""')}"`;}).join(',') + '\n';}); return csv; }
        else if (format === 'pdf' && this.dependencies.PDFService) {
            try {
                await this.dependencies.PDFService.ensureDependenciesLoaded();
                const reportTitle = this._getTranslation('complianceReportTitle', this._currentLanguage);
                const reportData = this._complianceLog.map(entry => [ entry.timestamp, entry.event, entry.disclaimerKey || '-', entry.version || '-', entry.region, entry.language, JSON.stringify(entry.details || {}) ]);
                return await this.dependencies.PDFService.generateReport(
                    `compliance-log-${new Date().toISOString().slice(0,10)}.pdf`,
                    { reportCalculatorTitle: reportTitle, sections: [{type: 'table', head: [['Timestamp', 'Event', 'Disclaimer', 'Version', 'Region', 'Lang', 'Details']], body: reportData }] }, 'blob'
                );
            } catch (pdfError) { this._handleError(pdfError, 'GetCompliancePDF'); return null; }
        }
        return this.dependencies.HelperFunctions.deepClone(this._complianceLog);
    }

    _checkRequiredDisclaimers() { /* ... (same as previous) ... */
        for (const disclaimerKey of this.options.blockAppUntilAccepted) {
            const definition = this.disclaimerDefinitions[disclaimerKey];
            if (definition && !this.isDisclaimerAccepted(disclaimerKey, definition.version)) {
                this._log('info', `Required disclaimer "${disclaimerKey}" not accepted. Showing modal.`);
                setTimeout(() => { this.showDisclaimer(disclaimerKey, (accepted) => { if (!accepted) { this._showApplicationRestrictedMessage(); } }, true); }, 500);
                break;
            }
        }
    }
    _showApplicationRestrictedMessage() { /* ... (same as previous) ... */
        this.dependencies.EventBus?.publish('application:restricted'); let overlay = document.getElementById('app-restricted-overlay'); if (overlay) overlay.remove();
        overlay = document.createElement('div'); overlay.id = 'app-restricted-overlay';
        overlay.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:20000; display:flex; align-items:center; justify-content:center; text-align:center; color:white; padding:20px; font-family: sans-serif;`;
        const S = this.dependencies.InputSanitizer; const title = this._getTranslation('appRestrictedTitle', this._currentLanguage); const message = this._getTranslation('appRestrictedMessage', this._currentLanguage); const refreshBtnText = this._getTranslation('refreshButton', this._currentLanguage);
        overlay.innerHTML = `<div style="background: #fff; color: #333; padding: 30px; border-radius: 8px; max-width: 500px;"> <h2 style="margin-top:0;">${S ? S.escapeHTML(title): title}</h2> <p>${S ? S.escapeHTML(message): message}</p> <button id="app-restricted-refresh-btn" style="padding:10px 20px; background:#2c7afc; color:white; border:none; border-radius:4px; cursor:pointer; font-size:16px;">${S ? S.escapeHTML(refreshBtnText) : refreshBtnText}</button> </div>`;
        document.body.appendChild(overlay); document.getElementById('app-restricted-refresh-btn').addEventListener('click', () => window.location.reload());
    }
    _attachGlobalDisclaimerEventListeners() { /* ... (same as previous) ... */
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-disclaimer-key]');
            if (target) { event.preventDefault(); const disclaimerKey = target.dataset.disclaimerKey;
                if (this.disclaimerDefinitions[disclaimerKey]) { this.showDisclaimer(disclaimerKey, null, true); }
                else { this._log('warn', `Disclaimer link clicked for unknown key: ${disclaimerKey}`); }
            }
        });
    }
    _updateFocusableElements(modalElement) { /* ... (same as previous) ... */
        if(!modalElement) return; this.focusableElements = Array.from(modalElement.querySelectorAll('a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(el=>(el.offsetWidth>0||el.offsetHeight>0||el.getClientRects().length>0)); this.firstFocusableElement = this.focusableElements[0]; this.lastFocusableElement = this.focusableElements[this.focusableElements.length-1]; if(this.firstFocusableElement) this.firstFocusableElement.focus();
    }

    _addModalStyles(modalId) { /* ... (same as previous) ... */
        const styleId = `disclaimer-styles-${modalId}`; if (document.getElementById(styleId)) return; const style = document.createElement('style'); style.id = styleId;
        style.innerHTML = `
            .enhanced-disclaimer-modal { display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.7); backdrop-filter: blur(4px); align-items: center; justify-content: center; }
            .enhanced-disclaimer-modal .modal-content-wrapper { background-color: #fff; margin: 15px; padding: 20px 25px; border-radius: 8px; width: 90%; max-width: 750px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 5px 20px rgba(0,0,0,0.3); opacity: 0; transform: translateY(20px); transition: opacity ${this.options.animationDuration}ms ease-out, transform ${this.options.animationDuration}ms ease-out; }
            .enhanced-disclaimer-modal.show .modal-content-wrapper { transform: translateY(0); opacity: 1; }
            .enhanced-disclaimer-modal .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e0e0e0; padding-bottom: 15px; margin-bottom: 15px; }
            .enhanced-disclaimer-modal .modal-title { margin: 0; color: #333; font-size: 1.25rem; font-weight: 600; }
            .enhanced-disclaimer-modal .language-selector-container { margin-left: 15px; }
            .enhanced-disclaimer-modal .language-selector-container select { padding: 6px 8px; border-radius: 4px; border: 1px solid #ccc; font-size:0.9rem; }
            .enhanced-disclaimer-modal .modal-body-content { flex-grow: 1; overflow-y: auto; margin-bottom:15px; line-height: 1.6; font-size: 0.9rem; color: #555; }
            .enhanced-disclaimer-modal .modal-body-content h3 { font-size: 1.1rem; color: #333; margin-top: 1.5em; margin-bottom: 0.5em; }
            .enhanced-disclaimer-modal .modal-body-content h4 { font-size: 1rem; color: #444; margin-top: 1em; margin-bottom: 0.3em; }
            .enhanced-disclaimer-modal .modal-body-content p { margin-bottom: 0.8em; }
            .enhanced-disclaimer-modal .modal-body-content ul { margin-left: 20px; margin-bottom: 0.8em; }
            .enhanced-disclaimer-modal .modal-body-content li { margin-bottom: 0.4em; }
            .enhanced-disclaimer-modal .disclaimer-alert { background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 10px 15px; border-radius: 4px; margin: 10px 0; }
            .enhanced-disclaimer-modal .modal-checkboxes { margin-top: 10px; margin-bottom: 15px; }
            .enhanced-disclaimer-modal .modal-checkboxes .disclaimer-checkbox-item { margin: 10px 0; display: flex; align-items: center; font-size: 0.95rem;}
            .enhanced-disclaimer-modal .modal-checkboxes input[type="checkbox"] { margin-right: 10px; transform: scale(1.1); accent-color: var(--primary-color, #2c7afc); }
            .enhanced-disclaimer-modal .modal-footer { padding-top: 15px; border-top: 1px solid #e0e0e0; text-align: right; display: flex; justify-content: flex-end; gap: 10px; }
            .enhanced-disclaimer-modal .modal-footer button { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; font-weight: 500; transition: background-color 0.2s ease; }
            .enhanced-disclaimer-modal .modal-footer button.primary-btn { background-color: var(--primary-color, #2c7afc); color: white; }
            .enhanced-disclaimer-modal .modal-footer button.primary-btn:hover:not([disabled]) { background-color: var(--primary-dark, #1f5fc7); }
            .enhanced-disclaimer-modal .modal-footer button.secondary-btn { background-color: #6c757d; color: white; }
            .enhanced-disclaimer-modal .modal-footer button.secondary-btn:hover { background-color: #5a6268; }
            .enhanced-disclaimer-modal .modal-footer button:disabled { background-color: #cccccc; color: #888888; cursor: not-allowed; }
        `;
        document.head.appendChild(style);
    }

    getCurrentState(disclaimerKey) { /* ... (same as previous) ... */
        if (disclaimerKey) { const definition = this.disclaimerDefinitions[disclaimerKey]; if (!definition) return null; return { disclaimerKey, version: definition.version, isAccepted: this.isDisclaimerAccepted(disclaimerKey, definition.version), language: this._currentLanguage, region: this._currentRegion }; }
        return { activeLanguage: this._currentLanguage, activeRegion: this._currentRegion, allAccepted: this.options.blockAppUntilAccepted.every(key => this.isDisclaimerAccepted(key)) };
    }

    // --- DISCLAIMER CONTENT FUNCTIONS ---
    _getGeneralDisclaimerContent(region, lang) {
        const def = this.disclaimerDefinitions.general;
        return `
            <div class="disclaimer-section">
                <p><strong>Last Updated:</strong> ${def.lastUpdated} | <strong>Version:</strong> ${def.version}</p>
                <h4>1. SCOPE AND ACCEPTANCE</h4>
                <p>These Terms of Use govern your access to and use of the ${this.options.appName} (the "Application"). By accessing or using the Application, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you must not access or use the Application.</p>
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
                <p>These Terms shall be governed by and construed in accordance with the laws of British Columbia, Canada, without regard to its conflict of law provisions.</p>
                <h4>7. SEVERABILITY</h4>
                <p>If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect.</p>
            </div>
        `;
    }

    _getClinicalDisclaimerContent(region, lang) {
        const def = this.disclaimerDefinitions.clinical;
        let regionSpecificText = "";
        if (region === 'CA') { regionSpecificText = "<p>This tool is aligned with Canadian clinical guidelines (e.g., CCS). Healthcare professionals should consult local and provincial guidelines where applicable.</p>"; }
        else if (region === 'US') { regionSpecificText = "<p>This tool is for informational purposes and does not substitute for clinical guidelines applicable in the United States (e.g., ACC/AHA). Users are responsible for adhering to US practice standards.</p>"; }
        else if (region === 'EU') { regionSpecificText = "<p>This tool is for informational purposes. Users in the European Union should consult relevant national or EU-level clinical guidelines (e.g., ESC) and regulatory requirements (e.g., MDR for software as a medical device if applicable).</p>"; }

        return `
            <div class="disclaimer-section">
                <p><strong>Last Updated:</strong> ${def.lastUpdated} | <strong>Version:</strong> ${def.version}</p>
                <div class="disclaimer-alert"><strong>IMPORTANT:</strong> This Application is intended for use by qualified healthcare professionals only. It is not intended for use by patients or the general public.</div>
                <h4>1. MEDICAL DISCLAIMER</h4>
                <p>The ${this.options.appName} is provided for informational and educational purposes only and is not intended as, and shall not be understood or construed as, professional medical advice, diagnosis, or treatment. The information provided by the Application is not a substitute for the professional judgment of qualified healthcare providers.</p>
                <p>NO DOCTOR-PATIENT RELATIONSHIP IS CREATED BY USE OF THE APPLICATION. THE APPLICATION DOES NOT REPLACE THE NEED FOR EVALUATION, TESTING, AND TREATMENT BY A HEALTHCARE PROFESSIONAL. ALWAYS SEEK THE ADVICE OF YOUR PHYSICIAN OR OTHER QUALIFIED HEALTHCARE PROVIDER WITH ANY QUESTIONS YOU MAY HAVE REGARDING A MEDICAL CONDITION.</p>
                ${regionSpecificText}
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
                <h4>7. INTELLECTUAL PROPERTY & ATTRIBUTIONS</h4>
                <p>The algorithms, medical information, clinical recommendations, and all content provided by this Application may be protected by intellectual property laws. No part of this Application may be reproduced, distributed, or transmitted in any form or by any means without the prior written permission of the creators.</p>
                <p><strong>REFERENCES AND ATTRIBUTIONS:</strong><br/>
                   - Framingham Risk Score (FRS) General CVD algorithm: D'Agostino RB Sr, et al. Circulation. 2008;117(6):743-53.<br/>
                   - QRISK3 algorithm: Hippisley-Cox J, et al. BMJ. 2017;357:j2099.<br/>
                   - Lp(a) adjustments based on concepts from: Willeit P, et al. Lancet 2018;392:1311-1320 and other relevant literature.<br/>
                   - Primary dyslipidemia management recommendations based on: 2021 Canadian Cardiovascular Society Guidelines for the Management of Dyslipidemia for the Prevention of Cardiovascular Disease in the Adult.
                </p>
                <h4>8. ACKNOWLEDGMENT</h4>
                <p>By accepting this disclaimer, you acknowledge that you have read, understood, and agree to be bound by all of the terms set forth herein. You acknowledge that you understand the Application's limitations and agree to exercise appropriate professional judgment when using it in clinical practice. You further acknowledge that you will not rely solely on the information provided by the Application for any clinical decision and that you will independently verify any information that may affect patient care.</p>
            </div>
        `;
    }

    _getDataPrivacyDisclaimerContent(region, lang) {
        const def = this.disclaimerDefinitions.dataPrivacy;
        let regionalComplianceText = "";
        if (region === 'CA') { regionalComplianceText = "<p>In Canada, your use of this Application and handling of patient data must comply with the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable provincial health information privacy laws (e.g., PHIPA in Ontario, PIPA in BC/Alberta, Quebec's Act respecting the protection of personal information in the private sector). You are responsible for obtaining necessary consents.</p>"; }
        else if (region === 'US') { regionalComplianceText = "<p>In the United States, your use of this Application and handling of patient health information (PHI) must comply with the Health Insurance Portability and Accountability Act (HIPAA). This Application processes data locally; no PHI is stored on or transmitted to the Application provider's servers by default. You are responsible for ensuring your use aligns with HIPAA safeguards if you are a covered entity or business associate.</p>"; }
        else if (region === 'EU') { regionalComplianceText = "<p>If you are in the European Economic Area, UK, or Switzerland, your use of this Application and handling of personal data must comply with the General Data Protection Regulation (GDPR) or UK GDPR. Data is processed locally on your device. You are considered the data controller for any patient data entered. Ensure you have a lawful basis for processing and meet all GDPR obligations.</p>"; }

        return `
            <div class="disclaimer-section">
                <p><strong>Last Updated:</strong> ${def.lastUpdated} | <strong>Version:</strong> ${def.version}</p>
                <h4>1. DATA PROCESSING INFORMATION</h4>
                <p>The ${this.options.appName} is designed to process data locally within your browser. The Application does not transmit patient data to external servers by default. All calculations are performed within your browser. If you use optional features like EMR integration or data export, data handling for those features will be subject to their specific terms and your actions.</p>
                <h4>2. DATA COLLECTION AND STORAGE</h4>
                <p>The Application may temporarily store data in your browser's local storage or session storage for the purposes of improving user experience (e.g., cross-tab synchronization, saving form state, recording your preferences). This data remains on your device and is not accessible to the Application's creators or any third parties unless you explicitly export or transmit it.</p>
                <h4>3. PATIENT PRIVACY AND CONFIDENTIALITY (Regional Compliance)</h4>
                ${regionalComplianceText}
                <p>As a healthcare professional using this Application, you remain solely responsible for protecting patient privacy and maintaining confidentiality in accordance with all applicable laws, regulations, and professional standards in your jurisdiction. YOU ACKNOWLEDGE THAT THE CREATORS OF THIS APPLICATION HAVE NO ABILITY TO MONITOR OR CONTROL THE DATA YOU ENTER INTO THE APPLICATION AND THEREFORE HAVE NO LIABILITY FOR ANY BREACH OF PATIENT CONFIDENTIALITY OR PRIVACY THAT MAY RESULT FROM YOUR USE OF THE APPLICATION.</p>
                <h4>4. SECURITY MEASURES</h4>
                <p>The Application implements reasonable client-side security measures, including data validation and sanitization of inputs. However, no method of electronic storage or transmission is 100% secure. YOU ACKNOWLEDGE THAT ELECTRONIC COMMUNICATIONS AND DATABASES ARE SUBJECT TO SECURITY BREACHES, TECHNICAL MALFUNCTIONS, AND HUMAN ERROR, AND THAT THE CREATORS CANNOT GUARANTEE ABSOLUTE SECURITY OF DATA.</p>
                <h4>5. DATA MINIMIZATION AND ANONYMIZATION</h4>
                <p>Users are strongly encouraged to anonymize or de-identify patient data before entering it into the Application whenever possible. THE CREATORS RECOMMEND THAT YOU DO NOT ENTER FULL PATIENT NAMES, IDENTIFICATION NUMBERS, OR OTHER DIRECT IDENTIFIERS.</p>
                <h4>6. DATA EXPORT AND SHARING</h4>
                <p>If you choose to export data, you are solely responsible for the security and appropriate handling of that data in compliance with privacy laws.</p>
                <h4>7. COOKIES AND TRACKING</h4>
                <p>The Application uses cookies or similar technologies only for essential functionality (e.g., session state, preferences). It does not use them for advertising or third-party tracking.</p>
            </div>
        `;
    }

    _getMedicationDisclaimerContent(region, lang) {
        const def = this.disclaimerDefinitions.medication;
        return `<div class="disclaimer-section"><p><strong>Last Updated:</strong> ${def.lastUpdated} | <strong>Version:</strong> ${def.version}</p>
                <div class="disclaimer-alert"><strong>IMPORTANT:</strong> This disclaimer specifically addresses the medication recommendations provided by the Application.</div>
                <h4>1. MEDICATION RECOMMENDATIONS LIMITATIONS</h4>
                <p>The medication recommendations provided by this Application are generated based on guidelines from the Canadian Cardiovascular Society (CCS) for the Management of Dyslipidemia, and are intended to serve as general guidance only. These recommendations: Do not account for all possible individual patient factors... (Full content from legal-disclaimer-module.js) ...sole basis for any specific treatment decision.</p>
                <h4>2. PRESCRIBING RESPONSIBILITY</h4>
                <p>The healthcare professional using this Application bears full and sole responsibility for any prescribing decisions... (Full content from legal-disclaimer-module.js) ...appropriateness of the medication.</p>
                <p>THE APPLICATION DOES NOT INDEPENDENTLY VERIFY OR CHECK FOR DRUG ALLERGIES, CONTRAINDICATIONS, OR INTERACTIONS WITH OTHER MEDICATIONS THE PATIENT MAY BE TAKING.</p>
                <h4>3. NO LIABILITY FOR MEDICATION-RELATED OUTCOMES</h4>
                <p>THE CREATORS, DEVELOPERS, CONTRIBUTORS, AND ANY AFFILIATED PARTIES EXPLICITLY DISCLAIM ANY RESPONSIBILITY OR LIABILITY FOR ANY ADVERSE OUTCOMES, HARM TO PATIENTS, TREATMENT ERRORS, OR OTHER NEGATIVE CONSEQUENCES RESULTING FROM MEDICATION CHOICES OR PRESCRIBING DECISIONS MADE IN CONNECTION WITH THE USE OF THIS APPLICATION.</p>
                <h4>4. ACKNOWLEDGMENT</h4>
                <p>By accepting this disclaimer, you acknowledge that you have read, understood, and agree to be bound by all of the terms set forth herein. You acknowledge that you understand the inherent limitations of algorithmically generated medication recommendations and agree to exercise appropriate professional judgment when using the Application's recommendations in your clinical practice.</p>
            </div>`;
    }
    _getCanadianCalculatorDisclaimerContent(region, lang) {
        const def = this.disclaimerDefinitions.canadianSpecifics;
        return `<div class="disclaimer-section"><p><strong>Last Updated:</strong> ${def.lastUpdated} | <strong>Version:</strong> ${def.version}</p>
                <div class="disclaimer-alert"><strong>IMPORTANT:</strong> This disclaimer specifically addresses the Canadian aspects of the cardiovascular risk calculators provided by the Application.</div>
                <h4>1. CANADIAN GUIDELINES IMPLEMENTATION</h4>
                <p>This Application implements risk assessment and management recommendations based on the 2021 Canadian Cardiovascular Society Guidelines... (Full content from legal-disclaimer-module.js) ...their provincial regulatory college or medical association.</p>
                <h4>2. POPULATION CONSIDERATIONS</h4>
                <p>The risk calculators and algorithms implemented in this Application... (Full content from legal-disclaimer-module.js) ...applying risk calculations to specific patient populations.</p>
                <h4>3. PROVINCIAL HEALTHCARE DIFFERENCES</h4>
                <p>Healthcare delivery, medication coverage, and clinical practice may vary significantly across Canadian provinces and territories... (Full content from legal-disclaimer-module.js) ...context of your province or territory.</p>
                <h4>4. REGULATORY COMPLIANCE</h4>
                <p>This Application: Is not a licensed medical device under Health Canada regulations... (Full content from legal-disclaimer-module.js) ...support healthcare professional decision-making.</p>
                <h4>5. ACKNOWLEDGMENT</h4>
                <p>By accepting this disclaimer, you acknowledge that you have read, understood, and agree to be bound by all of the terms set forth herein. You acknowledge that you understand the Canadian-specific limitations of the Application and agree to exercise appropriate professional judgment when using the Application in your clinical practice within the Canadian healthcare context.</p>
            </div>`;
    }
    _getPCSK9DisclaimerContent(region, lang) {
        const def = this.disclaimerDefinitions.pcsk9;
        return `<div class="disclaimer-section"><p><strong>Last Updated:</strong> ${def.lastUpdated} | <strong>Version:</strong> ${def.version}</p>
                <div class="disclaimer-alert"><strong>IMPORTANT:</strong> This disclaimer specifically addresses PCSK9 inhibitor eligibility assessments and recommendations provided by the Application.</div>
                <h4>1. PCSK9 INHIBITOR ELIGIBILITY ASSESSMENT LIMITATIONS</h4>
                <p>The Application's implementation of BC PharmaCare Special Authority criteria for PCSK9 inhibitors: Is based on publicly available information... (Full content from legal-disclaimer-module.js) ...may apply in individual cases.</p>
                <h4>2. NO LIABILITY FOR PCSK9 INHIBITOR RECOMMENDATIONS</h4>
                <p>THE CREATORS, DEVELOPERS, CONTRIBUTORS, AND ANY AFFILIATED PARTIES EXPLICITLY DISCLAIM ANY RESPONSIBILITY OR LIABILITY FOR: Any discrepancies between the Application's eligibility assessment and actual coverage determinations... (Full content from legal-disclaimer-module.js) ...misapplication of BC PharmaCare Special Authority criteria or other coverage criteria implemented in the Application.</p>
                <h4>3. ACKNOWLEDGMENT</h4>
                <p>By accepting this disclaimer, you acknowledge that you have read, understood, and agree to be bound by all of the terms set forth herein... (Full content from legal-disclaimer-module.js) ...based on the Application's eligibility assessments.</p>
            </div>`;
    }
}

LegalDisclaimerManager.instance = null;

// Example Instantiation (in main.js):
// window.LegalDisclaimerManagerInstance = new LegalDisclaimerManager({
//     dependencies: {
//         ErrorLogger: window.ErrorDetectionSystemInstance,
//         EventBus: window.EventBus,
//         CryptoService: window.CryptoServiceInstance, // if log encryption is desired
//         PDFService: window.PDFServiceInstance, // for compliance report export
//         InputSanitizer: window.InputSanitizerServiceInstance,
//         HelperFunctions: window.HelperFunctions
//     }
// });
// export default LegalDisclaimerManager;
