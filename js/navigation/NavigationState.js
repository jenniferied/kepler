/**
 * NavigationState
 * Single responsibility: localStorage persistence for navigation state
 */
export class NavigationState {
  /**
   * @param {string} storageKey - Key for localStorage
   */
  constructor(storageKey = 'activePage') {
    this.storageKey = storageKey;
  }

  /**
   * Save active page to localStorage
   * @param {string} pageId - Page ID to save
   */
  saveActivePage(pageId) {
    try {
      localStorage.setItem(this.storageKey, pageId);
    } catch (error) {
      console.warn('[NavigationState] Failed to save to localStorage:', error);
    }
  }

  /**
   * Get saved active page from localStorage
   * @param {string} defaultPage - Default page if none saved
   * @returns {string} Page ID
   */
  getActivePage(defaultPage = 'overview') {
    try {
      return localStorage.getItem(this.storageKey) || defaultPage;
    } catch (error) {
      console.warn('[NavigationState] Failed to read from localStorage:', error);
      return defaultPage;
    }
  }

  /**
   * Clear saved state
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('[NavigationState] Failed to clear localStorage:', error);
    }
  }
}

