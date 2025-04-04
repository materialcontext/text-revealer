import React, { useState, useEffect } from 'react';
import { getRecentFiles, setCurrentFile, deleteFile } from '../lib/storage';
import { formatDate, truncateText, countContent } from '../lib/utils';

const FileHistory = () => {
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

  const renderFilePreview = (file) => {
    const counts = countContent(file.content);

    // Get the first few words of the first page for preview
    let preview = '';
    if (file.content && file.content.length > 0) {
      const firstPage = file.content[0];
      if (firstPage.sections && firstPage.sections.length > 0) {
        const firstText = firstPage.sections[0].text;
        preview = truncateText(firstText.replace(/\_\_/g, '___'), 100);
      }
    }

    return (
      <div className="file-preview">
        <h3>{file.name}</h3>
        <div className="file-meta">
          <span>{formatDate(file.timestamp)}</span>
          <span>{counts.pages} pages</span>
          <span>{counts.blanks} blanks</span>
        </div>
        <p className="preview-text">{preview}</p>
      </div>
    );
  };

  if (recentFiles.length === 0) {
    return (
      <div className="file-history empty">
        <h2>Recent Files</h2>
        <p>No recent files found. Use the form above to load new content.</p>
      </div>
    );
  }

  return (
    <div className="file-history">
      <h2>Recent Files</h2>
      <div className="file-list">
        {recentFiles.map(file => (
          <div
            key={file.id}
            className="file-item"
            onClick={() => handleSelectFile(file.id)}
          >
            {renderFilePreview(file)}
            <div className="file-actions">
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
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileHistory;
