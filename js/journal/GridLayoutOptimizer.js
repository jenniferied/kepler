/**
 * GridLayoutOptimizer
 * Single responsibility: Smart grid layout optimization
 * Calculates and applies optimal grid spans for content bubbles
 */
export class GridLayoutOptimizer {
  constructor() {
    this.isTypingAnimationActive = false;
  }

  /**
   * Calculate optimal number of columns
   * @param {number} bubbleCount - Number of bubbles
   * @param {number} containerWidth - Container width in pixels
   * @returns {number} Optimal column count
   */
  calculateOptimalColumns(bubbleCount, containerWidth) {
    if (containerWidth >= 1200) {
      return Math.min(3, Math.max(1, bubbleCount));
    }
    
    if (containerWidth >= 768) {
      return Math.min(2, Math.max(1, bubbleCount));
    }
    
    return 1;
  }

  /**
   * Optimize grid layout
   * @param {HTMLElement} gridElement - Grid container element
   * @param {HTMLElement} targetBubble - Specific bubble to update (optional)
   */
  optimize(gridElement, targetBubble = null) {
    if (!gridElement) return;
    
    const bubbles = gridElement.querySelectorAll('.content-bubble');
    if (bubbles.length === 0) return;
    
    const containerWidth = gridElement.offsetWidth || window.innerWidth;
    const optimalColumns = this.calculateOptimalColumns(bubbles.length, containerWidth);
    
    // Set grid template columns
    gridElement.style.gridTemplateColumns = `repeat(${optimalColumns}, minmax(0, 1fr))`;
    gridElement.style.gridAutoFlow = 'row';
    
    // Clear any previously set row spans (legacy masonry approach)
    const bubblesArray = targetBubble
      ? [targetBubble].filter(b => b.classList.contains('content-bubble'))
      : Array.from(bubbles);

    bubblesArray.forEach((bubble) => {
      bubble.style.gridRowEnd = '';
    });
  }

  /**
   * Set typing animation active flag
   * @param {boolean} active - True if typing animation is active
   */
  setTypingAnimationActive(active) {
    this.isTypingAnimationActive = active;
  }

  /**
   * Get typing animation active state
   * @returns {boolean} True if active
   */
  getTypingAnimationActive() {
    return this.isTypingAnimationActive;
  }
}

