import React, { useEffect, useState } from 'react';
import TextReveal from './TextReveal';
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

const ReaderView = ({ file: fileProp }) => {
    const [file, setFile] = useState(fileProp || null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

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

    if (!file?.content) {
        return <div className="reader-wrapper">No file loaded.</div>;
    }

    const rawPages = normalizeToPages(file.content);
    const pages = prepareForReader(rawPages);
    console.log('rawPages', rawPages);
    console.log('pages', pages);


    const currentPage = pages[currentPageIndex];

    return (
            <div className="reader-wrapper">
                <div className="container reader-container">
                    <h2>{currentPage.title}</h2>
                    <div className='reader-content'>
                        {currentPage.sections.map((section, index) => (
                            <TextReveal key={index} section={section} pageIndex={currentPageIndex} />
                        ))}
                    </div>

                    <div className="navigation-controls" style={{ marginTop: '1em' }}>
                        <button
                            onClick={() => setCurrentPageIndex(i => Math.max(i - 1, 0))}
                            disabled={currentPageIndex === 0}
                        >
                            Previous
                        </button>
                        <span style={{ margin: '0 1em' }}>
                            Page {currentPageIndex + 1} of {pages.length}
                        </span>
                        <button
                            onClick={() => setCurrentPageIndex(i => Math.min(i + 1, pages.length - 1))}
                            disabled={currentPageIndex === pages.length - 1}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
    );
};

export default ReaderView;

