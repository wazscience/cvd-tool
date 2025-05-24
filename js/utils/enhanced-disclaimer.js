// ... (rest of the class definition from previous response) ...

class EnhancedDisclaimerService {
    constructor(disclaimerKey = 'mainAppDisclaimer', options = {}) {
        // Singleton for a given disclaimerKey
        if (EnhancedDisclaimerService.instances && EnhancedDisclaimerService.instances[disclaimerKey]) {
            return EnhancedDisclaimerService.instances[disclaimerKey];
        }

        this.disclaimerKey = disclaimerKey;

        // Default translations and content (as in previous response)
        const defaultTranslations = { /* ... */ };
        const defaultContentByRegion = { /* ... */ };

        this.options = this._deepMerge({
            // ... (other storage keys and options from previous response) ...

            // Regional settings
            autoDetectRegion: true,
            defaultRegion: 'default',
            region: null,
            geoApiUrl: 'https://api.ipgeolocation.io/ipgeo', // Defaulting to user's preferred API
            // ***** THIS IS THE UPDATED LINE *****
            geoApiKey: '4bb974362542440a97cb782274bfb8d6', // User-provided API key
            // ***** END OF UPDATE *****
            geoApiTimeout: 3000,
            geoApiRetries: 1,

            // ... (rest of the options: language, compliance, storage, logging, dependencies from previous response) ...
            contentByRegion: defaultContentByRegion, // From user's code
             translations: defaultTranslations,


            dependencies: {
                ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger(),
                EventBus: window.EventBus,
                CryptoService: window.CryptoService,
                PDFService: window.PDFServiceInstance,
            }
        }, options);

        // ... (rest of the constructor and all other methods from previous response:
        //      this.dependencies, this.actualModalId, this.modalElement,
        //      this._currentLanguage, this._currentRegion, this._complianceLog, etc.
        //      _init(), show(), hide(), accept(), isCurrentVersionAccepted(), resetAcceptance(),
        //      _ensureModalExistsAndIsStyled(), _createBaseModalShell(), _populateModalContent(),
        //      _bindInternalModalEventListeners(), _updateAcceptButtonState(), _determineRegion(),
        //      _mapCountryToRegion(), _detectBrowserLanguage(), _loadTranslations(), _getTranslation(),
        //      _getLanguageDisplayName(), _logComplianceEvent(), _loadComplianceLog(), _saveComplianceLog(),
        //      sendComplianceReportToServer(), getComplianceReportCSV(), getComplianceReportPDFBlob(),
        //      downloadReport(), _showDataProcessingModal(), _updateFocusableElements(),
        //      _bindRootEventListeners(), _focusTrapHandler, _addModalStyles(), _deepMerge(),
        //      _loadScript(), getCurrentState()
        // ) ...

        this.dependencies = this.options.dependencies; // Ensure this is set after merge
        this.actualModalId = `${this.options.modalIdBase}-${this.disclaimerKey}`;
        this.modalElement = document.getElementById(this.actualModalId);

        this._currentLanguage = this.options.language || this.options.defaultLanguage;
        this._currentRegion = this.options.region || this.options.defaultRegion;
        this._complianceLog = [];
        this.isVisible = false;
        this.focusableElements = [];
        this.firstFocusableElement = null;
        this.lastFocusableElement = null;
        this._keyHandlers = { escape: null, tab: null };

        if (!EnhancedDisclaimerService.instances) {
            EnhancedDisclaimerService.instances = {};
        }
        EnhancedDisclaimerService.instances[this.disclaimerKey] = this;
        this.initPromise = this._init(); // Call async init
    }

    // PASTE ALL OTHER METHODS FROM THE PREVIOUS EnhancedDisclaimerService v3.2.0 HERE
    // (e.g., _getFallbackLogger, _init, show, hide, accept, isCurrentVersionAccepted,
    //  _determineRegion, _loadTranslations, _logComplianceEvent, PDF methods, etc.)
    //  The only change was the geoApiKey default in the constructor's options.

    // --- Initialization ---
    async _init() {
        this._log('info', `Initializing Disclaimer [${this.disclaimerKey}] v${this.options.currentVersion}`);
        this._loadComplianceLog();

        if (this.options.autoDetectLanguage && !this.options.language) {
            this._currentLanguage = this._detectBrowserLanguage();
        }
        await this._loadTranslations(this._currentLanguage);

        if (this.options.autoDetectRegion && !this.options.region) {
            this._currentRegion = await this._determineRegion();
        }
        this._setStorageItem(this.options.languageStorageKey, this._currentLanguage);
        this._setStorageItem(this.options.regionStorageKey, this._currentRegion);

        this._log('info', `Determined Region: ${this._currentRegion}, Language: ${this._currentLanguage}`);
        this._ensureModalExistsAndIsStyled();
        this._populateModalContent();
        this._bindRootEventListenersOnce(); // Ensure root listeners are bound only once

        if (this.options.blockAppUntilAccepted && !this.isCurrentVersionAccepted(this.options.currentVersion, this.disclaimerKey)) {
            this.show();
        }
        this.dependencies.EventBus?.publish(`disclaimer:${this.disclaimerKey}:initialized`, this.getCurrentState());
    }

