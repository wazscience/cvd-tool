/**
 * Enhanced Chart Renderer Service
 * @file /js/visualizations/chart-renderer.js
 * @description Provides comprehensive data visualization capabilities for the CVD Risk Toolkit
 * using Chart.js. Includes dynamic library loading, fallback rendering, accessibility features,
 * performance optimizations, memory management, and specific chart types for CVD risk.
 * This module fuses functionalities from chart-renderer.js, improved-chart-renderer.js,
 * and the RiskVisualization class.
 * @version 2.1.0
 * @exports ChartRendererService
 */

'use strict';

// Dependencies are expected to be available on window or injected by main.js
// For example:
// import RuntimeProtection from '../utils/runtime-protection.js'; // Static methods
// import EventBus from '../utils/event-bus.js'; // Instance
// import ValidationHelpers from '../utils/validation-helpers.js'; // Instance
// import { formatNumber, debounce, deepClone, sanitizeData } from '../utils/helper-functions.js';
// import MemoryManager from '../utils/memory-manager.js'; // Instance
// import { ChartRenderingError, ValidationError } from '../utils/error-types.js';

class ChartRendererService {
    /**
     * Creates or returns the singleton instance of ChartRendererService.
     * @param {object} [options={}] - Configuration options.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (ChartRendererService.instance) {
            return ChartRendererService.instance;
        }

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || { handleError: console.error, log: console.log },
            EventBus: window.EventBus || { subscribe: () => ({ unsubscribe: () => {} }), publish: () => {} },
            // ValidationHelpers: window.ValidationHelpers, // Not directly used in constructor, but methods might
            // HelperFunctions: { formatNumber, debounce, deepClone, sanitizeData }, // Assuming these are available
            MemoryManager: window.MemoryManagerInstance || { registerComponent: () => {}, getInstance: () => ({ registerComponent: () => {} }) },
            RuntimeProtection: window.RuntimeProtection, // Static class
            ...options.dependencies,
        };
        
        // Ensure helper functions are available, either from dependencies or global
        this.helpers = {
            formatNumber: this.dependencies.HelperFunctions?.formatNumber || window.formatNumber || ((num) => String(num)),
            debounce: this.dependencies.HelperFunctions?.debounce || window.debounce || ((fn) => fn),
            deepClone: this.dependencies.HelperFunctions?.deepClone || window.deepClone || ((obj) => JSON.parse(JSON.stringify(obj))),
            sanitizeData: this.dependencies.HelperFunctions?.sanitizeData || window.sanitizeData || ((data) => data),
        };


        this.defaultConfig = { // From improved-chart-renderer.js
            colorSchemes: {
                default: { primary: '#2c7afc', secondary: '#6c757d', success: '#28a745', warning: '#ffc107', danger: '#dc3545', low: '#28a745', intermediate: '#ffc107', high: '#dc3545', veryHigh: '#9c0000', background: '#ffffff', text: '#212529', grid: '#e9ecef', baseline: 'rgba(108, 117, 125, 0.7)', modified: 'rgba(0, 123, 255, 0.7)' },
                highContrast: { primary: '#0000ff', secondary: '#000000', success: '#008000', warning: '#ff8c00', danger: '#ff0000', low: '#008000', intermediate: '#ff8c00', high: '#ff0000', veryHigh: '#800000', background: '#ffffff', text: '#000000', grid: '#cccccc', baseline: 'rgba(0,0,0,0.5)', modified: 'rgba(0,0,255,0.7)' },
                colorblind: { primary: '#0072B2', secondary: '#56B4E9', success: '#009E73', warning: '#E69F00', danger: '#D55E00', low: '#009E73', intermediate: '#E69F00', high: '#D55E00', veryHigh: '#CC79A7', background: '#ffffff', text: '#000000', grid: '#cccccc', baseline: 'rgba(86,180,233,0.5)', modified: 'rgba(0,114,178,0.7)' },
                monochrome: { primary: '#000000', secondary: '#666666', success: '#333333', warning: '#888888', danger: '#000000', low: '#cccccc', intermediate: '#888888', high: '#333333', veryHigh: '#000000', background: '#ffffff', text: '#000000', grid: '#dddddd', baseline: 'rgba(102,102,102,0.5)', modified: 'rgba(0,0,0,0.7)' }
            },
            responsive: { breakpoints: { small: 576, medium: 768, large: 992, extraLarge: 1200 }, aspectRatios: { small: 1.2, medium: 1.5, large: 2.0, extraLarge: 2.5 } },
            animation: { enabled: true, duration: 1000, easing: 'easeOutQuart' },
            fonts: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', size: { small: 10, medium: 12, large: 14, title: 16, header: 20 } },
            accessibility: { includeDescriptions: true, highContrastRatios: true, textDescriptions: true, keyboardNav: true }
        };
        this.currentColors = this.defaultConfig.colorSchemes.default; // Active color scheme

        this.chartInstances = new Map();
        this.deviceCapabilities = this._detectCapabilities();
        this.libraryLoaded = false;
        this.browserCompatibility = this._checkBrowserCompatibility();
        this.isLoadingLibrary = false;

        this._initializeMemoryManagement();
        this._setupEventListeners(); // For theme changes, etc.
        this.initializeChartLibrary(); // Attempt to load Chart.js on instantiation

        ChartRendererService.instance = this;
        this._log('info', 'ChartRendererService Initialized (v2.1.0).');
    }

    _log(level, message, data) { this.dependencies.ErrorLogger.log?.(level, `ChartRendererSvc: ${message}`, data); }
    _handleError(error, context, additionalData = {}) {
        const msg = error.message || String(error);
        this.dependencies.ErrorLogger.handleError?.(msg, `ChartRendererSvc-${context}`, 'error', { originalError: error, ...additionalData });
    }

    // --- Core Library and Configuration Methods (from improved-chart-renderer.js) ---
    async initializeChartLibrary() {
        if (this.libraryLoaded || this.isLoadingLibrary) return;
        this.isLoadingLibrary = true;
        this.dependencies.LoadingManager?.show('Initializing Chart Engine...');
        try {
            if (typeof window.Chart === 'undefined') {
                await this._loadChartLibrary(); // Loads Chart.js and plugins
            }
            this.libraryLoaded = true;
            this._applyChartDefaults(); // Apply defaults after Chart.js is loaded
            this._log('info', 'Chart.js library and plugins initialized successfully.');
            this.dependencies.EventBus.publish('chartEngine:ready');
        } catch (error) {
            this._handleError(error, 'InitializeChartLibrary');
            this.libraryLoaded = false;
            this._setupFallbackRenderer(); // Setup SVG fallback if Chart.js fails
        } finally {
            this.isLoadingLibrary = false;
            this.dependencies.LoadingManager?.hide();
        }
    }

    _loadChartLibrary() { /* ... (Same as improved-chart-renderer.js _loadChartLibrary) ... */
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
            script.integrity = 'sha512-ElRFoEQdI5Ht6kZvyzXhYG9NqjtkmlkfYk0wr6wHxU9JEHakS7UJZNeml5ALk+8IKlU6jDgMabC3vkumRokgJA=='; // SRI for Chart.js 3.9.1
            script.crossOrigin = 'anonymous';
            script.referrerPolicy = 'no-referrer';
            let loadTimeout = setTimeout(() => reject(new Error('Chart.js library load timeout (CDN).')), 10000);
            script.onload = () => { clearTimeout(loadTimeout); this._loadChartPlugins().then(resolve).catch(reject); };
            script.onerror = (err) => {
                clearTimeout(loadTimeout); this._log('warn', 'Failed to load Chart.js from CDN, trying local fallback.', err);
                const fallbackScript = document.createElement('script'); fallbackScript.src = 'js/libs/chart.min.js'; // Ensure this path is correct
                let fallbackTimeout = setTimeout(() => reject(new Error('Chart.js library load timeout (Local).')), 5000);
                fallbackScript.onload = () => { clearTimeout(fallbackTimeout); this._loadChartPlugins().then(resolve).catch(reject); };
                fallbackScript.onerror = (fallbackErr) => { clearTimeout(fallbackTimeout); reject(new Error(`Chart.js from local fallback failed: ${fallbackErr.message}`));};
                document.head.appendChild(fallbackScript);
            };
            document.head.appendChild(script);
        });
    }
    _loadChartPlugins() { /* ... (Same as improved-chart-renderer.js _loadChartPlugins for annotation) ... */
        return new Promise((resolve, reject) => {
            const pluginUrl = 'https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-annotation/2.1.0/chartjs-plugin-annotation.min.js'; // Example for v2.1.0
            const pluginIntegrity = 'sha512-2xAKHnJ0F4mh5ixh3H0rAJ+7Sf/jrHPUjL9GfvZhHGr/LFcDr9QSSTG9gHb3YUKaIbgb6UwFVMa2/x1GV48FIw==';
            const fallbackPluginPath = 'js/libs/chartjs-plugin-annotation.min.js';

            if (window.Chart && window.Chart.plugins && window.Chart.plugins.get('annotation')) { resolve(); return; } // Already registered

            const script = document.createElement('script'); script.src = pluginUrl; script.integrity = pluginIntegrity; script.crossOrigin = 'anonymous'; script.referrerPolicy = 'no-referrer';
            let loadTimeout = setTimeout(() => reject(new Error('Chart.js Annotation plugin load timeout (CDN).')), 7000);
            script.onload = () => { clearTimeout(loadTimeout); resolve(); };
            script.onerror = (err) => {
                clearTimeout(loadTimeout); this._log('warn', 'Failed to load Annotation plugin from CDN, trying local fallback.', err);
                const fallbackScript = document.createElement('script'); fallbackScript.src = fallbackPluginPath;
                let fallbackTimeout = setTimeout(() => reject(new Error('Annotation plugin load timeout (Local).')), 5000);
                fallbackScript.onload = () => { clearTimeout(fallbackTimeout); resolve(); };
                fallbackScript.onerror = (fallbackErr) => { clearTimeout(fallbackTimeout); reject(new Error(`Annotation plugin from local fallback failed: ${fallbackErr.message}`)); };
                document.head.appendChild(fallbackScript);
            };
            document.head.appendChild(script);
        });
    }
    _applyChartDefaults() { /* ... (Same as improved-chart-renderer.js _applyChartDefaults, registers custom plugins) ... */
        if (typeof window.Chart === 'undefined') return;
        const Chart = window.Chart; // Local alias
        Chart.defaults.font.family = this.defaultConfig.fonts.family; Chart.defaults.font.size = this.defaultConfig.fonts.size.medium; Chart.defaults.color = this.currentColors.text; Chart.defaults.responsive = true; Chart.defaults.maintainAspectRatio = false; // Better for responsive containers
        if (this.deviceCapabilities.isLowEnd) { Chart.defaults.animation = false; Chart.defaults.elements.line.tension = 0; Chart.defaults.elements.line.borderWidth = 1.5; Chart.defaults.elements.point.radius = 2; Chart.defaults.elements.arc.borderWidth = 1; }
        else { Chart.defaults.animation.duration = this.defaultConfig.animation.duration; Chart.defaults.animation.easing = this.defaultConfig.animation.easing; }
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0,0,0,0.8)'; Chart.defaults.plugins.tooltip.titleColor = '#ffffff'; Chart.defaults.plugins.tooltip.bodyColor = '#ffffff'; Chart.defaults.plugins.tooltip.padding = 10; Chart.defaults.plugins.tooltip.cornerRadius = 6; Chart.defaults.plugins.tooltip.usePointStyle = true;
        this._registerAccessibilityPlugin(Chart); this._registerMemoryOptimizationPlugin(Chart);
        this.dependencies.EventBus.publish('chartRenderer:defaultsApplied');
    }
    _detectCapabilities() { /* ... (Same as improved-chart-renderer.js _detectCapabilities) ... */
        const capabilities = { memory: navigator.deviceMemory || 4, cores: navigator.hardwareConcurrency || 2, connection: navigator.connection?.effectiveType || '4g', touchEnabled: ('ontouchstart' in window), screenSize: window.innerWidth < 768 ? 'small' : window.innerWidth < 1024 ? 'medium' : 'large', isLowEnd: false, gpu: 'unknown' };
        capabilities.isLowEnd = capabilities.memory <= 2 || capabilities.cores <= 2 || ['2g', 'slow-2g'].includes(capabilities.connection);
        try { const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl'); if (gl) { const debugInfo = gl.getExtension('WEBGL_debug_renderer_info'); if (debugInfo) { const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL); capabilities.gpu = renderer; const lowEndGPUs = ['Intel', 'GMA', 'Mali-4', 'Adreno 3', 'PowerVR']; capabilities.isLowEnd = capabilities.isLowEnd || lowEndGPUs.some(gpu => renderer.includes(gpu)); } } } catch (e) { this._log('warn', 'GPU detection failed.', e); }
        return capabilities;
    }
    _checkBrowserCompatibility() { /* ... (Same as improved-chart-renderer.js _checkBrowserCompatibility) ... */
        const comp = { canvas: true, webgl: true, charts: true, es6: true, compatibility: 'full' };
        try { const c = document.createElement('canvas'); if (!c.getContext) comp.canvas = false; } catch (e) { comp.canvas = false; }
        try { const c = document.createElement('canvas'); if (!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')))) comp.webgl = false; } catch (e) { comp.webgl = false; }
        try { eval('let x = 1; const y = () => x + 1;'); } catch (e) { comp.es6 = false; }
        if (!comp.canvas) { comp.charts = false; comp.compatibility = 'none'; } else if (!comp.webgl) comp.compatibility = 'limited'; else if (!comp.es6) comp.compatibility = 'partial';
        return comp;
    }
    _initializeMemoryManagement() { /* ... (Same as improved-chart-renderer.js _initializeMemoryManagement) ... */
        this.dependencies.MemoryManager.registerComponent?.('chartRenderer', { cleanupThreshold: 75 * 1024 * 1024, cleanupCallback: this._performMemoryCleanup.bind(this) });
    }
    _performMemoryCleanup() { /* ... (Same as improved-chart-renderer.js _performMemoryCleanup) ... */
        this._log('info', 'Performing chart memory cleanup.'); this.chartInstances.forEach((chart) => { if (chart.data?.datasets?.some(ds => ds.data?.length > 100)) { chart.data.datasets.forEach(ds => { if (ds._originalData) return; ds._originalData = ds.data; if (ds.data.length > 100) ds.data = this._sampleData(ds.data, 100); }); chart.update?.(); } }); if (typeof window.gc === 'function') try { window.gc(); } catch (e) { this._log('warn', 'GC call failed.', e); }
    }
    _sampleData(data, sampleSize) { /* ... (Same as improved-chart-renderer.js _sampleData) ... */
        if (!Array.isArray(data) || data.length <= sampleSize) return data; const result = []; const step = Math.floor(data.length / sampleSize); for (let i = 0; i < data.length; i += step) { result.push(data[i]); if (result.length >= sampleSize) break; } return result;
    }
    _restoreOriginalData(chartId) { /* ... (Same as improved-chart-renderer.js _restoreOriginalData) ... */
        const chart = this.chartInstances.get(chartId); if (!chart?.data?.datasets) return; let updated = false; chart.data.datasets.forEach(ds => { if (ds._originalData) { ds.data = ds._originalData; delete ds._originalData; updated = true; } }); if (updated) chart.update?.();
    }
    _setupEventListeners() { /* ... (Same as improved-chart-renderer.js _setupEventListeners, but ensure it also listens for chart:renderRequest) ... */
        this.dependencies.EventBus.subscribe('calculation:complete', (data) => { if (data.calculatorType && data.results) this._updateRelatedCharts(data.calculatorType, data.results); });
        this.dependencies.EventBus.subscribe('theme:changed', (data) => this.updateColorScheme(data.newTheme || (data.isDarkMode ? 'dark' : 'default'))); // Harmonize theme event
        this.dependencies.EventBus.subscribe('memory:warning', (data) => { if (data.level === 'critical') this._performMemoryCleanup(); });
        document.addEventListener('visibilitychange', () => { if (document.hidden) this._pauseAllAnimations(); else this._resumeAllAnimations(); });
        // Listen for chart rendering requests from ResultsDisplayService or AppUI
        this.dependencies.EventBus.subscribe('chart:renderRequest', (payload) => {
            const { calculatorType, targetElementId, data, options, chartType } = payload;
            const container = document.getElementById(targetElementId);
            if (!container) { this._handleError(new Error(`Target container #${targetElementId} not found for chart.`), 'RenderRequest'); return; }
            this._log('debug', `Received chart:renderRequest for ${calculatorType} -> ${targetElementId}`, payload);

            // Call the appropriate specific chart creation method
            // This requires mapping calculatorType/chartType to specific methods
            if (chartType === 'basicRisk' || (calculatorType === 'frs' && !chartType) || (calculatorType === 'qrisk3' && !chartType)) {
                this.createCvdRiskScoreChart(targetElementId, container, data, calculatorType, options);
            } else if (chartType === 'comparison' || calculatorType === 'Combined') {
                this.createCalculatorsComparisonChart(targetElementId, container, data.frsData, data.qriskData, options);
            } else if (chartType === 'riskFactors') {
                this.createRiskFactorsContributionChart(targetElementId, container, data, options);
            } else if (chartType === 'treatmentEffect') {
                this.createTreatmentBenefitChart(targetElementId, container, data.currentRisk, data.potentialRisk, options);
            } else if (chartType === 'lipidProfile') {
                this.createLipidProfileChart(targetElementId, container, data, options);
            } else if (chartType === 'riskOverTime') { // From improved-chart-renderer
                this.createRiskTimeChart(targetElementId, container, data, options);
            } else {
                this._log('warn', `No specific chart creation method for type: ${chartType || calculatorType}. Attempting fallback or generic.`);
                this.renderFallbackChart(container, {id: targetElementId, type: 'bar', title: options?.title || 'Chart', data: data?.datasets?.[0] || {labels:[], datasets:[{data:[]}]} });
            }
        });
    }
    _pauseAllAnimations() { /* ... (Same as improved-chart-renderer.js) ... */ this.chartInstances.forEach(c => { if(c?.options?.animation) { c._origAnimDur = c.options.animation.duration; c.options.animation.duration = 0; }}); }
    _resumeAllAnimations() { /* ... (Same as improved-chart-renderer.js) ... */ this.chartInstances.forEach(c => { if(c?.options?.animation && c._origAnimDur !== undefined) { c.options.animation.duration = c._origAnimDur; delete c._origAnimDur; }}); }

    // --- Fallback Renderer (from improved-chart-renderer.js) ---
    _setupFallbackRenderer() { /* ... (Same as improved-chart-renderer.js) ... */
        this._log('warn', 'Using fallback SVG chart renderer as Chart.js failed to load or is incompatible.');
        this.renderFallbackChart = (container, options) => {
            const width = container.clientWidth || 300; const height = Math.min(container.clientHeight || width * 0.7, 400) || 200;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', width); svg.setAttribute('height', height); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', options.title || 'Chart');
            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text'); titleEl.textContent = options.title || 'Chart'; titleEl.setAttribute('x', width / 2); titleEl.setAttribute('y', 25); titleEl.setAttribute('text-anchor', 'middle'); titleEl.setAttribute('font-size', '16px'); titleEl.setAttribute('font-weight', 'bold'); svg.appendChild(titleEl);
            try {
                if (options.type === 'bar' || options.type === 'line') this._createFallbackBarChart(svg, width, height, options);
                else if (options.type === 'pie' || options.type === 'doughnut') this._createFallbackPieChart(svg, width, height, options);
                else this._createFallbackTextChart(svg, width, height, options);
            } catch (e) { this._handleError(e, 'CreateFallback'); this._createFallbackErrorChart(svg, width, height, e.message); }
            container.innerHTML = ''; container.appendChild(svg);
            return { id: options.id || `fallback-${Date.now()}`, type: 'lightweight', container, config: options, update: () => this.renderFallbackChart(container, options), destroy: () => { container.innerHTML = ''; } };
        };
    }
    _createFallbackBarChart(svg, width, height, options) { /* ... (Same as improved-chart-renderer.js) ... */
        const data = options.data || {}; const labels = data.labels || []; const datasets = data.datasets || []; if (datasets.length === 0) return; const dataset = datasets[0]; const values = dataset.data || [];
        const validValues = values.filter(v => !isNaN(v)); if (validValues.length === 0) { this._createFallbackTextChart(svg, width, height, {title: options.title, text: 'No valid data.'}); return; }
        const maxValue = Math.max(0, ...validValues); const padding = {top:40, bottom:50, left:50, right:20}; const chartWidth = width - padding.left - padding.right; const chartHeight = height - padding.top - padding.bottom; const barCount = values.length; const barTotalWidth = chartWidth / barCount; const barGap = barTotalWidth * 0.2; const barActualWidth = barTotalWidth - barGap;
        values.forEach((val, i) => { if(isNaN(val)) return; const barH = (val / (maxValue || 1)) * chartHeight; const barX = padding.left + i * barTotalWidth + barGap / 2; const barY = padding.top + chartHeight - barH; const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); rect.setAttribute('x', barX); rect.setAttribute('y', barY); rect.setAttribute('width', barActualWidth); rect.setAttribute('height', barH); rect.setAttribute('fill', dataset.backgroundColor?.[i] || this.currentColors.primary); svg.appendChild(rect); if(labels[i]){ const lbl = document.createElementNS('http://www.w3.org/2000/svg','text'); lbl.textContent=labels[i]; lbl.setAttribute('x', barX + barActualWidth/2); lbl.setAttribute('y', padding.top+chartHeight+15); lbl.setAttribute('text-anchor','middle'); lbl.setAttribute('font-size','10px'); svg.appendChild(lbl);}});
        // Y-axis (simple)
        for(let i=0; i<=5; i++){ const yVal = (maxValue/5)*i; const yPos = padding.top + chartHeight - (yVal/(maxValue||1))*chartHeight; const tick = document.createElementNS('http://www.w3.org/2000/svg','text'); tick.textContent=yVal.toFixed(maxValue < 10 ? 1:0); tick.setAttribute('x',padding.left-5); tick.setAttribute('y',yPos+3); tick.setAttribute('text-anchor','end'); tick.setAttribute('font-size','9px'); svg.appendChild(tick); const line=document.createElementNS('http://www.w3.org/2000/svg','line'); line.setAttribute('x1',padding.left); line.setAttribute('y1',yPos); line.setAttribute('x2',padding.left+chartWidth); line.setAttribute('y2',yPos); line.setAttribute('stroke',this.currentColors.grid); line.setAttribute('stroke-width','0.5'); svg.appendChild(line);}
    }
    _createFallbackPieChart(svg, width, height, options) { /* ... (Same as improved-chart-renderer.js, simplified) ... */
        const data = options.data || {}; const labels = data.labels || []; const datasets = data.datasets || []; if (datasets.length === 0) return; const dataset = datasets[0]; const values = dataset.data || []; const validValues = []; const validLabels = []; values.forEach((v,i)=>{if(!isNaN(v)&&v>0){validValues.push(v); validLabels.push(labels[i]||`Item ${i+1}`);}}); if(validValues.length===0){this._createFallbackTextChart(svg,width,height,{title:options.title,text:'No data.'});return;}
        const total = validValues.reduce((s,v)=>s+v,0); const cx=width/2; const cy=height/2; const radius=Math.min(width,height)/3; let currentAngle = -Math.PI/2;
        validValues.forEach((val,i)=>{const sliceAngle=(val/total)*(2*Math.PI); const x1=cx+radius*Math.cos(currentAngle); const y1=cy+radius*Math.sin(currentAngle); currentAngle+=sliceAngle; const x2=cx+radius*Math.cos(currentAngle); const y2=cy+radius*Math.sin(currentAngle); const largeArcFlag=sliceAngle > Math.PI ? 1:0; const pathData = `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`; const path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d',pathData); path.setAttribute('fill',dataset.backgroundColor?.[i] || this._getColorForIndex(i, this.currentColors)); path.setAttribute('stroke',this.currentColors.background); path.setAttribute('stroke-width','1'); svg.appendChild(path);});
        if(options.type === 'doughnut'){const innerCircle=document.createElementNS('http://www.w3.org/2000/svg','circle'); innerCircle.setAttribute('cx',cx); innerCircle.setAttribute('cy',cy); innerCircle.setAttribute('r',radius*0.5); innerCircle.setAttribute('fill',this.currentColors.background); svg.appendChild(innerCircle);}
    }
    _createFallbackTextChart(svg, width, height, options) { /* ... (Same as improved-chart-renderer.js) ... */
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text'); text.textContent = options.text || 'Chart data not available'; text.setAttribute('x', width / 2); text.setAttribute('y', height / 2); text.setAttribute('text-anchor', 'middle'); text.setAttribute('font-size', '14px'); text.setAttribute('fill', this.currentColors.text); svg.appendChild(text);
    }
    _createFallbackErrorChart(svg, width, height, errorMessage) { /* ... (Same as improved-chart-renderer.js) ... */
        const errorCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); errorCircle.setAttribute('cx', width / 2); errorCircle.setAttribute('cy', height / 2 - 20); errorCircle.setAttribute('r', 20); errorCircle.setAttribute('fill', this.currentColors.danger); svg.appendChild(errorCircle);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text'); text.textContent = `Error: ${this.helpers.sanitizeData(errorMessage)}`; text.setAttribute('x', width / 2); text.setAttribute('y', height / 2 + 20); text.setAttribute('text-anchor', 'middle'); text.setAttribute('font-size', '12px'); text.setAttribute('fill', this.currentColors.danger); svg.appendChild(text);
    }

    // --- Accessibility & Memory Plugins (from improved-chart-renderer.js) ---
    _registerAccessibilityPlugin(ChartJS) { /* ... (Same as improved-chart-renderer.js, ensure ChartJS is passed) ... */
        const plugin = { id: 'cvdToolkitAccessibility', afterRender: (chart) => { const canvas = chart.canvas; canvas.setAttribute('role','img'); canvas.setAttribute('aria-label', chart.config.options.plugins.title.text || 'Chart'); if (this.defaultConfig.accessibility.textDescriptions) { let descEl = document.getElementById(`chart-desc-${chart.id}`); if(!descEl){descEl=document.createElement('div'); descEl.id=`chart-desc-${chart.id}`; descEl.className='sr-only'; descEl.setAttribute('aria-hidden','false'); canvas.parentNode?.appendChild(descEl);} descEl.textContent = this._generateChartDescription(chart); canvas.setAttribute('aria-describedby', descEl.id);}}}; ChartJS.register(plugin);
    }
    _registerMemoryOptimizationPlugin(ChartJS) { /* ... (Same as improved-chart-renderer.js, ensure ChartJS is passed) ... */
        const plugin = { id:'cvdToolkitMemoryOpt', beforeInit:(chart)=>{if(chart.data?.datasets){let pts=0; chart.data.datasets.forEach(ds=>pts+=ds.data?.length||0); if(pts>1000){chart._originalData=this.helpers.deepClone(chart.data); if(this.deviceCapabilities.isLowEnd)chart.data.datasets.forEach(ds=>{if(ds.data?.length>500)ds.data=this._sampleData(ds.data,500)}); if(chart.options?.animation)chart.options.animation.duration=0; if(chart.options?.elements?.point){chart.options.elements.point.radius=1; chart.options.elements.point.hoverRadius=3;}}}}, destroy:(chart)=>{if(chart._originalData)delete chart._originalData;}}; ChartJS.register(plugin);
    }
    _generateChartDescription(chart) { /* ... (Same as improved-chart-renderer.js, ensure access to chart.config) ... */
        const config = chart.config; const type = config.type; const title = config.options?.plugins?.title?.text || 'Chart'; let desc = `${title}. Type: ${type}. `;
        if((type==='line'||type==='bar') && config.data?.datasets?.length && config.data?.labels?.length){desc += `${config.data.datasets.length} series, ${config.data.labels.length} categories: ${config.data.labels.join(', ')}.`; config.data.datasets.forEach((ds,i)=>{desc+=` Series ${i+1} (${ds.label||''}): values ${ds.data.slice(0,3).join(', ')}...`;});}
        else if((type==='pie'||type==='doughnut') && config.data?.datasets?.[0]?.data?.length && config.data?.labels?.length){const total=config.data.datasets[0].data.reduce((s,v)=>s+v,0); desc+=`${config.data.labels.length} segments. `; config.data.labels.forEach((lbl,i)=>{desc+=`${lbl}: ${((config.data.datasets[0].data[i]/total)*100).toFixed(1)}%. `;});}
        return desc;
    }
    // _navigateChart and _showTooltipForSelectedItem would be part of accessibility plugin if fully implemented for keyboard nav on canvas.

    // --- Public Chart Creation Methods (Integrating from RiskVisualization & improved-chart-renderer.js) ---

    /**
     * Creates a basic CVD risk score chart (bar chart).
     * @param {string} chartId - Unique ID for this chart instance.
     * @param {HTMLElement} container - The DOM element to render the chart in.
     * @param {object} riskData - Data object, e.g., { baseRisk: 0.15, modifiedRisk: 0.12, lpaModifierEffect: 0.02 }
     * @param {string} calculatorType - 'FRS' or 'QRISK3' for labeling.
     * @param {object} [chartOptions={}] - Custom Chart.js options.
     * @returns {Chart|null} Chart.js instance or null on error/fallback.
     */
    createCvdRiskScoreChart(chartId, container, riskData, calculatorType, chartOptions = {}) {
        if (!this.libraryLoaded) return this.renderFallbackChart(container, { id: chartId, type: 'bar', title: `${calculatorType} Risk Score`, data: { labels: ['Risk'], datasets: [{ data: [riskData?.modifiedRisk || riskData?.baseRisk || 0] }] } });
        this._cleanupExistingChart(chartId, container); // Use new signature
        const canvas = this._ensureCanvas(chartId, container);
        if (!canvas) return null;

        const baseRisk = riskData?.baseRisk || 0;
        const modifiedRisk = riskData?.modifiedRisk !== undefined ? riskData.modifiedRisk : baseRisk;
        const riskColor = this._getRiskCategoryColor(modifiedRisk * 100); // Use helper for color

        const data = {
            labels: [`${calculatorType} 10-Year CVD Risk`],
            datasets: [{
                label: 'Base Risk',
                data: [baseRisk * 100], // Convert to percentage
                backgroundColor: this.currentColors.baseline,
                borderColor: this.currentColors.secondary,
                borderWidth: 1
            }]
        };

        if (riskData?.modifiedRisk !== undefined && Math.abs(baseRisk - modifiedRisk) > 0.001) {
            data.datasets.push({
                label: 'Modified Risk (e.g., with Lp(a))',
                data: [modifiedRisk * 100],
                backgroundColor: riskColor.fill,
                borderColor: riskColor.border,
                borderWidth: 1
            });
        } else { // If no modified risk or same as base, just show one bar with appropriate color
            data.datasets[0].label = 'Overall Risk';
            data.datasets[0].backgroundColor = riskColor.fill;
            data.datasets[0].borderColor = riskColor.border;
        }

        const config = this._mergeOptions({
            type: 'bar',
            data: data,
            options: {
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                scales: { x: { beginAtZero: true, max: Math.max(30, Math.ceil(Math.max(baseRisk, modifiedRisk) * 100 / 5) * 5 + 5), ticks: { callback: v => `${v}%` }, title: { display: true, text: '10-Year CVD Risk (%)' } }, y: { ticks: { font: { size: this.defaultConfig.fonts.size.medium }}} },
                plugins: { legend: { display: data.datasets.length > 1, position: 'bottom' }, title: { display: true, text: `${calculatorType} Risk Assessment` }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.x.toFixed(1)}%` } } }
            }
        }, chartOptions);

        const chartInstance = new window.Chart(canvas.getContext('2d'), config);
        this.chartInstances.set(chartId, chartInstance);
        return chartInstance;
    }

    /**
     * Creates a comparison chart for FRS and QRISK3 scores.
     * @param {string} chartId - Unique ID for this chart instance.
     * @param {HTMLElement} container - The DOM element to render the chart in.
     * @param {object} frsRiskData - FRS result object { score: percentage_value, category: 'High' }
     * @param {object} qriskRiskData - QRISK3 result object { score: percentage_value, category: 'High' }
     * @param {object} [chartOptions={}] - Custom Chart.js options.
     * @returns {Chart|null} Chart.js instance or null on error/fallback.
     */
    createCalculatorsComparisonChart(chartId, container, frsRiskData, qriskRiskData, chartOptions = {}) {
        if (!this.libraryLoaded) return this.renderFallbackChart(container, { id: chartId, type: 'bar', title: 'Risk Score Comparison', data: { labels: ['FRS', 'QRISK3'], datasets: [{ data: [frsRiskData?.score || 0, qriskRiskData?.score || 0] }] } });
        this._cleanupExistingChart(chartId, container);
        const canvas = this._ensureCanvas(chartId, container);
        if (!canvas) return null;

        const frsScore = frsRiskData?.score || 0;
        const qriskScore = qriskRiskData?.score || 0;

        const data = {
            labels: ['Calculated 10-Year CVD Risk'],
            datasets: [
                { label: 'Framingham Risk Score', data: [frsScore], backgroundColor: this.currentColors.secondary, borderColor: this.currentColors.secondary, borderWidth: 1 },
                { label: 'QRISK3 Score', data: [qriskScore], backgroundColor: this.currentColors.primary, borderColor: this.currentColors.primary, borderWidth: 1 }
            ]
        };

        const config = this._mergeOptions({
            type: 'bar', data: data,
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, max: Math.max(30, Math.ceil(Math.max(frsScore, qriskScore) / 5) * 5 + 5), ticks: { callback: v => `${v}%` }, title: { display: true, text: '10-Year CVD Risk (%)' } } },
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Risk Score Comparison: FRS vs QRISK3' }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%` } } }
            }
        }, chartOptions);

        const chartInstance = new window.Chart(canvas.getContext('2d'), config);
        this.chartInstances.set(chartId, chartInstance);
        return chartInstance;
    }


    /**
     * Creates a chart visualizing risk factor contributions.
     * @param {string} chartId - Unique ID for this chart instance.
     * @param {HTMLElement} container - The DOM element.
     * @param {object} riskFactorsData - e.g., { factors: [{name: 'Age', value: 5, modifiable: false}, ...], totalRisk: 20 }
     * @param {object} [chartOptions={}] - Custom Chart.js options.
     * @returns {Chart|null}
     */
    createRiskFactorsContributionChart(chartId, container, riskFactorsData, chartOptions = {}) {
        if (!this.libraryLoaded) return this.renderFallbackChart(container, { id: chartId, type: 'bar', title: 'Risk Factor Contribution', data: { labels: (riskFactorsData?.factors || []).map(f=>f.name), datasets: [{ data: (riskFactorsData?.factors || []).map(f=>f.value) }] } });
        this._cleanupExistingChart(chartId, container);
        const canvas = this._ensureCanvas(chartId, container);
        if (!canvas || !riskFactorsData?.factors?.length) return null;

        const labels = riskFactorsData.factors.map(f => f.name);
        const values = riskFactorsData.factors.map(f => f.value); // Assuming these are % contributions or additive points
        const backgroundColors = riskFactorsData.factors.map(f => f.modifiable ? this.currentColors.primary : this.currentColors.secondary);

        const data = {
            labels: labels,
            datasets: [{
                label: 'Risk Contribution', data: values, backgroundColor: backgroundColors,
            }]
        };
        const config = this._mergeOptions({
            type: 'bar', data: data,
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                scales: { x: { beginAtZero: true, title: { display: true, text: 'Contribution to Risk (Arbitrary Units or %)' } } },
                plugins: { legend: { display: false }, title: { display: true, text: 'Risk Factor Contribution' },
                           tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed.x.toFixed(1)} (Modifiable: ${riskFactorsData.factors[ctx.dataIndex]?.modifiable ? 'Yes' : 'No'})` }}
                }
            }
        }, chartOptions);
        const chartInstance = new window.Chart(canvas.getContext('2d'), config);
        this.chartInstances.set(chartId, chartInstance);
        return chartInstance;
    }

    /**
     * Creates a chart visualizing treatment benefits.
     * @param {string} chartId - Unique ID for this chart instance.
     * @param {HTMLElement} container - The DOM element.
     * @param {number} currentRiskPercent - Current risk percentage.
     * @param {number} potentialRiskPercent - Potential risk after treatment.
     * @param {object} [chartOptions={}] - Custom Chart.js options.
     * @returns {Chart|null}
     */
    createTreatmentBenefitChart(chartId, container, currentRiskPercent, potentialRiskPercent, chartOptions = {}) {
        if (!this.libraryLoaded) return this.renderFallbackChart(container, { id: chartId, type: 'bar', title: 'Treatment Benefit', data: { labels:['Current', 'Potential'], datasets:[{data:[currentRiskPercent, potentialRiskPercent]}]} });
        this._cleanupExistingChart(chartId, container);
        const canvas = this._ensureCanvas(chartId, container);
        if (!canvas) return null;

        const currentRiskColor = this._getRiskCategoryColor(currentRiskPercent);
        const potentialRiskColor = this._getRiskCategoryColor(potentialRiskPercent);

        const data = {
            labels: ['Risk Level'],
            datasets: [
                { label: 'Current Risk', data: [currentRiskPercent], backgroundColor: currentRiskColor.fill, borderColor: currentRiskColor.border, borderWidth: 1 },
                { label: 'Potential Risk with Treatment', data: [potentialRiskPercent], backgroundColor: potentialRiskColor.fill, borderColor: potentialRiskColor.border, borderWidth: 1 }
            ]
        };
        const config = this._mergeOptions({
            type: 'bar', data: data,
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, max: Math.max(30, Math.ceil(Math.max(currentRiskPercent, potentialRiskPercent) / 5) * 5 + 5), ticks: { callback: v => `${v}%` }, title: { display: true, text: '10-Year CVD Risk (%)' } } },
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Potential Benefit of Treatment' },
                           tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%` }}
                }
            }
        }, chartOptions);
        const chartInstance = new window.Chart(canvas.getContext('2d'), config);
        this.chartInstances.set(chartId, chartInstance);
        return chartInstance;
    }

    // --- Methods from improved-chart-renderer.js (RiskTime, LipidProfile) ---
    createRiskTimeChart(chartId, container, data, options = {}) { /* ... (Logic from improved-chart-renderer.js, adapted to use this.currentColors and this._ensureCanvas) ... */
        if (!this.libraryLoaded) return this.renderFallbackChart(container, { id: chartId, type: 'line', title: options?.title || 'Risk Over Time', data });
        this._cleanupExistingChart(chartId, container); const canvas = this._ensureCanvas(chartId, container); if (!canvas) return null;
        const config = this._mergeOptions({ type: 'line', data, options: { responsive:true, maintainAspectRatio:false, scales:{x:{title:{display:true, text:'Time'}}, y:{beginAtZero:true, max:30, ticks:{callback:v=>`${v}%`}, title:{display:true, text:'Risk (%)'}}}, plugins:{legend:{display:true}, title:{display:true, text: options?.title || 'Risk Over Time'}}}}, options);
        const chartInstance = new window.Chart(canvas.getContext('2d'), config); this.chartInstances.set(chartId, chartInstance); return chartInstance;
    }
    createLipidProfileChart(chartId, container, data, options = {}) { /* ... (Logic from improved-chart-renderer.js, adapted) ... */
        if (!this.libraryLoaded) return this.renderFallbackChart(container, { id: chartId, type: 'bar', title: options?.title || 'Lipid Profile', data });
        this._cleanupExistingChart(chartId, container); const canvas = this._ensureCanvas(chartId, container); if (!canvas) return null;
        const config = this._mergeOptions({ type: 'bar', data, options: { responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true, title:{display:true, text: data?.datasets?.[0]?.unit || 'mmol/L'}}}, plugins:{legend:{display:false}, title:{display:true, text: options?.title || 'Lipid Profile'}}}}, options);
        const chartInstance = new window.Chart(canvas.getContext('2d'), config); this.chartInstances.set(chartId, chartInstance); return chartInstance;
    }


    // --- Management and Helper Methods ---
    _ensureCanvas(chartId, container) {
        let canvas = container.querySelector(`canvas#${chartId}-canvas`);
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = `${chartId}-canvas`;
            canvas.setAttribute('role', 'img'); // Basic ARIA
            container.innerHTML = ''; // Clear container before adding new canvas
            container.appendChild(canvas);
        }
        return canvas;
    }

    _cleanupExistingChart(chartId, container) { // Added container to ensure we only clear relevant one
        if (this.chartInstances.has(chartId)) {
            const oldChart = this.chartInstances.get(chartId);
            oldChart.destroy();
            this.chartInstances.delete(chartId);
        }
        if(container) container.innerHTML = ''; // Clear container explicitly
    }

    _getRiskCategoryColor(riskPercent) { // Helper from RiskVisualization logic
        if (isNaN(riskPercent)) return this.currentColors.secondary; // Default color for unknown
        if (riskPercent >= (this.defaultConfig.colorSchemes.default.veryHighThreshold || 30)) return this.currentColors.veryHigh; // Assuming a threshold
        if (riskPercent >= (this.defaultConfig.colorSchemes.default.highThreshold || 20)) return this.currentColors.high;
        if (riskPercent >= (this.defaultConfig.colorSchemes.default.intermediateThreshold || 10)) return this.currentColors.intermediate;
        return this.currentColors.low;
    }

    updateColorScheme(themeName) { /* ... (Same as improved-chart-renderer.js, ensure it uses this.defaultConfig.colorSchemes and sets this.currentColors) ... */
        const newScheme = this.defaultConfig.colorSchemes[themeName] || this.defaultConfig.colorSchemes.default;
        this.currentColors = newScheme;
        window.Chart.defaults.color = this.currentColors.text;
        this.chartInstances.forEach(chart => {
            chart.options.scales.x.grid.color = this.currentColors.grid; chart.options.scales.y.grid.color = this.currentColors.grid;
            chart.options.scales.x.ticks.color = this.currentColors.text; chart.options.scales.y.ticks.color = this.currentColors.text;
            // More detailed color updates per dataset might be needed here based on chart type
            chart.data.datasets.forEach((dataset, index) => {
                const colorKey = dataset.label?.toLowerCase().includes('risk') ? 'primary' : Object.keys(this.currentColors)[index % 5]; // Simple cycle
                dataset.borderColor = this.currentColors[colorKey] || this.currentColors.primary;
                dataset.backgroundColor = this._addAlpha(this.currentColors[colorKey] || this.currentColors.primary, 0.5);
            });
            chart.update();
        });
        this._log('info', `Chart color scheme updated to: ${themeName}`);
    }

    _addAlpha(color, alpha) { /* ... (Same as improved-chart-renderer.js) ... */
        if (color.startsWith('rgba')) return color.replace(/[\d\.]+\)$/, `${alpha})`); if (color.startsWith('rgb')) return color.replace('rgb','rgba').replace(')',`,${alpha})`); if (color.startsWith('#')) { const r = parseInt(color.slice(1,3),16), g=parseInt(color.slice(3,5),16), b=parseInt(color.slice(5,7),16); return `rgba(${r},${g},${b},${alpha})`;} return color;
    }

    // Other utility methods from improved-chart-renderer.js like updateChart, destroyChart, getChartImage
    // can be kept as they are, ensuring they use this.chartInstances.
    updateChart(id, data, animate = true) { /* ... (from improved-chart-renderer.js, using this.chartInstances) ... */
        const chart = this.chartInstances.get(id); if(!chart) { this._handleError(new Error(`Chart ${id} not found for update.`), 'UpdateChart'); return; }
        if(chart.type === 'lightweight') { chart.config.data = data; chart.update(); return; } // For fallback
        if(data.datasets) chart.data.datasets = data.datasets; if(data.labels) chart.data.labels = data.labels;
        chart.options.animation = (animate && !this.deviceCapabilities.isLowEnd) ? this.defaultConfig.animation : false;
        chart.update(); chart.options.animation = this.defaultConfig.animation; // Restore
    }
    destroyChart(id) { /* ... (from improved-chart-renderer.js, using this.chartInstances) ... */
        const chart = this.chartInstances.get(id); if(chart) { chart.destroy(); this.chartInstances.delete(id); this._log('info', `Chart ${id} destroyed.`);}
    }
    async getChartImage(id, type = 'png', quality = 0.95) { /* ... (from improved-chart-renderer.js, using this.chartInstances) ... */
        const chart = this.chartInstances.get(id); if(!chart) { this._handleError(new Error(`Chart ${id} not found for image export.`), 'GetChartImage'); return null; }
        if(chart.type === 'lightweight' && chart.container?.querySelector('svg')) return this._svgToDataURL(chart.container.querySelector('svg'), type, quality);
        if(!chart.canvas) return null; this._restoreOriginalData(id); return chart.canvas.toDataURL(`image/${type}`, quality);
    }
    _svgToDataURL(svg, type, quality) { /* ... (Same as improved-chart-renderer.js) ... */
        return new Promise((resolve, reject) => {
            try { const s = new XMLSerializer(); let svgData = s.serializeToString(svg); svgData = `<?xml version="1.0" standalone="no"?>\r\n${svgData}`; const svgUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
                if (type === 'svg') { resolve(svgUrl); return; } // If SVG itself is requested
                const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); canvas.width = svg.width.baseVal.value * (this.defaultConfig.responsive.aspectRatios.large || 2); canvas.height = svg.height.baseVal.value * (this.defaultConfig.responsive.aspectRatios.large || 2); const ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL(`image/${type}`,quality));}; img.onerror = (e) => reject(new Error('SVG to Image conversion error: ' + e)); img.src = svgUrl;
            } catch (e) { reject(e); }
        });
    }

}

