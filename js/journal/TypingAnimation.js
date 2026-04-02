/**
 * TypingAnimation
 * Single responsibility: Title typing effect
 * Animates text appearance character by character
 */
export class TypingAnimation {
  /**
   * @param {HTMLElement} element - Element to animate
   * @param {string} text - Text to type
   * @param {Object} options - Animation options
   */
  constructor(element, text, options = {}) {
    if (!element) {
      throw new Error('[TypingAnimation] Element required');
    }

    this.element = element;
    this.text = text || '';
    this.options = {
      speed: options.speed || 55, // Base speed in ms
      speedVariation: options.speedVariation || 45, // Random variation
      onComplete: options.onComplete || null,
      onProgress: options.onProgress || null
    };
    
    this.isRunning = false;
    this.index = 0;
    this.typedSpan = null;
    this.caret = null;
    this.timeoutId = null;
  }

  /**
   * Start the typing animation
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.index = 0;
    
    // Clear element and setup
    this.element.textContent = '';
    this.element.classList.add('journal-title-typing');
    
    // Create typed text span
    this.typedSpan = document.createElement('span');
    this.typedSpan.className = 'journal-title-text';
    this.element.appendChild(this.typedSpan);
    
    // Create caret
    this.caret = document.createElement('span');
    this.caret.className = 'journal-title-caret';
    this.element.appendChild(this.caret);
    
    // Start typing
    this.typeNext();
  }

  /**
   * Type next character
   */
  typeNext() {
    if (!this.isRunning) return;
    
    if (this.index < this.text.length) {
      // Add next character
      this.typedSpan.textContent += this.text[this.index];
      this.index++;
      
      // Call progress callback
      if (this.options.onProgress) {
        this.options.onProgress(this.index, this.text.length);
      }
      
      // Schedule next character
      const delay = this.options.speed + Math.random() * this.options.speedVariation;
      this.timeoutId = setTimeout(() => this.typeNext(), delay);
    } else {
      // Animation complete
      this.complete();
    }
  }

  /**
   * Complete the animation
   */
  complete() {
    this.isRunning = false;
    
    // Make caret blink
    if (this.caret) {
      this.caret.classList.add('blink');
    }
    
    // Call completion callback
    if (this.options.onComplete) {
      this.options.onComplete();
    }
  }

  /**
   * Stop the animation
   */
  stop() {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Get current progress
   * @returns {Object} Object with current index and total length
   */
  getProgress() {
    return {
      current: this.index,
      total: this.text.length,
      percentage: this.text.length > 0 ? (this.index / this.text.length) * 100 : 0
    };
  }

  /**
   * Check if animation is running
   * @returns {boolean} True if running
   */
  isAnimating() {
    return this.isRunning;
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    this.stop();
    if (this.element) {
      this.element.classList.remove('journal-title-typing');
    }
  }
}

