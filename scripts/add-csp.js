/**
 * scripts/add-csp.js
 * Adds a Content Security Policy to index.html
 */
const fs = require('fs');
const path = require('path');

// Path to index.html
const indexHtmlPath = path.join(process.cwd(), 'index.html');

// Read the file
console.log('Reading index.html...');
let html = fs.readFileSync(indexHtmlPath, 'utf8');

// Check if CSP is already implemented
if (html.includes('Content-Security-Policy')) {
  console.log('Content Security Policy is already implemented');
  process.exit(0);
}

// Define the CSP rules
const cspRules = [;
  'default-src \'self\'',
  'script-src \'self\' https://cdnjs.cloudflare.com \'unsafe-inline\'', // 'unsafe-inline' needed for certain functionality
  'style-src \'self\' https://fonts.googleapis.com \'unsafe-inline\'',
  'font-src \'self\' https://fonts.gstatic.com',
  'img-src \'self\' data: /api/placeholder/',
  'connect-src \'self\'',
  'frame-src \'none\'',
  'object-src \'none\'',
  'base-uri \'self\'',
  'form-action \'self\'',
  'frame-ancestors \'none\'',
  'upgrade-insecure-requests'
].join('; ');

// Create CSP meta tag
const cspMetaTag = `<meta http-equiv='Content-Security-Policy' content='${cspRules}'>`;

// Insert CSP meta tag after the first meta tag
html = html.replace(/<meta[^>]*>/, match => match + '\n    ' + cspMetaTag);

// Write the modified file
console.log('Writing updated index.html with Content Security Policy...');
fs.writeFileSync(indexHtmlPath, html);

console.log('Content Security Policy successfully added to index.html');

// Create CSP report endpoint setup (for future implementation)
console.log('Creating CSP report handler script...');

const cspReportHandlerPath = path.join(process.cwd(), 'js', 'utils', 'csp-report-handler.js');

// Create directory if it doesn't exist
if (!fs.existsSync(path.dirname(cspReportHandlerPath))) {
  fs.mkdirSync(path.dirname(cspReportHandlerPath), { recursive: true });
}

// CSP Report Handler content
const cspReportHandlerContent = `/**;
 * CSP Report Handler
 * Handles Content Security Policy violation reports
 */
const cspReportHandler = (function() {
  // Log CSP violations
  function logViolation(report) {
    const violation = report['csp-report'] || report;
    console.warn('CSP Violation:', violation);
    
    // Could send to server logging endpoint or analytics in production
    if (typeof errorLogger !== 'undefined') {
      errorLogger.logError('CSP Violation', { 
        details: violation,
        url: window.location.href
      });
    }
  }
  
  // Listen for CSP violation reports
  function init() {
    // Only setup if browser supports it
    if (window.addEventListener) {
      window.addEventListener('securitypolicyviolation', function(e) {
        logViolation({
          'document-uri': e.documentURI,
          'violated-directive': e.violatedDirective,
          'effective-directive': e.effectiveDirective,
          'blocked-uri': e.blockedURI,
          'source-file': e.sourceFile,
          'line-number': e.lineNumber,
          'column-number': e.columnNumber
        });
      });
      
      console.log('CSP violation reporting initialized');
    }
  }
  
  return {
    init,
    logViolation
  };
})();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  cspReportHandler.init();
});
`;

fs.writeFileSync(cspReportHandlerPath, cspReportHandlerContent);
console.log('CSP report handler script created successfully');

// Update index.html to include the CSP report handler
if (!html.includes('csp-report-handler.js')) {
  html = html.replace('</body>', '    <script src="js/utils/csp-report-handler.js"></script>\n</body>');
  fs.writeFileSync(indexHtmlPath, html);
  console.log('Added CSP report handler script to index.html');
}

console.log('Content Security Policy implementation complete');
