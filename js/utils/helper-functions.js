/**
 * Helper Functions Utility Module
 * @file /js/utils/helper-functions.js
 * @description Provides common utility functions for the CVD Risk Toolkit.
 * Includes functions for string manipulation, number formatting, array operations,
 * object handling, and other general-purpose tasks.
 * @version 1.1.0
 * @exports {debounce, throttle, deepClone, formatNumber, sanitizeData, generateUUID, getNestedValue, setNestedValue, arraysEqual, objectsEqualShallow, formatDate, parseDate, escapeHTML, unescapeHTML, isNullOrUndefined, isEmptyObject, isEmptyArray, capitalizeFirstLetter, truncateString, getQueryParams, createQueryParams, delay, retryAsync}
 */

'use strict';

/**
 * Debounces a function, delaying its execution until after a specified wait time
 * has elapsed since the last time it was invoked.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @param {boolean} [immediate=false] - Trigger the function on the leading edge instead of the trailing.
 * @returns {Function} The debounced function.
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const context = this;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttles a function, ensuring it's called at most once in a specified time period.
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The minimum time interval (in milliseconds) between invocations.
 * @returns {Function} The throttled function.
 */
export function throttle(func, limit) {
    let inThrottle;
    let lastFunc;
    let lastRan;
    return function(...args) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            lastRan = Date.now();
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
                if (lastFunc) {
                    lastFunc.apply(context, args); // Call with latest args if queued
                    lastRan = Date.now();
                    lastFunc = null;
                }
            }, limit);
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

/**
 * Creates a deep clone of an object or array.
 * Handles simple objects, arrays, dates, and primitives.
 * Does not handle functions, regex, or complex class instances correctly.
 * @param {*} obj - The object or array to clone.
 * @returns {*} A deep clone of the input.
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }

    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
    // Should not be reached for objects/arrays
    return obj;
}


/**
 * Formats a number to a specified number of decimal places.
 * @param {number|string} number - The number to format.
 * @param {number} [decimals=2] - Number of decimal places.
 * @param {string} [decPoint=','] - Decimal point character.
 * @param {string} [thousandsSep='.'] - Thousands separator character.
 * @returns {string} The formatted number as a string, or an empty string if input is invalid.
 */
export function formatNumber(number, decimals = 2, decPoint = '.', thousandsSep = ',') {
    const num = parseFloat(String(number).replace(/[^0-9.-]+/g, ''));
    if (isNaN(num)) {
        return ''; // Or handle error appropriately
    }

    const fixedNum = num.toFixed(decimals);
    const parts = fixedNum.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);

    return parts.join(decPoint);
}

/**
 * Basic data sanitizer for display purposes (escapes HTML).
 * More robust sanitization should be handled by a dedicated InputSanitizerService.
 * @param {*} data - The data to sanitize (string, number, or simple object/array).
 * @returns {*} Sanitized data.
 */
export function sanitizeData(data) {
    if (typeof data === 'string') {
        return escapeHTML(data);
    }
    if (typeof data === 'number' || typeof data === 'boolean' || data === null || data === undefined) {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    }
    if (typeof data === 'object') {
        const sanitizedObject = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                sanitizedObject[key] = sanitizeData(data[key]);
            }
        }
        return sanitizedObject;
    }
    return String(data); // Fallback for other types
}

/**
 * Generates a simple UUID v4.
 * @returns {string} A UUID string.
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Safely gets a nested value from an object using a dot-separated path.
 * @param {object} obj - The object to traverse.
 * @param {string} path - The dot-separated path (e.g., 'user.address.street').
 * @param {*} [defaultValue=undefined] - Value to return if path is not found.
 * @returns {*} The value at the path or the default value.
 */
export function getNestedValue(obj, path, defaultValue = undefined) {
    if (!obj || typeof path !== 'string') {
        return defaultValue;
    }
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current === null || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, key)) {
            return defaultValue;
        }
        current = current[key];
    }
    return current;
}

/**
 * Safely sets a nested value in an object using a dot-separated path.
 * Creates intermediate objects if they don't exist.
 * @param {object} obj - The object to modify.
 * @param {string} path - The dot-separated path (e.g., 'user.address.street').
 * @param {*} value - The value to set.
 * @returns {boolean} True if the value was set, false otherwise.
 */
export function setNestedValue(obj, path, value) {
    if (!obj || typeof path !== 'string' || typeof obj !== 'object') {
        return false;
    }
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return true;
}


/**
 * Compares two arrays for equality (shallow comparison of elements).
 * @param {Array} arr1
 * @param {Array} arr2
 * @returns {boolean} True if arrays are equal.
 */
export function arraysEqual(arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Shallowly compares two objects for equality.
 * @param {object} obj1
 * @param {object} obj2
 * @returns {boolean} True if objects are equal.
 */
export function objectsEqualShallow(obj1, obj2) {
    if (obj1 === null || obj2 === null || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
        return obj1 === obj2;
    }
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) {
        return false;
    }
    for (const key of keys1) {
        if (!Object.prototype.hasOwnProperty.call(obj2, key) || obj1[key] !== obj2[key]) {
            return false;
        }
    }
    return true;
}

/**
 * Formats a Date object or timestamp into a string (YYYY-MM-DD HH:MM:SS).
 * @param {Date|number} dateInput - Date object or timestamp.
 * @param {object} [options] - Formatting options.
 * @param {boolean} [options.includeTime=true] - Whether to include time.
 * @param {string} [options.locale='en-CA'] - Locale for formatting.
 * @returns {string} Formatted date string or 'Invalid Date'.
 */
