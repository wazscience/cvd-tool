// Add missing event handlers
document.addEventListener('DOMContentLoaded', function() {
  // Toggle manual non-HDL entry
  const toggleManualNonHDL = document.getElementById('toggle-manual-non-hdl');
  if (toggleManualNonHDL) {
    toggleManualNonHDL.addEventListener('click', function() {
      const nonHDLInput = document.getElementById('med-non-hdl');
      if (nonHDLInput) {
        nonHDLInput.disabled = !nonHDLInput.disabled;
        this.textContent = nonHDLInput.disabled ? 'Enter manually' : 'Use auto-calculation';
      }
    });
  }

  // Add statin selection handler
  const statinSelect = document.getElementById('med-statin');
  if (statinSelect) {
    statinSelect.addEventListener('change', function() {
      const doseSelect = document.getElementById('med-statin-dose');
      if (doseSelect) {
        doseSelect.disabled = this.value === 'none';
        doseSelect.innerHTML = '<option value="" selected>Select dose</option>';

        if (this.value !== 'none') {
          // Define statin doses
          const doses = {
            atorvastatin: [
              { value: '10', text: '10 mg', intensity: 'moderate' },
              { value: '20', text: '20 mg', intensity: 'moderate' },
              { value: '40', text: '40 mg', intensity: 'high' },
              { value: '80', text: '80 mg', intensity: 'high' }
            ],
            rosuvastatin: [
              { value: '5', text: '5 mg', intensity: 'moderate' },
              { value: '10', text: '10 mg', intensity: 'moderate' },
              { value: '20', text: '20 mg', intensity: 'high' },
              { value: '40', text: '40 mg', intensity: 'high' }
            ],
            simvastatin: [
              { value: '10', text: '10 mg', intensity: 'low' },
              { value: '20', text: '20 mg', intensity: 'moderate' },
              { value: '40', text: '40 mg', intensity: 'moderate' }
            ],
            pravastatin: [
              { value: '10', text: '10 mg', intensity: 'low' },
              { value: '20', text: '20 mg', intensity: 'low' },
              { value: '40', text: '40 mg', intensity: 'moderate' },
              { value: '80', text: '80 mg', intensity: 'moderate' }
            ],
            lovastatin: [
              { value: '10', text: '10 mg', intensity: 'low' },
              { value: '20', text: '20 mg', intensity: 'low' },
              { value: '40', text: '40 mg', intensity: 'moderate' }
            ],
            fluvastatin: [
              { value: '20', text: '20 mg', intensity: 'low' },
              { value: '40', text: '40 mg', intensity: 'low' },
              { value: '80', text: '80 mg', intensity: 'moderate' }
            ],
            pitavastatin: [
              { value: '1', text: '1 mg', intensity: 'low' },
              { value: '2', text: '2 mg', intensity: 'moderate' },
              { value: '4', text: '4 mg', intensity: 'moderate' }
            ]
          };

          if (doses[this.value]) {
            doses[this.value].forEach(dose => {
              const option = document.createElement('option');
              option.value = dose.value;
              option.textContent = dose.text;
              option.dataset.intensity = dose.intensity;
              doseSelect.appendChild(option);
            });
          }
        }
      }
    });
  }

  // Statin intolerance handler
  const intoleranceSelect = document.getElementById('med-statin-intolerance');
  if (intoleranceSelect) {
    intoleranceSelect.addEventListener('change', function() {
      const typeSelect = document.getElementById('med-intolerance-type');
      if (typeSelect) {
        typeSelect.disabled = this.value === 'no';
      }
    });
  }

  // PCSK9 checkbox handler
  const pcsk9Checkbox = document.getElementById('med-pcsk9');
  if (pcsk9Checkbox) {
    pcsk9Checkbox.addEventListener('change', function() {
      const pcsk9Details = document.getElementById('pcsk9-details');
      if (pcsk9Details) {
        pcsk9Details.style.display = this.checked ? 'block' : 'none';
      }
    });
  }

  // Prevention category handler
  const preventionCategory = document.getElementById('prevention-category');
  if (preventionCategory) {
    preventionCategory.addEventListener('change', function() {
      const secondaryDetails = document.getElementById('secondary-details');
      if (secondaryDetails) {
        secondaryDetails.disabled = this.value !== 'secondary';
      }
    });
  }
});
