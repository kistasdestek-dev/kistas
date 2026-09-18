import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { kistasStyle, theme } from '../../../core/theme';
import { AutoTransparentLogo } from '../../../shared/components/AutoTransparentLogo';
import { PlatformType, PricingModel } from '../domain/Listing';

interface CreateListingLivePreviewProps {
  title: string;
  tagline: string;
  logoUrl: string;
  categoryName?: string | null;
  platforms: PlatformType[];
  pricingModel: PricingModel;
  coverUrl?: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  webUrl?: string;
  hasDescription: boolean;
}

const NEO = kistasStyle.neumorphism;

const neoRaised: ViewStyle = {
  backgroundColor: NEO.surface,
  borderWidth: 1,
  borderColor: NEO.border,
  ...Platform.select({
    web: { boxShadow: '-6px -6px 14px rgba(255,255,255,0.85), 6px 8px 18px rgba(130,146,168,0.18)' },
    default: {
      shadowColor: NEO.shadow,
      shadowOffset: { width: 5, height: 7 },
      shadowOpacity: 0.16,
      shadowRadius: 14,
      elevation: 4,
    },
  }),
};

const neoInset: ViewStyle = {
  backgroundColor: '#EAF0F7',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.88)',
  ...Platform.select({
    web: {
      boxShadow: 'inset 2px 2px 6px rgba(130,146,168,0.12), inset -2px -2px 6px rgba(255,255,255,0.82)' },
  }),
};

const PLATFORM_ICONS: Record<PlatformType, React.ComponentProps<typeof Ionicons>['name']> = {
  iOS: 'logo-apple',
  Android: 'logo-android',
  Web: 'globe-outline',
  macOS: 'desktop-outline',
  SaaS: 'cloud-outline',
};

const PRICING_LABELS: Record<PricingModel, string> = {
  free: 'Ücretsiz',
  freemium: 'Freemium',
  subscription: 'Abonelik',
  paid: 'Ücretli',
};

