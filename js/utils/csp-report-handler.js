/**
 * Content Security Policy (CSP) Report Handler Module
 * @file /js/utils/csp-report-handler.js
 * @description Listens for CSP violation events and logs them.
 * This client-side handler is primarily for development/debugging or for
 * sending violation details to a client-side error aggregation service.
 * CSP reports are typically sent by the browser directly to a `report-uri`
 * or `report-to` endpoint specified in the CSP header/meta tag.
 * @version 1.2.0
 * @exports CSPReportHandler
 */

'use strict';

// Dependencies will be injected via constructor or fallback to window/console.
// import { LoggingService } from './logging-service.js'; // Example if LoggingService is also an ES module
// import { ErrorDetectionSystem } from './error-detection-system.js'; // Example

class CSPReportHandler {
    /**
     * Creates an instance of CSPReportHandler.
     * @param {object} [options={}] - Configuration options.
     * @param {boolean} [options.logToConsole=true] - Whether to log CSP violations to the console.
     * @param {boolean} [options.sendToErrorLogger=true] - Whether to send violations to a general ErrorLogger.
     * @param {Function} [options.customReportCallback=null] - Custom callback: `(report) => {}`.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     * Expected: LoggingService (class), ErrorLogger (instance like ErrorDetectionSystemInstance).
     */
    constructor(options = {}) {
        // Singleton pattern can be considered if only one global handler is needed.
        // For now, allowing instantiation for flexibility if multiple handlers (e.g., for different scopes) were ever needed.
        // if (CSPReportHandler.instance) {
        //     return CSPReportHandler.instance;
        // }

        this.config = {
            logToConsole: options.logToConsole !== undefined ? options.logToConsole : true,
            sendToErrorLogger: options.sendToErrorLogger !== undefined ? options.sendToErrorLogger : true,
            customReportCallback: typeof options.customReportCallback === 'function' ? options.customReportCallback : null,
            ...options,
        };

        this.dependencies = {
            LoggingServiceClass: options.dependencies?.LoggingServiceClass || window.LoggingService,
            ErrorLoggerInstance: options.dependencies?.ErrorLoggerInstance || window.ErrorDetectionSystemInstance,
            ...options.dependencies,
        };

        // Instantiate its own logger if LoggingService class is provided
        if (this.dependencies.LoggingServiceClass && typeof this.dependencies.LoggingServiceClass === 'function') {
            try {
                this.logger = new this.dependencies.LoggingServiceClass({ componentName: 'CSPReportHandler' });
            } catch (e) {
                console.error('[CSPReportHandler] Failed to instantiate LoggingService:', e);
                this.logger = console; // Fallback
            }
        } else {
            this.logger = console; // Fallback if LoggingService class is not available
        }

        this._initialize();
        // CSPReportHandler.instance = this; // If implementing singleton
        this._log('info', 'CSP Report Handler Initialized (v1.2.0). Client-side violation listener active.');
    }

