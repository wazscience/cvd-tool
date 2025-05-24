/**
 * Crypto Service Module (with Key Derivation)
 * @file /js/utils/crypto-service.js
 * @description Provides centralized cryptographic operations including hashing,
 * AES-GCM encryption, and PBKDF2 key derivation from passphrases.
 * Uses the Web Crypto API (SubtleCrypto).
 * @version 1.1.0
 * @exports CryptoService
 * @warning Secure key management is complex. This module provides tools for derivation.
 * Storing derived cryptographic keys directly in client-side storage is generally discouraged.
 * Re-derive keys from passphrases when needed.
 */

'use strict';

class CryptoService {
    constructor(options = {}) {
        if (CryptoService.instance) {
            return CryptoService.instance;
        }

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || console,
            ...options.dependencies,
        };

        if (!window.crypto || !window.crypto.subtle) {
            const errorMsg = 'Web Crypto API (SubtleCrypto) is not available. CryptoService cannot operate.';
            this._log('critical', errorMsg);
            this.dependencies.ErrorLogger?.handleError(errorMsg, 'CryptoService-Init', 'critical');
            this.isSupported = false;
        } else {
            this.isSupported = true;
        }

        this.defaultHashAlgorithm = 'SHA-256';
        this.defaultAesGcmParams = { name: 'AES-GCM', length: 256 };
        this.defaultPbkdf2Params = {
            iterations: 100000, // Minimum recommended by OWASP, consider higher.
            hash: 'SHA-256', // Hash algorithm for PBKDF2
        };
        this.defaultSaltLength = 16; // Bytes (128 bits)
        this.defaultIvLength = 12;  // Bytes (96 bits)

