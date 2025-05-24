/**
 * Results Display Service Module
 * @file /js/ui/results-display.js
 * @description Manages the rendering of risk calculation results, recommendations,
 * and historical data in the UI. Provides hooks for charting.
 * @version 1.3.0
 * @exports ResultsDisplayService
 */

'use strict';

class ResultsDisplayService {
    /**
     * Creates or returns the singleton instance of ResultsDisplayService.
     * @param {object} [options={}] - Configuration options.
     * @param {object} options.selectors - DOM selectors for various display areas.
     * Example: {
     * frs: { resultArea: '#frs-results-area', riskPercent: '#frs-risk-percent', riskCategory: '#frs-risk-category', chartContainer: '#frs-chart-container', historyTable: '#frs-history-table' },
     * qrisk3: { resultArea: '#qrisk3-results-area', ... },
     * combined: { resultArea: '#combined-results-area', ... },
     * recommendations: '#recommendations-area'
     * }
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (ResultsDisplayService.instance) {
            return ResultsDisplayService.instance;
        }

        this.options = {
            selectors: { /* Default selectors can be defined here or must be passed */ },
            liveRegionDelay: 500, // ms, for ARIA live region updates
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || console,
            EventBus: window.EventBus,
            // ChartingModule: window.RiskVisualizationModule, // Example, if tightly coupled
            ...options.dependencies,
        };

        if (Object.keys(this.options.selectors).length === 0) {
            this._log('error', 'No selectors provided for results display areas. Service may not function.');
            // Critical error, this module is useless without selectors
            this.dependencies.ErrorLogger?.handleError('ResultsDisplay selectors missing', 'ResultsDisplay-Init', 'critical');
        }

        this._initLiveRegions();

        ResultsDisplayService.instance = this;
        this._log('info', 'Results Display Service Initialized.');
    }

    /**
     * Sets up ARIA live regions for dynamic result announcements.
     * @private
     */
    _initLiveRegions() {
        // Ensure live regions exist or create them. For simplicity, we assume they exist if selectors are provided.
        // Example: A general results live region
        this.resultsLiveRegion = document.getElementById('results-live-region'); // Assume this ID exists
        if (!this.resultsLiveRegion) {
            this._log('warn', 'ARIA live region for results (#results-live-region) not found. Accessibility for dynamic updates may be limited.');
            // Could create one dynamically if necessary
            // this.resultsLiveRegion = document.createElement('div');
            // this.resultsLiveRegion.id = 'results-live-region';
            // this.resultsLiveRegion.className = 'sr-only'; // Visually hidden
            // this.resultsLiveRegion.setAttribute('aria-live', 'assertive');
            // this.resultsLiveRegion.setAttribute('aria-atomic', 'true');
            // document.body.appendChild(this.resultsLiveRegion);
        }
    }

    /**
     * Announces a message to an ARIA live region.
     * @param {string} message - The message to announce.
     * @param {HTMLElement} [region=this.resultsLiveRegion] - Specific live region element.
     * @private
     */
    _announceToLiveRegion(message, region = this.resultsLiveRegion) {
        if (region) {
            // Clear previous content and then set new content after a short delay
            // This helps ensure screen readers announce the change reliably.
            region.textContent = '';
            setTimeout(() => {
                region.textContent = message;
            }, this.options.liveRegionDelay);
        }
    }

    /**
     * Clears a specific display area.
     * @param {string} areaSelector - CSS selector for the area to clear.
     * @private
     */
    _clearArea(areaSelector) {
        const area = document.querySelector(areaSelector);
        if (area) {
            area.innerHTML = ''; // Clear previous content
        } else {
            this._log('warn', `Attempted to clear non-existent area: ${areaSelector}`);
        }
    }

    /**
     * Displays results for a given calculator type.
     * @param {'FRS' | 'QRISK3' | 'Combined' | string} calculatorType - Type of calculator (e.g., 'FRS', 'QRISK3').
     * @param {object} resultsData - The core results data (e.g., { score: 15, category: 'High', details: {...} }).
     * @param {Array<object>} [recommendationsData=null] - Array of recommendation objects.
     * @param {object} [chartData=null] - Data specifically for charting.
     */
    displayResults(calculatorType, resultsData, recommendationsData = null, chartData = null) {
        const typeKey = calculatorType.toLowerCase();
        const selectors = this.options.selectors[typeKey];

        if (!selectors || !selectors.resultArea) {
            this._log('error', `No result area selector configured for calculator type: ${calculatorType}`);
            this.dependencies.EventBus?.publish(`results:${typeKey}:displayFailed`, { error: 'Configuration error' });
            return;
        }

        this._clearArea(selectors.resultArea);
        const resultAreaElement = document.querySelector(selectors.resultArea);
        if (!resultAreaElement) {
            this._log('error', `Result area DOM element not found for: ${selectors.resultArea}`);
            this.dependencies.EventBus?.publish(`results:${typeKey}:displayFailed`, { error: 'DOM element missing' });
            return;
        }

        try {
            // 1. Render Core Textual Results
            let summaryMessage = `Results for ${calculatorType}: `;
            if (resultsData) {
                // Example: Customize rendering based on calculatorType or resultsData structure
                const scoreEl = this._createResultElement('Score', resultsData.score, resultsData.unit || '%', selectors.riskPercent);
                const categoryEl = this._createResultElement('Category', resultsData.category, '', selectors.riskCategory);

                resultAreaElement.appendChild(scoreEl);
                resultAreaElement.appendChild(categoryEl);
                summaryMessage += `${resultsData.score}${resultsData.unit || '%'} risk, category ${resultsData.category}. `;

                // Add more details from resultsData.details if available
                if (resultsData.details) {
                    for (const [key, value] of Object.entries(resultsData.details)) {
                        resultAreaElement.appendChild(this._createResultElement(this._formatDetailKey(key), value));
                    }
                }
            } else {
                resultAreaElement.innerHTML = '<p class="error-message">Results are currently unavailable.</p>';
                summaryMessage = 'Results are unavailable.';
            }

            // 2. Handle Charting (Provide hook, don't draw here)
            if (selectors.chartContainer && chartData) {
                this._clearArea(selectors.chartContainer); // Ensure chart container is empty
                // Publish an event for the charting module to pick up
                this.dependencies.EventBus?.publish('chart:renderRequest', {
                    calculatorType,
                    targetElementId: selectors.chartContainer.startsWith('#') ? selectors.chartContainer.substring(1) : selectors.chartContainer,
                    data: chartData,
                    options: resultsData.chartOptions || {} // Pass any specific chart options
                });
                summaryMessage += ' Risk visualization is being generated. ';
            }

            // 3. Render Recommendations
            const recAreaSelector = this.options.selectors.recommendations || selectors.recommendationsArea;
            if (recAreaSelector && recommendationsData && recommendationsData.length > 0) {
                this._clearArea(recAreaSelector);
                const recAreaElement = document.querySelector(recAreaSelector);
                if (recAreaElement) {
                    const recList = document.createElement('ul');
                    recList.className = 'recommendations-list';
                    recommendationsData.forEach(rec => {
                        const li = document.createElement('li');
                        li.innerHTML = `<strong>${rec.title || 'Recommendation'}:</strong> ${rec.text}`;
                        // Add class based on rec.priority or rec.type if available
                        if (rec.priority) li.classList.add(`priority-${rec.priority}`);
                        recList.appendChild(li);
                    });
                    recAreaElement.appendChild(recList);
                    summaryMessage += `${recommendationsData.length} recommendation(s) provided.`;
                }
            }

            this._announceToLiveRegion(summaryMessage);
            this.dependencies.EventBus?.publish(`results:${typeKey}:displayed`, { resultsData, recommendationsData });
            this._log('info', `Displayed results for ${calculatorType}.`);

        } catch (error) {
            this._log('error', `Error displaying results for ${calculatorType}:`, error);
            resultAreaElement.innerHTML = '<p class="error-message">An error occurred while displaying results.</p>';
            this._announceToLiveRegion(`An error occurred displaying ${calculatorType} results.`);
            this.dependencies.EventBus?.publish(`results:${typeKey}:displayFailed`, { error: error.message });
        }
    }

    /**
     * Creates a DOM element for a single result item.
     * @param {string} label - The label for the result.
     * @param {string|number} value - The value of the result.
     * @param {string} [unit=''] - Optional unit.
     * @param {string} [targetSelector=null] - Optional specific selector to update directly.
     * @returns {HTMLElement} The created paragraph element.
     * @private
     */
    _createResultElement(label, value, unit = '', targetSelector = null) {
        if (targetSelector) {
            const targetEl = document.querySelector(targetSelector);
            if (targetEl) {
                targetEl.textContent = `${value}${unit}`; // Just update content of specific target
                // If we want a wrapper around it with a label, the HTML structure must allow it.
                // For simplicity, this example just updates the content.
                const tempWrapper = document.createElement('div'); // Temporary, not added to DOM
                tempWrapper.className = 'sr-only'; // For screen readers if the visual label is separate
                tempWrapper.textContent = `${label}: ${value}${unit}`;
                return tempWrapper; // Return a non-DOM element if updating target directly
            }
        }

        const p = document.createElement('p');
        p.className = `result-item result-item-${label.toLowerCase().replace(/\s+/g, '-')}`;
        const strong = document.createElement('strong');
        strong.textContent = `${label}: `;
        p.appendChild(strong);
        p.appendChild(document.createTextNode(`${value}${unit}`));
        return p;
    }

    /** Formats a detail key (e.g., 'heartAge' to 'Heart Age'). */
    _formatDetailKey(key) {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    /**
     * Displays historical calculation data in a table.
     * @param {string} calculatorType - Type of calculator (e.g., 'FRS', 'QRISK3').
     * @param {Array<object>} historyEntries - Array of historical data objects.
     */
    displayHistoricalData(calculatorType, historyEntries) {
        const typeKey = calculatorType.toLowerCase();
        const selectors = this.options.selectors[typeKey];

        if (!selectors || !selectors.historyTable) {
            this._log('warn', `No history table selector for ${calculatorType}. Cannot display history.`);
            return;
        }
        this._clearArea(selectors.historyTable);
        const tableContainer = document.querySelector(selectors.historyTable);

        if (!tableContainer) {
            this._log('error', `History table container not found: ${selectors.historyTable}`);
            return;
        }

        if (!historyEntries || historyEntries.length === 0) {
            tableContainer.innerHTML = '<p>No historical data available.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'history-table';
        const thead = table.createTHead();
        const tbody = table.createTBody();
        const headers = Object.keys(historyEntries[0]); // Assume first entry has all typical headers

        // Create table header
        const headerRow = thead.insertRow();
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = this._formatDetailKey(headerText);
            headerRow.appendChild(th);
        });

        // Create table body
        historyEntries.forEach(entry => {
            const row = tbody.insertRow();
            headers.forEach(header => {
                const cell = row.insertCell();
                cell.textContent = entry[header] !== undefined ? String(entry[header]) : 'N/A';
            });
        });

        tableContainer.appendChild(table);
        this._log('info', `Displayed historical data for ${calculatorType}.`);
        this.dependencies.EventBus?.publish(`history:${typeKey}:displayed`);
    }

    /** Internal logging helper. */
    _log(level, message, data) {
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `ResultsDisplay: ${message}`;
        if (level === 'error' && logger?.handleError) {
             logger.handleError(data || message, 'ResultsDisplay', 'error', data ? { msg: message } : {});
        } else if (logger?.log) {
            logger.log(level, logMessage, data);
        } else {
            console[level]?.(logMessage, data);
        }
    }
}

// Instantiate and export the singleton service
// Note: `options.selectors` is crucial and MUST be provided by the main application
// based on the actual DOM IDs/classes in index.html.
// const ResultsDisplayInstance = new ResultsDisplayService({
// selectors: {
// frs: { resultArea: '#frs-results', riskPercent: '#frs-risk-value', riskCategory: '#frs-risk-category', chartContainer: '#frs-chart', historyTable: '#frs-history' },
// qrisk3: { resultArea: '#qrisk-results', riskPercent: '#qrisk-risk-value', riskCategory: '#qrisk-risk-category', heartAge: '#qrisk-heart-age', chartContainer: '#qrisk-chart', historyTable: '#qrisk-history' },
// combined: { resultArea: '#combined-view', chartContainer: '#combined-chart', recommendationsArea: '#combined-recommendations' },
// recommendations: '#general-recommendations-area' // A global one or tab-specific
// }
// });
// window.ResultsDisplayInstance = ResultsDisplayInstance;

// Use this line if using ES modules
// export default ResultsDisplayService;