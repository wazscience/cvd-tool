/**
 * Risk Calculator Implementation
 * @file risk-calculator.js
 * @description Core module for performing cardiovascular risk calculations with enhanced security and validation
 * @version 3.0.0
 * @author CVD Risk Assessment Team
 */

import QRISK3Algorithm from './qrisk3-algorithm.js';
import FraminghamRiskScore from './framingham-algorithm.js';
import CalculationValidator from './calculation-validation.js';
import { EventBus } from '../utils/event-bus.js';
import { LoggingService } from '../utils/logging-service.js';
import { CacheManager } from '../utils/cache-manager.js';
import { DataEncryptor } from '../utils/data-encryptor.js';
import { PerformanceMonitor } from '../utils/performance-monitor.js';
import { DataMapper } from '../utils/data-mapper.js';

/**
 * RiskCalculator Class
 * Unified interface for cardiovascular risk calculations
 * Provides enhanced input validation, data mapping, result caching, and advanced features
 */
class RiskCalculator {
    /**
     * Initialize calculator components and utility systems
     */
    constructor() {
        // Performance monitoring
        this.perfMonitor = new PerformanceMonitor('RiskCalculator');
        
        // Initialize logging service
        this.logger = new LoggingService({
            component: 'RiskCalculator',
            logLevel: 'info',
            includeTimestamp: true,
            encryptSensitiveData: true
        });
        
        // Initialize data encryptor for secure storage
        this.dataEncryptor = new DataEncryptor({
            algorithm: 'AES-GCM',
            keySize: 256,
            saltSize: 16,
            ivSize: 12
        });
        
        // Initialize data mapper for format conversions
        this.dataMapper = new DataMapper();
        
        // Initialize calculation validator
        this.validator = new CalculationValidator();
        
        // Initialize algorithm implementations
        this.qrisk3 = new QRISK3Algorithm();
        this.framingham = new FraminghamRiskScore();
        
        // Initialize cache manager with TTL of 1 hour
        this.cache = new CacheManager({
            namespace: 'risk-calculator',
            ttl: 60 * 60 * 1000, // 1 hour in milliseconds
            maxSize: 100 // Maximum number of cached results
        });
        
        // Version information
        this.version = {
            calculator: '3.0.0',
            qrisk3: '2.0.0',
            framingham: '2.0.0'
        };
        
        // Flag to track initialization
        this.initialized = true;
        
        this.logger.info('RiskCalculator initialized successfully');
    }
    
    /**
     * Calculate QRISK3 cardiovascular risk score
     * @param {Object} data - Patient data for calculation
     * @param {Object} options - Optional calculation settings
     * @returns {Promise<Object>} Calculation results
     * @public
     */
    async calculateQRisk3(data, options = {}) {
        try {
            this.perfMonitor.start('calculateQRisk3');
            
            const defaultOptions = {
                useCache: true,
                includeHeartAge: true,
                includeRiskFactors: true,
                allowOutliers: false,
                generateRecommendations: false,
                secureMode: true
            };
            
            const calculationOptions = { ...defaultOptions, ...options };
            
            // Generate a secure transaction ID for tracking
            const transactionId = this.dataEncryptor.generateSecureId();
            
            // Create cache key if caching is enabled
            let cacheKey = null;
            if (calculationOptions.useCache) {
                cacheKey = await this._generateCacheKey('qrisk3', data);
                
                // Check cache for existing result
                const cachedResult = this.cache.get(cacheKey);
                if (cachedResult) {
                    this.logger.info(`QRISK3 calculation retrieved from cache [${transactionId}]`);
                    
                    // Publish cache hit event
                    EventBus.publish('calculation-cache-hit', {
                        calculatorType: 'qrisk3',
                        transactionId
                    });
                    
                    this.perfMonitor.end('calculateQRisk3');
                    return cachedResult;
                }
            }
            
            // Log calculation start
            this.logger.info(`Starting QRISK3 calculation [${transactionId}]`);
            
            // Map input data to QRISK3 format
            const mappedData = await this._mapDataForQRisk3(data, calculationOptions);
            if (!mappedData.isValid) {
                throw new Error(`Data validation failed: ${mappedData.errors.join(', ')}`);
            }
            
            // Calculate risk
            const result = await this.qrisk3.calculateRisk(mappedData.data);
            
            // Check for successful calculation
            if (!result || !result.success) {
                throw new Error(`QRISK3 calculation failed: ${result?.error || 'Unknown error'}`);
            }
            
            // Generate recommendations if requested
            if (calculationOptions.generateRecommendations) {
                const recommendations = await this.qrisk3.getRecommendations(result, data);
                result.recommendations = recommendations;
            }
            
            // Add transaction info
            result.transactionId = transactionId;
            result.calculationDate = new Date().toISOString();
            
            // Add input parameters for reference
            result.inputParameters = mappedData.data;
            
            // Cache result if caching is enabled
            if (calculationOptions.useCache && cacheKey) {
                this.cache.set(cacheKey, result);
            }
            
            // Publish calculation complete event
            EventBus.publish('calculation-complete', {
                calculatorType: 'qrisk3',
                riskPercent: result.tenYearRiskPercent,
                riskCategory: result.riskCategory,
                transactionId
            });
            
            this.perfMonitor.end('calculateQRisk3');
            return result;
        } catch (error) {
            this.logger.error('Error in QRISK3 calculation:', error);
            
            // Publish error event
            EventBus.publish('calculation-error', {
                calculatorType: 'qrisk3',
                error: error.message,
                stack: error.stack
            });
            
            // Return error result
            return {
                success: false,
                error: 'Error calculating QRISK3 risk',
                details: error.message,
                errorType: error.name,
                calculationDate: new Date().toISOString()
            };
        }
    }
    
    /**
     * Calculate Framingham Risk Score
     * @param {Object} data - Patient data for calculation
     * @param {Object} options - Optional calculation settings
     * @returns {Promise<Object>} Calculation results
     * @public
     */
    async calculateFraminghamRisk(data, options = {}) {
        try {
            this.perfMonitor.start('calculateFraminghamRisk');
            
            const defaultOptions = {
                useCache: true,
                includeHeartAge: true,
                includeRiskFactors: true,
                allowOutliers: false,
                generateRecommendations: false,
                secureMode: true
            };
            
            const calculationOptions = { ...defaultOptions, ...options };
            
            // Generate a secure transaction ID for tracking
            const transactionId = this.dataEncryptor.generateSecureId();
            
            // Create cache key if caching is enabled
            let cacheKey = null;
            if (calculationOptions.useCache) {
                cacheKey = await this._generateCacheKey('framingham', data);
                
                // Check cache for existing result
                const cachedResult = this.cache.get(cacheKey);
                if (cachedResult) {
                    this.logger.info(`Framingham calculation retrieved from cache [${transactionId}]`);
                    
                    // Publish cache hit event
                    EventBus.publish('calculation-cache-hit', {
                        calculatorType: 'framingham',
                        transactionId
                    });
                    
                    this.perfMonitor.end('calculateFraminghamRisk');
                    return cachedResult;
                }
            }
            
            // Log calculation start
            this.logger.info(`Starting Framingham calculation [${transactionId}]`);
            
            // Map input data to Framingham format
            const mappedData = await this._mapDataForFramingham(data, calculationOptions);
            if (!mappedData.isValid) {
                throw new Error(`Data validation failed: ${mappedData.errors.join(', ')}`);
            }
            
            // Calculate risk
            const result = await this.framingham.calculateRisk(mappedData.data);
            
            // Check for successful calculation
            if (!result || !result.success) {
                throw new Error(`Framingham calculation failed: ${result?.error || 'Unknown error'}`);
            }
            
            // Generate recommendations if requested
            if (calculationOptions.generateRecommendations) {
                const recommendations = await this.framingham.getRecommendations(result, data);
                result.recommendations = recommendations;
            }
            
            // Add transaction info
            result.transactionId = transactionId;
            result.calculationDate = new Date().toISOString();
            
            // Add input parameters for reference
            result.inputParameters = mappedData.data;
            
            // Cache result if caching is enabled
            if (calculationOptions.useCache && cacheKey) {
                this.cache.set(cacheKey, result);
            }
            
            // Publish calculation complete event
            EventBus.publish('calculation-complete', {
                calculatorType: 'framingham',
                riskPercent: result.tenYearRiskPercent,
                riskCategory: result.riskCategory,
                transactionId
            });
            
            this.perfMonitor.end('calculateFraminghamRisk');
            return result;
        } catch (error) {
            this.logger.error('Error in Framingham calculation:', error);
            
            // Publish error event
            EventBus.publish('calculation-error', {
                calculatorType: 'framingham',
                error: error.message,
                stack: error.stack
            });
            
            // Return error result
            return {
                success: false,
                error: 'Error calculating Framingham risk',
                details: error.message,
                errorType: error.name,
                calculationDate: new Date().toISOString()
            };
        }
    }
    
