import React, { useEffect, useState, useRef } from 'react';
import RevealableSection from './RevealableSection';
import ControlBar from './ControlBar';
import KeyboardHelp from './KeyboardHelp';
import { parseText, parseJson, prepareForReader } from '../lib/parser';
import { getAudioForPage } from '../lib/AudioStorageService';

const normalizeToPages = (input) => {
    if (Array.isArray(input)) {
        return input; // Already parsed
    }

    if (typeof input === 'string') {
        try {
            const maybeJson = JSON.parse(input);
            const receivedText = Array.isArray(maybeJson) ? maybeJson : parseJson(input);
            return receivedText;
        } catch {
            const receivedText = parseText(input);
            return receivedText; // Plain text fallback
        }
    }

    console.error('Unsupported file format:', input);
    return [];
};

const PageManager = ({ file: fileProp }) => {
    const [file, setFile] = useState(fileProp || null);
    const [fileId, setFileId] = useState(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [pageRevealStates, setPageRevealStates] = useState({});
    const [audioSrc, setAudioSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [presentationMode, setPresentationMode] = useState(false);
    const containerRef = useRef(null);

    // Load from localStorage on mount if no file prop was passed
    useEffect(() => {
        if (fileProp) {
            setFile(fileProp);
            setLoading(false);
            return;
        }

        try {
            const currentId = localStorage.getItem('text-reveal-current');
            const filesJSON = localStorage.getItem('text-reveal-files');
            if (!currentId || !filesJSON) {
                setLoading(false);
                setError('No file selected. Please go back to the home page and select a file.');
                return;
            }

            const files = JSON.parse(filesJSON);
            const loadedFile = files[currentId];
            if (loadedFile) {
                setFile(loadedFile);
                setFileId(currentId);
            } else {
                setError('File not found. It may have been deleted.');
            }
        } catch (err) {
            console.error('Error loading file from localStorage:', err);
            setError('Error loading file. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [fileProp]);

    // Load audio for current page when page changes
    useEffect(() => {
        const loadAudio = async () => {
            if (fileId) {
                try {
                    // Use the IndexedDB implementation
                    const audio = await getAudioForPage(fileId, currentPageIndex);
                    setAudioSrc(audio);
                } catch (error) {
                    console.error('Error loading audio:', error);
                    setAudioSrc(null);
                }
            }
        };

        loadAudio();
    }, [fileId, currentPageIndex]);

    // Setup keyboard navigation and shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!file || !file.content) return;

            const pages = normalizeToPages(file.content);
            const processedPages = prepareForReader(pages);

            // Handle key presses
            switch (e.key) {
                case 'ArrowRight':
                    // Find the next blank to reveal
                    handleRevealNextBlank(processedPages);
                    break;
                case 'ArrowLeft':
                    // Hide the last revealed blank
                    handleHideLastBlank();
                    break;
                case '.':
                    // Go to next page
                    if (currentPageIndex < processedPages.length - 1) {
                        setCurrentPageIndex(currentPageIndex + 1);
                    }
                    break;
                case ',':
                    // Go to previous page
                    if (currentPageIndex > 0) {
                        setCurrentPageIndex(currentPageIndex - 1);
                    }
                    break;
                case 'p': // Toggle presentation mode
                case 'P':
                    e.preventDefault();
                    setPresentationMode(!presentationMode);
                    break;
                case 'q': // Exit reader
                case 'Q':
                    e.preventDefault();
                    window.location.href = '/';
                    break;
                default:
                    break;
            }
        };

        // Add keyboard event listener
        window.addEventListener('keydown', handleKeyDown);

        // Clean up event listener on unmount
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [file, currentPageIndex, pageRevealStates, presentationMode]);

    // Handle revealing the next blank on the page
    const handleRevealNextBlank = (pages) => {
        if (!pages || !pages.length) return;

        const currentPage = pages[currentPageIndex];
        let totalBlanksOnPage = 0;

        // Count total blanks on the current page
        currentPage.sections.forEach(section => {
            if (section.blanks) {
                totalBlanksOnPage += section.blanks.length;
            }
        });

        // Get current revealed blanks for this page
        const currentPageState = pageRevealStates[currentPageIndex] || { revealedBlanks: [] };
        const currentRevealedBlanks = currentPageState.revealedBlanks || [];

        // If all blanks are already revealed, do nothing
        if (currentRevealedBlanks.length >= totalBlanksOnPage) return;

        // Reveal the next blank
        const newRevealedBlanks = [...currentRevealedBlanks];
        newRevealedBlanks.push(currentRevealedBlanks.length);

        setPageRevealStates(prevState => ({
            ...prevState,
            [currentPageIndex]: { revealedBlanks: newRevealedBlanks }
        }));
    };

    // Handle hiding the last revealed blank on the page
    const handleHideLastBlank = () => {
        const currentPageState = pageRevealStates[currentPageIndex];

        if (!currentPageState || !currentPageState.revealedBlanks || currentPageState.revealedBlanks.length === 0) {
            return;
        }

        const newRevealedBlanks = [...currentPageState.revealedBlanks];
        newRevealedBlanks.pop();

        setPageRevealStates(prevState => ({
            ...prevState,
            [currentPageIndex]: { revealedBlanks: newRevealedBlanks }
        }));
    };

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

    const handlePrevPage = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(currentPageIndex - 1);
        }
    };

    const handleNextPage = () => {
        if (file && file.content) {
            const rawPages = normalizeToPages(file.content);
            const pages = prepareForReader(rawPages);

            if (currentPageIndex < pages.length - 1) {
                setCurrentPageIndex(currentPageIndex + 1);
            }
        }
    };

    const handleExit = () => {
        window.location.href = '/';
    };

    const handleToggleMode = () => {
        setPresentationMode(!presentationMode);
    };

    if (loading) {
        return (
            <div className="reader-loading">
                <div className="loader"></div>
                <p>Loading content...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="reader-error">
                <h2>Error</h2>
                <p>{error}</p>
                <button className="btn-primary" onClick={() => window.location.href = '/'}>
                    Go to Home
                </button>
            </div>
        );
    }

    if (!file?.content) {
        return (
            <div className="reader-error">
                <h2>No Content</h2>
                <p>No file loaded. Please go back to the home page and select a file.</p>
                <button className="btn-primary" onClick={() => window.location.href = '/'}>
                    Go to Home
                </button>
            </div>
        );
    }

    const rawPages = normalizeToPages(file.content);
    const pages = prepareForReader(rawPages);
    const currentPage = pages[currentPageIndex];

    return (
        <div className={`container ${presentationMode ? 'presentation-mode' : ''}`}>
            <div className="reader-wrapper">
                <div
                    className={`reader-container ${presentationMode ? 'presentation-mode' : ''}`}
                    ref={containerRef}
                    tabIndex="0" // Make container focusable for keyboard navigation
                >
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

                    <ControlBar
                        fileId={fileId}
                        currentPage={currentPageIndex}
                        totalPages={pages.length}
                        onPrevPage={handlePrevPage}
                        onNextPage={handleNextPage}
                        onExit={handleExit}
                        audioSrc={audioSrc}
                        presentationMode={presentationMode}
                        onToggleMode={handleToggleMode}
                    />
                </div>
            </div>
            {!presentationMode && <KeyboardHelp />}
            {presentationMode && (
                <div className="presentation-shortcuts-hint">
                    Press P to exit presentation mode | Press Q to quit
                </div>
            )}
        </div>
    );
};

export default PageManager;
