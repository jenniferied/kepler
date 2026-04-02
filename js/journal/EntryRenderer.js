/**
 * EntryRenderer
 * Single responsibility: Render journal entries
 * Displays single entry with grid layout and animations
 */
import { TypingAnimation } from './TypingAnimation.js';
import { GridLayoutOptimizer } from './GridLayoutOptimizer.js';

export class EntryRenderer {
  /**
   * @param {HTMLElement} container - Container element for entries
   * @param {GridLayoutOptimizer} layoutOptimizer - Layout optimizer instance
   * @param {ImageGallery} imageGallery - Image gallery instance (optional)
   */
  constructor(container, layoutOptimizer, imageGallery = null) {
    if (!container) {
      throw new Error('[EntryRenderer] Container element required');
    }
    if (!layoutOptimizer) {
      throw new Error('[EntryRenderer] GridLayoutOptimizer required');
    }

    this.container = container;
    this.layoutOptimizer = layoutOptimizer;
    this.imageGallery = imageGallery;
    this.currentAnimation = null;
  }

  /**
   * Render an entry
   * @param {Object} entry - Entry object with html property
   */
  render(entry) {
    // Stop any existing animation
    if (this.currentAnimation) {
      this.currentAnimation.stop();
      this.currentAnimation = null;
    }
    
    // Insert HTML
    let html = entry.html;
    
    // Ensure content-grid wrapper exists
    if (!html.includes('content-grid')) {
      html = `<div class="content-grid">${html}</div>`;
    }
    
    this.container.innerHTML = html;
    
    // Get grid element
    const gridElement = this.container.querySelector('.content-grid');
    if (!gridElement) {
      console.warn('[EntryRenderer] No content-grid found');
      return;
    }
    
    // Setup image load listeners for layout optimization
    this.setupMediaLoadListeners(gridElement);
    
    // Initial layout optimization
    setTimeout(() => {
      this.layoutOptimizer.optimize(gridElement);
    }, 0);
    
    // Setup typing animation for title
    this.setupTypingAnimation(gridElement);
    
    // Initialize image lightbox/gallery
    this.initializeImageLightbox(gridElement);

    // Initialize audio viewers
    this.initializeAudioViewers(gridElement);

    // Listen for expandable content toggles (world-info, reflection, details)
    this.setupToggleListeners(gridElement);

    console.log('[EntryRenderer] Entry rendered');
  }

  /**
   * Initialize image lightbox for entry images
   * @param {HTMLElement} gridElement - Grid element
   */
  initializeImageLightbox(gridElement) {
    if (!this.imageGallery) {
      console.warn('[EntryRenderer] No ImageGallery instance available');
      return;
    }

    // Find ALL images in the entire entry (not per-bubble)
    // Filter out chat avatars to avoid 40+ tiny images in gallery
    const allImages = Array.from(gridElement.querySelectorAll('img'))
      .filter(img => !img.closest('.chat-avatar'));

    if (allImages.length === 0) return;

    // Register a single gallery for the entire entry
    const galleryId = 'journal-entry-gallery';

    // Cleanup old gallery before registering new one
    this.imageGallery.unregisterGallery(galleryId);

    this.imageGallery.registerGallery(galleryId, allImages);
  }

  /**
   * Setup media load listeners to trigger layout optimization
   * @param {HTMLElement} gridElement - Grid element
   */
  setupMediaLoadListeners(gridElement) {
    const mediaElements = gridElement.querySelectorAll('img, video');
    
    const requestOptimize = () => {
      window.requestAnimationFrame(() => {
        this.layoutOptimizer.optimize(gridElement);
      });
    };
    
    mediaElements.forEach(element => {
      if (element.complete || element.readyState >= 2) {
        requestOptimize();
      } else {
        element.addEventListener('load', requestOptimize, { once: true });
        element.addEventListener('error', requestOptimize, { once: true });
      }
    });
  }

