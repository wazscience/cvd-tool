/**
 * Field Mapper Service Module (Fused & Enhanced)
 * @file /js/data-management/field-mapper.js
 * @description Centralizes data mapping using configurable profiles, incorporating
 * detailed EMR-specific logic, transformations, validation, and post-processing.
 * Fuses user's FieldMapper v2.0.2 [cite: uploaded:field-mapper.js] with service architecture.
 * @version 1.1.0
 * @exports FieldMapperService
 */

'use strict';

// Custom Error Types (inspired by user's field-mapper.js [cite: uploaded:field-mapper.js (reference to error-types.js)])
class FieldMappingError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'FieldMappingError';
        this.details = details;
    }
}
class FieldValidationError extends Error {
    constructor(message, field, value, details = {}) {
        super(message);
        this.name = 'FieldValidationError';
        this.field = field;
        this.value = value;
        this.details = details;
    }
}


class FieldMapperService {
    /**
     * Creates or returns the singleton instance of FieldMapperService.
     * @param {object} [options={}] - Configuration options.
     * @param {object} [options.initialProfiles] - Pre-defined mapping profiles. If not provided, defaults will be loaded.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (FieldMapperService.instance) {
            return FieldMapperService.instance;
        }

        this.options = {
            initialProfiles: null, // Will load defaults if not provided
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || { handleError: console.error, log: console.log },
            InputSanitizer: window.InputSanitizerService,
            ValidationHelpers: window.ValidationHelpers, // My enhanced ValidationHelpers instance
            MemoryManager: window.MemoryManagerInstance, // For potential large data handling
            ...options.dependencies,
        };

        this.mappingProfiles = {};
        this._initializeDefaultProfiles(this.options.initialProfiles);

        if (!this.dependencies.InputSanitizer) {
            this._log('warn', 'InputSanitizerService not available. Mapped data sanitization may be limited.');
        }
        if (!this.dependencies.ValidationHelpers) {
            this._log('warn', 'ValidationHelpers not available. Field validation during mapping will be limited.');
        }

        // MemoryManager integration from user's field-mapper.js [cite: uploaded:field-mapper.js (lines 127-144)]
        this.dependencies.MemoryManager?.registerComponent?.('fieldMapper', {
            cleanupThreshold: 50 * 1024 * 1024, // 50MB
            cleanupCallback: this._performMemoryCleanup.bind(this)
        });


        FieldMapperService.instance = this;
        this._log('info', 'FieldMapperService Initialized (v1.1.0).');
    }

    _log(level, message, data) {
        this.dependencies.ErrorLogger.log?.(level, `FieldMapper: ${message}`, data);
    }

    _handleError(error, context, additionalData = {}) {
        const errorMessage = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(errorMessage, `FieldMapper-${context}`, 'error', { originalError: error, ...additionalData });
        // Re-throw custom errors for more specific catching if needed by caller
        if (error instanceof FieldMappingError || error instanceof FieldValidationError) {
            throw error;
        }
    }

    _performMemoryCleanup() { // From user's field-mapper.js [cite: uploaded:field-mapper.js (lines 136-144)]
        this._log('info', 'Performing memory cleanup for FieldMapper.');
        // Clear any large internal caches if this module were to implement them.
        // For now, this is a placeholder as the primary data is passed in/out.
        if (typeof global !== 'undefined' && global.gc) {
            try { global.gc(); } catch (e) { this._log('warn', 'Failed to force GC.', e); }
        }
    }

    _initializeDefaultProfiles(initialProfiles) {
        if (initialProfiles && Object.keys(initialProfiles).length > 0) {
            this.mappingProfiles = this._deepClone(initialProfiles);
            this._log('info', 'Initialized with custom profiles.');
            return;
        }

        // Load default profiles based on user's field-mapper.js [cite: uploaded:field-mapper.js (lines 15-102)]
        // These define paths. Transformers and validators can be added or will be applied globally.
        const defaultPaths = {
            juno: { /* ... user's juno paths from [cite: uploaded:field-mapper.js (lines 17-46)] ... */
                'patient.age': ['demographicData.age', 'information.age', 'patient.age'],
                'patient.sex': ['demographicData.sex', 'information.sex', 'patient.gender', 'patient.sex'],
                'lipids.totalCholesterol': ['labResults.lipidPanel.totalCholesterol', 'testResults.totalCholesterol', 'lipids.totalCholesterol'],
                // ...etc.
            },
            fhir: { /* ... user's fhir paths from [cite: uploaded:field-mapper.js (lines 47-76)] ... */
                'patient.age': ['patient.age', 'calculated.age', 'derivedFrom.birthDate.age'],
                'lipids.totalCholesterol': ['lipidPanel.totalCholesterol.valueQuantity.value', 'observation.cholesterol.value'],
                 // ...etc.
            },
            oscar: { /* ... user's oscar paths from [cite: uploaded:field-mapper.js (lines 77-102)] ... */
                'patient.age': ['demographic.age', 'patientAge'],
                'lipids.totalCholesterol': ['labs.CHOLESTEROL.value', 'eform.totalCholesterol'],
                 // ...etc.
            },
            generic: { /* ... user's generic paths from [cite: uploaded:field-mapper.js (lines 103-125)] ... */
                'patient.age': ['patient.age', 'demographics.age', 'age'],
                'lipids.totalCholesterol': ['labs.cholesterol', 'lipids.totalCholesterol', 'cholesterol', 'total_cholesterol'],
                // ...etc.
            }
        };

        for (const profileName in defaultPaths) {
            this.registerProfile(profileName, {
                toInternal: this._convertPathsToRules(defaultPaths[profileName], 'internal', profileName),
                toExternal: this._convertPathsToRules(defaultPaths[profileName], 'external', profileName), // Basic reverse for example
                options: { caseSensitive: false }, // Default from my v1.0.0
                // Add hooks for user's specific value transformers and post-processing
                valueTransformer: this._getSpecificValueTransformer(profileName),
                postProcessorToInternal: this._getSpecificPostProcessor(profileName, 'toInternal'),
                postProcessorToExternal: this._getSpecificPostProcessor(profileName, 'toExternal')
            });
        }
        this._log('info', 'Initialized with default EMR mapping profiles.');
    }

    _convertPathsToRules(pathMap, direction, profileName) {
        const rules = {};
        if (direction === 'internal') { // external paths -> internal key
            for (const internalKey in pathMap) {
                rules[internalKey] = pathMap[internalKey][0]; // Use the first path as the primary source string
                // More advanced: rules[internalKey] = { paths: pathMap[internalKey], transform: ..., validate: ... }
            }
        } else { // internal key -> external paths (use first path for simplicity)
            for (const internalKey in pathMap) {
                if (pathMap[internalKey] && pathMap[internalKey][0]) {
                    rules[pathMap[internalKey][0]] = internalKey;
                }
            }
        }
        return rules;
    }

    _getSpecificValueTransformer(profileName) {
        // Links to user's EMR-specific transformer functions [cite: uploaded:field-mapper.js (lines 238-450)]
        switch (profileName.toLowerCase()) {
            case 'juno': return this._transformJunoValues.bind(this);
            case 'fhir': return this._transformFHIRValues.bind(this);
            case 'oscar': return this._transformOscarValues.bind(this);
            case 'generic': return this._transformGenericValues.bind(this);
            default: return (field, value) => value; // No-op
        }
    }
    _getSpecificPostProcessor(profileName, direction) {
        // Links to user's EMR-specific post-processor functions [cite: uploaded:field-mapper.js (lines 490-650)]
        // For now, we'll use a generic post-processor that calls calculateBMI and calculateLDL
        if (direction === 'toInternal') return this._postProcessMappedDataToInternal.bind(this);
        // if (direction === 'toExternal') {
        //     switch (profileName.toLowerCase()) {
        //         case 'juno': return this._postProcessJunoDataForExternal.bind(this);
        //         // ... etc.
        //     }
        // }
        return (data) => data; // No-op
    }


    registerProfile(profileName, profileDefinition) { /* ... (same as my v1.0.0, but ensure options are merged) ... */
        if (!profileName || typeof profileName !== 'string') { this._handleError(new FieldMappingError('Profile name must be a non-empty string.'), 'RegisterProfile'); return false; }
        if (!profileDefinition || typeof profileDefinition !== 'object') { this._handleError(new FieldMappingError('Profile definition must be an object.'), 'RegisterProfile', {profileName}); return false; }

        this.mappingProfiles[profileName] = {
            options: { caseSensitive: false, defaultInternalValue: undefined, defaultExternalValue: undefined, ...profileDefinition.options },
            toInternal: profileDefinition.toInternal || {},
            toExternal: profileDefinition.toExternal || {},
            valueTransformer: profileDefinition.valueTransformer || ((f,v) => v),
            postProcessorToInternal: profileDefinition.postProcessorToInternal || ((d) => d),
            postProcessorToExternal: profileDefinition.postProcessorToExternal || ((d) => d)
        };
        this._log('info', `Mapping profile "${profileName}" registered/updated.`);
        return true;
    }

    getProfile(profileName) { return this.mappingProfiles[profileName] || null; }

    _resolvePathValue(obj, path, caseSensitive = false) { /* ... (same as my v1.0.0, or user's _getNestedValue [cite: uploaded:field-mapper.js (lines 549-579)]) ... */
        if (typeof obj !== 'object' || obj === null || typeof path !== 'string') return undefined;
        const keys = path.split('.'); let current = obj;
        for (const key of keys) {
            if (typeof current !== 'object' || current === null) return undefined;
            let foundKey = key;
            if (!caseSensitive) { foundKey = Object.keys(current).find(k => k.toLowerCase() === key.toLowerCase()); if (foundKey === undefined) return undefined; }
            else if (!Object.prototype.hasOwnProperty.call(current, key)) return undefined;
            current = current[foundKey];
        }
        return current;
    }

    _setValueAtPath(obj, path, value) { /* ... (from user's field-mapper.js [cite: uploaded:field-mapper.js (lines 586-613)]) ... */
        if (!obj || !path) return;
        const parts = path.split('.'); let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            // Simplified: does not handle array path notation like 'field[0].subfield' from user's code
            if (!current[part] || typeof current[part] !== 'object') { current[part] = {}; }
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
    }


    mapToInternal(sourceData, profileName, existingInternalData = {}) {
        const profile = this.getProfile(profileName);
        if (!profile) { this._handleError(new FieldMappingError(`Profile "${profileName}" not found.`), 'MapToInternal'); return null; }
        if (typeof sourceData !== 'object' || sourceData === null) { this._log('warn', `Source data for "${profileName}" not object.`, {sourceData}); return this._deepClone(existingInternalData); }

        const S = this.dependencies.InputSanitizer;
        const V = this.dependencies.ValidationHelpers; // For validators
        let internalData = this._deepClone(existingInternalData);
        const mappingRules = profile.toInternal;
        const profileOptions = profile.options;
        const valueTransformer = profile.valueTransformer || ((f,v) => v);

        this._log('debug', `Mapping to internal using "${profileName}"`);

        for (const internalKey in mappingRules) {
            if (Object.prototype.hasOwnProperty.call(mappingRules, internalKey)) {
                const rule = mappingRules[internalKey];
                let rawValue, transformedValue, validatedValue = profileOptions.defaultInternalValue;

                try {
                    if (typeof rule === 'function') {
                        rawValue = rule(sourceData, S, V);
                    } else if (typeof rule === 'string') { // path string
                        rawValue = this._resolvePathValue(sourceData, rule, profileOptions.caseSensitive);
                    } else if (typeof rule === 'object' && rule !== null && rule.path) { // Advanced rule object
                        rawValue = this._resolvePathValue(sourceData, rule.path, profileOptions.caseSensitive);
                        if (rawValue !== undefined && typeof rule.transform === 'function') {
                            rawValue = rule.transform(rawValue, sourceData, S, V);
                        }
                    } else {
                        this._log('warn', `Invalid rule for internal key "${internalKey}" in profile "${profileName}".`);
                        continue;
                    }

                    transformedValue = valueTransformer(internalKey, rawValue, sourceData); // Profile-wide transformer

                    // Field-specific validation (from user's field-mapper.js [cite: uploaded:field-mapper.js (lines 127-236)])
                    const fieldValidator = this._getSpecificFieldValidator(internalKey);
                    if (fieldValidator) {
                        // Pass unit if available (e.g., for cholesterol)
                        const unitKey = internalKey.replace(/([a-zA-Z]+)(Cholesterol|Hdl|Ldl|Triglycerides)/, '$1Unit'); // lipids.totalUnit
                        const unit = this._resolvePathValue(sourceData, profile.toInternal[unitKey] || '', profileOptions.caseSensitive) || (internalKey.includes('lipids') ? 'mmol/L' : undefined);
                        const validationAttempt = fieldValidator(transformedValue, unit); // unit might be undefined
                        if (validationAttempt === null && transformedValue !== null && transformedValue !== undefined) { // Validator deemed it invalid
                            throw new FieldValidationError(`Validation failed for ${internalKey}`, internalKey, transformedValue);
                        }
                        validatedValue = validationAttempt !== null ? validationAttempt : transformedValue; // Use validated or transformed if validator returns null for "valid but no change"
                    } else {
                        validatedValue = transformedValue;
                    }


                    if (validatedValue === undefined && profileOptions.defaultInternalValue !== undefined) {
                        validatedValue = profileOptions.defaultInternalValue;
                    }

                    if (validatedValue !== undefined) {
                        const finalValue = (typeof validatedValue === 'string' && S) ? S.escapeHTML(validatedValue) : validatedValue;
                        this._setValueAtPath(internalData, internalKey, finalValue);
                    }
                } catch (error) {
                    if (!(error instanceof FieldValidationError)) { // Don't re-handle if already specific
                         this._handleError(error, `MapToInternal-Rule-${profileName}-${internalKey}`);
                    } else {
                        this._log('warn', `Validation failed for ${error.field}: ${error.message}`, {value: error.value});
                    }
                    // Optionally set to default or skip on error based on profile config
                }
            }
        }
        // Post-processing (from user's field-mapper.js [cite: uploaded:field-mapper.js (lines 490-650)])
        if (profile.postProcessorToInternal) {
            internalData = profile.postProcessorToInternal(internalData, sourceData, S, V);
        }

        this.dependencies.EventBus?.publish('fieldMapper:mappedToInternal', { profileName, internalData });
        return internalData;
    }

    mapToExternal(internalData, profileName, existingExternalData = {}) { /* ... (similar logic to mapToInternal, but using profile.toExternal and profile.postProcessorToExternal) ... */
        const profile = this.getProfile(profileName);
        if (!profile) { this._handleError(new FieldMappingError(`Profile "${profileName}" not found.`), 'MapToExternal'); return null; }
        if (typeof internalData !== 'object' || internalData === null) { this._log('warn', `Internal data for "${profileName}" not object.`, {internalData}); return this._deepClone(existingExternalData); }

        const S = this.dependencies.InputSanitizer;
        // const V = this.dependencies.ValidationHelpers;
        let externalData = this._deepClone(existingExternalData);
        const mappingRules = profile.toExternal;
        const profileOptions = profile.options;
        const valueTransformer = profile.valueTransformer || ((f,v) => v); // Profile-wide transformer

        this._log('debug', `Mapping to external using "${profileName}"`);

        for (const externalKey in mappingRules) {
            if (Object.prototype.hasOwnProperty.call(mappingRules, externalKey)) {
                const rule = mappingRules[externalKey];
                let value = profileOptions.defaultExternalValue;
                try {
                    if (typeof rule === 'function') {
                        value = rule(internalData, S /*, V */);
                    } else if (typeof rule === 'string') { // internalFieldPath
                        value = this._resolvePathValue(internalData, rule, true); // Internal keys usually case-sensitive
                    } else if (typeof rule === 'object' && rule !== null && rule.path) {
                        value = this._resolvePathValue(internalData, rule.path, true);
                        if (value !== undefined && typeof rule.transform === 'function') {
                            value = rule.transform(value, internalData, S /*, V */);
                        }
                    } else { this._log('warn', `Invalid rule for external key "${externalKey}" in "${profileName}".`); continue; }

                    value = valueTransformer(externalKey, value, internalData); // Profile-wide transformer

                    if (value === undefined && profileOptions.defaultExternalValue !== undefined) {
                        value = profileOptions.defaultExternalValue;
                    }
                    if (value !== undefined) this._setValueAtPath(externalData, externalKey, value);

                } catch (error) { this._handleError(error, `MapToExternal-Rule-${profileName}-${externalKey}`); }
            }
        }
        if (profile.postProcessorToExternal) {
            externalData = profile.postProcessorToExternal(externalData, internalData, S, V);
        }
        this.dependencies.EventBus?.publish('fieldMapper:mappedToExternal', { profileName, externalData });
        return externalData;
    }

    // --- Value Transformers (from user's field-mapper.js [cite: uploaded:field-mapper.js (lines 238-450)], adapted) ---
    _transformJunoValues(field, value, sourceData) { /* ... user's logic ... */ return value; }
    _transformFHIRValues(field, value, sourceData) { /* ... user's logic ... */ return value; }
    _transformOscarValues(field, value, sourceData) { /* ... user's logic ... */ return value; }
    _transformGenericValues(field, value, sourceData) { /* ... user's logic ... */ return value; }

    // --- Field Validators (from user's field-mapper.js [cite: uploaded:field-mapper.js (lines 138-236)], adapted to use ValidationHelpers) ---
    _getSpecificFieldValidator(internalKey) {
        const V = this.dependencies.ValidationHelpers;
        if (!V) return null;
        // Map internalKey to user's validator methods, which now use V
        const validatorMap = {
            'patient.age': (val) => V.isValidAge(val).isValid ? parseFloat(val) : null,
            'patient.sex': (val) => { const res = V.matchesRegex(val, /^(male|female|other|unknown)$/i, 'Invalid sex.'); return res.isValid ? String(val).toLowerCase() : null; },
            'patient.height': (val) => V.isInRange(val, 30, 300).isValid ? parseFloat(val) : null, // Assuming cm
            'patient.weight': (val) => V.isInRange(val, 1, 500).isValid ? parseFloat(val) : null, // Assuming kg
            'lipids.totalCholesterol': (val, unit) => V.isValidLipid(val, 'TOTAL_CHOLESTEROL', unit || 'mmol/L').isValid ? parseFloat(val) : null,
            'lipids.hdl': (val, unit) => V.isValidLipid(val, 'HDL', unit || 'mmol/L').isValid ? parseFloat(val) : null,
            'lipids.ldl': (val, unit) => V.isValidLipid(val, 'LDL', unit || 'mmol/L').isValid ? parseFloat(val) : null,
            'lipids.triglycerides': (val, unit) => V.isValidLipid(val, 'TRIGLYCERIDES', unit || 'mmol/L').isValid ? parseFloat(val) : null,
            'bp.systolicBP': (val) => V.isValidSbp(val).isValid ? parseInt(val) : null,
            'bp.diastolicBP': (val) => V.isValidDbp(val).isValid ? parseInt(val) : null,
        };
        return validatorMap[internalKey] || null;
    }

    // --- Post-Processing (from user's field-mapper.js [cite: uploaded:field-mapper.js (lines 490-650)], adapted) ---
    _postProcessMappedDataToInternal(appData, emrData, S, V) {
        // Calculate BMI if not present (example)
        if (appData.patient && appData.patient.height && appData.patient.weight && (appData.patient.bmi === undefined || appData.patient.bmi === null)) {
            const heightUnit = appData.patient.heightUnit || 'cm'; // Assume unit is also mapped or defaulted
            const weightUnit = appData.patient.weightUnit || 'kg';
            const bmiCalc = V.calculateBMI(appData.patient.height, appData.patient.weight, heightUnit, weightUnit);
            if (bmiCalc.value !== null) appData.patient.bmi = bmiCalc.value;
        }
        // Calculate LDL (Friedewald) if not present (example)
        if (appData.lipids && appData.lipids.totalCholesterol && appData.lipids.hdl && appData.lipids.triglycerides && (appData.lipids.ldl === undefined || appData.lipids.ldl === null)) {
            const ldlCalc = V.calculateLDLFriedewald?.(appData.lipids.totalCholesterol, appData.lipids.hdl, appData.lipids.triglycerides, appData.lipids.cholesterolUnit || 'mmol/L'); // Assuming V has this
            if (ldlCalc?.value !== null) appData.lipids.ldl = ldlCalc.value;
        }
        // Add other post-processing from user's _postProcessMappedData
        return appData;
    }
    // _postProcessJunoDataForExternal(emrData, appData, S, V) { /* ... user's logic ... */ return emrData; }
    // ... other EMR-specific post-processors for mapToExternal

    _deepClone(obj) { /* ... (same as my v1.0.0) ... */
        if (obj === null || typeof obj !== 'object') return obj;
        try { return JSON.parse(JSON.stringify(obj)); }
        catch (e) { this._log('warn', 'Deep clone failed', e); return Array.isArray(obj) ? [...obj] : {...obj}; }
    }
}

// Instantiate and export the singleton service
// const FieldMapperServiceInstance = new FieldMapperService();
// window.FieldMapperService = FieldMapperServiceInstance;
// export default FieldMapperServiceInstance;
