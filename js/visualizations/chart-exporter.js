/**
 * Chart Exporter for CVD Risk Toolkit
 * Provides functionality to export chart visualizations to various formats
 * 
 * Path: js/utils/chart-exporter.js
 * 
 * @requires js/utils/event-bus.js
 * @requires js/utils/error-detection-system.js
 * @requires js/utils/security-validation.js
 * @requires libs/html2canvas.min.js
 */

// Use strict mode to catch common coding errors
'use strict';

/**
 * ChartExporter class - Exports chart visualizations
 */
class ChartExporter {
    constructor() {
        // Singleton pattern
        if (ChartExporter.instance) {
            return ChartExporter.instance;
        }
        
        ChartExporter.instance = this;
        
        // Initialize properties
        this.initialized = false;
        this.exportInProgress = false;
        this.supportedChartLibraries = [
            'Chart.js',
            'D3.js',
            'Highcharts',
            'Canvas'
        ];
        this.supportedFormats = [
            'PNG',
            'JPEG',
            'SVG',
            'PDF'
        ];
        this.svgSupported = true;
        this.debugMode = false;
        this.qualitySettings = {
            png: {
                scale: 2,
                quality: 1.0,
                backgroundColor: '#ffffff'
            },
            jpeg: {
                scale: 2,
                quality: 0.9,
                backgroundColor: '#ffffff'
            },
            svg: {
                cleanup: true,
                removeInvisible: true,
                removeComments: true
            }
        };
        
        // Initialize the module
        this.init();
    }
    
    /**
     * Initialize the module
     * @private
     */
    init() {
        try {
            // Check for required libraries
            this.checkDependencies();
            
            // Initialize dependencies
            this.initializeDependencies();
            
            // Check for SVG export support
            this.checkSvgSupport();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            
            // Log initialization success in debug mode
            if (this.debugMode) {
                console.log('Chart Exporter initialized successfully');
                console.log('SVG export supported:', this.svgSupported);
                console.log('Supported chart libraries:', this.supportedChartLibraries);
                console.log('Supported export formats:', this.supportedFormats);
            }
            
            // Publish initialization complete event
            this.eventBus.publish('chartExporter:initialized', { 
                success: true,
                svgSupported: this.svgSupported
            });
        } catch (error) {
            console.error('Failed to initialize Chart Exporter:', error);
            
            // Report error
            if (this.errorSystem) {
                this.errorSystem.reportError({
                    component: 'ChartExporter',
                    method: 'init',
                    error: error
                });
            }
            
            // Publish initialization failed event
            if (this.eventBus) {
                this.eventBus.publish('chartExporter:initialized', { 
                    success: false,
                    error: error.message
                });
            }
        }
    }
    
    /**
     * Check for required libraries
     * @private
     * @throws {Error} If required libraries are not available
     */
    checkDependencies() {
        // Check for html2canvas
        if (typeof html2canvas === 'undefined') {
            console.warn('html2canvas library not found. Some export features will be limited.');
        }
        
        // Check for other optional libraries based on what's available in the window
        if (typeof Chart !== 'undefined') {
            console.log('Chart.js detected');
        }
        
        if (typeof d3 !== 'undefined') {
            console.log('D3.js detected');
        }
        
        if (typeof Highcharts !== 'undefined') {
            console.log('Highcharts detected');
        }
    }
    
    /**
     * Initialize dependencies safely
     * @private
     */
    initializeDependencies() {
        // Initialize event bus with fallback
        this.eventBus = window.eventBus || {
            subscribe: () => console.warn('EventBus not available'),
            publish: () => console.warn('EventBus not available')
        };
        
        // Initialize error detection system with fallback
        this.errorSystem = window.errorDetectionSystem || {
            reportError: (err) => console.error('Error detection system not available:', err)
        };
        
        // Initialize security validation with fallback
        this.securityValidation = window.securityValidation || {
            sanitizeFileName: (name) => name.replace(/[^a-z0-9_\-]/gi, '_')
        };
    }
    
