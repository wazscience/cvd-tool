/**
 * Event Bus Module (Advanced Pub/Sub)
 * @file /js/utils/event-bus.js
 * @description Implements an advanced publish-subscribe pattern with wildcards,
 * dead-letter queue, async publishing, single-fire listeners, and robust error handling.
 * @version 2.3.0
 * @exports EventBusService
 */

'use strict';

class EventBusService {
    /**
     * Creates or returns the singleton instance of EventBusService.
     * @param {object} [options={}] - Configuration options.
     * @param {boolean} [options.enableDeadLetter=true] - If true, unhandled events are published to a dead-letter event.
     * @param {string} [options.deadLetterEvent='event:dead_letter'] - Name of the dead-letter event.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     * Expected: ErrorLogger (instance).
     */
    constructor(options = {}) {
        if (EventBusService.instance) {
            return EventBusService.instance;
        }

        this.subscribers = {}; // { eventName: Set<Function> }
        this.wildcardSubscribers = {}; // { namespace: Set<Function> }
        this.onceSubscribers = {}; // { eventName: Set<Function> }

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || this._getFallbackLogger(),
            ...options.dependencies,
        };

        this.options = {
            enableDeadLetter: true,
            deadLetterEvent: 'event:dead_letter',
            ...options,
        };

