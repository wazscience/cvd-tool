// Form Handler Module
const formHandler = (function() {
  function handleFormSubmit(formId, schema, callback) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      if (typeof callback === 'function') {
        callback(data);
      }
    });
  }
  
  return { handleFormSubmit };
})();
window.formHandler = formHandler;