    /**
     * Calculate both QRISK3 and Framingham in a single operation
     * @param {Object} data - Patient data for calculation
     * @param {Object} options - Optional calculation settings
     * @returns {Promise<Object>} Comprehensive results from both calculators
     * @public
     */
    async calculateCombinedRisk(data, options = {}) {
        try {
            this.perfMonitor.start('calculateCombinedRisk');
            
            const defaultOptions = {
                useCache: true,
                includeHeartAge: true,
                includeRiskFactors: true,
                allowOutliers: false,
                generateRecommendations: true,
                generateComparison: true,
                secureMode: true
            };
            
            const calculationOptions = { ...defaultOptions, ...options };
            
            // Generate a secure transaction ID for tracking
            const transactionId = this.dataEncryptor.generateSecureId();
            
            // Create cache key if caching is enabled
            let cacheKey = null;
            if (calculationOptions.useCache) {
                cacheKey = await this._generateCacheKey('combined', data);
                
                // Check cache for existing result
                const cachedResult = this.cache.get(cacheKey);
                if (cachedResult) {
                    this.logger.info(`Combined calculation retrieved from cache [${transactionId}]`);
                    
                    // Publish cache hit event
                    EventBus.publish('calculation-cache-hit', {
                        calculatorType: 'combined',
                        transactionId
                    });
                    
                    this.perfMonitor.end('calculateCombinedRisk');
                    return cachedResult;
                }
            }
            
            // Log calculation start
            this.logger.info(`Starting combined calculation [${transactionId}]`);
            
            // Calculate both QRISK3 and Framingham risk in parallel
            const [qrisk3Result, framinghamResult] = await Promise.all([
                this.calculateQRisk3(data, {
                    ...calculationOptions,
                    generateRecommendations: false // We'll generate combined recommendations later
                }),
                this.calculateFraminghamRisk(data, {
                    ...calculationOptions,
                    generateRecommendations: false // We'll generate combined recommendations later
                })
            ]);
            
            // Check if both calculations were successful
            if (!qrisk3Result.success) {
                throw new Error(`QRISK3 calculation failed: ${qrisk3Result.error || 'Unknown error'}`);
            }
            
            if (!framinghamResult.success) {
                throw new Error(`Framingham calculation failed: ${framinghamResult.error || 'Unknown error'}`);
            }
            
            // Generate comparison if requested
            let comparison = null;
            if (calculationOptions.generateComparison) {
                comparison = await this._compareCalculators(qrisk3Result, framinghamResult, data);
            }
            
            // Generate combined recommendations if requested
            let recommendations = null;
            if (calculationOptions.generateRecommendations) {
                recommendations = await this.generateRecommendations(data, {
                    qrisk3: qrisk3Result,
                    framingham: framinghamResult
                });
            }
            
            // Create combined result
            const combinedResult = {
                success: true,
                transactionId,
                calculationDate: new Date().toISOString(),
                qrisk3: qrisk3Result,
                framingham: framinghamResult,
                comparison,
                recommendations,
                inputParameters: data
            };
            
            // Add suggested approach based on comparison
            if (comparison) {
                combinedResult.suggestedApproach = this._determineSuggestedApproach(qrisk3Result, framinghamResult, comparison);
            }
            
            // Cache result if caching is enabled
            if (calculationOptions.useCache && cacheKey) {
                this.cache.set(cacheKey, combinedResult);
            }
            
            // Publish combined calculation complete event
            EventBus.publish('calculation-complete', {
                calculatorType: 'combined',
                qriskPercent: qrisk3Result.tenYearRiskPercent,
                framinghamPercent: framinghamResult.tenYearRiskPercent,
                transactionId
            });
            
            this.perfMonitor.end('calculateCombinedRisk');
            return combinedResult;
        } catch (error) {
            this.logger.error('Error in combined calculation:', error);
            
            // Publish error event
            EventBus.publish('calculation-error', {
                calculatorType: 'combined',
                error: error.message,
                stack: error.stack
            });
            
            // Return error result
            return {
                success: false,
                error: 'Error calculating combined risk',
                details: error.message,
                errorType: error.name,
                calculationDate: new Date().toISOString()
            };
        }
    }
    
