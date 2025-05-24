/**
 * Main Application Orchestrator for Enhanced CVD Risk Toolkit
 * @file /js/main.js
 * @description Initializes and coordinates all core application modules and services.
 * Aligned with index.html v5.0.3 and associated modules.
 * Base: User-uploaded main.js v3.2.0, enhanced and adapted.
 * @version 5.0.3
 */

'use strict';

// --- PHASE 1: Early Error Catching & Global Setup ---
// Assumes early error catching script is already in index.html.
window.CVD_APP_VERSION = "5.0.3"; // Set version globally

// --- PHASE 2: Core Service/Utility Imports & Instantiation ---
// Order prioritizes error handling and core utilities.

// Error Handling and Protection (Load these first)
import ErrorDetectionSystem from './utils/error-detection-system.js'; // Path from PDF
const errorLogger = new ErrorDetectionSystem({
    remoteLoggingEndpoint: null, // Configure if you have a logging server
    logLevel: 'debug', // 'debug' for development, 'warn' or 'error' for production
    notificationContainerId: 'error-notification-container', // Matches index.html
    errorModalTemplateId: 'error-correction-modal-template' // Matches index.html
});
window.ErrorDetectionSystemInstance = errorLogger;

import RuntimeProtection from './utils/runtime-protection.js'; // Path from PDF
window.RuntimeProtection = RuntimeProtection;
const runtimeProtectionInstance = new RuntimeProtection({
    enableDomMonitoring: true,
    enableGlobalMonitoring: true,
    enableFrameBusting: true, // Consistent with index.html CSP
    allowedScriptSources: [window.location.origin, 'https://cdnjs.cloudflare.com'],
    dependencies: { ErrorLogger: errorLogger }
});
window.RuntimeProtectionInstance = runtimeProtectionInstance;

// Core Utilities
import EventBusService from './utils/event-bus.js'; // Path from PDF
const eventBus = new EventBusService({ dependencies: { ErrorLogger: errorLogger }});
window.EventBus = eventBus;

import ModuleLoaderService from './utils/module-loader.js'; // Path from PDF
const moduleLoader = new ModuleLoaderService({
    basePath: './js/',
    maxRetries: 2, retryDelay: 1000,
    dependencies: { ErrorLogger: errorLogger, EventBus: eventBus }
});
window.ModuleLoaderInstance = moduleLoader;

import DeviceCapabilityDetectorService from './utils/device-capability-detector.js'; // Path from PDF
const deviceCapabilityDetector = new DeviceCapabilityDetectorService({ dependencies: { ErrorLogger: errorLogger, EventBus: eventBus }});
window.DeviceCapabilityDetectorInstance = deviceCapabilityDetector;
deviceCapabilityDetector.detect(); // Perform detection early

import LoadingManagerService from './utils/loading-manager.js'; // Path from PDF or data-management
const loadingManager = new LoadingManagerService({
    overlayId: 'loading-overlay', // Matches index.html
    messageId: 'loading-message', // Matches index.html
    dependencies: { ErrorLogger: errorLogger, EventBus: eventBus }
});
window.LoadingManagerInstance = loadingManager;
loadingManager.show('Initializing core systems...'); // ECG animation for spinner to be in styles.css

// Data and Security Services
import CryptoService from './services/crypto-service.js'; // Assuming this path
const cryptoServiceInstance = typeof CryptoService === 'function' ? new CryptoService() : CryptoService;
window.CryptoServiceInstance = cryptoServiceInstance;

import SecureStorageService from './utils/secure-storage.js'; // Path from PDF
const secureStorage = new SecureStorageService({
    storagePrefix: 'cvdToolkitSecure_v5.0.3_', // Unique prefix
    dependencies: { CryptoService: cryptoServiceInstance, ErrorLogger: errorLogger, EventBus: eventBus }
});
window.SecureStorageInstance = secureStorage;

import InputSanitizerService from './utils/input-sanitizer.js'; // Path from index.html preloads (was xss-protection in PDF text)
const inputSanitizerServiceInstance = typeof InputSanitizerService === 'function' ? new InputSanitizerService() : InputSanitizerService;
window.InputSanitizerServiceInstance = inputSanitizerServiceInstance;

// PDF Service (using the fused version)
import PDFService from './services/pdf-service.js'; // Path based on preload
const pdfServiceInstance = new PDFService({ // Instantiated with dependencies
    dependencies: {
        ErrorLogger: errorLogger,
        InputSanitizerService: inputSanitizerServiceInstance,
        LoadingManager: loadingManager, // PDF service might show loading for complex generation
        // LegalDisclaimerManager and ClinicalThresholds will be passed if PDFService needs them directly
        // For now, data for these will be passed via contentConfig
    }
});
window.PDFServiceInstance = pdfServiceInstance;

