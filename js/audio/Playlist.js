/**
 * Playlist
 * Single responsibility: Manage playlist data
 * Provides read-only access to playlist tracks
 */
export class Playlist {
  /**
   * @param {Array} playlistData - Array of track objects
   */
  constructor(playlistData) {
    if (!Array.isArray(playlistData)) {
      throw new Error('[Playlist] Constructor requires an array of tracks');
    }
    this.tracks = Object.freeze([...playlistData]); // Immutable copy
  }

  /**
   * Get a track by index
   * @param {number} index - Track index
   * @returns {Object|null} Track object or null if invalid index
   */
  getTrack(index) {
    if (index < 0 || index >= this.tracks.length) {
      return null;
    }
    return this.tracks[index];
  }

  /**
   * Get the total number of tracks
   * @returns {number} Number of tracks in playlist
   */
  getLength() {
    return this.tracks.length;
  }

  /**
   * Get all tracks (immutable)
   * @returns {Array} Array of all tracks
   */
  getAll() {
    return this.tracks;
  }

  /**
   * Check if an index is valid
   * @param {number} index - Index to check
   * @returns {boolean} True if index is valid
   */
  isValidIndex(index) {
    return index >= 0 && index < this.tracks.length;
  }

  /**
   * Get next track index (wraps around)
   * @param {number} currentIndex - Current track index
   * @returns {number} Next track index
   */
  getNextIndex(currentIndex) {
    return (currentIndex + 1) % this.tracks.length;
  }

  /**
   * Get previous track index (wraps around)
   * @param {number} currentIndex - Current track index
   * @returns {number} Previous track index
   */
  getPreviousIndex(currentIndex) {
    return (currentIndex - 1 + this.tracks.length) % this.tracks.length;
  }
}

