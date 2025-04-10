import React, { useState, useRef, useEffect } from 'react';

/**
 * Audio Player component for the reader
 * @param {object} props - Component props
 * @param {string} props.audioSrc - Source URL for the audio file
 * @param {function} props.onLoadAudio - Function to handle loading a new audio file
 * @param {boolean} props.compact - Whether to display in compact mode for presentation
 */
const AudioPlayer = ({ audioSrc, onLoadAudio, compact = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  // Listen for audio updates from the control bar
  useEffect(() => {
    const handleAudioUpdate = (event) => {
      if (event.detail && event.detail.src) {
        // Update the audio source directly
        if (audioRef.current) {
          audioRef.current.src = event.detail.src;
          audioRef.current.load();
        }
      }
    };

    window.addEventListener('audioUpdated', handleAudioUpdate);
    return () => {
      window.removeEventListener('audioUpdated', handleAudioUpdate);
    };
  }, []);

  useEffect(() => {
    // Reset player state when audio source changes
    if (audioRef.current) {
      setIsPlaying(false);
      setCurrentTime(0);
      audioRef.current.currentTime = 0;
    }
  }, [audioSrc]);

  // Load metadata when audio file is loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Update current time during playback
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle audio playback errors
  const handleError = (e) => {
    console.error('Audio playback error:', e);
    // Could add more advanced error handling here
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Add a play promise with error handling
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Play error:", error);
          setIsPlaying(false);
        });
      }
    }

    setIsPlaying(!isPlaying);
  };

  // Handle seeking in the audio timeline
  const handleSeek = (e) => {
    if (!audioRef.current) return;

    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Format time in MM:SS
  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Trigger file input click
  const handleLoadAudioClick = () => {
    fileInputRef.current.click();
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onLoadAudio) {
      onLoadAudio(file);
    }
  };

  // If no audio source is provided, show the upload button
  if (!audioSrc) {
    return (
      <div className={`audio-player empty ${compact ? 'compact' : ''}`}>
        <button
          className="add-audio-button"
          onClick={handleLoadAudioClick}
        >
          {compact ? '+' : 'Add Audio File'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="audio/*"
        />
      </div>
    );
  }

  return (
    <div className={`audio-player ${compact ? 'compact' : ''}`}>
      <audio
        ref={audioRef}
        src={audioSrc}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onError={handleError}
      />

      <button
        className={`play-button ${isPlaying ? 'pause' : 'play'}`}
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>

      <div className="audio-controls">
        {!compact && <span className="time-display">{formatTime(currentTime)}</span>}
        <input
          type="range"
          className="seek-slider"
          min="0"
          max={duration || 0}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
        />
        {!compact && <span className="time-display">{formatTime(duration)}</span>}
      </div>

      {!compact && (
        <button
          className="replace-audio-button"
          onClick={handleLoadAudioClick}
          aria-label="Replace audio file"
        >
          ↻
        </button>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="audio/*"
      />
    </div>
  );
};

export default AudioPlayer;
