import React, { useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export interface LogoLoopItem {
  id: string;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  active?: boolean;
}

export interface LogoLoopProps<T extends LogoLoopItem = LogoLoopItem> {
  items: ReadonlyArray<T>;
  onItemPress?: (item: T) => void;
  selectedId?: string | null;
  speed?: number; // duration in seconds (default: 26)
  pauseOnHover?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  accentColor?: string;
  testID?: string;
}

const LLP_STYLE_ID = 'kistas-logo-loop-styles';
const LLP_GLOBAL_CSS = `
.llp-container {
  width: 100%;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #ffffff 10%, #ffffff 90%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0%, #ffffff 10%, #ffffff 90%, transparent 100%);
}

.llp-track {
  display: flex;
  align-items: center;
  gap: 32px;
  width: max-content;
  margin: 0;
  padding: 6px 16px;
  list-style: none;
  animation: llpScroll var(--llp-duration, 26s) linear infinite;
  will-change: transform;
}

.llp-container:hover .llp-track {
  animation-play-state: paused;
}

@keyframes llpScroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

.llp-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 8px 15px;
  border-radius: 14px;
  background: rgba(50,105,199,0.04);
  border: 1px solid rgba(50,105,199,0.08);
  color: #686474;
  cursor: pointer;
  outline: none;
  transition:
    transform 0.24s cubic-bezier(0.3, 0.9, 0.4, 1),
    color 0.24s ease,
    background 0.24s ease,
    border-color 0.24s ease,
    box-shadow 0.24s ease;
  user-select: none;
  white-space: nowrap;
}

.llp-btn:hover {
  transform: scale(1.08);
  color: #25364E;
  background: rgba(50,105,199,0.08);
  border-color: rgba(50,105,199,0.18);
  box-shadow: 0 4px 16px rgba(255,255,255, 0.25);
}

.llp-btn.llp-active {
  color: #25364E;
  background: linear-gradient(135deg, rgba(50,105,199,0.32), rgba(50,105,199,0.25));
  border-color: rgba(50,105,199,0.32);
  box-shadow: 0 0 16px rgba(255,255,255,0.35);
  font-weight: 600;
}

.llp-btn.llp-active:hover {
  transform: scale(1.09);
  border-color: rgba(50,105,199,0.32);
  box-shadow: 0 0 20px rgba(255,255,255,0.50);
}

.llp-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.24s ease, transform 0.24s ease;
}

.llp-btn:hover .llp-icon {
  color: #25364E;
  transform: scale(1.06);
}

.llp-btn.llp-active .llp-icon {
  color: #25364E;
}

.llp-text {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

@media (prefers-reduced-motion: reduce) {
  .llp-track {
    animation: none;
  }
}
`;

export const LogoLoop = <T extends LogoLoopItem = LogoLoopItem>({
  items,
  onItemPress,
  selectedId,
  speed = 26,
  containerStyle,
  accentColor = '#EAF2FC',
  testID,
}: LogoLoopProps<T>): React.ReactElement => {
  const isWeb = Platform.OS === 'web';

  // Inject CSS once on Web
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    if (!document.getElementById(LLP_STYLE_ID)) {
      const styleEl = document.createElement('style');
      styleEl.id = LLP_STYLE_ID;
      styleEl.textContent = LLP_GLOBAL_CSS;
      document.head.appendChild(styleEl);
    }
  }, [isWeb]);

  // If there are few items, duplicate enough times so track seamlessly wraps
  const displayItems = React.useMemo(() => {
    if (items.length === 0) return [];
    // Duplicate items to ensure 100% continuous infinite loop
    let list: T[] = [...items];
    while (list.length < 10) {
      list = [...list, ...items];
    }
    // Duplicated twice for 50% translateX loop
    return [...list, ...list];
  }, [items]);

  // Web Render with pure CSS animations and edge masking
  if (isWeb) {
    return (
      <div
        className="llp-container"
        style={{
          ...(containerStyle as any),
          ['--llp-duration' as any]: `${speed}s`,
        }}
        data-testid={testID}
      >
        <div className="llp-track">
          {displayItems.map((item, idx) => {
            const isSelected = selectedId !== undefined ? selectedId === item.id : !!item.active;
            return (
              <button
                key={`${item.id}-${idx}`}
                type="button"
                className={`llp-btn ${isSelected ? 'llp-active' : ''}`}
                onClick={() => onItemPress?.(item)}
                aria-pressed={isSelected}
              >
                {item.icon && (
                  <span className="llp-icon">
                    <Ionicons
                      name={item.icon}
                      size={15}
                      color={isSelected ? '#25364E' : '#686474'}
                    />
                  </span>
                )}
                <span className="llp-text">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Native Mobile (iOS / Android): user-controlled, zero idle animation.
  return (
    <View style={[styles.nativeWrap, containerStyle]} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.nativeTrack}
        decelerationRate="fast"
      >
        {items.map((item) => {
          const isSelected = selectedId !== undefined ? selectedId === item.id : !!item.active;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => onItemPress?.(item)}
              style={[
                styles.nativeChip,
                isSelected && [
                  styles.nativeChipActive,
                  { borderColor: accentColor },
                ],
              ]}
            >
              {isSelected && (
                <LinearGradient
                  colors={['rgba(50,105,199,0.32)', 'rgba(50,105,199,0.2)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              )}
              {item.icon && (
                <Ionicons
                  name={item.icon}
                  size={14}
                  color={isSelected ? '#25364E' : '#686474'}
                  style={styles.nativeIcon}
                />
              )}
              <Text
                style={[
                  styles.nativeText,
                  isSelected && styles.nativeTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Edge Gradient Masks for Native */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(250,251,253,0.95)', 'rgba(37,35,51,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.leftMask}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(37,35,51,0)', 'rgba(250,251,253,0.95)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.rightMask}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  nativeWrap: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    paddingVertical: 4,
  },
  nativeTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  nativeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(50,105,199,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  nativeChipActive: {
    backgroundColor: 'rgba(50,105,199,0.22)',
    borderColor: 'rgba(50,105,199,0.32)',
    elevation: 3,
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  nativeIcon: {
    marginRight: 7,
  },
  nativeText: {
    fontSize: 13,
    color: '#686474',
    fontWeight: '500',
  },
  nativeTextActive: {
    color: '#25364E',
    fontWeight: '600',
  },
  leftMask: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 28,
    zIndex: 2,
  },
  rightMask: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 28,
    zIndex: 2,
  },
});
