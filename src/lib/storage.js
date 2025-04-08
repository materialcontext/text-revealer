/**
 * Storage utilities for managing content in local storage
 */

// Storage keys
const STORAGE_KEYS = {
  CURRENT_FILE: 'text-reveal-current',
  HISTORY: 'text-reveal-history',
  FILES: 'text-reveal-files',
  AUDIO: 'text-reveal-audio'
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

    // Remove any associated audio files
    removeAudioForFile(fileId);

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
  localStorage.removeItem(STORAGE_KEYS.AUDIO);
};

/**
 * ============================
 * Audio Storage Functions
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
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const audioData = event.target.result;
          const audioMap = getAudioMap();

          if (!audioMap[fileId]) {
            audioMap[fileId] = {};
          }

          // Store as base64 data URI
          audioMap[fileId][pageIndex] = audioData;

          localStorage.setItem(STORAGE_KEYS.AUDIO, JSON.stringify(audioMap));
          resolve(audioData);
        } catch (error) {
          console.error('Error saving audio data:', error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading audio file:', error);
        reject(error);
      };

      reader.readAsDataURL(audioFile);
    } catch (error) {
      console.error('Error in saveAudioFile:', error);
      reject(error);
    }
  });
};

/**
 * Save multiple audio files at once
 * @param {string} fileId - ID of the text file
 * @param {File[]} audioFiles - Array of audio file objects
 * @returns {Promise<boolean>} Success indicator
 */
export const saveMultipleAudioFiles = async (fileId, audioFiles) => {
  try {
    const audioMap = getAudioMap();

    if (!audioMap[fileId]) {
      audioMap[fileId] = {};
    }

    // Process each file
    const savePromises = audioFiles.map((file, index) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
          audioMap[fileId][index] = event.target.result;
          resolve();
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    await Promise.all(savePromises);

    // Save the updated map
    localStorage.setItem(STORAGE_KEYS.AUDIO, JSON.stringify(audioMap));
    return true;
  } catch (error) {
    console.error('Error saving multiple audio files:', error);
    return false;
  }
};

/**
 * Get audio URL for a specific page
 * @param {string} fileId - ID of the text file
 * @param {number} pageIndex - Index of the page
 * @returns {string|null} URL for the audio, or null if not found
 */
export const getAudioForPage = (fileId, pageIndex) => {
  try {
    const audioMap = getAudioMap();
    return audioMap[fileId] && audioMap[fileId][pageIndex] ? audioMap[fileId][pageIndex] : null;
  } catch (error) {
    console.error('Error getting audio for page:', error);
    return null;
  }
};

/**
 * Remove all audio files for a text file
 * @param {string} fileId - ID of the text file
 * @returns {boolean} Success indicator
 */
export const removeAudioForFile = (fileId) => {
  try {
    const audioMap = getAudioMap();

    if (audioMap[fileId]) {
      delete audioMap[fileId];
      localStorage.setItem(STORAGE_KEYS.AUDIO, JSON.stringify(audioMap));
    }

    return true;
  } catch (error) {
    console.error('Error removing audio for file:', error);
    return false;
  }
};

/**
 * Get the complete audio map
 * @returns {object} Map of fileId to pageIndex to audio URL
 */
export const getAudioMap = () => {
  try {
    const audioJson = localStorage.getItem(STORAGE_KEYS.AUDIO);
    return audioJson ? JSON.parse(audioJson) : {};
  } catch (error) {
    console.error('Error getting audio map:', error);
    return {};
  }
};

/**
 * Check if a file has audio for all pages
 * @param {string} fileId - ID of the text file
 * @param {number} pageCount - Total number of pages
 * @returns {boolean} True if all pages have audio
 */
export const hasAudioForAllPages = (fileId, pageCount) => {
  try {
    const audioMap = getAudioMap();

    if (!audioMap[fileId]) return false;

    for (let i = 0; i < pageCount; i++) {
      if (!audioMap[fileId][i]) {
        return false;
      }
    }

    return true;
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
