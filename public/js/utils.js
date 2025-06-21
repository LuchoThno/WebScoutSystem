// Utility functions for the application
const utils = {
    formatDate: (date) => {
        try {
            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            return new Date(date).toLocaleDateString('es-ES', options);
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Fecha inválida';
        }
    },

    validateForm: (formData, rules) => {
        const errors = {};
        
        for (const [field, value] of formData.entries()) {
            if (rules[field]) {
                if (rules[field].required && !value.trim()) {
                    errors[field] = `El campo ${field} es requerido`;
                }
                if (rules[field].minLength && value.length < rules[field].minLength) {
                    errors[field] = `El campo ${field} debe tener al menos ${rules[field].minLength} caracteres`;
                }
                if (rules[field].maxLength && value.length > rules[field].maxLength) {
                    errors[field] = `El campo ${field} debe tener máximo ${rules[field].maxLength} caracteres`;
                }
                if (rules[field].email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    errors[field] = 'El correo electrónico no es válido';
                }
                if (rules[field].phone && !/^\+?[\d\s-]{8,}$/.test(value)) {
                    errors[field] = 'El número de teléfono no es válido';
                }
            }
        }

        return Object.keys(errors).length === 0 ? null : errors;
    },

    showAlert: (message, type = 'success') => {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.setAttribute('role', 'alert');
        alert.setAttribute('aria-live', 'polite');

        const container = document.querySelector('main') || document.body;
        container.insertAdjacentElement('afterbegin', alert);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    },

    createImagePreview: (file, previewElement) => {
        if (!file || !previewElement) {
            if (previewElement) {
                previewElement.style.display = 'none';
            }
            return;
        }

        if (!file.type.startsWith('image/')) {
            utils.showAlert('Por favor selecciona una imagen válida', 'error');
            return;
        }

        // Check file size (5MB limit)
        if (!utils.validateFileSize(file, 5)) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewElement.src = e.target.result;
            previewElement.style.display = 'block';
        };
        reader.onerror = () => {
            utils.showAlert('Error al cargar la imagen', 'error');
        };
        reader.readAsDataURL(file);
    },

    validateFileSize: (file, maxSizeMB = 5) => {
        if (!file) return false;
        
        const maxSize = maxSizeMB * 1024 * 1024;
        if (file.size > maxSize) {
            utils.showAlert(`El archivo debe ser menor a ${maxSizeMB}MB`, 'error');
            return false;
        }
        return true;
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    isAdmin: () => {
        return window.storage && window.storage.get('adminLoggedIn') === true;
    },

    sanitizeInput: (input) => {
        if (typeof input !== 'string') return input;
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    generateId: () => {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    },

    formatCurrency: (amount, currency = 'CLP') => {
        try {
            return new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: currency,
                maximumFractionDigits: 0
            }).format(amount);
        } catch (error) {
            console.error('Error formatting currency:', error);
            return `$${amount.toFixed(0)}`;
        }
    },

    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    validatePhone: (phone) => {
        const phoneRegex = /^\+?[\d\s-]{8,}$/;
        return phoneRegex.test(phone);
    },

    escapeHtml: (text) => {
        if (!text) return '';
        const map = {
            '&': '&',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, (m) => map[m]);
    },

    copyToClipboard: async (text) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                utils.showAlert('Copiado al portapapeles', 'success');
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
                utils.showAlert('Copiado al portapapeles', 'success');
            }
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            utils.showAlert('Error al copiar al portapapeles', 'error');
        }
    }
};

// Make available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.utils = utils;
}

export default utils