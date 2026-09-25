import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Category } from '../../../categories/application/CategoryService';
import { AdminListingItem } from '../../domain/AdminModels';
import { AdminService } from '../../application/AdminService';
import { styles } from '../AdminDashboardScreen.styles';

export interface AdminProjectModalsProps {
  // Category Modal
  categoryTarget: AdminListingItem | null;
  categories: Category[];
  onCloseCategory: () => void;

  // Support Modal
  supportTarget: AdminListingItem | null;
  onCloseSupport: () => void;

  // Views Modal
  viewsTarget: AdminListingItem | null;
  onCloseViews: () => void;

  // Revision Modal
  revisionTarget: AdminListingItem | null;
  onCloseRevision: () => void;

  // Delete Modal
  deleteTarget: AdminListingItem | null;
  onCloseDelete: () => void;

  // Common notifications
  onSuccess: (message: string, icon: React.ComponentProps<typeof Ionicons>['name']) => void;
  onRefresh: () => void;
}

const formatNumber = (value: number) => new Intl.NumberFormat('tr-TR').format(value);

export const AdminProjectModals: React.FC<AdminProjectModalsProps> = ({
  categoryTarget,
  categories,
  onCloseCategory,
  supportTarget,
  onCloseSupport,
  viewsTarget,
  onCloseViews,
  revisionTarget,
  onCloseRevision,
  deleteTarget,
  onCloseDelete,
  onSuccess,
  onRefresh,
}) => {
  // 1. Category Modal State
  const [selectedNewCategoryId, setSelectedNewCategoryId] = useState<string | null>(null);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categorySegment, setCategorySegment] = useState<'all' | 'game' | 'app'>('all');

  // 2. Support Modal State
  const [supportAmount, setSupportAmount] = useState<number>(1);
  const [customSupportInput, setCustomSupportInput] = useState<string>('');
  const [isGrantingSupport, setIsGrantingSupport] = useState<boolean>(false);
  const [supportModalError, setSupportModalError] = useState<string | null>(null);

  // 3. Views Modal State
  const [viewAmount, setViewAmount] = useState<number>(50);
  const [customViewInput, setCustomViewInput] = useState<string>('');
  const [isGrantingViews, setIsGrantingViews] = useState<boolean>(false);
  const [viewModalError, setViewModalError] = useState<string | null>(null);

  // 4. Revision Modal State
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);

  // 5. Delete Modal State
  const [isDeleting, setIsDeleting] = useState(false);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const filteredModalCategories = useMemo(() => {
    const q = categorySearchQuery.trim().toLocaleLowerCase('tr-TR');
    return categories.filter((cat) => {
      if (categorySegment === 'game' && !cat.slug.startsWith('game-')) return false;
      if (categorySegment === 'app' && !cat.slug.startsWith('app-')) return false;
      if (!q) return true;
      return (
        cat.name.toLocaleLowerCase('tr-TR').includes(q) ||
        cat.slug.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [categories, categorySearchQuery, categorySegment]);

  // Handle Save Category
  const handleSaveCategory = async () => {
    if (!categoryTarget) return;
    if (!selectedNewCategoryId) {
      setCategoryModalError('Lütfen projenin atanacağı yeni kategoriyi seçin.');
      return;
    }
    if (selectedNewCategoryId === categoryTarget.categoryId) {
      const currentCatName = categoryMap.get(selectedNewCategoryId)?.name || 'Mevcut Kategori';
      setCategoryModalError(`Proje zaten “${currentCatName}” kategorisinde bulunuyor. Farklı bir kategori seçiniz.`);
      return;
    }

    setCategoryModalError(null);
    setIsUpdatingCategory(true);
    try {
      const result = await AdminService.updateListingCategory(categoryTarget.id, selectedNewCategoryId);
      if (!result.success) {
        setCategoryModalError(result.error || 'Kategori güncellenemedi.');
        return;
      }
      const categoryName = categoryMap.get(selectedNewCategoryId)?.name || 'Yeni Kategori';
      onCloseCategory();
      onSuccess(`“${categoryTarget.title}” projesinin kategorisi “${categoryName}” olarak güncellendi.`, 'checkmark-circle-outline');
      onRefresh();
    } catch (err: any) {
      setCategoryModalError(err?.message || 'Beklenmedik bir hata oluştu.');
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  // Handle Confirm Support
  const handleConfirmSupport = async () => {
    if (!supportTarget) return;
    const finalAmount = customSupportInput ? parseInt(customSupportInput, 10) : supportAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setSupportModalError('Lütfen geçerli bir destek miktarı girin (en az 1).');
      return;
    }
    if (finalAmount > 100) {
      setSupportModalError('Tek seferde en fazla 100 destek puanı tanımlanabilir.');
      return;
    }

    setSupportModalError(null);
    setIsGrantingSupport(true);
    try {
      const result = await AdminService.grantInternalSupport(supportTarget.id, finalAmount);
      if (!result.success) {
        setSupportModalError(result.error || 'Destek eklenemedi.');
        return;
      }
      onCloseSupport();
      onSuccess(`“${supportTarget.title}” projesine +${finalAmount} destek tanımlandı. Toplam: ${result.newCount}`, 'flame');
      onRefresh();
    } catch (err: any) {
      setSupportModalError(err?.message || 'Beklenmedik bir hata oluştu.');
    } finally {
      setIsGrantingSupport(false);
    }
  };

  // Handle Confirm Views
  const handleConfirmViews = async () => {
    if (!viewsTarget) return;
    const finalAmount = customViewInput ? parseInt(customViewInput, 10) : viewAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setViewModalError('Lütfen geçerli bir görüntülenme miktarı girin (en az 1).');
      return;
    }
    if (finalAmount > 100000) {
      setViewModalError('Tek seferde en fazla 100.000 görüntülenme tanımlanabilir.');
      return;
    }

    setViewModalError(null);
    setIsGrantingViews(true);
    try {
      const result = await AdminService.grantInternalViews(viewsTarget.id, finalAmount);
      if (!result.success) {
        setViewModalError(result.error || 'Görüntülenme tanımlanamadı.');
        return;
      }
      onCloseViews();
      onSuccess(`“${viewsTarget.title}” projesine +${finalAmount} görüntülenme tanımlandı. Toplam: ${result.newCount}`, 'eye');
      onRefresh();
    } catch (err: any) {
      setViewModalError(err?.message || 'Beklenmedik bir hata oluştu.');
    } finally {
      setIsGrantingViews(false);
    }
  };

  // Handle Confirm Revision
  const handleConfirmRevision = async () => {
    if (!revisionTarget) return;
    const trimmed = revisionFeedback.trim();
    if (!trimmed) {
      setRevisionError('Lütfen kullanıcıya iletilecek düzeltme notunu yazın.');
      return;
    }
    setIsRequestingRevision(true);
    setRevisionError(null);
    const result = await AdminService.requestListingRevision(revisionTarget.id, trimmed);
    setIsRequestingRevision(false);
    if (!result.success) {
      setRevisionError(result.error || 'Düzeltme talebi iletilemedi.');
      return;
    }
    onCloseRevision();
    onSuccess(`“${revisionTarget.title}” için düzeltme talebi gönderildi.`, 'mail-outline');
    onRefresh();
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    const result = await AdminService.deleteListing(deleteTarget.id);
    setIsDeleting(false);
    if (!result.success) {
      return;
    }
    onCloseDelete();
    onSuccess(`“${deleteTarget.title}” projesi kalıcı olarak silindi.`, 'trash-outline');
    onRefresh();
  };

  return (
    <>
      {/* 1. KATEGORİ DEĞİŞTİRME MODALI */}
      <Modal
        visible={Boolean(categoryTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => !isUpdatingCategory && onCloseCategory()}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.categoryModalBox}>
            <LinearGradient colors={['#173866', '#285DA8', '#3D78CB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.categoryModalHeader}>
              <View style={styles.categoryModalHeaderGlow} />
              <View style={styles.categoryModalHeaderCopy}>
                <Text style={styles.categoryModalEyebrow}>KATEGORİ MODERASYONU</Text>
                <Text style={styles.categoryModalTitle}>Kategori Değiştir</Text>
                <Text style={styles.categoryModalSubtitle}>Projeyi doğru keşif alanına taşıyın.</Text>
              </View>
              <TouchableOpacity style={styles.categoryModalCloseBtn} onPress={onCloseCategory} disabled={isUpdatingCategory} activeOpacity={0.7}>
                <Ionicons name="close" size={19} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            {categoryTarget ? (
              <View style={styles.categoryModalProjectCard}>
                <View style={styles.categoryModalProjectInfo}>
                  <Text style={styles.categoryModalProjectLabel}>DÜZENLENEN PROJE</Text>
                  <Text style={styles.categoryModalProjectTitle} numberOfLines={1}>{categoryTarget.title}</Text>
                  <Text style={styles.categoryModalProjectTagline} numberOfLines={1}>{categoryTarget.tagline || 'Dijital Proje'}</Text>
                </View>
                <View style={styles.categoryModalCurrentPill}>
                  <Text style={styles.categoryModalCurrentLabel}>MEVCUT KATEGORİ</Text>
                  <Text style={styles.categoryModalCurrentVal} numberOfLines={1}>
                    {categoryTarget.categoryId ? categoryMap.get(categoryTarget.categoryId)?.name || 'Bilinmiyor' : 'Atanmamış'}
                  </Text>
                </View>
              </View>
            ) : null}

            {categoryModalError ? (
              <View style={styles.categoryModalErrorBox}>
                <Ionicons name="alert-circle" size={17} color="#B83D57" />
                <Text style={styles.categoryModalErrorText}>{categoryModalError}</Text>
              </View>
            ) : null}

            <View style={styles.categorySegmentRow}>
              {[
                { id: 'all', label: `Tümü (${categories.length})` },
                { id: 'game', label: `Oyunlar (${categories.filter((c) => c.slug.startsWith('game-')).length})` },
                { id: 'app', label: `Uygulamalar (${categories.filter((c) => c.slug.startsWith('app-')).length})` },
              ].map((tab) => {
                const isSelected = categorySegment === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.categorySegmentBtn, isSelected && styles.categorySegmentBtnActive]}
                    onPress={() => setCategorySegment(tab.id as any)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.categorySegmentBtnText, isSelected && styles.categorySegmentBtnTextActive]}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.categorySearchShell}>
              <Ionicons name="search" size={17} color="#686474" style={styles.categorySearchIcon} />
              <TextInput
                style={styles.categorySearchInput}
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
                placeholder="Kategori adı veya slug ile ara..."
                placeholderTextColor="#908c9f"
                autoCapitalize="none"
              />
              {categorySearchQuery ? (
                <TouchableOpacity onPress={() => setCategorySearchQuery('')} style={styles.categorySearchClearBtn}>
                  <Ionicons name="close-circle" size={16} color="#908c9f" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView style={styles.categoryListScroll} contentContainerStyle={styles.categoryListBody} showsVerticalScrollIndicator={false}>
              {filteredModalCategories.length === 0 ? (
                <View style={styles.categoryEmptyState}>
                  <Ionicons name="search-outline" size={32} color="#908c9f" />
                  <Text style={styles.categoryEmptyTitle}>Eşleşen Kategori Bulunamadı</Text>
                </View>
              ) : (
                <View style={styles.categoryGrid}>
                  {filteredModalCategories.map((cat) => {
                    const isSelected = selectedNewCategoryId === cat.id;
                    const isCurrent = categoryTarget?.categoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryItemCard, isSelected && styles.categoryItemCardSelected, isCurrent && styles.categoryItemCardCurrent]}
                        onPress={() => {
                          setSelectedNewCategoryId(cat.id);
                          setCategoryModalError(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.categoryItemTop}>
                          <Text style={[styles.categoryItemName, isSelected && styles.categoryItemNameSelected]} numberOfLines={1}>{cat.name}</Text>
                          {isSelected ? (
                            <View style={styles.categoryCheckBadge}><Ionicons name="checkmark" size={11} color="#FFFFFF" /></View>
                          ) : isCurrent ? (
                            <View style={styles.categoryCurrentBadge}><Text style={styles.categoryCurrentBadgeText}>Mevcut</Text></View>
                          ) : null}
                        </View>
                        <Text style={[styles.categoryItemSlug, isSelected && styles.categoryItemSlugSelected]} numberOfLines={1}>/{cat.slug}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={styles.categoryModalFooter}>
              <TouchableOpacity style={styles.categoryModalCancelBtn} onPress={onCloseCategory} disabled={isUpdatingCategory} activeOpacity={0.75}>
                <Text style={styles.categoryModalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.categoryModalSaveBtn, (!selectedNewCategoryId || selectedNewCategoryId === categoryTarget?.categoryId) && styles.categoryModalSaveBtnSubdued]}
                onPress={handleSaveCategory}
                disabled={isUpdatingCategory}
                activeOpacity={0.8}
              >
                {isUpdatingCategory ? <ActivityIndicator size="small" color="#FAFBFD" /> : (
                  <>
                    <Text style={styles.categoryModalSaveText}>Kategoriyi Güncelle</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FAFBFD" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. GİZLİ YÖNETİM DESTEĞİ MODALI */}
      <Modal
        visible={Boolean(supportTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => !isGrantingSupport && onCloseSupport()}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.supportModalBox}>
            <LinearGradient colors={['#173866', '#246592', '#218B87']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.supportModalHeader}>
              <View style={styles.supportModalGlow} />
              <View style={styles.supportModalHeaderCopy}>
                <View style={styles.supportSecretPill}>
                  <View style={styles.supportSecretDot} />
                  <Text style={styles.supportSecretPillText}>KISTAS YÖNETİM DESTEĞİ</Text>
                </View>
                <Text style={styles.supportModalTitle}>Geliştiriciye Destek Ol</Text>
                <Text style={styles.supportModalSubtitle}>Projeye eklenecek destek puanını seçin ve yeni toplamı onaylayın.</Text>
              </View>
              <TouchableOpacity style={styles.categoryModalCloseBtn} onPress={onCloseSupport} disabled={isGrantingSupport} activeOpacity={0.7}>
                <Ionicons name="close" size={19} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            {supportTarget ? (
              <View style={styles.supportProjectCard}>
                <View style={styles.supportProjectInfo}>
                  <Text style={styles.supportProjectLabel}>HEDEF PROJE</Text>
                  <Text style={styles.supportProjectTitle} numberOfLines={1}>{supportTarget.title}</Text>
                  <Text style={styles.supportProjectTagline} numberOfLines={1}>{supportTarget.tagline || 'Dijital Proje'}</Text>
                </View>
                <View style={styles.supportCurrentBadge}>
                  <Text style={styles.supportCurrentLabel}>MEVCUT DESTEK</Text>
                  <Text style={styles.supportCurrentVal}>▲ {formatNumber(supportTarget.upvotesCount)}</Text>
                </View>
              </View>
            ) : null}

            {supportModalError ? (
              <View style={styles.categoryModalErrorBox}>
                <Ionicons name="alert-circle" size={17} color="#B83D57" />
                <Text style={styles.categoryModalErrorText}>{supportModalError}</Text>
              </View>
            ) : null}

            <ScrollView style={styles.supportModalScroll} contentContainerStyle={styles.supportModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.supportChoicePanel}>
                <View style={styles.supportChoiceHeader}>
                  <View>
                    <Text style={styles.supportSectionLabel}>DESTEK MİKTARI</Text>
                    <Text style={styles.supportSectionHint}>Hazır bir paket seçin veya özel değer girin.</Text>
                  </View>
                  <View style={styles.supportLimitBadge}><Text style={styles.supportLimitText}>1–100 PUAN</Text></View>
                </View>
                <View style={styles.supportPresetRow}>
                  {[1, 3, 5, 10, 25].map((amt) => {
                    const isSelected = !customSupportInput && supportAmount === amt;
                    return (
                      <TouchableOpacity
                        key={amt}
                        style={[styles.supportPresetPill, isSelected && styles.supportPresetPillActive]}
                        onPress={() => {
                          setSupportAmount(amt);
                          setCustomSupportInput('');
                          setSupportModalError(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.supportPresetAmount, isSelected && styles.supportPresetAmountActive]}>+{amt}</Text>
                        <Text style={[styles.supportPresetPillText, isSelected && styles.supportPresetPillTextActive]}>puan</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.supportCustomInputGroup}>
                  <Text style={styles.supportCustomLabel}>ÖZEL MİKTAR</Text>
                  <View style={[styles.supportInputWrap, Boolean(customSupportInput) && styles.supportInputWrapActive]}>
                    <Text style={styles.supportInputPrefix}>+</Text>
                    <TextInput
                      style={styles.supportTextInput}
                      placeholder="Örn. 12"
                      placeholderTextColor="#98A2B3"
                      keyboardType="number-pad"
                      value={customSupportInput}
                      onChangeText={(val) => {
                        setCustomSupportInput(val.replace(/[^0-9]/g, ''));
                        setSupportModalError(null);
                      }}
                    />
                    <Text style={styles.supportInputSuffix}>DESTEK PUANI</Text>
                  </View>
                </View>
              </View>

              <View style={styles.supportModalActions}>
                <TouchableOpacity style={styles.supportModalCancelBtn} onPress={onCloseSupport} disabled={isGrantingSupport} activeOpacity={0.75}>
                  <Text style={styles.supportModalCancelText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.supportModalConfirmBtn} onPress={handleConfirmSupport} disabled={isGrantingSupport} activeOpacity={0.8}>
                  {isGrantingSupport ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                    <>
                      <Text style={styles.supportModalConfirmText}>Desteği Tanımla</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. GÖRÜNÜRLÜK ARTTIRMA MODALI */}
      <Modal
        visible={Boolean(viewsTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => !isGrantingViews && onCloseViews()}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.supportModalBox}>
            <LinearGradient colors={['#0F2B5C', '#1D4ED8', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.supportModalHeader}>
              <View style={styles.supportModalGlow} />
              <View style={styles.supportModalHeaderCopy}>
                <View style={styles.supportSecretPill}>
                  <View style={styles.supportSecretDot} />
                  <Text style={styles.supportSecretPillText}>KISTAS GÖRÜNÜRLÜK YÖNETİMİ</Text>
                </View>
                <Text style={styles.supportModalTitle}>Görünürlük Tanımla</Text>
                <Text style={styles.supportModalSubtitle}>Projeye eklenecek görüntülenme sayısını belirleyin.</Text>
              </View>
              <TouchableOpacity style={styles.categoryModalCloseBtn} onPress={onCloseViews} disabled={isGrantingViews} activeOpacity={0.7}>
                <Ionicons name="close" size={19} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            {viewsTarget ? (
              <View style={styles.supportProjectCard}>
                <View style={styles.supportProjectInfo}>
                  <Text style={styles.supportProjectLabel}>HEDEF PROJE</Text>
                  <Text style={styles.supportProjectTitle} numberOfLines={1}>{viewsTarget.title}</Text>
                  <Text style={styles.supportProjectTagline} numberOfLines={1}>{viewsTarget.tagline || 'Dijital Proje'}</Text>
                </View>
                <View style={styles.supportCurrentBadge}>
                  <Text style={styles.supportCurrentLabel}>MEVCUT GÖRÜNÜRLÜK</Text>
                  <Text style={styles.supportCurrentVal}>👁️ {formatNumber(viewsTarget.viewCount)}</Text>
                </View>
              </View>
            ) : null}

            {viewModalError ? (
              <View style={styles.categoryModalErrorBox}>
                <Ionicons name="alert-circle" size={17} color="#B83D57" />
                <Text style={styles.categoryModalErrorText}>{viewModalError}</Text>
              </View>
            ) : null}

            <ScrollView style={styles.supportModalScroll} contentContainerStyle={styles.supportModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.supportChoicePanel}>
                <View style={styles.supportChoiceHeader}>
                  <View>
                    <Text style={styles.supportSectionLabel}>GÖRÜNÜRLÜK MİKTARI</Text>
                    <Text style={styles.supportSectionHint}>Hazır bir paket seçin veya özel değer girin.</Text>
                  </View>
                  <View style={styles.supportLimitBadge}><Text style={styles.supportLimitText}>1–100.000</Text></View>
                </View>
                <View style={styles.supportPresetRow}>
                  {[50, 100, 250, 500, 1000].map((amt) => {
                    const isSelected = !customViewInput && viewAmount === amt;
                    return (
                      <TouchableOpacity
                        key={amt}
                        style={[styles.supportPresetPill, isSelected && styles.supportPresetPillActive]}
                        onPress={() => {
                          setViewAmount(amt);
                          setCustomViewInput('');
                          setViewModalError(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.supportPresetAmount, isSelected && styles.supportPresetAmountActive]}>+{amt}</Text>
                        <Text style={[styles.supportPresetPillText, isSelected && styles.supportPresetPillTextActive]}>görüntülenme</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.supportCustomInputGroup}>
                  <Text style={styles.supportCustomLabel}>ÖZEL MİKTAR</Text>
                  <View style={[styles.supportInputWrap, Boolean(customViewInput) && styles.supportInputWrapActive]}>
                    <Text style={styles.supportInputPrefix}>+</Text>
                    <TextInput
                      style={styles.supportTextInput}
                      placeholder="Örn. 350"
                      placeholderTextColor="#98A2B3"
                      keyboardType="number-pad"
                      value={customViewInput}
                      onChangeText={(val) => {
                        setCustomViewInput(val.replace(/[^0-9]/g, ''));
                        setViewModalError(null);
                      }}
                    />
                    <Text style={styles.supportInputSuffix}>GÖRÜNTÜLENME</Text>
                  </View>
                </View>
              </View>

              <View style={styles.supportModalActions}>
                <TouchableOpacity style={styles.supportModalCancelBtn} onPress={onCloseViews} disabled={isGrantingViews} activeOpacity={0.75}>
                  <Text style={styles.supportModalCancelText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.supportModalConfirmBtn} onPress={handleConfirmViews} disabled={isGrantingViews} activeOpacity={0.8}>
                  {isGrantingViews ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                    <>
                      <Text style={styles.supportModalConfirmText}>Görünürlüğü Tanımla</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. REVİZYON TALEBİ MODALI */}
      <Modal
        visible={Boolean(revisionTarget)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onCloseRevision}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.commandDialog}>
            <LinearGradient colors={['#76510D', '#B98916', '#D8A52A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dialogHero}>
              <View style={styles.dialogHeroGlow} />
              <View style={styles.dialogHeroIcon}><Ionicons name="construct-outline" size={27} color="#FFFFFF" /></View>
              <View style={styles.dialogHeroCopy}>
                <Text style={styles.dialogHeroEyebrow}>PROJE İNCELEMESİ</Text>
                <Text style={styles.dialogHeroTitle}>Düzeltme isteyin</Text>
              </View>
            </LinearGradient>
            <View style={styles.dialogBody}>
              <Text style={styles.revisionProjectName} numberOfLines={1}>{revisionTarget?.title}</Text>
              <Text style={styles.revisionHelper}>Eksik veya geliştirilmesi gereken noktaları açıkça belirtin. Bu not kullanıcının bildirimlerine gönderilecektir.</Text>
              <View style={[styles.revisionInputShell, revisionError ? styles.revisionInputShellError : null]}>
                <TextInput
                  value={revisionFeedback}
                  onChangeText={(val) => {
                    setRevisionFeedback(val);
                    if (revisionError) setRevisionError(null);
                  }}
                  placeholder="Örn. Logo çözünürlüğünü yükseltin ve en az üç vitrin görseli ekleyin."
                  placeholderTextColor="#9A958A"
                  multiline
                  maxLength={1200}
                  textAlignVertical="top"
                  style={styles.revisionInput}
                  editable={!isRequestingRevision}
                  autoFocus={Platform.OS === 'web'}
                />
                <Text style={styles.revisionCounter}>{revisionFeedback.trim().length}/1200</Text>
              </View>
              {revisionError ? (
                <View style={styles.revisionErrorRow}>
                  <Ionicons name="alert-circle-outline" size={15} color="#A9334E" />
                  <Text style={styles.revisionErrorText}>{revisionError}</Text>
                </View>
              ) : null}
              <View style={styles.dialogActions}>
                <TouchableOpacity style={styles.dialogSecondaryButton} onPress={onCloseRevision} disabled={isRequestingRevision} activeOpacity={0.75}>
                  <Text style={styles.dialogSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dialogPrimaryButton, styles.revisionSubmitButton]} onPress={handleConfirmRevision} disabled={isRequestingRevision} activeOpacity={0.75}>
                  {isRequestingRevision ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send-outline" size={17} color="#FFFFFF" />}
                  <Text style={styles.revisionSubmitText}>{isRequestingRevision ? 'Gönderiliyor' : 'Kullanıcıya Gönder'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. PROJE SİLME ONAY MODALI */}
      <Modal
        visible={Boolean(deleteTarget)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !isDeleting && onCloseDelete()}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.commandDialog}>
            <LinearGradient colors={['#7E263C', '#B83D57', '#D96772']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dialogHero}>
              <View style={styles.dialogHeroGlow} />
              <View style={styles.dialogHeroIcon}><Ionicons name="trash-outline" size={27} color="#FFFFFF" /></View>
              <View style={styles.dialogHeroCopy}>
                <Text style={styles.dialogHeroEyebrow}>KALICI İŞLEM</Text>
                <Text style={styles.dialogHeroTitle}>Projeyi sil?</Text>
              </View>
            </LinearGradient>
            <View style={styles.dialogBody}>
              <View style={styles.dialogNotice}>
                <View style={styles.dialogNoticeMark}><Ionicons name="alert" size={14} color="#B83D57" /></View>
                <Text style={styles.dialogMessage}>
                  {deleteTarget ? `“${deleteTarget.title}” kalıcı olarak silinecek. Bu işlem geri alınamaz.` : ''}
                </Text>
              </View>
              <View style={styles.dialogActions}>
                <TouchableOpacity style={styles.dialogSecondaryButton} onPress={onCloseDelete} disabled={isDeleting} activeOpacity={0.75}>
                  <Text style={styles.dialogSecondaryText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dialogPrimaryButton, styles.dialogDeleteButton]} onPress={handleConfirmDelete} disabled={isDeleting} activeOpacity={0.75}>
                  {isDeleting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="trash-outline" size={17} color="#FFFFFF" />}
                  <Text style={styles.dialogDeleteText}>{isDeleting ? 'Siliniyor' : 'Kalıcı Olarak Sil'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
