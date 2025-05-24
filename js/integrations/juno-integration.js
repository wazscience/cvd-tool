/**
 * Juno EMR Integration Service Module
 * @file /js/integrations/juno-integration.js
 * @description Enables the CVD Risk Toolkit to be embedded in Juno EMR,
 * exchange data, and respond to EMR events using a service-oriented approach.
 * @version 2.0.0
 * @exports JunoIntegrationService
 */

'use strict';

class JunoIntegrationService {
    /**
     * Creates or returns the singleton instance of JunoIntegrationService.
     * @param {object} [options={}] - Configuration options.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     * Expected: ErrorLogger, EventBus, FieldMapperService, LoadingManager, InputSanitizer.
     */
    constructor(options = {}) {
        if (JunoIntegrationService.instance) {
            return JunoIntegrationService.instance;
        }

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger(),
            EventBus: window.EventBus,
            FieldMapperService: window.FieldMapperService,
            LoadingManager: window.LoadingManagerInstance,
            InputSanitizer: window.InputSanitizerService,
            ...options.dependencies,
        };

        this.config = {
            FORM_ID: 'cvd-risk-toolkit-v2', // Unique ID for this version of the form
            API_VERSION: '1.0', // Version of the Juno API interaction expected
            REQUIRED_PERMISSIONS: ['patient.read', 'patient.demographics', 'patient.labs', 'patient.medications', 'patient.conditions', 'patient.vitals'],
            JUNO_ORIGIN_PATTERN: /^https?:\/\/([a-zA-Z0-9-]+\.)*junoemr\.com$/, // Regex for validating Juno origin
            FIELD_MAPPING_PROFILE_NAME: 'juno', // Profile name for FieldMapperService
        };

        this.isJunoEnv = false;
        this.junoApi = null;
        this.currentJunoPatientId = null;

        if (!this.dependencies.EventBus || !this.dependencies.FieldMapperService || !this.dependencies.InputSanitizer) {
            this._log('critical', 'Missing critical dependencies (EventBus, FieldMapperService, InputSanitizer). Juno integration may fail.', 'Init');
        }

