const fs = require('fs');
const path = require('path');

// Paths to files
const jsDir = path.join(process.cwd(), 'js');
const utilsDir = path.join(jsDir, 'utils');
const indexHtmlPath = path.join(process.cwd(), 'index.html');

// Ensure directories exist
if (!fs.existsSync(utilsDir)) {
  fs.mkdirSync(utilsDir, { recursive: true });
}

// Read the index.html file if it exists
let indexHtml = '';
if (fs.existsSync(indexHtmlPath)) {
  indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
} else {
  // Create basic structure if file doesn't exist
  indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CVD Risk Toolkit with Lp(a) Post-Test Modifier</title>
</head>
<body>
    <!-- Content will be added -->
</body>
</html>`;
}

// Add Content Security Policy
if (!indexHtml.includes('<meta http-equiv="Content-Security-Policy"')) {
  const cspMeta = `    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'">`;

  // Insert after other meta tags
  indexHtml = indexHtml.replace('</head>', `${cspMeta}\n</head>`);
  console.log('Added Content Security Policy meta tag');
}

// Create basic secure storage utility
const secureStoragePath = path.join(utilsDir, 'secure-storage.js');
const secureStorageContent = `/**
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
      if (!encoded) return null;
      
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
`;

fs.writeFileSync(secureStoragePath, secureStorageContent, 'utf8');
console.log('Created secure storage utility');

// Update index.html to include the security script
const securityScriptTag = `
    <!-- Security Script -->
    <script src="js/utils/secure-storage.js"></script>`;

if (!indexHtml.includes('secure-storage.js')) {
  // Add before closing body tag
  indexHtml = indexHtml.replace('</body>', `${securityScriptTag}\n</body>`);
}

// Write updated HTML
fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
console.log('Updated index.html with security enhancements');
