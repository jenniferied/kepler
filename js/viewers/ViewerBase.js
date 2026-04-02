/**
 * ViewerBase - Abstract base class (Open/Closed Principle)
 * Defines the contract for all viewer implementations
 * Concrete viewers extend this and implement required methods
 */
export class ViewerBase {
  /**
   * @param {HTMLElement} container - Container element for the viewer
   * @param {Object} options - Viewer configuration options
   * @param {EventBus} eventBus - Event bus for communication
   */
  constructor(container, options = {}, eventBus = null) {
    if (new.target === ViewerBase) {
      throw new TypeError('Cannot instantiate abstract class ViewerBase directly');
    }

    this.container = container;
    this.options = options;
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.isSupported = null;
    this.fallbackShown = false;
  }

  /**
   * Check if the viewer is supported on this device
   * Must be implemented by concrete classes
   * @returns {Promise<boolean>}
   */
  async checkSupport() {
    throw new Error('checkSupport() must be implemented by subclass');
  }

  /**
   * Load external dependencies required by the viewer
   * Must be implemented by concrete classes
   * @returns {Promise<void>}
   */
  async loadDependencies() {
    throw new Error('loadDependencies() must be implemented by subclass');
  }

  /**
   * Initialize the viewer
   * Must be implemented by concrete classes
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Render the viewer content
   * Must be implemented by concrete classes
   * @returns {Promise<void>}
   */
  async render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Show fallback content (static alternative)
   * Must be implemented by concrete classes
   */
  showFallback() {
    throw new Error('showFallback() must be implemented by subclass');
  }

  /**
   * Cleanup and dispose of resources
   * Must be implemented by concrete classes
   */
  dispose() {
    throw new Error('dispose() must be implemented by subclass');
  }

  /**
   * Template method: Complete viewer lifecycle
   * Follows the Template Method pattern
   * @returns {Promise<boolean>} Success status
   */
  async setup() {
    try {
      // Check support
      this.isSupported = await this.checkSupport();
      
      if (!this.isSupported) {
        console.log(`[${this.constructor.name}] Not supported, showing fallback`);
        this.showFallback();
        this.emitEvent('viewer:fallback', { viewer: this.constructor.name });
        return false;
      }

      // Show loading state
      this.showLoading();

      // Load dependencies
      await this.loadDependencies();
      this.emitEvent('viewer:dependencies-loaded', { viewer: this.constructor.name });

      // Initialize viewer
      await this.initialize();
      this.isInitialized = true;
      this.emitEvent('viewer:initialized', { viewer: this.constructor.name });

      // Render content
      await this.render();
      this.emitEvent('viewer:ready', { viewer: this.constructor.name });

      // Hide loading state
      this.hideLoading();

      return true;
    } catch (error) {
      console.error(`[${this.constructor.name}] Setup failed:`, error);
      this.hideLoading();
      this.showFallback();
      this.emitEvent('viewer:error', { viewer: this.constructor.name, error });
      return false;
    }
  }

  /**
   * Show loading indicator
   * Common implementation, can be overridden
   */
  showLoading() {
    if (!this.container) return;
    
    const loader = document.createElement('div');
    loader.className = 'viewer-loading';
    loader.innerHTML = `
      <div class="viewer-spinner"></div>
      <p>Loading...</p>
    `;
    this.container.appendChild(loader);
  }

  /**
   * Hide loading indicator
   * Common implementation, can be overridden
   */
  hideLoading() {
    if (!this.container) return;
    
    const loader = this.container.querySelector('.viewer-loading');
    if (loader) {
      loader.remove();
    }
  }

  /**
   * Emit event through event bus if available
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emitEvent(event, data) {
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit(event, data);
    }
  }

  /**
   * Helper: Check if container is visible in viewport
   * Useful for lazy loading
   * @returns {boolean}
   */
  isInViewport() {
    if (!this.container) return false;
    
    const rect = this.container.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Helper: Wait for container to be in viewport
   * @param {number} threshold - Intersection threshold (0-1)
   * @returns {Promise<void>}
   */
  waitForViewport(threshold = 0.1) {
    return new Promise((resolve) => {
      if (!this.container || this.isInViewport()) {
        resolve();
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            observer.disconnect();
            resolve();
          }
        },
        { threshold }
      );

      observer.observe(this.container);
    });
  }
}


