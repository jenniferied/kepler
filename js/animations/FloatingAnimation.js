/**
 * FloatingAnimation - Concrete animation implementation
 * Creates bubbly floating effects using Anime.js or CSS fallback
 */
export class FloatingAnimation {
  constructor(elements, options = {}, scriptLoader = null) {
    this.elements = Array.isArray(elements) ? elements : [elements];
    this.scriptLoader = scriptLoader;
    
    // Configuration
    this.options = {
      duration: options.duration || 3000,
      distance: options.distance || 20,
      rotation: options.rotation || 5,
      delay: options.delay || 0,
      easing: options.easing || 'easeInOutSine',
      autoStart: options.autoStart !== false,
      useAnimeJs: options.useAnimeJs !== false
    };
    
    this.animeJsAvailable = false;
    this.animations = [];
    this.isDisposed = false;
    this.quality = 'high'; // high, medium, low
  }

  /**
   * Initialize the animation
   * @returns {Promise<void>}
   */
  async initialize() {
    // Try to load Anime.js if requested
    if (this.options.useAnimeJs && this.scriptLoader) {
      try {
        await this.loadAnimeJs();
        this.animeJsAvailable = typeof anime !== 'undefined';
      } catch (error) {
        console.warn('[FloatingAnimation] Anime.js failed to load, using CSS fallback');
        this.animeJsAvailable = false;
      }
    }
    
    // Apply animation to elements
    if (this.animeJsAvailable) {
      this.applyAnimeJs();
    } else {
      this.applyCssFallback();
    }
    
    return Promise.resolve();
  }

  /**
   * Load Anime.js library
   * @returns {Promise<void>}
   */
  async loadAnimeJs() {
    if (!this.scriptLoader) {
      throw new Error('ScriptLoader required for Anime.js');
    }
    
    const animeUrl = 'https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js';
    await this.scriptLoader.loadScript(animeUrl);
  }

  /**
   * Apply floating animation using Anime.js
   */
  applyAnimeJs() {
    if (!window.anime) {
      return;
    }
    
    this.elements.forEach((element, index) => {
      if (!element) return;
      
      // Calculate staggered delay
      const staggerDelay = this.options.delay + (index * 200);
      
      // Floating animation (Y-axis)
      const floatAnimation = anime({
        targets: element,
        translateY: [
          { value: -this.options.distance, duration: this.options.duration },
          { value: 0, duration: this.options.duration }
        ],
        easing: this.options.easing,
        delay: staggerDelay,
        loop: true,
        autoplay: this.options.autoStart
      });
      
      // Subtle rotation
      const rotateAnimation = anime({
        targets: element,
        rotate: [
          { value: -this.options.rotation, duration: this.options.duration * 1.5 },
          { value: this.options.rotation, duration: this.options.duration * 1.5 }
        ],
        easing: this.options.easing,
        delay: staggerDelay + 100,
        loop: true,
        autoplay: this.options.autoStart
      });
      
      this.animations.push(floatAnimation, rotateAnimation);
    });
  }

  /**
   * Apply CSS-only fallback animation
   */
  applyCssFallback() {
    // Add CSS keyframes if not already present
    this.injectCssKeyframes();
    
    this.elements.forEach((element, index) => {
      if (!element) return;
      
      element.style.animation = `
        float-animation ${this.options.duration}ms ${this.options.easing} infinite,
        rotate-animation ${this.options.duration * 1.5}ms ${this.options.easing} infinite
      `;
      element.style.animationDelay = `${this.options.delay + (index * 200)}ms`;
    });
  }

  /**
   * Inject CSS keyframes for fallback animation
   */
  injectCssKeyframes() {
    const styleId = 'floating-animation-keyframes';
    
    // Check if already injected
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes float-animation {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-${this.options.distance}px);
        }
      }
      
      @keyframes rotate-animation {
        0%, 100% {
          transform: rotate(0deg);
        }
        25% {
          transform: rotate(-${this.options.rotation}deg);
        }
        75% {
          transform: rotate(${this.options.rotation}deg);
        }
      }
      
      /* Respect reduced motion preference */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Update method (called by AnimationController)
   * @param {number} timestamp - Current timestamp
   * @param {number} delta - Time since last frame
   */
  update(timestamp, delta) {
    // For Anime.js, the library handles the updates
    // For CSS, no manual updates needed
    // This method exists to satisfy the AnimationController interface
  }

  /**
   * Pause the animation
   */
  pause() {
    if (this.animeJsAvailable && window.anime) {
      this.animations.forEach(anim => {
        if (anim && typeof anim.pause === 'function') {
          anim.pause();
        }
      });
    } else {
      this.elements.forEach(element => {
        if (element) {
          element.style.animationPlayState = 'paused';
        }
      });
    }
  }

  /**
   * Resume the animation
   */
  resume() {
    if (this.animeJsAvailable && window.anime) {
      this.animations.forEach(anim => {
        if (anim && typeof anim.play === 'function') {
          anim.play();
        }
      });
    } else {
      this.elements.forEach(element => {
        if (element) {
          element.style.animationPlayState = 'running';
        }
      });
    }
  }

  /**
   * Reduce quality for better performance
   */
  reduceQuality() {
    if (this.quality === 'high') {
      this.quality = 'medium';
      // Reduce distance and rotation
      this.options.distance = this.options.distance * 0.5;
      this.options.rotation = this.options.rotation * 0.5;
    } else if (this.quality === 'medium') {
      this.quality = 'low';
      // Further reduce or disable rotation
      this.options.rotation = 0;
    }
    
    console.log(`[FloatingAnimation] Quality reduced to: ${this.quality}`);
  }

  /**
   * Dispose and cleanup
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    
    // Stop Anime.js animations
    if (this.animeJsAvailable && window.anime) {
      this.animations.forEach(anim => {
        if (anim && typeof anim.pause === 'function') {
          anim.pause();
        }
      });
    }
    
    // Remove CSS animations
    this.elements.forEach(element => {
      if (element) {
        element.style.animation = '';
        element.style.animationDelay = '';
      }
    });
    
    this.animations = [];
    this.isDisposed = true;
  }

  /**
   * Create a floating animation with parallax effect
   * @param {HTMLElement|Array} elements - Elements to animate
   * @param {Object} options - Animation options
   * @param {ScriptLoader} scriptLoader - Script loader instance
   * @returns {FloatingAnimation}
   */
  static createParallax(elements, options = {}, scriptLoader = null) {
    const parallaxOptions = {
      ...options,
      duration: options.duration || 4000,
      distance: options.distance || 30,
      rotation: options.rotation || 3
    };
    
    return new FloatingAnimation(elements, parallaxOptions, scriptLoader);
  }
}


