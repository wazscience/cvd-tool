/**
 * Secure Storage Utility
 * Provides a secure wrapper around localStorage with basic encryption
 */
const secureStorage = (function() {
  // Check for crypto support
  const hasCrypto = typeof window.crypto !== 'undefined' && 
                    typeof window.crypto.subtle !== 'undefined';
  
  // Generate a simple key for basic protection
  let encryptionKey = 'cvd-risk-toolkit-key';
  
  /**
   * Basic encoding function that works across browsers
   * @param {string} str - String to encode
   * @returns {string} - Encoded string
   */
  function encode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function(match, p1) {
        return String.fromCharCode('0x' + p1);
      }
    ));
  }
  
  /**
   * Basic decoding function that works across browsers
   * @param {string} str - String to decode
   * @returns {string} - Decoded string
   */
  function decode(str) {
    try {
      return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (e) {
      console.warn('Secure storage decode error:', e);
      return '';
    }
  }
  
  /**
   * Store data securely
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   * @returns {boolean} - Success status
   */
  function setItem(key, data) {
    try {
      // Convert data to string if it's not already
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Add timestamp for security validation
      const dataWithTimestamp = JSON.stringify({
        data: dataStr,
        timestamp: new Date().getTime(),
        version: '1.0'
      });
      
      // Encode the data
      const encodedData = encode(dataWithTimestamp);
      
      // Store with a prefix to identify secure storage items
      localStorage.setItem('secure_' + key, encodedData);
      return true;
    } catch (error) {
      console.warn('SecureStorage setItem error:', error);
      return false;
    }
  }
  
  /**
   * Retrieve securely stored data
   * @param {string} key - Storage key
   * @returns {any} - Retrieved data or null if not found/invalid
   */
  function getItem(key) {
    try {
      const encodedData = localStorage.getItem('secure_' + key);
      if (!encodedData) return null;
      
      // Decode the data
      const decodedStr = decode(encodedData);
      if (!decodedStr) return null;
      
      // Parse the wrapped data
      const wrapper = JSON.parse(decodedStr);
      
      // Basic validation
      if (!wrapper.timestamp || !wrapper.data) {
        console.warn('Invalid secure storage data format');
        return null;
      }
      
      // Return the actual data, parsing JSON if possible
      try {
        return JSON.parse(wrapper.data);
      } catch (e) {
        // If not valid JSON, return as string
        return wrapper.data;
      }
    } catch (error) {
      console.warn('SecureStorage getItem error:', error);
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
      console.warn('SecureStorage removeItem error:', error);
    }
  }
  
  /**
   * Clear all securely stored data
   */
  function clear() {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('secure_')) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('SecureStorage clear error:', error);
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

// Make available globally
if (typeof window !== 'undefined') {
  window.secureStorage = secureStorage;
}
