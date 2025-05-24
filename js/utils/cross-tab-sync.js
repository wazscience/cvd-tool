/**
 * Cross-Tab Synchronization Service Module
 * @file /js/utils/cross-tab-sync.js (previously cross-tab-sync-module.js)
 * @description Facilitates real-time communication and data synchronization between
 * multiple browser tabs using BroadcastChannel. Features configurable event syncing,
 * payload transformation, and active tab tracking.
 * @version 2.3.0
 * @exports CrossTabSyncService
 */

'use strict';

class CrossTabSyncService {
    /**
     * Creates or returns the singleton instance of CrossTabSyncService.
     * @param {object} [options={}] - Configuration options.
     * @param {string} [options.channelName='cvd_toolkit_sync_channel_v2'] - Name for the BroadcastChannel.
     * @param {Array<string|object>} [options.syncableEvents=[]] - List of EventBus event names or config objects to synchronize.
     * Each object: { eventName: string, direction?: 'send'|'receive'|'both', transformSend?: (payload)=>any, transformReceive?: (payload)=>any }
     * @param {number} [options.heartbeatIntervalMs=5000] - Interval for sending heartbeats.
     * @param {number} [options.tabActivityTimeoutMs=15000] - How long a tab is considered active after last heartbeat.
     * @param {object} [options.dependencies={}] - Injected dependencies (EventBus, ErrorLogger).
     */
    constructor(options = {}) {
        if (CrossTabSyncService.instance) {
            return CrossTabSyncService.instance;
        }

        this.options = {
            channelName: 'cvd_toolkit_sync_channel_v2',
            syncableEvents: [ // Default syncable events (can be overridden)
                { eventName: 'data:imported', direction: 'both' },
                { eventName: 'data:exported', direction: 'both' },
                { eventName: 'settings:changed', direction: 'both' },
                { eventName: 'session:logout', direction: 'both' }, // Ensure all tabs log out
                { eventName: 'ui:themeChanged', direction: 'both' },
                { eventName: 'disclaimer:accepted', direction: 'both' }, // Sync acceptance across tabs
            ],
            heartbeatIntervalMs: 5000,
            tabActivityTimeoutMs: 15000, // 3 times heartbeat interval
            ...options,
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger(),
            EventBus: window.EventBus,
            ...options.dependencies,
        };

        this.tabId = this._generateTabId();
        this.broadcastChannel = null;
        this.activeTabs = new Map(); // Stores tabId -> lastSeenTimestamp
        this.heartbeatTimer = null;

        if (!this.dependencies.EventBus) {
            this._log('error', 'EventBus dependency not found. CrossTabSyncService cannot function effectively.');
            return; // Critical dependency
        }

        this._init();
        CrossTabSyncService.instance = this;
    }

