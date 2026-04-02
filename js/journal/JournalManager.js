/**
 * JournalManager
 * Main coordinator for journal system
 * Single responsibility: Coordinate all journal components and handle user interactions
 */
import { JournalLoader } from './JournalLoader.js';
import { MarkdownParser } from './MarkdownParser.js';
import { TimelineRenderer } from './TimelineRenderer.js';
import { EntryRenderer } from './EntryRenderer.js';
import { GridLayoutOptimizer } from './GridLayoutOptimizer.js';

export class JournalManager {
  /**
   * @param {Object} config - Configuration object
   * @param {HTMLElement} config.logbookContainer - Main logbook container
   * @param {HTMLElement} config.timelineContainer - Timeline container
   * @param {EventBus} config.eventBus - Event bus instance
   * @param {ImageGallery} config.imageGallery - Image gallery instance (optional)
   */
  constructor(config) {
    if (!config.logbookContainer || !config.timelineContainer) {
      throw new Error('[JournalManager] logbookContainer and timelineContainer required');
    }
    if (!config.eventBus) {
      throw new Error('[JournalManager] EventBus instance required');
    }

    this.logbookContainer = config.logbookContainer;
    this.timelineContainer = config.timelineContainer;
    this.eventBus = config.eventBus;
    this.imageGallery = config.imageGallery || null;
    
    // Create components
    this.loader = new JournalLoader();
    this.parser = new MarkdownParser();
    this.layoutOptimizer = new GridLayoutOptimizer();
    this.timelineRenderer = new TimelineRenderer(config.timelineContainer);
    this.entryRenderer = new EntryRenderer(
      config.logbookContainer, 
      this.layoutOptimizer,
      this.imageGallery
    );
    
    // State
    this.entries = [];
    this.currentEntryIndex = 0;
    this.isLoaded = false;
    
    // Bind methods
    this.handleResize = this.debounce(this.handleResize.bind(this), 150);
    this.handlePageChanged = this.handlePageChanged.bind(this);
  }

  /**
   * Initialize the journal manager
   */
  async initialize() {
    console.log('[JournalManager] Initializing...');

    // Listen to page navigation events
    this.eventBus.on('nav:pageChanged', this.handlePageChanged);

    // Setup resize handler
    window.addEventListener('resize', this.handleResize);

    // Load entries immediately (9 small markdown files — no performance concern)
    this.load();

    console.log('[JournalManager] Initialized');
  }

  /**
   * Load journal entries
   */
  async load() {
    if (this.isLoaded) {
      console.log('[JournalManager] Already loaded');
      return;
    }
    
    try {
      console.log('[JournalManager] Loading journal entries...');
      
      // Load all entries
      const rawEntries = await this.loader.loadAllEntries();
      
      // Process entries
      this.entries = rawEntries.map(rawEntry => {
        const date = this.loader.extractDate(rawEntry.filename);
        
        // Generate time based on date
        let time = '10:30';
        if (date.getDate() === 15) {
          time = '14:15';
        } else if (date.getDate() === 18) {
          time = '10:30';
        }
        
        // Remove date lines and first heading
        let markdown = this.parser.removeDateLines(rawEntry.markdown);
        markdown = this.parser.removeFirstHeading(markdown);
        
        // Extract title
        const title = this.parser.extractTitle(rawEntry.markdown);
        
        // Parse to HTML
        const html = this.parser.parse(markdown, { title, date, time });
        
        return {
          filename: rawEntry.filename,
          date,
          title,
          html,
          formattedDate: this.loader.formatDate(date)
        };
      });
      
      // Sort by date (oldest first)
      this.entries.sort((a, b) => a.date - b.date);
      
      console.log(`[JournalManager] Loaded ${this.entries.length} entries`);
      
      // Render timeline
      this.timelineRenderer.render(this.entries);
      
      // Select entry from URL hash, or default to newest
      const hashEntry = this.getEntryIndexFromHash();
      this.currentEntryIndex = hashEntry !== -1 ? hashEntry : this.entries.length - 1;
      this.selectEntry(this.currentEntryIndex);
      
      this.isLoaded = true;
      
      // Emit loaded event
      this.eventBus.emit('journal:loaded', { entryCount: this.entries.length });
      
    } catch (error) {
      console.error('[JournalManager] Failed to load journal:', error);
      this.showErrorState();
    }
  }

  /**
   * Select and display an entry
   * @param {number} index - Entry index
   */
  selectEntry(index) {
    if (index < 0 || index >= this.entries.length) {
      console.warn('[JournalManager] Invalid entry index:', index);
      return;
    }
    
    this.currentEntryIndex = index;
    const entry = this.entries[index];

    // Render entry
    this.entryRenderer.render(entry);

    // Update timeline
    this.timelineRenderer.updateActiveItem(index);

    // Update URL hash for deep linking
    const slug = entry.filename.replace('.md', '');
    history.replaceState(null, '', `#${slug}`);

    // Emit event
    this.eventBus.emit('journal:entrySelected', { index, entry });

    console.log('[JournalManager] Selected entry:', entry.title);
  }

  /**
   * Handle page changed event
   * @param {Object} data - Event data with pageId
   */
  handlePageChanged(data) {
    // Load journal when logbook page is shown
    if (data.pageId === 'logbook' && !this.isLoaded) {
      this.load();
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    const gridElement = this.logbookContainer.querySelector('.content-grid');
    if (gridElement) {
      this.layoutOptimizer.optimize(gridElement);
    }
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    this.logbookContainer.innerHTML = '<div class="logbook-entry"><p class="text-gray-400">Lade Journal-Einträge...</p></div>';
    this.timelineContainer.innerHTML = '';
  }

  /**
   * Show error state
   */
  showErrorState() {
    this.logbookContainer.innerHTML = '<div class="logbook-entry"><p class="text-gray-400">Fehler beim Laden der Journal-Einträge.</p></div>';
    this.timelineContainer.innerHTML = '';
  }

  /**
   * Find entry index from URL hash (e.g. #journal-2026-01-11-ki-verstehen)
   * @returns {number} Entry index or -1 if not found
   */
  getEntryIndexFromHash() {
    const hash = location.hash.slice(1); // remove #
    if (!hash.startsWith('journal-')) return -1;
    return this.entries.findIndex(e => e.filename.replace('.md', '') === hash);
  }

  /**
   * Get current entry
   * @returns {Object|null} Current entry object
   */
  getCurrentEntry() {
    return this.entries[this.currentEntryIndex] || null;
  }

  /**
   * Get all entries
   * @returns {Array} Array of all entries
   */
  getAllEntries() {
    return this.entries;
  }

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Dispose and clean up
   */
  dispose() {
    // Remove event listeners
    this.eventBus.off('nav:pageChanged', this.handlePageChanged);
    window.removeEventListener('resize', this.handleResize);
    
    // Dispose components
    this.entryRenderer.dispose();
    
    console.log('[JournalManager] Disposed');
  }
}

/**
 * Global function for selecting entries
 * Called from onclick in timeline HTML
 * @param {number} index - Entry index
 */
window.selectEntry = function(index) {
  // Find the journal manager instance via the app
  if (window.everythingMachineApp) {
    const journalManager = window.everythingMachineApp.uiComponents.get('journal-manager');
    if (journalManager) {
      journalManager.selectEntry(index);
    }
  }
};

