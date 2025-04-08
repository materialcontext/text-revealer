/**
 * Storage utilities for managing content in local storage
 */

// Storage keys
const STORAGE_KEYS = {
  CURRENT_FILE: 'text-reveal-current',
  HISTORY: 'text-reveal-history',
  FILES: 'text-reveal-files'
};

// Maximum number of files to keep in history
const MAX_HISTORY = 10;

/**
 * Save a text file to local storage
 * @param {string} name - Name of the file
 * @param {Array} content - Processed content
 * @param {string} rawContent - Original raw content
 * @returns {boolean} Success indicator
 */
export const saveFile = (name, content, rawContent) => {
  try {
    // Create file object
    const file = {
      id: generateId(),
      name,
      content,
      rawContent,
      timestamp: Date.now()
    };

    // Save the file
    const files = getAllFiles();
    files[file.id] = file;

    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));

    // Update history
    addToHistory(file.id);

    // Set as current file
    setCurrentFile(file.id);

    return true;
  } catch (error) {
    console.error('Error saving file:', error);
    return false;
  }
};

/**
 * Generate a unique ID for a file
 * @returns {string} Unique ID
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * Add a file ID to the recent history
 * @param {string} fileId - ID of the file to add
 */
export const addToHistory = (fileId) => {
  try {
    const history = getHistory();

    // Remove the ID if it already exists in history
    const existingIndex = history.indexOf(fileId);
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }

    // Add the ID to the start of history
    history.unshift(fileId);

    // Trim history if it's too long
    if (history.length > MAX_HISTORY) {
      history.length = MAX_HISTORY;
    }

    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Error updating history:', error);
  }
};

/**
 * Set the current active file
 * @param {string} fileId - ID of the current file
 */
export const setCurrentFile = (fileId) => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_FILE, fileId);
};

/**
 * Get the current file
 * @returns {object|null} Current file or null if none
 */
export const getCurrentFile = () => {
  const fileId = localStorage.getItem(STORAGE_KEYS.CURRENT_FILE);
  if (!fileId) return null;

  const files = getAllFiles();
  return files[fileId] || null;
};

/**
 * Get all saved files
 * @returns {object} Map of file ID to file object
 */
export const getAllFiles = () => {
  try {
    const filesJson = localStorage.getItem(STORAGE_KEYS.FILES);
    return filesJson ? JSON.parse(filesJson) : {};
  } catch (error) {
    console.error('Error getting files:', error);
    return {};
  }
};

/**
 * Get recent history
 * @returns {Array} Array of file IDs in recency order
 */
export const getHistory = () => {
  try {
    const historyJson = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
};

/**
 * Get recent files based on history
 * @returns {Array} Array of recent file objects
 */
export const getRecentFiles = () => {
  const history = getHistory();
  const files = getAllFiles();

  return history
    .map(id => files[id])
    .filter(Boolean); // Remove null entries
};

/**
 * Delete a file
 * @param {string} fileId - ID of the file to delete
 * @returns {boolean} Success indicator
 */
export const deleteFile = (fileId) => {
  try {
    // Remove from files
    const files = getAllFiles();
    if (files[fileId]) {
      delete files[fileId];
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
    }

    // Remove from history
    const history = getHistory();
    const index = history.indexOf(fileId);
    if (index !== -1) {
      history.splice(index, 1);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    }

    // Update current file if needed
    if (localStorage.getItem(STORAGE_KEYS.CURRENT_FILE) === fileId) {
      if (history.length > 0) {
        setCurrentFile(history[0]);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_FILE);
      }
    }

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Clear all storage
 */
export const clearAllStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.FILES);
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_FILE);
};

// Expose functions to window for access from other scripts
if (typeof window !== 'undefined') {
  window.saveFile = saveFile;
  window.getCurrentFile = getCurrentFile;
  window.getRecentFiles = getRecentFiles;
  window.deleteFile = deleteFile;
  window.clearAllStorage = clearAllStorage;
}
