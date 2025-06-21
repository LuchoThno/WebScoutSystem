/**
 * Performance Optimization Implementation
 * Comprehensive performance improvements for the Scout Group Management System
 */

// 1. DOM Query Optimization
class DOMCache {
    constructor() {
        this.cache = new Map();
        this.observers = new Map();
    }
    
    get(selector) {
        if (!this.cache.has(selector)) {
            const element = document.querySelector(selector);
            if (element) {
                this.cache.set(selector, element);
                this.observeElement(selector, element);
            }
        }
        return this.cache.get(selector) || null;
    }
    
    getAll(selector) {
        const cacheKey = `all:${selector}`;
        if (!this.cache.has(cacheKey)) {
            const elements = Array.from(document.querySelectorAll(selector));
            this.cache.set(cacheKey, elements);
        }
        return this.cache.get(cacheKey) || [];
    }
    
    observeElement(selector, element) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Clear cache if DOM structure changes
                    this.invalidate(selector);
                }
            });
        });
        
        observer.observe(element.parentNode || document.body, {
            childList: true,
            subtree: true
        });
        
        this.observers.set(selector, observer);
    }
    
    invalidate(selector) {
        this.cache.delete(selector);
        this.cache.delete(`all:${selector}`);
        
        const observer = this.observers.get(selector);
        if (observer) {
            observer.disconnect();
            this.observers.delete(selector);
        }
    }
    
    clear() {
        this.cache.clear();
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }
}

// 2. Event Delegation Manager
class EventManager {
    constructor() {
        this.delegatedEvents = new Map();
        this.directEvents = new WeakMap();
    }
    
    delegate(container, eventType, selector, handler) {
        const containerEl = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
            
        if (!containerEl) return;
        
        const key = `${eventType}:${selector}`;
        
        if (!this.delegatedEvents.has(key)) {
            const delegatedHandler = (e) => {
                const target = e.target.closest(selector);
                if (target && containerEl.contains(target)) {
                    handler.call(target, e);
                }
            };
            
            containerEl.addEventListener(eventType, delegatedHandler);
            this.delegatedEvents.set(key, {
                container: containerEl,
                handler: delegatedHandler,
                eventType
            });
        }
    }
    
    on(element, eventType, handler, options = {}) {
        const el = typeof element === 'string' 
            ? document.querySelector(element) 
            : element;
            
        if (!el) return;
        
        el.addEventListener(eventType, handler, options);
        
        // Store for cleanup
        if (!this.directEvents.has(el)) {
            this.directEvents.set(el, []);
        }
        this.directEvents.get(el).push({ eventType, handler, options });
    }
    
    off(element, eventType, handler) {
        const el = typeof element === 'string' 
            ? document.querySelector(element) 
            : element;
            
        if (!el) return;
        
        el.removeEventListener(eventType, handler);
        
        // Remove from tracking
        const events = this.directEvents.get(el);
        if (events) {
            const index = events.findIndex(e => 
                e.eventType === eventType && e.handler === handler
            );
            if (index > -1) {
                events.splice(index, 1);
            }
        }
    }
    
    cleanup(element) {
        const el = typeof element === 'string' 
            ? document.querySelector(element) 
            : element;
            
        if (!el) return;
        
        const events = this.directEvents.get(el);
        if (events) {
            events.forEach(({ eventType, handler }) => {
                el.removeEventListener(eventType, handler);
            });
            this.directEvents.delete(el);
        }
    }
    
    destroy() {
        // Clean up delegated events
        this.delegatedEvents.forEach(({ container, handler, eventType }) => {
            container.removeEventListener(eventType, handler);
        });
        this.delegatedEvents.clear();
        
        // Direct events will be cleaned up by WeakMap when elements are removed
    }
}

// 3. Lazy Loading Implementation
class LazyLoader {
    constructor(options = {}) {
        this.options = {
            rootMargin: '50px',
            threshold: 0.1,
            ...options
        };
        
        this.observer = new IntersectionObserver(
            this.handleIntersection.bind(this),
            this.options
        );
        
        this.loadedElements = new WeakSet();
    }
    