    /**
     * Initializes the CSP violation listener.
     * @private
     */
    _initialize() {
        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
            document.addEventListener('securitypolicyviolation', this._handleViolation.bind(this));
        } else {
            this._log('warn', '`document` is not available or does not support addEventListener. Cannot listen for CSP violations.');
        }
    }

    /**
     * Handles a CSP violation event.
     * @param {SecurityPolicyViolationEvent} event - The CSP violation event.
     * @private
     */
    _handleViolation(event) {
        // Normalize the report object for consistent logging
        const reportDetails = {
            documentURI: event.documentURI || 'N/A',
            referrer: event.referrer || 'N/A',
            violatedDirective: event.violatedDirective || 'N/A',
            effectiveDirective: event.effectiveDirective || 'N/A',
            originalPolicy: event.originalPolicy || 'N/A',
            blockedURI: event.blockedURI || 'N/A',
            sourceFile: event.sourceFile || 'N/A',
            lineNumber: event.lineNumber || 'N/A',
            columnNumber: event.columnNumber || 'N/A',
            statusCode: event.statusCode || 0,
            disposition: event.disposition || 'N/A', // 'enforce' or 'report'
            timestamp: new Date().toISOString()
        };

        const message = `CSP Violation: Directive '${reportDetails.violatedDirective}' blocked URI '${reportDetails.blockedURI}'. Effective: '${reportDetails.effectiveDirective}'.`;

        if (this.config.logToConsole) {
            this._log('warn', message, reportDetails);
        }

        if (this.config.sendToErrorLogger && this.dependencies.ErrorLoggerInstance) {
            if (typeof this.dependencies.ErrorLoggerInstance.handleError === 'function') {
                 this.dependencies.ErrorLoggerInstance.handleError(message, 'CSPViolation', 'security', reportDetails);
            } else {
                // Fallback if ErrorLoggerInstance doesn't have handleError but might have log
                this.dependencies.ErrorLoggerInstance.log?.('error', `CSP VIOLATION: ${message}`, reportDetails);
            }
        }

        if (this.config.customReportCallback) {
            try {
                this.config.customReportCallback(reportDetails);
            } catch (e) {
                this._log('error', 'Error in customReportCallback for CSP violation.', { error: e, report: reportDetails });
            }
        }
    }

    /**
     * Internal logging helper.
     * @param {'info'|'warn'|'error'|'debug'} level - Log level.
     * @param {string} message - The message.
     * @param {object} [data] - Additional data.
     * @private
     */
    _log(level, message, data) {
        // Use the instantiated logger (which might be console if LoggingService failed/unavailable)
        if (this.logger && typeof this.logger[level] === 'function') {
            if (data) {
                this.logger[level](message, data); // Assumes logger can take component name internally or handles it
            } else {
                this.logger[level](message);
            }
        } else { // Fallback to raw console if this.logger isn't even console (e.g. null)
            console[level]?.(`[CSPReportHandler] ${level.toUpperCase()}: ${message}`, data || '');
        }
    }

    /**
     * Manually processes a CSP report object (e.g., from a `report-to` endpoint if proxied to client).
     * @param {object} cspReportObject - The CSP report object.
     */
    processExternalReport(cspReportObject) {
        if (!cspReportObject || !cspReportObject['csp-report']) {
            this._log('warn', 'Invalid external CSP report object received.');
            return;
        }
        const report = cspReportObject['csp-report'];
        const mappedReport = {
            documentURI: report['document-uri'],
            referrer: report.referrer,
            violatedDirective: report['violated-directive'],
            effectiveDirective: report['effective-directive'],
            originalPolicy: report['original-policy'],
            blockedURI: report['blocked-uri'],
            sourceFile: report['source-file'],
            lineNumber: report['line-number'],
            columnNumber: report['column-number'],
            statusCode: report.status || report['status-code'], // Common variations
            disposition: report.disposition,
            timestamp: new Date().toISOString() // Timestamp of processing, not violation
        };
        const message = `External CSP Report: Directive '${mappedReport.violatedDirective}' blocked URI '${mappedReport.blockedURI}'.`;

        if (this.config.logToConsole) this._log('warn', message, mappedReport);
        if (this.config.sendToErrorLogger && this.dependencies.ErrorLoggerInstance?.handleError) {
            this.dependencies.ErrorLoggerInstance.handleError(message, 'CSPExternalReport', 'security', mappedReport);
        }
        if (this.config.customReportCallback) {
            try { this.config.customReportCallback(mappedReport); }
            catch (e) { this._log('error', 'Error in customReportCallback for external CSP report.', { error: e, report: mappedReport }); }
        }
    }
}

export default CSPReportHandler;

// Example instantiation in main.js:
// import CSPReportHandler from './utils/csp-report-handler.js';
// const cspHandler = new CSPReportHandler({
//     dependencies: {
//         LoggingServiceClass: window.LoggingService, // Pass the LoggingService CLASS
//         ErrorLoggerInstance: window.ErrorDetectionSystemInstance // Pass an INSTANCE
//     }
// });
// window.CSPReportHandlerInstance = cspHandler; // Optional global
