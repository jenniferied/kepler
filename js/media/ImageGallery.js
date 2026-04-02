/**
 * ImageGallery - Single Responsibility: Enhanced image gallery with touch gestures
 * Extends the existing lightbox implementation with additional features
 */
export class ImageGallery {
  constructor(eventBus = null, lazyLoader = null) {
    this.eventBus = eventBus;
    this.lazyLoader = lazyLoader;
    
    this.galleries = new Map();
    this.currentGallery = null;
    this.currentIndex = 0;
    this.isOpen = false;
    
    // Touch gesture support
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.touchThreshold = 50;
    
    // Keyboard support
    this.keyboardHandler = null;
  }

  /**
   * Initialize the gallery system
   */
  initialize() {
    // Setup keyboard navigation
    this.keyboardHandler = (e) => this.handleKeyboard(e);
    
    // Touch gesture support
    this.setupTouchGestures();
    
    this.emitEvent('image-gallery:initialized');
  }

  /**
   * Register a gallery from DOM elements
   * @param {string} galleryId - Unique gallery ID
   * @param {NodeList|Array} images - Image elements
   * @param {Object} options - Gallery options
   */
  registerGallery(galleryId, images, options = {}) {
    const imagesArray = images instanceof NodeList 
      ? Array.from(images)
      : Array.isArray(images) 
      ? images 
      : [images];
    
    // Extract gallery data
    const galleryData = imagesArray.map((img, index) => {
      // Find caption
      let caption = '';
      const figure = img.closest('figure');
      if (figure) {
        const figcaption = figure.querySelector('figcaption');
        if (figcaption) {
          caption = figcaption.textContent.trim();
        }
      }
      if (!caption) {
        caption = img.getAttribute('alt') || '';
      }
      
      return {
        element: img,
        src: img.src || img.dataset.src,
        thumbnail: img.src,
        alt: img.getAttribute('alt') || '',
        caption: caption,
        index: index
      };
    });
    
    this.galleries.set(galleryId, {
      images: galleryData,
      options: options
    });
    
    // Add click handlers (store reference for cleanup)
    galleryData.forEach((imageData) => {
      imageData.clickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openGallery(galleryId, imageData.index);
      };
      imageData.element.addEventListener('click', imageData.clickHandler);

      // Add cursor pointer
      imageData.element.style.cursor = 'pointer';
      imageData.element.classList.add('gallery-image');
    });
    