        EventBusService.instance = this;
        this._log('info', 'Event Bus Initialized (v2.3.0).');
    }

    _getFallbackLogger() {
        return {
            handleError: (msg, ctx, lvl, data) => console.error(`EventBus Fallback Logger [${ctx}][${lvl}]: ${msg}`, data),
            log: (lvl, msg, data) => console[lvl]?.(`EventBus Fallback Logger [${lvl}]: ${msg}`, data) || console.log(`EventBus Fallback Logger [${lvl}]: ${msg}`, data)
        };
    }

    /**
     * Subscribes a callback to an event. Supports wildcards (e.g., 'data:*').
     * @param {string} eventName - Event name or pattern (e.g., 'data:updated', 'data:*').
     * @param {Function} callback - Function to execute when the event is published.
     * @returns {Function} An unsubscribe function.
     */
    subscribe(eventName, callback) {
        if (typeof callback !== 'function') {
            this._log('error', `Subscription failed: Callback for "${eventName}" is not a function.`);
            return () => {}; // Return a no-op unsubscribe function
        }

        const isWildcard = eventName.endsWith(':*');
        const target = isWildcard ? this.wildcardSubscribers : this.subscribers;
        const key = isWildcard ? eventName.slice(0, -2) : eventName;

        if (!target[key]) {
            target[key] = new Set();
        }

        if (target[key].has(callback)) {
            this._log('warn', `Callback already subscribed to "${eventName}".`);
        } else {
            target[key].add(callback);
            this._log('debug', `New subscription to "${eventName}". Total for event: ${target[key].size}`);
        }

        return () => this.unsubscribe(eventName, callback);
    }

    /**
     * Subscribes a callback to an event that will only fire once.
     * After firing, the listener is automatically unsubscribed.
     * @param {string} eventName - Event name. Wildcards are NOT typically recommended for `once` listeners
     * as their single-fire nature might be unpredictable with multiple wildcard matches.
     * However, this implementation will allow it, firing once per matching event.
     * @param {Function} callback - Function to execute once.
     * @returns {Function} An unsubscribe function (can be used to cancel before it fires).
     */
    once(eventName, callback) {
        if (typeof callback !== 'function') {
            this._log('error', `Subscription (once) failed: Callback for "${eventName}" is not a function.`);
            return () => {};
        }

        // Note: Wildcard support for 'once' can be tricky.
        // If 'data:*' is used, this listener will fire for the *first* event matching 'data:*'
        // and then unsubscribe from all further 'data:*' events for this specific callback.
        // This is different from subscribing to a specific event like 'data:loaded' once.

        if (!this.onceSubscribers[eventName]) {
            this.onceSubscribers[eventName] = new Set();
        }

        if (this.onceSubscribers[eventName].has(callback)) {
            this._log('warn', `Callback already subscribed (once) to "${eventName}".`);
        } else {
            this.onceSubscribers[eventName].add(callback);
            this._log('debug', `New 'once' subscription to "${eventName}".`);
        }

        return () => this.unsubscribe(eventName, callback, true); // Pass 'isOnce' flag
    }


    /**
     * Unsubscribes a callback from an event.
     * @param {string} eventName - Event name or pattern.
     * @param {Function} callback - The callback to remove.
     * @param {boolean} [isOnceListener=false] - Internal flag to specify if removing from onceSubscribers.
     * @returns {boolean} True if the callback was found and removed, false otherwise.
     */
    unsubscribe(eventName, callback, isOnceListener = false) {
        let target, key;

        if (isOnceListener) {
            target = this.onceSubscribers;
            key = eventName; // For 'once', eventName is the direct key
        } else {
            const isWildcard = eventName.endsWith(':*');
            target = isWildcard ? this.wildcardSubscribers : this.subscribers;
            key = isWildcard ? eventName.slice(0, -2) : eventName;
        }

        if (!target[key] || !target[key].has(callback)) {
            return false;
        }

        target[key].delete(callback);
        this._log('debug', `Unsubscribed from "${eventName}"${isOnceListener ? " (once)" : ""}. Remaining for event: ${target[key].size}`);
        if (target[key].size === 0) {
            delete target[key]; // Clean up empty sets
        }
        return true;
    }

    /**
     * Publishes an event synchronously, calling all relevant subscribers immediately.
     * @param {string} eventName - The name of the event to publish (e.g., 'data:updated').
     * @param {*} [payload] - Optional data payload to pass to subscribers.
     */
    publish(eventName, payload) {
        let listenersCalled = 0;
        const [namespace] = eventName.split(':'); // For wildcard matching

        // Exact matches for regular subscribers
        listenersCalled += this._callListeners(this.subscribers[eventName], eventName, payload, false);

        // Exact matches for 'once' subscribers
        listenersCalled += this._callListeners(this.onceSubscribers[eventName], eventName, payload, false, true);

        // Wildcard matches for regular subscribers
        listenersCalled += this._callListeners(this.wildcardSubscribers[namespace], eventName, payload, false);

        // Wildcard matches for 'once' subscribers (e.g. subscribing once to 'data:*')
        // This will fire for the first event matching 'data:*' and then remove the 'data:*' once listener.
        const onceWildcardKey = namespace + ":*";
        listenersCalled += this._callListeners(this.onceSubscribers[onceWildcardKey], eventName, payload, false, true, onceWildcardKey);


        if (listenersCalled === 0 && this.options.enableDeadLetter && eventName !== this.options.deadLetterEvent) {
            this._log('warn', `Event "${eventName}" published with no subscribers (Dead Letter).`);
            // Publish dead letter synchronously to ensure it's processed/logged.
            this.publish(this.options.deadLetterEvent, { originalEvent: eventName, payload, timestamp: Date.now() });
        } else if (listenersCalled > 0) {
             this._log('info', `Published "${eventName}", ${listenersCalled} listener(s) invoked/scheduled.`);
        }
    }

    /**
     * Publishes an event asynchronously, scheduling subscribers to run in separate event loop ticks.
     * @param {string} eventName - The name of the event to publish.
     * @param {*} [payload] - Optional data payload.
     */
    publishAsync(eventName, payload) {
         let listenersScheduled = 0;
         const [namespace] = eventName.split(':');

         listenersScheduled += this._callListeners(this.subscribers[eventName], eventName, payload, true);
         listenersScheduled += this._callListeners(this.onceSubscribers[eventName], eventName, payload, true, true);
         listenersScheduled += this._callListeners(this.wildcardSubscribers[namespace], eventName, payload, true);
         const onceWildcardKey = namespace + ":*";
         listenersScheduled += this._callListeners(this.onceSubscribers[onceWildcardKey], eventName, payload, true, true, onceWildcardKey);


        if (listenersScheduled === 0 && this.options.enableDeadLetter && eventName !== this.options.deadLetterEvent) {
            this._log('warn', `Async event "${eventName}" published with no subscribers (Dead Letter).`);
            this.publish(this.options.deadLetterEvent, { originalEvent: eventName, payload, timestamp: Date.now() });
        } else if (listenersScheduled > 0) {
             this._log('info', `Published Async "${eventName}", ${listenersScheduled} listener(s) scheduled.`);
        }
    }

    /**
     * Internal helper to call listener callbacks safely.
     * @param {Set<Function>} listenerSet - Set of callback functions.
     * @param {string} actualEventName - The specific event name that triggered the call.
     * @param {*} payload - Data payload.
     * @param {boolean} isAsync - If true, use setTimeout to schedule the call.
     * @param {boolean} [isOnce=false] - If true, unsubscribe the listener after calling.
     * @param {string} [unsubscribeKey=actualEventName] - The key to use for unsubscribing 'once' listeners (can be different for wildcards).
     * @returns {number} Number of listeners called/scheduled.
     * @private
     */
    _callListeners(listenerSet, actualEventName, payload, isAsync, isOnce = false, unsubscribeKey = actualEventName) {
        if (!listenerSet || listenerSet.size === 0) {
            return 0;
        }

        // Iterate over a copy of the set in case a listener unsubscribes itself or another.
        const listenersToCall = Array.from(listenerSet);

        listenersToCall.forEach(callback => {
            const callLogic = () => {
                try {
                    callback(payload, actualEventName); // Pass actualEventName for context
                } catch (error) {
                    this._log('error', `Error in subscriber for event "${actualEventName}":`, error);
                    this.dependencies.ErrorLogger?.handleError(
                        `Subscriber error during "${actualEventName}" event.`,
                        'EventBus', 'error',
                        { eventName: actualEventName, error, callbackSource: callback.toString().substring(0, 200) + '...' }
                    );
                } finally {
                    if (isOnce) {
                        // Unsubscribe this specific callback from the 'once' list for this event/pattern.
                        // Use unsubscribeKey which might be the original wildcard pattern.
                        if (this.onceSubscribers[unsubscribeKey]) {
                            this.onceSubscribers[unsubscribeKey].delete(callback);
                            if (this.onceSubscribers[unsubscribeKey].size === 0) {
                                delete this.onceSubscribers[unsubscribeKey];
                            }
                        }
                    }
                }
            };

            if (isAsync) {
                setTimeout(callLogic, 0);
            } else {
                callLogic();
            }
        });
        return listenersToCall.length;
    }

    /**
     * Gets the number of subscribers for a specific event (exact match only, does not count wildcards).
     * @param {string} eventName - The event name.
     * @returns {number} The number of subscribers.
     */
    getSubscriberCount(eventName) {
        let count = 0;
        if (this.subscribers[eventName]) {
            count += this.subscribers[eventName].size;
        }
        if (this.onceSubscribers[eventName]) {
            count += this.onceSubscribers[eventName].size;
        }
        return count;
    }

    /**
     * Clears all subscribers for a specific event or all events.
     * @param {string} [eventName] - Optional. If provided, clears only for this event. Otherwise, clears all.
     */
    clear(eventName) {
        if (eventName) {
            delete this.subscribers[eventName];
            delete this.onceSubscribers[eventName];
            // For wildcards, if eventName is 'data:*', key is 'data'
            const isWildcard = eventName.endsWith(':*');
            if (isWildcard) {
                const key = eventName.slice(0, -2);
                delete this.wildcardSubscribers[key];
                // Also clear once listeners for this wildcard pattern
                delete this.onceSubscribers[eventName];
            }
            this._log('info', `Subscribers cleared for event: "${eventName}".`);
        } else {
            this.subscribers = {};
            this.wildcardSubscribers = {};
            this.onceSubscribers = {};
            this._log('info', 'All EventBus subscribers cleared.');
        }
    }

    /** Internal logging helper. */
    _log(level, message, data) {
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `EventBus: ${message}`;
        if (level === 'error' && logger?.handleError) {
             logger.handleError(data || message, 'EventBus', 'error', data ? { msg: message, ...data } : { msg: message });
        } else if (logger?.log) {
            logger.log(level, logMessage, data);
        } else {
            // Fallback to console if no logger or log method
            const consoleMethod = console[level] || console.log;
            if (data) {
                consoleMethod(logMessage, data);
            } else {
                consoleMethod(logMessage);
            }
        }
    }
}

// Instantiate and export the singleton service
// Ensure ErrorDetectionSystemInstance is available on window or passed as dependency
const EventBusInstance = new EventBusService({
    dependencies: {
        ErrorLogger: window.ErrorDetectionSystemInstance
    }
});
window.EventBus = EventBusInstance; // Make it globally accessible for other modules

// export default EventBusInstance; // For ES module usage
