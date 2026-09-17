import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Listing } from '../../features/listings/domain/Listing';
import { ErrorBoundary } from './ErrorBoundary';
import {
  F3D_STYLE_ID,
  F3D_CSS,
  sectionStyles,
} from './featured-showcase/featuredShowcaseStyles';
import { Web3DCard } from './featured-showcase/Web3DCard';
import { Native3DCard } from './featured-showcase/Native3DCard';
import { CategoryStarsBanner } from './CategoryStarsBanner';

export interface FeaturedBoostShowcaseProps {
  projects: Listing[];
  selectedCategoryName?: string;
  onSelectProject?: (project: Listing) => void;
  onOpenCreditStore?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const FeaturedBoostShowcase: React.FC<FeaturedBoostShowcaseProps> = ({
  projects,
  selectedCategoryName,
  onSelectProject,
  onOpenCreditStore,
  containerStyle,
}) => {
  const isWeb = Platform.OS === 'web';

  // Inject 3D Showcase CSS once on Web runtime
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    if (!document.getElementById(F3D_STYLE_ID)) {
      const styleEl = document.createElement('style');
      styleEl.id = F3D_STYLE_ID;
      styleEl.textContent = F3D_CSS;
      document.head.appendChild(styleEl);
    }
  }, [isWeb]);

  const boostedProjects = useMemo(() => {
    return projects.filter((p) => !!p.isBoosted);
  }, [projects]);

  return (
    <ErrorBoundary fallbackTitle="Sponsorlu vitrin geçici olarak yüklenemedi">
      <View style={[sectionStyles.showcaseSection, containerStyle]}>
        {/* Header Row */}
        <LinearGradient
          colors={['#F3F7FC', '#FFFFFF', '#F2F8F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={sectionStyles.headerRow}
        >
          <View style={sectionStyles.headerCopy}>
            <View style={sectionStyles.eyebrowRow}>
              <View style={sectionStyles.eyebrowMark} />
              <Text style={sectionStyles.eyebrowText}>SPONSORLU VİTRİN</Text>
            </View>

            <View style={sectionStyles.bannerContainer}>
              <CategoryStarsBanner
                words={['Kategorinin Yıldızları', 'Vitrinde Yerinizi Alın', 'Projenizi Parlatın', 'Kıstas Vitrini']}
                onPress={onOpenCreditStore}
              />
            </View>

            {onOpenCreditStore ? (
              <TouchableOpacity
                style={sectionStyles.invitation}
                onPress={onOpenCreditStore}
                activeOpacity={0.65}
                accessibilityRole="button"
                accessibilityLabel="Senin projen neden olmasın? Kredi mağazasını aç"
              >
                <Text style={sectionStyles.inlineCtaText}>
                  Senin projen neden olmasın?{' '}
                  <Text style={sectionStyles.inlineCtaArrow}>↗</Text>
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </LinearGradient>

        {/* Cards Showcase Area */}
        {isWeb ? (
          <div className="crd-f3d-stage">
            {boostedProjects.map((project) => (
              <ErrorBoundary key={`boosted-${project.id}`} silentFallback>
                <Web3DCard
                  project={project}
                  onPress={() => onSelectProject?.(project)}
                />
              </ErrorBoundary>
            ))}
            {/* Boost promotion / call-to-action card */}
            <ErrorBoundary key="boost-promo-card" silentFallback>
              <Web3DCard
                isPromo
                onOpenCreditStore={onOpenCreditStore}
              />
            </ErrorBoundary>
          </div>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={sectionStyles.nativeScrollContent}
          >
            {boostedProjects.map((project) => (
              <ErrorBoundary key={`boosted-${project.id}`} silentFallback>
                <Native3DCard
                  project={project}
                  onPress={() => onSelectProject?.(project)}
                />
              </ErrorBoundary>
            ))}
            <ErrorBoundary key="boost-promo-card" silentFallback>
              <Native3DCard
                isPromo
                onOpenCreditStore={onOpenCreditStore}
              />
            </ErrorBoundary>
          </ScrollView>
        )}
      </View>
    </ErrorBoundary>
  );
};