    observe(element, loadCallback) {
        if (this.loadedElements.has(element)) return;
        
        element.dataset.loadCallback = this.registerCallback(loadCallback);
        this.observer.observe(element);
    }
    
    registerCallback(callback) {
        const id = Math.random().toString(36).substr(2, 9);
        window[`lazyCallback_${id}`] = callback;
        return id;
    }
    
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const callbackId = element.dataset.loadCallback;
                
                if (callbackId && window[`lazyCallback_${callbackId}`]) {
                    window[`lazyCallback_${callbackId}`](element);
                    delete window[`lazyCallback_${callbackId}`];
                    this.loadedElements.add(element);
                    this.observer.unobserve(element);
                }
            }
        });
    }
    
    loadImages(container = document) {
        const images = container.querySelectorAll('img[data-src]');
        
        images.forEach(img => {
            this.observe(img, (element) => {
                element.src = element.dataset.src;
                element.removeAttribute('data-src');
                element.classList.add('loaded');
            });
        });
    }
    
    loadContent(selector, loadFunction) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            this.observe(element, loadFunction);
        });
    }
    
    destroy() {
        this.observer.disconnect();
    }
}

// 4. Memory Management
class MemoryManager {
    constructor() {
        this.cleanupTasks = [];
        this.memoryThreshold = 50 * 1024 * 1024; // 50MB
        this.checkInterval = 30000; // 30 seconds
        
        this.startMonitoring();
    }
    
    startMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                this.checkMemoryUsage();
            }, this.checkInterval);
        }
    }
    
    checkMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            
            if (memory.usedJSHeapSize > this.memoryThreshold) {
                console.warn('High memory usage detected, running cleanup...');
                this.runCleanup();
            }
        }
    }
    
    addCleanupTask(task) {
        this.cleanupTasks.push(task);
    }
    
    runCleanup() {
        this.cleanupTasks.forEach(task => {
            try {
                task();
            } catch (error) {
                console.error('Cleanup task failed:', error);
            }
        });
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }
    
    clearCache(cache) {
        if (cache && typeof cache.clear === 'function') {
            cache.clear();
        }
    }
    
    removeUnusedEventListeners() {
        // This would need to be implemented based on your specific event tracking
        console.log('Removing unused event listeners...');
    }
}

// 5. Resource Preloader
class ResourcePreloader {
    constructor() {
        this.preloadedResources = new Set();
        this.preloadQueue = [];
        this.maxConcurrent = 3;
        this.currentLoading = 0;
    }
    
    preloadCSS(href) {
        if (this.preloadedResources.has(href)) return Promise.resolve();
        
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = href;
            
            link.onload = () => {
                this.preloadedResources.add(href);
                resolve();
            };
            
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }
    
    preloadJS(src) {
        if (this.preloadedResources.has(src)) return Promise.resolve();
        
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'script';
            link.href = src;
            
            link.onload = () => {
                this.preloadedResources.add(src);
                resolve();
            };
            
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }
    
    preloadImage(src) {
        if (this.preloadedResources.has(src)) return Promise.resolve();
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.preloadedResources.add(src);
                resolve();
            };
            img.onerror = reject;
            img.src = src;
        });
    }
    
    async preloadResources(resources) {
        const promises = resources.map(resource => {
            switch (resource.type) {
                case 'css':
                    return this.preloadCSS(resource.url);
                case 'js':
                    return this.preloadJS(resource.url);
                case 'image':
                    return this.preloadImage(resource.url);
                default:
                    return Promise.resolve();
            }
        });
        
        return Promise.allSettled(promises);
    }
}

// 6. Performance Monitor
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoad: 0,
            domReady: 0,
            firstPaint: 0,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0
        };
        
        this.measurePageLoad();
        this.measurePaintMetrics();
        this.measureLCP();
    }
    
    measurePageLoad() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            this.metrics.pageLoad = navigation.loadEventEnd - navigation.fetchStart;
            this.metrics.domReady = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        });
    }
    
    measurePaintMetrics() {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.name === 'first-paint') {
                    this.metrics.firstPaint = entry.startTime;
                } else if (entry.name === 'first-contentful-paint') {
                    this.metrics.firstContentfulPaint = entry.startTime;
                }
            });
        });
        
        observer.observe({ entryTypes: ['paint'] });
    }
    
    measureLCP() {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.metrics.largestContentfulPaint = lastEntry.startTime;
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
    
    getMetrics() {
        return { ...this.metrics };
    }
    
    logMetrics() {
        console.table(this.metrics);
    }
    
    sendMetrics(endpoint) {
        if (navigator.sendBeacon) {
            navigator.sendBeacon(endpoint, JSON.stringify(this.metrics));
        }
    }
}

