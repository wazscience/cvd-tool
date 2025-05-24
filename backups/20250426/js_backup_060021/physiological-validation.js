apob_g: { 
            min=  0.2, max: 3.0, unit: 'g/L', 
            criticalMin: 0.4, criticalMax: 2.5,
            description: 'Apolipoprotein B',
            targetMax: 0.9,
            highRiskMax: 0.8
        },
        apob_mg: { 
            min: 20, max: 300, unit: 'mg/dL', 
            criticalMin: 40, criticalMax: 250,
            description: 'Apolipoprotein B',
            targetMax: 90,
            highRiskMax: 80
        },
        
        // Anthropometric measurements
        bmi: { 
            min: 8, max: 100, unit: 'kg/m²', 
            criticalMin: 12, criticalMax: 60,
            description: 'Body Mass Index',
            underweight: 18.5,
            normalMin: 18.5,
            normalMax: 24.9,
            overweight: 25,
            obese: 30,
            morbidlyObese: 40
        },
        height_cm: { 
            min: 50, max: 272, unit: 'cm', 
            criticalMin: 100, criticalMax: 250,
            description: 'Height'
        },
        height_in: { 
            min: 20, max: 107, unit: 'inches', 
            criticalMin: 39, criticalMax: 98,
            description: 'Height'
        },
        weight_kg: { 
            min: 20, max: 300, unit: 'kg', 
            criticalMin: 30, criticalMax: 250,
            description: 'Weight'
        },
        weight_lb: { 
            min: 44, max: 661, unit: 'lb', 
            criticalMin: 66, criticalMax: 550,
            description: 'Weight'
        },
        waistCirc_cm: {
            min: 40, max: 200, unit: 'cm',
            criticalMin: 50, criticalMax: 180,
            description: 'Waist Circumference',
            highRiskMale: 102,
            highRiskFemale: 88
        },
        
        // Laboratory tests
        glucose_mmol: {
            min: 1.0, max: 40.0, unit: 'mmol/L',
            criticalMin: 2.2, criticalMax: 30.0,
            description: 'Blood Glucose',
            diabetesThreshold: 7.0,
            normalFasting: 5.6
        },
        glucose_mg: {
            min: 20, max: 720, unit: 'mg/dL',
            criticalMin: 40, criticalMax: 540,
            description: 'Blood Glucose',
            diabetesThreshold: 126,
            normalFasting: 100
        },
        hba1c: {
            min: 2.0, max: 20.0, unit: '%',
            criticalMin: 3.0, criticalMax: 15.0,
            description: 'HbA1c',
            diabetesThreshold: 6.5,
            preDiabetesMin: 5.7,
            targetDiabetic: 7.0
        },
        creatinine_umol: {
            min: 20, max: 1500, unit: 'µmol/L',
            criticalMin: 40, criticalMax: 1000,
            description: 'Creatinine',
            normalMaxMale: 110,
            normalMaxFemale: 90
        },
        creatinine_mg: {
            min: 0.2, max: 17.0, unit: 'mg/dL',
            criticalMin: 0.4, criticalMax: 12.0,
            description: 'Creatinine',
            normalMaxMale: 1.3,
            normalMaxFemale: 1.1
        },
        egfr: {
            min: 0, max: 150, unit: 'mL/min/1.73m²',
            criticalMin: 5, criticalMax: 130,
            description: 'eGFR',
            ckdStage3: 60,
            ckdStage4: 30,
            ckdStage5: 15
        },
        
        // Risk scores
        frs: {
            min: 0, max: 100, unit: '%',
            criticalMin: 0, criticalMax: 100,
            description: 'Framingham Risk Score',
            lowRisk: 10,
            moderateRisk: 20,
            highRisk: 30
        },
        qrisk3: {
            min: 0, max: 100, unit: '%',
            criticalMin: 0, criticalMax: 100,
            description: 'QRISK3 Score',
            lowRisk: 10,
            moderateRisk: 20,
            highRisk: 30
        }
    };
    
    /**
     * Validate a physiological value
     * @param {string} type - The type of measurement
     * @param {number} value - The value to validate
     * @param {Object} options - Additional validation options
     * @returns {Object} - Validation result
     */
    function validateValue(type, value, options = {}) {
        const range = RANGES[type];
        if (!range) {
            return {
                isValid: true,
                isWarning: false,
                isCritical: false,
                message: null,
                details: null
            };
        }
        
        // Basic validation
        if (value === null || value === undefined || isNaN(value)) {
            return {
                isValid: false,
                isWarning: false,
                isCritical: false,
                message: `${range.description || type} must be a valid number`,
                details: { type: 'invalid_input' }
            };
        }
        
        // Check absolute limits
        if (value < range.min || value > range.max) {
            return {
                isValid: false,
                isWarning: false,
                isCritical: true,
                message: `${range.description || type} value of ${value} ${range.unit} is physiologically impossible (valid range: ${range.min}-${range.max} ${range.unit})`,
                details: { type: 'out_of_absolute_range', min: range.min, max: range.max }
            };
        }
        
        // Check critical limits
        if (value < range.criticalMin || value > range.criticalMax) {
            return {
                isValid: true,
                isWarning: false,
                isCritical: true,
                message: `${range.description || type} value of ${value} ${range.unit} is critically abnormal (critical range: ${range.criticalMin}-${range.criticalMax} ${range.unit})`,
                details: { type: 'critical_value', criticalMin: range.criticalMin, criticalMax: range.criticalMax }
            };
        }
        
        // Check warning thresholds
        const warnings = [];
        
        if (range.warningLow && value < range.warningLow) {
            warnings.push(`${range.description || type} value is low (${value} ${range.unit} < ${range.warningLow} ${range.unit})`);
        }
        
        if (range.warningHigh && value > range.warningHigh) {
            warnings.push(`${range.description || type} value is high (${value} ${range.unit} > ${range.warningHigh} ${range.unit})`);
        }
        
        // Check clinical targets
        const clinicalWarnings = checkClinicalTargets(type, value, range, options);
        warnings.push(...clinicalWarnings);
        
        if (warnings.length > 0) {
            return {
                isValid: true,
                isWarning: true,
                isCritical: false,
                message: warnings.join('; '),
                details: { type: 'warning', warnings: warnings }
            };
        }
        
        // Value is within normal range
        return {
            isValid: true,
            isWarning: false,
            isCritical: false,
            message: null,
            details: { type: 'normal' }
        };
    }
    
    /**
     * Check clinical targets and risk thresholds
     * @private
     */
    function checkClinicalTargets(type, value, range, options) {
        const warnings = [];
        
        // Lipid targets
        if (range.targetMax && value > range.targetMax) {
            warnings.push(`${range.description || type} exceeds recommended target (${value} ${range.unit} > ${range.targetMax} ${range.unit})`);
        }
        
        if (range.targetMin && value < range.targetMin) {
            warnings.push(`${range.description || type} below recommended target (${value} ${range.unit} < ${range.targetMin} ${range.unit})`);
        }
        
        // High risk thresholds
        if (range.highRiskMin && value >= range.highRiskMin) {
            warnings.push(`${range.description || type} in high risk range (${value} ${range.unit} ≥ ${range.highRiskMin} ${range.unit})`);
        }
        
        if (range.highRiskMax && value > range.highRiskMax) {
            warnings.push(`${range.description || type} exceeds high risk threshold (${value} ${range.unit} > ${range.highRiskMax} ${range.unit})`);
        }
        
        // BMI categories
        if (type === 'bmi') {
            if (value < range.underweight) {
                warnings.push('Underweight');
            } else if (value >= range.obese) {
                if (value >= range.morbidlyObese) {
                    warnings.push('Morbidly obese');
                } else {
                    warnings.push('Obese');
                }
            } else if (value >= range.overweight) {
                warnings.push('Overweight');
            }
        }
        
        // Diabetes thresholds
        if (range.diabetesThreshold) {
            if (value >= range.diabetesThreshold) {
                warnings.push(`${range.description || type} in diabetic range (${value} ${range.unit} ≥ ${range.diabetesThreshold} ${range.unit})`);
            } else if (range.preDiabetesMin && value >= range.preDiabetesMin) {
                warnings.push(`${range.description || type} in pre-diabetic range (${value} ${range.unit} ≥ ${range.preDiabetesMin} ${range.unit})`);
            }
        }
        
        // CKD stages
        if (type === 'egfr') {
            if (value < range.ckdStage5) {
                warnings.push('CKD Stage 5 (Kidney Failure)');
            } else if (value < range.ckdStage4) {
                warnings.push('CKD Stage 4 (Severe)');
            } else if (value < range.ckdStage3) {
                warnings.push('CKD Stage 3 (Moderate)');
            }
        }
        
        // Gender-specific warnings
        if (options.gender) {
            if (type === 'waistCirc_cm') {
                const threshold = options.gender === 'male' ? range.highRiskMale : range.highRiskFemale;
                if (value >= threshold) {
                    warnings.push(`Waist circumference indicates increased cardiovascular risk for ${options.gender}s`);
                }
            }
            
            if (type.includes('creatinine')) {
                const normalMax = options.gender === 'male' ? range.normalMaxMale : range.normalMaxFemale;
                if (value > normalMax) {
                    warnings.push(`${range.description || type} elevated for ${options.gender}s`);
                }
            }
        }
        
        return warnings;
    }
    
    /**
     * Validate blood pressure values
     * @param {number} sbp - Systolic blood pressure
     * @param {number} dbp - Diastolic blood pressure
     * @returns {Object} - Validation result
     */
    function validateBloodPressure(sbp, dbp) {
        const sbpResult = validateValue('sbp', sbp);
        const dbpResult = validateValue('dbp', dbp);
        
        // Combine results
        const isValid = sbpResult.isValid && dbpResult.isValid;
        const isWarning = sbpResult.isWarning || dbpResult.isWarning;
        const isCritical = sbpResult.isCritical || dbpResult.isCritical;
        
        const messages = [];
        if (sbpResult.message) messages.push(sbpResult.message);
        if (dbpResult.message) messages.push(dbpResult.message);
        
        // Check pulse pressure
        if (isValid && sbp > dbp) {
            const pulsePressure = sbp - dbp;
            if (pulsePressure < 20) {
                messages.push('Pulse pressure is very narrow (< 20 mmHg)');
            } else if (pulsePressure > 100) {
                messages.push('Pulse pressure is very wide (> 100 mmHg)');
            }
        } else if (isValid && sbp <= dbp) {
            messages.push('SBP must be greater than DBP');
            return {
                isValid: false,
                isWarning: false,
                isCritical: true,
                message: messages.join('; '),
                details: { type: 'invalid_bp_relationship' }
            };
        }
        
        // Blood pressure categories
        if (isValid) {
            let category = '';
            if (sbp < 120 && dbp < 80) {
                category = 'Normal';
            } else if (sbp < 130 && dbp < 80) {
                category = 'Elevated';
            } else if (sbp < 140 || dbp < 90) {
                category = 'Stage 1 Hypertension';
            } else if (sbp < 180 || dbp < 120) {
                category = 'Stage 2 Hypertension';
            } else {
                category = 'Hypertensive Crisis';
                messages.push('Immediate medical attention may be required');
            }
            
            if (category && category !== 'Normal') {
                messages.push(`Blood pressure category: ${category}`);
            }
        }
        
        return {
            isValid,
            isWarning,
            isCritical,
            message: messages.length > 0 ? messages.join('; ') : null,
            details: {
                sbp: sbpResult.details,
                dbp: dbpResult.details
            }
        };
    }
    
    /**
     * Validate cholesterol ratios
     * @param {number} total - Total cholesterol
     * @param {number} hdl - HDL cholesterol
     * @returns {Object} - Validation result
     */
    function validateCholesterolRatio(total, hdl) {
        if (!total || !hdl || hdl === 0) {
            return {
                isValid: false,
                isWarning: false,
                isCritical: false,
                message: 'Cannot calculate cholesterol ratio',
                details: { type: 'invalid_input' }
            };
        }
        
        const ratio = total / hdl;
        const warnings = [];
        
        if (ratio < 2.0) {
            warnings.push('Cholesterol ratio is unusually low');
        } else if (ratio > 6.0) {
            warnings.push('Cholesterol ratio indicates high cardiovascular risk');
        } else if (ratio > 5.0) {
            warnings.push('Cholesterol ratio is elevated');
        }
        
        return {
            isValid: true,
            isWarning: warnings.length > 0,
            isCritical: false,
            message: warnings.length > 0 ? warnings.join('; ') : null,
            details: { type: warnings.length > 0 ? 'warning' : 'normal', ratio }
        };
    }
    
    /**
     * Validate BMI calculation
     * @param {number} weight - Weight in kg
     * @param {number} height - Height in cm
     * @returns {Object} - Validation result
     */
    function validateBMI(weight, height) {
        if (!weight || !height || height === 0) {
            return {
                isValid: false,
                isWarning: false,
                isCritical: false,
                message: 'Cannot calculate BMI',
                details: { type: 'invalid_input' }
            };
        }
        
        const heightInMeters = height / 100;
        const bmi = weight / (heightInMeters * heightInMeters);
        
        return validateValue('bmi', bmi);
    }
    
    /**
     * Get range information for a measurement type
     * @param {string} type - Measurement type
     * @returns {Object} - Range information
     */
    function getRangeInfo(type) {
        return RANGES[type] || null;
    }
    
    /**
     * Get all measurement types
     * @returns {Array} - List of measurement types
     */
    function getMeasurementTypes() {
        return Object.keys(RANGES);
    }
    
    /**
     * Convert between units
     * @param {number} value - Value to convert
     * @param {string} fromType - Source measurement type
     * @param {string} toType - Target measurement type
     * @returns {number} - Converted value
     */
    function convertUnits(value, fromType, toType) {
        const conversions = {
            // Cholesterol conversions
            'totalChol_mmol_to_mg': value => value * 38.67,
            'totalChol_mg_to_mmol': value => value / 38.67,
            'hdl_mmol_to_mg': value => value * 38.67,
            'hdl_mg_to_mmol': value => value / 38.67,
            'ldl_mmol_to_mg': value => value * 38.67,
            'ldl_mg_to_mmol': value => value / 38.67,
            
            // Triglycerides conversions
            'trig_mmol_to_mg': value => value * 88.57,
            'trig_mg_to_mmol': value => value / 88.57,
            
            // Lp(a) conversions
            'lpa_mg_to_nmol': value => value * 2.5,
            'lpa_nmol_to_mg': value => value / 2.5,
            
            // ApoB conversions
            'apob_g_to_mg': value => value * 100,
            'apob_mg_to_g': value => value / 100,
            
            // Glucose conversions
            'glucose_mmol_to_mg': value => value * 18.02,
            'glucose_mg_to_mmol': value => value / 18.02,
            
            // Creatinine conversions
            'creatinine_umol_to_mg': value => value / 88.4,
            'creatinine_mg_to_umol': value => value * 88.4,
            
            // Height conversions
            'height_cm_to_in': value => value / 2.54,
            'height_in_to_cm': value => value * 2.54,
            
            // Weight conversions
            'weight_kg_to_lb': value => value * 2.20462,
            'weight_lb_to_kg': value => value / 2.20462
        };
        
        const conversionKey = `${fromType}_to_${toType}`;
        const converter = conversions[conversionKey];
        
        if (converter) {
            return converter(value);
        }
        
        console.warn(`No conversion available from ${fromType} to ${toType}`);
        return value;
    }
    
    // Public API
    return {
        validateValue,
        validateBloodPressure,
        validateCholesterolRatio,
        validateBMI,
        getRangeInfo,
        getMeasurementTypes,
        convertUnits,
        RANGES
    };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = physiologicalValidation;
} else {
    window.physiologicalValidation = physiologicalValidation;
}