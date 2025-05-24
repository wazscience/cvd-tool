/**
 * UI Interaction Management for Enhanced CVD Risk Toolkit
 * @file /js/ui.js
 * @description Handles all primary user interface interactions, DOM manipulations,
 * event handling, and delegates tasks to specialized services.
 * Version: 5.0.3 (Aligned with index_html_v5_0_2_tabs_buttons_checked)
 * Base: User-uploaded ui.js
 * @exports AppUI
 */

'use strict';

class AppUI {
    /**
     * Initializes the AppUI module.
     * @param {object} dependencies - An object containing all necessary service instances and classes.
     */
    constructor(dependencies) {
        this.dependencies = { // Default stubs for robustness
            EventBus: { subscribe: () => ({ unsubscribe: () => {} }), publish: () => {} },
            ErrorLogger: { handleError: console.error, log: console.log },
            LoadingManager: { show: () => {}, hide: () => {} },
            TabManager: { switchToTab: () => {}, getCurrentTabPanelId: () => null },
            ValidationHelpers: {},
            FormHandler: class {}, // FormHandler class to be instantiated
            ResultsDisplayService: { displayResults: () => {}, displayError: () => {}, clearResults: () => {}, appendResults: () => {} },
            InputSanitizerService: { escapeHTML: (v) => String(v), sanitizeObjectOrArray: (v) => v },
            PDFServiceInstance: { generateReport: async () => {} },
            RiskCalculator: { /* instance with calculation methods */ },
            DataManagerInstance: { getItem: async () => null, setItem: async () => {}, exportData: async () => {} },
            MainDisclaimerServiceInstance: { show: () => {}, isCurrentVersionAccepted: () => true, setLanguage: () => {}, setRegion: () => {} },
            CrossTabSyncInstance: { sendCustomBroadcast: () => {} },
            MemoryManager: { getMemoryStats: () => ({}), retrieve: () => null, store: () => {} },
            DeviceCapabilities: { getCapabilities: () => ({}) }, // Assuming a getCapabilities method
            ThemeManager: { toggleTheme: () => {}, applyTheme: () => {} }, // Assuming a ThemeManager
            ChartManager: { renderChart: () => {}, destroyChart: () => {} }, // Assuming a ChartManager
            FieldMapperService: { /* methods for mapping */ },
            EMRConnectorService: { /* methods for EMR */ },
            JunoIntegrationService: { /* methods for Juno */ },
            // Add other specific services if needed by UI directly
            ...dependencies // Actual dependencies injected by main.js
        };

        this.elements = { // Main categories for DOM elements
            forms: {},
            buttons: {},
            resultContainers: {}, // For areas where multiple results are appended
            resultLists: {}, // Specific list divs inside containers
            inputs: {}, // For individual important inputs
            selects: {}, // For individual important selects
            toggles: {}, // For checkboxes/radios that control UI state
            modals: {},
            navigation: {},
            displayAreas: {}, // For general text display, statuses
            charts: {} // For canvas elements
        };
        this.formHandlers = {}; // To store FormHandler instances
        this.calculationCounters = {}; // To number multiple calculation outputs, e.g., { frs: 0, qrisk3: 0 }

        if (!this.dependencies.ErrorLogger.log || !this.dependencies.ErrorLogger.handleError) {
            this.dependencies.ErrorLogger = { handleError: console.error, log: console.log };
        }
        this.dependencies.ErrorLogger.log('info', 'AppUI Constructor called.', 'AppUI');
    }

    async initialize() {
        await RuntimeProtection.tryCatch(async () => {
            this.dependencies.ErrorLogger.log('info', 'AppUI Initializing all components...', 'AppUI-Init');
            this._cacheDOMReferences();
            this._setupGlobalUIEventListeners();
            this._initializeForms(); // Sets up FormHandlers
            this._setupSpecificButtonListeners(); // For buttons not part of a FormHandler's submit
            this._setupTabChangeHandlers();
            this._initializeCommonUIElements(); // Theme, tooltips, modals etc.
            this._initializeDataManagementUIEvents(); // Listeners specific to Data I/O tab
            this._initializeAdvancedVizUIEvents(); // Listeners specific to Advanced Viz tab
            this._initializeSettingsUIEvents(); // Listeners specific to Settings tab
            this._initializeDisclaimerRelatedUI();
            this._loadInitialUIState();

            this.dependencies.EventBus.publish('ui:initialized', { success: true });
            this.dependencies.ErrorLogger.log('info', 'AppUI Initialization Complete.', 'AppUI-Init');
        }, (error) => {
            this.dependencies.ErrorLogger.handleError('Critical error during AppUI initialization.', 'AppUI-Init', 'critical', { error });
        })();
    }