        CryptoService.instance = this;
        this._log('info', `Crypto Service Initialized (v1.1.0). Web Crypto Supported: ${this.isSupported}`);
    }

    // --- Utility Functions (stringToArrayBuffer, etc. - remain the same as v1.0.0) ---
    stringToArrayBuffer(str) { /* ... from v1.0.0 ... */ return new TextEncoder().encode(str); }
    arrayBufferToString(buffer) { /* ... from v1.0.0 ... */ return new TextDecoder().decode(buffer); }
    arrayBufferToHexString(buffer) { /* ... from v1.0.0 ... */ return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''); }
    hexStringToArrayBuffer(hexString) { /* ... from v1.0.0 ... */ if (hexString.length % 2 !== 0) throw new Error('Invalid hex string length.'); const r = new Uint8Array(hexString.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16))); return r.buffer; }
    arrayBufferToBase64(buffer) { /* ... from v1.0.0 ... */ let s = ''; const b = new Uint8Array(buffer); b.forEach((c) => s += String.fromCharCode(c)); return window.btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    base64ToArrayBuffer(base64) { /* ... from v1.0.0 ... */ let s = base64.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) {s += '=';} const t = window.atob(s); const u = new Uint8Array(t.length); for (let i = 0; i < t.length; ++i) u[i] = t.charCodeAt(i); return u.buffer; }


    // --- Hashing (remains the same as v1.0.0) ---
    async hashData(data, algorithm = this.defaultHashAlgorithm) { /* ... from v1.0.0 ... */
        if (!this.isSupported) return Promise.reject(new Error('Crypto not supported.'));
        try {
            const bufferData = typeof data === 'string' ? this.stringToArrayBuffer(data) : data;
            const hashBuffer = await window.crypto.subtle.digest(algorithm, bufferData);
            return this.arrayBufferToHexString(hashBuffer);
        } catch (error) { this._log('error', `Hashing failed:`, error); throw error; }
    }

    // --- Key Generation & Management ---

    /** Generates a random salt suitable for PBKDF2. */
    generateSalt() {
        if (!this.isSupported) throw new Error('Crypto not supported.');
        return window.crypto.getRandomValues(new Uint8Array(this.defaultSaltLength));
    }

    /**
     * Derives a cryptographic key from a passphrase and salt using PBKDF2.
     * @param {string} passphraseString - The user's passphrase.
     * @param {Uint8Array | ArrayBuffer} saltBuffer - The salt (use generateSalt()).
     * @param {object} [options] - Override default PBKDF2 params.
     * @param {number} [options.iterations=this.defaultPbkdf2Params.iterations]
     * @param {string} [options.hash=this.defaultPbkdf2Params.hash] - e.g., 'SHA-256', 'SHA-512'.
     * @param {object} [options.keyAlgorithm=this.defaultAesGcmParams] - Algorithm for derived key (e.g., AES-GCM).
     * @param {string[]} [options.keyUsages=['encrypt', 'decrypt']] - Usages for the derived key.
     * @returns {Promise<CryptoKey>} The derived CryptoKey.
     */
    async deriveKeyFromPassphrasePbkdf2(passphraseString, saltBuffer, options = {}) {
        if (!this.isSupported) return Promise.reject(new Error('Crypto not supported.'));
        if (!passphraseString || !saltBuffer) {
            return Promise.reject(new Error('Passphrase and salt are required for key derivation.'));
        }

        const KDFParams = {
            iterations: options.iterations || this.defaultPbkdf2Params.iterations,
            hash: options.hash || this.defaultPbkdf2Params.hash,
        };
        const keyAlgorithm = options.keyAlgorithm || this.defaultAesGcmParams;
        const keyUsages = options.keyUsages || ['encrypt', 'decrypt'];

        try {
            const passphraseKey = await window.crypto.subtle.importKey(
                'raw',
                this.stringToArrayBuffer(passphraseString),
                { name: 'PBKDF2' },
                false, // Not extractable
                ['deriveKey', 'deriveBits']
            );

            return await window.crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: saltBuffer,
                    iterations: KDFParams.iterations,
                    hash: KDFParams.hash,
                },
                passphraseKey,
                keyAlgorithm, // e.g., { name: 'AES-GCM', length: 256 }
                true,        // Make the derived key extractable IF NEEDED (caution!) usually false
                keyUsages    // e.g., ['encrypt', 'decrypt']
            );
        } catch (error) {
            this._log('error', 'Key derivation from passphrase failed:', error);
            this.dependencies.ErrorLogger?.handleError('Key derivation error', 'CryptoService-DeriveKey', 'error');
            throw error;
        }
    }

    /** Generates a new AES-GCM CryptoKey directly (not from passphrase). */
    async generateAesGcmKey(extractable = false) { /* ... from v1.0.0 ... */
        if (!this.isSupported) return Promise.reject(new Error('Crypto not supported.'));
        try { return await window.crypto.subtle.generateKey(this.defaultAesGcmParams,extractable,['encrypt', 'decrypt']); }
        catch (error) { this._log('error', 'Key gen failed:', error); throw error;}
    }

    /** Generates a random Initialization Vector (IV) for AES-GCM. */
    generateIv() { /* ... from v1.0.0 ... */
        if (!this.isSupported) throw new Error('Crypto not supported.');
        return window.crypto.getRandomValues(new Uint8Array(this.defaultIvLength));
    }

    /** Imports a raw key (hex) into an AES-GCM CryptoKey. */
    async importAesGcmKeyFromHex(hexKey, extractable = false) { /* ... from v1.0.0 ... */
         if (!this.isSupported) return Promise.reject(new Error('Crypto not supported.'));
        try { return await window.crypto.subtle.importKey('raw',this.hexStringToArrayBuffer(hexKey),this.defaultAesGcmParams,extractable,['encrypt', 'decrypt']);}
        catch(error){this._log('error', 'Key import failed:', error); throw error;}
    }

    /** Exports a CryptoKey to raw hex string. Key must be extractable. */
    async exportKeyToHex(cryptoKey) { /* ... from v1.0.0 ... */
        if (!this.isSupported || !cryptoKey) return Promise.reject(new Error('Crypto not supported or invalid key.'));
        try { return this.arrayBufferToHexString(await window.crypto.subtle.exportKey('raw', cryptoKey)); }
        catch (error) { this._log('error', 'Key export failed:', error); throw error; }
    }


    // --- AES-GCM Symmetric Encryption/Decryption (methods remain largely the same as v1.0.0) ---
    // They now rely on the key being a CryptoKey object, possibly derived.

    /** Encrypts data using AES-GCM. */
    async encryptAesGcm(plainData, cryptoKey, iv) { /* ... from v1.0.0 ... */
        if (!this.isSupported || !cryptoKey || !iv) return Promise.reject(new Error('Crypto not supported or key/IV missing.'));
        try { return await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, cryptoKey, typeof plainData === 'string' ? this.stringToArrayBuffer(plainData) : plainData); }
        catch (error) { this._log('error', 'Encryption failed:', error); throw error;}
    }

    /** Decrypts data using AES-GCM. */
    async decryptAesGcm(ciphertext, cryptoKey, iv) { /* ... from v1.0.0 ... */
        if (!this.isSupported || !cryptoKey || !iv) return Promise.reject(new Error('Crypto not supported or key/IV missing.'));
        try { return await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, cryptoKey, ciphertext); }
        catch (error) { this._log('error', 'Decryption failed:', error); throw new Error('Decryption failed.');}
    }

    /** Convenience: Encrypts string to base64, generates new IV. */
    async encryptStringToBase64(plainText, cryptoKey) { /* ... from v1.0.0, uses new generateIv() ... */
        const iv = this.generateIv();
        const ciphertextBuffer = await this.encryptAesGcm(plainText, cryptoKey, iv);
        return { ciphertextBase64: this.arrayBufferToBase64(ciphertextBuffer), ivBase64: this.arrayBufferToBase64(iv.buffer) };
    }

    /** Convenience: Decrypts base64 to string. */
    async decryptBase64ToString(ciphertextBase64, cryptoKey, ivBase64) { /* ... from v1.0.0 ... */
        const ctBuffer = this.base64ToArrayBuffer(ciphertextBase64);
        const ivBuffer = this.base64ToArrayBuffer(ivBase64);
        const decryptedBuffer = await this.decryptAesGcm(ctBuffer, cryptoKey, ivBuffer);
        return this.arrayBufferToString(decryptedBuffer);
    }


    /** Internal logging helper. */
    _log(level, message, data) { /* ... from v1.0.0 ... */
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `CryptoService: ${message}`;
        if (level === 'critical' && logger?.handleError) { logger.handleError(data || message, 'CryptoService', 'critical', data ? { msg: message } : {});
        } else if (level === 'error' && logger?.handleError) { logger.handleError(data || message, 'CryptoService', 'error', data ? { msg: message } : {});
        } else if (logger?.log) { logger.log(level, logMessage, data);
        } else { console[level]?.(logMessage, data); }
    }
}

// Instantiate and export the singleton service
const CryptoServiceInstance = new CryptoService();
// window.CryptoService = CryptoServiceInstance; // Optional global access
// export default CryptoServiceInstance;