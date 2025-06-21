import utils from '../utils.js';
import storage from '../storage.js';
import supabaseClient from '../supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!storage.get('adminLoggedIn') && !window.location.hash.includes('recuperacion')) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize Supabase client
    const supabase = await supabaseClient.init();
    
    // Initialize tab functionality
    initTabs();
    
    // Initialize default admin user if no users exist
    await initializeDefaultAdmin();
    
    // Load users
    loadUsers();
    
    // Load roles
    loadRoles();
    
    // Load permissions matrix
    loadPermissionsMatrix();
    
    // Load audit log
    loadAuditLog();
    
    // Set up form submissions
    document.getElementById('userForm')?.addEventListener('submit', handleUserFormSubmit);
    document.getElementById('roleForm')?.addEventListener('submit', handleRoleFormSubmit);
    document.getElementById('customPermissionForm')?.addEventListener('submit', handlePermissionFormSubmit);
    document.getElementById('resetPasswordRequestForm')?.addEventListener('submit', handleResetPasswordRequest);
    document.getElementById('resetPasswordForm')?.addEventListener('submit', handleResetPassword);
    
    // Set up search and filters
    document.getElementById('searchUsers')?.addEventListener('input', loadUsers);
    document.getElementById('filterRole')?.addEventListener('change', loadUsers);
    document.getElementById('filterStatus')?.addEventListener('change', loadUsers);
    
    document.getElementById('auditSearch')?.addEventListener('input', loadAuditLog);
    document.getElementById('auditUser')?.addEventListener('change', loadAuditLog);
    document.getElementById('auditAction')?.addEventListener('change', loadAuditLog);
    document.getElementById('auditDateFrom')?.addEventListener('change', loadAuditLog);
    document.getElementById('auditDateTo')?.addEventListener('change', loadAuditLog);
    
    // Load usage statistics
    loadUsageStatistics();
});

// Initialize default admin user
async function initializeDefaultAdmin() {
    try {
        // Check if we have users in Supabase first
        const supabase = await supabaseClient.init();
        
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
        const systemUsers = storage.get('systemUsers') || [];
        if (systemUsers.length === 0) {
            // Create default admin user in localStorage
            systemUsers.push({
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
            });
            
            storage.set('systemUsers', systemUsers);
            console.log('Default admin user created in localStorage');
        }
    } catch (error) {
        console.error('Error initializing default admin:', error);
    }
}

// Initialize tab functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
    
    // Check if URL has a hash and activate that tab
    const hash = window.location.hash.substring(1);
    if (hash) {
        const targetButton = document.querySelector(`.tab-btn[data-tab="${hash}"]`);
        if (targetButton) {
            targetButton.click();
        }
    }
}

// Load users
async function loadUsers() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    // Show loading state
    usersList.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        // Get filter values
        const searchTerm = document.getElementById('searchUsers')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('filterRole')?.value || '';
        const statusFilter = document.getElementById('filterStatus')?.value || '';
        
        let users = [];
        
        // Try to get data from Supabase
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            try {
                let query = supabase.from('system_users').select('*');
                
                if (roleFilter) {
                    query = query.eq('role', roleFilter);
                }
                
                if (statusFilter) {
                    query = query.eq('status', statusFilter);
                }
                
                if (searchTerm) {
                    query = query.or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
                }
                
                const { data, error } = await query.order('name', { ascending: true });
                
                if (error) throw error;
                users = data;
            } catch (error) {
                console.error('Error loading users from Supabase:', error);
                // Fall back to localStorage
                users = storage.get('systemUsers') || [];
            }
        } else {
            // Use localStorage
            users = storage.get('systemUsers') || [];
        }
        
        // Filter users if using localStorage
        if (!supabase) {
            users = users.filter(user => {
                const matchesSearch = user.name?.toLowerCase().includes(searchTerm) ||
                                    user.username?.toLowerCase().includes(searchTerm) ||
                                    user.email?.toLowerCase().includes(searchTerm);
                const matchesRole = !roleFilter || user.role === roleFilter;
                const matchesStatus = !statusFilter || user.status === statusFilter;
                
                return matchesSearch && matchesRole && matchesStatus;
            });
        }
        
        // Render users
        if (users.length === 0) {
            usersList.innerHTML = '<p class="no-content">No se encontraron usuarios</p>';
            return;
        }
        
        usersList.innerHTML = '';
        
        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'card user-card';
            
            // Format role for display
            const roleDisplay = {
                'super-admin': 'Super Administrador',
                'admin': 'Administrador',
                'dirigente': 'Dirigente',
                'asistente': 'Asistente',
                'editor': 'Editor',
                'viewer': 'Solo Lectura'
            };
            
            // Format permissions for display
            const permissionsCount = user.permissions?.length || 0;
            const permissionsSummary = permissionsCount > 0 
                ? `${permissionsCount} permisos asignados` 
                : 'Sin permisos asignados';
            
            userCard.innerHTML = `
                <div class="user-header">
                    <h4>${user.name}</h4>
                    <span class="status-indicator ${user.status}">${user.status}</span>
                </div>
                <div class="user-info">
                    <p><strong>Usuario:</strong> ${user.username}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Rol:</strong> ${roleDisplay[user.role] || user.role}</p>
                    <p><strong>Departamento:</strong> ${user.department || 'No asignado'}</p>
                </div>
                <div class="user-permissions">
                    <strong>Permisos:</strong> ${permissionsSummary}
                    <div class="permissions-summary">
                        ${user.permissions?.slice(0, 5).map(p => `<span class="module-permissions">${p}</span>`).join('') || ''}
                        ${permissionsCount > 5 ? `<span class="module-permissions">+${permissionsCount - 5} más</span>` : ''}
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewUser('${user.id}')">Ver</button>
                    <button class="btn btn-sm btn-secondary" onclick="editUser('${user.id}')">Editar</button>
                    <button class="btn btn-sm btn-secondary" onclick="resetUserPassword('${user.id}')">Reset Password</button>
                    <button class="btn btn-sm btn-secondary" onclick="toggleUserStatus('${user.id}')">
                        ${user.status === 'active' ? 'Desactivar' : 'Activar'}
                    </button>
                </div>
            `;
            
            usersList.appendChild(userCard);
        });
        
    } catch (error) {
        console.error('Error loading users:', error);
        usersList.innerHTML = `
            <div class="alert alert-error">
                <p>Error al cargar usuarios: ${error.message}</p>
            </div>
        `;
    }
}

