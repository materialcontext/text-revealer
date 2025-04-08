// RevealableSection.jsx
import React from "react";

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
            onClick={() => onClick(index)}
        >
            {isRevealed ? content : "\u00A0\u00A0\u00A0\u00A0"}
        </span>
    );
};

// 📄 Main component
const RevealableSection = ({ section, revealedIndices = [], onBlankClick }) => {
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
                            onClick={onBlankClick}
                        />
                    )
                )}
            </p>
        </div>
    );
};

export default RevealableSection;
