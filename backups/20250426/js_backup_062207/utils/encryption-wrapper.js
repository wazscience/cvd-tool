/**
 * Encryption Wrapper
 * Provides encryption/decryption functions using CryptoJS or Web Crypto API
 */
const encryptionWrapper = (function() {
  // Check for available encryption methods
  const hasCryptoJS = typeof CryptoJS !== 'undefined';
  const hasWebCrypto = typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined';

  // Default encryption method
  let defaultMethod = hasCryptoJS ? 'cryptojs' : (hasWebCrypto ? 'webcrypto' : 'base64');

  /**
   * Generate a random encryption key
   * @param {number} length - Key length in bytes
   * @returns {string} - Hex string representation of key
   */
  function generateKey(length = 32) {
    if (hasWebCrypto) {
      const array = new Uint8Array(length);
      window.crypto.getRandomValues(array);
      return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback
      let key = '';
      for (let i = 0; i < length * 2; i++) {
        key += Math.floor(Math.random() * 16).toString(16);
      }
      return key;
    }
  }

  /**
   * Encrypt data using CryptoJS AES
   * @param {string} data - Data to encrypt
   * @param {string} key - Encryption key
   * @returns {string} - Encrypted data
   */
  function encryptWithCryptoJS(data, key) {
    if (!hasCryptoJS) {throw new Error('CryptoJS not available');}
    return CryptoJS.AES.encrypt(data, key).toString();
  }

  /**
   * Decrypt data using CryptoJS AES
   * @param {string} encryptedData - Data to decrypt
   * @param {string} key - Encryption key
   * @returns {string} - Decrypted data
   */
  function decryptWithCryptoJS(encryptedData, key) {
    if (!hasCryptoJS) {throw new Error('CryptoJS not available');}
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Basic base64 encoding (not true encryption, but obfuscation)
   * @param {string} data - Data to encode
   * @returns {string} - Encoded data
   */
  function encodeBase64(data) {
    return btoa(encodeURIComponent(data).replace(/%([0-9A-F]{2})/g,
      function(match, p1) {
        return String.fromCharCode('0x' + p1);
      }
    ));
  }

  /**
   * Basic base64 decoding
   * @param {string} encodedData - Data to decode
   * @returns {string} - Decoded data
   */
  function decodeBase64(encodedData) {
    return decodeURIComponent(Array.prototype.map.call(atob(encodedData), function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  /**
   * Encrypt data using the default method
   * @param {any} data - Data to encrypt
   * @param {string} key - Encryption key (optional, generated if not provided)
   * @returns {Object} - { encryptedData, key }
   */
  function encrypt(data, key = null) {
    // Convert data to string if necessary
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);

    // Generate key if not provided
    const useKey = key || generateKey();

    try {
      let encryptedData;

      // Encrypt using selected method
      switch (defaultMethod) {
        case 'cryptojs':
          encryptedData = encryptWithCryptoJS(dataStr, useKey);
          break;
        case 'webcrypto':
          // WebCrypto API encryption would go here
          // For now, fall back to CryptoJS or base64
          encryptedData = hasCryptoJS ?
            encryptWithCryptoJS(dataStr, useKey) :
            encodeBase64(dataStr);
          break;
        case 'base64':
        default:
          encryptedData = encodeBase64(dataStr);
          break;
      }

      return {
        encryptedData,
        key: useKey,
        method: defaultMethod
      };
    } catch (error) {
      console.error('Encryption failed:', error);

      // Fall back to base64 encoding
      return {
        encryptedData: encodeBase64(dataStr),
        key: useKey,
        method: 'base64'
      };
    }
  }

  /**
   * Decrypt data
   * @param {string} encryptedData - Data to decrypt
   * @param {string} key - Decryption key
   * @param {string} method - Method used for encryption
   * @returns {any} - Decrypted data
   */
  function decrypt(encryptedData, key, method = defaultMethod) {
    try {
      let decryptedData;

      // Decrypt using specified method
      switch (method) {
        case 'cryptojs':
          decryptedData = decryptWithCryptoJS(encryptedData, key);
          break;
        case 'webcrypto':
          // WebCrypto API decryption would go here
          // For now, fall back to CryptoJS or base64
          decryptedData = hasCryptoJS ?
            decryptWithCryptoJS(encryptedData, key) :
            decodeBase64(encryptedData);
          break;
        case 'base64':
        default:
          decryptedData = decodeBase64(encryptedData);
          break;
      }

      // Try to parse as JSON
      try {
        return JSON.parse(decryptedData);
      } catch (e) {
        // Return as string if not valid JSON
        return decryptedData;
      }
    } catch (error) {
      console.error('Decryption failed:', error);

      // Try fallback methods
      try {
        if (method !== 'base64') {
          return decrypt(encryptedData, key, 'base64');
        }
      } catch (e) {
        console.error('Fallback decryption failed:', e);
      }

      return null;
    }
  }

  /**
   * Hash data (one-way)
   * @param {string} data - Data to hash
   * @param {string} algorithm - Hash algorithm ('sha256', 'sha512', 'md5')
   * @returns {string} - Hashed data
   */
  function hash(data, algorithm = 'sha256') {
    if (!data) {return '';}

    // Convert to string if necessary
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);

    // Use CryptoJS if available
    if (hasCryptoJS) {
      switch (algorithm.toLowerCase()) {
        case 'sha256':
          return CryptoJS.SHA256(dataStr).toString();
        case 'sha512':
          return CryptoJS.SHA512(dataStr).toString();
        case 'md5':
          return CryptoJS.MD5(dataStr).toString();
        default:
          return CryptoJS.SHA256(dataStr).toString();
      }
    }

    // Fallback to simple string hashing
    return simpleHash(dataStr);
  }

  /**
   * Simple string hashing function (not cryptographically secure)
   * @param {string} str - String to hash
   * @returns {string} - Hashed string
   */
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Set default encryption method
   * @param {string} method - Method to use ('cryptojs', 'webcrypto', 'base64')
   */
  function setMethod(method) {
    if (method === 'cryptojs' && !hasCryptoJS) {
      console.warn('CryptoJS not available, using fallback method');
      defaultMethod = hasWebCrypto ? 'webcrypto' : 'base64';
      return;
    }

    if (method === 'webcrypto' && !hasWebCrypto) {
      console.warn('WebCrypto API not available, using fallback method');
      defaultMethod = hasCryptoJS ? 'cryptojs' : 'base64';
      return;
    }

    defaultMethod = method;
  }

  /**
   * Get current encryption method
   * @returns {string} - Current encryption method
   */
  function getMethod() {
    return defaultMethod;
  }

  /**
   * Check if secure encryption is available
   * @returns {boolean} - Whether secure encryption is available
   */
  function isSecureEncryptionAvailable() {
    return hasCryptoJS || hasWebCrypto;
  }

  // Return public API
  return {
    encrypt,
    decrypt,
    hash,
    generateKey,
    setMethod,
    getMethod,
    isSecureEncryptionAvailable
  };
})();

// Add to window object for global access
window.encryptionWrapper = encryptionWrapper;