export const CreateListingLivePreview: React.FC<CreateListingLivePreviewProps> = ({
  title,
  tagline,
  logoUrl,
  categoryName,
  platforms,
  pricingModel,
  coverUrl,
  appStoreUrl,
  playStoreUrl,
  webUrl,
  hasDescription,
}) => {
  // Lansman Hazırlık Skoru Kontrolleri
  const checks = [
    { id: 'logo', label: 'Logo', done: Boolean(logoUrl) },
    { id: 'title', label: 'Başlık', done: Boolean(title.trim()) },
    { id: 'tagline', label: 'Slogan', done: Boolean(tagline.trim()) },
    { id: 'cat', label: 'Kategori', done: Boolean(categoryName) },
    { id: 'link', label: 'Bağlantı', done: Boolean(appStoreUrl?.trim() || playStoreUrl?.trim() || webUrl?.trim()) },
    { id: 'visual', label: 'Vitrin', done: Boolean(coverUrl) },
    { id: 'desc', label: 'Hikaye', done: hasDescription },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const scorePercent = Math.round((completedCount / checks.length) * 100);

  const getScoreColor = () => {
    if (scorePercent >= 100) return '#0FA336';
    if (scorePercent >= 60) return '#3269C7';
    if (scorePercent >= 30) return '#E07A00';
    return '#A02E2E';
  };

  return (
    <View style={previewStyles.shell}>
      {/* Üst Başlık & Canlı Rozeti */}
      <View style={previewStyles.topBar}>
        <View style={previewStyles.badgeRow}>
          <View style={previewStyles.liveDot} />
          <Text style={previewStyles.badgeText}>CANLI VİTRİN KARTI</Text>
        </View>
      </View>

      {/* Lansman Hazırlık Skoru Çubuğu */}
      <View style={previewStyles.readinessBox}>
        <View style={previewStyles.readinessHeader}>
          <Text style={previewStyles.readinessTitle}>Lansman Hazırlığı</Text>
          <Text style={[previewStyles.readinessPercent, { color: getScoreColor() }]}>
            %{scorePercent} {scorePercent === 100 ? 'Hazır!' : ''}
          </Text>
        </View>
        <View style={previewStyles.progressBarTrack}>
          <View
            style={[
              previewStyles.progressBarFill,
              { width: `${scorePercent}%`, backgroundColor: getScoreColor() },
            ]}
          />
        </View>
        <View style={previewStyles.checkListRow}>
          {checks.map((chk) => (
            <View
              key={chk.id}
              style={[
                previewStyles.checkPill,
                chk.done ? previewStyles.checkPillDone : previewStyles.checkPillPending,
              ]}
            >
              <Ionicons
                name={chk.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={11}
                color={chk.done ? '#0FA336' : '#94A3B8'}
              />
              <Text
                style={[
                  previewStyles.checkPillText,
                  chk.done && previewStyles.checkPillTextDone,
                ]}
              >
                {chk.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Canlı Vitrin Kartı Simülatörü */}
      <View style={previewStyles.cardPreview}>
        {/* Kapak Görseli */}
        <View style={previewStyles.coverContainer}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={previewStyles.coverImage} resizeMode="cover" />
          ) : (
            <View style={previewStyles.coverPlaceholder}>
              <Ionicons name="image-outline" size={32} color="#94A3B8" />
              <Text style={previewStyles.coverPlaceholderText}>Vitrin Kapağı Bekleniyor</Text>
            </View>
          )}
          {categoryName ? (
            <View style={previewStyles.categoryTag}>
              <Text style={previewStyles.categoryTagText}>{categoryName}</Text>
            </View>
          ) : null}
          <View style={previewStyles.pricingTag}>
            <Text style={previewStyles.pricingTagText}>{PRICING_LABELS[pricingModel]}</Text>
          </View>
        </View>

        {/* Kart Gövdesi */}
        <View style={previewStyles.cardBody}>
          <View style={previewStyles.logoAndTitleRow}>
            <View style={previewStyles.logoWrap}>
              {logoUrl ? (
                <AutoTransparentLogo
                  src={logoUrl}
                  alt={title || 'Proje Logosu'}
                  style={previewStyles.logoImg}
                />
              ) : (
                <View style={previewStyles.logoBlank}>
                  <Ionicons name="cube-outline" size={24} color="#3269C7" />
                </View>
              )}
            </View>
            <View style={previewStyles.titleCol}>
              <Text style={previewStyles.projectTitle} numberOfLines={1}>
                {title.trim() || 'Proje Başlığı'}
              </Text>
              <Text style={previewStyles.projectTagline} numberOfLines={2}>
                {tagline.trim() || 'Projenizin kısa ve etkileyici sloganı burada görünecek.'}
              </Text>
            </View>
          </View>

          {/* Platform İkonları ve Sahte Destek Butonu */}
          <View style={previewStyles.cardFooter}>
            <View style={previewStyles.platformIconsRow}>
              {platforms.map((p) => (
                <View key={p} style={previewStyles.platformMiniIcon}>
                  <Ionicons name={PLATFORM_ICONS[p]} size={13} color="#25364E" />
                </View>
              ))}
            </View>

            <View style={previewStyles.fakeUpvoteBtn}>
              <Ionicons name="triangle" size={10} color="#3269C7" />
              <Text style={previewStyles.fakeUpvoteText}>Destekle</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const previewStyles = StyleSheet.create({
  shell: {
    ...neoRaised,
    padding: 18,
    borderRadius: 22,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50,105,199,0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#0FA336',
  },
  badgeText: {
    ...theme.typography.kistas,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '700',
    color: '#3269C7',
  },
  readinessBox: {
    ...neoInset,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    marginBottom: 16,
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  readinessTitle: {
    ...theme.typography.kistas,
    fontSize: 11.5,
    fontWeight: '700',
    color: NEO.ink,
  },
  readinessPercent: {
    ...theme.typography.kistas,
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D7E3F1',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  checkListRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  checkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  checkPillDone: {
    backgroundColor: 'rgba(15,163,54,0.1)',
  },
  checkPillPending: {
    opacity: 0.65,
  },
  checkPillText: {
    ...theme.typography.kistas,
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
  },
  checkPillTextDone: {
    color: '#0FA336',
    fontWeight: '700',
  },
  cardPreview: {
    ...neoRaised,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.14)',
  },
  coverContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#E0E8F2',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    ...theme.typography.kistas,
    fontSize: 10.5,
    color: '#8292A8',
    marginTop: 4,
    fontWeight: '600',
  },
  categoryTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(23,56,102,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    ...Platform.select({
      web: { backdropFilter: 'blur(4px)' },
      default: {},
    }),
  },
  categoryTagText: {
    ...theme.typography.kistas,
    fontSize: 9.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pricingTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.18)',
  },
  pricingTagText: {
    ...theme.typography.kistas,
    fontSize: 9.5,
    color: NEO.ink,
    fontWeight: '700',
  },
  cardBody: {
    padding: 14,
    backgroundColor: NEO.surface,
  },
  logoAndTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.16)',
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  logoBlank: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF0F7',
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  projectTitle: {
    ...theme.typography.kistas,
    fontSize: 14.5,
    fontWeight: '700',
    color: NEO.ink,
    marginBottom: 2,
  },
  projectTagline: {
    ...theme.typography.kistas,
    fontSize: 11,
    lineHeight: 15,
    color: '#64748B',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(50,105,199,0.08)',
  },
  platformIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  platformMiniIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#EAF0F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fakeUpvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCEAFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  fakeUpvoteText: {
    ...theme.typography.kistas,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#173866',
  },
});