    _cacheDOMReferences() {
        this.dependencies.ErrorLogger.log('debug', 'Caching AppUI DOM references...', 'AppUI-CacheDOM');
        const S = this.dependencies.InputSanitizerService; // For safety, though not strictly needed for getElementById

        // Forms
        this.elements.forms.medicationLabs = document.getElementById('medication-labs-form');
        this.elements.forms.frs = document.getElementById('frs-form');
        this.elements.forms.qrisk3 = document.getElementById('qrisk-form'); // Corrected from qrisk to qrisk3
        this.elements.forms.dataImport = document.getElementById('data-import-form');
        this.elements.forms.dataExport = document.getElementById('data-export-form');
        this.elements.forms.advancedViz = document.getElementById('advanced-viz-form');
        this.elements.forms.researchContact = document.getElementById('research-contact-form');
        this.elements.forms.appSettings = document.getElementById('app-settings-form');

        // Tab Navigation
        this.elements.navigation.tabsContainer = document.querySelector('.tabs-navigation');

        // Buttons (Specific actions)
        // Meds & Labs Tab
        this.elements.buttons.saveMedicationLabs = document.getElementById('save-medication-labs');
        this.elements.buttons.resetMedicationLabs = document.getElementById('reset-medication-labs');
        this.elements.buttons.calculateSbpSd = document.getElementById('calculate-sbp-sd-button');

        // FRS Tab
        this.elements.buttons.calculateFrs = document.getElementById('calculate-frs-button');
        this.elements.buttons.resetFrs = document.getElementById('reset-frs-form');

        // QRISK3 Tab
        this.elements.buttons.calculateQrisk3 = document.getElementById('calculate-qrisk3-button');
        this.elements.buttons.resetQrisk3 = document.getElementById('reset-qrisk3-form');

        // Combined View Tab
        this.elements.buttons.updateCombinedView = document.getElementById('update-combined-view-action-btn');
        this.elements.buttons.resetCombinedView = document.getElementById('reset-combined-view-button');
        this.elements.buttons.printCombinedReport = document.getElementById('print-combined-report-button');
        this.elements.buttons.exportCombinedPdf = document.getElementById('export-combined-report-pdf-button'); // ID from HTML
        this.elements.buttons.exportCombinedData = document.getElementById('export-combined-data-button');


        // Advanced Visualization Tab
        this.elements.buttons.generateAdvancedViz = document.getElementById('generate-advanced-viz-action-btn');
        this.elements.buttons.resetAdvancedViz = document.getElementById('reset-advanced-viz-button');
        this.elements.buttons.printAdvancedViz = document.getElementById('print-advanced-viz-button');
        this.elements.buttons.exportAdvancedVizPdf = document.getElementById('export-advanced-viz-pdf-button');
        this.elements.buttons.exportAdvancedVizData = document.getElementById('export-advanced-viz-data-button');


        // Data I/O Tab
        this.elements.buttons.importData = document.getElementById('import-data-action-btn');
        this.elements.buttons.exportData = document.getElementById('export-data-action-btn');
        this.elements.buttons.emrConfigure = document.getElementById('emr-configure-action-btn');
        this.elements.buttons.emrPullData = document.getElementById('emr-pull-data-action-btn');
        this.elements.buttons.emrPushData = document.getElementById('emr-push-data-action-btn');

        // Settings Tab
        this.elements.buttons.saveSettings = document.getElementById('save-settings-action-btn');
        this.elements.buttons.clearAllData = document.getElementById('clear-all-data-action-btn');

        // Header Buttons
        this.elements.buttons.themeToggle = document.getElementById('theme-toggle-button');
        this.elements.buttons.fontSizeIncrease = document.getElementById('font-size-increase-button');
        this.elements.buttons.fontSizeDecrease = document.getElementById('font-size-decrease-button');
        this.elements.buttons.settingsHeader = document.getElementById('settings-button-header'); // For main settings modal

        // Result Containers (overall containers for each tab that might hold multiple results)
        this.elements.resultContainers.frs = document.getElementById('frs-results-container');
        this.elements.resultContainers.qrisk3 = document.getElementById('qrisk3-results-container');
        this.elements.resultContainers.combined = document.getElementById('combined-results-display-area');
        this.elements.resultContainers.advancedViz = document.getElementById('advanced-visualization-output-area');
        this.elements.resultContainers.recommendations = document.getElementById('recommendations-content-area');
        this.elements.resultContainers.history = document.getElementById('assessment-history-list-area');


        // Result Lists (specific divs inside containers for appending multiple results)
        this.elements.resultLists.frs = document.getElementById('frs-results-list');
        this.elements.resultLists.qrisk3 = document.getElementById('qrisk3-results-list');
        this.elements.resultLists.combined = document.getElementById('combined-results-list');
        this.elements.resultLists.advancedViz = document.getElementById('advanced-viz-results-list');

        // Chart Canvases (from templates or specific IDs)
        // Note: Chart canvases inside templates will be cloned. These are for charts directly in main HTML.
        this.elements.charts.frsChart = document.getElementById('frs-chart'); // In FRS tab for single result
        this.elements.charts.qrisk3Chart = document.getElementById('qrisk3-chart'); // In QRISK3 tab for single result
        this.elements.charts.combinedRiskChart = document.getElementById('combined-risk-chart'); // In Combined View tab
        // Advanced viz chart canvas will be dynamically created or targeted via its container.

        // Status Indicators
        this.elements.displayAreas.combinedFrsStatus = document.getElementById('combined-frs-status-indicator');
        this.elements.displayAreas.combinedQriskStatus = document.getElementById('combined-qrisk-status-indicator');
        this.elements.displayAreas.emrStatus = document.getElementById('emr-status-message-area');
        this.elements.displayAreas.importStatus = document.getElementById('import-status-message-area');
        this.elements.displayAreas.exportStatus = document.getElementById('export-status-message-area');

        // Specific Inputs/Selects for direct manipulation or reading
        this.elements.inputs.mlSex = document.getElementById('ml-sex'); // For erectile dysfunction toggle
        this.elements.selects.vizCalculator = document.getElementById('viz-calculator-select');
        this.elements.selects.vizType = document.getElementById('viz-type-select');
        this.elements.displayAreas.dynamicVizOptions = document.getElementById('dynamic-viz-options-container');

        // Modals (main containers)
        this.elements.modals.settings = document.getElementById('settings-modal-main'); // Assuming this is the main settings modal ID
        this.elements.modals.disclaimer = document.getElementById('main-disclaimer-modal'); // From template
        this.elements.modals.terms = document.getElementById('terms-modal'); // From template
        this.elements.modals.integrationSetup = document.getElementById('integration-setup-modal-main'); // From template, if used for emr-configure-action-btn

        // Logo for theme change
        this.elements.displayAreas.appLogo = document.getElementById('app-logo-header');

        // Disclaimer Alert
        this.elements.displayAreas.disclaimerAlertMain = document.getElementById('disclaimer-alert-main');
        this.elements.buttons.disclaimerAlertClose = this.elements.displayAreas.disclaimerAlertMain?.querySelector('.alert-close');

        this.dependencies.ErrorLogger.log('debug', 'DOM references cached.', 'AppUI-CacheDOM', { count: Object.keys(this.elements).reduce((acc, key) => acc + Object.keys(this.elements[key]).length, 0) });
    }