    /**
     * Compare QRISK3 and Framingham results
     * @param {Object} qrisk3Result - QRISK3 calculation result
     * @param {Object} framinghamResult - Framingham calculation result
     * @param {Object} patientData - Original patient data
     * @returns {Promise<Object>} Comparison results
     * @private
     */
    async _compareCalculators(qrisk3Result, framinghamResult, patientData) {
        try {
            this.perfMonitor.start('compareCalculators');
            
            // Basic comparison metrics
            const qriskPercent = qrisk3Result.tenYearRiskPercent;
            const framinghamPercent = framinghamResult.tenYearRiskPercent;
            
            const absoluteDifference = Math.abs(qriskPercent - framinghamPercent);
            const relativeDifference = Math.round((absoluteDifference / ((qriskPercent + framinghamPercent) / 2)) * 100);
            
            // Determine agreement level
            let agreement = 'high';
            if (absoluteDifference > 7.5) {
                agreement = 'low';
            } else if (absoluteDifference > 3) {
                agreement = 'moderate';
            }
            
            // Check if risk categories match
            let categoryAgreement = qrisk3Result.riskCategory === framinghamResult.riskCategory;
            
            // Generate explanation for differences
            const differences = [];
            
            // 1. Analyze factors present in one calculator but not the other
            if (qrisk3Result.inputParameters.ethnicity && qrisk3Result.inputParameters.ethnicity !== 'white_or_not_stated') {
                differences.push({
                    factor: 'ethnicity',
                    description: 'QRISK3 accounts for ethnicity, while Framingham does not.',
                    impact: 'moderate'
                });
            }
            
            if (qrisk3Result.inputParameters.atrialFibrillation) {
                differences.push({
                    factor: 'atrial_fibrillation',
                    description: 'QRISK3 includes atrial fibrillation as a risk factor, Framingham does not.',
                    impact: 'high'
                });
            }
            
            if (qrisk3Result.inputParameters.rheumatoidArthritis) {
                differences.push({
                    factor: 'rheumatoid_arthritis',
                    description: 'QRISK3 includes rheumatoid arthritis as a risk factor, Framingham does not.',
                    impact: 'moderate'
                });
            }
            
            if (qrisk3Result.inputParameters.chronicKidneyDisease) {
                differences.push({
                    factor: 'chronic_kidney_disease',
                    description: 'QRISK3 includes chronic kidney disease as a risk factor, Framingham does not.',
                    impact: 'high'
                });
            }
            
            if (framinghamResult.inputParameters.family_history && !qrisk3Result.inputParameters.familyHistory) {
                differences.push({
                    factor: 'family_history_weighting',
                    description: 'Framingham and QRISK3 weight family history differently.',
                    impact: 'moderate'
                });
            }
            
            // 2. Compare development populations
            differences.push({
                factor: 'development_population',
                description: 'Framingham was developed in a US population, while QRISK3 was developed in a UK population.',
                impact: 'moderate'
            });
            
            // 3. Look at typical patterns based on age, sex, etc.
            if (patientData.age < 40) {
                differences.push({
                    factor: 'age_modeling',
                    description: 'Framingham and QRISK3 model younger ages differently.',
                    impact: 'low'
                });
            } else if (patientData.age > 65) {
                differences.push({
                    factor: 'age_modeling',
                    description: 'Framingham and QRISK3 model older ages differently.',
                    impact: 'moderate'
                });
            }
            
            if (patientData.sex === 'female') {
                differences.push({
                    factor: 'sex_modeling',
                    description: 'Framingham and QRISK3 model female risk factors differently.',
                    impact: 'moderate'
                });
            }
            
            // Generate overall summary
            let summary;
            if (agreement === 'high') {
                summary = `Framingham (${framinghamPercent}%) and QRISK3 (${qriskPercent}%) show high agreement with an absolute difference of ${absoluteDifference.toFixed(1)}%. ${categoryAgreement ? 'Both calculators agree on risk category.' : 'Despite similar scores, the calculators suggest different risk categories.'}`;
            } else if (agreement === 'moderate') {
                summary = `Framingham (${framinghamPercent}%) and QRISK3 (${qriskPercent}%) show moderate agreement with an absolute difference of ${absoluteDifference.toFixed(1)}%. ${categoryAgreement ? 'Both calculators agree on risk category despite some differences.' : 'The calculators suggest different risk categories, so clinical judgment is important.'}`;
            } else {
                summary = `Framingham (${framinghamPercent}%) and QRISK3 (${qriskPercent}%) show low agreement with a large difference of ${absoluteDifference.toFixed(1)}%. ${categoryAgreement ? 'Despite the large difference, both calculators agree on the overall risk category.' : 'The calculators suggest different risk categories, so careful clinical judgment is required.'}`;
            }
            
            // Clinical recommendation based on comparison
            let clinicalRecommendation;
            if (agreement === 'high') {
                clinicalRecommendation = 'Either calculator can be used confidently for risk assessment in this patient.';
            } else if (agreement === 'moderate') {
                clinicalRecommendation = 'Consider using QRISK3 for this patient as it includes more risk factors, but verify against Framingham.';
            } else {
                clinicalRecommendation = 'Due to significant differences between calculators, consider factors not captured by either calculator and use clinical judgment. When in doubt, the higher risk estimate may be preferable for treatment decisions.';
            }
            
            this.perfMonitor.end('compareCalculators');
            
            return {
                agreement,
                categoryAgreement,
                qriskPercent,
                framinghamPercent,
                absoluteDifference,
                relativeDifference,
                differences,
                summary,
                clinicalRecommendation
            };
        } catch (error) {
            this.logger.error('Error comparing calculators:', error);
            throw new Error(`Comparison failed: ${error.message}`);
        }
    }
    
    /**
     * Determine which calculator approach to suggest based on comparison
     * @param {Object} qrisk3Result - QRISK3 calculation result
     * @param {Object} framinghamResult - Framingham calculation result
     * @param {Object} comparison - Comparison result
     * @returns {Object} Suggested approach
     * @private
     */
    _determineSuggestedApproach(qrisk3Result, framinghamResult, comparison) {
        try {
            // Default to QRISK3 as it's more comprehensive
            let suggestionScore = {
                qrisk3: 0,
                framingham: 0
            };
            
            // Age considerations
            if (qrisk3Result.inputParameters.age < 40) {
                // Framingham validated for ages 30-79, QRISK3 for 25-84
                // For very young patients, both are valid but need careful interpretation
                suggestionScore.qrisk3 += 1;
            } else if (qrisk3Result.inputParameters.age > 75) {
                // Both have upper limits, but QRISK3 extends further
                suggestionScore.qrisk3 += 2;
            }
            
            // Ethnicity considerations
            if (qrisk3Result.inputParameters.ethnicity && 
                qrisk3Result.inputParameters.ethnicity !== 'white_or_not_stated') {
                // QRISK3 accounts for ethnicity, Framingham doesn't
                suggestionScore.qrisk3 += 3;
            }
            
            // Special conditions in QRISK3 but not Framingham
            const qriskSpecificFactors = [
                'atrialFibrillation', 'chronicKidneyDisease', 
                'rheumatoidArthritis', 'systemicLupusErythematosus',
                'migraines', 'severeMentalIllness', 'atypicalAntipsychotics',
                'regularSteroids'
            ];
            
            for (const factor of qriskSpecificFactors) {
                if (qrisk3Result.inputParameters[factor]) {
                    suggestionScore.qrisk3 += 2;
                }
            }
            
            // If there's a South Asian ethnicity modifier in Framingham, give it a point
            if (framinghamResult.inputParameters.south_asian) {
                suggestionScore.framingham += 1;
            }
            
            // Agreement level consideration
            if (comparison.agreement === 'high') {
                // If high agreement, less important which one to use
                // but still prefer QRISK3 for its comprehensiveness
                suggestionScore.qrisk3 += 1;
            } else if (comparison.agreement === 'low') {
                // If low agreement, examine which is higher
                if (qrisk3Result.tenYearRiskPercent > framinghamResult.tenYearRiskPercent) {
                    // If QRISK3 predicts higher risk, prefer it (more conservative)
                    suggestionScore.qrisk3 += 2;
                } else {
                    // If Framingham predicts higher risk, prefer it (more conservative)
                    suggestionScore.framingham += 2;
                }
            }
            
            // Determine final suggestion
            const suggestion = suggestionScore.qrisk3 >= suggestionScore.framingham ? 'qrisk3' : 'framingham';
            
            // Create comprehensive recommendation
            return {
                suggestedCalculator: suggestion,
                reasoning: {
                    qrisk3Score: suggestionScore.qrisk3,
                    framinghamScore: suggestionScore.framingham,
                    rationale: suggestion === 'qrisk3' ? 
                        'QRISK3 is recommended because it accounts for more risk factors specific to this patient.' :
                        'Framingham is recommended for this patient based on their specific risk profile.'
                },
                calculatorDetails: {
                    qrisk3: {
                        name: 'QRISK3',
                        description: 'UK-based calculator with more comprehensive risk factors',
                        strengths: [
                            'Includes ethnicity',
                            'Accounts for more comorbidities',
                            'More recent development',
                            'Better validated in diverse populations'
                        ],
                        limitations: [
                            'Less validated in North American populations',
                            'More complex to calculate'
                        ]
                    },
                    framingham: {
                        name: 'Framingham Risk Score',
                        description: 'US-based calculator with extensive long-term validation',
                        strengths: [
                            'Long-term follow-up data',
                            'Extensive validation',
                            'Simpler to calculate',
                            'Well-established in guidelines'
                        ],
                        limitations: [
                            'Doesn\'t account for ethnicity',
                            'Fewer comorbidities included',
                            'Based on older population data'
                        ]
                    }
                }
            };
        } catch (error) {
            this.logger.error('Error determining suggested approach:', error);
            
            // Return a basic suggestion defaulting to QRISK3
            return {
                suggestedCalculator: 'qrisk3',
                reasoning: {
                    rationale: 'QRISK3 is recommended as the default option due to its more comprehensive risk factor assessment.'
                }
            };
        }
    }
    