// Instantiate and export the singleton service (typically done in main.js)
// const ChartRendererServiceInstance = new ChartRendererService({
// dependencies: { /* ... */ }
// });
// window.ChartRendererServiceInstance = ChartRendererServiceInstance;
// export default ChartRendererServiceInstance;
```

**Summary of Fusion and Enhancements for `ChartRendererService`:**

1.  **Base**: Built upon the robust structure of `improved-chart-renderer.js` (v2.0.2).
2.  **Specific Chart Methods Integrated**:
    * `createCvdRiskScoreChart`: Replaces `createBasicRiskVisualization` from `RiskVisualization`. Creates a bar chart for 10-year CVD risk (base and modified if applicable).
    * `createCalculatorsComparisonChart`: Replaces `createRiskComparisonVisualization`. Creates a bar chart comparing FRS and QRISK3 scores.
    * `createRiskFactorsContributionChart`: Replaces `createRiskFactorVisualization`. Creates a bar chart (could be adapted for radar) for risk factor contributions, indicating modifiable factors.
    * `createTreatmentBenefitChart`: Replaces `createTreatmentEffectVisualization`. Creates a bar chart showing current risk vs. potential risk after treatment.
    * The original `createRiskTimeChart` and `createLipidProfileChart` from `improved-chart-renderer.js` are retained.
3.  **Color Management**: Uses the `defaultConfig.colorSchemes` from `improved-chart-renderer.js`. The specific chart methods now use a helper `_getRiskCategoryColor` (inspired by `RiskVisualization`) to apply appropriate colors based on risk levels.
4.  **Chart.js Dependency**: Continues to dynamically load Chart.js and the annotation plugin, with fallbacks.
5.  **Accessibility & Performance**: Retains the accessibility plugin (ARIA, text descriptions) and memory optimization plugin (data downsampling) from `improved-chart-renderer.js`.
6.  **Fallback Rendering**: Retains the SVG-based fallback rendering if Chart.js fails.
7.  **Event Handling**:
    * Listens to `chart:renderRequest` (expected to be published by `ResultsDisplayService` or `AppUI`) to trigger the creation of specific chart types. This makes the chart rendering more event-driven and decoupled.
    * Continues to handle `theme:changed`, `memory:warning`, and `visibilitychange` events.
8.  **DOM Management**:
    * `_ensureCanvas`: Helper to create or reuse a canvas within the target container.
    * `_cleanupExistingChart`: Destroys old Chart.js instance and clears the container before rendering a new chart.
9.  **Dependencies**: Relies on injected dependencies for logging, event bus, memory management, etc., as established in the project structure. Helper functions are also assumed to be available.

This fused `ChartRendererService` should now provide a unified and powerful interface for all charting needs within the CVD Risk Toolkit.

Next, I will proceed to update `index.html` with the new UI elements you requested for the "Medication & Labs" and "QRISK3" ta