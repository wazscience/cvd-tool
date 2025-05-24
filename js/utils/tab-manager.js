/**
 * Tab Manager Module
 * @file /js/utils/tab-manager.js
 * @description Manages the main tabbed interface, including display, ARIA,
 * deep linking, lazy-loading tab-specific modules, and state persistence.
 * @version 1.3.0
 * @exports TabManager
 */

'use strict';

class TabManager {
    /**
     * Creates an instance of TabManager.
     * @param {string|HTMLElement} containerElementOrSelector - The main container element or its CSS selector.
     * @param {object} [options={}] - Configuration options.
     * @param {string} [options.tabSelector='[role="tab"]'] - Selector for individual tab controls within the container.
     * @param {string} [options.panelSelector='[role="tabpanel"]'] - Selector for tab content panels within the container.
     * @param {string} [options.activeTabClass='active'] - CSS class for the active tab.
     * @param {string} [options.activePanelClass='active'] - CSS class for the active panel.
     * @param {string} [options.defaultTabId=null] - The ID of the tab button to show by default.
     * @param {boolean} [options.useUrlHash=true] - Whether to use URL fragments for deep linking.
     * @param {string} [options.sessionStorageKey='tabManager_lastActiveTab'] - Key for storing last active tab.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     * Expected: ErrorLogger, EventBus, ModuleLoader (optional for lazy loading).
     */
    constructor(containerElementOrSelector, options = {}) {
        this.container = typeof containerElementOrSelector === 'string'
            ? document.querySelector(containerElementOrSelector)
            : containerElementOrSelector;

        if (!this.container) {
            const errMsg = `TabManager: Container element not found for selector/element: ${containerElementOrSelector}.`;
            console.error(errMsg);
            // Attempt to use ErrorLogger if available, otherwise console
            const errorLogger = window.ErrorDetectionSystemInstance || { handleError: console.error, log: console.log };
            errorLogger.handleError?.(errMsg, 'TabManager-Init', 'critical');
            if (!window.ErrorDetectionSystemInstance) throw new Error(errMsg); // Critical if no logger
            return;
        }

        this.options = {
            tabSelector: '[role="tab"]', // Default selector for tab buttons
            panelSelector: '[role="tabpanel"]', // Default selector for tab panels
            activeTabClass: 'active',
            activePanelClass: 'active', // Can be the same as activeTabClass
            defaultTabId: null,
            useUrlHash: true,
            sessionStorageKey: `tabManager_lastActiveTab_${this.container.id || 'global'}`,
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger(),
            EventBus: window.EventBus,
            ModuleLoader: window.ModuleLoaderInstance,
            ...options.dependencies,
        };

        this.tabs = Array.from(this.container.querySelectorAll(this.options.tabSelector));
        this.panels = Array.from(this.container.querySelectorAll(this.options.panelSelector));
        this.loadedModules = new Set();
        this.currentActiveTabId = null;

        if (this.tabs.length === 0) {
            this._log('warn', `No tab elements found with selector: "${this.options.tabSelector}" in container "${containerElementOrSelector}". TabManager will not operate.`);
            return;
        }
        if (this.panels.length === 0) {
            this._log('warn', `No panel elements found with selector: "${this.options.panelSelector}" in container "${containerElementOrSelector}". Tab functionality may be impaired.`);
        }
        
        this._init();
        this._log('info', `Tab Manager Initialized (v1.3.0) for container: ${this.container.id || 'UnnamedContainer'}. Tabs: ${this.tabs.length}, Panels: ${this.panels.length}`);
    }