// Load roles
function loadRoles() {
    const rolesList = document.getElementById('rolesList');
    if (!rolesList) return;
    
    // Show loading state
    rolesList.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        // Get roles from storage
        const roles = storage.get('roles') || getDefaultRoles();
        
        if (roles.length === 0) {
            rolesList.innerHTML = '<p class="no-content">No se encontraron roles</p>';
            return;
        }
        
        rolesList.innerHTML = '';
        
        roles.forEach(role => {
            const roleCard = document.createElement('div');
            roleCard.className = 'card role-card';
            
            // Format level for display
            const levelDisplay = {
                '1': 'Nivel 1 - Solo Lectura',
                '2': 'Nivel 2 - Editor',
                '3': 'Nivel 3 - Gestor',
                '4': 'Nivel 4 - Administrador',
                '5': 'Nivel 5 - Super Admin'
            };
            
            // Count users with this role
            const systemUsers = storage.get('systemUsers') || [];
            const usersWithRole = systemUsers.filter(user => user.role === role.name).length;
            
            roleCard.innerHTML = `
                <div class="role-header">
                    <h4>${role.displayName}</h4>
                    <span class="role-level">${levelDisplay[role.level] || `Nivel ${role.level}`}</span>
                </div>
                <p class="role-description">${role.description}</p>
                <div class="role-stats">
                    <p><strong>Usuarios asignados:</strong> ${usersWithRole}</p>
                    <p><strong>Nivel de acceso:</strong> ${role.level}/5</p>
                </div>
                <div class="role-permissions">
                    <strong>Permisos:</strong>
                    <div class="permissions-list">
                        ${role.permissions.slice(0, 5).map(p => `<span class="permission-tag">${p}</span>`).join('')}
                        ${role.permissions.length > 5 ? `<span class="permission-tag">+${role.permissions.length - 5} más</span>` : ''}
                    </div>
                </div>
                <div class="role-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewRole('${role.name}')">Ver</button>
                    <button class="btn btn-sm btn-secondary" onclick="editRole('${role.name}')">Editar</button>
                    ${role.name !== 'super-admin' ? `<button class="btn btn-sm btn-secondary" onclick="deleteRole('${role.name}')">Eliminar</button>` : ''}
                </div>
            `;
            
            rolesList.appendChild(roleCard);
        });
        
    } catch (error) {
        console.error('Error loading roles:', error);
        rolesList.innerHTML = `
            <div class="alert alert-error">
                <p>Error al cargar roles: ${error.message}</p>
            </div>
        `;
    }
}

// Load permissions matrix
function loadPermissionsMatrix() {
    const matrixContainer = document.getElementById('permissionsMatrix');
    if (!matrixContainer) return;
    
    // Show loading state
    matrixContainer.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        // Get roles and permissions
        const roles = storage.get('roles') || getDefaultRoles();
        const allPermissions = getAllPermissions();
        
        // Group permissions by module
        const permissionsByModule = {};
        allPermissions.forEach(permission => {
            const [module, action] = permission.split('.');
            if (!permissionsByModule[module]) {
                permissionsByModule[module] = [];
            }
            permissionsByModule[module].push(permission);
        });
        
        // Create matrix table
        let matrixHTML = `
            <div class="matrix-container">
                <table class="permissions-table">
                    <thead>
                        <tr>
                            <th>Módulo / Permiso</th>
                            ${roles.map(role => `<th>${role.displayName}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Add rows for each module and permission
        Object.entries(permissionsByModule).forEach(([module, permissions]) => {
            // Module header row
            matrixHTML += `
                <tr>
                    <th colspan="${roles.length + 1}" style="text-align: left; background: rgba(42, 110, 63, 0.1);">
                        ${formatModuleName(module)}
                    </th>
                </tr>
            `;
            
            // Permission rows
            permissions.forEach(permission => {
                const actionName = permission.split('.')[1];
                
                matrixHTML += `
                    <tr>
                        <td>${formatActionName(actionName)}</td>
                        ${roles.map(role => {
                            const hasPermission = role.permissions.includes(permission);
                            return `
                                <td class="permission-cell">
                                    <div class="permission-indicator ${hasPermission ? 'has-permissions' : 'no-permissions'}">
                                        ${hasPermission ? '✓' : '✗'}
                                        <div class="permission-details">
                                            ${hasPermission ? 'Tiene permiso' : 'Sin permiso'} para ${formatActionName(actionName)} en ${formatModuleName(module)}
                                        </div>
                                    </div>
                                </td>
                            `;
                        }).join('')}
                    </tr>
                `;
            });
        });
        
        matrixHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        matrixContainer.innerHTML = matrixHTML;
        
    } catch (error) {
        console.error('Error loading permissions matrix:', error);
        matrixContainer.innerHTML = `
            <div class="alert alert-error">
                <p>Error al cargar matriz de permisos: ${error.message}</p>
            </div>
        `;
    }
}

// Load audit log
async function loadAuditLog() {
    const auditLog = document.getElementById('auditLog');
    if (!auditLog) return;
    
    // Show loading state
    auditLog.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        // Get filter values
        const searchTerm = document.getElementById('auditSearch')?.value.toLowerCase() || '';
        const userFilter = document.getElementById('auditUser')?.value || '';
        const actionFilter = document.getElementById('auditAction')?.value || '';
        const dateFromFilter = document.getElementById('auditDateFrom')?.value || '';
        const dateToFilter = document.getElementById('auditDateTo')?.value || '';
        
        let logs = [];
        
        // Try to get data from Supabase
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            try {
                let query = supabase.from('audit_log').select('*');
                
                if (userFilter) {
                    query = query.eq('user_name', userFilter);
                }
                
                if (actionFilter) {
                    query = query.eq('action', actionFilter);
                }
                
                if (dateFromFilter) {
                    query = query.gte('timestamp', dateFromFilter);
                }
                
                if (dateToFilter) {
                    // Add one day to include the end date
                    const nextDay = new Date(dateToFilter);
                    nextDay.setDate(nextDay.getDate() + 1);
                    query = query.lt('timestamp', nextDay.toISOString());
                }
                
                if (searchTerm) {
                    query = query.or(`description.ilike.%${searchTerm}%,user_name.ilike.%${searchTerm}%`);
                }
                
                const { data, error } = await query.order('timestamp', { ascending: false }).limit(100);
                
                if (error) throw error;
                logs = data;
            } catch (error) {
                console.error('Error loading audit log from Supabase:', error);
                // Fall back to localStorage
                logs = storage.get('auditLog') || [];
            }
        } else {
            // Use localStorage
            logs = storage.get('auditLog') || [];
        }
        
        // Filter logs if using localStorage
        if (!supabase) {
            logs = logs.filter(log => {
                const matchesSearch = log.description?.toLowerCase().includes(searchTerm) ||
                                    log.user?.toLowerCase().includes(searchTerm);
                const matchesUser = !userFilter || log.user === userFilter;
                const matchesAction = !actionFilter || log.action === actionFilter;
                
                let matchesDateFrom = true;
                let matchesDateTo = true;
                
                if (dateFromFilter) {
                    const fromDate = new Date(dateFromFilter);
                    const logDate = new Date(log.timestamp);
                    matchesDateFrom = logDate >= fromDate;
                }
                
                if (dateToFilter) {
                    const toDate = new Date(dateToFilter);
                    toDate.setDate(toDate.getDate() + 1); // Include the end date
                    const logDate = new Date(log.timestamp);
                    matchesDateTo = logDate < toDate;
                }
                
                return matchesSearch && matchesUser && matchesAction && matchesDateFrom && matchesDateTo;
            });
        }
        
        // Sort logs by timestamp (newest first)
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Limit to 100 entries for performance
        logs = logs.slice(0, 100);
        
        // Populate user filter if not already populated
        const userFilterSelect = document.getElementById('auditUser');
        if (userFilterSelect && userFilterSelect.options.length <= 1) {
            const uniqueUsers = [...new Set(logs.map(log => log.user || log.user_name))].filter(Boolean);
            uniqueUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user;
                option.textContent = user;
                userFilterSelect.appendChild(option);
            });
        }
        
        // Render logs
        if (logs.length === 0) {
            auditLog.innerHTML = '<p class="no-content">No se encontraron registros de auditoría</p>';
            return;
        }
        
        auditLog.innerHTML = '';
        
        logs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = 'audit-entry';
            
            const timestamp = new Date(log.timestamp).toLocaleString();
            const user = log.user || log.user_name || 'Sistema';
            const action = log.action || 'unknown';
            const type = log.type || '';
            const description = log.description || '';
            
            entry.innerHTML = `
                <div class="audit-header">
                    <span class="audit-action ${action}">${action}</span>
                    <span class="audit-timestamp">${timestamp}</span>
                </div>
                <div class="audit-details">
                    <p><strong>Usuario:</strong> ${user}</p>
                    <p><strong>Tipo:</strong> ${type}</p>
                    <p><strong>Descripción:</strong> ${description}</p>
                    ${log.ip ? `<p><strong>IP:</strong> ${log.ip}</p>` : ''}
                </div>
            `;
            
            auditLog.appendChild(entry);
        });
        
    } catch (error) {
        console.error('Error loading audit log:', error);
        auditLog.innerHTML = `
            <div class="alert alert-error">
                <p>Error al cargar registros de auditoría: ${error.message}</p>
            </div>
        `;
    }
}

