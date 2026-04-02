/**
 * Time formatting utility
 * Formats seconds to mm:ss format for audio playback
 */

/**
 * Formats seconds to "m:ss" format (e.g., 32.123 → "0:32")
 * @param {number} seconds - The time in seconds
 * @returns {string} Formatted time string or '...' for invalid input
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) {
    return '...';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

