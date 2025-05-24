/**
 * Loading Manager Module (Enhanced)
 * @file /js/utils/loading-manager.js
 * @description Manages a global loading overlay with a request counter, async helper,
 * ARIA support, safety timeout, and dynamic element creation.
 * @version 1.2.0
 * @exports LoadingManager
 */

'use strict';

class LoadingManager {
    /**
     * Creates or returns the singleton instance of LoadingManager.
     * @param {object} [options={}] - Configuration options.
     * @param {string} [options.overlayId='loading-overlay'] - ID of the overlay element.
     * @param {string} [options.messageId='loading-message'] - ID of the message element.
     * @param {string} [options.activeClass='show'] - CSS class for active state.
     * @param {number} [options.safetyTimeout=30000] - Auto-hide & log error after X ms (0 to disable).
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (LoadingManager.instance) {
            return LoadingManager.instance;
        }

        this.overlayId = options.overlayId || 'loading-overlay';
        this.messageId = options.messageId || 'loading-message';
        this.activeClass = options.activeClass || 'show';
        this.safetyTimeoutDuration = options.safetyTimeout || 30000; // 30 seconds
        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || console,
            EventBus: window.EventBus,
            ...options.dependencies,
        };

        this.loadingOverlay = null; // Will be set in _ensureElements
        this.loadingMessage = null; // Will be set in _ensureElements
        this.requestCount = 0;
        this.safetyTimeoutId = null;

        this._ensureElements(); // Ensure DOM elements exist or create them.

        LoadingManager.instance = this;
        this._log('info', 'Loading Manager Initialized (v1.2.0).');
    }

    /**
     * Ensures the overlay and message elements exist, creating them if necessary.
     * @private
     */
    _ensureElements() {
        this.loadingOverlay = document.getElementById(this.overlayId);
        if (!this.loadingOverlay) {
            this._log('warn', `Overlay #${this.overlayId} not found, creating dynamically.`);
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.id = this.overlayId;
            this.loadingOverlay.className = 'loading-overlay'; // Add base class
            this.loadingOverlay.setAttribute('role', 'status');
            this.loadingOverlay.setAttribute('aria-live', 'assertive');
            this.loadingOverlay.setAttribute('aria-atomic', 'true');
            this.loadingOverlay.setAttribute('aria-hidden', 'true'); // Start hidden
            this.loadingOverlay.style.display = 'none'; // Ensure hidden initially

            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner'; // Needs CSS
            this.loadingOverlay.appendChild(spinner);

            this.loadingMessage = document.createElement('p');
            this.loadingMessage.id = this.messageId;
            this.loadingMessage.className = 'loading-message';
            this.loadingOverlay.appendChild(this.loadingMessage);

            document.body.appendChild(this.loadingOverlay);
        } else {
             this.loadingMessage = document.getElementById(this.messageId);
             if (!this.loadingMessage) {
                 this._log('warn', `Message #${this.messageId} not found within existing overlay.`);
             }
        }
    }

    /**
     * Shows the loading overlay.
     * @param {string} [message='Loading...'] - The message to display.
     */
    show(message = 'Loading...') {
        if (!this.loadingOverlay) return;

        this.requestCount++;
        this._log('debug', `Show request. Count: ${this.requestCount}. Message: ${message}`);

        // Only start overlay/timeout on the first request
        if (this.requestCount === 1) {
            if (this.loadingMessage) {
                this.loadingMessage.textContent = message;
            }
            this.loadingOverlay.style.display = ''; // Make it block/flex via CSS
            this.loadingOverlay.classList.add(this.activeClass);
            this.loadingOverlay.setAttribute('aria-hidden', 'false');

            this.dependencies.EventBus?.publish('loading:started', { message, count: this.requestCount });
            this._log('info', 'Loading overlay shown.');

            // Start safety timeout if enabled
            if (this.safetyTimeoutDuration > 0) {
                clearTimeout(this.safetyTimeoutId); // Clear any previous (shouldn't happen)
                this.safetyTimeoutId = setTimeout(() => {
                    this._log('error', `Safety timeout triggered! Overlay was showing for over ${this.safetyTimeoutDuration}ms. Forcing hide.`);
                    this.dependencies.ErrorLogger?.handleError(
                        'Loading overlay safety timeout reached.',
                        'LoadingManager',
                        'error',
                        { duration: this.safetyTimeoutDuration }
                    );
                    this.hide(true); // Force hide
                }, this.safetyTimeoutDuration);
            }
        } else if (this.loadingMessage) {
            // Update message on subsequent calls if needed
             this.loadingMessage.textContent = message;
        }
    }

    /**
     * Hides the loading overlay.
     * @param {boolean} [force=false] - If true, hides regardless of count.
     */
    hide(force = false) {
        if (!this.loadingOverlay) return;

        if (force) {
            if (this.requestCount > 0) {
                 this._log('warn', 'Forcing hide. Resetting count to 0.');
                 this.requestCount = 0;
            }
        } else {
             if (this.requestCount > 0) {
                 this.requestCount--;
             } else {
                  this._log('warn', 'Hide called when count is already 0.');
                  return;
             }
        }

        this._log('debug', `Hide request. Count: ${this.requestCount}.`);

        // Only hide and clear timeout when count reaches zero
        if (this.requestCount === 0) {
            this.loadingOverlay.classList.remove(this.activeClass);
            this.loadingOverlay.setAttribute('aria-hidden', 'true');
            // Allow CSS transition before setting display none (optional)
            // setTimeout(() => { this.loadingOverlay.style.display = 'none'; }, 300);

            clearTimeout(this.safetyTimeoutId); // Clear safety timeout
            this.safetyTimeoutId = null;

            this.dependencies.EventBus?.publish('loading:stopped', { count: this.requestCount });
            this._log('info', 'Loading overlay hidden.');
        }
    }

    /**
     * A helper function for cleaner integration with async code.
     * It wraps an async function/Promise, automatically showing the loading
     * indicator before it runs and hiding it afterwards, even if errors occur.
     *
     * @param {Function} asyncFunction - The async function or function returning a Promise to execute.
     * @param {string} [message='Processing...'] - Message to display during execution.
     * @returns {Promise<any>} A promise that resolves/rejects with the result of asyncFunction.
     *
     * @example
     * await LoadingManager.withLoading(
     * async () => { await fetchApiData(); },
     * 'Fetching data...'
     * );
     */
    async withLoading(asyncFunction, message = 'Processing...') {
        this.show(message);
        try {
            const result = await asyncFunction();
            return result;
        } catch (error) {
            this._log('error', `Error during withLoading execution: ${error.message}`, error);
            // Re-throw the error so the calling code can handle it
            throw error;
        } finally {
            this.hide();
        }
    }

    /** Checks if the loading overlay is currently active. */
    isShowing() {
        return this.requestCount > 0;
    }

    /** Internal logging helper. */
    _log(level, message, data) {
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `LoadingManager: ${message}`;
        if (level === 'error' && logger?.handleError) {
             logger.handleError(data || message, 'LoadingManager', 'error', data ? { msg: message } : {});
        } else if (logger?.log) {
            logger.log(level, logMessage, data);
        } else {
            console[level]?.(logMessage, data);
        }
    }
}

// Instantiate and export the singleton service
const LoadingManagerInstance = new LoadingManager();

// Optional: Make it globally accessible
// window.LoadingManagerInstance = LoadingManagerInstance;

// Use this line if using ES modules
// export default LoadingManagerInstance;