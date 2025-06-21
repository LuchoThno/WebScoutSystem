/**
 * Enhanced Admin Dashboard Tab System
 * Comprehensive tab navigation with state management, accessibility, and performance optimization
 */

class EnhancedAdminTabSystem {
    constructor(containerElement = '.admin-tabs-section') {
        // Handle both string selectors and HTML elements
        if (typeof containerElement === 'string') {
            this.container = document.querySelector(containerElement);
        } else if (containerElement instanceof HTMLElement) {
            this.container = containerElement;
        } else {
            this.container = null;
        }
        
        this.tabButtons = [];
        this.tabContents = [];
        this.activeTabId = null;
        this.transitionDuration = 400;
        this.isTransitioning = false;
        this.state = new Map();
        this.eventListeners = new Map();
        this.observers = new Map();
        
        // Configuration
        this.config = {
            enableTransitions: true,
            enableKeyboardNavigation: true,
            enableStateManagement: true,
            enableAccessibility: true,
            enableAnalytics: false,
            transitionDuration: 400,
            autoSave: true,
            debugMode: false
        };
        
        this.init();
    }

    init() {
        if (!this.container) {
            this.log('Container not found', 'error');
            return;
        }

        this.setupElements();
        this.bindEvents();
        this.setInitialTab();
        this.setupKeyboardNavigation();
        this.setupAccessibility();
        this.setupStateManagement();
        this.setupPerformanceOptimizations();
        
        this.log('Enhanced Admin Tab System initialized');
    }

    setupElements() {
        this.tabButtons = Array.from(this.container.querySelectorAll('.tab-btn'));
        this.tabContents = Array.from(this.container.querySelectorAll('.tab-content'));

        if (this.tabButtons.length === 0 || this.tabContents.length === 0) {
            this.log('No tabs or content found', 'warn');
            return;
        }

        // Ensure each tab button has proper attributes
        this.tabButtons.forEach((btn, index) => {
            if (!btn.dataset.tab) {
                btn.dataset.tab = `tab-${index}`;
            }
            btn.setAttribute('data-tab-index', index);
        });

        // Ensure each tab content has matching ID
        this.tabContents.forEach((content, index) => {
            if (!content.id) {
                const tabId = this.tabButtons[index]?.dataset.tab || `tab-${index}`;
                content.id = tabId;
            }
            content.setAttribute('data-content-index', index);
        });
    }

    bindEvents() {
        // Tab button click events with delegation
        this.addEventListener(this.container, 'click', (e) => {
            const tabButton = e.target.closest('.tab-btn');
            if (tabButton && !tabButton.classList.contains('loading')) {
                e.preventDefault();
                const tabId = tabButton.dataset.tab;
                this.switchTab(tabId, tabButton);
            }
        });

        // Enhanced hover effects
        this.tabButtons.forEach(button => {
            this.addEventListener(button, 'mouseenter', () => {
                if (!button.classList.contains('active') && !this.isTransitioning) {
                    this.preloadTabContent(button.dataset.tab);
                }
            });
        });

        // Window resize handling
        this.addEventListener(window, 'resize', this.debounce(() => {
            this.handleResize();
        }, 250));

        // Hash change handling
        this.addEventListener(window, 'hashchange', () => {
            this.handleHashChange();
        });

        // Visibility change handling
        this.addEventListener(document, 'visibilitychange', () => {
            if (!document.hidden && this.config.autoSave) {
                this.saveState();
            }
        });

        // Before unload handling
        this.addEventListener(window, 'beforeunload', () => {
            this.saveState();
            this.cleanup();
        });
    }

