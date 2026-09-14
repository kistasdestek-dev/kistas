import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface MagneticScrambleTextProps {
  text: string;
  status?: string;
  busyStatus?: string;
  fontSize?: number;
  startDelay?: number;
  compact?: boolean;
}

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&/\\|<>[]{}=+*!?$';

const getRandomGlyph = (): string => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

const createScrambledText = (targetCharacters: string[]): string => targetCharacters
  .map((character) => character === ' ' ? character : getRandomGlyph())
  .join('');

export const MagneticScrambleText: React.FC<MagneticScrambleTextProps> = ({
  text,
  status = 'identity locked',
  busyStatus = 'decoding',
  fontSize = 38,
  startDelay = 0,
  compact = false,
}) => {
  const target = useMemo(() => text.replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 28), [text]);
  const targetCharacters = useMemo(() => Array.from(target), [target]);
  const scrambledText = useMemo(() => createScrambledText(targetCharacters), [targetCharacters]);
  const [isBusy, setIsBusy] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const revealProgress = useRef(new Animated.Value(1)).current;
  const snapProgress = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      cursorOpacity.setValue(0.85);
      return undefined;
    }

    const cursorAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 550, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]),
      { iterations: 2 }
    );
    cursorAnimation.start();
    return () => cursorAnimation.stop();
  }, [cursorOpacity, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || targetCharacters.length === 0) {
      setIsBusy(false);
      glowOpacity.setValue(0);
      revealProgress.setValue(1);
      snapProgress.setValue(0);
      return undefined;
    }

    let revealAnimation: Animated.CompositeAnimation | undefined;
    revealProgress.setValue(0);
    const timer = setTimeout(() => {
      setIsBusy(true);
      glowOpacity.setValue(0);
      snapProgress.setValue(0);
      revealAnimation = Animated.parallel([
        Animated.timing(revealProgress, {
          toValue: 1,
          duration: 460,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: 170,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0,
            duration: 290,
            useNativeDriver: true,
          }),
        ]),
      ]);
      revealAnimation.start(({ finished }) => {
        if (!finished) return;
        setIsBusy(false);
        snapProgress.setValue(1);
        Animated.parallel([
            Animated.timing(glowOpacity, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.spring(snapProgress, {
              toValue: 0,
              stiffness: 210,
              damping: 16,
              mass: 0.7,
              useNativeDriver: true,
            }),
        ]).start();
      });
    }, startDelay);

    return () => {
      clearTimeout(timer);
      revealAnimation?.stop();
    };
  }, [glowOpacity, reduceMotion, revealProgress, snapProgress, startDelay, targetCharacters]);

  const characterWidth = fontSize * 0.64;
  const glowWidth = Math.min(330, Math.max(132, targetCharacters.length * characterWidth * 1.18));
  const trackWidth = Math.max(characterWidth, targetCharacters.length * characterWidth);

  return (
    <View
      style={[styles.root, compact && styles.rootCompact]}
      accessible
      accessibilityLabel={`${text}. ${status}`}
      accessibilityRole="text"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.depthGlow,
          {
            width: glowWidth,
            opacity: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.46] }),
            transform: [{ scale: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.15] }) }],
          },
        ]}
      />

      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.track,
          {
            width: trackWidth,
            height: fontSize * 1.14,
            transform: [
              { translateY: snapProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
              { scale: snapProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.textLayer,
            {
              opacity: revealProgress.interpolate({ inputRange: [0, 0.78, 1], outputRange: [1, 0.2, 0] }),
              transform: [
                { translateY: revealProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
                { scale: revealProgress.interpolate({ inputRange: [0, 1], outputRange: [1.015, 0.985] }) },
              ],
            },
          ]}
        >
          <Text numberOfLines={1} style={[styles.chromaticCharacter, styles.redCharacter, { width: trackWidth, fontSize, lineHeight: fontSize * 1.08, opacity: 0.62, transform: [{ translateX: -2 }] }]}>{scrambledText}</Text>
          <Text numberOfLines={1} style={[styles.chromaticCharacter, styles.cyanCharacter, { width: trackWidth, fontSize, lineHeight: fontSize * 1.08, opacity: 0.62, transform: [{ translateX: 2 }] }]}>{scrambledText}</Text>
          <Text numberOfLines={1} style={[styles.character, { width: trackWidth, fontSize, lineHeight: fontSize * 1.08, opacity: 0.78 }]}>{scrambledText}</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.textLayer,
            {
              opacity: revealProgress,
              transform: [{ scale: revealProgress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }],
            },
          ]}
        >
          <Text numberOfLines={1} style={[styles.chromaticCharacter, styles.redCharacter, { width: trackWidth, fontSize, lineHeight: fontSize * 1.08, opacity: 0.2, transform: [{ translateX: -0.8 }] }]}>{target}</Text>
          <Text numberOfLines={1} style={[styles.chromaticCharacter, styles.cyanCharacter, { width: trackWidth, fontSize, lineHeight: fontSize * 1.08, opacity: 0.2, transform: [{ translateX: 0.8 }] }]}>{target}</Text>
          <Text numberOfLines={1} style={[styles.character, { width: trackWidth, fontSize, lineHeight: fontSize * 1.08 }]}>{target}</Text>
        </Animated.View>
      </Animated.View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.statusRow, compact && styles.statusRowCompact]}
      >
        <Text style={styles.statusKey}>&gt;</Text>
        <Text style={[styles.statusText, isBusy && styles.statusTextBusy]}>
          {isBusy ? busyStatus : status}
        </Text>
        <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  rootCompact: {
    paddingVertical: 2,
  },
  depthGlow: {
    position: 'absolute',
    top: '14%',
    height: 78,
    borderRadius: 999,
    backgroundColor: '#EAF2FC',
    shadowColor: '#252333',
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 4,
  },
  track: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  textLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  character: {
    position: 'absolute',
    color: '#3f3b4c',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  chromaticCharacter: {
    position: 'absolute',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  redCharacter: {
    color: '#a02836',
  },
  cyanCharacter: {
    color: '#3269C7',
  },
  statusRow: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusRowCompact: {
    marginTop: 7,
  },
  statusKey: {
    marginRight: 6,
    color: '#252333',
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontWeight: '700',
  },
  statusText: {
    color: 'rgba(63,59,76,0.58)',
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'lowercase',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  statusTextBusy: {
    color: '#252333',
  },
  cursor: {
    width: 5,
    height: 11,
    marginLeft: 6,
    borderRadius: 1,
    backgroundColor: '#EAF2FC',
    shadowColor: '#252333',
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
});