    _getFallbackLogger() {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`DisclaimerSvc Fallback [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => console[lvl]?.(`DisclaimerSvc Fallback [${lvl}]: ${msg}`, data) || console.log(`DisclaimerSvc Fallback [${lvl}]: ${msg}`, data)
        };
    }

    _bindRootEventListenersOnce() {
        if (EnhancedDisclaimerService.rootListenersBound) return;
        document.addEventListener('keydown', (event) => {
            const visibleInstance = Object.values(EnhancedDisclaimerService.instances || {}).find(inst => inst.isVisible);
            if (visibleInstance) {
                if (event.key === 'Escape') {
                    visibleInstance.hide();
                } else if (event.key === 'Tab' && visibleInstance.options.focusTrapEnabled) {
                    visibleInstance._focusTrapHandler(event);
                }
            }
        });
        EnhancedDisclaimerService.rootListenersBound = true;
    }

    // --- Storage Abstraction ---
    _getStorageItem(keySuffix) {
        const key = `${this.options.storageKeyPrefix}${this.disclaimerKey}${keySuffix}`;
        try { return window[this.options.storageType].getItem(key); }
        catch (e) { this._log('error', `Error getting from ${this.options.storageType}: ${key}`, e); return null; }
    }
    _setStorageItem(keySuffix, value) {
        const key = `${this.options.storageKeyPrefix}${this.disclaimerKey}${keySuffix}`;
        try { window[this.options.storageType].setItem(key, value); }
        catch (e) { this._log('error', `Error setting to ${this.options.storageType}: ${key}`, e); }
    }
    _removeStorageItem(keySuffix) {
        const key = `${this.options.storageKeyPrefix}${this.disclaimerKey}${keySuffix}`;
        try { window[this.options.storageType].removeItem(key); }
        catch (e) { this._log('error', `Error removing from ${this.options.storageType}: ${key}`, e); }
    }
    _getAcceptanceStorageKey(version, disclaimerKey) {
        return `${this.options.storageKeyPrefix}${disclaimerKey}${this.options.acceptanceSuffix}${version}`;
    }

    // --- Core Public Methods (show, hide, accept, isCurrentVersionAccepted, resetAcceptance) ---
    show() {
        if (!this.modalElement) this._ensureModalExistsAndIsStyled();
        if (!this.modalElement) {
             this._log('error', 'Modal element still not available. Cannot show.'); return;
        }

        this._populateModalContent(); // Ensure content is fresh based on lang/region
        this.modalElement.style.display = 'flex';
        const modalContentWrapper = this.modalElement.querySelector('.modal-content-wrapper');
        if (modalContentWrapper) {
            this.modalElement.classList.add('show'); // For CSS transition
            setTimeout(() => {
                modalContentWrapper.style.opacity = '1';
                modalContentWrapper.style.transform = 'translateY(0)';
            }, 10);
        }

        this.modalElement.setAttribute('aria-hidden', 'false');
        this.modalElement.setAttribute('aria-modal', 'true');
        this.isVisible = true;

        if (this.options.focusTrapEnabled) {
            this._updateFocusableElements();
            this.firstFocusableElement?.focus();
        }
        this._logComplianceEvent('shown');
        this.dependencies.EventBus?.publish(`disclaimer:${this.disclaimerKey}:shown`, this.getCurrentState());
    }

    hide() {
        if (!this.modalElement || !this.isVisible) return;
        const modalContentWrapper = this.modalElement.querySelector('.modal-content-wrapper');
        if (modalContentWrapper) {
            modalContentWrapper.style.opacity = '0';
            modalContentWrapper.style.transform = 'translateY(20px)';
            this.modalElement.classList.remove('show');
            setTimeout(() => {
                this.modalElement.style.display = 'none';
            }, this.options.animationDuration);
        } else {
            this.modalElement.style.display = 'none';
        }
        this.modalElement.setAttribute('aria-hidden', 'true');
        this.modalElement.removeAttribute('aria-modal');
        this.isVisible = false;
        this.dependencies.EventBus?.publish(`disclaimer:${this.disclaimerKey}:hidden`, this.getCurrentState());
    }

    accept() {
        if (!this.modalElement) return;
        let allRequiredChecked = true;
        for (const chkConfig of this.options.checkboxes) {
            if (chkConfig.required) {
                const checkbox = this.modalElement.querySelector(`#${chkConfig.id}-${this.disclaimerKey}`);
                if (!checkbox || !checkbox.checked) {
                    allRequiredChecked = false;
                    const labelText = this._getTranslation(chkConfig.labelKey, this._currentLanguage);
                    this._log('warn', `Acceptance failed: Required checkbox "${chkConfig.id}" ("${labelText}") not checked.`);
                    alert(`Please acknowledge: "${labelText}"`); // User feedback
                    checkbox?.focus();
                    return; // Stop acceptance
                }
            }
        }

        if (!allRequiredChecked) return;

        this._setAcceptanceState(this.options.currentVersion, this.disclaimerKey, true);
        this._logComplianceEvent('accepted', { version: this.options.currentVersion });
        this.dependencies.EventBus?.publish(`disclaimer:${this.disclaimerKey}:accepted`, this.getCurrentState());
        this.hide();

        if (this.options.showDataProcessingModalForEU && this._currentRegion === 'eu' &&
            !this.isCurrentVersionAccepted(this.options.dataProcessingAcceptanceVersion, this.options.dataProcessingDisclaimerKey)) {
            this._showDataProcessingModal();
        }
    }

    _setAcceptanceState(version, disclaimerKey, acceptedStatus) {
        const key = this._getAcceptanceStorageKey(version, disclaimerKey);
        const acceptanceData = {
            version: version, accepted: acceptedStatus, timestamp: new Date().toISOString(),
            language: this._currentLanguage, region: this._currentRegion
        };
        this._setStorageItem(key, JSON.stringify(acceptanceData));
        this._log('info', `Disclaimer "${disclaimerKey}" v${version} acceptance set to ${acceptedStatus}.`);
    }

    isCurrentVersionAccepted(version = this.options.currentVersion, disclaimerKey = this.disclaimerKey) {
        try {
            const key = this._getAcceptanceStorageKey(version, disclaimerKey);
            const rawData = this._getStorageItem(key);
            if (!rawData) return false;
            const acceptanceData = JSON.parse(rawData);
            return acceptanceData?.version === version && acceptanceData.accepted === true;
        } catch (e) { this._log('error', `Err reading acceptance for "${disclaimerKey}" v${version}.`, e); return false; }
    }

    resetAcceptance(version = this.options.currentVersion, disclaimerKey = this.disclaimerKey) {
        const key = this._getAcceptanceStorageKey(version, disclaimerKey);
        this._removeStorageItem(key);
        this._logComplianceEvent('acceptance_reset', { version });
        this.dependencies.EventBus?.publish(`disclaimer:${disclaimerKey}:acceptanceReset`, this.getCurrentState());
        this._log('info', `Acceptance reset for "${disclaimerKey}" v${version}.`);
        if (this.options.blockAppUntilAccepted && disclaimerKey === this.disclaimerKey) {
            this.show();
        }
    }

    // --- Dynamic Modal Structure & Content ---
     _ensureModalExistsAndIsStyled() {
        this.modalElement = document.getElementById(this.actualModalId);
        if (!this.modalElement) {
            this._createBaseModalShell();
            this.modalElement = document.getElementById(this.actualModalId); // Re-assign
        }
        this._addModalStyles(); // Ensure styles are injected or updated
    }

    _createBaseModalShell() {
        const modal = document.createElement('div');
        modal.id = this.actualModalId;
        modal.className = 'enhanced-disclaimer-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', `${this.actualModalId}-title`);
        modal.setAttribute('aria-describedby', `${this.actualModalId}-body`);
        modal.style.display = 'none';
        document.body.appendChild(modal);
        this._log('debug', `Modal shell created: #${this.actualModalId}`);
    }

    _populateModalContent() {
        if (!this.modalElement) { this._log('error', 'Cannot populate: Modal shell missing.'); return; }

        const regionalContentConfig = this.options.contentByRegion[this._currentRegion] || this.options.contentByRegion.default;
        const titleText = this._getTranslation(regionalContentConfig.titleKey || 'modalTitle', this._currentLanguage);
        let bodyHtml = regionalContentConfig.bodyHtml || this._getTranslation('defaultBodyContent', this._currentLanguage) || '<p>Please review the terms.</p>';
        bodyHtml = bodyHtml.replace(/{{currentLanguage}}/g, this._getLanguageDisplayName(this._currentLanguage)).replace(/{{currentRegion}}/g, this._currentRegion.toUpperCase());

        let checkboxesHtml = '';
        this.options.checkboxes.forEach(chkConfig => {
            const label = this._getTranslation(chkConfig.labelKey, this._currentLanguage);
            checkboxesHtml += `<div class="disclaimer-checkbox-item"><input type="checkbox" id="${chkConfig.id}-${this.disclaimerKey}" name="${chkConfig.id}-${this.disclaimerKey}"><label for="${chkConfig.id}-${this.disclaimerKey}">${label}</label></div>`;
        });

        let languageSelectorHtml = '';
        if (this.options.supportedLanguages.length > 1) {
            const langSelectorLabel = this._getTranslation('languageSelectorLabel', this._currentLanguage);
            languageSelectorHtml = `<div id="${this.options.languageSelectorContainerId}-${this.disclaimerKey}" class="language-selector-container"><label for="${this.options.languageSelectorIdSuffix.substring(1)}-${this.disclaimerKey}">${langSelectorLabel}</label><select id="${this.options.languageSelectorIdSuffix.substring(1)}-${this.disclaimerKey}">`;
            this.options.supportedLanguages.forEach(lang => { languageSelectorHtml += `<option value="${lang}" ${lang === this._currentLanguage ? 'selected' : ''}>${this._getLanguageDisplayName(lang)}</option>`; });
            languageSelectorHtml += `</select></div>`;
        }
        const acceptButtonText = this._getTranslation('acceptButton', this._currentLanguage);

        this.modalElement.innerHTML = `
            <div class="modal-content-wrapper">
                <div class="modal-header">
                    <h3 class="modal-title" id="${this.actualModalId}-title">${titleText}</h3>
                    ${languageSelectorHtml}
                </div>
                <div class="modal-body-content" id="${this.actualModalId}-body">${bodyHtml}</div>
                <div class="modal-checkboxes">${checkboxesHtml}</div>
                <div class="modal-footer">
                    <button type="button" id="${this.options.acceptButtonIdSuffix.substring(1)}-${this.disclaimerKey}" data-disclaimer-accept disabled>${acceptButtonText}</button>
                </div>
            </div>`;
        this._bindInternalModalEventListeners();
        this._updateAcceptButtonState();
    }

    _bindInternalModalEventListeners() { /* ... (Same as previous) ... */
        if (!this.modalElement) return;
        const acceptBtn = this.modalElement.querySelector(`[data-disclaimer-accept]`);
        acceptBtn?.addEventListener('click', this.accept.bind(this));

        this.modalElement.querySelectorAll(this.options.closeButtonSelector).forEach(button => button.addEventListener('click', () => this.hide()));

        this.options.checkboxes.forEach(chkConfig => {
            this.modalElement.querySelector(`#${chkConfig.id}-${this.disclaimerKey}`)?.addEventListener('change', () => this._updateAcceptButtonState());
        });
        this.modalElement.querySelector(`#${this.options.languageSelectorIdSuffix.substring(1)}-${this.disclaimerKey}`)?.addEventListener('change', async (e) => {
            await this.setLanguage(e.target.value);
            if(this.isVisible) this.show();
        });
    }
    _updateAcceptButtonState() { /* ... (Same as previous) ... */
        const acceptBtn = this.modalElement?.querySelector(`[data-disclaimer-accept]`); if (!acceptBtn) return;
        let allRequiredChecked = true;
        for (const chkConfig of this.options.checkboxes) { if (chkConfig.required) { const checkbox = this.modalElement.querySelector(`#${chkConfig.id}-${this.disclaimerKey}`); if (!checkbox || !checkbox.checked) { allRequiredChecked = false; break; } } }
        acceptBtn.disabled = !allRequiredChecked;
    }

    // --- Region & Language ---
    async _determineRegion() { /* ... (Same as previous, with user's geoApiKey already in options if provided) ... */
        if (!this.options.autoDetectRegion) return this.options.defaultRegion;
        let detectedCountry = null;
        if (this.options.geoApiKey && this.options.geoApiKey !== 'YOUR_GEO_API_KEY_HERE_OR_LEAVE_EMPTY_FOR_NAVIGATOR_FALLBACK' && this.options.geoApiUrl.includes('ipgeolocation.io')) {
            try { /* ... fetch from ipgeolocation.io ... */
                const url = `${this.options.geoApiUrl}?apiKey=${this.options.geoApiKey}`;
                const response = await fetch(url); // Add timeout/retry if needed
                if (!response.ok) throw new Error(`GeoIP API (ipgeolocation.io) status ${response.status}`);
                const data = await response.json();
                detectedCountry = data?.country_code2?.toUpperCase();
                if(detectedCountry) this._logComplianceEvent('geolocation_success', { method: 'ip_api_ipgeolocation', country: detectedCountry });
            } catch (e) { this._log('error', 'ipgeolocation.io API failed', e); }
        }
        if (!detectedCountry && this.options.geoApiUrl.includes('ipapi.co')) { // Fallback to ipapi.co
             try { /* ... fetch from ipapi.co ... */
                const response = await fetch('https://ipapi.co/json/');
                if (!response.ok) throw new Error('ipapi.co status ' + response.status);
                const data = await response.json();
                detectedCountry = data?.country_code?.toUpperCase();
                if(detectedCountry) this._logComplianceEvent('geolocation_success', { method: 'ip_api_ipapi', country: detectedCountry });
             } catch (e) { this._log('error', 'GeoIP (ipapi.co) failed.', e); }
        }
        if (detectedCountry) return this._mapCountryToRegion(detectedCountry);

        const lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
        this._logComplianceEvent('geolocation_fallback', { method: 'navigator_lang', lang });
        if (lang.includes('-ca')) return 'canada'; if (lang.includes('-us')) return 'us'; if (lang.startsWith('en-gb')) return 'uk';
        const euLangs = ['de', 'fr', 'es', 'it', 'nl', 'pt', 'sv', 'da', 'fi', 'el', 'pl', 'hu'];
        if (euLangs.some(euLang => lang.startsWith(euLang))) return 'eu';
        return this.options.defaultRegion;
    }
    _mapCountryToRegion(countryCode) { /* ... (Same as previous) ... */
        const cc = countryCode.toUpperCase(); const regionMap = {'US':'us', 'CA':'canada', /* ... full map ... */ 'SE':'eu'}; return regionMap[cc] || this.options.defaultRegion;
    }
    _detectBrowserLanguage() { /* ... (Same as previous) ... */
        const lang = (navigator.language || navigator.userLanguage || this.options.defaultLanguage).split('-')[0].toLowerCase();
        return this.options.supportedLanguages.includes(lang) ? lang : this.options.defaultLanguage;
    }
    async _loadTranslations(languageCode) { /* ... (Same as previous, ensuring merge with default for complete keys) ... */
        if (this.options.translations[languageCode] && Object.keys(this.options.translations[languageCode]).length > 1) { this._log('debug', `Using pre-configured/loaded translations for ${languageCode}.`); return; }
        if (!this.options.translationEndpoint) { this._log('warn', `No translation endpoint for ${languageCode}, using defaults.`); if (!this.options.translations[languageCode]) this.options.translations[languageCode] = this._deepMerge({}, this.options.translations[this.options.defaultLanguage] || defaultTranslations.en); return; }
        try {
            const endpoint = this.options.translationEndpoint.replace('{lang}', languageCode);
            const response = await fetch(endpoint); if (!response.ok) throw new Error(`Status ${response.status}`);
            const translations = await response.json();
            this.options.translations[languageCode] = this._deepMerge({ ... (this.options.translations[this.options.defaultLanguage] || defaultTranslations.en) }, translations);
            this._log('info', `Translations loaded for ${languageCode}.`);
        } catch (error) { this._log('error', `Failed to load translations for ${languageCode}. Using defaults.`, error); if (!this.options.translations[languageCode]) this.options.translations[languageCode] = this._deepMerge({}, this.options.translations[this.options.defaultLanguage] || defaultTranslations.en); }
    }
    _getTranslation(key, lang = this._currentLanguage) { /* ... (Same as previous) ... */
        const defaultLangKey = this.options.defaultLanguage; const defaultGlobalTranslations = EnhancedDisclaimerService.globalDefaults.translations[defaultLangKey] || {}; const currentGlobalTranslations = EnhancedDisclaimerService.globalDefaults.translations[lang] || defaultGlobalTranslations; const instanceDefaultTranslations = this.options.translations[defaultLangKey] || defaultGlobalTranslations; const instanceCurrentTranslations = this.options.translations[lang] || instanceDefaultTranslations; return instanceCurrentTranslations[key] || instanceDefaultTranslations[key] || currentGlobalTranslations[key] || defaultGlobalTranslations[key] || `[${key}]`;
    }
    _getLanguageDisplayName(langCode) { /* ... (Same as previous) ... */
        const names = {'en': 'English', 'fr': 'Français', 'es': 'Español', 'de': 'Deutsch', /* ... */ }; return names[langCode] || langCode.toUpperCase();
    }


    // --- Compliance Logging & Reporting ---
    _logComplianceEvent(eventNameSuffix, data = {}) { /* ... (Same as previous, ensures this.disclaimerKey is part of event name) ... */
        if (!this.options.complianceReportingEnabled) return;
        const eventData = { event: `${this.disclaimerKey}_${eventNameSuffix}`, timestamp: new Date().toISOString(), region: this._currentRegion, language: this._currentLanguage, disclaimerVersion: this.options.currentVersion, ...data };
        if (this.options.anonymizedReporting) { delete eventData.ip; delete eventData.userId; }
        this._complianceLog.push(eventData); this._saveComplianceLog();
        if (this._complianceLog.length >= this.options.complianceLogMaxEntries || ['accepted', 'data_processing_accepted'].includes(eventNameSuffix)) { this.sendComplianceReportToServer(); }
    }
    _loadComplianceLog() { /* ... (Same as previous, uses full key with prefix and suffix) ... */
        if (!this.options.complianceReportingEnabled) return; const key = `${this.options.storageKeyPrefix}${this.disclaimerKey}${this.options.complianceLogSuffix}`; const savedLog = this._getStorageItem(key); if (savedLog) { try { this._complianceLog = JSON.parse(savedLog); } catch (e) {this._log('error', 'Bad compliance log', e); this._complianceLog = [];} }
    }
    _saveComplianceLog() { /* ... (Same as previous, uses full key with prefix and suffix) ... */
         if (!this.options.complianceReportingEnabled) return; const key = `${this.options.storageKeyPrefix}${this.disclaimerKey}${this.options.complianceLogSuffix}`; try {this._setStorageItem(key, JSON.stringify(this._complianceLog));} catch (e) {this._log('error', 'Cant save compliance log',e);}
    }
    async sendComplianceReportToServer() { /* ... (Same as previous) ... */
        if (!this.options.complianceReportingEnabled || !this.options.complianceEndpoint || this._complianceLog.length === 0) return false;
        const reportToSend = [...this._complianceLog]; this._log('info', `Sending compliance report (${reportToSend.length} events)`);
        try {
            const response = await fetch(this.options.complianceEndpoint, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ disclaimerKey: this.disclaimerKey, events: reportToSend}) });
            if (response.ok) { this._complianceLog = this._complianceLog.slice(reportToSend.length); this._saveComplianceLog(); this._log('info', 'Compliance report sent.'); return true; }
            else { this._log('error', `Error sending compliance report: ${response.status}`); return false; }
        } catch (error) { this._log('error', `Exception sending report: ${error.message}`); return false; }
    }
    getComplianceReportCSV() { /* ... (Same as previous) ... */
        if (this._complianceLog.length === 0) return 'No compliance data'; const keys = new Set(); this._complianceLog.forEach(e => Object.keys(e).forEach(k=>keys.add(k))); const headers = Array.from(keys); let csv = headers.join(',') + '\n'; this._complianceLog.forEach(e => { csv += headers.map(k => { const v = e[k]; if (v==null) return ''; const sV = typeof v === 'object' ? JSON.stringify(v) : String(v); return `"${sV.replace(/"/g, '""')}"`;}).join(',') + '\n';}); return csv;
    }
    async getComplianceReportPDFBlob() { /* ... (Same as previous, uses this.dependencies.PDFService) ... */
        if (!this.dependencies.PDFService) throw new Error('PDFService not available.'); await this.dependencies.PDFService.ensureDependenciesLoaded();
        const doc = this.dependencies.PDFService.createDocument(); if(!doc) throw new Error('Failed PDF doc init.');
        let y = this.dependencies.PDFService.addHeader(doc, `Compliance: ${this.disclaimerKey}`);
        /* ... construct PDF content similar to previous version ... */
        this.dependencies.PDFService.addFooter(doc); return doc.output('blob');
    }
    async downloadReport(type = 'csv') { /* ... (Same as previous) ... */
        let blob, filename; const date = new Date().toISOString().slice(0,10); filename=`compliance-${this.disclaimerKey}-${date}.${type}`; try{ if(type==='csv'){blob=new Blob([this.getComplianceReportCSV()],{type:'text/csv;charset=utf-8;'})} else if(type==='pdf'){blob=await this.getComplianceReportPDFBlob()}else{throw new Error('Unsupported')} const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a); setTimeout(()=>URL.revokeObjectURL(url),100); this._logComplianceEvent('report_downloaded',{type}); } catch(e){this._log('error',`Failed download ${type}`,e)}
    }

    // --- GDPR Data Processing Modal Flow ---
    _showDataProcessingModal() {
        const dpKey = this.options.dataProcessingDisclaimerKey;
        const dpVersion = this.options.dataProcessingAcceptanceVersion;

        if (EnhancedDisclaimerService.instances[dpKey]) {
            EnhancedDisclaimerService.instances[dpKey].show();
        } else {
            this._log('info', `Creating and showing Data Processing (GDPR) Modal for region: ${this._currentRegion}`);
            const dpTranslations = {}; // Prepare specific translations for data processing modal
            Object.keys(this.options.translations).forEach(lang => {
                dpTranslations[lang] = {
                    modalTitle: this._getTranslation('dataProcessingTitle', lang),
                    checkboxLabelPrimary: this._getTranslation('dataProcessingCheckboxLabel', lang),
                    acceptButton: this._getTranslation('acceptButton', lang),
                };
            });
            const dpContent = {
                'default': {
                    titleKey: 'dataProcessingTitle', // Will use translated version
                    bodyHtml: `<p>${this._getTranslation('dataProcessingIntro', this._currentLanguage)}</p><ol><li>${this._getTranslation('dataProcessingPoint1', this._currentLanguage)}</li><li>${this._getTranslation('dataProcessingPoint2', this._currentLanguage)}</li><li>${this._getTranslation('dataProcessingPoint3', this._currentLanguage)}</li><li>${this._getTranslation('dataProcessingPoint4', this._currentLanguage)}</li><li>${this._getTranslation('dataProcessingPoint5', this._currentLanguage)}</li><li>${this._getTranslation('dataProcessingPoint6', this._currentLanguage)}</li></ol>`
                }
            };
            const dpService = new EnhancedDisclaimerService(dpKey, {
                ...this.options,
                disclaimerKey: dpKey,
                currentVersion: dpVersion,
                blockAppUntilAccepted: true,
                contentByRegion: dpContent,
                translations: dpTranslations,
                checkboxes: [{ id: 'gdpr-accept-checkbox', labelKey: 'checkboxLabelPrimary', required: true }],
                modalIdBase: `${this.options.modalIdBase}-gdpr`,
                showDataProcessingModalForEU: false, // Prevent recursion
                dependencies: this.dependencies
            });
            // dpService.initPromise.then(() => dpService.show()); // If init returns a promise
        }
    }


    // --- Accessibility & Styles ---
    _updateFocusableElements() { /* ... (Same as previous) ... */
        if(!this.modalElement) return; this.focusableElements = Array.from(this.modalElement.querySelectorAll('a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(el=>(el.offsetWidth>0||el.offsetHeight>0||el.getClientRects().length>0)); this.firstFocusableElement = this.focusableElements[0]; this.lastFocusableElement = this.focusableElements[this.focusableElements.length-1];
    }
    _focusTrapHandler = (event) => { /* ... (Same as previous) ... */
        if (!this.isVisible || event.key !== 'Tab' || !this.options.focusTrapEnabled) return;
        if (this.focusableElements.length === 0) return;
        if (event.shiftKey) { if (document.activeElement === this.firstFocusableElement) { this.lastFocusableElement?.focus(); event.preventDefault(); } }
        else { if (document.activeElement === this.lastFocusableElement) { this.firstFocusableElement?.focus(); event.preventDefault(); } }
    };
    _addModalStyles() { /* ... (Same as previous, uses this.actualModalId, this.options.animationDuration) ... */
        const styleId = `disclaimer-styles-${this.disclaimerKey}`; if (document.getElementById(styleId)) return;
        const style = document.createElement('style'); style.id = styleId;
        style.innerHTML = `
            #${this.actualModalId} { display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.6); backdrop-filter: blur(3px); align-items: center; justify-content: center; }
            #${this.actualModalId} .modal-content-wrapper { background-color: #fff; margin: 20px; padding: 25px; border-radius: 8px; width: 90%; max-width: 700px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 5px 15px rgba(0,0,0,0.3); opacity: 0; transform: translateY(20px); transition: opacity ${this.options.animationDuration}ms ease-out, transform ${this.options.animationDuration}ms ease-out; }
            #${this.actualModalId}.show .modal-content-wrapper { transform: translateY(0); opacity: 1; }
            /* ... other styles from previous merge (header, title, lang selector, body, checkboxes, footer, responsive) ... */
             #${this.actualModalId} .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 15px; }
             #${this.actualModalId} .modal-title { margin: 0; color: #333; font-size: 20px; }
             #${this.actualModalId} .language-selector-container select { padding: 5px; border-radius: 4px; }
             #${this.actualModalId} .modal-body-content { flex-grow: 1; overflow-y: auto; margin-bottom:15px; line-height: 1.6; }
             #${this.actualModalId} .modal-checkboxes .disclaimer-checkbox-item { margin: 10px 0; display: flex; align-items: center;}
             #${this.actualModalId} .modal-checkboxes input[type="checkbox"] { margin-right: 10px; transform: scale(1.2); }
             #${this.actualModalId} .modal-footer { padding-top: 15px; border-top: 1px solid #eee; text-align: right; }
             #${this.actualModalId} .modal-footer button { padding: 10px 20px; background-color: #2c7afc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
             #${this.actualModalId} .modal-footer button:hover:not([disabled]) { background-color: #1f5fc7; }
             #${this.actualModalId} .modal-footer button[disabled] { background-color: #cccccc; opacity:0.7; cursor: not-allowed; }
        `;
        document.head.appendChild(style);
    }

    // --- Utility ---
    _deepMerge(target, ...sources) { /* (Adapted for multiple sources) */
        if (!sources.length) return target;
        const source = sources.shift();
        if (typeof target === 'object' && target !== null && typeof source === 'object' && source !== null) {
            for (const key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
                        target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
                        this._deepMerge(target[key], source[key]);
                    } else if (source[key] !== undefined) {
                        target[key] = source[key];
                    }
                }
            }
        }
        return this._deepMerge(target, ...sources);
    }
    async _loadScript(src) { /* ... (Same as previous) ... */
        if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
        return new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.async = true; script.onload = resolve; script.onerror = () => reject(new Error(`Failed script: ${src}`)); document.head.appendChild(script); });
    }
    getCurrentState() { /* ... (Same as previous) ... */
        return { disclaimerKey: this.disclaimerKey, version: this.options.currentVersion, isAccepted: this.isCurrentVersionAccepted(), language: this._currentLanguage, region: this._currentRegion, isVisible: this.isVisible };
    }
    getConfig() { return { ...this.options }; }

}

