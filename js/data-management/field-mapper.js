/**
 * Field Mapper Service Module (Enhanced)
 * @file /js/data-management/field-mapper.js
 * @description Centralizes data mapping between different data structures (e.g., EMR data
 * to the toolkit's internal model) using configurable and expressive profiles.
 * Supports complex transformations, unit conversions, conditional mapping, and array mapping.
 * @version 1.2.0
 * @exports FieldMapperService
 */

'use strict';

// Custom Error Types (can be moved to a dedicated error-types.js if not already)
class FieldMappingError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'FieldMappingError';
        this.details = details;
    }
}

class FieldMapperService {
    /**
     * Creates or returns the singleton instance of FieldMapperService.
     * @param {object} [options={}] - Configuration options.
     * @param {object} [options.initialProfiles={}] - Pre-defined mapping profiles.
     * @param {boolean} [options.caseInsensitivePaths=false] - Whether to resolve paths case-insensitively.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     * Expected: ErrorLogger, InputSanitizer, UnitConverterService, ValidationHelpers.
     */
    constructor(options = {}) {
        if (FieldMapperService.instance && !options.forceNewInstance) {
            return FieldMapperService.instance;
        }

        this.options = {
            initialProfiles: {},
            caseInsensitivePaths: false,
            debugMode: false,
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger(),
            InputSanitizer: window.InputSanitizerService,
            UnitConverterService: window.UnitConverterServiceInstance,
            ValidationHelpers: window.ValidationHelpersServiceInstance, // Assuming instance
            // HelperFunctions are expected to be globally available or part of a utility object
            HelperFunctions: window.HelperFunctions || { getNestedValue: this._getValueFromPath.bind(this), setNestedValue: this._setValueByPath.bind(this), deepClone: (obj) => JSON.parse(JSON.stringify(obj)) },
            ...options.dependencies,
        };

        this.profiles = { ...this.options.initialProfiles };

        if (!this.dependencies.InputSanitizer) this._log('warn', 'InputSanitizerService not available. Mapped string values may not be fully sanitized.');
        if (!this.dependencies.UnitConverterService) this._log('warn', 'UnitConverterService not available. Unit conversions in mappings will be skipped.');
        if (!this.dependencies.ValidationHelpers) this._log('warn', 'ValidationHelpersService not available. Post-mapping validation might be limited.');


        FieldMapperService.instance = this;
        this._log('info', 'FieldMapperService Initialized (v1.2.0).');
    }

