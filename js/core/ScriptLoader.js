/**
 * ScriptLoader - Single Responsibility: Dynamic script and stylesheet loading
 * Handles conditional loading of external dependencies with caching
 */
export class ScriptLoader {
  constructor() {
    this.loadedScripts = new Map();
    this.loadedStyles = new Map();
    this.pendingScripts = new Map();
    this.defaultTimeout = 10000; // 10 seconds
  }

  /**
   * Load a script dynamically
   * @param {string} url - Script URL
   * @param {Object} options - Loading options
   * @param {boolean} options.module - Load as ES module
   * @param {boolean} options.defer - Defer script execution
   * @param {number} options.timeout - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async loadScript(url, options = {}) {
    const { module = false, defer = false, timeout = this.defaultTimeout } = options;

    // Check if already loaded
    if (this.loadedScripts.has(url)) {
      return this.loadedScripts.get(url);
    }

    // Check if currently loading
    if (this.pendingScripts.has(url)) {
      return this.pendingScripts.get(url);
    }

    // Create loading promise
    const loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      
      if (module) {
        script.type = 'module';
      }
      
      if (defer) {
        script.defer = true;
      }

      // Timeout handler
      const timeoutId = setTimeout(() => {
        script.remove();
        this.pendingScripts.delete(url);
        reject(new Error(`Script load timeout: ${url}`));
      }, timeout);

      script.onload = () => {
        clearTimeout(timeoutId);
        this.loadedScripts.set(url, Promise.resolve());
        this.pendingScripts.delete(url);
        resolve();
      };

      script.onerror = (error) => {
        clearTimeout(timeoutId);
        script.remove();
        this.pendingScripts.delete(url);
        reject(new Error(`Failed to load script: ${url}`));
      };

      document.head.appendChild(script);
    });

    this.pendingScripts.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Load a stylesheet dynamically
   * @param {string} url - Stylesheet URL
   * @param {Object} options - Loading options
   * @param {number} options.timeout - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async loadStylesheet(url, options = {}) {
    const { timeout = this.defaultTimeout } = options;

    // Check if already loaded
    if (this.loadedStyles.has(url)) {
      return this.loadedStyles.get(url);
    }

    const loadPromise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;

      const timeoutId = setTimeout(() => {
        link.remove();
        reject(new Error(`Stylesheet load timeout: ${url}`));
      }, timeout);

      link.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };

      link.onerror = () => {
        clearTimeout(timeoutId);
        link.remove();
        reject(new Error(`Failed to load stylesheet: ${url}`));
      };

      document.head.appendChild(link);
    });

    this.loadedStyles.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Load multiple scripts in parallel
   * @param {Array<string>} urls - Array of script URLs
   * @param {Object} options - Loading options
   * @returns {Promise<void[]>}
   */
  async loadScripts(urls, options = {}) {
    const promises = urls.map(url => this.loadScript(url, options));
    return Promise.all(promises);
  }

  /**
   * Load script only if condition is met
   * @param {string} url - Script URL
   * @param {boolean|Function} condition - Condition or function returning boolean
   * @param {Object} options - Loading options
   * @returns {Promise<boolean>} - Returns true if loaded, false if condition not met
   */
  async loadConditional(url, condition, options = {}) {
    const shouldLoad = typeof condition === 'function' ? condition() : condition;
    
    if (!shouldLoad) {
      return false;
    }

    await this.loadScript(url, options);
    return true;
  }

  /**
   * Check if a script is loaded
   * @param {string} url - Script URL
   * @returns {boolean}
   */
  isLoaded(url) {
    return this.loadedScripts.has(url);
  }

  /**
   * Clear cache (for testing purposes)
   */
  clearCache() {
    this.loadedScripts.clear();
    this.loadedStyles.clear();
    this.pendingScripts.clear();
  }
}


