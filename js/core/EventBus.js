/**
 * EventBus - Single Responsibility: Decoupled component communication
 * Implements pub/sub pattern for loosely coupled architecture
 */
export class EventBus {
  constructor() {
    this.events = new Map();
    this.debugMode = false;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const handlers = this.events.get(event);
    handlers.push(handler);

    if (this.debugMode) {
      console.log(`[EventBus] Subscribed to "${event}". Total handlers: ${handlers.length}`);
    }

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event only once
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  once(event, handler) {
    const wrappedHandler = (...args) => {
      handler(...args);
      this.off(event, wrappedHandler);
    };

    return this.on(event, wrappedHandler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler to remove
   */
  off(event, handler) {
    if (!this.events.has(event)) {
      return;
    }

    const handlers = this.events.get(event);
    const index = handlers.indexOf(handler);

    if (index !== -1) {
      handlers.splice(index, 1);

      if (this.debugMode) {
        console.log(`[EventBus] Unsubscribed from "${event}". Remaining handlers: ${handlers.length}`);
      }
    }

    // Clean up empty event arrays
    if (handlers.length === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (!this.events.has(event)) {
      if (this.debugMode) {
        console.log(`[EventBus] No handlers for "${event}"`);
      }
      return;
    }

    const handlers = this.events.get(event);

    if (this.debugMode) {
      console.log(`[EventBus] Emitting "${event}" to ${handlers.length} handler(s)`, data);
    }

    // Call handlers with error handling
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[EventBus] Error in handler for "${event}":`, error);
      }
    });
  }

  /**
   * Emit an event asynchronously
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {Promise<void>}
   */
  async emitAsync(event, data) {
    if (!this.events.has(event)) {
      return;
    }

    const handlers = this.events.get(event);
    
    const promises = handlers.map(handler => {
      return Promise.resolve().then(() => handler(data));
    });

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error(`[EventBus] Error in async handler for "${event}":`, error);
    }
  }

  /**
   * Clear all handlers for an event
   * @param {string} event - Event name
   */
  clear(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get the number of handlers for an event
   * @param {string} event - Event name
   * @returns {number}
   */
  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0;
  }

  /**
   * Get all registered event names
   * @returns {Array<string>}
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}


