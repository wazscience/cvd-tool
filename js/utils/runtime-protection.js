/**
 * Runtime Protection Module (Fused: Utilities & Security Monitoring)
 * @file /js/utils/runtime-protection.js
 * @description Provides static utility functions for robust coding and instance-based
 * runtime security monitoring.
 * @version 2.0.0
 * @exports RuntimeProtection (class for static methods)
 * @exports RuntimeProtectionInstance (singleton instance for monitoring)
 */

'use strict';

class RuntimeProtection {
    // --- Instance-based Monitoring Features ---

    /**
     * Creates an instance of RuntimeProtection for monitoring.
     * Typically used as a singleton via RuntimeProtectionInstance.
     * @param {object} [options={}] - Configuration for monitoring features.
     * @param {boolean} [options.enableDomMonitoring=true]
     * @param {boolean} [options.enableGlobalMonitoring=true]
     * @param {boolean} [options.enableFrameBusting=true]
     * @param {string[]} [options.domWatchSelectors=['body']]
     * @param {string[]} [options.domDangerousAttributes=['src', 'href', 'style', 'action', 'formaction', 'onclick', 'onerror', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'oninput', 'onabort', 'onbeforecopy', 'onbeforecut', 'onbeforepaste', 'oncopy', 'oncut', 'onpaste', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseup', 'onmousewheel', 'onscroll', 'oncontextmenu']]
     * @param {string[]} [options.allowedScriptSources=[window.location.origin]] - For basic script safety check.
     * @param {number} [options.globalCheckInterval=15000]
     * @param {object} [options.dependencies={}]
     */
    constructor(options = {}) {
        this.monitoringOptions = {
            enableDomMonitoring: true,
            enableGlobalMonitoring: true,
            enableFrameBusting: true,
            domWatchSelectors: ['body'],
            domDangerousAttributes: ['src', 'href', 'style', 'action', 'formaction', 'onclick', 'onerror', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'oninput', 'onabort', 'onbeforecopy', 'onbeforecut', 'onbeforepaste', 'oncopy', 'oncut', 'onpaste', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseup', 'onmousewheel', 'onscroll', 'oncontextmenu'],
            allowedScriptSources: [window.location.origin], // Add trusted CDNs here
            globalCheckInterval: 15000,
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger(),
            EventBus: window.EventBus, // Optional for future event publishing from monitoring
            ...options.dependencies,
        };

        this.initialGlobals = null;
        this.initialPrototypes = new Map(); // To store initial state of critical prototypes
        this.mutationObserver = null;
        this.isMonitoringInitialized = false;

        // Note: Static methods do not use 'this' and are called directly on the class.
    }

    _getFallbackLogger() {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`RuntimeProtection Fallback Logger [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => console[lvl]?.(`RuntimeProtection Fallback Logger [${lvl}]: ${msg}`, data) || console.log(`RuntimeProtection Fallback Logger [${lvl}]: ${msg}`, data)
        };
    }

    /**
     * Initializes the configured runtime security monitoring features.
     * This should be called on the instance (e.g., RuntimeProtectionInstance.startMonitoring()).
     */
    startMonitoring() {
        if (this.isMonitoringInitialized) {
            this.dependencies.ErrorLogger.log?.('warn', 'Runtime security monitoring already initialized.', 'RuntimeProtection-Monitor');
            return;
        }
        this.dependencies.ErrorLogger.log?.('info', 'Initializing runtime security monitoring...', 'RuntimeProtection-Monitor');

        if (this.monitoringOptions.enableFrameBusting) {
            this._setupFrameBusting();
        }
        if (this.monitoringOptions.enableGlobalMonitoring) {
            this._setupGlobalMonitoring();
        }
        if (this.monitoringOptions.enableDomMonitoring) {
            // Delay DOM monitoring slightly to allow initial app rendering
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                this._setupDomMonitoring();
            } else {
                document.addEventListener('DOMContentLoaded', () => this._setupDomMonitoring());
            }
        }
        this.isMonitoringInitialized = true;
        this.dependencies.ErrorLogger.log?.('info', 'Runtime security monitoring started.', 'RuntimeProtection-Monitor');
    }

    _setupFrameBusting() {
        try {
            if (window.top !== window.self) {
                this._reportSuspiciousActivity('Frame-Busting', 'Application loaded inside an iframe. Attempting to break out.', 'critical');
                // More aggressive: window.top.location = window.self.location; // This can fail due to cross-origin
                // Safer: Send message to top frame if possible, or redirect self
                // For now, primary defense is X-Frame-Options header. This JS is a backup detection.
                // Consider making the page blank or showing a warning.
                // document.body.innerHTML = '<div>This content cannot be displayed in a frame.</div>';
            }
        } catch (e) {
             this._reportSuspiciousActivity('Frame-Busting', 'Cross-origin iframe detected. Cannot break out.', 'critical', { error: e.message });
        }
    }

    _setupDomMonitoring() {
        if (!window.MutationObserver) {
            this.dependencies.ErrorLogger.log?.('warn', 'MutationObserver not supported. DOM Monitoring disabled.', 'RuntimeProtection-DOM');
            return;
        }

        this.mutationObserver = new MutationObserver(this._handleMutations.bind(this));
        const config = {
            childList: true,
            attributes: true,
            subtree: true,
            attributeOldValue: true, // For comparing old and new values
            // Consider characterData: true if inline script content changes are a concern (can be noisy)
            attributeFilter: this.monitoringOptions.domDangerousAttributes
        };

        this.monitoringOptions.domWatchSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                this.mutationObserver.observe(element, config);
                this.dependencies.ErrorLogger.log?.('info', `DOM Monitoring started for: ${selector}`, 'RuntimeProtection-DOM');
            } else {
                this.dependencies.ErrorLogger.log?.('warn', `DOM Monitoring: Selector "${selector}" not found.`, 'RuntimeProtection-DOM');
            }
        });
    }

    _handleMutations(mutationsList) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeName === 'SCRIPT') {
                        if (!this._isScriptSafe(node)) {
                            this._reportSuspiciousActivity('DOM-Injection', `Potentially unauthorized script tag added: ${node.src || 'inline script content'}`);
                        }
                    } else if (node.nodeName === 'IFRAME' || node.nodeName === 'OBJECT' || node.nodeName === 'EMBED') {
                         this._reportSuspiciousActivity('DOM-Injection', `Potentially dangerous tag <${node.nodeName}> added.`);
                    }
                });
            } else if (mutation.type === 'attributes') {
                const target = mutation.target;
                const attrName = mutation.attributeName;
                const newValue = target.getAttribute(attrName);

                if (attrName.toLowerCase().startsWith('on')) { // e.g. onclick, onerror
                    this._reportSuspiciousActivity('DOM-AttrManipulation', `Event handler attribute "${attrName}" modified on <${target.tagName}>.`);
                } else if (['href', 'src', 'action', 'formaction'].includes(attrName.toLowerCase())) {
                    if (newValue && (newValue.toLowerCase().startsWith('javascript:') || newValue.toLowerCase().startsWith('data:'))) {
                        this._reportSuspiciousActivity('DOM-AttrManipulation', `Potentially malicious URL in "${attrName}" attribute on <${target.tagName}>: ${newValue.substring(0,50)}...`);
                    }
                } else if (attrName.toLowerCase() === 'style' && newValue && (newValue.includes('url(') || newValue.includes('expression('))) {
                     this._reportSuspiciousActivity('DOM-AttrManipulation', `Suspicious 'style' attribute modification on <${target.tagName}>.`);
                }
            }
        }
    }

    _isScriptSafe(scriptNode) {
        const src = scriptNode.src;
        if (scriptNode.hasAttribute('integrity')) { // SRI hash present
            return true;
        }
        if (!src) { // Inline script added dynamically
            this.dependencies.ErrorLogger.log?.('warn', 'Dynamically added inline script detected.', 'RuntimeProtection-DOM-ScriptCheck', { contentSample: scriptNode.textContent?.substring(0,100) });
            return false; // Generally consider dynamically added inline scripts as higher risk unless nonce is used
        }
        try {
            const url = new URL(src);
            return this.monitoringOptions.allowedScriptSources.includes(url.origin);
        } catch (e) {
            this._reportSuspiciousActivity('DOM-ScriptCheck', `Script with invalid src: ${src}`);
            return false;
        }
    }

    _setupGlobalMonitoring() {
        this.initialGlobals = new Set(Object.getOwnPropertyNames(window));

        // Basic prototype check - more sophisticated checks are complex and can have performance hits
        this._storeInitialPrototype(Object.prototype, 'Object.prototype');
        this._storeInitialPrototype(Array.prototype, 'Array.prototype');
        this._storeInitialPrototype(String.prototype, 'String.prototype');
        // Add more as needed

        setInterval(() => this._checkGlobalsAndPrototypes(), this.monitoringOptions.globalCheckInterval);
        this.dependencies.ErrorLogger.log?.('info', `Global/Prototype Monitoring started. Interval: ${this.monitoringOptions.globalCheckInterval}ms`, 'RuntimeProtection-Global');
    }

     _storeInitialPrototype(proto, name) {
        if (proto && typeof proto === 'object') {
            this.initialPrototypes.set(name, new Set(Object.getOwnPropertyNames(proto)));
        }
    }

    _checkGlobalsAndPrototypes() {
        // Check for new globals
        const currentGlobals = new Set(Object.getOwnPropertyNames(window));
        currentGlobals.forEach(key => {
            if (!this.initialGlobals.has(key)) {
                this._reportSuspiciousActivity('Global-Pollution', `New global variable detected: window.${key}`);
                this.initialGlobals.add(key); // Add to baseline to avoid repeated reports for same new global
            }
        });

        // Check critical prototypes
        this._checkPrototype(Object.prototype, 'Object.prototype');
        this._checkPrototype(Array.prototype, 'Array.prototype');
        this._checkPrototype(String.prototype, 'String.prototype');
    }

    _checkPrototype(proto, protoName) {
        if (!proto || typeof proto !== 'object') return;
        const initialProps = this.initialPrototypes.get(protoName);
        if (!initialProps) return;

        const currentProps = new Set(Object.getOwnPropertyNames(proto));
        currentProps.forEach(key => {
            if (!initialProps.has(key)) {
                this._reportSuspiciousActivity('Prototype-Pollution', `${protoName} polluted with new property: ${key}`);
                initialProps.add(key); // Update baseline
            }
        });
    }


    _reportSuspiciousActivity(type, message, severity = 'warn', additionalData = {}) {
         this.dependencies.ErrorLogger.handleError?.(
             message,
             `RuntimeProtection-${type}`,
             severity,
             { activityType: type, ...additionalData }
         );
    }


    // --- Static Utility Methods (as per PDF and main.js/ui.js usage) ---

    static tryCatch(fn, errorHandler) { /* ... from v1.0.0, ensure logger is accessible ... */
        const logger = (RuntimeProtection.instance?.dependencies?.ErrorLogger) || (window.ErrorDetectionSystemInstance || { handleError: console.error });
        try { return fn(); }
        catch (error) {
            logger.handleError?.(`RuntimeProtection.tryCatch caught: ${error.message}`, 'RuntimeProtection-tryCatch', 'error', { originalError: error });
            if (typeof errorHandler === 'function') return errorHandler(error);
            return null;
        }
    }

    static debounce(fn, delay = 300) { /* ... from v1.0.0 ... */
        let timeoutId;
        return function(...args) { const context = this; clearTimeout(timeoutId); timeoutId = setTimeout(() => fn.apply(context, args), delay); };
    }

    static throttle(fn, delay = 300) { /* ... from v1.0.0 ... */
        let lastCallTime = 0; let timeoutId = null; let lastArgs = null; let lastThis = null;
        return function(...args) {
            const now = Date.now(); lastArgs = args; lastThis = this;
            if (now - lastCallTime >= delay) { lastCallTime = now; fn.apply(lastThis, lastArgs); if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
            } else if (!timeoutId) { timeoutId = setTimeout(() => { lastCallTime = Date.now(); timeoutId = null; fn.apply(lastThis, lastArgs); }, delay - (now - lastCallTime));}
        };
    }

    static safeParseJSON(jsonString, fallback = {}) { /* ... from v1.0.0, ensure logger ... */
        const logger = (RuntimeProtection.instance?.dependencies?.ErrorLogger) || (window.ErrorDetectionSystemInstance || { log: console.warn });
        if (typeof jsonString !== 'string' || !jsonString) return fallback;
        try { return JSON.parse(jsonString); }
        catch (error) { logger.log?.('warn', `safeParseJSON failed: ${error.message}`, { originalString: jsonString.substring(0,100), error }); return fallback; }
    }

    static safeStringifyJSON(value, fallback = '{}') { /* ... from v1.0.0, ensure logger ... */
        const logger = (RuntimeProtection.instance?.dependencies?.ErrorLogger) || (window.ErrorDetectionSystemInstance || { log: console.warn });
        try { return JSON.stringify(value); }
        catch (error) { logger.log?.('warn', `safeStringifyJSON failed: ${error.message}`, { originalValueType: typeof value, error }); return fallback; }
    }

    static safeGet(obj, path, fallback = undefined) { /* ... from v1.0.0 ... */
        if (typeof obj !== 'object' || obj === null || typeof path !== 'string') return fallback;
        const keys = path.split('.'); let current = obj;
        for (const key of keys) { if (typeof current !== 'object' || current === null || !current.hasOwnProperty(key)) return fallback; current = current[key]; }
        return current !== undefined ? current : fallback;
    }

    static safeFunction(fn, fallbackValue = null) { /* ... from v1.0.0, ensure logger ... */
        const logger = (RuntimeProtection.instance?.dependencies?.ErrorLogger) || (window.ErrorDetectionSystemInstance || { handleError: console.error });
        return function(...args) {
            try { return fn.apply(this, args); }
            catch (error) { logger.handleError?.(`Error in safeFunction execution: ${error.message}`, 'RuntimeProtection-safeFunction', 'error', { originalError: error, functionName: fn.name }); return fallbackValue; }
        };
    }

    static async retry(asyncFn, options = {}) { /* ... from v1.0.0, ensure logger ... */
        const config = { retries: 3, delay: 500, backoffFactor: 2, onRetry: null, ...options, };
        const logger = (RuntimeProtection.instance?.dependencies?.ErrorLogger) || (window.ErrorDetectionSystemInstance || { log: console.warn, handleError: console.error });
        let lastError;
        for (let attempt = 0; attempt <= config.retries; attempt++) {
            try { return await asyncFn(); }
            catch (error) {
                lastError = error;
                logger.log?.('warn', `Retry attempt ${attempt + 1} for ${asyncFn.name || 'anonymous'}. Error: ${error.message}`);
                if (attempt < config.retries) {
                    const delayForNextAttempt = config.delay * Math.pow(config.backoffFactor, attempt);
                    if (typeof config.onRetry === 'function') { try { config.onRetry(error, attempt + 1, delayForNextAttempt); } catch (e) { logger.handleError?.(`Error in onRetry: ${e.message}`, 'RP-retry', 'error');}}
                    await new Promise(resolve => setTimeout(resolve, delayForNextAttempt));
                }
            }
        }
        logger.handleError?.(`All retries failed for ${asyncFn.name || 'anonymous'}. Last error: ${lastError.message}`, 'RP-retry', 'error', { finalError: lastError });
        throw lastError;
    }
}

// Create a singleton instance for monitoring features, and make it globally available.
// The class itself is also available for its static methods.
const RuntimeProtectionInstance = new RuntimeProtection();
window.RuntimeProtectionInstance = RuntimeProtectionInstance; // For modules to access monitoring
window.RuntimeProtection = RuntimeProtection; // For static utility method access

// Optional: For ES module systems that prefer named exports for instances
// export const RuntimeProtectionSingleton = RuntimeProtectionInstance;
// export default RuntimeProtection; // Export the class for static methods