// Static property for singleton instances per disclaimerKey
EnhancedDisclaimerService.instances = {};
EnhancedDisclaimerService.rootListenersBound = false;
// Expose default translations and content for potential external use/override before instantiation
EnhancedDisclaimerService.globalDefaults = {
    translations: { /* ... copy of defaultTranslations from constructor ... */
        en: { modalTitle: 'Important Notice', acceptButton: 'Accept & Continue', checkboxLabelPrimary: 'I agree to the terms.', checkboxLabelLiability: 'I accept liability limitations.', languageSelectorLabel: 'Language:' , dataProcessingTitle: 'Data Processing Notice (GDPR)', dataProcessingCheckboxLabel: 'I consent to data processing as described.', dataProcessingIntro: 'Intro text for GDPR.', dataProcessingPoint1: 'Point 1', dataProcessingPoint2: 'Point 2', dataProcessingPoint3: 'Point 3', dataProcessingPoint4: 'Point 4', dataProcessingPoint5: 'Point 5', dataProcessingPoint6: 'Point 6'},
        fr: { modalTitle: 'Avis Important', acceptButton: 'Accepter et Continuer', checkboxLabelPrimary: "J'accepte les termes.", checkboxLabelLiability: "J'accepte les limitations.", languageSelectorLabel: 'Langue:' , dataProcessingTitle: 'Avis de Traitement (RGPD)', dataProcessingCheckboxLabel: 'Je consens au traitement.'},
        es: { modalTitle: 'Aviso Importante', acceptButton: 'Aceptar y Continuar', checkboxLabelPrimary: 'Acepto los términos.', checkboxLabelLiability: 'Acepto limitaciones.', languageSelectorLabel: 'Idioma:' , dataProcessingTitle: 'Aviso de Procesamiento (RGPD)', dataProcessingCheckboxLabel: 'Consiento el procesamiento.'}
    },
    contentByRegion: { /* ... copy of defaultContentByRegion from constructor ... */
        us: { titleKey: 'modalTitle', bodyHtml: `<p>US Text: Healthcare Pro Use Only. Not a substitute for medical advice. HIPAA notice: no PHI stored on servers. Calculations local. By using, you agree to maintain PHI confidentiality.</p>` },
        canada: { titleKey: 'modalTitle', bodyHtml: `<p>Canada Text: Healthcare Pro Use Only. Health Canada guidelines. No patient info stored. Local calculations per privacy laws. Use clinical judgment.</p>` },
        eu: { titleKey: 'modalTitle', bodyHtml: `<p>EU Text: Healthcare Pro Use Only. Not medical advice. GDPR: No personal data stored on servers. Local calculations. You are data controller. Not a medical device.</p>` },
        default: { titleKey: 'modalTitle', bodyHtml: `<p>Default Text: Healthcare Pro Use Only. Local calculations. Not medical advice.</p>` }
    }
};


// export default EnhancedDisclaimerService; // For ES module usage