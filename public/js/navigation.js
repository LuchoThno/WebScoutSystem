import storage from './storage.js';
import utils from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const isAdmin = storage.get('adminLoggedIn');

    // Update navigation based on admin status
    const updateNavigation = () => {
        const adminLinks = document.querySelectorAll('.admin-only');
        const nonAdminLinks = document.querySelectorAll('.non-admin-only');

        if (isAdmin) {
            document.body.classList.add('admin-logged-in');
            adminLinks.forEach(link => link.style.display = 'block');
            nonAdminLinks.forEach(link => link.style.display = 'none');
        } else {
            document.body.classList.remove('admin-logged-in');
            adminLinks.forEach(link => link.style.display = 'none');
            nonAdminLinks.forEach(link => link.style.display = 'block');
        }
    };

    // Enhanced navigation integration with tabs system
    class NavigationTabsIntegration {
        constructor() {
            this.currentPage = window.location.pathname;
            this.isAdminPage = this.currentPage.includes('/admin/');
            this.tabSystem = null;
            this.navigationState = new Map();
            
            this.init();
        }

        init() {
            this.createSidebar();
            this.setupTabsIntegration();
            this.setupNavigationSync();
            this.setupBreadcrumbs();
        }

        setupTabsIntegration() {
            // Wait for tabs system to initialize
            if (this.isAdminPage) {
                const checkTabSystem = () => {
                    if (window.enhancedAdminTabSystems && window.enhancedAdminTabSystems.length > 0) {
                        this.tabSystem = window.enhancedAdminTabSystems[0];
                        this.connectNavigationToTabs();
                    } else {
                        setTimeout(checkTabSystem, 100);
                    }
                };
                checkTabSystem();
            }
        }

        connectNavigationToTabs() {
            if (!this.tabSystem) return;

            // Listen for tab changes to update navigation state
            document.addEventListener('tabchange', (e) => {
                const { tabId, previousTab } = e.detail;
                this.updateNavigationForTab(tabId, previousTab);
                this.updateBreadcrumbs(tabId);
                this.saveNavigationState(tabId);
            });

            // Add navigation shortcuts to sidebar
            this.addTabShortcutsToSidebar();
        }

        updateNavigationForTab(activeTabId, previousTabId) {
            // Update sidebar active states
            const sidebarLinks = document.querySelectorAll('.sidebar .nav-link');
            sidebarLinks.forEach(link => {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            });

            // Map tabs to navigation items
            const tabToNavMap = {
                'dashboard': 'dashboard',
                'miembros': 'gestion-miembros',
                'planificacion': 'planificacion',
                'recursos': 'recursos',
                'finanzas': 'finanzas'
            };

            const navId = tabToNavMap[activeTabId];
            if (navId) {
                const activeNavLink = document.querySelector(`[href*="${navId}"]`);
                if (activeNavLink) {
                    activeNavLink.classList.add('active');
                    activeNavLink.setAttribute('aria-current', 'page');
                }
            }

            // Update page context
            this.updatePageContext(activeTabId);
        }

        updatePageContext(tabId) {
            // Update meta description
            const metaDesc = document.querySelector('meta[name="description"]');
            const tabDescriptions = {
                'dashboard': 'Panel principal de administración del Grupo Scout',
                'miembros': 'Gestión integral de miembros y scouts',
                'planificacion': 'Planificación de actividades y eventos',
                'recursos': 'Gestión de inventario y recursos',
                'finanzas': 'Control financiero y presupuestos'
            };

            if (metaDesc && tabDescriptions[tabId]) {
                metaDesc.setAttribute('content', tabDescriptions[tabId]);
            }

            // Update browser history state
            const state = {
                tab: tabId,
                timestamp: Date.now(),
                page: this.currentPage
            };

            if (history.replaceState) {
                history.replaceState(state, '', `${this.currentPage}#${tabId}`);
            }
        }

        addTabShortcutsToSidebar() {
            if (!this.tabSystem || !this.isAdminPage) return;

            const tabs = this.tabSystem.getAllTabs();
            const adminSection = document.querySelector('.admin-section ul');
            
            if (!adminSection) return;

            // Add separator
            const separator = document.createElement('li');
            separator.innerHTML = '<hr style="border-color: rgba(255,255,255,0.2); margin: 1rem 0;">';
            adminSection.appendChild(separator);

            // Add tab shortcuts
            tabs.forEach((tab, index) => {
                const shortcutItem = document.createElement('li');
                const shortcutLink = document.createElement('button');
                
                shortcutLink.className = 'nav-link tab-shortcut';
                shortcutLink.dataset.tabId = tab.id;
                shortcutLink.setAttribute('aria-label', `Ir a ${tab.label}`);
                shortcutLink.setAttribute('title', `Ctrl+${index + 1}`);
                
                const icon = tab.element.querySelector('.tab-icon')?.textContent || '📄';
                shortcutLink.innerHTML = `
                    <span class="nav-icon" aria-hidden="true">${icon}</span>
                    <span class="nav-text">${tab.label}</span>
                    <span class="shortcut-key">Ctrl+${index + 1}</span>
                `;

                shortcutLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.tabSystem.switchTab(tab.id, tab.element);
                });

                shortcutItem.appendChild(shortcutLink);
                adminSection.appendChild(shortcutItem);
            });
        }

        setupBreadcrumbs() {
            if (!this.isAdminPage) return;

            const breadcrumbContainer = document.createElement('nav');
            breadcrumbContainer.className = 'breadcrumb-nav';
            breadcrumbContainer.setAttribute('aria-label', 'Navegación de migas de pan');
            
            const breadcrumbList = document.createElement('ol');
            breadcrumbList.className = 'breadcrumb-list';
            
            breadcrumbContainer.appendChild(breadcrumbList);
            
            // Insert after hero section
            const hero = document.querySelector('.hero');
            if (hero) {
                hero.parentNode.insertBefore(breadcrumbContainer, hero.nextSibling);
            }
        }

        updateBreadcrumbs(activeTabId) {
            const breadcrumbList = document.querySelector('.breadcrumb-list');
            if (!breadcrumbList) return;

            const tabLabels = {
                'dashboard': 'Panel Principal',
                'miembros': 'Gestión de Miembros',
                'planificacion': 'Planificación',
                'recursos': 'Recursos',
                'finanzas': 'Finanzas'
            };

            breadcrumbList.innerHTML = `
                <li class="breadcrumb-item">
                    <a href="/index.html">Inicio</a>
                </li>
                <li class="breadcrumb-item">
                    <a href="/pages/admin/dashboard.html">Administración</a>
                </li>
                <li class="breadcrumb-item active" aria-current="page">
                    ${tabLabels[activeTabId] || activeTabId}
                </li>
            `;
        }

        setupNavigationSync() {
            // Sync navigation state across admin pages
            window.addEventListener('storage', (e) => {
                if (e.key === 'adminNavigationState') {
                    this.handleNavigationStateChange(e.newValue);
                }
            });

            // Handle browser back/forward
            window.addEventListener('popstate', (e) => {
                if (e.state && e.state.tab && this.tabSystem) {
                    this.tabSystem.switchTab(e.state.tab);
                }
            });
        }

        saveNavigationState(tabId) {
            const state = {
                activeTab: tabId,
                page: this.currentPage,
                timestamp: Date.now()
            };

            try {
                localStorage.setItem('adminNavigationState', JSON.stringify(state));
            } catch (error) {
                console.warn('Failed to save navigation state:', error);
            }
        }

        handleNavigationStateChange(newStateJson) {
            if (!newStateJson || !this.tabSystem) return;

            try {
                const newState = JSON.parse(newStateJson);
                if (newState.page === this.currentPage && newState.activeTab) {
                    this.tabSystem.switchTab(newState.activeTab);
                }
            } catch (error) {
                console.warn('Failed to parse navigation state:', error);
            }
        }

        // Create semantic navigation sidebar
        createSidebar() {
            // Remove existing sidebar if present
            document.querySelector('.sidebar')?.remove();
            document.querySelector('.sidebar-overlay')?.remove();

            const sidebarHTML = `
                <div class="sidebar-overlay" aria-hidden="true"></div>
                <nav class="sidebar" role="navigation" aria-label="Navegación principal">
                    <header class="sidebar-header">
                        <a href="/index.html" class="sidebar-logo" aria-label="Ir al inicio">
                            <span class="sidebar-text">Grupo Scout</span>
                        </a>
                        <p class="sidebar-subtitle sidebar-text">Sistema de Gestión</p>
                        <button class="sidebar-toggle" type="button" aria-label="Colapsar menú">
                            <span aria-hidden="true">‹</span>
                        </button>
                    </header>
                    
                    <div class="sidebar-nav">
                        <ul role="list">
                            <li>
                                <a href="/index.html" class="nav-link" aria-label="Ir a inicio">
                                    <span class="nav-icon" aria-hidden="true">🏠</span>
                                    <span class="nav-text">Inicio</span>
                                </a>
                            </li>
                            <li>
                                <a href="/pages/dirigentes.html" class="nav-link" aria-label="Ver dirigentes y guías">
                                    <span class="nav-icon" aria-hidden="true">👥</span>
                                    <span class="nav-text">Dirigentes y Guías</span>
                                </a>
                            </li>
                            <li>
                                <a href="/pages/actividades.html" class="nav-link" aria-label="Ver actividades">
                                    <span class="nav-icon" aria-hidden="true">🎯</span>
                                    <span class="nav-text">Actividades</span>
                                </a>
                            </li>
                            <li>
                                <a href="/pages/documentos.html" class="nav-link" aria-label="Ver documentos">
                                    <span class="nav-icon" aria-hidden="true">📄</span>
                                    <span class="nav-text">Documentos</span>
                                </a>
                            </li>
                            <li>
                                <a href="/pages/noticias.html" class="nav-link" aria-label="Ver noticias">
                                    <span class="nav-icon" aria-hidden="true">📰</span>
                                    <span class="nav-text">Noticias</span>
                                </a>
                            </li>
                            <li>
                                <a href="/pages/visita.html" class="nav-link" aria-label="Información de contacto">
                                    <span class="nav-icon" aria-hidden="true">📞</span>
                                    <span class="nav-text">Visítanos</span>
                                </a>
                            </li>
                        </ul>

                        <section class="admin-section" aria-labelledby="admin-heading">
                            <h2 id="admin-heading" class="admin-section-title sidebar-text">Administración</h2>
                            <ul role="list">
                                <li class="non-admin-only">
                                    <a href="/pages/admin/login.html" class="nav-link" aria-label="Iniciar sesión como administrador">
                                        <span class="nav-icon" aria-hidden="true">🔐</span>
                                        <span class="nav-text">Iniciar Sesión</span>
                                    </a>
                                </li>
                                <li class="admin-only">
                                    <a href="/pages/admin/dashboard.html" class="nav-link" aria-label="Panel de administración">
                                        <span class="nav-icon" aria-hidden="true">📊</span>
                                        <span class="nav-text">Panel Admin</span>
                                    </a>
                                </li>
                                <li class="admin-only">
                                    <a href="/pages/admin/gestion-miembros.html" class="nav-link" aria-label="Gestión de miembros">
                                        <span class="nav-icon" aria-hidden="true">👥</span>
                                        <span class="nav-text">Gestión de Miembros</span>
                                    </a>
                                </li>
                                <li class="admin-only">
                                    <a href="/pages/admin/planificacion.html" class="nav-link" aria-label="Planificación">
                                        <span class="nav-icon" aria-hidden="true">📅</span>
                                        <span class="nav-text">Planificación</span>
                                    </a>
                                </li>
                                <li class="admin-only">
                                    <a href="/pages/admin/recursos.html" class="nav-link" aria-label="Gestión de recursos">
                                        <span class="nav-icon" aria-hidden="true">📦</span>
                                        <span class="nav-text">Recursos</span>
                                    </a>
                                </li>
                                <li class="admin-only">
                                    <a href="/pages/admin/dirigentes.html" class="nav-link" aria-label="Gestión de dirigentes">
                                        <span class="nav-icon" aria-hidden="true">🎖️</span>
                                        <span class="nav-text">Dirigentes</span>
                                    </a>
                                </li>
                                <li class="admin-only">
                                    <a href="/pages/admin/finanzas.html" class="nav-link" aria-label="Gestión financiera">
                                        <span class="nav-icon" aria-hidden="true">💰</span>
                                        <span class="nav-text">Gestión Financiera</span>
                                    </a>
                                </li>
                                <li class="admin-only">
                                    <a href="/pages/admin/gestion-usuarios.html" class="nav-link" aria-label="Gestión de usuarios">
                                        <span class="nav-icon" aria-hidden="true">👤</span>
                                        <span class="nav-text">Gestión de Usuarios</span>
                                    </a>
                                </li>
                                <li class="admin-only">
                                    <button type="button" class="nav-link logout-btn" id="sidebarLogoutBtn" aria-label="Cerrar sesión">
                                        <span class="nav-icon" aria-hidden="true">🚪</span>
                                        <span class="nav-text">Cerrar Sesión</span>
                                    </button>
                                </li>
                            </ul>
                        </section>
                    </div>
                </nav>
            `;
            
            document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
            this.setupSidebarEvents();
        }

        setupSidebarEvents() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            const menuToggle = document.querySelector('.menu-toggle');
            const sidebarToggle = document.querySelector('.sidebar-toggle');
            const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');

            // Menu toggle functionality
            if (menuToggle) {
                menuToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleSidebar();
                });
            }

            // Sidebar collapse toggle
            if (sidebarToggle) {
                sidebarToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleSidebarCollapse();
                });
            }

            // Overlay click to close
            if (overlay) {
                overlay.addEventListener('click', () => this.closeSidebar());
            }

            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', (e) => {
                if (window.innerWidth < 1200 && 
                    sidebar && 
                    !sidebar.contains(e.target) && 
                    !e.target.closest('.menu-toggle')) {
                    this.closeSidebar();
                }
            });

            // Logout functionality
            if (sidebarLogoutBtn) {
                sidebarLogoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            }

            // Keyboard navigation
            sidebar?.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeSidebar();
                }
            });

            this.highlightCurrentPage();
        }

        toggleSidebar() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            const menuToggle = document.querySelector('.menu-toggle');
            
            if (sidebar && overlay && menuToggle) {
                const isActive = sidebar.classList.toggle('active');
                overlay.classList.toggle('active', isActive);
                menuToggle.classList.toggle('active', isActive);
                
                // Update ARIA attributes
                menuToggle.setAttribute('aria-expanded', isActive.toString());
                sidebar.setAttribute('aria-hidden', (!isActive).toString());
            }
        }

        toggleSidebarCollapse() {
            const sidebar = document.querySelector('.sidebar');
            const sidebarToggle = document.querySelector('.sidebar-toggle');
            
            if (sidebar && sidebarToggle) {
                const isCollapsed = sidebar.classList.toggle('collapsed');
                const toggleIcon = sidebarToggle.querySelector('span');
                
                if (isCollapsed) {
                    toggleIcon.textContent = '›';
                    sidebarToggle.setAttribute('aria-label', 'Expandir menú');
                } else {
                    toggleIcon.textContent = '‹';
                    sidebarToggle.setAttribute('aria-label', 'Colapsar menú');
                }
                
                storage.set('sidebarCollapsed', isCollapsed);
            }
        }

        closeSidebar() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            const menuToggle = document.querySelector('.menu-toggle');
            
            if (sidebar && overlay && menuToggle) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                menuToggle.classList.remove('active');
                
                // Update ARIA attributes
                menuToggle.setAttribute('aria-expanded', 'false');
                sidebar.setAttribute('aria-hidden', 'true');
            }
        }

        highlightCurrentPage() {
            const currentPath = window.location.pathname;
            const currentHash = window.location.hash.substring(1);
            const navLinks = document.querySelectorAll('.sidebar .nav-link');
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
                
                const href = link.getAttribute('href');
                
                if (href && (
                    currentPath.includes(href) ||
                    (currentPath === '/' && href.includes('index.html')) ||
                    (currentPath.endsWith('/') && href.includes('index.html'))
                )) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                }
            });

            // Handle tab shortcuts highlighting
            const tabShortcuts = document.querySelectorAll('.tab-shortcut');
            tabShortcuts.forEach(shortcut => {
                shortcut.classList.remove('active');
                if (shortcut.dataset.tabId === currentHash) {
                    shortcut.classList.add('active');
                }
            });
        }

        logout() {
            storage.remove('adminLoggedIn');
            storage.remove('currentUser');
            storage.remove('adminNavigationState');
            updateNavigation();
            utils.showAlert('Sesión cerrada exitosamente', 'success');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1000);
        }
    }

    // Handle top logout button if present
    const topLogoutBtn = document.getElementById('logoutBtn');
    if (topLogoutBtn) {
        topLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const navigationIntegration = window.navigationIntegration;
            if (navigationIntegration) {
                navigationIntegration.logout();
            }
        });
    }

    // Initialize navigation and tabs integration
    const navigationIntegration = new NavigationTabsIntegration();

    updateNavigation();

    // Auto-show sidebar on desktop
    if (window.innerWidth >= 1200) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.add('active');
            sidebar.setAttribute('aria-hidden', 'false');
            
            // Restore collapsed state
            const isCollapsed = storage.get('sidebarCollapsed');
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
                const sidebarToggle = document.querySelector('.sidebar-toggle');
                if (sidebarToggle) {
                    const toggleIcon = sidebarToggle.querySelector('span');
                    toggleIcon.textContent = '›';
                    sidebarToggle.setAttribute('aria-label', 'Expandir menú');
                }
            }
        }
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        const sidebar = document.querySelector('.sidebar');
        if (window.innerWidth >= 1200 && sidebar) {
            sidebar.classList.add('active');
            sidebar.setAttribute('aria-hidden', 'false');
        } else if (window.innerWidth < 1200 && sidebar) {
            navigationIntegration.closeSidebar();
        }
        
        // Update tab shortcuts on resize
        navigationIntegration.highlightCurrentPage();
    });

    // Hash change handling for tab navigation
    window.addEventListener('hashchange', () => {
        navigationIntegration.highlightCurrentPage();
    });

    // Store navigation integration globally
    window.navigationIntegration = navigationIntegration;
});