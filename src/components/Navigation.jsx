import React from 'react';

/**
 * Navigation component for paging through content
 * @param {object} props - Component props
 * @param {number} props.currentPage - Current page index
 * @param {number} props.totalPages - Total number of pages
 * @param {function} props.onPrevPage - Function to go to previous page
 * @param {function} props.onNextPage - Function to go to next page
 * @param {function} props.onExit - Function to exit reader
 */
const Navigation = ({ currentPage, totalPages, onPrevPage, onNextPage, onExit }) => {
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;

  return (
    <div className="reader-navigation">
      <div className="navigation-controls">
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

      <div className="secondary-controls">
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

export default Navigation;
