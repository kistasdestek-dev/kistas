'use client';

import React, { useEffect, useState, useMemo } from 'react';

export interface TypewriterProps {
  words: string[];
  speed?: number;
  delayBetweenWords?: number;
  cursor?: boolean;
  cursorChar?: string;
  className?: string;
  minHeight?: number | string;
  highlight?: string;
  highlightClassName?: string;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  words,
  speed = 70,
  delayBetweenWords = 2400,
  cursor = true,
  cursorChar = '|',
  className = '',
  minHeight = 'auto',
  highlight,
  highlightClassName = 'text-[#60A5FA] font-bold drop-shadow-[0_0_8px_rgba(96,165,250,0.4)]',
}) => {
  const safeWords = useMemo(() => (words && words.length > 0 ? words : ['']), [words]);
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  const currentWord = safeWords[wordIndex % safeWords.length];

  // Typing & Deleting state machine
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (charIndex < currentWord.length) {
        timeout = setTimeout(() => {
          setCharIndex(prev => prev + 1);
        }, speed);
      } else {
        // Word completed, wait before deleting
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, delayBetweenWords);
      }
    } else {
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setCharIndex(prev => prev - 1);
        }, Math.max(25, Math.floor(speed / 2)));
      } else {
        // Deletion completed, proceed to next word
        setIsDeleting(false);
        setWordIndex(prev => (prev + 1) % safeWords.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [charIndex, currentWord, isDeleting, speed, delayBetweenWords, safeWords.length]);

  // Cursor blink
  useEffect(() => {
    if (!cursor) return;
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, [cursor]);

  const displayText = currentWord.substring(0, charIndex);

  const renderContent = () => {
    if (!highlight) return displayText;

    const lowerCurrent = currentWord.toLowerCase();
    const lowerHighlight = highlight.toLowerCase();
    const matchIndex = lowerCurrent.indexOf(lowerHighlight);

    if (matchIndex === -1 || charIndex <= matchIndex) {
      return displayText;
    }

    const highlightEnd = matchIndex + highlight.length;
    const prefix = displayText.substring(0, matchIndex);

    if (charIndex <= highlightEnd) {
      const highlightedPart = displayText.substring(matchIndex, charIndex);
      return (
        <>
          {prefix}
          <span className={highlightClassName}>{highlightedPart}</span>
        </>
      );
    }

    const highlightedPart = displayText.substring(matchIndex, highlightEnd);
    const suffix = displayText.substring(highlightEnd);
    return (
      <>
        {prefix}
        <span className={highlightClassName}>{highlightedPart}</span>
        {suffix}
      </>
    );
  };

  return (
    <div
      style={{ minHeight }}
      className={`flex items-center justify-center text-center select-none ${className}`}
      aria-label={currentWord}
    >
      <span className="inline-block">
        {renderContent()}
        {cursor && (
          <span
            className={`font-light text-[#3269C7] ml-0.5 transition-opacity duration-100 ${
              showCursor ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {cursorChar}
          </span>
        )}
      </span>
    </div>
  );
};
