import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Category } from '../../categories/domain/Category';
import { getCategoryFilterIcon } from './categoryFilterIcons';

export type DiscoverSort = 'trending' | 'top_voted' | 'newest';
export type DiscoverPlatform = 'all' | 'iOS' | 'Android' | 'Web' | 'macOS' | 'SaaS';

export interface DynamicDiscoverFiltersProps {
  categories: Category[];
  selectedCategoryId: string | null;
  selectedPlatform: DiscoverPlatform;
  selectedSort: DiscoverSort;
  onSelectCategory: (categoryId: string | null) => void;
  onSelectPlatform: (platform: DiscoverPlatform) => void;
  onSelectSort: (sort: DiscoverSort) => void;
  onOpenBrowse?: () => void;
}

type Panel = 'sort' | 'category' | 'platform';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const SORTS: ReadonlyArray<{ id: DiscoverSort; label: string; icon: IconName }> = [
  { id: 'trending', label: 'Öne Çıkan', icon: 'sparkles-outline' },
  { id: 'top_voted', label: 'En Çok Desteklenen', icon: 'chevron-up-circle-outline' },
  { id: 'newest', label: 'Yeni', icon: 'time-outline' },
];

const PLATFORMS: ReadonlyArray<{ id: DiscoverPlatform; label: string; icon: IconName }> = [
  { id: 'all', label: 'Tümü', icon: 'layers-outline' },
  { id: 'iOS', label: 'iOS', icon: 'logo-apple' },
  { id: 'Android', label: 'Android', icon: 'logo-android' },
  { id: 'Web', label: 'Web', icon: 'globe-outline' },
  { id: 'macOS', label: 'macOS', icon: 'desktop-outline' },
  { id: 'SaaS', label: 'SaaS', icon: 'cloud-outline' },
];

