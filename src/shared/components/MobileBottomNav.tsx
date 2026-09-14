import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useChatUnreadCount } from '../../core/state';
import { AppNavigationProps, TabKey } from '../navigation/navigationTypes';
export type { TabKey } from '../navigation/navigationTypes';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const ITEMS: ReadonlyArray<{ key: TabKey; label: string; icon: IconName }> = [
  { key: 'discover', label: 'Keşfet', icon: 'compass-outline' },
  { key: 'browse', label: 'Göz At', icon: 'search-outline' },
  { key: 'create', label: 'Lansman', icon: 'add-circle-outline' },
  { key: 'messages', label: 'Mesajlar', icon: 'chatbubble-outline' },
  { key: 'profile', label: 'Profil', icon: 'person-outline' },
];

export const MobileBottomNav = React.memo(function MobileBottomNav({
  activeTab, onTabPress, isAuthenticated = false, unreadMessagesCount, blurTarget,
}: AppNavigationProps) {
  const storeUnreadCount = useChatUnreadCount();
  const unread = unreadMessagesCount ?? storeUnreadCount;
  const activeKey = activeTab === 'credits' ? 'profile' : activeTab;
  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={styles.shadow}>
        <View style={styles.bar}>
          <BlurView pointerEvents="none" tint="light" intensity={24} blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={styles.tint} />
          {ITEMS.filter(item => isAuthenticated || (item.key !== 'create' && item.key !== 'messages')).map(item => {
            const selected = item.key === activeKey;
            return (
              <Pressable key={item.key} onPress={() => { if (activeTab !== item.key) onTabPress(item.key); }} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} style={({ pressed }) => [styles.tab, selected && styles.selected, pressed && styles.pressed]}>
                <View>
                  <Ionicons name={item.icon} size={21} color={selected ? '#285BA4' : '#526179'} />
                  {item.key === 'messages' && unread > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(unread, 99)}</Text></View> : null}
                </View>
                <Text style={[styles.label, selected && styles.selectedLabel]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, bottom: Platform.OS === 'ios' ? 10 : 14, paddingHorizontal: 14, zIndex: 100 },
  shadow: { width: '100%', maxWidth: 390, alignSelf: 'center', borderRadius: 30, shadowColor: '#1B2B48', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.16, shadowRadius: 18, elevation: 8 },
  bar: { height: 62, padding: 5, gap: 3, flexDirection: 'row', borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(248,250,255,0.06)' },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 23, gap: 3 },
  selected: { backgroundColor: 'rgba(50,105,199,0.12)' },
  pressed: { opacity: 0.7 },
  label: { fontSize: 10, fontWeight: '600', color: '#526179' },
  selectedLabel: { color: '#285BA4' },
  badge: { position: 'absolute', top: -5, right: -8, minWidth: 15, height: 15, paddingHorizontal: 3, borderRadius: 8, backgroundColor: '#3269C7', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '700' },
});
