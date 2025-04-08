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
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const [savedFileId, setSavedFileId] = useState(null);
  const [pageCount, setPageCount] = useState(0);
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
      setPageCount(processed.length);

      if (!fileId) {
        setError('Failed to save content');
        return;
      }

      setSavedFileId(fileId);
      setSuccess(`Successfully saved "${name}"`);

      // If audio upload is enabled but no files selected yet, show the prompt
      if (includeAudio) {
        setShowAudioPrompt(true);
      } else {
        setTimeout(() => {
          redirectToReader(fileId);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to process content: ' + err.message);
    }
  };

  const handleAudioUpload = async () => {
    if (audioFiles.length !== pageCount) {
      setError(`Number of audio files (${audioFiles.length}) doesn't match number of pages (${pageCount}). Please select ${pageCount} audio files.`);
      return;
    }

    try {
      const audioSuccess = await saveMultipleAudioFiles(savedFileId, audioFiles);
      if (!audioSuccess) {
        setError('Content was saved but failed to save audio files');
      } else {
        setSuccess(`Successfully saved content and ${audioFiles.length} audio files`);
        setTimeout(() => {
          redirectToReader(savedFileId);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError('Error uploading audio files: ' + err.message);
    }
  };

  const redirectToReader = (fileId) => {
    window.location.href = '/reader';
  };

  const handleCancelAudio = () => {
    setShowAudioPrompt(false);
    redirectToReader(savedFileId);
  };

  const handleSelectAudio = () => {
    audioInputRef.current.click();
  };

  if (showAudioPrompt && savedFileId) {
    return (
      <div className="audio-prompt-container">
        <h2>Add Audio Files</h2>
        <p>Your content has been saved. Would you like to add audio files for each page?</p>

        <div className="audio-info">
          <p>Please select <strong>{pageCount}</strong> audio file{pageCount !== 1 ? 's' : ''}, one for each page of your content:</p>
          <button className="audio-select-button" onClick={handleSelectAudio}>
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
              <p>{audioFiles.length} audio file{audioFiles.length !== 1 ? 's' : ''} selected</p>
              <ul className="audio-files-list">
                {audioFiles.slice(0, 5).map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
                {audioFiles.length > 5 && <li>...and {audioFiles.length - 5} more</li>}
              </ul>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="audio-prompt-actions">
          <button
            className="btn-primary"
            onClick={handleAudioUpload}
            disabled={audioFiles.length === 0}
          >
            Upload Audio Files
          </button>
          <button className="btn-ghost" onClick={handleCancelAudio}>
            Skip and Continue
          </button>
        </div>
      </div>
    );
  }

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
            <div className="format-content">
              <p>Use this format:</p>
              <pre>
title,

this is a text with blanks like __ and __
[answer1, answer2]

PAGE

next page title,
another paragraph with __
[answer]
              </pre>
              <ul className="format-rules">
                <li>Start each section with a title followed by a comma</li>
                <li>Use <code>__</code> for blanks</li>
                <li>Put answers in <code>[]</code> after the paragraph</li>
                <li>Separate pages with "PAGE" (or two newlines)</li>
              </ul>
            </div>
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
            <div className="audio-notice">
              <p>You'll be prompted to select audio files after your content is loaded.</p>
              <p className="audio-note">
                Note: You'll need one audio file for each page in your content.
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
