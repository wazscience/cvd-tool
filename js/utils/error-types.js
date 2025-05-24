/**
 * Custom Error Types Module
 * @file /js/utils/error-types.js
 * @description Defines custom error classes for the CVD Risk Toolkit application,
 * allowing for more specific error handling and identification.
 * @version 1.0.0
 * @exports ApplicationError, ValidationError, ApiError, NetworkError, CalculationError, EMRIntegrationError, FieldMappingError, ChartRenderingError, ModuleLoadError, SecurityError, DataManagerError, PDFGenerationError, InitializationError
 */

'use strict';

/**
 * Base class for all application-specific errors.
 * Allows for easier identification of custom errors versus built-in JavaScript errors.
 */
export class ApplicationError extends Error {
    /**
     * Creates an instance of ApplicationError.
     * @param {string} message - The error message.
     * @param {string} [errorCode] - A unique code for this error type (e.g., 'VALIDATION_FAILED').
     * @param {object} [details={}] - Additional details about the error.
     * @param {Error} [originalError] - The original error if this is a wrapped error.
     */
    constructor(message, errorCode, details = {}, originalError = null) {
        super(message);
        this.name = this.constructor.name; // Ensures the correct error name is displayed
        this.errorCode = errorCode || 'APP_ERROR_UNKNOWN';
        this.details = details; // For structured error information
        this.timestamp = new Date().toISOString();
        this.originalError = originalError; // To keep track of the underlying error

        // Capturing the stack trace, excluding the constructor call from it.
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error(message)).stack;
        }
    }
}

/**
 * Error for input validation failures.
 */
export class ValidationError extends ApplicationError {
    /**
     * @param {string} message - Validation error message.
     * @param {string} [fieldName] - The name of the field that failed validation.
     * @param {*} [fieldValue] - The value of the field that failed.
     * @param {object} [validationDetails={}] - Specific details about the validation failure.
     */
    constructor(message, fieldName, fieldValue, validationDetails = {}) {
        super(message, 'VALIDATION_ERROR', { fieldName, fieldValue, ...validationDetails });
        this.fieldName = fieldName;
        this.fieldValue = fieldValue;
    }
}

/**
 * Error for API communication failures.
 */
export class ApiError extends ApplicationError {
    /**
     * @param {string} message - API error message.
     * @param {number} [statusCode] - HTTP status code from the API response.
     * @param {string} [endpoint] - The API endpoint that was called.
     * @param {object} [responseBody] - The body of the API error response.
     */
    constructor(message, statusCode, endpoint, responseBody) {
        super(message, 'API_ERROR', { statusCode, endpoint, responseBody });
        this.statusCode = statusCode;
        this.endpoint = endpoint;
        this.responseBody = responseBody;
    }
}

/**
 * Error for network connectivity issues.
 */
export class NetworkError extends ApplicationError {
    constructor(message = 'A network error occurred. Please check your connection.', originalError) {
        super(message, 'NETWORK_ERROR', {}, originalError);
    }
}

/**
 * Error specific to risk calculation failures.
 */
export class CalculationError extends ApplicationError {
    /**
     * @param {string} message - Calculation error message.
     * @param {string} [calculatorType] - Type of calculator (e.g., 'FRS', 'QRISK3').
     * @param {object} [inputParameters] - Parameters used for the calculation.
     */
    constructor(message, calculatorType, inputParameters) {
        super(message, 'CALCULATION_ERROR', { calculatorType, inputParameters });
        this.calculatorType = calculatorType;
    }
}

/**
 * Error for EMR integration issues.
 */
export class EMRIntegrationError extends ApplicationError {
    /**
     * @param {string} message - EMR integration error message.
     * @param {string} [emrSystem] - Name of the EMR system, if known.
     * @param {string} [operation] - The EMR operation that failed (e.g., 'fetchPatient', 'saveData').
     */
    constructor(message, emrSystem, operation) {
        super(message, 'EMR_INTEGRATION_ERROR', { emrSystem, operation });
        this.emrSystem = emrSystem;
        this.operation = operation;
    }
}

/**
 * Error for data field mapping failures (e.g., EMR to internal model).
 * As seen in user's `field-mapper.js`.
 */
export class FieldMappingError extends ApplicationError {
    /**
     * @param {string} message - Mapping error message.
     * @param {string} [sourceField] - The field in the source data.
     * @param {string} [targetField] - The field in the target model.
     * @param {object} [mappingDetails={}] - Additional details about the mapping failure.
     */
    constructor(message, sourceField, targetField, mappingDetails = {}) {
        super(message, 'FIELD_MAPPING_ERROR', { sourceField, targetField, ...mappingDetails });
        this.sourceField = sourceField;
        this.targetField = targetField;
    }
}

/**
 * Error for chart rendering failures.
 * As seen in user's `chart-renderer.js`.
 */
export class ChartRenderingError extends ApplicationError {
    /**
     * @param {string} message - Chart rendering error message.
     * @param {string} [chartType] - The type of chart that failed to render.
     * @param {object} [chartOptions] - The options used for the chart.
     */
    constructor(message, chartType, chartOptions) {
        super(message, 'CHART_RENDERING_ERROR', { chartType, chartOptions });
        this.chartType = chartType;
    }
}

/**
 * Error for dynamic module loading failures.
 */
export class ModuleLoadError extends ApplicationError {
    /**
     * @param {string} modulePath - The path of the module that failed to load.
     * @param {Error} originalError - The original import error.
     */
    constructor(modulePath, originalError) {
        super(`Failed to load module: ${modulePath}`, 'MODULE_LOAD_ERROR', { modulePath }, originalError);
        this.modulePath = modulePath;
    }
}

/**
 * Error for security-related issues (e.g., CSRF, sanitization failure).
 */
export class SecurityError extends ApplicationError {
    /**
     * @param {string} message - Security error message.
     * @param {string} [securityContext] - Context of the security issue (e.g., 'CSRF_VALIDATION', 'INPUT_SANITIZATION').
     */
    constructor(message, securityContext) {
        super(message, 'SECURITY_ERROR', { securityContext });
        this.securityContext = securityContext;
    }
}

/**
 * Error for data management operations (storage, import/export).
 */
export class DataManagerError extends ApplicationError {
    /**
     * @param {string} message - Data management error message.
     * @param {string} [operation] - The data operation that failed (e.g., 'saveItem', 'importJSON').
     */
    constructor(message, operation) {
        super(message, 'DATA_MANAGER_ERROR', { operation });
        this.operation = operation;
    }
}

/**
 * Error for PDF generation failures.
 */
export class PDFGenerationError extends ApplicationError {
    /**
     * @param {string} message - PDF generation error message.
     * @param {string} [documentTitle] - Title of the document being generated.
     */
    constructor(message, documentTitle) {
        super(message, 'PDF_GENERATION_ERROR', { documentTitle });
        this.documentTitle = documentTitle;
    }
}

/**
 * Error for application initialization failures.
 */
export class InitializationError extends ApplicationError {
    /**
     * @param {string} message - Initialization error message.
     * @param {string} [componentName] - Name of the component that failed to initialize.
     */
    constructor(message, componentName) {
        super(message, 'INITIALIZATION_ERROR', { componentName });
        this.componentName = componentName;
    }
}

// Example of how these might be used:
// if (apiResponse.status === 401) {
//   throw new ApiError('Authentication failed', 401, '/api/user');
// }
// if (!isValidAge(age)) {
//   throw new ValidationError('Invalid age provided', 'ageField', age, { min: 18, max: 120 });
// }
