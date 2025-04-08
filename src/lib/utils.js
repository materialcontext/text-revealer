/**
 * Utility functions for the text reveal app
 */

/**
 * Format a timestamp to a readable date string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
};

/**
 * Truncate text if it's too long
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Count pages, sections, and blanks in content
 * @param {Array} pages - Array of page objects
 * @returns {object} Count object
 */
export const countContent = (pages) => {
  let totalBlanks = 0;
  let totalSections = 0;

  pages.forEach(page => {
    totalSections += page.sections.length;
    page.sections.forEach(section => {
      // Count blanks in each section
      const matches = section.text.match(/\_\_/g);
      if (matches) {
        totalBlanks += matches.length;
      }
    });
  });

  return {
    pages: pages.length,
    sections: totalSections,
    blanks: totalBlanks
  };
};

/**
 * Get file extension from filename
 * @param {string} filename - Filename to check
 * @returns {string} File extension
 */
const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

/**
 * Check if a file is JSON
 * @param {string} filename - Filename to check
 * @returns {boolean} True if JSON
 */
export const isJsonFile = (filename) => {
  return getFileExtension(filename) === 'json';
};

/**
 * Handle keyboard events for navigation
 * @param {function} onLeft - Left key function
 * @param {function} onRight - Right key function
 * @param {function} onPrev - Up key function
 * @param {function} onNext - Down key function
 * @returns {function} Keydown event handler
 */
export const createKeyboardHandler = (onLeft, onRight, onPrev, onNext) => {
  return (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        if (onLeft) onLeft();
        break;
      case 'ArrowRight':
        if (onRight) onRight();
        break;
      case 'ArrowUp':
        if (onPrev) onPrev();
        break;
      case 'ArrowDown':
        if (onNext) onNext();
        break;
    }
  };
};
