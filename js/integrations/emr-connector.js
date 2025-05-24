/**
 * EMR Connector Service Module
 * @file /js/data-management/emr-connector.js
 * @description Provides secure and robust integration with various Electronic Medical Record (EMR) systems
 * including Juno EMR, FHIR-compliant systems, OSCAR EMR, and generic APIs.
 * Uses FieldMapperService for data transformation and EventBus for decoupled communication.
 * @version 2.2.0
 */

'use strict';

// Assuming error types, RuntimeProtection, helper functions are globally available or imported in main.js
// For example:
// import { EMRConnectionError, ValidationError, AuthenticationError } from '../utils/error-types.js';
// import { deepClone, formatDate, sanitizeDataForDisplay, validateUrl } from '../utils/helper-functions.js'; // Assuming sanitizeDataForDisplay

class EMRConnectorService {
    /**
     * Creates or returns the singleton instance of EMRConnectorService.
     * @param {object} [options={}] - Configuration options.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     * Expected: ErrorLogger, EventBus, LoadingManager, FieldMapperService, InputSanitizer, SecureTokenStorage (conceptual).
     */
    constructor(options = {}) {
        if (EMRConnectorService.instance) {
            return EMRConnectorService.instance;
        }

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger('ErrorLogger'),
            EventBus: window.EventBus,
            LoadingManager: window.LoadingManagerInstance || { show: () => {}, hide: () => {} },
            FieldMapperService: window.FieldMapperService,
            InputSanitizer: window.InputSanitizerService,
            SecureTokenStorage: window.SecureTokenStorageInstance || this._getFallbackSecureStorage(), // Conceptual
            RuntimeProtection: window.RuntimeProtection, // Static methods
            HelperFunctions: { // Assuming these are globally available or passed via main.js
                deepClone: window.deepClone || ((obj) => JSON.parse(JSON.stringify(obj))),
                formatDate: window.formatDate || ((date) => new Date(date).toLocaleDateString()),
                sanitizeDataForDisplay: window.sanitizeDataForDisplay || ((data) => data), // Should exist
                validateUrl: window.validateUrl || ((url) => { try { new URL(url); return true; } catch { return false; } })
            },
            ...options.dependencies,
        };

        this.config = {
            apiTimeout: 30000, // 30 seconds
            maxAuthAttempts: 3,
            lockoutPeriodMs: 5 * 60 * 1000, // 5 minutes
            keepAliveIntervalMs: 5 * 60 * 1000, // 5 minutes
            // EMR-specific configurations (endpoints can be overridden by user settings)
            emrSettings: {
                juno: {
                    name: 'Juno EMR',
                    defaultEndpoint: 'https://api.junoemr.com/v1', // Example
                    mappingProfile: 'juno',
                    authTypesSupported: ['oauth', 'token'] // Example
                },
                fhir: {
                    name: 'FHIR Server',
                    defaultEndpoint: '', // User must provide
                    mappingProfile: 'generic-fhir', // Default FHIR mapping
                    authTypesSupported: ['oauth', 'bearer_token', 'basic', 'none']
                },
                oscar: {
                    name: 'OSCAR EMR',
                    defaultEndpoint: '', // User must provide
                    mappingProfile: 'oscar',
                    authTypesSupported: ['oauth', 'token', 'basic']
                },
                generic: {
                    name: 'Generic API',
                    defaultEndpoint: '',
                    mappingProfile: 'generic', // A basic generic profile
                    authTypesSupported: ['token', 'basic', 'none']
                }
            },
            // Default FHIR mappings are now primarily managed by FieldMapperService,
            // but EMRConnector can define which profile to use.
        };

        this.connectionState = {
            connected: false,
            emrType: null, // 'juno', 'fhir', 'oscar', 'generic'
            connectionDetails: null, // Stores endpoint, authType, etc.
            lastActivity: 0,
            keepAliveTimer: null,
            authAttempts: {}, // { emrType_endpoint: count }
        };
        this._tempCredentials = null; // For storing passwords/secrets only during an operation

        if (!this.dependencies.EventBus) this._log('critical', 'EventBus is a critical dependency for EMRConnectorService.');
        if (!this.dependencies.FieldMapperService) this._log('critical', 'FieldMapperService is a critical dependency.');
        if (!this.dependencies.InputSanitizer) this._log('warn', 'InputSanitizerService not available. EMR interactions may be less secure.');


        this._initializeDefaultMappingProfiles(); // Ensure FieldMapper has basic profiles
        this._setupEventListeners();
        this._loadSavedConnection(); // Attempt to restore connection state
        this._setupKeepAlive();

