/**
 * XSS Protection Module
 * Provides comprehensive XSS (Cross-Site Scripting) prevention with
 * HTML sanitization, DOM purification, and context-aware escaping
 */
const xssProtection = (function() {
  // Configuration
  const config = {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'span', 'div'],
    allowedAttributes: {
      'a': ['href', 'title', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      '*': ['class', 'id', 'style']
    },
    allowedProtocols: ['http', 'https', 'mailto', 'tel'],
    allowedStyles: {
      'color': /^#(0x)?[0-9a-f]+$/i,
      'background-color': /^#(0x)?[0-9a-f]+$/i,
      'font-size': /^\d+(?:px|em|rem|%)$/,
      'text-align': /^(left|right|center|justify)$/
    },
    removeUnknownTags: true,
    stripEventHandlers: true,
    sanitizeURLs: true,
    allowDataAttributes: false,
    maxDepth: 20 // Maximum DOM depth to prevent DoS
  };

  // HTML entities mapping
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  // Dangerous patterns
  const dangerousPatterns = {
    javascript: /^javascript:/i,
    vbscript: /^vbscript:/i,
    data: /^data:/i,
    expression: /expression\s*\(/i,
    onEvent: /^on\w+$/i
  };

  /**
     * Sanitize a string for safe output in HTML context
     * @param {string} input - String to sanitize
     * @returns {string} - Sanitized string
     */
  function sanitizeString(input) {
    if (typeof input !== 'string') {
      return '';
    }

    return input.replace(/[&<>"'`=\/]/g, char => htmlEntities[char]);
  }

  /**
     * Sanitize HTML content with full purification
     * @param {string} html - HTML to sanitize
     * @param {Object} options - Sanitization options
     * @returns {string} - Sanitized HTML
     */
  function sanitizeHTML(html, options = {}) {
    if (typeof html !== 'string') {
      return '';
    }

    // Merge options with defaults
    const opts = { ...config, ...options };

    // Create a temporary container
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Recursive sanitization
    sanitizeNode(temp, opts, 0);

    return temp.innerHTML;
  }

  /**
     * Recursively sanitize DOM nodes
     * @private
     */
  function sanitizeNode(node, opts, depth) {
    // Depth check to prevent DoS
    if (depth > opts.maxDepth) {
      node.parentNode?.removeChild(node);
      return;
    }

    // Process all child nodes
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        sanitizeElement(child, opts, depth + 1);
      } else if (child.nodeType === Node.TEXT_NODE) {
        // Text nodes are safe, but we might want to sanitize specific patterns
        if (opts.sanitizeText) {
          child.textContent = sanitizeString(child.textContent);
        }
      } else if (child.nodeType === Node.COMMENT_NODE) {
        // Remove comments by default
        if (!opts.allowComments) {
          child.parentNode?.removeChild(child);
        }
      }
    });
  }

  /**
     * Sanitize an element and its attributes
     * @private
     */
  function sanitizeElement(element, opts, depth) {
    const tagName = element.tagName.toLowerCase();

    // Remove disallowed tags
    if (!opts.allowedTags.includes(tagName)) {
      if (opts.removeUnknownTags) {
        element.parentNode?.removeChild(element);
      } else {
        // Convert to text node
        const text = document.createTextNode(element.outerHTML);
        element.parentNode?.replaceChild(text, element);
      }
      return;
    }

    // Sanitize attributes
    sanitizeAttributes(element, opts);

    // Recursively sanitize children
    sanitizeNode(element, opts, depth);
  }

  /**
     * Sanitize element attributes
     * @private
     */
  function sanitizeAttributes(element, opts) {
    const tagName = element.tagName.toLowerCase();
    const attributes = Array.from(element.attributes);

    attributes.forEach(attr => {
      const attrName = attr.name.toLowerCase();

      // Check if attribute is allowed
      let isAllowed = false;

      // Check tag-specific attributes
      if (opts.allowedAttributes[tagName] &&
                opts.allowedAttributes[tagName].includes(attrName)) {
        isAllowed = true;
      }

      // Check global attributes
      if (opts.allowedAttributes['*'] &&
                opts.allowedAttributes['*'].includes(attrName)) {
        isAllowed = true;
      }

      // Handle data attributes
      if (attrName.startsWith('data-') && opts.allowDataAttributes) {
        isAllowed = true;
      }

      // Remove event handlers
      if (opts.stripEventHandlers && dangerousPatterns.onEvent.test(attrName)) {
        isAllowed = false;
      }

      if (!isAllowed) {
        element.removeAttribute(attr.name);
        return;
      }

      // Sanitize attribute value
      let value = attr.value;

      // Special handling for URLs
      if (attrName === 'href' || attrName === 'src' || attrName === 'action') {
        value = sanitizeURL(value, opts);
      }

      // Special handling for style
      if (attrName === 'style') {
        value = sanitizeStyle(value, opts);
      }

      // Check for dangerous patterns
      if (containsDangerousPattern(value)) {
        element.removeAttribute(attr.name);
        return;
      }

      // Update attribute value
      if (value !== attr.value) {
        element.setAttribute(attr.name, value);
      }
    });
  }

  /**
     * Sanitize URL values
     * @private
     */
  function sanitizeURL(url, opts) {
    if (!url) {return '';}

    url = url.trim();

    // Check for dangerous protocols
    for (const [pattern, regex] of Object.entries(dangerousPatterns)) {
      if (regex.test(url)) {
        return '#';
      }
    }

    // Parse URL
    try {
      const parsedUrl = new URL(url, window.location.href);

      // Check allowed protocols
      if (!opts.allowedProtocols.includes(parsedUrl.protocol.replace(':', ''))) {
        return '#';
      }

      // Sanitize the URL
      url = parsedUrl.toString();
    } catch (e) {
      // Invalid URL - check if it's a relative path
      if (!url.startsWith('/') && !url.startsWith('./') && !url.startsWith('../')) {
        return '#';
      }
    }

    // Additional URL sanitization
    url = url.replace(/[<>"']/g, char => htmlEntities[char]);

    return url;
  }

  /**
     * Sanitize style attribute values
     * @private
     */
  function sanitizeStyle(style, opts) {
    if (!style) {return '';}

    const styles = style.split(';')
      .map(s => s.trim())
      .filter(Boolean);

    const sanitizedStyles = styles.filter(style => {
      const [property, value] = style.split(':').map(s => s.trim());

      if (!property || !value) {return false;}

      // Check if style property is allowed
      if (opts.allowedStyles[property]) {
        const pattern = opts.allowedStyles[property];

        if (pattern instanceof RegExp) {
          return pattern.test(value);
        } else if (typeof pattern === 'function') {
          return pattern(value);
        }
      }

      // Check for dangerous patterns
      if (containsDangerousPattern(value)) {
        return false;
      }

      return false;
    });

    return sanitizedStyles.join('; ');
  }

  /**
     * Check if a value contains dangerous patterns
     * @private
     */
  function containsDangerousPattern(value) {
    if (typeof value !== 'string') {return false;}

    value = value.toLowerCase();

    // Check for script expressions
    if (dangerousPatterns.expression.test(value)) {
      return true;
    }

    // Check for javascript: protocol
    if (dangerousPatterns.javascript.test(value)) {
      return true;
    }

    // Check for data: URLs (unless explicitly allowed)
    if (dangerousPatterns.data.test(value)) {
      return true;
    }

    // Check for HTML entities that could be script
    if (/&#x?[0-9a-f]+;/i.test(value)) {
      const decoded = decodeHTMLEntities(value);
      if (decoded !== value) {
        return containsDangerousPattern(decoded);
      }
    }

    return false;
  }

  /**
     * Decode HTML entities
     * @private
     */
  function decodeHTMLEntities(str) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  }

  /**
     * Create a safe element with sanitized attributes
     * @param {string} tagName - Element tag name
     * @param {Object} attributes - Element attributes
     * @param {string} content - Element content
     * @returns {HTMLElement} - Safe element
     */
  function createSafeElement(tagName, attributes = {}, content = '') {
    // Sanitize tag name
    tagName = tagName.toLowerCase();
    if (!config.allowedTags.includes(tagName)) {
      throw new Error(`Tag "${tagName}" is not allowed`);
    }

    const element = document.createElement(tagName);

    // Add attributes safely
    for (const [key, value] of Object.entries(attributes)) {
      const safeKey = key.toLowerCase();
      let safeValue = String(value);

      // Check if attribute is allowed
      if (!isAttributeAllowed(tagName, safeKey)) {
        continue;
      }

      // Sanitize specific attribute types
      if (safeKey === 'href' || safeKey === 'src') {
        safeValue = sanitizeURL(safeValue, config);
      } else if (safeKey === 'style') {
        safeValue = sanitizeStyle(safeValue, config);
      } else {
        safeValue = sanitizeString(safeValue);
      }

      element.setAttribute(safeKey, safeValue);
    }

    // Add content safely
    if (content) {
      if (typeof content === 'string') {
        element.textContent = content;
      } else if (content instanceof Node) {
        // Clone and sanitize the node
        const sanitizedNode = content.cloneNode(true);
        sanitizeNode(sanitizedNode, config, 0);
        element.appendChild(sanitizedNode);
      }
    }

    return element;
  }

  /**
     * Check if an attribute is allowed
     * @private
     */
  function isAttributeAllowed(tagName, attrName) {
    if (config.allowedAttributes[tagName] &&
            config.allowedAttributes[tagName].includes(attrName)) {
      return true;
    }

    if (config.allowedAttributes['*'] &&
            config.allowedAttributes['*'].includes(attrName)) {
      return true;
    }

    if (attrName.startsWith('data-') && config.allowDataAttributes) {
      return true;
    }

    return false;
  }

  /**
     * Safely set innerHTML with XSS protection
     * @param {HTMLElement} element - Element to update
     * @param {string} html - HTML content
     * @param {Object} options - Sanitization options
     */
  function safeInnerHTML(element, html, options = {}) {
    if (!element) {return;}

    element.innerHTML = sanitizeHTML(html, options);
  }

  /**
     * Protect a form from XSS
     * @param {string|HTMLFormElement} form - Form ID or element
     */
  function protectForm(form) {
    if (typeof form === 'string') {
      form = document.getElementById(form);
    }

    if (!form || form.tagName !== 'FORM') {return;}

    // Add submit handler
    form.addEventListener('submit', function(e) {
      // Sanitize all text inputs
      const inputs = form.querySelectorAll('input[type="text"], textarea');
      inputs.forEach(input => {
        input.value = sanitizeString(input.value);
      });
    });

    // Add input sanitization on change
    form.addEventListener('input', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        const sanitized = sanitizeString(e.target.value);
        if (sanitized !== e.target.value) {
          e.target.value = sanitized;
        }
      }
    });
  }

  /**
     * Initialize XSS protection
     * @param {Object} options - Configuration options
     */
  function initialize(options = {}) {
    // Update configuration
    Object.assign(config, options);

    // Protect all forms
    if (options.autoProtectForms !== false) {
      document.querySelectorAll('form').forEach(protectForm);
    }

    // Override dangerous DOM methods if configured
    if (options.overrideDangerousMethods) {
      overrideDangerousMethods();
    }
  }

  /**
     * Override dangerous DOM methods with safe versions
     * @private
     */
  function overrideDangerousMethods() {
    // Override innerHTML
    const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    Object.defineProperty(Element.prototype, 'innerHTML', {
      set: function(value) {
        const sanitized = sanitizeHTML(value);
        originalInnerHTML.set.call(this, sanitized);
      },
      get: originalInnerHTML.get
    });

    // Override outerHTML
    const originalOuterHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML');
    Object.defineProperty(Element.prototype, 'outerHTML', {
      set: function(value) {
        const sanitized = sanitizeHTML(value);
        originalOuterHTML.set.call(this, sanitized);
      },
      get: originalOuterHTML.get
    });

    // Override insertAdjacentHTML
    const originalInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
    Element.prototype.insertAdjacentHTML = function(position, html) {
      const sanitized = sanitizeHTML(html);
      originalInsertAdjacentHTML.call(this, position, sanitized);
    };
  }

  // Public API
  return {
    sanitizeString,
    sanitizeHTML,
    sanitizeURL,
    createSafeElement,
    safeInnerHTML,
    protectForm,
    initialize,
    config
  };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = xssProtection;
} else {
  window.xssProtection = xssProtection;
}
