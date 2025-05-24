/**
 * PDF Generator for CVD Risk Toolkit
 * Generates PDF reports of risk assessments and recommendations
 * 
 * Path: js/utils/pdf-generator.js
 * 
 * @requires js/utils/event-bus.js
 * @requires js/utils/error-detection-system.js
 * @requires js/utils/security-validation.js
 * @requires js/utils/chart-exporter.js
 * @requires libs/jspdf.min.js
 * @requires libs/html2canvas.min.js
 */

// Use strict mode to catch common coding errors
'use strict';

/**
 * PDFGenerator class - Generates PDF reports from risk assessment data
 */
class PDFGenerator {
    constructor() {
        // Singleton pattern
        if (PDFGenerator.instance) {
            return PDFGenerator.instance;
        }
        
        PDFGenerator.instance = this;
        
        // Initialize properties
        this.initialized = false;
        this.generationInProgress = false;
        this.fonts = {
            loaded: false,
            default: 'helvetica',
            bold: 'helvetica-bold',
            italic: 'helvetica-oblique',
            boldItalic: 'helvetica-boldoblique'
        };
        this.pageSize = 'letter';
        this.pageOrientation = 'portrait';
        this.margin = 20;
        this.logoImage = null;
        this.debugMode = false;
        this.headerFooterEnabled = true;
        
        // Initialize the module
        this.init();
    }
    
    /**
     * Initialize the module
     * @private
     */
    init() {
        try {
            // Check for required libraries
            this.checkDependencies();
            
            // Initialize dependencies
            this.initializeDependencies();
            
            // Load resources
            this.loadResources();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            
            // Log initialization success in debug mode
            if (this.debugMode) {
                console.log('PDF Generator initialized successfully');
            }
            
            // Publish initialization complete event
            this.eventBus.publish('pdfGenerator:initialized', { success: true });
        } catch (error) {
            console.error('Failed to initialize PDF Generator:', error);
            
            // Report error
            if (this.errorSystem) {
                this.errorSystem.reportError({
                    component: 'PDFGenerator',
                    method: 'init',
                    error: error
                });
            }
            
            // Publish initialization failed event
            if (this.eventBus) {
                this.eventBus.publish('pdfGenerator:initialized', { 
                    success: false,
                    error: error.message
                });
            }
        }
    }
    
    /**
     * Check for required libraries
     * @private
     * @throws {Error} If required libraries are not available
     */
    checkDependencies() {
        // Check for jsPDF
        if (typeof jsPDF === 'undefined') {
            throw new Error('jsPDF library is required but not loaded');
        }
        
        // Check for html2canvas
        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas library is required but not loaded');
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
        
        // Initialize security validation with fallback
        this.securityValidation = window.securityValidation || {
            sanitizeFileName: (name) => name.replace(/[^a-z0-9_\-]/gi, '_')
        };
        
        // Initialize chart exporter with fallback
        this.chartExporter = window.chartExporter || {
            exportChartAsImage: () => Promise.reject('Chart exporter not available')
        };
    }
    
    /**
     * Load required resources
     * @private
     */
    async loadResources() {
        try {
            // Load logo image
            const logoUrl = 'assets/images/cvd-toolkit-logo.png';
            this.logoImage = await this.loadImage(logoUrl);
            
            // Mark fonts as loaded (default fonts are built into jsPDF)
            this.fonts.loaded = true;
        } catch (error) {
            console.warn('Failed to load some PDF resources:', error);
            // Continue initialization even if resources fail to load
        }
    }
    
