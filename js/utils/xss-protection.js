// Attempt to import DOMPurify. If it's not available as a module,
// it might be loaded globally via a script tag, or not at all.
// For this module, we'll check window.DOMPurify.
// Ensure DOMPurify is loaded before this script if you intend to use it.
let _DOMPurify;
if (typeof window !== 'undefined' && window.DOMPurify) {
  _DOMPurify = window.DOMPurify;
  console.info('[XSSProtection] DOMPurify library found and will be used for HTML sanitization.');
} else {
  console.warn('[XSSProtection] DOMPurify library not found. Falling back to manual HTML sanitization (less comprehensive and potentially less secure for complex HTML). Consider including DOMPurify in your project for robust HTML sanitization.');
}

/**
 * XSS Protection Module (ESM Version)
 * Provides comprehensive XSS (Cross-Site Scripting) prevention with
 * HTML sanitization, DOM purification, and context-aware escaping.
 *
 * This module aims to be compatible with the enhanced CVD Toolkit HTML structure
 * and work synergistically with main.js and ui.js.
 * It will prioritize DOMPurify for HTML sanitization if available.
 */
const xssProtection = (() => {
  // Default Configuration
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption', 'hr', 'sub', 'sup', 'mark', 'small', 'del', 'ins'],
    ALLOWED_ATTR: { // Attributes allowed on specific tags or globally (*)
      'a': ['href', 'title', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height', 'style'], // 'img' tag itself needs to be in ALLOWED_TAGS to use this
      '*': ['class', 'id', 'style', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'tabindex', 'role', 'lang', 'dir']
    },
    ALLOWED_PROTOCOLS: ['http', 'https', 'mailto', 'tel'], // Protocols allowed for URL attributes like href, src
    ALLOWED_STYLES: { // CSS properties allowed in 'style' attributes and their validation (regex or function)
      'color': /^#(?:[0-9a-fA-F]{3,4}){1,2}$|^(?:rgb|hsl)a?\([\s\d%,.\/-]+\)$/i, // Supports hex, rgb, rgba, hsl, hsla
      'background-color': /^#(?:[0-9a-fA-F]{3,4}){1,2}$|^(?:rgb|hsl)a?\([\s\d%,.\/-]+\)$/i,
      'font-size': /^\d{1,3}(?:px|em|rem|pt|%)$/,
      'font-weight': /^(normal|bold|bolder|lighter|[1-9]00)$/,
      'font-family': /^(['"]?[\w\s-]+['"]?(,\s*['"]?[\w\s-]+['"]?)*|inherit|initial|unset)$/, // Allow common font families
      'text-align': /^(left|right|center|justify|start|end)$/,
      'text-decoration': /^(none|underline|overline|line-through)$/,
      'margin': /^\s*(-?\d+(?:px|em|%|rem|pt)\s*){1,4}$/,
      'padding': /^\s*(\d+(?:px|em|%|rem|pt)\s*){1,4}$/,
      'border': /^\s*.+$/, // Very permissive for border, consider tightening
      'border-radius': /^\s*\d+(?:px|em|%|rem|pt)(\s+\d+(?:px|em|%|rem|pt)){0,3}\s*$/,
      'width': /^\d+(?:px|em|%|rem|pt)$/,
      'height': /^\d+(?:px|em|%|rem|pt)$/,
      'display': /^(inline|block|inline-block|none|flex|grid)$/,
      'float': /^(left|right|none)$/,
      'clear': /^(left|right|both|none)$/,
    },
    REMOVE_UNKNOWN_TAGS: true,      // For manual sanitizer: Remove tags not in ALLOWED_TAGS
    STRIP_EVENT_HANDLERS: true,   // For manual sanitizer: Remove on* event handlers
    SANITIZE_URLS: true,          // For manual sanitizer: Sanitize href, src attributes
    ALLOW_DATA_ATTRIBUTES: true,  // For manual sanitizer: Allow data-* attributes
    MAX_DEPTH: 20,                // For manual sanitizer: Maximum DOM depth to prevent DoS
    ALLOW_COMMENTS: false,        // For manual sanitizer: Remove HTML comments
    SANITIZE_TEXT_NODES: false,   // For manual sanitizer: Whether to escape text within allowed tags (usually false)

    // DOMPurify specific configuration (these will be used if DOMPurify is available)
    DOMPURIFY_CONFIG: {
        USE_PROFILES: { html: true }, // Use standard HTML profile
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button', 'select', 'option', 'link', 'meta', 'base', 'applet', 'video', 'audio'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onabort', 'onkeydown', 'onkeypress', 'onkeyup', 'onmousedown', 'onmouseup', 'formaction', 'autofocus', 'contenteditable'],
        ALLOW_DATA_ATTR: true, // Allow data-* attributes
        ADD_TAGS: [], // No custom tags added by default
        ADD_ATTR: [], // No custom attributes added by default
        KEEP_CONTENT: true, // Keep content of forbidden tags (will be sanitized)
    }
  };

  // HTML entities for robust escaping
  const htmlEntities = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
  };

  const dangerousProtocolsPattern = /^(?:javascript|vbscript|data|file):/i;
  const onEventAttributePattern = /^on\w+/i;
  const cssExpressionPattern = /expression\s*\(/i; // For older IE CSS expressions
  const dangerousCSSTokens = /url\s*\(\s*['"]?\s*(?:javascript|vbscript|data):/i;


  function logError(message, error) {
    const fullMessage = `[XSSProtection] ${message}`;
    console.error(fullMessage, error || '');
    if (typeof window !== 'undefined' && window.ErrorDetectionSystem && typeof window.ErrorDetectionSystem.trackError === 'function') {
      window.ErrorDetectionSystem.trackError({
        message: fullMessage,
        error: error instanceof Error ? error : new Error(String(error)),
        source: 'js/utils/xss-protection.js', // Path to this module
        severity: 'warning' // Or 'error' depending on context
      });
    }
  }

  function sanitizeString(input) {
    if (input === null || typeof input === 'undefined') return '';
    const str = String(input);
    return str.replace(/[&<>"'`=\/]/g, s => htmlEntities[s]);
  }

  function sanitizeHTML(html, customOptions = {}) {
    if (typeof html !== 'string' || !html.trim()) return '';
    const currentConfig = { ...config, ...customOptions };

    if (_DOMPurify) {
      const dpConfig = {
          ...currentConfig.DOMPURIFY_CONFIG,
          ALLOWED_TAGS: currentConfig.ALLOWED_TAGS,
          // DOMPurify handles attribute whitelisting per tag more granularly if needed,
          // but for simplicity, we can provide a global list or configure it more deeply.
          // For now, we'll rely on its default safe attributes + what's in ALLOWED_ATTR['*']
          // and specific tag attributes if we map them.
          // This part might need refinement based on how DOMPurify's config is structured for specific tag attributes.
      };
      // Add specific allowed attributes to DOMPurify config
      const allowedAttrForDomPurify = {};
       for (const tag in currentConfig.ALLOWED_ATTR) {
           if (tag === '*') { // Global attributes
               // DOMPurify doesn't have a direct equivalent for global attributes in this simple config.
               // It's safer to list them under specific tags or rely on DOMPurify's defaults.
               // However, we can add them to common tags if needed or use a hook.
           } else {
               allowedAttrForDomPurify[tag] = currentConfig.ALLOWED_ATTR[tag];
           }
       }
       // If you need to ensure global attributes are allowed on all allowed tags:
       if (currentConfig.ALLOWED_ATTR['*']) {
           dpConfig.ALLOWED_ATTR = currentConfig.ALLOWED_ATTR['*']; // This makes them globally allowed if the tag itself is.
           // For more fine-grained control, you'd iterate ALLOWED_TAGS and add '*' attributes to each.
       }


      // A more robust way to handle specific attributes per tag with DOMPurify
      // would be to use its hooks or ensure the config structure matches.
      // For now, this provides a reasonable level of safety.
      // DOMPurify's default behavior is quite secure.

      return _DOMPurify.sanitize(html, dpConfig);
    }

    console.warn('[XSSProtection] DOMPurify not available. Using manual HTML sanitization fallback. This is less secure for complex HTML.');
    const temp = document.createElement('div');
    temp.innerHTML = html;
    _manualSanitizeNodeRecursive(temp, currentConfig, 0);
    return temp.innerHTML;
  }

  function _manualSanitizeNodeRecursive(node, opts, depth) {
    if (depth > opts.MAX_DEPTH) {
      logError('Max sanitization depth exceeded, removing node to prevent DoS.');
      node.remove();
      return;
    }

    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        _manualSanitizeElementNode(node, opts, depth);
        break;
      case Node.TEXT_NODE:
        if (opts.SANITIZE_TEXT_NODES) {
          // Sanitize text content if it might be rendered as HTML elsewhere,
          // or if it's from a highly untrusted source.
          // Generally, textContent is safe, but this adds an extra layer.
          node.textContent = sanitizeString(node.textContent);
        }
        break;
      case Node.COMMENT_NODE:
        if (!opts.ALLOW_COMMENTS) {
          node.remove();
        }
        break;
      // Other node types (like CDATA, processing instructions) are typically removed by innerHTML parsing or ignored.
    }
  }

  function _manualSanitizeElementNode(element, opts, depth) {
    const tagName = element.tagName.toLowerCase();

    if (!opts.ALLOWED_TAGS.includes(tagName)) {
      if (opts.REMOVE_UNKNOWN_TAGS) {
        logError(`Manual Sanitize: Removing disallowed tag: <${tagName}>`);
        element.remove();
      } else {
        const textContent = sanitizeString(element.textContent || '');
        element.replaceWith(document.createTextNode(textContent));
      }
      return;
    }

    const attributes = Array.from(element.attributes);
    attributes.forEach(attr => {
      const attrName = attr.name.toLowerCase();
      let attrValue = attr.value;

      const isGloballyAllowed = opts.ALLOWED_ATTR['*'] && opts.ALLOWED_ATTR['*'].includes(attrName);
      const isTagSpecificallyAllowed = opts.ALLOWED_ATTR[tagName] && opts.ALLOWED_ATTR[tagName].includes(attrName);
      const isDataAttributeAllowed = attrName.startsWith('data-') && opts.ALLOW_DATA_ATTRIBUTES;
      let isAllowed = isGloballyAllowed || isTagSpecificallyAllowed || isDataAttributeAllowed;

      if (opts.STRIP_EVENT_HANDLERS && onEventAttributePattern.test(attrName)) {
        isAllowed = false;
      }

      if (!isAllowed) {
        element.removeAttribute(attr.name);
        return;
      }

      if (opts.SANITIZE_URLS && (attrName === 'href' || attrName === 'src' || attrName === 'action' || attrName === 'formaction' || attrName === 'background' || attrName === 'cite' || attrName === 'longdesc' || attrName === 'usemap')) {
        attrValue = sanitizeURL(attrValue, opts.ALLOWED_PROTOCOLS);
      } else if (attrName === 'style') {
        attrValue = sanitizeStyle(attrValue, opts.ALLOWED_STYLES);
      } else {
        // For other attributes, escape quotes to prevent breaking out of the attribute
        attrValue = attrValue.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      }
      
      if (containsDangerousContent(attrValue)) {
          logError(`Manual Sanitize: Removing attribute ${attrName} due to dangerous content in value for tag <${tagName}>`);
          element.removeAttribute(attr.name);
          return;
      }

      // Only set attribute if it changed, to avoid unnecessary DOM manipulation
      if (attrValue !== attr.value) {
        element.setAttribute(attr.name, attrValue);
      }
      if (attrValue === 'about:blank#blocked' || attrValue === 'about:blank#disallowed_protocol' || attrValue === 'about:blank#invalid_format') {
          // If URL sanitization resulted in a blocked URL, remove the attribute entirely for safety
          element.removeAttribute(attr.name);
      }
    });

    Array.from(element.childNodes).forEach(child => _manualSanitizeNodeRecursive(child, opts, depth + 1));
  }

  function sanitizeURL(url, allowedProtocols = config.ALLOWED_PROTOCOLS) {
    if (typeof url !== 'string') return 'about:blank#invalid_type';
    const trimmedUrl = url.trim();

    if (!trimmedUrl) return ''; // Allow empty URLs

    // Check for explicitly dangerous protocols
    if (dangerousProtocolsPattern.test(trimmedUrl)) {
      logError(`Blocked dangerous protocol in URL: ${trimmedUrl.substring(0, 60)}`);
      return 'about:blank#blocked_protocol';
    }

    try {
      // Use the URL constructor to parse and validate the URL structure.
      // It also helps normalize the URL (e.g., resolves relative paths against document base).
      // For purely client-side context without a base URL, this might be tricky for relative paths.
      // However, for attributes like href/src, the browser will resolve them against document base.
      const parsedUrl = new URL(trimmedUrl, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
      const protocol = parsedUrl.protocol.slice(0, -1).toLowerCase(); // Remove colon

      if (!allowedProtocols.includes(protocol)) {
        logError(`Blocked disallowed protocol "${protocol}" in URL: ${trimmedUrl.substring(0, 60)}`);
        return 'about:blank#disallowed_protocol';
      }
      // Return the full, potentially normalized URL
      return parsedUrl.toString();
    } catch (e) {
      // If URL parsing fails, it's likely not a valid absolute URL.
      // Check if it's a "safe" relative path (starts with /, ./, ../, or is just a path segment or #fragment)
      if (/^(?:[a-zA-Z0-9\-_.~!$&'()*+,;=:@\/%?#\[\]]+)$/.test(trimmedUrl) && !trimmedUrl.includes(':')) {
         // Allow if it looks like a simple path/fragment and has no protocol
        return sanitizeString(trimmedUrl); // Still escape entities
      }
      logError(`Invalid or potentially unsafe URL format: ${trimmedUrl.substring(0, 60)}`);
      return 'about:blank#invalid_url_format';
    }
  }

  function sanitizeStyle(styleString, allowedStyles = config.ALLOWED_STYLES) {
    if (typeof styleString !== 'string') return '';
    const output = [];
    
    styleString.split(';').forEach(declaration => {
      declaration = declaration.trim();
      if (!declaration) return;

      const colonIndex = declaration.indexOf(':');
      if (colonIndex === -1) return; // Invalid declaration

      const property = declaration.substring(0, colonIndex).trim().toLowerCase();
      const value = declaration.substring(colonIndex + 1).trim();

      if (allowedStyles.hasOwnProperty(property)) {
        const validator = allowedStyles[property];
        let isValid = false;
        if (validator instanceof RegExp) {
          isValid = validator.test(value);
        } else if (typeof validator === 'function') {
          isValid = validator(value); // Custom validation function
        }
        
        // Additional check for common CSS XSS vectors
        if (isValid && (cssExpressionPattern.test(value) || dangerousCSSTokens.test(value) || containsDangerousContent(value))) {
            logError(`Blocked dangerous CSS content in property ${property}: ${value.substring(0,60)}`);
            isValid = false;
        }

        if (isValid) {
          // Reconstruct with the original casing for property if desired, or keep lowercase
          // For simplicity and consistency, using lowercase property
          output.push(`${property}: ${value}`);
        } else {
          logError(`Blocked invalid or dangerous CSS style: ${property}: ${value.substring(0,60)}`);
        }
      } else {
        logError(`Blocked disallowed CSS property: ${property}`);
      }
    });
    return output.join('; ');
  }
  
  function containsDangerousContent(value) {
    if (typeof value !== 'string') return false;
    const lowerValue = value.toLowerCase();
    // Check for javascript:, data:, vbscript: protocols, CSS expressions, and <script tags
    if (dangerousProtocolsPattern.test(lowerValue) || 
        cssExpressionPattern.test(lowerValue) || 
        /<script[\s>]/.test(lowerValue) || // More specific script tag check
        onEventAttributePattern.test(lowerValue) // Check if value itself looks like an event handler
    ) {
        return true;
    }
    return false;
  }

  function createSafeElement(tagName, attributes = {}, content = '') {
    const lcTagName = tagName.toLowerCase();
    if (!config.ALLOWED_TAGS.includes(lcTagName)) {
      logError(`Attempted to create disallowed tag: <${lcTagName}>. Returning a span with warning.`);
      const fallbackElement = document.createElement('span');
      fallbackElement.textContent = `[XSSProtection: Disallowed tag <${sanitizeString(tagName)}>]`;
      fallbackElement.style.border = "1px dashed red";
      fallbackElement.setAttribute('data-original-tag', tagName);
      return fallbackElement;
    }

    const element = document.createElement(lcTagName);

    for (const [key, value] of Object.entries(attributes)) {
      const lcKey = key.toLowerCase();
      // Ensure value is a string before sanitization, unless it's a boolean for boolean attributes
      let valStr = (typeof value === 'boolean') ? value.toString() : String(value);

      const isGloballyAllowed = config.ALLOWED_ATTR['*'] && config.ALLOWED_ATTR['*'].includes(lcKey);
      const isTagSpecificallyAllowed = config.ALLOWED_ATTR[lcTagName] && config.ALLOWED_ATTR[lcTagName].includes(lcKey);
      const isDataAttributeAllowed = lcKey.startsWith('data-') && config.ALLOW_DATA_ATTRIBUTES;
      let isAttrAllowed = isGloballyAllowed || isTagSpecificallyAllowed || isDataAttributeAllowed;

      if (config.STRIP_EVENT_HANDLERS && onEventAttributePattern.test(lcKey)) {
        isAttrAllowed = false;
      }

      if (isAttrAllowed) {
        let safeValue = valStr;
        if (config.SANITIZE_URLS && (lcKey === 'href' || lcKey === 'src' || lcKey === 'action' || lcKey === 'formaction' || lcKey === 'background' || lcKey === 'cite' || lcKey === 'longdesc' || lcKey === 'usemap')) {
          safeValue = sanitizeURL(valStr, config.ALLOWED_PROTOCOLS);
        } else if (lcKey === 'style') {
          safeValue = sanitizeStyle(valStr, config.ALLOWED_STYLES);
        } else {
          // General sanitization for other attributes, especially important for values that might be reflected.
          safeValue = sanitizeString(valStr); 
        }
        
        if (containsDangerousContent(safeValue)) {
            logError(`Blocked dangerous content in attribute ${lcKey} for tag <${lcTagName}>`);
            continue; 
        }
        // If URL sanitization blocked the URL, don't set the attribute
        if (safeValue.startsWith('about:blank#')) {
            logError(`Skipping attribute ${lcKey} due to sanitized (blocked) URL for tag <${lcTagName}>`);
            continue;
        }
        element.setAttribute(lcKey, safeValue);
      } else {
        logError(`Blocked disallowed attribute "${lcKey}" for tag <${lcTagName}>`);
      }
    }
    
    function appendSafeContentInternal(el, item) {
        if (item instanceof Node) {
            if (item.nodeType === Node.ELEMENT_NODE) {
                const tempDiv = document.createElement('div');
                tempDiv.appendChild(item.cloneNode(true));
                _manualSanitizeNodeRecursive(tempDiv, config, 0); // Sanitize if using manual fallback
                while (tempDiv.firstChild) {
                    el.appendChild(tempDiv.firstChild);
                }
            } else { // Text nodes, comment nodes (if allowed), etc.
                el.appendChild(item.cloneNode(true)); // Clone to be safe
            }
        } else if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
            el.appendChild(document.createTextNode(String(item))); // Strings are treated as text
        } else if (item !== null && typeof item !== 'undefined') {
            el.appendChild(document.createTextNode(String(item)));
        }
    }

    if (Array.isArray(content)) {
        content.forEach(item => appendSafeContentInternal(element, item));
    } else {
        appendSafeContentInternal(element, content);
    }
    
    return element;
  }

  function safeSetInnerHTML(element, html, customOptions = {}) {
    if (!element || !(element instanceof HTMLElement)) {
      logError('safeSetInnerHTML: Invalid target element provided.');
      return;
    }
    // sanitizeHTML already handles DOMPurify or fallback
    element.innerHTML = sanitizeHTML(html, customOptions);
  }

  function protectForm(formElementOrId) {
    const form = (typeof formElementOrId === 'string')
      ? document.getElementById(formElementOrId)
      : formElementOrId;

    if (!form || form.tagName !== 'FORM') {
      logError('protectForm: Invalid form element provided.');
      return;
    }

    const tokenName = `csrf_token_${form.id || form.name || 'form'}`; // More specific token name
    let currentToken = sessionStorage.getItem(tokenName);
    if (!currentToken) {
      currentToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem(tokenName, currentToken);
    }
    
    let tokenField = form.querySelector(`input[name="${tokenName}"]`);
    if (!tokenField) {
      tokenField = document.createElement('input');
      tokenField.type = 'hidden';
      tokenField.name = tokenName;
      form.appendChild(tokenField);
    }
    tokenField.value = currentToken;

    form.addEventListener('submit', function(event) {
      const submittedTokenField = form.elements[tokenName];
      if (!submittedTokenField || submittedTokenField.value !== sessionStorage.getItem(tokenName)) {
        logError('CSRF token mismatch or missing. Submission blocked for form: ' + (form.id || form.name));
        event.preventDefault();
        event.stopPropagation(); // Stop further event propagation
        
        if (typeof window !== 'undefined' && window.ErrorDetectionSystem && typeof window.ErrorDetectionSystem.showErrorNotification === 'function') {
            window.ErrorDetectionSystem.showErrorNotification(new Error("A security token mismatch occurred. Please refresh the page and try submitting the form again."), "Form Security Error");
        }
        // Regenerate token to prevent replay after error
        const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem(tokenName, newToken);
        if(submittedTokenField) submittedTokenField.value = newToken; // update field if it exists
        else { // if it was removed, re-add it
            const newHiddenField = document.createElement('input');
            newHiddenField.type = 'hidden';
            newHiddenField.name = tokenName;
            newHiddenField.value = newToken;
            form.appendChild(newHiddenField);
        }
        return;
      }

      Array.from(form.elements).forEach(el => {
        if ((el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search' || el.type === 'url' || el.type === 'email' || el.type === 'tel' || el.type === 'password')) || el.tagName === 'TEXTAREA') {
          el.value = sanitizeString(el.value);
        }
      });
      // After successful submission (or before actual submission if not prevented), regenerate token
        const newTokenOnSuccess = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem(tokenName, newTokenOnSuccess);
        if(form.elements[tokenName]) form.elements[tokenName].value = newTokenOnSuccess;


    }, true); // Use capture phase to run before other submit listeners if needed
  }

  function initialize(customConfig = {}) {
    // Deep merge custom config with default config
    for (const key in customConfig) {
        if (customConfig.hasOwnProperty(key)) {
            if (typeof customConfig[key] === 'object' && customConfig[key] !== null && !Array.isArray(customConfig[key]) && config[key] && typeof config[key] === 'object' && key !== 'DOMPURIFY_CONFIG') {
                Object.assign(config[key], customConfig[key]);
            } else if (key === 'DOMPURIFY_CONFIG' && typeof customConfig[key] === 'object' && customConfig[key] !== null) {
                config.DOMPURIFY_CONFIG = { ...config.DOMPURIFY_CONFIG, ...customConfig[key] };
            }
            
            else {
                config[key] = customConfig[key];
            }
        }
    }
    
    if (_DOMPurify) {
      console.info('[XSSProtection] Initialized with DOMPurify support using merged config.');
    } else {
      console.warn('[XSSProtection] Initialized without DOMPurify. Manual sanitization will be used for HTML.');
    }
  }
  
  // _overrideDangerousMethods is highly intrusive and should be used with extreme caution.
  // It's generally better to explicitly use sanitization functions.
  // It's omitted by default from the public API unless specifically needed and understood.

  return {
    initialize,
    sanitizeString,
    sanitizeHTML,
    sanitizeURL,
    sanitizeStyle,
    createSafeElement,
    safeSetInnerHTML,
    protectForm,
    getConfig: () => JSON.parse(JSON.stringify(config)), // Deep copy
    _manualSanitizeNodeRecursive // Expose for testing or specific advanced cases
  };
})();

export default xssProtection;
