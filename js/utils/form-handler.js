/**
 * Advanced Form Handler Module
 * @file /js/utils/form-handler.js
 * @description Provides robust and extensible handling for HTML forms, including
 * validation orchestration, async submission, state management, feedback,
 * and inter-form field synchronization via EventBus.
 * @version 1.3.0
 * @exports FormHandler
 */

'use strict';

class FormHandler {
    /**
     * Creates an instance of FormHandler.
     * @param {string|HTMLFormElement} formElementOrSelector - The form element or its CSS selector.
     * @param {object} [options={}] - Configuration options.
     * @param {Function} options.onSubmit - Async callback: `async (formData, formHandlerInstance) => {}`. REQUIRED.
     * @param {Function} [options.onValidate] - Async validation: `async (formData, formElement) => ({isValid: boolean, errors: object, normalizedData?: object})`.
     * @param {Function} [options.onReset] - Callback on form reset: `(formHandlerInstance) => {}`.
     * @param {Function} [options.onDirtyStateChange] - Callback when dirty state changes: `(isDirty, formHandlerInstance) => {}`.
     * @param {boolean} [options.clearErrorsOnInput=true] - Clear field errors as user types.
     * @param {boolean} [options.showLoadingOnSubmit=true] - Use LoadingManager during submission.
     * @param {boolean} [options.warnOnUnsavedChanges=true] - Prompt before leaving page if form is dirty.
     * @param {string} [options.unsavedChangesMessage='You have unsaved changes...']
     * @param {object} [options.sharedFieldMappings=null] - Configuration for syncing fields.
     * Example: { 'hdlCholesterol': { formFieldName: 'hdl-input', unitFieldName: 'hdl-unit-select', canonicalUnit: 'mmol/L', type: 'lipid' }, ... }
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(formElementOrSelector, options = {}) {
        this.form = typeof formElementOrSelector === 'string'
            ? document.querySelector(formElementOrSelector)
            : formElementOrSelector;

        if (!this.form) {
            const errMsg = `FormHandler: Form not found: ${formElementOrSelector}.`;
            console.error(errMsg);
            (window.ErrorDetectionSystemInstance || console)
                .handleError?.(errMsg, 'FormHandler-Init', 'critical');
            if (!window.ErrorDetectionSystemInstance) throw new Error(errMsg);
            return;
        }
        // Ensure form has an ID for event scoping if needed
        if (!this.form.id) {
            this.form.id = `formhandler-${Math.random().toString(36).substring(2,9)}`;
            (window.ErrorDetectionSystemInstance || console)
                .log?.('debug', `FormHandler: Assigned dynamic ID to form: ${this.form.id}`, 'FormHandler-Init');
        }


        this.options = {
            onSubmit: async (data) => { console.warn("FormHandler: No onSubmit provided.", { formId: this.form.id, data }); },
            onValidate: async (data) => ({ isValid: true, errors: {}, normalizedData: data }),
            onReset: () => {},
            onDirtyStateChange: () => {},
            clearErrorsOnInput: true,
            showLoadingOnSubmit: true,
            warnOnUnsavedChanges: true,
            unsavedChangesMessage: 'You have unsaved changes. Are you sure you want to leave this page?',
            sharedFieldMappings: null,
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger(),
            EventBus: window.EventBus,
            LoadingManager: window.LoadingManagerInstance,
            UnitConverterService: window.UnitConverterServiceInstance,
            InputSanitizer: window.InputSanitizerService,
            ...options.dependencies,
        };

        this.isDirty = false;
        this.isSubmitting = false;
        this._initialState = this._captureState();
        this._isSyncUpdateInProgress = false; // Prevents event loops during sync

        if (this.options.sharedFieldMappings && !this.dependencies.EventBus) {
            this._log('warn', 'EventBus not available. Inter-form field synchronization will be disabled.');
            this.options.sharedFieldMappings = null;
        }
        if (this.options.sharedFieldMappings && !this.dependencies.UnitConverterService) {
            this._log('warn', 'UnitConverterService not available. Unit conversion for shared fields will be disabled.');
        }

        this._bindEvents();
        if (this.options.sharedFieldMappings) {
            this._subscribeToSharedFieldUpdates();
        }
        this._log('info', `FormHandler Initialized (v1.3.0) for form: #${this.form.id}`);
    }

    _getFallbackLogger() {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`FormHandler Fallback Logger [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => console[lvl]?.(`FormHandler Fallback Logger [${lvl}]: ${msg}`, data) || console.log(`FormHandler Fallback Logger [${lvl}]: ${msg}`, data)
        };
    }

    _bindEvents() {
        this.form.addEventListener('submit', this._handleSubmit.bind(this));
        this.form.addEventListener('reset', this._handleReset.bind(this));
        this.form.addEventListener('input', this._handleInput.bind(this));
        // For select, checkbox, radio which might not trigger 'input' consistently on all browsers
        this.form.addEventListener('change', this._handleChange.bind(this));


        if (this.options.warnOnUnsavedChanges) {
            window.addEventListener('beforeunload', this._handleBeforeUnload.bind(this));
        }
    }

    _subscribeToSharedFieldUpdates() {
        if (!this.dependencies.EventBus || !this.options.sharedFieldMappings) return;

        this.dependencies.EventBus.subscribe('sharedField:updated', (payload) => {
            if (!payload || payload.originatingFormId === this.form.id) {
                return; // Ignore self-originated events or invalid payloads
            }

            const { canonicalFieldName, value, unit } = payload;
            const mapping = this.options.sharedFieldMappings[canonicalFieldName];

            if (mapping && mapping.formFieldName) {
                this._log('debug', `Received shared field update for "${canonicalFieldName}" from form "${payload.originatingFormId}". Applying to "${mapping.formFieldName}".`, {formId: this.form.id, payload});
                this._isSyncUpdateInProgress = true;
                try {
                    this.populateField(mapping.formFieldName, value, unit, mapping.unitFieldName, mapping.canonicalUnit, mapping.type);
                } catch (error) {
                    this._log('error', `Error populating field "${mapping.formFieldName}" from shared update.`, {error, payload});
                } finally {
                    // Use a microtask to reset the flag after current event processing finishes
                    Promise.resolve().then(() => { this._isSyncUpdateInProgress = false; });
                }
            }
        });
        this._log('info', 'Subscribed to sharedField:updated events for inter-form sync.', {formId: this.form.id});
    }

    async _handleSubmit(event) {
        event.preventDefault();
        if (this.isSubmitting) return;

        this._setSubmitting(true);
        this.clearAllErrors();
        const formData = this.getFormData();

        try {
            const validationResult = await this.options.onValidate(formData, this.form);
            const { isValid, errors, normalizedData } = validationResult || { isValid: true, errors: {}, normalizedData: formData };

            if (!isValid) {
                this.displayErrors(errors);
                this._log('warn', 'Form validation failed', { formId: this.form.id, errors });
                this._setSubmitting(false);
                return;
            }

            const dataToSubmit = normalizedData || formData;
            await this.options.onSubmit(dataToSubmit, this);
            this._log('info', 'Form submission successful', { formId: this.form.id });
            this.resetDirtyState(true);
        } catch (error) {
            this._log('error', 'Form submission error', { formId: this.form.id, error });
            this.displayErrors({ _form: error.message || 'An unexpected error occurred during submission.' });
        } finally {
            this._setSubmitting(false);
        }
    }

    _handleReset() {
        this.clearAllErrors();
        setTimeout(() => { // Allow DOM to update from form.reset()
            this.resetDirtyState(true);
            this.options.onReset(this);
            this._log('info', 'Form reset.', { formId: this.form.id });
        }, 0);
    }

    _handleInput(event) {
        if (this._isSyncUpdateInProgress) return;

        if (this.options.clearErrorsOnInput && event.target.name) {
            this.clearError(event.target.name);
        }
        this._checkDirtyState();
        this._publishSharedFieldUpdate(event.target);
    }
    
    _handleChange(event) { // Specifically for select, checkbox, radio
        if (this._isSyncUpdateInProgress) return;

        if (['SELECT', 'INPUT'].includes(event.target.tagName) && 
            (event.target.type === 'checkbox' || event.target.type === 'radio' || event.target.tagName === 'SELECT')) {
            
            if (this.options.clearErrorsOnInput && event.target.name) {
                this.clearError(event.target.name);
            }
            this._checkDirtyState();
            this._publishSharedFieldUpdate(event.target);
        }
    }


    _publishSharedFieldUpdate(changedElement) {
        if (!this.dependencies.EventBus || !this.options.sharedFieldMappings || this._isSyncUpdateInProgress) {
            return;
        }

        const fieldName = changedElement.name;
        let canonicalFieldName = null;
        let mappingConfig = null;

        for (const cfn in this.options.sharedFieldMappings) {
            const config = this.options.sharedFieldMappings[cfn];
            if (config.formFieldName === fieldName || config.unitFieldName === fieldName) {
                canonicalFieldName = cfn;
                mappingConfig = config;
                break;
            }
        }

        if (canonicalFieldName && mappingConfig) {
            const valueElement = this.form.elements[mappingConfig.formFieldName];
            let value = valueElement ? (valueElement.type === 'checkbox' ? valueElement.checked : valueElement.value) : null;
            let unit = mappingConfig.unitFieldName ? this.form.elements[mappingConfig.unitFieldName]?.value : undefined;
            
            let canonicalValue = value;
            let canonicalUnit = unit || mappingConfig.defaultUnit || mappingConfig.canonicalUnit;

            if (this.dependencies.UnitConverterService && unit && mappingConfig.canonicalUnit && unit.toLowerCase() !== mappingConfig.canonicalUnit.toLowerCase() && value !== null && value !== '') {
                const conversionResult = this.dependencies.UnitConverterService.convert(
                    parseFloat(value), // Ensure value is number for conversion
                    unit,
                    mappingConfig.canonicalUnit,
                    mappingConfig.type || 'generic' // Provide a type if available in mapping
                );
                if (!conversionResult.error && conversionResult.value !== null) {
                    canonicalValue = conversionResult.value;
                    canonicalUnit = conversionResult.unit;
                } else {
                    this._log('warn', `Unit conversion failed for shared field "${canonicalFieldName}" from ${unit} to ${mappingConfig.canonicalUnit}. Broadcasting original value.`, { value, error: conversionResult.error });
                }
            }

            const payload = {
                canonicalFieldName,
                value: canonicalValue,
                unit: canonicalUnit,
                originatingFormId: this.form.id,
                timestamp: Date.now()
            };
            this.dependencies.EventBus.publish('sharedField:updated', payload);
            this._log('debug', `Published sharedField:updated for "${canonicalFieldName}" from form "${this.form.id}".`, {formId: this.form.id, payload});
        }
    }


    _captureState() {
        return JSON.stringify(this.getFormData());
    }

    _checkDirtyState() {
        if (this._isSyncUpdateInProgress) return; // Don't mark dirty from sync updates
        const currentState = this._captureState();
        const newIsDirty = currentState !== this._initialState;

        if (newIsDirty !== this.isDirty) {
            this.isDirty = newIsDirty;
            this.options.onDirtyStateChange(this.isDirty, this);
            this.dependencies.EventBus?.publish('form:dirtyStateChange', {
                formId: this.form.id,
                isDirty: this.isDirty
            });
            this._log('debug', `Dirty state changed: ${this.isDirty}`, { formId: this.form.id });
        }
    }

    resetDirtyState(updateInitialState = false) {
        if (updateInitialState) {
             this._initialState = this._captureState();
        }
        // Force re-check after potential state update
        const currentState = this._captureState();
        const newIsDirty = currentState !== this._initialState;
        if (newIsDirty !== this.isDirty) {
            this.isDirty = newIsDirty;
            this.options.onDirtyStateChange(this.isDirty, this);
             this.dependencies.EventBus?.publish('form:dirtyStateChange', { formId: this.form.id, isDirty: this.isDirty });
        }
    }

    _setSubmitting(submitting) { /* ... (same as v1.2.1) ... */
        this.isSubmitting = submitting;
        this.form.querySelectorAll('button[type="submit"], input[type="submit"]')
            .forEach(btn => btn.disabled = submitting);
        if (this.options.showLoadingOnSubmit && this.dependencies.LoadingManager) {
             submitting ? this.dependencies.LoadingManager.show('Submitting...') : this.dependencies.LoadingManager.hide();
        }
        this.dependencies.EventBus?.publish('form:submissionStateChange', { formId: this.form.id, isSubmitting: this.isSubmitting });
    }

    _handleBeforeUnload(event) { /* ... (same as v1.2.1) ... */
        if (this.isDirty && this.options.warnOnUnsavedChanges) {
            event.preventDefault(); // Standard for most browsers.
            event.returnValue = this.options.unsavedChangesMessage; // For older browsers.
            return this.options.unsavedChangesMessage;
        }
    }

    getFormData() { /* ... (same as v1.2.1, ensures all named elements are captured) ... */
        const formData = new FormData(this.form);
        const data = {};
        // Ensure all named elements are considered, especially for unchecked checkboxes
        Array.from(this.form.elements).forEach(element => {
            if (element.name) {
                if (element.type === 'checkbox') {
                    if (!data[element.name]) data[element.name] = []; // Initialize as array for multiple checkboxes
                    if (element.checked) {
                        // If it's already an array, push. Otherwise, make it an array.
                        if (Array.isArray(data[element.name])) {
                            data[element.name].push(element.value);
                        } else {
                            data[element.name] = [element.value]; // First checked item
                        }
                    }
                } else if (element.type === 'radio') {
                    if (element.checked) {
                        data[element.name] = element.value;
                    }
                }
            }
        });
        // Override with FormData which correctly handles single-selects and text inputs
        for (const [key, value] of formData.entries()) {
            const elements = this.form.elements[key];
            if (elements && elements.length && elements[0].type !== 'checkbox' && elements.type !== 'radio') { // If NodeList and not checkbox (already handled)
                 if (data.hasOwnProperty(key)) {
                    if (!Array.isArray(data[key])) data[key] = [data[key]];
                    data[key].push(value);
                } else {
                    data[key] = value;
                }
            } else if (elements && elements.type !== 'checkbox' && elements.type !== 'radio') { // Single element
                 data[key] = value;
            } else if (!elements) { // Element not found by name (e.g. FormData includes submitter)
                 data[key] = value;
            }
        }
        // For multiple checkboxes that were all unchecked, ensure the key exists with empty array
        Array.from(this.form.elements).forEach(element => {
            if (element.name && element.type === 'checkbox' && !data.hasOwnProperty(element.name)) {
                data[element.name] = [];
            }
        });
         // Simplify single-value arrays from checkboxes unless it's a multi-checkbox field
        for (const key in data) {
            if (Array.isArray(data[key]) && data[key].length === 1) {
                const el = this.form.elements[key];
                if (el && el.length === undefined) { // If it's a single checkbox, not a group
                    data[key] = data[key][0];
                }
            }
        }
        return data;
    }

    /**
     * Populates a specific field in the form, handling units if applicable.
     * @param {string} formFieldName - The 'name' attribute of the form field to populate.
     * @param {*} valueToSet - The value to set.
     * @param {string} [unitToSet] - The unit of the valueToSet (if applicable).
     * @param {string} [formUnitFieldName] - The 'name' attribute of the unit selector for this field.
     * @param {string} [canonicalUnitForField] - The canonical unit for this field (for conversion).
     * @param {string} [measurementType] - The type of measurement for unit conversion (e.g., 'cholesterol').
     */
    populateField(formFieldName, valueToSet, unitToSet, formUnitFieldName, canonicalUnitForField, measurementType) {
        const S = this.dependencies.InputSanitizer;
        const U = this.dependencies.UnitConverterService;
        const element = this.form.elements[formFieldName];

        if (!element) {
            this._log('warn', `Element "${formFieldName}" not found in form "${this.form.id}" for population.`);
            return;
        }
        
        let finalValue = valueToSet;
        let finalUnit = unitToSet;

        // Handle unit conversion if necessary
        const targetUnitElement = formUnitFieldName ? this.form.elements[formUnitFieldName] : null;
        const displayUnit = targetUnitElement ? targetUnitElement.value : (mappingConfig?.defaultUnit || canonicalUnitForField);

        if (U && unitToSet && displayUnit && unitToSet.toLowerCase() !== displayUnit.toLowerCase() && valueToSet !== null && valueToSet !== '') {
            const conversionResult = U.convert(parseFloat(valueToSet), unitToSet, displayUnit, measurementType || 'generic');
            if (!conversionResult.error && conversionResult.value !== null) {
                finalValue = conversionResult.value;
                finalUnit = conversionResult.unit; // This should be displayUnit
            } else {
                this._log('warn', `Unit conversion failed for populating "${formFieldName}" from ${unitToSet} to ${displayUnit}. Using original value.`, {value: valueToSet, error: conversionResult.error});
                finalValue = valueToSet; // Use original if conversion fails
                finalUnit = unitToSet; // And original unit
            }
        }
        
        // Sanitize before setting
        const sanitizedValue = (finalValue === null || finalValue === undefined) ? '' : S ? S.escapeHTML(String(finalValue)) : String(finalValue);

        const wasSyncing = this._isSyncUpdateInProgress;
        this._isSyncUpdateInProgress = true; // Prevent self-triggering sharedField:updated

        try {
            if (element.type === 'checkbox') {
                element.checked = sanitizedValue === 'true' || sanitizedValue === true || sanitizedValue === 'on';
            } else if (element.type === 'radio') {
                // This is for a group, find the specific radio
                const radioToSelect = this.form.querySelector(`input[name="${formFieldName}"][value="${sanitizedValue}"]`);
                if (radioToSelect) radioToSelect.checked = true;
            } else {
                element.value = sanitizedValue;
            }

            if (targetUnitElement && finalUnit) {
                targetUnitElement.value = finalUnit;
                 targetUnitElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            }
            
            // Trigger events to update UI and allow other listeners to react
            element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            
            this._checkDirtyState(); // Update dirty state after programmatic change if needed
            this._log('debug', `Populated field "${formFieldName}" with value "${sanitizedValue}" (unit: ${finalUnit || 'N/A'}).`, {formId: this.form.id});

        } catch (error) {
            this._log('error', `Error setting field value for "${formFieldName}".`, {error});
        } finally {
            // Restore original sync state only if this call initiated the sync block
            if (!wasSyncing) {
                 Promise.resolve().then(() => { this._isSyncUpdateInProgress = false; });
            }
        }
    }


    populateForm(data) { /* ... (adapted to use populateField for shared field awareness) ... */
        this._isSyncUpdateInProgress = true; // Batch update, treat as sync
        try {
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    let mappingConfig = null;
                    let canonicalKey = null;
                    // Check if this key is a direct formFieldName in sharedFieldMappings
                    for (const cfn in this.options.sharedFieldMappings) {
                        if (this.options.sharedFieldMappings[cfn].formFieldName === key) {
                            mappingConfig = this.options.sharedFieldMappings[cfn];
                            canonicalKey = cfn;
                            break;
                        }
                    }

                    if (mappingConfig && canonicalKey) {
                        // If it's a shared field, use populateField to handle potential unit parts
                        const value = data[key];
                        const unit = mappingConfig.unitFieldName ? data[mappingConfig.unitFieldName] : undefined;
                        this.populateField(key, value, unit, mappingConfig.unitFieldName, mappingConfig.canonicalUnit, mappingConfig.type);
                    } else {
                        // Not a primary value field of a shared mapping, or not shared, populate directly
                        const element = this.form.elements[key];
                        if (element) {
                            if (element instanceof RadioNodeList || (element instanceof NodeList && element[0]?.type === 'radio')) {
                                const list = (element instanceof RadioNodeList) ? Array.from(element) : Array.from(element);
                                list.forEach(radio => { radio.checked = (radio.value === String(data[key])); });
                            } else if (element.type === 'checkbox') {
                                element.checked = data[key] === 'on' || data[key] === true;
                            } else if (element.tagName === 'SELECT' && element.multiple) {
                                const values = Array.isArray(data[key]) ? data[key].map(String) : [String(data[key])];
                                Array.from(element.options).forEach(opt => { opt.selected = values.includes(opt.value); });
                            } else {
                                element.value = data[key];
                            }
                            element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                        }
                    }
                }
            }
        } catch (error) {
            this._log('error', 'Error during populateForm', {error});
        } finally {
            Promise.resolve().then(() => { this._isSyncUpdateInProgress = false; });
        }
        this.resetDirtyState(true);
        this._log('info', 'Form populated with data.', { formId: this.form.id });
    }

    displayErrors(errors) { /* ... (same as v1.2.1) ... */
        this.clearAllErrors();
        Object.keys(errors).forEach(fieldName => {
            const errorElement = this.form.querySelector(`#${this.form.id}-${fieldName}-validation`) || this.form.querySelector(`[data-validation-for="${fieldName}"]`); // More flexible selector
            const inputElement = this.form.elements[fieldName];
            if (errorElement) { errorElement.textContent = errors[fieldName]; errorElement.style.display = 'block'; inputElement?.classList.add('is-invalid'); }
            else if (fieldName === '_form') { const formError = this.form.querySelector('.form-level-error-message'); if (formError) { formError.textContent = errors[fieldName]; formError.style.display = 'block'; } else { this._log('warn', `No form-wide error display for: ${errors[fieldName]}`); alert(`Form Error: ${errors[fieldName]}`); } }
            else { this._log('warn', `No validation element for field: ${fieldName}`); }
        });
    }
    clearError(fieldName) { /* ... (same as v1.2.1) ... */
        const errorElement = this.form.querySelector(`#${this.form.id}-${fieldName}-validation`) || this.form.querySelector(`[data-validation-for="${fieldName}"]`);
        const inputElement = this.form.elements[fieldName];
        if (errorElement) { errorElement.textContent = ''; errorElement.style.display = 'none'; inputElement?.classList.remove('is-invalid'); }
    }
    clearAllErrors() { /* ... (same as v1.2.1) ... */
        this.form.querySelectorAll('.error-message, .validation-error').forEach(el => { el.textContent = ''; el.style.display = 'none'; }); // Broader class match
        this.form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        const formError = this.form.querySelector('.form-level-error-message'); if (formError) { formError.textContent = ''; formError.style.display = 'none'; }
    }

    _log(level, message, data) { /* ... (same as v1.2.1) ... */
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `FormHandler (${this.form.id || 'N/A'}): ${message}`;
        if (level === 'error' && logger?.handleError) { logger.handleError(data?.error || message, 'FormHandler', 'error', data); }
        else if (logger?.log) { logger.log(level, logMessage, data); }
        else { console[level]?.(logMessage, data); }
    }
}

// export default FormHandler;
