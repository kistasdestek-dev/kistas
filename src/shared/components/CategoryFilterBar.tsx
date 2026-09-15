import React, { useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from './Button';
import { Category } from '../../features/categories/domain/Category';

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface FilterCategoryItem {
  id: string | null;
  name: string;
  slug: string;
  icon: IoniconName;
}

export interface CategoryFilterBarProps {
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  categories?: Category[];
  onOpenBrowse?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Standart Kıstas Filtreleme Sekmeleri
const DEFAULT_FILTER_ITEMS: FilterCategoryItem[] = [
  { id: null, name: 'Tümü', slug: 'all', icon: 'apps-outline' },
  { id: 'c-ai', name: 'Yapay Zeka', slug: 'ai', icon: 'sparkles-outline' },
  { id: 'c-ml', name: 'ML', slug: 'ml', icon: 'hardware-chip-outline' },
  { id: 'c-games', name: 'Mobil Oyun', slug: 'games', icon: 'game-controller-outline' },
  { id: 'c-entertainment', name: 'Eğlence', slug: 'entertainment', icon: 'play-circle-outline' },
  { id: 'c-prod', name: 'Verimlilik', slug: 'productivity', icon: 'flash-outline' },
  { id: 'c-fin', name: 'Finans', slug: 'fintech', icon: 'analytics-outline' },
  { id: 'c-soc', name: 'Sosyal', slug: 'social', icon: 'people-outline' },
  { id: 'c-dev', name: 'Geliştirici', slug: 'devtools', icon: 'code-slash-outline' },
  { id: 'c-saas', name: 'SaaS', slug: 'saas', icon: 'cloud-outline' },
  { id: 'c-des', name: 'Tasarım', slug: 'design', icon: 'color-palette-outline' },
];

const getCategoryIcon = (slug?: string): IoniconName => {
  switch (slug) {
    case 'ai':
    case 'ai-ml':
      return 'sparkles-outline';
    case 'ml':
      return 'hardware-chip-outline';
    case 'games':
      return 'game-controller-outline';
    case 'entertainment':
      return 'play-circle-outline';
    case 'productivity':
      return 'flash-outline';
    case 'fintech':
      return 'analytics-outline';
    case 'social':
      return 'people-outline';
    case 'devtools':
      return 'code-slash-outline';
    case 'saas':
      return 'cloud-outline';
    case 'design':
      return 'color-palette-outline';
    default:
      return 'grid-outline';
  }
};

const CATEGORY_TONES: Record<string, { surface: string; border: string; accent: string; glow: string }> = {
  all: { surface: '#7047c7', border: '#7047c7', accent: '#25364E', glow: 'rgba(112,71,199,0.28)' },
  ai: { surface: '#7047c7', border: '#7047c7', accent: '#25364E', glow: 'rgba(112,71,199,0.3)' },
  'ai-ml': { surface: '#7047c7', border: '#7047c7', accent: '#25364E', glow: 'rgba(112,71,199,0.3)' },
  ml: { surface: '#7047c7', border: '#7047c7', accent: '#25364E', glow: 'rgba(112,71,199,0.3)' },
  games: { surface: '#6846b9', border: '#7663a0', accent: '#25364E', glow: 'rgba(91,61,160,0.3)' },
  entertainment: { surface: '#6846b9', border: '#7663a0', accent: '#25364E', glow: 'rgba(91,61,160,0.3)' },
  productivity: { surface: '#7047c7', border: '#7047c7', accent: '#25364E', glow: 'rgba(112,71,199,0.29)' },
  fintech: { surface: '#7047c7', border: '#7047c7', accent: '#25364E', glow: 'rgba(112,71,199,0.28)' },
  social: { surface: '#5940a8', border: '#7063a0', accent: '#25364E', glow: 'rgba(82,61,160,0.29)' },
  devtools: { surface: '#7047c7', border: '#7047c7', accent: '#25364E', glow: 'rgba(112,71,199,0.3)' },
  saas: { surface: '#7047c7', border: '#7047c7', accent: '#25364E', glow: 'rgba(112,71,199,0.29)' },
  design: { surface: '#a95138', border: '#a0714f', accent: '#25364E', glow: 'rgba(160,70,38,0.29)' },
};

const LIGHT_CATEGORY_TONES: typeof CATEGORY_TONES = {
  all: { surface: '#EDF4FC', border: '#D5E2F2', accent: '#345F9D', glow: 'transparent' },
  ai: { surface: '#EBF1FF', border: '#D4E1FC', accent: '#345FAC', glow: 'transparent' },
  'ai-ml': { surface: '#EBF1FF', border: '#D4E1FC', accent: '#345FAC', glow: 'transparent' },
  ml: { surface: '#EBF1FF', border: '#D4E1FC', accent: '#345FAC', glow: 'transparent' },
  games: { surface: '#F0E9FC', border: '#E0D3F5', accent: '#7044AE', glow: 'transparent' },
  entertainment: { surface: '#FCEAF3', border: '#F3D6E5', accent: '#9E4774', glow: 'transparent' },
  productivity: { surface: '#E9F5F4', border: '#D1E8E5', accent: '#226E68', glow: 'transparent' },
  fintech: { surface: '#EBF5EE', border: '#D3E9DA', accent: '#2D714A', glow: 'transparent' },
  social: { surface: '#F8ECF3', border: '#EDD7E3', accent: '#944F78', glow: 'transparent' },
  devtools: { surface: '#EEF0F5', border: '#DBDFE9', accent: '#53617D', glow: 'transparent' },
  saas: { surface: '#EAF4FB', border: '#D3E7F4', accent: '#346D94', glow: 'transparent' },
  design: { surface: '#FFF1E8', border: '#F3DECE', accent: '#A65C35', glow: 'transparent' },
};

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  selectedCategoryId,
  onSelectCategory,
  categories,
  onOpenBrowse,
  style,
}) => {
  const scrollRef = useRef<ScrollView>(null);

  // Dinamik Kategori Listesi
  const filterItems = useMemo<FilterCategoryItem[]>(() => {
    if (categories === undefined) {
      return DEFAULT_FILTER_ITEMS;
    }

    const items: FilterCategoryItem[] = [
      { id: null, name: 'Tümü', slug: 'all', icon: 'apps-outline' },
    ];

    // Yalnızca veritabanından gelen gerçek UUID'leri kullan.
    categories.forEach((cat) => {
      items.push({
        id: cat.id,
        name: cat.name.split('&')[0].trim(),
        slug: cat.slug,
        icon: getCategoryIcon(cat.slug),
      });
    });

    return items;
  }, [categories]);

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {filterItems.map((item) => {
          const isSelected = selectedCategoryId === item.id;
          const baseTone = LIGHT_CATEGORY_TONES[item.slug] || LIGHT_CATEGORY_TONES.all;
          const tone = isSelected ? { ...baseTone, border: baseTone.accent } : baseTone;

          return (
            <View key={item.id ?? 'all'} style={styles.itemWrapper}>
              <Button
                title={item.name}
                variant="aurora"
                size="sm"
                selected={isSelected}
                tint={tone}
                showArrow={false}
                icon={
                  <Ionicons
                    name={item.icon}
                    size={13.5}
                    color={tone.accent}
                    style={styles.buttonIcon}
                  />
                }
                onPress={() => onSelectCategory(isSelected && item.id !== null ? null : item.id)}
                accessibilityLabel={`${item.name} kategorisini filtrele`}
              />
            </View>
          );
        })}

        {/* GÖZ AT KISAYOL BUTONU */}
        {onOpenBrowse && (
          <View style={styles.itemWrapper}>
            <Button
              title="Göz At"
              variant="outline"
              size="sm"
              selected={false}
              showArrow={true}
              icon={
                <Ionicons
                  name="compass-outline"
                  size={13.5}
                  color="#25364E"
                  style={styles.buttonIcon}
                />
              }
              onPress={onOpenBrowse}
              accessibilityLabel="Tüm kategorilere göz at"
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    position: 'relative',
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  itemWrapper: {
    marginRight: Platform.OS === 'web' ? 2 : 0,
  },
  buttonIcon: {
    marginRight: 2,
  },
});
