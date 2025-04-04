import React, { useState, useRef, useEffect } from 'react';
import { parseText, parseJson, prepareForReader } from '../lib/parser';
import { saveFile } from '../lib/storage';
import { isJsonFile } from '../lib/utils';

const FileLoader = () => {
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setError('');
    setSuccess('');
  }, [filename, content]);

  const loadFile = (file) => {
    setFilename(file.name);

    const reader = new FileReader();
    reader.onload = (e) => setContent(e.target.result);
    reader.onerror = () => setError('Failed to read file');

    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) loadFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content) {
      setError('Please enter or upload content');
      return;
    }

    try {
      const parsed = isJsonFile(filename) ? parseJson(content) : parseText(content);

      if (!parsed || !parsed.length) {
        setError('Invalid content format');
        return;
      }

      const processed = prepareForReader(parsed);
      const name = filename || 'Untitled ' + new Date().toLocaleDateString();
      const success = saveFile(name, processed, content);

      if (success) {
        setSuccess(`Successfully saved "${name}"`);
        setFilename('');
        setContent('');
        setTimeout(() => (window.location.href = '/reader'), 1500);
      } else {
        setError('Failed to save content');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to process content: ' + err.message);
    }
  };

  return (
    <div className="file-loader">
      <h2>Load Text Content</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div
          className="drop-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current.click()}
        >
          <p>Drop a file here or click to select</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept=".txt,.json"
          />
          {filename && <p className="filename">Selected: {filename}</p>}
        </div>

        <div className="or-divider">Or paste content directly</div>

        <textarea
          placeholder="Paste text content here in the specified format..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={() => setFilename('')}
          rows={10}
        />

        <div className="format-help">
          <details>
            <summary>View formatting guide</summary>
            <pre>{`
title,

This is the text. Use double underscores (__) for blanks.
[answer1, answer2]

PAGE

Another title,
Another section with __ and __
[another1, another2]
            `}</pre>
          </details>
        </div>

        <button type="submit" className="submit-button">
          Load Content
        </button>
      </form>
    </div>
  );
};

export default FileLoader;

