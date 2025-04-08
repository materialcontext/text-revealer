import React, { useRef, useState } from 'react';
import { saveMultipleAudioFiles } from '../lib/storage';

/**
 * Component for uploading multiple audio files at once
 * @param {object} props - Component props
 * @param {string} props.fileId - ID of the text file
 * @param {number} props.pageCount - Total number of pages
 * @param {function} props.onSuccess - Callback on successful upload
 */
const AudioUploader = ({ fileId, pageCount, onSuccess }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);

    if (!files.length) return;

    setError('');
    setLoading(true);

    try {
      // Validate number of files
      if (files.length !== pageCount) {
        setError(`Please select exactly ${pageCount} audio files, one for each page.`);
        return;
      }

      // Validate file types
      const invalidFiles = files.filter(file => !file.type.startsWith('audio/'));
      if (invalidFiles.length > 0) {
        setError('Some selected files are not audio files.');
        return;
      }

      // Sort files by name if they're numbered
      const sortedFiles = [...files].sort((a, b) => {
        // Try to extract numbers from filenames for proper ordering
        const aMatch = a.name.match(/(\d+)/);
        const bMatch = b.name.match(/(\d+)/);

        if (aMatch && bMatch) {
          return parseInt(aMatch[0], 10) - parseInt(bMatch[0], 10);
        }

        return a.name.localeCompare(b.name);
      });

      const success = await saveMultipleAudioFiles(fileId, sortedFiles);

      if (success) {
        if (onSuccess) onSuccess();
      } else {
        setError('Failed to save audio files.');
      }
    } catch (error) {
      console.error('Error in bulk audio upload:', error);
      setError('An error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFolder = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="audio-uploader">
      <h3>Add Audio Files</h3>

      <p className="instruction">
        Upload {pageCount} audio files - one for each page. Files should be numbered to match page order.
      </p>

      {error && <div className="error-message">{error}</div>}

      <button
        className="upload-button"
        onClick={handleSelectFolder}
        disabled={loading}
      >
        {loading ? 'Uploading...' : 'Select Audio Files'}
      </button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="audio/*"
        multiple
      />

      <div className="file-format-note">
        <strong>Note:</strong> Accepted formats include MP3, WAV, OGG and other browser-supported audio formats.
      </div>
    </div>
  );
};

export default AudioUploader;
