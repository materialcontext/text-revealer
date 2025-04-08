import React, { useState, useEffect } from 'react';
import { getRecentFiles, setCurrentFile, deleteFile } from '../lib/storage';
import { formatDate, truncateText, countContent } from '../lib/utils';

const CompactFileHistory = () => {
  const [recentFiles, setRecentFiles] = useState([]);

  useEffect(() => {
    // Load recent files on component mount
    loadRecentFiles();
  }, []);

  const loadRecentFiles = () => {
    const files = getRecentFiles();
    setRecentFiles(files);
  };

  const handleSelectFile = (fileId) => {
    setCurrentFile(fileId);
    // Redirect to reader
    window.location.href = '/reader';
  };

  const handleDeleteFile = (e, fileId) => {
    e.stopPropagation(); // Prevent triggering the parent click

    if (window.confirm('Are you sure you want to delete this file?')) {
      const success = deleteFile(fileId);
      if (success) {
        // Refresh the list
        loadRecentFiles();
      }
    }
  };

  if (recentFiles.length === 0) {
    return null;
  }

  return (
    <div className="compact-file-history">
      <h2>Recent Files</h2>

      <div className="compact-file-list">
        {recentFiles.map(file => {
          const counts = countContent(file.content);

          return (
            <div
              key={file.id}
              className="compact-file-item"
              onClick={() => handleSelectFile(file.id)}
            >
              <div className="file-info">
                <div className="file-name">{truncateText(file.name, 30)}</div>
                <div className="file-meta">
                  <span>{formatDate(file.timestamp)}</span>
                  <span>{counts.pages} pg</span>
                  <span>{counts.blanks} blanks</span>
                </div>
              </div>
              <div className="compact-actions">
                <button
                  className="open-button"
                  onClick={() => handleSelectFile(file.id)}
                >
                  Open
                </button>
                <button
                  className="delete-button"
                  onClick={(e) => handleDeleteFile(e, file.id)}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompactFileHistory;
