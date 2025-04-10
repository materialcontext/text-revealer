import React, { useState, useEffect, useRef } from 'react';

/**
 * Collapsible component to show presentation mode keyboard shortcuts
 */
const PresentationShortcutsHint = () => {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    // Show initially, then auto-hide after 5 seconds
    timerRef.current = setTimeout(() => {
      setVisible(false);
    }, 5000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const toggleVisibility = () => {
    setVisible(!visible);
  };

  return (
    <>
      <button
        className="shortcuts-toggle"
        onClick={toggleVisibility}
        aria-label="Presentation mode shortcuts"
      >
        ?
      </button>

      <div className={`presentation-shortcuts-hint ${visible ? 'visible' : 'hidden'}`}>
        <span className="shortcut-key">P</span> Exit presentation mode |
        <span className="shortcut-key">Q</span> Quit to home
      </div>
    </>
  );
};

export default PresentationShortcutsHint;
