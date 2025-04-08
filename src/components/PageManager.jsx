import React, { useEffect, useState } from 'react';
import RevealableSection from './RevealableSection';
import { parseText, parseJson, prepareForReader } from '../lib/parser';

const normalizeToPages = (input) => {
    if (Array.isArray(input)) {
        return input; // Already parsed
    }

    if (typeof input === 'string') {
        try {
            const maybeJson = JSON.parse(input);
            return Array.isArray(maybeJson) ? maybeJson : parseJson(input);
        } catch {
            return parseText(input); // Plain text fallback
        }
    }

    console.error('Unsupported file format:', input);
    return [];
};

const PageManager = ({ file: fileProp }) => {
    const [file, setFile] = useState(fileProp || null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    // Track a single array of revealed blanks for the entire page
    const [pageRevealStates, setPageRevealStates] = useState({});

    // Load from localStorage on mount if no file prop was passed
    useEffect(() => {
        if (fileProp) return;

        try {
            const currentId = localStorage.getItem('text-reveal-current');
            const filesJSON = localStorage.getItem('text-reveal-files');
            if (!currentId || !filesJSON) return;

            const files = JSON.parse(filesJSON);
            const loadedFile = files[currentId];
            if (loadedFile) setFile(loadedFile);
        } catch (err) {
            console.error('Error loading file from localStorage:', err);
        }
    }, [fileProp]);

    // Handler for blank clicks - working across sections
    const handleBlankClick = (sectionIndex, blankIndex, pages) => {
        setPageRevealStates(prevState => {
            const newState = { ...prevState };

            // Initialize the current page's state if it doesn't exist
            if (!newState[currentPageIndex]) {
                newState[currentPageIndex] = { revealedBlanks: [] };
            }

            // Get current revealed blanks for this page
            const currentRevealedBlanks = newState[currentPageIndex].revealedBlanks || [];

            // Calculate the global blank index by counting blanks in previous sections
            const currentPage = pages[currentPageIndex];
            let globalBlankIndex = 0;

            for (let i = 0; i < sectionIndex; i++) {
                if (currentPage.sections[i] && currentPage.sections[i].blanks) {
                    globalBlankIndex += currentPage.sections[i].blanks.length;
                }
            }
            globalBlankIndex += blankIndex;

            // Check if this blank is currently revealed
            const isRevealed = currentRevealedBlanks.includes(globalBlankIndex);

            if (isRevealed) {
                // Hide this blank and all blanks with higher indices
                const newRevealedBlanks = currentRevealedBlanks.filter(i => i < globalBlankIndex);
                newState[currentPageIndex].revealedBlanks = newRevealedBlanks;
            } else {
                // Reveal this blank and all blanks with lower indices
                const newRevealedBlanks = [];
                for (let i = 0; i <= globalBlankIndex; i++) {
                    if (!currentRevealedBlanks.includes(i)) {
                        newRevealedBlanks.push(i);
                    }
                }

                // Combine with existing revealed blanks and sort
                const combinedBlanks = [...currentRevealedBlanks, ...newRevealedBlanks];
                combinedBlanks.sort((a, b) => a - b);

                // Remove duplicates
                newState[currentPageIndex].revealedBlanks = [...new Set(combinedBlanks)];
            }

            return newState;
        });
    };

    // Get revealed indices for a specific section
    const getRevealedIndicesForSection = (sectionIndex, pages) => {
        const pageState = pageRevealStates[currentPageIndex];
        if (!pageState || !pageState.revealedBlanks) return [];

        const currentPage = pages[currentPageIndex];
        const section = currentPage.sections[sectionIndex];
        if (!section || !section.blanks) return [];

        // Calculate the global blank index for the start of this section
        let sectionStartIndex = 0;
        for (let i = 0; i < sectionIndex; i++) {
            if (currentPage.sections[i] && currentPage.sections[i].blanks) {
                sectionStartIndex += currentPage.sections[i].blanks.length;
            }
        }

        // Convert global indices to section-specific indices
        const sectionIndices = [];
        for (let i = 0; i < section.blanks.length; i++) {
            const globalIndex = sectionStartIndex + i;
            if (pageState.revealedBlanks.includes(globalIndex)) {
                sectionIndices.push(i);
            }
        }

        return sectionIndices;
    };

    if (!file?.content) {
        return <div className="container">No file loaded.</div>;
    }

    const rawPages = normalizeToPages(file.content);
    const pages = prepareForReader(rawPages);
    const currentPage = pages[currentPageIndex];

    return (
        <div className="container">
            <div className="reader-wrapper">
                <div className="reader-container">
                    <h2>{currentPage.title}</h2>

                    <div className='reader-content'>
                        {currentPage.sections.map((section, sectionIndex) => (
                            <RevealableSection
                                key={`${currentPageIndex}-${sectionIndex}`}
                                section={section}
                                revealedIndices={getRevealedIndicesForSection(sectionIndex, pages)}
                                onBlankClick={(blankIndex) => handleBlankClick(sectionIndex, blankIndex, pages)}
                            />
                        ))}
                    </div>

                    <div className="navigation-controls">
                        <div className="page-nav">
                            <button
                                onClick={() => setCurrentPageIndex(i => Math.max(i - 1, 0))}
                                disabled={currentPageIndex === 0}
                                className="nav-button prev"
                            >
                                Previous
                            </button>

                            <span className="page-indicator">
                                Page {currentPageIndex + 1} of {pages.length}
                            </span>

                            <button
                                onClick={() => setCurrentPageIndex(i => Math.min(i + 1, pages.length - 1))}
                                disabled={currentPageIndex === pages.length - 1}
                                className="nav-button next"
                            >
                                Next
                            </button>
                        </div>

                        <div className="secondary-controls">
                            <button
                                className="exit-button"
                                onClick={() => window.location.href = '/'}
                            >
                                Exit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PageManager;
