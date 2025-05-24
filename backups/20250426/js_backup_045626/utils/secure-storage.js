/**
 * Secure Storage Utility (Basic version)
 */
const secureStorage = (function() {
  // Generate or retrieve encryption key from sessionStorage
  let encryptionKey = sessionStorage.getItem('encryptionKey');
  if (!encryptionKey) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    encryptionKey = Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
    sessionStorage.setItem('encryptionKey', encryptionKey);
  }

  /**
   * Store data securely
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   * @returns {boolean} - Success status
   */
  function setItem(key, data) {
    try {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      const encoded = btoa(dataStr); // Basic encoding for now
      localStorage.setItem('secure_' + key, encoded);
      return true;
    } catch (error) {
      console.error('SecureStorage setItem error:', error);
      return false;
    }
  }

  /**
   * Retrieve securely stored data
   * @param {string} key - Storage key
   * @returns {any} - Retrieved data or null if not found
   */
  function getItem(key) {
    try {
      const encoded = localStorage.getItem('secure_' + key);
      if (!encoded) {return null;}

      const dataStr = atob(encoded);
      try {
        return JSON.parse(dataStr);
      } catch {
        return dataStr;
      }
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return null;
    }
  }

  /**
   * Remove securely stored data
   * @param {string} key - Storage key to remove
   */
  function removeItem(key) {
    try {
      localStorage.removeItem('secure_' + key);
    } catch (error) {
      console.error('SecureStorage removeItem error:', error);
    }
  }

  /**
   * Clear all securely stored data
   */
  function clear() {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key.startsWith('secure_')) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('SecureStorage clear error:', error);
    }
  }

  // Return the public API
  return {
    setItem,
    getItem,
    removeItem,
    clear
  };
})();
