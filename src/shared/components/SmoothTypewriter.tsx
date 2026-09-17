import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle, Platform } from 'react-native';

export interface SmoothTypewriterWord {
  text: string;
  color?: string;
}

export interface SmoothTypewriterProps {
  words: SmoothTypewriterWord[];
  speed?: number;
  pauseDuration?: number;
  cursorColor?: string;
  style?: TextStyle;
  containerStyle?: ViewStyle;
}

/**
 * React Native & Web uyumlu Aceternity / shadcn stili Smooth Typewriter bileşeni.
 * Kelimeleri harf harf akıcı yazar, parlayan imleç ile modern bir daktilo hissi sunar.
 */
export const SmoothTypewriter: React.FC<SmoothTypewriterProps> = ({
  words,
  speed = 45,
  pauseDuration = 2400,
  cursorColor = '#3269C7',
  style,
  containerStyle,
}) => {
  const fullText = useMemo(() => words.map(w => w.text).join(' '), [words]);
  const [charCount, setCharCount] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Yanıp sönen imleç
  useEffect(() => {
    const timer = setInterval(() => {
      setCursorVisible(v => !v);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Harf harf yazma döngüsü
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (isTyping) {
      if (charCount < fullText.length) {
        timeout = setTimeout(() => {
          setCharCount(prev => prev + 1);
        }, speed);
      } else {
        // Yazma bitti, biraz bekle ve tekrar başlat (döngü)
        timeout = setTimeout(() => {
          setCharCount(0);
        }, pauseDuration);
      }
    }

    return () => clearTimeout(timeout);
  }, [charCount, fullText.length, isTyping, speed, pauseDuration]);

  // Şu anki karakter sayısına göre kelimeleri ve harfleri renklendirerek böl
  const renderedContent = useMemo(() => {
    let charactersLeft = charCount;

    return words.map((word, wordIdx) => {
      const wordTextWithSpace = wordIdx === words.length - 1 ? word.text : `${word.text} `;
      const visibleCharsInWord = Math.max(0, Math.min(charactersLeft, wordTextWithSpace.length));
      charactersLeft = Math.max(0, charactersLeft - wordTextWithSpace.length);

      if (visibleCharsInWord === 0) return null;

      const visibleText = wordTextWithSpace.slice(0, visibleCharsInWord);

      return (
        <Text
          key={`word-${wordIdx}`}
          style={[
            styles.text,
            style,
            word.color ? { color: word.color } : null,
          ]}
        >
          {visibleText}
        </Text>
      );
    });
  }, [words, charCount, style]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.text, style]}>
        {renderedContent}
        <Text style={[styles.cursor, { color: cursorColor, opacity: cursorVisible ? 1 : 0 }]}>
          {'▍'}
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: '#25364E',
    textAlign: 'center',
    fontFamily: Platform.select({
      web: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      default: 'System',
    }),
  },
  cursor: {
    fontSize: 15,
    marginLeft: 2,
    fontWeight: '700',
  },
});
