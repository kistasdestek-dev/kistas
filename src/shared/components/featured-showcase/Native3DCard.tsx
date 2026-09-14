import React from 'react';
import {
  View,
  Text,
  Animated,
  Pressable,
  Image,
  StyleSheet,
  ImageStyle,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Listing } from '../../../features/listings/domain/Listing';
import { AutoTransparentLogo } from '../AutoTransparentLogo';
import { BorderBeam } from '../BorderBeam';
import { KistasLogo } from '../KistasLogo';
import { nativeCardStyles } from './featuredShowcaseStyles';

export interface Single3DCardProps {
  project?: Listing;
  isPromo?: boolean;
  onPress?: () => void;
  onOpenCreditStore?: () => void;
}

interface ScalePressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  style: StyleProp<ViewStyle>;
}

const ScalePressable: React.FC<ScalePressableProps> = ({ children, onPress, style }) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  const animateTo = React.useCallback((toValue: number) => {
    scale.stopAnimation();
    Animated.spring(scale, {
      toValue,
      stiffness: 500,
      damping: 38,
      mass: 0.5,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() => animateTo(0.98)}
        onPressOut={() => animateTo(1)}
        style={nativeCardStyles.pressTarget}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export const Native3DCard: React.FC<Single3DCardProps> = ({
  project,
  isPromo = false,
  onPress,
  onOpenCreditStore,
}) => {
  if (isPromo || !project) {
    return (
      <ScalePressable
        onPress={onOpenCreditStore}
        style={[nativeCardStyles.cardContainer, nativeCardStyles.promoCard]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F4F8FE', '#EEF5FC']}
          style={nativeCardStyles.cardGradient}
        >
          <View style={nativeCardStyles.promoGlowTop} />
          <View style={nativeCardStyles.promoGlowBottom} />

          <View style={nativeCardStyles.promoStatusRow}>
            <View style={nativeCardStyles.promoStatusPill}>
              <View style={nativeCardStyles.promoStatusDot} />
              <Text style={nativeCardStyles.promoStatusText}>VİTRİNDE YERİN HAZIR</Text>
            </View>
            <Text style={nativeCardStyles.promoRotation}>↻ ADİL ROTASYON</Text>
          </View>

          <View style={nativeCardStyles.promoHero}>
            <View style={nativeCardStyles.promoOrbitOuter}>
              <View style={nativeCardStyles.promoOrbitInner}>
                <KistasLogo
                  size={54}
                  showWordmark={false}
                  glow
                  style={nativeCardStyles.promoLogoOpticalCenter}
                />
              </View>
            </View>
            <Text style={nativeCardStyles.promoEyebrow}>KISTAS VİTRİNİ</Text>
            <Text style={nativeCardStyles.promoTitle} numberOfLines={2}>
              İyi fikirler görünür olmayı hak eder.
            </Text>
            <Text style={nativeCardStyles.promoTagline} numberOfLines={2}>
              Projeni doğru kitleyle buluştur, vitrindeki yerini ayır.
            </Text>
          </View>

          <BorderBeam
            size={200}
            duration={12}
            colorVariant="kistas"
            borderWidth={1.5}
            borderRadius={16}
          >
            <View style={nativeCardStyles.promoCtaDock}>
              <View>
                <Text style={nativeCardStyles.promoCtaLabel}>SPONSORLU VİTRİN</Text>
                <Text style={nativeCardStyles.promoCtaTitle}>Vitrinde Yerini Al</Text>
              </View>
              <View style={nativeCardStyles.promoCtaArrow}>
                <Text style={nativeCardStyles.promoCtaArrowText}>→</Text>
              </View>
            </View>
          </BorderBeam>
        </LinearGradient>
      </ScalePressable>
    );
  }

  const initials = project.title ? project.title.slice(0, 2).toUpperCase() : 'KT';
  const primaryPlatform = project.platforms?.[0] || 'App';
  const previewImage = project.coverImageUrl || project.logoUrl;

  return (
    <ScalePressable
      onPress={onPress}
      style={[nativeCardStyles.cardContainer, nativeCardStyles.todayCard]}
    >
      <LinearGradient
        colors={['#F8F9FB', '#F8F9FB']}
        style={nativeCardStyles.cardGradient}
      >
        {previewImage && <Image source={{ uri: previewImage }} resizeMode="cover" style={nativeCardStyles.todayAtmosphere} />}
        <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.88)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

        {/* Top Preview Hero */}
        <View style={[nativeCardStyles.heroArea, nativeCardStyles.heroAreaMedia, nativeCardStyles.todayHero]}>
          <View style={nativeCardStyles.topBadgeLeft}>
            <View style={nativeCardStyles.badgeDot} />
            <Text style={nativeCardStyles.badgeText}>ÖNE ÇIKAN</Text>
          </View>
          <View style={nativeCardStyles.topBadgeRight}>
            <Text style={nativeCardStyles.creditsText}>↻ SAATLİK ROTASYON</Text>
          </View>
          <View style={[nativeCardStyles.previewFrame, nativeCardStyles.previewFrameMedia, nativeCardStyles.todayMedia]}>
            {previewImage ? (
              <Image
                source={{ uri: previewImage }}
                style={nativeCardStyles.previewImg as ImageStyle}
                resizeMode="contain"
              />
            ) : (
              <View style={nativeCardStyles.mockupCenter}>
                <Text style={nativeCardStyles.mockupIcon}>📱</Text>
                <Text style={nativeCardStyles.mockupText}>{primaryPlatform}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Middle Editorial */}
        <View style={nativeCardStyles.editorialSection}>
          <Text style={nativeCardStyles.eyebrow}>HAYDİ BAŞLAYALIM</Text>
          <Text style={nativeCardStyles.titleHero} numberOfLines={2}>{project.title}</Text>
          <Text style={nativeCardStyles.taglineHero} numberOfLines={2}>
            {project.tagline || project.description}
          </Text>
        </View>

        {/* Bottom Dock */}
        <View style={nativeCardStyles.appDock}>
          <View style={nativeCardStyles.dockLeft}>
            <View style={[nativeCardStyles.dockLogo, project.logoUrl ? nativeCardStyles.dockLogoUploaded : null]}>
              {project.logoUrl ? (
                <AutoTransparentLogo
                  src={project.logoUrl}
                  alt={project.title}
                  style={nativeCardStyles.dockLogoImg as ImageStyle}
                />
              ) : (
                <Text style={nativeCardStyles.dockLogoInit}>{initials}</Text>
              )}
            </View>
            <View style={nativeCardStyles.dockInfo}>
              <Text style={nativeCardStyles.dockTitle} numberOfLines={1}>{project.title}</Text>
              <Text style={nativeCardStyles.dockSub} numberOfLines={1}>
                {project.seller?.fullName ? `Geliştiren: ${project.seller.fullName}` : primaryPlatform}
              </Text>
            </View>
          </View>
          <View style={nativeCardStyles.dockRight}>
            <View style={nativeCardStyles.ctaBtn}>
              <Text style={nativeCardStyles.ctaText}>Projeyi İncele</Text>
            </View>
            <Text style={nativeCardStyles.dockMicro}>▲ {project.upvotesCount} Oy</Text>
          </View>
        </View>
      </LinearGradient>
    </ScalePressable>
  );
};
