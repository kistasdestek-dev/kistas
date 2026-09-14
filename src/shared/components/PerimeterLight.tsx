import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';

/** A short light trail follows the measured rounded border, at constant speed. */
export function PerimeterLight({ radius = 16, duration = 18000, color = '#3269C7' }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion || !bounds.width) return;
    const loop = Animated.loop(Animated.timing(progress, {
      toValue: 1, duration, easing: Easing.linear,
      useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    }));
    progress.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [bounds.width, duration, progress, reduceMotion]);

  const path = useMemo(() => {
    const w = Math.max(bounds.width - 2, 0), h = Math.max(bounds.height - 2, 0);
    const r = Math.min(radius, w / 2, h / 2);
    const segments = [w - 2 * r, Math.PI * r / 2, h - 2 * r, Math.PI * r / 2,
      w - 2 * r, Math.PI * r / 2, h - 2 * r, Math.PI * r / 2];
    const length = segments.reduce((a, b) => a + b, 0);
    const point = (fraction: number) => {
      let distance = ((fraction % 1 + 1) % 1) * length;
      let i = 0;
      while (i < 7 && distance > segments[i]) distance -= segments[i++];
      const t = segments[i] ? distance / segments[i] : 0;
      const angle = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][Math.floor(i / 2)] + t * Math.PI / 2;
      if (i === 0) return [r + distance, 0];
      if (i === 2) return [w, r + distance];
      if (i === 4) return [w - r - distance, h];
      if (i === 6) return [0, h - r - distance];
      const cx = i < 4 ? w - r : r, cy = i === 1 || i === 7 ? r : h - r;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    };
    return { point, length };
  }, [bounds, radius]);

  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    onLayout={event => setBounds(event.nativeEvent.layout)}>
    {bounds.width > 0 && [0, 1, 2, 3, 4].map(index => {
      const inputRange = Array.from({ length: 257 }, (_, i) => i / 256);
      const points = inputRange.map(t => path.point(t - index * 3 / Math.max(path.length, 1)));
      return <Animated.View key={index} style={{ position: 'absolute', left: -2, top: -2,
        width: 6, height: 6, borderRadius: 3, backgroundColor: color,
        opacity: reduceMotion ? 0.25 : 0.9 - index * 0.16,
        shadowColor: color, shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
        transform: [
          { translateX: progress.interpolate({ inputRange, outputRange: points.map(p => p[0]) }) },
          { translateY: progress.interpolate({ inputRange, outputRange: points.map(p => p[1]) }) },
        ] }} />;
    })}
  </View>;
}