    _setupGlobalUIEventListeners() {
        this.dependencies.EventBus.subscribe('ui:themeChanged', (payload) => this._handleThemeChange(payload.theme));
        this.dependencies.EventBus.subscribe('app:updateAvailable', (payload) => this._showToast(payload.message || 'New version available. Refresh.', 'info', { duration: 10000, action: { text: 'Refresh', callback: () => window.location.reload() } }));
        this.dependencies.EventBus.subscribe('app:controllerChanged', (payload) => this._showToast(payload.message || 'App updated. Please refresh.', 'info', { duration: 10000, action: { text: 'Refresh', callback: () => window.location.reload() } }));
        this.dependencies.EventBus.subscribe('network:statusChange', (payload) => {
            document.body.classList.toggle('offline-mode', !payload.isOnline);
            this._showToast(payload.isOnline ? 'Connection restored.' : 'You are offline. Features may be limited.', payload.isOnline ? 'success' : 'warning');
        });
        this.dependencies.EventBus.subscribe('juno:patientDataReadyForUI', (payload) => this._populateFormsWithEMRData(payload.internalData));
        this.dependencies.EventBus.subscribe('juno:formCancelled', () => this._resetAllCalculatorForms()); // Assuming this event exists
        this.dependencies.EventBus.subscribe('ui:requestConfirmation', (payload) => this._handleConfirmationRequest(payload));
        this.dependencies.EventBus.subscribe('data:exported', (payload) => this._showToast(`Data exported successfully as ${payload.format}.`, 'success'));
        this.dependencies.EventBus.subscribe('data:imported', (payload) => this._showToast(`${payload.recordCount} records imported successfully.`, 'success'));
        this.dependencies.EventBus.subscribe('error:display', (payload) => this._showToast(payload.message, 'error', {duration: 7000}));


        // Handle clicks on elements with data-modal-target to open modals
        document.body.addEventListener('click', (event) => {
            const target = event.target.closest('[data-modal-target]');
            if (target) {
                const modalId = target.dataset.modalTarget;
                const modal = document.getElementById(modalId);
                if (modal) {
                    this._openModal(modal);
                } else if (target.dataset.disclaimerKey) { // For disclaimer links using templates
                    this._showDisclaimerModalByKey(target.dataset.disclaimerKey);
                }
            }
            // Handle clicks on elements with modal-close-button class
            if (event.target.classList.contains('modal-close-button') || event.target.closest('.modal-close-button')) {
                const modal = event.target.closest('.modal');
                if (modal) {
                    this._closeModal(modal);
                }
            }
        });
         // Close modal on Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active'); // Or .modal[open]
                if (activeModal) {
                    this._closeModal(activeModal);
                }
            }
        });
    }

    _initializeForms() {
        this.dependencies.ErrorLogger.log('debug', 'Initializing AppUI FormHandlers...', 'AppUI-Forms');
        Object.entries(this.elements.forms).forEach(([formKey, formElement]) => {
            if (formElement) {
                const formName = formElement.id; // Use the actual ID
                this.formHandlers[formName] = new this.dependencies.FormHandler(formElement, {
                    onSubmit: async (formDataObject, formHandlerInstance) => this._handleFormSubmit(formName, formDataObject, formHandlerInstance),
                    onValidate: async (formDataObject, formEl) => this._validateForm(formName, formDataObject, formEl), // Not strictly needed if FormHandler does its own validation
                    onReset: (formHandlerInstance) => this._handleFormReset(formName, formHandlerInstance),
                    dependencies: {
                        ErrorLogger: this.dependencies.ErrorLogger,
                        EventBus: this.dependencies.EventBus,
                        LoadingManager: this.dependencies.LoadingManager,
                        ValidationHelpers: this.dependencies.ValidationHelpers,
                        InputSanitizer: this.dependencies.InputSanitizerService
                    }
                });
                this.dependencies.ErrorLogger.log('info', `FormHandler initialized for: ${formName}`, 'AppUI-Forms');
                this._setupFormSpecificDynamicBehaviors(formElement);
            } else {
                this.dependencies.ErrorLogger.log('warn', `Form element not found for key: ${formKey}`, 'AppUI-Forms');
            }
        });
    }

    _setupFormSpecificDynamicBehaviors(formElement) {
        // Auto-calculate BMI
        const heightInput = formElement.querySelector('input[name="height"]');
        const weightInput = formElement.querySelector('input[name="weight"]');
        const bmiOutput = formElement.querySelector('input[name="bmi"]');
        const heightUnitSelect = formElement.querySelector('select[name="height_unit"]');
        const weightUnitSelect = formElement.querySelector('select[name="weight_unit"]');

        const updateBMI = () => {
            if (heightInput && weightInput && bmiOutput && heightInput.value && weightInput.value) {
                const height = parseFloat(heightInput.value);
                const weight = parseFloat(weightInput.value);
                const hUnit = heightUnitSelect ? heightUnitSelect.value : 'cm';
                const wUnit = weightUnitSelect ? weightUnitSelect.value : 'kg';
                if (!isNaN(height) && !isNaN(weight)) {
                    const { value: bmiVal } = this.dependencies.ValidationHelpers.calculateBMI(height, weight, hUnit, wUnit);
                    bmiOutput.value = bmiVal !== null ? bmiVal.toFixed(1) : '';
                } else {
                    bmiOutput.value = '';
                }
            }
        };
        [heightInput, weightInput, heightUnitSelect, weightUnitSelect].forEach(el => el?.addEventListener('input', updateBMI));
        if(heightInput && weightInput) updateBMI(); // Initial calculation

        // Auto-calculate Cholesterol/HDL Ratio (relevant for QRISK3 form inputs, but primary calculation from Meds/Labs)
        const totalCholInput = formElement.querySelector('input[name="total_cholesterol"]');
        const hdlCholInput = formElement.querySelector('input[name="hdl_cholesterol"]');
        const ratioOutput = formElement.querySelector('input[name="cholesterol_hdl_ratio"]'); // Target QRISK3 ratio field
        const tcUnitSelect = formElement.querySelector('select[name="total_cholesterol_unit"]');
        const hdlUnitSelect = formElement.querySelector('select[name="hdl_cholesterol_unit"]');

        const updateCholesterolRatio = () => {
            if (totalCholInput && hdlCholInput && ratioOutput && totalCholInput.value && hdlCholInput.value) {
                let tc = parseFloat(totalCholInput.value);
                let hdl = parseFloat(hdlCholInput.value);
                const tcUnit = tcUnitSelect ? tcUnitSelect.value : 'mmol/L';
                const hdlUnit = hdlUnitSelect ? hdlUnitSelect.value : 'mmol/L';

                // Convert to mmol/L if necessary for calculation consistency
                if (tcUnit === 'mg_dl') tc = this.dependencies.ValidationHelpers.convertCholesterolToMmolL(tc);
                if (hdlUnit === 'mg_dl') hdl = this.dependencies.ValidationHelpers.convertCholesterolToMmolL(hdl);

                if (!isNaN(tc) && !isNaN(hdl) && hdl !== 0) {
                    ratioOutput.value = (tc / hdl).toFixed(1);
                } else {
                    ratioOutput.value = '';
                }
            } else if (ratioOutput) {
                ratioOutput.value = '';
            }
        };
        [totalCholInput, hdlCholInput, tcUnitSelect, hdlUnitSelect].forEach(el => el?.addEventListener('input', updateCholesterolRatio));
        if(totalCholInput && hdlCholInput) updateCholesterolRatio(); // Initial

        // Conditional display for erectile dysfunction based on sex (in Meds/Labs and QRISK3)
        const sexSelect = formElement.querySelector('select[name="sex"]'); // e.g., ml-sex or qrisk-sex
        const edGroup = formElement.querySelector('[id*="-erectile-dysfunction-group"]'); // e.g., ml-erectile-dysfunction-group
        if (sexSelect && edGroup) {
            const toggleED = () => { edGroup.style.display = sexSelect.value === 'male' ? '' : 'none'; };
            sexSelect.addEventListener('change', toggleED);
            toggleED(); // Initial state
        }
    }


    _setupSpecificButtonListeners() {
        // Meds & Labs Tab
        this.elements.buttons.calculateSbpSd?.addEventListener('click', () => this._handleCalculateSbpSd());

        // Combined View Tab
        this.elements.buttons.updateCombinedView?.addEventListener('click', () => this._handleUpdateCombinedView());
        this.elements.buttons.resetCombinedView?.addEventListener('click', () => this._handleResetCombinedView());
        this.elements.buttons.printCombinedReport?.addEventListener('click', () => this._handlePrint('combined'));
        this.elements.buttons.exportCombinedPdf?.addEventListener('click', () => this._handleExport('combined', 'pdf'));
        this.elements.buttons.exportCombinedData?.addEventListener('click', () => this._handleExport('combined', 'json')); // Or allow user to choose format

        // Advanced Viz Tab
        this.elements.buttons.generateAdvancedViz?.addEventListener('click', () => this._handleGenerateAdvancedViz()); // This might be handled by form submit too
        this.elements.buttons.resetAdvancedViz?.addEventListener('click', () => this._handleResetAdvancedViz());
        this.elements.buttons.printAdvancedViz?.addEventListener('click', () => this._handlePrint('advancedViz'));
        this.elements.buttons.exportAdvancedVizPdf?.addEventListener('click', () => this._handleExport('advancedViz', 'pdf'));
        this.elements.buttons.exportAdvancedVizData?.addEventListener('click', () => this._handleExport('advancedViz', 'json'));

        // Data I/O Tab
        this.elements.buttons.importData?.addEventListener('click', () => this._handleImportData()); // This might be handled by form submit too
        this.elements.buttons.exportData?.addEventListener('click', () => this._handleExportDataMain()); // This might be handled by form submit too
        this.elements.buttons.emrConfigure?.addEventListener('click', () => this._openModalById('integration-setup-modal-main')); // Assuming template ID is used for modal
        this.elements.buttons.emrPullData?.addEventListener('click', () => this.dependencies.EMRConnectorService?.fetchPatientData());
        this.elements.buttons.emrPushData?.addEventListener('click', () => this.dependencies.EMRConnectorService?.sendReport());

        // Settings Tab
        this.elements.buttons.saveSettings?.addEventListener('click', () => this._handleSaveSettings());
        this.elements.buttons.clearAllData?.addEventListener('click', () => {
            this.dependencies.EventBus.publish('ui:requestConfirmation', {
                message: 'Are you sure you want to clear all locally stored data and reset the application? This cannot be undone.',
                onConfirm: () => {
                    this.dependencies.DataManagerInstance.clearAllData()
                        .then(() => this._showToast('All data cleared.', 'success'))
                        .catch(e => this._handleError(e, 'ClearAllData'));
                    // Optionally reload or reset UI further
                    window.location.reload(); // Simplest way to reset everything
                }
            });
        });

        // Header Buttons
        this.elements.buttons.themeToggle?.addEventListener('click', () => this.dependencies.ThemeManager.toggleTheme());
        this.elements.buttons.fontSizeIncrease?.addEventListener('click', () => this._changeBaseFontSize(1));
        this.elements.buttons.fontSizeDecrease?.addEventListener('click', () => this._changeBaseFontSize(-1));
        this.elements.buttons.settingsHeader?.addEventListener('click', () => this._openModalById('settings-modal-main')); // Assuming template ID is used for modal

        // Disclaimer Alert Close
        this.elements.buttons.disclaimerAlertClose?.addEventListener('click', () => {
            if (this.elements.displayAreas.disclaimerAlertMain) {
                this.elements.displayAreas.disclaimerAlertMain.style.display = 'none';
                localStorage.setItem('disclaimer-alert-dismissed', 'true');
            }
        });
    }

    _setupTabChangeHandlers() {
        // TabManager handles the actual tab switching.
        // AppUI can subscribe to TabManager's events if specific UI updates are needed on tab change.
        this.dependencies.EventBus.subscribe('tab:changed', (eventData) => {
            this.dependencies.ErrorLogger.log('info', `AppUI: Tab changed to panel ${eventData.panelId}`, 'AppUI-Tabs');
            // Example: If switching to combined view, trigger an update.
            if (eventData.panelId === 'panel-combined') {
                this._handleUpdateCombinedView();
            }
            // Example: If switching to advanced viz, maybe clear previous viz options.
            if (eventData.panelId === 'panel-advanced-viz') {
                // Potentially reset some state in the advanced viz form
            }
        });
    }

    _initializeCommonUIElements() {
        // Tooltips: Find all elements with data-tooltip and initialize
        document.querySelectorAll('[data-tooltip]').forEach(el => {
            // Basic tooltip implementation (can be enhanced)
            el.addEventListener('mouseenter', (e) => {
                const tooltipText = e.currentTarget.dataset.tooltip;
                if (!tooltipText) return;
                let tooltipEl = document.getElementById('app-tooltip');
                if (!tooltipEl) {
                    tooltipEl = document.createElement('div');
                    tooltipEl.id = 'app-tooltip';
                    tooltipEl.className = 'tooltip-popup'; // Add a class for styling
                    document.body.appendChild(tooltipEl);
                }
                tooltipEl.textContent = tooltipText;
                tooltipEl.style.display = 'block';
                tooltipEl.style.left = `${e.pageX + 10}px`;
                tooltipEl.style.top = `${e.pageY + 10}px`;
            });
            el.addEventListener('mouseleave', () => {
                const tooltipEl = document.getElementById('app-tooltip');
                if (tooltipEl) tooltipEl.style.display = 'none';
            });
            el.addEventListener('mousemove', (e) => {
                 const tooltipEl = document.getElementById('app-tooltip');
                 if (tooltipEl && tooltipEl.style.display === 'block') {
                    tooltipEl.style.left = `${e.pageX + 10}px`;
                    tooltipEl.style.top = `${e.pageY + 10}px`;
                 }
            });
        });
    }

    _initializeDataManagementUIEvents() {
        // Specific listeners for buttons within the Data I/O tab if not handled by FormHandler
        // e.g., if import/export have steps or previews before final action.
        const importFileInput = document.getElementById('patient-data-import-file-input');
        importFileInput?.addEventListener('change', (event) => {
            if (event.target.files && event.target.files[0]) {
                this.dependencies.EventBus.publish('data:fileSelectedForImport', { file: event.target.files[0] });
                // Potentially show file name or trigger preview via DataManager
            }
        });
    }
    _initializeAdvancedVizUIEvents() {
        // Listen for changes in viz type to update dynamic options
        this.elements.selects.vizType?.addEventListener('change', (event) => {
            this._updateAdvancedVizOptions(event.target.value);
        });
        this._updateAdvancedVizOptions(this.elements.selects.vizType?.value); // Initial call
    }

    _initializeSettingsUIEvents() {
        // Listeners for settings changes if they need immediate UI feedback beyond form save
    }

    _initializeDisclaimerRelatedUI() {
        // For footer links or other disclaimer triggers not handled by data-modal-target
        document.querySelectorAll('.disclaimer-link[data-disclaimer-key]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const key = e.currentTarget.dataset.disclaimerKey;
                this._showDisclaimerModalByKey(key);
            });
        });
    }


    async _handleFormSubmit(formId, formDataObject, formHandlerInstance) {
        this.dependencies.LoadingManager.show('Processing...');
        this.dependencies.ErrorLogger.log('info', `AppUI: Submitting form ${formId}`, { dataKeys: Object.keys(formDataObject) }, 'AppUI-Submit');
        const RC = this.dependencies.RiskCalculator;
        const Display = this.dependencies.ResultsDisplayService;
        const EventBus = this.dependencies.EventBus;
        let resultData = {};
        let displayType = formId.replace('-form', ''); // e.g., 'frs', 'qrisk3'
        this.calculationCounters[displayType] = (this.calculationCounters[displayType] || 0) + 1;

        try {
            switch (formId) {
                case 'medication-labs-form':
                    // This form primarily saves data. Calculations are triggered by other buttons.
                    // However, it might auto-update dependent fields or trigger some pre-calcs.
                    await this.dependencies.DataManagerInstance.savePatientData(formDataObject); // Assuming a method in DataManager
                    this._showToast('Patient data saved.', 'success');
                    EventBus.publish('data:medicationLabsSaved', { data: formDataObject });
                    // Auto-populate FRS and QRISK3 forms
                    this._autoPopulateCalculators(formDataObject);
                    break;
                case 'frs-form':
                    resultData = await RC.calculateFraminghamRisk(formDataObject);
                    displayType = 'frs';
                    break;
                case 'qrisk-form': // Corrected from qrisk3-form to match HTML ID
                    resultData = await RC.calculateQRISK3(formDataObject);
                    displayType = 'qrisk3';
                    break;
                case 'data-import-form':
                    // This would be handled by DataManager after file selection
                    this._showToast('File import initiated.', 'info'); // Actual import logic in DataManager
                    break;
                case 'data-export-form':
                    await this._handleExportDataMain(formDataObject); // Pass form data for export options
                    break;
                case 'advanced-viz-form': // If submit button is used instead of generate button
                    this._handleGenerateAdvancedViz(formDataObject);
                    break;
                case 'research-contact-form':
                    // Placeholder for actual submission
                    this._showToast('Thank you for your feedback!', 'success');
                    formHandlerInstance.form.reset();
                    break;
                case 'app-settings-form':
                    this._handleSaveSettings(formDataObject); // Pass data if form submit is used
                    break;
                default:
                    throw new Error(`No submit handler configured for form ID: ${formId}`);
            }

            if (resultData && resultData.success) {
                // Use appendResults for FRS and QRISK3
                if (displayType === 'frs' || displayType === 'qrisk3') {
                    Display.appendResults(
                        displayType,
                        resultData.riskData,
                        resultData.recommendations,
                        resultData.chartData,
                        this.calculationCounters[displayType]
                    );
                } else if (resultData.riskData) { // For other types that might have single display
                     Display.displayResults(
                        displayType,
                        resultData.riskData,
                        resultData.recommendations,
                        resultData.chartData
                    );
                }
                EventBus.publish(`form:${formId}:submitted`, { success: true, results: resultData });
                if (formId === 'frs-form') this._updateCombinedViewStatus('frs', true);
                if (formId === 'qrisk-form') this._updateCombinedViewStatus('qrisk3', true);
            } else if (resultData && !resultData.success) {
                throw new Error(resultData.error || `Calculation failed for ${formId}`);
            }

        } catch (error) {
            this.dependencies.ErrorLogger.handleError(error, `FormSubmit-${formId}`, 'error', { formDataObject });
            Display.displayError(displayType, error.message || 'An unexpected error occurred during processing.');
            EventBus.publish(`form:${formId}:submissionFailed`, { success: false, error: error.message });
        } finally {
            this.dependencies.LoadingManager.hide();
        }
    }

    _handleFormReset(formId, formHandlerInstance) {
        this.dependencies.ErrorLogger.log('info', `AppUI: Form reset for ${formId}`, 'AppUI-Reset');
        const Display = this.dependencies.ResultsDisplayService;
        const EventBus = this.dependencies.EventBus;
        const displayType = formId.replace('-form', '');

        // Clear the specific list container for multiple results
        const resultListContainer = this.elements.resultLists[displayType];
        if (resultListContainer) {
            resultListContainer.innerHTML = ''; // Clear all appended results
            this.calculationCounters[displayType] = 0; // Reset counter
        } else { // Fallback for single result display areas if list container not found
            const resultContainer = this.elements.resultContainers[displayType];
            if (resultContainer) resultContainer.innerHTML = '<p><em>Enter data and calculate.</em></p>'; // Or clear completely
        }


        // Clear any specific status indicators related to this form
        if (formId === 'frs-form') this._updateCombinedViewStatus('frs', false);
        if (formId === 'qrisk-form') this._updateCombinedViewStatus('qrisk3', false); // Corrected key

        // Re-initialize dynamic behaviors for the form if needed
        this._setupFormSpecificDynamicBehaviors(formHandlerInstance.form);
        EventBus.publish(`form:${formId}:reset`);
        this._showToast(`${formId.replace('-form','').toUpperCase()} form reset.`, 'info');
    }

    _autoPopulateCalculators(sourceData) {
        // FRS Form Population
        const frsForm = this.elements.forms.frs;
        if (frsForm) {
            frsForm.elements['age'].value = sourceData.age || '';
            frsForm.elements['sex'].value = sourceData.sex || '';
            frsForm.elements['total_cholesterol'].value = sourceData.total_cholesterol || '';
            document.getElementById('frs-total-cholesterol-unit-display').textContent = sourceData.total_cholesterol_unit || 'mmol/L';
            frsForm.elements['hdl_cholesterol'].value = sourceData.hdl_cholesterol || '';
            document.getElementById('frs-hdl-cholesterol-unit-display').textContent = sourceData.hdl_cholesterol_unit || 'mmol/L';
            frsForm.elements['sbp'].value = sourceData.sbp || '';
            frsForm.elements['on_bp_medication'].value = sourceData.on_bp_medication || '';
            frsForm.elements['smoking_status_frs'].value = (sourceData.smoking_status && sourceData.smoking_status !== 'non_smoker' && sourceData.smoking_status !== 'ex_smoker') ? 'yes' : 'no';
            frsForm.elements['diabetes_status_frs'].value = (sourceData.diabetes_status && sourceData.diabetes_status !== 'no_diabetes') ? 'yes' : 'no';
            frsForm.elements['lpa_frs'].value = sourceData.lpa || ''; // Optional Lp(a)
            document.getElementById('frs-lpa-unit-display').textContent = sourceData.lpa_unit || 'mg/dL';
            this._triggerInputEvents(frsForm);
        }

        // QRISK3 Form Population
        const qrisk3Form = this.elements.forms.qrisk3;
        if (qrisk3Form) {
            qrisk3Form.elements['age'].value = sourceData.age || '';
            qrisk3Form.elements['sex'].value = sourceData.sex || '';
            qrisk3Form.elements['ethnicity'].value = sourceData.ethnicity_qrisk || ''; // Ensure mapping from ml-ethnicity-qrisk
            qrisk3Form.elements['height'].value = sourceData.height || ''; // This is read-only display
            document.getElementById('qrisk-height-unit-display').textContent = sourceData.height_unit || 'cm';
            qrisk3Form.elements['weight'].value = sourceData.weight || ''; // This is read-only display
            document.getElementById('qrisk-weight-unit-display').textContent = sourceData.weight_unit || 'kg';
            // BMI will be auto-calculated by its own listener
            qrisk3Form.elements['townsend_score'].value = sourceData.townsend_score || '';
            qrisk3Form.elements['sbp'].value = sourceData.sbp || '';
            qrisk3Form.elements['sbp_sd'].value = sourceData.manual_sbp_sd || sourceData.calculated_sbp_sd || ''; // Prioritize manual if entered
            qrisk3Form.elements['on_bp_medication'].value = sourceData.on_bp_medication || '';
            qrisk3Form.elements['smoking_status'].value = sourceData.smoking_status || '';
            qrisk3Form.elements['diabetes_status'].value = sourceData.diabetes_status || '';
            qrisk3Form.elements['total_cholesterol'].value = sourceData.total_cholesterol || '';
            document.getElementById('qrisk-total-cholesterol-unit-display').textContent = sourceData.total_cholesterol_unit || 'mmol/L';
            qrisk3Form.elements['hdl_cholesterol'].value = sourceData.hdl_cholesterol || '';
            document.getElementById('qrisk-hdl-cholesterol-unit-display').textContent = sourceData.hdl_cholesterol_unit || 'mmol/L';
            // Cholesterol/HDL ratio will be auto-calculated

            // Populate read-only clinical condition displays
            document.getElementById('qrisk-family-history-cvd-display').value = sourceData.family_history_cvd === 'yes' ? 'Yes' : 'No';
            document.getElementById('qrisk-ckd-stage-display').value = sourceData.ckd_stage ? sourceData.ckd_stage.replace(/_/g, ' ') : 'No CKD / Stage 1-2';
            document.getElementById('qrisk-atrial-fibrillation-display').value = sourceData.atrial_fibrillation === 'yes' ? 'Yes' : 'No';
            // ... and so on for all other QRISK3 specific conditions ...
            document.getElementById('qrisk-migraines-display').value = sourceData.migraines === 'yes' ? 'Yes' : 'No';
            document.getElementById('qrisk-rheumatoid-arthritis-display').value = sourceData.rheumatoid_arthritis === 'yes' ? 'Yes' : 'No';
            document.getElementById('qrisk-sle-display').value = sourceData.sle === 'yes' ? 'Yes' : 'No';
            document.getElementById('qrisk-severe-mental-illness-display').value = sourceData.severe_mental_illness === 'yes' ? 'Yes' : 'No';
            document.getElementById('qrisk-atypical-antipsychotics-display').value = sourceData.atypical_antipsychotics === 'yes' ? 'Yes' : 'No';
            document.getElementById('qrisk-regular-steroids-display').value = sourceData.regular_steroids === 'yes' ? 'Yes' : 'No';
            document.getElementById('qrisk-erectile-dysfunction-display').value = sourceData.erectile_dysfunction === 'yes' ? 'Yes' : 'No';
             // Populate SBP readings display
            for (let i = 1; i <= 6; i++) {
                const readingDisplay = document.getElementById(`qrisk-sbp-display-reading-${i}`);
                if (readingDisplay) readingDisplay.value = sourceData[`sbp_reading${i}`] || '';
            }
            qrisk3Form.elements['lpa_qrisk'].value = sourceData.lpa || '';
            document.getElementById('qrisk-lpa-unit-display').textContent = sourceData.lpa_unit || 'mg/dL';

            this._triggerInputEvents(qrisk3Form);
        }
        this._showToast('Calculator forms auto-populated from Medication & Labs data.', 'info');
    }

    _triggerInputEvents(formElement) {
        // Trigger 'input' and 'change' for all populated elements to ensure any dependent calculations (BMI, ratios) or UI updates occur.
        Array.from(formElement.elements).forEach(el => {
            if (el.value !== '' || (el.type === 'checkbox' && el.checked) || (el.type === 'select-one' && el.selectedIndex !== 0 && el.selectedIndex !== -1)) {
                el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            }
        });
    }

    _handleCalculateSbpSd() {
        const readings = [];
        for (let i = 1; i <= 6; i++) {
            const readingVal = document.getElementById(`ml-sbp-reading${i}`)?.value;
            if (readingVal) {
                const parsed = parseFloat(readingVal);
                if (!isNaN(parsed)) readings.push(parsed);
            }
        }
        const { value: sd, message } = this.dependencies.ValidationHelpers.calculateBPStandardDeviation(readings);
        const sdCalculatedInput = document.getElementById('ml-sbp-sd-calculated');
        const sdManualInput = document.getElementById('ml-sbp-sd-manual');

        if (sd !== null && sdCalculatedInput) {
            sdCalculatedInput.value = sd.toFixed(2);
            if(sdManualInput && !sdManualInput.value) sdManualInput.value = sd.toFixed(2); // Also populate manual if empty
            this._showToast(`SBP Standard Deviation calculated: ${sd.toFixed(2)} mmHg`, 'success');
        } else if (message) {
            if (sdCalculatedInput) sdCalculatedInput.value = '';
            this._showToast(`Could not calculate SBP SD: ${message}`, 'warning');
        }
    }

    _handleUpdateCombinedView() {
        this.dependencies.LoadingManager.show('Updating Combined View...');
        this.calculationCounters['combined'] = (this.calculationCounters['combined'] || 0) + 1;
        try {
            const frsResult = this.dependencies.MemoryManager.retrieve('lastFRSResult_riskData'); // Assuming results are stored in memory
            const qrisk3Result = this.dependencies.MemoryManager.retrieve('lastQRISK3Result_riskData');

            if (frsResult && qrisk3Result) {
                this.dependencies.ResultsDisplayService.appendResults('combined', { frs: frsResult, qrisk3: qrisk3Result }, null, null, this.calculationCounters['combined']);
                this._updateCombinedViewStatus('frs', true);
                this._updateCombinedViewStatus('qrisk3', true);
            } else {
                this._showToast('Please calculate both FRS and QRISK3 scores first.', 'info');
                this._updateCombinedViewStatus('frs', !!frsResult);
                this._updateCombinedViewStatus('qrisk3', !!qrisk3Result);
            }
        } catch (error) {
            this._handleError(error, 'UpdateCombinedView');
            this.dependencies.ResultsDisplayService.displayError('combined', 'Error updating combined view.');
        } finally {
            this.dependencies.LoadingManager.hide();
        }
    }
    _handleResetCombinedView() {
        const resultListContainer = this.elements.resultLists.combined;
        if (resultListContainer) {
            resultListContainer.innerHTML = '';
            this.calculationCounters['combined'] = 0;
        }
        this._updateCombinedViewStatus('frs', false); // Reset status indicators too
        this._updateCombinedViewStatus('qrisk3', false);
        this._showToast('Combined view reset.', 'info');
    }

    _handleGenerateAdvancedViz(formDataObject) { // Can be called by form submit or button
        const vizForm = this.elements.forms.advancedViz;
        const data = formDataObject || Object.fromEntries(new FormData(vizForm).entries());
        this.dependencies.LoadingManager.show('Generating Visualization...');
        this.calculationCounters['advancedViz'] = (this.calculationCounters['advancedViz'] || 0) + 1;
        try {
            const vizType = data.vizType;
            const calculator = data.vizCalculator;
            // Logic to gather base patient data (e.g., from MemoryManager or currently active form)
            const basePatientData = this.dependencies.MemoryManager.retrieve('lastMedicationLabsData') || this._getFormDataFromActiveCalculatorTab() || {};

            // Delegate to ChartManager or a dedicated VisualizationService
            this.dependencies.ChartManager.renderAdvancedVisualization(
                'advancedViz', // displayType key
                vizType,
                calculator,
                basePatientData,
                data, // Specific options from the advanced-viz-form
                this.elements.resultLists.advancedViz, // Target for appending
                this.calculationCounters['advancedViz']
            );
        } catch (error) {
            this._handleError(error, 'GenerateAdvancedViz');
            this.dependencies.ResultsDisplayService.displayError('advancedViz', 'Error generating visualization.');
        } finally {
            this.dependencies.LoadingManager.hide();
        }
    }
    _handleResetAdvancedViz() {
        const vizForm = this.elements.forms.advancedViz;
        if (vizForm) vizForm.reset();
        const resultListContainer = this.elements.resultLists.advancedViz;
        if (resultListContainer) {
            resultListContainer.innerHTML = '';
            this.calculationCounters['advancedViz'] = 0;
        }
        const dynamicOptionsContainer = this.elements.displayAreas.dynamicVizOptions;
        if(dynamicOptionsContainer) dynamicOptionsContainer.innerHTML = ''; // Clear dynamic options
        this._showToast('Advanced visualization options reset.', 'info');
    }

    _updateAdvancedVizOptions(vizType) {
        const container = this.elements.displayAreas.dynamicVizOptions;
        if (!container) return;
        container.innerHTML = ''; // Clear previous options

        // Example: Add specific options for 'sensitivity' analysis
        if (vizType === 'sensitivity') {
            const S = this.dependencies.InputSanitizerService;
            let optionsHtml = `
                <div class="form-group">
                    <label for="viz-sensitivity-param" class="form-label">Parameter to Vary:</label>
                    <select id="viz-sensitivity-param" name="sensitivityParameter" class="form-control">
                        <option value="age">Age</option>
                        <option value="sbp">Systolic BP</option>
                        <option value="total_cholesterol">Total Cholesterol</option>
                        <option value="hdl_cholesterol">HDL Cholesterol</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="viz-sensitivity-range" class="form-label">Variation Range (% from baseline):</label>
                    <input type="number" id="viz-sensitivity-range" name="sensitivityRangePercent" class="form-control" value="20" min="5" max="50" step="5">
                </div>
            `;
            container.innerHTML = S.sanitizeHTML(optionsHtml, { USE_PROFILES: { html: true } }); // Sanitize if needed
        }
        // Add more conditional options for other vizTypes
    }


    _handlePrint(sectionKey) {
        this.dependencies.LoadingManager.show('Preparing for print...');
        // Use PDFService for consistent output, even for "Print"
        // The PDFService can be configured to either show print dialog or save as PDF
        let dataToPrint = {};
        let title = "CVD Risk Assessment Report";

        try {
            if (sectionKey === 'combined') {
                dataToPrint.frs = this.dependencies.MemoryManager.retrieve('lastFRSResult_riskData');
                dataToPrint.qrisk3 = this.dependencies.MemoryManager.retrieve('lastQRISK3Result_riskData');
                title = "Combined Risk Report";
                if (!dataToPrint.frs && !dataToPrint.qrisk3) throw new Error("No data for combined report.");
            } else if (sectionKey === 'advancedViz') {
                // This needs more complex data gathering: current chart image + details table
                // For now, let's assume a placeholder or a simplified data structure
                const vizOutputArea = this.elements.resultContainers.advancedViz; // Or resultLists.advancedViz
                if (vizOutputArea && vizOutputArea.innerHTML.trim() !== '') {
                    dataToPrint = {
                        visualizationContent: vizOutputArea.innerHTML, // This is HTML, PDF service needs to handle it
                        details: document.getElementById('advanced-visualization-details-area')?.innerText
                    };
                    title = "Advanced Visualization Report";
                } else {
                    throw new Error("No visualization to print.");
                }
            } else { // FRS, QRISK3, Recommendations, History
                dataToPrint = this.dependencies.MemoryManager.retrieve(`last${sectionKey.toUpperCase()}Result_riskData`) ||
                              this.dependencies.MemoryManager.retrieve(`current${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}Data`);
                title = `${sectionKey.toUpperCase()} Report`;
                if (!dataToPrint) throw new Error(`No data for ${sectionKey} report.`);
            }

            // Call PDFService to generate and print
            // The PDFService should have a method that takes the data and a target (print/save)
            this.dependencies.PDFServiceInstance.generateAndPrintReport(title, dataToPrint, sectionKey)
                .catch(e => this._handleError(e, `Print-${sectionKey}`));

        } catch (error) {
            this._handleError(error, `PreparePrint-${sectionKey}`);
            this._showToast(`Error preparing ${sectionKey} for print: ${error.message}`, 'error');
        } finally {
            this.dependencies.LoadingManager.hide();
        }
    }

    async _handleExport(sectionKey, format, baseFilename = 'CVD_Report', password = null) {
        this.dependencies.LoadingManager.show(`Exporting ${sectionKey} as ${format.toUpperCase()}...`);
        let dataToExport = {};
        let filename = `${baseFilename}_${sectionKey}`;
        try {
            if (sectionKey === 'combined') {
                dataToExport.frs = this.dependencies.MemoryManager.retrieve('lastFRSResult_riskData');
                dataToExport.qrisk3 = this.dependencies.MemoryManager.retrieve('lastQRISK3Result_riskData');
                if (!dataToExport.frs && !dataToExport.qrisk3) throw new Error("No data for combined export.");
            } else if (sectionKey === 'advancedViz') {
                 const vizOutputArea = this.elements.resultContainers.advancedViz;
                 if (vizOutputArea && vizOutputArea.innerHTML.trim() !== '') {
                    dataToExport = {
                        visualizationHTML: vizOutputArea.innerHTML, // PDF service might need to render this
                        detailsText: document.getElementById('advanced-visualization-details-area')?.innerText
                    };
                 } else {
                    throw new Error("No visualization to export.");
                 }
            } else { // FRS, QRISK3, or potentially other specific data sections
                dataToExport = this.dependencies.MemoryManager.retrieve(`last${sectionKey.toUpperCase()}Result_riskData`) ||
                               this.dependencies.MemoryManager.retrieve('currentPatientData'); // Fallback to general patient data
                if (!dataToExport) throw new Error(`No data for ${sectionKey} export.`);
            }

            // Delegate to DataManagerInstance for actual export logic
            await this.dependencies.DataManagerInstance.exportData(filename, format, dataToExport, password);
            // DataManagerInstance.exportData should internally use PDFService for PDF format.
        } catch (error) {
            this._handleError(error, `Export-${sectionKey}-${format}`);
        } finally {
            this.dependencies.LoadingManager.hide();
        }
    }

    _handleImportData() {
        // This is likely triggered by the form submit handler for 'data-import-form'
        // The DataManagerInstance.importData method would be called there.
        // This button might just trigger a file input click if not using form submit.
        document.getElementById('patient-data-import-file-input')?.click();
    }

    _handleExportDataMain(formDataObject) { // From the main Data I/O tab export form
        const dataType = formDataObject.exportDataSelection; // e.g., 'current_assessment_summary'
        const format = formDataObject.exportFormat;
        const encrypt = formDataObject.encryptExportedData === 'on';
        const password = encrypt ? formDataObject.exportEncryptionPassword : null;
        let filename = `CVD_Toolkit_Export_${dataType}`;

        this._handleExport(dataType, format, filename, password);
    }


    _handleSaveSettings(formDataObject) {
        const settingsForm = this.elements.forms.appSettings;
        const data = formDataObject || Object.fromEntries(new FormData(settingsForm).entries());

        const newSettings = {
            region: data.region,
            language: data.language,
            theme: data.useDarkTheme ? 'dark' : 'light',
            encryptStorage: data.encryptLocalStorage === 'on' // Assuming checkbox value is 'on'
            // Add other settings as they are implemented
        };

        this.dependencies.DataManagerInstance.saveUserSettings(newSettings)
            .then(() => {
                this.dependencies.ThemeManager.applyTheme(newSettings.theme); // Apply theme immediately
                this.dependencies.MainDisclaimerServiceInstance?.setLanguage(newSettings.language);
                this.dependencies.MainDisclaimerServiceInstance?.setRegion?.(newSettings.region);
                this.dependencies.EventBus.publish('settings:saved', newSettings);
                this._showToast('Settings saved successfully.', 'success');
            })
            .catch(e => this._handleError(e, 'SaveSettings'));
    }


    _changeBaseFontSize(delta) {
        const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const newSize = Math.max(12, Math.min(24, currentSize + delta)); // Clamp between 12px and 24px
        document.documentElement.style.fontSize = `${newSize}px`;
        localStorage.setItem('baseFontSize', newSize);
        this.dependencies.EventBus.publish('ui:fontSizeChanged', { newSize });
    }

    _openModal(modalElement) {
        if (modalElement) {
            modalElement.classList.add('active'); // Or modalElement.showModal() if using <dialog>
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
            this.dependencies.EventBus.publish('modal:opened', { modalId: modalElement.id });
        }
    }
    _openModalById(modalId) { this._openModal(document.getElementById(modalId));}

    _closeModal(modalElement) {
        if (modalElement) {
            modalElement.classList.remove('active'); // Or modalElement.close()
            document.body.style.overflow = '';
            this.dependencies.EventBus.publish('modal:closed', { modalId: modalElement.id });
        }
    }
    _showDisclaimerModalByKey(key) {
        const instance = EnhancedDisclaimerService.instances?.[key]; // Access static instances map
        if (instance) {
            instance.show();
        } else {
            this.dependencies.ErrorLogger.log('warn', `Disclaimer instance for key "${key}" not found.`, 'AppUI-Disclaimer');
            // Fallback or generic modal if needed
        }
    }


    _updateThemeIcon(isDark) {
        const themeToggleBtn = this.elements.buttons.themeToggle;
        if (themeToggleBtn) {
            const lightIcon = themeToggleBtn.querySelector('.theme-icon-light');
            const darkIcon = themeToggleBtn.querySelector('.theme-icon-dark');
            if (lightIcon && darkIcon) {
                lightIcon.style.display = isDark ? 'none' : 'inline';
                darkIcon.style.display = isDark ? 'inline' : 'none';
            }
        }
        // Update logo if theme-specific logos are used
        if (this.elements.displayAreas.appLogo) {
            this.elements.displayAreas.appLogo.src = isDark ? 'images/logo-placeholder-dark.png' : 'images/logo-placeholder.png';
            this.elements.displayAreas.appLogo.onerror = () => {
                this.elements.displayAreas.appLogo.src = `https://placehold.co/150x50/${isDark ? '343a40' : '2c7afc'}/ffffff?text=CVD+Toolkit`;
            };
        }
    }
    _handleThemeChange(theme) { // Called by EventBus from ThemeManager
        document.body.classList.toggle('dark-theme', theme === 'dark');
        this._updateThemeIcon(theme === 'dark');
    }


    _setupThemeToggle() {
        this.elements.buttons.themeToggle?.addEventListener('click', () => {
            this.dependencies.ThemeManager.toggleTheme();
        });
        // Initial theme application is handled by ThemeManager or _loadInitialUIState
    }
    _setupDisclaimerAlertDismiss() {
        this.elements.buttons.disclaimerAlertClose?.addEventListener('click', () => {
            if (this.elements.displayAreas.disclaimerAlertMain) {
                this.elements.displayAreas.disclaimerAlertMain.style.display = 'none';
                localStorage.setItem('disclaimer-alert-main-dismissed', 'true');
            }
        });
        if (localStorage.getItem('disclaimer-alert-main-dismissed') === 'true' && this.elements.displayAreas.disclaimerAlertMain) {
            this.elements.displayAreas.disclaimerAlertMain.style.display = 'none';
        }
    }
    _setupTooltips() { /* ... (as above) ... */ }
    _setupGeneralModals() { /* ... (as above, for data-modal-target) ... */ }
    _setupCollapsibleSections() { /* ... (if any, using data-attributes) ... */ }
    _setupKeyboardNavigation() { /* ... (enhance focus management, roving tabindex for tabs if complex) ... */ }
    _setupClipboardButtons() { /* ... (for any copy-to-clipboard functionality) ... */ }

    _updateCombinedViewStatus(calculatorType, isCalculated) {
        const statusEl = calculatorType === 'frs' ? this.elements.displayAreas.combinedFrsStatus : this.elements.displayAreas.combinedQriskStatus;
        if (statusEl) {
            statusEl.textContent = isCalculated ? 'Calculated' : 'Not Calculated';
            statusEl.className = `status-indicator ${isCalculated ? 'complete' : 'incomplete'}`;
        }
        // Enable "Update Combined View" button only if both FRS and QRISK3 are calculated
        const frsDone = this.elements.displayAreas.combinedFrsStatus?.classList.contains('complete');
        const qriskDone = this.elements.displayAreas.combinedQriskStatus?.classList.contains('complete');
        if (this.elements.buttons.updateCombinedView) {
            this.elements.buttons.updateCombinedView.disabled = !(frsDone && qriskDone);
        }
        if (this.elements.buttons.exportCombinedPdf) { // Also control export button
            this.elements.buttons.exportCombinedPdf.disabled = !(frsDone && qriskDone);
        }
    }

    _populateFormsWithEMRData(internalData) {
        this.dependencies.LoadingManager.show('Populating forms with EMR data...');
        RuntimeProtection.tryCatch(() => {
            this.dependencies.ErrorLogger.log('info', 'Populating forms from EMR data', { patientName: internalData?.patient?.name });

            const medLabsForm = this.elements.forms.medicationLabs;
            if (medLabsForm && internalData) {
                // Use FieldMapperService to map EMR data (internalData) to form fields
                const mappedData = this.dependencies.FieldMapperService.mapToForm(internalData, 'medicationLabs');

                Object.keys(mappedData).forEach(fieldName => {
                    const fieldElement = medLabsForm.elements[fieldName];
                    if (fieldElement) {
                        if (fieldElement.type === 'checkbox') {
                            fieldElement.checked = mappedData[fieldName];
                        } else {
                            fieldElement.value = mappedData[fieldName] || '';
                        }
                        // Trigger change for dependent calculations
                        fieldElement.dispatchEvent(new Event('input', { bubbles: true }));
                        fieldElement.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                this._showToast('Patient data populated from EMR.', 'success');
                this.dependencies.TabManager.switchToTab('tab-medication-button'); // Switch to the populated tab
                 // After populating medLabsForm, auto-populate FRS and QRISK3
                this._autoPopulateCalculators(mappedData);
            } else {
                this._showToast('Could not populate forms. EMR data might be incomplete or form not found.', 'warning');
            }
        }, (e) => this._handleError(e, 'PopulateFromEMR'))
        .finally(() => this.dependencies.LoadingManager.hide());
    }

    _handleError(error, context, severity = 'error') {
        this.dependencies.ErrorLogger.handleError(error.message || String(error), `AppUI-${context}`, severity, { errorObj: error, stack: error.stack });
        // Optionally show a user-facing toast for non-critical UI errors
        if (severity !== 'critical') {
            this._showToast(`An error occurred in ${context}. Please try again.`, 'error');
        }
    }
    _log(level, message, details, context = 'AppUI') { // Simplified internal logger
        this.dependencies.ErrorLogger.log(level, message, context, details);
    }

    _loadInitialUIState() {
        this.dependencies.ThemeManager.initializeTheme(); // ThemeManager handles loading saved theme
        this._updateThemeIcon(this.dependencies.ThemeManager.getCurrentTheme() === 'dark');

        if (localStorage.getItem('disclaimer-alert-main-dismissed') === 'true' && this.elements.displayAreas.disclaimerAlertMain) {
            this.elements.displayAreas.disclaimerAlertMain.style.display = 'none';
        }

        // Load user settings (region, language, etc.)
        this.dependencies.DataManagerInstance?.getItem('userSettings').then(settings => {
            if (settings) {
                const regionSelect = document.getElementById('setting-region-select');
                const langSelect = document.getElementById('setting-language-select');
                const encryptCheck = document.getElementById('setting-encrypt-storage-check');

                if (regionSelect) regionSelect.value = settings.region || 'CA';
                if (langSelect) langSelect.value = settings.language || 'en';
                if (encryptCheck) encryptCheck.checked = settings.encryptStorage === true;

                this.dependencies.MainDisclaimerServiceInstance?.setLanguage(settings.language || 'en');
                this.dependencies.MainDisclaimerServiceInstance?.setRegion?.(settings.region || 'CA');
                // Other settings applications...
            }
        }).catch(e => this._handleError(e, 'LoadInitialSettings'));

        // Load base font size
        const savedFontSize = localStorage.getItem('baseFontSize');
        if (savedFontSize) {
            document.documentElement.style.fontSize = `${parseFloat(savedFontSize)}px`;
        }
    }
}

// Make AppUI available globally if main.js expects it, or it will be instantiated there.
// window.AppUI = AppUI; // If main.js does `new window.AppUI(...)`
// export default AppUI; // If main.js does `import AppUI from './ui.js';`