    /**
     * Generate patient-specific recommendations based on risk calculation results
     * Comprehensive approach combining results from both calculators
     * 
     * @param {Object} patientData - Original patient data
     * @param {Object} calculationResults - Results from risk calculators
     * @returns {Promise<Object>} Comprehensive recommendations
     * @public
     */
    async generateRecommendations(patientData, calculationResults) {
        try {
            this.perfMonitor.start('generateRecommendations');
            
            // Extract results for easier access
            const { qrisk3, framingham } = calculationResults;
            
            // Determine which result to primarily base recommendations on
            // By default, use the higher risk score for more conservative recommendations
            const primaryCalculator = qrisk3.tenYearRiskPercent >= framingham.tenYearRiskPercent ? 'qrisk3' : 'framingham';
            const primaryResult = primaryCalculator === 'qrisk3' ? qrisk3 : framingham;
            
            // Extract risk category and percentage
            const riskCategory = primaryResult.riskCategory;
            const riskPercent = primaryResult.tenYearRiskPercent;
            
            // Extract relevant patient data
            const {
                age,
                sex,
                ldl,
                ldl_unit,
                total_cholesterol,
                hdl,
                smoker,
                diabetes,
                lpa,
                lpa_unit,
                family_history
            } = patientData;
            
            // Create recommendation object
            const recommendations = {
                calculator: primaryCalculator,
                riskCategory,
                riskPercent,
                summary: '',
                urgency: riskCategory === 'high' ? 'urgent' : riskCategory === 'intermediate' ? 'moderate' : 'routine',
                lifestyle: [],
                medications: [],
                monitoring: [],
                followUp: '',
                other: [],
                references: [
                    'Canadian Cardiovascular Society Guidelines (2021)',
                    'European Society of Cardiology/EAS Guidelines (2019)',
                    'ACC/AHA Guidelines on Primary Prevention (2019)'
                ]
            };
            
            // Common lifestyle recommendations for all risk categories
            recommendations.lifestyle = [
                'Regular physical activity (≥150 minutes/week of moderate intensity)',
                'Mediterranean or DASH diet rich in vegetables, fruits, and whole grains',
                'Smoking cessation for smokers',
                'Limit alcohol consumption to ≤2 standard drinks per day',
                'Maintain healthy weight (BMI <25 kg/m²)',
                'Stress management techniques'
            ];
            
            // Generate category-specific recommendations
            if (riskCategory === 'low') {
                recommendations.summary = `Based on the ${primaryCalculator.toUpperCase()} calculator, 10-year cardiovascular risk is low at ${riskPercent}%. Focus on lifestyle optimization.`;
                
                recommendations.medications = ['Statin therapy generally not recommended unless other indications exist'];
                
                recommendations.monitoring = [
                    'Annual blood pressure check',
                    'Lipid profile every 5 years',
                    'Screen for diabetes every 3 years if at risk'
                ];
                
                recommendations.followUp = 'Routine follow-up with primary care provider in 1 year';
                
                // Special cases for low risk
                if (ldl) {
                    const ldlValue = parseFloat(ldl);
                    const ldlIsHigh = (ldl_unit === 'mmol/L' && ldlValue >= 5.0) || 
                                      (ldl_unit === 'mg/dL' && ldlValue >= 190);
                    
                    if (ldlIsHigh) {
                        recommendations.medications = [
                            'Consider statin therapy despite low risk due to severe hypercholesterolemia',
                            'Target: LDL-C reduction of ≥50% from baseline'
                        ];
                        recommendations.monitoring = [
                            ...recommendations.monitoring,
                            'Lipid profile every 3-6 months until LDL targets achieved'
                        ];
                        recommendations.followUp = 'Follow-up in 3 months to assess statin response if initiated';
                        recommendations.other.push('Consider evaluation for familial hypercholesterolemia if LDL-C ≥5.0 mmol/L (≥190 mg/dL)');
                    }
                }
                
                if (lpa) {
                    const lpaValue = parseFloat(lpa);
                    const lpaIsHigh = (lpa_unit === 'mg/dL' && lpaValue >= 50) || 
                                      (lpa_unit === 'nmol/L' && lpaValue >= 125);
                    
                    if (lpaIsHigh) {
                        recommendations.medications.push('Consider statin therapy despite low risk due to elevated Lp(a)');
                        recommendations.monitoring.push('Annual lipid profile to monitor LDL-C');
                        recommendations.other.push('Consider cascade screening of family members for elevated Lp(a)');
                    }
                }
                
                if (family_history) {
                    recommendations.other.push('Consider more frequent monitoring due to family history of premature CVD');
                }
            }
            else if (riskCategory === 'intermediate') {
                recommendations.summary = `Based on the ${primaryCalculator.toUpperCase()} calculator, 10-year cardiovascular risk is intermediate at ${riskPercent}%. Statin therapy should be considered.`;
                
                if (ldl) {
                    const ldlValue = parseFloat(ldl);
                    const ldlIsModeratelyHigh = (ldl_unit === 'mmol/L' && ldlValue >= 3.5) || 
                                               (ldl_unit === 'mg/dL' && ldlValue >= 135);
                    
                    if (ldlIsModeratelyHigh) {
                        recommendations.medications = [
                            'Recommended: Moderate intensity statin therapy',
                            'Target: LDL-C reduction of ≥30% from baseline',
                            'Consider ezetimibe if statin not tolerated or LDL goal not achieved'
                        ];
                    } else {
                        recommendations.medications = [
                            'Consider moderate intensity statin therapy',
                            'Target: LDL-C reduction of ≥30% from baseline'
                        ];
                    }
                } else {
                    recommendations.medications = [
                        'Consider moderate intensity statin therapy',
                        'Target: LDL-C reduction of ≥30% from baseline'
                    ];
                }
                
                recommendations.monitoring = [
                    'Blood pressure target <140/90 mmHg',
                    'Lipid profile every 6-12 months',
                    'Screen for diabetes annually if at risk',
                    'Consider ASA 81mg daily in selected high-intermediate risk patients'
                ];
                
                recommendations.followUp = 'Follow-up in 3-6 months to assess statin response if initiated';
                
                // Special cases for intermediate risk
                if (lpa) {
                    const lpaValue = parseFloat(lpa);
                    const lpaIsHigh = (lpa_unit === 'mg/dL' && lpaValue >= 50) || 
                                      (lpa_unit === 'nmol/L' && lpaValue >= 125);
                    
                    if (lpaIsHigh) {
                        recommendations.medications = [
                            'Recommended: Moderate to high intensity statin therapy',
                            'Target: LDL-C reduction of ≥50% from baseline',
                            'Consider ezetimibe as add-on therapy if LDL-C target not achieved'
                        ];
                        recommendations.other.push('Consider cascade screening of family members for elevated Lp(a)');
                    }
                }
                
                if (diabetes) {
                    recommendations.medications.push('Consider SGLT2 inhibitor or GLP-1 agonist with proven CV benefit if diabetes present');
                    recommendations.monitoring.push('Regular HbA1c monitoring (target <7.0%)');
                }
                
                if (smoker) {
                    recommendations.medications.push('Consider pharmacotherapy for smoking cessation (varenicline, bupropion, or nicotine replacement)');
                }
            }
            else if (riskCategory === 'high') {
                recommendations.summary = `Based on the ${primaryCalculator.toUpperCase()} calculator, 10-year cardiovascular risk is high at ${riskPercent}%. Intensive lipid-lowering therapy is recommended.`;
                
                recommendations.medications = [
                    'Recommended: High intensity statin therapy (atorvastatin 40-80mg or rosuvastatin 20-40mg)',
                    'Target: LDL-C reduction of ≥50% from baseline and LDL-C <2.0 mmol/L (<77 mg/dL)',
                    'Consider ezetimibe as add-on therapy if LDL-C targets not achieved',
                    'Consider PCSK9 inhibitor in select patients if targets not achieved with statin + ezetimibe'
                ];
                
                recommendations.monitoring = [
                    'Blood pressure target <130/80 mmHg',
                    'Consider ASA 81mg daily after bleeding risk assessment',
                    'Lipid profile every 3-6 months until targets achieved, then annually',
                    'Consider more aggressive management of all risk factors',
                    'Screen for diabetes annually if not already present'
                ];
                
                recommendations.followUp = 'Initial follow-up in 6-12 weeks to assess statin response and tolerance';
                
                // Add special recommendations for high risk
                if (diabetes) {
                    recommendations.medications.push('Consider SGLT2 inhibitor or GLP-1 agonist with proven CV benefit if diabetes present');
                    recommendations.monitoring.push('Regular HbA1c monitoring (target <7.0%)');
                }
                
                if (lpa) {
                    const lpaValue = parseFloat(lpa);
                    const lpaIsVeryHigh = (lpa_unit === 'mg/dL' && lpaValue >= 100) || 
                                         (lpa_unit === 'nmol/L' && lpaValue >= 250);
                    
                    if (lpaIsVeryHigh) {
                        recommendations.medications.push('Consider PCSK9 inhibitor earlier in treatment pathway due to very high Lp(a)');
                        recommendations.other.push('Consider cascade screening of family members for elevated Lp(a)');
                        recommendations.other.push('Consider referral to lipid specialist');
                    }
                }
                
                if (smoker) {
                    recommendations.medications.push('Strongly recommend pharmacotherapy for smoking cessation (varenicline, bupropion, or nicotine replacement)');
                    recommendations.urgency = 'very urgent';
                }
            }
            
            // Add recommendations based on the discrepancy between calculators
            if (Math.abs(qrisk3.tenYearRiskPercent - framingham.tenYearRiskPercent) > 5) {
                recommendations.other.push(`Note: There is a significant difference between QRISK3 (${qrisk3.tenYearRiskPercent}%) and Framingham (${framingham.tenYearRiskPercent}%) risk estimates. Consider factors not captured by either calculator and use clinical judgment.`);
            }
            
            // Add sex-specific recommendations
            if (sex === 'female' && age < 60) {
                recommendations.other.push('Consider women-specific risk factors such as history of pre-eclampsia or premature menopause in overall risk assessment.');
            }
            
            this.perfMonitor.end('generateRecommendations');
            return recommendations;
        } catch (error) {
            this.logger.error('Error generating recommendations:', error);
            
            // Return basic recommendations on error
            return {
                summary: 'Unable to generate detailed recommendations due to an error. Please refer to standard guidelines based on risk category.',
                lifestyle: [
                    'Regular physical activity',
                    'Heart-healthy diet',
                    'Smoking cessation if applicable'
                ],
                medications: ['Refer to standard guidelines based on risk category'],
                error: error.message
            };
        }
    }
    