        EMRConnectorService.instance = this;
        this._log('info', 'EMRConnectorService Initialized (v2.2.0).');
    }

    _getFallbackLogger(serviceName) {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`${serviceName} Fallback [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => console[lvl]?.(`${serviceName} Fallback [${lvl}]: ${msg}`, data) || console.log(`${serviceName} Fallback [${lvl}]: ${msg}`, data)
        };
    }
    _getFallbackSecureStorage() { // Basic localStorage fallback for tokens if SecureTokenStorage not present
        this._log('warn', 'SecureTokenStorage not available, using localStorage for tokens (less secure).');
        return {
            getItem: (key) => localStorage.getItem(`emr_token_${key}`),
            setItem: (key, value) => localStorage.setItem(`emr_token_${key}`, value),
            removeItem: (key) => localStorage.removeItem(`emr_token_${key}`)
        };
    }

    _log(level, message, data) { /* ... (same as v2.1.0) ... */
        this.dependencies.ErrorLogger.log?.(level, `EMRConnector: ${message}`, data);
    }
    _handleError(error, context, isUserFacing = true, additionalData = {}) { /* ... (same as v2.1.0) ... */
        const msg = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(msg, `EMRConnector-${context}`, 'error', { originalError: error, ...additionalData });
        if (isUserFacing) {
            this.dependencies.EventBus?.publish('ui:showToast', { message: `EMR Error (${context}): ${msg}`, type: 'error' });
        }
    }

    _initializeDefaultMappingProfiles() {
        if (this.dependencies.FieldMapperService && !this.dependencies.FieldMapperService.getProfile('generic-fhir')) {
            this.dependencies.FieldMapperService.registerProfile('generic-fhir', this._getDefaultFHIRMappings());
            this._log('info', 'Registered default generic-fhir mapping profile.');
        }
        // TODO: Add default profiles for 'juno', 'oscar', 'generic' if they don't exist in FieldMapperService
    }

    _getDefaultFHIRMappings() { // This should be comprehensive as in v2.1.0
        return {
            toInternal: {
                patient: {
                    id: 'id', name: (fhirPatient) => this._getPatientNameFromFHIR(fhirPatient),
                    gender: 'gender', birthDate: 'birthDate', age: (fhirPatient) => fhirPatient.birthDate ? this._calculateAge(fhirPatient.birthDate) : null,
                    ethnicity: (fhirPatient) => fhirPatient.extension?.find(e => e.url.includes('ethnicity'))?.valueCoding?.code || 'unknown',
                    // Height, weight, BMI will be populated from observations
                },
                observations: [ // LOINC codes to internal keys
                    { fhirCode: '8302-2', internalKey: 'height', unitSystem: 'http://unitsofmeasure.org', unitCode: 'cm', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.unit', datePath: 'effectiveDateTime' },
                    { fhirCode: '29463-7', internalKey: 'weight', unitSystem: 'http://unitsofmeasure.org', unitCode: 'kg', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.unit', datePath: 'effectiveDateTime' },
                    { fhirCode: '39156-5', internalKey: 'bmi', unitSystem: 'http://unitsofmeasure.org', unitCode: 'kg/m2', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.code', datePath: 'effectiveDateTime' }, // BMI unit often 'kg/m2'
                    { fhirCode: '8480-6', internalKey: 'systolicBP', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mm[Hg]', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.code', datePath: 'effectiveDateTime' },
                    { fhirCode: '8462-4', internalKey: 'diastolicBP', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mm[Hg]', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.code', datePath: 'effectiveDateTime' },
                    { fhirCode: '2093-3', internalKey: 'totalCholesterol', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mmol/L', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.unit', datePath: 'effectiveDateTime' },
                    { fhirCode: '2085-9', internalKey: 'hdlCholesterol', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mmol/L', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.unit', datePath: 'effectiveDateTime' }, // Changed key for clarity
                    { fhirCode: '13457-7', internalKey: 'ldlCholesterol', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mmol/L', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.unit', datePath: 'effectiveDateTime' }, // Calculated LDL
                    { fhirCode: '2089-1', internalKey: 'ldlCholesterol', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mmol/L', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.unit', datePath: 'effectiveDateTime' }, // Direct LDL, will overwrite if both present and processed later
                    { fhirCode: '2571-8', internalKey: 'triglycerides', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mmol/L', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.unit', datePath: 'effectiveDateTime' },
                    { fhirCode: '32300-3', internalKey: 'lipoproteinA', unitSystem: 'http://unitsofmeasure.org', unitCode: 'nmol/L', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.unit', datePath: 'effectiveDateTime' }, // Lp(a)
                    { fhirCode: '1884-6', internalKey: 'apolipoproteinB', unitSystem: 'http://unitsofmeasure.org', unitCode: 'g/L', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.unit', datePath: 'effectiveDateTime' }, // ApoB
                    { fhirCode: '4548-4', internalKey: 'hba1c', unitSystem: 'http://unitsofmeasure.org', unitCode: '%', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.unit', datePath: 'effectiveDateTime' }, // HbA1c %
                    { fhirCode: '1558-6', internalKey: 'glucoseFasting', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mmol/L', valuePath: 'valueQuantity.value', unitPath: 'valueQuantity.unit', datePath: 'effectiveDateTime' },
                    { fhirCode: '72166-2', internalKey: 'smokingStatus', valuePath: 'valueCodeableConcept.coding[0].code', systemPath: 'valueCodeableConcept.coding[0].system', isCodeableConcept: true, datePath: 'effectiveDateTime' }, // Smoking status (SNOMED CT)
                ],
                conditions: [ // SNOMED CT codes or display text regex
                    { internalKey: 'hasDiabetes', fhirConcepts: [{system: 'http://snomed.info/sct', code: '73211009'}, {display: /diabetes mellitus/i}], value: true },
                    { internalKey: 'isOnBPMeds', fhirConcepts: [{display: /hypertension treatment/i, system:'http://snomed.info/sct', code:'50958009'}], value: true }, // This is better handled by MedicationStatement
                    { internalKey: 'hasFamilyHistoryCVD', fhirConcepts: [{display: /family history of cardiovascular disease/i, system:'http://snomed.info/sct', code:'160303001'}], value: true },
                    { internalKey: 'hasAtrialFibrillation', fhirConcepts: [{display: /atrial fibrillation/i, system:'http://snomed.info/sct', code:'49436004'}], value: true },
                    { internalKey: 'hasChronicKidneyDisease', fhirConcepts: [{display: /chronic kidney disease/i, system:'http://snomed.info/sct', code:'709044004'}], value: true },
                    { internalKey: 'hasRheumatoidArthritis', fhirConcepts: [{display: /rheumatoid arthritis/i, system:'http://snomed.info/sct', code:'69896004'}], value: true },
                    { internalKey: 'hasSLE', fhirConcepts: [{display: /systemic lupus erythematosus/i, system:'http://snomed.info/sct', code:'55464009'}], value: true },
                    { internalKey: 'hasSevereMentalIllness', fhirConcepts: [{display: /severe mental illness/i, system:'http://snomed.info/sct', code:'191737002'}], value: true }, // Example code
                    { internalKey: 'hasMigraines', fhirConcepts: [{display: /migraine/i, system:'http://snomed.info/sct', code:'37796009'}], value: true },
                    { internalKey: 'hasErectileDysfunction', fhirConcepts: [{display: /erectile dysfunction/i, system:'http://snomed.info/sct', code:'19561000'}], value: true },
                ],
                medications: [ // Based on RxNorm or ATC, or keywords in text
                    { internalKey: 'isOnBPMeds', fhirClassKeywords: ['antihypertensive', 'beta blocker', 'ace inhibitor', 'arb', 'calcium channel blocker', 'diuretic'] },
                    { internalKey: 'isOnAtypicalAntipsychotics', fhirClassKeywords: ['atypical antipsychotic', 'risperidone', 'olanzapine', 'quetiapine'] },
                    { internalKey: 'isOnRegularSteroids', fhirClassKeywords: ['corticosteroid', 'prednisone', 'dexamethasone'] }, // Systemic steroids
                ]
            },
            toFHIR: { // Defines how to map internal model to FHIR resources for saving
                // Example: Creating a RiskAssessment resource
                riskAssessment: (internalResults, patientReference, calculatorType, assessmentDate) => ({
                    resourceType: 'RiskAssessment',
                    status: 'final',
                    subject: { reference: patientReference },
                    date: assessmentDate,
                    method: { coding: [{ system: 'http://example.org/cvd-toolkit', code: calculatorType.toUpperCase() }], text: `${calculatorType} CVD Risk Assessment` },
                    prediction: [{
                        outcome: { text: '10-year Cardiovascular Disease Event' },
                        probabilityDecimal: (parseFloat(internalResults.tenYearRiskPercent) / 100).toFixed(4), // Ensure it's a proportion
                        whenRange: { low: { value: 10, unit: 'years', system: 'http://unitsofmeasure.org', code: 'a' } }
                    }],
                    note: [{ text: `Risk Category: ${internalResults.riskCategory}. Heart Age: ${internalResults.heartAge || 'N/A'}. Recommendations: ${internalResults.recommendations?.summaryMessage || 'See detailed notes.'}` }]
                }),
                // TODO: Add mappings for Observations (e.g., if toolkit allows manual entry that needs to be saved back)
                // TODO: Add mappings for Conditions if new conditions are identified/confirmed by the toolkit
            }
        };
    }

    _getPatientNameFromFHIR(fhirPatient) { /* ... (same as v2.1.0) ... */
        if (!fhirPatient?.name?.length) return 'Unknown';
        const nameInfo = fhirPatient.name.find(n=>n.use === 'official') || fhirPatient.name[0];
        return `${(nameInfo.given || []).join(' ')} ${nameInfo.family || ''}`.trim() || 'Unknown';
    }
    _calculateAge(birthDateString) { /* ... (same as v2.1.0) ... */
        if (!birthDateString) return null; try { const bd = new Date(birthDateString); const ageMs = Date.now() - bd.getTime(); return Math.abs(new Date(ageMs).getUTCFullYear() - 1970); } catch(e){return null;}
    }

    // --- Connection Management ---
    async connect(emrType, connectionParams) { /* ... (from v2.1.0, adapted for new structure) ... */
        if (this.connectionState.authAttempts[`${emrType}_${connectionParams.endpoint}`] >= this.config.maxAuthAttempts) {
            this._handleError(new Error('Too many failed connection attempts. Please try again later.'), 'Connect-Lockout', true);
            return false;
        }
        this.dependencies.LoadingManager.show(`Connecting to ${this.config.emrSettings[emrType]?.name || emrType}...`);
        try {
            const emrConfig = this.config.emrSettings[emrType];
            if (!emrConfig) throw new Error(`Unsupported EMR type: ${emrType}`);

            const details = { ...connectionParams, type: emrType, endpoint: connectionParams.endpoint || emrConfig.defaultEndpoint };
            if (!this.dependencies.HelperFunctions.validateUrl(details.endpoint)) throw new Error('Invalid EMR endpoint URL.');

            let connectionResult = { success: false, message: 'Connection method not implemented.' };
            // Call specific connection logic
            if (emrType === 'juno' && typeof this._connectToJuno === 'function') connectionResult = await this._connectToJuno(details);
            else if (emrType === 'fhir' && typeof this._connectToFHIR === 'function') connectionResult = await this._connectToFHIR(details);
            else if (emrType === 'oscar' && typeof this._connectToOscar === 'function') connectionResult = await this._connectToOscar(details);
            else if (emrType === 'generic' && typeof this._connectToGeneric === 'function') connectionResult = await this._connectToGeneric(details);


            if (connectionResult.success) {
                this.connectionState.connected = true;
                this.connectionState.emrType = emrType;
                this.connectionState.connectionDetails = details; // Store sanitized details
                this.connectionState.lastActivity = Date.now();
                this._saveConnection(); // Persist connection state (non-sensitive parts)
                this.dependencies.EventBus.publish('emr:connectionStatus', { status: 'connected', type: emrType, details: this._getPublicConnectionDetails() });
                this._log('info', `Successfully connected to ${emrConfig.name}.`);
                this.dependencies.EventBus.publish('ui:showToast', { message: `Connected to ${emrConfig.name}.`, type: 'success' });
                return true;
            } else {
                this._incrementAuthAttempts(`${emrType}_${details.endpoint}`);
                throw new Error(connectionResult.message || 'Connection failed.');
            }
        } catch (error) {
            this._handleError(error, `Connect-${emrType}`, true);
            this.disconnect(false); // Ensure clean state on failure
            return false;
        } finally {
            this.dependencies.LoadingManager.hide();
        }
    }

    // Placeholder for EMR-specific connect methods (to be detailed or use generic FHIR logic)
    async _connectToJuno(details) { return this._connectToFHIR(details); } // Juno often uses FHIR
    async _connectToOscar(details) { this._log('warn', 'OSCAR direct API connect not fully implemented, assuming FHIR or embedded.'); return this._connectToFHIR(details); }
    async _connectToGeneric(details) { return this._connectToFHIR(details); } // Assume generic is FHIR-like

    async _connectToFHIR(details) { // Generic FHIR connection test
        const S = this.dependencies.InputSanitizer;
        const endpoint = S.sanitizeURL(details.endpoint);
        if (!endpoint) throw new Error('Invalid FHIR endpoint URL.');
        // Test by fetching metadata
        const response = await this._sendRequestToEMR(endpoint, 'metadata', { method: 'GET' }, details.authType, details.authToken, details.username, details.password); // Pass auth details
        if (response && response.resourceType === 'CapabilityStatement') return { success: true, message: 'FHIR connection successful.' };
        return { success: false, message: 'Failed to retrieve FHIR CapabilityStatement.' };
    }


    disconnect(notifyUI = true) { /* ... (from v2.1.0) ... */
        if (!this.connectionState.connected) return;
        this._log('info', `Disconnecting from ${this.connectionState.emrType}.`);
        // Call specific EMR disconnect logic if any (e.g., OAuth token revocation)
        this.connectionState.connected = false;
        this.connectionState.emrType = null;
        this.connectionState.connectionDetails = null;
        this._tempCredentials = null;
        this._removeSavedConnection();
        if (this.connectionState.keepAliveTimer) clearInterval(this.connectionState.keepAliveTimer);
        if (notifyUI) {
            this.dependencies.EventBus.publish('emr:connectionStatus', { status: 'disconnected' });
            this.dependencies.EventBus.publish('ui:showToast', { message: 'Disconnected from EMR.', type: 'info' });
        }
    }

    isConnected() { return this.connectionState.connected; }
    getActiveEMRType() { return this.connectionState.emrType; }
    getPublicConnectionDetails() {
        if (!this.connectionState.connected || !this.connectionState.connectionDetails) return null;
        const { authToken, password, clientSecret, ...publicDetails } = this.connectionState.connectionDetails;
        return publicDetails; // Return details without sensitive parts
    }


    // --- Data Fetching & Saving ---
    async fetchPatientData(patientId) {
        if (!this.isConnected()) throw new Error('Not connected to EMR.');
        if (!patientId) throw new Error('Patient ID is required for fetching data.');

        const S = this.dependencies.InputSanitizer;
        const sanitizedPatientId = S.escapeHTML(String(patientId)); // Basic sanitization
        this.dependencies.LoadingManager.show('Fetching Patient Data from EMR...');
        this.dependencies.EventBus.publish('emr:fetchDataStart', { patientId: sanitizedPatientId, emrType: this.connectionState.emrType });
        this.connectionState.lastActivity = Date.now();

        try {
            let rawEmrData;
            // Call EMR-specific fetch logic
            if (this.connectionState.emrType === 'juno' && typeof this._fetchFromJuno === 'function') rawEmrData = await this._fetchFromJuno(sanitizedPatientId);
            else if (this.connectionState.emrType === 'fhir') rawEmrData = await this._fetchFromFHIRServer(sanitizedPatientId); // Generic FHIR fetch
            else if (this.connectionState.emrType === 'oscar' && typeof this._fetchFromOscar === 'function') rawEmrData = await this._fetchFromOscar(sanitizedPatientId);
            else if (this.connectionState.emrType === 'generic' && typeof this._fetchFromGeneric === 'function') rawEmrData = await this._fetchFromGeneric(sanitizedPatientId);
            else throw new Error(`Fetch not implemented for EMR type: ${this.connectionState.emrType}`);

            if (!rawEmrData) throw new Error('No data returned from EMR.');

            const mappingProfileName = this.config.emrSettings[this.connectionState.emrType]?.mappingProfile || 'generic-fhir';
            const internalData = this.dependencies.FieldMapperService.mapToInternal(rawEmrData, mappingProfileName);

            if (!internalData) throw new Error('Failed to map EMR data to internal format.');

            this._log('info', `Successfully fetched and mapped data for patient ${sanitizedPatientId} from ${this.connectionState.emrType}.`);
            this.dependencies.EventBus.publish('emr:patientDataProcessed', {
                patientData: internalData, // This is the complete internal model
                source: this.connectionState.emrType,
                patientId: sanitizedPatientId
            });
            this.dependencies.EventBus.publish('ui:showToast', { message: 'Patient data loaded from EMR.', type: 'success' });
            return { success: true, patientData: internalData };

        } catch (error) {
            this._handleError(error, `FetchPatientData-${this.connectionState.emrType}`, true, { patientId: sanitizedPatientId });
            this.dependencies.EventBus.publish('emr:fetchDataFailed', { patientId: sanitizedPatientId, error: error.message });
            return { success: false, error: error.message };
        } finally {
            this.dependencies.LoadingManager.hide();
        }
    }

    // Placeholder for EMR-specific fetch methods
    async _fetchFromJuno(patientId) { /* ... Juno specific API calls ... */ return this._fetchFromFHIRServer(patientId); } // Assuming Juno is FHIR compliant here
    async _fetchFromOscar(patientId) { /* ... OSCAR specific API calls ... */ throw new Error('OSCAR fetch not implemented.'); }
    async _fetchFromGeneric(patientId) { /* ... Generic API calls ... */ return this._fetchFromFHIRServer(patientId); }

    async _fetchFromFHIRServer(patientId) {
        // Fetch Patient resource
        const patientResource = await this._sendRequestToEMR(this.connectionState.connectionDetails.endpoint, `Patient/${patientId}`, { method: 'GET' });
        if (!patientResource || patientResource.resourceType !== 'Patient') throw new Error('Invalid Patient resource received from FHIR server.');

        // Fetch relevant Observations (customize query as needed)
        const observationCategories = 'laboratory,vital-signs';
        const observationCodes = (this._getDefaultFHIRMappings().toInternal.observations || [])
            .map(m => m.fhirCode).filter(Boolean).join(',');

        const observationsBundle = await this._sendRequestToEMR(this.connectionState.connectionDetails.endpoint,
            `Observation?subject=Patient/${patientId}${observationCodes ? `&code=${observationCodes}` : `&category=${observationCategories}`}&_sort=-date&_count=100`
        );
        // Fetch Conditions
        const conditionsBundle = await this._sendRequestToEMR(this.connectionState.connectionDetails.endpoint,
            `Condition?subject=Patient/${patientId}&clinical-status=active,recurrence,remission&_count=50`
        );
        // Fetch MedicationStatements/Requests (more complex, requires careful querying)
        // const medicationsBundle = await this._sendRequestToEMR(`MedicationStatement?subject=Patient/${patientId}&status=active`);

        // Return a structure that FieldMapperService expects, e.g., a "pseudo-bundle" or individual resources
        return {
            patient: patientResource,
            observations: observationsBundle?.entry?.map(e => e.resource) || [],
            conditions: conditionsBundle?.entry?.map(e => e.resource) || [],
            // medications: medicationsBundle?.entry?.map(e => e.resource) || [],
        };
    }


    async saveAssessmentData(patientId, assessmentData) {
        if (!this.isConnected()) throw new Error('Not connected to EMR.');
        if (!patientId || !assessmentData) throw new Error('Patient ID and assessment data are required.');

        const S = this.dependencies.InputSanitizer;
        const sanitizedPatientId = S.escapeHTML(String(patientId));
        this.dependencies.LoadingManager.show('Saving Assessment to EMR...');
        this.dependencies.EventBus.publish('emr:saveDataStart', { patientId: sanitizedPatientId, emrType: this.connectionState.emrType });
        this.connectionState.lastActivity = Date.now();

        try {
            const mappingProfileName = this.config.emrSettings[this.connectionState.emrType]?.mappingProfile || 'generic-fhir';
            // `assessmentData` should be the toolkit's internal canonical model of the results/inputs.
            const emrPayload = this.dependencies.FieldMapperService.mapToExternal(assessmentData, mappingProfileName, { patientId: sanitizedPatientId });

            if (!emrPayload) throw new Error('Failed to map assessment data to EMR format.');

            let saveResult;
            // Call EMR-specific save logic
            if (this.connectionState.emrType === 'juno' && typeof this._saveToJuno === 'function') saveResult = await this._saveToJuno(sanitizedPatientId, emrPayload);
            else if (this.connectionState.emrType === 'fhir') saveResult = await this._saveToFHIRServer(sanitizedPatientId, emrPayload); // Generic FHIR save
            else if (this.connectionState.emrType === 'oscar' && typeof this._saveToOscar === 'function') saveResult = await this._saveToOscar(sanitizedPatientId, emrPayload);
            else if (this.connectionState.emrType === 'generic' && typeof this._saveToGeneric === 'function') saveResult = await this._saveToGeneric(sanitizedPatientId, emrPayload);
            else throw new Error(`Save not implemented for EMR type: ${this.connectionState.emrType}`);

            if (!saveResult || !saveResult.success) throw new Error(saveResult?.message || 'Failed to save data to EMR.');

            this._log('info', `Successfully saved assessment for patient ${sanitizedPatientId} to ${this.connectionState.emrType}.`);
            this.dependencies.EventBus.publish('emr:saveDataSuccess', { patientId: sanitizedPatientId, response: saveResult.response });
            this.dependencies.EventBus.publish('ui:showToast', { message: 'Assessment saved to EMR.', type: 'success' });
            return { success: true, response: saveResult.response };

        } catch (error) {
            this._handleError(error, `SaveAssessment-${this.connectionState.emrType}`, true, { patientId: sanitizedPatientId });
            this.dependencies.EventBus.publish('emr:saveDataFailed', { patientId: sanitizedPatientId, error: error.message });
            return { success: false, error: error.message };
        } finally {
            this.dependencies.LoadingManager.hide();
        }
    }

    // Placeholder for EMR-specific save methods
    async _saveToJuno(patientId, junoPayload) { /* ... Juno specific API calls ... */ return this._saveToFHIRServer(patientId, junoPayload); }
    async _saveToOscar(patientId, oscarPayload) { /* ... OSCAR specific API calls ... */ throw new Error('OSCAR save not implemented.'); }
    async _saveToGeneric(patientId, genericPayload) { /* ... Generic API calls ... */ return this._saveToFHIRServer(patientId, genericPayload); }

    async _saveToFHIRServer(patientId, fhirPayloadBundle) {
        // fhirPayloadBundle is expected to be a FHIR transaction Bundle from FieldMapperService
        if (fhirPayloadBundle.resourceType !== 'Bundle' || fhirPayloadBundle.type !== 'transaction') {
            throw new Error('Invalid FHIR Bundle format for saving.');
        }
        // Ensure patient references in the bundle are correct or add if missing
        fhirPayloadBundle.entry.forEach(entry => {
            if (entry.resource && !entry.resource.subject && !entry.resource.patient && entry.resource.resourceType !== 'Patient') {
                entry.resource.subject = { reference: `Patient/${patientId}` };
            }
            if (entry.resource && entry.resource.resourceType === 'Patient' && !entry.resource.id) {
                entry.resource.id = patientId; // Ensure patient resource has ID if it's an update
            }
            if(entry.request && entry.request.url && entry.request.url.includes('{patientId}')){
                entry.request.url = entry.request.url.replace('{patientId}', patientId);
            }
        });

        const responseBundle = await this._sendRequestToEMR(this.connectionState.connectionDetails.endpoint, '', { method: 'POST', body: fhirPayloadBundle }); // POST to base for transaction
        // Check responseBundle for errors from the transaction
        let allSuccessful = true;
        responseBundle?.entry?.forEach(entry => {
            if (entry.response?.status && !entry.response.status.startsWith('20')) { // e.g. "200 OK", "201 Created"
                allSuccessful = false;
                this._log('warn', `FHIR transaction entry failed: ${entry.response.status}`, {details: entry.response.outcome});
            }
        });
        if (!allSuccessful) throw new Error('One or more operations in FHIR transaction failed. Check EMR logs.');
        return { success: true, response: responseBundle };
    }


    async _sendRequestToEMR(baseUrl, path, options = {}, authTypeOverride, authTokenOverride, usernameOverride, passwordOverride) {
        const S = this.dependencies.InputSanitizer;
        const R = this.dependencies.RuntimeProtection;

        const effectiveAuthType = authTypeOverride || this.connectionState.connectionDetails?.authType || 'none';
        let effectiveAuthToken = authTokenOverride || this._tempCredentials?.token || this.connectionState.connectionDetails?.authToken;
        const effectiveUsername = usernameOverride || this._tempCredentials?.username || this.connectionState.connectionDetails?.username;
        const effectivePassword = passwordOverride || this._tempCredentials?.password; // Only from temp for security

        // Re-fetch OAuth token if it's OAuth and token is missing/expired (conceptual)
        if (effectiveAuthType === 'oauth' && !effectiveAuthToken /* && isTokenExpired() */) {
            // effectiveAuthToken = await this._refreshOAuthToken(); // Implement OAuth refresh logic
            // if (effectiveAuthToken) this.connectionState.connectionDetails.authToken = effectiveAuthToken; // Update stored token
            // else throw new AuthenticationError('OAuth token refresh failed.');
            this._log('warn', 'OAuth token refresh logic not fully implemented in this example.');
        }


        const sanitizedPath = path.replace(/[^a-zA-Z0-9\/\-\?=\&\._%]/g, '');
        let fullUrl;
        try {
            fullUrl = new URL(sanitizedPath, baseUrl).toString();
            if (!S.sanitizeURL(fullUrl)) throw new Error('Generated EMR URL is invalid after sanitization.');
        } catch (e) { throw new Error(`Invalid EMR path or base URL: ${e.message}`); }

        const fetchOptions = {
            method: options.method || 'GET',
            headers: { 'Accept': 'application/fhir+json', ...(options.headers || {}) },
            signal: AbortSignal.timeout(this.config.apiTimeout)
        };

        if (effectiveAuthType === 'bearer_token' && effectiveAuthToken) fetchOptions.headers['Authorization'] = `Bearer ${effectiveAuthToken}`;
        else if (effectiveAuthType === 'basic' && effectiveUsername && effectivePassword) fetchOptions.headers['Authorization'] = `Basic ${btoa(`${effectiveUsername}:${effectivePassword}`)}`;
        else if (effectiveAuthType === 'token' && effectiveAuthToken) fetchOptions.headers['Authorization'] = `Token ${effectiveAuthToken}`; // Generic token
        else if (effectiveAuthType === 'oauth' && effectiveAuthToken) fetchOptions.headers['Authorization'] = `Bearer ${effectiveAuthToken}`;


        if (options.body) {
            fetchOptions.headers['Content-Type'] = 'application/fhir+json'; // Assuming FHIR JSON
            fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }

        this._log('debug', `Sending EMR request: ${fetchOptions.method} ${fullUrl}`);
        try {
            const response = await R.retry(() => fetch(fullUrl, fetchOptions), { retries: 1, delay: 500 }); // Minimal retry for EMR
            if (!response.ok) {
                let errorBody = null; try { errorBody = await response.json(); } catch (e) { try { errorBody = await response.text(); } catch (e2) {} }
                const error = new Error(`EMR API Error: ${response.status} ${response.statusText}`);
                error.status = response.status; error.responseBody = errorBody;
                if (response.status === 401 || response.status === 403) {
                    this._incrementAuthAttempts(`${this.connectionState.emrType}_${baseUrl}`);
                    throw new AuthenticationError(errorBody?.issue?.[0]?.diagnostics || `Authentication failed (${response.status})`);
                }
                throw error;
            }
            this._resetAuthAttempts(`${this.connectionState.emrType}_${baseUrl}`);
            return response.status === 204 ? null : await response.json();
        } catch (error) {
            // this._handleError(error, `Request-${options.method}-${path}`, true, {url:fullUrl}); // Already handled by caller
            throw error;
        }
    }

    // --- Auth Attempt Management ---
    _incrementAuthAttempts(key) {
        this.connectionState.authAttempts[key] = (this.connectionState.authAttempts[key] || 0) + 1;
        if (this.connectionState.authAttempts[key] >= this.config.maxAuthAttempts) {
            this._log('warn', `Connection to ${key} locked due to too many failed auth attempts.`);
            // Optionally publish an event or show a persistent UI warning
            this.dependencies.EventBus.publish('emr:authLockout', { key });
        }
    }
    _resetAuthAttempts(key) {
        if (this.connectionState.authAttempts[key]) delete this.connectionState.authAttempts[key];
    }


    // --- Connection Persistence & Keep-Alive ---
    _saveConnection() { /* ... (from v2.1.0, save non-sensitive details) ... */
        if (!this.connectionState.connected || !this.connectionState.connectionDetails) return;
        const detailsToSave = this._getPublicConnectionDetails();
        if(detailsToSave) {
            this.dependencies.SecureTokenStorage.setItem('emrConnectionConfig', JSON.stringify(detailsToSave));
            this._log('info', 'EMR connection details saved (non-sensitive).');
        }
    }
    _loadSavedConnection() { /* ... (from v2.1.0, re-establish if details found and testConnection succeeds) ... */
        const savedConfigStr = this.dependencies.SecureTokenStorage.getItem('emrConnectionConfig');
        if (savedConfigStr) {
            try {
                const savedConfig = JSON.parse(savedConfigStr);
                if (savedConfig.type && savedConfig.endpoint) {
                    this._log('info', 'Found saved EMR connection config. Attempting to reconnect...', savedConfig);
                    // Prompt for credentials if needed, or use stored tokens if available/secure
                    // For simplicity, we'll assume if config is there, we can try to connect.
                    // User might need to re-enter password/token via UI if it was session-only.
                    this.connect(savedConfig.type, savedConfig).catch(err => {
                        this._log('warn', 'Failed to auto-reconnect to saved EMR.', err);
                        this._removeSavedConnection(); // Clear invalid saved config
                    });
                }
            } catch (e) { this._log('error', 'Error parsing saved EMR connection config.', e); this._removeSavedConnection(); }
        }
    }
    _removeSavedConnection() { this.dependencies.SecureTokenStorage.removeItem('emrConnectionConfig'); }

    _setupKeepAlive() { /* ... (from v2.1.0, pings based on lastActivity) ... */
        if (this.connectionState.keepAliveTimer) clearInterval(this.connectionState.keepAliveTimer);
        this.connectionState.keepAliveTimer = setInterval(async () => {
            if (this.isConnected() && (Date.now() - this.connectionState.lastActivity > this.config.keepAliveIntervalMs * 0.8)) {
                this._log('debug', `EMR Keep-alive: Pinging ${this.connectionState.emrType}...`);
                try {
                    // A lightweight "ping" - e.g., re-fetch metadata or a specific EMR ping endpoint
                    await this._sendRequestToEMR(this.connectionState.connectionDetails.endpoint, 'metadata', { method: 'GET' });
                    this.connectionState.lastActivity = Date.now();
                } catch (error) {
                    this._log('warn', `EMR Keep-alive ping failed for ${this.connectionState.emrType}. Attempting to reconnect or marking as disconnected.`, error);
                    this.disconnect(true); // Or attempt a reconnect sequence
                    this.dependencies.EventBus.publish('ui:showToast', { message: 'EMR connection lost. Please reconnect.', type: 'error' });
                }
            }
        }, this.config.keepAliveIntervalMs);
    }
}

// Instantiate and export the singleton service (typically in main.js)
// const EMRConnectorServiceInstance = new EMRConnectorService({ dependencies: { ... } });
// window.EMRConnectorService = EMRConnectorServiceInstance;
// export default EMRConnectorServiceInstance;
