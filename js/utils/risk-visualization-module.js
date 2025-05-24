/**
 * Enhanced Risk Visualization Module
 * @file /js/utils/risk-visualization.js
 * @description Provides interactive and accessible visualizations for cardiovascular risk
 * @version 2.0.1
 * @author CVD Risk Assessment Team
 */

import { eventBus } from './event-bus.js';

/**
 * RiskVisualization Class
 * Creates various visualizations for cardiovascular risk assessment
 */
class RiskVisualization {
    constructor() {
        // Chart colors based on risk categories with accessibility considerations
        this.colors = {
            low: {
                fill: 'rgba(40, 167, 69, 0.7)',
                border: 'rgb(40, 167, 69)',
                highlight: 'rgba(40, 167, 69, 0.9)'
            },
            moderate: {
                fill: 'rgba(255, 193, 7, 0.7)',
                border: 'rgb(255, 193, 7)',
                highlight: 'rgba(255, 193, 7, 0.9)'
            },
            high: {
                fill: 'rgba(220, 53, 69, 0.7)',
                border: 'rgb(220, 53, 69)',
                highlight: 'rgba(220, 53, 69, 0.9)'
            },
            extreme: {
                fill: 'rgba(153, 0, 0, 0.7)',
                border: 'rgb(153, 0, 0)',
                highlight: 'rgba(153, 0, 0, 0.9)'
            },
            baseline: {
                fill: 'rgba(108, 117, 125, 0.3)',
                border: 'rgb(108, 117, 125)',
                highlight: 'rgba(108, 117, 125, 0.5)'
            },
            modified: {
                fill: 'rgba(0, 123, 255, 0.7)',
                border: 'rgb(0, 123, 255)',
                highlight: 'rgba(0, 123, 255, 0.9)'
            }
        };
        
        // Chart options with accessibility features
        this.chartDefaults = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += (context.parsed.y * 100).toFixed(1) + '%';
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 13
                        },
                        padding: 15
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return (value * 100) + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    beginAtZero: true
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        };
        
        // Risk category thresholds
        this.riskCategories = {
            low: { max: 0.1, label: 'Low Risk' },
            moderate: { max: 0.2, label: 'Moderate Risk' },
            high: { max: 0.3, label: 'High Risk' },
            extreme: { max: 1.0, label: 'Very High Risk' }
        };
        
        // Initialize event listeners for risk visualization
        this._initializeEvents();
        
        // Track active charts for clean up
        this.activeCharts = new Map();
    }
    
    /**
     * Initialize event listeners
     * @private
     */
    _initializeEvents() {
        // Listen for risk calculation events to update visualizations
        eventBus.subscribe('calculation-complete', (data) => {
            const { calculatorType, results } = data;
            
            // Update visualization for the specific calculator
            if (calculatorType === 'frs') {
                this.updateFraminghamVisualization(results);
            } else if (calculatorType === 'qrisk') {
                this.updateQRISKVisualization(results);
            }
        });
        
        // Listen for tab changes to resize charts
        document.addEventListener('DOMContentLoaded', () => {
            // Add listeners to tab buttons
            const tabButtons = document.querySelectorAll('.tab');
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Give charts time to become visible before resizing
                    setTimeout(() => {
                        this._resizeActiveCharts();
                    }, 100);
                });
            });
            
            // Listen for window resize to adjust charts
            window.addEventListener('resize', this._debounce(() => {
                this._resizeActiveCharts();
            }, 250));
        });
        
        // Listen for theme changes to update charts
        eventBus.subscribe('theme-changed', (data) => {
            this._updateChartsForTheme(data.isDarkMode);
        });
    }
    
    /**
     * Creates a basic risk visualization in the specified container
     * @param {HTMLElement} container - Container element for the chart
     * @param {Object} riskData - Risk calculation data
     * @param {string} calculatorType - Type of calculator (frs or qrisk)
     * @returns {Object} Created chart instance
     * @public
     */
    createBasicRiskVisualization(container, riskData, calculatorType) {
        if (!container || !riskData) return null;
        
        // Clean up any existing chart in this container
        this._cleanupExistingChart(container.id);
        
        // Get the canvas element from the container
        let canvas = container.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = `${container.id}-canvas`;
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', `${calculatorType === 'frs' ? 'Framingham' : 'QRISK3'} risk visualization`);
            container.appendChild(canvas);
        }
        
        // Prepare risk categories for the chart
        const categories = Object.keys(this.riskCategories);
        
        // Prepare data for the chart
        const baseRisk = riskData.baseRisk || 0;
        const modifiedRisk = riskData.modifiedRisk || baseRisk;
        
        // Determine risk category color
        let riskColor = this.colors.low;
        if (modifiedRisk >= 0.2) {
            riskColor = this.colors.high;
        } else if (modifiedRisk >= 0.1) {
            riskColor = this.colors.moderate;
        }
        
        // Prepare datasets
        const datasets = [
            {
                label: 'Base Risk',
                data: [baseRisk],
                backgroundColor: this.colors.baseline.fill,
                borderColor: this.colors.baseline.border,
                borderWidth: 1,
                hoverBackgroundColor: this.colors.baseline.highlight
            }
        ];
        
        // Add modified risk if it differs from base risk
        if (modifiedRisk !== baseRisk) {
            datasets.push({
                label: 'Modified Risk',
                data: [modifiedRisk],
                backgroundColor: riskColor.fill,
                borderColor: riskColor.border,
                borderWidth: 1,
                hoverBackgroundColor: riskColor.highlight
            });
        } else {
            // If risks are the same, update the color of the base risk
            datasets[0].backgroundColor = riskColor.fill;
            datasets[0].borderColor = riskColor.border;
            datasets[0].hoverBackgroundColor = riskColor.highlight;
            datasets[0].label = 'Overall Risk';
        }
        
        // Create chart configuration
        const config = {
            type: 'bar',
            data: {
                labels: ['10-Year CVD Risk'],
                datasets: datasets
            },
            options: {
                ...this.chartDefaults,
                plugins: {
                    ...this.chartDefaults.plugins,
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                return `${context.dataset.label}: ${(value * 100).toFixed(1)}%`;
                            },
                            afterBody: function(tooltipItems) {
                                const value = tooltipItems[0].parsed.y;
                                let category = '';
                                
                                if (value < 0.1) {
                                    category = 'Low Risk';
                                } else if (value < 0.2) {
                                    category = 'Moderate Risk';
                                } else {
                                    category = 'High Risk';
                                }
                                
                                return `Risk Category: ${category}`;
                            }
                        }
                    }
                }
            }
        };
        
        // Create the chart
        const chart = new Chart(canvas.getContext('2d'), config);
        
        // Store the chart reference for later cleanup
        this.activeCharts.set(container.id, chart);
        
        return chart;
    }
    
    /**
     * Creates a detailed risk comparison visualization for the specified container
     * @param {HTMLElement} container - Container element for the chart
     * @param {Object} comparisonData - Risk comparison data
     * @returns {Object} Created chart instance
     * @public
     */
    createRiskComparisonVisualization(container, comparisonData) {
        if (!container || !comparisonData) return null;
        
        // Clean up any existing chart in this container
        this._cleanupExistingChart(container.id);
        
        // Get the canvas element from the container
        let canvas = container.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = `${container.id}-canvas`;
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', 'Risk calculator comparison visualization');
            container.appendChild(canvas);
        }
        
        // Extract comparison data
        const { framingham, qrisk, differences } = comparisonData;
        
        if (!framingham || !qrisk) {
            console.error('Missing calculator data for comparison');
            return null;
        }
        
        // Prepare datasets for comparison
        const datasets = [
            {
                label: 'Framingham Risk Score',
                data: [framingham.baseRisk, framingham.modifiedRisk || framingham.baseRisk],
                backgroundColor: this.colors.baseline.fill,
                borderColor: this.colors.baseline.border,
                borderWidth: 1,
                hoverBackgroundColor: this.colors.baseline.highlight
            },
            {
                label: 'QRISK3',
                data: [qrisk.baseRisk, qrisk.modifiedRisk || qrisk.baseRisk],
                backgroundColor: this.colors.modified.fill,
                borderColor: this.colors.modified.border,
                borderWidth: 1,
                hoverBackgroundColor: this.colors.modified.highlight
            }
        ];
        
        // Create chart configuration
        const config = {
            type: 'bar',
            data: {
                labels: ['Base Risk', 'Modified Risk'],
                datasets: datasets
            },
            options: {
                ...this.chartDefaults,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '10-Year CVD Risk'
                        },
                        ticks: {
                            callback: function(value) {
                                return (value * 100) + '%';
                            }
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    ...this.chartDefaults.plugins,
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.x;
                                return `${context.dataset.label}: ${(value * 100).toFixed(1)}%`;
                            },
                            afterBody: function(tooltipItems) {
                                const index = tooltipItems[0].dataIndex;
                                const label = index === 0 ? 'Base Risk' : 'Modified Risk';
                                const diff = differences[label.toLowerCase().replace(' ', '_')];
                                
                                if (diff) {
                                    const value = Math.abs(diff * 100).toFixed(1);
                                    const direction = diff > 0 ? 'higher' : 'lower';
                                    return `Framingham is ${value}% ${direction} than QRISK3`;
                                }
                                
                                return '';
                            }
                        }
                    }
                }
            }
        };
        
        // Create the chart
        const chart = new Chart(canvas.getContext('2d'), config);
        
        // Store the chart reference for later cleanup
        this.activeCharts.set(container.id, chart);
        
        return chart;
    }
    
    /**
     * Creates an interactive risk factor contribution visualization
     * @param {HTMLElement} container - Container element for the chart
     * @param {Object} riskData - Risk calculation data
     * @param {string} calculatorType - Type of calculator (frs or qrisk)
     * @returns {Object} Created chart instance
     * @public
     */
    createRiskFactorVisualization(container, riskData, calculatorType) {
        if (!container || !riskData || !riskData.riskFactors) return null;
        
        // Clean up any existing chart in this container
        this._cleanupExistingChart(container.id);
        
        // Get the canvas element from the container
        let canvas = container.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = `${container.id}-canvas`;
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', `${calculatorType === 'frs' ? 'Framingham' : 'QRISK3'} risk factor visualization`);
            container.appendChild(canvas);
        }
        
        // Process risk factors for visualization
        const { labels, values, modifiable } = this._processRiskFactors(riskData.riskFactors, calculatorType);
        
        // Create colors array based on whether factors are modifiable
        const backgroundColors = modifiable.map(isModifiable => 
            isModifiable ? 'rgba(0, 123, 255, 0.7)' : 'rgba(108, 117, 125, 0.7)'
        );
        
        const borderColors = modifiable.map(isModifiable => 
            isModifiable ? 'rgb(0, 123, 255)' : 'rgb(108, 117, 125)'
        );
        
        // Prepare datasets
        const datasets = [
            {
                label: 'Contribution to Risk',
                data: values,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }
        ];
        
        // Create chart configuration
        const config = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                ...this.chartDefaults,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Contribution to Overall Risk (%)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    ...this.chartDefaults.plugins,
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.x;
                                return `Contribution: ${value.toFixed(1)}%`;
                            },
                            afterBody: function(tooltipItems) {
                                const index = tooltipItems[0].dataIndex;
                                return modifiable[index] ? 
                                    'This is a modifiable risk factor' : 
                                    'This is a non-modifiable risk factor';
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                }
            }
        };
        
        // Create the chart
        const chart = new Chart(canvas.getContext('2d'), config);
        
        // Add legend for modifiable vs non-modifiable factors
        this._addCustomLegend(container, [
            { label: 'Modifiable Risk Factor', color: 'rgba(0, 123, 255, 0.7)' },
            { label: 'Non-modifiable Risk Factor', color: 'rgba(108, 117, 125, 0.7)' }
        ]);
        
        // Store the chart reference for later cleanup
        this.activeCharts.set(container.id, chart);
        
        return chart;
    }
    
    /**
     * Creates an interactive treatment effect visualization
     * @param {HTMLElement} container - Container element for the chart
     * @param {Object} riskData - Risk calculation data
     * @param {Object} treatmentEffects - Treatment effect data
     * @returns {Object} Created chart instance
     * @public
     */
    createTreatmentEffectVisualization(container, riskData, treatmentEffects) {
        if (!container || !riskData || !treatmentEffects) return null;
        
        // Clean up any existing chart in this container
        this._cleanupExistingChart(container.id);
        
        // Get the canvas element from the container
        let canvas = container.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = `${container.id}-canvas`;
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', 'Treatment effect visualization');
            container.appendChild(canvas);
        }
        
        // Extract data for visualization
        const currentRisk = riskData.modifiedRisk || riskData.baseRisk || 0;
        const potentialRisk = treatmentEffects.estimatedRisk || currentRisk * 0.7; // Default 30% reduction
        
        // Color based on risk category
        let currentColor = this._getRiskColor(currentRisk);
        let potentialColor = this._getRiskColor(potentialRisk);
        
        // Prepare datasets
        const datasets = [
            {
                label: 'Current Risk',
                data: [currentRisk],
                backgroundColor: currentColor.fill,
                borderColor: currentColor.border,
                borderWidth: 1,
                hoverBackgroundColor: currentColor.highlight
            },
            {
                label: 'Potential Risk with Treatment',
                data: [potentialRisk],
                backgroundColor: potentialColor.fill,
                borderColor: potentialColor.border,
                borderWidth: 1,
                hoverBackgroundColor: potentialColor.highlight
            }
        ];
        
        // Create chart configuration
        const config = {
            type: 'bar',
            data: {
                labels: ['10-Year CVD Risk'],
                datasets: datasets
            },
            options: {
                ...this.chartDefaults,
                plugins: {
                    ...this.chartDefaults.plugins,
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                return `${context.dataset.label}: ${(value * 100).toFixed(1)}%`;
                            },
                            afterBody: function(tooltipItems) {
                                if (tooltipItems[0].datasetIndex === 1) {
                                    const reduction = ((currentRisk - potentialRisk) / currentRisk * 100).toFixed(1);
                                    const absolute = ((currentRisk - potentialRisk) * 100).toFixed(1);
                                    return [
                                        `Risk Reduction: ${reduction}%`,
                                        `Absolute Risk Reduction: ${absolute}%`
                                    ];
                                }
                                return '';
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            reductionLine: {
                                type: 'line',
                                mode: 'horizontal',
                                scaleID: 'y',
                                value: potentialRisk,
                                borderColor: 'rgba(0, 200, 0, 0.5)',
                                borderWidth: 2,
                                borderDash: [6, 6],
                                label: {
                                    enabled: true,
                                    content: `${((currentRisk - potentialRisk) / currentRisk * 100).toFixed(0)}% Reduction`,
                                    position: 'center',
                                    backgroundColor: 'rgba(0, 200, 0, 0.7)'
                                }
                            }
                        }
                    }
                }
            }
        };
        
        // Create the chart
        const chart = new Chart(canvas.getContext('2d'), config);
        
        // Add treatment details
        if (treatmentEffects.treatments && treatmentEffects.treatments.length > 0) {
            this._addTreatmentDetails(container, treatmentEffects.treatments);
        }
        
        // Store the chart reference for later cleanup
        this.activeCharts.set(container.id, chart);
        
        return chart;
    }
    
    /**
     * Updates the Framingham Risk Score visualization
     * @param {Object} results - Framingham calculation results
     * @public
     */
    updateFraminghamVisualization(results) {
        if (!results) return;
        
        // Find the results container
        const resultsContainer = document.getElementById('frs-results');
        if (!resultsContainer) return;
        
        // Create or update the risk visualization
        const visualizationContainer = resultsContainer.querySelector('.result-visualization');
        if (visualizationContainer) {
            this.createBasicRiskVisualization(visualizationContainer, results, 'frs');
            
            // Update risk meter
            this._updateRiskMeter(visualizationContainer, results);
        }
        
        // Update the risk values
        const baseRiskElement = resultsContainer.querySelector('.base-risk');
        if (baseRiskElement) {
            baseRiskElement.textContent = `${(results.baseRisk * 100).toFixed(1)}%`;
        }
        
        const modifiedRiskElement = resultsContainer.querySelector('.modified-risk');
        if (modifiedRiskElement) {
            modifiedRiskElement.textContent = `${(results.modifiedRisk * 100).toFixed(1)}%`;
        }
        
        const lpaModifierElement = resultsContainer.querySelector('.lpa-modifier');
        if (lpaModifierElement) {
            const showLpaSection = results.lpaModifier && results.lpaModifier !== 0;
            const lpaModifierContainer = resultsContainer.querySelector('.lpa-modifier-container');
            
            if (lpaModifierContainer) {
                lpaModifierContainer.style.display = showLpaSection ? 'flex' : 'none';
            }
            
            if (showLpaSection) {
                const modifierValue = results.lpaModifier > 0 ? 
                    `+${(results.lpaModifier * 100).toFixed(1)}%` : 
                    `${(results.lpaModifier * 100).toFixed(1)}%`;
                lpaModifierElement.textContent = modifierValue;
            }
        }
        
        // Update risk category
        const riskCategoryElement = resultsContainer.querySelector('.risk-category');
        if (riskCategoryElement) {
            const riskValue = results.modifiedRisk || results.baseRisk;
            let category = '';
            let categoryClass = '';
            
            if (riskValue < 0.1) {
                category = 'Low Risk';
                categoryClass = 'low-risk';
            } else if (riskValue < 0.2) {
                category = 'Moderate Risk';
                categoryClass = 'moderate-risk';
            } else {
                category = 'High Risk';
                categoryClass = 'high-risk';
            }
            
            riskCategoryElement.textContent = category;
            
            // Remove all risk category classes
            riskCategoryElement.classList.remove('low-risk', 'moderate-risk', 'high-risk', 'very-high-risk');
            
            // Add the appropriate class
            riskCategoryElement.classList.add(categoryClass);
        }
    }
    
    /**
     * Updates the QRISK3 visualization
     * @param {Object} results - QRISK3 calculation results
     * @public
     */
    updateQRISKVisualization(results) {
        if (!results) return;
        
        // Find the results container
        const resultsContainer = document.getElementById('qrisk-results');
        if (!resultsContainer) return;
        
        // Create or update the risk visualization
        const visualizationContainer = resultsContainer.querySelector('.result-visualization');
        if (visualizationContainer) {
            this.createBasicRiskVisualization(visualizationContainer, results, 'qrisk');
            
            // Update risk meter
            this._updateRiskMeter(visualizationContainer, results);
        }
        
        // Update the risk values
        const baseRiskElement = resultsContainer.querySelector('.base-risk');
        if (baseRiskElement) {
            baseRiskElement.textContent = `${(results.baseRisk * 100).toFixed(1)}%`;
        }
        
        const modifiedRiskElement = resultsContainer.querySelector('.modified-risk');
        if (modifiedRiskElement) {
            modifiedRiskElement.textContent = `${(results.modifiedRisk * 100).toFixed(1)}%`;
        }
        
        const lpaModifierElement = resultsContainer.querySelector('.lpa-modifier');
        if (lpaModifierElement) {
            const showLpaSection = results.lpaModifier && results.lpaModifier !== 0;
            const lpaModifierContainer = resultsContainer.querySelector('.lpa-modifier-container');
            
            if (lpaModifierContainer) {
                lpaModifierContainer.style.display = showLpaSection ? 'flex' : 'none';
            }
            
            if (showLpaSection) {
                const modifierValue = results.lpaModifier > 0 ? 
                    `+${(results.lpaModifier * 100).toFixed(1)}%` : 
                    `${(results.lpaModifier * 100).toFixed(1)}%`;
                lpaModifierElement.textContent = modifierValue;
            }
        }
        
        // Update healthy risk if available
        const healthyRiskElement = resultsContainer.querySelector('.healthy-risk');
        if (healthyRiskElement && results.healthyPersonRisk) {
            healthyRiskElement.textContent = `${(results.healthyPersonRisk * 100).toFixed(1)}%`;
        }
        
        // Update relative risk if available
        const relativeRiskElement = resultsContainer.querySelector('.relative-risk');
        if (relativeRiskElement && results.relativeRisk) {
            relativeRiskElement.textContent = `${results.relativeRisk.toFixed(1)}×`;
        }
        
        // Update risk category
        const riskCategoryElement = resultsContainer.querySelector('.risk-category');
        if (riskCategoryElement) {
            const riskValue = results.modifiedRisk || results.baseRisk;
            let category = '';
            let categoryClass = '';
            
            if (riskValue < 0.1) {
                category = 'Low Risk';
                categoryClass = 'low-risk';
            } else if (riskValue < 0.2) {
                category = 'Moderate Risk';
                categoryClass = 'moderate-risk';
            } else {
                category = 'High Risk';
                categoryClass = 'high-risk';
            }
            
            riskCategoryElement.textContent = category;
            
            // Remove all risk category classes
            riskCategoryElement.classList.remove('low-risk', 'moderate-risk', 'high-risk', 'very-high-risk');
            
            // Add the appropriate class
            riskCategoryElement.classList.add(categoryClass);
        }
    }
    
    /**
     * Updates the risk meter visualization
     * @param {HTMLElement} container - Container element
     * @param {Object} results - Risk calculation results
     * @private
     */
    _updateRiskMeter(container, results) {
        if (!container || !results) return;
        
        const riskMeter = container.querySelector('.risk-meter');
        const riskMarker = container.querySelector('.risk-meter-marker');
        
        if (!riskMeter || !riskMarker) return;
        
        const risk = results.modifiedRisk || results.baseRisk || 0;
        
        // Convert risk percentage to a position on the meter (0-100%)
        let position = Math.min(risk / 0.3 * 100, 100);
        
        // Update marker position
        riskMarker.style.left = `${position}%`;
        
        // Update marker color based on risk category
        if (risk < 0.1) {
            riskMarker.style.backgroundColor = this.colors.low.border;
        } else if (risk < 0.2) {
            riskMarker.style.backgroundColor = this.colors.moderate.border;
        } else {
            riskMarker.style.backgroundColor = this.colors.high.border;
        }
    }
    
    /**
     * Processes risk factors for visualization
     * @param {Object} riskFactors - Risk factor data
     * @param {string} calculatorType - Type of calculator (frs or qrisk)
     * @returns {Object} Processed data for visualization
     * @private
     */
    _processRiskFactors(riskFactors, calculatorType) {
        if (!riskFactors) {
            return { labels: [], values: [], modifiable: [] };
        }
        
        // Define which risk factors are modifiable
        const modifiableFactors = {
            'smoking': true,
            'cholesterol': true,
            'systolic_blood_pressure': true,
            'blood_pressure': true,
            'total_cholesterol': true,
            'hdl_cholesterol': true,
            'cholesterol_ratio': true,
            'bmi': true,
            'obesity': true,
            'diabetes': true, // Partially modifiable through management
            'treated_hypertension': true,
            'regular_steroids': true,
            'atypical_antipsychotics': true
        };
        
        // Non-modifiable factors
        const nonModifiableFactors = {
            'age': false,
            'sex': false,
            'ethnicity': false,
            'family_history': false,
            'atrial_fibrillation': false,
            'chronic_kidney_disease': false,
            'rheumatoid_arthritis': false,
            'sle': false,
            'severe_mental_illness': false,
            'migraine': false,
            'erectile_dysfunction': false
        };
        
        // Combine all factors
        const allFactors = { ...modifiableFactors, ...nonModifiableFactors };
        
        // Process risk factors
        const labels = [];
        const values = [];
        const modifiable = [];
        
        // Calculate total contribution for percentage calculation
        const totalContribution = Object.values(riskFactors).reduce((sum, value) => sum + value, 0);
        
        // Process each risk factor
        for (const [factor, contribution] of Object.entries(riskFactors)) {
            if (contribution === 0) continue; // Skip factors with zero contribution
            
            // Format the label
            let label = factor.replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            // Calculate percentage contribution
            const percentage = (contribution / totalContribution) * 100;
            
            // Determine if this factor is modifiable
            let isModifiable = false;
            
            if (factor in allFactors) {
                isModifiable = allFactors[factor];
            } else {
                // Try to match partial names
                const matchingFactor = Object.keys(allFactors).find(key => factor.includes(key));
                isModifiable = matchingFactor ? allFactors[matchingFactor] : false;
            }
            
            // Add to arrays
            labels.push(label);
            values.push(parseFloat(percentage.toFixed(1)));
            modifiable.push(isModifiable);
        }
        
        return { labels, values, modifiable };
    }
    
    /**
     * Gets the color for a specific risk level
     * @param {number} risk - Risk value
     * @returns {Object} Color object with fill, border, and highlight properties
     * @private
     */
    _getRiskColor(risk) {
        if (risk < 0.1) {
            return this.colors.low;
        } else if (risk < 0.2) {
            return this.colors.moderate;
        } else {
            return this.colors.high;
        }
    }
    
    /**
     * Adds a custom legend to a chart container
     * @param {HTMLElement} container - Container element
     * @param {Array} items - Legend items
     * @private
     */
    _addCustomLegend(container, items) {
        // Remove any existing legend
        const existingLegend = container.querySelector('.custom-legend');
        if (existingLegend) {
            existingLegend.remove();
        }
        
        // Create legend container
        const legendContainer = document.createElement('div');
        legendContainer.className = 'custom-legend';
        
        // Add legend items
        items.forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            const colorBox = document.createElement('span');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = item.color;
            
            const label = document.createElement('span');
            label.className = 'legend-label';
            label.textContent = item.label;
            
            legendItem.appendChild(colorBox);
            legendItem.appendChild(label);
            legendContainer.appendChild(legendItem);
        });
        
        // Add legend to container
        container.appendChild(legendContainer);
    }
    
    /**
     * Adds treatment details to a chart container
     * @param {HTMLElement} container - Container element
     * @param {Array} treatments - Treatment details
     * @private
     */
    _addTreatmentDetails(container, treatments) {
        // Remove any existing details
        const existingDetails = container.querySelector('.treatment-details');
        if (existingDetails) {
            existingDetails.remove();
        }
        
        // Create details container
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'treatment-details';
        
        // Add header
        const header = document.createElement('h4');
        header.textContent = 'Treatment Details';
        detailsContainer.appendChild(header);
        
        // Add treatment list
        const list = document.createElement('ul');
        treatments.forEach(treatment => {
            const item = document.createElement('li');
            
            const name = document.createElement('strong');
            name.textContent = treatment.name;
            
            const details = document.createElement('span');
            details.textContent = `: ${treatment.effect} (${treatment.description})`;
            
            item.appendChild(name);
            item.appendChild(details);
            list.appendChild(item);
        });
        
        detailsContainer.appendChild(list);
        
        // Add details to container
        container.appendChild(detailsContainer);
    }
    
    /**
     * Cleans up an existing chart to prevent memory leaks
     * @param {string} containerId - ID of the container element
     * @private
     */
    _cleanupExistingChart(containerId) {
        if (this.activeCharts.has(containerId)) {
            const chart = this.activeCharts.get(containerId);
            chart.destroy();
            this.activeCharts.delete(containerId);
        }
    }
    
    /**
     * Resizes all active charts
     * @private
     */
    _resizeActiveCharts() {
        this.activeCharts.forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }
    
    /**
     * Updates chart colors for theme (light/dark mode)
     * @param {boolean} isDarkMode - Whether dark mode is enabled
     * @private
     */
    _updateChartsForTheme(isDarkMode) {
        // Update chart defaults
        const textColor = isDarkMode ? '#e0e0e0' : '#333333';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        
        this.chartDefaults.scales.x.grid.color = gridColor;
        this.chartDefaults.scales.y.grid.color = gridColor;
        this.chartDefaults.scales.x.ticks.color = textColor;
        this.chartDefaults.scales.y.ticks.color = textColor;
        
        // Update all active charts
        this.activeCharts.forEach(chart => {
            if (chart && chart.options) {
                chart.options.scales.x.grid.color = gridColor;
                chart.options.scales.y.grid.color = gridColor;
                chart.options.scales.x.ticks.color = textColor;
                chart.options.scales.y.ticks.color = textColor;
                chart.update();
            }
        });
    }
    
    /**
     * Creates a debounced function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     * @private
     */
    _debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
}

// Create and export a singleton instance
const riskVisualization = new RiskVisualization();
export default riskVisualization;