// Load usage statistics
function loadUsageStatistics() {
    try {
        // Get audit log
        const auditLog = storage.get('auditLog') || [];
        
        // Calculate active users today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeToday = [...new Set(auditLog
            .filter(log => new Date(log.timestamp) >= today)
            .map(log => log.user || log.user_name)
        )].length;
        
        // Calculate sessions this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const sessionsWeek = auditLog
            .filter(log => new Date(log.timestamp) >= weekAgo && log.action === 'login')
            .length;
        
        // Calculate most used module
        const moduleUsage = {};
        auditLog.forEach(log => {
            if (log.type) {
                moduleUsage[log.type] = (moduleUsage[log.type] || 0) + 1;
            }
        });
        
        let topModule = 'N/A';
        let topCount = 0;
        
        Object.entries(moduleUsage).forEach(([module, count]) => {
            if (count > topCount) {
                topModule = module;
                topCount = count;
            }
        });
        
        // Calculate average session time (simplified)
        const avgSession = '25 min'; // Placeholder - would need paired login/logout events
        
        // Update UI
        const activeTodayElement = document.getElementById('activeToday');
        if (activeTodayElement) {
            activeTodayElement.textContent = activeToday;
        }
        
        const sessionsWeekElement = document.getElementById('sessionsWeek');
        if (sessionsWeekElement) {
            sessionsWeekElement.textContent = sessionsWeek;
        }
        
        const topModuleElement = document.getElementById('topModule');
        if (topModuleElement) {
            topModuleElement.textContent = topModule;
        }
        
        const avgSessionElement = document.getElementById('avgSession');
        if (avgSessionElement) {
            avgSessionElement.textContent = avgSession;
        }
        
    } catch (error) {
        console.error('Error loading usage statistics:', error);
    }
}

// Handle user form submission
async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        // Validate form data
        const name = formData.get('name');
        const email = formData.get('email');
        const username = formData.get('username');
        let password = formData.get('password');
        const role = formData.get('role');
        const department = formData.get('department');
        const permissions = formData.getAll('permissions');
        const status = formData.get('status');
        const expiry = formData.get('expiry');
        const forcePasswordChange = formData.get('forcePasswordChange') === 'true';
        
        if (!name || !email || !username || !role) {
            utils.showAlert('Por favor complete todos los campos requeridos', 'error');
            return;
        }
        
        // Generate password if not provided
        if (!password) {
            password = generatePassword();
        }
        
        // Create user object
        const user = {
            id: Date.now().toString(),
            name,
            email,
            username,
            password, // In production, this should be hashed
            role,
            department: department || null,
            permissions,
            status: status || 'active',
            expiry: expiry || null,
            forcePasswordChange: forcePasswordChange,
            created_at: new Date().toISOString(),
            created_by: storage.get('currentUser')?.username || 'system'
        };
        
        // Try to save to Supabase
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            try {
                // Check if username or email already exists
                const { data: existingUsers, error: checkError } = await supabase
                    .from('system_users')
                    .select('*')
                    .or(`username.eq.${username},email.eq.${email}`);
                
                if (checkError) throw checkError;
                
                if (existingUsers && existingUsers.length > 0) {
                    utils.showAlert('El nombre de usuario o email ya está en uso', 'error');
                    return;
                }
                
                // Insert new user
                const { data, error } = await supabase
                    .from('system_users')
                    .insert([{
                        name: user.name,
                        email: user.email,
                        username: user.username,
                        password_hash: user.password, // In production, use proper hashing
                        role: user.role,
                        department: user.department,
                        permissions: user.permissions,
                        status: user.status,
                        expiry: user.expiry,
                        force_password_change: user.forcePasswordChange,
                        created_at: user.created_at,
                        created_by: user.created_by
                    }])
                    .select();
                
                if (error) throw error;
                
                // Log to audit log
                await supabase
                    .from('audit_log')
                    .insert([{
                        timestamp: new Date().toISOString(),
                        user_name: storage.get('currentUser')?.username || 'system',
                        action: 'create',
                        type: 'user',
                        description: `Usuario ${user.username} creado`,
                        ip: '127.0.0.1' // In production, get real IP
                    }]);
                
                utils.showAlert(`Usuario ${user.username} creado exitosamente`, 'success');
                
                // Simulate email notification
                console.log(`Email sent to ${user.email} with credentials:
                    Username: ${user.username}
                    Password: ${user.password}
                `);
                
            } catch (error) {
                console.error('Error saving user to Supabase:', error);
                // Fall back to localStorage
                saveUserToLocalStorage(user);
            }
        } else {
            // Use localStorage
            saveUserToLocalStorage(user);
        }
        
        // Reset form and reload users
        form.reset();
        loadUsers();
        
    } catch (error) {
        console.error('Error creating user:', error);
        utils.showAlert(`Error al crear usuario: ${error.message}`, 'error');
    }
}

// Save user to localStorage
function saveUserToLocalStorage(user) {
    try {
        const systemUsers = storage.get('systemUsers') || [];
        
        // Check if username or email already exists
        const existingUser = systemUsers.find(u => 
            u.username === user.username || u.email === user.email
        );
        
        if (existingUser) {
            utils.showAlert('El nombre de usuario o email ya está en uso', 'error');
            return false;
        }
        
        systemUsers.push(user);
        storage.set('systemUsers', systemUsers);
        
        // Log to audit log
        const auditLog = storage.get('auditLog') || [];
        auditLog.push({
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            user: storage.get('currentUser')?.username || 'system',
            action: 'create',
            type: 'user',
            description: `Usuario ${user.username} creado`,
            ip: '127.0.0.1' // In production, get real IP
        });
        storage.set('auditLog', auditLog);
        
        utils.showAlert(`Usuario ${user.username} creado exitosamente`, 'success');
        
        // Simulate email notification
        console.log(`Email sent to ${user.email} with credentials:
            Username: ${user.username}
            Password: ${user.password}
        `);
        
        return true;
    } catch (error) {
        console.error('Error saving user to localStorage:', error);
        utils.showAlert(`Error al guardar usuario: ${error.message}`, 'error');
        return false;
    }
}

