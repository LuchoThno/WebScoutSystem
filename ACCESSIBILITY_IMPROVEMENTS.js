/**
 * Accessibility Improvements Implementation
 * WCAG 2.1 AA compliance enhancements for the Scout Group Management System
 */

// 1. Focus Management System
class FocusManager {
    constructor() {
        this.focusStack = [];
        this.trapStack = [];
        this.lastFocusedElement = null;
        
        this.init();
    }
    
    init() {
        // Track focus changes
        document.addEventListener('focusin', (e) => {
            this.lastFocusedElement = e.target;
        });
        
        // Handle escape key for focus traps
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.trapStack.length > 0) {
                this.releaseTrap();
            }
        });
    }
    
    // Save current focus and set new focus
    saveFocus(newFocusElement) {
        this.focusStack.push(document.activeElement);
        if (newFocusElement) {
            this.setFocus(newFocusElement);
        }
    }
    
    // Restore previous focus
    restoreFocus() {
        const previousElement = this.focusStack.pop();
        if (previousElement && typeof previousElement.focus === 'function') {
            this.setFocus(previousElement);
        }
    }
    
    // Set focus with error handling
    setFocus(element) {
        if (!element) return;
        
        try {
            // Make element focusable if it isn't already
            if (element.tabIndex < 0) {
                element.tabIndex = -1;
            }
            
            element.focus();
            
            // Scroll into view if needed
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        } catch (error) {
            console.warn('Focus setting failed:', error);
        }
    }
    
    // Create focus trap for modals/dialogs
    trapFocus(container) {
        const focusableElements = this.getFocusableElements(container);
        
        if (focusableElements.length === 0) {
            console.warn('No focusable elements found in container');
            return;
        }
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        const trapHandler = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };
        
        container.addEventListener('keydown', trapHandler);
        
        this.trapStack.push({
            container,
            handler: trapHandler,
            previousFocus: document.activeElement
        });
        
        // Set initial focus
        firstElement.focus();
    }
    
    // Release focus trap
    releaseTrap() {
        const trap = this.trapStack.pop();
        if (trap) {
            trap.container.removeEventListener('keydown', trap.handler);
            if (trap.previousFocus && typeof trap.previousFocus.focus === 'function') {
                trap.previousFocus.focus();
            }
        }
    }
    
    // Get all focusable elements in container
    getFocusableElements(container) {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');
        
        return Array.from(container.querySelectorAll(focusableSelectors))
            .filter(element => {
                return element.offsetWidth > 0 && 
                       element.offsetHeight > 0 && 
                       !element.hidden;
            });
    }
}

// 2. Screen Reader Announcements
class ScreenReaderAnnouncer {
    constructor() {
        this.liveRegions = {
            polite: null,
            assertive: null
        };
        
        this.createLiveRegions();
    }
    
    createLiveRegions() {
        // Polite announcements
        this.liveRegions.polite = document.createElement('div');
        this.liveRegions.polite.setAttribute('aria-live', 'polite');
        this.liveRegions.polite.setAttribute('aria-atomic', 'true');
        this.liveRegions.polite.className = 'sr-only';
        
        // Assertive announcements
        this.liveRegions.assertive = document.createElement('div');
        this.liveRegions.assertive.setAttribute('aria-live', 'assertive');
        this.liveRegions.assertive.setAttribute('aria-atomic', 'true');
        this.liveRegions.assertive.className = 'sr-only';
        
        document.body.appendChild(this.liveRegions.polite);
        document.body.appendChild(this.liveRegions.assertive);
    }
    
    announce(message, priority = 'polite') {
        const region = this.liveRegions[priority];
        if (region) {
            // Clear first to ensure announcement
            region.textContent = '';
            
            // Use setTimeout to ensure the clear is processed
            setTimeout(() => {
                region.textContent = message;
            }, 100);
        }
    }
    
    announcePageChange(pageTitle) {
        this.announce(`Navegando a ${pageTitle}`, 'polite');
    }
    
    announceFormError(errors) {
        const errorCount = Array.isArray(errors) ? errors.length : 1;
        const message = `Se encontraron ${errorCount} errores en el formulario. Por favor, revise los campos marcados.`;
        this.announce(message, 'assertive');
    }
    
    announceSuccess(action) {
        this.announce(`${action} completado exitosamente`, 'polite');
    }
    
    announceLoading(isLoading, context = '') {
        const message = isLoading 
            ? `Cargando ${context}...` 
            : `${context} cargado`;
        this.announce(message, 'polite');
    }
}

