import React, { useState, useRef, useEffect } from 'react';
import { parseText, parseJson, prepareForReader } from '../lib/parser';
import { saveFile, saveMultipleAudioFiles } from '../lib/storage';
import { isJsonFile } from '../lib/utils';

const FileLoader = () => {
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [audioFiles, setAudioFiles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [includeAudio, setIncludeAudio] = useState(false);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);

  useEffect(() => {
    setError('');
    setSuccess('');
  }, [filename, content, audioFiles]);

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

  const handleAudioFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setAudioFiles(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleSubmit = async (e) => {
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
      const fileId = saveFile(name, processed, content);

      if (!fileId) {
        setError('Failed to save content');
        return;
      }

      // Handle audio files if included
      if (includeAudio && audioFiles.length > 0) {
        if (audioFiles.length !== processed.length) {
          setError(`Number of audio files (${audioFiles.length}) doesn't match number of pages (${processed.length}). Content was saved without audio.`);
        } else {
          const audioSuccess = await saveMultipleAudioFiles(fileId, audioFiles);
          if (!audioSuccess) {
            setError('Content was saved but failed to save audio files');
          }
        }
      }

      setSuccess(`Successfully saved "${name}"`);
      setFilename('');
      setContent('');
      setAudioFiles([]);
      setIncludeAudio(false);
      setTimeout(() => (window.location.href = '/reader'), 1500);
    } catch (err) {
      console.error(err);
      setError('Failed to process content: ' + err.message);
    }
  };

  const handleSelectAudio = () => {
    audioInputRef.current.click();
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

        <div className="audio-option">
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={includeAudio}
              onChange={(e) => setIncludeAudio(e.target.checked)}
            />
            <span className="checkbox-label">Include audio files</span>
          </label>

          {includeAudio && (
            <div className="audio-files-section">
              <button
                type="button"
                className="audio-select-button"
                onClick={handleSelectAudio}
              >
                Select Audio Files
              </button>
              <input
                type="file"
                ref={audioInputRef}
                onChange={handleAudioFilesChange}
                style={{ display: 'none' }}
                accept="audio/*"
                multiple
              />
              {audioFiles.length > 0 && (
                <div className="audio-files-info">
                  <p>{audioFiles.length} audio file(s) selected</p>
                  <ul className="audio-files-list">
                    {audioFiles.slice(0, 5).map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                    {audioFiles.length > 5 && <li>...and {audioFiles.length - 5} more</li>}
                  </ul>
                </div>
              )}
              <p className="audio-note">
                Note: Number of audio files should match the number of pages in your content.
                Files will be assigned to pages in the order they are selected.
              </p>
            </div>
          )}
        </div>

        <button type="submit" className="submit-button">
          Load Content
        </button>
      </form>
    </div>
  );
};

export default FileLoader;
