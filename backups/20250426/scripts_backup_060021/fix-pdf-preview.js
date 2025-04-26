/**
 * scripts/fix-pdf-preview.js
 * Enhances PDF export functionality with accurate preview and improved performance
 */
const fs = require('fs');
const path = require('path');

// Paths
const jsDir = path.join(process.cwd(), 'js');
const utilsDir = path.join(jsDir, 'utils');
const pdfExportPath = path.join(utilsDir, 'pdf-export.js');
const cssPath = path.join(process.cwd(), 'styles.css');
const indexHtmlPath = path.join(process.cwd(), 'index.html');

// Create directories if they don't exist
if (!fs.existsSync(utilsDir)) {
  fs.mkdirSync(utilsDir, { recursive: true });
  console.log('Created utils directory');
}

// Create PDF export utility
console.log('Creating PDF export utility...');

const pdfExportContent = `/**
 * PDF Export Utility
 * Provides enhanced PDF export functionality with accurate preview
 */
const pdfExport = (function() {
  // Configuration
  const config = {
    defaultFilename: 'cvd_risk_assessment',
    defaultPageSize: 'a4',
    defaultOrientation: 'portrait',
    includeHeader: true,
    includeFooter: true,
    includeDisclaimer: true,
    compressionLevel: 'MEDIUM', // NONE, FAST, MEDIUM, SLOW
    exportQuality: 0.95, // 0-1
    useWorker: true, // Use web worker for better performance
    maxPreviewElements: 1000, // Limit elements in preview to improve performance
    debugMode: false
  };
  
  // Store library instance
  let html2pdfInstance = null;
  
  /**
   * Initialize the PDF export utility
   * @returns {Promise} - Resolves when initialized
   */
  async function init() {
    // Check if html2pdf is available
    if (typeof html2pdf === 'undefined') {
      console.warn('html2pdf library not available. PDF export will not work.');
      return Promise.reject(new Error('html2pdf library not available'));
    }
    
    // Set compression level
    if (html2pdf.Worker) {
      switch (config.compressionLevel) {
        case 'NONE':
          html2pdf.Worker.prototype.doCallback = function(callback) {
            callback(this);
            return this;
          };
          break;
        case 'FAST':
          // Default
          break;
        case 'MEDIUM':
          // Default
          break;
        case 'SLOW':
          // Maximum compression (slower)
          if (typeof jsPDF !== 'undefined' && jsPDF.API) {
            jsPDF.API.compress = true;
          }
          break;
      }
    }
    
    return Promise.resolve();
  }
  
  /**
   * Clean up the HTML content for printing
   * @param {HTMLElement} element - Element to clean
   * @returns {HTMLElement} - Cleaned element clone
   */
  function cleanForPrint(element) {
    // Create a deep clone to avoid modifying the original
    const clone = element.cloneNode(true);
    
    // Remove elements that shouldn't be printed
    const nonPrintableSelectors = [
      '.export-section',
      '.form-actions',
      'button.export-btn',
      'button.secondary-btn',
      '.no-print',
      '.modal',
      'script',
      'style#loading-indicator-styles',
      '.loading-indicator',
      '.field-warning-icon'
    ];
    
    nonPrintableSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    });
    
    // Add print-specific styling
    clone.style.backgroundColor = 'white';
    clone.style.padding = '20px';
    clone.style.maxWidth = '100%';
    
    // Add page breaks where needed
    const pageBreakSelectors = [
      '.treatment-recommendations',
      '.comparison-conclusion',
      '.guidelines-citation'
    ];
    
    pageBreakSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.pageBreakBefore = 'always';
        
        // Add some spacing
        el.style.paddingTop = '10px';
      });
    });
    
    // Remove the disclaimer section if not included
    if (!config.includeDisclaimer) {
      const disclaimer = clone.querySelector('.legal-disclaimer');
      if (disclaimer && disclaimer.parentNode) {
        disclaimer.parentNode.removeChild(disclaimer);
      }
    }
    
    return clone;
  }
  
  /**
   * Generate header content for PDF
   * @param {Object} data - Export data
   * @returns {HTMLElement} - Header element
   */
  function createHeader(data = {}) {
    const header = document.createElement('div');
    header.className = 'pdf-header';
    
    const logoContainer = document.createElement('div');
    logoContainer.className = 'pdf-logo-container';
    
    const title = document.createElement('h1');
    title.textContent = 'CVD Risk Toolkit';
    title.className = 'pdf-title';
    
    const subtitle = document.createElement('div');
    subtitle.textContent = 'with Lp(a) Post-Test Modifier';
    subtitle.className = 'pdf-subtitle';
    
    logoContainer.appendChild(title);
    logoContainer.appendChild(subtitle);
    
    const dateContainer = document.createElement('div');
    dateContainer.className = 'pdf-date';
    dateContainer.textContent = new Date().toLocaleDateString();
    
    header.appendChild(logoContainer);
    header.appendChild(dateContainer);
    
    return header;
  }
  
  /**
   * Generate footer content for PDF
   * @param {Object} data - Export data
   * @returns {HTMLElement} - Footer element
   */
  function createFooter(data = {}) {
    const footer = document.createElement('div');
    footer.className = 'pdf-footer';
    
    const disclaimer = document.createElement('div');
    disclaimer.className = 'pdf-disclaimer';
    disclaimer.textContent = 'This report is intended for healthcare professional use only. Clinical judgment required.';
    
    const pageInfo = document.createElement('div');
    pageInfo.className = 'pdf-page-info';
    pageInfo.innerHTML = 'Page <span class="pageNumber"></span> of <span class="totalPages"></span>';
    
    footer.appendChild(disclaimer);
    footer.appendChild(pageInfo);
    
    return footer;
  }
  
  /**
   * Create PDF export preview
   * @param {HTMLElement} contentElement - Element containing content to export
   * @param {Object} options - Preview options
   * @returns {HTMLElement} - Preview element
   */
  function createPreview(contentElement, options = {}) {
    if (!contentElement) {
      console.error('No content element provided for PDF preview');
      return document.createElement('div');
    }
    
    // Clean content for print
    const cleanedContent = cleanForPrint(contentElement);
    
    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'pdf-preview-container';
    
    // Add page-specific styling
    previewContainer.style.width = '8.27in'; // A4 width
    previewContainer.style.minHeight = '11.69in'; // A4 height
    previewContainer.style.padding = '0.5in';
    previewContainer.style.backgroundColor = 'white';
    previewContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
    previewContainer.style.margin = '0 auto';
    previewContainer.style.position = 'relative';
    
    // Add header if needed
    if (config.includeHeader && options.includeHeader !== false) {
      const header = createHeader(options);
      previewContainer.appendChild(header);
    }
    
    // Add main content
    const contentContainer = document.createElement('div');
    contentContainer.className = 'pdf-content';
    contentContainer.style.minHeight = config.includeFooter ? 'calc(100% - 100px)' : '100%';
    contentContainer.appendChild(cleanedContent);
    previewContainer.appendChild(contentContainer);
    
    // Add footer if needed
    if (config.includeFooter && options.includeFooter !== false) {
      const footer = createFooter(options);
      previewContainer.appendChild(footer);
    }
    
    // Optimize preview by limiting number of elements
    limitPreviewElements(previewContainer);
    
    return previewContainer;
  }
  
  /**
   * Limit the number of elements in preview to improve performance
   * @param {HTMLElement} previewElement - Preview element
   */
  function limitPreviewElements(previewElement) {
    // Count total elements
    const allElements = previewElement.querySelectorAll('*');
    const totalElements = allElements.length;
    
    if (totalElements > config.maxPreviewElements) {
      console.warn(\`Preview contains \${totalElements} elements, which may affect performance. Simplifying...\`);
      
      // Identify content sections to simplify
      const sections = previewElement.querySelectorAll(
        '.results-card, .comparison-details, .treatment-recommendations, .guidelines-citation'
      );
      
      // Simplify each section to reduce element count
      sections.forEach(section => {
        // Save original display
        const originalDisplay = section.style.display;
        
        // Hide complex content if needed
        if (allElements.length > config.maxPreviewElements) {
          const complexContent = section.querySelectorAll('.risk-visualization, .comparison-chart, .chart-container');
          complexContent.forEach(el => {
            el.style.display = 'none';
          });
        }
        
        // Simplify tables if needed
        if (allElements.length > config.maxPreviewElements) {
          const tables = section.querySelectorAll('table, .table-row, .table-cell');
          tables.forEach((table, index) => {
            if (index > 10) { // Keep first 10 rows
              table.style.display = 'none';
            }
          });
        }
        
        // Restore original display
        section.style.display = originalDisplay;
      });
      
      // If still too many elements, add placeholder
      if (previewElement.querySelectorAll('*').length > config.maxPreviewElements) {
        const placeholderNote = document.createElement('div');
        placeholderNote.className = 'pdf-preview-note';
        placeholderNote.textContent = 'Preview simplified for performance. Full content will be included in the exported PDF.';
        placeholderNote.style.padding = '10px';
        placeholderNote.style.backgroundColor = '#f8f9fa';
        placeholderNote.style.borderRadius = '4px';
        placeholderNote.style.margin = '10px 0';
        placeholderNote.style.fontSize = '14px';
        placeholderNote.style.fontStyle = 'italic';
        
        // Add placeholder note to preview
        previewElement.insertBefore(placeholderNote, previewElement.firstChild.nextSibling);
      }
    }
  }
  
  /**
   * Show PDF export preview in a modal
   * @param {HTMLElement} contentElement - Element containing content to export
   * @param {Object} options - Preview options
   * @returns {Promise<HTMLElement>} - Resolves with the preview element
   */
  function showPreview(contentElement, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Show loading indicator if available
        if (window.loadingIndicator) {
          window.loadingIndicator.show('pdf-preview-loading', {
            message: 'Generating PDF preview...',
            useOverlay: true
          });
        }
        
        // Create the preview asynchronously
        setTimeout(() => {
          try {
            const previewElement = createPreview(contentElement, options);
            
            // Get the modal element
            const modal = document.getElementById('pdf-preview-modal');
            if (!modal) {
              console.error('PDF preview modal not found');
              reject(new Error('PDF preview modal not found'));
              return;
            }
            
            // Update the modal content
            const modalContent = modal.querySelector('#pdf-preview-content');
            if (modalContent) {
              // Clear previous content
              modalContent.innerHTML = '';
              
              // Add preview
              modalContent.appendChild(previewElement);
              
              // Show the modal
              modal.style.display = 'block';
              
              // Setup option toggles
              setupPreviewOptions(modal, previewElement, options);
              
              // Setup download button
              setupDownloadButton(modal, contentElement, options);
              
              // Hide loading indicator
              if (window.loadingIndicator) {
                window.loadingIndicator.hide('pdf-preview-loading');
              }
              
              resolve(previewElement);
            } else {
              console.error('PDF preview content container not found');
              reject(new Error('PDF preview content container not found'));
            }
          } catch (error) {
            console.error('Error creating PDF preview:', error);
            reject(error);
            
            // Hide loading indicator
            if (window.loadingIndicator) {
              window.loadingIndicator.hide('pdf-preview-loading');
            }
          }
        }, 100); // Small delay to allow loading indicator to show
      } catch (error) {
        console.error('Error showing PDF preview:', error);
        reject(error);
        
        // Hide loading indicator
        if (window.loadingIndicator) {
          window.loadingIndicator.hide('pdf-preview-loading');
        }
      }
    });
  }
  
  /**
   * Setup preview options in the modal
   * @param {HTMLElement} modal - Modal element
   * @param {HTMLElement} previewElement - Preview element
   * @param {Object} options - Preview options
   */
  function setupPreviewOptions(modal, previewElement, options) {
    // Header toggle
    const headerToggle = modal.querySelector('#pdf-include-logo');
    if (headerToggle) {
      headerToggle.checked = options.includeHeader !== false;
      headerToggle.addEventListener('change', function() {
        // Update preview
        const header = previewElement.querySelector('.pdf-header');
        if (header) {
          header.style.display = this.checked ? 'flex' : 'none';
        }
        
        // Update options
        options.includeHeader = this.checked;
      });
    }
    
    // Disclaimer toggle
    const disclaimerToggle = modal.querySelector('#pdf-include-disclaimer');
    if (disclaimerToggle) {
      disclaimerToggle.checked = options.includeDisclaimer !== false;
      disclaimerToggle.addEventListener('change', function() {
        // Update preview
        const disclaimer = previewElement.querySelector('.legal-disclaimer');
        if (disclaimer) {
          disclaimer.style.display = this.checked ? 'block' : 'none';
        }
        
        // Update options
        options.includeDisclaimer = this.checked;
      });
    }
  }
  
  /**
   * Setup download button in the modal
   * @param {HTMLElement} modal - Modal element
   * @param {HTMLElement} contentElement - Content element
   * @param {Object} options - Export options
   */
  function setupDownloadButton(modal, contentElement, options) {
    const downloadButton = modal.querySelector('#download-pdf-btn');
    if (!downloadButton) return;
    
    // Remove existing event listeners
    const newButton = downloadButton.cloneNode(true);
    downloadButton.parentNode.replaceChild(newButton, downloadButton);
    
    // Add new event listener
    newButton.addEventListener('click', async function() {
      try {
        // Show loading indicator
        if (window.loadingIndicator) {
          window.loadingIndicator.show('pdf-export-loading', {
            message: 'Generating PDF...',
            useOverlay: true
          });
        }
        
        // Get option values from the modal
        const headerToggle = modal.querySelector('#pdf-include-logo');
        const disclaimerToggle = modal.querySelector('#pdf-include-disclaimer');
        
        const exportOptions = {
          ...options,
          includeHeader: headerToggle ? headerToggle.checked : options.includeHeader,
          includeDisclaimer: disclaimerToggle ? disclaimerToggle.checked : options.includeDisclaimer,
          filename: options.filename || config.defaultFilename
        };
        
        // Generate and download the PDF
        await generatePDF(contentElement, exportOptions);
        
        // Hide the modal
        modal.style.display = 'none';
      } catch (error) {
        console.error('Error generating PDF:', error);
        
        // Show error message
        alert('An error occurred while generating the PDF. Please try again.');
      } finally {
        // Hide loading indicator
        if (window.loadingIndicator) {
          window.loadingIndicator.hide('pdf-export-loading');
        }
      }
    });
  }
  
  /**
   * Generate and download a PDF from the content
   * @param {HTMLElement} contentElement - Element containing content to export
   * @param {Object} options - Export options
   * @returns {Promise} - Resolves when PDF is generated
   */
  async function generatePDF(contentElement, options = {}) {
    try {
      await init();
      
      // Ensure html2pdf is available
      if (typeof html2pdf === 'undefined') {
        throw new Error('html2pdf library not available');
      }
      
      // Clean content for print
      const cleanedContent = cleanForPrint(contentElement);
      
      // Create container with header and footer
      const container = document.createElement('div');
      container.className = 'pdf-container';
      
      // Add header if needed
      if (options.includeHeader !== false && config.includeHeader) {
        const header = createHeader(options);
        container.appendChild(header);
      }
      
      // Add main content
      const contentContainer = document.