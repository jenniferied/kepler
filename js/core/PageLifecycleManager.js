/**
 * PageLifecycleManager
 * Suspends heavy components when leaving a page, reactivates when returning.
 * Prevents all pages from staying alive in memory simultaneously.
 */
export class PageLifecycleManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.pages = new Map(); // pageId -> { activate, suspend }[]
    this.activePage = null;

    this.eventBus.on('nav:pageChanged', (data) => {
      this._onPageChanged(data.pageId);
    });
  }

  /**
   * Register a component's lifecycle for a specific page
   * @param {string} pageId - The page this component belongs to
   * @param {Object} lifecycle - { activate: Function, suspend: Function }
   */
  register(pageId, { activate, suspend }) {
    if (!this.pages.has(pageId)) {
      this.pages.set(pageId, []);
    }
    this.pages.get(pageId).push({ activate, suspend });
  }

  /**
   * Handle page change: suspend old page, activate new page
   */
  _onPageChanged(newPageId) {
    if (newPageId === this.activePage) return;

    const oldPageId = this.activePage;

    // Suspend old page components
    if (oldPageId && this.pages.has(oldPageId)) {
      for (const entry of this.pages.get(oldPageId)) {
        try {
          entry.suspend();
        } catch (e) {
          console.error(`[PageLifecycle] Suspend error (${oldPageId}):`, e);
        }
      }
      console.log(`[PageLifecycle] Suspended: ${oldPageId}`);
    }

    // Activate new page components
    if (this.pages.has(newPageId)) {
      for (const entry of this.pages.get(newPageId)) {
        try {
          entry.activate();
        } catch (e) {
          console.error(`[PageLifecycle] Activate error (${newPageId}):`, e);
        }
      }
      console.log(`[PageLifecycle] Activated: ${newPageId}`);
    }

    this.activePage = newPageId;
  }

  dispose() {
    this.pages.clear();
    this.activePage = null;
  }
}