// Handle role form submission
function handleRoleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        // Validate form data
        const name = formData.get('name');
        const level = formData.get('level');
        const description = formData.get('description');
        const color = formData.get('color');
        
        if (!name || !level || !description) {
            utils.showAlert('Por favor complete todos los campos requeridos', 'error');
            return;
        }
        
        // Create role object
        const role = {
            name,
            displayName: name.charAt(0).toUpperCase() + name.slice(1),
            level: parseInt(level),
            description,
            color: color || '#2A6E3F',
            permissions: getDefaultPermissionsForLevel(parseInt(level)),
            created_at: new Date().toISOString(),
            created_by: storage.get('currentUser')?.username || 'system'
        };
        
        // Save to storage
        const roles = storage.get('roles') || getDefaultRoles();
        
        // Check if role already exists
        const existingRole = roles.find(r => r.name === role.name);
        if (existingRole) {
            utils.showAlert('Ya existe un rol con ese nombre', 'error');
            return;
        }
        
        roles.push(role);
        storage.set('roles', roles);
        
        // Log to audit log
        const auditLog = storage.get('auditLog') || [];
        auditLog.push({
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            user: storage.get('currentUser')?.username || 'system',
            action: 'create',
            type: 'role',
            description: `Rol ${role.displayName} creado`,
            ip: '127.0.0.1' // In production, get real IP
        });
        storage.set('auditLog', auditLog);
        
        utils.showAlert(`Rol ${role.displayName} creado exitosamente`, 'success');
        
        // Reset form and reload roles
        form.reset();
        loadRoles();
        loadPermissionsMatrix();
        
    } catch (error) {
        console.error('Error creating role:', error);
        utils.showAlert(`Error al crear rol: ${error.message}`, 'error');
    }
}

// Handle permission form submission
function handlePermissionFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        // Validate form data
        const userId = formData.get('userId');
        const module = formData.get('module');
        const actions = formData.getAll('actions');
        
        if (!userId || !module || actions.length === 0) {
            utils.showAlert('Por favor complete todos los campos requeridos', 'error');
            return;
        }
        
        // Get user
        const systemUsers = storage.get('systemUsers') || [];
        const userIndex = systemUsers.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            utils.showAlert('Usuario no encontrado', 'error');
            return;
        }
        
        const user = systemUsers[userIndex];
        
        // Create permissions
        const permissions = actions.map(action => `${module}.${action}`);
        
        // Update user permissions
        const currentPermissions = user.permissions || [];
        
        // Remove existing permissions for this module
        const filteredPermissions = currentPermissions.filter(p => !p.startsWith(`${module}.`));
        
        // Add new permissions
        user.permissions = [...filteredPermissions, ...permissions];
        
        // Update user
        systemUsers[userIndex] = user;
        storage.set('systemUsers', systemUsers);
        
        // Log to audit log
        const auditLog = storage.get('auditLog') || [];
        auditLog.push({
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            user: storage.get('currentUser')?.username || 'system',
            action: 'update',
            type: 'permissions',
            description: `Permisos actualizados para usuario ${user.username}`,
            ip: '127.0.0.1' // In production, get real IP
        });
        storage.set('auditLog', auditLog);
        
        utils.showAlert(`Permisos actualizados para ${user.username}`, 'success');
        
        // Reset form and reload users
        form.reset();
        loadUsers();
        
    } catch (error) {
        console.error('Error updating permissions:', error);
        utils.showAlert(`Error al actualizar permisos: ${error.message}`, 'error');
    }
}

// Handle reset password request
async function handleResetPasswordRequest(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.email.value;
    
    if (!email) {
        utils.showAlert('Por favor ingrese un email', 'error');
        return;
    }
    
    try {
        // Generate reset token
        const token = generateResetToken();
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 1); // Token valid for 24 hours
        
        // Try to update user in Supabase
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('system_users')
                    .select('*')
                    .eq('email', email)
                    .single();
                
                if (error || !data) {
                    utils.showAlert('No se encontró ningún usuario con ese email', 'error');
                    return;
                }
                
                // Update user with reset token
                const { error: updateError } = await supabase
                    .from('system_users')
                    .update({
                        reset_token: token,
                        reset_expiry: expiry.toISOString()
                    })
                    .eq('id', data.id);
                
                if (updateError) throw updateError;
                
                // Log to audit log
                await supabase
                    .from('audit_log')
                    .insert([{
                        timestamp: new Date().toISOString(),
                        user_name: 'system',
                        action: 'reset_request',
                        type: 'auth',
                        description: `Solicitud de restablecimiento de contraseña para ${email}`,
                        ip: '127.0.0.1' // In production, get real IP
                    }]);
                
            } catch (error) {
                console.error('Error updating user in Supabase:', error);
                // Fall back to localStorage
                updateUserResetTokenInLocalStorage(email, token, expiry);
            }
        } else {
            // Use localStorage
            updateUserResetTokenInLocalStorage(email, token, expiry);
        }
        
        // Simulate email notification
        const resetUrl = `${window.location.origin}/pages/admin/reset-password.html?token=${token}`;
        console.log(`Email sent to ${email} with reset link:
            Reset URL: ${resetUrl}
            Token: ${token}
            Expires: ${expiry.toLocaleString()}
        `);
        
        utils.showAlert(`Se ha enviado un enlace de restablecimiento a ${email}`, 'success');
        
        // Reset form
        form.reset();
        
    } catch (error) {
        console.error('Error requesting password reset:', error);
        utils.showAlert(`Error al solicitar restablecimiento: ${error.message}`, 'error');
    }
}

// Update user reset token in localStorage
function updateUserResetTokenInLocalStorage(email, token, expiry) {
    const systemUsers = storage.get('systemUsers') || [];
    const userIndex = systemUsers.findIndex(u => u.email === email);
    
    if (userIndex === -1) {
        utils.showAlert('No se encontró ningún usuario con ese email', 'error');
        return false;
    }
    
    // Update user with reset token
    systemUsers[userIndex].resetToken = token;
    systemUsers[userIndex].resetExpiry = expiry.toISOString();
    
    storage.set('systemUsers', systemUsers);
    
    // Log to audit log
    const auditLog = storage.get('auditLog') || [];
    auditLog.push({
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        user: 'system',
        action: 'reset_request',
        type: 'auth',
        description: `Solicitud de restablecimiento de contraseña para ${email}`,
        ip: '127.0.0.1' // In production, get real IP
    });
    storage.set('auditLog', auditLog);
    
    return true;
}

// Handle reset password
async function handleResetPassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const token = form.token.value;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;
    
    if (!token || !newPassword || !confirmPassword) {
        utils.showAlert('Por favor complete todos los campos', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        utils.showAlert('Las contraseñas no coinciden', 'error');
        return;
    }
    
    try {
        // Try to find user with token in Supabase
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('system_users')
                    .select('*')
                    .eq('reset_token', token)
                    .single();
                
                if (error || !data) {
                    utils.showAlert('Token inválido o expirado', 'error');
                    return;
                }
                
                // Check if token is expired
                const expiry = new Date(data.reset_expiry);
                const now = new Date();
                
                if (now > expiry) {
                    utils.showAlert('El token ha expirado', 'error');
                    return;
                }
                
                // Update user password
                const { error: updateError } = await supabase
                    .from('system_users')
                    .update({
                        password_hash: newPassword, // In production, use proper hashing
                        reset_token: null,
                        reset_expiry: null,
                        force_password_change: false,
                        password_changed_at: new Date().toISOString()
                    })
                    .eq('id', data.id);
                
                if (updateError) throw updateError;
                
                // Log to audit log
                await supabase
                    .from('audit_log')
                    .insert([{
                        timestamp: new Date().toISOString(),
                        user_name: data.username,
                        action: 'reset_password',
                        type: 'auth',
                        description: `Contraseña restablecida para ${data.username}`,
                        ip: '127.0.0.1' // In production, get real IP
                    }]);
                
                utils.showAlert('Contraseña restablecida exitosamente', 'success');
                
                // Redirect to login page
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                
            } catch (error) {
                console.error('Error resetting password in Supabase:', error);
                // Fall back to localStorage
                resetPasswordInLocalStorage(token, newPassword);
            }
        } else {
            // Use localStorage
            resetPasswordInLocalStorage(token, newPassword);
        }
        
    } catch (error) {
        console.error('Error resetting password:', error);
        utils.showAlert(`Error al restablecer contraseña: ${error.message}`, 'error');
    }
}

