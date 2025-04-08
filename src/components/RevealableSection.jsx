// RevealableSection.jsx
import React from "react";

// 🔧 Utility: Split text on "__" and interleave blanks from the array
const tokenizeUnderscoreBlanks = (text, blanks) => {
    if (!text) return [];

    const parts = text.split(/(__)/);
    const tokens = [];
    let blankIndex = 0;

    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === "__") {
            // Make sure we have a corresponding blank
            const content = blanks && blankIndex < blanks.length
                ? blanks[blankIndex]
                : "???";

            tokens.push({
                type: "blank",
                index: blankIndex,
                content: content
            });
            blankIndex++;
        } else if (parts[i]) {  // Only add non-empty text parts
            tokens.push({
                type: "text",
                content: parts[i]
            });
        }
    }

    return tokens;
};

// 🧱 <Blank /> component
const Blank = ({ index, content, isRevealed, onClick }) => {
    return (
        <span
            className={`blank ${isRevealed ? 'revealed' : ''}`}
            onClick={() => onClick(index)}
        >
            {isRevealed ? content : "\u00A0\u00A0\u00A0\u00A0"}
        </span>
    );
};

// 📄 Main component
const RevealableSection = ({ section, revealedIndices = [], onBlankClick }) => {
    if (!section) {
        console.warn("Missing section in RevealableSection");
        return null;
    }

    if (!section.text) {
        console.warn("Section missing text:", section);
        return null;
    }

    // Make sure blanks is an array even if not provided
    const blanks = section.blanks || [];
    const tokens = tokenizeUnderscoreBlanks(section.text, blanks);

    // If no blanks were found, just render the text
    if (tokens.length === 0 || !tokens.some(token => token.type === "blank")) {
        return (
            <div className="text-reveal-section">
                <p className="text-content">{section.text}</p>
            </div>
        );
    }

    return (
        <div className="text-reveal-section">
            <p className="text-content">
                {tokens.map((token, i) =>
                    token.type === "text" ? (
                        <span key={i}>{token.content}</span>
                    ) : (
                        <Blank
                            key={i}
                            index={token.index}
                            content={token.content}
                            isRevealed={revealedIndices.includes(token.index)}
                            onClick={onBlankClick}
                        />
                    )
                )}
            </p>
        </div>
    );
};

export default RevealableSection;
