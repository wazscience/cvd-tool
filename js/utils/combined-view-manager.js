/**
 * Enhanced Combined View Manager Service
 * @file /js/utils/combined-view-manager.js
 * @description Manages the "Combined FRS & QRISK3" view. It orchestrates
 * data retrieval/recalculation for FRS and QRISK3, triggers combined
 * risk assessment and recommendation generation via RiskCalculator,
 * and signals ResultsDisplayService (via EventBus or direct call if appropriate in AppUI)
 * to render the comprehensive combined view.
 * This version fuses functionalities from combined.js and combined-view-manager.js (v1.1.0).
 * @version 1.2.0
 * @exports CombinedViewManagerService
 */

'use strict';

// Assume necessary dependencies (ErrorLogger, EventBus, LoadingManager, RiskCalculator,
// ResultsDisplayService, MemoryManager, InputSanitizer) are available globally
// on window or passed via constructor if this were a real module system.
// For this Canvas environment, we'll refer to them as if they are available on `this.dependencies`.

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
            EventBus: window.EventBus || { subscribe: () => ({ unsubscribe: () => {} }), publish: () => {} },
            LoadingManager: window.LoadingManagerInstance || { show: () => {}, hide: () => {} },
            RiskCalculator: window.RiskCalculatorInstance, // Expected to be the main orchestrator instance
            ResultsDisplayService: window.AppResultsDisplay, // Expected instance
            MemoryManager: window.MemoryManagerInstance || { retrieve: () => null, store: () => true, remove: () => {} },
            InputSanitizer: window.InputSanitizerService || { escapeHTML: (v) => String(v) },
            ...options.dependencies,
        };

        this.options = {
            cacheTTL: 60 * 60 * 1000, // 1 hour for cached combined results
            preferredCalculatorDisplay: 'combined', // 'frs', 'qrisk3', 'combined', 'highest'
            debugMode: false,
            ...options,
        };

        this.frsResults = null; // Stores the latest FRS result object
        this.qriskResults = null; // Stores the latest QRISK3 result object
        this.combinedReportData = null; // Stores the full combined report data

        if (!this.dependencies.RiskCalculator) {
            this._handleError(new Error('RiskCalculator dependency is missing! CombinedViewManager cannot function.'), 'Init', true);
        }
        if (!this.dependencies.ResultsDisplayService) {
            this._handleError(new Error('ResultsDisplayService dependency is missing!'), 'Init', true);
        }

        this._initializeEventListeners();

        CombinedViewManagerService.instance = this;
        this._log('info', 'CombinedViewManagerService Initialized (v1.2.0).');
    }

    /**
     * Internal logging helper.
     * @param {'info'|'warn'|'error'|'debug'} level - Log level.
     * @param {string} message - The message.
     * @param {object} [data] - Additional data.
     * @private
     */
    _log(level, message, data) {
        this.dependencies.ErrorLogger.log?.(level, `CombinedViewMgrSvc: ${message}`, data);
    }

    /**
     * Internal error handling helper.
     * @param {Error} error - The error object.
     * @param {string} context - Context where the error occurred.
     * @param {boolean} [isUserFacing=false] - Whether to show a toast notification.
     * @param {object} [additionalData={}] - Additional data for logging.
     * @private
     */
    _handleError(error, context, isUserFacing = false, additionalData = {}) {
        const msg = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(msg, `CombinedViewMgrSvc-${context}`, 'error', { originalError: error, ...additionalData });
        if (isUserFacing) {
            this.dependencies.EventBus.publish('ui:showToast', { message: `Combined View Error (${context}): ${msg}`, type: 'error' });
        }
    }

    /**
     * Initializes event listeners for the service.
     * @private
     */
    _initializeEventListeners() {
        // Listen for completion of individual calculator runs
        this.dependencies.EventBus.subscribe('calculation:complete', (payload) => {
            if (!payload || !payload.results) return;
            if (payload.calculatorType === 'frs') {
                this.frsResults = payload.results;
                this.dependencies.MemoryManager.store('cvdCombinedView_lastFrsResult', payload.results, { persist: 'session', expiry: this.options.cacheTTL });
                this._log('debug', 'FRS result updated for combined view.', { score: payload.results.riskData?.score });
            } else if (payload.calculatorType === 'qrisk3') {
                this.qriskResults = payload.results;
                this.dependencies.MemoryManager.store('cvdCombinedView_lastQriskResult', payload.results, { persist: 'session', expiry: this.options.cacheTTL });
                this._log('debug', 'QRISK3 result updated for combined view.', { score: payload.results.riskData?.score });
            }
        });

        // Listen for explicit requests to update/display the combined view
        this.dependencies.EventBus.subscribe('combinedView:requestUpdate', async (payload) => {
            await this.generateAndDisplayCombinedAssessment(payload?.patientData);
        });

        // Listen for preference changes that might affect display
        this.dependencies.EventBus.subscribe('preferences:updated', (payload) => {
            if (payload?.preferences?.combinedView?.preferredCalculatorDisplay) {
                this.setPreferredCalculatorDisplay(payload.preferences.combinedView.preferredCalculatorDisplay);
            }
            if (payload?.preferences?.debugMode !== undefined) {
                this.options.debugMode = Boolean(payload.preferences.debugMode);
            }
        });
    }

    /**
     * Generates and displays the combined risk assessment.
     * This is the main orchestration method for the combined view.
     * @param {object} [currentPatientDataForRecalc=null] - Fresh patient data, typically from the
     * 'Medication & Labs' tab, to force recalculation of FRS and QRISK3 before combining.
     * If null, tries to use cached/last calculated FRS and QRISK3 results.
     * @public
     */
    async generateAndDisplayCombinedAssessment(currentPatientDataForRecalc = null) {
        this.dependencies.LoadingManager.show('Generating Combined Assessment...');
        try {
            this._log('info', 'Generating combined assessment.', { hasNewData: !!currentPatientDataForRecalc });

            // Attempt to retrieve the latest individual results from memory if no new data is provided
            if (!currentPatientDataForRecalc) {
                this.frsResults = this.dependencies.MemoryManager.retrieve('cvdCombinedView_lastFrsResult') || this.frsResults;
                this.qriskResults = this.dependencies.MemoryManager.retrieve('cvdCombinedView_lastQriskResult') || this.qriskResults;
            }

            // Check if we need to use RiskCalculator.calculateCombinedRisk or if we can use existing results
            // RiskCalculator.calculateCombinedRisk will handle sub-calculations if currentPatientDataForRecalc is provided
            // or if its internal cache for FRS/QRISK3 is stale/missing for that data.
            if (currentPatientDataForRecalc || !this.frsResults?.success || !this.qriskResults?.success) {
                if (!this.dependencies.RiskCalculator) {
                    throw new Error("RiskCalculator service is not available for combined assessment.");
                }
                this._log('info', 'Invoking RiskCalculator.calculateCombinedRisk for fresh combined data.');
                // Pass the raw form data from "Medication & Labs" (or active form) to RiskCalculator.
                // RiskCalculator's _prepareAndValidateData will be called internally for FRS and QRISK3.
                this.combinedReportData = await this.dependencies.RiskCalculator.calculateCombinedRisk(
                    currentPatientDataForRecalc,
                    {
                        generateRecommendations: true,
                        generateComparison: true,
                        useCache: false // Force recalc of sub-components if new data is given
                    }
                );

                if (!this.combinedReportData?.success) {
                    throw new Error(this.combinedReportData?.error || 'Combined calculation via RiskCalculator failed.');
                }
                // Update local FRS/QRISK results from the combined calculation
                this.frsResults = this.combinedReportData.framingham;
                this.qriskResults = this.combinedReportData.qrisk3;

                // Cache the individual results if they were successful
                if (this.frsResults?.success) {
                    this.dependencies.MemoryManager.store('cvdCombinedView_lastFrsResult', this.frsResults, { persist: 'session', expiry: this.options.cacheTTL });
                }
                if (this.qriskResults?.success) {
                    this.dependencies.MemoryManager.store('cvdCombinedView_lastQriskResult', this.qriskResults, { persist: 'session', expiry: this.options.cacheTTL });
                }

            } else if (this.frsResults?.success && this.qriskResults?.success) {
                // We have existing valid FRS and QRISK3 results, construct combinedReportData manually
                // This path is taken if combinedView:requestUpdate is called without new data.
                this._log('info', 'Using existing FRS/QRISK3 results to build combined view.');
                const basePatientData = this.frsResults.inputParameters || this.qriskResults.inputParameters || {};
                const comparison = this.dependencies.RiskCalculator._compareCalculators(this.qriskResults, this.frsResults, basePatientData);
                const recommendations = await this.dependencies.RiskCalculator.treatmentRecommendations.generateComprehensiveRecommendations(
                    basePatientData,
                    { frs: this.frsResults, qrisk3: this.qriskResults }
                );

                this.combinedReportData = {
                    success: true,
                    framingham: this.frsResults,
                    qrisk3: this.qriskResults,
                    comparison: comparison,
                    recommendations: recommendations,
                    riskData: { // Structure for ResultsDisplayService
                        frsData: this.frsResults.riskData,
                        qriskData: this.qriskResults.riskData,
                        comparison: comparison
                    },
                    inputParameters: basePatientData,
                    calculationDate: new Date().toISOString()
                };
            } else {
                // Not enough data to proceed
                this.dependencies.ResultsDisplayService.displayError?.('Combined', 'FRS and/or QRISK3 results are not available. Please calculate them individually or provide data via the main labs tab.');
                this.dependencies.EventBus.publish('combinedView:displayFailed', { error: 'Missing individual risk scores.' });
                this.dependencies.LoadingManager.hide();
                return;
            }

            // Display the combined results using ResultsDisplayService
            if (this.combinedReportData?.success) {
                this.dependencies.ResultsDisplayService.displayResults(
                    'Combined',
                    this.combinedReportData.riskData, // This should contain frsData, qriskData, and comparison
                    this.combinedReportData.recommendations,
                    this.combinedReportData.riskData, // chartData can be the same as riskData for combined view
                    { preferredDisplay: this.options.preferredCalculatorDisplay }
                );
                this.dependencies.MemoryManager.store('lastCombinedReportData', this.combinedReportData, { persist: 'session', expiry: this.options.cacheTTL });
                this.dependencies.EventBus.publish('combinedView:displayed', { results: this.combinedReportData });
                this._log('info', 'Combined risk assessment displayed successfully.');
            } else {
                 this._handleError(new Error(this.combinedReportData?.error || 'Failed to generate combined report data.'), 'GenerateCombined', true);
            }

        } catch (error) {
            this._handleError(error, 'GenerateCombinedAssessment', true);
            this.dependencies.ResultsDisplayService.displayError?.('Combined', `Failed to generate combined assessment: ${error.message}`);
            this.dependencies.EventBus.publish('combinedView:displayFailed', { error: error.message });
        } finally {
            this.dependencies.LoadingManager.hide();
        }
    }

    /**
     * Sets the preferred calculator display for the combined view.
     * @param {'frs'|'qrisk3'|'combined'|'highest'} preference
     * @public
     */
    setPreferredCalculatorDisplay(preference) {
        const S = this.dependencies.InputSanitizer;
        const sanitizedPref = S.escapeHTML(String(preference)).toLowerCase();
        const validPrefs = ['frs', 'qrisk3', 'combined', 'highest'];

        if (validPrefs.includes(sanitizedPref)) {
            this.options.preferredCalculatorDisplay = sanitizedPref;
            this._log('info', `Combined view preferred display set to: ${this.options.preferredCalculatorDisplay}`);
            this.dependencies.EventBus.publish('combinedView:preferenceChanged', { preference: this.options.preferredCalculatorDisplay });

            // If combined data already exists, re-trigger display with new preference
            if (this.combinedReportData && this.combinedReportData.success) {
                this.dependencies.ResultsDisplayService.displayResults(
                    'Combined',
                    this.combinedReportData.riskData,
                    this.combinedReportData.recommendations,
                    this.combinedReportData.riskData, // chartData
                    { preferredDisplay: this.options.preferredCalculatorDisplay }
                );
            }
        } else {
            this._log('warn', `Invalid display preference attempted: ${preference}`);
        }
    }

    /**
     * Retrieves the current combined report data.
     * @returns {object|null} The last generated combined report data.
     * @public
     */
    getCombinedReportData() {
        return this.combinedReportData ? this._deepClone(this.combinedReportData) : null;
    }

    /**
     * Clears all stored results related to the combined view.
     * @public
     */
    clearResults() {
        this.frsResults = null;
        this.qriskResults = null;
        this.combinedReportData = null;
        this.dependencies.MemoryManager.remove('cvdCombinedView_lastFrsResult');
        this.dependencies.MemoryManager.remove('cvdCombinedView_lastQriskResult');
        this.dependencies.MemoryManager.remove('lastCombinedReportData');
        this._log('info', 'Combined view results cleared.');
        this.dependencies.EventBus.publish('combinedView:cleared');
        // Optionally trigger UI update to clear display
        this.dependencies.ResultsDisplayService.displayError?.('Combined', 'Combined view data cleared. Please recalculate.');
    }

    /**
     * Helper to deep clone objects to prevent unintended modifications.
     * @param {object} obj - The object to clone.
     * @returns {object} A deep clone of the object.
     * @private
     */
    _deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            this._log('warn', 'Deep clone failed using JSON.stringify, falling back to shallow or manual.', e);
            // Basic shallow clone for simple objects as a fallback
            if (Array.isArray(obj)) return [...obj];
            if (typeof obj === 'object') return {...obj};
            return obj; // Should not happen if initial check is correct
        }
    }
}

