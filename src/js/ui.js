// ui.js - User interface functionality
export function initializeApp() {
/**
 * UI functionality for CVD Risk Toolkit; */

/**
 * Opens the specified tab and handles tab switching; * @param {Event} evt - The click event; * @param {string} tabId - The ID of the tab to open; */
function openTab(evt, tabId) {
    // Hide all tab content
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    };    
    // Remove active class from all tabs
    const tabs = document.getElementsByClassName('tab');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    };    
    // Show the selected tab content and mark the button as active
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
}

/**
 * Initialize the application; * This function sets up event listeners and initializes the UI; */
function _initializeApp() {
    console.log('Initializing CVD Risk Toolkit...');
    
    // Setup event listeners for tabs
    setupTabEventListeners();
    
    // Setup card headers
    setupCardHeaders();
    
    // Initialize tooltips and other UI elements
    initializeTooltips();
    setupModalClose();
    setupHelpModal();
    addClinicalValidation();
    
    // Set up cross-tab data sharing
    setupCrossTabDataSharing();
    
    // Setup height toggle event listeners
    setupHeightToggleListeners();
    
    // Setup SBP readings toggle
    setupSBPReadingsToggle();
    
    // Setup theme toggle
    setupThemeToggle();
    
    // Set current date
    document.querySelector('#results-date span').textContent = new Date().toLocaleDateString();
    
    console.log('CVD Risk Toolkit initialization complete');
}

/**
 * Set up event listeners for tabs; */
function setupTabEventListeners() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function(event) {
            event.preventDefault();
            const tabId = this.getAttribute('data-tab');
            openTab(event, tabId);
        });
    });
}

/**
 * Set up expandable/collapsible card headers; */
function setupCardHeaders() {
    const cardHeaders = document.querySelectorAll('.card-header');
    
    cardHeaders.forEach(header => {
        header.addEventListener('click', function() {
            // Toggle active class for header
            this.classList.toggle('active');
            
            // Toggle the display of card body
            const body = this.nextElementSibling;
            if (body.classList.contains('active')) {
                body.classList.remove('active');
                this.querySelector('.toggle-icon').textContent = '▲';
            } else {
                body.classList.add('active');
                this.querySelector('.toggle-icon').textContent = '▼';
            };        
});
    });
}

/**
 * Initialize tooltips for informational icons; */
function initializeTooltips() {
    const tooltipContainers = document.querySelectorAll('.tooltip-container');
    
    tooltipContainers.forEach(function(container) {
        const infoIcon = container.querySelector('.info-icon');
        const tooltipText = container.querySelector('.tooltip-text');
        
        if (infoIcon && tooltipText) {
            infoIcon.addEventListener('click', function(event) {
                event.stopPropagation();
                tooltipText.style.visibility = tooltipText.style.visibility === 'visible' ? 'hidden' : 'visible';
                tooltipText.style.opacity = tooltipText.style.opacity === '1' ? '0' : '1';
            });
            
            document.addEventListener('click', function() {
                tooltipText.style.visibility = 'hidden';
                tooltipText.style.opacity = '0';
            });
        };    
});
}

/**
 * Setup modal close functionality; */
function setupModalClose() {
    // Close modal when close button is clicked
    const closeButtons = document.querySelectorAll('.close-btn, .modal-close');
    closeButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            };        
});
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(function(modal) {
            if (event.target === modal) {
                modal.style.display = 'none';
            };        
});
    });
}

/**
 * Setup the help modal tabs; */
