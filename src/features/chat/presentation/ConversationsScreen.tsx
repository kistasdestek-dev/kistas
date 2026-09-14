import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../../core/theme';
import { ProfileAvatar } from '../../../shared/components/ProfileAvatar';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { ChatService } from '../application/ChatService';
import { Conversation } from '../domain/Chat';
import { chatNotificationActions } from '../../../core/state';

interface ConversationsScreenProps {
  onSelectConversation?: (conversation: Conversation) => void;
  onScrollOffsetChange?: (offsetY: number) => void;
}

interface DigitalConversation extends Conversation {
  projectTitle?: string;
}

type InboxFilter = 'all' | 'unread';

const NEO = theme.kistasStyle.neumorphism;

const raisedSurface = {
  backgroundColor: NEO.surface,
  borderWidth: 1,
  borderColor: NEO.border,
  ...Platform.select({
    web: { boxShadow: '-8px -8px 18px rgba(255,255,255,0.92), 8px 8px 20px rgba(130,146,168,0.20)' },
    default: { shadowColor: NEO.shadow, shadowOffset: { width: 7, height: 9 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 5 },
  }),
} satisfies ViewStyle;

const insetSurface = {
  backgroundColor: '#EAF0F7',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.88)',
  ...Platform.select({
    web: { boxShadow: 'inset 3px 3px 8px rgba(130,146,168,0.15), inset -4px -4px 9px rgba(255,255,255,0.94)' },
  }),
} satisfies ViewStyle;

