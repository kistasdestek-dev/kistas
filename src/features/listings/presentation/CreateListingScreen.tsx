import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { kistasStyle, theme } from '../../../core/theme';
import { Button } from '../../../shared/components/Button';
import { BorderBeam } from '../../../shared/components/BorderBeam';
import { KistasTopBrandBar } from '../../../shared/components/KistasTopBrandBar';
import { AutoTransparentLogo } from '../../../shared/components/AutoTransparentLogo';
import { Listing, PlatformType, PricingModel } from '../domain/Listing';
import { ListingService } from '../application/ListingService';
import { CategoryService } from '../../categories/application/CategoryService';
import { useLoadingActions } from '../../../core/state';
import { Category } from '../../categories/domain/Category';
import { CategoryPicker } from './CategoryPicker';
import { R2StorageService } from '../../../core/storage/R2StorageService';

interface CreateListingScreenProps {
  onSuccess?: (listingId: string) => void;
  editingListing?: Listing | null;
  onCancel?: () => void;
}

const NEO = kistasStyle.neumorphism;
const neoRaised = {
  backgroundColor: NEO.surface,
  borderWidth: 1,
  borderColor: NEO.border,
  ...Platform.select({
    web: { boxShadow: '-7px -7px 16px rgba(255,255,255,0.9), 8px 9px 20px rgba(130,146,168,0.18)' },
    default: { shadowColor: NEO.shadow, shadowOffset: { width: 6, height: 8 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 4 },
  }),
} satisfies ViewStyle;
const neoInset = {
  backgroundColor: '#EAF0F7',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.88)',
  ...Platform.select({ web: { boxShadow: 'inset 3px 3px 8px rgba(130,146,168,0.13), inset -3px -3px 8px rgba(255,255,255,0.86)' } }),
} satisfies ViewStyle;

const AVAILABLE_PLATFORMS: { id: PlatformType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'iOS', label: 'iOS / iPhone', icon: 'logo-apple' },
  { id: 'Android', label: 'Android', icon: 'logo-android' },
  { id: 'Web', label: 'Web / SaaS', icon: 'globe-outline' },
  { id: 'macOS', label: 'macOS', icon: 'desktop-outline' },
];

const FormSection: React.FC<React.PropsWithChildren<{ number: string; title: string; caption: string; borderBeam?: boolean }>> = ({ number, title, caption, borderBeam = false, children }) => {
  const content = (
    <View style={[styles.sectionCard, borderBeam && styles.sectionCardWithBeam]}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionNumber}>{number}</Text>
      <View style={styles.sectionHeading}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCaption}>{caption}</Text>
      </View>
    </View>
    {children}
    </View>
  );

  if (!borderBeam) return content;

  return (
    <View style={styles.sectionBeamShell}>
      <BorderBeam
        duration={9}
        size={190}
        borderWidth={1.4}
        borderRadius={24}
        colorVariant="kistas"
      >
        {content}
      </BorderBeam>
    </View>
  );
};

const PRICING_MODELS: { id: PricingModel; label: string }[] = [
  { id: 'free', label: 'Ücretsiz' },
  { id: 'freemium', label: 'Freemium' },
  { id: 'subscription', label: 'Abonelik' },
  { id: 'paid', label: 'Ücretli' },
];

interface FormErrors {
  title?: string;
  tagline?: string;
  categoryId?: string;
  logoUrl?: string;
  links?: string;
  screenshots?: string;
  description?: string;
}

