/**
 * STORAGE.JS - LocalStorage Wrapper
 * Handles saving/loading game data, settings, and AI learning data
 */

export class Storage {
    /**
     * Save data to localStorage
     * @param {string} key - Storage key
     * @param {any} data - Data to save
     */
    static save(key, data) {
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(key, jsonData);
            return true;
        } catch (error) {
            console.error(`Storage save error for key "${key}":`, error);
            return false;
        }
    }

    /**
     * Load data from localStorage
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if key doesn't exist
     * @returns {any} Loaded data or default value
     */
    static load(key, defaultValue = null) {
        try {
            const jsonData = localStorage.getItem(key);
            if (jsonData === null) {
                return defaultValue;
            }
            return JSON.parse(jsonData);
        } catch (error) {
            console.error(`Storage load error for key "${key}":`, error);
            return defaultValue;
        }
    }

    /**
     * Remove data from localStorage
     * @param {string} key - Storage key
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Storage remove error for key "${key}":`, error);
            return false;
        }
    }

    /**
     * Clear all storage
     */
    static clearAll() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }

    /**
     * Check if key exists
     * @param {string} key - Storage key
     * @returns {boolean}
     */
    static has(key) {
        return localStorage.getItem(key) !== null;
    }

    /**
     * Get storage size in bytes
     * @returns {number} Approximate size in bytes
     */
    static getSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    }
}

export default Storage;