// Instantiate and export the singleton service (typically done in main.js)
// Ensure dependencies are available on window or passed correctly.
// const CombinedViewManagerServiceInstance = new CombinedViewManagerService({
//     dependencies: {
//         ErrorLogger: window.ErrorDetectionSystemInstance,
//         EventBus: window.EventBus,
//         LoadingManager: window.LoadingManagerInstance,
//         RiskCalculator: window.RiskCalculatorInstance,
//         ResultsDisplayService: window.AppResultsDisplay,
//         MemoryManager: window.MemoryManagerInstance,
//         InputSanitizer: window.InputSanitizerService
//     }
// });
// window.CombinedViewManagerServiceInstance = CombinedViewManagerServiceInstance;
// export default CombinedViewManagerServiceInstance;
```

**Key changes and fusion logic in this `CombinedViewManagerService` v1.2.0:**

1.  **Singleton Structure**: Maintained from `combined-view-manager.js`.
2.  **Dependencies**: Clearly lists dependencies like `RiskCalculator` and `ResultsDisplayService` which are crucial.
3.  **State Management**:
    * `frsResults` and `qriskResults` store the latest individual calculation objects.
    * `combinedReportData` stores the comprehensive object returned by `RiskCalculator.calculateCombinedRisk`.
    * Uses `MemoryManager` to cache `frsResults`, `qriskResults`, and `combinedReportData` in session storage.
4.  **Event Handling**:
    * Listens to `calculation:complete` to update its internal `frsResults` and `qriskResults`.
    * The primary trigger is `combinedView:requestUpdate`, which calls `generateAndDisplayCombinedAssessment`. This event would be published by `AppUI` (e.g., when the "Combined View" tab is selected or an "Update Combined View" button is clicked).
    * Listens to `preferences:updated` for changes to `preferredCalculatorDisplay`.
5.  **`generateAndDisplayCombinedAssessment(currentPatientDataForRecalc = null)`**:
    * This is the core method.
    * If `currentPatientDataForRecalc` (e.g., from the "Medication & Labs" tab) is provided, or if cached individual FRS/QRISK3 results are missing/invalid, it calls `this.dependencies.RiskCalculator.calculateCombinedRisk()`. This central `RiskCalculator` method is expected to:
        * Internally (re)calculate FRS and QRISK3 using the provided patient data.
        * Perform the comparison between FRS and QRISK3.
        * Generate combined treatment recommendations.
        * Return a comprehensive object containing all this information.
    * If valid cached FRS and QRISK3 results exist and no new data is provided, it manually constructs the `combinedReportData` by calling the comparison and recommendation logic from `RiskCalculator` (or its sub-modules) using the cached results.
    * Finally, it calls `this.dependencies.ResultsDisplayService.displayResults('Combined', ...)` to render the entire combined view. The `ResultsDisplayService` will need a 'Combined' display profile in its selectors to handle the structured `riskData` (containing FRS, QRISK3, and comparison details) and `recommendations`.
6.  **No Direct DOM Manipulation**: This service does **not** directly manipulate the DOM for displaying results. It delegates this to `ResultsDisplayService`. This is a key improvement from the older `combined.js`.
7.  **Status Indicators**: The direct update of status indicators (like "FRS Calculated") is removed. `AppUI` should listen to `calculation:complete` events for FRS and QRISK3 to update these indicators. This service focuses on the combined view itself.
8.  **Copy Data**: The `copyDataBetweenCalculators` functionality is best handled by `AppUI` as it involves direct form interactions.
9.  **Preferred Calculator Display**: The `setPreferredCalculatorDisplay` method updates an internal option and can re-trigger the display via `ResultsDisplayService` if combined data is already available, allowing the `ResultsDisplayService` to adjust its rendering based on this preference.

This fused module is now more aligned with a service-oriented architecture, focusing on orchestration and data preparation for the combined view, while delegating UI updates and core calculations.

Next, I will work on fusing the chart rendering modules: `chart-renderer.js`, `improved-chart-renderer.js`, and the `RiskVisualization` class from `risk-visualization-module.js` into an enhanced `js/visualizations/chart-renderer.j