    /**
     * Map input data to QRISK3 format
     * Handles format standardization and data validation
     * 
     * @param {Object} data - Raw input data
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Mapped data with validation status
     * @private
     */
    async _mapDataForQRisk3(data, options) {
        try {
            this.perfMonitor.start('mapDataForQRisk3');
            
            // Create standardized data object
            const mappedData = {};
            const errors = [];
            
            // Essential parameters
            
            // Age
            if (data.age) {
                const ageValidation = this.validator.validateValue(data.age, 'age', { calculator: 'qrisk' });
                if (ageValidation.isValid) {
                    mappedData.age = ageValidation.normalizedValue;
                } else {
                    errors.push(ageValidation.message);
                }
            } else {
                errors.push('Age is required for QRISK3 calculation');
            }
            
            // Sex
            if (data.sex) {
                const sexValidation = this.validator.validateValue(data.sex, 'sex');
                if (sexValidation.isValid) {
                    mappedData.sex = sexValidation.normalizedValue;
                } else {
                    errors.push(sexValidation.message);
                }
            } else {
                errors.push('Sex is required for QRISK3 calculation');
            }
            
            // Ethnicity
            mappedData.ethnicity = 'white_or_not_stated'; // Default value
            if (data.ethnicity) {
                const ethnicityValidation = this.validator.validateValue(data.ethnicity, 'ethnicity');
                if (ethnicityValidation.isValid) {
                    mappedData.ethnicity = ethnicityValidation.normalizedValue;
                }
            }
            
            // Blood pressure
            if (data.sbp) {
                const sbpValidation = this.validator.validateValue(data.sbp, 'sbp', { calculator: 'qrisk' });
                if (sbpValidation.isValid) {
                    mappedData.sbp = sbpValidation.normalizedValue;
                } else {
                    errors.push(sbpValidation.message);
                }
            } else {
                errors.push('Systolic blood pressure is required for QRISK3 calculation');
            }
            
            // BP variability (standard deviation)
            if (data.sbp_sd) {
                const sdValidation = this.validator.validateValue(data.sbp_sd, 'bpVariability');
                if (sdValidation.isValid) {
                    mappedData.sbps5 = sdValidation.normalizedValue;
                }
            } else if (data.sbp_readings && Array.isArray(data.sbp_readings) && data.sbp_readings.length >= 2) {
                // Calculate SD from multiple readings
                const readingsResult = this.validator.processBPReadings(data.sbp_readings);
                if (readingsResult.isValid) {
                    mappedData.sbps5 = readingsResult.sbpVariability;
                }
            }
            
            // Cholesterol
            // Either TC and HDL or direct cholesterol ratio is needed
            if (data.total_cholesterol && data.hdl) {
                // Get appropriate unit
                const unit = data.cholesterol_unit || 'mmol/L';
                
                // Validate TC
                const tcValidation = this.validator.validateValue(data.total_cholesterol, 'totalCholesterol', { unit });
                if (tcValidation.isValid) {
                    mappedData.total_cholesterol = tcValidation.normalizedValue;
                    
                    // Validate HDL
                    const hdlValidation = this.validator.validateValue(data.hdl, 'hdl', { unit });
                    if (hdlValidation.isValid) {
                        mappedData.hdl = hdlValidation.normalizedValue;
                        
                        // Calculate ratio
                        const ratioResult = this.validator.calculateCholesterolRatio(
                            tcValidation.normalizedValue, 
                            hdlValidation.normalizedValue
                        );
                        
                        if (ratioResult.isValid) {
                            mappedData.cholesterol_ratio = ratioResult.ratio;
                        } else {
                            errors.push('Unable to calculate cholesterol ratio: ' + ratioResult.message);
                        }
                    } else {
                        errors.push(hdlValidation.message);
                    }
                } else {
                    errors.push(tcValidation.message);
                }
            } else if (data.cholesterol_ratio) {
                // Direct ratio provided
                const ratioValidation = this.validator.validateValue(data.cholesterol_ratio, 'cholesterolRatio');
                if (ratioValidation.isValid) {
                    mappedData.cholesterol_ratio = ratioValidation.normalizedValue;
                } else {
                    errors.push(ratioValidation.message);
                }
            } else {
                errors.push('Either both total cholesterol and HDL, or cholesterol ratio must be provided');
            }
            
            // Smoking status
            if (data.smoking) {
                const smokingValidation = this.validator.validateValue(data.smoking, 'smoking');
                if (smokingValidation.isValid) {
                    mappedData.smoker = smokingValidation.normalizedValue;
                } else {
                    errors.push(smokingValidation.message);
                }
            } else {
                errors.push('Smoking status is required for QRISK3 calculation');
            }
            
            // Diabetes status
            mappedData.diabetes = 'none'; // Default value
            if (data.diabetes) {
                const diabetesValidation = this.validator.validateValue(data.diabetes, 'diabetes');
                if (diabetesValidation.isValid) {
                    mappedData.diabetes = diabetesValidation.normalizedValue;
                }
            }
            
            // BMI or height/weight
            if (data.bmi) {
                const bmiValidation = this.validator.validateValue(data.bmi, 'bmi', { calculator: 'qrisk' });
                if (bmiValidation.isValid) {
                    mappedData.bmi = bmiValidation.normalizedValue;
                } else {
                    // Try to calculate from height and weight if provided
                    if (data.height && data.weight) {
                        const heightUnit = data.height_unit || 'cm';
                        const weightUnit = data.weight_unit || 'kg';
                        
                        const bmiResult = this.validator.calculateBMI(
                            data.height, 
                            heightUnit, 
                            data.weight, 
                            weightUnit
                        );
                        
                        if (bmiResult.isValid) {
                            mappedData.bmi = bmiResult.bmi;
                        } else {
                            errors.push('Unable to calculate BMI: ' + bmiResult.message);
                        }
                    } else {
                        errors.push(bmiValidation.message);
                    }
                }
            } else if (data.height && data.weight) {
                // Calculate BMI from height and weight
                const heightUnit = data.height_unit || 'cm';
                const weightUnit = data.weight_unit || 'kg';
                
                const bmiResult = this.validator.calculateBMI(
                    data.height, 
                    heightUnit, 
                    data.weight, 
                    weightUnit
                );
                
                if (bmiResult.isValid) {
                    mappedData.bmi = bmiResult.bmi;
                } else {
                    errors.push('Unable to calculate BMI: ' + bmiResult.message);
                }
            } else {
                errors.push('Either BMI or both height and weight must be provided');
            }
            
            // BP treatment
            mappedData.bp_treatment = false; // Default value
            if (data.bp_treatment !== undefined) {
                const bpTreatmentValidation = this.validator.validateValue(data.bp_treatment, 'booleanParam');
                if (bpTreatmentValidation.isValid) {
                    mappedData.bp_treatment = bpTreatmentValidation.value;
                }
            }
            
            // Optional binary parameters
            const binaryParams = [
                { input: 'family_history', output: 'family_history' },
                { input: 'atrial_fibrillation', output: 'atrial_fibrillation' },
                { input: 'chronic_kidney_disease', output: 'chronic_kidney_disease' },
                { input: 'rheumatoid_arthritis', output: 'rheumatoid_arthritis' },
                { input: 'migraines', output: 'migraines' },
                { input: 'systemic_lupus_erythematosus', output: 'sle' },
                { input: 'severe_mental_illness', output: 'severe_mental_illness' },
                { input: 'atypical_antipsychotics', output: 'atypical_antipsychotics' },
                { input: 'regular_steroids', output: 'regular_steroids' },
                { input: 'erectile_dysfunction', output: 'erectile_dysfunction' }
            ];
            
            for (const param of binaryParams) {
                mappedData[param.output] = false; // Default value
                
                if (data[param.input] !== undefined) {
                    const validation = this.validator.validateValue(data[param.input], 'booleanParam');
                    if (validation.isValid) {
                        mappedData[param.output] = validation.value;
                    }
                }
            }
            
            // Townsend score (deprivation index)
            mappedData.townsend = 0; // Default value (average)
            if (data.townsend !== undefined) {
                const townsendValidation = this.validator.validateValue(data.townsend, 'townsend');
                if (townsendValidation.isValid) {
                    mappedData.townsend = townsendValidation.normalizedValue;
                }
            }
            
            // Determine if the data is valid
            const isValid = errors.length === 0;
            
            this.perfMonitor.end('mapDataForQRisk3');
            
            return {
                isValid,
                errors,
                data: mappedData
            };
        } catch (error) {
            this.logger.error('Error mapping data for QRISK3:', error);
            return {
                isValid: false,
                errors: [`Data mapping error: ${error.message}`],
                data: {}
            };
        }
    }
    
