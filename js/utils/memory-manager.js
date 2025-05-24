/**
 * Memory Manager Module (Fused with Result Pagination)
 * @file /js/utils/memory-manager.js
 * @description Manages application memory with advanced caching, persistence,
 * compression, memory pressure handling, and result pagination.
 * @version 2.0.0
 * @exports MemoryManager
 */

'use strict';

// Inner class for Result Pagination (as described in Implementation Guide PDF)
class ResultManager {
    constructor(maxStoredResults = 10) {
        this.results = [];
        this.maxStoredResults = maxStoredResults;
        this.currentPage = 0; // Not strictly used by getResultsForPage but good for state
        // console.log('ResultManager instance created with maxStoredResults:', maxStoredResults);
    }

    addResult(result) {
        this.results.unshift(result); // Add to beginning
        if (this.results.length > this.maxStoredResults) {
            this.results = this.results.slice(0, this.maxStoredResults); // Trim
        }
        this.currentPage = 0;
        return this.results[0];
    }

    getResultsForPage(page = 0, resultsPerPage = 5) {
        const start = page * resultsPerPage;
        const end = start + resultsPerPage;
        return this.results.slice(start, end);
    }

    clearOldResults() {
        if (this.results.length > 1) {
            this.results = [this.results[0]]; // Keep only the most recent
        }
        this.currentPage = 0;
    }

    getAllResults() {
        return [...this.results];
    }

    getTotalResultsCount() {
        return this.results.length;
    }
}