// 3. Keyboard Navigation Enhancement
class KeyboardNavigationManager {
    constructor() {
        this.skipLinks = [];
        this.roving = new Map();
        
        this.init();
    }
    
    init() {
        this.createSkipLinks();
        this.enhanceTabNavigation();
        this.setupRovingTabindex();
    }
    
    createSkipLinks() {
        const skipLinksContainer = document.createElement('div');
        skipLinksContainer.className = 'skip-links';
        
        const skipLinks = [
            { href: '#main-content', text: 'Saltar al contenido principal' },
            { href: '#navigation', text: 'Saltar a la navegación' },
            { href: '#search', text: 'Saltar a la búsqueda' }
        ];
        
        skipLinks.forEach(link => {
            const skipLink = document.createElement('a');
            skipLink.href = link.href;
            skipLink.textContent = link.text;
            skipLink.className = 'skip-link';
            skipLinksContainer.appendChild(skipLink);
        });
        
        document.body.insertBefore(skipLinksContainer, document.body.firstChild);
    }
    
    enhanceTabNavigation() {
        // Add visible focus indicators
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }
    
    setupRovingTabindex(container, items) {
        if (!container || !items) return;
        
        const itemElements = Array.from(container.querySelectorAll(items));
        let currentIndex = 0;
        
        // Set initial tabindex
        itemElements.forEach((item, index) => {
            item.tabIndex = index === 0 ? 0 : -1;
        });
        
        const moveToItem = (index) => {
            itemElements[currentIndex].tabIndex = -1;
            currentIndex = index;
            itemElements[currentIndex].tabIndex = 0;
            itemElements[currentIndex].focus();
        };
        
        container.addEventListener('keydown', (e) => {
            let newIndex = currentIndex;
            
            switch (e.key) {
                case 'ArrowDown':
                case 'ArrowRight':
                    e.preventDefault();
                    newIndex = (currentIndex + 1) % itemElements.length;
                    break;
                case 'ArrowUp':
                case 'ArrowLeft':
                    e.preventDefault();
                    newIndex = currentIndex === 0 ? itemElements.length - 1 : currentIndex - 1;
                    break;
                case 'Home':
                    e.preventDefault();
                    newIndex = 0;
                    break;
                case 'End':
                    e.preventDefault();
                    newIndex = itemElements.length - 1;
                    break;
                default:
                    return;
            }
            
            moveToItem(newIndex);
        });
        
        this.roving.set(container, { items: itemElements, currentIndex });
    }
}

// 4. Color Contrast Checker
class ColorContrastChecker {
    constructor() {
        this.wcagLevels = {
            AA: { normal: 4.5, large: 3 },
            AAA: { normal: 7, large: 4.5 }
        };
    }
    
    // Calculate relative luminance
    getLuminance(r, g, b) {
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }
    
    // Calculate contrast ratio
    getContrastRatio(color1, color2) {
        const lum1 = this.getLuminance(...color1);
        const lum2 = this.getLuminance(...color2);
        
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        
        return (brightest + 0.05) / (darkest + 0.05);
    }
    
    // Parse color string to RGB
    parseColor(colorString) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = colorString;
        ctx.fillRect(0, 0, 1, 1);
        
        const imageData = ctx.getImageData(0, 0, 1, 1);
        return [imageData.data[0], imageData.data[1], imageData.data[2]];
    }
    
    // Check if contrast meets WCAG standards
    checkContrast(foreground, background, level = 'AA', isLarge = false) {
        const fgColor = this.parseColor(foreground);
        const bgColor = this.parseColor(background);
        
        const ratio = this.getContrastRatio(fgColor, bgColor);
        const required = this.wcagLevels[level][isLarge ? 'large' : 'normal'];
        
        return {
            ratio: ratio.toFixed(2),
            required: required,
            passes: ratio >= required,
            level: level
        };
    }
    
    // Audit page for contrast issues
    auditPageContrast() {
        const issues = [];
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label');
        
        textElements.forEach(element => {
            const styles = getComputedStyle(element);
            const color = styles.color;
            const backgroundColor = styles.backgroundColor;
            
            if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
                return; // Skip transparent backgrounds
            }
            
            const fontSize = parseFloat(styles.fontSize);
            const fontWeight = styles.fontWeight;
            const isLarge = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || fontWeight >= 700));
            
            const result = this.checkContrast(color, backgroundColor, 'AA', isLarge);
            
            if (!result.passes) {
                issues.push({
                    element: element,
                    selector: this.getSelector(element),
                    color: color,
                    backgroundColor: backgroundColor,
                    ratio: result.ratio,
                    required: result.required,
                    isLarge: isLarge
                });
            }
        });
        
        return issues;
    }
    
    getSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return element.tagName.toLowerCase();
    }
}

