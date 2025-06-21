/**
 * Security Fixes Implementation
 * Priority security improvements for the Scout Group Management System
 */

// 1. Input Sanitization Utility
class SecurityUtils {
    static sanitizeHTML(input) {
        if (typeof input !== 'string') return input;
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
    
    static sanitizeForAttribute(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/[<>'"&]/g, (char) => {
                const entities = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;',
                    '&': '&amp;'
                };
                return entities[char];
            });
    }
    
    static validateInput(input, type) {
        const patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^\+?[\d\s-()]{8,}$/,
            name: /^[a-zA-ZÀ-ÿ\s]{2,50}$/,
            alphanumeric: /^[a-zA-Z0-9\s]{1,100}$/
        };
        
        return patterns[type] ? patterns[type].test(input) : true;
    }
    
    static generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    static validateCSRFToken(token, storedToken) {
        return token === storedToken && token.length === 64;
    }
}

// 2. Secure Storage Implementation
class SecureStorage {
    constructor(prefix = 'scout_app_') {
        this.prefix = prefix;
        this.encryptionKey = this.getOrCreateKey();
    }
    
    getOrCreateKey() {
        let key = sessionStorage.getItem('app_key');
        if (!key) {
            key = SecurityUtils.generateCSRFToken();
            sessionStorage.setItem('app_key', key);
        }
        return key;
    }
    
    async encrypt(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        const keyBuffer = encoder.encode(this.encryptionKey);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBuffer.slice(0, 32),
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );
        
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            dataBuffer
        );
        
        return {
            data: Array.from(new Uint8Array(encrypted)),
            iv: Array.from(iv)
        };
    }
    
    async decrypt(encryptedData) {
        try {
            const encoder = new TextEncoder();
            const keyBuffer = encoder.encode(this.encryptionKey);
            
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyBuffer.slice(0, 32),
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );
            
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
                cryptoKey,
                new Uint8Array(encryptedData.data)
            );
            
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }
    
    async setSecure(key, value) {
        try {
            const encrypted = await this.encrypt(value);
            localStorage.setItem(this.prefix + key, JSON.stringify(encrypted));
            return true;
        } catch (error) {
            console.error('Secure storage failed:', error);
            return false;
        }
    }
    
    async getSecure(key) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            if (!item) return null;
            
            const encrypted = JSON.parse(item);
            return await this.decrypt(encrypted);
        } catch (error) {
            console.error('Secure retrieval failed:', error);
            return null;
        }
    }
    
    // Non-sensitive data can still use regular storage
    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage failed:', error);
            return false;
        }
    }
    
    get(key) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Retrieval failed:', error);
            return null;
        }
    }
}

// 3. Form Security Enhancement
class SecureFormHandler {
    constructor() {
        this.csrfTokens = new Map();
        this.rateLimiter = new Map();
    }
    
    addCSRFProtection(form) {
        const token = SecurityUtils.generateCSRFToken();
        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = 'csrf_token';
        tokenInput.value = token;
        form.appendChild(tokenInput);
        
        this.csrfTokens.set(form.id, token);
        return token;
    }
    
    validateCSRF(formId, submittedToken) {
        const storedToken = this.csrfTokens.get(formId);
        return SecurityUtils.validateCSRFToken(submittedToken, storedToken);
    }
    
    checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) {
        const now = Date.now();
        const userRequests = this.rateLimiter.get(identifier) || [];
        
        // Remove old requests outside the window
        const validRequests = userRequests.filter(time => now - time < windowMs);
        
        if (validRequests.length >= maxRequests) {
            return false; // Rate limit exceeded
        }
        
        validRequests.push(now);
        this.rateLimiter.set(identifier, validRequests);
        return true;
    }
    
    sanitizeFormData(formData) {
        const sanitized = new FormData();
        
        for (const [key, value] of formData.entries()) {
            if (typeof value === 'string') {
                sanitized.append(key, SecurityUtils.sanitizeHTML(value));
            } else {
                sanitized.append(key, value);
            }
        }
        
        return sanitized;
    }
    
    validateFormData(formData, rules) {
        const errors = {};
        
        for (const [field, value] of formData.entries()) {
            const rule = rules[field];
            if (!rule) continue;
            
            // Required validation
            if (rule.required && (!value || value.toString().trim() === '')) {
                errors[field] = `${field} is required`;
                continue;
            }
            
            // Type validation
            if (rule.type && !SecurityUtils.validateInput(value, rule.type)) {
                errors[field] = `${field} format is invalid`;
                continue;
            }
            
            // Length validation
            if (rule.minLength && value.length < rule.minLength) {
                errors[field] = `${field} must be at least ${rule.minLength} characters`;
                continue;
            }
            
            if (rule.maxLength && value.length > rule.maxLength) {
                errors[field] = `${field} must not exceed ${rule.maxLength} characters`;
                continue;
            }
            
            // Custom validation
            if (rule.custom && !rule.custom(value)) {
                errors[field] = rule.customMessage || `${field} is invalid`;
            }
        }
        
        return Object.keys(errors).length > 0 ? errors : null;
    }
}

