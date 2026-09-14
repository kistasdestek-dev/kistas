import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

interface DescriptionRichTextProps {
  content: string;
  numberOfLines?: number;
}

const renderInlineText = (value: string, lineIndex: number): React.ReactNode[] => (
  value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, partIndex) => {
    const isBold = part.startsWith('**') && part.endsWith('**');
    return (
      <Text key={`${lineIndex}-${partIndex}`} style={isBold ? styles.bold : undefined}>
        {isBold ? part.slice(2, -2) : part}
      </Text>
    );
  })
);

export const DescriptionRichText: React.FC<DescriptionRichTextProps> = ({
  content,
  numberOfLines,
}) => {
  const lines = useMemo(
    () => content.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').split('\n'),
    [content],
  );

  return (
    <Text style={styles.body} numberOfLines={numberOfLines}>
      {lines.map((rawLine, lineIndex) => {
        const isH2 = rawLine.startsWith('## ');
        const isH1 = !isH2 && rawLine.startsWith('# ');
        const line = isH2 ? rawLine.slice(3) : isH1 ? rawLine.slice(2) : rawLine;
        return (
          <Text
            key={`${lineIndex}-${rawLine}`}
            style={isH1 ? styles.h1 : isH2 ? styles.h2 : undefined}
          >
            {renderInlineText(line, lineIndex)}
            {lineIndex < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  body: {
    maxWidth: 920,
    color: '#4D5665',
    fontSize: 14,
    lineHeight: 22,
  },
  h1: {
    color: '#252333',
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  h2: {
    color: '#252333',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  bold: {
    color: '#252333',
    fontWeight: '800',
  },
});
