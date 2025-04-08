import React, { useEffect, useState, useRef } from 'react';
import RevealableSection from './RevealableSection';
import ControlBar from './ControlBar';
import AudioUploader from './AudioUploader';
import { parseText, parseJson, prepareForReader } from '../lib/parser';
import { getAudioForPage, hasAudioForAllPages, saveMultipleAudioFiles } from '../lib/storage';

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
    // Track a single array of revealed blanks for the entire page
    const [pageRevealStates, setPageRevealStates] = useState({});
    const [audioSrc, setAudioSrc] = useState(null);
    const [showAudioUploader, setShowAudioUploader] = useState(false);
    const [hasCheckedAudio, setHasCheckedAudio] = useState(false);

    // Load from localStorage on mount if no file prop was passed
    useEffect(() => {
        if (fileProp) return;

        try {
            const currentId = localStorage.getItem('text-reveal-current');
            const filesJSON = localStorage.getItem('text-reveal-files');
            if (!currentId || !filesJSON) return;

            const files = JSON.parse(filesJSON);
            const loadedFile = files[currentId];
            if (loadedFile) {
                setFile(loadedFile);
                setFileId(currentId);
            }
        } catch (err) {
            console.error('Error loading file from localStorage:', err);
        }
    }, [fileProp]);

    // Load audio for current page when page changes
    useEffect(() => {
        if (fileId) {
            const audio = getAudioForPage(fileId, currentPageIndex);
            setAudioSrc(audio);
        }
    }, [fileId, currentPageIndex]);

    // Check if we should offer bulk audio upload
    useEffect(() => {
        if (fileId && file && !hasCheckedAudio) {
            const rawPages = normalizeToPages(file.content);
            const pages = prepareForReader(rawPages);

            const hasAllAudio = hasAudioForAllPages(fileId, pages.length);

            // Only show the uploader if we don't have audio for all pages
            // and we haven't checked yet (to avoid showing on every render)
            if (!hasAllAudio) {
                setShowAudioUploader(true);
            }

            setHasCheckedAudio(true);
        }
    }, [fileId, file, hasCheckedAudio]);

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

    const handleAudioUploadSuccess = () => {
        setShowAudioUploader(false);
        // Refresh audio for current page
        if (fileId) {
            const audio = getAudioForPage(fileId, currentPageIndex);
            setAudioSrc(audio);
        }
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
                {showAudioUploader && (
                    <div className="audio-uploader-container">
                        <AudioUploader
                            fileId={fileId}
                            pageCount={pages.length}
                            onSuccess={handleAudioUploadSuccess}
                        />
                        <button
                            className="dismiss-button"
                            onClick={() => setShowAudioUploader(false)}
                        >
                            Dismiss
                        </button>
                    </div>
                )}

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

                    <ControlBar
                        fileId={fileId}
                        currentPage={currentPageIndex}
                        totalPages={pages.length}
                        onPrevPage={handlePrevPage}
                        onNextPage={handleNextPage}
                        onExit={handleExit}
                        audioSrc={audioSrc}
                    />
                </div>
            </div>
        </div>
    );
}

export default PageManager;
