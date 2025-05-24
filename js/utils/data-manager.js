/**
 * Data Manager Service for CVD Risk Toolkit (Enhanced)
 * @file /js/utils/data-manager.js
 * @description Handles application data storage (localStorage with encryption, sessionStorage),
 * and JSON import/export. Integrates with CryptoService and other core utilities.
 * Fuses user's DataManager v2.0.1 [cite: uploaded:data-manager.js] with service architecture.
 * @version 2.1.0
 * @exports DataManagerService
 */

'use strict';

class DataManagerService {
    /**
     * Creates or returns the singleton instance of DataManagerService.
     * @param {object} [options={}] - Configuration options.
     * @param {string} [options.localStoragePrefix='cvd_toolkit_']
     * @param {string} [options.sessionStoragePrefix='cvd_session_']
     * @param {boolean} [options.defaultEncryptionEnabled=true]
     * @param {object} [options.dependencies={}] - Injected dependencies.
     * Expected: ErrorLogger, EventBus, CryptoService, LoadingManager, InputSanitizerService.
     */
    constructor(options = {}) {
        if (DataManagerService.instance) {
            return DataManagerService.instance;
        }

        this.options = {
            localStoragePrefix: 'cvd_toolkit_data_', // More specific prefix
            sessionStoragePrefix: 'cvd_toolkit_session_',
            defaultEncryptionEnabled: true, // Enable encryption by default if crypto is available
            debugMode: false,
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || { handleError: console.error, log: console.log },
            EventBus: window.EventBus || { publish: () => {}, subscribe: () => {} },
            CryptoService: window.CryptoService,
            LoadingManager: window.LoadingManagerInstance || { show: () => {}, hide: () => {} },
            InputSanitizer: window.InputSanitizerService,
            ...options.dependencies,
        };

        this.initialized = false;
        this.storageAvailable = this._checkStorageAvailability('localStorage');
        this.sessionStorageAvailable = this._checkStorageAvailability('sessionStorage');
        this.exportInProgress = false;
        this.encryptionKey = null; // Will be a CryptoKey object
        this.encryptionEnabled = false; // Determined during init based on crypto support and options

        // Initialize asynchronously
        this.initPromise = this._initialize();

        DataManagerService.instance = this;
    }

    async _initialize() {
        try {
            this._log('info', 'DataManagerService Initializing (v2.1.0)...');
            this._setupEventListeners(); // For preferences or external triggers

            if (this.dependencies.CryptoService?.isSupported) {
                this.encryptionEnabled = this.options.defaultEncryptionEnabled;
                if (this.encryptionEnabled) {
                    // Attempt to load or generate the master encryption key
                    // For this example, we'll use a session-bound key or one derived if a mechanism existed
                    // Your original code generated one and stored in sessionStorage if not found.
                    // We'll use CryptoService to generate it.
                    // A more robust approach might involve user-derived keys via SecureStorage key management.
                    const keyLabel = `${this.options.localStoragePrefix}masterKeyHandle`; // Not storing raw key
                    // This is conceptual: in a real app, key might be derived or come from SecureStorage
                    // For now, we generate for the session if not "loaded" (which we won't do here for simplicity)
                    this.encryptionKey = await this.dependencies.CryptoService.generateAesGcmKey(false); // Non-extractable by default
                    if (this.encryptionKey) {
                        this._log('info', 'Encryption key initialized for DataManager.');
                    } else {
                        this._log('warn', 'Failed to initialize encryption key. Encryption will be disabled.');
                        this.encryptionEnabled = false;
                    }
                }
            } else {
                this.encryptionEnabled = false;
                this._log('warn', 'CryptoService not supported. DataManager encryption disabled.');
            }

            this.initialized = true;
            this.dependencies.EventBus.publish('dataManager:initialized', {
                success: true,
                storageAvailable: this.storageAvailable,
                encryptionEnabled: this.encryptionEnabled
            });
            this._log('info', `DataManagerService initialized. Storage: ${this.storageAvailable}, Encryption: ${this.encryptionEnabled}`);

        } catch (error) {
            this._handleError(error, 'Initialization');
            this.dependencies.EventBus.publish('dataManager:initialized', { success: false, error: error.message });
        }
    }