        this._initialize();
        JunoIntegrationService.instance = this;
    }

    _getFallbackLogger() {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`JunoInt Fallback Logger [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => console[lvl]?.(`JunoInt Fallback Logger [${lvl}]: ${msg}`, data) || console.log(`JunoInt Fallback Logger [${lvl}]: ${msg}`, data)
        };
    }

    _log(level, message, data) {
        this.dependencies.ErrorLogger.log?.(level, `JunoIntSvc: ${message}`, data);
    }

    _handleError(error, context, isUserFacing = true, additionalData = {}) {
        const msg = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(msg, `JunoIntSvc-${context}`, 'error', { originalError: error, ...additionalData });
        if (isUserFacing) {
            this.dependencies.EventBus?.publish('ui:showToast', { message: `Juno Integration Error (${context}): ${msg}`, type: 'error' });
        }
    }

    async _initialize() {
        this.isJunoEnv = this._detectJunoEnvironment();
        if (this.isJunoEnv) {
            this._log('info', 'Juno EMR environment detected. Initializing integration...');
            this._setupJunoEventListeners();
            await this._registerWithJunoAPI(); // Make it async if registration is async
        } else {
            this._log('info', 'Not running in Juno EMR environment. Standalone mode.');
        }
    }

    _detectJunoEnvironment() {
        try {
            // Check if running within an iframe and if parent has JunoAPI
            if (window.parent !== window && window.parent.JunoAPI) {
                return true;
            }
            // Fallback checks (less reliable but can be useful for testing)
            const currentUrl = window.location.href;
            const referrerUrl = document.referrer;
            return this.config.JUNO_ORIGIN_PATTERN.test(currentUrl) ||
                   (referrerUrl && this.config.JUNO_ORIGIN_PATTERN.test(new URL(referrerUrl).origin));
        } catch (e) {
            // Catch SecurityError if parent origin is different and inaccessible
            this._log('debug', 'Cannot access parent window; assuming not Juno environment.', e);
            return false;
        }
    }

    _setupJunoEventListeners() {
        window.addEventListener('message', this._handleJunoMessage.bind(this));
        this._log('info', 'Juno message event listener set up.');
    }

    async _registerWithJunoAPI() {
        if (window.parent.JunoAPI && typeof window.parent.JunoAPI.register === 'function') {
            try {
                this.junoApi = window.parent.JunoAPI; // Store reference
                const registrationResult = await this.junoApi.register({
                    name: 'CVD Risk Toolkit Enhanced',
                    version: this.config.API_VERSION, // API interaction version
                    appVersion: window.CVDApp?.config?.version || 'unknown', // Toolkit's own version
                    permissions: this.config.REQUIRED_PERMISSIONS,
                    onPatientChange: this._handlePatientChangeFromJuno.bind(this),
                    onFormSave: this._handleFormSaveRequestFromJuno.bind(this),
                    onFormCancel: this._handleFormCancelFromJuno.bind(this),
                    // Add other callbacks as supported by Juno's API
                });
                this._log('info', 'Successfully registered with Juno EMR API.', { result: registrationResult });
                this.dependencies.EventBus.publish('juno:registered', { success: true });
                // Initial request for patient data after registration
                this.requestPatientDataFromJuno();
            } catch (error) {
                this._handleError(error, 'RegisterWithJunoAPI', true);
                this.dependencies.EventBus.publish('juno:registered', { success: false, error: error.message });
            }
        } else {
            this._log('warn', 'JunoAPI not found in parent window or register function missing.');
        }
    }

    _handleJunoMessage(event) {
        if (!this.config.JUNO_ORIGIN_PATTERN.test(event.origin)) {
            this._log('warn', 'Message received from untrusted origin. Ignoring.', { origin: event.origin });
            return;
        }

        const message = event.data;
        if (!message || typeof message !== 'object' || !message.type) {
            this._log('debug', 'Received non-standard message from Juno. Ignoring.', { message });
            return;
        }

        this._log('info', `Received message from Juno: ${message.type}`, { payload: message.data });
        this.dependencies.LoadingManager?.show('Processing EMR Data...');

        try {
            switch (message.type) {
                case 'juno:patient_data_response': // Assuming Juno sends data with this type
                case 'patient_data': // From original user code
                    this._processIncomingPatientData(message.data);
                    break;
                case 'juno:form_save_request':
                case 'form_save_requested':
                    this._handleFormSaveRequestFromJuno();
                    break;
                case 'juno:form_cancel_request':
                case 'form_cancelled':
                    this._handleFormCancelFromJuno();
                    break;
                // Add other Juno-specific message types
                default:
                    this._log('debug', `Unhandled Juno message type: ${message.type}`);
            }
        } catch (error) {
            this._handleError(error, `HandleJunoMessage-${message.type}`, true, { messageData: message.data });
        } finally {
            this.dependencies.LoadingManager?.hide();
        }
    }

    _handlePatientChangeFromJuno(junoPatientData) {
        this._log('info', 'Juno onPatientChange callback triggered.');
        this._processIncomingPatientData(junoPatientData);
    }

    _processIncomingPatientData(junoPatientData) {
        if (!junoPatientData) {
            this._log('warn', 'Received empty patient data from Juno.');
            this.dependencies.EventBus.publish('emr:patientDataError', { error: 'Empty data from EMR' });
            return;
        }
        this.currentJunoPatientId = junoPatientData.demographics?.patientId || junoPatientData.id || null; // Adapt based on actual Juno payload

        const internalData = this.dependencies.FieldMapperService.mapToInternal(
            junoPatientData,
            this.config.FIELD_MAPPING_PROFILE_NAME
        );

        if (internalData) {
            this._log('info', 'Juno patient data mapped to internal format.', { internalKeys: Object.keys(internalData.patient || {}) });
            // Publish a batch update event for FormHandlers or AppUI to consume
            this.dependencies.EventBus.publish('sharedField:batchUpdate', {
                data: internalData.patient, // Assuming patient demographics are top-level in internal model
                source: 'junoEMR',
                originatingFormId: 'junoEMR' // Special ID
            });
            // Publish specific lab data if available
            if (internalData.observations) {
                 this.dependencies.EventBus.publish('sharedField:batchUpdate', {
                    data: internalData.observations, // Assuming labs are here
                    source: 'junoEMR',
                    originatingFormId: 'junoEMR'
                });
            }
            // TODO: Handle conditions, medications similarly by publishing batch updates
            // or a single 'emr:patientDataProcessed' event for AppUI to orchestrate form population.
            // For now, focusing on the shared field mechanism.

            this.dependencies.EventBus.publish('ui:showToast', { message: 'Patient data loaded from Juno EMR.', type: 'success' });
        } else {
            this._handleError(new Error('Field mapping from Juno data returned null.'), 'ProcessJunoData', true);
        }
    }

    async _handleFormSaveRequestFromJuno() {
        this._log('info', 'Juno requested form save.');
        this.dependencies.LoadingManager?.show('Preparing data for EMR...');
        try {
            // 1. Request current data from the application (e.g., from DataManager or focused form)
            // This part needs an event or a direct call to an AppUI/DataService method.
            // For now, let's assume we can get the current canonical data model.
            // This is a placeholder for actual data retrieval logic.
            const currentAppData = await this._getApplicationDataForSave();

            if (!currentAppData) {
                throw new Error('Could not retrieve current application data to save.');
            }

            // 2. Map internal data to Juno's expected format
            const junoSaveData = this.dependencies.FieldMapperService.mapToExternal(
                currentAppData,
                this.config.FIELD_MAPPING_PROFILE_NAME
            );

            if (!junoSaveData) {
                throw new Error('Failed to map application data to Juno format.');
            }

            // 3. Send to Juno API
            if (this.junoApi && typeof this.junoApi.saveFormData === 'function') {
                const saveResult = await this.junoApi.saveFormData({
                    formId: this.config.FORM_ID,
                    patientId: this.currentJunoPatientId, // Ensure this is set
                    data: junoSaveData,
                    timestamp: new Date().toISOString()
                });
                this._log('info', 'Data sent to JunoAPI.saveFormData.', { result: saveResult });
                this.dependencies.EventBus.publish('juno:saveComplete', { success: true, result: saveResult });
                this.dependencies.EventBus.publish('ui:showToast', { message: 'Data saved to Juno EMR.', type: 'success' });
            } else {
                throw new Error('JunoAPI.saveFormData function not available.');
            }
        } catch (error) {
            this._handleError(error, 'HandleFormSaveRequest', true);
            this.dependencies.EventBus.publish('juno:saveComplete', { success: false, error: error.message });
        } finally {
            this.dependencies.LoadingManager?.hide();
        }
    }

    async _getApplicationDataForSave() {
        // Placeholder: In a real app, this would fetch data from DataManagerService
        // or active forms, ensuring it's the complete, validated internal model.
        // For demonstration, it might look like this:
        // const patientData = await this.dependencies.DataManagerService.getItem('currentPatientProfile');
        // const riskResults = await this.dependencies.DataManagerService.getItem('lastCombinedRiskResult');
        // return { patient: patientData, results: riskResults, ... };
        this._log('warn', '_getApplicationDataForSave is a placeholder. Implement actual data retrieval.');
        // Try to get data from the "Medication & Labs" form as a proxy for current canonical data
        const medFormHandler = window.AppUI?.formHandlers?.['medication-form']; // Accessing via AppUI
        if (medFormHandler) {
            const formData = medFormHandler.getFormData();
            // This formData is raw. It needs to be processed into the canonical internal model.
            // For simplicity, we'll assume it's somewhat close or that FieldMapper handles it.
            return { patient: formData, lipids: formData, bp: formData, riskFactors: formData, markers: formData }; // Highly simplified
        }
        return null;
    }


    _handleFormCancelFromJuno() {
        this._log('info', 'Juno form cancellation requested.');
        // Publish an event for AppUI to handle (e.g., reset forms, show confirmation)
        this.dependencies.EventBus.publish('juno:formCancelled');
        // Example: AppUI might listen and call formHandler.reset() on active/all forms.
    }

    /**
     * Public method to explicitly request patient data from Juno.
     * Useful if initial auto-fetch fails or needs to be re-triggered.
     */
    requestPatientDataFromJuno() {
        if (this.isJunoEnv && this.junoApi && typeof this.junoApi.requestPatientData === 'function') {
            this._log('info', 'Requesting patient data from Juno EMR API...');
            this.dependencies.LoadingManager?.show('Fetching data from Juno EMR...');
            try {
                this.junoApi.requestPatientData(); // This will trigger onPatientChange or a message
            } catch (error) {
                this._handleError(error, 'RequestPatientData', true);
                this.dependencies.LoadingManager?.hide();
            }
        } else {
            this._log('warn', 'Cannot request patient data: Not in Juno environment or API unavailable.');
        }
    }
}

// Instantiate and export the singleton service (typically done in main.js)
// Ensure dependencies are available on window or passed correctly.
// const JunoIntegrationServiceInstance = new JunoIntegrationService({
//     dependencies: { /* ... */ }
// });
// window.JunoIntegrationServiceInstance = JunoIntegrationServiceInstance;

// export default JunoIntegrationService;
