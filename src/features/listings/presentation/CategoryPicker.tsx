import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Category } from '../../categories/domain/Category';
import { kistasStyle, theme } from '../../../core/theme';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';

const NEO = kistasStyle.neumorphism;

interface CategoryPickerProps {
  categories: Category[];
  value: string | null;
  onChange: (id: string) => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({ categories, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = categories.find((category) => category.id === value);
  const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
  const filtered = categories.filter((category) => category.name.toLocaleLowerCase('tr-TR').includes(normalizedQuery));

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Kategori seç: ${selected?.name ?? 'Seçilmedi'}`}
        accessibilityState={{ expanded: open }}
        onPress={() => { setQuery(''); setOpen(true); }}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Ionicons name="grid-outline" size={19} color="#3269C7" />
        <Text style={styles.triggerText}>{selected?.name ?? 'Kategori seç'}</Text>
        <Ionicons name="chevron-down" size={18} color="#3269C7" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Kategori penceresini kapat" />
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.header}>
              <View style={styles.heading}>
                <Text accessibilityRole="header" style={styles.title}>Kategorini bul</Text>
                <Text style={styles.caption}>Projene en uygun alanı seç.</Text>
              </View>
              <GlassIconButton icon="close" size={42} iconSize={20} onPress={() => setOpen(false)} accessibilityLabel="Kapat" />
            </View>
            <View style={styles.search}>
              <Ionicons name="search-outline" size={20} color="#686474" />
              <TextInput value={query} onChangeText={setQuery} placeholder="Kategori ara" placeholderTextColor="#686474" accessibilityLabel="Kategori ara" autoCorrect={false} autoCapitalize="none" style={styles.input} />
            </View>
            <ScrollView decelerationRate={0.99} style={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {filtered.map((category) => {
                const checked = category.id === value;
                return (
                  <Pressable key={category.id} accessibilityRole="radio" accessibilityState={{ checked }} onPress={() => { onChange(category.id); setOpen(false); }} style={({ pressed }) => [styles.option, checked && styles.selected, pressed && styles.pressed]}>
                    <Text style={[styles.optionText, checked && styles.selectedText]}>{category.name}</Text>
                    <Ionicons name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={checked ? '#3269C7' : '#8292A8'} />
                  </Pressable>
                );
              })}
              {filtered.length === 0 && <Text accessibilityLiveRegion="polite" style={styles.empty}>Bu aramayla eşleşen kategori yok. Başka bir kelime dene.</Text>}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#EAF0F7', borderWidth: 1, borderColor: 'rgba(255,255,255,0.88)', borderRadius: 14, ...Platform.select({ web: { boxShadow: 'inset 3px 3px 8px rgba(130,146,168,0.13), inset -3px -3px 8px rgba(255,255,255,0.86)' } }) },
  triggerText: { ...theme.typography.kistas, flex: 1, fontSize: 15, fontWeight: '700', color: NEO.ink },
  pressed: { opacity: 0.7 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(23,56,102,0.24)' },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '85%', backgroundColor: NEO.surface, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: NEO.border, ...Platform.select({ web: { boxShadow: '-8px -8px 18px rgba(255,255,255,0.9), 10px 12px 28px rgba(23,56,102,0.24)' }, default: { shadowColor: NEO.shadow, shadowOffset: { width: 7, height: 9 }, shadowOpacity: 0.2, shadowRadius: 18, elevation: 7 } }) },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  heading: { flex: 1 },
  title: { ...theme.typography.kistas, fontSize: 23, fontWeight: '700', letterSpacing: -0.5, color: NEO.ink },
  caption: { ...theme.typography.kistas, fontSize: 13, lineHeight: 19, color: '#64748B', marginTop: 5 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: '#EAF0F7', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.88)' },
  input: { ...theme.typography.kistas, flex: 1, minWidth: 0, minHeight: 50, fontSize: 15, color: NEO.ink },
  list: { flexGrow: 0, flexShrink: 1 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, padding: 14, borderRadius: 14, marginBottom: 6, borderWidth: 1, borderColor: 'transparent' },
  selected: { backgroundColor: NEO.global, borderColor: 'rgba(50,105,199,0.16)' },
  optionText: { ...theme.typography.kistas, flex: 1, fontSize: 14, color: '#64748B' },
  selectedText: { fontWeight: '700', color: NEO.ink },
  empty: { paddingVertical: 24, color: '#686474', textAlign: 'center', fontSize: 14, lineHeight: 21 },
});