    _getFallbackLogger() {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`CrossTabSync Fallback Logger [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => console[lvl]?.(`CrossTabSync Fallback Logger [${lvl}]: ${msg}`, data) || console.log(`CrossTabSync Fallback Logger [${lvl}]: ${msg}`, data)
        };
    }

    _generateTabId() {
        return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    _init() {
        if ('BroadcastChannel' in window) {
            try {
                this.broadcastChannel = new BroadcastChannel(this.options.channelName);
                this.broadcastChannel.onmessage = this._handleBroadcastMessage.bind(this);
                this.broadcastChannel.onmessageerror = this._handleBroadcastError.bind(this);
                this._log('info', `BroadcastChannel "${this.options.channelName}" initialized. Tab ID: ${this.tabId}`);
                this._setupEventBusListeners();
                this._startHeartbeat();
                this._cleanupInactiveTabsPeriodically(); // Start periodic cleanup
            } catch (error) {
                this._log('error', 'Failed to initialize BroadcastChannel.', error);
                this.broadcastChannel = null;
                this.dependencies.ErrorLogger.handleError('BroadcastChannel init failed', 'CrossTabSync-Init', 'critical', { error });
            }
        } else {
            this._log('warn', 'BroadcastChannel API not supported. Cross-tab sync disabled.');
        }
    }

    _setupEventBusListeners() {
        this.options.syncableEvents.forEach(eventConfig => {
            const eventName = typeof eventConfig === 'string' ? eventConfig : eventConfig.eventName;
            const direction = (typeof eventConfig === 'object' ? eventConfig.direction : 'both') || 'both';
            const transformSend = typeof eventConfig === 'object' ? eventConfig.transformSend : null;

            if (direction === 'send' || direction === 'both') {
                this.dependencies.EventBus.subscribe(eventName, (payload) => {
                    // IMPORTANT: Do not re-broadcast an event that was just received from another tab
                    if (payload && payload._isCrossTabOrigin) {
                        this._log('debug', `Skipping broadcast for event "${eventName}" as it originated from another tab.`);
                        return;
                    }
                    this._broadcastEvent(eventName, payload, transformSend);
                });
            }
        });
        this._log('info', `Listening for syncable events. Config count: ${this.options.syncableEvents.length}`);
    }

    _broadcastEvent(eventName, payload, transformSendFn) {
        if (!this.broadcastChannel) return;

        let finalPayload = payload;
        if (typeof transformSendFn === 'function') {
            try {
                finalPayload = transformSendFn(payload);
                if (finalPayload === undefined) { // Transform function might intentionally block send
                    this._log('debug', `TransformSend for "${eventName}" returned undefined. Broadcast skipped.`);
                    return;
                }
            } catch (error) {
                this._log('error', `Error in transformSend for event "${eventName}". Broadcasting original payload.`, { error, originalPayload: payload });
                // Decide: send original, send error marker, or send nothing? For now, send original.
            }
        }

        const message = {
            _sourceTabIdCTS: this.tabId, // Use a unique prefix to avoid conflict
            eventName: eventName,
            payload: finalPayload,
            timestamp: Date.now(),
            type: 'event_sync' // Differentiate from heartbeat
        };

        try {
            this.broadcastChannel.postMessage(message);
            this._log('debug', `Broadcasted event: ${eventName}`, { payloadSize: JSON.stringify(finalPayload)?.length });
        } catch (error) {
            this._log('error', `Failed to broadcast event: ${eventName}. Payload might be uncloneable.`, { error, payloadType: typeof finalPayload });
            this.dependencies.ErrorLogger.handleError(
                `Failed to post message to BroadcastChannel for event ${eventName}`,
                'CrossTabSync', 'error', { error }
            );
        }
    }

    _handleBroadcastMessage(event) {
        if (!event.data || typeof event.data !== 'object') {
            this._log('warn', 'Received malformed broadcast message (not an object).', { data: event.data });
            return;
        }

        const { _sourceTabIdCTS, eventName, payload, timestamp, type } = event.data;

        if (_sourceTabIdCTS === this.tabId) { // Ignore messages from self
            return;
        }

        if (type === 'heartbeat') {
            this._updateActiveTab(_sourceTabIdCTS, timestamp);
            return;
        }

        if (type === 'event_sync' && eventName) {
            this._log('info', `Received broadcast event: "${eventName}" from tab: ${_sourceTabIdCTS}`);

            let finalPayload = payload;
            const eventConfig = this.options.syncableEvents.find(ec => (typeof ec === 'string' ? ec : ec.eventName) === eventName);
            const direction = (typeof eventConfig === 'object' ? eventConfig.direction : 'both') || 'both';
            const transformReceiveFn = typeof eventConfig === 'object' ? eventConfig.transformReceive : null;

            if (direction === 'send') { // This tab is configured to only send this event
                this._log('debug', `Event "${eventName}" received but tab is send-only for it. Ignoring.`);
                return;
            }

            if (typeof transformReceiveFn === 'function') {
                try {
                    finalPayload = transformReceiveFn(payload);
                     if (finalPayload === undefined) { // Transform function might intentionally block local publish
                        this._log('debug', `TransformReceive for "${eventName}" returned undefined. Local publish skipped.`);
                        return;
                    }
                } catch (error) {
                    this._log('error', `Error in transformReceive for event "${eventName}". Publishing original payload.`, { error, originalPayload: payload });
                }
            }
            // Publish to local EventBus, marking it as originating from cross-tab
            this.dependencies.EventBus.publish(eventName, { ...finalPayload, _isCrossTabOrigin: true, _crossTabSourceId: _sourceTabIdCTS });
        } else {
            this._log('warn', 'Received broadcast message with unknown type or missing eventName.', event.data);
        }
    }

    _handleBroadcastError(event) {
        this._log('error', 'BroadcastChannel onmessageerror occurred.', event);
        this.dependencies.ErrorLogger.handleError(
            `BroadcastChannel message error`, 'CrossTabSync', 'error', { eventDetails: event }
        );
    }

    _startHeartbeat() {
        if (!this.broadcastChannel) return;

        const sendBeat = () => {
            try {
                this.broadcastChannel.postMessage({
                    _sourceTabIdCTS: this.tabId,
                    type: 'heartbeat',
                    timestamp: Date.now()
                });
                this._updateActiveTab(this.tabId, Date.now()); // Update self
            } catch (error) {
                this._log('error', 'Failed to send heartbeat.', error);
            }
        };
        sendBeat(); // Initial beat
        this.heartbeatTimer = setInterval(sendBeat, this.options.heartbeatIntervalMs);
        this._log('info', 'Heartbeat started.');
    }

    _updateActiveTab(tabId, timestamp) {
        this.activeTabs.set(tabId, timestamp);
        // this._log('debug', `Heartbeat from/for tab: ${tabId}. Active tabs: ${this.activeTabs.size}`);
    }

    _cleanupInactiveTabsPeriodically() {
        setInterval(() => {
            const now = Date.now();
            let cleanedCount = 0;
            this.activeTabs.forEach((lastSeen, tabId) => {
                if (now - lastSeen > this.options.tabActivityTimeoutMs) {
                    this.activeTabs.delete(tabId);
                    cleanedCount++;
                }
            });
            if (cleanedCount > 0) {
                this._log('debug', `Cleaned ${cleanedCount} inactive tab(s). Current active: ${this.activeTabs.size}`);
                this.dependencies.EventBus.publish('crossTabSync:activeTabsChanged', { activeTabIds: this.getActiveTabIds() });
            }
        }, this.options.tabActivityTimeoutMs / 2); // Cleanup more frequently than timeout
    }

    /**
     * Gets a list of currently active tab IDs (those that sent a heartbeat recently).
     * @returns {string[]} Array of active tab IDs.
     */
    getActiveTabIds() {
        const now = Date.now();
        const activeIds = [];
        this.activeTabs.forEach((lastSeen, tabId) => {
            if (now - lastSeen <= this.options.tabActivityTimeoutMs) {
                activeIds.push(tabId);
            }
        });
        return activeIds;
    }

    /**
     * Manually triggers a broadcast of a custom event to other tabs.
     * @param {string} eventName - The custom event name.
     * @param {*} payload - The data to send.
     */
    sendCustomBroadcast(eventName, payload) {
         this._broadcastEvent(eventName, payload, null); // No transform for custom broadcasts by default
    }

    /**
     * Closes the BroadcastChannel and clears timers, effectively stopping synchronization.
     */
    destroy() {
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
            this._log('info', 'BroadcastChannel closed.');
        }
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
            this._log('info', 'Heartbeat stopped.');
        }
        this.activeTabs.clear();
        // Note: EventBus subscriptions made by this service are not automatically removed here.
        // If this service instance itself is being destroyed and no longer needed,
        // the caller should manage unsubscriptions if the EventBus instance persists.
    }

    /** Internal logging helper. */
    _log(level, message, data) {
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `CrossTabSync (Tab: ${this.tabId.slice(-5)}): ${message}`;
        if (level === 'error' && logger?.handleError) {
             logger.handleError(data || message, 'CrossTabSync', 'error', data ? { msg: message, ...data } : { msg: message });
        } else if (logger?.log) {
            logger.log(level, logMessage, data);
        } else {
            const consoleMethod = console[level] || console.log;
            if (data !== undefined) {
                consoleMethod(logMessage, data);
            } else {
                consoleMethod(logMessage);
            }
        }
    }
}

// Instantiate and export the singleton service
// Ensure ErrorDetectionSystemInstance and EventBus are available on window or passed as dependencies
const CrossTabSyncInstance = new CrossTabSyncService({
    dependencies: {
        ErrorLogger: window.ErrorDetectionSystemInstance,
        EventBus: window.EventBus
    },
    // Example of custom syncable events:
    // syncableEvents: [
    //     { eventName: 'data:imported', direction: 'both' },
    //     { eventName: 'settings:changed', direction: 'both' },
    //     { eventName: 'user:profileUpdated', direction: 'receive' }, // Only receive this event
    //     { eventName: 'local:actionOnly', direction: 'send', transformSend: (p) => ({ summary: p.importantDetail }) }, // Only send, and transform
    // ]
});
window.CrossTabSyncInstance = CrossTabSyncInstance; // Make it globally accessible

// export default CrossTabSyncInstance; // For ES module usage