    /**
     * Check if SVG export is supported
     * @private
     */
    checkSvgSupport() {
        try {
            // Check if XMLSerializer is available
            if (typeof XMLSerializer !== 'undefined') {
                this.svgSupported = true;
            } else {
                this.svgSupported = false;
            }
        } catch (error) {
            this.svgSupported = false;
            
            if (this.debugMode) {
                console.warn('SVG export not supported:', error);
            }
        }
    }
    
    /**
     * Set up event listeners
     * @private
     */
    setupEventListeners() {
        // Listen for export requests
        this.eventBus.subscribe('chart:exportRequested', this.handleExportRequest.bind(this));
        
        // Listen for preferences updates
        this.eventBus.subscribe('preferences:updated', this.handlePreferencesUpdate.bind(this));
        
        // Add DOM event listeners once the document is loaded
        document.addEventListener('DOMContentLoaded', () => {
            // Export buttons
            const exportButtons = document.querySelectorAll('.chart-export-button');
            exportButtons.forEach(button => {
                button.addEventListener('click', (event) => {
                    const chartId = event.target.getAttribute('data-chart');
                    const format = event.target.getAttribute('data-format') || 'png';
                    
                    if (chartId) {
                        this.exportChart(chartId, format);
                    }
                });
            });
        });
    }
    