function setupHelpModal() {
    // Set up help tab navigation
    const helpTabs = document.querySelectorAll('.help-tab');
    helpTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and content
            document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.help-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding content
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Set up cross-tab data sharing to allow calculated risk scores; * to impact medication recommendations; */
function setupCrossTabDataSharing() {
    // Listen for risk calculation events
    document.addEventListener('risk-calculated', function(e) {
        // Update medication tab with risk information if available
        if (e.detail && e.detail.riskScore !== undefined) {
            // Store risk information in session storage for tab persistence
            sessionStorage.setItem('last-risk-score', e.detail.riskScore);
            sessionStorage.setItem('risk-calculator-used', e.detail.calculator || 'unknown');
            
            // Update comparison tab status
            updateComparisonTabStatus(e.detail.calculator.toLowerCase(), true);
        };    
});
    
    // Check if we have stored risk information on page load
    const storedRisk = sessionStorage.getItem('last-risk-score');
    const storedCalculator = sessionStorage.getItem('risk-calculator-used');
    
    if (storedRisk && storedCalculator) {
        // Update comparison tab status based on stored information
        if (storedCalculator === 'FRS') {
            updateComparisonTabStatus('frs', true);
        } else if (storedCalculator === 'QRISK3') {
            updateComparisonTabStatus('qrisk', true);
        } else if (storedCalculator === 'Combined') {
            updateComparisonTabStatus('frs', true);
            updateComparisonTabStatus('qrisk', true);
        };    
};
}

/**
 * Setup height toggle event listeners; */
function setupHeightToggleListeners() {
    const heightUnit = document.getElementById('qrisk-height-unit');
    if (heightUnit) {
        heightUnit.addEventListener('change', function() {
            toggleHeightInputs('qrisk');
        });
    };
}

/**
 * Toggle height inputs between cm and ft/in; * @param {string} prefix - Form prefix ('qrisk'); */
function toggleHeightInputs(prefix) {
    const heightUnit = document.getElementById(`${prefix}-height-unit`).value;
    const heightInput = document.getElementById(`${prefix}-height`);
    const heightFtContainer = document.getElementById(`${prefix}-height-ft-container`);
    
    if (heightUnit === 'cm') {
        heightInput.style.display = 'block';
        heightFtContainer.style.display = 'none';
        
        // If feet/inches values exist, convert to cm
        const feetInput = document.getElementById(`${prefix}-height-feet`);
        const inchesInput = document.getElementById(`${prefix}-height-inches`);
        
        if (feetInput.value && feetInput.value.trim() !== '') {
            const feet = parseFloat(feetInput.value) || 0;
            const inches = parseFloat(inchesInput.value) || 0;
            const cm = convertHeightToCm(feet, inches);
            heightInput.value = cm.toFixed(1);
        };    
} else {
        heightInput.style.display = 'none';
        heightFtContainer.style.display = 'flex';
        
        // If cm value exists, convert to feet/inches
        if (heightInput.value && heightInput.value.trim() !== '') {
            const cm = parseFloat(heightInput.value);
            const totalInches = cm / 2.54;
            const feet = Math.floor(totalInches / 12);
            const inches = Math.round(totalInches % 12);
            
            document.getElementById(`${prefix}-height-feet`).value = feet;
            document.getElementById(`${prefix}-height-inches`).value = inches;
        };    
};
}

/**
 * Setup SBP readings toggle; */
function setupSBPReadingsToggle() {
    const qriskToggle = document.getElementById('qrisk-toggle-sbp-readings');
    if (qriskToggle) {
        qriskToggle.addEventListener('click', function() {
            const readingsDiv = document.getElementById('qrisk-sbp-readings');
            if (readingsDiv.style.display === 'none') {
                readingsDiv.style.display = 'block';
                this.textContent = 'Hide readings form';
            } else {
                readingsDiv.style.display = 'none';
                this.textContent = 'Calculate from multiple readings';
            };        
});
    };
}

/**
 * Setup dark/light theme toggle; */
function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Check if theme preference is stored
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.body.classList.toggle('dark-theme', currentTheme === 'dark');
        
        // Update icon based on current theme
        updateThemeIcon(currentTheme === 'dark');
        
        // Add click event
        themeToggle.addEventListener('click', function() {
            // Toggle theme
            const isDarkTheme = document.body.classList.toggle('dark-theme');
            
            // Save preference
            localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
            
            // Update icon
            updateThemeIcon(isDarkTheme);
        });
    };
}

/**
 * Update theme toggle icon based on current theme; * @param {boolean} isDarkTheme - Whether dark theme is active; */
function updateThemeIcon(isDarkTheme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        if (isDarkTheme) {
            themeToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"></path></svg>';
            themeToggle.setAttribute('aria-label', 'Switch to light mode');
        } else {
            themeToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';
            themeToggle.setAttribute('aria-label', 'Switch to dark mode');
        };    
};
}

