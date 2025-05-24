/**
 * EMR Connector Service Module (Enhanced FHIR Mapping)
 * @file /js/data-management/emr-connector.js
 * @description Provides integration with Electronic Medical Record (EMR) systems
 * via FHIR API. Features enhanced data mapping capabilities inspired by
 * detailed integration examples (e.g., Juno EMR).
 * @version 1.1.0
 * @exports EMRConnectorService
 */

'use strict';

class EMRConnectorService {
    /**
     * Creates or returns the singleton instance of EMRConnectorService.
     * @param {object} [options={}] - Configuration options.
     * @param {string} [options.defaultEmrType='generic-fhir'] - Default EMR type.
     * @param {object} [options.fieldMappingProfiles={}] - Custom mapping profiles for different EMRs/FHIR versions.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (EMRConnectorService.instance) {
            return EMRConnectorService.instance;
        }

        this.options = {
            defaultEmrType: 'generic-fhir',
            apiTimeout: 20000, // 20 seconds
            fieldMappingProfiles: { // Default internal mapping profile
                'generic-fhir': this._getDefaultFHIRMappings()
            },
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || { handleError: console.error, log: console.log },
            EventBus: window.EventBus || { publish: () => {} },
            LoadingManager: window.LoadingManagerInstance || { show: () => {}, hide: () => {} },
            InputSanitizer: window.InputSanitizerService,
            // FieldMapperService: window.FieldMapperService, // Optional dedicated mapping service
            ...options.dependencies,
        };

        this.connectionConfig = {
            connected: false,
            emrType: null,
            endpoint: null,
            authType: 'none',
            authToken: null,
        };
        this.activeMappingProfile = null;

        if (!this.dependencies.InputSanitizer) {
            this._log('warn', 'InputSanitizerService not available. EMR interactions may be less secure.');
        }

        EMRConnectorService.instance = this;
        this._log('info', 'EMRConnectorService Initialized (v1.1.0).');
    }

    _log(level, message, data) {
        this.dependencies.ErrorLogger.log?.(level, `EMRConnector: ${message}`, data);
    }

    _handleError(error, context, isUserFacing = true, additionalData = {}) {
        const errorMessage = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(errorMessage, `EMRConnector-${context}`, 'error', { originalError: error, ...additionalData });
        if (isUserFacing) {
            this.dependencies.EventBus.publish('ui:showToast', { message: `EMR Error (${context}): ${errorMessage}`, type: 'error' });
        }
    }

    /**
     * Default FHIR Mappings - inspired by Juno integration data points.
     * This defines how FHIR resources/elements map to the toolkit's internal data model.
     * @private
     */
    _getDefaultFHIRMappings() {
        return {
            // --- From FHIR to Internal Toolkit Data ---
            toInternal: {
                patient: { // From FHIR Patient resource
                    id: 'id',
                    name: (fhirPatient) => this._getPatientNameFromFHIR(fhirPatient),
                    gender: 'gender', // male, female, other, unknown
                    birthDate: 'birthDate',
                    age: (fhirPatient) => fhirPatient.birthDate ? this._calculateAge(fhirPatient.birthDate) : null,
                    // Example: map ethnicity from extension or specific coding systems
                    ethnicity: (fhirPatient) => {
                        // Placeholder: Implement logic to extract ethnicity based on common FHIR extensions or value sets
                        // This is highly EMR/profile specific.
                        // E.g., find extension for 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity'
                        // const ethnicityExt = fhirPatient.extension?.find(e => e.url.includes('ethnicity'));
                        // return ethnicityExt?.valueCodeableConcept?.coding?.[0]?.code; // Or display
                        return fhirPatient.extension?.find(e => e.url.includes('ethnicity'))?.valueCoding?.code || 'unknown';
                    },
                    height: null, // To be populated from Observations
                    weight: null, // To be populated from Observations
                    bmi: null,    // To be populated from Observations or calculated
                },
                observations: [ // From FHIR Observation resources
                    // Map LOINC codes to internal keys
                    { fhirCode: '8302-2', internalKey: 'height', unitSystem: 'http://unitsofmeasure.org', unitCode: 'cm' }, // Height
                    { fhirCode: '29463-7', internalKey: 'weight', unitSystem: 'http://unitsofmeasure.org', unitCode: 'kg' }, // Weight
                    { fhirCode: '39156-5', internalKey: 'bmi', unitSystem: 'http://unitsofmeasure.org', unitCode: 'kg/m2' }, // BMI
                    { fhirCode: '8480-6', internalKey: 'sbp', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mm[Hg]' }, // SBP
                    { fhirCode: '8462-4', internalKey: 'dbp', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mm[Hg]' }, // DBP
                    { fhirCode: '2093-3', internalKey: 'totalCholesterol', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mmol/L' }, // TC
                    { fhirCode: '2085-9', internalKey: 'hdl', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mmol/L' }, // HDL
                    { fhirCode: '13457-7', internalKey: 'ldlCalculated', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mmol/L' }, // LDL (Calculated)
                    { fhirCode: '2089-1', internalKey: 'ldlDirect', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mmol/L' }, // LDL (Direct/Measured)
                    { fhirCode: '2571-8', internalKey: 'triglycerides', unitSystem: 'http://unitsofmeasure.org', unitCode: 'mmol/L' }, // Trig
                    { fhirCode: '32300-3', internalKey: 'lpa', unitSystem: 'http://unitsofmeasure.org', unitCode: 'nmol/L' }, // Lp(a) mass or molar
                    // Add more observation mappings (e.g., glucose, HbA1c)
                ],
                conditions: [ // From FHIR Condition resources - map FHIR condition codes/text to internal boolean flags or structured data
                    // Example: { fhirCodeSystem: 'http://snomed.info/sct', fhirCode: 'CODE', internalKey: 'hasDiabetes', value: true }
                    { internalKey: 'hasDiabetes', fhirConcepts: [{system: 'http://snomed.info/sct', code: '73211009'}, {display: /diabetes mellitus/i}] },
                    { internalKey: 'onBPMeds', fhirConcepts: [{display: /hypertension/i}] }, // This is tricky, better from MedicationStatement
                    { internalKey: 'isSmoker', fhirConcepts: [{display: /smoker/i}, {system: 'http://snomed.info/sct', code: '77176002'}] }, // Current smoker
                    { internalKey: 'familyHistoryCVD', fhirConcepts: [{display: /family history of cardiovascular disease/i}] },
                    { internalKey: 'atrialFibrillation', fhirConcepts: [{display: /atrial fibrillation/i}] },
                    { internalKey: 'chronicKidneyDisease', fhirConcepts: [{display: /chronic kidney disease/i}] },
                    // ... more condition mappings based on QRISK3/FRS factors
                ],
                medications: [ // From FHIR MedicationStatement or MedicationRequest
                    // Example: { internalKey: 'onStatin', fhirRxNormCodes: ['RXNORM_CODE_FOR_STATINS'] }
                    // This requires a good knowledge of medication coding systems (RxNorm, ATC)
                    { internalKey: 'onBPMeds', fhirClassKeywords: ['antihypertensive', 'beta blocker', 'ace inhibitor', 'arb', 'calcium channel blocker', 'diuretic'] },
                    { internalKey: 'onStatin', fhirClassKeywords: ['statin', 'hmg-coa reductase inhibitor'] },
                    { internalKey: 'onAspirin', fhirClassKeywords: ['aspirin'] },
                ]
            },
            // --- From Internal Toolkit Data to FHIR ---
            toFHIR: {
                patient: (internalPatient, existingFhirPatientId) => { /* ... maps internalPatient to FHIR Patient resource ... */ return { resourceType: 'Patient', id: existingFhirPatientId, /* ... */ }; },
                observations: (internalObservations, patientReference) => { /* ... maps internalObservations to array of FHIR Observation resources ... */ return []; },
                conditions: (internalConditions, patientReference) => { /* ... maps internalConditions to array of FHIR Condition resources ... */ return []; },
                riskAssessment: (internalResults, patientReference, calculatorType) => { /* ... maps internalResults to FHIR RiskAssessment resource ... */ return { resourceType: 'RiskAssessment', /* ... */ }; },
                // ... more mappings
            }
        };
    }

    /**
     * Initializes and configures the EMR connection.
     * @param {object} configOptions - Connection options.
     * @param {string} configOptions.emrType - Type of EMR system (key for fieldMappingProfiles).
     * @param {string} configOptions.endpoint - FHIR API base URL.
     * @param {string} [configOptions.authType='none'] - Authentication type.
     * @param {string} [configOptions.authToken] - Token for bearer/basic auth.
     * @returns {Promise<boolean>} True if initialization and test connection are successful.
     */
    async initializeConnection(configOptions) {
        this.dependencies.LoadingManager.show('Initializing EMR Connection...');
        try {
            if (!configOptions.endpoint) throw new Error('EMR endpoint URL is required.');
            if (!this.dependencies.InputSanitizer.sanitizeURL(configOptions.endpoint)) {
                throw new Error('Invalid EMR endpoint URL provided.');
            }

            const emrType = configOptions.emrType || this.options.defaultEmrType;
            this.activeMappingProfile = this.options.fieldMappingProfiles[emrType] || this.options.fieldMappingProfiles['generic-fhir'];
            if (!this.activeMappingProfile) {
                throw new Error(`No field mapping profile found for EMR type: ${emrType}. Cannot initialize.`);
            }

            this.connectionConfig = {
                emrType: emrType,
                endpoint: configOptions.endpoint,
                authType: configOptions.authType || 'none',
                authToken: configOptions.authToken || null,
                connected: false,
            };
            this._log('info', `Attempting EMR connection to ${this.connectionConfig.endpoint} (Type: ${this.connectionConfig.emrType})`);

            const isConnected = await this.testConnection();
            this.connectionConfig.connected = isConnected;

            if (isConnected) {
                this._log('info', 'EMR Connection Initialized and Tested Successfully.');
                this.dependencies.EventBus.publish('emr:connectionStatus', { status: 'connected', config: this.connectionConfig });
                this.dependencies.EventBus.publish('ui:showToast', { message: 'Successfully connected to EMR.', type: 'success' });
            } else {
                throw new Error('Failed to establish or verify EMR connection.');
            }
            return isConnected;
        } catch (error) {
            this._handleError(error, 'InitializeConnection');
            this.connectionConfig.connected = false;
            this.dependencies.EventBus.publish('emr:connectionStatus', { status: 'failed', error: error.message });
            return false;
        } finally {
            this.dependencies.LoadingManager.hide();
        }
    }

    async testConnection() { /* ... (same as v1.0.0) ... */
        if (!this.connectionConfig.endpoint) { this._log('warn', 'Cannot test EMR: Endpoint not configured.'); return false; }
        this.dependencies.LoadingManager.show('Testing EMR Connection...');
        try {
            const metadata = await this._sendRequest('metadata', { method: 'GET' });
            const isValid = metadata && metadata.resourceType === 'CapabilityStatement';
            if (isValid) this._log('info', 'EMR connection test successful.');
            else this._log('warn', 'EMR connection test failed: Invalid metadata.', metadata);
            return isValid;
        } catch (error) { this._handleError(error, 'TestConnection', false); return false; }
        finally { this.dependencies.LoadingManager.hide(); }
    }

    isConnected() { return this.connectionConfig.connected; }
    getEMRType() { return this.connectionConfig.emrType; }

    async _sendRequest(path, options = {}) { /* ... (same as v1.0.0, ensure InputSanitizer.sanitizeURL is used on final URL) ... */
        if (!this.isConnected() && path !== 'metadata') throw new Error('EMR not connected.');
        const S = this.dependencies.InputSanitizer;
        const sanitizedPath = path.replace(/[^a-zA-Z0-9\/\-\?=\&\._%]/g, ''); // Basic path part sanitization
        let fullUrl;
        try {
            fullUrl = new URL(sanitizedPath, this.connectionConfig.endpoint).toString();
            if (!S.sanitizeURL(fullUrl)) throw new Error('Generated URL is invalid after sanitization.');
        } catch (e) { throw new Error(`Invalid path or endpoint: ${e.message}`); }

        const fetchOptions = { method: options.method || 'GET', headers: { 'Accept': 'application/fhir+json', ...(options.headers || {})}, signal: AbortSignal.timeout(this.options.apiTimeout) };
        if (this.connectionConfig.authType === 'bearer' && this.connectionConfig.authToken) fetchOptions.headers['Authorization'] = `Bearer ${this.connectionConfig.authToken}`;
        else if (this.connectionConfig.authType === 'basic' && this.connectionConfig.authToken) fetchOptions.headers['Authorization'] = `Basic ${this.connectionConfig.authToken}`;
        if (options.body) { fetchOptions.headers['Content-Type'] = 'application/fhir+json'; fetchOptions.body = JSON.stringify(options.body); }

        this._log('debug', `Sending EMR request: ${fetchOptions.method} ${fullUrl}`);
        try {
            const response = await fetch(fullUrl, fetchOptions);
            if (!response.ok) {
                let errorBody = null; try {errorBody = await response.json();} catch(e){}
                const error = new Error(`FHIR API Error: ${response.status} ${response.statusText}`); error.status = response.status; error.responseBody = errorBody;
                throw error;
            }
            return response.status === 204 ? null : await response.json();
        } catch (error) { this._handleError(error, `Request-${options.method}-${path}`, true, {url:fullUrl}); throw error; }
    }

    async getPatientData(patientId) {
        if (!patientId) throw new Error('Patient ID is required.');
        const S = this.dependencies.InputSanitizer;
        const sanitizedPatientId = S.escapeHTML(String(patientId));

        this.dependencies.LoadingManager.show('Fetching Patient Data from EMR...');
        this.dependencies.EventBus.publish('emr:fetchDataStart', { patientId: sanitizedPatientId });

        try {
            const patientResource = await this._sendRequest(`Patient/${sanitizedPatientId}`);
            if (!patientResource || patientResource.resourceType !== 'Patient') throw new Error('Invalid Patient resource.');

            // Construct search queries for observations and conditions based on mapping profile
            const obsMappings = this.activeMappingProfile.toInternal.observations;
            const obsCodes = obsMappings.map(m => m.fhirCode).filter(Boolean).join(',');
            // Example: Fetch common categories or specific codes
            const obsCategories = 'laboratory,vital-signs'; // Common categories

            const [observationsBundle, conditionsBundle] = await Promise.allSettled([
                this._sendRequest(`Observation?subject=Patient/${sanitizedPatientId}${obsCodes ? `&code=${obsCodes}` : `&category=${obsCategories}`}&_sort=-date&_count=100`), // Fetch more, sort by date
                this._sendRequest(`Condition?subject=Patient/${sanitizedPatientId}&clinical-status=active,recurrence,remission&_count=50`) // Broader clinical status
            ]);

            const observations = observationsBundle.status === 'fulfilled' ? (observationsBundle.value?.entry?.map(e => e.resource) || []) : [];
            const conditions = conditionsBundle.status === 'fulfilled' ? (conditionsBundle.value?.entry?.map(e => e.resource) || []) : [];
            if(observationsBundle.status === 'rejected') this._log('warn', 'Failed to fetch observations', observationsBundle.reason);
            if(conditionsBundle.status === 'rejected') this._log('warn', 'Failed to fetch conditions', conditionsBundle.reason);


            const toolkitData = this._mapFHIRToInternalDataFormat(patientResource, observations, conditions);
            const finalSanitizedData = S.sanitizeObjectOrArray(toolkitData, S.escapeHTML.bind(S));

            this.dependencies.EventBus.publish('emr:fetchDataSuccess', { patientId: sanitizedPatientId, data: finalSanitizedData });
            this._log('info', `Fetched data for patient ${sanitizedPatientId}`);
            return { success: true, patientData: finalSanitizedData, fhirResources: { patient: patientResource, observations, conditions } };
        } catch (error) { /* ... (same as v1.0.0) ... */
            this._handleError(error, `GetPatientData-${sanitizedPatientId}`);
            this.dependencies.EventBus.publish('emr:fetchDataFailed', { patientId: sanitizedPatientId, error: error.message });
            return null;
        } finally { this.dependencies.LoadingManager.hide(); }
    }

    async savePatientData(toolkitData, patientId) { /* ... (same as v1.0.0, but uses this._mapInternalDataToFHIRBundle) ... */
        if (!toolkitData || !patientId) throw new Error('Data and Patient ID required.');
        const S = this.dependencies.InputSanitizer; const sanPID = S.escapeHTML(patientId);
        this.dependencies.LoadingManager.show('Saving Data to EMR...');
        this.dependencies.EventBus.publish('emr:saveDataStart', { patientId: sanPID });
        try {
            const fhirBundle = this._mapInternalDataToFHIRBundle(toolkitData, sanPID);
            if (!fhirBundle?.entry?.length) throw new Error('No FHIR resources to save.');
            const resultBundle = await this._sendRequest('', { method: 'POST', body: fhirBundle }); // POST to base for transaction
            this._log('info', `Data saved to EMR for patient ${sanPID}.`, { response: resultBundle });
            this.dependencies.EventBus.publish('emr:saveDataSuccess', { patientId: sanPID, responseBundle: resultBundle });
            return { success: true, responseBundle: resultBundle };
        } catch (error) { /* ... (same as v1.0.0) ... */
            this._handleError(error, `SavePatientData-${sanPID}`);
            this.dependencies.EventBus.publish('emr:saveDataFailed', { patientId: sanPID, error: error.message });
            return null;
        } finally { this.dependencies.LoadingManager.hide(); }
    }

    async searchPatients(criteria) { /* ... (same as v1.0.0, ensure S.escapeHTML on criteria values) ... */
        if (!criteria || !Object.keys(criteria).length) throw new Error('Search criteria required.');
        const S = this.dependencies.InputSanitizer;
        this.dependencies.LoadingManager.show('Searching Patients...');
        this.dependencies.EventBus.publish('emr:searchPatientsStart', { criteria });
        try {
            const params = new URLSearchParams();
            if (criteria.name) params.append('name:contains', S.escapeHTML(criteria.name)); // Use :contains for broader name search
            if (criteria.identifier) params.append('identifier', S.escapeHTML(criteria.identifier));
            if (criteria.birthDate) params.append('birthdate', S.escapeHTML(criteria.birthDate));
            if (criteria.gender) params.append('gender', S.escapeHTML(criteria.gender));
            params.append('_count', '20'); // Limit results

            const bundle = await this._sendRequest(`Patient?${params.toString()}`);
            if (!bundle || bundle.resourceType !== 'Bundle') throw new Error('Invalid search results.');
            const patients = (bundle.entry || []).map(e => e.resource && e.resource.resourceType === 'Patient' ? S.sanitizeObjectOrArray({ id: e.resource.id, name: this._getPatientNameFromFHIR(e.resource), gender: e.resource.gender, birthDate: e.resource.birthDate, age: e.resource.birthDate ? this._calculateAge(e.resource.birthDate) : null }) : null).filter(Boolean);
            this._log('info', `Patient search returned ${patients.length} results.`);
            this.dependencies.EventBus.publish('emr:searchPatientsSuccess', { criteria, count: patients.length, results: patients });
            return { success: true, patients, total: bundle.total };
        } catch (error) { /* ... (same as v1.0.0) ... */
            this._handleError(error, 'SearchPatients');
            this.dependencies.EventBus.publish('emr:searchPatientsFailed', { criteria, error: error.message });
            return null;
        } finally { this.dependencies.LoadingManager.hide(); }
    }


    // --- Enhanced FHIR Mapping Helpers ---
    _mapFHIRToInternalDataFormat(patientResource, observations, conditions) {
        this._log('debug', 'Mapping FHIR resources to internal toolkit format (Enhanced)...');
        const S = this.dependencies.InputSanitizer;
        const M = this.activeMappingProfile.toInternal; // Use active mapping profile
        const toolkitData = { patient: {}, observations: {}, conditions: [], medications: {} };

        // Patient Data
        if (patientResource) {
            Object.keys(M.patient).forEach(key => {
                const pathOrFn = M.patient[key];
                if (typeof pathOrFn === 'function') {
                    toolkitData.patient[key] = pathOrFn(patientResource);
                } else if (typeof pathOrFn === 'string' && patientResource[pathOrFn] !== undefined) {
                    toolkitData.patient[key] = S.escapeHTML(String(patientResource[pathOrFn]));
                }
            });
        }

        // Observations
        (observations || []).forEach(obs => {
            if (!obs.code?.coding?.[0]?.code || !obs.valueQuantity) return;
            const fhirCode = obs.code.coding[0].code;
            const mapping = M.observations.find(m => m.fhirCode === fhirCode);
            if (mapping) {
                toolkitData.observations[mapping.internalKey] = {
                    value: parseFloat(obs.valueQuantity.value),
                    unit: S.escapeHTML(obs.valueQuantity.unit || obs.valueQuantity.code),
                    date: obs.effectiveDateTime || obs.issued
                };
            }
        });
        // Populate height/weight/bmi into patient object from observations if mapped
        if(toolkitData.observations.height) toolkitData.patient.height = toolkitData.observations.height.value;
        if(toolkitData.observations.weight) toolkitData.patient.weight = toolkitData.observations.weight.value;
        if(toolkitData.observations.bmi) toolkitData.patient.bmi = toolkitData.observations.bmi.value;


        // Conditions
        (conditions || []).forEach(cond => {
            M.conditions.forEach(mapping => {
                const match = mapping.fhirConcepts.some(concept =>
                    (concept.system && concept.code && cond.code?.coding?.some(c => c.system === concept.system && c.code === concept.code)) ||
                    (concept.display && cond.code?.text?.match(concept.display)) ||
                    (concept.display && cond.code?.coding?.some(c => c.display?.match(concept.display)))
                );
                if (match) {
                    toolkitData.patient[mapping.internalKey] = mapping.value !== undefined ? mapping.value : true;
                    toolkitData.conditions.push({ name: S.escapeHTML(cond.code?.text || cond.code?.coding?.[0]?.display), date: cond.onsetDateTime || cond.recordedDate });
                }
            });
        });

        // Medications (conceptual, would need MedicationStatement/Request resources)
        // This part is highly dependent on how medication data is fetched and structured in FHIR.
        // For now, assuming it might be derived from conditions or a separate medication fetch.
        M.medications.forEach(mapping => {
            // Example: if a condition implies a medication class
            if (toolkitData.patient.hasHypertension) toolkitData.medications[mapping.internalKey] = true; // Simplistic
        });


        this._log('debug', 'FHIR to Internal Mapping complete.', { toolkitData: JSON.stringify(toolkitData).substring(0,300) });
        return toolkitData;
    }

    _getPatientNameFromFHIR(fhirPatient) { /* ... (same as v1.0.0) ... */
        if (!fhirPatient?.name?.length) return 'Unknown';
        const nameInfo = fhirPatient.name.find(n=>n.use === 'official') || fhirPatient.name[0];
        return `${(nameInfo.given || []).join(' ')} ${nameInfo.family || ''}`.trim() || 'Unknown';
    }
    _calculateAge(birthDateString) { /* ... (same as v1.0.0) ... */
        if (!birthDateString) return null; try { const bd = new Date(birthDateString); const ageMs = Date.now() - bd.getTime(); return Math.abs(new Date(ageMs).getUTCFullYear() - 1970); } catch(e){return null;}
    }

    _mapInternalDataToFHIRBundle(toolkitData, patientId) {
        this._log('debug', 'Mapping internal data to FHIR Bundle (Enhanced)...');
        const M_Out = this.activeMappingProfile.toFHIR;
        const bundle = { resourceType: 'Bundle', type: 'transaction', entry: [] };
        const now = new Date().toISOString();
        const patientReference = `Patient/${patientId}`;

        // Patient Resource (using mapping function)
        if (toolkitData.patient && M_Out.patient) {
            const fhirPatient = M_Out.patient(toolkitData.patient, patientId);
            bundle.entry.push({ fullUrl: patientReference, resource: fhirPatient, request: { method: 'PUT', url: patientReference } });
        }

        // Observation Resources (using mapping function)
        if (toolkitData.observations && M_Out.observations) {
            const fhirObservations = M_Out.observations(toolkitData.observations, patientReference, now);
            fhirObservations.forEach(obs => bundle.entry.push({ resource: obs, request: { method: 'POST', url: 'Observation' }}));
        }

        // RiskAssessment Resource (using mapping function)
        // Determine which result to use or if combined
        let primaryResult = null;
        let calcType = 'Unknown';
        if (toolkitData.results?.combined && (toolkitData.results.combined.frsData || toolkitData.results.combined.qriskData)) {
            primaryResult = toolkitData.results.combined.frsData?.score ? toolkitData.results.combined.frsData : toolkitData.results.combined.qriskData;
            calcType = toolkitData.results.combined.frsData?.score ? 'FRS (Combined)' : 'QRISK3 (Combined)';
            if (toolkitData.results.combined.frsData && toolkitData.results.combined.qriskData) calcType = 'FRS & QRISK3 Combined';
        } else if (toolkitData.results?.frs) {
            primaryResult = toolkitData.results.frs;
            calcType = 'FRS';
        } else if (toolkitData.results?.qrisk3) {
            primaryResult = toolkitData.results.qrisk3;
            calcType = 'QRISK3';
        }

        if (primaryResult && M_Out.riskAssessment) {
            const fhirRiskAssessment = M_Out.riskAssessment(primaryResult, patientReference, calcType, now);
            bundle.entry.push({ resource: fhirRiskAssessment, request: { method: 'POST', url: 'RiskAssessment' }});
        }
        // Add Conditions, MedicationStatements etc. using their mapping functions
        return bundle;
    }
}

// Instantiate and export the singleton service
// const EMRConnectorServiceInstance = new EMRConnectorService({
//     dependencies: { /* ... pass actual instances from main.js ... */ }
// });
// window.EMRConnectorService = EMRConnectorServiceInstance;
// export default EMRConnectorServiceInstance;