// 5. Form Accessibility Enhancer
class FormAccessibilityEnhancer {
    constructor() {
        this.init();
    }
    
    init() {
        this.enhanceAllForms();
        this.setupLiveValidation();
    }
    
    enhanceAllForms() {
        document.querySelectorAll('form').forEach(form => {
            this.enhanceForm(form);
        });
    }
    
    enhanceForm(form) {
        // Add form role if missing
        if (!form.getAttribute('role')) {
            form.setAttribute('role', 'form');
        }
        
        // Enhance form fields
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => this.enhanceField(field));
        
        // Add error summary container
        this.addErrorSummary(form);
        
        // Enhance submit button
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn && !submitBtn.getAttribute('aria-describedby')) {
            this.enhanceSubmitButton(submitBtn, form);
        }
    }
    
    enhanceField(field) {
        const label = this.findLabel(field);
        const fieldContainer = field.closest('.form-group') || field.parentElement;
        
        // Ensure proper labeling
        if (label && !field.getAttribute('aria-labelledby')) {
            if (!label.id) {
                label.id = `label-${field.name || field.id || Math.random().toString(36).substr(2, 9)}`;
            }
            field.setAttribute('aria-labelledby', label.id);
        }
        
        // Add required indicator
        if (field.required && label) {
            this.addRequiredIndicator(label);
        }
        
        // Add error container
        this.addErrorContainer(field, fieldContainer);
        
        // Add help text support
        this.addHelpTextSupport(field, fieldContainer);
    }
    
    findLabel(field) {
        // Look for associated label
        if (field.id) {
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label) return label;
        }
        
        // Look for parent label
        const parentLabel = field.closest('label');
        if (parentLabel) return parentLabel;
        
        // Look for sibling label
        const siblingLabel = field.parentElement.querySelector('label');
        if (siblingLabel) return siblingLabel;
        
        return null;
    }
    
    addRequiredIndicator(label) {
        if (!label.querySelector('.required-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'required-indicator';
            indicator.textContent = ' *';
            indicator.setAttribute('aria-label', 'requerido');
            label.appendChild(indicator);
        }
    }
    
    addErrorContainer(field, container) {
        const errorId = `error-${field.name || field.id || Math.random().toString(36).substr(2, 9)}`;
        
        if (!container.querySelector(`#${errorId}`)) {
            const errorContainer = document.createElement('div');
            errorContainer.id = errorId;
            errorContainer.className = 'field-error';
            errorContainer.setAttribute('role', 'alert');
            errorContainer.setAttribute('aria-live', 'polite');
            container.appendChild(errorContainer);
            
            field.setAttribute('aria-describedby', errorId);
        }
    }
    
    addHelpTextSupport(field, container) {
        const helpText = container.querySelector('.help-text, .field-help');
        if (helpText && !helpText.id) {
            const helpId = `help-${field.name || field.id || Math.random().toString(36).substr(2, 9)}`;
            helpText.id = helpId;
            
            const describedBy = field.getAttribute('aria-describedby');
            field.setAttribute('aria-describedby', describedBy ? `${describedBy} ${helpId}` : helpId);
        }
    }
    
    addErrorSummary(form) {
        if (!form.querySelector('.error-summary')) {
            const summary = document.createElement('div');
            summary.className = 'error-summary';
            summary.setAttribute('role', 'alert');
            summary.setAttribute('aria-live', 'assertive');
            summary.style.display = 'none';
            form.insertBefore(summary, form.firstChild);
        }
    }
    
    enhanceSubmitButton(button, form) {
        const formName = form.getAttribute('name') || form.id || 'formulario';
        button.setAttribute('aria-describedby', `${formName}-status`);
        
        const statusElement = document.createElement('span');
        statusElement.id = `${formName}-status`;
        statusElement.className = 'sr-only';
        statusElement.setAttribute('aria-live', 'polite');
        button.parentElement.appendChild(statusElement);
    }
    
    setupLiveValidation() {
        document.addEventListener('blur', (e) => {
            if (e.target.matches('input, select, textarea')) {
                this.validateField(e.target);
            }
        }, true);
        
        document.addEventListener('submit', (e) => {
            this.validateForm(e.target);
        });
    }
    
    validateField(field) {
        const errorContainer = document.querySelector(`#error-${field.name || field.id}`);
        if (!errorContainer) return;
        
        let errorMessage = '';
        
        if (field.required && !field.value.trim()) {
            errorMessage = 'Este campo es requerido';
        } else if (field.type === 'email' && field.value && !this.isValidEmail(field.value)) {
            errorMessage = 'Por favor ingrese un email válido';
        }
        
        if (errorMessage) {
            errorContainer.textContent = errorMessage;
            errorContainer.style.display = 'block';
            field.setAttribute('aria-invalid', 'true');
        } else {
            errorContainer.textContent = '';
            errorContainer.style.display = 'none';
            field.setAttribute('aria-invalid', 'false');
        }
    }
    
    validateForm(form) {
        const errors = [];
        const fields = form.querySelectorAll('input, select, textarea');
        
        fields.forEach(field => {
            this.validateField(field);
            const errorContainer = document.querySelector(`#error-${field.name || field.id}`);
            if (errorContainer && errorContainer.textContent) {
                errors.push({
                    field: field,
                    message: errorContainer.textContent
                });
            }
        });
        
        this.updateErrorSummary(form, errors);
        
        if (errors.length > 0) {
            this.focusFirstError(errors);
        }
    }
    
    updateErrorSummary(form, errors) {
        const summary = form.querySelector('.error-summary');
        if (!summary) return;
        
        if (errors.length > 0) {
            summary.innerHTML = `
                <h3>Se encontraron ${errors.length} errores:</h3>
                <ul>
                    ${errors.map(error => `
                        <li>
                            <a href="#${error.field.id || error.field.name}">
                                ${error.message}
                            </a>
                        </li>
                    `).join('')}
                </ul>
            `;
            summary.style.display = 'block';
        } else {
            summary.style.display = 'none';
        }
    }
    
    focusFirstError(errors) {
        if (errors.length > 0) {
            errors[0].field.focus();
        }
    }
    
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}

