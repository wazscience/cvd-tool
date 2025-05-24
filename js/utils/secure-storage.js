/**
 * Secure Storage Module
 * @file /js/utils/secure-storage.js
 * @description Provides an interface for storing and retrieving data securely
 * in localStorage (or sessionStorage) using AES-GCM encryption via CryptoService.
 * Aligns with the concept in the Implementation Guide PDF.
 * @version 1.0.0
 * @exports SecureStorage
 */

'use strict';

class SecureStorage {
    /**
     * Creates an instance of SecureStorage.
     * @param {object} [options={}] - Configuration options.
     * @param {string} [options.storagePrefix='cvd_toolkit_secure_'] - Prefix for all storage keys.
     * @param {Storage} [options.storageMechanism=localStorage] - The storage API to use (localStorage or sessionStorage).
     * @param {string} [options.masterKeyLabel='secureStorageMasterKey'] - Label to identify the master key.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        // Singleton pattern for a given prefix/mechanism combination could be considered,
        // but instance-based allows for multiple secure storage contexts if needed.
        // For now, we'll allow multiple instances if different options are used.

        this.options = {
            storagePrefix: 'cvd_toolkit_secure_',
            storageMechanism: localStorage, // Can be localStorage or sessionStorage
            masterKeyLabel: 'secureStorageMasterKey_v1', // For key wrapping/management
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger(),
            EventBus: window.EventBus,
            CryptoService: window.CryptoService, // Expects CryptoService instance
            ...options.dependencies,
        };

        this.isSupported = this._checkSupport();
        this.encryptionKey = null; // Will hold the derived/generated CryptoKey

        if (!this.isSupported) {
            this._log('error', 'SecureStorage cannot operate: Storage or Crypto not supported.');
            // Potentially publish an event or throw for critical failure
        } else {
            // Asynchronously initialize/derive the master encryption key
            // This key would ideally be derived from a user passphrase or a securely managed primary key.
            // For this example, we'll attempt to generate/retrieve a session-based key or
            // demonstrate where a passphrase-derived key would be used.
            // A more robust solution would involve user-provided entropy.
            this._initializeMasterKey().then(success => {
                if (success) {
                    this._log('info', `SecureStorage initialized for prefix "${this.options.storagePrefix}". Key ready: ${!!this.encryptionKey}`);
                    this.dependencies.EventBus?.publish('secureStorage:initialized', { prefix: this.options.storagePrefix, success: true });
                } else {
                    this._log('error', `SecureStorage initialization failed for prefix "${this.options.storagePrefix}": Master key setup failed.`);
                    this.dependencies.EventBus?.publish('secureStorage:initialized', { prefix: this.options.storagePrefix, success: false, error: 'Master key setup failed' });
                }
            });
        }
    }

    _getFallbackLogger() {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`SecureStorage Fallback Logger [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => console[lvl]?.(`SecureStorage Fallback Logger [${lvl}]: ${msg}`, data) || console.log(`SecureStorage Fallback Logger [${lvl}]: ${msg}`, data)
        };
    }

    _checkSupport() {
        try {
            const testKey = '__secureStorageTest__';
            this.options.storageMechanism.setItem(testKey, testKey);
            this.options.storageMechanism.removeItem(testKey);
            if (!this.dependencies.CryptoService || !this.dependencies.CryptoService.isSupported) {
                this._log('warn', 'CryptoService is not supported or unavailable.');
                return false;
            }
            return true;
        } catch (e) {
            this._log('error', 'Selected storage mechanism not available.', e);
            return false;
        }
    }

    /**
     * Initializes the master encryption key.
     * This is a simplified example. In a real application, this key would need to be
     * securely derived from user credentials or a hardware token, or provisioned.
     * Here, we simulate deriving it or generating a session key.
     * The PDF version (page 342,) stored a randomly generated key in sessionStorage.
     * We will use CryptoService to generate a proper CryptoKey.
     * @private
     */
    async _initializeMasterKey() {
        if (!this.isSupported) return false;
        const C = this.dependencies.CryptoService;

        // Option 1: Derive from a hardcoded "passphrase" (NOT RECOMMENDED FOR PRODUCTION)
        // This is just to show how derivation would integrate.
        // const passphrase = "a-very-secret-application-passphrase"; // NEVER do this in production
        // const salt = C.stringToArrayBuffer(this.options.storagePrefix + "salt"); // Use a fixed salt for this app key

        try {
            // For a real app, this key should come from a more secure source or derivation method.
            // Here, we'll generate a key and store its exportable version wrapped if possible,
            // or just generate a session key if no master passphrase/wrapping mechanism exists.

            // Let's try to retrieve a "wrapped" key from localStorage if it exists.
            // This is a conceptual step. A true key wrapping system is complex.
            const wrappedKeyHex = this.options.storageMechanism.getItem(this.options.masterKeyLabel);

            if (wrappedKeyHex && false) { // Disabled for this example, as secure wrapping is complex
                // Conceptual: If a wrapped key was stored, unwrap it here
                // const unwrappingKey = await C.deriveKeyFromPassphrasePbkdf2("user_session_password", ...);
                // this.encryptionKey = await C.unwrapKey(wrappedKeyHex, unwrappingKey);
                // For now, we'll always generate a new key or re-derive if passphrase was available.
            }

            if (!this.encryptionKey) {
                // If no persisted/wrapped key, generate one for the session or derive.
                // The PDF's SecureStorage (pg 142,) generated a random key and stored it in sessionStorage.
                // Let's generate a proper CryptoKey using CryptoService.
                // For true persistence across sessions from a passphrase, this would be:
                // const userPassphrase = prompt("Enter your master passphrase:"); // NOT SECURE to prompt like this
                // if (!userPassphrase) throw new Error("Passphrase required for secure storage.");
                // const salt = C.hexStringToArrayBuffer(this._getStorageItem("_masterSalt_") || C.arrayBufferToHexString(C.generateSalt()));
                // if(!this._getStorageItem("_masterSalt_")) this._setStorageItem("_masterSalt_", C.arrayBufferToHexString(salt));
                // this.encryptionKey = await C.deriveKeyFromPassphrasePbkdf2(userPassphrase, salt);

                // For this example, let's generate a new AES-GCM key for the session.
                // This key will be lost when the browser session ends unless explicitly exported and stored.
                this.encryptionKey = await C.generateAesGcmKey(true); // Generate an extractable key
                this._log('info', 'New session encryption key generated for SecureStorage.');

                // Conceptual: If we wanted to persist this key (less secure for client-side),
                // you might export and store its raw material (encrypted with another key or carefully managed).
                // const exportedKeyHex = await C.exportKeyToHex(this.encryptionKey);
                // this.options.storageMechanism.setItem(this.options.masterKeyLabel, exportedKeyHex);
            }
            return !!this.encryptionKey;
        } catch (error) {
            this._log('error', 'Master key initialization/derivation failed.', error);
            this.dependencies.ErrorLogger?.handleError('Master key setup failed', 'SecureStorage', 'critical', { error });
            this.isSupported = false; // Disable service if key setup fails
            return false;
        }
    }