// 7. Optimized Utils Replacement
class OptimizedUtils {
    constructor() {
        this.formatters = new Map();
        this.validators = new Map();
        this.debounceTimers = new Map();
    }
    
    // Cached date formatter
    formatDate(date, locale = 'es-ES', options = {}) {
        const key = `${locale}-${JSON.stringify(options)}`;
        
        if (!this.formatters.has(key)) {
            this.formatters.set(key, new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                ...options
            }));
        }
        
        return this.formatters.get(key).format(new Date(date));
    }
    
    // Optimized debounce with cleanup
    debounce(func, wait, immediate = false) {
        const key = func.toString();
        
        return (...args) => {
            const later = () => {
                this.debounceTimers.delete(key);
                if (!immediate) func.apply(this, args);
            };
            
            const callNow = immediate && !this.debounceTimers.has(key);
            
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            this.debounceTimers.set(key, setTimeout(later, wait));
            
            if (callNow) func.apply(this, args);
        };
    }
    
    // Batch DOM updates
    batchDOMUpdates(updates) {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                updates.forEach(update => update());
                resolve();
            });
        });
    }
    
    // Efficient array operations
    chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    // Virtual scrolling helper
    createVirtualList(container, items, renderItem, itemHeight = 50) {
        const containerHeight = container.clientHeight;
        const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
        let scrollTop = 0;
        
        const render = () => {
            const startIndex = Math.floor(scrollTop / itemHeight);
            const endIndex = Math.min(startIndex + visibleCount, items.length);
            
            const visibleItems = items.slice(startIndex, endIndex);
            const offsetY = startIndex * itemHeight;
            
            container.innerHTML = '';
            container.style.height = `${items.length * itemHeight}px`;
            container.style.position = 'relative';
            
            const viewport = document.createElement('div');
            viewport.style.transform = `translateY(${offsetY}px)`;
            
            visibleItems.forEach((item, index) => {
                const element = renderItem(item, startIndex + index);
                viewport.appendChild(element);
            });
            
            container.appendChild(viewport);
        };
        
        container.addEventListener('scroll', () => {
            scrollTop = container.scrollTop;
            requestAnimationFrame(render);
        });
        
        render();
    }
}

// Initialize performance optimizations
document.addEventListener('DOMContentLoaded', () => {
    // Initialize global performance tools
    window.domCache = new DOMCache();
    window.eventManager = new EventManager();
    window.lazyLoader = new LazyLoader();
    window.memoryManager = new MemoryManager();
    window.resourcePreloader = new ResourcePreloader();
    window.performanceMonitor = new PerformanceMonitor();
    window.optimizedUtils = new OptimizedUtils();
    
    // Set up cleanup tasks
    window.memoryManager.addCleanupTask(() => {
        window.domCache.clear();
    });
    
    // Preload critical resources
    const criticalResources = [
        { type: 'css', url: '/css/components.css' },
        { type: 'css', url: '/css/admin-tabs.css' },
        { type: 'js', url: '/js/admin-tabs.js' }
    ];
    
    window.resourcePreloader.preloadResources(criticalResources);
    
    // Set up lazy loading for images
    window.lazyLoader.loadImages();
    
    // Log performance metrics after page load
    window.addEventListener('load', () => {
        setTimeout(() => {
            window.performanceMonitor.logMetrics();
        }, 1000);
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        window.eventManager.destroy();
        window.lazyLoader.destroy();
        window.memoryManager.runCleanup();
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DOMCache,
        EventManager,
        LazyLoader,
        MemoryManager,
        ResourcePreloader,
        PerformanceMonitor,
        OptimizedUtils
    };
}