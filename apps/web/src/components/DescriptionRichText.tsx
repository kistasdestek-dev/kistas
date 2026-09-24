'use client';

import React, { useMemo } from 'react';

interface DescriptionRichTextProps {
  content: string;
  className?: string;
}

function renderInlineText(value: string, lineIndex: number): React.ReactNode[] {
  return value
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, partIndex) => {
      const isBold = part.startsWith('**') && part.endsWith('**');
      if (isBold) {
        return (
          <strong key={`${lineIndex}-${partIndex}`} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={`${lineIndex}-${partIndex}`} className="text-zinc-200">{part}</span>;
    });
}

export const DescriptionRichText: React.FC<DescriptionRichTextProps> = ({
  content,
  className = '',
}) => {
  const lines = useMemo(
    () =>
      content
        .replace(/\r\n?/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n'),
    [content]
  );

  return (
    <div className={`prose prose-invert max-w-none text-zinc-200 text-sm leading-relaxed ${className}`}>
      {lines.map((rawLine, lineIndex) => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
          return <div key={`empty-${lineIndex}`} className="h-2" />;
        }

        const isH2 = rawLine.startsWith('## ');
        const isH1 = !isH2 && rawLine.startsWith('# ');

        if (isH1) {
          const text = rawLine.slice(2);
          return (
            <h3
              key={`h1-${lineIndex}`}
              className="mt-4 mb-2 text-lg sm:text-xl font-bold text-white tracking-tight"
            >
              {renderInlineText(text, lineIndex)}
            </h3>
          );
        }

        if (isH2) {
          const text = rawLine.slice(3);
          return (
            <h4
              key={`h2-${lineIndex}`}
              className="mt-3 mb-1.5 text-base sm:text-lg font-bold text-white tracking-tight"
            >
              {renderInlineText(text, lineIndex)}
            </h4>
          );
        }

        return (
          <p key={`p-${lineIndex}`} className="mb-2.5 text-zinc-200">
            {renderInlineText(rawLine, lineIndex)}
          </p>
        );
      })}
    </div>
  );
};
