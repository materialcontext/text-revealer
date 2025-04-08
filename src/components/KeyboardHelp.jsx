import React, { useState, useEffect } from 'react';

const KeyboardHelp = () => {
  // Start hidden on mobile, visible on desktop
  const [visible, setVisible] = useState(false);

  // Check for first visit and show help on desktop
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem('keyboard-help-seen');
    const isMobile = window.innerWidth < 768;

    if (!hasSeenHelp && !isMobile) {
      setVisible(true);
      localStorage.setItem('keyboard-help-seen', 'true');

      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, []);

  const toggleVisibility = () => {
    setVisible(!visible);
  };

  return (
    <>
      <button
        className="keyboard-toggle"
        onClick={toggleVisibility}
        aria-label="Keyboard shortcuts help"
      >
        ?
      </button>

      <div className={`keyboard-help ${visible ? 'visible' : 'hidden'}`}>
        <h4>Keyboard Controls</h4>
        <div className="keyboard-help-grid">
          <div><span className="key">→</span> Reveal next blank</div>
          <div><span className="key">←</span> Hide last blank</div>
          <div><span className="key">↓</span> Next page</div>
          <div><span className="key">↑</span> Previous page</div>
        </div>
      </div>
    </>
  );
};

export default KeyboardHelp;
