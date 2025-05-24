/**
 * Device Capability Detector Module
 * @file /js/utils/device-capability-detector.js
 * @description Detects various browser and device capabilities for adaptive application behavior.
 * @version 1.1.0
 * @exports DeviceCapabilityDetector
 */

'use strict';

class DeviceCapabilityDetector {
    constructor(options = {}) {
        if (DeviceCapabilityDetector.instance) {
            return DeviceCapabilityDetector.instance;
        }

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || console,
            EventBus: window.EventBus,
            ...options.dependencies,
        };

        this.capabilities = {};
        this._detectAll();

        // Listen for online/offline changes for dynamic updates
        window.addEventListener('online', () => this._updateOnlineStatus(true));
        window.addEventListener('offline', () => this._updateOnlineStatus(false));

        DeviceCapabilityDetector.instance = this;
        this._log('info', 'Device Capability Detector Initialized.', this.capabilities);
    }

    /**
     * Runs all detection methods.
     * @private
     */
    _detectAll() {
        this.capabilities.userAgent = navigator.userAgent;
        this.capabilities.isTouchDevice = this._detectTouch();
        this.capabilities.isOnline = navigator.onLine;
        this.capabilities.cookiesEnabled = navigator.cookieEnabled;
        this.capabilities.localStorageSupported = this._detectLocalStorage();
        this.capabilities.sessionStorageSupported = this._detectSessionStorage();
        this.capabilities.serviceWorkerSupported = 'serviceWorker' in navigator;
        this.capabilities.webWorkerSupported = typeof Worker !== 'undefined';
        this.capabilities.dynamicImportSupported = this._detectDynamicImport();
        this.capabilities.broadcastChannelSupported = typeof BroadcastChannel !== 'undefined';
        this.capabilities.webGLSupported = this._detectWebGL();
        this.capabilities.gpuInfo = this._getGpuInfo(); // Basic GPU info attempt
        this.capabilities.connection = this._getConnectionInfo();
        this.capabilities.deviceMemory = navigator.deviceMemory || null; // GB, experimental
        this.capabilities.prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
        this.capabilities.screen = {
            width: window.screen?.width,
            height: window.screen?.height,
            availWidth: window.screen?.availWidth,
            availHeight: window.screen?.availHeight,
            colorDepth: window.screen?.colorDepth,
            pixelDepth: window.screen?.pixelDepth,
            orientation: window.screen?.orientation?.type,
        };
        this.capabilities.window = {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
        };

        // Initial broadcast of detected capabilities
        this.dependencies.EventBus?.publish('capabilities:detected', this.getAll());
    }

    _detectTouch() {
        return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
    }

    _detectLocalStorage() {
        try {
            const testKey = '__testLocalStorageSupport__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    _detectSessionStorage() {
        try {
            const testKey = '__testSessionStorageSupport__';
            sessionStorage.setItem(testKey, testKey);
            sessionStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    _detectDynamicImport() {
        try {
            // This is a bit tricky to detect perfectly without actually trying one.
            // Modern browsers supporting ES modules generally support dynamic import.
            // For a more robust check, one might try a very small dynamic import here.
            // For now, assume if Worker is present, dynamic import is likely.
            // Or, rely on browser feature detection for ES2020+.
            Function('async () => await import("")'); // Throws if syntax not supported
            return true;
        } catch (e) {
            return false;
        }
    }

    _detectWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    _getGpuInfo() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    return {
                        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
                    };
                }
            }
        } catch (e) {
            this._log('warn', 'Could not retrieve GPU info.', e);
        }
        return null;
    }

    _getConnectionInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            return {
                effectiveType: connection.effectiveType, // 'slow-2g', '2g', '3g', '4g'
                downlink: connection.downlink, // Mbps
                rtt: connection.rtt, // ms
                saveData: connection.saveData,
            };
        }
        return null;
    }

    _updateOnlineStatus(isOnline) {
        this.capabilities.isOnline = isOnline;
        this._log('info', `Network status changed: ${isOnline ? 'Online' : 'Offline'}`);
        this.dependencies.EventBus?.publish('network:statusChange', { isOnline });
    }

    /**
     * Gets a specific capability.
     * @param {string} key - The capability key (e.g., 'isTouchDevice').
     * @param {*} [defaultValue=undefined] - Value to return if capability not found.
     * @returns {*} The capability value or default.
     */
    get(key, defaultValue = undefined) {
        return this.capabilities.hasOwnProperty(key) ? this.capabilities[key] : defaultValue;
    }

    /**
     * Gets all detected capabilities.
     * @returns {object} A copy of the capabilities object.
     */
    getAll() {
        return { ...this.capabilities }; // Return a copy
    }

    /** Internal logging helper. */
    _log(level, message, data) {
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `DeviceCapabilityDetector: ${message}`;
        if (logger?.log) {
            logger.log(level, logMessage, data);
        } else {
            console[level]?.(logMessage, data);
        }
    }
}

// Instantiate and export the singleton service
const DeviceCapabilityDetectorInstance = new DeviceCapabilityDetector();

// Optional: Make it globally accessible
// window.DeviceCapabilityDetectorInstance = DeviceCapabilityDetectorInstance;

// Use this line if using ES modules
// export default DeviceCapabilityDetectorInstance;