/**
 * Logging Service Module
 * @file /js/utils/logging-service.js
 * @description Provides a centralized and configurable logging facility for the CVD Risk Toolkit.
 * Supports different log levels, timestamps, component tagging, and potential integration
 * with remote logging services or the main ErrorDetectionSystem.
 * @version 1.1.0
 * @exports LoggingService
 */

'use strict';

// Assuming EventBus might be used for broadcasting log events if needed.
// import EventBus from './event-bus.js'; // Or get from window if globally available

export class LoggingService {
    /**
     * Log levels, from most to least severe.
     * @readonly
     * @enum {number}
     */
    static LOG_LEVELS = Object.freeze({
        NONE: 0,    // No logging
        CRITICAL: 1,// Critical errors, application stability at risk
        ERROR: 2,   // Errors that prevent normal operation
        WARN: 3,    // Warnings about potential issues
        INFO: 4,    // Informational messages about application flow
        DEBUG: 5,   // Detailed debugging information
        TRACE: 6    // Verbose tracing for deep debugging
    });

    /**
     * Creates an instance of LoggingService.
     * Typically used as a singleton or injected as a dependency.
     * @param {object} [options={}] - Configuration options.
     * @param {string} [options.componentName='Global'] - Default component name for logs from this instance.
     * @param {LoggingService.LOG_LEVELS} [options.logLevel=LoggingService.LOG_LEVELS.INFO] - Minimum level to log.
     * @param {boolean} [options.includeTimestamp=true] - Whether to include timestamps in logs.
     * @param {boolean} [options.useJsonFormat=false] - Output logs as JSON objects (useful for remote logging).
     * @param {Function} [options.remoteLogHandler=null] - Function to send logs to a remote service: `(levelString, message, data, timestamp, component) => {}`.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     * Expected: ErrorLogger (optional, for critical issues), EventBus (optional).
     */
    constructor(options = {}) {
        this.componentName = options.componentName || 'Global';
        this.currentLogLevel = options.logLevel !== undefined ? options.logLevel : LoggingService.LOG_LEVELS.INFO;
        this.includeTimestamp = options.includeTimestamp !== undefined ? options.includeTimestamp : true;
        this.useJsonFormat = options.useJsonFormat || false;
        this.remoteLogHandler = options.remoteLogHandler || null;

        this.dependencies = {
            ErrorLogger: options.dependencies?.ErrorLogger || window.ErrorDetectionSystemInstance || console, // Fallback to console
            EventBus: options.dependencies?.EventBus || window.EventBus,
        };

        // Bind methods to ensure 'this' context is correct when passed as callbacks
        this.critical = this.critical.bind(this);
        this.error = this.error.bind(this);
        this.warn = this.warn.bind(this);
        this.info = this.info.bind(this);
        this.debug = this.debug.bind(this);
        this.trace = this.trace.bind(this);
        this.log = this.log.bind(this); // Generic log method
    }

    /**
     * Sets the minimum log level. Messages below this level will be ignored.
     * @param {LoggingService.LOG_LEVELS} level - The new log level.
     */
    setLogLevel(level) {
        if (Object.values(LoggingService.LOG_LEVELS).includes(level)) {
            this.currentLogLevel = level;
            this.info(`Log level set to: ${this._getLevelString(level)} (${level})`);
        } else {
            this.warn(`Attempted to set invalid log level: ${level}`);
        }
    }