/**
 * Handle "Reset Form" button clicks; * @param {string} formId - ID of the form to reset; */
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (!form) {
        return;
    };    
    // Reset all inputs to default values
    form.reset();
    
    // Clear any error styling
    const errorFields = form.querySelectorAll('.error');
    errorFields.forEach(field => field.classList.remove('error'));
    
    // Hide error messages
    const errorMessages = form.querySelectorAll('.error-message');
    errorMessages.forEach(message => message.style.display = 'none');
    
    // Clear any calculated values or results
    const nonHDLInput = form.querySelector('#med-non-hdl');
    if (nonHDLInput) {
        nonHDLInput.value = '';
        nonHDLInput.disabled = true;
        const toggleLink = document.getElementById('toggle-manual-non-hdl');
        if (toggleLink) toggleLink.textContent = 'Enter manually';
    };    
    // Reset PCSK9 details if present
    const pcsk9Details = document.getElementById('pcsk9-details');
    if (pcsk9Details) pcsk9Details.style.display = 'none';
    
    // Reset any dependent selects or fields
    const statinDoseSelect = form.querySelector('#med-statin-dose');
    if (statinDoseSelect) {
        statinDoseSelect.innerHTML = '<option value="" selected>Select dose</option>';
        statinDoseSelect.disabled = true;
    };    
    const secondaryDetails = form.querySelector('#secondary-details');
    if (secondaryDetails) secondaryDetails.disabled = true;
    
    const intoleranceType = form.querySelector('#med-intolerance-type');
    if (intoleranceType) intoleranceType.disabled = true;
    
    // Clear SBP readings if present
    for (let i = 1; i <= 6; i++) {
        const reading = form.querySelector(`#${formId.split('-')[0]}-sbp-reading-${i}`);
        if (reading) reading.value = '';
    };    
    const sbpResult = document.getElementById(`${formId.split('-')[0]}-sbp-sd-result`);
    if (sbpResult) sbpResult.style.display = 'none';
    
    // Reset height/feet view if applicable
    const heightUnit = form.querySelector(`#${formId.split('-')[0]}-height-unit`);
    if (heightUnit && heightUnit.value === 'ft/in') {
        heightUnit.value = 'cm';
        toggleHeightInputs(formId.split('-')[0]);
    };    
    // Update comparison tab status if applicable
    if (formId === 'frs-form') {
        updateComparisonTabStatus('frs', false);
    } else if (formId === 'qrisk-form') {
        updateComparisonTabStatus('qrisk', false);
    };    
    // Hide results display
    document.getElementById('results-container').style.display = 'none';
}

/**
 * Export results to CSV or PDF; * @param {string} format - 'csv' or 'pdf'
 */
function exportResults(format) {
    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer || resultsContainer.style.display === 'none') {
        showModal('No results to export. Please calculate risk scores first.');
        return;
    };    
    if (format === 'csv') {
        exportToCSV();
    } else if (format === 'pdf') {
        showPdfPreview();
    };
}

/**
 * Export results to CSV file; */
function exportToCSV() {
    // Get data from results
    const riskTitle = document.querySelector('.risk-title')?.textContent || 'CVD Risk Assessment';
    const baseRisk = document.querySelector('.base-risk')?.textContent || 'N/A';
    const lpaModifier = document.querySelector('.lpa-modifier')?.textContent || 'N/A';
    const adjustedRisk = document.querySelector('.adjusted-risk')?.textContent || 'N/A';
    const riskCategory = document.querySelector('.risk-category')?.textContent || 'N/A';
    const date = document.querySelector('#results-date span')?.textContent || new Date().toLocaleDateString();
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'CVD Risk Assessment Results,\r\n';
    csvContent += 'Date,' + date + '\r\n\r\n';
    csvContent += 'Assessment Type,' + riskTitle + '\r\n';
    csvContent += 'Base Risk,' + baseRisk + '\r\n';
    csvContent += 'Lp(a) Modifier,' + lpaModifier + '\r\n';
    csvContent += 'Adjusted Risk,' + adjustedRisk + '\r\n';
    csvContent += 'Risk Category,' + riskCategory + '\r\n\r\n';
    
    // Add recommendations (cleaned of HTML)
    const recommendations = document.getElementById('recommendations-content');
    if (recommendations) {
        const recItems = recommendations.querySelectorAll('.recommendation-item');
        if (recItems.length > 0) {
            csvContent += 'Treatment Recommendations,\r\n';
            
            recItems.forEach(item => {
                const title = item.querySelector('strong')?.textContent || '';
                const content = item.textContent.replace(title, '').trim();
                csvContent += title + ',' + content.replace(/,/g, ';') + '\r\n';
            });
        };    
};    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'cvd_risk_assessment_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    document.body.removeChild(link);
}

/**
 * Show PDF preview before export; */
function showPdfPreview() {
    const previewModal = document.getElementById('pdf-preview-modal');
    const previewContent = document.getElementById('pdf-preview-content');
    
    if (!previewModal || !previewContent) {
        showModal('PDF preview functionality is not available. Please try again later.');
        return;
    };    
    // Clone the results section for preview
    const resultsContainer = document.getElementById('results-container');
    previewContent.innerHTML = '';
    previewContent.appendChild(resultsContainer.cloneNode(true));
    
    // Add preview styling
    previewContent.querySelector('.export-section').style.display = 'none';
    
    // Show the preview modal
    previewModal.style.display = 'block';
    
    // Setup download button
    document.getElementById('download-pdf-btn').addEventListener('click', function() {
        // In a real implementation, this would use a library like jsPDF or html2pdf
        // For this demo, we'll just show a message
        showModal('PDF generation would be implemented here with a library like jsPDF or html2pdf.');
        previewModal.style.display = 'none';
    });
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);



}

export function openTab(evt, tabId) {
  // Implementation
}

// Make functions available globally for backward compatibility
window.initializeApp = initializeApp;
window.openTab = openTab;