  /**
   * Setup typing animation for title
   * @param {HTMLElement} gridElement - Grid element
   */
  setupTypingAnimation(gridElement) {
    const titleElement = this.container.querySelector('.journal-title');
    if (!titleElement) return;
    
    const text = titleElement.dataset.fullText || titleElement.textContent.trim();
    const titleBubble = titleElement.closest('.content-bubble');
    
    if (!titleBubble) return;
    
    // Set typing animation active flag
    this.layoutOptimizer.setTypingAnimationActive(true);
    
    // Track last height for optimization
    let lastTitleBubbleHeight = titleBubble.offsetHeight;
    let layoutUpdateScheduled = false;
    
    // Create typing animation
    this.currentAnimation = new TypingAnimation(titleElement, text, {
      speed: 55,
      speedVariation: 45,
      onProgress: () => {
        // Schedule layout update on character add
        if (layoutUpdateScheduled) return;
        layoutUpdateScheduled = true;
        
        requestAnimationFrame(() => {
          const currentHeight = titleBubble.offsetHeight;
          const heightDiff = Math.abs(currentHeight - lastTitleBubbleHeight);
          
          if (heightDiff > 1) {
            lastTitleBubbleHeight = currentHeight;
            this.layoutOptimizer.optimize(gridElement);
          }
          
          layoutUpdateScheduled = false;
        });
      },
      onComplete: () => {
        // Final layout update
        requestAnimationFrame(() => {
          this.layoutOptimizer.optimize(gridElement);
        });
        
        // Reset typing flag
        setTimeout(() => {
          this.layoutOptimizer.setTypingAnimationActive(false);
        }, 300);
      }
    });
    
    // Start animation after delay
    setTimeout(() => {
      this.currentAnimation.start();
    }, 300);
  }

  /**
   * Clear the container
   */
  clear() {
    if (this.currentAnimation) {
      this.currentAnimation.stop();
      this.currentAnimation = null;
    }

    // Cleanup gallery before destroying DOM
    if (this.imageGallery) {
      this.imageGallery.unregisterGallery('journal-entry-gallery');
    }

    this.container.innerHTML = '';
  }

  /**
   * Initialize audio viewers within the entry
   * @param {HTMLElement} gridElement - Grid element
   */
  initializeAudioViewers(gridElement) {
    const audioContainers = gridElement.querySelectorAll('[data-audio-viewer]');

    if (audioContainers.length === 0) return;

    // Get app instance for eventBus
    const app = window.everythingMachineApp;

    audioContainers.forEach((container, index) => {
      // Parse tracks from data attribute
      let tracks = [];
      try {
        const tracksData = container.dataset.tracks;
        if (tracksData) {
          tracks = JSON.parse(tracksData);
        }
      } catch (e) {
        console.warn('[EntryRenderer] Failed to parse audio tracks:', e);
        return;
      }

      if (tracks.length === 0) return;

      const prompt = container.dataset.prompt || null;
      const artist = container.dataset.artist || '';

      // Dynamic import to avoid circular dependencies
      import('../viewers/AudioViewer.js').then(({ AudioViewer }) => {
        const audioViewer = new AudioViewer(
          container,
          { tracks, prompt, artist },
          app?.eventBus || null
        );

        // Setup immediately since already in viewport
        audioViewer.setup();

        // Listen for description toggle to trigger layout optimization
        if (app?.eventBus) {
          app.eventBus.on('audio:descriptionToggled', () => {
            requestAnimationFrame(() => {
              this.layoutOptimizer.optimize(gridElement);
            });
          });
        }

        // Track for potential cleanup
        if (app?.viewers) {
          app.viewers.set(`journal-audio-${index}`, audioViewer);
        }

        console.log(`[EntryRenderer] AudioViewer ${index + 1} initialized`);
      }).catch(err => {
        console.error('[EntryRenderer] Failed to load AudioViewer:', err);
      });
    });
  }

  /**
   * Setup listeners for expandable content (world-info, reflection, details)
   * Re-optimizes grid layout when content height changes
   * @param {HTMLElement} gridElement - Grid element
   */
  setupToggleListeners(gridElement) {
    const reoptimize = () => {
      requestAnimationFrame(() => {
        this.layoutOptimizer.optimize(gridElement);
      });
    };

    // <details> toggle (reflection transcript)
    gridElement.addEventListener('toggle', reoptimize, true);

    // World-info and reflection-info use class toggle via global functions
    // Listen for clicks on their toggle buttons and re-optimize after transition
    gridElement.addEventListener('click', (e) => {
      if (e.target.closest('.world-info-toggle') || e.target.closest('.reflection-info-toggle')) {
        // Small delay to let CSS transition/content render
        setTimeout(reoptimize, 50);
      }
    });

    // Also handle reflection widget (outside grid) — it's appended after .content-grid
    const reflectionWidget = gridElement.parentElement?.querySelector('.reflection-widget');
    if (reflectionWidget) {
      reflectionWidget.addEventListener('toggle', reoptimize, true);
      reflectionWidget.addEventListener('click', (e) => {
        if (e.target.closest('.reflection-info-toggle')) {
          setTimeout(reoptimize, 50);
        }
      });
    }
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    this.clear();
  }
}