    /**
     * Map input data to Framingham format
     * Handles format standardization and data validation
     * 
     * @param {Object} data - Raw input data
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Mapped data with validation status
     * @private
     */
    async _mapDataForFramingham(data, options) {
        try {
            this.perfMonitor.start('mapDataForFramingham');
            
            // Create standardized data object
            const mappedData = {};
            const errors = [];
            
            // Essential parameters
            
            // Age
            if (data.age) {
                const ageValidation = this.validator.validateValue(data.age, 'age', { calculator: 'framingham' });
                if (ageValidation.isValid) {
                    mappedData.age = ageValidation.normalizedValue;
                } else {
                    errors.push(ageValidation.message);
                }
            } else {
                errors.push('Age is required for Framingham Risk Score calculation');
            }
            
            // Sex
            if (data.sex) {
                const sexValidation = this.validator.validateValue(data.sex, 'sex');
                if (sexValidation.isValid) {
                    mappedData.sex = sexValidation.normalizedValue;
                } else {
                    errors.push(sexValidation.message);
                }
            } else {
                errors.push('Sex is required for Framingham Risk Score calculation');
            }
            
            // Blood pressure
            if (data.sbp) {
                const sbpValidation = this.validator.validateValue(data.sbp, 'sbp', { calculator: 'framingham' });
                if (sbpValidation.isValid) {
                    mappedData.sbp = sbpValidation.normalizedValue;
                } else {
                    errors.push(sbpValidation.message);
                }
            } else {
                errors.push('Systolic blood pressure is required for Framingham Risk Score calculation');
            }
            
            // Cholesterol
            // TC and HDL are required for Framingham
            if (data.total_cholesterol && data.hdl) {
                // Get appropriate unit
                const unit = data.cholesterol_unit || 'mmol/L';
                
                // Validate TC
                const tcValidation = this.validator.validateValue(data.total_cholesterol, 'totalCholesterol', { unit });
                if (tcValidation.isValid) {
                    mappedData.total_cholesterol = tcValidation.normalizedValue;
                    
                    // Validate HDL
                    const hdlValidation = this.validator.validateValue(data.hdl, 'hdl', { unit });
                    if (hdlValidation.isValid) {
                        mappedData.hdl = hdlValidation.normalizedValue;
                    } else {
                        errors.push(hdlValidation.message);
                    }
                } else {
                    errors.push(tcValidation.message);
                }
            } else {
                errors.push('Both total cholesterol and HDL must be provided for Framingham Risk Score calculation');
            }
            
            // Smoking status
            if (data.smoking !== undefined) {
                const smokerValidation = this.validator.validateValue(data.smoking, 'booleanParam');
                if (smokerValidation.isValid) {
                    mappedData.smoker = smokerValidation.value;
                } else {
                    errors.push(smokerValidation.message);
                }
            } else {
                errors.push('Smoking status is required for Framingham Risk Score calculation');
            }
            
            // Diabetes status
            if (data.diabetes !== undefined) {
                const diabetesValidation = this.validator.validateValue(data.diabetes, 'booleanParam');
                if (diabetesValidation.isValid) {
                    mappedData.diabetes = diabetesValidation.value;
                } else {
                    errors.push(diabetesValidation.message);
                }
            } else {
                errors.push('Diabetes status is required for Framingham Risk Score calculation');
            }
            
            // BP treatment
            if (data.bp_treatment !== undefined) {
                const bpTreatmentValidation = this.validator.validateValue(data.bp_treatment, 'booleanParam');
                if (bpTreatmentValidation.isValid) {
                    mappedData.bp_treatment = bpTreatmentValidation.value;
                } else {
                    errors.push(bpTreatmentValidation.message);
                }
            } else {
                errors.push('Blood pressure treatment status is required for Framingham Risk Score calculation');
            }
            
            // Optional parameters
            
            // LDL cholesterol
            if (data.ldl) {
                const unit = data.cholesterol_unit || 'mmol/L';
                const ldlValidation = this.validator.validateValue(data.ldl, 'ldl', { unit });
                if (ldlValidation.isValid) {
                    mappedData.ldl = ldlValidation.normalizedValue;
                    mappedData.ldl_unit = unit;
                }
            }
            
            // Family history (for risk modifiers)
            if (data.family_history !== undefined) {
                const familyHistoryValidation = this.validator.validateValue(data.family_history, 'booleanParam');
                if (familyHistoryValidation.isValid) {
                    mappedData.family_history = familyHistoryValidation.value;
                }
            }
            
            // South Asian ethnicity (for risk modifiers)
            if (data.south_asian !== undefined) {
                const southAsianValidation = this.validator.validateValue(data.south_asian, 'booleanParam');
                if (southAsianValidation.isValid) {
                    mappedData.south_asian = southAsianValidation.value;
                }
            }
            
            // Lipoprotein(a) (for risk modifiers)
            if (data.lpa) {
                const lpaUnit = data.lpa_unit || 'mg/dL';
                const lpaValidation = this.validator.validateValue(data.lpa, 'lpa', { unit: lpaUnit });
                if (lpaValidation.isValid) {
                    mappedData.lpa = lpaValidation.normalizedValue;
                    mappedData.lpa_unit = lpaUnit;
                }
            }
            
            // Determine if the data is valid
            const isValid = errors.length === 0;
            
            this.perfMonitor.end('mapDataForFramingham');
            
            return {
                isValid,
                errors,
                data: mappedData
            };
        } catch (error) {
            this.logger.error('Error mapping data for Framingham:', error);
            return {
                isValid: false,
                errors: [`Data mapping error: ${error.message}`],
                data: {}
            };
        }
    }
    
