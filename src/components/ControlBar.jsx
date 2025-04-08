import React, { useState, useEffect } from 'react';
import AudioPlayer from './AudioPlayer';
import { saveAudioFile, getAudioForPage } from '../lib/storage';

/**
 * Control bar component for reader navigation and audio controls
 * @param {object} props - Component props
 * @param {string} props.fileId - Current file ID
 * @param {number} props.currentPage - Current page index
 * @param {number} props.totalPages - Total number of pages
 * @param {function} props.onPrevPage - Function to go to previous page
 * @param {function} props.onNextPage - Function to go to next page
 * @param {function} props.onExit - Function to exit reader
 * @param {string} props.audioSrc - Source URL for the audio file (optional)
 */
const ControlBar = ({
  fileId,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  onExit,
  audioSrc
}) => {
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;
  const [loading, setLoading] = useState(false);
  const [currentPageSaved, setCurrentPageSaved] = useState(currentPage);

  // Keep track of the current page to prevent reset when adding audio
  useEffect(() => {
    setCurrentPageSaved(currentPage);
  }, [currentPage]);

  const handleLoadAudio = async (file) => {
    if (!fileId) return;

    setLoading(true);
    try {
      // Save the current page to avoid navigation reset
      const savedPage = currentPageSaved;

      await saveAudioFile(fileId, savedPage, file);

      // Use a more targeted approach than full page reload
      const newAudioSrc = await getAudioForPage(fileId, savedPage);

      // Force refresh the audio player without page reload
      window.dispatchEvent(new CustomEvent('audioUpdated', {
        detail: { src: newAudioSrc }
      }));

      setLoading(false);
    } catch (error) {
      console.error('Error saving audio file:', error);
      alert('Failed to save audio file. Please try again.');
      setLoading(false);
    }
  };

  // Determine if we're in a high DPI context for responsive design
  const isHighDpi = window.matchMedia && window.matchMedia('(min-resolution: 150dpi)').matches;

  return (
    <div className={`control-bar ${isHighDpi ? 'control-bar-fixed' : ''}`}>
      <div className="navigation-section">
        <button
          className={`nav-button prev ${isFirstPage ? 'hidden' : ''}`}
          onClick={onPrevPage}
          disabled={isFirstPage}
          aria-label="Previous page"
        >
          &larr; Previous
        </button>

        <div className="page-indicator">
          {currentPage + 1} / {totalPages}
        </div>

        <button
          className={`nav-button next ${isLastPage ? 'hidden' : ''}`}
          onClick={onNextPage}
          disabled={isLastPage}
          aria-label="Next page"
        >
          Next &rarr;
        </button>
      </div>

      <div className="audio-section">
        {loading ? (
          <div className="loading-audio">Loading audio...</div>
        ) : (
          <AudioPlayer
            audioSrc={audioSrc}
            onLoadAudio={handleLoadAudio}
          />
        )}
      </div>

      <div className="exit-section">
        <button
          className="exit-button"
          onClick={onExit}
          aria-label="Exit reader"
        >
          Exit
        </button>
      </div>
    </div>
  );
};

export default ControlBar;
