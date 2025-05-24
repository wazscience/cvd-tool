/**
 * Combined View Manager for CVD Risk Toolkit
 * Manages the combined FRS and QRISK3 risk assessment view and functionality.
 * 
 * Path: js/utils/combined-view-manager.js
 * 
 * @requires js/utils/event-bus.js
 * @requires js/utils/error-detection-system.js
 * @requires js/utils/input-sanitizer.js
 * @requires js/utils/security-validation.js
 * @requires js/utils/risk-visualization.js
 * @requires js/calculations/framingham-algorithm.js
 * @requires js/calculations/qrisk3-algorithm.js
 * @requires js/calculations/treatment-recommendations.js
 */

// Use strict mode to catch common coding errors
'use strict';

/**
 * CombinedViewManager class - Manages the combined risk calculator view
 */
class CombinedViewManager {
    constructor() {
        // Singleton pattern
        if (CombinedViewManager.instance) {
            return CombinedViewManager.instance;
        }
        
        CombinedViewManager.instance = this;
        
        // Initialize properties
        this.initialized = false;
        this.frsResults = null;
        this.qriskResults = null;
        this.combinedResults = null;
        this.visualizationCreated = false;
        this.preferredCalculator = 'combined'; // 'frs', 'qrisk', or 'combined'
        this.debugMode = false;
        
        // Initialize module
        this.init();
    }
    
    /**
     * Initialize the module
     * @private
     */
    init() {
        try {
            // Initialize dependencies
            this.initializeDependencies();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize UI components
            this.initializeUI();
            
            this.initialized = true;
            
            // Log initialization success in debug mode
            if (this.debugMode) {
                console.log('Combined View Manager initialized successfully');
            }
            
            // Publish initialization complete event
            this.eventBus.publish('combinedView:initialized', { success: true });
        } catch (error) {
            console.error('Failed to initialize Combined View Manager:', error);
            
            // Report error
            if (this.errorSystem) {
                this.errorSystem.reportError({
                    component: 'CombinedViewManager',
                    method: 'init',
                    error: error
                });
            }
            
            // Publish initialization failed event
            if (this.eventBus) {
                this.eventBus.publish('combinedView:initialized', { 
                    success: false,
                    error: error.message
                });
            }
        }
    }
    
    /**
     * Initialize dependencies safely
     * @private
     */
    initializeDependencies() {
        // Initialize event bus with fallback
        this.eventBus = window.eventBus || {
            subscribe: () => console.warn('EventBus not available'),
            publish: () => console.warn('EventBus not available')
        };
        
        // Initialize error detection system with fallback
        this.errorSystem = window.errorDetectionSystem || {
            reportError: (err) => console.error('Error detection system not available:', err)
        };
        
        // Initialize input sanitizer with fallback
        this.inputSanitizer = window.inputSanitizer || {
            sanitizeForm: () => true,
            validateAndSanitizeInput: () => true
        };
        
        // Initialize risk visualization with fallback
        this.riskVisualization = window.riskVisualization || {
            createRiskMeter: () => console.warn('Risk visualization not available'),
            createComparisonChart: () => console.warn('Risk visualization not available')
        };
        
        // Initialize calculators with fallbacks
        this.framinghamCalculator = window.framinghamCalculator || {
            calculateRisk: () => ({ success: false, error: 'Framingham calculator not available' })
        };
        
        this.qrisk3Calculator = window.qrisk3Calculator || {
            calculateRisk: () => ({ success: false, error: 'QRISK3 calculator not available' })
        };
        
        // Initialize treatment recommendations with fallback
        this.treatmentRecommendations = window.treatmentRecommendations || {
            processCombinedResults: () => console.warn('Treatment recommendations not available')
        };
        
        // Initialize memory manager with fallback
        this.memoryManager = window.memoryManager || {
            store: () => console.warn('Memory manager not available'),
            retrieve: () => null
        };
    }
    
