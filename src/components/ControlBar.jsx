import React, { useState, useEffect, useRef } from 'react';
import AudioPlayer from './AudioPlayer';
import { saveAudioFile, getAudioForPage } from '../lib/AudioStorageService';

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
 * @param {boolean} props.presentationMode - Whether in presentation mode
 * @param {function} props.onToggleMode - Function to toggle presentation mode
 */
const ControlBar = ({
  fileId,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  onExit,
  audioSrc,
  presentationMode,
  onToggleMode
}) => {
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;
  const [loading, setLoading] = useState(false);
  const [currentPageSaved, setCurrentPageSaved] = useState(currentPage);
  const [isVisible, setIsVisible] = useState(true);
  const hideTimeoutRef = useRef(null);
  const controlBarRef = useRef(null);

  // Keep track of the current page to prevent reset when adding audio
  useEffect(() => {
    setCurrentPageSaved(currentPage);
  }, [currentPage]);

  // Handle auto-hide behavior for presentation mode
useEffect(() => {
  // Reset state when presentationMode changes
  setIsVisible(true);

  if (!presentationMode) {
    // Clear any existing timeout when not in presentation mode
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    return;
  }

  const handleMouseMove = (e) => {
    // Check if mouse is near the bottom of the screen
    const windowHeight = window.innerHeight;
    const threshold = windowHeight * 0.08; // Bottom 15% of the screen

    // Directly set visibility based on position without timeouts
    setIsVisible(e.clientY > windowHeight - threshold);
  };

  // Add event listener
  window.addEventListener('mousemove', handleMouseMove);

  // Clean up
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };
}, [presentationMode]);

  const handleLoadAudio = async (file) => {
    if (!fileId) return;

    setLoading(true);
    try {
      // Save the current page to avoid navigation reset
      const savedPage = currentPageSaved;

      // Use the IndexedDB implementation
      await saveAudioFile(fileId, savedPage, file);

      // Get the updated audio source
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

  // Presentation mode classes
  const controlBarClasses = [
    'control-bar',
    presentationMode ? 'presentation-mode' : '',
    presentationMode && !isVisible ? 'hidden' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={controlBarClasses} ref={controlBarRef}>
      <div className="navigation-section">
        <button
          className={`nav-button prev ${isFirstPage ? 'hidden' : ''}`}
          onClick={onPrevPage}
          disabled={isFirstPage}
          aria-label="Previous page"
        >
          {presentationMode ? '←' : '← Previous'}
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
          {presentationMode ? '→' : 'Next →'}
        </button>
      </div>

      <div className="audio-section">
        {loading ? (
          <div className="loading-audio">Loading audio...</div>
        ) : (
          <AudioPlayer
            audioSrc={audioSrc}
            onLoadAudio={handleLoadAudio}
            compact={presentationMode}
          />
        )}
      </div>

      <div className="exit-section">
        <button
          className="mode-toggle-button"
          onClick={onToggleMode}
          aria-label="Toggle presentation mode"
        >
          {presentationMode ? 'Exit Present' : 'Present'}
        </button>
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
