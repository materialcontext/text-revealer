/**
 * AudioStorageService.js - IndexedDB implementation for audio storage
 * This service provides methods to save and retrieve audio files using IndexedDB
 * which is better for larger files than localStorage
 */

// Constants
const DB_NAME = 'text-reveal-db';
const DB_VERSION = 1;
const AUDIO_STORE = 'audio-files';

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>} - The database instance
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Create the audio store if it doesn't exist
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        const store = db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
        // Create an index for fileId to quickly retrieve all audio for a file
        store.createIndex('fileId', 'fileId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
};

/**
 * Save a single audio file
 * @param {string} fileId - ID of the text file
 * @param {number} pageIndex - Index of the page
 * @param {File} audioFile - The audio file to save
 * @returns {Promise<string>} - Promise resolving to the audio data URL
 */
export const saveAudioFile = async (fileId, pageIndex, audioFile) => {
  try {
    // First, read the file as a data URL
    const audioData = await readFileAsDataURL(audioFile);

    // Then save it to IndexedDB
    const db = await initDB();

    // Generate a unique ID for this audio entry
    const id = `${fileId}_${pageIndex}`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(AUDIO_STORE, 'readwrite');
      const store = transaction.objectStore(AUDIO_STORE);

      // Prepare the object to store
      const audioObject = {
        id,
        fileId,
        pageIndex,
        data: audioData,
        timestamp: Date.now()
      };

      // Add the audio to the store
      const request = store.put(audioObject);

      request.onsuccess = () => {
        resolve(audioData);
      };

      request.onerror = (event) => {
        console.error('Error saving audio file:', event.target.error);
        reject(event.target.error);
      };

      // Handle transaction completion
      transaction.oncomplete = () => {
        db.close();
      };

      transaction.onerror = (event) => {
        console.error('Transaction error:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Error in saveAudioFile:', error);
    throw error;
  }
};

/**
 * Save multiple audio files at once
 * @param {string} fileId - ID of the text file
 * @param {Array<File>} audioFiles - Array of audio files
 * @returns {Promise<boolean>} - Promise resolving to success status
 */
export const saveMultipleAudioFiles = async (fileId, audioFiles) => {
  try {
    // First, read all files as data URLs - outside of any transaction
    const audioDataArray = await Promise.all(
      audioFiles.map(async (file, index) => {
        const data = await readFileAsDataURL(file);
        return {
          id: `${fileId}_${index}`,
          fileId,
          pageIndex: index,
          data,
          timestamp: Date.now()
        };
      })
    );

    // Then save them all in a single transaction
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(AUDIO_STORE, 'readwrite');
      const store = transaction.objectStore(AUDIO_STORE);

      // Track success
      let successCount = 0;

      // Process each audio file
      audioDataArray.forEach((audioObject) => {
        const request = store.put(audioObject);

        request.onsuccess = () => {
          successCount++;

          // If all files have been processed successfully, resolve
          if (successCount === audioDataArray.length) {
            // Transaction will commit automatically
          }
        };

        request.onerror = (event) => {
          console.error('Error saving audio object:', event.target.error);
          // We continue processing other files even if one fails
        };
      });

      // Handle transaction events
      transaction.oncomplete = () => {
        db.close();
        resolve(true);
      };

      transaction.onerror = (event) => {
        console.error('Transaction error:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Error in saveMultipleAudioFiles:', error);
    return false;
  }
};

/**
 * Get audio for a specific page
 * @param {string} fileId - ID of the text file
 * @param {number} pageIndex - Index of the page
 * @returns {Promise<string|null>} - Promise resolving to audio data URL or null
 */
export const getAudioForPage = async (fileId, pageIndex) => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(AUDIO_STORE, 'readonly');
      const store = transaction.objectStore(AUDIO_STORE);

      // Get the audio with the compound key
      const request = store.get(`${fileId}_${pageIndex}`);

      request.onsuccess = (event) => {
        const result = event.target.result;
        resolve(result ? result.data : null);
      };

      request.onerror = (event) => {
        console.error('Error getting audio:', event.target.error);
        reject(event.target.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in getAudioForPage:', error);
    return null;
  }
};

/**
 * Remove all audio files for a specific text file
 * @param {string} fileId - ID of the text file
 * @returns {Promise<boolean>} - Promise resolving to success status
 */
export const removeAudioForFile = async (fileId) => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(AUDIO_STORE, 'readwrite');
      const store = transaction.objectStore(AUDIO_STORE);
      const index = store.index('fileId');

      // Get all records with this fileId
      const request = index.openCursor(IDBKeyRange.only(fileId));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          // Delete this record
          cursor.delete();
          // Move to the next record
          cursor.continue();
        }
      };

      request.onerror = (event) => {
        console.error('Error removing audio:', event.target.error);
        reject(event.target.error);
      };

      transaction.oncomplete = () => {
        db.close();
        resolve(true);
      };

      transaction.onerror = (event) => {
        console.error('Transaction error:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Error in removeAudioForFile:', error);
    return false;
  }
};

/**
 * Check if all pages have associated audio files
 * @param {string} fileId - ID of the text file
 * @param {number} pageCount - Total number of pages
 * @returns {Promise<boolean>} - Promise resolving to whether all pages have audio
 */
export const hasAudioForAllPages = async (fileId, pageCount) => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(AUDIO_STORE, 'readonly');
      const store = transaction.objectStore(AUDIO_STORE);
      const index = store.index('fileId');

      // Get all records with this fileId
      const request = index.getAll(IDBKeyRange.only(fileId));

      request.onsuccess = (event) => {
        const results = event.target.result;

        // Check if we have audio for each page
        if (results.length < pageCount) {
          resolve(false);
          return;
        }

        // Create a set of page indices that have audio
        const pagesWithAudio = new Set(results.map(item => item.pageIndex));

        // Check if all pages have audio
        for (let i = 0; i < pageCount; i++) {
          if (!pagesWithAudio.has(i)) {
            resolve(false);
            return;
          }
        }

        resolve(true);
      };

      request.onerror = (event) => {
        console.error('Error checking audio:', event.target.error);
        reject(event.target.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in hasAudioForAllPages:', error);
    return false;
  }
};

/**
 * Helper function to read a file as a data URL
 * @param {File} file - The file to read
 * @returns {Promise<string>} - Promise resolving to data URL
 */
const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      resolve(event.target.result);
    };

    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };

    reader.readAsDataURL(file);
  });
};

// Export for use in other files
export default {
  saveAudioFile,
  saveMultipleAudioFiles,
  getAudioForPage,
  removeAudioForFile,
  hasAudioForAllPages
};
