/**
 * PDF Generation Service for Enhanced CVD Risk Toolkit
 * @file /js/services/pdf-service.js
 * @description Handles the creation of PDF reports for assessments and visualizations.
 * Aims to reflect the styling of styles.css (v5.0.3).
 * Version: 5.0.3
 * Dependencies: jsPDF, jsPDF-AutoTable (expected to be global)
 */

class PDFService {
    constructor(dependencies = {}) {
        this.ErrorLogger = dependencies.ErrorLogger || { handleError: console.error, log: console.log };
        this.InputSanitizer = dependencies.InputSanitizerService || { escapeHTML: (v) => String(v), sanitizeObjectOrArray: (o) => o };

        if (typeof jsPDF === 'undefined' || (typeof jsPDF !== 'undefined' && typeof jsPDF.default !== 'undefined' ? typeof jsPDF.default.autoTable === 'undefined' : typeof jsPDF.autoTable === 'undefined')) {
            this.ErrorLogger.handleError('jsPDF or jsPDFAutoTable is not loaded. PDF generation will not be available.', 'PDFService', 'critical');
            this.isAvailable = false;
        } else {
            this.isAvailable = true;
            // If jsPDF is loaded as a module with a default export
            this.jsPDF = typeof jsPDF.default !== 'undefined' ? jsPDF.default : jsPDF;
        }

        // Define base styles derived from styles.css (v5.0.3)
        // These are approximations and manual translations of CSS intent for PDF context.
        this.styles = {
            fontFamily: {
                sans: 'Helvetica', // Standard jsPDF font, closest to Inter. Use addFont for custom.
                // For 'Inter', you'd typically need to load the .ttf/.otf files and use jsPDF's addFont methods.
                // Example: doc.addFileToVFS('Inter-Regular.ttf', base64EncodedFont); doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
            },
            fontSize: {
                documentTitle: 20,
                h1: 16, h2: 14, h3: 12,
                p: 10, small: 8,
                tableHeader: 9, tableBody: 8
            },
            colors: { // From :root in styles.css (light theme defaults)
                primary: '#2c7afc',
                text: '#212529',    // --current-text-color
                textLight: '#6c757d',
                border: '#dee2e6',
                headerBg: '#f8f9fa', // Light gray for table headers
                white: '#ffffff',
                lowRisk: '#28a745',
                moderateRisk: '#ffc107',
                highRisk: '#dc3545',
            },
            margins: { top: 20, right: 15, bottom: 20, left: 15 }, // mm
            lineHeightFactor: 1.4,
            page: {
                width: 210, // A4 width in mm
                height: 297 // A4 height in mm
            }
        };
    }

    _applyBaseDocStyles(doc) {
        doc.setFont(this.styles.fontFamily.sans, 'normal');
        doc.setTextColor(this.styles.colors.text);
        doc.setFontSize(this.styles.fontSize.p);
    }

    _addPageHeader(doc, title, appVersion) {
        const pageWidth = this.styles.page.width;
        const margin = this.styles.margins.left;

        // Application Title (small, top-left)
        doc.setFont(this.styles.fontFamily.sans, 'normal');
        doc.setFontSize(this.styles.fontSize.small);
        doc.setTextColor(this.styles.colors.textLight);
        doc.text(`Enhanced CVD Risk Toolkit v${appVersion || '5.0.3'}`, margin, this.styles.margins.top / 2);

        // Report Title (larger, centered or prominent)
        doc.setFont(this.styles.fontFamily.sans, 'bold');
        doc.setFontSize(this.styles.fontSize.documentTitle);
        doc.setTextColor(this.styles.colors.primary);
        // Centered title: doc.text(title, pageWidth / 2, this.styles.margins.top, { align: 'center' });
        doc.text(title, margin, this.styles.margins.top);


        doc.setFontSize(this.styles.fontSize.small);
        doc.setTextColor(this.styles.colors.textLight);
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - this.styles.margins.right, this.styles.margins.top, { align: 'right' });

