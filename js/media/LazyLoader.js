/**
 * LazyLoader - Single Responsibility: Lazy loading for media elements
 * Uses Intersection Observer for efficient lazy loading with network awareness
 */
export class LazyLoader {
  constructor(featureDetector = null, eventBus = null) {
    this.featureDetector = featureDetector;
    this.eventBus = eventBus;
    
    this.observer = null;
    this.elements = new Map();
    this.isSlowNetwork = false;
    this.loadedCount = 0;
    
    // Configuration
    this.defaultOptions = {
      rootMargin: '50px',
      threshold: 0.01,
      loadImmediately: false
    };
  }

  /**
   * Initialize the lazy loader
   * @param {Object} options - Configuration options
   */
  initialize(options = {}) {
    const config = { ...this.defaultOptions, ...options };
    
    // Check network conditions
    if (this.featureDetector) {
      const caps = this.featureDetector.getCapabilities();
      this.isSlowNetwork = caps.slowNetwork;
    }
    
    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
      console.warn('[LazyLoader] IntersectionObserver not supported, loading all immediately');
      config.loadImmediately = true;
    }
    
    if (!config.loadImmediately) {
      this.observer = new IntersectionObserver(
        (entries) => this.handleIntersection(entries),
        {
          rootMargin: config.rootMargin,
          threshold: config.threshold
        }
      );
    }
    
