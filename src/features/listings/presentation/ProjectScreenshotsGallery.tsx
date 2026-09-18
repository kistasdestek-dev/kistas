import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TouchableOpacity,
  Platform,
  PanResponder,
  Modal,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

export interface ScreenshotItem {
  id: string;
  url: string;
}

export interface ProjectScreenshotsGalleryProps {
  projectTitle: string;
  images?: Array<{ id?: string; imageUrl: string; displayOrder?: number }>;
  coverImageUrl?: string;
  windowWidth: number;
  windowHeight: number;
  isCompactHero: boolean;
}

const getCircularOffset = (index: number, activeIndex: number, total: number): number => {
  let offset = index - activeIndex;
  const midpoint = total / 2;
  if (offset > midpoint) offset -= total;
  if (offset < -midpoint) offset += total;
  return offset;
};

const getCarouselScale = (position: number): number => {
  const distance = Math.abs(position);
  if (distance < 0.5) return 1;
  if (distance < 1.5) return 0.96;
  return 0.92;
};

const getCarouselOpacity = (position: number): number => {
  const distance = Math.abs(position);
  if (distance < 0.5) return 1;
  if (distance < 1.5) return 0.82;
  return 0;
};

export const ProjectScreenshotsGallery: React.FC<ProjectScreenshotsGalleryProps> = ({
  projectTitle,
  images,
  coverImageUrl,
  windowWidth,
  windowHeight,
  isCompactHero,
}) => {
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState<number | null>(null);
  const [screenshotAspectRatios, setScreenshotAspectRatios] = useState<Record<string, number>>({});
  const [carouselDirection, setCarouselDirection] = useState<-1 | 0 | 1>(0);

  const lightboxProgress = useRef(new Animated.Value(0)).current;
  const carouselProgress = useRef(new Animated.Value(0)).current;
  const carouselAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const carouselAnimatingRef = useRef(false);

  // Ekran Görüntüleri Listesi (Deduplicated)
  const screenshotItems = useMemo<ScreenshotItem[]>(() => {
    const list: ScreenshotItem[] = [];
    const seenUrls = new Set<string>();

    if (images && images.length > 0) {
      const sorted = [...images].sort(
        (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
      );
      for (const img of sorted) {
        if (img.imageUrl && !seenUrls.has(img.imageUrl)) {
          seenUrls.add(img.imageUrl);
          list.push({ id: img.id || `img-${list.length}`, url: img.imageUrl });
        }
      }
    }

    if (list.length === 0 && coverImageUrl) {
      list.push({ id: 'cover-1', url: coverImageUrl });
    }

    return list;
  }, [images, coverImageUrl]);

  const isLightboxVisible = selectedScreenshotIndex !== null;

  const cacheScreenshotAspectRatio = useCallback((url: string, width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    const aspectRatio = width / height;
    setScreenshotAspectRatios((current) => (
      current[url] === aspectRatio ? current : { ...current, [url]: aspectRatio }
    ));
  }, []);

  useEffect(() => {
    let isActive = true;
    screenshotItems.forEach((item) => {
      Image.getSize(
        item.url,
        (width, height) => {
          if (isActive) cacheScreenshotAspectRatio(item.url, width, height);
        },
        () => undefined,
      );
    });
    return () => {
      isActive = false;
    };
  }, [cacheScreenshotAspectRatio, screenshotItems]);

  const openScreenshot = useCallback((index: number) => {
    if (!screenshotItems[index]) return;
    carouselAnimationRef.current?.stop();
    carouselAnimatingRef.current = false;
    carouselProgress.setValue(0);
    setCarouselDirection(0);
    lightboxProgress.setValue(0);
    setSelectedScreenshotIndex(index);
  }, [carouselProgress, lightboxProgress, screenshotItems]);

  useEffect(() => {
    if (!isLightboxVisible) return undefined;

    const entranceAnimation = Animated.timing(lightboxProgress, {
      toValue: 1,
      duration: 240,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: Platform.OS !== 'web',
    });
    entranceAnimation.start();

    return () => entranceAnimation.stop();
  }, [isLightboxVisible, lightboxProgress]);

  const closeScreenshot = useCallback(() => {
    if (!isLightboxVisible) return;
    carouselAnimationRef.current?.stop();
    carouselAnimatingRef.current = false;
    carouselProgress.setValue(0);
    setCarouselDirection(0);
    lightboxProgress.stopAnimation();
    Animated.timing(lightboxProgress, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) setSelectedScreenshotIndex(null);
    });
  }, [carouselProgress, isLightboxVisible, lightboxProgress]);

  const showAdjacentScreenshot = useCallback((direction: -1 | 1) => {
    if (carouselAnimatingRef.current || screenshotItems.length < 2) return;

    carouselAnimatingRef.current = true;
    carouselProgress.setValue(0);
    setCarouselDirection(direction);
  }, [carouselProgress, screenshotItems.length]);

  useEffect(() => {
    if (carouselDirection === 0) return undefined;
    const animation = Animated.timing(carouselProgress, {
      toValue: 1,
      duration: 480,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: Platform.OS !== 'web',
    });
    carouselAnimationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) {
        setSelectedScreenshotIndex((current) => current === null
          ? null
          : (current + carouselDirection + screenshotItems.length) % screenshotItems.length);
        setCarouselDirection(0);
      } else {
        carouselProgress.setValue(0);
        setCarouselDirection(0);
      }
      carouselAnimatingRef.current = false;
      carouselAnimationRef.current = null;
    });

    return () => animation.stop();
  }, [carouselDirection, carouselProgress, screenshotItems.length]);

  useEffect(() => {
    if (!isLightboxVisible || screenshotItems.length < 2) return undefined;
    const timer = setInterval(() => showAdjacentScreenshot(1), 4000);
    return () => clearInterval(timer);
  }, [isLightboxVisible, selectedScreenshotIndex, screenshotItems.length, showAdjacentScreenshot]);

  const lightboxPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => (
      windowWidth <= 700
      && Math.abs(gestureState.dx) > 10
      && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
    ),
    onMoveShouldSetPanResponderCapture: (_, gestureState) => (
      windowWidth <= 700
      && Math.abs(gestureState.dx) > 10
      && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
    ),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, gestureState) => {
      const isDeliberateSwipe = Math.abs(gestureState.dx) >= 48 || Math.abs(gestureState.vx) >= 0.45;
      if (!isDeliberateSwipe) return;
      showAdjacentScreenshot(gestureState.dx < 0 ? 1 : -1);
    },
  }), [showAdjacentScreenshot, windowWidth]);

  // Responsive screenshot sizing
  const screenshotWidth = Math.min(Math.round(windowWidth * 0.7), 300);
  const getScreenshotHeight = (url: string) => Math.round(
    screenshotWidth / (screenshotAspectRatios[url] || 0.8),
  );
  const lightboxMaxWidth = Math.min(Math.round(windowWidth * (isCompactHero ? 0.86 : 0.52)), 760);
  const lightboxMaxHeight = Math.max(160, Math.round(windowHeight * (isCompactHero ? 0.78 : 0.72)));
  const lightboxCardSpacing = Math.round(lightboxMaxWidth * (isCompactHero ? 0.92 : 0.82));
  const mobileSwipeStyle = Platform.OS === 'web' && isCompactHero
    ? ({ touchAction: 'pan-y' } as ViewStyle & { touchAction: 'pan-y' })
    : undefined;
  const getLightboxCardSize = (url: string) => {
    const aspectRatio = screenshotAspectRatios[url] || 0.8;
    let width = lightboxMaxWidth;
    let height = width / aspectRatio;
    if (height > lightboxMaxHeight) {
      height = lightboxMaxHeight;
      width = height * aspectRatio;
    }
    return { width: Math.round(width), height: Math.round(height) };
  };
  const shouldCenterScreenshots =
    Platform.OS === 'web' && windowWidth > 700 && screenshotItems.length <= 2;

  if (screenshotItems.length === 0) return null;

  return (
    <>
      {/* 6. APP STORE TARZI EKRAN GÖRÜNTÜLERİ (ÖNİZLEME) */}
      <View style={styles.previewSection}>
        <Text style={[
          styles.sectionHeading,
          styles.previewHeading,
          isCompactHero && styles.previewHeadingCompact,
        ]}>
          Önizleme
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={screenshotWidth + 12}
          decelerationRate="fast"
          contentContainerStyle={[
            styles.screenshotScrollContent,
            shouldCenterScreenshots && styles.screenshotScrollContentCentered,
          ]}
        >
          {screenshotItems.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => openScreenshot(index)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={`${projectTitle} ekran görüntüsü ${index + 1} büyüt`}
              style={[
                styles.screenshotWrapper,
                { width: screenshotWidth, height: getScreenshotHeight(item.url) },
              ]}
            >
              <Image
                source={{ uri: item.url }}
                style={styles.screenshotImage}
                resizeMode="contain"
              />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      <Modal
        visible={isLightboxVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={closeScreenshot}
      >
        <View
          style={[styles.lightboxRoot, isCompactHero && styles.lightboxRootCompact]}
          accessibilityViewIsModal
        >
          <Animated.View style={[styles.lightboxBackdrop, { opacity: lightboxProgress }]} />
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeScreenshot}
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Görseli kapat"
          />

          <Animated.View
            style={[
              styles.lightboxPanel,
              isCompactHero && styles.lightboxPanelCompact,
              {
                opacity: lightboxProgress,
                transform: [
                  {
                    scale: lightboxProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.965, 1],
                    }),
                  },
                  {
                    translateY: lightboxProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F7F9FD', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.lightboxGlowLeft} pointerEvents="none" />
            <View style={styles.lightboxGlowRight} pointerEvents="none" />
            <View style={[styles.lightboxHeader, isCompactHero && styles.lightboxHeaderCompact]}>
              {isCompactHero ? <View /> : (
                <View>
                  <Text style={styles.lightboxTitle}>{projectTitle}</Text>
                  <Text style={styles.lightboxCounter}>
                    {selectedScreenshotIndex === null ? '' : `${selectedScreenshotIndex + 1} / ${screenshotItems.length}`}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={closeScreenshot}
                activeOpacity={0.75}
                style={styles.lightboxCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Görseli kapat"
              >
                <Ionicons name="close" size={isCompactHero ? 28 : 22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View
              style={[styles.lightboxStage, mobileSwipeStyle]}
              {...(isCompactHero ? lightboxPanResponder.panHandlers : {})}
            >
              {selectedScreenshotIndex === null ? null : screenshotItems.map((item, index) => {
                const startPosition = getCircularOffset(index, selectedScreenshotIndex, screenshotItems.length);
                const endPosition = startPosition - carouselDirection;
                const isCenter = startPosition === 0;
                const isIncomingCenter = carouselDirection !== 0 && startPosition === carouselDirection;
                const cardSize = getLightboxCardSize(item.url);

                return (
                  <Animated.View
                    key={item.id}
                    pointerEvents={isCenter && carouselDirection === 0 ? 'auto' : 'none'}
                    renderToHardwareTextureAndroid={carouselDirection !== 0}
                    shouldRasterizeIOS={carouselDirection !== 0}
                    style={[
                      styles.lightboxCarouselCard,
                      {
                        width: cardSize.width,
                        height: cardSize.height,
                        zIndex: isIncomingCenter ? 11 : isCenter ? 10 : Math.abs(startPosition) === 1 ? 5 : 1,
                        opacity: carouselProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [getCarouselOpacity(startPosition), getCarouselOpacity(endPosition)],
                        }),
                        transform: [
                          {
                            translateX: carouselProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [startPosition * lightboxCardSpacing, endPosition * lightboxCardSpacing],
                            }),
                          },
                          {
                            scale: carouselProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [getCarouselScale(startPosition), getCarouselScale(endPosition)],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: item.url }}
                      resizeMode="contain"
                      fadeDuration={0}
                      style={styles.lightboxImage}
                      accessibilityRole="image"
                      accessibilityLabel={`${projectTitle} ekran görüntüsü ${index + 1}`}
                    />
                  </Animated.View>
                );
              })}
            </View>

            {screenshotItems.length > 1 && !isCompactHero ? (
              <>
                <TouchableOpacity
                  onPress={() => showAdjacentScreenshot(-1)}
                  activeOpacity={0.72}
                  style={[styles.lightboxNavButton, styles.lightboxNavButtonLeft]}
                  accessibilityRole="button"
                  accessibilityLabel="Önceki görsel"
                >
                  <Ionicons name="chevron-back" size={24} color="#25364E" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => showAdjacentScreenshot(1)}
                  activeOpacity={0.72}
                  style={[styles.lightboxNavButton, styles.lightboxNavButtonRight]}
                  accessibilityRole="button"
                  accessibilityLabel="Sonraki görsel"
                >
                  <Ionicons name="chevron-forward" size={24} color="#25364E" />
                </TouchableOpacity>
              </>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  previewSection: {
    marginHorizontal: 16,
    marginBottom: 22,
    paddingTop: 24,
    paddingBottom: 24,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#25364E',
    letterSpacing: -0.2,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  previewHeading: {
    marginBottom: 22,
    paddingHorizontal: 24,
    color: '#25364E',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  previewHeadingCompact: {
    marginBottom: 18,
    paddingHorizontal: 20,
    fontSize: 26,
    lineHeight: 31,
  },
  screenshotScrollContent: {
    paddingHorizontal: 24,
    alignItems: 'flex-start',
    gap: 12,
  },
  screenshotScrollContentCentered: {
    minWidth: '100%',
    justifyContent: 'center',
  },
  screenshotWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  lightboxRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  lightboxRootCompact: {
    padding: 0,
  },
  lightboxBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(241,244,249,0.96)',
  },
  lightboxPanel: {
    width: '100%',
    maxWidth: 1240,
    height: '88%',
    maxHeight: 900,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.5,
    shadowRadius: 48,
    elevation: 24,
  },
  lightboxPanelCompact: {
    height: '100%',
    maxHeight: '100%',
    borderRadius: 0,
    borderWidth: 0,
  },
  lightboxHeader: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 14,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lightboxHeaderCompact: {
    top: 42,
    left: 20,
    right: 20,
  },
  lightboxTitle: {
    color: '#25364E',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  lightboxCounter: {
    color: '#7A8799',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  lightboxCloseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25364E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  lightboxStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lightboxCarouselCard: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
    backfaceVisibility: 'hidden',
  },
  lightboxGlowLeft: {
    position: 'absolute',
    top: -140,
    left: -160,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(50,105,199,0.06)',
  },
  lightboxGlowRight: {
    position: 'absolute',
    right: -170,
    bottom: -180,
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: 'rgba(150,75,255,0.05)',
  },
  lightboxNavButton: {
    position: 'absolute',
    top: '50%',
    width: 46,
    height: 46,
    marginTop: -23,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.16)',
    zIndex: 20,
  },
  lightboxNavButtonLeft: { left: 14 },
  lightboxNavButtonRight: { right: 14 },
});
