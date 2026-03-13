import { useState, useCallback } from 'react';
import { WordPopup } from './WordPopup';

interface ClickableTextProps {
  text: string;
  className?: string;
  highlightWord?: string; // Word to highlight (e.g., the main vocabulary word)
}

interface PopupState {
  word: string;
  position: { x: number; y: number };
}

export function ClickableText({ text, className = '', highlightWord }: ClickableTextProps) {
  const [popup, setPopup] = useState<PopupState | null>(null);

  // Split text into words and punctuation while preserving structure
  const tokenize = useCallback((str: string) => {
    // Match words (including contractions like don't, it's) and other characters
    const tokens: { type: 'word' | 'other'; value: string }[] = [];
    const regex = /([a-zA-Z]+(?:'[a-zA-Z]+)?)|([^a-zA-Z]+)/g;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match[1]) {
        tokens.push({ type: 'word', value: match[1] });
      } else if (match[2]) {
        tokens.push({ type: 'other', value: match[2] });
      }
    }

    return tokens;
  }, []);

  const handleWordClick = (word: string, event: React.MouseEvent) => {
    event.stopPropagation();

    // Get click position
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const position = {
      x: rect.left,
      y: rect.bottom + 8,
    };

    setPopup({ word: word.toLowerCase(), position });
  };

  const tokens = tokenize(text);

  return (
    <>
      <span className={className}>
        {tokens.map((token, index) => {
          if (token.type === 'word') {
            const isHighlighted =
              highlightWord &&
              token.value.toLowerCase() === highlightWord.toLowerCase();

            return (
              <span
                key={index}
                onClick={(e) => handleWordClick(token.value, e)}
                className={`cursor-pointer transition-colors duration-150 rounded px-0.5 -mx-0.5 ${
                  isHighlighted
                    ? 'bg-accent/20 text-accent font-semibold hover:bg-accent/30'
                    : 'hover:bg-accent/10 hover:text-accent'
                }`}
              >
                {token.value}
              </span>
            );
          }
          return <span key={index}>{token.value}</span>;
        })}
      </span>

      {popup && (
        <WordPopup
          word={popup.word}
          context={text}
          position={popup.position}
          onClose={() => setPopup(null)}
        />
      )}
    </>
  );
}
