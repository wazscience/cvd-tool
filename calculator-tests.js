/**
 * calculator-tests.js
 * Unit tests for CVD Risk Toolkit calculator functions
 */

const assert = require('assert');
const sinon = require('sinon');
const path = require('path');

// Mock DOM elements for testing
global.document = {
  getElementById: sinon.stub(),
  querySelector: sinon.stub(),
  querySelectorAll: sinon.stub(),
  createElement: sinon.stub().returns({
    style: {},
    classList: {
      add: sinon.stub(),
      remove: sinon.stub(),
      toggle: sinon.stub()
    },
    appendChild: sinon.stub()
  }),
  body: {
    appendChild: sinon.stub()
  }
};

global.window = {
  localStorage: {
    getItem: sinon.stub(),
    setItem: sinon.stub()
  }
};

// Require calculator functions - use relative path to your actual file
// To run these tests, you'll need to export the calculator functions from your combined.js
// or create a separate calculators.js file with the exported functions
const calculators = require('./calculators');

describe('CVD Risk Toolkit Calculator Tests', function() {
  
  // Reset mocks before each test
  beforeEach(function() {
    sinon.reset();
  });
  
  describe('Lp(a) Modifier Calculation', function() {
    it('should return 1.0 for Lp(a) values below 30 mg/dL', function() {
      assert.strictEqual(calculators.calculateLpaModifier(0), 1.0);
      assert.strictEqual(calculators.calculateLpaModifier(15), 1.0);
      assert.strictEqual(calculators.calculateLpaModifier(29.9), 1.0);
    });
    
    it('should calculate correctly for Lp(a) values between 30-50 mg/dL', function() {
      assert.strictEqual(calculators.calculateLpaModifier(30), 1.0);
      assert.strictEqual(calculators.calculateLpaModifier(40), 1.15);
      assert.strictEqual(calculators.calculateLpaModifier(50), 1.3);
    });
    
    it('should calculate correctly for Lp(a) values between 50-100 mg/dL', function() {
      assert.strictEqual(calculators.calculateLpaModifier(50), 1.3);
      assert.strictEqual(calculators.calculateLpaModifier(75), 1.45);
      assert.strictEqual(calculators.calculateLpaModifier(100), 1.6);
    });
    
    it('should calculate correctly for Lp(a) values between 100-200 mg/dL', function() {
      assert.strictEqual(calculators.calculateLpaModifier(100), 1.6);
      assert.strictEqual(calculators.calculateLpaModifier(150), 1.8);
      assert.strictEqual(calculators.calculateLpaModifier(200), 2.0);
    });
    
    it('should calculate correctly for Lp(a) values between 200-300 mg/dL', function() {
      assert.strictEqual(calculators.calculateLpaModifier(200), 2.0);
      assert.strictEqual(calculators.calculateLpaModifier(250), 2.5);
      assert.strictEqual(calculators.calculateLpaModifier(300), 3.0);
    });
    
    it('should return maximum modifier (3.0) for Lp(a) values above 300 mg/dL', function() {
      assert.strictEqual(calculators.calculateLpaModifier(300), 3.0);
      assert.strictEqual(calculators.calculateLpaModifier(400), 3.0);
      assert.strictEqual(calculators.calculateLpaModifier(1000), 3.0);
    });
  });
  
  describe('Unit Conversion Functions', function() {
    describe('Cholesterol Conversion', function() {
      it('should correctly convert mg/dL to mmol/L', function() {
        assert.strictEqual(calculators.convertCholesterol(100, 'mg/dL', 'mmol/L'), 2.586);
        assert.strictEqual(calculators.convertCholesterol(200, 'mg/dL', 'mmol/L'), 5.172);
        assert.strictEqual(calculators.convertCholesterol(300, 'mg/dL', 'mmol/L'), 7.758);
      });
      
      it('should correctly convert mmol/L to mg/dL', function() {
        assert.strictEqual(calculators.convertCholesterol(2.6, 'mmol/L', 'mg/dL'), 100.542);
        assert.strictEqual(calculators.convertCholesterol(5.2, 'mmol/L', 'mg/dL'), 201.084);
        assert.strictEqual(calculators.convertCholesterol(7.8, 'mmol/L', 'mg/dL'), 301.626);
      });
      
      it('should return the same value when units are the same', function() {
        assert.strictEqual(calculators.convertCholesterol(5.2, 'mmol/L', 'mmol/L'), 5.2);
        assert.strictEqual(calculators.convertCholesterol(200, 'mg/dL', 'mg/dL'), 200);
      });
    });
    
    describe('Lp(a) Conversion', function() {
      it('should correctly convert nmol/L to mg/dL', function() {
        assert.strictEqual(calculators.convertLpa(100, 'nmol/L', 'mg/dL'), 40);
        assert.strictEqual(calculators.convertLpa(250, 'nmol/L', 'mg/dL'), 100);
      });
      
      it('should correctly convert mg/dL to nmol/L', function() {
        assert.strictEqual(calculators.convertLpa(40, 'mg/dL', 'nmol/L'), 100);
        assert.strictEqual(calculators.convertLpa(100, 'mg/dL', 'nmol/L'), 250);
      });
      
      it('should return the same value when units are the same', function() {
        assert.strictEqual(calculators.convertLpa(100, 'nmol/L', 'nmol/L'), 100);
        assert.strictEqual(calculators.convertLpa(50, 'mg/dL', 'mg/dL'), 50);
      });
    });
    
    describe('Height Conversion', function() {
      it('should correctly convert feet/inches to cm', function() {
        assert.strictEqual(calculators.convertHeightToCm(5, 0), 152.4);
        assert.strictEqual(calculators.convertHeightToCm(5, 6), 167.64);
        assert.strictEqual(calculators.convertHeightToCm(6, 0), 182.88);
      });
      
      it('should handle null or undefined values', function() {
        assert.strictEqual(calculators.convertHeightToCm(null, null), null);
        assert.strictEqual(calculators.convertHeightToCm(5, null), 152.4);
        assert.strictEqual(calculators.convertHeightToCm(null, 6), 15.24);
      });
    });
  });
  
  describe('Risk Category Determination', function() {
    it('should categorize risk correctly', function() {
      assert.strictEqual(calculators.getRiskCategory(5), 'low');
      assert.strictEqual(calculators.getRiskCategory(9.9), 'low');
      assert.strictEqual(calculators.getRiskCategory(10), 'moderate');
      assert.strictEqual(calculators.getRiskCategory(15), 'moderate');
      assert.strictEqual(calculators.getRiskCategory(19.9), 'moderate');
      assert.strictEqual(calculators.getRiskCategory(20), 'high');
      assert.strictEqual(calculators.getRiskCategory(30), 'high');
    });
  });
  
  describe('Framingham Risk Score Calculation', function() {
    const mockFraminghamData = {
      age: 55,
      sex: 'male',
      totalChol: 5.2,
      totalCholUnit: 'mmol/L',
      hdl: 1.3,
      hdlUnit: 'mmol/L',
      sbp: 140,
      bpTreatment: true,
      smoker: true,
      diabetes: false,
      lpa: null
    };
    
    it('should calculate baseline risk correctly', function() {
      const result = calculators.calculateFraminghamRiskScore(mockFraminghamData);
      assert.ok(result.baseRisk > 0, 'Base risk should be greater than 0');
      assert.ok(result.baseRisk <= 100, 'Base risk should be less than or equal to 100');
    });
    
    it('should apply Lp(a) modifier correctly when provided', function() {
      const dataWithLpa = { ...mockFraminghamData, lpa: 75, lpaUnit: 'mg/dL' };
      const result = calculators.calculateFraminghamRiskScore(dataWithLpa);
      
      // The modifier for Lp(a) of 75 mg/dL should be approximately 1.45
      assert.ok(result.lpaModifier > 1.4 && result.lpaModifier < 1.5, 
          `Lp(a) modifier should be ~1.45 but was ${result.lpaModifier}`);
      
      // The modified risk should be baseline * modifier
      const expectedModifiedRisk = result.baseRisk * result.lpaModifier;
      assert.ok(Math.abs(result.modifiedRisk - expectedModifiedRisk) < 0.01, 
          'Modified risk should equal base risk times Lp(a) modifier');
    });
    
    it('should categorize risk appropriately', function() {
      const lowRiskData = { ...mockFraminghamData, age: 40, smoker: false, sbp: 120 };
      const highRiskData = { ...mockFraminghamData, age: 65, smoker: true, sbp: 160, diabetes: true };
      
      const lowRiskResult = calculators.calculateFraminghamRiskScore(lowRiskData);
      const highRiskResult = calculators.calculateFraminghamRiskScore(highRiskData);
      
      assert.ok(lowRiskResult.modifiedRisk < highRiskResult.modifiedRisk, 
          'High risk factors should result in higher risk score');
          
      // Check risk categories are assigned correctly
      if (lowRiskResult.modifiedRisk < 10) {
        assert.strictEqual(lowRiskResult.riskCategory, 'low', 
            `Risk of ${lowRiskResult.modifiedRisk}% should be categorized as low`);
      } else if (lowRiskResult.modifiedRisk < 20) {
        assert.strictEqual(lowRiskResult.riskCategory, 'moderate', 
            `Risk of ${lowRiskResult.modifiedRisk}% should be categorized as moderate`);
      } else {
        assert.strictEqual(lowRiskResult.riskCategory, 'high', 
            `Risk of ${lowRiskResult.modifiedRisk}% should be categorized as high`);
      }
      
      if (highRiskResult.modifiedRisk >= 20) {
        assert.strictEqual(highRiskResult.riskCategory, 'high',
            `Risk of ${highRiskResult.modifiedRisk}% should be categorized as high`);
      }
    });
  });
  
  describe('QRISK3 Calculation', function() {
    const mockQRISKData = {
      age: 55,
      sex: 'male',
      ethnicity: 'white',
      height: 175,
      weight: 80,
      bmi: 26.12,
      sbp: 140,
      sbpSd: 8,
      totalChol: 5.2,
      totalCholUnit: 'mmol/L',
      hdl: 1.3,
      hdlUnit: 'mmol/L',
      cholRatio: 4.0,
      smoker: 'ex',
      diabetes: 'none',
      familyHistory: true,
      bpTreatment: true,
      atrialFibrillation: false,
      rheumatoidArthritis: false,
      chronicKidneyDisease: false,
      lpa: null
    };
    
    it('should calculate baseline risk correctly', function() {
      const result = calculators.calculateQRISK3Score(mockQRISKData);
      assert.ok(result.baseRisk > 0, 'Base risk should be greater than 0');
      assert.ok(result.baseRisk <= 100, 'Base risk should be less than or equal to 100');
    });
    
    it('should apply Lp(a) modifier correctly when provided', function() {
      const dataWithLpa = { ...mockQRISKData, lpa: 75, lpaUnit: 'mg/dL' };
      const result = calculators.calculateQRISK3Score(dataWithLpa);
      
      // The modifier for Lp(a) of 75 mg/dL should be approximately 1.45
      assert.ok(result.lpaModifier > 1.4 && result.lpaModifier < 1.5, 
          `Lp(a) modifier should be ~1.45 but was ${result.lpaModifier}`);
      
      // The modified risk should be baseline * modifier
      const expectedModifiedRisk = result.baseRisk * result.lpaModifier;
      assert.ok(Math.abs(result.modifiedRisk - expectedModifiedRisk) < 0.01, 
          'Modified risk should equal base risk times Lp(a) modifier');
    });
    
    it('should account for ethnicity differences', function() {
      const whiteData = { ...mockQRISKData, ethnicity: 'white' };
      const southAsianData = { ...mockQRISKData, ethnicity: 'indian' };
      
      const whiteResult = calculators.calculateQRISK3Score(whiteData);
      const southAsianResult = calculators.calculateQRISK3Score(southAsianData);
      
      assert.ok(southAsianResult.baseRisk > whiteResult.baseRisk, 
          'South Asian ethnicity should have higher risk than White ethnicity');
    });
    
    it('should account for smoking status', function() {
      const nonSmokerData = { ...mockQRISKData, smoker: 'non' };
      const exSmokerData = { ...mockQRISKData, smoker: 'ex' };
      const heavySmokerData = { ...mockQRISKData, smoker: 'heavy' };
      
      const nonSmokerResult = calculators.calculateQRISK3Score(nonSmokerData);
      const exSmokerResult = calculators.calculateQRISK3Score(exSmokerData);
      const heavySmokerResult = calculators.calculateQRISK3Score(heavySmokerData);
      
      assert.ok(nonSmokerResult.baseRisk < exSmokerResult.baseRisk, 
          'Ex-smoker should have higher risk than non-smoker');
      assert.ok(exSmokerResult.baseRisk < heavySmokerResult.baseRisk, 
          'Heavy smoker should have higher risk than ex-smoker');
    });
    
    it('should account for medical conditions', function() {
      const noConditionsData = { ...mockQRISKData };
      const afData = { ...mockQRISKData, atrialFibrillation: true };
      
      const noConditionsResult = calculators.calculateQRISK3Score(noConditionsData);
      const afResult = calculators.calculateQRISK3Score(afData);
      
      assert.ok(afResult.baseRisk > noConditionsResult.baseRisk, 
          'Atrial fibrillation should increase risk');
    });
  });
});

// Export tests for use with testing frameworks
module.exports = {
  runTests: function() {
    describe('CVD Risk Toolkit Tests', function() {
      // Run all the tests
    });
  }
};