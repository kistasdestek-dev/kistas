import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { styles } from './ChatScreen.styles';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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
