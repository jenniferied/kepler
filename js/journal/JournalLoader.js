/**
 * JournalLoader
 * Single responsibility: Fetch journal data from files
 * Returns promises for async data loading
 */
export class JournalLoader {
  /**
   * @param {string} manifestPath - Path to journal manifest JSON
   */
  constructor(manifestPath = 'journal/manifest.json') {
    this.manifestPath = manifestPath;
    this.manifest = null;
  }

  /**
   * Load the journal manifest
   * @returns {Promise<Array>} Array of journal file paths
   */
  async loadManifest() {
    try {
      console.log('[JournalLoader] Loading manifest...');
      const response = await fetch(this.manifestPath);
      
      if (!response.ok) {
        throw new Error(`Manifest not found: ${response.status}`);
      }
      
      this.manifest = await response.json();
      console.log(`[JournalLoader] Manifest loaded: ${this.manifest.length} entries`);
      return this.manifest;
    } catch (error) {
      console.error('[JournalLoader] Failed to load manifest:', error);
      throw error;
    }
  }

  /**
   * Load a single journal entry
   * @param {string} filename - Path to markdown file
   * @returns {Promise<string>} Markdown content
   */
  async loadEntry(filename) {
    try {
      console.log(`[JournalLoader] Loading ${filename}...`);
      const response = await fetch(filename);
      
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.status}`);
      }
      
      const markdown = await response.text();
      console.log(`[JournalLoader] Loaded ${filename} (${markdown.length} chars)`);
      return markdown;
    } catch (error) {
      console.error(`[JournalLoader] Failed to load ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Load all journal entries from manifest (parallel loading)
   * @returns {Promise<Array>} Array of entry objects with markdown content
   */
  async loadAllEntries() {
    if (!this.manifest) {
      await this.loadManifest();
    }

    // Load all entries in parallel for better performance
    const results = await Promise.all(
      this.manifest.map(async (filename) => {
        try {
          const markdown = await this.loadEntry(filename);
          return { filename, markdown };
        } catch (error) {
          console.warn(`[JournalLoader] Skipping ${filename} due to error`);
          return null;
        }
      })
    );

    // Filter out failed entries while preserving order
    const entries = results.filter((entry) => entry !== null);

    console.log(`[JournalLoader] Loaded ${entries.length} entries`);
    return entries;
  }

  /**
   * Extract date from filename (format: journal-YYYY-MM-DD-...)
   * @param {string} filename - Journal filename
   * @returns {Date} Extracted date
   */
  extractDate(filename) {
    const match = filename.match(/journal-(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
    return new Date(0); // Fallback
  }

  /**
   * Format date for display
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
  }
}

