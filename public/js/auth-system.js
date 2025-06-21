/**
 * Authentication and Authorization System
 * Handles user authentication, session management, and permission checking
 */

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.permissions = new Map();
        this.sessionCheckInterval = null;
        
        this.init();
    }

    init() {
        this.loadCurrentUser();
        this.startSessionMonitoring();
        this.setupGlobalPermissionChecks();
    }

    loadCurrentUser() {
        const userData = storage.get('currentUser');
        const isLoggedIn = storage.get('adminLoggedIn');
        
        if (userData && isLoggedIn) {
            this.currentUser = userData;
            this.loadUserPermissions();
        }
    }

    loadUserPermissions() {
        if (!this.currentUser) return;

        const systemUsers = storage.get('systemUsers') || [];
        const user = systemUsers.find(u => u.username === this.currentUser.username);
        
        if (user) {
            this.permissions.clear();
            user.permissions.forEach(permission => {
                this.permissions.set(permission, true);
            });
        }
    }

    login(username, password) {
        const users = storage.get('users') || [];
        const systemUsers = storage.get('systemUsers') || [];
        
        // Check in both user stores
        let user = users.find(u => u.username === username && u.password === password);
        let systemUser = systemUsers.find(u => u.username === username && u.password === password);
        
        if (user || systemUser) {
            const userData = systemUser || user;
            
            // Check if user is active
            if (systemUser && systemUser.status !== 'active') {
                throw new Error('Usuario inactivo o suspendido');
            }

            // Check if password needs to be changed
            if (systemUser && systemUser.forcePasswordChange) {
                return {
                    success: true,
                    forcePasswordChange: true,
                    user: userData
                };
            }

            // Successful login
            this.currentUser = {
                username: userData.username,
                role: userData.role || 'admin',
                name: userData.name || userData.username,
                permissions: userData.permissions || []
            };

            storage.set('adminLoggedIn', true);
            storage.set('currentUser', this.currentUser);
            
            // Update last login
            if (systemUser) {
                systemUser.lastLogin = new Date().toISOString();
                storage.set('systemUsers', systemUsers);
            }

            this.loadUserPermissions();
            this.logAction('login', 'auth', 'Usuario inició sesión');
            
            return {
                success: true,
                forcePasswordChange: false,
                user: this.currentUser
            };
        }

        throw new Error('Credenciales inválidas');
    }

    logout() {
        if (this.currentUser) {
            this.logAction('logout', 'auth', 'Usuario cerró sesión');
        }

        this.currentUser = null;
        this.permissions.clear();
        
        storage.remove('adminLoggedIn');
        storage.remove('currentUser');
        
        this.stopSessionMonitoring();
    }

    changePassword(currentPassword, newPassword) {
        if (!this.currentUser) {
            throw new Error('No hay usuario autenticado');
        }

        const systemUsers = storage.get('systemUsers') || [];
        const user = systemUsers.find(u => u.username === this.currentUser.username);
        
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        if (user.password !== currentPassword) {
            throw new Error('Contraseña actual incorrecta');
        }

        if (!this.validatePassword(newPassword)) {
            throw new Error('La nueva contraseña no cumple con los requisitos de seguridad');
        }

        user.password = newPassword; // In production, hash this
        user.forcePasswordChange = false;
        user.passwordChangedAt = new Date().toISOString();
        
        storage.set('systemUsers', systemUsers);
        this.logAction('change_password', 'auth', 'Usuario cambió su contraseña');
        
        return true;
    }

    validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
    }

    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        // Super admin has all permissions
        if (this.currentUser.role === 'super-admin') return true;
        
        return this.permissions.has(permission);
    }

    hasAnyPermission(permissions) {
        return permissions.some(permission => this.hasPermission(permission));
    }

    hasAllPermissions(permissions) {
        return permissions.every(permission => this.hasPermission(permission));
    }

    canAccessModule(module) {
        const modulePermissions = {
            'dashboard': ['dashboard.view'],
            'members': ['members.view'],
            'planning': ['planning.view'],
            'resources': ['resources.view'],
            'finance': ['finance.view'],
            'leaders': ['leaders.view'],
            'admin': ['admin.users', 'admin.system']
        };

        const requiredPermissions = modulePermissions[module];
        if (!requiredPermissions) return false;

        return this.hasAnyPermission(requiredPermissions);
    }

    canPerformAction(module, action) {
        const permission = `${module}.${action}`;
        return this.hasPermission(permission);
    }

    startSessionMonitoring() {
        this.updateLastActivity();
        
        // Update activity on user interactions
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, () => {
                this.updateLastActivity();
            }, { passive: true });
        });
        
        // Check session status every minute
        this.sessionCheckInterval = setInterval(() => {
            this.checkSession();
        }, 60000);
    }

    stopSessionMonitoring() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }

    updateLastActivity() {
        if (this.currentUser) {
            sessionStorage.setItem('lastActivity', Date.now().toString());
        }
    }

    getLastActivity() {
        const lastActivity = sessionStorage.getItem('lastActivity');
        return lastActivity ? parseInt(lastActivity) : Date.now();
    }

    checkSession() {
        if (!this.currentUser) return;

        const lastActivity = this.getLastActivity();
        const now = Date.now();
        const timeSinceActivity = now - lastActivity;
        
        if (timeSinceActivity > this.sessionTimeout) {
            this.expireSession();
        } else if (timeSinceActivity > (this.sessionTimeout - 5 * 60 * 1000)) {
            this.showSessionWarning();
        }
    }

    showSessionWarning() {
        if (document.querySelector('.session-warning')) return;
        
        const warning = document.createElement('div');
        warning.className = 'session-warning alert alert-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 300px;
            padding: 1rem;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        warning.innerHTML = `
            <p><strong>⚠️ Sesión por expirar</strong></p>
            <p>Su sesión expirará en 5 minutos. ¿Desea continuar?</p>
            <div style="margin-top: 10px;">
                <button onclick="authSystem.extendSession()" class="btn btn-primary btn-sm">
                    Continuar Sesión
                </button>
                <button onclick="authSystem.logout(); window.location.href='/pages/admin/login.html'" class="btn btn-secondary btn-sm">
                    Cerrar Sesión
                </button>
            </div>
        `;
        
        document.body.appendChild(warning);
    }

    extendSession() {
        this.updateLastActivity();
        const warning = document.querySelector('.session-warning');
        if (warning) warning.remove();
        
        utils.showAlert('Sesión extendida', 'success');
    }

    expireSession() {
        utils.showAlert('Su sesión ha expirado. Será redirigido al login.', 'warning');
        
        setTimeout(() => {
            this.logout();
            window.location.href = '/pages/admin/login.html';
        }, 2000);
    }

    setupGlobalPermissionChecks() {
        // Hide elements based on permissions
        const observer = new MutationObserver(() => {
            this.applyPermissionChecks();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check
        document.addEventListener('DOMContentLoaded', () => {
            this.applyPermissionChecks();
        });
    }

    applyPermissionChecks() {
        if (!this.currentUser) return;

        // Hide elements with data-permission attribute
        document.querySelectorAll('[data-permission]').forEach(element => {
            const requiredPermission = element.dataset.permission;
            if (!this.hasPermission(requiredPermission)) {
                element.style.display = 'none';
            } else {
                element.style.display = '';
            }
        });

        // Hide elements with data-role attribute
        document.querySelectorAll('[data-role]').forEach(element => {
            const requiredRoles = element.dataset.role.split(',');
            if (!requiredRoles.includes(this.currentUser.role)) {
                element.style.display = 'none';
            } else {
                element.style.display = '';
            }
        });

        // Disable buttons based on permissions
        document.querySelectorAll('button[data-action]').forEach(button => {
            const [module, action] = button.dataset.action.split('.');
            if (!this.canPerformAction(module, action)) {
                button.disabled = true;
                button.title = 'No tiene permisos para esta acción';
            }
        });
    }

    logAction(action, type, description) {
        if (!window.userManager) return;

        const logEntry = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            user: this.currentUser ? this.currentUser.username : 'anonymous',
            action: action,
            type: type,
            description: description,
            ip: '127.0.0.1' // In production, get real IP
        };

        const auditLog = storage.get('auditLog') || [];
        auditLog.push(logEntry);
        storage.set('auditLog', auditLog);
    }

    // Utility methods for UI
    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getUserRole() {
        return this.currentUser ? this.currentUser.role : null;
    }

    getUserPermissions() {
        return Array.from(this.permissions.keys());
    }
}

// Initialize global auth system
window.authSystem = new AuthSystem();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}