    _log(level, message, data) {
        this.dependencies.ErrorLogger.log?.(level, `DataManager: ${message}`, data);
    }
    _handleError(error, context, isUserFacing = true, additionalData = {}) {
        const msg = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(msg, `DataManager-${context}`, 'error', { originalError: error, ...additionalData });
        if (isUserFacing) this.dependencies.EventBus.publish('ui:showToast', { message: `Data Error (${context}): ${msg}`, type: 'error' });
    }

    _checkStorageAvailability(type = 'localStorage') {
        try {
            const storage = window[type];
            const testKey = `__${type}StorageTest__`;
            storage.setItem(testKey, testKey);
            const result = storage.getItem(testKey) === testKey;
            storage.removeItem(testKey);
            return result;
        } catch (e) {
            this._log('warn', `${type} is not available.`, e);
            return false;
        }
    }

    _setupEventListeners() {
        this.dependencies.EventBus.subscribe('preferences:updated', (payload) => {
            if (payload?.preferences?.dataManager) {
                this._handlePreferencesUpdate(payload.preferences.dataManager);
            }
        });
        // UI event listeners for import/export buttons should be in AppUI,
        // which then calls DataManagerService methods.
    }

    async _handlePreferencesUpdate(prefs) {
        if (prefs.debugMode !== undefined) this.options.debugMode = Boolean(prefs.debugMode);
        if (prefs.encryptionEnabled !== undefined && this.dependencies.CryptoService?.isSupported) {
            const newEncryptionState = Boolean(prefs.encryptionEnabled);
            if (newEncryptionState !== this.encryptionEnabled) {
                this._log('info', `Encryption preference changed to: ${newEncryptionState}. Re-processing stored data.`);
                this.dependencies.LoadingManager.show('Updating data encryption...');
                if (!this.encryptionKey) { // Ensure key exists if enabling
                    this.encryptionKey = await this.dependencies.CryptoService.generateAesGcmKey(false);
                }
                if (newEncryptionState && !this.encryptionKey) {
                    this._log('error', "Cannot enable encryption: failed to obtain encryption key.");
                    this.dependencies.LoadingManager.hide();
                    return;
                }
                this.encryptionEnabled = newEncryptionState; // Set state first
                await this._reprocessAllLocalStorageItems(newEncryptionState); // Pass target state
                this.dependencies.LoadingManager.hide();
                this._showToast(`Data encryption settings updated.`, 'info');
            }
        }
    }