    /**
     * Load an image for use in PDFs
     * @param {string} url - Image URL
     * @returns {Promise<HTMLImageElement>} Loaded image
     * @private
     */
    loadImage(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            image.src = url;
        });
    }
    
    /**
     * Set up event listeners
     * @private
     */
    setupEventListeners() {
        // Listen for generate PDF requests
        this.eventBus.subscribe('report:generatePDFRequested', this.handlePDFRequest.bind(this));
        
        // Listen for preferences updates
        this.eventBus.subscribe('preferences:updated', this.handlePreferencesUpdate.bind(this));
        
        // Add DOM event listeners once the document is loaded
        document.addEventListener('DOMContentLoaded', () => {
            // PDF generation buttons
            const pdfButtons = document.querySelectorAll('.generate-pdf-button');
            pdfButtons.forEach(button => {
                button.addEventListener('click', (event) => {
                    const calculatorType = event.target.getAttribute('data-calculator') || 'unknown';
                    this.generatePDFReport(calculatorType);
                });
            });
        });
    }
    
    /**
     * Handle PDF generation request event
     * @param {Object} data - PDF request data
     * @private
     */
    handlePDFRequest(data) {
        try {
            // Validate request data
            if (!data || !data.reportType) {
                throw new Error('Invalid PDF request data');
            }
            
            this.generatePDFReport(data.reportType, data.options);
        } catch (error) {
            this.errorSystem.reportError({
                component: 'PDFGenerator',
                method: 'handlePDFRequest',
                error: error,
                data: data
            });
        }
    }
    
    /**
     * Handle preferences update event
     * @param {Object} data - Preferences data
     * @private
     */
    handlePreferencesUpdate(data) {
        try {
            if (data && data.preferences) {
                // Apply preference changes
                if (data.preferences.debugMode !== undefined) {
                    this.debugMode = Boolean(data.preferences.debugMode);
                }
                
                if (data.preferences.pdfPageSize) {
                    this.pageSize = data.preferences.pdfPageSize;
                }
                
                if (data.preferences.pdfPageOrientation) {
                    this.pageOrientation = data.preferences.pdfPageOrientation;
                }
                
                if (data.preferences.pdfHeaderFooter !== undefined) {
                    this.headerFooterEnabled = Boolean(data.preferences.pdfHeaderFooter);
                }
            }
        } catch (error) {
            this.errorSystem.reportError({
                component: 'PDFGenerator',
                method: 'handlePreferencesUpdate',
                error: error
            });
        }
    }
    
    /**
     * Generate a PDF report
     * @param {string} reportType - Type of report to generate (frs, qrisk, combined, medication)
     * @param {Object} options - Additional options for PDF generation
     * @returns {Promise<boolean>} Success status
     * @public
     */
    async generatePDFReport(reportType, options = {}) {
        try {
            if (this.generationInProgress) {
                console.warn('PDF generation already in progress');
                return false;
            }
            
            this.generationInProgress = true;
            
            // Show loading indicator
            this.showLoadingState(true, reportType);
            
            // Validate report type
            if (!['frs', 'qrisk', 'combined', 'medication'].includes(reportType)) {
                throw new Error(`Invalid report type: ${reportType}`);
            }
            
            // Check if charts need to be captured
            const includeCharts = options.includeCharts !== false;
            
            // Get report data
            const reportData = await this.getReportData(reportType);
            
            // Create PDF document
            const pdf = new jsPDF({
                orientation: this.pageOrientation,
                unit: 'mm',
                format: this.pageSize
            });
            
            // Add metadata
            pdf.setProperties({
                title: `CVD Risk Assessment - ${this.getReportTitle(reportType)}`,
                subject: 'Cardiovascular Risk Assessment',
                author: 'CVD Risk Toolkit',
                keywords: 'CVD, cardiovascular, risk assessment, health',
                creator: 'CVD Risk Toolkit PDF Generator'
            });
            
            // Set initial font
            pdf.setFont(this.fonts.default);
            pdf.setFontSize(11);
            
            // Calculate page dimensions
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const contentWidth = pageWidth - (this.margin * 2);
            
            // Add header
            let yPos = this.margin;
            yPos = await this.addHeader(pdf, reportType, yPos);
            
            // Add report title
            pdf.setFont(this.fonts.bold);
            pdf.setFontSize(16);
            const reportTitle = this.getReportTitle(reportType);
            pdf.text(reportTitle, pageWidth / 2, yPos, { align: 'center' });
            yPos += 10;
            
            // Add report date
            pdf.setFont(this.fonts.default);
            pdf.setFontSize(10);
            const dateStr = new Date().toLocaleDateString();
            pdf.text(`Report Date: ${dateStr}`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 15;
            
            // Add patient information section if available
            if (reportData.patient) {
                yPos = this.addPatientSection(pdf, reportData.patient, yPos);
            }
            
            // Add risk score section
            if (reportData.risk) {
                yPos = this.addRiskScoreSection(pdf, reportData.risk, reportType, yPos);
                
                // Add risk chart if available and requested
                if (includeCharts && reportData.riskElementId) {
                    yPos = await this.addRiskChart(pdf, reportData.riskElementId, reportType, yPos);
                }
            }
            
            // Check if we need a new page for recommendations
            if (yPos > pageHeight - 100) {
                pdf.addPage();
                yPos = this.margin;
                
                // Add header on new page
                yPos = await this.addHeader(pdf, reportType, yPos);
            }
            
            // Add treatment recommendations section
            if (reportData.recommendations) {
                yPos = this.addRecommendationsSection(pdf, reportData.recommendations, yPos);
            }
            
            // Add footer
            this.addFooter(pdf);
            
            // Save the PDF
            const filename = this.generateFilename(reportType, reportData);
            pdf.save(filename);
            
            // Reset state
            this.generationInProgress = false;
            this.showLoadingState(false, reportType);
            
            // Publish PDF generation complete event
            this.eventBus.publish('report:pdfGenerated', { 
                success: true,
                reportType: reportType,
                filename: filename
            });
            
            return true;
        } catch (error) {
            this.errorSystem.reportError({
                component: 'PDFGenerator',
                method: 'generatePDFReport',
                error: error,
                reportType: reportType
            });
            
            // Reset state
            this.generationInProgress = false;
            this.showLoadingState(false, reportType);
            
            // Publish PDF generation failed event
            this.eventBus.publish('report:pdfGenerated', { 
                success: false,
                reportType: reportType,
                error: error.message
            });
            
            // Show error message to user
            alert(`Failed to generate PDF report: ${error.message}`);
            
            return false;
        }
    }
    
    /**
     * Show or hide loading state for PDF generation
     * @param {boolean} isLoading - Whether loading is in progress
     * @param {string} reportType - Type of report
     * @private
     */
    showLoadingState(isLoading, reportType) {
        // Update UI loading indicator based on report type
        const loadingElement = document.getElementById(`${reportType}-pdf-loading`);
        const buttonElement = document.querySelector(`.generate-pdf-button[data-calculator="${reportType}"]`);
        
        if (loadingElement) {
            loadingElement.style.display = isLoading ? 'block' : 'none';
        }
        
        if (buttonElement) {
            buttonElement.disabled = isLoading;
            buttonElement.textContent = isLoading ? 'Generating PDF...' : 'Generate PDF Report';
        }
    }
    
    /**
     * Get data for report generation
     * @param {string} reportType - Type of report
     * @returns {Promise<Object>} Report data
     * @private
     */
    async getReportData(reportType) {
        // Initialize empty report data
        const reportData = {
            patient: {},
            risk: null,
            recommendations: null,
            riskElementId: null
        };
        
        try {
            // Get patient information from form
            const patientForm = document.getElementById(`${reportType}-form`) || 
                               document.getElementById('patient-info-form');
            
            if (patientForm) {
                reportData.patient = this.getPatientDataFromForm(patientForm);
            }
            
            // Get risk data based on report type
            switch (reportType) {
                case 'frs':
                    reportData.risk = window.framinghamResults || 
                                     window.memoryManager?.retrieve('lastFrsResult');
                    reportData.recommendations = window.treatmentRecommendations?.getRecommendations(
                        reportData.risk?.inputs, 'frs'
                    );
                    reportData.riskElementId = 'frs-risk-visualization';
                    break;
                    
                case 'qrisk':
                    reportData.risk = window.qrisk3Results || 
                                    window.memoryManager?.retrieve('lastQriskResult');
                    reportData.recommendations = window.treatmentRecommendations?.getRecommendations(
                        reportData.risk?.inputs, 'qrisk'
                    );
                    reportData.riskElementId = 'qrisk-risk-visualization';
                    break;
                    
                case 'combined':
                    reportData.risk = window.combinedResults || 
                                    window.memoryManager?.retrieve('lastCombinedResult');
                    
                    if (!reportData.risk && window.combinedViewManager) {
                        // Try to get results from the view manager
                        window.combinedViewManager.runComparison();
                        reportData.risk = window.combinedResults || 
                                        window.memoryManager?.retrieve('lastCombinedResult');
                    }
                    
                    reportData.recommendations = window.treatmentRecommendations?.getRecommendations(
                        reportData.risk?.inputs, 'combined'
                    );
                    reportData.riskElementId = 'comparison-chart';
                    break;
                    
                case 'medication':
                    // For medication reports, focus on recommendations
                    reportData.risk = window.framinghamResults || 
                                    window.memoryManager?.retrieve('lastFrsResult') || 
                                    window.qrisk3Results || 
                                    window.memoryManager?.retrieve('lastQriskResult');
                    
                    // Get medication assessment results
                    const medResults = document.getElementById('medication-results');
                    if (medResults) {
                        reportData.recommendations = {
                            treatmentSummary: this.extractMedicationRecommendations(medResults)
                        };
                    }
                    break;
            }
            
            return reportData;
        } catch (error) {
            this.errorSystem.reportError({
                component: 'PDFGenerator',
                method: 'getReportData',
                error: error,
                reportType: reportType
            });
            
            // Return partial data
            return reportData;
        }
    }
    
    /**
     * Extract patient data from form
     * @param {HTMLFormElement} form - Patient information form
     * @returns {Object} Patient data
     * @private
     */
    getPatientDataFromForm(form) {
        const patientData = {};
        
        try {
            // Basic patient information
            const nameInput = form.querySelector('[name$="name"]');
            const idInput = form.querySelector('[name$="patient-id"]');
            const dobInput = form.querySelector('[name$="dob"]');
            const sexInput = form.querySelector('[name$="sex"]:checked');
            
            if (nameInput) patientData.name = nameInput.value;
            if (idInput) patientData.id = idInput.value;
            if (dobInput) patientData.dob = dobInput.value;
            if (sexInput) patientData.sex = sexInput.value;
            
            // If no DOB but age is available
            if (!patientData.dob) {
                const ageInput = form.querySelector('[name$="age"]');
                if (ageInput) patientData.age = ageInput.value;
            }
        } catch (error) {
            console.warn('Error extracting patient data from form:', error);
        }
        
        return patientData;
    }
    
    /**
     * Extract medication recommendations from results container
     * @param {HTMLElement} resultsContainer - Medication results container
     * @returns {Object} Medication recommendations
     * @private
     */
    extractMedicationRecommendations(resultsContainer) {
        const recommendations = {
            primary: '',
            secondary: [],
            lifestyle: [],
            lipidTargets: {},
            followUp: ''
        };
        
        try {
            // Extract primary recommendation
            const primaryRec = resultsContainer.querySelector('.treatment-primary');
            if (primaryRec) {
                recommendations.primary = primaryRec.textContent;
            }
            
            // Extract secondary recommendations
            const secondaryItems = resultsContainer.querySelectorAll('.treatment-secondary li');
            secondaryItems.forEach(item => {
                recommendations.secondary.push(item.textContent);
            });
            
            // Extract lifestyle recommendations
            const lifestyleItems = resultsContainer.querySelectorAll('.lifestyle-recommendations li');
            lifestyleItems.forEach(item => {
                recommendations.lifestyle.push(item.textContent);
            });
            
            // Extract lipid targets
            const lipidTargets = resultsContainer.querySelectorAll('.lipid-targets li');
            lipidTargets.forEach(item => {
                const text = item.textContent;
                const match = text.match(/^([^:]+):\s*(.+)$/);
                if (match) {
                    recommendations.lipidTargets[match[1].trim()] = match[2].trim();
                }
            });
            
            // Extract follow-up information
            const followUp = resultsContainer.querySelector('.follow-up');
            if (followUp) {
                recommendations.followUp = followUp.textContent;
            }
        } catch (error) {
            console.warn('Error extracting medication recommendations:', error);
        }
        
        return recommendations;
    }
    
    /**
     * Get report title based on report type
     * @param {string} reportType - Type of report
     * @returns {string} Report title
     * @private
     */
    getReportTitle(reportType) {
        switch (reportType) {
            case 'frs':
                return 'Framingham Risk Score Assessment';
            case 'qrisk':
                return 'QRISK3 Assessment';
            case 'combined':
                return 'Combined Risk Assessment (FRS + QRISK3)';
            case 'medication':
                return 'Lipid-Lowering Therapy Assessment';
            default:
                return 'Cardiovascular Risk Assessment';
        }
    }
    
    /**
     * Generate filename for PDF
     * @param {string} reportType - Type of report
     * @param {Object} reportData - Report data
     * @returns {string} Filename
     * @private
     */
    generateFilename(reportType, reportData) {
        // Base filename
        let filename = `cvd_risk_${reportType}_`;
        
        // Add patient identifier if available
        if (reportData.patient && reportData.patient.name) {
            const sanitizedName = this.securityValidation.sanitizeFileName(reportData.patient.name);
            filename += `${sanitizedName}_`;
        }
        
        // Add date
        const date = new Date().toISOString().split('T')[0];
        filename += date;
        
        return `${filename}.pdf`;
    }
    
    /**
     * Add header to PDF
     * @param {jsPDF} pdf - PDF document
     * @param {string} reportType - Type of report
     * @param {number} yPos - Current Y position
     * @returns {Promise<number>} New Y position
     * @private
     */
    async addHeader(pdf, reportType, yPos) {
        try {
            if (!this.headerFooterEnabled) {
                return yPos;
            }
            
            const pageWidth = pdf.internal.pageSize.getWidth();
            
            // Add logo if available
            if (this.logoImage) {
                // Calculate logo dimensions (max height 15mm)
                const maxHeight = 15;
                const aspectRatio = this.logoImage.width / this.logoImage.height;
                const logoHeight = Math.min(maxHeight, 15);
                const logoWidth = logoHeight * aspectRatio;
                
                // Add logo to PDF
                pdf.addImage(
                    this.logoImage, 
                    'PNG', 
                    this.margin, 
                    yPos, 
                    logoWidth, 
                    logoHeight
                );
                
                // Add title next to logo
                pdf.setFont(this.fonts.bold);
                pdf.setFontSize(14);
                pdf.text(
                    'CVD Risk Toolkit', 
                    this.margin + logoWidth + 5, 
                    yPos + (logoHeight / 2)
                );
                
                yPos += logoHeight + 5;
            } else {
                // No logo available, just add title
                pdf.setFont(this.fonts.bold);
                pdf.setFontSize(16);
                pdf.text('CVD Risk Toolkit', this.margin, yPos + 8);
                yPos += 15;
            }
            
            // Add separator line
            pdf.setDrawColor(100, 100, 100);
            pdf.line(this.margin, yPos, pageWidth - this.margin, yPos);
            yPos += 10;
            
            return yPos;
        } catch (error) {
            console.warn('Error adding header to PDF:', error);
            return yPos + 15; // Return updated yPos even if header fails
        }
    }
    
    /**
     * Add footer to PDF
     * @param {jsPDF} pdf - PDF document
     * @private
     */
    addFooter(pdf) {
        try {
            if (!this.headerFooterEnabled) {
                return;
            }
            
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Save current font settings
            const currentFontSize = pdf.getFontSize();
            const currentFont = pdf.getFont().fontName;
            
            // Set footer font
            pdf.setFont(this.fonts.default);
            pdf.setFontSize(8);
            
            // Add separator line
            pdf.setDrawColor(100, 100, 100);
            pdf.line(this.margin, pageHeight - 15, pageWidth - this.margin, pageHeight - 15);
            
            // Add copyright and disclaimer
            pdf.text(
                'CVD Risk Toolkit - For clinical use only', 
                pageWidth / 2, 
                pageHeight - 10, 
                { align: 'center' }
            );
            
            pdf.text(
                'Page ' + pdf.internal.getNumberOfPages(),
                pageWidth - this.margin, 
                pageHeight - 10, 
                { align: 'right' }
            );
            
            // Restore original font settings
            pdf.setFontSize(currentFontSize);
            pdf.setFont(currentFont);
        } catch (error) {
            console.warn('Error adding footer to PDF:', error);
        }
    }
    
    /**
     * Add patient information section to PDF
     * @param {jsPDF} pdf - PDF document
     * @param {Object} patient - Patient information
     * @param {number} yPos - Current Y position
     * @returns {number} New Y position
     * @private
     */
    addPatientSection(pdf, patient, yPos) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (this.margin * 2);
        
        // Section header
        pdf.setFont(this.fonts.bold);
        pdf.setFontSize(12);
        pdf.text('Patient Information', this.margin, yPos);
        yPos += 8;
        
        // Set regular font for content
        pdf.setFont(this.fonts.default);
        pdf.setFontSize(10);
        
        // Add patient information if available
        const infoLines = [];
        
        if (patient.name) {
            infoLines.push(`Name: ${patient.name}`);
        }
        
        if (patient.id) {
            infoLines.push(`ID: ${patient.id}`);
        }
        
        if (patient.dob) {
            infoLines.push(`Date of Birth: ${patient.dob}`);
        } else if (patient.age) {
            infoLines.push(`Age: ${patient.age} years`);
        }
        
        if (patient.sex) {
            infoLines.push(`Sex: ${patient.sex.toUpperCase()}`);
        }
        
        // If no patient data is available
        if (infoLines.length === 0) {
            infoLines.push('No patient information available');
        }
        
        // Add info lines
        for (let i = 0; i < infoLines.length; i++) {
            pdf.text(infoLines[i], this.margin, yPos);
            yPos += 6;
        }
        
        yPos += 5;
        
        // Add separator line
        pdf.setDrawColor(200, 200, 200);
        pdf.line(this.margin, yPos, pageWidth - this.margin, yPos);
        yPos += 10;
        
        return yPos;
    }
    
    /**
     * Add risk score section to PDF
     * @param {jsPDF} pdf - PDF document
     * @param {Object} riskData - Risk score data
     * @param {string} reportType - Type of report
     * @param {number} yPos - Current Y position
     * @returns {number} New Y position
     * @private
     */
    addRiskScoreSection(pdf, riskData, reportType, yPos) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (this.margin * 2);
        
        // Section header
        pdf.setFont(this.fonts.bold);
        pdf.setFontSize(12);
        pdf.text('Risk Assessment Results', this.margin, yPos);
        yPos += 8;
        
        // Set regular font for content
        pdf.setFont(this.fonts.default);
        pdf.setFontSize(10);
        
        // Format depends on report type
        if (reportType === 'combined' && riskData.frs && riskData.qrisk) {
            // Combined report with both scores
            const frsRisk = riskData.frs.risk.toFixed(1);
            const qriskRisk = riskData.qrisk.risk.toFixed(1);
            const avgRisk = ((parseFloat(frsRisk) + parseFloat(qriskRisk)) / 2).toFixed(1);
            
            // Draw table headers
            pdf.setFont(this.fonts.bold);
            pdf.text('Calculator', this.margin, yPos);
            pdf.text('10-Year Risk (%)', this.margin + 60, yPos);
            pdf.text('Risk Category', this.margin + 110, yPos);
            yPos += 6;
            
            // Draw separator line
            pdf.setDrawColor(200, 200, 200);
            pdf.line(this.margin, yPos, pageWidth - this.margin, yPos);
            yPos += 4;
            
            // Draw FRS row
            pdf.setFont(this.fonts.default);
            pdf.text('Framingham Risk Score', this.margin, yPos);
            pdf.text(frsRisk + '%', this.margin + 60, yPos);
            pdf.text(this.getRiskCategory(parseFloat(frsRisk)), this.margin + 110, yPos);
            yPos += 6;
            
            // Draw QRISK3 row
            pdf.text('QRISK3', this.margin, yPos);
            pdf.text(qriskRisk + '%', this.margin + 60, yPos);
            pdf.text(this.getRiskCategory(parseFloat(qriskRisk)), this.margin + 110, yPos);
            yPos += 6;
            
            // Draw Average row
            pdf.setFont(this.fonts.bold);
            pdf.text('Average Risk', this.margin, yPos);
            pdf.text(avgRisk + '%', this.margin + 60, yPos);
            pdf.text(this.getRiskCategory(parseFloat(avgRisk)), this.margin + 110, yPos);
            yPos += 10;
            
            // Add explanation if available
            if (riskData.explanation) {
                pdf.setFont(this.fonts.bold);
                pdf.text('Explanation of Differences:', this.margin, yPos);
                yPos += 6;
                
                pdf.setFont(this.fonts.default);
                
                // Extract text content from HTML explanation
                const explanation = this.htmlToPlainText(riskData.explanation);
                const explanationLines = pdf.splitTextToSize(explanation, contentWidth);
                
                pdf.text(explanationLines, this.margin, yPos);
                yPos += explanationLines.length * 5 + 5;
            }
            
            // Add recommendation if available
            if (riskData.recommendation) {
                pdf.setFont(this.fonts.bold);
                pdf.text('Recommended Approach:', this.margin, yPos);
                yPos += 6;
                
                pdf.setFont(this.fonts.default);
                pdf.text(
                    riskData.recommendation.calculator === 'frs' ? 'Use Framingham Risk Score' : 
                    riskData.recommendation.calculator === 'qrisk' ? 'Use QRISK3 Score' : 
                    'Consider both scores (use average or higher value)',
                    this.margin, 
                    yPos
                );
                yPos += 6;
                
                pdf.text('Rationale:', this.margin, yPos);
                yPos += 6;
                
                const rationaleLines = pdf.splitTextToSize(riskData.recommendation.rationale, contentWidth);
                pdf.text(rationaleLines, this.margin, yPos);
                yPos += rationaleLines.length * 5 + 5;
            }
        } else {
            // Single calculator report
            let riskScore = null;
            
            if (reportType === 'frs' && riskData.risk) {
                riskScore = riskData.risk;
            } else if (reportType === 'qrisk' && riskData.risk) {
                riskScore = riskData.risk;
            } else if (riskData.risk) {
                riskScore = riskData.risk;
            }
            
            if (riskScore) {
                const formattedRisk = typeof riskScore === 'number' ? riskScore.toFixed(1) : riskScore;
                
                pdf.setFont(this.fonts.bold);
                pdf.setFontSize(14);
                pdf.text(`10-Year Risk: ${formattedRisk}%`, this.margin, yPos);
                yPos += 8;
                
                pdf.setFontSize(12);
                pdf.text(`Risk Category: ${this.getRiskCategory(parseFloat(formattedRisk))}`, this.margin, yPos);
                yPos += 8;
                
                // Add risk factors if available
                pdf.setFontSize(10);
                if (riskData.inputs) {
                    pdf.setFont(this.fonts.bold);
                    pdf.text('Risk Factors Considered:', this.margin, yPos);
                    yPos += 6;
                    
                    pdf.setFont(this.fonts.default);
                    
                    // List key risk factors
                    const riskFactors = this.extractRiskFactors(riskData.inputs, reportType);
                    
                    for (let i = 0; i < riskFactors.length; i++) {
                        pdf.text(`• ${riskFactors[i]}`, this.margin + 4, yPos);
                        yPos += 6;
                    }
                    
                    yPos += 5;
                }
            } else {
                pdf.text('No risk assessment data available', this.margin, yPos);
                yPos += 10;
            }
        }
        
        // Add separator line
        pdf.setDrawColor(200, 200, 200);
        pdf.line(this.margin, yPos, pageWidth - this.margin, yPos);
        yPos += 10;
        
        return yPos;
    }
    
    /**
     * Add risk chart visualization to PDF
     * @param {jsPDF} pdf - PDF document
     * @param {string} elementId - Element ID containing chart
     * @param {string} reportType - Type of report
     * @param {number} yPos - Current Y position
     * @returns {Promise<number>} New Y position
     * @private
     */
    async addRiskChart(pdf, elementId, reportType, yPos) {
        try {
            const chartElement = document.getElementById(elementId);
            
            if (!chartElement) {
                return yPos;
            }
            
            // Get chart image from chart exporter
            let chartImage;
            
            if (window.chartExporter && window.chartExporter.exportChartAsImage) {
                chartImage = await window.chartExporter.exportChartAsImage(elementId);
            } else {
                // Fallback to html2canvas
                const canvas = await html2canvas(chartElement, {
                    scale: 2,
                    logging: this.debugMode,
                    backgroundColor: null
                });
                
                chartImage = canvas.toDataURL('image/png');
            }
            
            if (!chartImage) {
                return yPos;
            }
            
            const pageWidth = pdf.internal.pageSize.getWidth();
            const contentWidth = pageWidth - (this.margin * 2);
            
            // Section header
            pdf.setFont(this.fonts.bold);
            pdf.setFontSize(12);
            pdf.text('Risk Visualization', this.margin, yPos);
            yPos += 8;
            
            // Add chart image
            const chartWidth = contentWidth;
            const chartHeight = 80;
            
            pdf.addImage(
                chartImage,
                'PNG',
                this.margin,
                yPos,
                chartWidth,
                chartHeight
            );
            
            yPos += chartHeight + 10;
            
            return yPos;
        } catch (error) {
            console.warn('Error adding risk chart to PDF:', error);
            return yPos;
        }
    }
    
    /**
     * Add treatment recommendations section to PDF
     * @param {jsPDF} pdf - PDF document
     * @param {Object} recommendations - Treatment recommendations
     * @param {number} yPos - Current Y position
     * @returns {number} New Y position
     * @private
     */
    addRecommendationsSection(pdf, recommendations, yPos) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (this.margin * 2);
        
        // Section header
        pdf.setFont(this.fonts.bold);
        pdf.setFontSize(12);
        pdf.text('Treatment Recommendations', this.margin, yPos);
        yPos += 8;
        
        // Set regular font for content
        pdf.setFont(this.fonts.default);
        pdf.setFontSize(10);
        
        // Check if we have recommendations
        if (!recommendations || (!recommendations.primary && !recommendations.treatmentSummary)) {
            pdf.text('No treatment recommendations available', this.margin, yPos);
            yPos += 10;
            return yPos;
        }
        
        // Primary recommendation
        const primaryRec = recommendations.primary || recommendations.treatmentSummary?.primary || '';
        
        if (primaryRec) {
            pdf.setFont(this.fonts.bold);
            pdf.text('Primary Recommendation:', this.margin, yPos);
            yPos += 6;
            
            pdf.setFont(this.fonts.default);
            const primaryLines = pdf.splitTextToSize(primaryRec, contentWidth);
            pdf.text(primaryLines, this.margin, yPos);
            yPos += primaryLines.length * 5 + 5;
        }
        
        // Secondary recommendations
        const secondaryRecs = recommendations.secondary || recommendations.treatmentSummary?.secondary || [];
        
        if (secondaryRecs.length > 0) {
            pdf.setFont(this.fonts.bold);
            pdf.text('Additional Recommendations:', this.margin, yPos);
            yPos += 6;
            
            pdf.setFont(this.fonts.default);
            
            for (let i = 0; i < secondaryRecs.length; i++) {
                const recLines = pdf.splitTextToSize(`• ${secondaryRecs[i]}`, contentWidth - 4);
                pdf.text(recLines, this.margin + 4, yPos);
                yPos += recLines.length * 5 + 2;
            }
            
            yPos += 3;
        }
        
        // Lifestyle recommendations
        const lifestyleRecs = recommendations.lifestyle || recommendations.treatmentSummary?.lifestyle || [];
        
        if (lifestyleRecs.length > 0) {
            pdf.setFont(this.fonts.bold);
            pdf.text('Lifestyle Recommendations:', this.margin, yPos);
            yPos += 6;
            
            pdf.setFont(this.fonts.default);
            
            for (let i = 0; i < lifestyleRecs.length; i++) {
                const recLines = pdf.splitTextToSize(`• ${lifestyleRecs[i]}`, contentWidth - 4);
                pdf.text(recLines, this.margin + 4, yPos);
                yPos += recLines.length * 5 + 2;
            }
            
            yPos += 3;
        }
        
        // Lipid targets
        const lipidTargets = recommendations.lipidTargets || recommendations.treatmentSummary?.lipidTargets || {};
        
        if (Object.keys(lipidTargets).length > 0) {
            pdf.setFont(this.fonts.bold);
            pdf.text('Lipid Targets:', this.margin, yPos);
            yPos += 6;
            
            pdf.setFont(this.fonts.default);
            
            for (const [key, value] of Object.entries(lipidTargets)) {
                const targetLines = pdf.splitTextToSize(`• ${key}: ${value}`, contentWidth - 4);
                pdf.text(targetLines, this.margin + 4, yPos);
                yPos += targetLines.length * 5 + 2;
            }
            
            yPos += 3;
        }
        
        // Follow-up information
        const followUp = recommendations.followUp || recommendations.treatmentSummary?.followUp || '';
        
        if (followUp) {
            pdf.setFont(this.fonts.bold);
            pdf.text('Follow-up:', this.margin, yPos);
            yPos += 6;
            
            pdf.setFont(this.fonts.default);
            const followUpLines = pdf.splitTextToSize(followUp, contentWidth);
            pdf.text(followUpLines, this.margin, yPos);
            yPos += followUpLines.length * 5 + 5;
        }
        
        // Add disclaimer
        pdf.setFont(this.fonts.italic);
        pdf.setFontSize(8);
        const disclaimer = 'These recommendations are based on current clinical guidelines and should be ' +
                         'individualized based on clinical judgment, patient preferences, and specific circumstances.';
        const disclaimerLines = pdf.splitTextToSize(disclaimer, contentWidth);
        pdf.text(disclaimerLines, this.margin, yPos);
        yPos += disclaimerLines.length * 4 + 5;
        
        return yPos;
    }
    
    /**
     * Get risk category based on risk score
     * @param {number} risk - Risk score percentage
     * @returns {string} Risk category
     * @private
     */
    getRiskCategory(risk) {
        if (isNaN(risk)) return 'Unknown';
        
        if (risk < 10) {
            return 'Low Risk';
        } else if (risk < 20) {
            return 'Intermediate Risk';
        } else {
            return 'High Risk';
        }
    }
    
    /**
     * Extract risk factors from inputs
     * @param {Object} inputs - Risk calculation inputs
     * @param {string} reportType - Type of report
     * @returns {Array<string>} Risk factors
     * @private
     */
    extractRiskFactors(inputs, reportType) {
        const factors = [];
        
        if (!inputs) return factors;
        
        // Common factors
        if (inputs.age) factors.push(`Age: ${inputs.age} years`);
        
        if (inputs.sex) {
            factors.push(`Sex: ${inputs.sex === 'M' ? 'Male' : 'Female'}`);
        }
        
        if (inputs.sbp) factors.push(`Systolic BP: ${inputs.sbp} mmHg`);
        
        if (inputs.cholesterol) {
            const unit = inputs['cholesterol-unit'] || 'mmol/L';
            factors.push(`Total Cholesterol: ${inputs.cholesterol} ${unit}`);
        }
        
        if (inputs.hdl) {
            const unit = inputs['hdl-unit'] || 'mmol/L';
            factors.push(`HDL Cholesterol: ${inputs.hdl} ${unit}`);
        }
        
        if (inputs.smoking || inputs.smoker) {
            const smokingStatus = inputs.smoking || inputs.smoker;
            if (smokingStatus === 'yes' || smokingStatus === true || smokingStatus === 'current') {
                factors.push('Current Smoker');
            } else if (smokingStatus === 'ex') {
                factors.push('Ex-Smoker');
            }
        }
        
        if (inputs.diabetes) {
            const diabetesStatus = inputs.diabetes;
            if (diabetesStatus === 'yes' || diabetesStatus === true || diabetesStatus === 'type1' || diabetesStatus === 'type2') {
                factors.push('Diabetes');
            }
        }
        
        if (inputs.bpTreated || inputs.treatedHyp) {
            factors.push('On Blood Pressure Treatment');
        }
        
        // QRISK3-specific factors
        if (reportType === 'qrisk') {
            if (inputs.bmi) factors.push(`BMI: ${inputs.bmi} kg/m²`);
            
            if (inputs.ethnicity && inputs.ethnicity !== 'WHITE_OR_NOT_STATED') {
                const ethnicityMap = {
                    'WHITE_OR_NOT_STATED': 'White or Not Stated',
                    'INDIAN': 'Indian',
                    'PAKISTANI': 'Pakistani',
                    'BANGLADESHI': 'Bangladeshi',
                    'OTHER_ASIAN': 'Other Asian',
                    'BLACK_CARIBBEAN': 'Black Caribbean',
                    'BLACK_AFRICAN': 'Black African',
                    'CHINESE': 'Chinese',
                    'OTHER': 'Other Ethnic Group'
                };
                
                factors.push(`Ethnicity: ${ethnicityMap[inputs.ethnicity] || inputs.ethnicity}`);
            }
            
            if (inputs.family === 1 || inputs.family === true) {
                factors.push('Family History of Coronary Heart Disease');
            }
            
            if (inputs.af === 1 || inputs.af === true) {
                factors.push('Atrial Fibrillation');
            }
            
            if (inputs.renal === 1 || inputs.renal === true) {
                factors.push('Chronic Kidney Disease');
            }
            
            if (inputs.ra === 1 || inputs.ra === true) {
                factors.push('Rheumatoid Arthritis');
            }
            
            if (inputs.migraines === 1 || inputs.migraines === true) {
                factors.push('Migraines');
            }
            
            if (inputs.sle === 1 || inputs.sle === true) {
                factors.push('Systemic Lupus Erythematosus');
            }
            
            if (inputs.psychosis === 1 || inputs.psychosis === true) {
                factors.push('Severe Mental Illness');
            }
            
            if (inputs.atypicalAntipsy === 1 || inputs.atypicalAntipsy === true) {
                factors.push('On Atypical Antipsychotic Medication');
            }
            
            if (inputs.steroids === 1 || inputs.steroids === true) {
                factors.push('On Regular Steroid Tablets');
            }
            
            if (inputs.erectileDys === 1 || inputs.erectileDys === true) {
                factors.push('Erectile Dysfunction');
            }
        }
        
        return factors;
    }
    
    /**
     * Convert HTML to plain text
     * @param {string} html - HTML content
     * @returns {string} Plain text
     * @private
     */
    htmlToPlainText(html) {
        if (!html) return '';
        
        // Create temporary div to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Remove list bullets
        const bullets = temp.querySelectorAll('li');
        bullets.forEach(bullet => {
            bullet.textContent = '• ' + bullet.textContent;
        });
        
        // Get text content
        return temp.textContent || temp.innerText || '';
    }
    
    /**
     * Set page size for PDF
     * @param {string} size - Page size (letter, a4, etc.)
     * @public
     */
    setPageSize(size) {
        this.pageSize = size;
    }
    
    /**
     * Set page orientation for PDF
     * @param {string} orientation - Page orientation (portrait, landscape)
     * @public
     */
    setPageOrientation(orientation) {
        this.pageOrientation = orientation;
    }
    
    /**
     * Enable or disable debug mode
     * @param {boolean} enable - Whether to enable debug mode
     * @public
     */
    setDebugMode(enable) {
        this.debugMode = Boolean(enable);
    }
    
    /**
     * Enable or disable header and footer
     * @param {boolean} enable - Whether to enable header and footer
     * @public
     */
    setHeaderFooter(enable) {
        this.headerFooterEnabled = Boolean(enable);
    }
}

// Create global instance using IIFE
window.pdfGenerator = (function() {
    try {
        return new PDFGenerator();
    } catch (error) {
        console.error('Failed to initialize PDF Generator:', error);
        
        // Return minimal implementation
        return {
            generatePDFReport: async () => false,
            setPageSize: () => {},
            setPageOrientation: () => {},
            setHeaderFooter: () => {},
            setDebugMode: () => {}
        };
    }
})();