    setupKeyboardNavigation() {
        if (!this.config.enableKeyboardNavigation) return;

        this.tabButtons.forEach((button, index) => {
            this.addEventListener(button, 'keydown', (e) => {
                let targetIndex = index;

                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        targetIndex = index > 0 ? index - 1 : this.tabButtons.length - 1;
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        targetIndex = index < this.tabButtons.length - 1 ? index + 1 : 0;
                        break;
                    case 'Home':
                        e.preventDefault();
                        targetIndex = 0;
                        break;
                    case 'End':
                        e.preventDefault();
                        targetIndex = this.tabButtons.length - 1;
                        break;
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        this.switchTab(button.dataset.tab, button);
                        return;
                    default:
                        return;
                }

                this.focusTab(targetIndex);
            });
        });
    }

    setupAccessibility() {
        if (!this.config.enableAccessibility) return;

        const tabsNav = this.container.querySelector('.tabs-nav');
        if (tabsNav) {
            tabsNav.setAttribute('role', 'tablist');
            tabsNav.setAttribute('aria-label', 'Panel de administración');
        }

        this.tabButtons.forEach((button, index) => {
            const tabId = button.dataset.tab;
            const contentId = `${tabId}-content`;
            
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-controls', contentId);
            button.setAttribute('aria-selected', 'false');
            button.setAttribute('tabindex', index === 0 ? '0' : '-1');
            button.id = `${tabId}-tab`;

            const content = document.getElementById(tabId);
            if (content) {
                content.setAttribute('role', 'tabpanel');
                content.setAttribute('aria-labelledby', button.id);
                content.setAttribute('tabindex', '0');
                content.id = contentId;
            }
        });
    }

    setupStateManagement() {
        if (!this.config.enableStateManagement) return;

        // Load saved state
        this.loadState();

        // Set up auto-save
        if (this.config.autoSave) {
            setInterval(() => {
                this.saveState();
            }, 30000); // Save every 30 seconds
        }
    }

    setupPerformanceOptimizations() {
        // Intersection Observer for lazy loading
        this.setupIntersectionObserver();
        
        // Mutation Observer for dynamic content
        this.setupMutationObserver();
        
        // Performance monitoring
        this.setupPerformanceMonitoring();
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const tabContent = entry.target;
                    this.loadTabContent(tabContent.id);
                }
            });
        }, { threshold: 0.1 });

        this.tabContents.forEach(content => {
            observer.observe(content);
        });

        this.observers.set('intersection', observer);
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    this.handleDynamicContent(mutation);
                }
            });
        });

        observer.observe(this.container, {
            childList: true,
            subtree: true
        });

        this.observers.set('mutation', observer);
    }

    setupPerformanceMonitoring() {
        this.performanceMetrics = {
            tabSwitches: 0,
            averageSwitchTime: 0,
            totalSwitchTime: 0
        };
    }

    async switchTab(tabId, buttonElement, animate = true) {
        if (this.isTransitioning || this.activeTabId === tabId) {
            return Promise.resolve();
        }

        const startTime = performance.now();
        this.isTransitioning = true;

        try {
            const targetContent = document.getElementById(tabId);
            const targetButton = buttonElement || this.tabButtons.find(btn => btn.dataset.tab === tabId);

            if (!targetContent || !targetButton) {
                throw new Error(`Tab "${tabId}" not found`);
            }

            // Show loading state
            this.setLoadingState(targetButton, true);

            // Update URL hash
            this.updateURL(tabId);

            // Hide current content
            if (animate && this.activeTabId && this.config.enableTransitions) {
                await this.hideCurrentTab();
            }

            // Update button states
            this.updateButtonStates(targetButton);

            // Show new content
            await this.showTab(targetContent, animate);

            // Load tab-specific content
            await this.loadTabContent(tabId);

            // Update state
            this.activeTabId = tabId;
            this.state.set('activeTab', tabId);

            // Dispatch events
            this.dispatchTabChangeEvent(tabId, targetContent);

            // Focus management
            this.manageFocus(targetButton, targetContent);

            // Analytics
            this.trackTabSwitch(tabId);

            // Performance metrics
            const endTime = performance.now();
            this.updatePerformanceMetrics(endTime - startTime);

        } catch (error) {
            this.log(`Error switching tabs: ${error.message}`, 'error');
            this.handleError(error);
        } finally {
            this.isTransitioning = false;
            if (buttonElement) {
                this.setLoadingState(buttonElement, false);
            }
        }
    }

    async hideCurrentTab() {
        const currentContent = this.tabContents.find(content => 
            content.classList.contains('active')
        );
        
        if (currentContent) {
            currentContent.classList.add('transitioning');
            
            return new Promise(resolve => {
                setTimeout(() => {
                    currentContent.classList.remove('active', 'transitioning');
                    resolve();
                }, this.transitionDuration / 2);
            });
        }
    }

    async showTab(content, animate) {
        if (animate && this.config.enableTransitions) {
            content.classList.add('transitioning');
            
            // Force reflow
            content.offsetHeight;
            
            content.classList.add('active');
            
            return new Promise(resolve => {
                setTimeout(() => {
                    content.classList.remove('transitioning');
                    resolve();
                }, this.transitionDuration);
            });
        } else {
            content.classList.add('active');
            return Promise.resolve();
        }
    }

    updateButtonStates(activeButton) {
        this.tabButtons.forEach(button => {
            const isActive = button === activeButton;
            
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive.toString());
            button.setAttribute('tabindex', isActive ? '0' : '-1');
        });
    }

    setLoadingState(button, loading) {
        button.classList.toggle('loading', loading);
        button.setAttribute('aria-busy', loading.toString());
    }

    async loadTabContent(tabId) {
        // Simulate content loading or trigger actual content loading
        if (typeof window.initializeTabContent === 'function') {
            const content = document.getElementById(tabId);
            await window.initializeTabContent(tabId, content);
        }
    }

    preloadTabContent(tabId) {
        // Preload content for better performance
        if (!this.state.has(`preloaded_${tabId}`)) {
            this.loadTabContent(tabId);
            this.state.set(`preloaded_${tabId}`, true);
        }
    }

    setInitialTab() {
        // Check URL hash first
        const hash = window.location.hash.substring(1);
        let initialTab = null;

        if (hash) {
            initialTab = this.tabButtons.find(btn => btn.dataset.tab === hash);
        }

        // Check saved state
        if (!initialTab && this.config.enableStateManagement) {
            const savedTab = this.state.get('activeTab');
            if (savedTab) {
                initialTab = this.tabButtons.find(btn => btn.dataset.tab === savedTab);
            }
        }

        // Fall back to first tab or active tab
        if (!initialTab) {
            initialTab = this.tabButtons.find(btn => btn.classList.contains('active')) || 
                       this.tabButtons[0];
        }

        if (initialTab) {
            this.switchTab(initialTab.dataset.tab, initialTab, false);
        }
    }

    focusTab(index) {
        if (index >= 0 && index < this.tabButtons.length) {
            this.tabButtons[index].focus();
        }
    }

    manageFocus(button, content) {
        if (document.activeElement === button) {
            // Move focus to content for screen readers
            setTimeout(() => {
                content.focus();
            }, 100);
        }
    }

    updateURL(tabId) {
        if (history.replaceState) {
            history.replaceState(null, null, `#${tabId}`);
        }
    }

    handleHashChange() {
        const hash = window.location.hash.substring(1);
        if (hash && hash !== this.activeTabId) {
            const targetButton = this.tabButtons.find(btn => btn.dataset.tab === hash);
            if (targetButton) {
                this.switchTab(hash, targetButton);
            }
        }
    }

    handleResize() {
        const isMobile = window.innerWidth < 768;
        const tabsNav = this.container.querySelector('.tabs-nav');
        
        if (tabsNav) {
            tabsNav.classList.toggle('mobile', isMobile);
        }

        // Ensure active tab is visible on mobile
        if (isMobile) {
            const activeButton = this.tabButtons.find(btn => btn.classList.contains('active'));
            if (activeButton) {
                activeButton.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }

    handleDynamicContent(mutation) {
        // Handle dynamically added tabs or content
        if (mutation.addedNodes.length > 0) {
            const hasNewTabs = Array.from(mutation.addedNodes).some(node => 
                node.nodeType === 1 && (
                    node.classList?.contains('tab-btn') || 
                    node.classList?.contains('tab-content')
                )
            );
            
            if (hasNewTabs) {
                this.reinitialize();
            }
        }
    }

    dispatchTabChangeEvent(tabId, content) {
        const event = new CustomEvent('tabchange', {
            detail: {
                tabId,
                content,
                timestamp: Date.now(),
                previousTab: this.activeTabId
            },
            bubbles: true
        });
        
        this.container.dispatchEvent(event);
    }

    trackTabSwitch(tabId) {
        if (this.config.enableAnalytics) {
            // Analytics tracking
            if (typeof gtag !== 'undefined') {
                gtag('event', 'tab_switch', {
                    tab_id: tabId,
                    timestamp: Date.now()
                });
            }
        }
    }

    updatePerformanceMetrics(switchTime) {
        this.performanceMetrics.tabSwitches++;
        this.performanceMetrics.totalSwitchTime += switchTime;
        this.performanceMetrics.averageSwitchTime = 
            this.performanceMetrics.totalSwitchTime / this.performanceMetrics.tabSwitches;
    }

    saveState() {
        if (!this.config.enableStateManagement) return;

        const state = {
            activeTab: this.activeTabId,
            timestamp: Date.now(),
            tabStates: {}
        };

        // Save individual tab states
        this.tabContents.forEach(content => {
            const forms = content.querySelectorAll('form');
            forms.forEach(form => {
                const formData = new FormData(form);
                const formState = {};
                for (const [key, value] of formData.entries()) {
                    formState[key] = value;
                }
                state.tabStates[content.id] = formState;
            });
        });

        try {
            sessionStorage.setItem('adminTabsState', JSON.stringify(state));
        } catch (error) {
            this.log('Failed to save state', 'error');
        }
    }

    loadState() {
        if (!this.config.enableStateManagement) return;

        try {
            const savedState = sessionStorage.getItem('adminTabsState');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                // Restore active tab
                if (state.activeTab) {
                    this.state.set('activeTab', state.activeTab);
                }

                // Restore form states
                if (state.tabStates) {
                    Object.entries(state.tabStates).forEach(([contentId, formState]) => {
                        this.restoreFormState(contentId, formState);
                    });
                }
            }
        } catch (error) {
            this.log('Failed to load state', 'error');
        }
    }

    restoreFormState(contentId, formState) {
        const content = document.getElementById(contentId);
        if (!content) return;

        const forms = content.querySelectorAll('form');
        forms.forEach(form => {
            Object.entries(formState).forEach(([name, value]) => {
                const field = form.querySelector(`[name="${name}"]`);
                if (field) {
                    if (field.type === 'checkbox' || field.type === 'radio') {
                        field.checked = field.value === value;
                    } else {
                        field.value = value;
                    }
                }
            });
        });
    }

    handleError(error) {
        // Error handling and recovery
        this.log(`Tab system error: ${error.message}`, 'error');
        
        // Try to recover by resetting to first tab
        if (this.tabButtons.length > 0) {
            this.switchTab(this.tabButtons[0].dataset.tab, this.tabButtons[0], false);
        }
    }

    // Utility methods
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        
        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, []);
        }
        this.eventListeners.get(element).push({ event, handler });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    log(message, level = 'info') {
        if (this.config.debugMode) {
            console[level](`[AdminTabSystem] ${message}`);
        }
    }

    // Public API methods
    getActiveTab() {
        return this.activeTabId;
    }

    getAllTabs() {
        return this.tabButtons.map(btn => ({
            id: btn.dataset.tab,
            label: btn.textContent.trim(),
            element: btn,
            active: btn.classList.contains('active')
        }));
    }

    addTab(tabConfig) {
        const { id, label, content, icon, position } = tabConfig;
        
        // Create button
        const button = document.createElement('button');
        button.className = 'tab-btn';
        button.dataset.tab = id;
        button.innerHTML = `
            ${icon ? `<span class="tab-icon">${icon}</span>` : ''}
            <span class="tab-text">${label}</span>
        `;
        
        // Create content
        const contentElement = document.createElement('div');
        contentElement.className = 'tab-content';
        contentElement.id = id;
        contentElement.innerHTML = content;
        
        // Add to DOM
        const tabsNav = this.container.querySelector('.tabs-nav');
        const tabsContainer = this.container;
        
        if (tabsNav && tabsContainer) {
            if (position !== undefined && position < this.tabButtons.length) {
                tabsNav.insertBefore(button, this.tabButtons[position]);
                tabsContainer.insertBefore(contentElement, this.tabContents[position]);
            } else {
                tabsNav.appendChild(button);
                tabsContainer.appendChild(contentElement);
            }
            
            this.reinitialize();
        }
    }

    removeTab(tabId) {
        const button = this.tabButtons.find(btn => btn.dataset.tab === tabId);
        const content = document.getElementById(tabId);
        
        if (button && content) {
            // If removing active tab, switch to another tab first
            if (this.activeTabId === tabId) {
                const nextTab = this.tabButtons.find(btn => btn !== button);
                if (nextTab) {
                    this.switchTab(nextTab.dataset.tab, nextTab);
                }
            }
            
            button.remove();
            content.remove();
            this.reinitialize();
        }
    }

    reinitialize() {
        this.cleanup();
        this.init();
    }

    cleanup() {
        // Remove event listeners
        this.eventListeners.forEach((events, element) => {
            events.forEach(({ event, handler }) => {
                element.removeEventListener(event, handler);
            });
        });
        this.eventListeners.clear();

        // Disconnect observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();

        // Save state before cleanup
        this.saveState();
    }

    destroy() {
        this.cleanup();
        this.container = null;
        this.tabButtons = [];
        this.tabContents = [];
        this.state.clear();
    }

    // Performance monitoring
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    // Configuration updates
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.enableTransitions !== undefined) {
            this.transitionDuration = newConfig.transitionDuration || this.transitionDuration;
        }
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const tabSystems = [];
    
    document.querySelectorAll('.admin-tabs-section').forEach(container => {
        const tabSystem = new EnhancedAdminTabSystem(container);
        tabSystems.push(tabSystem);
    });

    // Store reference globally
    window.enhancedAdminTabSystems = tabSystems;

    // Enhanced event listeners for tab changes
    document.addEventListener('tabchange', (e) => {
        const { tabId, content, previousTab } = e.detail;
        
        // Trigger tab-specific initialization
        if (typeof window.initializeTabContent === 'function') {
            window.initializeTabContent(tabId, content);
        }
        
        // Update page title
        const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
        if (tabButton) {
            const tabLabel = tabButton.querySelector('.tab-text')?.textContent.trim() || 
                           tabButton.textContent.trim();
            document.title = `${tabLabel} - Grupo Scout Admin`;
        }

        // Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_view', {
                page_title: document.title,
                page_location: window.location.href
            });
        }

        // Accessibility announcement
        if (window.screenReader) {
            window.screenReader.announce(`Navegando a ${tabLabel}`, 'polite');
        }
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            const tabSystem = window.enhancedAdminTabSystems[0];
            if (!tabSystem) return;

            switch (e.key) {
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                    e.preventDefault();
                    const tabIndex = parseInt(e.key) - 1;
                    const tabs = tabSystem.getAllTabs();
                    if (tabs[tabIndex]) {
                        tabSystem.switchTab(tabs[tabIndex].id, tabs[tabIndex].element);
                    }
                    break;
            }
        }
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedAdminTabSystem;
}