const formatConversationTime = (value?: string | null) => {
  if (!value || !value.includes('T')) return value || '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

export const ConversationsScreen: React.FC<ConversationsScreenProps> = ({
  onSelectConversation,
  onScrollOffsetChange,
}) => {
  const [conversations, setConversations] = useState<DigitalConversation[]>([]);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const isCompact = width < 700;

  const loadConversations = useCallback(async (refresh = false) => {
    refresh ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const data = await ChatService.getConversations();
      const nextConversations = data as DigitalConversation[];
      setConversations(nextConversations);
      chatNotificationActions.setUnreadCount(nextConversations.reduce((total, conversation) => total + conversation.unreadCount, 0));
    } finally {
      refresh ? setIsRefreshing(false) : setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const unreadConversationCount = useMemo(
    () => conversations.filter((conversation) => conversation.unreadCount > 0).length,
    [conversations],
  );
  const visibleConversations = useMemo(
    () => filter === 'unread' ? conversations.filter((conversation) => conversation.unreadCount > 0) : conversations,
    [conversations, filter],
  );
  const isUnreadFilter = filter === 'unread';

  return (
    <View style={styles.screen}>
      <View style={[styles.container, isCompact && styles.containerCompact]}>
        <KistasTopBrandBar style={styles.brandBar} />

        <ScrollView
          style={styles.list}
          decelerationRate={0.99}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadConversations(true)}
              tintColor="#3269C7"
              colors={['#3269C7']}
            />
          )}
          onScroll={(event) => onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(event) => onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)}
          onMomentumScrollEnd={(event) => onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)}
          onScrollToTop={() => onScrollOffsetChange?.(0)}
          scrollEventThrottle={32}
        >
          <View style={styles.pageHeader}>
            <Text accessibilityRole="header" style={styles.pageTitle}>Mesajlar</Text>
          </View>

          <View style={styles.filterBar} accessibilityRole="tablist" accessibilityLabel="Mesaj filtresi">
            <TouchableOpacity
              style={[styles.filterTab, !isUnreadFilter && styles.filterTabActive]}
              onPress={() => setFilter('all')}
              activeOpacity={0.72}
              accessibilityRole="tab"
              accessibilityState={{ selected: !isUnreadFilter }}
            >
              <Text style={[styles.filterText, !isUnreadFilter && styles.filterTextActive]}>Tümü</Text>
              <View style={[styles.filterCount, !isUnreadFilter && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, !isUnreadFilter && styles.filterCountTextActive]}>{conversations.length}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, isUnreadFilter && styles.filterTabActive]}
              onPress={() => setFilter('unread')}
              activeOpacity={0.72}
              accessibilityRole="tab"
              accessibilityState={{ selected: isUnreadFilter }}
            >
              <Text style={[styles.filterText, isUnreadFilter && styles.filterTextActive]}>Okunmamış</Text>
              <View style={[styles.filterCount, isUnreadFilter && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, isUnreadFilter && styles.filterCountTextActive]}>{unreadConversationCount}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#3269C7" />
              <Text style={styles.loadingText}>Görüşmeler yükleniyor</Text>
            </View>
          ) : visibleConversations.length === 0 ? (
            <View style={styles.emptyState}>
              <GlassIconButton
                icon={isUnreadFilter ? 'checkmark-done-outline' : 'chatbubble-ellipses-outline'}
                iconSize={25}
                size={58}
                accessibilityLabel={isUnreadFilter ? 'Okunmamış mesaj yok' : 'Konuşma bulunamadı'}
                style={styles.emptyIconSpacing}
              />
              <Text style={styles.emptyTitle}>{isUnreadFilter ? 'Okunmamış mesajın yok' : 'Henüz bir görüşmen yok'}</Text>
              <Text style={styles.emptyDescription}>
                {isUnreadFilter ? 'Tüm görüşmelerin güncel.' : 'Bir proje veya Kıstas Destek görüşmesi başladığında burada görünecek.'}
              </Text>
            </View>
          ) : (
            <View style={styles.conversationList}>
              {visibleConversations.map((conversation) => {
                const partyName = conversation.otherParty?.fullName || 'Kıstas Üyesi';
                const projectName = conversation.projectTitle || conversation.listing?.title || 'Kıstas Destek';
                const hasUnread = conversation.unreadCount > 0;

                return (
                  <TouchableOpacity
                    key={conversation.id}
                    activeOpacity={0.72}
                    style={[styles.conversationCard, isCompact && styles.conversationRowCompact, hasUnread && styles.conversationCardUnread]}
                    onPress={() => onSelectConversation?.(conversation)}
                    accessibilityRole="button"
                    accessibilityLabel={`${partyName}, ${projectName}${hasUnread ? `, ${conversation.unreadCount} okunmamış mesaj` : ''}`}
                  >
                    {hasUnread ? <View style={styles.unreadAccent} /> : null}
                    <View style={styles.avatarWrap}>
                      <View style={styles.avatarPlate}>
                        <ProfileAvatar avatarUrl={conversation.otherParty?.avatarUrl} size={48} logoSize={35} />
                      </View>
                      {hasUnread ? <View style={styles.avatarUnreadDot} /> : null}
                    </View>

                    <View style={styles.conversationBody}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.nameText, hasUnread && styles.nameTextUnread]} numberOfLines={1}>{partyName}</Text>
                        <View style={styles.timeWrap}>
                          {hasUnread ? <View style={styles.timeDot} /> : null}
                          <Text style={[styles.timeText, hasUnread && styles.timeTextUnread]}>{formatConversationTime(conversation.lastMessageAt)}</Text>
                        </View>
                      </View>

                      <View style={styles.projectRow}>
                        <Ionicons name={conversation.listingId ? 'cube-outline' : 'headset-outline'} size={12} color="#252333" />
                        <Text style={styles.projectText} numberOfLines={1}>{projectName}</Text>
                        {conversation.closedAt ? (
                          <View style={styles.closedBadge}>
                            <Ionicons name="checkmark-done-outline" size={11} color="#65758C" />
                            <Text style={styles.closedBadgeText}>Sonlandırıldı</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.previewRow}>
                        <Text style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} numberOfLines={1}>
                          {conversation.lastMessage || 'Henüz mesaj yok'}
                        </Text>
                        {hasUnread ? (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</Text>
                          </View>
                        ) : (
                          <GlassIconButton icon="chevron-forward" size={30} iconSize={14} accessibilityLabel={`${partyName} görüşmesini aç`} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NEO.surface },
  container: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 22,
    paddingTop: 24,
  },
  containerCompact: { paddingHorizontal: 18, paddingTop: 22 },
  brandBar: { paddingHorizontal: 0, paddingBottom: 8, marginBottom: 14 },
  list: { flex: 1 },
  listContent: { paddingTop: 2, paddingBottom: 124 },
  pageHeader: { marginBottom: 18 },
  pageTitle: { ...theme.typography.kistas, color: NEO.ink, fontSize: 29, lineHeight: 35, fontWeight: '700', letterSpacing: -0.7 },
  filterBar: { ...insetSurface, minHeight: 53, flexDirection: 'row', alignItems: 'center', padding: 6, gap: 6, borderRadius: 19, marginBottom: 18 },
  filterTab: { flex: 1, minHeight: 39, paddingHorizontal: 13, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  filterTabActive: {
    ...raisedSurface,
    backgroundColor: '#F7FAFF',
    ...Platform.select({ web: { boxShadow: '-3px -3px 8px rgba(255,255,255,0.95), 3px 3px 9px rgba(130,146,168,0.18)' } }),
  },
  filterText: { ...theme.typography.kistas, color: '#65748A', fontSize: 11.5 },
  filterTextActive: { color: NEO.ink },
  filterCount: { minWidth: 22, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 8, alignItems: 'center', backgroundColor: 'rgba(101,116,138,0.09)' },
  filterCountActive: { backgroundColor: NEO.global },
  filterCountText: { ...theme.typography.kistas, color: '#65748A', fontSize: 9.5, lineHeight: 12 },
  filterCountTextActive: { color: '#3269C7' },
  conversationList: { gap: 12 },
  conversationCard: {
    ...raisedSurface,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    paddingVertical: 15,
    borderRadius: 20,
  },
  conversationCardUnread: { borderColor: 'rgba(50,105,199,0.34)', backgroundColor: '#F3F8FF' },
  conversationRowCompact: { paddingHorizontal: 14, paddingVertical: 14 },
  unreadAccent: { position: 'absolute', left: 0, top: 20, bottom: 20, width: 3, borderRadius: 3, backgroundColor: '#3269C7' },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatarPlate: { ...insetSurface, width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarUnreadDot: { position: 'absolute', right: -1, bottom: -1, width: 13, height: 13, borderRadius: 7, backgroundColor: '#3269C7', borderWidth: 3, borderColor: NEO.surface },
  conversationBody: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  nameText: {
    ...theme.typography.kistas,
    flex: 1,
    minWidth: 0,
    fontSize: 15.5,
    lineHeight: 20,
    color: '#252333',
    fontWeight: '700',
  },
  nameTextUnread: { color: NEO.ink, fontWeight: '800' },
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 8 },
  timeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#3269C7' },
  timeText: {
    ...theme.typography.kistas,
    fontSize: 11,
    flexShrink: 0,
    color: '#3f3b4c',
  },
  timeTextUnread: { color: '#3269C7', fontWeight: '700' },
  projectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  projectText: {
    ...theme.typography.kistas,
    flex: 1,
    marginLeft: 5,
    fontSize: 11,
    color: '#3f3b4c',
  },
  closedBadge: { marginLeft: 8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EEF2F7' },
  closedBadgeText: { ...theme.typography.kistas, color: '#65758C', fontSize: 8.5, fontWeight: '700' },
  previewRow: { flexDirection: 'row', alignItems: 'center' },
  lastMessage: {
    ...theme.typography.kistas,
    flex: 1,
    marginRight: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#65748A',
    fontWeight: '400',
  },
  lastMessageUnread: { color: NEO.ink, fontWeight: '600' },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEO.global,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    ...theme.typography.kistas,
    fontSize: 11,
    color: '#3269C7',
    fontWeight: '800',
  },
  emptyState: {
    ...raisedSurface,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 54,
    borderRadius: 22,
  },
  emptyIconSpacing: { marginBottom: 14 },
  emptyTitle: {
    ...theme.typography.kistas,
    fontSize: 15,
    color: '#252333',
    fontWeight: '700',
  },
  emptyDescription: {
    ...theme.typography.kistas,
    marginTop: 5,
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
    color: '#686474',
  },
  loadingState: { ...raisedSurface, minHeight: 148, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 22 },
  loadingText: { ...theme.typography.kistas, color: '#65748A', fontSize: 11.5 },
});
