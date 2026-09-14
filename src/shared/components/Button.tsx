import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  AccessibilityInfo,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../core/theme';

export type ButtonVariant = 'primary' | 'aurora' | 'secondary' | 'outline' | 'danger' | 'gold';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  selected?: boolean;
  isActive?: boolean;
  showArrow?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fontFamily?: string;
  fontWeight?: TextStyle['fontWeight'];
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  testID?: string;
  tint?: {
    surface: string;
    border: string;
    accent: string;
    glow?: string;
  };
}

const BAB_STYLE_ID = 'kistas-bab-button-styles';
const BAB_GLOBAL_CSS = `
.bab-stage { display:inline-flex; position:relative; isolation:isolate; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
.bab-btn { position:relative; isolation:isolate; overflow:hidden; display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; border:1px solid var(--bab-border,rgba(50,105,199,0.32)); background:var(--bab-surface,#EAF2FC); color:var(--bab-accent,#252333); font-family:inherit; font-weight:600; cursor:pointer; box-shadow:inset 0 1px 0 rgba(37,35,51,.1),0 5px 14px rgba(255,255,255,.18),0 0 14px var(--bab-glow,transparent); transition:transform 160ms cubic-bezier(.2,.8,.2,1),background 180ms ease,border-color 180ms ease,box-shadow 180ms ease; -webkit-tap-highlight-color:transparent; }
.bab-stage-unselected .bab-btn { background:var(--bab-surface,#F8F9FB); color:var(--bab-accent,#252333); border-color:var(--bab-border,rgba(50,105,199,0.14)); }
.bab-label { position:relative; z-index:2; display:inline-flex; align-items:center; gap:6px; }
.bab-arrow { color:currentColor; transition:transform 180ms ease; }
.bab-btn:active:not(:disabled) { transform:scale(.97); }
.bab-btn:focus-visible { outline:2px solid rgba(50,105,199,0.32); outline-offset:3px; }
.bab-btn:disabled { opacity:.45; cursor:default; }
.bab-bloom { position:absolute; inset:3px; border-radius:18px; box-shadow:0 7px 22px var(--bab-glow,rgba(255,255,255,.22)); opacity:0; pointer-events:none; transition:opacity 180ms ease; }
.bab-core { position:absolute; inset:0; z-index:1; pointer-events:none; background:linear-gradient(110deg,transparent 25%,rgba(37,35,51,.25) 48%,transparent 70%); transform:translateX(-130%); }
.bab-stage-unselected .bab-core { background:linear-gradient(110deg,transparent 25%,rgba(50,105,199,0.1) 48%,transparent 70%); }
.bab-pulse { position:absolute; inset:0; border:1px solid rgba(50,105,199,0.24); border-radius:inherit; opacity:0; pointer-events:none; }
.bab-stage-unselected .bab-pulse { border-color:rgba(50,105,199,0.32); }
@media (hover:hover) and (pointer:fine) {
  .bab-stage:has(.bab-btn:not(:disabled):hover) .bab-bloom { opacity:1; }
  .bab-btn:not(:disabled):hover { transform:translateY(-1px); }
  .bab-btn:not(:disabled):hover .bab-arrow { transform:translateX(3px); }
  .bab-btn:not(:disabled):hover .bab-core { animation:bab-sheen 600ms ease-out both; }
}
@keyframes bab-sheen { from { transform:translateX(-130%); } to { transform:translateX(130%); } }
@media (prefers-reduced-motion:reduce) {
  .bab-btn,.bab-arrow,.bab-bloom { transition:none; }
  .bab-btn:not(:disabled):hover,.bab-btn:active:not(:disabled),.bab-btn:not(:disabled):hover .bab-arrow { transform:none; }
  .bab-btn:not(:disabled):hover .bab-core { animation:none; }
}
`;

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  selected,
  isActive,
  showArrow,
  style,
  textStyle,
  fontFamily,
  fontWeight,
  icon,
  accessibilityLabel,
  testID,
  tint,
}) => {
  const isWeb = Platform.OS === 'web';
  const isAurora = variant === 'primary' || variant === 'aurora';

  // Inject Web CSS once
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    let styleEl = document.getElementById(BAB_STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = BAB_STYLE_ID;
      document.head.appendChild(styleEl);
    }
    if (styleEl.textContent !== BAB_GLOBAL_CSS) styleEl.textContent = BAB_GLOBAL_CSS;
  }, [isWeb]);

  // Web refs: interactions are CSS-driven and idle-safe.
  const btnRef = useRef<HTMLButtonElement>(null);

  // Handle pulse on Web click
  const handleWebClick = useCallback(() => {
    if (disabled || isLoading) return;
    const btn = btnRef.current;
    if (btn && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const sheen = btn.querySelector('.bab-core');
      const pulse = btn.querySelector('.bab-pulse');
      for (const layer of [sheen, pulse]) layer?.getAnimations().forEach(animation => animation.cancel());
      sheen?.animate([{ transform: 'translateX(-130%)' }, { transform: 'translateX(130%)' }], { duration: 500, easing: 'ease-out' });
      pulse?.animate([{ opacity: 0.65, transform: 'scale(.94)' }, { opacity: 0, transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
    }
    onPress();
  }, [disabled, isLoading, onPress]);

  // -------------------------------------------------------------
  // WEB AURORA RENDER
  // -------------------------------------------------------------
  if (isWeb && isAurora) {
    const sizePadding =
      size === 'sm'
        ? { padding: '8px 16px', fontSize: '12.5px', borderRadius: '14px' }
        : size === 'lg'
        ? { padding: '15px 30px', fontSize: '15px', borderRadius: '18px' }
        : { padding: '11px 22px', fontSize: '13.5px', borderRadius: '16px' };

    const customFont = {
      ...(fontFamily ? { fontFamily } : {}),
      ...(fontWeight ? { fontWeight: String(fontWeight) } : {}),
    };

    const isSelected = selected !== undefined ? selected : (isActive !== undefined ? isActive : true);
    const shouldShowArrow = showArrow !== undefined ? showArrow : true;

    return (
      <div
        className={`bab-stage ${!isSelected ? 'bab-stage-unselected' : 'bab-stage-selected'}`}
        style={{
          ...(style as any),
          ...(tint ? {
            '--bab-surface': tint.surface,
            '--bab-border': tint.border,
            '--bab-accent': tint.accent,
            '--bab-glow': tint.glow || tint.border,
          } : {}),
        } as any}
        data-testid={testID}
      >
        <div className="bab-bloom" aria-hidden="true" />
        <button
          ref={btnRef}
          className={`bab-btn ${disabled ? 'bab-disabled' : ''}`}
          type="button"
          aria-label={accessibilityLabel || title}
          aria-busy={isLoading}
          aria-pressed={selected !== undefined || isActive !== undefined ? isSelected : undefined}
          onClick={handleWebClick}
          disabled={disabled || isLoading}
          style={{
            ...sizePadding,
            ...customFont,
            ...(textStyle as any),
          }}
        >
          <span className="bab-core" aria-hidden="true" />
          <span className="bab-pulse" aria-hidden="true" />
          <span className="bab-label">
            {isLoading ? (
              <ActivityIndicator color={isSelected ? '#252333' : '#252333'} size="small" style={{ marginRight: 6 }} />
            ) : icon ? (
              <span style={{ display: 'inline-flex', marginRight: 4 }}>{icon}</span>
            ) : null}
            <span className="bab-text">{title}</span>
            {shouldShowArrow && !isLoading && (
              <svg
                className="bab-arrow"
                viewBox="0 0 16 16"
                width="15"
                height="15"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M2.75 8H12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.55"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 4.5 12 8l-3.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.55"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NATIVE MOBILE / FALLBACK VARIANTS
  // -------------------------------------------------------------
  return (
    <NativeButtonComponent
      title={title}
      onPress={onPress}
      variant={variant}
      size={size}
      isLoading={isLoading}
      disabled={disabled}
      selected={selected}
      isActive={isActive}
      showArrow={showArrow}
      style={style}
      textStyle={textStyle}
      fontFamily={fontFamily}
      fontWeight={fontWeight}
      icon={icon}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      tint={tint}
    />
  );
};

// =============================================================
// NATIVE MOBILE / FALLBACK COMPONENT
// =============================================================
const NativeButtonComponent: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  selected,
  isActive,
  showArrow,
  style,
  textStyle,
  fontFamily,
  fontWeight,
  icon,
  accessibilityLabel,
  testID,
  tint,
}) => {
  const isSelected = selected !== undefined ? selected : (isActive !== undefined ? isActive : true);
  const isAurora = (variant === 'primary' || variant === 'aurora') && isSelected;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
      pulseAnim.stopAnimation();
      pressScale.stopAnimation();
    };
  }, [pulseAnim, pressScale]);

  const handlePressIn = () => {
    if (disabled || isLoading || reduceMotion) return;
    Animated.spring(pressScale, {
      toValue: 0.97,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (reduceMotion) { pressScale.setValue(1); return; }
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (disabled || isLoading) return;
    if (isAurora && !reduceMotion) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 550,
        easing: Easing.bezier(0.2, 0.7, 0.2, 1),
        useNativeDriver: true,
      }).start();
    }
    onPress();
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.85, 0],
  });

  const getVariantStyles = (): {
    button: ViewStyle;
    text: TextStyle;
    gradient?: readonly [string, string, ...string[]];
  } => {
    if (!isSelected) {
      return {
        button: {
          backgroundColor: tint?.surface || 'rgba(250,251,253,0.86)',
          borderWidth: 1,
          borderColor: tint?.border || 'rgba(50,105,199,0.16)',
        },
        text: { color: tint?.accent || '#252333' },
      };
    }
    switch (variant) {
      case 'secondary':
        return {
          button: {
            backgroundColor: theme.colors.secondary.DEFAULT,
            shadowColor: theme.colors.secondary.DEFAULT,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 4,
          },
          text: { color: theme.colors.neutral.white },
          gradient: ['#3269C7', '#2858AA'],
        };
      case 'gold':
        return {
          button: {
            backgroundColor: theme.colors.accent.gold,
            shadowColor: theme.colors.accent.gold,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 5,
          },
          text: { color: theme.colors.neutral.white },
          gradient: ['#936413', '#80550E'],
        };
      case 'outline':
        return {
          button: {
            backgroundColor: 'rgba(250,251,253,0.86)',
            borderWidth: 1,
            borderColor: 'rgba(50,105,199,0.22)',
          },
          text: { color: '#252333' },
        };
      case 'danger':
        return {
          button: {
            backgroundColor: theme.colors.danger.DEFAULT,
            shadowColor: theme.colors.danger.DEFAULT,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 3,
          },
          text: { color: '#252333' },
          gradient: ['#a04949', '#a02e2e', '#a01c1c'],
        };
      case 'aurora':
      case 'primary':
      default:
        return {
          button: {
            backgroundColor: tint?.surface || '#EAF2FC',
            borderWidth: 1.5,
            borderColor: tint?.border || 'rgba(50,105,199,0.32)',
            shadowColor: tint?.glow || '#ffffff',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.16,
            shadowRadius: 10,
            elevation: 6,
          },
          text: { color: tint?.accent || '#252333' },
        };
    }
  };

  const getSizeStyles = (): { button: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          button: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 14 },
          text: { fontSize: 12.5 },
        };
      case 'lg':
        return {
          button: { paddingVertical: 15, paddingHorizontal: 28, borderRadius: 18 },
          text: { fontSize: 15 },
        };
      case 'md':
      default:
        return {
          button: { paddingVertical: 11, paddingHorizontal: 22, borderRadius: 16 },
          text: { fontSize: 13.5 },
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();
  const shouldShowArrow = showArrow !== undefined ? showArrow : isAurora;

  return (
    <Animated.View
      style={[
        styles.nativeWrapper,
        { transform: [{ scale: pressScale }] },
        style,
      ]}
      testID={testID}
    >
      {/* Pulse Expanding Ring */}
      {isAurora && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.nativePulse,
            tint ? { borderColor: tint.border } : null,
            {
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />
      )}

      {/* Core Touch Target */}
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isLoading}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || isLoading, busy: isLoading }}
        style={[
          styles.nativeBase,
          vStyles.button,
          sStyles.button,
          (disabled || isLoading) && styles.nativeDisabled,
        ]}
      >
        {/* Inner Core Glow for Aurora */}
        {isAurora && (
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(37,35,51,0.13)', 'transparent', tint?.surface || 'rgba(50,105,199,0.08)']}
            locations={[0, 0.6, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Traditional Gradient for other variants */}
        {!isAurora && vStyles.gradient && (
          <LinearGradient
            pointerEvents="none"
            colors={[...vStyles.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Content Label */}
        <View style={styles.nativeLabelRow}>
          {isLoading ? (
            <ActivityIndicator color={vStyles.text.color} size="small" style={{ marginRight: 6 }} />
          ) : icon ? (
            <View style={{ marginRight: 6 }}>{icon}</View>
          ) : null}

          <Text
            style={[
              styles.nativeLabelText,
              vStyles.text,
              sStyles.text,
              fontFamily ? { fontFamily } : null,
              fontWeight ? { fontWeight } : null,
              textStyle,
            ]}
          >
            {title}
          </Text>

          {shouldShowArrow && !isLoading && (
            <Ionicons
              name="arrow-forward"
              size={size === 'sm' ? 13 : 15}
              color={vStyles.text.color}
              style={styles.nativeArrow}
            />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const AuroraButton = Button;

const styles = StyleSheet.create({
  nativeWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  nativePulse: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(50,105,199,0.32)',
  },
  nativeBase: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  nativeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nativeLabelText: {
    fontWeight: '700',
    letterSpacing: Platform.select({ ios: -0.24, android: -0.1, default: -0.2 }),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif',
    }),
  },
  nativeArrow: {
    marginLeft: 6,
  },
  nativeDisabled: {
    opacity: 0.5,
  },
});
