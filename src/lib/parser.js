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

    const pages = text
        .split(/\n\s*PAGE\s*\n|\n\n\n/)
        .map(page => page.trim())
        .filter(Boolean);

    return pages.map(pageContent => {
        const lines = pageContent.split('\n').filter(Boolean);
        const title = lines[0].replace(',', '').trim();

        const textSections = [];
        let currentText = '';
        let currentBlanks = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('[') && line.endsWith(']')) { // this line contains the text to reveal
                const blanksContent = line.slice(1, -1);
                currentBlanks = blanksContent.split(',').map(b => b.trim());

                if (currentText) { // previous line was text so push it to the array with these blank fills
                    textSections.push({
                        text: currentText.trim(),
                        blanks: currentBlanks
                    });
                    // and reset
                    currentText = '';
                    currentBlanks = [];
                } else { // previous line was not text but we've got blanks? ERR
                    title = "ERROR";
                    textSections = [{ text: "Incorrect text format detected.", blanks: [] }];
                    return { title, sections: textSections }
                }
            } else { // not an array of blanks so this is PRESUMED to be a regular text line
                if (currentText) {
                    // previous was also PRESUMED to be a text and is PRESUMED to have NO BLANKS, so push it with an empty arr
                    textSections.push({
                        text: currentText.trim(),
                        blanks: currentBlanks
                    });
                    // and reset
                    currentText = line;
                    currentBlanks = [];
                } else { // set this text to process with the next input line
                    currentText += line;
                }
            }
        }

        return {
            title,
            sections: textSections
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