export const CreateListingScreen: React.FC<CreateListingScreenProps> = ({ onSuccess, editingListing, onCancel }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionSelection, setDescriptionSelection] = useState({ start: 0, end: 0 });
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>(['iOS']);
  const [pricingModel, setPricingModel] = useState<PricingModel>('freemium');
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [playStoreUrl, setPlayStoreUrl] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isSubmittingRef = useRef(false);

  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [showcaseCover, setShowcaseCover] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);

  const applyDescriptionFormat = (format: 'bold' | 'h1' | 'h2') => {
    const { start, end } = descriptionSelection;
    let nextDescription = description;
    let nextSelection = descriptionSelection;

    if (format === 'bold') {
      const selectedText = description.slice(start, end) || 'kalın metin';
      const replacement = `**${selectedText}**`;
      nextDescription = `${description.slice(0, start)}${replacement}${description.slice(end)}`;
      nextSelection = { start: start + 2, end: start + 2 + selectedText.length };
    } else {
      const lineStart = description.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const lineEndIndex = description.indexOf('\n', start);
      const lineEnd = lineEndIndex === -1 ? description.length : lineEndIndex;
      const currentLine = description.slice(lineStart, lineEnd).replace(/^#{1,2}\s+/, '');
      const prefix = format === 'h1' ? '# ' : '## ';
      const lineContent = currentLine || (format === 'h1' ? 'Başlık' : 'Alt başlık');
      const replacement = `${prefix}${lineContent}`;
      nextDescription = `${description.slice(0, lineStart)}${replacement}${description.slice(lineEnd)}`;
      nextSelection = {
        start: lineStart + prefix.length,
        end: lineStart + replacement.length,
      };
    }

    if (nextDescription.length > 6000) return;
    setDescription(nextDescription);
    setDescriptionSelection(nextSelection);
    descriptionInputRef.current?.focus();
    if (errors.description) setErrors((current) => ({ ...current, description: undefined }));
  };

  const [errors, setErrors] = useState<FormErrors>({});
  const isEditing = Boolean(editingListing);
  const isRevision = editingListing?.status === 'inactive';

  useEffect(() => {
    if (!editingListing) return;
    setTitle(editingListing.title || '');
    setTagline(editingListing.tagline || '');
    setDescription(editingListing.description || '');
    setCategoryId(editingListing.categoryId || null);
    setSelectedPlatforms(editingListing.platforms?.length ? editingListing.platforms : ['iOS']);
    setPricingModel(editingListing.pricingModel || 'freemium');
    setAppStoreUrl(editingListing.appStoreUrl || '');
    setPlayStoreUrl(editingListing.playStoreUrl || '');
    setWebUrl(editingListing.webUrl || '');
    setPromoCode(editingListing.promoCode || '');
    setLogoUrl(editingListing.logoUrl || '');
    setScreenshots(
      [...(editingListing.images || [])]
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((image) => image.imageUrl)
    );
    setShowcaseCover(editingListing.coverImageUrl || '');
    setErrors({});
    setIsSubmitted(false);
    isSubmittingRef.current = false;
  }, [editingListing]);

  useEffect(() => {
    let isMounted = true;

    CategoryService.getProjectCategories()
      .then((items) => {
        if (!isMounted) return;
        setCategories(items);
        setCategoryId((current) => current || items[0]?.id || null);
        setCategoryError(items.length > 0 ? null : 'Yayınlanabilir kategori bulunamadı.');
      })
      .catch(() => {
        if (!isMounted) return;
        setCategories([]);
        setCategoryId(null);
        setCategoryError('Kategoriler yüklenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingCategories(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const togglePlatform = (p: PlatformType) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length === 1) {
        Alert.alert('Uyarı', 'En az bir hedef platform seçilmelidir.');
        return;
      }
      setSelectedPlatforms(selectedPlatforms.filter((item) => item !== p));
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const handlePickAndUploadLogo = async () => {
    try {
      const files = await R2StorageService.pickImage(false);
      if (!files || files.length === 0) return;
      const file = files[0];

      // Tarayıcı/mobil üzerinde anında yerel önizleme oluştur
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        const localPreview = URL.createObjectURL(file);
        setLogoUrl(localPreview);
      }

      setIsUploadingLogo(true);
      const res = await R2StorageService.uploadFile(file, 'logos');
      setIsUploadingLogo(false);

      if (res.success && res.url) {
        setLogoUrl(res.url);
        setErrors((prev) => ({ ...prev, logoUrl: undefined }));
      } else {
        Alert.alert('Yükleme Hatası', res.error || 'Logo yüklenemedi. Lütfen tekrar deneyiniz.');
      }
    } catch (err: any) {
      setIsUploadingLogo(false);
      Alert.alert('Hata', err?.message || 'Görsel seçilirken veya yüklenirken bir sorun oluştu.');
    }
  };

  const handlePickAndUploadScreenshots = async () => {
    if (screenshots.length >= 6) {
      Alert.alert('Limit', 'En fazla 6 adet ekran görüntüsü ekleyebilirsiniz.');
      return;
    }
    try {
      const files = await R2StorageService.pickImage(true);
      if (!files || files.length === 0) return;
      const remaining = 6 - screenshots.length;
      const toUpload = files.slice(0, remaining);

      // Anında yerel önizlemeleri oluştur
      const localPreviews: string[] = [];
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        for (const file of toUpload) {
          localPreviews.push(URL.createObjectURL(file));
        }
      }

      const startIndex = screenshots.length;
      if (localPreviews.length > 0) {
        setScreenshots((prev) => [...prev, ...localPreviews]);
        setErrors((prev) => ({ ...prev, screenshots: undefined }));
      }

      setIsUploadingScreenshots(true);
      let lastError = '';

      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        const res = await R2StorageService.uploadFile(file, 'vitrin');
        if (res.success && res.url) {
          if (localPreviews.length > 0) {
            setScreenshots((prev) => {
              const copy = [...prev];
              copy[startIndex + i] = res.url!;
              return copy;
            });
          } else {
            setScreenshots((prev) => [...prev, res.url!]);
          }
          setErrors((prev) => ({ ...prev, screenshots: undefined }));
        } else if (res.error) {
          lastError = res.error;
        }
      }
      setIsUploadingScreenshots(false);

      if (lastError) {
        Alert.alert('Uyarı', lastError);
      }
    } catch (err: any) {
      setIsUploadingScreenshots(false);
      Alert.alert('Hata', err?.message || 'Görseller yüklenirken bir sorun oluştu.');
    }
  };

  const handleRemoveScreenshot = (idx: number) => {
    if (screenshots[idx] === showcaseCover) setShowcaseCover('');
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadShowcaseCover = async () => {
    if (coverUploading) return;
    setCoverUploading(true);
    setCoverError('');
    try {
      const files = await R2StorageService.pickImage(false);
      if (!files?.length) return;
      const result = await R2StorageService.uploadFile(files[0], 'vitrin');
      if (!result.success || !result.url) throw new Error(result.error || 'Kapak yüklenemedi.');
      setShowcaseCover(result.url);
    } catch (error: any) {
      setCoverError(error?.message || 'Kapak yüklenemedi.');
    } finally {
      setCoverUploading(false);
    }
  };

  const { withLoading } = useLoadingActions();

  const validateForm = (): FormErrors => {
    const errs: FormErrors = {};
    if (!title.trim()) {
      errs.title = 'Uygulama / proje adı zorunludur.';
    }
    if (!tagline.trim()) {
      errs.tagline = 'Projenizi anlatan kısa bir slogan (tagline) zorunludur.';
    }
    if (!categoryId) {
      errs.categoryId = categoryError || 'Lütfen projeniz için bir kategori seçiniz.';
    }
    if (!logoUrl) {
      errs.logoUrl = 'Projeniz için bir logo yüklemeniz gerekmektedir.';
    }
    if (!appStoreUrl.trim() && !playStoreUrl.trim() && !webUrl.trim()) {
      errs.links = 'En az bir bağlantı (App Store, Play Store veya Web) giriniz.';
    }
    if (screenshots.length === 0) {
      errs.screenshots = 'Vitrinde sergilenmek üzere en az 1 adet ekran görüntüsü yükleyiniz.';
    }
    if (!description.trim()) {
      errs.description = 'Projenizin detaylı hikayesini ve özelliklerini anlatan açıklama zorunludur.';
    } else if (description.length > 6000) {
      errs.description = 'Açıklama en fazla 6000 karakter olabilir.';
    }
    return errs;
  };

  const handleSubmit = async () => {
    // Üst üste birden fazla kez tıklamayı ve mükerrer form gönderimini engelle
    if (loading || isSubmitted || isSubmittingRef.current) return;

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      Alert.alert(
        'Eksik Bilgiler Mevcut',
        'Lütfen kırmızı çerçeve ile işaretlenen zorunlu alanları eksiksiz doldurunuz.'
      );
      return;
    }
    setErrors({});

    // Anında kilidi aktif et (senkron koruma)
    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const listingPayload = {
          title: title.trim(),
          tagline: tagline.trim(),
          description: description.trim(),
          categoryId: categoryId!,
          logoUrl,
          platforms: selectedPlatforms,
          pricingModel,
          appStoreUrl: appStoreUrl.trim() || undefined,
          playStoreUrl: playStoreUrl.trim() || undefined,
          webUrl: webUrl.trim() || undefined,
          promoCode: promoCode.trim() || undefined,
          imageUrls: Array.from(new Set([showcaseCover, ...screenshots].filter(Boolean))),
        };
      const request = editingListing
        ? ListingService.updateUserListing(editingListing.id, listingPayload)
        : ListingService.createListing(listingPayload);
      const res = await withLoading(
        request,
        {
          message: isRevision ? 'Düzeltmeler Gönderiliyor...' : isEditing ? 'Proje Güncelleniyor...' : 'Lansman Hazırlanıyor...',
          submessage: isEditing ? 'Değişiklikler yeniden yönetici onayına sunuluyor' : 'Projeniz yönetici onayına sunuluyor',
          delayMs: 100,
        }
      );

      if (res.success && res.listingId) {
        setIsSubmitted(true);
        // Form bir kere başarıyla gönderildi, kilit açık kalır
        Alert.alert(
          isRevision ? 'Düzeltmeler İncelemeye Gönderildi' : isEditing ? 'Proje Güncellendi' : 'Lansmanınız Onaya Gönderildi',
          isEditing
            ? 'Değişiklikleriniz kaydedildi ve proje yeniden incelemeye gönderildi.'
            : 'Projeniz başarıyla kaydedildi ve yönetici onayına sunuldu.'
        );
        onSuccess?.(res.listingId);
      } else {
        // Hata durumunda tekrar denemeye izin ver
        isSubmittingRef.current = false;
        setLoading(false);
        Alert.alert('Hata', res.error || 'Proje yayınlanamadı.');
      }
    } catch (err: any) {
      isSubmittingRef.current = false;
      setLoading(false);
      Alert.alert('Hata', err?.message || 'Lansman gönderilirken bir hata oluştu.');
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      decelerationRate={0.99}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <KistasTopBrandBar />
      <View style={styles.intro}>
        <View style={styles.eyebrowRow}>
          <Ionicons name="sparkles-outline" size={14} color="#3269C7" />
          <Text style={styles.pageEyebrow}>{isEditing ? 'KISTAS · PROJE DÜZENLE' : 'KISTAS · LANSMAN'}</Text>
        </View>
        <Text accessibilityRole="header" style={styles.pageTitle}>
          {isEditing ? 'Projeni güncel ve güçlü tut.' : 'Keşfedilmeye hazır mısın?'}
        </Text>
        {isEditing && onCancel ? (
          <TouchableOpacity style={styles.cancelEditButton} onPress={onCancel} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={15} color="#686474" />
            <Text style={styles.cancelEditText}>Düzenlemeden çık</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.introMeta}>
          <Text style={styles.introMetaText}>PROJE BİLGİLERİ</Text>
          <Text style={styles.introMetaText}>* Zorunlu alanlar</Text>
        </View>

        {Object.keys(errors).length > 0 ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#a02e2e" />
            <Text style={styles.errorBannerText}>
              Lütfen aşağıda kırmızı ile işaretlenen zorunlu alanları doldurunuz ({Object.keys(errors).length} eksik alan).
            </Text>
          </View>
        ) : null}
      </View>

      <FormSection number="01" title="Projenin kimliği" caption="İlk izlenim, iyi bir isim ve güçlü bir ikonla başlar.">
        <View style={styles.logoRow}>
          <TouchableOpacity
            style={[styles.logoPickerBox, errors.logoUrl && styles.inputBoxError]}
            onPress={handlePickAndUploadLogo}
            disabled={isUploadingLogo}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Logo seç veya değiştir"
          >
            {logoUrl ? (
              <AutoTransparentLogo
                src={logoUrl}
                alt="Yüklenen proje logosu önizlemesi"
                style={styles.logoPreview}
              />
            ) : (
              <View style={styles.logoEmptyPlaceholder}>
                <Ionicons name="image-outline" size={30} color={errors.logoUrl ? '#a02e2e' : '#3269C7'} />
                <Text style={[styles.logoEmptyText, errors.logoUrl && { color: '#a02e2e' }]}>Logo Yok</Text>
              </View>
            )}
            <View style={styles.logoEditBadge}>
              <Ionicons name="camera" size={12} color="#25364E" />
            </View>
          </TouchableOpacity>

          <View style={styles.logoCol}>
            <Text style={styles.label}>Proje Logosu *</Text>
            <TouchableOpacity
              style={[
                styles.uploadActionBtn,
                isUploadingLogo && styles.uploadActionBtnDisabled,
                errors.logoUrl && styles.inputBoxError,
              ]}
              onPress={handlePickAndUploadLogo}
              disabled={isUploadingLogo}
              activeOpacity={0.8}
            >
              {isUploadingLogo ? (
                <>
                  <ActivityIndicator size="small" color="#3269C7" />
                  <Text style={styles.uploadActionBtnText}>R2'ye Yükleniyor…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#3269C7" />
                  <Text style={styles.uploadActionBtnText}>
                    {logoUrl ? 'Logoyu Değiştir (PC / Mobil)' : 'Cihazdan Logo Yükle'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {errors.logoUrl ? (
              <View style={styles.fieldErrorRow}>
                <Ionicons name="alert-circle" size={13} color="#a02e2e" />
                <Text style={styles.fieldErrorText}>{errors.logoUrl}</Text>
              </View>
            ) : (
              <Text style={styles.sectionCaption}>
                Doğrudan cihazınızdan kare logo seçin (PNG, JPG, WEBP). Maks. 10 MB.
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.label}>Uygulama / Proje Adı *</Text>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          value={title}
          onChangeText={(val) => {
            setTitle(val);
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          placeholder="Örn: Kıstas"
          placeholderTextColor={theme.colors.neutral[400]}
          maxLength={60}
        />
        {errors.title ? (
          <View style={styles.fieldErrorRow}>
            <Ionicons name="alert-circle" size={13} color="#a02e2e" />
            <Text style={styles.fieldErrorText}>{errors.title}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Tek cümlede projen *</Text>
        <TextInput
          style={[styles.input, errors.tagline && styles.inputError]}
          placeholder="Örn: Yapay zeka ile kişisel bütçe ve harcama asistanı"
          placeholderTextColor={theme.colors.neutral[400]}
          value={tagline}
          onChangeText={(val) => {
            setTagline(val);
            if (errors.tagline) setErrors((prev) => ({ ...prev, tagline: undefined }));
          }}
          maxLength={120}
        />
        {errors.tagline ? (
          <View style={styles.fieldErrorRow}>
            <Ionicons name="alert-circle" size={13} color="#a02e2e" />
            <Text style={styles.fieldErrorText}>{errors.tagline}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Kategori *</Text>
        {isLoadingCategories ? (
          <Text style={styles.categoryStatus}>Kategoriler hazırlanıyor…</Text>
        ) : categoryError ? (
          <Text style={styles.categoryError}>{categoryError}</Text>
        ) : (
          <CategoryPicker
            categories={categories}
            value={categoryId}
            onChange={(val) => {
              setCategoryId(val);
              if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: undefined }));
            }}
          />
        )}
        {errors.categoryId ? (
          <View style={styles.fieldErrorRow}>
            <Ionicons name="alert-circle" size={13} color="#a02e2e" />
            <Text style={styles.fieldErrorText}>{errors.categoryId}</Text>
          </View>
        ) : null}
      </FormSection>

      <FormSection number="02" title="Platform ve erişim" caption="Projen nerede çalışıyor, nasıl sunuluyor?">
        <Text style={styles.label}>Desteklenen Platformlar (Çoklu Seçim)</Text>
        <View style={styles.platformRow}>
          {AVAILABLE_PLATFORMS.map((p) => {
            const isSelected = selectedPlatforms.includes(p.id);
            return (
              <TouchableOpacity key={p.id} accessibilityRole="checkbox" accessibilityState={{ checked: isSelected }} style={[styles.platformPill, isSelected && styles.platformPillActive]} onPress={() => togglePlatform(p.id)}>
                <Ionicons name={p.icon} size={18} color={isSelected ? '#25364E' : '#25364E'} />
                <Text style={[styles.platformPillText, isSelected && styles.platformPillTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Fiyatlandırma Modeli</Text>
        <View style={styles.pricingRow}>
          {PRICING_MODELS.map((m) => {
            const isSelected = pricingModel === m.id;
            return (
              <TouchableOpacity key={m.id} accessibilityRole="radio" accessibilityState={{ checked: isSelected }} style={[styles.pricingChip, isSelected && styles.pricingChipActive]} onPress={() => setPricingModel(m.id)}>
                <Text style={[styles.pricingChipText, isSelected && styles.pricingChipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </FormSection>

      <FormSection number="03" title="Bağlantılar *" caption="En az bir mağaza veya web bağlantısı ekle.">
        {errors.links ? (
          <View style={styles.fieldErrorRow}>
            <Ionicons name="alert-circle" size={13} color="#a02e2e" />
            <Text style={styles.fieldErrorText}>{errors.links}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>App Store Bağlantısı (iOS)</Text>
        <TextInput
          style={[styles.input, errors.links && styles.inputError]}
          placeholder="https://apps.apple.com/app/..."
          placeholderTextColor={theme.colors.neutral[400]}
          value={appStoreUrl}
          onChangeText={(val) => {
            setAppStoreUrl(val);
            if (errors.links) setErrors((prev) => ({ ...prev, links: undefined }));
          }}
          autoCapitalize="none"
        />
        <Text style={styles.label}>Google Play Store Bağlantısı (Android)</Text>
        <TextInput
          style={[styles.input, errors.links && styles.inputError]}
          placeholder="https://play.google.com/store/apps/details?id=..."
          placeholderTextColor={theme.colors.neutral[400]}
          value={playStoreUrl}
          onChangeText={(val) => {
            setPlayStoreUrl(val);
            if (errors.links) setErrors((prev) => ({ ...prev, links: undefined }));
          }}
          autoCapitalize="none"
        />
        <Text style={styles.label}>Web Sitesi / Landing Page URL</Text>
        <TextInput
          style={[styles.input, errors.links && styles.inputError]}
          placeholder="https://projeniz.com"
          placeholderTextColor={theme.colors.neutral[400]}
          value={webUrl}
          onChangeText={(val) => {
            setWebUrl(val);
            if (errors.links) setErrors((prev) => ({ ...prev, links: undefined }));
          }}
          autoCapitalize="none"
        />
        <Text style={styles.label}>Kıstas Özel Promosyon / Beta Kodu (Opsiyonel)</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn: KISTAS50 (Kullanıcılara ilk ay %50 indirim)"
          placeholderTextColor={theme.colors.neutral[400]}
          value={promoCode}
          onChangeText={setPromoCode}
          autoCapitalize="characters"
        />
      </FormSection>

      <FormSection
        number="04"
        title="Projenin vitrini *"
        caption={`${screenshots.length} / 6 ekran görüntüsü`}
      >
        <Text style={styles.sectionTitle}>Vitrin kapağı</Text>
        {(showcaseCover || screenshots[0]) ? <Image source={{ uri: showcaseCover || screenshots[0] }} style={styles.showcaseCoverPreview} resizeMode="cover" /> : null}
        <TouchableOpacity style={styles.uploadActionBtn} onPress={uploadShowcaseCover} disabled={coverUploading || isUploadingScreenshots} accessibilityRole="button" accessibilityLabel="Vitrin kapağı yükle">
          {coverUploading ? <ActivityIndicator color="#3269C7" /> : <Ionicons name="image-outline" size={20} color="#3269C7" />}
          <Text style={styles.sectionCaption}>{coverUploading ? 'Yükleniyor' : 'Vitrin Kapağı Yükle'}</Text>
        </TouchableOpacity>
        <Text style={[styles.sectionCaption, { marginVertical: 12 }]}>Önerilen oran 4:5. Kapak seçilmezse ilk fotoğraf kullanılır.</Text>
        {coverError ? <Text accessibilityRole="alert" style={styles.fieldErrorText}>{coverError}</Text> : null}
        {errors.screenshots ? (
          <View style={styles.fieldErrorRow}>
            <Ionicons name="alert-circle" size={13} color="#a02e2e" />
            <Text style={styles.fieldErrorText}>{errors.screenshots}</Text>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.screenshotRow}>
          {screenshots.map((uri, idx) => (
            <View key={idx} style={styles.screenshotItem}>
              <Image source={{ uri }} style={styles.screenshotImg} resizeMode="cover" />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${idx + 1}. görseli kaldır`}
                style={styles.deleteBadge}
                onPress={() => handleRemoveScreenshot(idx)}
              >
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={idx === 0 ? 'Seçili vitrin görseli' : `${idx + 1}. fotoğrafı vitrin görseli yap`}
                accessibilityState={{ selected: uri === (showcaseCover || screenshots[0]) }}
                style={styles.coverBadge}
                disabled={isUploadingScreenshots}
                onPress={() => setShowcaseCover(uri)}
              >
                <Text style={styles.coverText}>{uri === (showcaseCover || screenshots[0]) ? 'VİTRİN GÖRSELİ' : 'VİTRİN GÖRSELİ YAP'}</Text>
              </TouchableOpacity>
            </View>
          ))}
          {screenshots.length < 6 && (
            <TouchableOpacity
              style={[
                styles.addScreenshotBtn,
                isUploadingScreenshots && { opacity: 0.6 },
                errors.screenshots && styles.screenshotBtnError,
              ]}
              onPress={handlePickAndUploadScreenshots}
              disabled={isUploadingScreenshots}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Vitrin görseli yükle"
            >
              {isUploadingScreenshots ? (
                <>
                  <ActivityIndicator size="small" color="#3269C7" />
                  <Text style={[styles.addScreenshotLabel, { marginTop: 6 }]}>Yükleniyor…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="images-outline" size={26} color={errors.screenshots ? '#a02e2e' : '#3269C7'} style={{ marginBottom: 6 }} />
                  <Text style={[styles.addScreenshotLabel, errors.screenshots && { color: '#a02e2e' }]}>Görsel Yükle</Text>
                  <Text style={styles.addScreenshotSub}>PC / Mobil</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </FormSection>

      <FormSection number="05" title="Hikâyeni anlat *" caption="Hangi sorunu çözüyorsun? Projeni özel yapan ne?" borderBeam>
        <View style={styles.formatToolbar} accessibilityRole="toolbar">
          <TouchableOpacity
            onPress={() => applyDescriptionFormat('h1')}
            style={styles.formatButton}
            accessibilityRole="button"
            accessibilityLabel="Başlık 1 ekle"
          >
            <Text style={styles.formatHeadingOne}>H1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => applyDescriptionFormat('h2')}
            style={styles.formatButton}
            accessibilityRole="button"
            accessibilityLabel="Başlık 2 ekle"
          >
            <Text style={styles.formatHeadingTwo}>H2</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => applyDescriptionFormat('bold')}
            style={styles.formatButton}
            accessibilityRole="button"
            accessibilityLabel="Metni kalınlaştır"
          >
            <Text style={styles.formatBold}>Kalın</Text>
          </TouchableOpacity>
          <Text style={styles.formatHint}>Metni seçip biçimlendirin</Text>
        </View>
        <TextInput
          ref={descriptionInputRef}
          style={[styles.input, styles.textArea, styles.descriptionEditorInput, errors.description && styles.inputError]}
          value={description}
          onChangeText={(val) => {
            setDescription(val);
            if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
          }}
          multiline
          numberOfLines={6}
          maxLength={6000}
          selection={descriptionSelection}
          onSelectionChange={({ nativeEvent }) => setDescriptionSelection(nativeEvent.selection)}
          textAlignVertical="top"
          placeholder="Projenizin hikayesi, hedef kitlesi ve sunduğu çözümler..."
          placeholderTextColor={theme.colors.neutral[400]}
        />
        {errors.description ? (
          <View style={styles.fieldErrorRow}>
            <Ionicons name="alert-circle" size={13} color="#a02e2e" />
            <Text style={styles.fieldErrorText}>{errors.description}</Text>
          </View>
        ) : null}
      </FormSection>

      <View style={styles.publishBlock}>
        <Text style={styles.publishTitle}>{isEditing ? 'Değişiklikleri kaydet' : 'Keşfedilmeye hazır mısın?'}</Text>
        <Text style={styles.pageSubtitle}>{isEditing ? 'Güncellenen proje yeniden incelemeye gönderilir.' : 'Bilgilerini son kez kontrol et ve projenle topluluğa katıl.'}</Text>
        <Button
          title={isSubmitted ? (isRevision ? 'İncelemeye Gönderildi' : isEditing ? 'Proje Güncellendi' : 'Lansman Gönderildi') : loading ? (isRevision ? 'Gönderiliyor…' : isEditing ? 'Güncelleniyor…' : 'Lansman Gönderiliyor…') : (isRevision ? 'Düzeltmeleri İncelemeye Gönder' : isEditing ? 'Değişiklikleri Kaydet' : 'Lansmanı Gönder')}
          showArrow={!loading && !isSubmitted}
          variant="primary"
          size="lg"
          isLoading={loading}
          disabled={isLoadingCategories || loading || isSubmitted || coverUploading || isUploadingScreenshots}
          onPress={handleSubmit}
          style={styles.submitBtn}
          tint={{
            surface: '#0FA336',
            border: '#0C8A2D',
            accent: '#FFFFFF',
            glow: 'rgba(15,163,54,0.28)',
          }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NEO.surface },
  content: { width: '100%', maxWidth: 780, alignSelf: 'center', padding: theme.spacing.lg, paddingTop: 24, paddingBottom: 136 },
  intro: { paddingHorizontal: 4, paddingBottom: 26 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  introMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 22 },
  introMetaText: { ...theme.typography.kistas, fontSize: 9.5, letterSpacing: 1, fontWeight: '700', color: '#64748B' },
  cancelEditButton: { ...neoRaised, alignSelf: 'flex-start', minHeight: 36, marginTop: 13, paddingHorizontal: 11, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  cancelEditText: { ...theme.typography.kistas, color: '#64748B', fontSize: 11.5, fontWeight: '700' },
  pageEyebrow: { ...theme.typography.kistas, fontSize: 9.5, letterSpacing: 1.25, fontWeight: '700', color: '#3269C7' },
  pageTitle: { ...theme.typography.kistas, maxWidth: 520, fontSize: 31, lineHeight: 37, letterSpacing: -1, fontWeight: '700', color: NEO.ink },
  pageSubtitle: { ...theme.typography.kistas, maxWidth: 510, fontSize: 13.5, color: '#64748B', marginTop: 8, lineHeight: 21 },
  sectionCard: { ...neoRaised, padding: 20, borderRadius: 24, marginBottom: 22 },
  sectionCardWithBeam: { marginBottom: 0 },
  sectionBeamShell: { marginBottom: 22, borderRadius: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 17, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(50,105,199,0.09)' },
  sectionHeading: { flex: 1 },
  sectionNumber: { ...theme.typography.kistas, color: NEO.ink, backgroundColor: NEO.global, overflow: 'hidden', borderRadius: 11, width: 34, height: 34, lineHeight: 34, textAlign: 'center', fontSize: 10, fontWeight: '700' },
  sectionTitle: { ...theme.typography.kistas, fontSize: 18, letterSpacing: -0.35, fontWeight: '700', color: NEO.ink, marginBottom: 4 },
  sectionCaption: { ...theme.typography.kistas, fontSize: 11.5, color: '#64748B', lineHeight: 17 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  logoPickerBox: { ...neoRaised, position: 'relative', width: 72, height: 72, borderRadius: 20, marginRight: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoPreview: { width: '100%', height: '100%', borderRadius: 18 },
  logoEmptyPlaceholder: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  logoEmptyText: { ...theme.typography.kistas, fontSize: 9, color: '#64748B', marginTop: 2, fontWeight: '600' },
  logoEditBadge: { position: 'absolute', bottom: 3, right: 3, width: 22, height: 22, borderRadius: 11, backgroundColor: '#F7FAFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(50,105,199,0.28)' },
  uploadActionBtn: { ...neoRaised, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F7FAFF', borderRadius: theme.radius.md, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8 },
  uploadActionBtnDisabled: { opacity: 0.6 },
  uploadActionBtnText: { ...theme.typography.kistas, color: NEO.ink, fontSize: 12.5, fontWeight: '700' },
  logoCol: { flex: 1, minWidth: 0 },
  addScreenshotSub: { ...theme.typography.kistas, fontSize: 9, color: '#3269C7', marginTop: 2, fontWeight: '600' },
  label: { ...theme.typography.kistas, fontSize: 11.5, fontWeight: '700', color: NEO.ink, marginBottom: 7, marginTop: 5 },
  categoryStatus: { ...theme.typography.kistas, color: '#64748B', fontSize: 12, paddingVertical: 12 },
  categoryError: { color: '#b42318', fontSize: 12, lineHeight: 18, paddingVertical: 10 },
  input: { ...neoInset, ...theme.typography.kistas, minWidth: 0, minHeight: 50, borderRadius: theme.radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: NEO.ink, marginBottom: 18 },
  textArea: { minHeight: 120 },
  descriptionEditorInput: { marginBottom: 8, lineHeight: 22 },
  formatToolbar: { minHeight: 42, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
  formatButton: { ...neoRaised, minWidth: 42, minHeight: 34, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  formatHeadingOne: { ...theme.typography.kistas, color: NEO.ink, fontSize: 15, fontWeight: '700' },
  formatHeadingTwo: { ...theme.typography.kistas, color: NEO.ink, fontSize: 13, fontWeight: '700' },
  formatBold: { ...theme.typography.kistas, color: NEO.ink, fontSize: 12, fontWeight: '700' },
  formatHint: { flexShrink: 1, color: '#7A8799', fontSize: 11.5, marginLeft: 3 },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md },
  platformPill: { ...neoInset, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, paddingHorizontal: 14, paddingVertical: 9, borderRadius: theme.radius.md },
  platformPillActive: { ...neoRaised, backgroundColor: NEO.global, borderColor: 'rgba(50,105,199,0.2)' },
  platformPillText: { ...theme.typography.kistas, fontSize: 11.5, color: '#64748B', fontWeight: '700' },
  platformPillTextActive: { color: NEO.ink },
  pricingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pricingChip: { ...neoInset, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.md },
  pricingChipActive: { ...neoRaised, backgroundColor: NEO.global, borderColor: 'rgba(50,105,199,0.2)' },
  pricingChipText: { ...theme.typography.kistas, fontSize: 11.5, color: '#64748B' },
  pricingChipTextActive: { color: NEO.ink, fontWeight: '700' },
  screenshotRow: { flexDirection: 'row', paddingVertical: 4 },
  screenshotItem: { position: 'relative', marginRight: 10 },
  screenshotImg: { width: 90, height: 150, borderRadius: 14, backgroundColor: NEO.surface, borderWidth: 1, borderColor: 'rgba(50,105,199,0.18)' },
  deleteBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255,255,255,0.75)', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#25364E', fontSize: 12, fontWeight: 'bold' },
  coverBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: '#EAF2FC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  coverText: { color: '#25364E', fontSize: 8, fontWeight: 'bold' },
  addScreenshotBtn: { ...neoInset, width: 90, height: 150, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(50,105,199,0.28)', alignItems: 'center', justifyContent: 'center' },
  addScreenshotLabel: { ...theme.typography.kistas, fontSize: 10, color: '#64748B', fontWeight: '700' },
  showcaseCoverPreview: { width: '100%', height: 220, borderRadius: 18, marginVertical: 12, borderWidth: 1, borderColor: 'rgba(50,105,199,0.16)' },
  submitBtn: { marginTop: theme.spacing.md },
  publishBlock: { ...neoRaised, padding: 20, marginTop: 4, borderRadius: 24 },
  publishTitle: { ...theme.typography.kistas, fontSize: 21, lineHeight: 27, fontWeight: '700', letterSpacing: -0.4, color: NEO.ink },
  inputError: {
    borderColor: '#a02e2e',
    borderWidth: 1.5,
    backgroundColor: 'rgba(160,46,46, 0.07)',
  },
  inputBoxError: {
    borderColor: '#a02e2e',
    borderWidth: 1.5,
  },
  screenshotBtnError: {
    borderColor: '#a02e2e',
    borderWidth: 1.5,
    backgroundColor: 'rgba(160,46,46, 0.06)',
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: -10,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  fieldErrorText: {
    fontSize: 11.5,
    color: '#a02e2e',
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(160,46,46, 0.12)',
    borderColor: 'rgba(160,46,46, 0.35)',
    borderWidth: 1,
    marginTop: 14,
  },
  errorBannerText: {
    color: '#a06969',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
});