    async _reprocessAllLocalStorageItems(shouldBeEncrypted) {
        if (!this.storageAvailable) return;
        const keysToReprocess = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.options.localStoragePrefix)) {
                keysToReprocess.push(key.substring(this.options.localStoragePrefix.length));
            }
        }
        for (const shortKey of keysToReprocess) {
            const currentValue = await this.getItem(shortKey, null, true); // Get raw, bypass current encryption state
            if (currentValue !== null) { // If it exists and was retrievable
                await this.setItem(shortKey, currentValue); // setItem will apply the new encryption state
            }
        }
        this._log('info', `Reprocessed ${keysToReprocess.length} items for new encryption state: ${shouldBeEncrypted}`);
    }


    _sanitizeKey(key) {
        if (typeof key !== 'string') key = String(key);
        // Basic sanitization, InputSanitizerService could offer more advanced rules if needed
        return key.replace(/[^a-zA-Z0-9_.\-]/g, '_');
    }

    /**
     * Stores an item in localStorage, encrypting if enabled.
     * @param {string} key - The storage key.
     * @param {*} value - The value to store (will be JSON.stringified).
     * @returns {Promise<boolean>} True if successful.
     */
    async setItem(key, value) {
        await this.initPromise; // Ensure init is complete
        if (!this.storageAvailable) { this._log('warn', 'localStorage not available, cannot set item.'); return false; }

        const safeKey = this._sanitizeKey(key);
        const fullKey = this.options.localStoragePrefix + safeKey;
        const S = this.dependencies.InputSanitizer;

        try {
            // Sanitize before stringifying if it's an object/array
            const valueToStore = (typeof value === 'object' && value !== null) ? S.sanitizeObjectOrArray(value) : value;
            const valueStr = JSON.stringify(valueToStore);

            if (this.encryptionEnabled && this.encryptionKey) {
                const { ciphertextBase64, ivBase64 } = await this.dependencies.CryptoService.encryptStringToBase64(valueStr, this.encryptionKey);
                const encryptedPayload = JSON.stringify({ _enc: true, iv: ivBase64, ct: ciphertextBase64, ts: Date.now() });
                localStorage.setItem(fullKey, encryptedPayload);
            } else {
                localStorage.setItem(fullKey, JSON.stringify({ _enc: false, data: valueStr, ts: Date.now() }));
            }
            this.dependencies.EventBus.publish('dataManager:itemSet', { key: safeKey, storage: 'local' });
            return true;
        } catch (error) {
            this._handleError(error, `SetItem-${safeKey}`);
            return false;
        }
    }

    /**
     * Retrieves an item from localStorage, decrypting if necessary.
     * @param {string} key - The storage key.
     * @param {*} [defaultValue=null] - Value if item not found/decryption fails.
     * @param {boolean} [bypassDecryptionForReprocess=false] - Internal flag for re-keying.
     * @returns {Promise<any>} The retrieved value.
     */
    async getItem(key, defaultValue = null, bypassDecryptionForReprocess = false) {
        await this.initPromise;
        if (!this.storageAvailable) { this._log('warn', 'localStorage not available, cannot get item.'); return defaultValue; }

        const safeKey = this._sanitizeKey(key);
        const fullKey = this.options.localStoragePrefix + safeKey;

        try {
            const rawValue = localStorage.getItem(fullKey);
            if (rawValue === null) return defaultValue;

            const storedObject = JSON.parse(rawValue);

            if (storedObject._enc === true) {
                if (bypassDecryptionForReprocess) return JSON.parse(storedObject.data); // This assumes data was stored unencrypted if _enc was false
                if (!this.encryptionEnabled || !this.encryptionKey) {
                    this._log('warn', `Item "${safeKey}" is encrypted, but encryption is disabled or key missing. Cannot decrypt.`);
                    return defaultValue; // Or throw error
                }
                const decryptedJson = await this.dependencies.CryptoService.decryptBase64ToString(storedObject.ct, this.encryptionKey, storedObject.iv);
                this.dependencies.EventBus.publish('dataManager:itemRetrieved', { key: safeKey, storage: 'local', encrypted: true });
                return JSON.parse(decryptedJson);
            } else { // Not encrypted or _enc flag missing (older format)
                this.dependencies.EventBus.publish('dataManager:itemRetrieved', { key: safeKey, storage: 'local', encrypted: false });
                return storedObject.data !== undefined ? JSON.parse(storedObject.data) : JSON.parse(rawValue); // Fallback for very old format
            }
        } catch (error) {
            this._handleError(error, `GetItem-${safeKey}`);
            return defaultValue;
        }
    }

    removeItem(key) { /* ... (similar to user's, use this.options.localStoragePrefix) ... */
        if (!this.storageAvailable) return false;
        const fullKey = this.options.localStoragePrefix + this._sanitizeKey(key);
        try { localStorage.removeItem(fullKey); this.dependencies.EventBus.publish('dataManager:itemRemoved', {key, storage:'local'}); return true; }
        catch(e){ this._handleError(e, `RemoveItem-${key}`); return false; }
    }

    setSessionItem(key, value) { /* ... (similar to user's, use this.options.sessionStoragePrefix, no encryption for session by default) ... */
        if (!this.sessionStorageAvailable) { this._log('warn', 'sessionStorage not available.'); return false; }
        const fullKey = this.options.sessionStoragePrefix + this._sanitizeKey(key);
        try { sessionStorage.setItem(fullKey, JSON.stringify(value)); this.dependencies.EventBus.publish('dataManager:itemSet', {key, storage:'session'}); return true; }
        catch(e){ this._handleError(e, `SetSessionItem-${key}`); return false; }
    }
    getSessionItem(key, defaultValue = null) { /* ... (similar to user's) ... */
        if (!this.sessionStorageAvailable) return defaultValue;
        const fullKey = this.options.sessionStoragePrefix + this._sanitizeKey(key);
        try { const val = sessionStorage.getItem(fullKey); if(val === null) return defaultValue; this.dependencies.EventBus.publish('dataManager:itemRetrieved', {key, storage:'session'}); return JSON.parse(val); }
        catch(e){ this._handleError(e, `GetSessionItem-${key}`, false); return defaultValue; /* Don't show UI toast for simple get errors */ }
    }
    removeSessionItem(key) { /* ... (similar to user's) ... */
        if (!this.sessionStorageAvailable) return false;
        const fullKey = this.options.sessionStoragePrefix + this._sanitizeKey(key);
        try { sessionStorage.removeItem(fullKey); this.dependencies.EventBus.publish('dataManager:itemRemoved', {key, storage:'session'}); return true; }
        catch(e){ this._handleError(e, `RemoveSessionItem-${key}`); return false; }
    }

    /**
     * Exports all managed data (localStorage with prefix) to a JSON file.
     * Data is decrypted before export if encryption was enabled.
     */
    async exportData(filenamePrefix = 'toolkit_data_export') {
        await this.initPromise;
        if (!this.storageAvailable) { this._showToast('No storage available to export data.', 'warning'); return false; }
        if (this.exportInProgress) { this._showToast('Export already in progress.', 'warning'); return false; }

        this.exportInProgress = true;
        this.dependencies.LoadingManager.show('Preparing data for export...');

        try {
            const exportObject = {
                exportFormatVersion: '1.0',
                timestamp: new Date().toISOString(),
                encrypted: false, // Data in the file will be plaintext
                applicationVersion: window.CVDApp?.config?.version || 'unknown',
                data: {}
            };

            const keysToExport = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.options.localStoragePrefix)) {
                    keysToExport.push(key.substring(this.options.localStoragePrefix.length));
                }
            }

            for (const shortKey of keysToExport) {
                // getItem will handle decryption if it was stored encrypted
                exportObject.data[shortKey] = await this.getItem(shortKey);
            }

            const S = this.dependencies.InputSanitizer;
            const finalFilename = `${S.escapeHTML(filenamePrefix)}_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
            const dataStr = JSON.stringify(exportObject, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8;' });

            this._downloadBlob(dataBlob, finalFilename);
            this.dependencies.EventBus.publish('dataManager:exportComplete', { success: true, filename: finalFilename });
            this._showToast('Data exported successfully.', 'success');
            return true;
        } catch (error) {
            this._handleError(error, 'ExportData');
            return false;
        } finally {
            this.exportInProgress = false;
            this.dependencies.LoadingManager.hide();
        }
    }

    /**
     * Imports data from a JSON file, overwriting existing keys.
     * @param {File} file - The JSON file to import.
     */
    async importData(file) {
        await this.initPromise;
        if (!file) { this._showToast('No file selected for import.', 'error'); return false; }
        if (file.type !== 'application/json') { this._showToast('Invalid file type. Please select a JSON file.', 'error'); return false; }
        if (!this.storageAvailable) { this._showToast('Storage not available for import.', 'error'); return false; }

        this.dependencies.LoadingManager.show('Importing data...');
        try {
            const fileContents = await this._readFileAsText(file);
            const importObject = JSON.parse(fileContents);

            if (!importObject.data || typeof importObject.data !== 'object' || !importObject.exportFormatVersion) {
                throw new Error('Invalid import file format. Missing "data" or "exportFormatVersion".');
            }
            // Add version compatibility checks if needed in the future

            // User confirmation should be handled by AppUI before calling this method.
            // For this service, we assume confirmation was given.
            // const confirmImport = confirm(`Import data from ${new Date(importObject.timestamp).toLocaleString()}? This will overwrite existing data.`);
            // if (!confirmImport) { this.dependencies.LoadingManager.hide(); return false; }

            let itemsImported = 0;
            for (const [key, value] of Object.entries(importObject.data)) {
                // Data from file is assumed to be plaintext. setItem will encrypt if enabled.
                // InputSanitizerService is used within setItem if value is object/array.
                await this.setItem(key, value);
                itemsImported++;
            }

            this._showToast(`Data imported successfully (${itemsImported} items). Application will now refresh.`, 'success');
            this.dependencies.EventBus.publish('dataManager:importComplete', { success: true, itemsImported });

            // Trigger a reload or a more graceful data refresh via EventBus for AppUI to handle
            setTimeout(() => window.location.reload(), 1500); // Simple reload
            return true;

        } catch (error) {
            this._handleError(error, 'ImportData');
            return false;
        } finally {
            this.dependencies.LoadingManager.hide();
        }
    }

    async _readFileAsText(file) { /* ... (from user's DataManager) ... */
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    _downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async clearAllData(confirmed = false) { // `confirmed` flag to bypass internal confirm
        await this.initPromise;
        if (!this.storageAvailable) { this._showToast('Storage not available.', 'warning'); return false; }

        // Confirmation should ideally be handled by AppUI before calling this.
        if (!confirmed) {
            this.dependencies.EventBus.publish('ui:requestConfirmation', {
                message: 'Are you sure you want to clear all saved application data? This action cannot be undone.',
                onConfirm: () => this.clearAllData(true), // Call again with confirmed flag
                onCancel: () => this._showToast('Clear data cancelled.', 'info')
            });
            return false; // Initial call returns, waits for UI confirmation via EventBus
        }

        this.dependencies.LoadingManager.show('Clearing all data...');
        try {
            const localKeysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.options.localStoragePrefix)) localKeysToRemove.push(key);
            }
            localKeysToRemove.forEach(key => localStorage.removeItem(key));

            const sessionKeysToRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith(this.options.sessionStoragePrefix)) sessionKeysToRemove.push(key);
            }
            sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

            // Also clear the encryption key if it was notionally persisted (though current example doesn't)
            localStorage.removeItem(this.options.masterKeyLabel); // Example

            this._showToast('All application data has been cleared. Application will now refresh.', 'success');
            this.dependencies.EventBus.publish('dataManager:dataCleared', { success: true });
            setTimeout(() => window.location.reload(), 1500);
            return true;
        } catch (error) {
            this._handleError(error, 'ClearAllData');
            return false;
        } finally {
            this.dependencies.LoadingManager.hide();
        }
    }

    setDebugMode(enable) { this.options.debugMode = Boolean(enable); }

    _showToast(message, type = 'info', duration = 3000) { // Helper for internal use
        this.dependencies.EventBus.publish('ui:showToast', { message, type, duration });
    }
}

// Instantiate and export the singleton service
// const DataManagerServiceInstance = new DataManagerService({
//     dependencies: { /* ... */ }
// });
// window.DataManagerInstance = DataManagerServiceInstance; // As per user's original pattern
// export default DataManagerServiceInstance;