    /**
     * Generic log method.
     * @param {LoggingService.LOG_LEVELS} level - The level of this log message.
     * @param {string} message - The log message.
     * @param {string} [component=this.componentName] - The component originating the log.
     * @param {...any} [additionalData] - Additional data to log.
     */
    log(level, message, component = this.componentName, ...additionalData) {
        if (level > this.currentLogLevel || level === LoggingService.LOG_LEVELS.NONE) {
            return;
        }

        const levelString = this._getLevelString(level);
        const timestamp = this.includeTimestamp ? new Date().toISOString() : undefined;

        // Prepare data payload
        const logDataPayload = additionalData.length > 0 ?
            (additionalData.length === 1 && typeof additionalData[0] === 'object' && additionalData[0] !== null ? additionalData[0] : { details: additionalData })
            : {};


        if (this.useJsonFormat) {
            const logEntry = {
                timestamp,
                level: levelString.toUpperCase(),
                component,
                message,
                ...logDataPayload
            };
            console[this._getConsoleMethod(level)](JSON.stringify(logEntry));
        } else {
            let logParts = [];
            if (timestamp) logParts.push(`[${timestamp}]`);
            logParts.push(`[${levelString.toUpperCase()}]`);
            if (component) logParts.push(`[${component}]`);
            logParts.push(message);

            if (Object.keys(logDataPayload).length > 0) {
                 console[this._getConsoleMethod(level)](logParts.join(' '), logDataPayload);
            } else {
                 console[this._getConsoleMethod(level)](logParts.join(' '));
            }
        }

        // Remote logging if configured
        if (this.remoteLogHandler) {
            try {
                this.remoteLogHandler(levelString, message, logDataPayload, timestamp, component);
            } catch (e) {
                console.error('[LoggingService] Error in remoteLogHandler:', e);
            }
        }

        // Publish log event via EventBus if available
        this.dependencies.EventBus?.publish('log:message', {
            level: levelString,
            message,
            component,
            data: logDataPayload,
            timestamp
        });

        // For critical errors, also use the main ErrorDetectionSystem if available and different
        if (level === LoggingService.LOG_LEVELS.CRITICAL &&
            this.dependencies.ErrorLogger &&
            typeof this.dependencies.ErrorLogger.handleError === 'function') {
            // Avoid double logging if this.dependencies.ErrorLogger is just console
            if (this.dependencies.ErrorLogger !== console) {
                 this.dependencies.ErrorLogger.handleError(message, component, 'critical', logDataPayload);
            }
        }
    }

    /** Logs a critical message. */
    critical(message, component, ...additionalData) {
        this.log(LoggingService.LOG_LEVELS.CRITICAL, message, component, ...additionalData);
    }
    /** Logs an error message. */
    error(message, component, ...additionalData) {
        this.log(LoggingService.LOG_LEVELS.ERROR, message, component, ...additionalData);
    }
    /** Logs a warning message. */
    warn(message, component, ...additionalData) {
        this.log(LoggingService.LOG_LEVELS.WARN, message, component, ...additionalData);
    }
    /** Logs an informational message. */
    info(message, component, ...additionalData) {
        this.log(LoggingService.LOG_LEVELS.INFO, message, component, ...additionalData);
    }
    /** Logs a debug message. */
    debug(message, component, ...additionalData) {
        this.log(LoggingService.LOG_LEVELS.DEBUG, message, component, ...additionalData);
    }
    /** Logs a trace message. */
    trace(message, component, ...additionalData) {
        this.log(LoggingService.LOG_LEVELS.TRACE, message, component, ...additionalData);
    }

    /**
     * Gets the string representation of a log level.
     * @param {LoggingService.LOG_LEVELS} level - The log level number.
     * @returns {string} The log level string.
     * @private
     */
    _getLevelString(level) {
        return Object.keys(LoggingService.LOG_LEVELS).find(key => LoggingService.LOG_LEVELS[key] === level) || 'UNKNOWN';
    }

    /**
     * Gets the appropriate console method for a log level.
     * @param {LoggingService.LOG_LEVELS} level - The log level number.
     * @returns {string} The console method name (e.g., 'error', 'warn', 'log').
     * @private
     */
    _getConsoleMethod(level) {
        switch (level) {
            case LoggingService.LOG_LEVELS.CRITICAL:
            case LoggingService.LOG_LEVELS.ERROR:
                return 'error';
            case LoggingService.LOG_LEVELS.WARN:
                return 'warn';
            case LoggingService.LOG_LEVELS.INFO:
                return 'info';
            case LoggingService.LOG_LEVELS.DEBUG:
            case LoggingService.LOG_LEVELS.TRACE:
                return 'debug'; // 'trace' method also exists, but 'debug' is more common
            default:
                return 'log';
        }
    }

    /**
     * Creates a new logger instance with a specific component name,
     * inheriting parent logger's settings.
     * @param {string} componentName - Name of the component for this logger instance.
     * @returns {LoggingService} A new LoggingService instance.
     */
    getLogger(componentName) {
        return new LoggingService({
            ...this, // Inherit settings
            componentName: componentName,
            // Ensure dependencies are passed if they were objects, not direct console
            dependencies: {
                ErrorLogger: this.dependencies.ErrorLogger === console ? console : this.dependencies.ErrorLogger,
                EventBus: this.dependencies.EventBus
            }
        });
    }
}

// Example of creating a global/default logger instance if desired
// This would typically be done in main.js and passed around.
// const GlobalLogger = new LoggingService({ componentName: 'ApplicationCore' });
// window.GlobalLogger = GlobalLogger;

// export default LoggingService; // If main.js imports and instantiates
