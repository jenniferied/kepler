/**
 * AnimationController - Single Responsibility: Manage animation lifecycle
 * Coordinates all animations with performance monitoring and accessibility
 */
export class AnimationController {
  constructor(featureDetector = null, eventBus = null) {
    this.featureDetector = featureDetector;
    this.eventBus = eventBus;
    
    this.animations = new Map();
    this.isRunning = false;
    this.rafId = null;
    this.lastFrameTime = 0;
    this.fps = 60;
    this.targetFrameTime = 1000 / this.fps;
    
    // Performance monitoring
    this.frameCount = 0;
    this.fpsHistory = [];
    this.performanceCheckInterval = null;
    
    // Capabilities
    this.capabilities = null;
    this.shouldReduceMotion = false;
    this.performanceTier = 'medium';
  }

  /**
   * Initialize the controller
   */
  async initialize() {
    if (this.featureDetector) {
      this.capabilities = this.featureDetector.getCapabilities();
      this.shouldReduceMotion = this.capabilities.reducedMotion;
      this.performanceTier = this.capabilities.performanceTier;
    }
    
    // Listen for reduced motion changes
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      mediaQuery.addEventListener('change', (e) => {
        this.shouldReduceMotion = e.matches;
        if (this.shouldReduceMotion) {
          this.pauseAll();
        }
      });
    }
    
    this.emitEvent('animation-controller:initialized');
  }

  /**
   * Register an animation
   * @param {string} id - Unique animation ID
   * @param {Object} animation - Animation instance
   */
  register(id, animation) {
    if (this.animations.has(id)) {
      console.warn(`[AnimationController] Animation "${id}" already registered`);
      return;
    }
    
    if (!animation || typeof animation.update !== 'function') {
      throw new Error('Animation must have an update() method');
    }
    
    this.animations.set(id, {
      instance: animation,
      enabled: true,
      paused: false
    });
    
    this.emitEvent('animation:registered', { id });
  }

  /**
   * Unregister an animation
   * @param {string} id - Animation ID
   */
  unregister(id) {
    if (!this.animations.has(id)) {
      return;
    }
    
    const { instance } = this.animations.get(id);
    
    // Dispose if method exists
    if (instance && typeof instance.dispose === 'function') {
      instance.dispose();
    }
    
    this.animations.delete(id);
    this.emitEvent('animation:unregistered', { id });
  }

  /**
   * Start all animations
   */
  startAll() {
    if (this.isRunning) {
      return;
    }
    
    if (this.shouldReduceMotion) {
      console.log('[AnimationController] Reduced motion enabled, animations disabled');
      return;
    }
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    this.emitEvent('animation-controller:started');
  }

  /**
   * Pause all animations
   */
  pauseAll() {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    // Stop performance monitoring
    this.stopPerformanceMonitoring();
    
    this.emitEvent('animation-controller:paused');
  }

  /**
   * Resume all animations
   */
  resume() {
    if (this.isRunning || this.shouldReduceMotion) {
      return;
    }
    
    this.startAll();
  }

  /**
   * Pause a specific animation
   * @param {string} id - Animation ID
   */
  pause(id) {
    if (!this.animations.has(id)) {
      return;
    }
    
    const animation = this.animations.get(id);
    animation.paused = true;
    
    this.emitEvent('animation:paused', { id });
  }

  /**
   * Resume a specific animation
   * @param {string} id - Animation ID
   */
  resumeAnimation(id) {
    if (!this.animations.has(id)) {
      return;
    }
    
    const animation = this.animations.get(id);
    animation.paused = false;
    
    this.emitEvent('animation:resumed', { id });
  }

  /**
   * Main animation loop
   * @param {number} timestamp - Current timestamp
   */
  animate(timestamp = performance.now()) {
    if (!this.isRunning) {
      return;
    }
    
    this.rafId = requestAnimationFrame((ts) => this.animate(ts));
    
    // Frame rate throttling
    const elapsed = timestamp - this.lastFrameTime;
    
    if (elapsed < this.targetFrameTime) {
      return;
    }
    
    // Update last frame time
    this.lastFrameTime = timestamp - (elapsed % this.targetFrameTime);
    
    // Update all animations
    this.animations.forEach((animation, id) => {
      if (animation.enabled && !animation.paused && animation.instance) {
        try {
          animation.instance.update(timestamp, elapsed);
        } catch (error) {
          console.error(`[AnimationController] Error in animation "${id}":`, error);
        }
      }
    });
    
    // Performance tracking
    this.frameCount++;
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    if (this.performanceCheckInterval) {
      return;
    }
    
    this.frameCount = 0;
    this.fpsHistory = [];
    
    // Check FPS every second
    this.performanceCheckInterval = setInterval(() => {
      const fps = this.frameCount;
      this.frameCount = 0;
      this.fpsHistory.push(fps);
      
      // Keep only last 5 seconds
      if (this.fpsHistory.length > 5) {
        this.fpsHistory.shift();
      }
      
      // Calculate average FPS
      const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
      
      // Auto-throttle if performance is poor
      if (avgFps < 30 && this.performanceTier !== 'low') {
        console.warn('[AnimationController] Low FPS detected, reducing animation quality');
        this.throttleAnimations();
      }
      
      this.emitEvent('animation-controller:performance', { fps, avgFps });
    }, 1000);
  }

  /**
   * Stop performance monitoring
   */
  stopPerformanceMonitoring() {
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
      this.performanceCheckInterval = null;
    }
  }

  /**
   * Throttle animations for better performance
   */
  throttleAnimations() {
    // Reduce target FPS
    this.fps = 30;
    this.targetFrameTime = 1000 / this.fps;
    
    // Notify animations to reduce quality
    this.animations.forEach((animation) => {
      if (animation.instance && typeof animation.instance.reduceQuality === 'function') {
        animation.instance.reduceQuality();
      }
    });
    
    this.emitEvent('animation-controller:throttled');
  }

  /**
   * Dispose all animations and cleanup
   */
  disposeAll() {
    this.pauseAll();
    
    this.animations.forEach((animation, id) => {
      if (animation.instance && typeof animation.instance.dispose === 'function') {
        animation.instance.dispose();
      }
    });
    
    this.animations.clear();
    this.stopPerformanceMonitoring();
    
    this.emitEvent('animation-controller:disposed');
  }

  /**
   * Get animation count
   * @returns {number}
   */
  getAnimationCount() {
    return this.animations.size;
  }

  /**
   * Get performance stats
   * @returns {Object}
   */
  getStats() {
    const avgFps = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      : 0;
    
    return {
      animationCount: this.animations.size,
      isRunning: this.isRunning,
      fps: this.fps,
      avgFps: avgFps.toFixed(1),
      performanceTier: this.performanceTier,
      reducedMotion: this.shouldReduceMotion
    };
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
}