    this.emitEvent('image-gallery:registered', { galleryId, count: galleryData.length });
  }

  /**
   * Unregister a gallery and cleanup its resources
   * @param {string} galleryId - Gallery ID to unregister
   * @returns {boolean} - True if gallery was found and removed
   */
  unregisterGallery(galleryId) {
    if (!this.galleries.has(galleryId)) {
      return false;
    }

    const gallery = this.galleries.get(galleryId);

    // Remove click handlers from existing elements
    gallery.images.forEach((imageData) => {
      if (imageData.element && imageData.clickHandler) {
        imageData.element.removeEventListener('click', imageData.clickHandler);
        imageData.element.style.cursor = '';
        imageData.element.classList.remove('gallery-image');
      }
    });

    // If this gallery is currently open, close it
    if (this.currentGallery === gallery) {
      this.closeGallery();
    }

    this.galleries.delete(galleryId);
    this.emitEvent('image-gallery:unregistered', { galleryId });

    return true;
  }

  /**
   * Open a gallery at specific index
   * @param {string} galleryId - Gallery ID
   * @param {number} startIndex - Starting image index
   */
  openGallery(galleryId, startIndex = 0) {
    if (!this.galleries.has(galleryId)) {
      console.error(`[ImageGallery] Gallery "${galleryId}" not found`);
      return;
    }
    
    this.currentGallery = this.galleries.get(galleryId);
    this.currentIndex = Math.max(0, Math.min(startIndex, this.currentGallery.images.length - 1));
    this.isOpen = true;
    
    // Show lightbox
    this.showLightbox();
    
    // Add keyboard listener
    document.addEventListener('keydown', this.keyboardHandler);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    this.emitEvent('image-gallery:opened', { galleryId, index: this.currentIndex });
  }

  /**
   * Close the current gallery
   */
  closeGallery() {
    if (!this.isOpen) {
      return;
    }
    
    this.hideLightbox();
    
    // Remove keyboard listener
    document.removeEventListener('keydown', this.keyboardHandler);
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    this.isOpen = false;
    this.currentGallery = null;
    
    this.emitEvent('image-gallery:closed');
  }

  /**
   * Navigate to previous image
   */
  previous() {
    if (!this.currentGallery) {
      return;
    }
    
    this.currentIndex--;
    
    // Loop to end
    if (this.currentIndex < 0) {
      this.currentIndex = this.currentGallery.images.length - 1;
    }
    
    this.updateLightbox();
    this.emitEvent('image-gallery:navigate', { direction: 'previous', index: this.currentIndex });
  }

  /**
   * Navigate to next image
   */
  next() {
    if (!this.currentGallery) {
      return;
    }
    
    this.currentIndex++;
    
    // Loop to start
    if (this.currentIndex >= this.currentGallery.images.length) {
      this.currentIndex = 0;
    }
    
    this.updateLightbox();
    this.emitEvent('image-gallery:navigate', { direction: 'next', index: this.currentIndex });
  }

  /**
   * Show lightbox with current image
   */
  showLightbox() {
    // Use existing lightbox overlay or create one
    let overlay = document.getElementById('image-lightbox-overlay');
    
    if (!overlay) {
      // Lightbox should already exist from the main app
      console.warn('[ImageGallery] Lightbox overlay not found');
      return;
    }
    
    this.updateLightbox();
    overlay.classList.add('active');
  }

  /**
   * Update lightbox content
   */
  updateLightbox() {
    if (!this.currentGallery) {
      return;
    }
    
    const imageData = this.currentGallery.images[this.currentIndex];
    const image = document.getElementById('image-lightbox-image');
    const caption = document.getElementById('image-lightbox-caption');
    const counter = document.getElementById('image-lightbox-counter');
    
    if (image) {
      image.src = imageData.src;
      image.alt = imageData.alt;
    }
    
    if (caption) {
      if (imageData.caption) {
        caption.textContent = imageData.caption;
        caption.style.display = 'block';
      } else {
        caption.style.display = 'none';
      }
    }
    
    if (counter && this.currentGallery.images.length > 1) {
      counter.textContent = `${this.currentIndex + 1} / ${this.currentGallery.images.length}`;
      counter.style.display = 'block';
    } else if (counter) {
      counter.style.display = 'none';
    }
    
    // Preload adjacent images
    this.preloadAdjacent();
  }

  /**
   * Hide lightbox
   */
  hideLightbox() {
    const overlay = document.getElementById('image-lightbox-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  /**
   * Preload adjacent images for faster navigation
   */
  preloadAdjacent() {
    if (!this.currentGallery) {
      return;
    }
    
    const images = this.currentGallery.images;
    const prevIndex = (this.currentIndex - 1 + images.length) % images.length;
    const nextIndex = (this.currentIndex + 1) % images.length;
    
    // Preload previous and next
    [prevIndex, nextIndex].forEach(index => {
      const img = new Image();
      img.src = images[index].src;
    });
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyboard(e) {
    if (!this.isOpen) {
      return;
    }
    
    switch (e.key) {
      case 'Escape':
        this.closeGallery();
        break;
      case 'ArrowLeft':
        this.previous();
        e.preventDefault();
        break;
      case 'ArrowRight':
        this.next();
        e.preventDefault();
        break;
    }
  }

  /**
   * Setup touch gestures for mobile swipe
   */
  setupTouchGestures() {
    let overlay = null;
    
    // Wait for DOM to be ready
    const setupGestures = () => {
      overlay = document.getElementById('image-lightbox-overlay');
      
      if (!overlay) {
        return;
      }
      
      overlay.addEventListener('touchstart', (e) => {
        this.touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      
      overlay.addEventListener('touchend', (e) => {
        this.touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe();
      }, { passive: true });
    };
    
    // Try now, or wait for DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupGestures);
    } else {
      setupGestures();
    }
  }

  /**
   * Handle swipe gestures
   */
  handleSwipe() {
    if (!this.isOpen) {
      return;
    }
    
    const diff = this.touchStartX - this.touchEndX;
    
    // Swipe left (next)
    if (diff > this.touchThreshold) {
      this.next();
    }
    // Swipe right (previous)
    else if (diff < -this.touchThreshold) {
      this.previous();
    }
  }

  /**
   * Auto-initialize galleries from DOM
   * Finds all images with [data-gallery] attribute
   */
  autoInitialize() {
    const galleryImages = document.querySelectorAll('[data-gallery]');
    const galleries = {};
    
    // Group images by gallery ID
    galleryImages.forEach(img => {
      const galleryId = img.dataset.gallery;
      if (!galleries[galleryId]) {
        galleries[galleryId] = [];
      }
      galleries[galleryId].push(img);
    });
    
    // Register each gallery
    Object.keys(galleries).forEach(galleryId => {
      this.registerGallery(galleryId, galleries[galleryId]);
    });
    
    // Also integrate with existing lightbox system
    this.integrateExistingLightbox();
  }

  /**
   * Integrate with existing lightbox navigation
   */
  integrateExistingLightbox() {
    // Connect to existing navigation buttons
    const prevBtn = document.querySelector('.image-lightbox-nav.prev');
    const nextBtn = document.querySelector('.image-lightbox-nav.next');
    const closeBtn = document.querySelector('.image-lightbox-close');
    const overlay = document.getElementById('image-lightbox-overlay');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.previous());
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.next());
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeGallery());
    }
    
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        // Only close if clicking directly on overlay
        if (e.target === overlay) {
          this.closeGallery();
        }
      });
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose() {
    document.removeEventListener('keydown', this.keyboardHandler);
    this.galleries.clear();
    this.closeGallery();
    
    this.emitEvent('image-gallery:disposed');
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


