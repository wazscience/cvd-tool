/**
 * Enhanced Display Module
 * Provides advanced UI display functionality with animations, error handling,
 * and accessibility features
 */
const enhancedDisplay = (function() {
    // Configuration
    const config = {
        animationDuration: 300,
        toastTimeout: 5000,
        maxToasts: 3,
        defaultPosition: 'top-right',
        zIndex: 10000
    };
    
    // State tracking
    let activeToasts = [];
    let activeModals = new Map();
    
    /**
     * Create a toast notification container if it doesn't exist
     * @private
     */
    function createToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            container.setAttribute('role', 'alert');
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
            
            // Add styles if not already present
            if (!document.getElementById('enhanced-display-styles')) {
                const style = document.createElement('style');
                style.id = 'enhanced-display-styles';
                style.textContent = `
                    .toast-container {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: ${config.zIndex};
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        max-width: 400px;
                    }
                    
                    .toast {
                        padding: 16px;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        animation: slideIn 0.3s ease-out;
                        background: white;
                        border-left: 4px solid;
                        min-width: 300px;
                    }
                    
                    .toast.success {
                        border-color: #28a745;
                        background-color: #f8fff9;
                    }
                    
                    .toast.error {
                        border-color: #dc3545;
                        background-color: #fff8f8;
                    }
                    
                    .toast.warning {
                        border-color: #ffc107;
                        background-color: #fffdf8;
                    }
                    
                    .toast.info {
                        border-color: #17a2b8;
                        background-color: #f8fdff;
                    }
                    
                    .toast-icon {
                        flex-shrink: 0;
                        width: 24px;
                        height: 24px;
                    }
                    
                    .toast-content {
                        flex-grow: 1;
                    }
                    
                    .toast-title {
                        font-weight: 600;
                        margin-bottom: 4px;
                    }
                    
                    .toast-message {
                        font-size: 14px;
                        color: #495057;
                    }
                    
                    .toast-close {
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                        color: #6c757d;
                        padding: 0 4px;
                        opacity: 0.7;
                        transition: opacity 0.2s;
                    }
                    
                    .toast-close:hover {
                        opacity: 1;
                    }
                    
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    
                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                    
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.5);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: ${config.zIndex - 1};
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }
                    
                    .modal-content {
                        background: white;
                        border-radius: 12px;
                        padding: 24px;
                        max-width: 500px;
                        width: 90%;
                        max-height: 90vh;
                        overflow-y: auto;
                        transform: scale(0.9);
                        transition: transform 0.3s ease;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                    }
                    
                    .modal-overlay.visible {
                        opacity: 1;
                    }
                    
                    .modal-overlay.visible .modal-content {
                        transform: scale(1);
                    }
                    
                    .form-feedback {
                        font-size: 13px;
                        margin-top: 4px;
                        transition: opacity 0.2s;
                    }
                    
                    .form-feedback.success {
                        color: #28a745;
                    }
                    
                    .form-feedback.error {
                        color: #dc3545;
                    }
                    
                    .form-feedback.warning {
                        color: #ffc107;
                    }
                    
                    .loading-spinner {
                        display: inline-block;
                        width: 20px;
                        height: 20px;
                        border: 2px solid #f3f3f3;
                        border-top: 2px solid #3498db;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    
                    .highlight-element {
                        outline: 3px solid #ffc107;
                        outline-offset: 2px;
                        transition: outline 0.3s ease;
                    }
                    
                    .fade-in {
                        animation: fadeIn 0.3s ease-out;
                    }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                    .slide-down {
                        animation: slideDown 0.3s ease-out;
                    }
                    
                    @keyframes slideDown {
                        from {
                            transform: translateY(-20px);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        return container;
    }
    
    /**
     * Create SVG icon for toast notifications
     * @private
     */
    function createIcon(type) {
        const icons = {
            success: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            error: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffc107" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#17a2b8" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };
        return icons[type] || icons.info;
    }
    
    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type (success, error, warning, info)
     * @param {Object} options - Additional options
     */
    function showToast(message, type = 'info', options = {}) {
        const container = createToastContainer();
        
        // Remove oldest toast if limit exceeded
        if (activeToasts.length >= config.maxToasts) {
            removeToast(activeToasts[0]);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        
        const icon = document.createElement('div');
        icon.className = 'toast-icon';
        icon.innerHTML = createIcon(type);
        
        const content = document.createElement('div');
        content.className = 'toast-content';
        
        if (options.title) {
            const title = document.createElement('div');
            title.className = 'toast-title';
            title.textContent = options.title;
            content.appendChild(title);
        }
        
        const messageEl = document.createElement('div');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;
        content.appendChild(messageEl);
        
        const close = document.createElement('button');
        close.className = 'toast-close';
        close.innerHTML = '×';
        close.setAttribute('aria-label', 'Close notification');
        close.onclick = () => removeToast(toast);
        
        toast.appendChild(icon);
        toast.appendChild(content);
        toast.appendChild(close);
        
        container.appendChild(toast);
        activeToasts.push(toast);
        
        // Auto remove after timeout
        const timeout = options.timeout || config.toastTimeout;
        if (timeout > 0) {
            setTimeout(() => removeToast(toast), timeout);
        }
        
        return toast;
    }
    
    /**
     * Remove a toast notification
     * @private
     */
    function removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            const index = activeToasts.indexOf(toast);
            if (index > -1) {
                activeToasts.splice(index, 1);
            }
        }, 300);
    }
    
    /**
     * Show a modal dialog
     * @param {Object} options - Modal options
     */
    function showModal(options = {}) {
        const modalId = options.id || 'modal-' + Date.now();
        
        if (activeModals.has(modalId)) {
            return activeModals.get(modalId);
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        
        if (options.title) {
            const header = document.createElement('div');
            header.className = 'modal-header';
            header.innerHTML = `<h3>${options.title}</h3>`;
            content.appendChild(header);
        }
        
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.innerHTML = options.content || '';
        content.appendChild(body);
        
        if (options.buttons) {
            const footer = document.createElement('div');
            footer.className = 'modal-footer';
            
            options.buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.className = button.className || 'btn';
                btn.textContent = button.text;
                btn.onclick = () => {
                    if (button.onClick) button.onClick();
                    if (button.closeOnClick !== false) hideModal(modalId);
                };
                footer.appendChild(btn);
            });
            
            content.appendChild(footer);
        }
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Show with animation
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && options.closeOnOverlay !== false) {
                hideModal(modalId);
            }
        });
        
        // Close on escape key
        const escHandler = (e) => {
            if (e.key === 'Escape' && options.closeOnEscape !== false) {
                hideModal(modalId);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        activeModals.set(modalId, { overlay, escHandler });
        
        return modalId;
    }
    
    /**
     * Hide a modal dialog
     * @param {string} modalId - ID of the modal to hide
     */
    function hideModal(modalId) {
        const modal = activeModals.get(modalId);
        if (!modal) return;
        
        modal.overlay.classList.remove('visible');
        document.removeEventListener('keydown', modal.escHandler);
        
        setTimeout(() => {
            if (modal.overlay.parentNode) {
                modal.overlay.parentNode.removeChild(modal.overlay);
            }
            activeModals.delete(modalId);
        }, config.animationDuration);
    }
    
    /**
     * Show form field feedback
     * @param {HTMLElement} field - Form field element
     * @param {string} message - Feedback message
     * @param {string} type - Feedback type (success, error, warning)
     */
    function showFieldFeedback(field, message, type = 'info') {
        const feedbackId = field.id + '-feedback';
        let feedback = document.getElementById(feedbackId);
        
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = feedbackId;
            feedback.className = 'form-feedback';
            field.parentNode.insertBefore(feedback, field.nextSibling);
        }
        
        feedback.textContent = message;
        feedback.className = `form-feedback ${type}`;
        feedback.style.opacity = '1';
        
        // Associate with field for accessibility
        field.setAttribute('aria-describedby', feedbackId);
        
        if (type === 'error') {
            field.setAttribute('aria-invalid', 'true');
        } else {
            field.removeAttribute('aria-invalid');
        }
    }
    
    /**
     * Clear form field feedback
     * @param {HTMLElement} field - Form field element
     */
    function clearFieldFeedback(field) {
        const feedbackId = field.id + '-feedback';
        const feedback = document.getElementById(feedbackId);
        
        if (feedback) {
            feedback.style.opacity = '0';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 200);
        }
        
        field.removeAttribute('aria-describedby');
        field.removeAttribute('aria-invalid');
    }
    
    /**
     * Highlight an element
     * @param {HTMLElement} element - Element to highlight
     * @param {number} duration - Duration in milliseconds
     */
    function highlightElement(element, duration = 2000) {
        element.classList.add('highlight-element');
        
        setTimeout(() => {
            element.classList.remove('highlight-element');
        }, duration);
    }
    
    /**
     * Show/hide loading spinner
     * @param {HTMLElement} container - Container element
     * @param {boolean} show - Whether to show or hide
     */
    function toggleLoadingSpinner(container, show = true) {
        const spinnerId = container.id + '-spinner';
        let spinner = document.getElementById(spinnerId);
        
        if (show && !spinner) {
            spinner = document.createElement('div');
            spinner.id = spinnerId;
            spinner.className = 'loading-spinner';
            container.appendChild(spinner);
        } else if (!show && spinner) {
            spinner.parentNode.removeChild(spinner);
        }
    }
    
    /**
     * Animate element appearance
     * @param {HTMLElement} element - Element to animate
     * @param {string} animation - Animation type (fade-in, slide-down)
     */
    function animateIn(element, animation = 'fade-in') {
        element.style.display = 'block';
        element.classList.add(animation);
        
        setTimeout(() => {
            element.classList.remove(animation);
        }, config.animationDuration);
    }
    
    /**
     * Smoothly scroll to an element
     * @param {HTMLElement} element - Element to scroll to
     * @param {Object} options - Scroll options
     */
    function scrollToElement(element, options = {}) {
        const offset = options.offset || 0;
        const behavior = options.behavior || 'smooth';
        
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: behavior
        });
    }
    
    /**
     * Show confirmation dialog
     * @param {Object} options - Confirmation options
     * @returns {Promise} - Resolves with boolean
     */
    function showConfirmation(options = {}) {
        return new Promise((resolve) => {
            const modalId = showModal({
                title: options.title || 'Confirm Action',
                content: options.message || 'Are you sure?',
                buttons: [
                    {
                        text: options.confirmText || 'Confirm',
                        className: 'btn btn-primary',
                        onClick: () => resolve(true)
                    },
                    {
                        text: options.cancelText || 'Cancel',
                        className: 'btn btn-secondary',
                        onClick: () => resolve(false)
                    }
                ],
                closeOnOverlay: false,
                closeOnEscape: false
            });
        });
    }
    
    // Public API
    return {
        showToast,
        showError: (message, options) => showToast(message, 'error', options),
        showSuccess: (message, options) => showToast(message, 'success', options),
        showWarning: (message, options) => showToast(message, 'warning', options),
        showInfo: (message, options) => showToast(message, 'info', options),
        showModal,
        hideModal,
        showFieldFeedback,
        clearFieldFeedback,
        highlightElement,
        toggleLoadingSpinner,
        animateIn,
        scrollToElement,
        showConfirmation,
        clearAllToasts: () => activeToasts.forEach(removeToast),
        closeAllModals: () => activeModals.forEach((_, id) => hideModal(id))
    };
})();

// Export for module usage if supported
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = enhancedDisplay;
} else {
    window.enhancedDisplay = enhancedDisplay;
}