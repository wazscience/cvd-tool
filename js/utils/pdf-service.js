/**
 * PDF Generation Service Module
 * @file /js/services/pdf-service.js
 * @description Centralizes PDF document generation, dynamically loading jsPDF
 * and jspdf-autotable. Provides helpers for common document elements.
 * @version 1.0.0
 * @exports PDFService
 */

'use strict';

class PDFService {
    constructor(options = {}) {
        if (PDFService.instance) {
            return PDFService.instance;
        }

        this.options = {
            jsPDFVersion: '2.5.1', // Specify version for CDN
            jspdfAutotableVersion: '3.8.2', // Specify version for CDN
            defaultFont: 'Helvetica',
            defaultFontSize: 10,
            defaultMargins: { top: 20, right: 20, bottom: 20, left: 20 },
            defaultLineHeightFactor: 1.5,
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || console,
            EventBus: window.EventBus,
            LoadingManager: window.LoadingManagerInstance,
            ...options.dependencies,
        };

        this.jsPDF = null; // Will hold the jsPDF constructor
        this.autoTable = null; // Will hold the jspdf-autotable function
        this.isLoadingDependencies = false;
        this.dependenciesLoaded = false;

        PDFService.instance = this;
        this._log('info', 'PDF Service Initialized.');
        // Optionally, pre-load dependencies on init if PDFs are frequently needed early
        // this.ensureDependenciesLoaded();
    }

    /** Internal logging helper. */
    _log(level, message, data) {
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `PDFService: ${message}`;
        if (level === 'error' && logger?.handleError) {
             logger.handleError(data || message, 'PDFService', 'error', data ? { msg: message } : {});
        } else if (logger?.log) {
            logger.log(level, logMessage, data);
        } else {
            console[level]?.(logMessage, data);
        }
    }

    /**
     * Dynamically loads a script.
     * @param {string} src - The URL of the script.
     * @param {string} integrity - Optional SRI hash for the script.
     * @param {string} crossOrigin - Optional crossorigin attribute.
     * @returns {Promise<void>}
     * @private
     */
    async _loadScript(src, integrity = null, crossOrigin = 'anonymous') {
        if (document.querySelector(`script[src="${src}"]`)) {
            this._log('debug', `Script already loaded: ${src}`);
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            if (integrity) script.integrity = integrity;
            if (crossOrigin) script.crossOrigin = crossOrigin;
            script.onload = () => {
                this._log('info', `Script loaded successfully: ${src}`);
                resolve();
            };
            script.onerror = () => {
                const errMsg = `Failed to load script: ${src}`;
                this._log('error', errMsg);
                reject(new Error(errMsg));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Ensures jsPDF and jspdf-autotable are loaded.
     * @returns {Promise<boolean>} True if dependencies are loaded, false otherwise.
     */
    async ensureDependenciesLoaded() {
        if (this.dependenciesLoaded) return true;
        if (this.isLoadingDependencies) {
            // Wait for the ongoing loading process
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (this.dependenciesLoaded) {
                        clearInterval(checkInterval);
                        resolve(true);
                    } else if (!this.isLoadingDependencies) { // Loading failed elsewhere
                        clearInterval(checkInterval);
                        resolve(false);
                    }
                }, 100);
            });
        }

        this.isLoadingDependencies = true;
        this.dependencies.LoadingManager?.show('Loading PDF Engine...');

