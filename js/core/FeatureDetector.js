/**
 * FeatureDetector - Single Responsibility: Detect device capabilities
 * Provides centralized feature detection for progressive enhancement
 */
export class FeatureDetector {
  constructor() {
    this.capabilities = null;
  }

  /**
   * Get all device capabilities (cached after first call)
   * @returns {Object} Immutable capabilities object
   */
  getCapabilities() {
    if (this.capabilities) {
      return Object.freeze({ ...this.capabilities });
    }

    this.capabilities = {
      webgl: this.hasWebGL(),
      webgl2: this.hasWebGL2(),
      performanceTier: this.getPerformanceTier(),
      reducedMotion: this.prefersReducedMotion(),
      slowNetwork: this.isSlowNetwork(),
      touchDevice: this.isTouchDevice(),
      modernBrowser: this.isModernBrowser()
    };

    return Object.freeze({ ...this.capabilities });
  }

  /**
   * Check if WebGL is supported
   * @returns {boolean}
   */
  hasWebGL() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if WebGL2 is supported
   * @returns {boolean}
   */
  hasWebGL2() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  /**
   * Determine device performance tier
   * @returns {string} 'low' | 'medium' | 'high'
   */
  getPerformanceTier() {
    // Check hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 2;
    
    // Check device memory (if available)
    const memory = navigator.deviceMemory || 4;
    
    // Check for WebGL renderer info
    let gpuTier = 'unknown';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          // Simple heuristic: look for high-end GPU indicators
          if (/nvidia|amd radeon|intel iris/i.test(renderer)) {
            gpuTier = 'high';
          } else if (/intel hd|intel uhd/i.test(renderer)) {
            gpuTier = 'medium';
          }
        }
      }
    } catch (e) {
      // Fallback if WebGL not available
    }

    // Performance tier logic
    if (cores >= 8 && memory >= 8) return 'high';
    if (cores >= 4 && memory >= 4) return 'medium';
    if (gpuTier === 'high' && cores >= 4) return 'high';
    if (gpuTier === 'medium' || cores >= 4) return 'medium';
    return 'low';
  }

  /**
   * Check if user prefers reduced motion (accessibility)
   * @returns {boolean}
   */
  prefersReducedMotion() {
    if (typeof window === 'undefined') return false;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mediaQuery.matches;
  }

  /**
   * Detect slow network connection
   * @returns {boolean}
   */
  isSlowNetwork() {
    if (typeof navigator === 'undefined' || !navigator.connection) {
      return false;
    }

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection) return false;

    // Check effective connection type
    const slowTypes = ['slow-2g', '2g'];
    if (connection.effectiveType && slowTypes.includes(connection.effectiveType)) {
      return true;
    }

    // Check saveData mode
    if (connection.saveData) {
      return true;
    }

    return false;
  }

  /**
   * Check if device has touch capability
   * @returns {boolean}
   */
  isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Check if browser supports modern JavaScript features
   * @returns {boolean}
   */
  isModernBrowser() {
    try {
      // Check for ES6 features
      eval('class Foo {}');
      eval('const bar = () => {}');
      return (
        typeof Promise !== 'undefined' &&
        typeof IntersectionObserver !== 'undefined' &&
        typeof requestAnimationFrame !== 'undefined'
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Log capabilities for debugging
   */
  logCapabilities() {
    const caps = this.getCapabilities();
    console.log('Device Capabilities:', caps);
  }
}