// Reset password in localStorage
function resetPasswordInLocalStorage(token, newPassword) {
    const systemUsers = storage.get('systemUsers') || [];
    const userIndex = systemUsers.findIndex(u => u.resetToken === token);
    
    if (userIndex === -1) {
        utils.showAlert('Token inválido o expirado', 'error');
        return false;
    }
    
    const user = systemUsers[userIndex];
    
    // Check if token is expired
    const expiry = new Date(user.resetExpiry);
    const now = new Date();
    
    if (now > expiry) {
        utils.showAlert('El token ha expirado', 'error');
        return false;
    }
    
    // Update user password
    user.password = newPassword;
    user.resetToken = null;
    user.resetExpiry = null;
    user.forcePasswordChange = false;
    user.passwordChangedAt = new Date().toISOString();
    
    systemUsers[userIndex] = user;
    storage.set('systemUsers', systemUsers);
    
    // Log to audit log
    const auditLog = storage.get('auditLog') || [];
    auditLog.push({
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        user: user.username,
        action: 'reset_password',
        type: 'auth',
        description: `Contraseña restablecida para ${user.username}`,
        ip: '127.0.0.1' // In production, get real IP
    });
    storage.set('auditLog', auditLog);
    
    utils.showAlert('Contraseña restablecida exitosamente', 'success');
    
    // Redirect to login page
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
    
    return true;
}

// View user details
window.viewUser = function(id) {
    try {
        // Get user
        const systemUsers = storage.get('systemUsers') || [];
        const user = systemUsers.find(u => u.id === id);
        
        if (!user) {
            utils.showAlert('Usuario no encontrado', 'error');
            return;
        }
        
        // Format role for display
        const roleDisplay = {
            'super-admin': 'Super Administrador',
            'admin': 'Administrador',
            'dirigente': 'Dirigente',
            'asistente': 'Asistente',
            'editor': 'Editor',
            'viewer': 'Solo Lectura'
        };
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Detalles del Usuario</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="user-details">
                        <h4>Información Personal</h4>
                        <p><strong>Nombre:</strong> ${user.name}</p>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Nombre de Usuario:</strong> ${user.username}</p>
                        <p><strong>Estado:</strong> <span class="status-indicator ${user.status}">${user.status}</span></p>
                        
                        <h4>Rol y Permisos</h4>
                        <p><strong>Rol:</strong> ${roleDisplay[user.role] || user.role}</p>
                        <p><strong>Departamento:</strong> ${user.department || 'No asignado'}</p>
                        <p><strong>Permisos:</strong></p>
                        <div class="permissions-list">
                            ${user.permissions?.map(p => `<span class="permission-tag">${p}</span>`).join('') || 'Sin permisos asignados'}
                        </div>
                        
                        <h4>Información de Cuenta</h4>
                        <p><strong>Fecha de Creación:</strong> ${new Date(user.created_at).toLocaleString()}</p>
                        <p><strong>Creado por:</strong> ${user.created_by || 'Sistema'}</p>
                        <p><strong>Último Inicio de Sesión:</strong> ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}</p>
                        <p><strong>Expiración:</strong> ${user.expiry ? new Date(user.expiry).toLocaleDateString() : 'No expira'}</p>
                        <p><strong>Cambio de Contraseña Requerido:</strong> ${user.forcePasswordChange ? 'Sí' : 'No'}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error viewing user:', error);
        utils.showAlert(`Error al ver usuario: ${error.message}`, 'error');
    }
};

// Edit user
window.editUser = function(id) {
    try {
        // Get user
        const systemUsers = storage.get('systemUsers') || [];
        const user = systemUsers.find(u => u.id === id);
        
        if (!user) {
            utils.showAlert('Usuario no encontrado', 'error');
            return;
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Usuario</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editUserForm" class="admin-form">
                        <input type="hidden" name="id" value="${user.id}">
                        
                        <div class="form-group">
                            <label for="editName">Nombre Completo</label>
                            <input type="text" id="editName" name="name" class="form-control" value="${user.name}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="editEmail">Correo Electrónico</label>
                            <input type="email" id="editEmail" name="email" class="form-control" value="${user.email}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="editUsername">Nombre de Usuario</label>
                            <input type="text" id="editUsername" name="username" class="form-control" value="${user.username}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="editRole">Rol Principal</label>
                            <select id="editRole" name="role" class="form-control" required>
                                <option value="super-admin" ${user.role === 'super-admin' ? 'selected' : ''}>Super Administrador</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
                                <option value="dirigente" ${user.role === 'dirigente' ? 'selected' : ''}>Dirigente</option>
                                <option value="asistente" ${user.role === 'asistente' ? 'selected' : ''}>Asistente</option>
                                <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>Editor</option>
                                <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Solo Lectura</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="editDepartment">Departamento/Sección</label>
                            <select id="editDepartment" name="department" class="form-control">
                                <option value="" ${!user.department ? 'selected' : ''}>Seleccionar departamento</option>
                                <option value="bandada" ${user.department === 'bandada' ? 'selected' : ''}>🐦 Bandada</option>
                                <option value="manada" ${user.department === 'manada' ? 'selected' : ''}>🐺 Manada</option>
                                <option value="compania" ${user.department === 'compania' ? 'selected' : ''}>🍀 Compañía</option>
                                <option value="tropa" ${user.department === 'tropa' ? 'selected' : ''}>🏕️ Tropa</option>
                                <option value="avanzada" ${user.department === 'avanzada' ? 'selected' : ''}>🌠 Avanzada</option>
                                <option value="clan" ${user.department === 'clan' ? 'selected' : ''}>🔥 Clan</option>
                                <option value="administracion" ${user.department === 'administracion' ? 'selected' : ''}>Administración</option>
                                <option value="finanzas" ${user.department === 'finanzas' ? 'selected' : ''}>Finanzas</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="editStatus">Estado</label>
                            <select id="editStatus" name="status" class="form-control" required>
                                <option value="active" ${user.status === 'active' ? 'selected' : ''}>Activo</option>
                                <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
                                <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspendido</option>
                                <option value="pending" ${user.status === 'pending' ? 'selected' : ''}>Pendiente de Activación</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="editExpiry">Fecha de Expiración</label>
                            <input type="date" id="editExpiry" name="expiry" class="form-control" value="${user.expiry || ''}">
                            <small class="help-text">Opcional: Fecha límite de acceso</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-item">
                                <input type="checkbox" name="forcePasswordChange" value="true" ${user.forcePasswordChange ? 'checked' : ''}>
                                <span>Forzar cambio de contraseña en el próximo inicio de sesión</span>
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="updateUser()">Guardar Cambios</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error editing user:', error);
        utils.showAlert(`Error al editar usuario: ${error.message}`, 'error');
    }
};

// Update user
window.updateUser = async function() {
    try {
        const form = document.getElementById('editUserForm');
        const formData = new FormData(form);
        
        const id = formData.get('id');
        const name = formData.get('name');
        const email = formData.get('email');
        const username = formData.get('username');
        const role = formData.get('role');
        const department = formData.get('department');
        const status = formData.get('status');
        const expiry = formData.get('expiry');
        const forcePasswordChange = formData.get('forcePasswordChange') === 'true';
        
        if (!id || !name || !email || !username || !role || !status) {
            utils.showAlert('Por favor complete todos los campos requeridos', 'error');
            return;
        }
        
        // Try to update in Supabase
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            try {
                // Check if username or email already exists (excluding this user)
                const { data: existingUsers, error: checkError } = await supabase
                    .from('system_users')
                    .select('*')
                    .or(`username.eq.${username},email.eq.${email}`)
                    .neq('id', id);
                
                if (checkError) throw checkError;
                
                if (existingUsers && existingUsers.length > 0) {
                    utils.showAlert('El nombre de usuario o email ya está en uso por otro usuario', 'error');
                    return;
                }
                
                // Update user
                const { error } = await supabase
                    .from('system_users')
                    .update({
                        name,
                        email,
                        username,
                        role,
                        department: department || null,
                        status,
                        expiry: expiry || null,
                        force_password_change: forcePasswordChange
                    })
                    .eq('id', id);
                
                if (error) throw error;
                
                // Log to audit log
                await supabase
                    .from('audit_log')
                    .insert([{
                        timestamp: new Date().toISOString(),
                        user_name: storage.get('currentUser')?.username || 'system',
                        action: 'update',
                        type: 'user',
                        description: `Usuario ${username} actualizado`,
                        ip: '127.0.0.1' // In production, get real IP
                    }]);
                
                utils.showAlert(`Usuario ${username} actualizado exitosamente`, 'success');
                
            } catch (error) {
                console.error('Error updating user in Supabase:', error);
                // Fall back to localStorage
                updateUserInLocalStorage(id, name, email, username, role, department, status, expiry, forcePasswordChange);
            }
        } else {
            // Use localStorage
            updateUserInLocalStorage(id, name, email, username, role, department, status, expiry, forcePasswordChange);
        }
        
        // Close modal and reload users
        closeModal();
        loadUsers();
        
    } catch (error) {
        console.error('Error updating user:', error);
        utils.showAlert(`Error al actualizar usuario: ${error.message}`, 'error');
    }
};