    _getFallbackLogger() {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`FieldMapper Fallback Logger [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => console[lvl]?.(`FieldMapper Fallback Logger [${lvl}]: ${msg}`, data) || console.log(`FieldMapper Fallback Logger [${lvl}]: ${msg}`, data)
        };
    }

    _log(level, message, data = {}) {
        this.dependencies.ErrorLogger.log?.(level, `FieldMapperSvc: ${message}`, data);
    }

    _handleError(error, context, additionalData = {}) {
        const msg = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(msg, `FieldMapperSvc-${context}`, 'error', { originalError: error, ...additionalData });
    }

    /**
     * Registers a new mapping profile or updates an existing one.
     * @param {string} profileName - Unique name for the profile (e.g., 'juno', 'fhir_r4', 'internal_v1').
     * @param {object} profileDefinition - The mapping definition object.
     * Structure: { toInternal: { internalKey: rule, ... }, toExternal: { externalKey: rule, ... }, postProcessorToInternal?: fn, postProcessorToExternal?: fn }
     */
    registerProfile(profileName, profileDefinition) {
        if (!profileName || typeof profileName !== 'string') {
            throw new FieldMappingError('Profile name must be a non-empty string.');
        }
        if (!profileDefinition || typeof profileDefinition !== 'object') {
            throw new FieldMappingError('Profile definition must be an object.');
        }
        this.profiles[profileName] = profileDefinition;
        this._log('info', `Mapping profile "${profileName}" registered/updated.`);
    }

    /**
     * Retrieves a registered mapping profile.
     * @param {string} profileName - The name of the profile.
     * @returns {object|null} The profile definition or null if not found.
     */
    getProfile(profileName) {
        return this.profiles[profileName] || null;
    }

    /**
     * Maps data from an external source format to the internal canonical model.
     * @param {object} sourceData - The source data object.
     * @param {string} profileName - The name of the mapping profile to use.
     * @param {object} [existingInternalData={}] - Optional existing internal data to merge into.
     * @returns {object|null} The mapped internal data object, or null on critical error.
     */
    mapToInternal(sourceData, profileName, existingInternalData = {}) {
        const profile = this.getProfile(profileName);
        if (!profile || !profile.toInternal) {
            this._log('error', `Profile "${profileName}" or its "toInternal" mapping not found.`);
            return null;
        }

        let internalData = this.dependencies.HelperFunctions.deepClone(existingInternalData);
        const mappingRules = profile.toInternal;

        this._log('debug', `Starting mapToInternal with profile "${profileName}".`, { sourceKeys: Object.keys(sourceData || {}) });

        for (const internalKey in mappingRules) {
            if (Object.prototype.hasOwnProperty.call(mappingRules, internalKey)) {
                const rule = mappingRules[internalKey];
                try {
                    this._applyMappingRule(sourceData, internalData, internalKey, rule, 'toInternal');
                } catch (error) {
                    this._handleError(error, `MapToInternalRule-${internalKey}`, { profileName, rule });
                    // Continue with other fields unless it's a critical error propagation
                }
            }
        }

        if (typeof profile.postProcessorToInternal === 'function') {
            try {
                internalData = profile.postProcessorToInternal(internalData, sourceData, this.dependencies);
                this._log('debug', `Post-processor applied for "toInternal" using profile "${profileName}".`);
            } catch (error) {
                this._handleError(error, 'PostProcessorToInternal', { profileName });
            }
        }
        return internalData;
    }

    /**
     * Maps data from the internal canonical model to an external source format.
     * @param {object} internalData - The internal data object.
     * @param {string} profileName - The name of the mapping profile to use.
     * @param {object} [existingExternalData={}] - Optional existing external data to merge into.
     * @returns {object|null} The mapped external data object, or null on critical error.
     */
    mapToExternal(internalData, profileName, existingExternalData = {}) {
        const profile = this.getProfile(profileName);
        if (!profile || !profile.toExternal) {
            this._log('error', `Profile "${profileName}" or its "toExternal" mapping not found.`);
            return null;
        }

        let externalData = this.dependencies.HelperFunctions.deepClone(existingExternalData);
        const mappingRules = profile.toExternal;

        this._log('debug', `Starting mapToExternal with profile "${profileName}".`, { internalKeys: Object.keys(internalData || {}) });

        for (const externalKey in mappingRules) {
            if (Object.prototype.hasOwnProperty.call(mappingRules, externalKey)) {
                const rule = mappingRules[externalKey];
                try {
                    this._applyMappingRule(internalData, externalData, externalKey, rule, 'toExternal');
                } catch (error) {
                    this._handleError(error, `MapToExternalRule-${externalKey}`, { profileName, rule });
                }
            }
        }

        if (typeof profile.postProcessorToExternal === 'function') {
            try {
                externalData = profile.postProcessorToExternal(externalData, internalData, this.dependencies);
                this._log('debug', `Post-processor applied for "toExternal" using profile "${profileName}".`);
            } catch (error) {
                this._handleError(error, 'PostProcessorToExternal', { profileName });
            }
        }
        return externalData;
    }

    /**
     * Applies a single mapping rule.
     * @private
     */
    _applyMappingRule(sourceRoot, targetObject, targetKey, rule, direction) {
        if (typeof rule === 'string') { // Simple path mapping
            const value = this._getValueFromPath(sourceRoot, rule);
            if (value !== undefined) {
                this._setValueByPath(targetObject, targetKey, this._sanitizeValue(value, rule));
            }
        } else if (typeof rule === 'function') { // Custom function
            const value = rule(sourceRoot, sourceRoot, this.dependencies); // Pass full sourceRoot for context
            if (value !== undefined) {
                this._setValueByPath(targetObject, targetKey, this._sanitizeValue(value, rule.name || 'customFunction'));
            }
        } else if (typeof rule === 'object' && rule !== null) { // Advanced rule object
            // Check condition first
            if (typeof rule.condition === 'function' && !rule.condition(sourceRoot, sourceRoot, this.dependencies)) {
                this._log('debug', `Rule for "${targetKey}" skipped due to condition.`);
                return;
            }

            if (rule.isArray && rule.arraySourcePath) {
                const sourceArray = this._getValueFromPath(sourceRoot, rule.arraySourcePath);
                if (Array.isArray(sourceArray)) {
                    const mappedArray = sourceArray.map(item => {
                        const mappedItem = {};
                        for (const itemKey in rule.arrayItemMapping) {
                            this._applyMappingRule(item, mappedItem, itemKey, rule.arrayItemMapping[itemKey], direction);
                        }
                        return mappedItem;
                    }).filter(item => Object.keys(item).length > 0); // Filter out empty mapped items if needed

                    if (mappedArray.length > 0 || rule.defaultValue !== undefined) {
                         this._setValueByPath(targetObject, rule.targetPath || targetKey, mappedArray.length > 0 ? mappedArray : rule.defaultValue);
                    }
                } else if (rule.defaultValue !== undefined) {
                    this._setValueByPath(targetObject, rule.targetPath || targetKey, rule.defaultValue);
                }
                return;
            }


            let value = rule.sourcePath ? this._getValueFromPath(sourceRoot, rule.sourcePath) : sourceRoot; // If no sourcePath, rule applies to root

            if (value === undefined || value === null) {
                if (rule.defaultValue !== undefined) {
                    value = rule.defaultValue;
                } else if (rule.required) {
                    this._log('warn', `Required field "${targetKey}" (source: ${rule.sourcePath || 'N/A'}) is missing or null.`);
                    // Optionally throw new FieldMappingError or let ValidationHelpers handle it later
                } else {
                    return; // No value and no default, skip
                }
            }
            
            // Unit Conversion
            if (this.dependencies.UnitConverterService && rule.targetUnit && (rule.sourceUnitPath || rule.sourceUnit)) {
                const sourceUnit = rule.sourceUnitPath ? this._getValueFromPath(sourceRoot, rule.sourceUnitPath) : rule.sourceUnit;
                if (sourceUnit && value !== null && value !== '' && String(sourceUnit).toLowerCase() !== String(rule.targetUnit).toLowerCase()) {
                    const conversionResult = this.dependencies.UnitConverterService.convert(
                        parseFloat(value), // Assuming numeric value for conversion
                        sourceUnit,
                        rule.targetUnit,
                        rule.measurementType || 'generic'
                    );
                    if (!conversionResult.error && conversionResult.value !== null) {
                        value = conversionResult.value;
                        // Optionally, map the converted unit to a target unit field if specified
                        if (rule.targetUnitPath) {
                            this._setValueByPath(targetObject, rule.targetUnitPath, conversionResult.unit);
                        }
                    } else {
                        this._log('warn', `Unit conversion failed for "${targetKey}" from ${sourceUnit} to ${rule.targetUnit}. Using original value. Error: ${conversionResult.error}`);
                    }
                } else if (rule.targetUnitPath && sourceUnit) { // If units are same, still set target unit if path provided
                     this._setValueByPath(targetObject, rule.targetUnitPath, sourceUnit);
                }
            }


            // Transformation
            if (typeof rule.transform === 'function') {
                value = rule.transform(value, sourceRoot, sourceRoot, this.dependencies); // Pass current value and full source for context
            }

            if (value !== undefined) {
                this._setValueByPath(targetObject, rule.targetPath || targetKey, this._sanitizeValue(value, rule.sourcePath || 'transformFunction'));
            }
        }
    }

    _sanitizeValue(value, contextPath = 'unknown') {
        if (typeof value === 'string' && this.dependencies.InputSanitizer) {
            // Basic HTML escaping for strings. More specific sanitization (URL, HTML content) should be handled by transform functions.
            return this.dependencies.InputSanitizer.escapeHTML(value);
        }
        // For objects/arrays, InputSanitizer.sanitizeObjectOrArray could be used if a default string sanitizer is appropriate.
        // Here, we assume complex objects are handled by transform functions or are inherently safe.
        return value;
    }

    /**
     * Gets a value from a nested object using a dot-separated path.
     * Handles arrays with numeric indices in the path (e.g., 'items[0].name').
     * @private
     */
    _getValueFromPath(obj, path) {
        if (typeof path !== 'string' || !obj) return undefined;
        // Path resolution logic (can use a library or robust custom implementation)
        // This is a simplified version. For production, consider a more robust path resolver.
        const H = this.dependencies.HelperFunctions;
        if (H && typeof H.getNestedValue === 'function') {
            return H.getNestedValue(obj, path, undefined, this.options.caseInsensitivePaths);
        }

        // Fallback basic resolver
        let current = obj;
        const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.'); // Convert array notation
        for (const part of parts) {
            if (current === null || typeof current !== 'object') return undefined;
            const keyToTest = this.options.caseInsensitivePaths ? Object.keys(current).find(k => k.toLowerCase() === part.toLowerCase()) : part;
            if (keyToTest === undefined || !Object.prototype.hasOwnProperty.call(current, keyToTest)) return undefined;
            current = current[keyToTest];
        }
        return current;
    }

    /**
     * Sets a value in a nested object using a dot-separated path. Creates objects/arrays if they don't exist.
     * @private
     */
    _setValueByPath(obj, path, value) {
        if (typeof path !== 'string' || !obj) return false;
        const H = this.dependencies.HelperFunctions;
        if (H && typeof H.setNestedValue === 'function') {
            return H.setNestedValue(obj, path, value);
        }
        // Fallback basic setter
        const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            const nextPartIsNumeric = !isNaN(parseInt(parts[i+1], 10));
            if (!current[part] || typeof current[part] !== 'object') {
                current[part] = nextPartIsNumeric ? [] : {};
            }
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
        return true;
    }
}

// Instantiate and export the singleton service
// const FieldMapperServiceInstance = new FieldMapperService({ dependencies: { ... } });
// window.FieldMapperService = FieldMapperServiceInstance;
// export default FieldMapperServiceInstance;