// Initialize accessibility features
document.addEventListener('DOMContentLoaded', () => {
    // Initialize accessibility managers
    window.focusManager = new FocusManager();
    window.screenReader = new ScreenReaderAnnouncer();
    window.keyboardNav = new KeyboardNavigationManager();
    window.contrastChecker = new ColorContrastChecker();
    window.formA11y = new FormAccessibilityEnhancer();
    
    // Add accessibility CSS
    const a11yStyles = document.createElement('style');
    a11yStyles.textContent = `
        .sr-only {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            white-space: nowrap !important;
            border: 0 !important;
        }
        
        .skip-links {
            position: absolute;
            top: -40px;
            left: 6px;
            z-index: 1000;
        }
        
        .skip-link {
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--color-primary);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            transition: top 0.3s;
        }
        
        .skip-link:focus {
            top: 6px;
        }
        
        .keyboard-navigation *:focus {
            outline: 2px solid var(--color-accent) !important;
            outline-offset: 2px !important;
        }
        
        .required-indicator {
            color: var(--color-error);
            font-weight: bold;
        }
        
        .field-error {
            color: var(--color-error);
            font-size: 0.875rem;
            margin-top: 0.25rem;
            display: none;
        }
        
        .error-summary {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
        }
        
        .error-summary h3 {
            margin: 0 0 0.5rem 0;
            font-size: 1rem;
        }
        
        .error-summary ul {
            margin: 0;
            padding-left: 1.5rem;
        }
        
        .error-summary a {
            color: #721c24;
            text-decoration: underline;
        }
        
        @media (prefers-reduced-motion: reduce) {
            .skip-link {
                transition: none;
            }
        }
        
        @media (prefers-contrast: high) {
            .skip-link:focus,
            .keyboard-navigation *:focus {
                outline: 3px solid currentColor !important;
                outline-offset: 2px !important;
            }
        }
    `;
    document.head.appendChild(a11yStyles);
    
    // Run contrast audit in development
    if (window.location.hostname === 'localhost') {
        setTimeout(() => {
            const issues = window.contrastChecker.auditPageContrast();
            if (issues.length > 0) {
                console.warn('Contrast issues found:', issues);
            }
        }, 1000);
    }
    
    // Announce page loads
    window.screenReader.announcePageChange(document.title);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FocusManager,
        ScreenReaderAnnouncer,
        KeyboardNavigationManager,
        ColorContrastChecker,
        FormAccessibilityEnhancer
    };
}