    /**
     * Securely stores an item.
     * @param {string} key - The key for the item.
     * @param {*} value - The value to store (will be JSON.stringified).
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async setItem(key, value) {
        if (!this.isSupported || !this.encryptionKey) {
            this._log('error', 'Cannot set item: SecureStorage not supported or key not initialized.');
            return false;
        }
        const C = this.dependencies.CryptoService;
        const fullKey = `${this.options.storagePrefix}${key}`;

        try {
            const jsonValue = JSON.stringify(value);
            const { ciphertextBase64, ivBase64 } = await C.encryptStringToBase64(jsonValue, this.encryptionKey);

            const storedObject = {
                iv: ivBase64,
                ct: ciphertextBase64, // Ciphertext
                ts: Date.now() // Timestamp
            };
            this.options.storageMechanism.setItem(fullKey, JSON.stringify(storedObject));
            this._log('debug', `Item "${key}" securely stored.`);
            this.dependencies.EventBus?.publish('secureStorage:itemSet', { key });
            return true;
        } catch (error) {
            this._log('error', `Failed to set item "${key}":`, error);
            this.dependencies.ErrorLogger?.handleError(`SecureStorage setItem error for key ${key}`, 'SecureStorage', 'error', { error });
            return false;
        }
    }

    /**
     * Retrieves and decrypts an item.
     * @param {string} key - The key of the item to retrieve.
     * @param {*} [defaultValue=null] - Value to return if item not found or decryption fails.
     * @returns {Promise<any>} The decrypted value, or defaultValue.
     */
    async getItem(key, defaultValue = null) {
        if (!this.isSupported || !this.encryptionKey) {
            this._log('warn', 'Cannot get item: SecureStorage not supported or key not initialized.');
            return defaultValue;
        }
        const C = this.dependencies.CryptoService;
        const fullKey = `${this.options.storagePrefix}${key}`;

        try {
            const storedValue = this.options.storageMechanism.getItem(fullKey);
            if (storedValue === null) {
                return defaultValue;
            }

            const storedObject = JSON.parse(storedValue);
            if (!storedObject.iv || !storedObject.ct) {
                this._log('error', `Invalid stored object format for key "${key}". Removing.`);
                this.options.storageMechanism.removeItem(fullKey);
                return defaultValue;
            }

            const decryptedJson = await C.decryptBase64ToString(storedObject.ct, this.encryptionKey, storedObject.iv);
            this._log('debug', `Item "${key}" securely retrieved and decrypted.`);
            this.dependencies.EventBus?.publish('secureStorage:itemRetrieved', { key });
            try {
                return JSON.parse(decryptedJson);
            } catch (e) { // If not JSON, return as string
                return decryptedJson;
            }
        } catch (error) {
            this._log('error', `Failed to get/decrypt item "${key}":`, error);
            // If decryption fails, it might be due to key change or corruption.
            // For robustness, consider removing the corrupt item.
            // this.options.storageMechanism.removeItem(fullKey);
            this.dependencies.ErrorLogger?.handleError(`SecureStorage getItem/decrypt error for key ${key}`, 'SecureStorage', 'error', { error });
            return defaultValue;
        }
    }

