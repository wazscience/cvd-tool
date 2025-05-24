/**
 * Error Detection System Module
 * @file /js/utils/error-detection-system.js
 * @description Centralized system for detecting, tracking, and displaying errors.
 * Based on "Enhanced CVD Risk Toolkit - Implementation Guide.pdf" (pages 335-347).
 * @version 1.0.0
 * @author CVD Risk Assessment Team
 */

// Optional: Attempt to import SecureStorage if available and configured for use
// import SecureStorage from './secure-storage.js'; // If SecureStorage is an ES module

class ErrorLogEntry {
    /**
     * Creates an instance of ErrorLogEntry.
     * @param {string} message - The error message.
     * @param {string} [source='Unknown'] - The source of the error (e.g., file name, module name).
     * @param {number} [lineno] - The line number where the error occurred.
     * @param {number} [colno] - The column number where the error occurred.
     * @param {Error} [errorObject] - The original error object, if available.
     * @param {string} [severity='error'] - Severity of the error ('error', 'warning', 'info').
     * @param {Object} [additionalData={}] - Any other relevant data.
     */
    constructor(message, source = 'Unknown', lineno, colno, errorObject, severity = 'error', additionalData = {}) {
        this.timestamp = new Date();
        this.message = message || (errorObject ? errorObject.message : 'No message');
        this.source = source;
        this.lineno = lineno;
        this.colno = colno;
        this.stack = errorObject ? (errorObject.stack || 'No stack trace available') : 'No stack trace available';
        this.severity = severity; // 'error', 'warning', 'info'
        this.type = errorObject ? errorObject.name : 'CustomError';
        this.additionalData = additionalData;
        this.id = `err_${this.timestamp.getTime()}_${Math.random().toString(36).substring(2, 9)}`;
        this.isResolved = false; // For future tracking if errors can be marked resolved
    }
}

