import utils from '../utils.js';
import storage from '../storage.js';
import supabaseClient from '../supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    
    // Initialize Supabase client
    const supabase = await supabaseClient.init();

    // Check if already logged in
    if (storage.get('adminLoggedIn')) {
        window.location.href = 'dashboard.html';
    }

    // Initialize default admin user if no users exist
    const initializeAdmin = async () => {
        // Check if we have users in Supabase first
        if (supabase) {
            try {
                const { data, error, count } = await supabase
                    .from('system_users')
                    .select('*', { count: 'exact' });
                
                if (!error && count > 0) {
                    // Users exist in Supabase, no need to initialize
                    return;
                }
                
                // Create default admin user in Supabase
                const { error: insertError } = await supabase
                    .from('system_users')
                    .insert([{
                        name: 'Super Admin',
                        email: 'admin@gruposcout.org',
                        username: 'admin',
                        password_hash: 'admin123', // In production, use proper password hashing
                        role: 'super-admin',
                        department: 'administracion',
                        permissions: [
                            'dashboard.view', 'dashboard.stats',
                            'members.view', 'members.create', 'members.edit', 'members.delete',
                            'planning.view', 'planning.create', 'planning.edit',
                            'resources.view', 'resources.manage',
                            'finance.view', 'finance.transactions', 'finance.reports',
                            'leaders.view', 'leaders.manage',
                            'admin.users', 'admin.system'
                        ],
                        status: 'active',
                        created_at: new Date().toISOString(),
                        created_by: 'system'
                    }]);
                
                if (insertError) {
                    console.error('Error creating default admin in Supabase:', insertError);
                } else {
                    console.log('Default admin user created in Supabase');
                }
            } catch (error) {
                console.error('Error checking Supabase users:', error);
            }
        }
        
        // Check localStorage as fallback
        const users = storage.get('users') || [];
        const systemUsers = storage.get('systemUsers') || [];
        
        if (users.length === 0 && systemUsers.length === 0) {
            // Create default admin user in localStorage
            storage.set('systemUsers', [{
                id: Date.now().toString(),
                name: 'Super Admin',
                email: 'admin@gruposcout.org',
                username: 'admin',
                password: 'admin123',
                role: 'super-admin',
                department: 'administracion',
                permissions: [
                    'dashboard.view', 'dashboard.stats',
                    'members.view', 'members.create', 'members.edit', 'members.delete',
                    'planning.view', 'planning.create', 'planning.edit',
                    'resources.view', 'resources.manage',
                    'finance.view', 'finance.transactions', 'finance.reports',
                    'leaders.view', 'leaders.manage',
                    'admin.users', 'admin.system'
                ],
                status: 'active',
                created_at: new Date().toISOString(),
                created_by: 'system'
            }]);
            
            // For backward compatibility
            storage.set('users', [{
                username: 'admin',
                password: 'admin123',
                role: 'admin'
            }]);
            
            console.log('Default admin user created in localStorage');
        }
    };

    await initializeAdmin();

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                // Try to authenticate with Supabase first
                if (supabase) {
                    // In a real implementation, you would use Supabase Auth
                    // For this demo, we'll query the system_users table
                    const { data, error } = await supabase
                        .from('system_users')
                        .select('*')
                        .or(`username.eq.${username},email.eq.${username}`)
                        .eq('password_hash', password); // In production, use proper password verification
                    
                    if (error) {
                        console.error('Supabase query error:', error);
                        // Fall back to localStorage
                        authenticateWithLocalStorage(username, password);
                        return;
                    }
                    
                    if (data && data.length > 0) {
                        const userData = data[0];
                        
                        // Check if user is active
                        if (userData.status !== 'active') {
                            utils.showAlert('Su cuenta está inactiva o suspendida. Contacte al administrador.', 'error');
                            return;
                        }
                        
                        // Check if password needs to be changed
                        if (userData.force_password_change) {
                            // Store minimal info for password change
                            sessionStorage.setItem('passwordChangeRequired', 'true');
                            sessionStorage.setItem('passwordChangeUser', JSON.stringify({
                                id: userData.id,
                                username: userData.username,
                                email: userData.email
                            }));
                            
                            // Redirect to password change page
                            window.location.href = 'change-password.html';
                            return;
                        }
                        
                        // Update last login
                        await supabase
                            .from('system_users')
                            .update({ last_login: new Date().toISOString() })
                            .eq('id', userData.id);
                        
                        // Log to audit log
                        await supabase
                            .from('audit_log')
                            .insert([{
                                timestamp: new Date().toISOString(),
                                user_name: userData.username,
                                action: 'login',
                                type: 'auth',
                                description: `Usuario ${userData.username} inició sesión`,
                                ip: '127.0.0.1' // In production, get real IP
                            }]);
                        
                        // Set session
                        storage.set('adminLoggedIn', true);
                        storage.set('currentUser', { 
                            id: userData.id,
                            username: userData.username, 
                            role: userData.role,
                            name: userData.name
                        });
                        
                        window.location.href = 'dashboard.html';
                        return;
                    } else {
                        // No user found in Supabase
                        utils.showAlert('Usuario o contraseña incorrectos', 'error');
                        return;
                    }
                }
                
                // Fall back to localStorage
                authenticateWithLocalStorage(username, password);
            } catch (error) {
                console.error('Login error:', error);
                utils.showAlert('Error durante el inicio de sesión', 'error');
            }
        });
    }
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'gestion-usuarios.html#recuperacion';
        });
    }
    
    function authenticateWithLocalStorage(username, password) {
        const users = storage.get('users') || [];
        const systemUsers = storage.get('systemUsers') || [];
        
        // Check in both user stores
        const user = users.find(u => u.username === username && u.password === password);
        const systemUser = systemUsers.find(u => 
            (u.username === username || u.email === username) && 
            u.password === password
        );
        
        if (user || systemUser) {
            const userData = systemUser || user;
            
            // Check if user is active (for system users)
            if (systemUser && systemUser.status !== 'active') {
                utils.showAlert('Su cuenta está inactiva o suspendida. Contacte al administrador.', 'error');
                return;
            }
            
            // Check if password needs to be changed (for system users)
            if (systemUser && systemUser.forcePasswordChange) {
                // Store minimal info for password change
                sessionStorage.setItem('passwordChangeRequired', 'true');
                sessionStorage.setItem('passwordChangeUser', JSON.stringify({
                    id: systemUser.id,
                    username: systemUser.username,
                    email: systemUser.email
                }));
                
                // Redirect to password change page
                window.location.href = 'change-password.html';
                return;
            }
            
            // Update last login for system users
            if (systemUser) {
                systemUser.lastLogin = new Date().toISOString();
                storage.set('systemUsers', systemUsers);
            }
            
            // Log to audit log
            const auditLog = storage.get('auditLog') || [];
            auditLog.push({
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString(),
                user: userData.username,
                action: 'login',
                type: 'auth',
                description: `Usuario ${userData.username} inició sesión`,
                ip: '127.0.0.1' // In production, get real IP
            });
            storage.set('auditLog', auditLog);
            
            // Set session
            storage.set('adminLoggedIn', true);
            storage.set('currentUser', { 
                username: userData.username, 
                role: userData.role,
                name: userData.name || userData.username
            });
            
            window.location.href = 'dashboard.html';
        } else {
            utils.showAlert('Usuario o contraseña incorrectos', 'error');
        }
    }
});

export default {};