    /**
     * Handle export request event
     * @param {Object} data - Export request data
     * @private
     */
    handleExportRequest(data) {
        try {
            // Validate request data
            if (!data || !data.chartId) {
                throw new Error('Invalid export request data');
            }
            
            const format = data.format || 'png';
            const chartId = data.chartId;
            
            if (this.exportInProgress) {
                if (this.debugMode) {
                    console.warn('Export already in progress. Please wait.');
                }
                return;
            }
            
            this.exportChart(chartId, format, data.options);
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'handleExportRequest',
                error: error,
                data: data
            });
        }
    }
    
    /**
     * Handle preferences update event
     * @param {Object} data - Preferences data
     * @private
     */
    handlePreferencesUpdate(data) {
        try {
            if (data && data.preferences) {
                // Apply preference changes
                if (data.preferences.debugMode !== undefined) {
                    this.debugMode = Boolean(data.preferences.debugMode);
                }
                
                // Update export quality settings if provided
                if (data.preferences.chartExportQuality) {
                    const quality = data.preferences.chartExportQuality;
                    
                    if (quality === 'high') {
                        this.qualitySettings.png.scale = 3;
                        this.qualitySettings.png.quality = 1.0;
                        this.qualitySettings.jpeg.scale = 3;
                        this.qualitySettings.jpeg.quality = 0.95;
                    } else if (quality === 'medium') {
                        this.qualitySettings.png.scale = 2;
                        this.qualitySettings.png.quality = 1.0;
                        this.qualitySettings.jpeg.scale = 2;
                        this.qualitySettings.jpeg.quality = 0.9;
                    } else if (quality === 'low') {
                        this.qualitySettings.png.scale = 1.5;
                        this.qualitySettings.png.quality = 0.8;
                        this.qualitySettings.jpeg.scale = 1.5;
                        this.qualitySettings.jpeg.quality = 0.8;
                    }
                }
            }
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'handlePreferencesUpdate',
                error: error
            });
        }
    }
    
    /**
     * Export chart to specified format
     * @param {string} chartId - ID of chart element
     * @param {string} format - Format to export (png, jpeg, svg, pdf)
     * @param {Object} options - Export options
     * @returns {Promise<boolean>} Success status
     * @public
     */
    async exportChart(chartId, format = 'png', options = {}) {
        try {
            if (this.exportInProgress) {
                return false;
            }
            
            this.exportInProgress = true;
            
            // Show loading indicator
            this.showLoadingState(true, chartId);
            
            // Validate chart ID and element
            const chartElement = document.getElementById(chartId);
            if (!chartElement) {
                throw new Error(`Chart element not found: ${chartId}`);
            }
            
            // Normalize format
            format = format.toLowerCase();
            
            // Validate format
            if (!['png', 'jpeg', 'svg', 'pdf'].includes(format)) {
                throw new Error(`Unsupported export format: ${format}`);
            }
            
            // Default options
            const defaultOptions = {
                fileName: `chart-${chartId}`,
                width: null, // Use element width if not specified
                height: null, // Use element height if not specified
                scale: this.qualitySettings[format].scale || 2,
                quality: this.qualitySettings[format].quality || 1.0,
                backgroundColor: this.qualitySettings[format].backgroundColor || '#ffffff',
                includeTitle: true,
                titleText: null, // Use title from chart if available
                directDownload: true
            };
            
            // Merge with provided options
            const exportOptions = { ...defaultOptions, ...options };
            
            // Sanitize filename
            exportOptions.fileName = this.securityValidation.sanitizeFileName(exportOptions.fileName);
            
            // Detect chart library and use appropriate export method
            const chartLibrary = this.detectChartLibrary(chartElement);
            
            let result;
            
            if (chartLibrary === 'Chart.js' && typeof Chart !== 'undefined') {
                result = await this.exportChartJS(chartElement, format, exportOptions);
            } else if (chartLibrary === 'D3.js' && typeof d3 !== 'undefined') {
                result = await this.exportD3(chartElement, format, exportOptions);
            } else if (chartLibrary === 'Highcharts' && typeof Highcharts !== 'undefined') {
                result = await this.exportHighcharts(chartElement, format, exportOptions);
            } else {
                // Default to HTML export for unknown charts or canvas elements
                result = await this.exportHTML(chartElement, format, exportOptions);
            }
            
            // Hide loading indicator
            this.showLoadingState(false, chartId);
            
            // Reset export state
            this.exportInProgress = false;
            
            // Publish export complete event
            this.eventBus.publish('chart:exportComplete', { 
                success: true,
                chartId: chartId,
                format: format,
                dataUrl: result.dataUrl
            });
            
            return true;
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'exportChart',
                error: error,
                chartId: chartId,
                format: format
            });
            
            // Hide loading indicator
            this.showLoadingState(false, chartId);
            
            // Reset export state
            this.exportInProgress = false;
            
            // Publish export failed event
            this.eventBus.publish('chart:exportComplete', { 
                success: false,
                chartId: chartId,
                format: format,
                error: error.message
            });
            
            return false;
        }
    }
    
    /**
     * Show or hide loading state for chart export
     * @param {boolean} isLoading - Whether loading is in progress
     * @param {string} chartId - Chart ID
     * @private
     */
    showLoadingState(isLoading, chartId) {
        // Update UI loading indicator based on chart ID
        const loadingElement = document.getElementById(`${chartId}-export-loading`);
        const buttonElement = document.querySelector(`.chart-export-button[data-chart="${chartId}"]`);
        
        if (loadingElement) {
            loadingElement.style.display = isLoading ? 'block' : 'none';
        }
        
        if (buttonElement) {
            buttonElement.disabled = isLoading;
            buttonElement.textContent = isLoading ? 'Exporting...' : 'Export Chart';
        }
    }
    
    /**
     * Detect chart library used for a chart element
     * @param {HTMLElement} element - Chart element
     * @returns {string} Detected chart library
     * @private
     */
    detectChartLibrary(element) {
        try {
            // Check for Chart.js
            if (element.tagName === 'CANVAS' && element.__chart__ !== undefined) {
                return 'Chart.js';
            }
            
            // Check for D3.js
            if (element.querySelector('svg') && typeof d3 !== 'undefined') {
                // Check if the element or its children have a D3 selection
                if (element.__data__ !== undefined || element.querySelector('[__data__]')) {
                    return 'D3.js';
                }
                
                // Generic SVG, use D3.js export method if available
                if (typeof d3 !== 'undefined') {
                    return 'D3.js';
                }
            }
            
            // Check for Highcharts
            if (element.querySelector('.highcharts-container') !== null) {
                return 'Highcharts';
            }
            
            // Check if it's a Canvas element
            if (element.tagName === 'CANVAS') {
                return 'Canvas';
            }
            
            // Default to HTML
            return 'HTML';
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'detectChartLibrary',
                error: error
            });
            
            // Default to HTML if detection fails
            return 'HTML';
        }
    }
    
    /**
     * Export Chart.js chart
     * @param {HTMLElement} element - Chart element
     * @param {string} format - Export format
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Export result
     * @private
     */
    async exportChartJS(element, format, options) {
        try {
            // Get Chart.js instance from canvas element
            const chart = element.__chart__ || element.chart;
            
            if (!chart) {
                // Fallback to HTML export if Chart.js instance not found
                return this.exportHTML(element, format, options);
            }
            
            let result;
            
            if (format === 'svg' && this.svgSupported) {
                // Convert Chart.js to SVG (requires canvg library)
                if (typeof canvg !== 'undefined') {
                    result = this.chartJSToSVG(chart, options);
                } else {
                    // Fallback to image export if canvg not available
                    result = {
                        dataUrl: chart.toBase64Image('image/png', options.quality)
                    };
                    format = 'png'; // Override format to PNG
                }
            } else if (format === 'pdf') {
                // For PDF, export as PNG and convert
                const dataUrl = chart.toBase64Image('image/png', options.quality);
                result = await this.convertToPDF(dataUrl, options);
            } else {
                // For PNG or JPEG, use Chart.js built-in method
                const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
                result = {
                    dataUrl: chart.toBase64Image(mimeType, options.quality)
                };
            }
            
            // Download if requested
            if (options.directDownload && result.dataUrl) {
                this.downloadFile(result.dataUrl, `${options.fileName}.${format}`, format);
            }
            
            return result;
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'exportChartJS',
                error: error,
                format: format
            });
            
            // Fallback to HTML export if Chart.js export fails
            return this.exportHTML(element, format, options);
        }
    }
    
    /**
     * Export D3.js chart
     * @param {HTMLElement} element - Chart element
     * @param {string} format - Export format
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Export result
     * @private
     */
    async exportD3(element, format, options) {
        try {
            // Find SVG element
            const svgElement = element.tagName === 'SVG' ? element : element.querySelector('svg');
            
            if (!svgElement) {
                // Fallback to HTML export if SVG not found
                return this.exportHTML(element, format, options);
            }
            
            let result;
            
            if (format === 'svg' && this.svgSupported) {
                // For SVG, extract SVG content
                result = this.svgToDataURL(svgElement, options);
            } else if (format === 'pdf') {
                // For PDF, convert SVG to image first, then to PDF
                const svgDataUrl = this.svgToDataURL(svgElement, options).dataUrl;
                result = await this.convertToPDF(svgDataUrl, options);
            } else {
                // For PNG or JPEG, render SVG to canvas, then to image
                result = await this.svgToImageDataURL(svgElement, format, options);
            }
            
            // Download if requested
            if (options.directDownload && result.dataUrl) {
                this.downloadFile(result.dataUrl, `${options.fileName}.${format}`, format);
            }
            
            return result;
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'exportD3',
                error: error,
                format: format
            });
            
            // Fallback to HTML export if D3 export fails
            return this.exportHTML(element, format, options);
        }
    }
    
    /**
     * Export Highcharts chart
     * @param {HTMLElement} element - Chart element
     * @param {string} format - Export format
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Export result
     * @private
     */
    async exportHighcharts(element, format, options) {
        try {
            // Find Highcharts container
            const container = element.querySelector('.highcharts-container');
            
            if (!container) {
                // Fallback to HTML export if Highcharts container not found
                return this.exportHTML(element, format, options);
            }
            
            // Try to get Highcharts instance
            const chart = Highcharts.charts.find(chart => 
                chart.container && chart.container.parentNode === element
            );
            
            if (!chart) {
                // Fallback to HTML export if Highcharts instance not found
                return this.exportHTML(element, format, options);
            }
            
            let result;
            
            if (format === 'svg' && this.svgSupported) {
                // Use Highcharts' built-in SVG export
                const svg = chart.getSVG({
                    exporting: {
                        sourceWidth: options.width || chart.chartWidth,
                        sourceHeight: options.height || chart.chartHeight
                    }
                });
                
                result = {
                    dataUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
                };
            } else if (format === 'pdf') {
                // For PDF, use PNG and convert
                const imageData = chart.exportChartLocal({
                    type: 'image/png',
                    scale: options.scale
                });
                
                // Convert to data URL
                const dataUrl = await this.blobToDataURL(imageData);
                result = await this.convertToPDF(dataUrl, options);
            } else {
                // For PNG or JPEG, use Highcharts' built-in export
                const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
                const imageData = chart.exportChartLocal({
                    type: mimeType,
                    scale: options.scale
                });
                
                // Convert to data URL
                result = {
                    dataUrl: await this.blobToDataURL(imageData)
                };
            }
            
            // Download if requested
            if (options.directDownload && result.dataUrl) {
                this.downloadFile(result.dataUrl, `${options.fileName}.${format}`, format);
            }
            
            return result;
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'exportHighcharts',
                error: error,
                format: format
            });
            
            // Fallback to HTML export if Highcharts export fails
            return this.exportHTML(element, format, options);
        }
    }
    
    /**
     * Export any HTML element as chart
     * @param {HTMLElement} element - Chart element
     * @param {string} format - Export format
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Export result
     * @private
     */
    async exportHTML(element, format, options) {
        try {
            if (!html2canvas) {
                throw new Error('html2canvas library required for HTML export');
            }
            
            // Use html2canvas to render element to canvas
            const canvas = await html2canvas(element, {
                scale: options.scale,
                backgroundColor: options.backgroundColor,
                logging: this.debugMode,
                allowTaint: false,
                useCORS: true,
                removeContainer: false
            });
            
            let result;
            
            if (format === 'svg' && this.svgSupported) {
                // Convert canvas to SVG
                result = this.canvasToSVG(canvas, options);
            } else if (format === 'pdf') {
                // For PDF, convert canvas to image first, then to PDF
                const pngDataUrl = canvas.toDataURL('image/png');
                result = await this.convertToPDF(pngDataUrl, options);
            } else {
                // For PNG or JPEG, use canvas
                const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
                result = {
                    dataUrl: canvas.toDataURL(mimeType, options.quality)
                };
            }
            
            // Download if requested
            if (options.directDownload && result.dataUrl) {
                this.downloadFile(result.dataUrl, `${options.fileName}.${format}`, format);
            }
            
            return result;
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'exportHTML',
                error: error,
                format: format
            });
            
            // Return error result
            return {
                error: error.message,
                dataUrl: null
            };
        }
    }
    
    /**
     * Export chart element as image
     * @param {string} chartId - ID of chart element
     * @param {string} format - Format to export (png, jpeg)
     * @param {Object} options - Export options
     * @returns {Promise<string>} Data URL of exported image
     * @public
     */
    async exportChartAsImage(chartId, format = 'png', options = {}) {
        try {
            // Get chart element
            const chartElement = document.getElementById(chartId);
            if (!chartElement) {
                throw new Error(`Chart element not found: ${chartId}`);
            }
            
            // Default options
            const defaultOptions = {
                scale: this.qualitySettings[format].scale || 2,
                quality: this.qualitySettings[format].quality || 1.0,
                backgroundColor: this.qualitySettings[format].backgroundColor || '#ffffff',
                directDownload: false
            };
            
            // Merge with provided options
            const exportOptions = { ...defaultOptions, ...options };
            
            // Export chart
            const result = await this.exportChart(chartId, format, exportOptions);
            
            // Return data URL if export successful
            if (result) {
                const results = await this.eventBus.waitForEvent('chart:exportComplete', 10000);
                if (results && results.dataUrl) {
                    return results.dataUrl;
                }
            }
            
            throw new Error('Failed to export chart as image');
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'exportChartAsImage',
                error: error,
                chartId: chartId,
                format: format
            });
            
            // Fallback to html2canvas directly as a last resort
            try {
                const chartElement = document.getElementById(chartId);
                if (chartElement && html2canvas) {
                    const canvas = await html2canvas(chartElement, {
                        scale: 2,
                        backgroundColor: '#ffffff',
                        logging: false,
                        allowTaint: false,
                        useCORS: true
                    });
                    
                    return canvas.toDataURL('image/png');
                }
            } catch (e) {
                console.error('Final fallback export failed:', e);
            }
            
            return null;
        }
    }
    
    /**
     * Convert SVG element to data URL
     * @param {SVGElement} svgElement - SVG element
     * @param {Object} options - Conversion options
     * @returns {Object} Object with dataUrl
     * @private
     */
    svgToDataURL(svgElement, options) {
        try {
            // Clone the SVG to avoid modifying the original
            const svgClone = svgElement.cloneNode(true);
            
            // Add dimensions if not present
            if (!svgClone.getAttribute('width') && options.width) {
                svgClone.setAttribute('width', options.width);
            }
            
            if (!svgClone.getAttribute('height') && options.height) {
                svgClone.setAttribute('height', options.height);
            }
            
            // Set background color if needed
            if (options.backgroundColor && options.backgroundColor !== 'transparent') {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('width', '100%');
                rect.setAttribute('height', '100%');
                rect.setAttribute('fill', options.backgroundColor);
                svgClone.insertBefore(rect, svgClone.firstChild);
            }
            
            // Clean up SVG for export (remove unnecessary attributes, etc.)
            if (this.qualitySettings.svg.cleanup) {
                this.cleanupSVG(svgClone);
            }
            
            // Get SVG string
            const serializer = new XMLSerializer();
            let svgString = serializer.serializeToString(svgClone);
            
            // Add XML declaration if not present
            if (!svgString.startsWith('<?xml')) {
                svgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' + svgString;
            }
            
            // Create data URL
            const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            
            return { dataUrl };
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'svgToDataURL',
                error: error
            });
            
            throw error;
        }
    }
    
    /**
     * Convert SVG element to image data URL
     * @param {SVGElement} svgElement - SVG element
     * @param {string} format - Image format (png, jpeg)
     * @param {Object} options - Conversion options
     * @returns {Promise<Object>} Object with dataUrl
     * @private
     */
    async svgToImageDataURL(svgElement, format, options) {
        try {
            // Get SVG data URL
            const svgDataUrl = this.svgToDataURL(svgElement, options).dataUrl;
            
            // Create Image element
            const img = new Image();
            
            // Wait for image to load
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = svgDataUrl;
            });
            
            // Create canvas
            const canvas = document.createElement('canvas');
            
            // Get dimensions from SVG, options, or element
            const width = options.width || svgElement.getAttribute('width') || 
                         svgElement.getBoundingClientRect().width;
            const height = options.height || svgElement.getAttribute('height') || 
                          svgElement.getBoundingClientRect().height;
            
            // Set canvas dimensions with scale
            canvas.width = width * options.scale;
            canvas.height = height * options.scale;
            
            // Get context and draw image
            const ctx = canvas.getContext('2d');
            
            // Set background if needed
            if (options.backgroundColor && options.backgroundColor !== 'transparent') {
                ctx.fillStyle = options.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Draw image with scaling
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Convert to data URL
            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const dataUrl = canvas.toDataURL(mimeType, options.quality);
            
            return { dataUrl };
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'svgToImageDataURL',
                error: error,
                format: format
            });
            
            throw error;
        }
    }
    
    /**
     * Convert Chart.js chart to SVG
     * @param {Chart} chart - Chart.js instance
     * @param {Object} options - Conversion options
     * @returns {Object} Object with dataUrl
     * @private
     */
    chartJSToSVG(chart, options) {
        try {
            // Get canvas element
            const canvas = chart.canvas;
            
            // Convert canvas to SVG using canvg
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const canvgInstance = canvg.fromCanvas(canvas, {
                svg: svg,
                ignoreMouse: true,
                ignoreAnimation: true
            });
            
            // Start rendering
            canvgInstance.start();
            
            // Set dimensions on SVG element
            const width = options.width || canvas.width;
            const height = options.height || canvas.height;
            svg.setAttribute('width', width);
            svg.setAttribute('height', height);
            
            // Clean up SVG for export (remove unnecessary attributes, etc.)
            if (this.qualitySettings.svg.cleanup) {
                this.cleanupSVG(svg);
            }
            
            // Get SVG string
            const serializer = new XMLSerializer();
            let svgString = serializer.serializeToString(svg);
            
            // Add XML declaration if not present
            if (!svgString.startsWith('<?xml')) {
                svgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' + svgString;
            }
            
            // Create data URL
            const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            
            return { dataUrl };
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'chartJSToSVG',
                error: error
            });
            
            throw error;
        }
    }
    
    /**
     * Convert canvas to SVG
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} options - Conversion options
     * @returns {Object} Object with dataUrl
     * @private
     */
    canvasToSVG(canvas, options) {
        try {
            // Create SVG element
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            
            // Set dimensions on SVG element
            const width = options.width || canvas.width;
            const height = options.height || canvas.height;
            svg.setAttribute('width', width);
            svg.setAttribute('height', height);
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            
            // Add background if needed
            if (options.backgroundColor && options.backgroundColor !== 'transparent') {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('width', '100%');
                rect.setAttribute('height', '100%');
                rect.setAttribute('fill', options.backgroundColor);
                svg.appendChild(rect);
            }
            
            // Convert canvas to image and embed in SVG
            const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            img.setAttribute('width', width);
            img.setAttribute('height', height);
            img.setAttribute('href', canvas.toDataURL('image/png'));
            svg.appendChild(img);
            
            // Clean up SVG for export (remove unnecessary attributes, etc.)
            if (this.qualitySettings.svg.cleanup) {
                this.cleanupSVG(svg);
            }
            
            // Get SVG string
            const serializer = new XMLSerializer();
            let svgString = serializer.serializeToString(svg);
            
            // Add XML declaration if not present
            if (!svgString.startsWith('<?xml')) {
                svgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' + svgString;
            }
            
            // Create data URL
            const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
            
            return { dataUrl };
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'canvasToSVG',
                error: error
            });
            
            throw error;
        }
    }
    
    /**
     * Convert image data URL to PDF
     * @param {string} dataUrl - Image data URL
     * @param {Object} options - Conversion options
     * @returns {Promise<Object>} Object with dataUrl
     * @private
     */
    async convertToPDF(dataUrl, options) {
        try {
            // Check if jsPDF is available
            if (typeof jsPDF === 'undefined') {
                throw new Error('jsPDF library required for PDF export');
            }
            
            // Create Image element
            const img = new Image();
            
            // Wait for image to load
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = dataUrl;
            });
            
            // Calculate dimensions and orientation
            const imgWidth = options.width || img.width;
            const imgHeight = options.height || img.height;
            
            // Determine if we need landscape orientation
            const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
            
            // Create PDF document
            const pdf = new jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: 'a4'
            });
            
            // Calculate PDF dimensions
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            // Scale image to fit PDF, preserving aspect ratio
            const scale = Math.min(
                pdfWidth / imgWidth,
                pdfHeight / imgHeight
            ) * 0.9; // 90% of available space
            
            const scaledWidth = imgWidth * scale;
            const scaledHeight = imgHeight * scale;
            
            // Center image on page
            const offsetX = (pdfWidth - scaledWidth) / 2;
            const offsetY = (pdfHeight - scaledHeight) / 2;
            
            // Add title if requested
            if (options.includeTitle && options.titleText) {
                pdf.setFontSize(16);
                pdf.text(options.titleText, offsetX, offsetY - 10);
            }
            
            // Add image to PDF
            pdf.addImage(
                dataUrl,
                'PNG',
                offsetX,
                offsetY,
                scaledWidth,
                scaledHeight
            );
            
            // Convert PDF to data URL
            const pdfDataUrl = pdf.output('datauristring');
            
            return { dataUrl: pdfDataUrl };
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'convertToPDF',
                error: error
            });
            
            throw error;
        }
    }
    
    /**
     * Clean up SVG for export
     * @param {SVGElement} svg - SVG element
     * @private
     */
    cleanupSVG(svg) {
        try {
            // Remove comments
            if (this.qualitySettings.svg.removeComments) {
                const iterator = document.createNodeIterator(
                    svg,
                    NodeFilter.SHOW_COMMENT,
                    { acceptNode: () => NodeFilter.FILTER_ACCEPT }
                );
                
                let node;
                while (node = iterator.nextNode()) {
                    node.parentNode.removeChild(node);
                }
            }
            
            // Remove invisible elements (with opacity="0" or display="none")
            if (this.qualitySettings.svg.removeInvisible) {
                const invisibleElements = svg.querySelectorAll('[opacity="0"], [display="none"]');
                invisibleElements.forEach(el => el.parentNode.removeChild(el));
            }
            
            // Remove unnecessary attributes
            const allElements = svg.querySelectorAll('*');
            allElements.forEach(el => {
                // Remove data-* attributes
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('data-')) {
                        el.removeAttribute(attr.name);
                    }
                });
            });
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'cleanupSVG',
                error: error
            });
            
            // Continue even if cleanup fails
        }
    }
    
    /**
     * Convert Blob to data URL
     * @param {Blob} blob - Blob to convert
     * @returns {Promise<string>} Data URL
     * @private
     */
    blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    /**
     * Download file from data URL
     * @param {string} dataUrl - Data URL
     * @param {string} fileName - File name
     * @param {string} format - File format (png, jpeg, svg, pdf)
     * @private
     */
    downloadFile(dataUrl, fileName, format) {
        try {
            // Create link element
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            
            // Append to document
            document.body.appendChild(link);
            
            // Trigger click
            link.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(link);
            }, 100);
        } catch (error) {
            this.errorSystem.reportError({
                component: 'ChartExporter',
                method: 'downloadFile',
                error: error,
                fileName: fileName,
                format: format
            });
            
            // Show error message
            alert(`Failed to download file: ${error.message}`);
        }
    }
    
    /**
     * Set debug mode
     * @param {boolean} enable - Whether to enable debug mode
     * @public
     */
    setDebugMode(enable) {
        this.debugMode = Boolean(enable);
    }
    
    /**
     * Set quality settings
     * @param {string} format - Format (png, jpeg, svg)
     * @param {Object} settings - Quality settings
     * @public
     */
    setQualitySettings(format, settings) {
        if (this.qualitySettings[format]) {
            this.qualitySettings[format] = { ...this.qualitySettings[format], ...settings };
        }
    }
}

// Create global instance using IIFE
window.chartExporter = (function() {
    try {
        return new ChartExporter();
    } catch (error) {
        console.error('Failed to initialize Chart Exporter:', error);
        
        // Return minimal implementation
        return {
            exportChart: async () => false,
            exportChartAsImage: async () => null,
            setDebugMode: () => {},
            setQualitySettings: () => {}
        };
    }
})();