// 4. Content Security Policy Helper
class CSPHelper {
    static generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array));
    }
    
    static addNonceToScripts() {
        const nonce = this.generateNonce();
        const scripts = document.querySelectorAll('script:not([src])');
        
        scripts.forEach(script => {
            script.setAttribute('nonce', nonce);
        });
        
        return nonce;
    }
    
    static createCSPMeta(nonce) {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = `
            default-src 'self';
            script-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com;
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
            font-src 'self' https://fonts.gstatic.com;
            img-src 'self' data: https:;
            connect-src 'self';
            frame-ancestors 'none';
            base-uri 'self';
            form-action 'self';
        `.replace(/\s+/g, ' ').trim();
        
        document.head.appendChild(meta);
    }
}

// 5. Session Management
class SessionManager {
    constructor() {
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.warningTime = 5 * 60 * 1000; // 5 minutes before timeout
        this.checkInterval = 60 * 1000; // Check every minute
        
        this.startSessionMonitoring();
    }
    
    startSessionMonitoring() {
        this.updateLastActivity();
        
        // Update activity on user interactions
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, () => {
                this.updateLastActivity();
            }, { passive: true });
        });
        
        // Check session status periodically
        setInterval(() => {
            this.checkSession();
        }, this.checkInterval);
    }
    
    updateLastActivity() {
        sessionStorage.setItem('lastActivity', Date.now().toString());
    }
    
    getLastActivity() {
        const lastActivity = sessionStorage.getItem('lastActivity');
        return lastActivity ? parseInt(lastActivity) : Date.now();
    }
    
    checkSession() {
        const lastActivity = this.getLastActivity();
        const now = Date.now();
        const timeSinceActivity = now - lastActivity;
        
        if (timeSinceActivity > this.sessionTimeout) {
            this.expireSession();
        } else if (timeSinceActivity > (this.sessionTimeout - this.warningTime)) {
            this.showSessionWarning();
        }
    }
    
    showSessionWarning() {
        if (document.querySelector('.session-warning')) return;
        
        const warning = document.createElement('div');
        warning.className = 'session-warning alert alert-warning';
        warning.innerHTML = `
            <p>Su sesión expirará pronto. ¿Desea continuar?</p>
            <button onclick="sessionManager.extendSession()" class="btn btn-primary">
                Continuar Sesión
            </button>
        `;
        
        document.body.appendChild(warning);
    }
    
    extendSession() {
        this.updateLastActivity();
        const warning = document.querySelector('.session-warning');
        if (warning) warning.remove();
    }
    
    expireSession() {
        // Clear sensitive data
        sessionStorage.clear();
        localStorage.removeItem('scout_app_adminLoggedIn');
        localStorage.removeItem('scout_app_currentUser');
        
        // Redirect to login
        if (window.location.pathname.includes('/admin/')) {
            window.location.href = '/pages/admin/login.html';
        }
    }
}

// Initialize security features
document.addEventListener('DOMContentLoaded', () => {
    // Initialize secure storage
    window.secureStorage = new SecureStorage();
    
    // Initialize form security
    window.secureFormHandler = new SecureFormHandler();
    
    // Initialize session management for admin pages
    if (window.location.pathname.includes('/admin/')) {
        window.sessionManager = new SessionManager();
    }
    
    // Add CSRF protection to all forms
    document.querySelectorAll('form').forEach(form => {
        if (!form.querySelector('input[name="csrf_token"]')) {
            window.secureFormHandler.addCSRFProtection(form);
        }
    });
    
    // Set up CSP
    const nonce = CSPHelper.addNonceToScripts();
    CSPHelper.createCSPMeta(nonce);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SecurityUtils,
        SecureStorage,
        SecureFormHandler,
        CSPHelper,
        SessionManager
    };
}