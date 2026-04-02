/**
 * PageNavigator
 * Single responsibility: Page switching logic
 * Manages active page state and emits navigation events
 */
export class PageNavigator {
  /**
   * @param {EventBus} eventBus - Event bus for communication
   * @param {NavigationState} navigationState - State persistence
   */
  constructor(eventBus, navigationState) {
    if (!eventBus) {
      throw new Error('[PageNavigator] EventBus instance required');
    }

    this.eventBus = eventBus;
    this.navigationState = navigationState;
    this.currentPageId = null;
    
    // Get DOM elements
    this.pages = document.querySelectorAll('.page-content');
    this.dropdownItems = document.querySelectorAll('#dropdown-menu .dropdown-item');
    this.toggleButton = document.getElementById('contents-toggle');
  }

  /**
   * Initialize the navigator
   */
  initialize() {
    // Load saved page or default
    const savedPage = this.navigationState ? 
      this.navigationState.getActivePage('overview') : 
      'overview';
    
    this.showPage(savedPage, null, false); // Don't save on initial load
    
    console.log('[PageNavigator] Initialized');
  }

  /**
   * Show a page
   * @param {string} pageId - Page ID to show
   * @param {HTMLElement} clickedElement - The menu item that was clicked (optional)
   * @param {boolean} saveToStorage - Whether to save to localStorage
   */
  showPage(pageId, clickedElement = null, saveToStorage = true) {
    // Hide all pages
    this.pages.forEach(page => {
      page.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) {
      targetPage.classList.add('active');
    } else {
      console.error('[PageNavigator] Page not found:', pageId);
      return;
    }
    
    // Update active state in dropdown
    this.dropdownItems.forEach(item => {
      item.classList.remove('active');
    });
    
    if (clickedElement) {
      clickedElement.classList.add('active');
    } else {
      // Find and activate the correct menu item
      const menuItem = document.querySelector(`[data-page="${pageId}"]`);
      if (menuItem) {
        menuItem.classList.add('active');
      }
    }
    
    // Update toggle button state
    if (this.toggleButton) {
      this.toggleButton.classList.add('active');
    }
    
    // Save to localStorage
    if (saveToStorage && this.navigationState) {
      this.navigationState.saveActivePage(pageId);
    }
    
    // Update current page
    this.currentPageId = pageId;
    
    // Emit navigation event
    this.eventBus.emit('nav:pageChanged', { pageId, previousPageId: this.currentPageId });
    
    console.log('[PageNavigator] Navigated to:', pageId);
  }

  /**
   * Get current page ID
   * @returns {string} Current page ID
   */
  getCurrentPage() {
    return this.currentPageId;
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    console.log('[PageNavigator] Disposed');
  }
}

