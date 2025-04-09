/**
 * Storage utilities for managing content in local storage
 */
import * as AudioStorage from './AudioStorageService';

// Storage keys
const STORAGE_KEYS = {
  CURRENT_FILE: 'text-reveal-current',
  HISTORY: 'text-reveal-history',
  FILES: 'text-reveal-files'
  // Removed AUDIO key since we're using IndexedDB now
};

// Maximum number of files to keep in history
const MAX_HISTORY = 10;

/**
 * Save a text file to local storage
 * @param {string} name - Name of the file
 * @param {Array} content - Processed content
 * @param {string} rawContent - Original raw content
 * @returns {string} File ID if successful, null otherwise
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

    return file.id;
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
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
export const deleteFile = async (fileId) => {
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

    // Remove any associated audio files using IndexedDB
    await AudioStorage.removeAudioForFile(fileId);

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Clear all storage
 */
export const clearAllStorage = async () => {
  localStorage.removeItem(STORAGE_KEYS.FILES);
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_FILE);

  // Clear audio storage from IndexedDB
  try {
    await AudioStorage.clearAllAudio();
  } catch (error) {
    console.error('Error clearing audio storage:', error);
  }
};

/**
 * ============================
 * Audio Storage Functions - Using IndexedDB
 * ============================
 */

/**
 * Save an audio file for a specific page
 * @param {string} fileId - ID of the text file
 * @param {number} pageIndex - Index of the page
 * @param {File} audioFile - Audio file object
 * @returns {Promise<string>} URL for the saved audio
 */
export const saveAudioFile = async (fileId, pageIndex, audioFile) => {
  try {
    await AudioStorage.saveAudio(fileId, pageIndex, audioFile);
    return await AudioStorage.getAudio(fileId, pageIndex);
  } catch (error) {
    console.error('Error saving audio file:', error);
    throw error;
  }
};

/**
 * Save multiple audio files at once
 * @param {string} fileId - ID of the text file
 * @param {File[]} audioFiles - Array of audio file objects
 * @returns {Promise<boolean>} Success indicator
 */
export const saveMultipleAudioFiles = async (fileId, audioFiles) => {
  try {
    return await AudioStorage.saveMultipleAudio(fileId, audioFiles);
  } catch (error) {
    console.error('Error saving multiple audio files:', error);
    return false;
  }
};

/**
 * Get audio URL for a specific page
 * @param {string} fileId - ID of the text file
 * @param {number} pageIndex - Index of the page
 * @returns {Promise<string|null>} URL for the audio, or null if not found
 */
export const getAudioForPage = async (fileId, pageIndex) => {
  try {
    return await AudioStorage.getAudio(fileId, pageIndex);
  } catch (error) {
    console.error('Error getting audio for page:', error);
    return null;
  }
};

/**
 * Remove all audio files for a text file
 * @param {string} fileId - ID of the text file
 * @returns {Promise<boolean>} Success indicator
 */
export const removeAudioForFile = async (fileId) => {
  try {
    return await AudioStorage.removeAudioForFile(fileId);
  } catch (error) {
    console.error('Error removing audio for file:', error);
    return false;
  }
};

/**
 * Check if a file has audio for all pages
 * @param {string} fileId - ID of the text file
 * @param {number} pageCount - Total number of pages
 * @returns {Promise<boolean>} True if all pages have audio
 */
export const hasAudioForAllPages = async (fileId, pageCount) => {
  try {
    return await AudioStorage.hasAudioForAllPages(fileId, pageCount);
  } catch (error) {
    console.error('Error checking for complete audio:', error);
    return false;
  }
};

// Expose functions to window for access from other scripts
if (typeof window !== 'undefined') {
  window.saveFile = saveFile;
  window.getCurrentFile = getCurrentFile;
  window.getRecentFiles = getRecentFiles;
  window.deleteFile = deleteFile;
  window.clearAllStorage = clearAllStorage;
  window.saveAudioFile = saveAudioFile;
  window.saveMultipleAudioFiles = saveMultipleAudioFiles;
  window.getAudioForPage = getAudioForPage;
  window.removeAudioForFile = removeAudioForFile;
}
