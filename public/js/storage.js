// Storage utility for managing localStorage with prefix
const storage = {
    prefix: 'grupo_scout_',

    get: (key) => {
        try {
            const item = localStorage.getItem(storage.prefix + key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error getting data from localStorage:', error);
            return null;
        }
    },

    set: (key, value) => {
        try {
            localStorage.setItem(storage.prefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error setting data in localStorage:', error);
            if (error.name === 'QuotaExceededError') {
                if (typeof window.utils !== 'undefined' && window.utils.showAlert) {
                    window.utils.showAlert('Error: Almacenamiento lleno. Por favor, libere espacio.', 'error');
                } else {
                    console.warn('QuotaExceededError: localStorage is full, but utils.showAlert is not available.');
                    alert('Error: Almacenamiento lleno. Por favor, libere espacio.');
                }
            }
            return false;
        }
    },

    remove: (key) => {
        try {
            localStorage.removeItem(storage.prefix + key);
            return true;
        } catch (error) {
            console.error('Error removing data from localStorage:', error);
            return false;
        }
    },

    clear: () => {
        try {
            Object.keys(localStorage)
                .filter(key => key.startsWith(storage.prefix))
                .forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    },

    getSize: () => {
        let size = 0;
        try {
            Object.keys(localStorage)
                .filter(key => key.startsWith(storage.prefix))
                .forEach(key => {
                    size += localStorage.getItem(key).length;
                });
            return (size / 1024).toFixed(2) + ' KB';
        } catch (error) {
            console.error('Error calculating storage size:', error);
            return '0 KB';
        }
    },

    exists: (key) => {
        return localStorage.getItem(storage.prefix + key) !== null;
    },

    getAllKeys: () => {
        try {
            return Object.keys(localStorage)
                .filter(key => key.startsWith(storage.prefix))
                .map(key => key.replace(storage.prefix, ''));
        } catch (error) {
            console.error('Error getting all keys:', error);
            return [];
        }
    },

    backup: () => {
        try {
            const data = {};
            Object.keys(localStorage)
                .filter(key => key.startsWith(storage.prefix))
                .forEach(key => {
                    data[key] = localStorage.getItem(key);
                });
            return JSON.stringify(data);
        } catch (error) {
            console.error('Error creating backup:', error);
            return null;
        }
    },

    restore: (backupData) => {
        try {
            const data = JSON.parse(backupData);
            Object.keys(data).forEach(key => {
                localStorage.setItem(key, data[key]);
            });
            return true;
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    }
};

// Make available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.storage = storage;
}

export default storage