    _getFallbackLogger() {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`TabManager Fallback Logger [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => console[lvl]?.(`TabManager Fallback Logger [${lvl}]: ${msg}`, data) || console.log(`TabManager Fallback Logger [${lvl}]: ${msg}`, data)
        };
    }

    _init() {
        this.tabs.forEach((tab, index) => {
            if (!tab.id) {
                tab.id = `tabmanager-${this.container.id || 'gen'}-tab-${index}`;
                this._log('debug', `Assigned ID to tab: ${tab.id}`);
            }
            const panelId = tab.getAttribute('aria-controls') || tab.dataset.tabTarget?.replace(/^#/, '');
            if (panelId) {
                const panel = this.panels.find(p => p.id === panelId);
                if (panel) {
                    panel.setAttribute('aria-labelledby', tab.id);
                    if (!panel.id) panel.id = panelId; // Ensure panel has an ID
                } else {
                    this._log('warn', `Panel #${panelId} controlled by tab #${tab.id} not found.`);
                }
            } else {
                this._log('warn', `Tab #${tab.id} missing aria-controls or data-tab-target.`);
            }

            tab.addEventListener('click', (event) => {
                event.preventDefault();
                this.switchToTabById(tab.id);
            });
            tab.addEventListener('keydown', this._handleKeyboardNavigation.bind(this));
        });

        let initialTabId = null;
        if (this.options.useUrlHash && window.location.hash) {
            const hash = window.location.hash.substring(1);
            if (this.tabs.find(t => t.id === hash)) {
                initialTabId = hash;
                this._log('info', `Initial tab from URL hash: ${initialTabId}`);
            }
        }

        if (!initialTabId) {
            try {
                const storedTabId = sessionStorage.getItem(this.options.sessionStorageKey);
                if (storedTabId && this.tabs.find(t => t.id === storedTabId)) {
                    initialTabId = storedTabId;
                    this._log('info', `Restoring last active tab from session: ${initialTabId}`);
                }
            } catch (e) {
                this._log('warn', 'Failed to access sessionStorage for last active tab.', e);
            }
        }
        
        if (!initialTabId) {
            initialTabId = this.options.defaultTabId || this.tabs[0]?.id;
            if (initialTabId) this._log('info', `Using default/first tab: ${initialTabId}`);
        }

        if (initialTabId) {
            this.switchToTabById(initialTabId, false); // Don't update URL if it's from hash or session
        } else if (this.tabs.length > 0) {
            this.switchToTabById(this.tabs[0].id, false); // Fallback to first tab
        }

        if (this.options.useUrlHash) {
            window.addEventListener('hashchange', this._handleHashChange.bind(this), false);
        }
    }

    _handleKeyboardNavigation(event) {
        const currentTab = event.currentTarget;
        const currentIndex = this.tabs.indexOf(currentTab);
        let newIndex = currentIndex;
        let focusChanged = false;

        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown': // Common for vertical tab lists, though ours is horizontal
                newIndex = (currentIndex + 1) % this.tabs.length;
                focusChanged = true;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                newIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
                focusChanged = true;
                break;
            case 'Home':
                newIndex = 0;
                focusChanged = true;
                break;
            case 'End':
                newIndex = this.tabs.length - 1;
                focusChanged = true;
                break;
            default:
                return; 
        }

        if (focusChanged) {
            event.preventDefault();
            const newTab = this.tabs[newIndex];
            newTab.focus();
            // The click event listener on the tab will handle calling switchToTabById
            // If we want to switch directly on keydown without relying on focus then click:
            // this.switchToTabById(newTab.id);
        }
    }

    _handleHashChange() {
        const hash = window.location.hash.substring(1);
        if (hash && this.tabs.find(t => t.id === hash)) {
            if (hash !== this.currentActiveTabId) {
                this.switchToTabById(hash, false); // Hash changed, so don't update it again
            }
        } else if (!hash && this.currentActiveTabId) {
            // Hash was cleared, potentially go to default if current isn't default
            const defaultTab = this.options.defaultTabId || this.tabs[0]?.id;
            if (defaultTab && this.currentActiveTabId !== defaultTab) {
                 this.switchToTabById(defaultTab, false); // Switch to default, don't add hash
            }
        }
    }

    /**
     * Programmatically switches the view to the specified tab ID.
     * @param {string} tabId - The ID of the tab control to activate.
     * @param {boolean} [updateUrl=this.options.useUrlHash] - Whether to update the URL hash.
     */
    switchToTabById(tabId, updateUrl = this.options.useUrlHash) {
        const newActiveTab = this.tabs.find(tab => tab.id === tabId);

        if (!newActiveTab) {
            this._log('warn', `Tab with ID "${tabId}" not found.`);
            return;
        }
        if (newActiveTab.id === this.currentActiveTabId) {
            this._log('debug', `Tab "${tabId}" is already active. Ensuring module loaded.`);
            this._loadTabModule(newActiveTab); // Still attempt module load if not already
            return; 
        }

        const panelIdAttribute = newActiveTab.getAttribute('aria-controls') || newActiveTab.dataset.tabTarget;
        if (!panelIdAttribute) {
            this._log('error', `Tab #${newActiveTab.id} has no 'aria-controls' or 'data-tab-target'. Cannot find panel.`);
            return;
        }
        const newActivePanelId = panelIdAttribute.startsWith('#') ? panelIdAttribute.substring(1) : panelIdAttribute;
        const newActivePanel = this.panels.find(panel => panel.id === newActivePanelId);

        if (!newActivePanel) {
            this._log('error', `Panel with ID "${newActivePanelId}" for tab "${newActiveTab.id}" not found.`);
            return;
        }

        this.tabs.forEach(tab => {
            const isActive = tab.id === newActiveTab.id;
            tab.classList.toggle(this.options.activeTabClass, isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            tab.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        this.panels.forEach(panel => {
            const isActive = panel.id === newActivePanelId;
            panel.classList.toggle(this.options.activePanelClass, isActive);
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
            // For better transitions, manage display property if activePanelClass doesn't
            if (!this.options.activePanelClass.includes('d-block') && !this.options.activePanelClass.includes('display-block')) { // Example check
                panel.style.display = isActive ? '' : 'none';
            }
        });

        this.currentActiveTabId = newActiveTab.id;

        if (this.options.useUrlHash && updateUrl) {
            if (window.location.hash !== `#${newActiveTab.id}`) {
                // Using replaceState to avoid adding to browser history for programmatic changes
                // unless it's a user-driven hash change (which _handleHashChange handles by not calling updateUrl=true)
                window.history.replaceState(null, '', '#' + newActiveTab.id);
            }
        }
        
        try {
            sessionStorage.setItem(this.options.sessionStorageKey, newActiveTab.id);
        } catch (e) {
            this._log('warn', 'Failed to save last active tab to sessionStorage.', e);
        }

        this._loadTabModule(newActiveTab);

        this.dependencies.EventBus?.publish('tab:changed', {
            tabId: newActiveTab.id,
            panelId: newActivePanelId,
            modulePath: newActiveTab.dataset.modulePath,
            moduleName: newActiveTab.dataset.moduleName
        });

        this._log('info', `Switched to tab: ${newActiveTab.id}`);
    }

    _loadTabModule(tabElement) {
        const modulePath = tabElement?.dataset.modulePath;
        const moduleName = tabElement?.dataset.moduleName;
        const tabId = tabElement?.id;

        if (modulePath && moduleName && !this.loadedModules.has(tabId) && this.dependencies.ModuleLoader) {
            this._log('info', `Lazy-loading module for tab ${tabId}: "${moduleName}" from "${modulePath}"`);
            this.dependencies.LoadingManager?.show(`Loading ${moduleName}...`);
            this.dependencies.ModuleLoader.loadModule(modulePath, moduleName)
                .then((module) => {
                    this.loadedModules.add(tabId);
                    this._log('info', `Successfully loaded module "${moduleName}" for tab ${tabId}.`);
                    this.dependencies.EventBus?.publish('tab:moduleLoaded', { tabId, modulePath, moduleName, module });
                })
                .catch(err => {
                    this._log('error', `Failed to load module "${moduleName}" for tab ${tabId}:`, err);
                    this.dependencies.ErrorLogger?.handleError(
                        `Module load failed for ${moduleName} (${tabId})`,
                        'TabManager-ModuleLoad',
                        'error',
                        { path: modulePath, error: err }
                    );
                    // Optionally mark as failed to prevent retries, or allow ModuleLoader's retries
                })
                .finally(() => {
                    this.dependencies.LoadingManager?.hide();
                });
        } else if (modulePath && moduleName && this.loadedModules.has(tabId)) {
            this._log('debug', `Module for tab ${tabId} ("${moduleName}") already loaded.`);
        } else if (modulePath && !this.dependencies.ModuleLoader) {
            this._log('warn', `ModuleLoader not available. Cannot lazy-load module for tab ${tabId}.`);
        }
    }

    /**
     * Gets the ID of the currently active tab.
     * @returns {string|null} The ID of the active tab, or null if none.
     */
    getActiveTabId() {
        return this.currentActiveTabId;
    }

    _log(level, message, data) {
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `TabManager (${this.container.id || 'N/A'}): ${message}`;
        if (level === 'error' && logger?.handleError) {
             logger.handleError(data || message, 'TabManager', 'error', data ? { msg: message, ...data } : { msg: message });
        } else if (logger?.log) {
            logger.log(level, logMessage, data);
        } else {
            const consoleMethod = console[level] || console.log;
            if (data !== undefined) { consoleMethod(logMessage, data); } else { consoleMethod(logMessage); }
        }
    }
}

// Example instantiation (typically done in main.js after DOM load):
// const tabManagerInstance = new TabManager('nav.tabs', { // Assuming nav.tabs is the container for tab buttons AND panels are siblings or within
//     defaultTabId: 'tab-medication-button', // ID of the <button>
//     tabSelector: '.tab-button',      // Class for the <button> elements
//     panelSelector: '.tab-content',   // Class for the <div> panel elements
//     dependencies: {
//         EventBus: window.EventBus,
//         ErrorLogger: window.ErrorDetectionSystemInstance,
//         ModuleLoader: window.ModuleLoaderInstance
//     }
// });
// window.AppTabManager = tabManagerInstance; // Make instance globally available if needed by AppUI

// export default TabManager;
