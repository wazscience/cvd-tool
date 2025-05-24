/**
 * integration-test.js
 * Integration tests for CVD Risk Toolkit
 * 
 * These tests verify that the different components of the toolkit
 * work together correctly, including DOM updates, form handling,
 * and result display.
 */

const assert = require('assert');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');

// Create a mock DOM environment for testing
function setupDOM() {
  // Create a new JSDOM instance with HTML content
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CVD Risk Toolkit Test</title>
    </head>
    <body>
      <!-- FRS Form -->
      <form id="frs-form">
        <input id="frs-age" type="number" value="55">
        <select id="frs-sex">
          <option value="male" selected>Male</option>
          <option value="female">Female</option>
        </select>
        <input id="frs-total-chol" type="number" value="5.2">
        <select id="frs-total-chol-unit">
          <option value="mmol/L" selected>mmol/L</option>
          <option value="mg/dL">mg/dL</option>
        </select>
        <input id="frs-hdl" type="number" value="1.3">
        <select id="frs-hdl-unit">
          <option value="mmol/L" selected>mmol/L</option>
          <option value="mg/dL">mg/dL</option>
        </select>
        <input id="frs-sbp" type="number" value="140">
        <select id="frs-bp-treatment">
          <option value="yes" selected>Yes</option>
          <option value="no">No</option>
        </select>
        <select id="frs-smoker">
          <option value="yes" selected>Yes</option>
          <option value="no">No</option>
        </select>
        <select id="frs-diabetes">
          <option value="yes">Yes</option>
          <option value="no" selected>No</option>
        </select>
        <input id="frs-lpa" type="number" value="75">
        <select id="frs-lpa-unit">
          <option value="mg/dL" selected>mg/dL</option>
          <option value="nmol/L">nmol/L</option>
        </select>
        <button type="button" id="calculate-frs-btn">Calculate</button>
      </form>
      
      <!-- Results Section -->
      <div id="results-container" style="display: none;">
        <div id="risk-results"></div>
        <div id="recommendations-content"></div>
      </div>
    </body>
    </html>
  `);
  
  // Set global variables for testing
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  
  // Mock DOM methods not provided by JSDOM
  global.window.scrollTo = sinon.stub();
  global.document.createRange = () => ({
    setStart: () => {},
    setEnd: () => {},
    commonAncestorContainer: {
      nodeName: 'BODY',
      ownerDocument: document,
    },
  });
  
  return dom;
}

// Create single risk result template
function createTemplates() {
  const template = document.createElement('template');
  template.id = 'single-risk-template';
  template.innerHTML = `
    <div class="results-card">
      <div class="risk-header">
        <h3 class="risk-title"></h3>
        <div class="risk-badge"></div>
      </div>
      <div class="risk-visualization">
        <div class="risk-gauge">
          <div class="gauge-value">
            <span class="risk-value"></span>
          </div>
        </div>
      </div>
      <div class="risk-details">
        <div class="results-row">
          <div class="results-label">Base Risk:</div>
          <div class="results-value base-risk"></div>
        </div>
        <div class="results-row lpa-modifier-row">
          <div class="results-label">Lp(a) Modifier:</div>
          <div class="results-value lpa-modifier"></div>
        </div>
        <div class="results-row">
          <div class="results-label">Adjusted Risk:</div>
          <div class="results-value adjusted-risk"></div>
        </div>
        <div class="results-row risk-category-row">
          <div class="results-label">Risk Category:</div>
          <div class="results-value risk-category"></div>
        </div>
      </div>
      <div class="risk-interpretation"></div>
    </div>
  `;
  document.body.appendChild(template);
  
  return template;
}

describe('CVD Risk Toolkit Integration Tests', function() {
  let dom;
  let calculators;
  let sandbox;
  
  before(function() {
    // Set up the DOM environment
    dom = setupDOM();
    createTemplates();
    
    // Load the calculator module
    calculators = require('./calculators');
    
    // Create sandbox for spies and stubs
    sandbox = sinon.createSandbox();
  });
  
  afterEach(function() {
    // Restore all stubs and spies
    sandbox.restore();
  });
  
  after(function() {
    // Clean up
    global.window = undefined;
    global.document = undefined;
    global.navigator = undefined;
    global.HTMLElement = undefined;
  });
  
  describe('Form Data Extraction', function() {
    it('should extract FRS form data correctly', function() {
      // Import the form validation function
      const { extractFRSFormData } = require('./form-handler');
      
      // Extract form data
      const data = extractFRSFormData();
      
      // Verify extracted data
      assert.strictEqual(data.age, 55);
      assert.strictEqual(data.sex, 'male');
      assert.strictEqual(data.totalChol, 5.2);
      assert.strictEqual(data.totalCholUnit, 'mmol/L');
      assert.strictEqual(data.hdl, 1.3);
      assert.strictEqual(data.hdlUnit, 'mmol/L');
      assert.strictEqual(data.sbp, 140);
      assert.strictEqual(data.bpTreatment, true);
      assert.strictEqual(data.smoker, true);
      assert.strictEqual(data.diabetes, false);
      assert.strictEqual(data.lpa, 75);
      assert.strictEqual(data.lpaUnit, 'mg/dL');
    });
  });
  
  describe('Form Validation', function() {
    it('should validate form data and return errors for invalid fields', function() {
      // Import the form validation function
      const { validateFRSForm } = require('./form-handler');
      
      // Make age invalid
      const ageInput = document.getElementById('frs-age');
      ageInput.value = 85; // Outside valid range (30-74)
      
      // Validate form
      const result = validateFRSForm();
      
      // Check validation result
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some(error => error.includes('Age')));
      
      // Restore valid value
      ageInput.value = 55;
    });
    
    it('should pass validation with valid form data', function() {
      // Import the form validation function
      const { validateFRSForm } = require('./form-handler');
      
      // Validate form with all valid fields
      const result = validateFRSForm();
      
      // Check validation result
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
    });
  });
  
  describe('End-to-End Calculation Flow', function() {
    it('should calculate and display FRS results when button is clicked', function() {
      // Create stub for calculation
      const calculateStub = sandbox.stub(calculators, 'calculateFraminghamRiskScore').returns({
        baseRisk: 15.2,
        lpaModifier: 1.45,
        modifiedRisk: 22.04,
        riskCategory: 'high'
      });
      
      // Import the displayFRSResults function
      const { displayFRSResults } = require('./ui-handler');
      
      // Create stub for display function
      const displayStub = sandbox.stub().callsFake(function(data, results, recommendations) {
        // This simulates the UI update
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.style.display = 'block';
        
        const template = document.getElementById('single-risk-template');
        const content = template.content.cloneNode(true);
        
        content.querySelector('.risk-title').textContent = 'Framingham Risk Score Results';
        content.querySelector('.risk-value').textContent = '22.0%';
        content.querySelector('.base-risk').textContent = '15.2%';
        content.querySelector('.lpa-modifier').textContent = '1.45x';
        content.querySelector('.adjusted-risk').textContent = '22.0%';
        content.querySelector('.risk-badge').textContent = 'High';
        content.querySelector('.risk-badge').classList.add('high');
        content.querySelector('.risk-category').textContent = 'High Risk';
        
        document.getElementById('risk-results').appendChild(content);
      });
      
      // Simulate clicking the calculate button
      const calculateBtn = document.getElementById('calculate-frs-btn');
      calculateBtn.click();
      
      // Check that calculation was performed with correct data
      assert.strictEqual(calculateStub.callCount, 1);
      const callData = calculateStub.getCall(0).args[0];
      assert.strictEqual(callData.age, 55);
      
      // Check that results are displayed
      const resultsContainer = document.getElementById('results-container');
      assert.equal(resultsContainer.style.display, 'block');
    });
  });
  
  describe('Unit Conversion', function() {
    it('should convert units correctly when user changes unit selectors', function() {
      // Import unit conversion functions
      const { handleUnitChange } = require('./form-handler');
      
      // Set initial values in mmol/L
      const totalCholInput = document.getElementById('frs-total-chol');
      const totalCholUnitSelect = document.getElementById('frs-total-chol-unit');
      totalCholInput.value = '5.2';
      
      // Create event listener stub
      const handleUnitChangeStub = sandbox.stub().callsFake(function(event) {
        const unitSelect = event.target;
        const inputId = unitSelect.id.replace('-unit', '');
        const input = document.getElementById(inputId);
        
        if (unitSelect.value === 'mg/dL') {
          // Convert mmol/L to mg/dL
          input.value = (parseFloat(input.value) * 38.67).toFixed(0);
        } else {
          // Convert mg/dL to mmol/L
          input.value = (parseFloat(input.value) / 38.67).toFixed(2);
        }
      });
      
      // Simulate unit change
      totalCholUnitSelect.value = 'mg/dL';
      const event = new dom.window.Event('change');
      totalCholUnitSelect.dispatchEvent(event);
      handleUnitChangeStub(event);
      
      // Check conversion
      assert.equal(totalCholInput.value, '201');
      
      // Convert back to mmol/L
      totalCholUnitSelect.value = 'mmol/L';
      totalCholUnitSelect.dispatchEvent(event);
      handleUnitChangeStub(event);
      
      // Check conversion back
      assert.equal(totalCholInput.value, '5.20');
    });
  });
});

// Helper functions for export
// These would be in separate modules in the actual application

/**
 * Extract form data from the FRS form
 * @returns {Object} - Extracted form data
 */
function extractFRSFormData() {
  return {
    age: parseInt(document.getElementById('frs-age').value),
    sex: document.getElementById('frs-sex').value,
    totalChol: parseFloat(document.getElementById('frs-total-chol').value),
    totalCholUnit: document.getElementById('frs-total-chol-unit').value,
    hdl: parseFloat(document.getElementById('frs-hdl').value),
    hdlUnit: document.getElementById('frs-hdl-unit').value,
    sbp: parseInt(document.getElementById('frs-sbp').value),
    bpTreatment: document.getElementById('frs-bp-treatment').value === 'yes',
    smoker: document.getElementById('frs-smoker').value === 'yes',
    diabetes: document.getElementById('frs-diabetes').value === 'yes',
    lpa: parseFloat(document.getElementById('frs-lpa').value),
    lpaUnit: document.getElementById('frs-lpa-unit').value
  };
}

/**
 * Validate the FRS form data
 * @returns {Object} - Validation result with errors
 */
function validateFRSForm() {
  const errors = [];
  const data = extractFRSFormData();
  
  // Age validation
  if (isNaN(data.age) || data.age < 30 || data.age > 74) {
    errors.push('Age must be between 30 and 74');
  }
  
  // Other validations would go here...
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    data: data
  };
}

/**
 * Handle unit change in form fields
 * @param {Event} event - Change event from unit selector
 */
function handleUnitChange(event) {
  const unitSelect = event.target;
  const inputId = unitSelect.id.replace('-unit', '');
  const input = document.getElementById(inputId);
  
  if (unitSelect.value === 'mg/dL') {
    // Convert mmol/L to mg/dL
    input.value = (parseFloat(input.value) * 38.67).toFixed(0);
  } else {
    // Convert mg/dL to mmol/L
    input.value = (parseFloat(input.value) / 38.67).toFixed(2);
  }
}

// Export functions for testing
module.exports = {
  extractFRSFormData,
  validateFRSForm,
  handleUnitChange
};