    /**
     * Set up event listeners
     * @private
     */
    setupEventListeners() {
        // Listen for risk calculation completions
        this.eventBus.subscribe('frs:calculationComplete', this.handleFrsResult.bind(this));
        this.eventBus.subscribe('qrisk:calculationComplete', this.handleQriskResult.bind(this));
        
        // Listen for UI events
        document.addEventListener('DOMContentLoaded', () => {
            // Refresh UI on DOM load if results exist in memory
            this.checkForExistingResults();
            
            // Run comparison button
            const runComparisonButton = document.getElementById('run-comparison');
            if (runComparisonButton) {
                runComparisonButton.addEventListener('click', this.runComparison.bind(this));
            }
            
            // Calculator preference radio buttons
            const calculatorRadios = document.querySelectorAll('input[name="preferred-calculator"]');
            calculatorRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.preferredCalculator = e.target.value;
                    // If we have results, update visualization based on new preference
                    if (this.frsResults && this.qriskResults) {
                        this.updateVisualization();
                    }
                });
            });
            
            // Copy data buttons
            const copyToFrsButton = document.getElementById('copy-to-frs');
            const copyToQriskButton = document.getElementById('copy-to-qrisk');
            
            if (copyToFrsButton) {
                copyToFrsButton.addEventListener('click', () => this.copyDataBetweenCalculators('combined-to-frs'));
            }
            
            if (copyToQriskButton) {
                copyToQriskButton.addEventListener('click', () => this.copyDataBetweenCalculators('combined-to-qrisk'));
            }
        });
    }
    
    /**
     * Initialize UI components
     * @private
     */
    initializeUI() {
        // Update comparison button state
        this.updateComparisonButtonState();
        
        // Add data persistence for combined form
        const combinedForm = document.getElementById('combined-form');
        if (combinedForm) {
            // Load saved data if available
            const savedData = this.memoryManager.retrieve('combinedFormData');
            if (savedData) {
                this.populateForm(combinedForm, savedData);
            }
            
            // Set up form submission
            combinedForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCombinedFormSubmit(combinedForm);
            });
            
            // Set up form reset
            combinedForm.addEventListener('reset', () => {
                setTimeout(() => {
                    // Clear form data from memory
                    this.memoryManager.store('combinedFormData', null);
                }, 0);
            });
            
            // Set up auto-save
            const formInputs = combinedForm.querySelectorAll('input, select');
            formInputs.forEach(input => {
                input.addEventListener('change', () => {
                    const formData = this.getFormData(combinedForm);
                    this.memoryManager.store('combinedFormData', formData);
                });
            });
        }
    }
    
    /**
     * Check for existing results in memory manager
     * @private
     */
    checkForExistingResults() {
        try {
            // Check for stored results
            const frsResults = this.memoryManager.retrieve('lastFrsResult');
            const qriskResults = this.memoryManager.retrieve('lastQriskResult');
            
            if (frsResults && frsResults.success) {
                this.handleFrsResult({ result: frsResults });
            }
            
            if (qriskResults && qriskResults.success) {
                this.handleQriskResult({ result: qriskResults });
            }
            
            // If both results exist, trigger comparison view
            if (frsResults && qriskResults && frsResults.success && qriskResults.success) {
                this.updateComparisonButtonState();
                
                // Auto run comparison if on the comparison tab
                const comparisonTab = document.getElementById('comparison-tab');
                if (comparisonTab && comparisonTab.classList.contains('active')) {
                    this.runComparison();
                }
            }
        } catch (error) {
            this.errorSystem.reportError({
                component: 'CombinedViewManager',
                method: 'checkForExistingResults',
                error: error
            });
        }
    }
    
    /**
     * Handle Framingham Risk Score calculation result
     * @param {Object} data - Event data containing result
     * @private
     */
    handleFrsResult(data) {
        try {
            if (!data || !data.result || !data.result.success) {
                throw new Error('Invalid FRS result');
            }
            
            // Store FRS result
            this.frsResults = data.result;
            
            // Update combined view if both results available
            if (this.qriskResults) {
                this.updateComparisonButtonState();
            }
            
            // Store in memory manager for persistence
            this.memoryManager.store('lastFrsResult', this.frsResults);
            
            // Update FRS status indicator
            this.updateFrsStatusIndicator(true);
        } catch (error) {
            this.errorSystem.reportError({
                component: 'CombinedViewManager',
                method: 'handleFrsResult',
                error: error,
                data: data
            });
        }
    }
    
    /**
     * Handle QRISK3 calculation result
     * @param {Object} data - Event data containing result
     * @private
     */
    handleQriskResult(data) {
        try {
            if (!data || !data.result || !data.result.success) {
                throw new Error('Invalid QRISK3 result');
            }
            
            // Store QRISK3 result
            this.qriskResults = data.result;
            
            // Update combined view if both results available
            if (this.frsResults) {
                this.updateComparisonButtonState();
            }
            
            // Store in memory manager for persistence
            this.memoryManager.store('lastQriskResult', this.qriskResults);
            
            // Update QRISK status indicator
            this.updateQriskStatusIndicator(true);
        } catch (error) {
            this.errorSystem.reportError({
                component: 'CombinedViewManager',
                method: 'handleQriskResult',
                error: error,
                data: data
            });
        }
    }
    
    /**
     * Update FRS status indicator
     * @param {boolean} isComplete - Whether calculation is complete
     * @private
     */
    updateFrsStatusIndicator(isComplete) {
        const frsStatus = document.getElementById('frs-status');
        if (frsStatus) {
            frsStatus.textContent = isComplete ? 'Calculated' : 'Not calculated';
            frsStatus.classList.remove('incomplete', 'complete');
            
            if (isComplete) {
                frsStatus.classList.add('complete');
            } else {
                frsStatus.classList.add('incomplete');
            }
        }
    }
    
    /**
     * Update QRISK status indicator
     * @param {boolean} isComplete - Whether calculation is complete
     * @private
     */
    updateQriskStatusIndicator(isComplete) {
        const qriskStatus = document.getElementById('qrisk-status');
        if (qriskStatus) {
            qriskStatus.textContent = isComplete ? 'Calculated' : 'Not calculated';
            qriskStatus.classList.remove('incomplete', 'complete');
            
            if (isComplete) {
                qriskStatus.classList.add('complete');
            } else {
                qriskStatus.classList.add('incomplete');
            }
        }
    }
    
    /**
     * Update comparison button state
     * @private
     */
    updateComparisonButtonState() {
        const comparisonButton = document.getElementById('run-comparison');
        if (comparisonButton) {
            const bothCalculated = this.frsResults && this.qriskResults;
            comparisonButton.disabled = !bothCalculated;
            
            if (bothCalculated) {
                comparisonButton.classList.add('button-enabled');
                comparisonButton.title = 'Compare risk calculator results';
            } else {
                comparisonButton.classList.remove('button-enabled');
                comparisonButton.title = 'Calculate both FRS and QRISK3 first';
            }
        }
    }
    
    /**
     * Handle combined form submission
     * @param {HTMLFormElement} form - The combined form element
     * @private
     */
    handleCombinedFormSubmit(form) {
        try {
            // Validate form
            const isValid = this.inputSanitizer.sanitizeForm(form);
            if (!isValid) {
                const errorMsg = document.getElementById('combined-form-error');
                if (errorMsg) {
                    errorMsg.textContent = 'Please correct the errors in the form.';
                    errorMsg.style.display = 'block';
                }
                return;
            }
            
            // Get form data
            const formData = this.getFormData(form);
            
            // Store form data for persistence
            this.memoryManager.store('combinedFormData', formData);
            
            // Run both calculations
            this.runBothCalculators(formData);
        } catch (error) {
            this.errorSystem.reportError({
                component: 'CombinedViewManager',
                method: 'handleCombinedFormSubmit',
                error: error
            });
            
            // Show error message to user
            const errorMsg = document.getElementById('combined-form-error');
            if (errorMsg) {
                errorMsg.textContent = 'An error occurred while processing your data. Please try again.';
                errorMsg.style.display = 'block';
            }
        }
    }
    
    /**
     * Get form data as an object
     * @param {HTMLFormElement} form - Form element
     * @returns {Object} Form data object
     * @private
     */
    getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        // Convert FormData to object
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }
    
    /**
     * Populate form with saved data
     * @param {HTMLFormElement} form - Form to populate
     * @param {Object} data - Data to populate with
     * @private
     */
    populateForm(form, data) {
        if (!form || !data) return;
        
        // Iterate through form elements
        Array.from(form.elements).forEach(element => {
            const name = element.name;
            if (!name || !data.hasOwnProperty(name)) return;
            
            // Handle different input types
            if (element.type === 'checkbox') {
                element.checked = Boolean(data[name]);
            } else if (element.type === 'radio') {
                element.checked = element.value === data[name];
            } else {
                element.value = data[name];
            }
            
            // Trigger change event to update calculated fields (like BMI)
            const event = new Event('change', { bubbles: true });
            element.dispatchEvent(event);
        });
    }
    
    /**
     * Run both FRS and QRISK3 calculators with the same data
     * @param {Object} formData - Form data to use for calculations
     * @private
     */
    runBothCalculators(formData) {
        try {
            // Show loading indicators
            const loadingIndicator = document.getElementById('combined-loading');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'block';
            }
            
            // Prepare data for FRS
            const frsData = this.prepareDataForFrs(formData);
            
            // Prepare data for QRISK3
            const qriskData = this.prepareDataForQrisk(formData);
            
            // Calculate FRS
            const frsResult = this.framinghamCalculator.calculateRisk(frsData);
            
            // Calculate QRISK3
            const qriskResult = this.qrisk3Calculator.calculateRisk(qriskData);
            
            // Store results
            if (frsResult.success) {
                this.frsResults = frsResult;
                this.memoryManager.store('lastFrsResult', frsResult);
                this.updateFrsStatusIndicator(true);
                
                // Publish FRS result
                this.eventBus.publish('frs:calculationComplete', { result: frsResult });
            }
            
            if (qriskResult.success) {
                this.qriskResults = qriskResult;
                this.memoryManager.store('lastQriskResult', qriskResult);
                this.updateQriskStatusIndicator(true);
                
                // Publish QRISK3 result
                this.eventBus.publish('qrisk:calculationComplete', { result: qriskResult });
            }
            
            // Hide loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // Update comparison button
            this.updateComparisonButtonState();
            
            // Run comparison automatically
            if (frsResult.success && qriskResult.success) {
                this.runComparison();
            }
        } catch (error) {
            // Hide loading indicator
            const loadingIndicator = document.getElementById('combined-loading');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            this.errorSystem.reportError({
                component: 'CombinedViewManager',
                method: 'runBothCalculators',
                error: error,
                formData: formData
            });
            
            // Show error message
            const errorMsg = document.getElementById('combined-form-error');
            if (errorMsg) {
                errorMsg.textContent = 'Error calculating risk scores. Please check your inputs and try again.';
                errorMsg.style.display = 'block';
            }
        }
    }
    
    /**
     * Prepare data for Framingham Risk Score calculator
     * @param {Object} formData - Combined form data
     * @returns {Object} Data formatted for FRS calculator
     * @private
     */
    prepareDataForFrs(formData) {
        // Create base object
        const frsData = {
            age: parseInt(formData['combined-age']),
            sex: formData['combined-sex'],
            sbp: parseInt(formData['combined-sbp']),
            cholesterol: parseFloat(formData['combined-total-chol']),
            hdl: parseFloat(formData['combined-hdl']),
            smoking: formData['combined-smoker'] === 'yes',
            diabetes: formData['combined-diabetes'] === 'yes',
            bpTreated: formData['combined-bp-treatment'] === 'yes'
        };
        
        // Handle unit conversions
        const cholUnit = formData['combined-total-chol-unit'];
        const hdlUnit = formData['combined-hdl-unit'];
        
        // Convert to mmol/L if needed
        if (cholUnit === 'mg/dL') {
            frsData.cholesterol = frsData.cholesterol / 38.67;
        }
        
        if (hdlUnit === 'mg/dL') {
            frsData.hdl = frsData.hdl / 38.67;
        }
        
        // Add Lp(a) if available
        if (formData['combined-lpa'] && formData['combined-lpa'] !== '') {
            frsData.lpa = parseFloat(formData['combined-lpa']);
            
            // Convert to mg/dL if needed
            if (formData['combined-lpa-unit'] === 'nmol/L') {
                frsData.lpa = frsData.lpa / 2.5;
            }
            
            // Determine Lp(a) modifier
            if (frsData.lpa < 30) {
                frsData.lpaModifier = 'low';
            } else if (frsData.lpa < 50) {
                frsData.lpaModifier = 'moderate';
            } else if (frsData.lpa < 100) {
                frsData.lpaModifier = 'high';
            } else {
                frsData.lpaModifier = 'very-high';
            }
        }
        
        return frsData;
    }
    
    /**
     * Prepare data for QRISK3 calculator
     * @param {Object} formData - Combined form data
     * @returns {Object} Data formatted for QRISK3 calculator
     * @private
     */
    prepareDataForQrisk(formData) {
        // Create base object
        const qriskData = {
            age: parseInt(formData['combined-age']),
            sex: formData['combined-sex'],
            ethnicity: formData['combined-ethnicity'] || 'WHITE_OR_NOT_STATED',
            sbp: parseInt(formData['combined-sbp']),
            bmi: parseFloat(formData['combined-bmi']),
            smoking: this.convertSmokerStatus(formData['combined-smoker']),
            diabetes: this.convertDiabetesStatus(formData['combined-diabetes']),
            treatedHyp: formData['combined-bp-treatment'] === 'yes',
            cholHDLRatio: parseFloat(formData['combined-chol-ratio'])
        };
        
        // If BMI is not available, calculate from height and weight
        if (!qriskData.bmi && formData['combined-height'] && formData['combined-weight']) {
            const height = parseFloat(formData['combined-height']);
            const weight = parseFloat(formData['combined-weight']);
            
            // Convert units if needed
            let heightM = height;
            let weightKg = weight;
            
            if (formData['combined-height-unit'] === 'in') {
                heightM = height * 2.54 / 100; // inches to meters
            } else {
                heightM = height / 100; // cm to meters
            }
            
            if (formData['combined-weight-unit'] === 'lb') {
                weightKg = weight * 0.453592; // pounds to kg
            }
            
            qriskData.bmi = weightKg / (heightM * heightM);
        }
        
        // Add additional QRISK3 factors
        const additionalFactors = [
            'family', 'af', 'renal', 'migraines', 'ra', 'sle', 
            'psychosis', 'atypicalAntipsy', 'steroids', 'erectileDys'
        ];
        
        additionalFactors.forEach(factor => {
            const formField = 'combined-' + factor.replace(/([A-Z])/g, '-$1').toLowerCase();
            qriskData[factor] = formData[formField] === 'yes' ? 1 : 0;
        });
        
        // Add Lp(a) if available
        if (formData['combined-lpa'] && formData['combined-lpa'] !== '') {
            qriskData.lpa = parseFloat(formData['combined-lpa']);
            
            // Convert to mg/dL if needed
            if (formData['combined-lpa-unit'] === 'nmol/L') {
                qriskData.lpa = qriskData.lpa / 2.5;
            }
            
            // Determine Lp(a) modifier
            if (qriskData.lpa < 30) {
                qriskData.lpaModifier = 'low';
            } else if (qriskData.lpa < 50) {
                qriskData.lpaModifier = 'moderate';
            } else if (qriskData.lpa < 100) {
                qriskData.lpaModifier = 'high';
            } else {
                qriskData.lpaModifier = 'very-high';
            }
        }
        
        return qriskData;
    }
    
    /**
     * Convert smoker status from yes/no to QRISK3 format
     * @param {string} status - Yes/no smoker status
     * @returns {string} QRISK3 format smoker status
     * @private
     */
    convertSmokerStatus(status) {
        if (status === 'yes') {
            return 'light'; // Default to light smoker if just yes/no is available
        } else if (status === 'ex') {
            return 'ex';
        } else {
            return 'non';
        }
    }
    
    /**
     * Convert diabetes status from yes/no to QRISK3 format
     * @param {string} status - Yes/no diabetes status
     * @returns {string} QRISK3 format diabetes status
     * @private
     */
    convertDiabetesStatus(status) {
        if (status === 'yes') {
            return 'type2'; // Default to type 2 if just yes/no is available
        } else {
            return 'none';
        }
    }
    
    /**
     * Run comparison of FRS and QRISK3 results
     * @public
     */
    runComparison() {
        try {
            // Verify both results are available
            if (!this.frsResults || !this.qriskResults) {
                throw new Error('Both FRS and QRISK3 results are required for comparison');
            }
            
            // Show loading indicator
            const loadingIndicator = document.getElementById('comparison-loading');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'block';
            }
            
            // Extract risk scores
            const frsRisk = this.frsResults.risk;
            const qriskRisk = this.qriskResults.risk;
            
            // Calculate differences
            const absoluteDifference = Math.abs(frsRisk - qriskRisk).toFixed(1);
            const relativeDifference = frsRisk > 0 
                ? Math.round((Math.abs(frsRisk - qriskRisk) / frsRisk) * 100) 
                : 0;
            
            // Determine recommended calculator
            const recommended = this.determineRecommendedCalculator();
            
            // Generate explanation for differences
            const explanation = this.explainRiskDifferences();
            
            // Store combined result
            this.combinedResults = {
                frs: this.frsResults,
                qrisk: this.qriskResults,
                differences: {
                    absolute: absoluteDifference,
                    relative: relativeDifference
                },
                explanation: explanation,
                recommendation: recommended
            };
            
            // Store in memory manager
            this.memoryManager.store('lastCombinedResult', this.combinedResults);
            
            // Send to treatment recommendations
            this.treatmentRecommendations.processCombinedResults({
                frs: this.frsResults,
                qrisk: this.qriskResults,
                inputs: this.mergeInputs()
            });
            
            // Hide loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // Display comparison results
            this.displayComparisonResults();
            
            // Publish comparison complete event
            this.eventBus.publish('comparison:complete', {
                success: true,
                result: this.combinedResults
            });
        } catch (error) {
            // Hide loading indicator
            const loadingIndicator = document.getElementById('comparison-loading');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            this.errorSystem.reportError({
                component: 'CombinedViewManager',
                method: 'runComparison',
                error: error
            });
            
            // Show error message
            const resultsContainer = document.getElementById('comparison-results-container');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="error-alert">
                        <h4>Comparison Error</h4>
                        <p>An unexpected error occurred while comparing risk scores.</p>
                        <p>${error.message}</p>
                    </div>
                `;
            }
            
            // Publish comparison failed event
            this.eventBus.publish('comparison:complete', {
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * Determine recommended calculator based on patient characteristics
     * @returns {Object} Recommendation details
     * @private
     */
    determineRecommendedCalculator() {
        try {
            // Extract data from QRISK3 inputs
            const qriskInputs = this.qriskResults.inputs;
            
            // Check if QRISK3 includes additional risk factors not in FRS
            const hasAdditionalRiskFactors = 
                (qriskInputs.family === 1) || 
                (qriskInputs.af === 1) || 
                (qriskInputs.renal === 1) || 
                (qriskInputs.migraines === 1) || 
                (qriskInputs.ra === 1) || 
                (qriskInputs.sle === 1) || 
                (qriskInputs.psychosis === 1) || 
                (qriskInputs.atypicalAntipsy === 1) || 
                (qriskInputs.steroids === 1);
            
            // Check if patient is of non-white ethnicity
            const nonWhiteEthnicity = qriskInputs.ethnicity && 
                qriskInputs.ethnicity !== 'WHITE_OR_NOT_STATED';
            
            let recommendedCalculator = 'frs';
            let rationale = 'The Framingham Risk Score is recommended as it aligns with the Canadian Cardiovascular Society Guidelines.';
            
            // Determine which calculator to recommend
            if (hasAdditionalRiskFactors || nonWhiteEthnicity) {
                recommendedCalculator = 'qrisk';
                
                // Build list of factors
                let factors = [];
                
                if (qriskInputs.family === 1) factors.push('family history of CVD');
                if (qriskInputs.af === 1) factors.push('atrial fibrillation');
                if (qriskInputs.renal === 1) factors.push('chronic kidney disease');
                if (qriskInputs.migraines === 1) factors.push('migraines');
                if (qriskInputs.ra === 1) factors.push('rheumatoid arthritis');
                if (qriskInputs.sle === 1) factors.push('SLE');
                if (qriskInputs.psychosis === 1) factors.push('severe mental illness');
                if (qriskInputs.atypicalAntipsy === 1) factors.push('atypical antipsychotic use');
                if (qriskInputs.steroids === 1) factors.push('steroid use');
                
                if (nonWhiteEthnicity) {
                    factors.push('ethnicity considerations');
                }
                
                rationale = `QRISK3 is recommended as it accounts for additional risk factors present in this patient: ${factors.join(', ')}.`;
            } else if (Math.abs(this.frsResults.risk - this.qriskResults.risk) > 5) {
                // If difference is significant but no additional risk factors
                if (this.qriskResults.risk > this.frsResults.risk) {
                    recommendedCalculator = 'qrisk';
                    rationale = 'QRISK3 tends to provide a more conservative risk estimate for this patient, which may be appropriate for clinical decision making.';
                } else {
                    recommendedCalculator = 'frs';
                    rationale = 'Framingham Risk Score provides a more conservative risk estimate for this patient, which may be appropriate for clinical decision making.';
                }
            } else {
                // If both are similar, recommend combined approach
                recommendedCalculator = 'combined';
                rationale = 'Both calculators provide similar estimates. Consider the average of the two or favor the Framingham Risk Score for consistency with Canadian guidelines.';
            }
            
            return {
                calculator: recommendedCalculator,
                rationale: rationale
            };
        } catch (error) {
            this.errorSystem.reportError({
                component: 'CombinedViewManager',
                method: 'determineRecommendedCalculator',
                error: error
            });
            
            // Fallback to FRS with explanation
            return {
                calculator: 'frs',
                rationale: 'Framingham Risk Score is recommended based on Canadian guidelines. (Error occurred during detailed analysis)'
            };
        }
    }
    
    /**
     * Generate explanation for differences between risk scores
     * @returns {string} Explanation text
     * @private
     */
    explainRiskDifferences() {
        try {
            const frsRisk = this.frsResults.risk;
            const qriskRisk = this.qriskResults.risk;
            const absoluteDifference = Math.abs(frsRisk - qriskRisk).toFixed(1);
            
            // Base explanation
            let explanation = `The Framingham Risk Score and QRISK3 calculations differ by ${absoluteDifference}%. `;
            
            // Add information about which is higher
            if (frsRisk > qriskRisk) {
                explanation += 'The FRS provides a higher risk estimate than QRISK3. ';
            } else if (qriskRisk > frsRisk) {
                explanation += 'The QRISK3 provides a higher risk estimate than FRS. ';
            } else {
                explanation += 'Both calculators provide the same risk estimate. ';
            }
            
            // Add explanation for potential differences
            explanation += 'These differences occur because these calculators: ';
            explanation += '<ul>';
            explanation += '<li>Were derived from different populations (FRS: American, QRISK3: British)</li>';
            explanation += '<li>Consider different risk factors (QRISK3 includes more factors than FRS)</li>';
            explanation += '<li>Define cardiovascular outcomes differently</li>';
            explanation += '<li>Use different statistical methods</li>';
            explanation += '</ul>';
            
            // Add specific factors that could be influencing results
            explanation += 'In this specific case, the difference may be due to: ';
            explanation += '<ul>';
            
            // Check for non-white ethnicity
            if (this.qriskResults.inputs.ethnicity && 
                this.qriskResults.inputs.ethnicity !== 'WHITE_OR_NOT_STATED') {
                explanation += '<li>Ethnicity (considered in QRISK3 but not in FRS)</li>';
            }
            
            // Check for additional risk factors
            if (this.qriskResults.inputs.family === 1) {
                explanation += '<li>Family history of CVD (considered in QRISK3 but not in FRS)</li>';
            }
            
            if (this.qriskResults.inputs.af === 1) {
                explanation += '<li>Atrial fibrillation (considered in QRISK3 but not in FRS)</li>';
            }
            
            if (this.qriskResults.inputs.renal === 1) {
                explanation += '<li>Chronic kidney disease (considered in QRISK3 but not in FRS)</li>';
            }
            
            if (this.qriskResults.inputs.migraines === 1 || 
                this.qriskResults.inputs.ra === 1 || 
                this.qriskResults.inputs.sle === 1) {
                explanation += '<li>Inflammatory conditions (considered in QRISK3 but not in FRS)</li>';
            }
            
            if (this.qriskResults.inputs.psychosis === 1 || 
                this.qriskResults.inputs.atypicalAntipsy === 1) {
                explanation += '<li>Mental health factors (considered in QRISK3 but not in FRS)</li>';
            }
            
            if (this.qriskResults.inputs.steroids === 1) {
                explanation += '<li>Steroid medication use (considered in QRISK3 but not in FRS)</li>';
            }
            
            // If no specific reasons identified, add general note
            explanation += '<li>Different calibration approaches in the underlying algorithms</li>';
            explanation += '</ul>';
            
            return explanation;
        } catch (error) {
            this.errorSystem.reportError({
                component: 'CombinedViewManager',
                method: 'explainRiskDifferences',
                error: error
            });
            
            // Fallback explanation
            return 'The calculators use different populations, risk factors, and statistical methods, leading to different risk estimates.';
        }
    }
    
    /**
     * Display comparison results in the UI
     * @private
     */
    displayComparisonResults() {
        try {
            const resultsContainer = document.getElementById('comparison-results-container');
            if (!resultsContainer) return;
            
            // Clear previous results
            resultsContainer.innerHTML = '';
            
            // Extract data
            const frsRisk = this.frsResults.risk.toFixed(1);
            const qriskRisk = this.qriskResults.risk.toFixed(1);
            const avgRisk = ((parseFloat(frsRisk) + parseFloat(qriskRisk)) / 2).toFixed(1);
            const absoluteDifference = this.combinedResults.differences.absolute;
            const relativeDifference = this.combinedResults.differences.relative;
            const recommendation = this.combinedResults.recommendation;
            const explanation = this.combinedResults.explanation;
            
            // Create results card
            const resultCard = document.createElement('div');
            resultCard.className = 'results-card comparison-results';
            
            // Add header
            resultCard.innerHTML = `
                <div class="risk-header">
                    <h3 class="risk-title">CVD Risk Score Comparison</h3>
                    <div class="risk-date">
                        <span>${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            `;
            
            // Add risk comparison section
            const comparisonSection = document.createElement('div');
            comparisonSection.className = 'comparison-section';
            comparisonSection.innerHTML = `
                <div class="risk-scores-grid">
                    <div class="risk-score-item frs">
                        <h4>Framingham Risk Score</h4>
                        <div class="risk-value">${frsRisk}%</div>
                        <div class="risk-category">${this.getRiskCategory(parseFloat(frsRisk))}</div>
                    </div>
                    <div class="risk-score-item qrisk">
                        <h4>QRISK3 Score</h4>
                        <div class="risk-value">${qriskRisk}%</div>
                        <div class="risk-category">${this.getRiskCategory(parseFloat(qriskRisk))}</div>
                    </div>
                    <div class="risk-score-item combined">
                        <h4>Average Risk</h4>
                        <div class="risk-value">${avgRisk}%</div>
                        <div class="risk-category">${this.getRiskCategory(parseFloat(avgRisk))}</div>
                    </div>
                </div>
                <div class="risk-difference">
                    <p><strong>Absolute Difference:</strong> ${absoluteDifference}%</p>
                    <p><strong>Relative Difference:</strong> ${relativeDifference}%</p>
                </div>
            `;
            
            resultCard.appendChild(comparisonSection);
            
            // Add explanation section
            const explanationSection = document.createElement('div');
            explanationSection.className = 'explanation-section';
            explanationSection.innerHTML = `
                <h4>Why Are The Scores Different?</h4>
                <div class="explanation-content">
                    ${explanation}
                </div>
            `;
            
            resultCard.appendChild(explanationSection);
            
            // Add recommendation section
            const recommendationSection = document.createElement('div');
            recommendationSection.className = 'recommendation-section';
            recommendationSection.innerHTML = `
                <h4>Clinical Recommendation</h4>
                <div class="recommendation-content">
                    <p><strong>Recommended Approach:</strong> 
                        ${recommendation.calculator === 'frs' ? 'Use Framingham Risk Score' : 
                         recommendation.calculator === 'qrisk' ? 'Use QRISK3 Score' : 
                         'Consider both scores (use average or higher value)'}
                    </p>
                    <p><strong>Rationale:</strong> ${recommendation.rationale}</p>
                </div>
            `;
            
            resultCard.appendChild(recommendationSection);
            
            // Add visualization section
            const visualizationSection = document.createElement('div');
            visualizationSection.className = 'visualization-section';
            visualizationSection.innerHTML = `
                <h4>Risk Visualization</h4>
                <div id="comparison-chart" class="comparison-chart"></div>
            `;
            
            resultCard.appendChild(visualizationSection);
            
            // Add card to results container
            resultsContainer.appendChild(resultCard);
            
            // Create visualization
            this.createVisualization();
            
            // Show the results container
            resultsContainer.style.display = 'block';
        } catch (error) {
            this.errorSystem.reportError({
                component: 'CombinedViewManager',
                method: 'displayComparisonResults',
                error: error
            });
            
            const resultsContainer = document.getElementById('comparison-results-container');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="error-alert">
                        <h4>Display Error</h4>
                        <p>An error occurred while displaying comparison results.</p>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }
    }
    
    /**
     * Create risk comparison visualization
     * @private
     */
    createVisualization() {
        try {
            const chartContainer = document.getElementById('comparison-chart');
            if (!chartContainer) return;
            
            // Clear any existing chart
            chartContainer.innerHTML = '';
            
            // Create comparison chart using risk visualization module
            this.riskVisualization.createComparisonChart(
                chartContainer, 
                this.frsResults.risk,
                this.qriskResults.risk,
                {
                    frsLabel: 'Framingham Risk Score',
                    qriskLabel: 'QRISK3 Score',
                    avgLabel: 'Average Risk',
                    width: chartContainer.clientWidth,
                    height: 250,
                    animate: true
                }
            );
            
            this.visualizationCreated = true;
        } catch (error) {
            this.errorSystem.reportError({
                component: 'CombinedViewManager',
                method: 'createVisualization',
                error: error
            });
            
            const chartContainer = document.getElementById('comparison-chart');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="chart-error">
                        <p>Unable to display chart. Risk values: FRS ${this.frsResults.risk.toFixed(1)}%, QRISK3 ${this.qriskResults.risk.toFixed(1)}%</p>
                    </div>
                `;
            }
        }
    }
    
    /**
     * Update visualization based on preferred calculator
     * @private
     */
    updateVisualization() {
        // Only update if we already have a visualization
        if (this.visualizationCreated) {
            this.createVisualization();
        }
    }
    
    /**
     * Get risk category based on risk score
     * @param {number} risk - Risk score percentage
     * @returns {string} Risk category
     * @private
     */
    getRiskCategory(risk) {
        if (risk < 10) {
            return 'Low Risk';
        } else if (risk < 20) {
            return 'Intermediate Risk';
        } else {
            return 'High Risk';
        }
    }
    
    /**
     * Copy data between calculators
     * @param {string} direction - Direction to copy (combined-to-frs, combined-to-qrisk, frs-to-combined, qrisk-to-combined)
     * @public
     */
    copyDataBetweenCalculators(direction) {
        try {
            let sourceForm, targetForm;
            
            // Determine source and target forms
            if (direction === 'combined-to-frs') {
                sourceForm = document.getElementById('combined-form');
                targetForm = document.getElementById('frs-form');
            } else if (direction === 'combined-to-qrisk') {
                sourceForm = document.getElementById('combined-form');
                targetForm = document.getElementById('qrisk-form');
            } else if (direction === 'frs-to-combined') {
                sourceForm = document.getElementById('frs-form');
                targetForm = document.getElementById('combined-form');
            } else if (direction === 'qrisk-to-combined') {
                sourceForm = document.getElementById('qrisk-form');
                targetForm = document.getElementById('combined-form');
            }
            
            if (!sourceForm || !targetForm) {
                throw new Error('Source or target form not found');
            }
            
            // Get source form data
            const sourceData = this.getFormData(sourceForm);
            
            // Create mapping based on direction
            let fieldMapping;
            
            if (direction === 'combined-to-frs') {
                fieldMapping = {
                    'combined-age': 'frs-age',
                    'combined-sex': 'frs-sex',
                    'combined-sbp': 'frs-sbp',
                    'combined-total-chol': 'frs-chol',
                    'combined-total-chol-unit': 'frs-chol-unit',
                    'combined-hdl': 'frs-hdl',
                    'combined-hdl-unit': 'frs-hdl-unit',
                    'combined-smoker': 'frs-smoker',
                    'combined-diabetes': 'frs-diabetes',
                    'combined-bp-treatment': 'frs-bp-treatment'
                };
            } else if (direction === 'combined-to-qrisk') {
                fieldMapping = {
                    'combined-age': 'qrisk-age',
                    'combined-sex': 'qrisk-sex',
                    'combined-ethnicity': 'qrisk-ethnicity',
                    'combined-sbp': 'qrisk-sbp',
                    'combined-height': 'qrisk-height',
                    'combined-height-unit': 'qrisk-height-unit',
                    'combined-weight': 'qrisk-weight',
                    'combined-weight-unit': 'qrisk-weight-unit',
                    'combined-bmi': 'qrisk-bmi',
                    'combined-smoker': 'qrisk-smoker',
                    'combined-diabetes': 'qrisk-diabetes',
                    'combined-bp-treatment': 'qrisk-bp-treated',
                    'combined-chol-ratio': 'qrisk-chol-hdl-ratio',
                    'combined-family': 'qrisk-family',
                    'combined-af': 'qrisk-af',
                    'combined-renal': 'qrisk-renal',
                    'combined-migraines': 'qrisk-migraines',
                    'combined-ra': 'qrisk-ra',
                    'combined-sle': 'qrisk-sle',
                    'combined-psychosis': 'qrisk-psychosis',
                    'combined-atypical-antipsy': 'qrisk-antipsy',
                    'combined-steroids': 'qrisk-steroids',
                    'combined-erectile-dys': 'qrisk-ed'
                };
            } else if (direction === 'frs-to-combined') {
                fieldMapping = {
                    'frs-age': 'combined-age',
                    'frs-sex': 'combined-sex',
                    'frs-sbp': 'combined-sbp',
                    'frs-chol': 'combined-total-chol',
                    'frs-chol-unit': 'combined-total-chol-unit',
                    'frs-hdl': 'combined-hdl',
                    'frs-hdl-unit': 'combined-hdl-unit',
                    'frs-smoker': 'combined-smoker',
                    'frs-diabetes': 'combined-diabetes',
                    'frs-bp-treatment': 'combined-bp-treatment'
                };
            } else if (direction === 'qrisk-to-combined') {
                fieldMapping = {
                    'qrisk-age': 'combined-age',
                    'qrisk-sex': 'combined-sex',
                    'qrisk-ethnicity': 'combined-ethnicity',
                    'qrisk-sbp': 'combined-sbp',
                    'qrisk-height': 'combined-height',
                    'qrisk-height-unit': 'combined-height-unit',
                    'qrisk-weight': 'combined-weight',
                    'qrisk-weight-unit': 'combined-weight-unit',
                    'qrisk-bmi': 'combined-bmi',
                    'qrisk-smoker': 'combined-smoker',
                    'qrisk-diabetes': 'combined-diabetes',
                    'qrisk-bp-treated': 'combined-bp-treatment',
                    'qrisk-chol-hdl-ratio': 'combined-chol-ratio',
                    'qrisk-family': 'combined-family',
                    'qrisk-af': 'combined-af',
                    'qrisk-renal': 'combined-renal',
                    'qrisk-migraines': 'combined-migraines',
                    'qrisk-ra': 'combined-ra',
                    'qrisk-sle': 'combined-sle',
                    'qrisk-psychosis': 'combined-psychosis',
                    'qrisk-antipsy': 'combined-atypical-antipsy',
                    'qrisk-steroids': 'combined-steroids',
                    'qrisk-ed': 'combined-erectile-dys'
                };
            }
            
            // Copy values based on mapping
            for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
                const targetElement = targetForm.elements[targetField];
                if (!targetElement || !sourceData.hasOwnProperty(sourceField)) continue;
                
                if (targetElement.type === 'checkbox') {
                    targetElement.checked = sourceData[sourceField] === 'yes' || sourceData[sourceField] === 'on';
                } else if (targetElement.type === 'radio') {
                    const radioGroup = targetForm.querySelectorAll(`input[name="${targetField}"]`);
                    radioGroup.forEach(radio => {
                        radio.checked = radio.value === sourceData[sourceField];
                    });
                } else {
                    targetElement.value = sourceData[sourceField];
                }
                
                // Trigger change event to update calculated fields (like BMI)
                const event = new Event('change', { bubbles: true });
                targetElement.dispatchEvent(event);
            }
            
            // Show success message
            const messageContainer = document.getElementById('copy-success-message');
            if (messageContainer) {
                messageContainer.textContent = 'Data copied successfully';
                messageContainer.style.display = 'block';
                
                // Hide after 3 seconds
                setTimeout(() => {
                    messageContainer.style.display = 'none';
                }, 3000);
            }
            
            return true;
        } catch (error) {
            this.errorSystem.reportError({
                component: 'CombinedViewManager',
                method: 'copyDataBetweenCalculators',
                error: error,
                direction: direction
            });
            
            // Show error message
            const messageContainer = document.getElementById('copy-error-message');
            if (messageContainer) {
                messageContainer.textContent = `Error copying data: ${error.message}`;
                messageContainer.style.display = 'block';
                
                // Hide after 5 seconds
                setTimeout(() => {
                    messageContainer.style.display = 'none';
                }, 5000);
            }
            
            return false;
        }
    }
    
    /**
     * Merge inputs from both calculators for combined results
     * @returns {Object} Merged inputs
     * @private
     */
    mergeInputs() {
        try {
            // Start with FRS inputs
            const mergedInputs = { ...this.frsResults.inputs };
            
            // Add QRISK-specific inputs
            const qriskSpecificInputs = [
                'ethnicity', 'family', 'af', 'renal', 'migraines', 'ra', 
                'sle', 'psychosis', 'atypicalAntipsy', 'steroids', 'erectileDys'
            ];
            
            qriskSpecificInputs.forEach(input => {
                if (this.qriskResults.inputs.hasOwnProperty(input)) {
                    mergedInputs[input] = this.qriskResults.inputs[input];
                }
            });
            
            return mergedInputs;
        } catch (error) {
            this.errorSystem.reportError({
                component: 'CombinedViewManager',
                method: 'mergeInputs',
                error: error
            });
            
            // Return best effort merged inputs
            return { ...this.frsResults.inputs, ...this.qriskResults.inputs };
        }
    }
    
    /**
     * Set debug mode
     * @param {boolean} enable - Whether to enable debug mode
     * @public
     */
    setDebugMode(enable) {
        this.debugMode = Boolean(enable);
    }
}

// Create global instance using IIFE
window.combinedViewManager = (function() {
    try {
        return new CombinedViewManager();
    } catch (error) {
        console.error('Failed to initialize Combined View Manager:', error);
        
        // Return minimal implementation
        return {
            runComparison: () => false,
            copyDataBetweenCalculators: () => false,
            setDebugMode: () => {}
        };
    }
})();
