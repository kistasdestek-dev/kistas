import React, { useEffect, useMemo } from 'react';
import {
  View,
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

export interface FeaturedBoostShowcaseProps {
  projects: Listing[];
  onSelectProject?: (project: Listing) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const FeaturedBoostShowcase: React.FC<FeaturedBoostShowcaseProps> = ({
  projects,
  onSelectProject,
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

  if (boostedProjects.length === 0) return null;

  return (
    <ErrorBoundary fallbackTitle="Sponsorlu vitrin geçici olarak yüklenemedi">
      <View style={[sectionStyles.showcaseSection, containerStyle]}>
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
          </ScrollView>
        )}
      </View>
    </ErrorBoundary>
  );
};
