/**
 * Simple Admin Tabs System
 * Provides basic tab functionality for admin pages
 */

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
});

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (!tabButtons.length || !tabContents.length) return;
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show target tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// Make available globally
window.initTabs = initTabs;

export default { initTabs };