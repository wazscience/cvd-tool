name: Enhanced CVD Risk Toolkit Improvements

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:
  schedule:
    # Run weekly on Sunday at 2 AM for medical research updates
    - cron: '0 2 * * 0'

# Explicit permissions to avoid line 128 error
permissions:
  contents: write
  pull-requests: write
  issues: write
  packages: read

jobs:
  enhance-toolkit:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: |
          npm install crypto-js
          npm install html2pdf.js
          npm install flatpickr
          npm install axios
          npm install cheerio
          npm install @google-cloud/logging
          npm install performance-now
          npm install @sentry/browser
          npm install validator
          npm install puppeteer
          npm install html-to-image
          npm install tensorflow
          npm install ml-regression
          
      - name: Create directory structure
        run: |
          mkdir -p js/components
          mkdir -p js/utils
          mkdir -p js/models
          mkdir -p js/analytics
          mkdir -p js/ml
          mkdir -p scripts
          mkdir -p styles
          mkdir -p tests
      
      - name: Apply Clinical Validation Improvements
        run: |
          # Create script for enhancing clinical validation
          cat > scripts/enhance-clinical-validation.js << 'EOF'
          const fs = require('fs');
          const path = require('path');
          
          // Path to the JavaScript files
          const jsDir = path.join(process.cwd(), 'js');
          if (!fs.existsSync(jsDir)) {
            fs.mkdirSync(jsDir, { recursive: true });
          }
          
          const calculationsJsPath = path.join(jsDir, 'calculations.js');
          const validationJsPath = path.join(jsDir, 'validation.js');
          
          // Read the files
          let calculationsJs = fs.existsSync(calculationsJsPath) ? fs.readFileSync(calculationsJsPath, 'utf8') : '';
          let validationJs = fs.existsSync(validationJsPath) ? fs.readFileSync(validationJsPath, 'utf8') : '';
          
          // Add physiologically plausible value ranges
          const physiologicalRanges = `
          /**
           * Physiologically plausible ranges for clinical values
           * These ranges represent values that are clinically reasonable and possible
           * References: 
           * - Mayo Clinic - Laboratory Reference Ranges
           * - American Heart Association Guidelines
           * - European Society of Cardiology Reference Values
           */
          const PHYSIOLOGICAL_RANGES = {
            age: { min: 18, max: 100, unit: 'years', criticalMin: 25, criticalMax: 85, 
                  description: 'Age', category: 'Demographics' },
            sbp: { min: 70, max: 240, unit: 'mmHg', criticalMin: 90, criticalMax: 220, 
                   description: 'Systolic Blood Pressure', category: 'Vitals',
                   note: 'Values below 90 mmHg may indicate hypotension; values above 180 mmHg indicate severe hypertension requiring urgent medical attention' },
            dbp: { min: 40, max: 140, unit: 'mmHg', criticalMin: 60, criticalMax: 130, 
                   description: 'Diastolic Blood Pressure', category: 'Vitals',
                   note: 'Values below 60 mmHg may indicate hypotension; values above 120 mmHg indicate severe hypertension requiring urgent medical attention' },
            totalChol_mmol: { min: 1.0, max: 15.0, unit: 'mmol/L', criticalMin: 2.5, criticalMax: 12.0, 
                            description: 'Total Cholesterol', category: 'Lipids',
                            note: 'Values below 2.5 mmol/L are extremely rare; values above 8.0 mmol/L may indicate familial hypercholesterolemia' },
            totalChol_mg: { min: 40, max: 580, unit: 'mg/dL', criticalMin: 100, criticalMax: 465, 
                           description: 'Total Cholesterol', category: 'Lipids',
                           note: 'Values below 100 mg/dL are extremely rare; values above 300 mg/dL may indicate familial hypercholesterolemia' },
            hdl_mmol: { min: 0.5, max: 4.0, unit: 'mmol/L', criticalMin: 0.7, criticalMax: 3.0, 
                       description: 'HDL Cholesterol', category: 'Lipids',
                       note: 'Values below 0.7 mmol/L indicate very low HDL; values above 2.5 mmol/L are rare but beneficial' },
            hdl_mg: { min: 20, max: 155, unit: 'mg/dL', criticalMin: 27, criticalMax: 116, 
                     description: 'HDL Cholesterol', category: 'Lipids',
                     note: 'Values below 27 mg/dL indicate very low HDL; values above 100 mg/dL are rare but beneficial' },
            ldl_mmol: { min: 0.5, max: 10.0, unit: 'mmol/L', criticalMin: 1.0, criticalMax: 8.0, 
                       description: 'LDL Cholesterol', category: 'Lipids',
                       note: 'Values below 1.0 mmol/L are rare; values above 5.0 mmol/L may indicate familial hypercholesterolemia' },
            ldl_mg: { min: 20, max: 400, unit: 'mg/dL', criticalMin: 40, criticalMax: 300, 
                     description: 'LDL Cholesterol', category: 'Lipids',
                     note: 'Values below 40 mg/dL are rare; values above 190 mg/dL may indicate familial hypercholesterolemia' },
            trig_mmol: { min: 0.5, max: 15.0, unit: 'mmol/L', criticalMin: 0.8, criticalMax: 10.0, 
                        description: 'Triglycerides', category: 'Lipids',
                        note: 'Values above 5.0 mmol/L increase risk of pancreatitis' },
            trig_mg: { min: 40, max: 1300, unit: 'mg/dL', criticalMin: 70, criticalMax: 900, 
                      description: 'Triglycerides', category: 'Lipids',
                      note: 'Values above 450 mg/dL increase risk of pancreatitis' },
            lpa_mg: { min: 0, max: 500, unit: 'mg/dL', criticalMin: 0, criticalMax: 300, 
                     description: 'Lipoprotein(a)', category: 'Lipids',
                     note: 'Values above 30-50 mg/dL associated with increased cardiovascular risk' },
            lpa_nmol: { min: 0, max: 1000, unit: 'nmol/L', criticalMin: 0, criticalMax: 750, 
                       description: 'Lipoprotein(a)', category: 'Lipids',
                       note: 'Values above 75-125 nmol/L associated with increased cardiovascular risk' },
            apob_g: { min: 0.2, max: 2.5, unit: 'g/L', criticalMin: 0.4, criticalMax: 2.0, 
                     description: 'Apolipoprotein B', category: 'Lipids',
                     note: 'Values above 1.2 g/L associated with increased cardiovascular risk' },
            apob_mg: { min: 20, max: 250, unit: 'mg/dL', criticalMin: 40, criticalMax: 200, 
                      description: 'Apolipoprotein B', category: 'Lipids',
                      note: 'Values above 120 mg/dL associated with increased cardiovascular risk' },
            bmi: { min: 10, max: 100, unit: 'kg/m²', criticalMin: 15, criticalMax: 60, 
                  description: 'Body Mass Index', category: 'Anthropometrics',
                  note: 'BMI below 18.5 is underweight; above 30 is obese; values outside 15-60 range are extremely rare' },
            height_cm: { min: 100, max: 250, unit: 'cm', criticalMin: 140, criticalMax: 220, 
                        description: 'Height', category: 'Anthropometrics',
                        note: 'Adult height outside this range is extremely rare' },
            height_in: { min: 39, max: 98, unit: 'inches', criticalMin: 55, criticalMax: 87, 
                        description: 'Height', category: 'Anthropometrics',
                        note: 'Adult height outside this range is extremely rare' },
            weight_kg: { min: 30, max: 250, unit: 'kg', criticalMin: 40, criticalMax: 200, 
                        description: 'Weight', category: 'Anthropometrics',
                        note: 'Adult weight outside this range is extremely rare' },
            weight_lb: { min: 66, max: 550, unit: 'lb', criticalMin: 88, criticalMax: 440, 
                        description: 'Weight', category: 'Anthropometrics',
                        note: 'Adult weight outside this range is extremely rare' },
            // Additional clinical combinations that would be implausible
            implausibleCombinations: [
              { 
                check: (values) => values.totalChol_mmol < values.hdl_mmol,
                message: 'Total cholesterol cannot be less than HDL cholesterol'
              },
              { 
                check: (values) => values.totalChol_mmol < values.ldl_mmol,
                message: 'Total cholesterol cannot be less than LDL cholesterol'
              },
              { 
                check: (values) => values.hdl_mmol > values.totalChol_mmol * 0.8,
                message: 'HDL cholesterol is unusually high relative to total cholesterol'
              },
              { 
                check: (values) => values.sbp < values.dbp,
                message: 'Systolic blood pressure cannot be less than diastolic blood pressure'
              },
              { 
                check: (values) => values.sbp > 180 && values.dbp < 90,
                message: 'Wide pulse pressure (difference between systolic and diastolic) is unusual'
              },
              {
                check: (values) => values.bmi > 40 && values.totalChol_mmol < 3.0,
                message: 'Severely obese patients rarely have very low cholesterol levels'
              },
              {
                check: (values) => values.age < 40 && values.totalChol_mmol > 8.0 && values.trig_mmol < 1.0,
                message: 'Young patient with very high cholesterol but normal triglycerides suggests familial hypercholesterolemia'
              }
            ]
          };
          `;
          
          // Add enhanced physiological validation function
          const physiologicalValidationFunction = `
          /**
           * Check if a value is physiologically plausible
           * @param {string} parameterType - The type of parameter (e.g., 'sbp', 'totalChol_mmol')
           * @param {number} value - The value to check
           * @returns {Object} - { isValid, isWarning, message, note }
           */
          function checkPhysiologicalPlausibility(parameterType, value) {
            if (!PHYSIOLOGICAL_RANGES[parameterType]) {
              console.warn(\`No physiological range defined for parameter "\${parameterType}"\`);
              return { isValid: true, isWarning: false, message: null, note: null };
            }
            
            const range = PHYSIOLOGICAL_RANGES[parameterType];
            
            // Critical check (highly implausible)
            if (value < range.min || value > range.max) {
              return {
                isValid: false,
                isWarning: false,
                message: \`\${range.description || parameterType} value of \${value} \${range.unit} is outside the physiologically possible range (\${range.min}-\${range.max} \${range.unit})\`,
                note: range.note || null,
                category: range.category || 'Other'
              };
            }
            
            // Warning check (unusual but possible)
            if (value < range.criticalMin || value > range.criticalMax) {
              return {
                isValid: true,
                isWarning: true,
                message: \`\${range.description || parameterType} value of \${value} \${range.unit} is unusual. Please verify this value.\`,
                note: range.note || null,
                category: range.category || 'Other'
              };
            }
            
            // Value is within normal range
            return { isValid: true, isWarning: false, message: null, note: null, category: range.category || 'Other' };
          }
          
          /**
           * Check for physiologically implausible combinations of values
           * @param {Object} values - Object containing clinical values
           * @returns {Array} - Array of warning messages for implausible combinations
           */
          function checkImplausibleCombinations(values) {
            if (!values || typeof values !== 'object') return [];
            
            const warnings = [];
            
            // Standardize units for comparison
            const standardizedValues = { ...values };
            
            // Convert cholesterol values to mmol/L if needed
            ['totalChol', 'ldl', 'hdl'].forEach(type => {
              if (standardizedValues[type] && standardizedValues[type + 'Unit'] === 'mg/dL') {
                standardizedValues[type + '_mmol'] = standardizedValues[type] / 38.67;
              } else if (standardizedValues[type]) {
                standardizedValues[type + '_mmol'] = standardizedValues[type];
              }
            });
            
            // Convert triglycerides to mmol/L if needed
            if (standardizedValues['trig'] && standardizedValues['trigUnit'] === 'mg/dL') {
              standardizedValues['trig_mmol'] = standardizedValues['trig'] / 88.5;
            } else if (standardizedValues['trig']) {
              standardizedValues['trig_mmol'] = standardizedValues['trig'];
            }
            
            // Check each implausible combination
            PHYSIOLOGICAL_RANGES.implausibleCombinations.forEach(combination => {
              try {
                if (combination.check(standardizedValues)) {
                  warnings.push(combination.message);
                }
              } catch (error) {
                console.warn('Error checking implausible combination:', error);
              }
            });
            
            return warnings;
          }
          
          /**
           * Display a physiological warning to the user
           * @param {string} message - The warning message
           * @param {string} fieldId - The ID of the related input field
           * @param {boolean} isError - Whether this is an error (false = warning)
           * @param {string} note - Additional clinical note about the range
           */
          function showPhysiologicalWarning(message, fieldId, isError = false, note = null) {
            const field = document.getElementById(fieldId);
            if (!field) return;
            
            // Create or get warning element
            let warningElement = document.getElementById(fieldId + '-physiological-warning');
            if (!warningElement) {
              warningElement = document.createElement('div');
              warningElement.id = fieldId + '-physiological-warning';
              warningElement.className = isError ? 'physiological-error' : 'physiological-warning';
              
              // Insert after field's parent (likely the form group)
              const formGroup = field.closest('.form-group');
              if (formGroup) {
                // Insert after the error message if it exists
                const errorMessage = formGroup.querySelector('.error-message');
                if (errorMessage) {
                  formGroup.insertBefore(warningElement, errorMessage.nextSibling);
                } else {
                  formGroup.appendChild(warningElement);
                }
              } else {
                field.parentElement.appendChild(warningElement);
              }
            }
            
            // Set message and show
            if (note) {
              warningElement.innerHTML = \`<div class="warning-message">\${message}</div><div class="warning-note">\${note}</div>\`;
            } else {
              warningElement.textContent = message;
            }
            warningElement.style.display = 'block';
            
            // Highlight the field
            field.classList.add(isError ? 'physiological-error-input' : 'physiological-warning-input');
            
            // Add icon to field
            addWarningIcon(field, isError, message);
          }
          
          /**
           * Add warning icon to input field
           * @param {HTMLElement} field - The input field
           * @param {boolean} isError - Whether this is an error
           * @param {string} message - The warning message
           */
          function addWarningIcon(field, isError, message) {
            // Check if icon already exists
            let iconWrapper = field.parentElement.querySelector('.field-warning-icon');
            
            if (!iconWrapper) {
              // Create icon wrapper
              iconWrapper = document.createElement('div');
              iconWrapper.className = 'field-warning-icon';
              
              // Create icon
              const icon = document.createElement('span');
              icon.className = isError ? 'error-icon' : 'warning-icon';
              icon.innerHTML = isError ? 
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' :
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
              
              // Add tooltip
              icon.setAttribute('data-tooltip', message);
              
              // Append to wrapper
              iconWrapper.appendChild(icon);
              
              // Add to input container
              const inputGroup = field.closest('.input-group');
              if (inputGroup) {
                inputGroup.appendChild(iconWrapper);
              } else {
                // Position relative to field
                const fieldRect = field.getBoundingClientRect();
                iconWrapper.style.position = 'absolute';
                iconWrapper.style.right = '10px';
                iconWrapper.style.top = '50%';
                iconWrapper.style.transform = 'translateY(-50%)';
                
                // Make parent relative if not already
                const parent = field.parentElement;
                const parentStyle = window.getComputedStyle(parent);
                if (parentStyle.position === 'static') {
                  parent.style.position = 'relative';
                }
                
                parent.appendChild(iconWrapper);
              }
            } else {
              // Update existing icon
              const icon = iconWrapper.querySelector('span');
              if (icon) {
                icon.className = isError ? 'error-icon' : 'warning-icon';
                icon.setAttribute('data-tooltip', message);
              }
            }
          }
          
          /**
           * Clear any physiological warnings for a field
           * @param {string} fieldId - The ID of the input field
           */
          function clearPhysiologicalWarning(fieldId) {
            const field = document.getElementById(fieldId);
            if (!field) return;
            
            const warningElement = document.getElementById(fieldId + '-physiological-warning');
            if (warningElement) {
              warningElement.style.display = 'none';
            }
            
            field.classList.remove('physiological-error-input', 'physiological-warning-input');
            
            // Remove warning icon
            const iconWrapper = field.parentElement.querySelector('.field-warning-icon');
            if (iconWrapper) {
              iconWrapper.remove();
            }
          }
          
          /**
           * Check a numeric input field for physiological plausibility
           * @param {string} fieldId - Input field ID
           * @param {string} parameterType - Parameter type from PHYSIOLOGICAL_RANGES
           */
          function validatePhysiologicalInput(fieldId, parameterType) {
            const field = document.getElementById(fieldId);
            if (!field) return true;
            
            if (field.value.trim() === '') {
              clearPhysiologicalWarning(fieldId);
              return true;
            }
            
            const numValue = parseFloat(field.value);
            if (isNaN(numValue)) {
              clearPhysiologicalWarning(fieldId);
              return true; // Let the regular validation handle non-numeric values
            }
            
            // Get unit suffix if needed
            let actualParameterType = parameterType;
            const unitSelect = field.parentElement.querySelector('select');
            if (unitSelect) {
              const unit = unitSelect.value;
              if (unit === 'mmol/L') {
                actualParameterType = parameterType + '_mmol';
              } else if (unit === 'mg/dL') {
                actualParameterType = parameterType + '_mg';
              } else if (unit === 'g/L') {
                actualParameterType = parameterType + '_g';
              } else if (unit === 'nmol/L') {
                actualParameterType = parameterType + '_nmol';
              } else if (unit === 'kg') {
                actualParameterType = parameterType + '_kg';
              } else if (unit === 'lb') {
                actualParameterType = parameterType + '_lb';
              } else if (unit === 'cm') {
                actualParameterType = parameterType + '_cm';
              } else if (unit === 'ft/in') {
                actualParameterType = parameterType + '_in';
              }
            }
            
            const result = checkPhysiologicalPlausibility(actualParameterType, numValue);
            
            if (!result.isValid) {
              showPhysiologicalWarning(result.message, fieldId, true, result.note);
              return false;
            } else if (result.isWarning) {
              showPhysiologicalWarning(result.message, fieldId, false, result.note);
            } else {
              clearPhysiologicalWarning(fieldId);
            }
            
            return true;
          }
          
          /**
           * Check all form inputs on a tab for physiologically implausible combinations
           * @param {string} tabId - ID of the tab containing the form
           */
          function validatePhysiologicalCombinations(tabId) {
            const tab = document.getElementById(tabId);
            if (!tab) return;
            
            // Get all input values
            const inputs = tab.querySelectorAll('input[type="number"], select');
            const values = {};
            
            inputs.forEach(input => {
              if (input.type === 'number' && input.value) {
                // Get base name without prefix
                let name = input.id.replace(/^(frs|qrisk|med)-/, '');
                values[name] = parseFloat(input.value);
                
                // Get unit if available
                const unitSelect = input.parentElement.querySelector('select');
                if (unitSelect) {
                  values[name + 'Unit'] = unitSelect.value;
                }
              }
            });
            
            // Check for implausible combinations
            const warnings = checkImplausibleCombinations(values);
            
            // Display warnings
            displayCombinationWarnings(warnings, tabId);
            
            return warnings.length === 0;
          }
          
          /**
           * Display warnings for implausible combinations
           * @param {Array} warnings - Array of warning messages
           * @param {string} tabId - ID of the tab containing the form
           */
          function displayCombinationWarnings(warnings, tabId) {
            const tab = document.getElementById(tabId);
            if (!tab) return;
            
            // Look for existing warnings container or create one
            let warningsContainer = tab.querySelector('.combination-warnings');
            
            if (!warningsContainer && warnings.length > 0) {
              // Create warnings container
              warningsContainer = document.createElement('div');
              warningsContainer.className = 'combination-warnings';
              
              // Find appropriate place to insert
              const form = tab.querySelector('form');
              if (form) {
                const formActions = form.querySelector('.form-actions');
                if (formActions) {
                  form.insertBefore(warningsContainer, formActions);
                } else {
                  form.appendChild(warningsContainer);
                }
              } else {
                tab.appendChild(warningsContainer);
              }
            }
            
            // If no warnings, hide or remove container
            if (warnings.length === 0) {
              if (warningsContainer) {
                warningsContainer.style.display = 'none';
              }
              return;
            }
            
            // Update warnings container
            warningsContainer.style.display = 'block';
            warningsContainer.innerHTML = \`
              <div class="combination-warnings-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <h4>Physiologically Implausible Combinations</h4>
              </div>
              <ul>
                \${warnings.map(warning => \`<li>\${warning}</li>\`).join('')}
              </ul>
              <p class="combination-warnings-note">Please review the highlighted values and correct if needed. If these values are correct, please add a note indicating this is an unusual clinical presentation.</p>
            \`;
          }
          `;
          
          // Add guideline documentation for risk thresholds
          const guidelineDocumentation = `
          /**
           * Risk categorization thresholds and guideline information
           * @namespace
           */
          const GUIDELINES = {
            /**
             * Risk categories based on 2021 Canadian Cardiovascular Society Guidelines
             * Reference: Pearson GJ, et al. 2021 Canadian Cardiovascular Society Guidelines 
             * for the Management of Dyslipidemia for the Prevention of Cardiovascular Disease in Adults
             */
            riskCategories: {
              low: { 
                min: 0, 
                max: 10, 
                description: 'Low Risk (< 10%)', 
                color: '#27ae60',
                management: 'Consider statin therapy if LDL-C ≥5.0 mmol/L. Otherwise, focus on lifestyle modification.'
              },
              moderate: { 
                min: 10, 
                max: 20, 
                description: 'Moderate Risk (10-19.9%)', 
                color: '#f39c12',
                management: 'Consider statin therapy if LDL-C ≥3.5 mmol/L. Target: ≥30% reduction in LDL-C.'
              },
              high: { 
                min: 20, 
                max: 100, 
                description: 'High Risk (≥ 20%)', 
                color: '#c0392b',
                management: 'Statin therapy recommended. Target: LDL-C <2.0 mmol/L or ≥50% reduction.'
              }
            },
            
            /**
             * Special risk categories not based solely on percentage risk
             */
            specialCategories: {
              familialHypercholesterolemia: {
                description: 'Familial Hypercholesterolemia',
                color: '#8e44ad',
                management: 'High-intensity statin therapy. Consider adding ezetimibe and/or PCSK9 inhibitor if needed.'
              },
              clinicalASCVD: {
                description: 'Clinical ASCVD (Secondary Prevention)',
                color: '#c0392b',
                management: 'High-intensity statin therapy. Target: LDL-C <1.8 mmol/L or ≥50% reduction.'
              },
              extremeRisk: {
                description: 'Extreme Risk (Recent ACS or Multiple Events)',
                color: '#c0392b',
                management: 'Maximum statin therapy plus ezetimibe. Consider PCSK9 inhibitor. Target: LDL-C <1.4 mmol/L.'
              }
            },
            
            /**
             * LDL-C targets based on various guidelines
             */
            ldlTargets: {
              CCS_2021: {
                name: 'Canadian Cardiovascular Society Guidelines (2021)',
                reference: 'Pearson GJ, et al. 2021 Canadian Cardiovascular Society Guidelines for the Management of Dyslipidemia',
                url: 'https://www.onlinecjc.ca/article/S0828-282X(21)00165-3/fulltext',
                targets: {
                  high: { value: 1.8, unit: 'mmol/L', description: '< 1.8 mmol/L or > 50% reduction' },
                  veryHigh: { value: 1.4, unit: 'mmol/L', description: '< 1.4 mmol/L' },
                  intermediate: { value: 2.0, unit: 'mmol/L', description: '< 2.0 mmol/L' },
                  low: { value: 'none', unit: 'mmol/L', description: 'No specific target; consider treatment if LDL-C ≥5.0 mmol/L' }
                }
              },
              ESC_EAS_2019: {
                name: 'European Society of Cardiology/European Atherosclerosis Society Guidelines (2019)',
                reference: 'Mach F, et al. 2019 ESC/EAS Guidelines for the management of dyslipidaemias',
                url: 'https://academic.oup.com/eurheartj/article/41/1/111/5556353',
                targets: {
                  veryHigh: { value: 1.4, unit: 'mmol/L', description: '< 1.4 mmol/L and ≥ 50% reduction' },
                  high: { value: 1.8, unit: 'mmol/L', description: '< 1.8 mmol/L and ≥ 50% reduction' },
                  moderate: { value: 2.6, unit: 'mmol/L', description: '< 2.6 mmol/L' },
                  low: { value: 3.0, unit: 'mmol/L', description: '< 3.0 mmol/L' }
                }
              },
              ACC_AHA_2018: {
                name: 'American College of Cardiology/American Heart Association Guidelines (2018)',
                reference: 'Grundy SM, et al. 2018 AHA/ACC Guideline on the Management of Blood Cholesterol',
                url: 'https://www.jacc.org/doi/10.1016/j.jacc.2018.11.003',
                targets: {
                  secondary: { value: 1.8, unit: 'mmol/L', description: '< 1.8 mmol/L (< 70 mg/dL)' },
                  veryHigh: { value: 1.8, unit: 'mmol/L', description: '< 1.8 mmol/L (< 70 mg/dL)' },
                  primary: { value: 'none', unit: 'mmol/L', description: 'No specific target; focus on percentage reduction' }
                }
              }
            },
            
            /**
             * Lp(a) thresholds based on current evidence
             * These are consensus thresholds from various guidelines and research
             */
            lpaThresholds: {
              mgdL: [
                { min: 0, max: 30, risk: 'normal', description: 'Normal Risk', color: '#27ae60' },
                { min: 30, max: 50, risk: 'borderline', description: 'Borderline Risk', color: '#f39c12' },
                { min: 50, max: 100, risk: 'elevated', description: 'Elevated Risk', color: '#e67e22' },
                { min: 100, max: 200, risk: 'high', description: 'High Risk', color: '#e74c3c' },
                { min: 200, max: 500, risk: 'very-high', description: 'Very High Risk', color: '#c0392b' }
              ],
              nmolL: [
                { min: 0, max: 75, risk: 'normal', description: 'Normal Risk', color: '#27ae60' },
                { min: 75, max: 125, risk: 'borderline', description: 'Borderline Risk', color: '#f39c12' },
                { min: 125, max: 250, risk: 'elevated', description: 'Elevated Risk', color: '#e67e22' },
                { min: 250, max: 500, risk: 'high', description: 'High Risk', color: '#e74c3c' },
                { min: 500, max: 1250, risk: 'very-high', description: 'Very High Risk', color: '#c0392b' }
              ]
            },
            
            /**
             * Currently applied guideline
             */
            currentGuideline: 'CCS_2021',
            
            /**
             * Last guideline update date
             */
            lastUpdate: '2021-10-25'
          };
          
          /**
           * Get risk category based on risk percentage
           * @param {number} riskPercentage - The calculated risk percentage
           * @returns {Object} - Risk category information
           */
          function getRiskCategory(riskPercentage) {
            const categories = GUIDELINES.riskCategories;
            
            if (riskPercentage < categories.low.max) {
              return { category: 'low', ...categories.low };
            } else if (riskPercentage < categories.moderate.max) {
              return { category: 'moderate', ...categories.moderate };
            } else {
              return { category: 'high', ...categories.high };
            }
          }
          
          /**
           * Get Lp(a) risk category based on value and unit
           * @param {number} value - Lp(a) value
           * @param {string} unit - Unit ('mg/dL' or 'nmol/L')
           * @returns {Object} - Risk category information
           */
          function getLpaRiskCategory(value, unit) {
            if (!value) return null;
            
            const thresholds = unit === 'nmol/L' ? 
              GUIDELINES.lpaThresholds.nmolL : 
              GUIDELINES.lpaThresholds.mgdL;
            
            for (const threshold of thresholds) {
              if (value >= threshold.min && value < threshold.max) {
                return threshold;
              }
            }
            
            // Default to highest category if beyond range
            return thresholds[thresholds.length - 1];
          }
          
          /**
           * Get LDL target based on risk category and current guideline
           * @param {string} riskCategory - The risk category (low, moderate, high, veryHigh)
           * @returns {Object} - Target information
           */
          function getLDLTarget(riskCategory) {
            const currentGuideline = GUIDELINES.currentGuideline;
            const guidelineTargets = GUIDELINES.ldlTargets[currentGuideline]?.targets || {};
            
            return guidelineTargets[riskCategory] || guidelineTargets.high || { value: 2.0, unit: 'mmol/L', description: '< 2.0 mmol/L' };
          }
          
          /**
           * Get current guideline information
           * @returns {Object} - Guideline information
           */
          function getCurrentGuidelineInfo() {
            const currentGuideline = GUIDELINES.currentGuideline;
            const guidelineInfo = GUIDELINES.ldlTargets[currentGuideline] || {
              name: 'Current Guidelines',
              reference: 'Unknown reference',
              url: '#'
            };
            
            return {
              id: currentGuideline,
              name: guidelineInfo.name,
              reference: guidelineInfo.reference,
              url: guidelineInfo.url,
              lastUpdate: GUIDELINES.lastUpdate
            };
          }
          
          /**
           * Generate an HTML guideline citation with proper formatting
           * @returns {string} - HTML formatted citation
           */
          function generateGuidelineCitation() {
            const info = getCurrentGuidelineInfo();
            
            return \`
              <div class="guideline-citation">
                <div class="guideline-badge">Based on: \${info.name}</div>
                <p class="citation-text">Reference: \${info.reference}</p>
                <p class="citation-date">Last Updated: \${info.lastUpdate}</p>
                <a href="\${info.url}" target="_blank" rel="noopener noreferrer" class="citation-link">View Guideline</a>
              </div>
            \`;
          }
          `;
          
          // Add detailed risk categorization documentation
          const riskCategorization = `
          /**
           * Comprehensive risk categorization information
           * 
           * This section documents the risk categories used in the calculator and their clinical implications.
           * These categories are based on the following guidelines:
           * 
           * 1. 2021 Canadian Cardiovascular Society Guidelines for the Management of Dyslipidemia
           * 2. 2019 ESC/EAS Guidelines for the management of dyslipidaemias
           * 3. 2018 AHA/ACC Guideline on the Management of Blood Cholesterol
           * 
           * RISK CATEGORIES:
           * 
           * LOW RISK: <10% 10-year risk of ASCVD
           * - Clinical characteristics: No additional risk factors, younger age
           * - Management approach: 
           *   - Focus on lifestyle modification
           *   - Consider statin therapy only if LDL-C ≥5.0 mmol/L (≥190 mg/dL)
           *   - No specific LDL-C target; monitor reduction if on therapy
           * 
           * INTERMEDIATE RISK: 10-19.9% 10-year risk of ASCVD
           * - Clinical characteristics: Some risk factors present
           * - Management approach:
           *   - Consider statin therapy if LDL-C ≥3.5 mmol/L (≥135 mg/dL)
           *   - Consider statin therapy with LDL-C <3.5 mmol/L if risk enhancers present:
           *     * Elevated Lp(a) ≥50 mg/dL (≥100 nmol/L)
           *     * Family history of premature CVD
           *     * Coronary artery calcium score ≥100 AU
           *   - Target: ≥30% reduction in LDL-C
           *   - Alternative target: LDL-C <2.0 mmol/L (<77 mg/dL)
           * 
           * HIGH RISK: ≥20% 10-year risk of ASCVD
           * - Clinical characteristics: Multiple risk factors, diabetes >15 years duration
           * - Management approach:
           *   - Statin therapy is recommended for most patients
           *   - Target: LDL-C <2.0 mmol/L (<77 mg/dL) OR ≥50% reduction in LDL-C
           *   - Consider adding ezetimibe if target not achieved with maximum tolerated statin
           * 
           * VERY HIGH RISK: (Secondary prevention or extreme risk)
           * - Clinical characteristics: 
           *   - Established atherosclerotic cardiovascular disease
           *   - Recent acute coronary syndrome
           *   - Multiple vascular beds affected
           * - Management approach:
           *   - High-intensity statin therapy
           *   - Target: LDL-C <1.8 mmol/L (<70 mg/dL) OR ≥50% reduction
           *   - For extreme risk: LDL-C <1.4 mmol/L (<55 mg/dL)
           *   - Consider ezetimibe as second-line therapy
           *   - Consider PCSK9 inhibitor if target not achieved with statin + ezetimibe
           * 
           * SPECIAL CONSIDERATIONS:
           * 
           * 1. Elevated Lp(a):
           *    - Levels ≥50 mg/dL (≥100 nmol/L) increase CVD risk ~1.5-fold
           *    - Consider more aggressive LDL-C targets
           *    - Family screening recommended
           *    - Specific Lp(a)-lowering therapies are in development
           * 
           * 2. Familial Hypercholesterolemia:
           *    - Classified as high risk regardless of calculated score
           *    - LDL-C typically ≥5.0 mmol/L (≥190 mg/dL)
           *    - Usually requires combination therapy
           *    - Family screening recommended
           */
          `;
          
          // Add functions to calculations.js
          if (calculationsJs) {
            if (!calculationsJs.includes('PHYSIOLOGICAL_RANGES')) {
              calculationsJs = physiologicalRanges + '\n\n' + calculationsJs;
            }
            
            if (!calculationsJs.includes('checkPhysiologicalPlausibility')) {
              calculationsJs = calculationsJs.replace(/\/\/ Risk calculation functions[\s\S]*?function/m, 
                physiologicalValidationFunction + '\n\n// Risk calculation functions\n\nfunction');
            }
            
            if (!calculationsJs.includes('GUIDELINES')) {
              calculationsJs = calculationsJs.replace(/\/\/ Risk categorization[\s\S]*?function/m,
                guidelineDocumentation + '\n\n// Risk categorization\n\nfunction');
            }
            
            if (!calculationsJs.includes('Comprehensive risk categorization information')) {
              calculationsJs = riskCategorization + '\n\n' + calculationsJs;
            }
            
            // Write the updated content back to the file
            fs.writeFileSync(calculationsJsPath, calculationsJs, 'utf8');
            console.log('Updated calculations.js with enhanced clinical validation');
          } else {
            // If file doesn't exist, create it with the necessary functions
            const calculationsTemplate = `/**
             * CVD Risk Toolkit - Risk Calculation Functions
             * Provides risk calculation algorithms and validation
             */
            
            ${physiologicalRanges}
            
            ${riskCategorization}
            
            ${guidelineDocumentation}
            
            ${physiologicalValidationFunction}
            
            // Risk calculation functions
            
            /**
             * Calculates Framingham Risk Score
             * @param {Object} data - Patient data
             * @returns {Object} - Risk calculation results
             */
            function calculateFraminghamRiskScore(data) {
              // Implementation will be added
              return { baseRisk: 0, lpaModifier: 1, modifiedRisk: 0, riskCategory: 'low' };
            }
            
            /**
             * Calculates QRISK3 Score
             * @param {Object} data - Patient data
             * @returns {Object} - Risk calculation results
             */
            function calculateQRISK3Score(data) {
              // Implementation will be added
              return { baseRisk: 0, lpaModifier: 1, modifiedRisk: 0, riskCategory: 'low' };
            }
            `;
            
            fs.writeFileSync(calculationsJsPath, calculationsTemplate, 'utf8');
            console.log('Created calculations.js with clinical validation functions');
          }
          
          // Add physiological validation hooks to validation.js
          if (validationJs) {
            // Add physiological validation calls to validateNumericInput
            if (!validationJs.includes('validatePhysiologicalInput')) {
              validationJs = validationJs.replace(/function validateNumericInput[\s\S]*?return {[\s\S]*?};/m, 
                `function validateNumericInput(fieldId, min, max, fieldName, required = true, parameterType = null) {
                const field = document.getElementById(fieldId);
                if (!field) {
                    console.error(\`Field with ID \${fieldId} not found\`);
                    return { 
                        isValid: false, 
                        value: null, 
                        message: \`Internal error: Field \${fieldId} not found.\` 
                    };
                }
                
                const value = field.value.trim();
                const errorDisplay = field.parentElement?.querySelector('.error-message') || 
                                   field.closest('.form-group')?.querySelector('.error-message');
                
                // Check if field is required and empty
                if (required && value === '') {
                    field.classList.add('error');
                    if (errorDisplay) errorDisplay.style.display = 'block';
                    return { 
                        isValid: false, 
                        value: null, 
                        message: \`\${fieldName} is required.\` 
                    };
                }
                
                // If field is not required and empty, return valid
                if (!required && value === '') {
                    field.classList.remove('error');
                    if (errorDisplay) errorDisplay.style.display = 'none';
                    return { 
                        isValid: true, 
                        value: null, 
                        message: null 
                    };
                }
                
                // Check if input is a number
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    field.classList.add('error');
                    if (errorDisplay) errorDisplay.style.display = 'block';
                    return { 
                        isValid: false, 
                        value: null, 
                        message: \`\${fieldName} must be a number. Please enter a valid numeric value.\` 
                    };
                }
                
                // Check if value is within range
                if (numValue < min || numValue > max) {
                    field.classList.add('error');
                    if (errorDisplay) errorDisplay.style.display = 'block';
                    return { 
                        isValid: false, 
                        value: null, 
                        message: \`\${fieldName} must be between \${min} and \${max}.\` 
                    };
                }
                
                // Check physiological plausibility if parameterType is provided
                if (parameterType && typeof validatePhysiologicalInput === 'function') {
                    const plausibilityResult = validatePhysiologicalInput(fieldId, parameterType);
                    if (!plausibilityResult) {
                        // Still return isValid true as this is a warning, not a validation error
                        // The warning UI is handled by validatePhysiologicalInput
                        return {
                            isValid: true,
                            value: numValue,
                            message: null,
                            physiologicalWarning: true
                        };
                    }
                }
                
                // Input is valid
                field.classList.remove('error');
                if (errorDisplay) errorDisplay.style.display = 'none';
                return { 
                    isValid: true, 
                    value: numValue, 
                    message: null 
                };
            }`);
            }
            
            // Add validation for form submission to check for implausible combinations
            if (!validationJs.includes('validatePhysiologicalCombinations')) {
              validationJs += `
              
              /**
               * Enhanced form validation that checks for physiologically implausible combinations
               * @param {string} formId - The ID of the form
               * @returns {boolean} - Whether the form is valid
               */
              function validateFormWithPhysiologicalChecks(formId) {
                const form = document.getElementById(formId);
                if (!form) return false;
                
                const tabId = form.closest('.tab-content')?.id;
                if (!tabId) return false;
                
                // Standard form validation
                const validationResult = validateForm(formId);
                
                // If standard validation passes, check physiological combinations
                if (validationResult.isValid) {
                  return validatePhysiologicalCombinations(tabId);
                }
                
                return validationResult.isValid;
              }
              `;
            }
            
            // Write the updated content back to the file
            fs.writeFileSync(validationJsPath, validationJs, 'utf8');
            console.log('Updated validation.js with physiological validation hooks');
          } else {
            // If validation.js doesn't exist, create it with the necessary functions
            const validationTemplate = `/**
             * CVD Risk Toolkit - Validation Functions
             * Provides input validation and error handling
             */
            
            /**
             * Validates a numeric input field
             * @param {string} fieldId - The ID of the input field
             * @param {number} min - Minimum allowed value
             * @param {number} max - Maximum allowed value
             * @param {string} fieldName - Human-readable field name for error messages
             * @param {boolean} required - Whether the field is required
             * @param {string} parameterType - Type of parameter for physiological validation
             * @returns {Object} - { isValid, value, message }
             */
            function validateNumericInput(fieldId, min, max, fieldName, required = true, parameterType = null) {
                const field = document.getElementById(fieldId);
                if (!field) {
                    console.error(\`Field with ID \${fieldId} not found\`);
                    return { 
                        isValid: false, 
                        value: null, 
                        message: \`Internal error: Field \${fieldId} not found.\` 
                    };
                }
                
                const value = field.value.trim();
                const errorDisplay = field.parentElement?.querySelector('.error-message') || 
                                   field.closest('.form-group')?.querySelector('.error-message');
                
                // Check if field is required and empty
                if (required && value === '') {
                    field.classList.add('error');
                    if (errorDisplay) errorDisplay.style.display = 'block';
                    return { 
                        isValid: false, 
                        value: null, 
                        message: \`\${fieldName} is required.\` 
                    };
                }
                
                // If field is not required and empty, return valid
                if (!required && value === '') {
                    field.classList.remove('error');
                    if (errorDisplay) errorDisplay.style.display = 'none';
                    return { 
                        isValid: true, 
                        value: null, 
                        message: null 
                    };
                }
                
                // Check if input is a number
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    field.classList.add('error');
                    if (errorDisplay) errorDisplay.style.display = 'block';
                    return { 
                        isValid: false, 
                        value: null, 
                        message: \`\${fieldName} must be a number. Please enter a valid numeric value.\` 
                    };
                }
                
                // Check if value is within range
                if (numValue < min || numValue > max) {
                    field.classList.add('error');
                    if (errorDisplay) errorDisplay.style.display = 'block';
                    return { 
                        isValid: false, 
                        value: null, 
                        message: \`\${fieldName} must be between \${min} and \${max}.\` 
                    };
                }
                
                // Check physiological plausibility if parameterType is provided
                if (parameterType && typeof validatePhysiologicalInput === 'function') {
                    const plausibilityResult = validatePhysiologicalInput(fieldId, parameterType);
                    if (!plausibilityResult) {
                        // Still return isValid true as this is a warning, not a validation error
                        // The warning UI is handled by validatePhysiologicalInput
                        return {
                            isValid: true,
                            value: numValue,
                            message: null,
                            physiologicalWarning: true
                        };
                    }
                }
                
                // Input is valid
                field.classList.remove('error');
                if (errorDisplay) errorDisplay.style.display = 'none';
                return { 
                    isValid: true, 
                    value: numValue, 
                    message: null 
                };
            }
            
            /**
             * Validates a select field
             * @param {string} fieldId - The ID of the select field
             * @param {string} fieldName - Human-readable field name for error messages
             * @param {boolean} required - Whether the field is required
             * @returns {Object} - { isValid, value, message }
             */
            function validateSelectInput(fieldId, fieldName, required = true) {
                const field = document.getElementById(fieldId);
                if (!field) {
                    console.error(\`Field with ID \${fieldId} not found\`);
                    return { 
                        isValid: false, 
                        value: null, 
                        message: \`Internal error: Field \${fieldId} not found.\` 
                    };
                }
                
                const value = field.value;
                const errorDisplay = field.parentElement.querySelector('.error-message') || 
                                   field.closest('.form-group')?.querySelector('.error-message');
                
                // Check if field is required and empty or default option
                if (required && (value === '' || value === null || field.selectedIndex === 0 && field.options[0].disabled)) {
                    field.classList.add('error');
                    if (errorDisplay) errorDisplay.style.display = 'block';
                    return { 
                        isValid: false, 
                        value: null, 
                        message: \`Please select a \${fieldName}.\` 
                    };
                }
                
                // Input is valid
                field.classList.remove('error');
                if (errorDisplay) errorDisplay.style.display = 'none';
                return { 
                    isValid: true, 
                    value: value, 
                    message: null 
                };
            }
            
            /**
             * Validates a form
             * @param {string} formId - The ID of the form
             * @returns {Object} - { isValid, errors }
             */
            function validateForm(formId) {
                const form = document.getElementById(formId);
                if (!form) {
                    return {
                        isValid: false,
                        errors: ['Form not found']
                    };
                }
                
                const errors = [];
                
                // Validate required fields
                const requiredFields = form.querySelectorAll('[required]');
                requiredFields.forEach(field => {
                    if (field.type === 'number') {
                        const result = validateNumericInput(
                            field.id,
                            parseFloat(field.getAttribute('min') || '-Infinity'),
                            parseFloat(field.getAttribute('max') || 'Infinity'),
                            field.previousElementSibling?.textContent || field.id,
                            true
                        );
                        
                        if (!result.isValid) {
                            errors.push(result.message);
                        }
                    } else if (field.tagName === 'SELECT') {
                        const result = validateSelectInput(
                            field.id,
                            field.previousElementSibling?.textContent || field.id,
                            true
                        );
                        
                        if (!result.isValid) {
                            errors.push(result.message);
                        }
                    }
                });
                
                return {
                    isValid: errors.length === 0,
                    errors: errors
                };
            }
            
            /**
             * Enhanced form validation that checks for physiologically implausible combinations
             * @param {string} formId - The ID of the form
             * @returns {boolean} - Whether the form is valid
             */
            function validateFormWithPhysiologicalChecks(formId) {
              const form = document.getElementById(formId);
              if (!form) return false;
              
              const tabId = form.closest('.tab-content')?.id;
              if (!tabId) return false;
              
              // Standard form validation
              const validationResult = validateForm(formId);
              
              // If standard validation passes, check physiological combinations
              if (validationResult.isValid) {
                return validatePhysiologicalCombinations(tabId);
              }
              
              return validationResult.isValid;
            }
            `;
            
            fs.writeFileSync(validationJsPath, validationTemplate, 'utf8');
            console.log('Created validation.js with validation functions');
          }
          
          // Add CSS for physiological warnings
          const cssPath = path.join(process.cwd(), 'styles.css');
          let cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
          
          const physiologicalWarningStyles = `
          /* Physiological Warning Styles */
          .physiological-warning {
            padding: var(--space-xs) var(--space-sm);
            background-color: rgba(243, 156, 18, 0.1);
            border-left: 3px solid var(--moderate-risk-color);
            color: var(--moderate-risk-color);
            font-size: var(--font-size-sm);
            margin-top: var(--space-xs);
            display: none;
            border-radius: var(--border-radius-sm);
            animation: fadeIn 0.3s ease-in-out;
          }
          
          .physiological-error {
            padding: var(--space-xs) var(--space-sm);
            background-color: rgba(192, 57, 43, 0.1);
            border-left: 3px solid var(--high-risk-color);
            color: var(--high-risk-color);
            font-size: var(--font-size-sm);
            margin-top: var(--space-xs);
            display: none;
            border-radius: var(--border-radius-sm);
            animation: fadeIn 0.3s ease-in-out;
          }
          
          .warning-message {
            font-weight: 500;
            margin-bottom: var(--space-xs);
          }
          
          .warning-note {
            font-size: 0.85em;
            opacity: 0.9;
          }
          
          .physiological-warning-input {
            border-color: var(--moderate-risk-color) !important;
            background-color: rgba(243, 156, 18, 0.05) !important;
          }
          
          .physiological-error-input {
            border-color: var(--high-risk-color) !important;
            background-color: rgba(192, 57, 43, 0.05) !important;
          }
          
          .field-warning-icon {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 2;
            cursor: help;
          }
          
          .field-warning-icon .warning-icon {
            color: var(--moderate-risk-color);
          }
          
          .field-warning-icon .error-icon {
            color: var(--high-risk-color);
          }
          
          .field-warning-icon [data-tooltip] {
            position: relative;
          }
          
          .field-warning-icon [data-tooltip]::after {
            content: attr(data-tooltip);
            position: absolute;
            top: -35px;
            right: 0;
            width: 200px;
            background-color: var(--primary-color);
            color: white;
            padding: var(--space-xs) var(--space-sm);
            border-radius: var(--border-radius-sm);
            font-size: var(--font-size-sm);
            font-weight: normal;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 10;
            text-align: left;
            line-height: 1.4;
            box-shadow: var(--shadow-md);
          }
          
          .field-warning-icon [data-tooltip]:hover::after {
            opacity: 1;
          }
          
          .combination-warnings {
            margin: var(--space-lg) 0;
            padding: var(--space-md);
            background-color: rgba(243, 156, 18, 0.1);
            border: 1px solid var(--moderate-risk-color);
            border-radius: var(--border-radius);
            display: none;
            animation: fadeIn 0.5s ease-in-out;
          }
          
          .combination-warnings-header {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            margin-bottom: var(--space-sm);
          }
          
          .combination-warnings h4 {
            margin: 0;
            color: var(--moderate-risk-color);
            font-weight: 600;
          }
          
          .combination-warnings ul {
            margin-bottom: var(--space-md);
          }
          
          .combination-warnings-note {
            font-size: var(--font-size-sm);
            color: var(--text-light);
            font-style: italic;
          }
          
          .guideline-badge {
            display: inline-block;
            padding: var(--space-xs) var(--space-sm);
            background-color: rgba(52, 152, 219, 0.1);
            border-radius: var(--border-radius-sm);
            font-size: var(--font-size-sm);
            margin-bottom: var(--space-sm);
            font-weight: 500;
            color: var(--secondary-color);
          }
          
          .dark-theme .guideline-badge {
            background-color: rgba(52, 152, 219, 0.2);
          }
          
          .guideline-reference {
            font-size: var(--font-size-sm);
            color: var(--text-light);
            margin-top: var(--space-sm);
            border-left: 3px solid var(--border-color);
            padding-left: var(--space-sm);
          }
          
          .guideline-citation {
            margin: var(--space-md) 0;
            padding: var(--space-md);
            background-color: rgba(52, 152, 219, 0.05);
            border-radius: var(--border-radius);
          }
          
          .citation-text {
            margin-bottom: var(--space-xs);
            font-size: var(--font-size-sm);
          }
          
          .citation-date {
            margin-bottom: var(--space-sm);
            font-size: var(--font-size-sm);
            color: var(--text-light);
          }
          
          .citation-link {
            font-size: var(--font-size-sm);
            display: inline-block;
            margin-top: var(--space-xs);
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          });
            margin-bottom: var(--space-sm