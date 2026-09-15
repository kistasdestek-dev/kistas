import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { theme } from '../../core/theme';

interface FooterSloganBannerProps {
  text?: string;
  onPress?: () => void;
}

export const FooterSloganBanner: React.FC<FooterSloganBannerProps> = ({
  text = 'Keşfedilmeye hazır mısın?',
  onPress,
}) => {
  const chars = text.split('');
  const animValues = useRef(chars.map(() => new Animated.Value(0))).current;
  const [isAnimating, setIsAnimating] = useState(false);

  const triggerWave = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    const animations = animValues.map((val, idx) =>
      Animated.sequence([
        Animated.delay(idx * 24),
        Animated.spring(val, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(val, {
          toValue: 0,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(animations).start(() => {
      setIsAnimating(false);
    });
  }, [animValues, isAnimating]);

  return (
    <View style={styles.bannerContainer}>
      <Pressable
        onPress={() => {
          triggerWave();
          onPress?.();
        }}
        style={styles.textRow}
        accessibilityRole="button"
        accessibilityLabel={text}
      >
        {chars.map((char, index) => {
          const anim = animValues[index];
          const translateY = anim ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) : 0;
          const scale = anim ? anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) : 1;

          return (
            <Animated.Text
              key={index}
              style={[
                styles.sloganChar,
                anim
                  ? {
                      transform: [{ translateY }, { scale }],
                    }
                  : null,
              ]}
            >
              {char}
            </Animated.Text>
          );
        })}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  textRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sloganChar: {
    ...theme.typography.kistas,
    color: '#25364E',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontStyle: 'italic',
  },
});
