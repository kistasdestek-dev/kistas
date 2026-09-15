import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../../core/theme';
import { ProfileAvatar } from '../../../shared/components/ProfileAvatar';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { MessageComposer } from '../../../shared/components/MessageComposer';
import {
  Message,
  MessageGroup,
  MessageContent,
  MessageHeader,
  Bubble,
  BubbleContent,
  MessageFooter,
} from '../../../shared/components/ui/Message';
import { ChatService } from '../application/ChatService';
import { ChatMessage } from '../domain/Chat';
import { useAuth } from '../../../core/state';

interface ChatScreenProps {
  conversationId?: string;
  projectTitle?: string;
  otherPartyName?: string;
  otherPartyAvatar?: string | null;
  onBack?: () => void;
  onViewProject?: () => void;
  canManageSupport?: boolean;
}

const getDisplayName = (value: string) => value.replace(/\s*\([^)]*\)\s*$/, '');

const formatMessageTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

export const ChatScreen: React.FC<ChatScreenProps> = ({
  conversationId = 'mock-conv-1',
  projectTitle = 'Kıstas AI Studio',
  otherPartyName = 'Ece Arslan',
  otherPartyAvatar = null,
  onBack,
  onViewProject,
  canManageSupport = false,
}) => {
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 700;
  const isSupport = projectTitle === 'Kıstas Destek';
  const scrollRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const [isClosingSupport, setIsClosingSupport] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [closeSupportError, setCloseSupportError] = useState('');

  const currentUserId = profile?.id || '';
  const displayName = getDisplayName(otherPartyName);
  const isSupportAdmin = isSupport && canManageSupport;

  useEffect(() => {
    let mounted = true;
    setMessages([]);
    setIsLoadingMessages(true);

    const mergeMessages = (nextMessages: ChatMessage[]) => {
      if (!mounted) return;
      setMessages((current) => {
        const merged = new Map(current.map((message) => [message.id, message]));
        nextMessages.forEach((message) => merged.set(message.id, message));
        return Array.from(merged.values()).sort(
          (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        );
      });
    };

    ChatService.getMessages(conversationId).then((nextMessages) => {
      if (!mounted) return;
      mergeMessages(nextMessages);
      setIsLoadingMessages(false);
      void ChatService.markConversationRead(conversationId);
    });
    ChatService.getConversationStatus(conversationId).then((status) => {
      if (mounted) setClosedAt(status?.closedAt || null);
    });

    const unsubscribe = ChatService.subscribeToMessages(conversationId, (message) => {
      if (!mounted) return;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      if (message.senderId !== currentUserId) void ChatService.markConversationRead(conversationId);
    });

    const syncTimer = setInterval(() => {
      ChatService.getMessages(conversationId).then(mergeMessages);
      ChatService.getConversationStatus(conversationId).then((status) => {
        if (mounted) setClosedAt(status?.closedAt || null);
      });
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(syncTimer);
      unsubscribe();
    };
  }, [conversationId, currentUserId]);

  // Group consecutive messages by sender (shadcn MessageGroup pattern)
  const messageClusters = useMemo(() => {
    interface Cluster {
      senderId: string;
      isMe: boolean;
      items: ChatMessage[];
    }
    const clusters: Cluster[] = [];

    messages.forEach((msg) => {
      const isMe = msg.senderId === currentUserId;
      const last = clusters[clusters.length - 1];
      if (last && last.senderId === msg.senderId) {
        last.items.push(msg);
      } else {
        clusters.push({
          senderId: msg.senderId,
          isMe,
          items: [msg],
        });
      }
    });

    return clusters;
  }, [messages, currentUserId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, []);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText || inputText).trim();
    if (!text || isSending || closedAt) return;

    setIsSending(true);
    setSendError('');
    try {
      const result = await ChatService.sendMessage(conversationId, text);
      if (!result.success) {
        const errorMessage = result.error || 'Lütfen tekrar deneyin.';
        setSendError(errorMessage);
        Alert.alert('Mesaj gönderilemedi', errorMessage);
        return;
      }

      if (result.message) {
        setMessages((current) => current.some((item) => item.id === result.message?.id) ? current : [...current, result.message as ChatMessage]);
      }
      setInputText('');
      setSendError('');
      scrollToBottom();
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    setReactions((prev) => {
      const existing = prev[msgId];
      if (existing && existing.startsWith(emoji)) {
        const copy = { ...prev };
        delete copy[msgId];
        return copy;
      }
      return { ...prev, [msgId]: `${emoji} 1` };
    });
    setSelectedMessageForReaction(null);
  };

  const handleProjectPress = () => {
    if (onViewProject) {
      onViewProject();
      return;
    }
    Alert.alert('Proje', `${projectTitle} projesinin detay sayfası açılacak.`);
  };

  const handleCloseSupport = () => {
    if (!isSupportAdmin || closedAt || isClosingSupport) return;
    setCloseSupportError('');
    setIsCloseConfirmOpen(true);
  };

  const confirmCloseSupport = async () => {
    if (!isSupportAdmin || closedAt || isClosingSupport) return;
    setIsClosingSupport(true);
    setCloseSupportError('');
    const result = await ChatService.closeSupportConversation(conversationId);
    setIsClosingSupport(false);
    if (!result.success) {
      setCloseSupportError(result.error || 'Görüşme sonlandırılamadı.');
      return;
    }
    setClosedAt(result.closedAt || new Date().toISOString());
    setIsCloseConfirmOpen(false);
    const nextMessages = await ChatService.getMessages(conversationId);
    setMessages(nextMessages);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isCompact && styles.containerCompact]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      {/* 1. Header Bar (shadcn inspired glass surface) */}
      <View style={styles.topGlassGroup}>
        <View style={styles.header}>
          <GlassIconButton
            icon="chevron-back"
            iconSize={21}
            size={44}
            onPress={onBack}
            accessibilityLabel="Mesajlara dön"
          />

          <View style={styles.headerAvatarWrap}>
            <ProfileAvatar avatarUrl={otherPartyAvatar} size={38} logoSize={32} />
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerName} numberOfLines={1}>
                {displayName}
              </Text>
              {isSupport ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#3269C7" />
                  <Text style={styles.verifiedText}>Destek</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.headerSubtitleRow}>
              <View style={[styles.onlineDot, closedAt && styles.offlineDot]} />
              <Text style={styles.statusText}>
                {closedAt ? 'Görüşme sonlandırıldı' : isSupport ? 'Kıstas Destek • Resmi Yardım Masası' : 'Çevrimiçi'}
              </Text>
            </View>
          </View>
          {isSupportAdmin && !closedAt ? (
            <TouchableOpacity
              style={styles.closeSupportButton}
              onPress={handleCloseSupport}
              disabled={isClosingSupport}
              activeOpacity={0.74}
              accessibilityRole="button"
              accessibilityLabel="Sohbeti sonlandır"
            >
              {isClosingSupport ? <ActivityIndicator size="small" color="#A9334E" /> : <Ionicons name="checkmark-done-outline" size={17} color="#A9334E" />}
              {!isCompact ? <Text style={styles.closeSupportButtonText}>Sohbeti Sonlandır</Text> : null}
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 2. Discussed Project Context Card */}
        {!isSupport && onViewProject ? <TouchableOpacity
          style={styles.projectBar}
          activeOpacity={0.78}
          onPress={handleProjectPress}
          accessibilityRole="button"
          accessibilityLabel={`Konuşulan proje: ${projectTitle}`}
        >
          <View style={styles.projectIcon}>
            <Ionicons name="cube-outline" size={18} color="#6b59a0" />
          </View>
          <View style={styles.projectCopy}>
            <Text style={styles.projectEyebrow}>KONUŞULAN PROJE</Text>
            <Text style={styles.projectTitle} numberOfLines={1}>
              {projectTitle}
            </Text>
          </View>
          <View style={styles.projectActionBadge}>
            <Text style={styles.projectActionText}>Görüntüle</Text>
            <Ionicons name="chevron-forward" size={13} color="#6b59a0" />
          </View>
        </TouchableOpacity> : null}
      </View>

      {/* 3. Messages Stream */}
      <ScrollView
        ref={scrollRef}
        decelerationRate={0.99}
        style={styles.chatScroll}
        contentContainerStyle={[styles.chatContent, isCompact && styles.chatContentCompact]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToBottom}
      >
        {messages.length > 0 ? (
          <View style={styles.dateDivider}>
            <View style={styles.dateLine} />
            <View style={styles.datePill}>
              <Text style={styles.dateText}>{new Date(messages[0].createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</Text>
            </View>
            <View style={styles.dateLine} />
          </View>
        ) : null}

        {isLoadingMessages ? (
          <View style={styles.messageState}><ActivityIndicator color="#3269C7" /><Text style={styles.messageStateText}>Mesajlar yükleniyor</Text></View>
        ) : messages.length === 0 ? (
          <View style={styles.messageState}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color="#686474" />
            <Text style={styles.messageStateTitle}>Yeni bir sohbet</Text>
            <Text style={styles.messageStateText}>İlk mesajınızı yazarak konuşmayı başlatın.</Text>
          </View>
        ) : messageClusters.map((cluster, clusterIdx) => {
          const align = cluster.isMe ? 'end' : 'start';

          return (
            <MessageGroup key={`cluster-${clusterIdx}`} align={align} style={styles.clusterSpacing}>
              {cluster.items.map((message, msgIdx) => {
                const isFirst = msgIdx === 0;
                const isLast = msgIdx === cluster.items.length - 1;
                const reaction = reactions[message.id];

                return (
                  <Message key={message.id} align={align} style={styles.messageRow}>
                    {/* Receiver Avatar (shown next to message or cluster end) */}
                    {!cluster.isMe && (
                      <View style={styles.avatarColumn}>
                        {isLast ? (
                          <ProfileAvatar avatarUrl={otherPartyAvatar} size={32} logoSize={27} />
                        ) : (
                          <View style={styles.avatarSpacer} />
                        )}
                      </View>
                    )}

                    <MessageContent align={align} style={styles.messageContent}>
                      {/* Sender Header (name on first item of other user) */}
                      {isFirst && !cluster.isMe && (
                        <MessageHeader name={displayName} align={align} />
                      )}

                      {/* shadcn Bubble & BubbleContent */}
                      <Bubble
                        variant="ghost"
                        style={cluster.isMe ? styles.outgoingBubble : styles.incomingBubble}
                        align={align}
                        onLongPress={() => setSelectedMessageForReaction(message.id)}
                      >
                        {message.content.includes('Toplantı') || message.content.includes('📅') ? (
                          <View style={styles.meetingCard}>
                            <View style={styles.meetingHeader}>
                              <View style={[styles.meetingIconShell, cluster.isMe && styles.meetingIconShellOutgoing]}>
                                <Ionicons name="calendar" size={15} color={cluster.isMe ? '#3269C7' : '#3269C7'} />
                              </View>
                              <View style={styles.meetingInfo}>
                                <Text style={[styles.meetingTitle, cluster.isMe && styles.meetingTitleOutgoing]}>
                                  Toplantı Daveti
                                </Text>
                                <Text style={[styles.meetingSubtitle, cluster.isMe && styles.meetingSubtitleOutgoing]}>
                                  Kıstas Hızlı Görüşme
                                </Text>
                              </View>
                            </View>
                            <Text style={cluster.isMe ? styles.outgoingText : styles.incomingText}>
                              {message.content}
                            </Text>
                          </View>
                        ) : (
                          <BubbleContent style={cluster.isMe ? styles.outgoingText : styles.incomingText}>
                            {message.content}
                          </BubbleContent>
                        )}
                      </Bubble>

                      {/* Reaction Popover (when selected) */}
                      {selectedMessageForReaction === message.id && (
                        <View style={[styles.reactionPicker, cluster.isMe ? styles.pickerEnd : styles.pickerStart]}>
                          {['❤️', '👍', '🚀', '🔥', '👏'].map((emoji) => (
                            <TouchableOpacity
                              key={emoji}
                              style={styles.pickerEmojiBtn}
                              onPress={() => handleToggleReaction(message.id, emoji)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.pickerEmojiText}>{emoji}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* shadcn MessageFooter (Timestamp, status icons, reactions) */}
                      <MessageFooter
                        align={align}
                        time={formatMessageTime(message.createdAt)}
                        status={cluster.isMe ? (message.isRead ? 'read' : 'delivered') : undefined}
                        reaction={reaction}
                        onReactionPress={() => handleToggleReaction(message.id, '❤️')}
                      />
                    </MessageContent>
                  </Message>
                );
              })}
            </MessageGroup>
          );
        })}
      </ScrollView>

      {/* 5. Composer Area (BorderBeam & High-Tech Inputs) */}
      {closedAt ? (
        <View style={styles.closedComposer}>
          <GlassIconButton icon="checkmark-done-outline" iconSize={18} size={38} accessibilityLabel="Görüşme sonlandırıldı" />
          <View style={styles.closedComposerCopy}>
            <Text style={styles.closedComposerTitle}>Bu görüşme sonlandırıldı</Text>
            <Text style={styles.closedComposerText}>{isSupportAdmin ? 'Görüşme destek taleplerinde arşivlendi.' : 'Yeni bir konu için canlı destekten yeni talep oluşturabilirsiniz.'}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.composerArea}>
          <MessageComposer
            value={inputText}
            onChangeText={setInputText}
            onSend={() => { void handleSend(); }}
            busy={isSending}
            minLength={1}
            maxLength={2000}
            placeholder="Bir mesaj yazın veya etiketlemek için @ kullanın..."
            label="Mesaj yazma alanı"
            sendLabel="Mesajı gönder"
          />
          {sendError ? <Text style={styles.sendErrorText}>{sendError}</Text> : null}
        </View>
      )}

      <Modal
        visible={isCloseConfirmOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isClosingSupport && setIsCloseConfirmOpen(false)}
      >
        <View style={styles.closeModalBackdrop}>
          <View accessibilityRole="alert" style={styles.closeModalCard}>
            <View style={styles.closeModalIcon}>
              <Ionicons name="checkmark-done-outline" size={24} color="#3269C7" />
            </View>
            <Text style={styles.closeModalEyebrow}>CANLI DESTEK</Text>
            <Text style={styles.closeModalTitle}>Sohbeti sonlandır?</Text>
            <Text style={styles.closeModalText}>Kullanıcı bu görüşmeye artık mesaj gönderemeyecek. Yeni destek talebi ayrı bir görüşme olarak açılacaktır.</Text>
            {closeSupportError ? <Text style={styles.closeModalError}>{closeSupportError}</Text> : null}
            <View style={styles.closeModalActions}>
              <TouchableOpacity style={styles.closeModalCancel} onPress={() => setIsCloseConfirmOpen(false)} disabled={isClosingSupport} activeOpacity={0.75}>
                <Text style={styles.closeModalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeModalConfirm} onPress={() => { void confirmCloseSupport(); }} disabled={isClosingSupport} activeOpacity={0.75}>
                {isClosingSupport ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark-done-outline" size={17} color="#FFFFFF" />}
                <Text style={styles.closeModalConfirmText}>{isClosingSupport ? 'Sonlandırılıyor' : 'Sohbeti Sonlandır'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    backgroundColor: '#FAFBFD',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199, 0.16)',
    borderRadius: 22,
    boxShadow: '0 20px 48px -12px rgba(27, 58, 99, 0.10), 0 1px 3px rgba(0, 0, 0, 0.03)' as any,
    overflow: 'hidden',
    marginBottom: 16,
  },
  containerCompact: {
    borderRadius: 0,
    borderWidth: 0,
    marginBottom: 0,
  },
  messageRow: {
    maxWidth: '88%',
  },
  messageContent: {
    flexShrink: 1,
    minWidth: 0,
  },
  outgoingBubble: {
    backgroundColor: '#3269C7',
    borderColor: '#2452A3',
    borderWidth: 1,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    boxShadow: '0 4px 14px rgba(50, 105, 199, 0.24)' as any,
  },
  outgoingText: {
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: -0.01,
    ...Platform.select({ web: { overflowWrap: 'anywhere' } as any }),
  },
  incomingBubble: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(50, 105, 199, 0.14)',
    borderWidth: 1,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    boxShadow: '0 2px 10px rgba(27, 58, 99, 0.04)' as any,
  },
  incomingText: {
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: '400',
    color: '#25364E',
    letterSpacing: -0.01,
    ...Platform.select({ web: { overflowWrap: 'anywhere' } as any }),
  },
  meetingCard: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 2,
  },
  meetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  meetingIconShell: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(50, 105, 199, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingIconShellOutgoing: {
    backgroundColor: '#FFFFFF',
  },
  meetingInfo: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#25364E',
  },
  meetingTitleOutgoing: {
    color: '#FFFFFF',
  },
  meetingSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#64748B',
  },
  meetingSubtitleOutgoing: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(50, 105, 199, 0.10)',
  },
  verifiedText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#3269C7',
  },
  composerArea: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#FAFBFD',
    borderTopWidth: 1,
    borderTopColor: 'rgba(50, 105, 199, 0.08)',
  },
  closedComposer: { minHeight: 82, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#F4F7FB', borderTopWidth: 1, borderTopColor: 'rgba(50,105,199,0.1)' },
  closedComposerCopy: { flex: 1, minWidth: 0 },
  closedComposerTitle: { color: '#34445C', fontSize: 12.5, fontWeight: '700' },
  closedComposerText: { marginTop: 3, color: '#74839A', fontSize: 10.5, lineHeight: 15 },
  messageText: {
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0,
    fontWeight: '400',
    ...Platform.select({ web: { overflowWrap: 'anywhere' } as any }),
  },
  topGlassGroup: {
    position: 'relative',
    overflow: 'hidden',
    paddingBottom: 0,
    backgroundColor: 'rgba(63,59,76, 0.035)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50,105,199,0.06)',
  },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  closeSupportButton: { minHeight: 38, paddingHorizontal: 11, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF3F5', borderWidth: 1, borderColor: '#EBC9D0' },
  closeSupportButtonText: { color: '#9D3047', fontSize: 10.5, fontWeight: '700' },
  headerAvatarWrap: {
    marginLeft: 12,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerName: {
    flexShrink: 1,
    fontSize: 16,
    color: '#25364E',
    fontWeight: theme.typography.weights.heavy,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#187657',
    marginRight: 6,
  },
  offlineDot: { backgroundColor: '#94A3B8' },
  statusText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: theme.typography.weights.medium,
  },
  projectBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(228,218,250, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(228,218,250, 0.22)',
    overflow: 'hidden',
  },
  projectIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(228,218,250, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(228,218,250, 0.3)',
  },
  projectCopy: {
    flex: 1,
    minWidth: 0,
  },
  projectEyebrow: {
    fontSize: 8,
    letterSpacing: 0.8,
    color: '#6b59a0',
    fontWeight: theme.typography.weights.heavy,
  },
  projectTitle: {
    marginTop: 1,
    fontSize: 12,
    color: '#25364E',
    fontWeight: theme.typography.weights.bold,
  },
  projectActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(228,218,250, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(228,218,250, 0.2)',
  },
  projectActionText: {
    fontSize: 10,
    color: '#6b59a0',
    fontWeight: theme.typography.weights.bold,
    marginRight: 2,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 24,
  },
  chatContentCompact: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  messageStateTitle: {
    color: '#25364E',
    fontSize: 15,
    fontWeight: theme.typography.weights.bold,
  },
  messageStateText: {
    color: '#686474',
    fontSize: 11,
    textAlign: 'center',
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(37,35,51, 0.08)',
  },
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(37,35,51, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.06)',
    marginHorizontal: 10,
  },
  dateText: {
    fontSize: 11,
    letterSpacing: 0,
    color: '#94a3b8',
    fontWeight: theme.typography.weights.heavy,
  },
  clusterSpacing: {
    marginBottom: 12,
  },
  avatarColumn: {
    width: 32,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatarSpacer: {
    width: 32,
    height: 32,
  },
  reactionPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFD',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerStart: {
    alignSelf: 'flex-start',
  },
  pickerEnd: {
    alignSelf: 'flex-end',
  },
  pickerEmojiBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pickerEmojiText: {
    fontSize: 16,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  securityText: {
    marginLeft: 6,
    fontSize: 9.5,
    color: '#686474',
    fontWeight: theme.typography.weights.medium,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.22)',
    backgroundColor: 'rgba(37,35,51,0.035)',
    borderRadius: 8,
  },
  inputShell: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    overflow: 'hidden',
  },
  input: {
    paddingVertical: 10,
    fontSize: 16,
    lineHeight: 24,
    color: '#25364E',
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: '#dcd0f0',
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 6,
  },
  sendErrorText: {
    marginTop: 7,
    color: '#bd354c',
    fontSize: 10.5,
    lineHeight: 15,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(37,35,51, 0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  closeModalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(24, 31, 45, 0.42)',
  },
  closeModalCard: {
    width: '100%',
    maxWidth: 410,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E5F5',
    shadowColor: '#17365F',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 22,
  },
  closeModalIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#CADCF5',
  },
  closeModalEyebrow: { marginTop: 15, color: '#3269C7', fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  closeModalTitle: { marginTop: 5, color: '#25364E', fontSize: 22, lineHeight: 28, fontWeight: '700' },
  closeModalText: { marginTop: 9, color: '#686474', fontSize: 12.5, lineHeight: 19, textAlign: 'center' },
  closeModalError: { marginTop: 10, color: '#A9334E', fontSize: 11.5, lineHeight: 17, textAlign: 'center' },
  closeModalActions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 20 },
  closeModalCancel: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#F3F5F8', borderWidth: 1, borderColor: '#E1E6EE' },
  closeModalCancelText: { color: '#4D4B59', fontSize: 12, fontWeight: '700' },
  closeModalConfirm: { flex: 1.45, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, backgroundColor: '#A9334E' },
  closeModalConfirmText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' },
});
