// TextReveal.jsx
import React, { useState, useEffect } from "react";

// 🔧 Utility: Split text on "__" and interleave blanks from the array
const tokenizeUnderscoreBlanks = (text, blanks) => {
    const parts = text.split(/(__)/);
    const tokens = [];
    let blankIndex = 0;

    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === "__") {
            tokens.push({
                type: "blank",
                index: blankIndex,
                content: blanks[blankIndex]
            });
            blankIndex++;
        } else {
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
            onClick={() => onClick(index, isRevealed)}
        >
            {isRevealed ? content : "\u00A0\u00A0\u00A0\u00A0"}
        </span>
    );
};

// 📄 Main component
const TextReveal = ({ sectionIndex, section }) => {
    const [revealedIndices, setRevealedIndices] = useState([]);

    useEffect(() => {
        setRevealedIndices([]); // Reset on section change
    }, [sectionIndex]);

    const handleBlankClick = (index, isRevealed) => {
        setRevealedIndices((prev) => {
            if (isRevealed) {
                // Hide this and all after
                return prev.filter((i) => i < index);
            } else {
                // Reveal this and all before
                return Array.from({ length: index + 1 }, (_, i) => i);
            }
        });
    };

    if (!section || !section.text || !section.blanks) return null;

    const { text, blanks } = section;
    const tokens = tokenizeUnderscoreBlanks(text, blanks);

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
                            onClick={handleBlankClick}
                        />
                    )
                )}
            </p>
        </div>
    );
};

export default TextReveal;