export function formatDate(dateInput, options = { includeTime: true, locale: 'en-CA' }) {
    try {
        const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        if (!options.includeTime) {
            return `${year}-${month}-${day}`;
        }

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
        return 'Invalid Date';
    }
}

/**
 * Parses a date string into a Date object.
 * Supports YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY.
 * @param {string} dateString - The date string to parse.
 * @returns {Date|null} Date object or null if parsing fails.
 */
export function parseDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;

    let date = new Date(dateString); // Try direct parsing first

    if (isNaN(date.getTime())) {
        // Try YYYY-MM-DD or YYYY/MM/DD
        let parts = dateString.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (parts) {
            date = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
        } else {
            // Try MM/DD/YYYY
            parts = dateString.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
            if (parts) {
                date = new Date(parseInt(parts[3], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else {
                // Try DD/MM/YYYY
                parts = dateString.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
                if (parts) {
                     date = new Date(parseInt(parts[3], 10), parseInt(parts[2], 10) - 1, parseInt(parts[1], 10));
                }
            }
        }
    }
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Escapes HTML special characters in a string.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeHTML(str) {
    if (typeof str !== 'string') return String(str);
    return str.replace(/[&<>"']/g, function (match) {
        switch (match) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;'; // HTML5 standard for single quote
            default: return match;
        }
    });
}

/**
 * Unescapes HTML special characters in a string.
 * @param {string} str - The string to unescape.
 * @returns {string} The unescaped string.
 */
export function unescapeHTML(str) {
    if (typeof str !== 'string') return String(str);
    const el = document.createElement('div');
    el.innerHTML = str;
    return el.textContent || el.innerText || '';
}

/**
 * Checks if a value is null or undefined.
 * @param {*} value - The value to check.
 * @returns {boolean} True if null or undefined.
 */
export function isNullOrUndefined(value) {
    return value === null || value === undefined;
}

/**
 * Checks if an object is empty (has no own enumerable properties).
 * @param {object} obj - The object to check.
 * @returns {boolean} True if the object is empty.
 */
export function isEmptyObject(obj) {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        return false; // Or true depending on how you want to treat non-objects/arrays
    }
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}

/**
 * Checks if an array is empty.
 * @param {Array} arr - The array to check.
 * @returns {boolean} True if the array is empty.
 */
export function isEmptyArray(arr) {
    return Array.isArray(arr) && arr.length === 0;
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} str - The string to capitalize.
 * @returns {string} The capitalized string.
 */
export function capitalizeFirstLetter(str) {
    if (typeof str !== 'string' || str.length === 0) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates a string to a specified length and adds an ellipsis.
 * @param {string} str - The string to truncate.
 * @param {number} maxLength - The maximum length of the string.
 * @param {string} [ellipsis='...'] - The ellipsis string.
 * @returns {string} The truncated string.
 */
export function truncateString(str, maxLength, ellipsis = '...') {
    if (typeof str !== 'string' || str.length <= maxLength) {
        return str;
    }
    return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Gets URL query parameters as an object.
 * @param {string} [queryString=window.location.search] - The query string.
 * @returns {object} An object of query parameters.
 */
export function getQueryParams(queryString = window.location.search) {
    const params = {};
    const searchParams = new URLSearchParams(queryString);
    for (const [key, value] of searchParams) {
        if (params[key]) {
            if (!Array.isArray(params[key])) {
                params[key] = [params[key]];
            }
            params[key].push(value);
        } else {
            params[key] = value;
        }
    }
    return params;
}

/**
 * Creates a query string from an object of parameters.
 * @param {object} params - The parameters object.
 * @returns {string} The query string (e.g., "?key1=value1&key2=value2").
 */
export function createQueryParams(params) {
    if (isEmptyObject(params)) return '';
    const searchParams = new URLSearchParams();
    for (const key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
            const value = params[key];
            if (Array.isArray(value)) {
                value.forEach(val => searchParams.append(key, val));
            } else if (value !== undefined && value !== null) {
                searchParams.append(key, value);
            }
        }
    }
    return `?${searchParams.toString()}`;
}

/**
 * Delays execution for a specified number of milliseconds.
 * @param {number} ms - Milliseconds to delay.
 * @returns {Promise<void>}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries an async function a specified number of times with exponential backoff.
 * @param {Function} asyncFn - The async function to retry. Must return a Promise.
 * @param {object} [options={}] - Retry options.
 * @param {number} [options.retries=3] - Maximum number of retries.
 * @param {number} [options.delayMs=1000] - Initial delay in milliseconds.
 * @param {number} [options.backoffFactor=2] - Factor to multiply delay by on each retry.
 * @param {Function} [options.onRetry] - Callback on each retry: `(error, attemptNumber, delayForNextAttempt) => {}`.
 * @returns {Promise<*>} The result of the async function.
 * @throws Will throw the last error if all retries fail.
 */
export async function retryAsync(asyncFn, options = {}) {
    const config = {
        retries: 3,
        delayMs: 1000,
        backoffFactor: 2,
        onRetry: null,
        ...options,
    };

    let lastError;
    for (let attempt = 0; attempt <= config.retries; attempt++) {
        try {
            return await asyncFn();
        } catch (error) {
            lastError = error;
            if (typeof config.onRetry === 'function') {
                try {
                    config.onRetry(error, attempt + 1, config.delayMs * Math.pow(config.backoffFactor, attempt));
                } catch (retryCallbackError) {
                    console.error('Error in onRetry callback:', retryCallbackError);
                }
            }
            if (attempt < config.retries) {
                await delay(config.delayMs * Math.pow(config.backoffFactor, attempt));
            }
        }
    }
    throw lastError;
}

