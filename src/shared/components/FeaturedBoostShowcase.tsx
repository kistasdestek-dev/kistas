import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
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
        {/* Apple Tarzı Mini Rozet + Sağda Flip Butonu */}
        <View style={sectionStyles.cleanHeaderRow}>
          <View style={sectionStyles.sponsorBadge}>
            <Text style={sectionStyles.sponsorBadgeSparkle}>✦</Text>
            <Text style={sectionStyles.sponsorBadgeText}>SPONSORLU</Text>
          </View>

          <View style={sectionStyles.cleanHeaderRight}>
            <CategoryStarsBanner
              size="md"
              words={['Kategorinin Yıldızları', 'Vitrinde Yerinizi Alın', 'Projenizi Parlatın', 'Kıstas Vitrini']}
              onPress={onOpenCreditStore}
            />
          </View>
        </View>

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