export const DynamicDiscoverFilters: React.FC<DynamicDiscoverFiltersProps> = ({
  categories,
  selectedCategoryId,
  selectedPlatform,
  selectedSort,
  onSelectCategory,
  onSelectPlatform,
  onSelectSort,
  onOpenBrowse,
}) => {
  const [panel, setPanel] = useState<Panel | null>(null);
  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );
  const sortLabel = SORTS.find((item) => item.id === selectedSort)?.label ?? 'Öne Çıkan';
  const platformLabel = PLATFORMS.find((item) => item.id === selectedPlatform)?.label ?? 'Tümü';
  const categoryLabel = selectedCategory?.name ?? 'Tümü';
  const togglePanel = (nextPanel: Panel) => setPanel((current) => current === nextPanel ? null : nextPanel);

  return (
    <View style={styles.wrapper}>
      {panel ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.kicker}>{panel === 'sort' ? 'KEŞİF AKIŞI' : panel === 'category' ? 'İLGİ ALANI' : 'UYUMLULUK'}</Text>
              <Text style={styles.panelTitle}>{panel === 'sort' ? 'Sıralama seç' : panel === 'category' ? 'Kategori seç' : 'Platform seç'}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => setPanel(null)} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Filtre panelini kapat">
              <Ionicons name="close" size={18} color="#53657D" />
            </TouchableOpacity>
          </View>

          {panel === 'sort' ? (
            <View style={styles.optionStack}>
              {SORTS.map((item) => {
                const selected = selectedSort === item.id;
                return (
                  <TouchableOpacity key={item.id} style={[styles.optionRow, selected && styles.optionRowSelected]} onPress={() => onSelectSort(item.id)} activeOpacity={0.78}>
                    <View style={[styles.optionIcon, selected && styles.optionIconSelected]}><Ionicons name={item.icon} size={16} color={selected ? '#126D64' : '#2F67B4'} /></View>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]} numberOfLines={1}>{item.label}</Text>
                    {selected ? <Ionicons name="checkmark-circle" size={18} color="#3269C7" /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {panel === 'category' ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                <TouchableOpacity style={[styles.filterChip, selectedCategoryId === null && styles.filterChipSelected]} onPress={() => onSelectCategory(null)} activeOpacity={0.78}>
                  <MaterialCommunityIcons name="view-grid-outline" size={16} color={selectedCategoryId === null ? '#126D64' : '#2F67B4'} />
                  <Text style={[styles.filterChipText, selectedCategoryId === null && styles.filterChipTextSelected]}>Tümü</Text>
                </TouchableOpacity>
                {categories.map((item) => {
                  const selected = selectedCategoryId === item.id;
                  return (
                    <TouchableOpacity key={item.id} style={[styles.filterChip, selected && styles.filterChipSelected]} onPress={() => onSelectCategory(item.id)} activeOpacity={0.78}>
                      <MaterialCommunityIcons name={getCategoryFilterIcon(item.slug)} size={16} color={selected ? '#126D64' : '#2F67B4'} />
                      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]} numberOfLines={1}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {onOpenBrowse ? (
                <TouchableOpacity style={styles.browseLink} onPress={onOpenBrowse} activeOpacity={0.75}>
                  <Text style={styles.browseLinkText}>Tüm kategorileri gör</Text>
                  <Ionicons name="arrow-forward" size={14} color="#3269C7" />
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}

          {panel === 'platform' ? (
            <View style={styles.platformGrid}>
              {PLATFORMS.map((item) => {
                const selected = selectedPlatform === item.id;
                return (
                  <TouchableOpacity key={item.id} style={[styles.platformChip, selected && styles.filterChipSelected]} onPress={() => onSelectPlatform(item.id)} activeOpacity={0.78}>
                    <Ionicons name={item.icon} size={15} color={selected ? '#126D64' : '#2F67B4'} />
                    <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actionBar}>
        {([
          { id: 'sort' as const, label: 'Sıralama', value: sortLabel, icon: 'options-outline' as IconName },
          { id: 'category' as const, label: 'Kategori', value: categoryLabel, icon: 'grid-outline' as IconName },
          { id: 'platform' as const, label: 'Platform', value: platformLabel, icon: 'desktop-outline' as IconName },
        ]).map((item) => {
          const active = panel === item.id;
          return (
            <TouchableOpacity key={item.id} style={[styles.action, active && styles.actionActive]} onPress={() => togglePanel(item.id)} activeOpacity={0.78} accessibilityRole="button" accessibilityState={{ expanded: active }}>
              <Ionicons name={item.icon} size={17} color={active ? '#126D64' : '#58708E'} />
              <View style={styles.actionCopy}>
                <Text style={[styles.actionLabel, active && styles.actionTextActive]}>{item.label}</Text>
                <Text style={[styles.actionValue, active && styles.actionTextActive]} numberOfLines={1}>{item.value}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginBottom: 14 },
  panel: { marginBottom: 8, padding: 13, borderRadius: 17, borderWidth: 1, borderColor: '#D5E1EF', backgroundColor: '#F7F9FC', shadowColor: '#17365F', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.11, shadowRadius: 18, elevation: 4 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  kicker: { color: '#3269C7', fontSize: 8.5, fontWeight: '700', letterSpacing: 0.8 },
  panelTitle: { marginTop: 2, color: '#22283A', fontSize: 16, fontWeight: '700' },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#D9E3EF', backgroundColor: '#FFFFFF' },
  optionStack: { gap: 7 },
  optionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, borderRadius: 13, borderWidth: 1, borderColor: '#E0E7F1', backgroundColor: '#FFFFFF' },
  optionRowSelected: { borderColor: '#A9CCC4', backgroundColor: '#F4FAF8', borderLeftWidth: 3, borderLeftColor: '#218779' },
  optionIcon: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#EAF1FB' },
  optionIconSelected: { backgroundColor: '#DDF1EC' },
  optionLabel: { flex: 1, color: '#334055', fontSize: 12, fontWeight: '600' },
  optionLabelSelected: { color: '#203C3A', fontWeight: '700' },
  chipScroll: { gap: 7, paddingRight: 8 },
  filterChip: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, borderColor: '#DCE5F0', backgroundColor: '#FFFFFF' },
  filterChipSelected: { borderColor: '#9BC8BE', backgroundColor: '#EAF6F3' },
  filterChipText: { color: '#46566C', fontSize: 11, fontWeight: '600' },
  filterChipTextSelected: { color: '#203C3A', fontWeight: '700' },
  browseLink: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, paddingVertical: 4 },
  browseLinkText: { color: '#3269C7', fontSize: 11, fontWeight: '700' },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  platformChip: { width: '31%', minWidth: 84, height: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: '#DCE5F0', backgroundColor: '#FFFFFF' },
  actionBar: { height: 59, flexDirection: 'row', gap: 5, padding: 5, borderRadius: 18, borderWidth: 1, borderColor: '#D8E2EF', backgroundColor: '#FFFFFF', shadowColor: '#17365F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 3 },
  action: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 5, borderRadius: 13, borderWidth: 1, borderColor: 'transparent' },
  actionActive: { borderColor: '#A9CCC4', backgroundColor: '#F1F8F6' },
  actionCopy: { minWidth: 0 },
  actionLabel: { color: '#53657D', fontSize: 9.5, fontWeight: '700' },
  actionValue: { maxWidth: 74, marginTop: 1, color: '#7A899C', fontSize: 8.5, fontWeight: '600' },
  actionTextActive: { color: '#215F58' },
});