        this._applyBaseDocStyles(doc); // Reset for content
        return this.styles.margins.top + 10; // Return Y position after header
    }

    _addPageFooter(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        const pageWidth = this.styles.page.width;
        const pageHeight = this.styles.page.height;
        const margin = this.styles.margins.bottom / 2;

        doc.setFontSize(this.styles.fontSize.small);
        doc.setTextColor(this.styles.colors.textLight);
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - margin, { align: 'center' });
            doc.line(this.styles.margins.left, pageHeight - margin - 3, pageWidth - this.styles.margins.right, pageHeight - margin - 3); // Line above footer
            doc.text('Confidential Medical Information', this.styles.margins.left, pageHeight - margin);
        }
    }

    _getRiskCategoryColor(riskCategoryText) {
        if (!riskCategoryText) return this.styles.colors.text;
        const category = String(riskCategoryText).toLowerCase();
        if (category.includes('low')) return this.styles.colors.lowRisk;
        if (category.includes('moderate') || category.includes('intermediate')) return this.styles.colors.moderateRisk;
        if (category.includes('very high')) return this.styles.colors.highRisk; // Use high for very high too for simplicity here
        if (category.includes('high')) return this.styles.colors.highRisk;
        return this.styles.colors.text;
    }

    async _renderSection(doc, section, currentY) {
        const margin = this.styles.margins.left;
        const contentWidth = this.styles.page.width - margin * 2;
        const lineHeight = this.styles.fontSize.p * 0.352778 * this.styles.lineHeightFactor; // mm approx (points to mm)

        if (section.sectionTitle) {
             if (currentY + lineHeight * 2 > this.styles.page.height - this.styles.margins.bottom) { doc.addPage(); currentY = this._addPageHeader(doc, doc.internal.reportTitle || "Report", window.CVD_APP_VERSION); }
            doc.setFont(this.styles.fontFamily.sans, 'bold');
            doc.setFontSize(this.styles.fontSize.h2);
            doc.setTextColor(this.styles.colors.primary);
            doc.text(section.sectionTitle, margin, currentY);
            currentY += lineHeight + 3; // Extra space after section title
        }
        this._applyBaseDocStyles(doc);

        for (const item of section.items) {
            if (currentY + lineHeight * 2 > this.styles.page.height - this.styles.margins.bottom) { doc.addPage(); currentY = this._addPageHeader(doc, doc.internal.reportTitle || "Report", window.CVD_APP_VERSION); }

            switch (item.type) {
                case 'keyvalue':
                    if (item.label && item.value !== undefined && item.value !== null) {
                        doc.setFont(this.styles.fontFamily.sans, 'bold');
                        doc.text(`${item.label}: `, margin, currentY);
                        const labelWidth = doc.getTextWidth(`${item.label}: `) + 2;
                        doc.setFont(this.styles.fontFamily.sans, 'normal');
                        
                        const valueText = String(item.value);
                        const valueColor = item.valueColor || (item.label.toLowerCase().includes('category') ? this._getRiskCategoryColor(valueText) : this.styles.colors.text);
                        doc.setTextColor(valueColor);
                        
                        const splitValue = doc.splitTextToSize(valueText, contentWidth - labelWidth);
                        doc.text(splitValue, margin + labelWidth, currentY);
                        currentY += splitValue.length * lineHeight;
                        doc.setTextColor(this.styles.colors.text); // Reset color
                    }
                    break;
                case 'text':
                    if (item.content) {
                        const textLines = doc.splitTextToSize(String(item.content), contentWidth);
                        doc.text(textLines, margin, currentY);
                        currentY += textLines.length * lineHeight;
                    }
                    break;
                case 'chart':
                    if (item.canvasId) {
                        const chartCanvas = document.getElementById(item.canvasId);
                        if (chartCanvas) {
                            if (currentY + 60 > this.styles.page.height - this.styles.margins.bottom) { doc.addPage(); currentY = this._addPageHeader(doc, doc.internal.reportTitle || "Report", window.CVD_APP_VERSION); } // Approx chart height
                            try {
                                const imgData = chartCanvas.toDataURL('image/png', 1.0); // High quality
                                const imgProps = doc.getImageProperties(imgData);
                                const chartHeight = (imgProps.height * contentWidth) / imgProps.width;
                                doc.addImage(imgData, 'PNG', margin, currentY, contentWidth, chartHeight);
                                currentY += chartHeight + 5;
                            } catch (e) {
                                this.ErrorLogger.handleError(`PDF: Failed to add chart ${item.canvasId}`, 'PDFService', 'warn', e);
                                doc.text(`[Chart from ${item.canvasId} could not be rendered]`, margin, currentY);
                                currentY += lineHeight;
                            }
                        } else {
                            this.ErrorLogger.log('warn', `PDF: Chart canvas ID '${item.canvasId}' not found.`, 'PDFService');
                        }
                    }
                    break;
                case 'table': // For simple data tables, more complex via _renderDataTable
                    if (item.head && item.body) {
                        doc.autoTable({
                            head: [item.head],
                            body: item.body,
                            startY: currentY,
                            margin: { left: margin, right: margin },
                            theme: 'grid',
                            headStyles: { fillColor: this.styles.colors.headerBg, textColor: this.styles.colors.text, fontStyle: 'bold', fontSize: this.styles.fontSize.tableHeader },
                            bodyStyles: { fontSize: this.styles.fontSize.tableBody, cellPadding: 1.5 },
                            alternateRowStyles: { fillColor: [248, 249, 250] } // var(--gray-100)
                        });
                        currentY = doc.autoTable.previous.finalY + 5;
                    }
                    break;
                case 'html': // Limited support
                    if (item.htmlContentSelector) {
                        const htmlElement = document.querySelector(item.htmlContentSelector);
                        if (htmlElement) {
                             if (currentY + 20 > this.styles.page.height - this.styles.margins.bottom) { doc.addPage(); currentY = this._addPageHeader(doc, doc.internal.reportTitle || "Report", window.CVD_APP_VERSION); }
                            try {
                                await doc.html(htmlElement, {
                                    x: margin,
                                    y: currentY,
                                    width: contentWidth,
                                    windowWidth: contentWidth, // or a larger number if scaling down
                                    autoPaging: 'slice', // or 'text'
                                    html2canvas: { scale: 0.25, useCORS: true } // Example scaling for html2canvas
                                });
                                currentY = doc.autoTable.previous.finalY || doc.internal.getCurrentPageInfo().pageContext.fY || currentY + 20; // Update Y
                            } catch (e) {
                                this.ErrorLogger.handleError(`PDF: Failed to render HTML content from selector ${item.htmlContentSelector}`, 'PDFService', 'warn', e);
                                doc.text(`[Content from ${item.htmlContentSelector} could not be rendered]`, margin, currentY);
                                currentY += lineHeight;
                            }
                        }
                    }
                    break;
                case 'spacer':
                    currentY += (item.height || 5); // Space in mm
                    break;
            }
            if (item.type !== 'spacer') currentY += 3; // Small gap between items
        }
        return currentY;
    }

    /**
     * Generates a PDF report from structured section data.
     * @param {string} reportTitle - The main title of the report.
     * @param {Array<object>} sections - Array of section objects.
     * Each section: { sectionTitle?: string, items: Array<{type: string, ...}> }
     * Item types: 'text', 'keyvalue', 'chart', 'table', 'html', 'spacer'
     * @param {string} filename - Filename for saving.
     * @param {'save'|'print'|'bloburl'|'datauristring'} [action='save'] - What to do with the PDF.
     * @returns {Promise<string|void>} Data URI/Blob URL if action is one of those, else void.
     */
    async generateReport(reportTitle, sections, filename = 'CVD_Report.pdf', action = 'save') {
        if (!this.isAvailable) {
            this._showUnavailableError();
            return Promise.reject("PDFService not available.");
        }
        this.dependencies.LoadingManager?.show('Generating PDF...');

        const doc = new this.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        doc.internal.reportTitle = reportTitle; // Store for header on new pages
        let currentY = this._addPageHeader(doc, reportTitle, window.CVD_APP_VERSION);

        try {
            for (const section of sections) {
                currentY = await this._renderSection(doc, section, currentY);
                currentY += 5; // Space between sections
            }

            this._addPageFooter(doc);

            this.dependencies.LoadingManager?.hide();

            if (action === 'print') {
                doc.autoPrint();
                const blobUrl = doc.output('bloburl');
                window.open(blobUrl, '_blank');
                return blobUrl; // Return for potential revocation
            } else if (action === 'save') {
                doc.save(filename);
            } else if (action === 'bloburl') {
                return doc.output('bloburl');
            } else if (action === 'datauristring') {
                return doc.output('datauristring');
            }
        } catch (error) {
            this.ErrorLogger.handleError('Error generating PDF report.', 'PDFService', 'error', { error });
            this.dependencies.LoadingManager?.hide();
            this.dependencies.EventBus?.publish('ui:showToast', { message: 'Error generating PDF.', type: 'error'});
            return Promise.reject(error);
        }
    }

    /**
     * Generates a PDF specifically for the Advanced Visualization tab.
     * @param {string} chartCanvasId - ID of the canvas element containing the chart.
     * @param {object|string} detailsData - Data for the output table (object for autoTable or ID of HTML table).
     * Example: { head: [['Param', 'Value']], body: [['Age', 55]] }
     * Or: 'myDetailsHtmlTableId'
     * @param {string} [filename='Advanced_Visualization.pdf'] - Filename for saving.
     * @param {'save'|'print'} [action='save'] - What to do with the PDF.
     */
    async generateAdvancedVizReport(chartCanvasId, detailsData, filename = 'Advanced_Visualization.pdf', action = 'save') {
        if (!this.isAvailable) {
            this._showUnavailableError();
            return;
        }

        const reportSections = [];
        const chartCanvas = document.getElementById(chartCanvasId);

        if (chartCanvas) {
            reportSections.push({
                sectionTitle: "Chart Visualization",
                items: [{ type: 'chart', canvasId: chartCanvasId }]
            });
        } else {
            this.ErrorLogger.log('warn', `Chart canvas ID '${chartCanvasId}' not found for PDF.`, 'PDFService-AdvViz');
            reportSections.push({
                sectionTitle: "Chart Visualization",
                items: [{ type: 'text', content: '[Chart could not be loaded for PDF generation]' }]
            });
        }

        if (detailsData) {
            const tableSection = {
                sectionTitle: "Output Data / Details",
                items: []
            };
            if (typeof detailsData === 'string') { // Assume it's an ID of an HTML table
                // Option 1: Try to convert HTML table using jsPDF.html (experimental, limited)
                // tableSection.items.push({ type: 'html', htmlContentSelector: `#${detailsData}` });

                // Option 2: Use autoTable with HTML - better for tables
                const tableElement = document.getElementById(detailsData);
                if (tableElement) {
                     tableSection.items.push({ type: 'table', tableId: detailsData }); // AutoTable will use the ID
                } else {
                    this.ErrorLogger.log('warn', `Details table ID '${detailsData}' not found.`, 'PDFService-AdvViz');
                    tableSection.items.push({type: 'text', content: '[Details table not found]'});
                }

            } else if (detailsData.head && detailsData.body) { // Assume it's jsPDF-AutoTable data
                tableSection.items.push({ type: 'table', head: detailsData.head, body: detailsData.body });
            }
            reportSections.push(tableSection);
        }

        return this.generateReport("Advanced Visualization Report", reportSections, filename, action);
    }

    _showUnavailableError() {
        const msg = 'PDF generation is currently unavailable. Please ensure jsPDF and jsPDF-AutoTable libraries are loaded.';
        this.ErrorLogger.handleError(msg, 'PDFService', 'error');
        this.dependencies.EventBus?.publish('ui:showToast', { message: msg, type: 'error'});
    }
}

// Example of how it might be instantiated in main.js:
// window.PDFServiceInstance = new PDFService({ ErrorLogger: window.ErrorLogger, InputSanitizerService: window.InputSanitizer });