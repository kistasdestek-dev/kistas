import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Listing, isListingSponsored } from '../../features/listings/domain/Listing';
import { breakpoints } from '../../core/theme';
import { AutoTransparentLogo } from './AutoTransparentLogo';

export interface PopularProjectPagerProps {
  title: string;
  subtitle: string;
  projects: Listing[];
  metric: 'weekly' | 'lifetime';
  upvotedMap?: Record<string, boolean>;
  onSelectProject?: (project: Listing) => void;
  onToggleUpvote?: (projectId: string) => void;
  onOpenBrowse?: () => void;
}

const getProjectInitials = (title: string): string => {
  return title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
};

export const PopularProjectPager: React.FC<PopularProjectPagerProps> = React.memo(({
  title,
  subtitle,
  projects,
  metric,
  upvotedMap: _upvotedMap,
  onSelectProject,
  onToggleUpvote: _onToggleUpvote,
  onOpenBrowse,
}) => {
  const { width: viewportWidth } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && viewportWidth > breakpoints.phoneMax;
  const webNavigationInset = viewportWidth <= breakpoints.tabletMax ? 84 : 252;
  const availableWebWidth = Math.min(viewportWidth - webNavigationInset, 1320);
  const pageWidth = isWideWeb
    ? Math.min(Math.max((availableWebWidth - 62) / 2, 420), 612)
    : Math.min(viewportWidth - 42, 410);

  const pages = useMemo(() => {
    const visibleProjects = projects.slice(0, 50);
    const nextPages: Listing[][] = [];
    for (let index = 0; index < visibleProjects.length; index += 3) {
      nextPages.push(visibleProjects.slice(index, index + 3));
    }
    return nextPages;
  }, [projects]);

  if (projects.length === 0) return null;

  return (
    <View style={[styles.popularSection, isWideWeb && styles.popularSectionWeb]}>
      <TouchableOpacity
        style={styles.popularHeader}
        onPress={onOpenBrowse}
        activeOpacity={onOpenBrowse ? 0.7 : 1}
        disabled={!onOpenBrowse}
        accessibilityRole="button"
        accessibilityLabel="Tüm popüler projeleri aç"
      >
        <View style={styles.popularHeadingCopy}>
          <Text style={styles.popularTitle}>{title}</Text>
          <Text style={styles.popularSubtitle}>{subtitle}</Text>
        </View>
        {onOpenBrowse ? <Ionicons name="chevron-forward" size={28} color="#63666f" /> : null}
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={pageWidth + 14}
        snapToAlignment="start"
        contentContainerStyle={styles.popularPagerContent}
      >
        {pages.map((page, pageIndex) => (
          <View key={`popular-page-${pageIndex}`} style={[styles.popularPage, { width: pageWidth }]}>
            {page.map((project, rowIndex) => {
              const isSupportLocked = isListingSponsored(project);
              const supportCountText = isSupportLocked
                ? 'Sponsorlu'
                : metric === 'weekly'
                  ? `${project.weeklySupportCount || 0}`
                  : `${project.upvotesCount}`;

              return (
                <TouchableOpacity
                  key={project.id}
                  style={styles.popularRow}
                  onPress={() => onSelectProject?.(project)}
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  accessibilityLabel={`${project.title} projesini incele`}
                >
                  <View style={styles.popularMainAction}>
                    {project.logoUrl ? (
                      <View style={styles.popularLogoShell}>
                        <AutoTransparentLogo
                          src={project.logoUrl}
                          alt={`${project.title} logosu`}
                          style={styles.popularLogo}
                        />
                      </View>
                    ) : (
                      <LinearGradient
                        colors={['#EAF2FC', '#F8F9FB']}
                        style={[styles.popularLogoShell, styles.popularLogoPlaceholder]}
                      >
                        <Text style={styles.popularLogoInitials}>{getProjectInitials(project.title)}</Text>
                      </LinearGradient>
                    )}
                    <View style={styles.popularCopy}>
                      <Text style={styles.popularProjectTitle} numberOfLines={1}>{project.title}</Text>
                      <Text style={styles.popularProjectTagline} numberOfLines={1}>
                        {project.tagline || project.description || 'Bağımsız dijital proje'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.popularTrailing}>
                    <View style={[styles.popularSupportBadge, isSupportLocked && styles.popularSupportBadgeLocked]}>
                      <Ionicons
                        name={isSupportLocked ? 'lock-closed' : 'chevron-up'}
                        size={12}
                        color={isSupportLocked ? '#686474' : '#0FA336'}
                      />
                      <Text style={[styles.popularSupportBadgeText, isSupportLocked && styles.popularSupportBadgeTextLocked]}>
                        {supportCountText}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color="#A8A5B2" style={styles.popularTrailingChevron} />
                  </View>
                  {rowIndex < page.length - 1 ? <View pointerEvents="none" style={styles.popularSeparator} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  popularSection: {
    marginTop: 24,
    marginBottom: 8,
  },
  popularSectionWeb: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(250,251,253,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.11)',
    boxShadow: '0 18px 46px rgba(255,255,255,0.18)' as any,
    overflow: 'hidden',
  },
  popularHeader: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  popularHeadingCopy: {
    flexShrink: 1,
  },
  popularTitle: {
    color: '#252333',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.9,
  },
  popularSubtitle: {
    color: '#686474',
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 1,
  },
  popularPagerContent: {
    paddingLeft: 16,
    paddingRight: 28,
    gap: 14,
  },
  popularPage: {
    backgroundColor: 'transparent',
  },
  popularRow: {
    minHeight: 102,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  popularMainAction: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularLogoShell: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  popularLogoPlaceholder: {
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(50,105,199,0.24)',
  },
  popularLogo: {
    width: '100%',
    height: '100%',
  },
  popularLogoInitials: {
    color: '#252333',
    fontSize: 22,
    fontWeight: '900',
  },
  popularCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
    marginRight: 9,
  },
  popularProjectTitle: {
    color: '#252333',
    fontSize: 16.5,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  popularProjectTagline: {
    color: '#686474',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: 3,
  },
  popularTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingRight: 6,
  },
  popularSupportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: 'rgba(15, 163, 54, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(15, 163, 54, 0.20)',
  },
  popularSupportBadgeLocked: {
    backgroundColor: 'rgba(104, 100, 116, 0.07)',
    borderColor: 'rgba(104, 100, 116, 0.16)',
  },
  popularSupportBadgeText: {
    color: '#0FA336',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  popularSupportBadgeTextLocked: {
    color: '#686474',
    fontSize: 10.5,
    fontWeight: '700',
  },
  popularTrailingChevron: {
    marginLeft: 1,
  },
  popularSeparator: {
    position: 'absolute',
    left: 89,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(142,142,147,0.24)',
  },
});
