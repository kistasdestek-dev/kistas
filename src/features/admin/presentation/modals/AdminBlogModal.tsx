import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlogPost, BLOG_CATEGORIES, generateSlug } from '../../../blog/domain/BlogPost';
import { BlogService } from '../../../blog/application/BlogService';
import { styles } from '../AdminDashboardScreen.styles';

export interface AdminBlogModalProps {
  isOpen: boolean;
  editingPost: BlogPost | null;
  deleteTarget: BlogPost | null;
  onClose: () => void;
  onSaved: (message: string, icon: React.ComponentProps<typeof Ionicons>['name']) => void;
  onDeleted: (message: string, icon: React.ComponentProps<typeof Ionicons>['name']) => void;
  onCancelDelete: () => void;
}

export const AdminBlogModal: React.FC<AdminBlogModalProps> = ({
  isOpen,
  editingPost,
  deleteTarget,
  onClose,
  onSaved,
  onDeleted,
  onCancelDelete,
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [cover, setCover] = useState('');
  const [category, setCategory] = useState('Girişimcilik');
  const [published, setPublished] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title);
      setSlug(editingPost.slug);
      setExcerpt(editingPost.excerpt);
      setContent(editingPost.content);
      setCover(editingPost.cover_image_url);
      setCategory(editingPost.category);
      setPublished(editingPost.is_published);
    } else {
      setTitle('');
      setSlug('');
      setExcerpt('');
      setContent('');
      setCover('https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop');
      setCategory('Girişimcilik');
      setPublished(true);
    }
  }, [editingPost, isOpen]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Eksik Alan', 'Lütfen bir başlık girin.');
      return;
    }
    if (!excerpt.trim()) {
      Alert.alert('Eksik Alan', 'Lütfen kısa bir özet girin (Google arama sonucu için gereklidir).');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Eksik Alan', 'Lütfen yazı içeriğini girin.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingPost) {
        await BlogService.updatePost(editingPost.id, {
          title: title.trim(),
          slug: slug ? generateSlug(slug) : generateSlug(title),
          excerpt: excerpt.trim(),
          content,
          cover_image_url: cover.trim(),
          category,
          is_published: published,
        });
        onSaved('Blog yazısı başarıyla güncellendi.', 'checkmark-circle-outline');
      } else {
        await BlogService.createPost({
          title: title.trim(),
          custom_slug: slug ? generateSlug(slug) : undefined,
          excerpt: excerpt.trim(),
          content,
          cover_image_url: cover.trim(),
          category,
          is_published: published,
        });
        onSaved('Yeni blog yazısı yayınlandı.', 'newspaper-outline');
      }
      onClose();
    } catch {
      Alert.alert('Hata', 'Yazı kaydedilirken bir sorun oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await BlogService.deletePost(deleteTarget.id);
      onDeleted('Blog yazısı silindi.', 'trash-outline');
    } catch {
      Alert.alert('Hata', 'Yazı silinirken bir sorun oluştu.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Blog Delete Confirmation Modal */}
      <Modal
        visible={Boolean(deleteTarget)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isDeleting && onCancelDelete()}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.commandDialog}>
            <LinearGradient colors={['#7E263C', '#B83D57', '#D96772']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dialogHero}>
              <View style={styles.dialogHeroGlow} />
              <View style={styles.dialogHeroIcon}>
                <Ionicons name="trash-outline" size={27} color="#FFFFFF" />
              </View>
              <View style={styles.dialogHeroCopy}>
                <Text style={styles.dialogHeroEyebrow}>KALICI İŞLEM</Text>
                <Text style={styles.dialogHeroTitle}>Makaleyi sil?</Text>
              </View>
              <View style={styles.dialogStepBadge}><Ionicons name="alert" size={15} color="#FFFFFF" /></View>
            </LinearGradient>
            <View style={styles.dialogBody}>
              <View style={styles.dialogNotice}>
                <View style={styles.dialogNoticeMark}><Ionicons name="alert" size={14} color="#B83D57" /></View>
                <Text style={styles.dialogMessage}>
                  {deleteTarget ? `“${deleteTarget.title}” başlıklı blog yazısı silinecek. Bu işlem geri alınamaz.` : ''}
                </Text>
              </View>
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogSecondaryButton}
                  onPress={onCancelDelete}
                  disabled={isDeleting}
                  activeOpacity={0.75}
                >
                  <Text style={styles.dialogSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogPrimaryButton, styles.dialogDeleteButton]}
                  onPress={handleConfirmDelete}
                  disabled={isDeleting}
                  activeOpacity={0.75}
                >
                  {isDeleting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="trash-outline" size={17} color="#FFFFFF" />}
                  <Text style={styles.dialogDeleteText}>{isDeleting ? 'Siliniyor' : 'Kalıcı Olarak Sil'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Blog Editor Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isSaving && onClose()}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.blogModalBox}>
            <View style={styles.blogModalHeader}>
              <View>
                <Text style={styles.dialogEyebrow}>KISTAS SEO İÇERİK EDİTÖRÜ</Text>
                <Text style={styles.blogModalHeaderTitle}>
                  {editingPost ? 'Makaleyi Düzenle' : 'Yeni Blog Makalesi'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.blogModalCloseBtn}
                onPress={onClose}
                disabled={isSaving}
              >
                <Ionicons name="close" size={20} color="#25364E" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.blogModalScroll} contentContainerStyle={styles.blogModalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View style={styles.blogInputGroup}>
                <Text style={styles.blogInputLabel}>Makale Başlığı (H1 / Title)</Text>
                <TextInput
                  style={styles.blogTextInput}
                  value={title}
                  onChangeText={(val) => {
                    setTitle(val);
                    if (!editingPost && (!slug || slug === generateSlug(title))) {
                      setSlug(generateSlug(val));
                    }
                  }}
                  placeholder="Örn: 2026'da SaaS Girişimi Başlatırken Dikkat Edilmesi Gerekenler"
                  placeholderTextColor="#908c9f"
                />
              </View>

              {/* Slug */}
              <View style={styles.blogInputGroup}>
                <View style={styles.blogLabelRow}>
                  <Text style={styles.blogInputLabel}>SEO URL Bağlantısı (Slug)</Text>
                  <Text style={styles.blogHelperHint}>www.kistas.com.tr/blog/{slug || '...'}</Text>
                </View>
                <TextInput
                  style={styles.blogTextInput}
                  value={slug}
                  onChangeText={(val) => setSlug(generateSlug(val))}
                  placeholder="saas-girisimi-baslatirken-dikkat-edilmesi-gerekenler"
                  placeholderTextColor="#908c9f"
                  autoCapitalize="none"
                />
              </View>

              {/* Category */}
              <View style={styles.blogInputGroup}>
                <Text style={styles.blogInputLabel}>Kategori</Text>
                <View style={styles.blogCategoryPills}>
                  {BLOG_CATEGORIES.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.blogCategorySelectPill, isSelected && styles.blogCategorySelectPillActive]}
                        onPress={() => setCategory(cat)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.blogCategorySelectPillText, isSelected && styles.blogCategorySelectPillTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Excerpt / Meta Description */}
              <View style={styles.blogInputGroup}>
                <View style={styles.blogLabelRow}>
                  <Text style={styles.blogInputLabel}>Meta Açıklaması & Özet (Google Snippet)</Text>
                  <Text style={[
                    styles.blogCharCount,
                    excerpt.length >= 120 && excerpt.length <= 160 && styles.blogCharCountOptimal
                  ]}>
                    {excerpt.length}/160 karakter
                  </Text>
                </View>
                <TextInput
                  style={[styles.blogTextInput, styles.blogTextAreaSmall]}
                  value={excerpt}
                  onChangeText={setExcerpt}
                  placeholder="Google arama sonuçlarında görünecek 120-160 karakterlik özet metin..."
                  placeholderTextColor="#908c9f"
                  multiline
                  maxLength={250}
                />
              </View>

              {/* Cover Image URL */}
              <View style={styles.blogInputGroup}>
                <Text style={styles.blogInputLabel}>Kapak Görseli URL'si</Text>
                <TextInput
                  style={styles.blogTextInput}
                  value={cover}
                  onChangeText={setCover}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#908c9f"
                  autoCapitalize="none"
                />
                {cover ? (
                  <View style={styles.blogCoverPreviewBox}>
                    <Image source={{ uri: cover }} style={styles.blogCoverPreviewImg} resizeMode="cover" />
                  </View>
                ) : null}
              </View>

              {/* Content */}
              <View style={styles.blogInputGroup}>
                <View style={styles.blogLabelRow}>
                  <Text style={styles.blogInputLabel}>Makale İçeriği (Markdown & Paragraflar)</Text>
                  <Text style={styles.blogHelperHint}>## Alt Başlık, - Madde</Text>
                </View>
                <TextInput
                  style={[styles.blogTextInput, styles.blogTextAreaContent]}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Makalenizi buraya yazın. Başlıklar için ##, listeler için - kullanabilirsiniz..."
                  placeholderTextColor="#908c9f"
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Publish Toggle */}
              <TouchableOpacity
                style={styles.blogPublishToggleRow}
                onPress={() => setPublished(!published)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={published ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={published ? '#187657' : '#686474'}
                />
                <View style={styles.blogPublishToggleCopy}>
                  <Text style={styles.blogPublishToggleTitle}>
                    {published ? 'Yazıyı doğrudan yayına al' : 'Taslak olarak kaydet'}
                  </Text>
                  <Text style={styles.blogPublishToggleSubtitle}>
                    {published
                      ? 'Yazı kaydedildiği anda ziyaretçilere ve Google botlarına açık olacaktır.'
                      : 'Yazı yalnızca admin panelinde görünür, yayına alınana kadar gizli kalır.'}
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.blogModalFooter}>
              <TouchableOpacity
                style={styles.blogModalCancelBtn}
                onPress={onClose}
                disabled={isSaving}
                activeOpacity={0.75}
              >
                <Text style={styles.blogModalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.blogModalSaveBtn}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FAFBFD" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={17} color="#FAFBFD" />
                    <Text style={styles.blogModalSaveText}>
                      {editingPost ? 'Değişiklikleri Kaydet' : 'Makaleyi Yayınla'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