const ErrorDetectionSystem = (() => {
    let initialized = false;
    const errorLog = [];
    const MAX_LOG_SIZE = 100; // Maximum number of errors to keep in memory
    let config = {
        debugMode: false, // If true, logs more details to console
        persistErrors: false, // Whether to try persisting errors (e.g., to SecureStorage)
        maxNotifications: 5, // Max number of on-screen notifications at once
        notificationTimeout: 7000, // ms for notifications to auto-hide
        criticalErrorPageContent: `
            <div style="text-align: center; padding: 40px; font-family: Arial, sans-serif;">
                <h1>Application Error</h1>
                <p>A critical error has occurred, and the application cannot continue safely.</p>
                <p>Please try refreshing the page. If the problem persists, contact support.</p>
                <button onclick="window.location.reload()">Refresh Page</button>
            </div>
        `,
        // Optional SecureStorage instance for persisting errors
        // secureStorage: null // Example: SecureStorage.getInstance() if it's a singleton
    };

    // To store references to notification elements for removal
    const activeNotifications = [];

    /**
     * Initializes the Error Detection System.
     * Sets up global error handlers.
     * @param {Object} [userConfig={}] - Configuration options to override defaults.
     */
    function init(userConfig = {}) {
        if (initialized) {
            console.warn('[ErrorDetectionSystem] Already initialized.');
            return;
        }
        config = { ...config, ...userConfig };

        // Setup global error handlers
        window.onerror = (message, source, lineno, colno, error) => {
            trackError(message, source, lineno, colno, error, 'error', { handler: 'window.onerror' });
            showErrorModal(new ErrorLogEntry(message, source, lineno, colno, error, 'error')); // Show modal for uncaught errors
            return true; // Prevents default browser error handling for some errors
        };

        window.onunhandledrejection = (event) => {
            const reason = event.reason || 'Unhandled promise rejection';
            let errorObject = reason instanceof Error ? reason : new Error(String(reason));
            let message = `Unhandled promise rejection: ${reason.message || String(reason)}`;
            
            trackError(message, 'PromiseRejection', undefined, undefined, errorObject, 'error', { handler: 'window.onunhandledrejection', promiseEvent: event });
            showErrorModal(new ErrorLogEntry(message, 'PromiseRejection', undefined, undefined, errorObject, 'error')); // Show modal
            return true;
        };
        
        // Process any early errors captured before initialization
        if (window.__earlyErrors && Array.isArray(window.__earlyErrors)) {
            window.__earlyErrors.forEach(earlyError => {
                trackError(earlyError.message, earlyError.source, earlyError.lineno, earlyError.colno, earlyError.error, 'error', { handler: 'early-capture', type: earlyError.type });
            });
            window.__earlyErrors = []; // Clear early errors
        }

        initialized = true;
        console.log('[ErrorDetectionSystem] Initialized successfully.');
        if (config.debugMode) {
            console.log('[ErrorDetectionSystem] Debug mode enabled.');
        }
    }

    /**
     * Tracks an error by creating an ErrorLogEntry and storing it.
     * @param {string|Error} messageOrError - The error message string or an Error object.
     * @param {string} [source='Unknown'] - The source of the error.
     * @param {number} [lineno] - Line number.
     * @param {number} [colno] - Column number.
     * @param {Error} [errorObjectInstance] - The actual Error object (if messageOrError is string).
     * @param {string} [severity='error'] - Severity ('error', 'warning', 'info').
     * @param {Object} [additionalData={}] - Additional context.
     * @returns {ErrorLogEntry} The created log entry.
     */
    function trackError(messageOrError, source, lineno, colno, errorObjectInstance, severity = 'error', additionalData = {}) {
        let message, errorObj;

        if (messageOrError instanceof Error) {
            errorObj = messageOrError;
            message = errorObj.message;
            if (!source) source = errorObj.fileName || errorObj.sourceURL || 'Unknown'; // Try to get source from error object
            if (!lineno) lineno = errorObj.lineNumber || errorObj.line;
            if (!colno) colno = errorObj.columnNumber || errorObj.column;
        } else {
            message = String(messageOrError);
            errorObj = errorObjectInstance instanceof Error ? errorObjectInstance : new Error(message);
            if (errorObjectInstance && !errorObj.stack && errorObjectInstance.stack) {
                errorObj.stack = errorObjectInstance.stack; // Preserve original stack if creating new Error obj
            }
        }
        
        if (!errorObj.stack) { // Ensure stack is present
             try { throw errorObj; } catch (e) { if(e.stack) errorObj.stack = e.stack; }
        }


        const entry = new ErrorLogEntry(message, source, lineno, colno, errorObj, severity, additionalData);
        
        if (errorLog.length >= MAX_LOG_SIZE) {
            errorLog.shift(); // Remove oldest error
        }
        errorLog.push(entry);

        if (config.debugMode) {
            console.error(`[ErrorTracked-${entry.severity.toUpperCase()}] ID: ${entry.id}`, entry);
        }

        // Optional: Persist errors using SecureStorage
        if (config.persistErrors && config.secureStorage && typeof config.secureStorage.setItem === 'function') {
            try {
                // config.secureStorage.setItem('error_log', errorLog); // This might need JSON.stringify and careful parsing
            } catch (e) {
                console.warn('[ErrorDetectionSystem] Failed to persist error log.', e);
            }
        }
        return entry;
    }

    /**
     * Displays a non-modal error notification to the user.
     * Uses the #error-notification-container in `cvd_toolkit_final_html`.
     * @param {string|ErrorLogEntry} messageOrEntry - The message string or an ErrorLogEntry object.
     * @param {string} [type='error'] - 'error', 'warning', 'info', 'success'.
     */
    function showErrorNotification(messageOrEntry, type = 'error') {
        if (activeNotifications.length >= config.maxNotifications) {
            const oldestNotification = activeNotifications.shift();
            oldestNotification?.remove();
        }

        const notificationContainer = document.getElementById('error-notification-container');
        if (!notificationContainer) {
            console.error('[ErrorDetectionSystem] Notification container #error-notification-container not found.');
            return;
        }

        const message = messageOrEntry instanceof ErrorLogEntry ? messageOrEntry.message : String(messageOrEntry);
        const severity = messageOrEntry instanceof ErrorLogEntry ? messageOrEntry.severity : type;

        const notificationDiv = document.createElement('div');
        notificationDiv.className = `notification notification-${severity}`; // CSS classes for styling
        notificationDiv.setAttribute('role', 'alert');
        notificationDiv.textContent = message;

        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '&times;';
        closeButton.setAttribute('aria-label', 'Close notification');
        closeButton.onclick = () => notificationDiv.remove();
        notificationDiv.appendChild(closeButton);

        notificationContainer.appendChild(notificationDiv);
        activeNotifications.push(notificationDiv);

        setTimeout(() => {
            notificationDiv.remove();
            const index = activeNotifications.indexOf(notificationDiv);
            if (index > -1) activeNotifications.splice(index, 1);
        }, config.notificationTimeout);
    }
    
    /**
     * Displays a modal with detailed error information.
     * Uses the #error-correction-modal-template from `cvd_toolkit_final_html`.
     * @param {ErrorLogEntry} errorEntry - The ErrorLogEntry object.
     */
    function showErrorModal(errorEntry) {
        if (!(errorEntry instanceof ErrorLogEntry)) {
            logError('showErrorModal called with invalid error entry.', errorEntry);
            // Try to create a basic entry
            errorEntry = trackError(String(errorEntry), 'ErrorModalFallback');
        }

        const modalTemplate = document.getElementById('error-correction-modal-template');
        const uiModule = window.AppUI; // Assuming ui.js exposes an AppUI object globally or via window

        if (modalTemplate && uiModule && typeof uiModule.showModal === 'function') {
            const modalContent = {
                title: `Runtime Error Detected: ${errorEntry.type}`,
                bodyHtml: `
                    <div class="error-details-summary-section">
                        <p><strong>Severity:</strong> <span class="error-severity-text-display">${sanitizeString(errorEntry.severity)}</span></p>
                        <p><strong>Message:</strong> <span class="error-message-text-display">${sanitizeString(errorEntry.message)}</span></p>
                        <p><strong>Source:</strong> <span class="error-location-text-display">${sanitizeString(errorEntry.source || 'N/A')} (Line: ${errorEntry.lineno || 'N/A'})</span></p>
                    </div>
                    <div class="error-stack-trace-display" style="margin-top:1rem; max-height: 200px; overflow-y: auto; background: #f0f0f0; padding: 10px; border-radius: 4px;">
                        <h4>Stack Trace:</h4>
                        <pre><code class="language-javascript error-stack-content-display">${sanitizeString(errorEntry.stack)}</code></pre>
                    </div>
                    ${config.debugMode && errorEntry.additionalData && Object.keys(errorEntry.additionalData).length > 0 ?
                        `<div class="error-additional-data" style="margin-top:1rem;"><h4>Additional Data:</h4><pre style="max-height: 100px; overflow-y: auto;">${sanitizeString(JSON.stringify(errorEntry.additionalData, null, 2))}</pre></div>`
                        : ''
                    }
                `,
                footerButtons: [
                    { text: 'Ignore', className: 'button-secondary error-ignore-action-btn', action: (modal) => uiModule.hideModal(modal) },
                    // { text: 'Apply Correction', className: 'button-primary error-apply-correction-action-btn', action: (modal) => { /* TBD */ uiModule.hideModal(modal);}, disabled: true },
                    { text: 'Report Issue (Copy Details)', className: 'button-danger error-report-action-btn', action: (modal) => copyErrorDetailsToClipboard(errorEntry) }
                ]
            };
            uiModule.showModal(modalTemplate, modalContent);
        } else {
            // Fallback to simpler alert if modal system is not available
            const simpleMessage = `Critical Error: ${errorEntry.message}\nSource: ${errorEntry.source || 'N/A'}\nDetails in console.`;
            alert(simpleMessage);
            if (!modalTemplate) console.error('[ErrorDetectionSystem] Modal template #error-correction-modal-template not found.');
            if (!uiModule || typeof uiModule.showModal !== 'function') console.error('[ErrorDetectionSystem] AppUI.showModal is not available.');
        }
    }

    /**
     * Helper function to copy error details to clipboard.
     * @param {ErrorLogEntry} errorEntry
     */
    function copyErrorDetailsToClipboard(errorEntry) {
        const details = `Error Report - CVD Toolkit
Timestamp: ${errorEntry.timestamp.toISOString()}
ID: ${errorEntry.id}
Severity: ${errorEntry.severity}
Type: ${errorEntry.type}
Message: ${errorEntry.message}
Source: ${errorEntry.source} (Line: ${errorEntry.lineno}, Col: ${errorEntry.colno})
Stack Trace:
${errorEntry.stack}
Additional Data:
${JSON.stringify(errorEntry.additionalData, null, 2)}
User Agent: ${navigator.userAgent}
App Version: ${window.APP_VERSION || 'N/A'}`; // Assuming APP_VERSION is set globally

        navigator.clipboard.writeText(details)
            .then(() => {
                showErrorNotification('Error details copied to clipboard.', 'success');
            })
            .catch(err => {
                logError('Failed to copy error details to clipboard.', err);
                showErrorNotification('Could not copy error details. Please copy from console.', 'warning');
            });
    }
    
    /**
     * Helper function to sanitize string for display (basic HTML entity encoding)
     * TODO: This should ideally use a more robust sanitizer if displaying complex data
     * or delegate to a global sanitization utility (like xssProtection.sanitizeString).
     */
    function sanitizeString(str) {
        if (typeof window.xssProtection !== 'undefined' && typeof window.xssProtection.sanitizeString === 'function') {
            return window.xssProtection.sanitizeString(String(str));
        }
        // Basic fallback
        return String(str).replace(/[&<>"'`=\/]/g, function (s) {
            return {
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
                '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
            }[s];
        });
    }


    /**
     * Replaces the document body with a critical error message.
     * Used for unrecoverable errors.
     */
    function showCriticalErrorPage() {
        try {
            if (document.body) {
                document.body.innerHTML = config.criticalErrorPageContent;
            } else {
                // Fallback if body isn't available yet (very early error)
                document.documentElement.innerHTML = `<html><head><title>Critical Error</title></head><body>${config.criticalErrorPageContent}</body></html>`;
            }
        } catch (e) {
            // Ultimate fallback
            console.error("Failed to display critical error page. Original error was too severe.", e);
            alert("A critical error occurred. The application cannot continue.");
        }
        // Prevent further script execution if possible (though this is hard to guarantee)
        if (window.stop) {
            window.stop();
        }
        // throw new Error("Critical Error Page Triggered"); // Optional: rethrow to halt further scripts
    }

    /**
     * Handles errors specifically related to module loading failures.
     * @param {string} moduleName - The name/path of the module that failed to load.
     * @param {Error} error - The error object from the module loader.
     */
    function handleModuleLoadError(moduleName, error) {
        const message = `Failed to load critical module: ${moduleName}. Application functionality may be limited.`;
        const entry = trackError(message, 'ModuleLoader', undefined, undefined, error, 'error', { module: moduleName });
        showErrorModal(entry); 
        // Depending on module criticality, could call showCriticalErrorPage()
        // Example: if (moduleName === 'main.js' || moduleName === 'ui.js') showCriticalErrorPage();
    }
    
    function getErrors() {
        return [...errorLog]; // Return a copy
    }

    function clearErrors() {
        errorLog.length = 0;
        if (config.persistErrors && config.secureStorage && typeof config.secureStorage.removeItem === 'function') {
           // config.secureStorage.removeItem('error_log');
        }
        console.log('[ErrorDetectionSystem] Error log cleared.');
    }
    
    // Listen to online/offline events
    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
            showErrorNotification('Connection restored. You are back online.', 'success');
            // Potentially retry queued operations if any
        });
        window.addEventListener('offline', () => {
            showErrorNotification('Connection lost. You are currently offline.', 'warning');
        });
    }


    // Public API
    return {
        init,
        trackError,
        getErrors,
        clearErrors,
        showErrorNotification,
        showErrorModal,
        showCriticalErrorPage,
        handleModuleLoadError
    };
})();

export default ErrorDetectionSystem;
