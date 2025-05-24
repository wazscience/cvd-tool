/**
 * Dynamic ES Module Loader (Prefetch & Retry)
 * @file /js/utils/module-loader.js
 * @description Provides a robust service for loading JavaScript ES modules
 * dynamically, featuring prefetching and retry logic.
 * @version 1.3.0
 * @exports ModuleLoader
 */

'use strict';

class ModuleLoader {
    /**
     * Creates or returns the singleton instance of ModuleLoader.
     * @param {object} [options={}] - Configuration options.
     * @param {string} [options.basePath='./'] - Base path prefix.
     * @param {number} [options.maxRetries=1] - How many times to retry a failed import.
     * @param {number} [options.retryDelay=500] - Delay (ms) between retries.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (ModuleLoader.instance) {
            return ModuleLoader.instance;
        }

        this.basePath = options.basePath || './';
        if (this.basePath !== './' && !this.basePath.endsWith('/')) {
            this.basePath += '/';
        }
        this.maxRetries = options.maxRetries || 1;
        this.retryDelay = options.retryDelay || 500;

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || console,
            EventBus: window.EventBus,
            ...options.dependencies,
        };

        this.loadedModules = new Map();
        this.loadingPromises = new Map();
        this.prefetchedLinks = new Set();

        ModuleLoader.instance = this;
        this._log('info', 'Module Loader Initialized (v1.3.0 - Prefetch & Retry).');
    }

    /** Resolves the module path. */
    _resolvePath(modulePath) {
        return (modulePath.startsWith('./') || modulePath.startsWith('/'))
            ? modulePath
            : this.basePath + modulePath;
    }

    /** Internal logging helper. */
    _log(level, message, data) {
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `ModuleLoader: ${message}`;
        if (level === 'error' && logger?.handleError) {
             logger.handleError(data || message, 'ModuleLoader', 'error', data ? { msg: message } : {});
        } else if (logger?.log) {
            logger.log(level, logMessage, data);
        } else {
            console[level]?.(logMessage, data);
        }
    }

    /**
     * Loads a module with retry logic.
     * @param {string} modulePath - Path to the module.
     * @param {string} [moduleName='Unknown'] - Friendly name for logging.
     * @returns {Promise<any>} Promise resolving with the module.
     */
    async loadModule(modulePath, moduleName = 'Unknown') {
        const fullPath = this._resolvePath(modulePath);

        if (this.loadedModules.has(fullPath)) {
            return this.loadedModules.get(fullPath);
        }
        if (this.loadingPromises.has(fullPath)) {
            return this.loadingPromises.get(fullPath);
        }

        const loadPromise = this._attemptLoadWithRetries(fullPath, moduleName);
        this.loadingPromises.set(fullPath, loadPromise);

        try {
            const module = await loadPromise;
            this.loadedModules.set(fullPath, module);
            this.loadingPromises.delete(fullPath);
            return module;
        } catch (error) {
            this.loadingPromises.delete(fullPath);
            throw error; // Re-throw so the caller can handle it
        }
    }

    /**
     * Internal function to handle the loading attempts and retries.
     * @param {string} fullPath - The full path to the module.
     * @param {string} moduleName - Friendly name.
     * @param {number} [attempt=0] - Current attempt number.
     * @returns {Promise<any>}
     * @private
     */
    async _attemptLoadWithRetries(fullPath, moduleName, attempt = 0) {
        this._log('info', `Loading module "${moduleName}" (Attempt ${attempt + 1})...`);
        this.dependencies.EventBus?.publish('module:loading', { path: fullPath, name: moduleName, attempt: attempt + 1 });

        try {
            const module = await import(fullPath);
            this._log('info', `Module "${moduleName}" (${fullPath}) loaded successfully.`);
            this.dependencies.EventBus?.publish('module:loaded', { path: fullPath, name: moduleName, module });
            return module;
        } catch (error) {
            this._log('warn', `Attempt ${attempt + 1} failed for module "${moduleName}":`, error);

            if (attempt < this.maxRetries) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this._attemptLoadWithRetries(fullPath, moduleName, attempt + 1);
            } else {
                this._log('error', `Failed to load module "${moduleName}" after ${this.maxRetries + 1} attempts.`, error);
                this.dependencies.EventBus?.publish('module:loadFailed', { path: fullPath, name: moduleName, error });
                this.dependencies.ErrorLogger?.handleError(
                    `Failed to load module: ${moduleName} (${fullPath})`,
                    'ModuleLoader', 'critical', { originalError: error }
                );
                throw error; // Throw the final error
            }
        }
    }

    /**
     * Hints to the browser that a module might be needed soon by adding a
     * <link rel="prefetch"> tag to the document head. Does nothing if already prefetched.
     * This is useful for performance optimization.
     * @param {string} modulePath - The path to the module to prefetch.
     */
    prefetchModule(modulePath) {
        const fullPath = this._resolvePath(modulePath);

        if (this.loadedModules.has(fullPath) || this.prefetchedLinks.has(fullPath)) {
            this._log('debug', `Skipping prefetch for ${fullPath} (already loaded or prefetched).`);
            return;
        }

        try {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = fullPath;
            link.as = 'script'; // Hint that it's a script
            link.crossOrigin = "anonymous"; // Or 'use-credentials' if needed

            document.head.appendChild(link);
            this.prefetchedLinks.add(fullPath);
            this._log('info', `Prefetch hint added for: ${fullPath}`);
            this.dependencies.EventBus?.publish('module:prefetched', { path: fullPath });

        } catch (error) {
             this._log('error', `Failed to add prefetch link for ${fullPath}:`, error);
        }
    }


    /** Checks if a module is loaded. */
    isLoaded(modulePath) {
        return this.loadedModules.has(this._resolvePath(modulePath));
    }
}

// Instantiate and export the singleton service
const ModuleLoaderInstance = new ModuleLoader({ maxRetries: 2, retryDelay: 1000 });

// Optional: Make it globally accessible
// window.ModuleLoaderInstance = ModuleLoaderInstance;

// Use this line if using ES modules
// export default ModuleLoaderInstance;