// Update user in localStorage
function updateUserInLocalStorage(id, name, email, username, role, department, status, expiry, forcePasswordChange) {
    try {
        const systemUsers = storage.get('systemUsers') || [];
        const userIndex = systemUsers.findIndex(u => u.id === id);
        
        if (userIndex === -1) {
            utils.showAlert('Usuario no encontrado', 'error');
            return false;
        }
        
        // Check if username or email already exists (excluding this user)
        const existingUser = systemUsers.find(u => 
            (u.username === username || u.email === email) && u.id !== id
        );
        
        if (existingUser) {
            utils.showAlert('El nombre de usuario o email ya está en uso por otro usuario', 'error');
            return false;
        }
        
        // Update user
        const user = systemUsers[userIndex];
        user.name = name;
        user.email = email;
        user.username = username;
        user.role = role;
        user.department = department || null;
        user.status = status;
        user.expiry = expiry || null;
        user.forcePasswordChange = forcePasswordChange;
        
        systemUsers[userIndex] = user;
        storage.set('systemUsers', systemUsers);
        
        // Log to audit log
        const auditLog = storage.get('auditLog') || [];
        auditLog.push({
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            user: storage.get('currentUser')?.username || 'system',
            action: 'update',
            type: 'user',
            description: `Usuario ${username} actualizado`,
            ip: '127.0.0.1' // In production, get real IP
        });
        storage.set('auditLog', auditLog);
        
        utils.showAlert(`Usuario ${username} actualizado exitosamente`, 'success');
        return true;
    } catch (error) {
        console.error('Error updating user in localStorage:', error);
        utils.showAlert(`Error al actualizar usuario: ${error.message}`, 'error');
        return false;
    }
}

// Reset user password
window.resetUserPassword = async function(id) {
    try {
        // Get user
        const systemUsers = storage.get('systemUsers') || [];
        const user = systemUsers.find(u => u.id === id);
        
        if (!user) {
            utils.showAlert('Usuario no encontrado', 'error');
            return;
        }
        
        // Generate new password
        const newPassword = generatePassword();
        
        // Try to update in Supabase
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('system_users')
                    .update({
                        password_hash: newPassword, // In production, use proper hashing
                        force_password_change: true
                    })
                    .eq('id', id);
                
                if (error) throw error;
                
                // Log to audit log
                await supabase
                    .from('audit_log')
                    .insert([{
                        timestamp: new Date().toISOString(),
                        user_name: storage.get('currentUser')?.username || 'system',
                        action: 'reset_password',
                        type: 'auth',
                        description: `Contraseña restablecida para ${user.username}`,
                        ip: '127.0.0.1' // In production, get real IP
                    }]);
                
            } catch (error) {
                console.error('Error resetting password in Supabase:', error);
                // Fall back to localStorage
                resetUserPasswordInLocalStorage(id, newPassword);
            }
        } else {
            // Use localStorage
            resetUserPasswordInLocalStorage(id, newPassword);
        }
        
        // Simulate email notification
        console.log(`Email sent to ${user.email} with new password:
            Username: ${user.username}
            New Password: ${newPassword}
        `);
        
        utils.showAlert(`Contraseña restablecida para ${user.username}. Se ha enviado un email con la nueva contraseña.`, 'success');
        
    } catch (error) {
        console.error('Error resetting password:', error);
        utils.showAlert(`Error al restablecer contraseña: ${error.message}`, 'error');
    }
};

// Reset user password in localStorage
function resetUserPasswordInLocalStorage(id, newPassword) {
    try {
        const systemUsers = storage.get('systemUsers') || [];
        const userIndex = systemUsers.findIndex(u => u.id === id);
        
        if (userIndex === -1) {
            utils.showAlert('Usuario no encontrado', 'error');
            return false;
        }
        
        // Update user
        const user = systemUsers[userIndex];
        user.password = newPassword;
        user.forcePasswordChange = true;
        
        systemUsers[userIndex] = user;
        storage.set('systemUsers', systemUsers);
        
        // Log to audit log
        const auditLog = storage.get('auditLog') || [];
        auditLog.push({
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            user: storage.get('currentUser')?.username || 'system',
            action: 'reset_password',
            type: 'auth',
            description: `Contraseña restablecida para ${user.username}`,
            ip: '127.0.0.1' // In production, get real IP
        });
        storage.set('auditLog', auditLog);
        
        return true;
    } catch (error) {
        console.error('Error resetting password in localStorage:', error);
        utils.showAlert(`Error al restablecer contraseña: ${error.message}`, 'error');
        return false;
    }
}

// Toggle user status
window.toggleUserStatus = async function(id) {
    try {
        // Get user
        const systemUsers = storage.get('systemUsers') || [];
        const user = systemUsers.find(u => u.id === id);
        
        if (!user) {
            utils.showAlert('Usuario no encontrado', 'error');
            return;
        }
        
        // Toggle status
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        
        // Try to update in Supabase
        const supabase = await supabaseClient.init();
        
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('system_users')
                    .update({
                        status: newStatus
                    })
                    .eq('id', id);
                
                if (error) throw error;
                
                // Log to audit log
                await supabase
                    .from('audit_log')
                    .insert([{
                        timestamp: new Date().toISOString(),
                        user_name: storage.get('currentUser')?.username || 'system',
                        action: 'update_status',
                        type: 'user',
                        description: `Estado de ${user.username} cambiado a ${newStatus}`,
                        ip: '127.0.0.1' // In production, get real IP
                    }]);
                
            } catch (error) {
                console.error('Error updating user status in Supabase:', error);
                // Fall back to localStorage
                toggleUserStatusInLocalStorage(id, newStatus);
            }
        } else {
            // Use localStorage
            toggleUserStatusInLocalStorage(id, newStatus);
        }
        
        utils.showAlert(`Estado de ${user.username} cambiado a ${newStatus}`, 'success');
        
        // Reload users
        loadUsers();
        
    } catch (error) {
        console.error('Error toggling user status:', error);
        utils.showAlert(`Error al cambiar estado: ${error.message}`, 'error');
    }
};