// Disclaimers and Legal
import EnhancedDisclaimerService from './utils/enhanced-disclaimer.js'; // Path from index.html preloads (was disclaimer-enhancer in PDF text)
// Disclaimer instances will be created in MainApplication _onDomReady

// Sync and State Management
import CrossTabSyncService from './utils/cross-tab-sync.js'; // Path from PDF (was -module in preload)
const crossTabSyncInstance = new CrossTabSyncService({dependencies: {EventBus: eventBus, ErrorLogger: errorLogger}});
window.CrossTabSyncInstance = crossTabSyncInstance;

import MemoryManagerService from './utils/memory-manager.js'; // Path from PDF
const memoryManager = new MemoryManagerService({
    dependencies: { ErrorLogger: errorLogger, EventBus: eventBus, DataManager: null } // DataManager instance will be set later
});
window.MemoryManagerInstance = memoryManager;

// Clinical Data & Validation
import ClinicalThresholdsData from './data/clinical-thresholds.js'; // Path from index.html preloads
const clinicalThresholds = ClinicalThresholdsData;
window.ClinicalThresholds = clinicalThresholds;

import ValidationHelpersService from './utils/validation-helpers.js'; // Path from PDF
const validationHelpers = new ValidationHelpersService({ dependencies: { ErrorLogger: errorLogger, ClinicalThresholds: clinicalThresholds }});
window.ValidationHelpers = validationHelpers;

// Data Management (Application specific)
import DataManagerService from './data-management/data-manager.js'; // Path from index.html preloads
const dataManager = new DataManagerService({
    dependencies: {
        ErrorLogger: errorLogger, EventBus: eventBus, CryptoService: cryptoServiceInstance,
        LoadingManager: loadingManager, InputSanitizer: inputSanitizerServiceInstance,
        SecureStorage: secureStorage, PDFService: pdfServiceInstance,
        ValidationHelpers: validationHelpers
    }
});
window.DataManagerInstance = dataManager;
memoryManager.setDataManager(dataManager); // Update MemoryManager's dependency

// Field Mapping and EMR
import FieldMapperService from './data-management/field-mapper.js'; // Path from index.html preloads
const fieldMapperServiceInstance = typeof FieldMapperService === 'function' ? new FieldMapperService() : FieldMapperService;
window.FieldMapperServiceInstance = fieldMapperServiceInstance;

import EMRConnectorService from './data-management/emr-connector.js'; // Path from index.html preloads
const emrConnectorServiceInstance = new EMRConnectorService({
    dependencies: { ErrorLogger: errorLogger, EventBus: eventBus, LoadingManager: loadingManager, FieldMapper: fieldMapperServiceInstance }
});
window.EMRConnectorServiceInstance = emrConnectorServiceInstance;

// Integrations
import JunoIntegrationService from './integrations/juno-integration.js'; // Path from index.html preloads
const junoIntegrationServiceInstance = new JunoIntegrationService({
    dependencies: { ErrorLogger: errorLogger, EventBus: eventBus, LoadingManager: loadingManager, FieldMapper: fieldMapperServiceInstance, EMRConnector: emrConnectorServiceInstance }
});
window.JunoIntegrationServiceInstance = junoIntegrationServiceInstance;

// Batch Processor
import BatchProcessorService from './utils/batch-processor.js'; // Path from PDF
const batchProcessorServiceInstance = typeof BatchProcessorService === 'function' ? new BatchProcessorService() : BatchProcessorService;
window.BatchProcessorServiceInstance = batchProcessorServiceInstance;

// Chart Exporter
import ChartExporterService from './visualizations/chart-exporter.js'; // Path from PDF
const chartExporterServiceInstance = new ChartExporterService({dependencies: { ErrorLogger: errorLogger, PDFService: pdfServiceInstance}});
window.ChartExporterServiceInstance = chartExporterServiceInstance;


