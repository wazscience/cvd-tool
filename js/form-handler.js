/**
 * Form Handler Module
 * Provides comprehensive form handling functionality including validation,
 * submission, state management, and accessibility features
 */
const formHandler = (function() {
    // Configuration
    const config = {
        debounceDelay: 300,
        validationRealtime: true,
        scrollToError: true,
        scrollOffset: 20,
        saveFormState: true,
        storageKey: 'formState_',
        maxAutoSaveInterval: 30000, // 30 seconds
        disableSubmitOnValidation: true
    };
    
    // State tracking
    const formStates = new Map();
    const autoSaveTimers = new Map();
    
    /**
     * Initialize form with event handlers and validation
     * @param {string} formId - ID of the form element
     * @param {Object} options - Configuration options
     */
    function initializeForm(formId, options = {}) {
        const form = document.getElementById(formId);
        if (!form) {
            console.error(`Form with ID ${formId} not found`);
            return;
        }
        
        // Merge options with defaults
        const formConfig = { ...config, ...options };
        
        // Initialize form state
        formStates.set(formId, {
            isValid: false,
            isDirty: false,
            fields: new Map(),
            config: formConfig
        });
        
        // Setup event listeners
        setupFormListeners(form, formConfig);
        
        // Setup field validators
        setupFieldValidators(form, formConfig);
        
        // Restore saved state if enabled
        if (formConfig.saveFormState) {
            restoreFormState(form, formConfig);
            setupAutoSave(form, formConfig);
        }
        
        // Setup keyboard navigation
        setupKeyboardNavigation(form);
        
        // Initialize accessibility features
        initializeAccessibility(form);
    }
    
    /**
     * Setup form event listeners
     * @private
     */
    function setupFormListeners(form, config) {
        // Prevent default form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit(form, config);
        });
        
        // Track form changes
        form.addEventListener('change', (e) => {
            handleFieldChange(form, e.target, config);
        });
        
        // Real-time validation
        if (config.validationRealtime) {
            form.addEventListener('input', debounce((e) => {
                handleFieldInput(form, e.target, config);
            }, config.debounceDelay));
        }
        
        // Handle form reset
        form.addEventListener('reset', (e) => {
            handleFormReset(form, config);
        });
    }
    
    /**
     * Setup individual field validators
     * @private
     */
    function setupFieldValidators(form, config) {
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            // Add validation attributes if not present
            enhanceFieldValidation(field);
            
            // Setup blur validation
            field.addEventListener('blur', () => {
                validateField(field, config);
            });
        });
    }
    
    /**
     * Enhance field validation attributes
     * @private
     */
    function enhanceFieldValidation(field) {
        // Add aria-required for required fields
        if (field.required) {
            field.setAttribute('aria-required', 'true');
        }
        
        // Add pattern for specific input types
        if (field.type === 'email' && !field.pattern) {
            field.pattern = '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$';
        }
        
        if (field.type === 'tel' && !field.pattern) {
            field.pattern = '[0-9]{3}-[0-9]{3}-[0-9]{4}';
        }
        
        // Add inputmode for better mobile experience
        if (field.type === 'number') {
            field.setAttribute('inputmode', 'numeric');
        }
    }
    
    /**
     * Handle form submission
     * @private
     */
    async function handleFormSubmit(form, config) {
        const formState = formStates.get(form.id);
        
        // Show loading indicator if available
        if (window.loadingIndicator) {
            window.loadingIndicator.show('Processing...');
        }
        
        try {
            // Validate entire form
            const isValid = validateForm(form, config);
            
            if (!isValid) {
                // Show validation errors
                if (window.enhancedDisplay) {
                    window.enhancedDisplay.showError('Please correct the errors in the form');
                }
                
                // Scroll to first error if enabled
                if (config.scrollToError) {
                    scrollToFirstError(form, config);
                }
                
                return;
            }
            
            // Get form data
            const formData = getFormData(form);
            
            // Call submit handler if provided
            if (config.onSubmit) {
                await config.onSubmit(formData, form);
            }
            
            // Clear form state if successful
            if (config.clearOnSuccess) {
                clearFormState(form.id);
            }
            
            // Show success message
            if (window.enhancedDisplay) {
                window.enhancedDisplay.showSuccess('Form submitted successfully');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            
            if (window.enhancedDisplay) {
                window.enhancedDisplay.showError('An error occurred while submitting the form');
            }
        } finally {
            // Hide loading indicator
            if (window.loadingIndicator) {
                window.loadingIndicator.hide();
            }
        }
    }
    
    /**
     * Validate entire form
     * @private
     */
    function validateForm(form, config) {
        let isValid = true;
        const fields = form.querySelectorAll('input, select, textarea');
        
        fields.forEach(field => {
            if (!validateField(field, config)) {
                isValid = false;
            }
        });
        
        // Update form state
        const formState = formStates.get(form.id);
        if (formState) {
            formState.isValid = isValid;
        }
        
        // Update submit button state
        if (config.disableSubmitOnValidation) {
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = !isValid;
            }
        }
        
        return isValid;
    }
    
    /**
     * Validate individual field
     * @private
     */
    function validateField(field, config) {
        let isValid = true;
        let errorMessage = '';
        
        // Required field validation
        if (field.required && !field.value.trim()) {
            isValid = false;
            errorMessage = `${getFieldLabel(field)} is required`;
        }
        
        // Pattern validation
        if (field.pattern && field.value) {
            const pattern = new RegExp(field.pattern);
            if (!pattern.test(field.value)) {
                isValid = false;
                errorMessage = `Please enter a valid ${getFieldLabel(field).toLowerCase()}`;
            }
        }
        
        // Min/max validation for numbers
        if (field.type === 'number' && field.value) {
            const value = parseFloat(field.value);
            if (field.min && value < parseFloat(field.min)) {
                isValid = false;
                errorMessage = `${getFieldLabel(field)} must be at least ${field.min}`;
            }
            if (field.max && value > parseFloat(field.max)) {
                isValid = false;
                errorMessage = `${getFieldLabel(field)} must be at most ${field.max}`;
            }
        }
        
        // Custom validation function
        if (config.validators && config.validators[field.name]) {
            const customResult = config.validators[field.name](field.value, field);
            if (customResult !== true) {
                isValid = false;
                errorMessage = typeof customResult === 'string' ? customResult : errorMessage;
            }
        }
        
        // Update field state
        updateFieldState(field, isValid, errorMessage);
        
        return isValid;
    }
    
    /**
     * Update field state and display feedback
     * @private
     */
    function updateFieldState(field, isValid, errorMessage) {
        const fieldState = {
            isValid,
            errorMessage,
            value: field.value
        };
        
        // Update form state
        const form = field.closest('form');
        if (form) {
            const formState = formStates.get(form.id);
            if (formState) {
                formState.fields.set(field.name || field.id, fieldState);
            }
        }
        
        // Display feedback
        if (window.enhancedDisplay) {
            if (!isValid) {
                window.enhancedDisplay.showFieldFeedback(field, errorMessage, 'error');
                field.classList.add('error');
            } else {
                window.enhancedDisplay.clearFieldFeedback(field);
                field.classList.remove('error');
            }
        }
    }
    
    /**
     * Handle field input (real-time validation)
     * @private
     */
    function handleFieldInput(form, field, config) {
        if (config.validationRealtime) {
            validateField(field, config);
        }
        
        // Mark form as dirty
        const formState = formStates.get(form.id);
        if (formState) {
            formState.isDirty = true;
        }
    }
    
    /**
     * Handle field change
     * @private
     */
    function handleFieldChange(form, field, config) {
        validateField(field, config);
        
        // Update form state
        const formState = formStates.get(form.id);
        if (formState) {
            formState.isDirty = true;
        }
        
        // Save form state if enabled
        if (config.saveFormState) {
            saveFormState(form, config);
        }
    }
    
    /**
     * Handle form reset
     * @private
     */
    function handleFormReset(form, config) {
        // Clear all field states
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            updateFieldState(field, true, '');
        });
        
        // Reset form state
        const formState = formStates.get(form.id);
        if (formState) {
            formState.isValid = false;
            formState.isDirty = false;
            formState.fields.clear();
        }
        
        // Clear saved state
        if (config.saveFormState) {
            clearFormState(form.id);
        }
    }
    
    /**
     * Save form state to storage
     * @private
     */
    function saveFormState(form, config) {
        const formData = getFormData(form);
        const storageKey = config.storageKey + form.id;
        
        try {
            if (window.secureStorage) {
                window.secureStorage.setItem(storageKey, formData);
            } else {
                localStorage.setItem(storageKey, JSON.stringify(formData));
            }
        } catch (error) {
            console.warn('Failed to save form state:', error);
        }
    }
    
    /**
     * Restore form state from storage
     * @private
     */
    function restoreFormState(form, config) {
        const storageKey = config.storageKey + form.id;
        let savedData = null;
        
        try {
            if (window.secureStorage) {
                savedData = window.secureStorage.getItem(storageKey);
            } else {
                const data = localStorage.getItem(storageKey);
                savedData = data ? JSON.parse(data) : null;
            }
        } catch (error) {
            console.warn('Failed to restore form state:', error);
        }
        
        if (savedData) {
            setFormData(form, savedData);
        }
    }
    
    /**
     * Clear saved form state
     * @private
     */
    function clearFormState(formId) {
        const storageKey = config.storageKey + formId;
        
        try {
            if (window.secureStorage) {
                window.secureStorage.removeItem(storageKey);
            } else {
                localStorage.removeItem(storageKey);
            }
        } catch (error) {
            console.warn('Failed to clear form state:', error);
        }
    }
    
    /**
     * Setup auto-save functionality
     * @private
     */
    function setupAutoSave(form, config) {
        // Clear existing timer
        if (autoSaveTimers.has(form.id)) {
            clearInterval(autoSaveTimers.get(form.id));
        }
        
        // Set up new timer
        const timer = setInterval(() => {
            const formState = formStates.get(form.id);
            if (formState && formState.isDirty) {
                saveFormState(form, config);
                formState.isDirty = false;
            }
        }, config.maxAutoSaveInterval);
        
        autoSaveTimers.set(form.id, timer);
    }
    
    /**
     * Get form data as object
     * @private
     */
    function getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            // Handle multiple values (checkboxes, multi-selects)
            if (data[key]) {
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        return data;
    }
    
    /**
     * Set form data from object
     * @private
     */
    function setFormData(form, data) {
        Object.keys(data).forEach(key => {
            const field = form.elements[key];
            if (field) {
                if (field.type === 'checkbox' || field.type === 'radio') {
                    field.checked = (field.value === data[key]) || (Array.isArray(data[key]) && data[key].includes(field.value));
                } else {
                    field.value = data[key];
                }
            }
        });
    }
    
    /**
     * Get field label
     * @private
     */
    function getFieldLabel(field) {
        // Try to find associated label
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (label) {
            return label.textContent.trim();
        }
        
        // Use placeholder or name as fallback
        return field.placeholder || field.name || field.id || 'Field';
    }
    
    /**
     * Scroll to first error field
     * @private
     */
    function scrollToFirstError(form, config) {
        const errorField = form.querySelector('.error');
        if (errorField && window.enhancedDisplay) {
            window.enhancedDisplay.scrollToElement(errorField, {
                offset: config.scrollOffset
            });
        }
    }
    
    /**
     * Setup keyboard navigation
     * @private
     */
    function setupKeyboardNavigation(form) {
        form.addEventListener('keydown', (e) => {
            // Enter key moves to next field
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                focusNextField(form, e.target);
            }
            
            // Escape key clears current field
            if (e.key === 'Escape') {
                e.target.value = '';
                e.target.dispatchEvent(new Event('input'));
            }
        });
    }
    
    /**
     * Focus next field in form
     * @private
     */
    function focusNextField(form, currentField) {
        const fields = Array.from(form.querySelectorAll('input, select, textarea, button'));
        const currentIndex = fields.indexOf(currentField);
        
        if (currentIndex > -1 && currentIndex < fields.length - 1) {
            fields[currentIndex + 1].focus();
        }
    }
    
    /**
     * Initialize accessibility features
     * @private
     */
    function initializeAccessibility(form) {
        // Add form role
        form.setAttribute('role', 'form');
        
        // Add aria-labels to fields without labels
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            if (!field.getAttribute('aria-label') && !document.querySelector(`label[for="${field.id}"]`)) {
                field.setAttribute('aria-label', getFieldLabel(field));
            }
        });
    }
    
    /**
     * Debounce function
     * @private
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Public API
    return {
        initializeForm,
        validateForm,
        validateField,
        getFormData,
        setFormData,
        clearFormState,
        handleFormSubmit: (formId, options, callback) => {
            const form = document.getElementById(formId);
            if (form) {
                options.onSubmit = callback;
                initializeForm(formId, options);
            }
        }
    };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = formHandler;
} else {
    window.formHandler = formHandler;
}