// Toggle user status in localStorage
function toggleUserStatusInLocalStorage(id, newStatus) {
    try {
        const systemUsers = storage.get('systemUsers') || [];
        const userIndex = systemUsers.findIndex(u => u.id === id);
        
        if (userIndex === -1) {
            utils.showAlert('Usuario no encontrado', 'error');
            return false;
        }
        
        // Update user
        const user = systemUsers[userIndex];
        user.status = newStatus;
        
        systemUsers[userIndex] = user;
        storage.set('systemUsers', systemUsers);
        
        // Log to audit log
        const auditLog = storage.get('auditLog') || [];
        auditLog.push({
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            user: storage.get('currentUser')?.username || 'system',
            action: 'update_status',
            type: 'user',
            description: `Estado de ${user.username} cambiado a ${newStatus}`,
            ip: '127.0.0.1' // In production, get real IP
        });
        storage.set('auditLog', auditLog);
        
        return true;
    } catch (error) {
        console.error('Error toggling user status in localStorage:', error);
        utils.showAlert(`Error al cambiar estado: ${error.message}`, 'error');
        return false;
    }
}

// View role details
window.viewRole = function(roleName) {
    try {
        // Get role
        const roles = storage.get('roles') || getDefaultRoles();
        const role = roles.find(r => r.name === roleName);
        
        if (!role) {
            utils.showAlert('Rol no encontrado', 'error');
            return;
        }
        
        // Format level for display
        const levelDisplay = {
            '1': 'Nivel 1 - Solo Lectura',
            '2': 'Nivel 2 - Editor',
            '3': 'Nivel 3 - Gestor',
            '4': 'Nivel 4 - Administrador',
            '5': 'Nivel 5 - Super Admin'
        };
        
        // Count users with this role
        const systemUsers = storage.get('systemUsers') || [];
        const usersWithRole = systemUsers.filter(user => user.role === role.name);
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Detalles del Rol</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="role-details">
                        <h4>Información General</h4>
                        <p><strong>Nombre:</strong> ${role.displayName}</p>
                        <p><strong>Nivel de Acceso:</strong> ${levelDisplay[role.level] || `Nivel ${role.level}`}</p>
                        <p><strong>Descripción:</strong> ${role.description}</p>
                        
                        <h4>Permisos Asignados</h4>
                        <div class="permissions-list">
                            ${role.permissions.map(p => `<span class="permission-tag">${p}</span>`).join('') || 'Sin permisos asignados'}
                        </div>
                        
                        <h4>Usuarios con este Rol (${usersWithRole.length})</h4>
                        <ul>
                            ${usersWithRole.map(u => `<li>${u.name} (${u.username})</li>`).join('') || '<li>No hay usuarios con este rol</li>'}
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error viewing role:', error);
        utils.showAlert(`Error al ver rol: ${error.message}`, 'error');
    }
};

// Edit role
window.editRole = function(roleName) {
    try {
        // Get role
        const roles = storage.get('roles') || getDefaultRoles();
        const role = roles.find(r => r.name === roleName);
        
        if (!role) {
            utils.showAlert('Rol no encontrado', 'error');
            return;
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Rol</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editRoleForm" class="admin-form">
                        <input type="hidden" name="originalName" value="${role.name}">
                        
                        <div class="form-group">
                            <label for="editRoleName">Nombre del Rol</label>
                            <input type="text" id="editRoleName" name="name" class="form-control" value="${role.name}" ${role.name === 'super-admin' ? 'readonly' : ''} required>
                        </div>
                        
                        <div class="form-group">
                            <label for="editRoleDisplayName">Nombre para Mostrar</label>
                            <input type="text" id="editRoleDisplayName" name="displayName" class="form-control" value="${role.displayName}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="editRoleLevel">Nivel de Acceso</label>
                            <select id="editRoleLevel" name="level" class="form-control" ${role.name === 'super-admin' ? 'disabled' : ''} required>
                                <option value="1" ${role.level === 1 ? 'selected' : ''}>Nivel 1 - Solo Lectura</option>
                                <option value="2" ${role.level === 2 ? 'selected' : ''}>Nivel 2 - Editor</option>
                                <option value="3" ${role.level === 3 ? 'selected' : ''}>Nivel 3 - Gestor</option>
                                <option value="4" ${role.level === 4 ? 'selected' : ''}>Nivel 4 - Administrador</option>
                                <option value="5" ${role.level === 5 ? 'selected' : ''}>Nivel 5 - Super Admin</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="editRoleDescription">Descripción</label>
                            <textarea id="editRoleDescription" name="description" class="form-control" rows="3" required>${role.description}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="editRoleColor">Color Identificativo</label>
                            <input type="color" id="editRoleColor" name="color" class="form-control" value="${role.color || '#2A6E3F'}">
                        </div>
                        
                        ${role.name !== 'super-admin' ? `
                            <div class="form-group">
                                <label>Permisos</label>
                                <div class="permissions-grid">
                                    ${generatePermissionsCheckboxes(role.permissions)}
                                </div>
                            </div>
                        ` : ''}
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="updateRole()">Guardar Cambios</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error editing role:', error);
        utils.showAlert(`Error al editar rol: ${error.message}`, 'error');
    }
};

// Generate permissions checkboxes
function generatePermissionsCheckboxes(selectedPermissions = []) {
    const allPermissions = getAllPermissions();
    const permissionsByModule = {};
    
    allPermissions.forEach(permission => {
        const [module, action] = permission.split('.');
        if (!permissionsByModule[module]) {
            permissionsByModule[module] = [];
        }
        permissionsByModule[module].push(permission);
    });
    
    let html = '';
    
    Object.entries(permissionsByModule).forEach(([module, permissions]) => {
        html += `
            <div class="permission-category">
                <h4>${formatModuleName(module)}</h4>
                ${permissions.map(permission => {
                    const action = permission.split('.')[1];
                    const isChecked = selectedPermissions.includes(permission);
                    return `
                        <label class="checkbox-item">
                            <input type="checkbox" name="permissions" value="${permission}" ${isChecked ? 'checked' : ''}>
                            <span>${formatActionName(action)}</span>
                        </label>
                    `;
                }).join('')}
            </div>
        `;
    });
    
    return html;
}

// Update role
window.updateRole = function() {
    try {
        const form = document.getElementById('editRoleForm');
        const formData = new FormData(form);
        
        const originalName = formData.get('originalName');
        const name = formData.get('name');
        const displayName = formData.get('displayName');
        const level = parseInt(formData.get('level'));
        const description = formData.get('description');
        const color = formData.get('color');
        const permissions = formData.getAll('permissions');
        
        if (!name || !displayName || !level || !description) {
            utils.showAlert('Por favor complete todos los campos requeridos', 'error');
            return;
        }
        
        // Get roles
        const roles = storage.get('roles') || getDefaultRoles();
        const roleIndex = roles.findIndex(r => r.name === originalName);
        
        if (roleIndex === -1) {
            utils.showAlert('Rol no encontrado', 'error');
            return;
        }
        
        // Check if new name already exists (if name changed)
        if (name !== originalName && roles.some(r => r.name === name)) {
            utils.showAlert('Ya existe un rol con ese nombre', 'error');
            return;
        }
        
        // Update role
        const updatedRole = {
            ...roles[roleIndex],
            name,
            displayName,
            level,
            description,
            color,
            permissions: originalName === 'super-admin' ? roles[roleIndex].permissions : permissions
        };
        
        roles[roleIndex] = updatedRole;
        storage.set('roles', roles);
        
        // If role name changed, update users with this role
        if (name !== originalName) {
            const systemUsers = storage.get('systemUsers') || [];
            systemUsers.forEach((user, index) => {
                if (user.role === originalName) {
                    systemUsers[index].role = name;
                }
            });
            storage.set('systemUsers', systemUsers);
        }
        
        // Log to audit log
        const auditLog = storage.get('auditLog') || [];
        auditLog.push({
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            user: storage.get('currentUser')?.username || 'system',
            action: 'update',
            type: 'role',
            description: `Rol ${displayName} actualizado`,
            ip: '127.0.0.1' // In production, get real IP
        });
        storage.set('auditLog', auditLog);
        
        utils.showAlert(`Rol ${displayName} actualizado exitosamente`, 'success');
        
        // Close modal and reload roles
        closeModal();
        loadRoles();
        loadPermissionsMatrix();
        
    } catch (error) {
        console.error('Error updating role:', error);
        utils.showAlert(`Error al actualizar rol: ${error.message}`, 'error');
    }
};

// Delete role
window.deleteRole = function(roleName) {
    try {
        // Cannot delete super-admin role
        if (roleName === 'super-admin') {
            utils.showAlert('No se puede eliminar el rol de Super Administrador', 'error');
            return;
        }
        
        // Confirm deletion
        if (!confirm(`¿Está seguro de que desea eliminar el rol "${roleName}"? Esta acción no se puede deshacer.`)) {
            return;
        }
        
        // Get roles
        const roles = storage.get('roles') || getDefaultRoles();
        const roleIndex = roles.findIndex(r => r.name === roleName);
        
        if (roleIndex === -1) {
            utils.showAlert('Rol no encontrado', 'error');
            return;
        }
        
        // Check if any users have this role
        const systemUsers = storage.get('systemUsers') || [];
        const usersWithRole = systemUsers.filter(user => user.role === roleName);
        
        if (usersWithRole.length > 0) {
            utils.showAlert(`No se puede eliminar el rol porque hay ${usersWithRole.length} usuarios asignados a él`, 'error');
            return;
        }
        
        // Delete role
        roles.splice(roleIndex, 1);
        storage.set('roles', roles);
        
        // Log to audit log
        const auditLog = storage.get('auditLog') || [];
        auditLog.push({
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            user: storage.get('currentUser')?.username || 'system',
            action: 'delete',
            type: 'role',
            description: `Rol ${roleName} eliminado`,
            ip: '127.0.0.1' // In production, get real IP
        });
        storage.set('auditLog', auditLog);
        
        utils.showAlert(`Rol ${roleName} eliminado exitosamente`, 'success');
        
        // Reload roles
        loadRoles();
        loadPermissionsMatrix();
        
    } catch (error) {
        console.error('Error deleting role:', error);
        utils.showAlert(`Error al eliminar rol: ${error.message}`, 'error');
    }
};

// Close modal
window.closeModal = function() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
};