    this.emitEvent('lazy-loader:initialized', { isSlowNetwork: this.isSlowNetwork });
  }

  /**
   * Add elements to lazy load
   * @param {HTMLElement|NodeList|Array} elements - Elements to lazy load
   */
  observe(elements) {
    const elementsArray = elements instanceof NodeList 
      ? Array.from(elements)
      : Array.isArray(elements) 
      ? elements 
      : [elements];
    
    elementsArray.forEach(element => {
      if (!element || this.elements.has(element)) {
        return;
      }
      
      // Store element data
      this.elements.set(element, {
        loaded: false,
        loading: false,
        type: this.getElementType(element),
        originalSrc: this.getOriginalSrc(element)
      });
      
      // Start observing
      if (this.observer) {
        this.observer.observe(element);
      } else {
        // Load immediately if observer not available
        this.loadElement(element);
      }
    });
  }

  /**
   * Stop observing an element
   * @param {HTMLElement} element - Element to stop observing
   */
  unobserve(element) {
    if (this.observer && this.elements.has(element)) {
      this.observer.unobserve(element);
      this.elements.delete(element);
    }
  }

  /**
   * Handle intersection events
   * @param {Array} entries - Intersection observer entries
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const data = this.elements.get(element);
        
        if (data && !data.loaded && !data.loading) {
          this.loadElement(element);
        }
      }
    });
  }

  /**
   * Load a single element
   * @param {HTMLElement} element - Element to load
   */
  async loadElement(element) {
    const data = this.elements.get(element);
    
    if (!data || data.loaded || data.loading) {
      return;
    }
    
    data.loading = true;
    
    try {
      switch (data.type) {
        case 'image':
          await this.loadImage(element, data);
          break;
        case 'video':
          await this.loadVideo(element, data);
          break;
        case 'iframe':
          await this.loadIframe(element, data);
          break;
        default:
          console.warn(`[LazyLoader] Unknown element type: ${data.type}`);
      }
      
      data.loaded = true;
      data.loading = false;
      this.loadedCount++;
      
      // Stop observing once loaded
      if (this.observer) {
        this.observer.unobserve(element);
      }
      
      this.emitEvent('lazy-loader:loaded', {
        element,
        type: data.type,
        total: this.elements.size,
        loaded: this.loadedCount
      });
      
    } catch (error) {
      console.error('[LazyLoader] Failed to load element:', error);
      data.loading = false;
      
      this.emitEvent('lazy-loader:error', {
        element,
        type: data.type,
        error
      });
    }
  }

  /**
   * Load an image with responsive srcset support
   * @param {HTMLImageElement} img - Image element
   * @param {Object} data - Element data
   */
  async loadImage(img, data) {
    return new Promise((resolve, reject) => {
      // Handle responsive images
      const srcset = img.dataset.srcset;
      const src = img.dataset.src || data.originalSrc;
      
      if (!src && !srcset) {
        reject(new Error('No source found for image'));
        return;
      }
      
      // Create temporary image for loading
      const tempImg = new Image();
      
      tempImg.onload = () => {
        // Apply loaded source
        if (srcset) {
          img.srcset = srcset;
        }
        if (src) {
          img.src = src;
        }
        
        // Add loaded class
        img.classList.add('lazy-loaded');
        
        // Fade in animation
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease';
        requestAnimationFrame(() => {
          img.style.opacity = '1';
        });
        
        resolve();
      };
      
      tempImg.onerror = () => {
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      // Start loading
      if (srcset) {
        tempImg.srcset = srcset;
      }
      if (src) {
        tempImg.src = src;
      }
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, 10000);
    });
  }

  /**
   * Load a video element
   * @param {HTMLVideoElement} video - Video element
   * @param {Object} data - Element data
   */
  async loadVideo(video, data) {
    return new Promise((resolve, reject) => {
      const src = video.dataset.src || data.originalSrc;
      
      if (!src) {
        reject(new Error('No source found for video'));
        return;
      }
      
      video.onloadedmetadata = () => {
        video.classList.add('lazy-loaded');
        resolve();
      };
      
      video.onerror = () => {
        reject(new Error(`Failed to load video: ${src}`));
      };
      
      // Set preload based on network conditions
      video.preload = this.isSlowNetwork ? 'none' : 'metadata';
      video.src = src;
      
      // Timeout after 15 seconds
      setTimeout(() => {
        reject(new Error('Video load timeout'));
      }, 15000);
    });
  }

  /**
   * Load an iframe
   * @param {HTMLIFrameElement} iframe - Iframe element
   * @param {Object} data - Element data
   */
  async loadIframe(iframe, data) {
    return new Promise((resolve, reject) => {
      const src = iframe.dataset.src || data.originalSrc;
      
      if (!src) {
        reject(new Error('No source found for iframe'));
        return;
      }
      
      iframe.onload = () => {
        iframe.classList.add('lazy-loaded');
        resolve();
      };
      
      iframe.onerror = () => {
        reject(new Error(`Failed to load iframe: ${src}`));
      };
      
      iframe.src = src;
      
      // Timeout after 20 seconds
      setTimeout(() => {
        reject(new Error('Iframe load timeout'));
      }, 20000);
    });
  }

  /**
   * Get element type
   * @param {HTMLElement} element - Element
   * @returns {string} Type of element
   */
  getElementType(element) {
    if (element.tagName === 'IMG') {
      return 'image';
    } else if (element.tagName === 'VIDEO') {
      return 'video';
    } else if (element.tagName === 'IFRAME') {
      return 'iframe';
    }
    return 'unknown';
  }

  /**
   * Get original source from element
   * @param {HTMLElement} element - Element
   * @returns {string|null} Original source
   */
  getOriginalSrc(element) {
    return element.dataset.src || element.getAttribute('src') || null;
  }

  /**
   * Load all elements immediately (bypass lazy loading)
   */
  loadAll() {
    this.elements.forEach((data, element) => {
      if (!data.loaded && !data.loading) {
        this.loadElement(element);
      }
    });
  }

  /**
   * Get loading stats
   * @returns {Object} Loading statistics
   */
  getStats() {
    return {
      total: this.elements.size,
      loaded: this.loadedCount,
      pending: this.elements.size - this.loadedCount,
      isSlowNetwork: this.isSlowNetwork
    };
  }

  /**
   * Disconnect observer and cleanup
   */
  dispose() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.elements.clear();
    this.loadedCount = 0;
    
    this.emitEvent('lazy-loader:disposed');
  }

  /**
   * Emit event through event bus
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emitEvent(event, data) {
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit(event, data);
    }
  }

  /**
   * Static helper: Add data-src attributes to elements for lazy loading
   * @param {HTMLElement|NodeList|Array} elements - Elements to prepare
   */
  static prepare(elements) {
    const elementsArray = elements instanceof NodeList 
      ? Array.from(elements)
      : Array.isArray(elements) 
      ? elements 
      : [elements];
    
    elementsArray.forEach(element => {
      const src = element.getAttribute('src');
      const srcset = element.getAttribute('srcset');
      
      if (src) {
        element.dataset.src = src;
        element.removeAttribute('src');
      }
      
      if (srcset) {
        element.dataset.srcset = srcset;
        element.removeAttribute('srcset');
      }
    });
  }
}


