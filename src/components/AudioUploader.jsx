import React, { useRef, useState } from 'react';
import { saveMultipleAudioFiles } from '../lib/storage';

/**
 * Component for uploading multiple audio files at once
 * @param {object} props - Component props
 * @param {string} props.fileId - ID of the text file
 * @param {number} props.pageCount - Total number of pages
 * @param {function} props.onSuccess - Callback on successful upload
 * @param {function} props.onCancel - Callback when upload is cancelled
 */
const AudioUploader = ({ fileId, pageCount, onSuccess, onCancel }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setError('');
  };

  const handleUpload = async () => {
    if (!files.length) {
      setError('Please select audio files first');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Validate number of files
      if (files.length !== pageCount) {
        setError(`Please select exactly ${pageCount} audio files, one for each page.`);
        setLoading(false);
        return;
      }

      // Validate file types
      const invalidFiles = files.filter(file => !file.type.startsWith('audio/'));
      if (invalidFiles.length > 0) {
        setError('Some selected files are not audio files.');
        setLoading(false);
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

  const handleSelectFiles = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="audio-uploader">
      <h3>Add Audio Files</h3>

      <p className="instruction">
        Upload {pageCount} audio files - one for each page. Files should be numbered to match page order.
      </p>

      {error && <div className="error-message">{error}</div>}

      <div className="file-selection">
        <button
          className="upload-button"
          onClick={handleSelectFiles}
          disabled={loading}
        >
          {files.length > 0 ? 'Change Selection' : 'Select Audio Files'}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="audio/*"
          multiple
        />

        {files.length > 0 && (
          <div className="selected-files">
            <p>{files.length} file(s) selected</p>
            <ul className="file-list">
              {files.slice(0, 3).map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
              {files.length > 3 && <li>...and {files.length - 3} more</li>}
            </ul>
          </div>
        )}
      </div>

      <div className="audio-uploader-actions">
        <button
          className="btn-primary"
          onClick={handleUpload}
          disabled={loading || files.length === 0}
        >
          {loading ? 'Uploading...' : 'Upload Audio Files'}
        </button>

        <button
          className="btn-ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Skip
        </button>
      </div>

      <div className="file-format-note">
        <strong>Note:</strong> Accepted formats include MP3, WAV, OGG and other browser-supported audio formats.
      </div>
    </div>
  );
};

export default AudioUploader;