    /**
     * Generate a secure cache key for storing calculation results
     * @param {string} calculatorType - Type of calculator
     * @param {Object} data - Input data
     * @returns {Promise<string>} Secure cache key
     * @private
     */
    async _generateCacheKey(calculatorType, data) {
        try {
            // Extract essential parameters for cache key
            const essentialData = {};
            
            // Common parameters
            const commonParams = [
                'age', 'sex', 'sbp', 'total_cholesterol', 'hdl', 'smoking', 
                'diabetes', 'bp_treatment'
            ];
            
            commonParams.forEach(param => {
                if (data[param] !== undefined) {
                    essentialData[param] = data[param];
                }
            });
            
            // Type-specific parameters
            if (calculatorType === 'qrisk3') {
                const qriskParams = [
                    'ethnicity', 'bmi', 'family_history', 'atrial_fibrillation',
                    'chronic_kidney_disease', 'migraines', 'rheumatoid_arthritis',
                    'systemic_lupus_erythematosus', 'severe_mental_illness',
                    'regular_steroids', 'erectile_dysfunction', 'atypical_antipsychotics'
                ];
                
                qriskParams.forEach(param => {
                    if (data[param] !== undefined) {
                        essentialData[param] = data[param];
                    }
                });
            } else if (calculatorType === 'framingham') {
                const framinghamParams = [
                    'family_history', 'south_asian', 'lpa'
                ];
                
                framinghamParams.forEach(param => {
                    if (data[param] !== undefined) {
                        essentialData[param] = data[param];
                    }
                });
            } else if (calculatorType === 'combined') {
                // Include all parameters from both calculators
                const allParams = [
                    'ethnicity', 'bmi', 'family_history', 'atrial_fibrillation',
                    'chronic_kidney_disease', 'migraines', 'rheumatoid_arthritis',
                    'systemic_lupus_erythematosus', 'severe_mental_illness',
                    'regular_steroids', 'erectile_dysfunction', 'atypical_antipsychotics',
                    'south_asian', 'lpa'
                ];
                
                allParams.forEach(param => {
                    if (data[param] !== undefined) {
                        essentialData[param] = data[param];
                    }
                });
            }
            
            // Add calculator type
            essentialData._calculator = calculatorType;
            
            // Generate hash of essential data for cache key
            return this.dataEncryptor.hashData(JSON.stringify(essentialData));
        } catch (error) {
            this.logger.error('Error generating cache key:', error);
            
            // Fallback to a basic cache key
            return `${calculatorType}_${new Date().getTime()}`;
        }
    }
    
    /**
     * Calculate relative risk reduction based on intervention
     * @param {Object} riskResult - Base risk calculation result
     * @param {Object} intervention - Intervention details
     * @returns {Promise<Object>} Modified risk with intervention effect
     * @public
     */
    async calculateInterventionEffect(riskResult, intervention) {
        try {
            this.perfMonitor.start('calculateInterventionEffect');
            
            // Validate inputs
            if (!riskResult || !riskResult.success) {
                throw new Error('Valid risk calculation result required');
            }
            
            if (!intervention || typeof intervention !== 'object') {
                throw new Error('Valid intervention object required');
            }
            
            // Copy base risk result
            const modifiedResult = JSON.parse(JSON.stringify(riskResult));
            
            // Track applied interventions
            const appliedInterventions = [];
            
            // Apply each intervention type if present
            
            // 1. Statin therapy
            if (intervention.statin) {
                const statinResult = this._applyStatinEffect(modifiedResult, intervention.statin);
                modifiedResult.baseRiskPercent = modifiedResult.tenYearRiskPercent;
                modifiedResult.tenYearRiskPercent = statinResult.modifiedRiskPercent;
                appliedInterventions.push(statinResult.intervention);
            }
            
            // 2. Blood pressure treatment
            if (intervention.bp) {
                const bpResult = this._applyBPEffect(modifiedResult, intervention.bp);
                modifiedResult.tenYearRiskPercent = bpResult.modifiedRiskPercent;
                appliedInterventions.push(bpResult.intervention);
            }
            
            // 3. Smoking cessation
            if (intervention.smokingCessation && modifiedResult.inputParameters.smoker) {
                const smokingResult = this._applySmokingCessationEffect(modifiedResult);
                modifiedResult.tenYearRiskPercent = smokingResult.modifiedRiskPercent;
                appliedInterventions.push(smokingResult.intervention);
            }
            
            // Update risk category based on new risk
            const newCategory = this._determineRiskCategory(modifiedResult.tenYearRiskPercent);
            modifiedResult.riskCategory = newCategory.category;
            modifiedResult.categoryDescription = newCategory.description;
            
            // Add intervention summary
            modifiedResult.interventions = {
                applied: appliedInterventions,
                absoluteRiskReduction: Math.round((riskResult.tenYearRiskPercent - modifiedResult.tenYearRiskPercent) * 10) / 10,
                relativeRiskReduction: Math.round((1 - (modifiedResult.tenYearRiskPercent / riskResult.tenYearRiskPercent)) * 100),
                numberNeededToTreat: Math.round(100 / (riskResult.tenYearRiskPercent - modifiedResult.tenYearRiskPercent))
            };
            
            this.perfMonitor.end('calculateInterventionEffect');
            return modifiedResult;
        } catch (error) {
            this.logger.error('Error calculating intervention effect:', error);
            return {
                success: false,
                error: 'Error calculating intervention effect',
                details: error.message
            };
        }
    }
    
