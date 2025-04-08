/**
 * Parser for converting text format or JSON to internal representation
 */

/**
 * Parse a text file in the teaching format into a structured object
 * @param {string} text - Raw text content in the specified format
 * @returns {Array} Array of page objects with title and sections
 */
export const parseText = (text) => {
    if (typeof text !== 'string') {
        console.error('Expected string input in parseText, got:', typeof text, text);
        return [];
    }

    // Split into pages
    const pages = text
        .split(/\n\s*PAGE\s*\n|\n\n\n/)
        .map(page => page.trim())
        .filter(Boolean);

    return pages.map(pageContent => {
        const lines = pageContent.split('\n').filter(Boolean);

        // Get title from first line
        const title = lines.length > 0 ? lines[0].replace(',', '').trim() : 'Untitled';

        // Process remaining lines
        const sections = [];
        let currentSection = null;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();

            // Check if this is an answer line
            if (line.startsWith('[') && line.endsWith(']')) {
                // This line contains answers for a previous section
                if (currentSection) {
                    // Extract blanks from brackets
                    const blanksContent = line.slice(1, -1);
                    currentSection.blanks = blanksContent.split(',').map(b => b.trim());

                    // Add the completed section
                    sections.push(currentSection);
                    currentSection = null;
                }
            } else {
                // This is a regular text line
                // If we already have a pending section, add this to it
                if (currentSection) {
                    // Finish the previous section first (with no blanks)
                    sections.push(currentSection);
                    currentSection = null;
                }

                // Start a new section with this line
                currentSection = {
                    text: line,
                    blanks: []
                };
            }
        }

        // Add any remaining section
        if (currentSection) {
            sections.push(currentSection);
        }

        return {
            title,
            sections
        };
    });
};

/**
 * Parse a JSON file into the same structure as parseText produces
 * @param {string} jsonContent - JSON string to parse
 * @returns {Array} Array of page objects with title and sections
 */
export const parseJson = (jsonContent) => {
    try {
        const parsed = JSON.parse(jsonContent);

        if (Array.isArray(parsed) && parsed.every(page =>
            typeof page === 'object' && page.title && Array.isArray(page.sections)
        )) {
            return parsed;
        }

        const textVersion = convertJsonToTextFormat(parsed);
        return parseText(textVersion);
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        return [];
    }
};

/**
 * Convert arbitrary JSON to text format for parsing
 * @param {object} json - JSON object to convert
 * @returns {string} Text representation
 */
const convertJsonToTextFormat = (json) => {
    if (typeof json === 'string') return json;

    if (json.pages) {
        return json.pages.map(page => {
            const pageStr = `${page.title},\n`;
            const sections = page.sections.map(section => {
                const sectionText = section.text.replace(/__(.*?)__/g, '__');
                const blanks = section.blanks || [];
                return `${sectionText}\n[${blanks.join(', ')}]`;
            }).join('\n');
            return pageStr + sections;
        }).join('\n\nPAGE\n\n');
    }

    return JSON.stringify(json, null, 2);
};

/**
 * Prepare text for the reader by identifying blanks
 * @param {Array} pages - Array of page objects
 * @returns {Array} Modified pages with blank indices
 */
export const prepareForReader = (pages) => {
    return pages.map(page => {
        const processedSections = page.sections.map(section => {
            const blankPositions = [];
            let modifiedText = section.text;
            let position = modifiedText.indexOf('__');
            let index = 0;

            while (position !== -1) {
                const replacement = `<span class="blank" data-index="${index}">__</span>`;
                modifiedText =
                    modifiedText.slice(0, position) +
                    replacement +
                    modifiedText.slice(position + 2);

                blankPositions.push({
                    index,
                    position,
                    content: section.blanks[index] || '???'
                });

                index++;
                position = modifiedText.indexOf('__', position + replacement.length);
            }

            return {
                ...section,
                processedText: modifiedText,
                blankPositions
            };
        });

        return {
            ...page,
            sections: processedSections
        };
    });
};

// Expose for browser testing
if (typeof window !== 'undefined') {
    window.parseText = parseText;
    window.parseJson = parseJson;
    window.prepareForReader = prepareForReader;
}
