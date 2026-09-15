import React, { useEffect, useRef } from 'react';
import {
  Platform,
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { cn } from '../../lib/utils';
import { PerimeterLight } from './PerimeterLight';

export type ShinyButtonVariant = 'electric-blue' | 'kistas-orange' | 'emerald';

export interface ShinyButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: ShinyButtonVariant;
  onPress?: (event?: any) => void;
  onClick?: (event?: any) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: string;
  accessibilityLabel?: string;
  testID?: string;
  [key: string]: any;
}

const SHINY_STYLE_ID = 'kistas-shiny-button-styles';
const SHINY_GLOBAL_CSS = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.shiny-btn-wrap {
  position: relative;
  display: inline-flex;
  width: 100%;
}

.shiny-ambient-glow {
  position: absolute;
  top: -4px;
  right: -4px;
  bottom: -4px;
  left: -4px;
  border-radius: 9999px;
  filter: blur(12px);
  opacity: 0.6;
  pointer-events: none;
  overflow: hidden;
  transition: opacity 300ms ease, filter 300ms ease;
}

.shiny-btn-wrap:hover .shiny-ambient-glow {
  opacity: 1;
  filter: blur(16px);
}

.shiny-beam-spin {
  position: absolute;
  top: -150%;
  left: -150%;
  width: 400%;
  height: 400%;
  animation: spin 3.2s linear infinite;
  pointer-events: none;
}

.shiny-btn-core {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 1.5px;
  border-radius: 9999px;
  overflow: hidden;
  border: none;
  background: transparent;
  cursor: pointer;
  outline: none;
  text-decoration: none;
  transition: transform 200ms ease;
  -webkit-tap-highlight-color: transparent;
}

.shiny-btn-core:active:not(:disabled) {
  transform: scale(0.96);
}

.shiny-btn-core:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.shiny-btn-body {
  position: relative;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 46px;
  padding: 12px 32px;
  border-radius: 9999px;
  background-color: #FAFBFD;
  color: #25364E;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.025em;
  transition: background-color 200ms ease;
  box-sizing: border-box;
}

.shiny-btn-core:hover:not(:disabled) .shiny-btn-body {
  background-color: #FAFBFD;
}

@media (prefers-reduced-motion: reduce) {
  .shiny-beam-spin {
    animation: none;
  }
}
`;

// Conic gradient ışık hüzmesi stili (Gemini)
const beamGradients: Record<ShinyButtonVariant, string> = {
  'electric-blue':
    'conic-gradient(from 0deg, transparent 0deg, transparent 260deg, rgba(50,105,199,0.2) 290deg, rgba(50,105,199,0.8) 330deg, #3269C7 345deg, #25364E 355deg, rgba(50,105,199,0.9) 360deg)',
  'kistas-orange':
    'conic-gradient(from 0deg, transparent 0deg, transparent 260deg, rgba(160,57,1,0.2) 290deg, rgba(160,78,1,0.8) 330deg, #a08650 350deg, #25364E 356deg, rgba(160,57,1,0.9) 360deg)',
  emerald:
    'conic-gradient(from 0deg, transparent 0deg, transparent 260deg, rgba(24,118,87,0.2) 290deg, rgba(24,118,87,0.8) 330deg, #3269C7 350deg, #25364E 356deg, rgba(24,118,87,0.9) 360deg)',
};

const nativePalette: Record<ShinyButtonVariant, { beam: string; border: string }> = {
  'electric-blue': { beam: '#3269C7', border: 'rgba(50,105,199,0.32)' },
  'kistas-orange': { beam: '#a08650', border: 'rgba(160,78,1,0.34)' },
  emerald: { beam: '#3269C7', border: 'rgba(24,118,87,0.34)' },
};

export function ShinyButton({
  children,
  className,
  variant = 'electric-blue',
  onPress,
  onClick,
  disabled,
  style,
  accessibilityRole = 'button',
  accessibilityLabel,
  ...props
}: ShinyButtonProps) {
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    let styleEl = document.getElementById(SHINY_STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = SHINY_STYLE_ID;
      document.head.appendChild(styleEl);
    }
    if (styleEl.textContent !== SHINY_GLOBAL_CSS) {
      styleEl.textContent = SHINY_GLOBAL_CSS;
    }
  }, [isWeb]);

  const handleClick = (e?: any) => {
    if (disabled) return;
    if (onClick) onClick(e);
    if (onPress) onPress(e);
  };

  if (isWeb) {
    return (
      <div
        className={cn('shiny-btn-wrap relative inline-flex group', className)}
        style={style as any}
      >
        {/* 1. Arka Plan Ortam Işıması (Ambient Glow) */}
        <div className="shiny-ambient-glow absolute -inset-1 rounded-full blur-md opacity-60 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none overflow-hidden">
          <div
            className="shiny-beam-spin absolute -top-[150%] -left-[150%] w-[400%] h-[400%] animate-[spin_3.2s_linear_infinite]"
            style={{ background: beamGradients[variant] }}
          />
        </div>

        {/* 2. Dönen Işık Kenarlığı ve Buton Gövdesi */}
        <button
          {...props}
          type="button"
          disabled={disabled}
          onClick={handleClick}
          aria-label={accessibilityLabel}
          className={cn(
            'shiny-btn-core relative inline-flex items-center justify-center p-[1.5px] rounded-full overflow-hidden transition-transform duration-200 active:scale-95 cursor-pointer focus:outline-none'
          )}
        >
          {/* Kenarda dönen ışık */}
          <div
            className="shiny-beam-spin absolute -top-[150%] -left-[150%] w-[400%] h-[400%] animate-[spin_3.2s_linear_infinite] pointer-events-none"
            style={{ background: beamGradients[variant] }}
          />

          {/* Buton Gövdesi */}
          <span className="shiny-btn-body relative z-10 inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#FAFBFD] hover:bg-[#FAFBFD] text-sm font-semibold text-white tracking-wide transition-colors duration-200">
            {children}
          </span>
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NATIVE MOBILE FALLBACK (iOS & Android)
  // -------------------------------------------------------------
  return (
    <NativeShinyButton
      variant={variant}
      disabled={disabled}
      onPress={handleClick}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      {...props}
    >
      {children}
    </NativeShinyButton>
  );
}

function NativeShinyButton({
  children,
  variant = 'electric-blue',
  disabled,
  onPress,
  style,
  ...props
}: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const palette = nativePalette[variant as ShinyButtonVariant] || nativePalette['electric-blue'];

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      speed: 28,
      bounciness: 2,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View
      style={[
        nativeStyles.ambientGlow,
        { shadowColor: palette.beam },
        disabled && nativeStyles.disabled,
        style,
      ]}
    >
      <Animated.View style={[nativeStyles.frame, { transform: [{ scale }] }]}>
        <TouchableOpacity
          {...props}
          disabled={disabled}
          activeOpacity={0.9}
          onPress={onPress}
          onPressIn={() => animateScale(0.96)}
          onPressOut={() => animateScale(1)}
          style={[nativeStyles.button, { borderColor: palette.border }]}
        >
          {children}
        </TouchableOpacity>
        <PerimeterLight radius={23} duration={3200} color={palette.beam} />
      </Animated.View>
    </View>
  );
}

const nativeStyles = StyleSheet.create({
  ambientGlow: {
    width: '100%',
    borderRadius: 23,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 10,
    elevation: 5,
  },
  frame: {
    minHeight: 46,
    borderRadius: 23,
    padding: 1,
    backgroundColor: 'rgba(250,251,253,0.98)',
  },
  button: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: '#FAFBFD',
  },
  disabled: {
    opacity: 0.5,
  },
});