// Generate password
function generatePassword() {
    const length = 10;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let password = '';
    
    // Ensure at least one uppercase, one lowercase, one number, and one special character
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*()'[Math.floor(Math.random() * 10)];
    
    // Fill the rest of the password
    for (let i = 4; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Generate reset token
function generateResetToken() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Get default roles
function getDefaultRoles() {
    return [
        {
            name: 'super-admin',
            displayName: 'Super Administrador',
            level: 5,
            description: 'Acceso completo a todas las funciones del sistema',
            color: '#dc3545',
            permissions: getAllPermissions()
        },
        {
            name: 'admin',
            displayName: 'Administrador',
            level: 4,
            description: 'Acceso a la mayoría de las funciones administrativas',
            color: '#fd7e14',
            permissions: [
                'dashboard.view', 'dashboard.stats',
                'members.view', 'members.create', 'members.edit',
                'planning.view', 'planning.create', 'planning.edit',
                'resources.view', 'resources.manage',
                'finance.view', 'finance.transactions',
                'leaders.view', 'leaders.manage'
            ]
        },
        {
            name: 'dirigente',
            displayName: 'Dirigente',
            level: 3,
            description: 'Acceso a funciones de gestión de miembros y actividades',
            color: '#28a745',
            permissions: [
                'dashboard.view',
                'members.view', 'members.create',
                'planning.view', 'planning.create',
                'resources.view',
                'leaders.view'
            ]
        },
        {
            name: 'asistente',
            displayName: 'Asistente',
            level: 2,
            description: 'Acceso limitado a funciones básicas',
            color: '#17a2b8',
            permissions: [
                'dashboard.view',
                'members.view',
                'planning.view',
                'resources.view'
            ]
        },
        {
            name: 'viewer',
            displayName: 'Solo Lectura',
            level: 1,
            description: 'Acceso de solo lectura a información básica',
            color: '#6c757d',
            permissions: [
                'dashboard.view',
                'members.view',
                'planning.view'
            ]
        }
    ];
}

// Get default permissions for level
function getDefaultPermissionsForLevel(level) {
    const allPermissions = getAllPermissions();
    
    switch (level) {
        case 5: // Super Admin
            return allPermissions;
        case 4: // Admin
            return allPermissions.filter(p => !p.includes('admin.system'));
        case 3: // Manager
            return allPermissions.filter(p => 
                !p.includes('admin.') && 
                !p.includes('.delete') && 
                !p.includes('finance.reports')
            );
        case 2: // Editor
            return allPermissions.filter(p => 
                p.includes('.view') || 
                p.includes('.create')
            );
        case 1: // Viewer
            return allPermissions.filter(p => p.includes('.view'));
        default:
            return [];
    }
}

// Get all permissions
function getAllPermissions() {
    return [
        'dashboard.view',
        'dashboard.stats',
        'members.view',
        'members.create',
        'members.edit',
        'members.delete',
        'planning.view',
        'planning.create',
        'planning.edit',
        'planning.delete',
        'resources.view',
        'resources.manage',
        'finance.view',
        'finance.transactions',
        'finance.reports',
        'leaders.view',
        'leaders.manage',
        'admin.users',
        'admin.system'
    ];
}

// Format module name
function formatModuleName(module) {
    const moduleNames = {
        'dashboard': 'Dashboard',
        'members': 'Gestión de Miembros',
        'planning': 'Planificación',
        'resources': 'Recursos',
        'finance': 'Finanzas',
        'leaders': 'Dirigentes',
        'admin': 'Administración'
    };
    
    return moduleNames[module] || module;
}

// Format action name
function formatActionName(action) {
    const actionNames = {
        'view': 'Ver',
        'create': 'Crear',
        'edit': 'Editar',
        'delete': 'Eliminar',
        'manage': 'Gestionar',
        'stats': 'Estadísticas',
        'transactions': 'Transacciones',
        'reports': 'Reportes',
        'users': 'Gestión de Usuarios',
        'system': 'Configuración del Sistema'
    };
    
    return actionNames[action] || action;
}

// Make functions available globally
window.viewUser = viewUser;
window.editUser = editUser;
window.updateUser = updateUser;
window.resetUserPassword = resetUserPassword;
window.toggleUserStatus = toggleUserStatus;
window.viewRole = viewRole;
window.editRole = editRole;
window.updateRole = updateRole;
window.deleteRole = deleteRole;
window.closeModal = closeModal;

export default {};