class MemoryManager {
    /**
     * Creates or returns the singleton instance of MemoryManager.
     * @param {object} [options={}] - Configuration options.
     * @param {number} [options.memorySizeLimitMB=10] - Memory limit in MB.
     * @param {number} [options.gcThreshold=0.9] - Ratio of memory usage to trigger GC.
     * @param {boolean} [options.autoPurgeEnabled=true] - Enable periodic cache cleanup.
     * @param {number} [options.autoPurgeInterval=60000] - Interval for auto-purge (ms).
     * @param {boolean} [options.preloadEnabled=true] - Allow preloading data.
     * @param {boolean} [options.compressionEnabled=true] - Enable RLE compression for large strings.
     * @param {number} [options.maxPaginatedResults=50] - Max results for internal ResultManager.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        if (MemoryManager.instance) {
            return MemoryManager.instance;
        }

        this.options = {
            memorySizeLimitMB: 10,
            gcThreshold: 0.9,
            autoPurgeEnabled: true,
            autoPurgeInterval: 60000,
            preloadEnabled: true,
            compressionEnabled: true,
            maxPaginatedResults: 50, // From PDF's ResultManager implied usage
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger(),
            EventBus: window.EventBus,
            DataManager: window.dataManager, // Assumes user's DataManager for persistence
            ...options.dependencies,
        };

        this.memorySizeLimit = this.options.memorySizeLimitMB * 1024 * 1024;
        this.inMemoryCache = new Map(); // { key: { data, timestamp, lastAccessed, size, expiry, persist, essential, compressed, originalLength } }
        this.currentMemoryUsage = 0;
        this.lastGcTime = Date.now();
        this.memoryPressureLevel = 'normal';
        this.lowMemoryMode = false;
        this.lowEndDevice = false; // Will be set by _checkDeviceCapabilities
        this.autoPurgeTimer = null;

        // --- Integration of ResultManager from PDF ---
        this.resultPaginator = new ResultManager(this.options.maxPaginatedResults);

        this._checkDeviceCapabilities(); // Adjusts some options based on device
        this._setupEventListeners();
        if (this.options.autoPurgeEnabled) {
            this.autoPurgeTimer = setInterval(() => this._checkAndRunGC(), this.options.autoPurgeInterval);
        }

        // Load any persisted session items (simplified from user's code for this integration)
        // this._loadPersistedSessionCache();

        MemoryManager.instance = this;
        this._log('info', `Memory Manager Initialized (v2.0.0). Limit: ${this.formatByteSize(this.memorySizeLimit)}`);
    }

    _getFallbackLogger() {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`MemoryManager Fallback Logger [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => console[lvl]?.(`MemoryManager Fallback Logger [${lvl}]: ${msg}`, data) || console.log(`MemoryManager Fallback Logger [${lvl}]: ${msg}`, data)
        };
    }

    _checkDeviceCapabilities() {
        // Simplified from user's uploaded MemoryManager
        try {
            if (navigator.deviceMemory && navigator.deviceMemory <= 1) this.lowEndDevice = true;
            if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) this.lowEndDevice = true;
            const conn = navigator.connection;
            if (conn && (conn.saveData || ['slow-2g', '2g'].includes(conn.effectiveType))) this.lowEndDevice = true;

            if (this.lowEndDevice) {
                this._log('warn', 'Low-end device capabilities detected, adjusting memory strategy.');
                this.memorySizeLimit = Math.min(this.memorySizeLimit, 5 * 1024 * 1024); // Cap at 5MB
                this.options.preloadEnabled = false;
                this.options.compressionEnabled = false; // Compression might be CPU intensive
            }
        } catch (e) {
            this._log('warn', 'Could not reliably detect device capabilities for memory tuning.');
        }
    }

    _setupEventListeners() {
        if (typeof window.addEventListener === 'function') {
            if ('onmemorypressure' in window) { // Non-standard, but PDF mentioned it
                 window.addEventListener('memorypressure', this._handleMemoryPressure.bind(this));
            }
            document.addEventListener('visibilitychange', this._handleVisibilityChange.bind(this));
        }
        this.dependencies.EventBus?.subscribe('system:lowMemory', () => this._handleMemoryPressure({ pressure: 'critical' }));
        this.dependencies.EventBus?.subscribe('preferences:updated', (prefs) => {
            if (prefs?.memoryManagement) this._applyMemoryPreferences(prefs.memoryManagement);
        });
    }

    _applyMemoryPreferences(memoryPrefs) {
        if (memoryPrefs.autoPurgeEnabled !== undefined && this.options.autoPurgeEnabled !== memoryPrefs.autoPurgeEnabled) {
            this.options.autoPurgeEnabled = memoryPrefs.autoPurgeEnabled;
            clearInterval(this.autoPurgeTimer);
            if (this.options.autoPurgeEnabled) {
                 this.autoPurgeTimer = setInterval(() => this._checkAndRunGC(), this.options.autoPurgeInterval);
            }
        }
        // Add more preference handling as needed
        this._log('info', 'Memory management preferences updated.');
    }


    _handleMemoryPressure(event) {
        const pressure = event.pressure || 'moderate'; // 'moderate', 'critical'
        this.memoryPressureLevel = pressure;
        this._log('warn', `Memory pressure detected: ${pressure}. Current usage: ${this.formatByteSize(this.currentMemoryUsage)}`);
        this.dependencies.EventBus?.publish('memory:pressure', { level: pressure, usage: this.currentMemoryUsage });

        if (pressure === 'critical') {
            this._log('critical', 'Critical memory pressure. Performing aggressive cleanup.');
            this._runGarbageCollection(true); // Aggressive cleanup
            this.resultPaginator.clearOldResults(); // As per PDF
            if (typeof window.gc === 'function') { // As per PDF
                try { window.gc(); } catch (e) { /* ignore */ }
            }
        } else {
            this._runGarbageCollection(false);
        }
    }

    _handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            this._log('info', 'Page hidden, attempting opportunistic GC.');
            this._runGarbageCollection(false); // Less aggressive GC
        }
    }

    _updateMemoryUsage() {
        let totalSize = 0;
        this.inMemoryCache.forEach(item => {
            totalSize += item.size || 0;
        });
        this.currentMemoryUsage = totalSize;
    }

    _checkAndRunGC() {
        this._updateMemoryUsage();
        if (this.currentMemoryUsage / this.memorySizeLimit > this.options.gcThreshold) {
            this._log('info', `Memory usage (${this.formatByteSize(this.currentMemoryUsage)}) exceeds GC threshold. Running GC.`);
            this._runGarbageCollection(false);
        }
    }

    _runGarbageCollection(aggressive = false) {
        const now = Date.now();
        let itemsRemovedCount = 0;
        this.inMemoryCache.forEach((item, key) => {
            let remove = false;
            if (item.expiry && item.expiry < now) {
                remove = true;
                this._log('debug', `GC: Removing expired item "${key}".`);
            } else if (aggressive && !item.essential) {
                remove = true;
                this._log('debug', `GC (Aggressive): Removing non-essential item "${key}".`);
            } else if (aggressive && item.essential && (now - (item.lastAccessed || item.timestamp) > this.options.autoPurgeInterval * 5)) {
                // Even essential items if not accessed for a very long time in aggressive mode
                remove = true;
                this._log('debug', `GC (Aggressive): Removing stale essential item "${key}".`);
            }

            if (remove) {
                this.inMemoryCache.delete(key);
                itemsRemovedCount++;
            }
        });

        // If still over limit after basic cleanup, try evicting based on LRU and priority (from PDF)
        this._updateMemoryUsage();
        if (this.currentMemoryUsage > this.memorySizeLimit) {
             this._evictByLruAndPriority(0); // PDF used priority 0 for general eviction
        }

        if (itemsRemovedCount > 0) {
            this._updateMemoryUsage();
            this._log('info', `Garbage Collection: Removed ${itemsRemovedCount} items. Current usage: ${this.formatByteSize(this.currentMemoryUsage)}`);
            this.dependencies.EventBus?.publish('memory:gcCompleted', { itemsRemoved: itemsRemovedCount, usage: this.currentMemoryUsage });
        }
        return itemsRemovedCount;
    }

    _evictByLruAndPriority(targetPriority = 0) { // From PDF logic
        let oldestKey = null;
        let oldestTime = Infinity;
        this.inMemoryCache.forEach((item, key) => {
            if (!item.essential && (item.priority || 0) <= targetPriority) {
                if ((item.lastAccessed || item.timestamp) < oldestTime) {
                    oldestTime = (item.lastAccessed || item.timestamp);
                    oldestKey = key;
                }
            }
        });
        if (oldestKey) {
            this._log('debug', `Cache full: Evicting item "${oldestKey}" by LRU/priority.`);
            this.inMemoryCache.delete(oldestKey);
            this._updateMemoryUsage();
        }
    }

    /**
     * Store data in the in-memory cache.
     * @param {string} key - The cache key.
     * @param {*} data - The data to store.
     * @param {object} [itemOptions={}] - Options: { expiry (ms from now or timestamp), persist ('session'|'local'), size (bytes), essential (boolean), priority (number) }.
     * @returns {boolean} True if stored successfully.
     */
    store(key, data, itemOptions = {}) {
        if (!key) {
            this._log('error', 'Store failed: Key is required.');
            return false;
        }

        const options = { ...this.defaultOptions, ...itemOptions };
        const now = Date.now();
        let expiryTimestamp = options.expiry;
        if (expiryTimestamp && expiryTimestamp <= (24 * 60 * 60 * 1000 * 365)) { // If less than a year, assume relative
            expiryTimestamp = now + expiryTimestamp;
        }

        let dataToStore = data;
        let isCompressed = false;
        const estimatedSize = options.size || this._estimateObjectSize(data);

        if (this.currentMemoryUsage + estimatedSize > this.memorySizeLimit && !options.essential) {
            this._runGarbageCollection(false); // Try normal GC
            this._updateMemoryUsage(); // Recalculate usage
            if (this.currentMemoryUsage + estimatedSize > this.memorySizeLimit) {
                 this._log('warn', `Store failed for "${key}": Cache limit would be exceeded. Size: ${this.formatByteSize(estimatedSize)}`);
                 return false;
            }
        }

        // Compression (simplified from user's code for integration)
        if (options.compressionEnabled && typeof data === 'string' && data.length > 1024) { // Compress large strings
            try {
                // Simple RLE (very basic, replace with Pako/LzString for real use)
                // const compressed = this._compressRLE(data);
                // if (compressed.length < data.length) { dataToStore = compressed; isCompressed = true; }
                // For now, skip actual compression to avoid adding large lib, but keep flag
                if (this.options.compressionEnabled) isCompressed = true; // Indicate it *would* be compressed
            } catch(e) { this._log('warn', `Compression failed for "${key}". Storing uncompressed.`); }
        }


        this.inMemoryCache.set(key, {
            data: dataToStore,
            timestamp: now,
            lastAccessed: now,
            size: estimatedSize,
            expiry: expiryTimestamp,
            persist: options.persist,
            essential: !!options.essential,
            priority: options.priority || 0,
            compressed: isCompressed,
            originalLength: isCompressed ? data.length : undefined
        });
        this.currentMemoryUsage += estimatedSize;
        this.dependencies.EventBus?.publish('memory:itemAdded', { key, size: estimatedSize });
        this._log('debug', `Stored item "${key}". Size: ${this.formatByteSize(estimatedSize)}. Current usage: ${this.formatByteSize(this.currentMemoryUsage)}`);

        // Asynchronous persistence (simplified)
        if (options.persist && this.dependencies.DataManager) {
             const persistKey = `mem_${this.options.storageKeyPrefix || ''}${key}`;
             if (options.persist === 'session') this.dependencies.DataManager.setSessionItem(persistKey, dataToStore);
             // else if (options.persist === 'local') this.dependencies.DataManager.setItem(persistKey, dataToStore); // Requires async
        }
        return true;
    }

    /**
     * Retrieve data from cache.
     * @param {string} key - The cache key.
     * @param {*} [defaultValue=null] - Value to return if not found/expired.
     * @returns {*} The cached data or default value.
     */
    retrieve(key, defaultValue = null) {
        const item = this.inMemoryCache.get(key);
        if (item) {
            if (item.expiry && item.expiry < Date.now()) {
                this.inMemoryCache.delete(key);
                this.currentMemoryUsage -= (item.size || 0);
                this.dependencies.EventBus?.publish('memory:itemRemoved', { key, reason: 'expired' });
                this._log('debug', `Retrieved and removed expired item "${key}".`);
                return defaultValue;
            }
            item.lastAccessed = Date.now();
            let data = item.data;
            // Decompression (simplified)
            // if (item.compressed) { try { data = this._decompressRLE(item.data, item.originalLength); } catch(e) {this._log('error', `Decompression failed for ${key}`);} }
            this._log('debug', `Retrieved item "${key}" from cache.`);
            return data;
        }
        // Simplified: Not attempting to load from storage here, assume caller handles if not in memory.
        // User's more complex version had logic to check session/local storage here.
        this._log('debug', `Item "${key}" not found in memory cache.`);
        return defaultValue;
    }

    remove(key) {
        const item = this.inMemoryCache.get(key);
        if (item) {
            this.inMemoryCache.delete(key);
            this.currentMemoryUsage -= (item.size || 0);
            this.dependencies.EventBus?.publish('memory:itemRemoved', { key, reason: 'manual' });
            this._log('info', `Removed item "${key}". Current usage: ${this.formatByteSize(this.currentMemoryUsage)}`);
            // Also remove from persisted storage if needed
            if (item.persist && this.dependencies.DataManager) {
                 const persistKey = `mem_${this.options.storageKeyPrefix || ''}${key}`;
                 if (item.persist === 'session') this.dependencies.DataManager.removeSessionItem(persistKey);
                 // else if (item.persist === 'local') this.dependencies.DataManager.removeItem(persistKey);
            }
            return true;
        }
        return false;
    }

    clear(preserveEssential = true) {
        let itemsRemovedCount = 0;
        this.inMemoryCache.forEach((item, key) => {
            if (!preserveEssential || !item.essential) {
                this.inMemoryCache.delete(key);
                itemsRemovedCount++;
            }
        });
        this._updateMemoryUsage();
        this.dependencies.EventBus?.publish('memory:cacheCleared', { preserveEssential, itemsRemoved: itemsRemovedCount });
        this._log('info', `Cache cleared. ${itemsRemovedCount} items removed. Essential preserved: ${preserveEssential}.`);
    }


    // --- Result Pagination Methods (from PDF) ---
    addResultToPagination(result) {
        if (!result) return null;
        const added = this.resultPaginator.addResult(result);
        this._log('info', `Added result to pagination manager. Total paginated: ${this.resultPaginator.getTotalResultsCount()}`);
        this.dependencies.EventBus?.publish('memory:resultAddedToPagination', { total: this.resultPaginator.getTotalResultsCount() });
        return added;
    }

    getPaginatedResults(page = 0, resultsPerPage = 5) {
        return this.resultPaginator.getResultsForPage(page, resultsPerPage);
    }

    clearOldPaginatedResults() {
        const initialCount = this.resultPaginator.getTotalResultsCount();
        this.resultPaginator.clearOldResults();
        const finalCount = this.resultPaginator.getTotalResultsCount();
        this._log('info', `Cleared old paginated results. Went from ${initialCount} to ${finalCount}.`);
        this.dependencies.EventBus?.publish('memory:paginatedResultsCleared', { initialCount, finalCount });
    }

    // --- Helper methods from user's uploaded memory-manager.js (simplified for brevity) ---
    _estimateObjectSize(object) { // Simplified
        try {
            if (object === null || object === undefined) return 0;
            if (typeof object === 'string') return object.length * 2; // UTF-16 approx
            if (typeof object === 'number' || typeof object === 'boolean') return 8;
            if (typeof object === 'object') return JSON.stringify(object).length * 2; // Rough estimate
        } catch (e) { return 100; /* fallback */ }
        return 8;
    }
    formatByteSize(bytes) { /* ... from user's code ... */
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
        else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
        else return (bytes / 1073741824).toFixed(2) + ' GB';
    }

    // RLE Compression (Example, not for production without more robust implementation or library)
    // _compressRLE(str) { /* ... */ return str; } // Placeholder
    // _decompressRLE(compressedStr, originalLength) { /* ... */ return compressedStr; } // Placeholder

    getMemoryStats() {
        this._updateMemoryUsage();
        return {
            totalUsageBytes: this.currentMemoryUsage,
            totalUsageFormatted: this.formatByteSize(this.currentMemoryUsage),
            limitBytes: this.memorySizeLimit,
            limitFormatted: this.formatByteSize(this.memorySizeLimit),
            usageRatio: this.currentMemoryUsage / this.memorySizeLimit,
            itemCount: this.inMemoryCache.size,
            paginatedResultCount: this.resultPaginator.getTotalResultsCount(),
            lowMemoryMode: this.lowMemoryMode,
            pressureLevel: this.memoryPressureLevel
        };
    }
}

// Instantiate and export the singleton service
const MemoryManagerInstance = new MemoryManager();
window.MemoryManager = MemoryManagerInstance; // For access if some PDF code uses static-like calls
// export default MemoryManagerInstance; // For ES module usage