/**
 * Batch Processor Module
 * @file /js/utils/batch-processor.js
 * @description Processes arrays of data in non-blocking batches,
 * with support for async item processing and event reporting.
 * @version 1.1.0
 * @exports BatchProcessor
 */

'use strict';

class BatchProcessor {
    /**
     * Creates an instance of BatchProcessor. (This module is typically used via static methods or a singleton).
     * @param {object} [options={}] - Default options for all batch processes run by this instance.
     * @param {number} [options.defaultBatchSize=50] - Default number of items per batch.
     * @param {number} [options.defaultDelay=10] - Default delay (ms) between batches to yield to main thread.
     * @param {object} [options.dependencies={}] - Injected dependencies.
     */
    constructor(options = {}) {
        // Singleton pattern
        if (BatchProcessor.instance) {
            return BatchProcessor.instance;
        }

        this.defaultOptions = {
            batchSize: options.defaultBatchSize || 50,
            delay: options.defaultDelay || 10, // ms, to yield to the browser
            continueOnError: true, // If an item fails, continue with the next?
            ...options, // Allow overriding other defaults if any
        };

        this.dependencies = {
            ErrorLogger: window.ErrorDetectionSystemInstance || console,
            EventBus: window.EventBus,
            ...options.dependencies,
        };

        BatchProcessor.instance = this;
        this._log('info', 'Batch Processor Initialized.');
    }

    /**
     * Processes an array of items in batches.
     * @param {Array<any>} dataArray - The array of items to process.
     * @param {Function} itemProcessorFn - An async function to call for each item: `async (item, index, dataArray) => Promise<any> | any`.
     * It can return a Promise if the processing is asynchronous.
     * @param {object} [options={}] - Options for this specific batch process.
     * @param {number} [options.batchSize] - Number of items per batch.
     * @param {number} [options.delay] - Delay (ms) between batches.
     * @param {boolean} [options.continueOnError] - Continue processing if an item fails.
     * @param {string} [options.processName='unnamed_batch'] - A name for this process for logging/events.
     * @returns {Promise<{results: Array<any>, errors: Array<{item: any, index: number, error: any}>}>}
     * A promise that resolves with an object containing results and errors.
     */
    async process(dataArray, itemProcessorFn, options = {}) {
        if (!Array.isArray(dataArray)) {
            const err = new TypeError('dataArray must be an array.');
            this._log('error', 'Processing failed: dataArray is not an array.', err);
            throw err;
        }
        if (typeof itemProcessorFn !== 'function') {
            const err = new TypeError('itemProcessorFn must be a function.');
            this._log('error', 'Processing failed: itemProcessorFn is not a function.', err);
            throw err;
        }

        const config = { ...this.defaultOptions, ...options };
        const processName = config.processName || `batch_process_${Date.now()}`;
        let currentIndex = 0;
        const totalItems = dataArray.length;
        const results = [];
        const errors = [];

        if (totalItems === 0) {
            this._log('info', `Process "${processName}": Empty dataArray, nothing to process.`);
            return { results, errors };
        }

        this._log('info', `Process "${processName}" started. Total items: ${totalItems}, Batch size: ${config.batchSize}`);
        this.dependencies.EventBus?.publish('batch:started', { processName, totalItems, batchSize: config.batchSize });

        return new Promise((resolve, reject) => {
            const processNextBatch = async () => {
                if (currentIndex >= totalItems) {
                    this._log('info', `Process "${processName}" completed.`);
                    this.dependencies.EventBus?.publish('batch:completed', { processName, results, errors, totalItems });
                    resolve({ results, errors });
                    return;
                }

                const batchEndIndex = Math.min(currentIndex + config.batchSize, totalItems);
                this._log('debug', `Process "${processName}": Processing batch ${currentIndex} to ${batchEndIndex - 1}`);

                for (let i = currentIndex; i < batchEndIndex; i++) {
                    const item = dataArray[i];
                    try {
                        const result = await itemProcessorFn(item, i, dataArray); // Support async item processors
                        results.push(result);
                        this.dependencies.EventBus?.publish('batch:itemProcessed', { processName, item, index: i, result });
                    } catch (error) {
                        this._log('error', `Process "${processName}": Error processing item at index ${i}:`, { item, error });
                        errors.push({ item, index: i, error });
                        this.dependencies.EventBus?.publish('batch:itemFailed', { processName, item, index: i, error });
                        if (!config.continueOnError) {
                            this._log('error', `Process "${processName}": Stopped due to error (continueOnError=false).`);
                            this.dependencies.EventBus?.publish('batch:error', { processName, error, message: 'Stopped due to item error' });
                            reject(new Error(`Batch process "${processName}" stopped due to an error processing item at index ${i}.`));
                            return;
                        }
                    }
                }

                currentIndex = batchEndIndex;
                this.dependencies.EventBus?.publish('batch:progress', {
                    processName,
                    processedItems: currentIndex,
                    totalItems,
                    progress: parseFloat(((currentIndex / totalItems) * 100).toFixed(2))
                });

                // Yield to the main thread before processing the next batch
                // Use requestIdleCallback if available, otherwise setTimeout
                if (typeof requestIdleCallback === 'function') {
                    requestIdleCallback(processNextBatch, { timeout: config.delay + 100 });
                } else {
                    setTimeout(processNextBatch, config.delay);
                }
            };

            // Start the first batch
            processNextBatch().catch(error => {
                // This catch is for errors in the processNextBatch logic itself,
                // not item processing if continueOnError is true.
                this._log('error', `Process "${processName}": Unrecoverable error in batching logic.`, error);
                this.dependencies.EventBus?.publish('batch:error', { processName, error, message: 'Unrecoverable batching error' });
                reject(error);
            });
        });
    }

    /** Internal logging helper. */
    _log(level, message, data) {
        const logger = this.dependencies.ErrorLogger;
        const logMessage = `BatchProcessor: ${message}`;
        if (level === 'error' && logger?.handleError) {
             logger.handleError(data || message, 'BatchProcessor', 'error', data ? { msg: message } : {});
        } else if (logger?.log) {
            logger.log(level, logMessage, data);
        } else {
            console[level]?.(logMessage, data);
        }
    }
}

// Instantiate and export the singleton service
const BatchProcessorInstance = new BatchProcessor();

// Optional: Make it globally accessible
// window.BatchProcessorInstance = BatchProcessorInstance;

// Use this line if using ES modules
// export default BatchProcessorInstance;