    /**
     * Apply statin effect to risk result
     * @param {Object} result - Risk calculation result
     * @param {Object} statinDetails - Statin intervention details
     * @returns {Object} Modified risk result
     * @private
     */
    _applyStatinEffect(result, statinDetails) {
        try {
            // Default to moderate intensity statin if intensity not specified
            const intensity = statinDetails.intensity || 'moderate';
            
            // Get LDL reduction percentage based on intensity
            let ldlReductionPercent;
            if (statinDetails.ldlReduction) {
                // Use custom LDL reduction if provided
                ldlReductionPercent = parseFloat(statinDetails.ldlReduction);
            } else {
                // Standard effects based on intensity
                switch (intensity) {
                    case 'high':
                        ldlReductionPercent = 50;
                        break;
                    case 'moderate':
                        ldlReductionPercent = 30;
                        break;
                    case 'low':
                        ldlReductionPercent = 20;
                        break;
                    default:
                        ldlReductionPercent = 30; // Default to moderate
                }
            }
            
            // Calculate statin effect based on LDL reduction
            // Rule of thumb: Each 1 mmol/L reduction in LDL → ~20% RRR in CVD events
            // Assuming typical LDL is around 3.5 mmol/L
            
            // Example calculation:
            // 30% LDL reduction = 30% of 3.5 mmol/L = 1.05 mmol/L
            // 1.05 mmol/L reduction → ~21% RRR in CVD events
            
            const typicalLDL = 3.5; // mmol/L
            const ldlReduction = (ldlReductionPercent / 100) * typicalLDL;
            const cvdReductionPercent = ldlReduction * 20; // 20% RRR per 1 mmol/L reduction
            
            // Apply effect to risk
            const riskReduction = cvdReductionPercent / 100;
            const modifiedRiskPercent = result.tenYearRiskPercent * (1 - riskReduction);
            
            // Create intervention details
            const intervention = {
                type: 'statin',
                intensity,
                ldlReductionPercent,
                cvdReductionPercent: Math.round(cvdReductionPercent),
                baseRiskPercent: result.tenYearRiskPercent,
                modifiedRiskPercent: Math.round(modifiedRiskPercent * 10) / 10,
                absoluteRiskReduction: Math.round((result.tenYearRiskPercent - modifiedRiskPercent) * 10) / 10
            };
            
            return {
                modifiedRiskPercent: Math.round(modifiedRiskPercent * 10) / 10,
                intervention
            };
        } catch (error) {
            this.logger.error('Error applying statin effect:', error);
            return {
                modifiedRiskPercent: result.tenYearRiskPercent,
                intervention: {
                    type: 'statin',
                    error: error.message
                }
            };
        }
    }
    
    /**
     * Apply blood pressure treatment effect to risk result
     * @param {Object} result - Risk calculation result
     * @param {Object} bpDetails - BP intervention details
     * @returns {Object} Modified risk result
     * @private
     */
    _applyBPEffect(result, bpDetails) {
        try {
            // Default to single agent if therapy not specified
            const therapy = bpDetails.therapy || 'single';
            
            // Get SBP reduction based on therapy
            let sbpReduction;
            if (bpDetails.sbpReduction) {
                // Use custom SBP reduction if provided
                sbpReduction = parseFloat(bpDetails.sbpReduction);
            } else {
                // Standard effects based on therapy
                switch (therapy) {
                    case 'triple':
                        sbpReduction = 30;
                        break;
                    case 'dual':
                        sbpReduction = 20;
                        break;
                    case 'single':
                        sbpReduction = 10;
                        break;
                    default:
                        sbpReduction = 10; // Default to single agent
                }
            }
            
            // Calculate BP effect on CVD risk
            // Rule of thumb: Each 10 mmHg reduction in SBP → ~20% RRR in CVD events
            
            const cvdReductionPercent = (sbpReduction / 10) * 20;
            
            // Apply effect to risk
            const riskReduction = cvdReductionPercent / 100;
            const modifiedRiskPercent = result.tenYearRiskPercent * (1 - riskReduction);
            
            // Create intervention details
            const intervention = {
                type: 'bp_treatment',
                therapy,
                sbpReduction,
                cvdReductionPercent: Math.round(cvdReductionPercent),
                baseRiskPercent: result.tenYearRiskPercent,
                modifiedRiskPercent: Math.round(modifiedRiskPercent * 10) / 10,
                absoluteRiskReduction: Math.round((result.tenYearRiskPercent - modifiedRiskPercent) * 10) / 10
            };
            
            return {
                modifiedRiskPercent: Math.round(modifiedRiskPercent * 10) / 10,
                intervention
            };
        } catch (error) {
            this.logger.error('Error applying BP effect:', error);
            return {
                modifiedRiskPercent: result.tenYearRiskPercent,
                intervention: {
                    type: 'bp_treatment',
                    error: error.message
                }
            };
        }
    }
    
    /**
     * Apply smoking cessation effect to risk result
     * @param {Object} result - Risk calculation result
     * @returns {Object} Modified risk result
     * @private
     */
    _applySmokingCessationEffect(result) {
        try {
            // Risk reduction from smoking cessation varies by age, sex, and time since quitting
            // Rule of thumb: ~50% reduction in excess risk within 1 year, approaching non-smoker risk within 5-15 years
            
            // Simplified model: 35% RRR in CVD events within 5 years of quitting
            const cvdReductionPercent = 35;
            
            // Apply effect to risk
            const riskReduction = cvdReductionPercent / 100;
            const modifiedRiskPercent = result.tenYearRiskPercent * (1 - riskReduction);
            
            // Create intervention details
            const intervention = {
                type: 'smoking_cessation',
                cvdReductionPercent,
                baseRiskPercent: result.tenYearRiskPercent,
                modifiedRiskPercent: Math.round(modifiedRiskPercent * 10) / 10,
                absoluteRiskReduction: Math.round((result.tenYearRiskPercent - modifiedRiskPercent) * 10) / 10
            };
            
            return {
                modifiedRiskPercent: Math.round(modifiedRiskPercent * 10) / 10,
                intervention
            };
        } catch (error) {
            this.logger.error('Error applying smoking cessation effect:', error);
            return {
                modifiedRiskPercent: result.tenYearRiskPercent,
                intervention: {
                    type: 'smoking_cessation',
                    error: error.message
                }
            };
        }
    }
    
    /**
     * Determine risk category based on risk percentage
     * @param {number} riskPercent - Risk percentage
     * @returns {Object} Risk category information
     * @private
     */
    _determineRiskCategory(riskPercent) {
        try {
            // Canadian Cardiovascular Society 2021 Guidelines categories
            if (riskPercent < 10) {
                return {
                    category: 'low',
                    description: 'Low Risk (<10%)',
                    recommendation: 'Lifestyle modifications are recommended. Statin therapy generally not recommended unless other indications exist.'
                };
            } else if (riskPercent < 20) {
                return {
                    category: 'intermediate',
                    description: 'Intermediate Risk (10-19%)',
                    recommendation: 'Consider statin therapy if LDL-C ≥ 3.5 mmol/L. Target ≥ 30% reduction in LDL-C.'
                };
            } else {
                return {
                    category: 'high',
                    description: 'High Risk (≥20%)',
                    recommendation: 'Statin therapy recommended. Target LDL-C reduction of ≥ 50% and < 2.0 mmol/L.'
                };
            }
        } catch (error) {
            this.logger.error('Error determining risk category:', error);
            return {
                category: 'unknown',
                description: 'Risk category could not be determined',
                recommendation: 'Please consult a healthcare provider.'
            };
        }
    }
    
    /**
     * Clear cached calculation results
     * @returns {Promise<boolean>} Success status
     * @public
     */
    async clearCache() {
        try {
            this.cache.clear();
            this.logger.info('Calculation cache cleared successfully');
            return true;
        } catch (error) {
            this.logger.error('Error clearing cache:', error);
            return false;
        }
    }
}

export default RiskCalculator;