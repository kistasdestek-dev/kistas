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
        Animated.delay(idx * 28),
        Animated.spring(val, {
          toValue: 1,
          friction: 4.5,
          tension: 85,
          useNativeDriver: false,
        }),
        Animated.spring(val, {
          toValue: 0,
          friction: 6,
          tension: 70,
          useNativeDriver: false,
        }),
      ])
    );

    Animated.parallel(animations).start(() => {
      setIsAnimating(false);
    });
  }, [animValues, isAnimating]);

  // Mobilde ekrana girdiğinde otomatik ilk dalga + her 5.5 saniyede bir canlı nabız
  React.useEffect(() => {
    const initialTimer = setTimeout(() => {
      triggerWave();
    }, 700);

    const intervalTimer = setInterval(() => {
      triggerWave();
    }, 5500);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [triggerWave]);

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
          const translateY = anim ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) : 0;
          const scale = anim ? anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) : 1;
          const color = anim
            ? anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#25364E', '#013196'],
              })
            : '#25364E';

          return (
            <Animated.Text
              key={index}
              style={[
                styles.sloganChar,
                anim
                  ? {
                      color,
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