        try {
            // Load jsPDF
            if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
                await this._loadScript(`https://cdnjs.cloudflare.com/ajax/libs/jspdf/${this.options.jsPDFVersion}/jspdf.umd.min.js`);
            }
            if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
                throw new Error('jsPDF global (jspdf.jsPDF) not found after attempting load.');
            }
            this.jsPDF = window.jspdf.jsPDF; // Assign constructor

            // Load jspdf-autotable
            if (typeof this.jsPDF.API?.autoTable === 'undefined') { // Check if already plugin for this instance
                 // Check global window object for autoTable after loading script
                if (typeof window.autoTable === 'undefined'){
                    await this._loadScript(`https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/${this.options.jspdfAutotableVersion}/jspdf.plugin.autotable.min.js`);
                }
                if (typeof window.autoTable === 'function') {
                    // If autoTable is globally available and jsPDF has been loaded,
                    // jspdf-autotable might automatically attach itself or need a call.
                    // For modern UMD versions, it often attaches to jsPDF.API or jsPDF.default.API
                    // If it's a loose function, you might call it: window.autoTable(this.jsPDF);
                    // Check if it attached itself:
                    if (typeof this.jsPDF.API?.autoTable === 'undefined') {
                         // Try manual attachment if it's a standalone function
                        if(typeof window.autoTable === 'function' && this.jsPDF.API) {
                            window.autoTable(this.jsPDF.API); // Common pattern for older plugins
                            this._log('info', 'jspdf-autotable manually attached to jsPDF.API.');
                        } else {
                            throw new Error('jspdf-autotable did not attach to jsPDF instance.');
                        }
                    }
                } else {
                     throw new Error('jspdf-autotable (window.autoTable) not found after attempting load.');
                }
            }
            this.autoTable = this.jsPDF.API?.autoTable; // Assign function

            this.dependenciesLoaded = true;
            this._log('info', 'PDF dependencies (jsPDF, jspdf-autotable) loaded successfully.');
            this.dependencies.EventBus?.publish('pdfservice:dependenciesLoaded');
            return true;
        } catch (error) {
            this._log('error', 'Failed to load PDF dependencies.', error);
            this.dependencies.ErrorLogger?.handleError('PDF library loading failed', 'PDFService', 'critical', { error });
            this.dependencies.EventBus?.publish('pdfservice:dependenciesFailed', { error });
            return false;
        } finally {
            this.isLoadingDependencies = false;
            this.dependencies.LoadingManager?.hide();
        }
    }

    /**
     * Creates a new jsPDF document instance with default settings.
     * @param {object} [docOptions] - Options for jsPDF constructor (e.g., orientation, unit, format).
     * @returns {jsPDF|null} jsPDF instance or null if dependencies not loaded.
     */
    createDocument(docOptions = {}) {
        if (!this.dependenciesLoaded || !this.jsPDF) {
            this._log('error', 'PDF dependencies not loaded. Cannot create document.');
            return null;
        }
        const options = {
            orientation: 'p', // portrait
            unit: 'mm',
            format: 'a4',
            ...docOptions
        };
        const doc = new this.jsPDF(options);
        doc.setFont(this.options.defaultFont);
        doc.setFontSize(this.options.defaultFontSize);
        return doc;
    }

    /**
     * Adds a standard header to the document.
     * @param {jsPDF} doc - The jsPDF document instance.
     * @param {string} title - The main title for the header.
     * @param {string} [subTitle] - Optional subtitle.
     */
    addHeader(doc, title, subTitle = '') {
        if (!doc) return;
        doc.setFontSize(18);
        doc.text(title, this.options.defaultMargins.left, this.options.defaultMargins.top);
        if (subTitle) {
            doc.setFontSize(12);
            doc.text(subTitle, this.options.defaultMargins.left, this.options.defaultMargins.top + 8);
        }
        // Reset font for body
        doc.setFontSize(this.options.defaultFontSize);
        // Return Y position after header
        return this.options.defaultMargins.top + (subTitle ? 15 : 8) + 5;
    }

    /**
     * Adds a standard footer with page numbers.
     * @param {jsPDF} doc - The jsPDF document instance.
     */
    addFooter(doc) {
        if (!doc) return;
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(
                `Page ${i} of ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - (this.options.defaultMargins.bottom / 2),
                { align: 'center' }
            );
        }
        // Reset font size for safety
        doc.setFontSize(this.options.defaultFontSize);
    }

    /**
     * Adds a block of text, handling basic line wrapping.
     * @param {jsPDF} doc - The jsPDF document instance.
     * @param {string} text - The text to add.
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate (current Y cursor).
     * @param {object} [options={}] - Text options (e.g., maxWidth, fontSize, fontStyle).
     * @returns {number} The new Y position after adding the text.
     */
    addText(doc, text, x, y, options = {}) {
        if (!doc || !text) return y;
        const maxWidth = options.maxWidth || (doc.internal.pageSize.getWidth() - x - this.options.defaultMargins.right);
        const fontSize = options.fontSize || doc.getFontSize();
        const fontStyle = options.fontStyle || 'normal';

        doc.setFontSize(fontSize);
        doc.setFont(this.options.defaultFont, fontStyle);

        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * (fontSize * this.options.defaultLineHeightFactor * 0.35)); // Approximate line height in mm
    }

    /**
     * Adds a table using jspdf-autotable.
     * @param {jsPDF} doc - The jsPDF document instance.
     * @param {object} tableData - Data for autotable { head: [['Col1', 'Col2']], body: [['R1C1', 'R1C2']] }.
     * @param {number} startY - Y coordinate to start the table.
     * @param {object} [tableOptions={}] - Options for jspdf-autotable.
     * @returns {number} The new Y position after the table.
     */
    addTable(doc, tableData, startY, tableOptions = {}) {
        if (!doc || !this.autoTable || !tableData) return startY;
        doc.autoTable({
            startY: startY,
            head: tableData.head,
            body: tableData.body,
            theme: 'striped', // 'striped', 'grid', 'plain'
            styles: { font: this.options.defaultFont, fontSize: this.options.defaultFontSize -1 },
            headStyles: { fillColor: [22, 160, 133], fontStyle: 'bold' }, // Example header style
            margin: { left: this.options.defaultMargins.left, right: this.options.defaultMargins.right },
            ...tableOptions
        });
        return doc.autoTable.previous.finalY || startY; // Y position after table
    }

    /**
     * Generates a PDF with given content configuration and saves or opens it.
     * @param {string} filename - The desired filename for the PDF.
     * @param {object} contentConfig - Configuration for the PDF content.
     * @param {string} contentConfig.title - Main title of the document.
     * @param {string} [contentConfig.subTitle] - Optional subtitle.
     * @param {Array<object>} contentConfig.sections - Array of section objects.
     * Each section: { type: 'text'|'table'|'custom', content: string, data: object, drawFn: function(doc, currentY) }
     * @param {'save'|'open'|'blob'|'dataurl'} [outputType='save'] - How to output the PDF.
     * @param {object} [docOptions] - jsPDF constructor options.
     * @returns {Promise<Blob|string|void>} Depending on outputType.
     */
    async generateReport(filename, contentConfig, outputType = 'save', docOptions = {}) {
        if (!await this.ensureDependenciesLoaded()) {
            const err = new Error('PDF dependencies could not be loaded.');
            this.dependencies.EventBus?.publish('pdf:generationFailed', { filename, error: err });
            throw err;
        }

        this.dependencies.EventBus?.publish('pdf:generationStarted', { filename });
        this.dependencies.LoadingManager?.show('Generating PDF...');

        try {
            const doc = this.createDocument(docOptions);
            if (!doc) throw new Error('Failed to create PDF document instance.');

            let currentY = this.addHeader(doc, contentConfig.title, contentConfig.subTitle);

            for (const section of contentConfig.sections) {
                if (currentY + 20 > doc.internal.pageSize.getHeight() - this.options.defaultMargins.bottom) { // Check for page break
                    doc.addPage();
                    currentY = this.options.defaultMargins.top;
                }
                if (section.title) {
                    doc.setFontSize(14);
                    doc.setFont(this.options.defaultFont, 'bold');
                    currentY = this.addText(doc, section.title, this.options.defaultMargins.left, currentY + 5) + 2;
                    doc.setFontSize(this.options.defaultFontSize); // Reset
                    doc.setFont(this.options.defaultFont, 'normal');
                }

                switch (section.type) {
                    case 'text':
                        currentY = this.addText(doc, section.content, this.options.defaultMargins.left, currentY, section.options || {});
                        break;
                    case 'table':
                        currentY = this.addTable(doc, section.data, currentY, section.options || {});
                        break;
                    case 'custom':
                        if (typeof section.drawFn === 'function') {
                            currentY = section.drawFn(doc, currentY) || currentY;
                        }
                        break;
                    default:
                        this._log('warn', `Unknown PDF section type: ${section.type}`);
                }
                currentY += 5; // Spacing after section
            }

            this.addFooter(doc);

            this.dependencies.EventBus?.publish('pdf:generationComplete', { filename });
            this._log('info', `PDF "${filename}" generated successfully.`);

            switch (outputType) {
                case 'open':
                    doc.output('dataurlnewwindow');
                    return;
                case 'blob':
                    return doc.output('blob');
                case 'dataurl':
                    return doc.output('datauristring');
                case 'save':
                default:
                    doc.save(filename);
                    return;
            }
        } catch (error) {
            this._log('error', `Failed to generate PDF "${filename}":`, error);
            this.dependencies.EventBus?.publish('pdf:generationFailed', { filename, error });
            this.dependencies.ErrorLogger?.handleError(`PDF Generation failed for ${filename}`, 'PDFService', 'error', { error });
            throw error; // Re-throw for the caller
        } finally {
            this.dependencies.LoadingManager?.hide();
        }
    }
}

// Instantiate and export the singleton service
const PDFServiceInstance = new PDFService();

// Optional: Make it globally accessible
// window.PDFService = PDFServiceInstance;

// Use this line if using ES modules
// export default PDFServiceInstance;