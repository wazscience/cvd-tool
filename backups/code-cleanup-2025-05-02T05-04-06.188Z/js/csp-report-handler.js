/**
 * CSP Report Handler Module
 * Handles Content Security Policy violation reports, logging, and analysis
 * for security monitoring and compliance
 */
const cspReportHandler = (function() {
  // Configuration
  const config = {
    reportUri: '/csp-report',  // Endpoint for CSP reports
    maxReports: 100,           // Maximum reports to store in memory
    batchSize: 10,             // Reports to send in a batch
    debounceTime: 1000,        // Milliseconds to wait before sending batched reports
    allowedViolations: [],     // Violations to ignore
    logToConsole: true,        // Log violations to console
    storageKey: 'csp_reports',
    reportToServer: false,     // Send reports to server
    sampleRate: 1.0,          // Sampling rate for reports (1.0 = 100%)
    customFields: {}          // Additional fields to include in reports
  };

  // State tracking
  let reportQueue = [];
  let debounceTimer = null;
  let violationStats = {
    total: 0,
    byDirective: {},
    bySource: {},
    byType: {}
  };

  /**
     * Initialize CSP report handler
     * @param {Object} options - Configuration options
     */
  function initialize(options = {}) {
    // Merge options with defaults
    Object.assign(config, options);

    // Load existing reports
    loadStoredReports();

    // Setup CSP report event listener
    setupReportListener();

    // Setup periodic cleanup
    setupCleanup();

    // Log initialization
    if (config.logToConsole) {
      console.info('CSP Report Handler initialized', config);
    }
  }

  /**
     * Load stored reports from storage
     * @private
     */
  function loadStoredReports() {
    try {
      let storedReports;

      if (window.secureStorage) {
        storedReports = window.secureStorage.getItem(config.storageKey);
      } else {
        const stored = localStorage.getItem(config.storageKey);
        if (stored) {
          storedReports = JSON.parse(stored);
        }
      }

      if (storedReports && Array.isArray(storedReports)) {
        reportQueue = storedReports.slice(-config.maxReports);
        updateStats(reportQueue);
      }
    } catch (error) {
      console.warn('Failed to load stored CSP reports:', error);
    }
  }

  /**
     * Setup CSP report event listener
     * @private
     */
  function setupReportListener() {
    // Listen for security policy violation events
    document.addEventListener('securitypolicyviolation', handleCSPViolation);

    // Setup custom report endpoint if needed
    if (config.reportToServer) {
      setupReportEndpoint();
    }
  }

  /**
     * Handle CSP violation event
     * @private
     */
  function handleCSPViolation(event) {
    // Apply sampling rate
    if (Math.random() > config.sampleRate) {
      return;
    }

    // Create report object
    const report = {
      timestamp: new Date().toISOString(),
      documentUri: event.documentURI,
      referrer: event.referrer,
      violatedDirective: event.violatedDirective,
      effectiveDirective: event.effectiveDirective,
      originalPolicy: event.originalPolicy,
      blockedUri: event.blockedURI,
      statusCode: event.statusCode,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
      columnNumber: event.columnNumber,
      sample: event.sample,
      disposition: event.disposition,

      // Browser info
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,

      // Custom fields
      ...config.customFields,

      // Page context
      pageUrl: window.location.href,
      pageTitle: document.title,

      // Additional metadata
      reportId: generateReportId(),
      version: '1.0.0'
    };

    // Check if violation should be ignored
    if (shouldIgnoreViolation(report)) {
      return;
    }

    // Process report
    processReport(report);
  }

  /**
     * Process CSP report
     * @private
     */
  function processReport(report) {
    // Add to queue
    reportQueue.push(report);

    // Trim queue if needed
    if (reportQueue.length > config.maxReports) {
      reportQueue = reportQueue.slice(-config.maxReports);
    }

    // Update statistics
    updateStats([report]);

    // Log to console if enabled
    if (config.logToConsole) {
      logViolation(report);
    }

    // Store reports
    storeReports();

    // Schedule batch sending
    scheduleBatchSend();

    // Dispatch custom event
    const event = new CustomEvent('cspViolation', {
      detail: report
    });
    document.dispatchEvent(event);
  }

  /**
     * Check if violation should be ignored
     * @private
     */
  function shouldIgnoreViolation(report) {
    // Check allowed violations
    if (config.allowedViolations.length > 0) {
      for (const allowed of config.allowedViolations) {
        if (typeof allowed === 'string' && report.violatedDirective.includes(allowed)) {
          return true;
        }
        if (allowed instanceof RegExp && allowed.test(report.violatedDirective)) {
          return true;
        }
        if (typeof allowed === 'function' && allowed(report)) {
          return true;
        }
      }
    }

    // Ignore self-reports (browser extension conflicts)
    if (report.blockedUri === 'self' || report.blockedUri === 'about') {
      return true;
    }

    // Ignore inline styles/scripts if allowed by policy
    if (report.violatedDirective === 'style-src-elem' &&
            report.originalPolicy.includes('\'unsafe-inline\'')) {
      return true;
    }

    return false;
  }

  /**
     * Update violation statistics
     * @private
     */
  function updateStats(reports) {
    reports.forEach(report => {
      violationStats.total++;

      // By directive
      const directive = report.effectiveDirective || report.violatedDirective;
      violationStats.byDirective[directive] = (violationStats.byDirective[directive] || 0) + 1;

      // By source
      const source = report.sourceFile || 'unknown';
      violationStats.bySource[source] = (violationStats.bySource[source] || 0) + 1;

      // By type
      const type = getViolationType(report);
      violationStats.byType[type] = (violationStats.byType[type] || 0) + 1;
    });
  }

  /**
     * Get violation type from report
     * @private
     */
  function getViolationType(report) {
    if (report.violatedDirective.includes('script-src')) {
      return 'script';
    } else if (report.violatedDirective.includes('style-src')) {
      return 'style';
    } else if (report.violatedDirective.includes('img-src')) {
      return 'image';
    } else if (report.violatedDirective.includes('font-src')) {
      return 'font';
    } else if (report.violatedDirective.includes('connect-src')) {
      return 'connection';
    } else {
      return 'other';
    }
  }

  /**
     * Log violation to console
     * @private
     */
  function logViolation(report) {
    const logStyle = 'background: #ff0000; color: #fff; padding: 2px 4px; border-radius: 2px;';

    console.group('%cCSP Violation', logStyle);
    console.log('Directive:', report.violatedDirective);
    console.log('Blocked URI:', report.blockedUri);
    console.log('Source:', report.sourceFile);
    console.log('Line:', report.lineNumber);
    console.log('Column:', report.columnNumber);

    if (report.sample) {
      console.log('Sample:', report.sample);
    }

    console.log('Full Report:', report);
    console.groupEnd();
  }

  /**
     * Store reports in local storage
     * @private
     */
  function storeReports() {
    try {
      if (window.secureStorage) {
        window.secureStorage.setItem(config.storageKey, reportQueue);
      } else {
        localStorage.setItem(config.storageKey, JSON.stringify(reportQueue));
      }
    } catch (error) {
      console.warn('Failed to store CSP reports:', error);
    }
  }

  /**
     * Schedule batch sending of reports
     * @private
     */
  function scheduleBatchSend() {
    if (!config.reportToServer) {return;}

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    debounceTimer = setTimeout(() => {
      sendBatchedReports();
    }, config.debounceTime);
  }

  /**
     * Send batched reports to server
     * @private
     */
  async function sendBatchedReports() {
    if (!config.reportToServer || reportQueue.length === 0) {return;}

    const batch = reportQueue.splice(0, config.batchSize);

    try {
      const response = await fetch(config.reportUri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/csp-report',
          'X-CSP-Report-Batch': 'true'
        },
        body: JSON.stringify(batch),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update stored reports
      storeReports();

    } catch (error) {
      console.error('Failed to send CSP reports:', error);

      // Put reports back in queue
      reportQueue = batch.concat(reportQueue);

      // Schedule retry
      setTimeout(() => {
        sendBatchedReports();
      }, 5000);
    }
  }

  /**
     * Setup periodic cleanup
     * @private
     */
  function setupCleanup() {
    // Clean up old reports every hour
    setInterval(() => {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

      reportQueue = reportQueue.filter(report => {
        const reportTime = new Date(report.timestamp).getTime();
        return reportTime > oneDayAgo;
      });

      storeReports();
    }, 60 * 60 * 1000);
  }

  /**
     * Generate unique report ID
     * @private
     */
  function generateReportId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
     * Get violation statistics
     * @returns {Object} - Statistics object
     */
  function getStats() {
    return {
      ...violationStats,
      queueSize: reportQueue.length,
      oldestReport: reportQueue[0]?.timestamp,
      newestReport: reportQueue[reportQueue.length - 1]?.timestamp
    };
  }

  /**
     * Get all reports
     * @returns {Array} - Array of reports
     */
  function getReports() {
    return [...reportQueue];
  }

  /**
     * Clear all reports
     */
  function clearReports() {
    reportQueue = [];
    violationStats = {
      total: 0,
      byDirective: {},
      bySource: {},
      byType: {}
    };

    try {
      if (window.secureStorage) {
        window.secureStorage.removeItem(config.storageKey);
      } else {
        localStorage.removeItem(config.storageKey);
      }
    } catch (error) {
      console.warn('Failed to clear CSP reports:', error);
    }
  }

  /**
     * Manually report a violation
     * @param {Object} violation - Violation object
     */
  function reportViolation(violation) {
    const report = {
      timestamp: new Date().toISOString(),
      documentUri: window.location.href,
      referrer: document.referrer,
      violatedDirective: violation.directive || 'unknown',
      effectiveDirective: violation.directive || 'unknown',
      originalPolicy: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || '',
      blockedUri: violation.url || '',
      sourceFile: violation.source || '',
      lineNumber: violation.line || 0,
      columnNumber: violation.column || 0,
      sample: violation.sample || '',
      disposition: 'report',
      ...violation
    };

    processReport(report);
  }

  /**
     * Get report summary for debugging
     * @returns {Object} - Summary object
     */
  function getSummary() {
    const stats = getStats();

    return {
      total: stats.total,
      byDirective: Object.entries(stats.byDirective)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      byType: Object.entries(stats.byType)
        .sort((a, b) => b[1] - a[1]),
      uniqueSources: Object.keys(stats.bySource).length,
      queueSize: stats.queueSize,
      timeRange: {
        oldest: stats.oldestReport,
        newest: stats.newestReport
      }
    };
  }

  // Public API
  return {
    initialize,
    getStats,
    getReports,
    clearReports,
    reportViolation,
    getSummary,
    config
  };
})();

// Auto-initialize if document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    cspReportHandler.initialize();
  });
} else {
  cspReportHandler.initialize();
}

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = cspReportHandler;
} else {
  window.cspReportHandler = cspReportHandler;
}
