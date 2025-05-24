/**
 * Combined View Manager Service (Enhanced & Operational)
 * @file /js/utils/combined-view-manager.js (was combined.js)
 * @description Manages the "Combined FRS & QRISK3" view, including data aggregation,
 * comparison display, and triggering relevant visualizations and recommendations.
 * Fuses user's CombinedViewManager v1.0.0 [cite: uploaded:combined.js] with service architecture.
 * This module is intended to replace the user's original combined.js.
 * @version 1.1.0
 * @exports CombinedViewManagerService
 */

'use strict';

class CombinedViewManagerService {
    /**
     * Creates or returns the singleton instance of CombinedViewManagerService.
     * @param {object} [options={}] - Configuration options.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (CombinedViewManagerService.instance) {
            return CombinedViewManagerService.instance;
        }

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || { handleError: console.error, log: console.log },
            EventBus: window.EventBus || { subscribe: () => {}, publish: () => {} },
            LoadingManager: window.LoadingManagerInstance || { show: () => {}, hide: () => {} },
            RiskCalculator: window.RiskCalculatorInstance,
            ResultsDisplayService: window.AppResultsDisplay, // Instance name from main.js
            MemoryManager: window.MemoryManagerInstance,
            InputSanitizer: window.InputSanitizerService,
            ...options.dependencies,
        };

        this.frsResults = null;
        this.qriskResults = null;
        this.combinedReportData = null;
        this.preferredCalculatorDisplay = 'combined'; // Default from user's code [cite: uploaded:combined.js (line 29)]
        this.debugMode = this.options.debugMode || false;

        if (!this.dependencies.RiskCalculator) this._log('critical', 'RiskCalculator dependency missing!', 'Init');
        if (!this.dependencies.ResultsDisplayService) this._log('critical', 'ResultsDisplayService dependency missing!', 'Init');

        this._initializeEventListeners();

        CombinedViewManagerService.instance = this;
        this._log('info', 'CombinedViewManagerService Initialized (v1.1.0).');
    }

    _log(level, message, data) { this.dependencies.ErrorLogger.log?.(level, `CombinedViewMgr: ${message}`, data); }
    _handleError(error, context, additionalData = {}) { /* ... (same as v1.1.0) ... */
        const msg = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(msg, `CombinedViewMgr-${context}`, 'error', { originalError: error, ...additionalData });
        this.dependencies.EventBus.publish('ui:showToast', { message: `Combined View Error (${context}): ${msg}`, type: 'error' });
    }

    _initializeEventListeners() { /* ... (same as v1.1.0, listens for calculation:complete, combinedView:requestUpdate, preferences:updated) ... */
        this.dependencies.EventBus.subscribe('calculation:complete', (payload) => {
            RuntimeProtection.tryCatch(() => {
                if (payload.calculatorType === 'frs') {
                    this.frsResults = payload.results;
                    this.dependencies.MemoryManager?.store('cvdCombinedView_lastFrsResult', payload.results, { persist: 'session', expiry: 3600000 });
                } else if (payload.calculatorType === 'qrisk3') {
                    this.qriskResults = payload.results;
                    this.dependencies.MemoryManager?.store('cvdCombinedView_lastQriskResult', payload.results, { persist: 'session', expiry: 3600000 });
                }
            }, (e) => this._handleError(e, 'HandleCalcCompleteEvent'));
        });
        this.dependencies.EventBus.subscribe('combinedView:requestUpdate', async (payload) => {
            await RuntimeProtection.tryCatch(async () => {
                await this.generateAndDisplayCombinedAssessment(payload?.patientData);
            }, (e) => this._handleError(e, 'HandleUpdateRequestEvent'));
        });
        this.dependencies.EventBus.subscribe('preferences:updated', (payload) => {
            if (payload?.preferences?.combinedView?.preferredCalculator) this.setPreferredCalculatorDisplay(payload.preferences.combinedView.preferredCalculator);
            if (payload?.preferences?.debugMode !== undefined) this.debugMode = Boolean(payload.preferences.debugMode);
        });
    }

    async generateAndDisplayCombinedAssessment(currentPatientDataForRecalc = null) { /* ... (same as v1.1.0, uses RiskCalculator.calculateCombinedRisk) ... */
        this.dependencies.LoadingManager.show('Generating Combined Assessment...');
        try {
            const cachedFrs = this.dependencies.MemoryManager.retrieve('cvdCombinedView_lastFrsResult');
            const cachedQrisk = this.dependencies.MemoryManager.retrieve('cvdCombinedView_lastQriskResult');
            this.frsResults = cachedFrs || this.frsResults; this.qriskResults = cachedQrisk || this.qriskResults;
            let performFullRecalc = false;
            if (currentPatientDataForRecalc && Object.keys(currentPatientDataForRecalc).length > 0) {
                if (!this.frsResults?.success || !this.qriskResults?.success) performFullRecalc = true;
                else { this._log('info', 'New patient data for combined view, triggering full combined calc.'); performFullRecalc = true; }
            }

            if (performFullRecalc && currentPatientDataForRecalc) {
                this._log('info', 'Performing fresh combined calculation via RiskCalculator.');
                this.combinedReportData = await this.dependencies.RiskCalculator.calculateCombinedRisk(currentPatientDataForRecalc, { generateRecommendations: true, generateComparison: true, useCache: false });
                if (!this.combinedReportData?.success) throw new Error(this.combinedReportData?.error || 'Combined calculation via RiskCalculator failed.');
                this.frsResults = this.combinedReportData.framingham; this.qriskResults = this.combinedReportData.qrisk3;
                if(this.frsResults?.success) this.dependencies.MemoryManager.store('cvdCombinedView_lastFrsResult', this.frsResults, { persist: 'session', expiry: this.options.cacheTTL });
                if(this.qriskResults?.success) this.dependencies.MemoryManager.store('cvdCombinedView_lastQriskResult', this.qriskResults, { persist: 'session', expiry: this.options.cacheTTL });
            } else if (this.frsResults?.success && this.qriskResults?.success) {
                this._log('info', 'Using existing FRS/QRISK3 results for combined view.');
                const basePatientData = this.frsResults.inputParameters || this.qriskResults.inputParameters || {};
                // Re-generate comparison and combined recommendations using the cached individual results
                this.combinedReportData = {
                    success: true, framingham: this.frsResults, qrisk3: this.qriskResults,
                    comparison: this.dependencies.RiskCalculator._compareCalculators(this.qriskResults, this.frsResults, basePatientData),
                    recommendations: await this.dependencies.RiskCalculator.treatmentRecommendations.generateComprehensiveRecommendations(basePatientData, { frs: this.frsResults, qrisk3: this.qriskResults }),
                    riskData: { frsData: this.frsResults.riskData, qriskData: this.qriskResults.riskData, comparison: this.dependencies.RiskCalculator._compareCalculators(this.qriskResults, this.frsResults, basePatientData) },
                    calculationDate: new Date().toISOString()
                };
            } else {
                this.dependencies.ResultsDisplayService.displayError?.('Combined', 'FRS and/or QRISK3 results are not available. Please calculate them individually first.');
                this.dependencies.EventBus.publish('combinedView:displayFailed', { error: 'Missing individual risk scores.' });
                return;
            }
            this.dependencies.ResultsDisplayService.displayResults('Combined', this.combinedReportData.riskData, this.combinedReportData.recommendations, this.combinedReportData.riskData, { preferredDisplay: this.preferredCalculatorDisplay });
            this.dependencies.MemoryManager.store('lastCombinedReportData', this.combinedReportData, { persist: 'session', expiry: this.options.cacheTTL });
            this.dependencies.EventBus.publish('combinedView:displayed', { results: this.combinedReportData });
            this._log('info', 'Combined risk assessment displayed.');
        } catch (error) { this._handleError(error, 'GenerateCombined'); this.dependencies.ResultsDisplayService.displayError?.('Combined', `Failed: ${error.message}`); this.dependencies.EventBus.publish('combinedView:displayFailed', { error: error.message });
        } finally { this.dependencies.LoadingManager.hide(); }
    }

    setPreferredCalculatorDisplay(preference) { /* ... (same as v1.1.0) ... */
        const S = this.dependencies.InputSanitizer; const sanitizedPref = S.escapeHTML(String(preference)).toLowerCase();
        const validPrefs = ['frs', 'qrisk3', 'combined', 'highest'];
        if (validPrefs.includes(sanitizedPref)) { this.preferredCalculatorDisplay = sanitizedPref; this._log('info', `Preferred display: ${this.preferredCalculatorDisplay}`); this.dependencies.EventBus.publish('combinedView:preferenceChanged', { preference: this.preferredCalculatorDisplay });
            if (this.combinedReportData) { this.dependencies.ResultsDisplayService.displayResults('Combined', this.combinedReportData.riskData, this.combinedReportData.recommendations, this.combinedReportData.riskData, { preferredDisplay: this.preferredCalculatorDisplay }); }
        } else this._log('warn', `Invalid display preference: ${preference}`);
    }

    // Helper to deep clone objects
    _deepClone(obj) { /* ... (same as v1.1.0) ... */
        if (obj === null || typeof obj !== 'object') return obj; try { return JSON.parse(JSON.stringify(obj)); } catch (e) { this._log('warn', 'Deep clone failed.', e); return Array.isArray(obj) ? [...obj] : {...obj}; }
    }
}

// Instantiate and export the singleton service
// const CombinedViewManagerServiceInstance = new CombinedViewManagerService({ /* dependencies */ });
// window.CombinedViewManagerService = CombinedViewManagerServiceInstance;
// export default CombinedViewManagerServiceInstance;