    /**
     * Removes an item from secure storage.
     * @param {string} key - The key of the item to remove.
     */
    removeItem(key) {
        if (!this.isSupported) return;
        const fullKey = `${this.options.storagePrefix}${key}`;
        try {
            this.options.storageMechanism.removeItem(fullKey);
            this._log('debug', `Item "${key}" removed from secure storage.`);
            this.dependencies.EventBus?.publish('secureStorage:itemRemoved', { key });
        } catch (error) {
            this._log('error', `Failed to remove item "${key}":`, error);
        }
    }

    /**
     * Clears all items managed by this SecureStorage instance (matching the prefix).
     */
    clear() {
        if (!this.isSupported) return;
        try {
            for (let i = 0; i < this.options.storageMechanism.length; i++) {
                const key = this.options.storageMechanism.key(i);
                if (key && key.startsWith(this.options.storagePrefix)) {
                    this.options.storageMechanism.removeItem(key);
                    i--; // Adjust index due to removal
                }
            }
            this._log('info', `SecureStorage cleared for prefix "${this.options.storagePrefix}".`);
            this.dependencies.EventBus?.publish('secureStorage:cleared', { prefix: this.options.storagePrefix });
        } catch (error) {
            this._log('error', 'Failed to clear secure storage:', error);
        }
    }

    /**
     * Changes the master encryption key. This will re-encrypt all existing items.
     * WARNING: This is a sensitive operation. The new key must be handled securely.
     * For simplicity, this example uses a newly generated key.
     * @returns {Promise<boolean>} True if key was changed and data re-encrypted.
     */
    async reKeyStorage() {
        if (!this.isSupported || !this.encryptionKey) {
            this._log('error', "Cannot re-key: SecureStorage not supported or current key not initialized.");
            return false;
        }
        this.dependencies.LoadingManager?.show('Securing data with new key...');
        this._log('warn', 'Attempting to re-key secure storage. This may take some time.');

        try {
            const oldKey = this.encryptionKey;
            const itemsToReEncrypt = [];

            // 1. Decrypt all items with old key
            for (let i = 0; i < this.options.storageMechanism.length; i++) {
                const storageKey = this.options.storageMechanism.key(i);
                if (storageKey && storageKey.startsWith(this.options.storagePrefix)) {
                    const shortKey = storageKey.substring(this.options.storagePrefix.length);
                    // Temporarily use old key for getItem logic to decrypt
                    this.encryptionKey = oldKey;
                    const value = await this.getItem(shortKey); // getItem will use the current this.encryptionKey
                    if (value !== null) { // If not null or decryption error
                        itemsToReEncrypt.push({ key: shortKey, value });
                    }
                }
            }

            // 2. Generate new master key
            this.encryptionKey = await this.dependencies.CryptoService.generateAesGcmKey(true);
            this._log('info', 'Generated new master key for re-encryption.');
            // Conceptual: Persist the new key securely (e.g., wrapped, or re-derive from new passphrase)
            // const newExportedKey = await this.dependencies.CryptoService.exportKeyToHex(this.encryptionKey);
            // this.options.storageMechanism.setItem(this.options.masterKeyLabel, newExportedKey);


            // 3. Re-encrypt all items with new key
            for (const item of itemsToReEncrypt) {
                // setItem will use the new this.encryptionKey
                await this.setItem(item.key, item.value);
            }

            this._log('info', `SecureStorage successfully re-keyed. ${itemsToReEncrypt.length} items re-encrypted.`);
            this.dependencies.EventBus?.publish('secureStorage:reKeyed');
            this.dependencies.LoadingManager?.hide();
            return true;

        } catch (error) {
            this._log('error', 'Failed to re-key secure storage:', error);
            this.dependencies.ErrorLogger?.handleError('Storage re-keying failed.', 'SecureStorage', 'critical', { error });
            // Potentially try to revert to oldKey if re-encryption failed midway? Complex recovery.
            this.dependencies.LoadingManager?.hide();
            return false;
        }
    }
}

// Instantiate and export the singleton service for default use
const SecureStorageInstance = new SecureStorage();
// window.SecureStorage = SecureStorageInstance; // Optional global access
// export default SecureStorageInstance; // For ES module usage

// If you need multiple instances with different prefixes/storage types:
// export default SecureStorage; // Export the class