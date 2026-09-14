import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';

export interface TypewriterProps {
  words: string[];
  speed?: number;
  delayBetweenWords?: number;
  cursor?: boolean;
  cursorChar?: string;
  style?: TextStyle;
  cursorStyle?: TextStyle;
  containerStyle?: ViewStyle;
  minHeight?: number;
}

export function Typewriter({
  words,
  speed = 70,
  delayBetweenWords = 2200,
  cursor = true,
  cursorChar = '|',
  style,
  cursorStyle,
  containerStyle,
  minHeight,
}: TypewriterProps) {
  const safeWords = useMemo(() => (words && words.length > 0 ? words : ['']), [words]);
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  const currentWord = safeWords[wordIndex % safeWords.length];

  // Typing & Deleting logic
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (charIndex < currentWord.length) {
        timeout = setTimeout(() => {
          setCharIndex(prev => prev + 1);
        }, speed);
      } else {
        // Tamamlandı, silmeye başlamadan önce bekle
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
        // Silme bitti, bir sonraki kelimeye geç
        setIsDeleting(false);
        setWordIndex(prev => (prev + 1) % safeWords.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [charIndex, currentWord, isDeleting, speed, delayBetweenWords, safeWords.length]);

  // Cursor yanıp sönme efekti
  useEffect(() => {
    if (!cursor) return;
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, [cursor]);

  const displayText = currentWord.substring(0, charIndex);

  return (
    <View
      style={[
        styles.container,
        minHeight !== undefined && { minHeight },
        containerStyle,
      ]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={currentWord}
    >
      <Text style={[styles.text, style]}>
        {displayText}
        {cursor && (
          <Text style={[styles.cursor, cursorStyle, { opacity: showCursor ? 1 : 0 }]}>
            {cursorChar}
          </Text>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
  },
  cursor: {
    fontWeight: '300',
    color: '#3269C7',
  },
});