// --- Application-Specific Module Imports (Classes) ---
import FraminghamRiskScore from './calculations/framingham-algorithm.js'; // Path from PDF
import QRISK3Algorithm from './calculations/qrisk3-algorithm.js';           // Path from PDF
import TreatmentRecommendationsService from './calculations/treatment-recommendations.js'; // Path from PDF
import RiskCalculator from './calculations/risk-calculator.js';               // Path from index.html preloads
import AppUI from './ui.js';                                                  // Our newly created ui.js
import TabManagerService from './utils/tab-manager.js';                       // Path from PDF
import ResultsDisplayService from './ui/results-display.js';                  // Path from index.html preloads
import ThemeManager from './utils/theme-manager.js';                        // New, for theme handling
import ChartManager from './visualizations/chart-renderer.js';              // Path from PDF
import FormHandlerService from './utils/form-handler.js';                   // Path from index.html preloads (was form-enhancements in PDF text)

// --- Main Application Class (Adapted from user's main.js v3.2.0) ---
class CVDRiskApplication {
    constructor() {
        this.config = {
            appName: 'Enhanced CVD Risk Toolkit',
            version: window.CVD_APP_VERSION,
            defaultTabId: 'tab-medication-button', // Button ID for the default tab
            apiKeys: {
                ipGeolocation: 'YOUR_IPGEOLOCATION_API_KEY_HERE', // USER ACTION: Replace
            },
            endpoints: { /* ... as in user's v3.2.0 ... */
                errorReport: null, complianceReport: null,
                translations: './assets/i18n/{lang}.json',
                emrFhirBase: null // Example: 'https://fhir.emr.example.com/r4'
            }
        };
        this.initialized = false;
        this.modules = { /* Instances of major application logic controllers */
            RiskCalculator: null, AppUI: null, TabManager: null, ResultsDisplay: null,
            ThemeManager: null, ChartManager: null, MainDisclaimerService: null
            // Add other specific disclaimer services if needed
        };

        // Consolidated dependencies for easy passing
        this.dependencies = {
            EventBus: eventBus, ErrorLogger: errorLogger, LoadingManager: loadingManager,
            ModuleLoader: moduleLoader, DeviceCapabilityDetector: deviceCapabilityDetector,
            SecureStorage: secureStorage, CryptoService: cryptoServiceInstance,
            InputSanitizer: inputSanitizerServiceInstance, PDFService: pdfServiceInstance,
            CrossTabSync: crossTabSyncInstance, MemoryManager: memoryManager,
            ClinicalThresholds: clinicalThresholds, ValidationHelpers: validationHelpers,
            FormHandler: FormHandlerService, // Pass the CLASS for AppUI to instantiate
            FieldMapper: fieldMapperServiceInstance, EMRConnector: emrConnectorServiceInstance,
            JunoIntegration: junoIntegrationServiceInstance, DataManager: dataManager,
            BatchProcessor: batchProcessorServiceInstance, ChartExporter: chartExporterServiceInstance,
            // Algorithm Classes & Treatment Recs Service for RiskCalculator
            FraminghamAlgorithmClass: FraminghamRiskScore,
            QRISK3AlgorithmClass: QRISK3Algorithm,
            TreatmentRecommendationsServiceClass: TreatmentRecommendationsService
        };

        RuntimeProtection.tryCatch(() => {
            this._earlyInitialization();
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', this._onDomReady.bind(this));
            } else {
                this._onDomReady();
            }
        }, (error) => {
            errorLogger.handleError('Critical error during MainApplication construction.', 'MainApp-Constructor', 'critical', { error });
            this._displayFatalError("Application failed to start due to a critical error during construction.");
        })();
    }

    _earlyInitialization() {
        errorLogger.log('info', `${this.config.appName} v${this.config.version} core services pre-DOM init...`, 'MainApp');
        this.dependencies.JunoIntegration?.initialize?.(); // If Juno integration exists and needs early init
    }

    async _onDomReady() {
        await RuntimeProtection.tryCatch(async () => {
            errorLogger.log('info', 'DOM ready. Initializing UI-dependent services and application logic...', 'MainApp');
            loadingManager.show('Initializing Application Interface...');

            runtimeProtectionInstance.startMonitoring();
            // Service Worker registration is now handled in index.html directly via a script tag.
            // this._initializeServiceWorker(); // No longer needed here if HTML handles it.

            // Initialize Disclaimer Services (using EnhancedDisclaimerService)
            // Main application disclaimer
            this.modules.MainDisclaimerService = new EnhancedDisclaimerService('appMainDisclaimer', {
                modalIdBase: 'main-disclaimer-modal', // Matches template ID in index.html
                templateId: 'main-disclaimer-modal-template',
                currentVersion: '1.2.20250524', // Update as your disclaimer text changes
                blockAppUntilAccepted: true,
                geoApiKey: this.config.apiKeys.ipGeolocation,
                geoApiUrl: 'https://api.ipgeolocation.io/ipgeo',
                translationEndpoint: this.config.endpoints.translations,
                complianceEndpoint: this.config.endpoints.complianceReport,
                contentByRegion: this._getDisclaimerContent('main'),
                translations: this._getDisclaimerTranslations('main'),
                dependencies: { ErrorLogger: errorLogger, EventBus: eventBus, PDFService: pdfServiceInstance, InputSanitizer: inputSanitizerServiceInstance }
            });
            await this.modules.MainDisclaimerService.initPromise;
            // Pass instance to global dependencies if other modules might need it directly.
            this.dependencies.MainDisclaimerServiceInstance = this.modules.MainDisclaimerService;

            // Initialize Theme Manager
            this.modules.ThemeManager = new ThemeManager({
                toggleButtonId: 'theme-toggle-button', // Matches index.html
                dependencies: { EventBus: eventBus, ErrorLogger: errorLogger, SecureStorage: secureStorage }
            });
            this.dependencies.ThemeManager = this.modules.ThemeManager; // Make available to AppUI

            // Initialize Tab Manager
            this.modules.TabManager = new TabManagerService(
                '.tabs-navigation', // Selector for the <nav> in index.html v5.0.3
                {
                    defaultTabId: this.config.defaultTabId, // e.g., 'tab-medication-button'
                    useUrlHash: true,
                    tabSelector: '.tab-button', // Class for tab buttons in index.html v5.0.3
                    panelSelector: '.tab-content-panel', // Class for tab panels in index.html v5.0.3
                    activeTabClass: 'active',
                    activePanelClass: 'active',
                    dependencies: { ErrorLogger: errorLogger, EventBus: eventBus, ModuleLoader: moduleLoader }
                }
            );
            this.dependencies.TabManager = this.modules.TabManager;

            // Initialize Results Display Service
            this.modules.ResultsDisplay = new ResultsDisplayService({
                selectors: this._getResultsDisplaySelectors(), // Updated for v5.0.3 HTML (with *-results-list)
                resultBlockTemplateId: 'results-template-cvd', // For FRS/QRISK3
                combinedResultTemplateId: 'comparison-view-results-template',
                advVizResultTemplateId: 'advanced-viz-results-template',
                dependencies: { ErrorLogger: errorLogger, EventBus: eventBus, InputSanitizer: inputSanitizerServiceInstance, ChartManager: null }
            });
            this.dependencies.ResultsDisplayService = this.modules.ResultsDisplay;

            // Initialize ChartManager
            this.modules.ChartManager = new ChartManager({
                dependencies: { ErrorLogger: errorLogger, EventBus: eventBus, ThemeManager: this.modules.ThemeManager }
            });
            this.dependencies.ChartManager = this.modules.ChartManager;
            this.modules.ResultsDisplay.setChartManager(this.modules.ChartManager); // Inject ChartManager

            // Initialize RiskCalculator
            this.modules.RiskCalculator = new RiskCalculator(this.dependencies); // Pass consolidated dependencies
            this.dependencies.RiskCalculator = this.modules.RiskCalculator;

            // Initialize main AppUI (from ui.js)
            this.modules.AppUI = new AppUI(this.dependencies); // Pass consolidated dependencies
            await this.modules.AppUI.initialize();

            this.initialized = true;
            eventBus.publish('app:initialized', { appName: this.config.appName, version: this.config.version });
            errorLogger.log('info', `${this.config.appName} fully initialized and ready.`, 'MainApp');
            
            this._processEarlyErrors();
            loadingManager.hide();

        }, (error) => {
            errorLogger.handleError('Fatal error during DOM ready initialization.', 'MainApp-DOMReady', 'critical', { error });
            this._displayFatalError(error.message || "Application failed to initialize correctly.");
            loadingManager.hide(true); // Force hide
        })();
    }

    _processEarlyErrors() {
        if (window.__earlyErrors && window.__earlyErrors.length > 0) {
            errorLogger.log('warn', `Processing ${window.__earlyErrors.length} early errors...`, 'MainApp-EarlyErrors');
            window.__earlyErrors.forEach(err => {
                errorLogger.handleError(
                    err.error || err.message,
                    `EarlyError-${err.type || 'unknown'}`,
                    'error',
                    { ...err, isEarlyError: true }
                );
            });
            window.__earlyErrors = []; // Clear processed errors
        }
        if(window.__originalConsoleError) console.error = window.__originalConsoleError;
        if(window.__originalOnError) window.onerror = window.__originalOnError;
        if(window.__originalUnhandledRejection) window.onunhandledrejection = window.__originalUnhandledRejection;
    }

    _displayFatalError(message) {
        const S = window.InputSanitizerServiceInstance || { escapeHTML: (val) => String(val).replace(/[&<>"']/g, (match) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[match]) };
        const overlay = document.getElementById('loading-overlay');
        const messageEl = document.getElementById('loading-message');
        const spinnerEl = overlay ? overlay.querySelector('.loading-spinner') : null;

        let errorHtml = `
            <div style="padding: 20px; text-align: center; font-family: var(--font-sans, sans-serif); color: var(--error-color, #dc3545); background-color: var(--current-bg-color, white); border-radius: var(--radius-lg, 8px); box-shadow: var(--shadow-xl, 0 10px 20px rgba(0,0,0,0.2)); max-width: 500px; margin: auto;">
                <h2 style="font-size: 1.5em; color: var(--error-color, #dc3545); margin-bottom: 1em;">Application Error</h2>
                <p style="font-size: 1em; margin-bottom: 1.5em;">A critical error occurred and the application cannot continue:</p>
                <p style="font-weight: bold; background-color: rgba(220, 53, 69, 0.1); padding: 0.5em; border-radius: var(--radius-sm, 4px);">${S.escapeHTML(message)}</p>
                <button onclick="window.location.reload()" style="margin-top: 1.5em; padding: 0.75em 1.5em; background-color: var(--primary-color, #007bff); color: white; border: none; border-radius: var(--radius-md, 6px); cursor: pointer; font-size: 1em;">Refresh Application</button>
            </div>`;

        if (overlay && messageEl) {
            if(spinnerEl) spinnerEl.style.display = 'none';
            messageEl.innerHTML = errorHtml;
            overlay.style.backgroundColor = 'rgba(0,0,0,0.85)'; // Darken significantly for fatal error
            overlay.style.display = 'flex'; // Ensure it's visible
        } else {
            document.body.innerHTML = errorHtml;
            document.body.style.backgroundColor = '#e0e0e0';
            document.body.style.display = 'flex';
            document.body.style.alignItems = 'center';
            document.body.style.justifyContent = 'center';
            document.body.style.minHeight = '100vh';
        }
    }

    _getDisclaimerContent(type) {
        // Adapted from user's v3.2.0
        const S = this.dependencies.InputSanitizer;
        const commonIntro = "<p><strong>This tool is intended for use by qualified healthcare professionals only.</strong> It is a supplementary aid and does not replace clinical judgment or established patient care protocols. All data entered is processed locally in your browser by default.</p>";
        const liabilityLimit = "<p>The developers and distributors of this tool disclaim all liability for any decisions made or actions taken based on the information provided by this tool. Users assume full responsibility for its use.</p>";
        const dataPrivacy = "<p>Ensure compliance with all applicable patient privacy laws (e.g., HIPAA, PIPEDA, GDPR) when using this tool with patient data.</p>";

        const content = {
            main: {
                us: { titleKey: 'mainDisclaimerTitleUS', bodyHtml: S.sanitizeHTML(`${commonIntro}<p>Refer to current ACC/AHA guidelines. ${dataPrivacy} ${liabilityLimit}`, { USE_PROFILES: { html: true }}) },
                canada: { titleKey: 'mainDisclaimerTitleCA', bodyHtml: S.sanitizeHTML(`${commonIntro}<p>Refer to current CCS guidelines. ${dataPrivacy} ${liabilityLimit}`, { USE_PROFILES: { html: true }}) },
                eu: { titleKey: 'mainDisclaimerTitleEU', bodyHtml: S.sanitizeHTML(`${commonIntro}<p>Refer to current ESC guidelines. ${dataPrivacy} Adherence to GDPR is the user's responsibility. ${liabilityLimit}`, { USE_PROFILES: { html: true }}) },
                default: { titleKey: 'mainDisclaimerTitleDefault', bodyHtml: S.sanitizeHTML(`${commonIntro} ${dataPrivacy} ${liabilityLimit}`, { USE_PROFILES: { html: true }}) }
            },
            privacy: { default: { titleKey: 'privacyPolicyTitle', bodyHtml: S.sanitizeHTML(`<p>This application processes data locally... ${dataPrivacy}`, { USE_PROFILES: { html: true }}) }},
            terms: { default: { titleKey: 'termsOfServiceTitle', bodyHtml: S.sanitizeHTML(`<p>By using this application, you agree to... ${liabilityLimit}`, { USE_PROFILES: { html: true }}) }}
        };
        return content[type] || content.main;
    }

    _getDisclaimerTranslations(type) {
        // Adapted from user's v3.2.0
        const S = this.dependencies.InputSanitizer;
        const translations = {
            main: {
                en: { mainDisclaimerTitleUS: S.escapeHTML('Important Medical Disclaimer & HIPAA Notice (US)'), mainDisclaimerTitleCA: S.escapeHTML('Important Medical Disclaimer & Privacy Notice (Canada)'), mainDisclaimerTitleEU: S.escapeHTML('Important Medical Disclaimer & GDPR Notice (EU)'), mainDisclaimerTitleDefault: S.escapeHTML('Important Medical Disclaimer'), acceptButton: S.escapeHTML('Accept & Continue'), checkboxLabelPrimary: S.escapeHTML('I have read, understood, and agree to these terms.'), checkboxLabelLiability: S.escapeHTML('I acknowledge the limitations of liability.'), languageSelectorLabel: S.escapeHTML('Language:') },
                fr: { mainDisclaimerTitleUS: S.escapeHTML('Avis Médical Important et Notice HIPAA (É.-U.)'), mainDisclaimerTitleCA: S.escapeHTML('Avis Médical Important et Notice de Confidentialité (Canada)'), mainDisclaimerTitleEU: S.escapeHTML('Avis Médical Important et Notice RGPD (UE)'), mainDisclaimerTitleDefault: S.escapeHTML('Avis Médical Important'), acceptButton: S.escapeHTML('Accepter et Continuer'), checkboxLabelPrimary: S.escapeHTML("J'ai lu, compris et j'accepte ces conditions."), checkboxLabelLiability: S.escapeHTML("Je reconnais les limitations de responsabilité."), languageSelectorLabel: S.escapeHTML('Langue:') },
            },
            privacy: { en: { privacyPolicyTitle: S.escapeHTML('Privacy Policy') }, fr: { privacyPolicyTitle: S.escapeHTML('Politique de Confidentialité') }},
            terms: { en: { termsOfServiceTitle: S.escapeHTML('Terms of Service') }, fr: { termsOfServiceTitle: S.escapeHTML("Conditions d'Utilisation") }}
        };
        return translations[type] || translations.main;
    }

    _getResultsDisplaySelectors() {
        // UPDATED for index_html_v5_0_2_tabs_buttons_checked (v5.0.3)
        // Targets the specific '*-results-list' inner divs for appending multiple results
        return {
            frs: {
                resultArea: '#frs-results-container', // Overall container for the FRS results section
                resultList: '#frs-results-list',       // Specific div where multiple result blocks are appended
                // Individual value spans are likely within the template, ResultsDisplayService will handle
            },
            qrisk3: {
                resultArea: '#qrisk3-results-container',
                resultList: '#qrisk3-results-list',
            },
            combined: {
                resultArea: '#combined-results-display-area',
                resultList: '#combined-results-list', // Specific list for combined results
            },
            advancedViz: { // Renamed from 'visualization' to match HTML
                resultArea: '#advanced-visualization-output-area',
                resultList: '#advanced-viz-results-list', // Specific list for advanced viz outputs
                detailsArea: '#advanced-visualization-details-area'
            },
            medicationEvaluation: { // For the medication evaluation results on Meds & Labs tab
                resultArea: '#medication-evaluation-results-container',
                // This might not need a list if it's always one evaluation at a time.
                // If multiple evaluations are to be shown, add a 'medication-evaluation-results-list' div.
            },
            recommendations: { resultArea: '#recommendations-content-area' },
            history: { resultArea: '#assessment-history-list-area' }
        };
    }
}

// --- Application Startup ---
try {
    // Ensure only one instance of the app is created.
    if (!window.CVDApp) {
        window.CVDApp = new CVDRiskApplication();
    }
} catch (e) {
    console.error("CRITICAL STARTUP FAILURE (main.js outer try/catch):", e);
    // Fallback error display if CVDRiskApplication constructor itself fails catastrophically
    const S_fallback = { escapeHTML: (val) => String(val).replace(/[&<>"']/g, (match) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[match]) };
    document.body.innerHTML = `<div style="color:red;padding:20px;font-family:sans-serif;text-align:center;"><h1>Critical Application Failure</h1><p>The application could not start: ${S_fallback.escapeHTML(e.message || 'Unknown error')}</p><button onclick="window.location.reload()">Refresh</button></div>`;
}