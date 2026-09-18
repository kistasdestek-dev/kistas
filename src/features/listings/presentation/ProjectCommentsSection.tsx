import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderBeam } from '../../../shared/components/BorderBeam';
import { GlassIconButton } from '../../../shared/components/GlassIconButton';
import { ProfileAvatar } from '../../../shared/components/ProfileAvatar';
import { MessageComposer } from '../../../shared/components/MessageComposer';
import { UserProfile } from '../../auth/domain/User';
import {
  ProjectComment,
  ProjectCommentService,
} from '../../reviews/application/ProjectCommentService';
import { theme } from '../../../core/theme';

export interface ProjectCommentsSectionProps {
  projectId: string;
  projectTitle: string;
  sellerId: string;
  isEditorial?: boolean;
  developerName?: string | null;
  seller?: {
    fullName?: string;
    avatarUrl?: string | null;
    isVerified?: boolean;
    ratingAverage?: number;
    ratingCount?: number;
  } | null;
  currentUser?: UserProfile | null;
  onRequireAuth?: () => void;
}

const getCleanDeveloperName = (fullName?: string | null): string => {
  if (!fullName) return 'Geliştirici';
  return fullName.replace(/\s*\([^)]*\)/g, '').trim();
};

export const ProjectCommentsSection: React.FC<ProjectCommentsSectionProps> = ({
  projectId,
  projectTitle: _projectTitle,
  sellerId,
  isEditorial,
  developerName,
  seller,
  currentUser,
  onRequireAuth,
}) => {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyingTo, setReplyingTo] = useState<ProjectComment | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const isProjectOwner = currentUser?.id === sellerId && !isEditorial;
  const canCreateComment = !!currentUser?.isVerified;
  const cleanMakerName = getCleanDeveloperName(developerName || seller?.fullName);

  const loadComments = useCallback(async () => {
    try {
      setComments(await ProjectCommentService.getComments(projectId));
    } catch {
      // The rest of the project detail should remain usable if comments fail.
    } finally {
      setCommentsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setCommentsLoading(true);
    void loadComments();
    const channel = ProjectCommentService.subscribe(projectId, () => void loadComments());
    return () => {
      void channel.unsubscribe();
    };
  }, [loadComments, projectId]);

  const handleSubmitComment = useCallback(async () => {
    const body = commentBody.trim();
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    if (!canCreateComment) {
      Alert.alert('Hesap doğrulaması gerekli', 'Projelerde yorum yapmak için hesabınızı doğrulamalısınız.');
      return;
    }
    if (body.length < 2 || commentSubmitting) return;

    setCommentSubmitting(true);
    const result = await ProjectCommentService.createComment(projectId, body);
    setCommentSubmitting(false);
    if (!result.success) {
      Alert.alert('Yorum yayınlanamadı', result.error || 'Lütfen tekrar deneyin.');
      return;
    }
    setCommentBody('');
    await loadComments();
  }, [canCreateComment, commentBody, commentSubmitting, currentUser, loadComments, onRequireAuth, projectId]);

  const handleSubmitReply = useCallback(async () => {
    const body = replyBody.trim();
    if (!replyingTo || body.length < 2 || commentSubmitting) return;

    setCommentSubmitting(true);
    const result = await ProjectCommentService.createComment(projectId, body, replyingTo.id);
    setCommentSubmitting(false);
    if (!result.success) {
      Alert.alert('Yanıt yayınlanamadı', result.error || 'Lütfen tekrar deneyin.');
      return;
    }
    setReplyBody('');
    setReplyingTo(null);
    await loadComments();
  }, [commentSubmitting, loadComments, projectId, replyBody, replyingTo]);

  return (
    <View style={styles.commentsSection}>
      <View style={styles.commentsHeadingRow}>
        <View>
          <Text style={styles.commentsTitle}>Yorumlar</Text>
        </View>
        <GlassIconButton
          icon="chatbubble-outline"
          iconSize={19}
          size={38}
          badge={comments.length}
          accessibilityLabel={`${comments.length} yorum`}
        />
      </View>

      {currentUser && canCreateComment ? (
        <View style={{ marginBottom: 16 }}>
          <MessageComposer
            value={commentBody}
            onChangeText={setCommentBody}
            onSend={() => { void handleSubmitComment(); }}
            busy={commentSubmitting}
            placeholder="Projeyle ilgili düşünceni paylaş..."
            label="Proje yorumu"
            sendLabel="Yorumu yayınla"
            leading={<ProfileAvatar avatarUrl={currentUser.avatarUrl} size={30} logoSize={26} />}
          />
        </View>
      ) : currentUser ? (
        <View style={styles.commentAccessRow}>
          <View style={styles.commentAccessIcon}>
            <Ionicons name="shield-checkmark-outline" size={17} color="#3269C7" />
          </View>
          <View style={styles.commentAccessCopy}>
            <Text style={styles.commentAccessTitle}>Doğrulanmış üyeler yorum yapabilir</Text>
            <Text style={styles.commentAccessText}>
              Hesap güvenliği bölümünden doğrulamanı tamamlayabilirsin.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.devDialogueChamber}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(250, 251, 253, 0.96)', 'rgba(242, 246, 254, 0.88)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.devDialogueGradient}
          />
          <View style={styles.devDialogueSpecular} />
          <BorderBeam
            size={200}
            duration={12}
            delay={0}
            colorVariant="kistas"
            borderWidth={1.5}
            borderRadius={18}
          />

          {/* 1. GELİŞTİRİCİ DİYALOG BALONU */}
          <View style={styles.devSpeechRow}>
            <View style={styles.devAvatarContainer}>
              <ProfileAvatar avatarUrl={seller?.avatarUrl} size={40} logoSize={32} />
              <View style={styles.devOnlinePulse} />
            </View>

            <View style={styles.devSpeechBubble}>
              <View style={styles.devSpeechTail} />
              <View style={styles.devSpeechHeader}>
                <Text style={styles.devSpeechName} numberOfLines={1}>
                  {cleanMakerName}
                </Text>
                <View style={styles.devMakerBadge}>
                  <Text style={styles.devMakerBadgeText}>Geliştirici</Text>
                </View>
              </View>
              <Text style={styles.devSpeechMessage}>
                {isEditorial
                  ? '“Bu kayıt Kıstas editörleri tarafından resmi mağaza bilgileriyle hazırlandı.”'
                  : comments.length === 0
                  ? '“Teknik sorularınızı ve geliştirme önerilerinizi doğrudan geliştiriciye iletebilirsiniz.”'
                  : '“Proje hakkındaki teknik değerlendirmelerinizi ve geliştirme önerilerinizi toplulukla paylaşabilirsiniz.”'}
              </Text>
            </View>
          </View>

          {/* 2. DİYALOG CEVAP DOKU */}
          <TouchableOpacity
            style={styles.devReplyDock}
            activeOpacity={0.88}
            onPress={onRequireAuth}
            accessibilityRole="button"
            accessibilityLabel="Yorum yapmak için giriş yap"
          >
            <View style={styles.devReplyInputRow}>
              <Ionicons name="create-outline" size={17} color="#7A8799" />
              <Text style={styles.devReplyPlaceholder} numberOfLines={1}>
                {isEditorial ? 'Proje hakkında yorum yaz...' : `${cleanMakerName}'e doğrudan yanıt yaz...`}
              </Text>
            </View>

            <View style={styles.devReplyCtaPill}>
              <Text style={styles.devReplyCtaText}>Yorum Yap</Text>
              <Ionicons name="arrow-forward" size={13} color="#3269C7" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {commentsLoading ? (
        <View style={styles.commentsLoading}>
          <ActivityIndicator size="small" color="#3269C7" />
        </View>
      ) : comments.length === 0 ? (
        currentUser ? (
          <View style={styles.commentsEmpty}>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.96)', 'rgba(234,242,252,0.82)']}
              start={{ x: 0.08, y: 0 }}
              end={{ x: 0.92, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.commentsEmptyGlow} />

            <View style={styles.commentsEmptyHeader}>
              <GlassIconButton
                icon="chatbubble-ellipses-outline"
                iconSize={18}
                size={40}
                accessibilityLabel="İlk yorum daveti"
              />
              <View style={styles.commentsEmptyHeading}>
                <Text style={styles.commentsEmptyTitle}>İlk yorumu sen bırak</Text>
              </View>
            </View>
          </View>
        ) : null
      ) : (
        <View style={styles.commentsList}>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentThread}>
              <View style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                  <ProfileAvatar avatarUrl={comment.author.avatarUrl} size={36} logoSize={30} />
                </View>
                <View style={styles.commentContent}>
                  <View style={styles.commentMetaRow}>
                    <Text style={styles.commentAuthor} numberOfLines={1}>{comment.author.fullName}</Text>
                    {comment.author.isVerified || comment.authorId === sellerId ? <MaterialIcons name="verified" size={14} color="#1D9BF0" /> : null}
                    <Text style={styles.commentDate}>
                      {new Date(comment.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>{comment.body}</Text>
                  {isProjectOwner ? (
                    <TouchableOpacity
                      style={styles.replyAction}
                      onPress={() => {
                        setReplyingTo(comment);
                        setReplyBody('');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Yoruma yanıt ver"
                    >
                      <Ionicons name="return-down-forward-outline" size={13} color="#3269C7" />
                      <Text style={styles.replyActionText}>Yanıtla</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {comment.replies.map((reply) => (
                <View key={reply.id} style={styles.replyRow}>
                  <View style={styles.replyLine} />
                  <View style={styles.replyAvatar}>
                    <ProfileAvatar avatarUrl={reply.author.avatarUrl} size={28} logoSize={23} />
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentMetaRow}>
                      <Text style={styles.commentAuthor} numberOfLines={1}>{reply.author.fullName}</Text>
                      <MaterialIcons name="verified" size={13} color="#1D9BF0" />
                      <View style={styles.ownerBadge}>
                        <Text style={styles.ownerBadgeText}>GELİŞTİRİCİ</Text>
                      </View>
                      <Text style={styles.commentDate}>
                        {new Date(reply.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{reply.body}</Text>
                  </View>
                </View>
              ))}

              {replyingTo?.id === comment.id ? (
                <View style={{ marginLeft: 20, marginTop: 12 }}>
                  <MessageComposer
                    value={replyBody}
                    onChangeText={setReplyBody}
                    onSend={() => { void handleSubmitReply(); }}
                    busy={commentSubmitting}
                    autoFocus
                    onCancel={() => setReplyingTo(null)}
                    label="Geliştirici yanıtı"
                    sendLabel="Yanıtı yayınla"
                    placeholder={`${comment.author.fullName} kullanıcısına yanıt ver...`}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  commentsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(50,105,199,0.14)',
  },
  commentsHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  commentsTitle: {
    color: '#25364E',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: 0,
  },
  devDialogueChamber: {
    position: 'relative',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.22)',
    overflow: 'hidden',
    shadowColor: '#3269C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  devDialogueGradient: {
    ...StyleSheet.absoluteFill,
  },
  devDialogueSpecular: {
    position: 'absolute',
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  devSpeechRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  devAvatarContainer: {
    position: 'relative',
    flexShrink: 0,
    marginTop: 2,
  },
  devOnlinePulse: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#187657',
    borderWidth: 2,
    borderColor: '#FAFBFD',
  },
  devSpeechBubble: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.18)',
    shadowColor: '#25364E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  devSpeechTail: {
    position: 'absolute',
    left: -7,
    top: 12,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderTopColor: 'transparent',
    borderBottomWidth: 5,
    borderBottomColor: 'transparent',
    borderRightWidth: 7,
    borderRightColor: 'rgba(255,255,255,0.92)',
  },
  devSpeechHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  devSpeechName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#25364E',
  },
  devMakerBadge: {
    backgroundColor: 'rgba(50,105,199,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  devMakerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3269C7',
  },
  devSpeechMessage: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#4B4858',
    fontStyle: 'italic',
  },
  devReplyDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(50,105,199,0.3)',
    shadowColor: '#3269C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 0,
  },
  devReplyInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  devReplyPlaceholder: {
    flex: 1,
    fontSize: 12.5,
    color: '#7A8799',
    fontWeight: '500',
  },
  devReplyCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.24)',
    shadowColor: '#3269C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
    elevation: 2,
  },
  devReplyCtaText: {
    ...theme.typography.kistas,
    color: '#3269C7',
  },
  commentAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(250,251,253,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.12)',
  },
  commentAccessIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50,105,199,0.09)',
  },
  commentAccessCopy: { flex: 1 },
  commentAccessTitle: { color: '#25364E', fontSize: 12, fontWeight: '750' as any },
  commentAccessText: { color: '#3269C7', fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  commentsLoading: { height: 72, alignItems: 'center', justifyContent: 'center' },
  commentsEmpty: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 68,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.16)',
    backgroundColor: '#F1F5FA',
    shadowColor: '#8292A8',
    shadowOffset: { width: 5, height: 7 },
    shadowOpacity: 0.13,
    shadowRadius: 14,
    elevation: 3,
    ...Platform.select({
      web: {
        boxShadow: '-5px -5px 13px rgba(255,255,255,0.82), 6px 8px 17px rgba(130,146,168,0.14)',
      },
    }),
  },
  commentsEmptyGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    top: -48,
    right: -30,
    backgroundColor: 'rgba(50,105,199,0.10)',
  },
  commentsEmptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  commentsEmptyHeading: {
    flex: 1,
    minWidth: 0,
  },
  commentsEmptyTitle: {
    ...theme.typography.kistas,
    color: '#25364E',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  commentsList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(50,105,199,0.09)',
  },
  commentThread: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50,105,199,0.09)',
  },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  commentAvatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentContent: { flex: 1, minWidth: 0 },
  commentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  commentAuthor: { color: '#25364E', fontSize: 11.5, fontWeight: '700', maxWidth: '55%' },
  commentDate: { color: '#3269C7', fontSize: 9.5, marginLeft: 'auto' },
  commentText: { color: '#25364E', fontSize: 12.5, lineHeight: 18.5, marginTop: 5 },
  replyAction: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7, paddingVertical: 2 },
  replyActionText: { color: '#3269C7', fontSize: 10.5, fontWeight: '700' },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 20,
    marginTop: 13,
    paddingLeft: 13,
    gap: 9,
    position: 'relative',
  },
  replyLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(50,105,199,0.2)',
  },
  replyAvatar: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(50,105,199,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(50,105,199,0.2)',
  },
  ownerBadgeText: { color: '#3269C7', fontSize: 7, fontWeight: '700', letterSpacing: 0 },
});
