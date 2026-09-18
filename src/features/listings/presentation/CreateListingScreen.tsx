import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme, breakpoints } from '../../../core/theme';
import { CategoryStarsBanner } from '../../../shared/components/CategoryStarsBanner';
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
import { DescriptionRichText } from './DescriptionRichText';
import { CreateListingLivePreview } from './CreateListingLivePreview';
import { HoneypotDecoyField } from '../../security/presentation/HoneypotDecoyField';
import { HoneypotTrapService } from '../../security/application/HoneypotTrapService';
import { styles } from './CreateListingScreen.styles';

interface CreateListingScreenProps {
  onSuccess?: (listingId: string) => void;
  editingListing?: Listing | null;
  onCancel?: () => void;
}

const AVAILABLE_PLATFORMS: { id: PlatformType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'iOS', label: 'iOS / iPhone', icon: 'logo-apple' },
  { id: 'Android', label: 'Android', icon: 'logo-android' },
  { id: 'Web', label: 'Web / SaaS', icon: 'globe-outline' },
  { id: 'macOS', label: 'macOS', icon: 'desktop-outline' },
];

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

const FormSection: React.FC<React.PropsWithChildren<{ number: string; title: string; caption: string; borderBeam?: boolean }>> = ({
  number,
  title,
  caption,
  borderBeam = false,
  children,
}) => {
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

export const CreateListingScreen: React.FC<CreateListingScreenProps> = ({ onSuccess, editingListing, onCancel }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const isTabletOrDesktop = width > breakpoints.phoneMax;

  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionSelection, setDescriptionSelection] = useState({ start: 0, end: 0 });
  const [descriptionTab, setDescriptionTab] = useState<'write' | 'preview'>('write');

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
  const [honeypotValue, setHoneypotValue] = useState('');
  const [secondaryHoneypotValue, setSecondaryHoneypotValue] = useState('');
  const formArmedAtRef = useRef(Date.now());

  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [showcaseCover, setShowcaseCover] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const isEditing = Boolean(editingListing);
  const isRevision = editingListing?.status === 'inactive';

  const categoryName = useMemo(() => {
    return categories.find((c) => c.id === categoryId)?.name || null;
  }, [categories, categoryId]);

  const submitWords = useMemo(() => {
    if (isSubmitted) {
      return [isRevision ? 'İncelemeye Gönderildi' : isEditing ? 'Proje Güncellendi' : 'Lansman Gönderildi'];
    }
    if (loading) {
      return [isRevision ? 'Düzeltmeler Gönderiliyor…' : isEditing ? 'Güncelleniyor…' : 'Lansman Gönderiliyor…'];
    }
    if (isRevision) {
      return ['Düzeltmeleri İncelemeye Gönder', 'Yeniden Lansman Yap', 'İncelemeye Sun'];
    }
    if (isEditing) {
      return ['Değişiklikleri Kaydet', 'Güncellemeleri Gönder', 'İncelemeye Sun'];
    }
    return ['Lansmanı Gönder', 'Keşfedilmeye Başla', 'Topluluğa Katıl', 'Projeni Parlat'];
  }, [isSubmitted, isRevision, isEditing, loading]);

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
    if (loading || isSubmitted || isSubmittingRef.current) return;

    if (
      !HoneypotTrapService.verifyFormSubmission({
        formId: 'create_listing_form',
        primaryDecoy: honeypotValue,
        secondaryDecoy: secondaryHoneypotValue,
        armedAt: formArmedAtRef.current,
        minFillTimeMs: 750,
      })
    ) {
      Alert.alert('Güvenlik Uyarısı', 'Güvenlik doğrulaması tamamlanamadı.');
      return;
    }

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
        Alert.alert(
          isRevision ? 'Düzeltmeler İncelemeye Gönderildi' : isEditing ? 'Proje Güncellendi' : 'Lansmanınız Onaya Gönderildi',
          isEditing
            ? 'Değişiklikleriniz kaydedildi ve proje yeniden incelemeye gönderildi.'
            : 'Projeniz başarıyla kaydedildi ve yönetici onayına sunuldu.'
        );
        onSuccess?.(res.listingId);
      } else {
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
      contentContainerStyle={[
        styles.content,
        isDesktop ? styles.contentDesktop : styles.contentSingleCol,
      ]}
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

      {/* Responsive İki Kolonlu Düzen */}
      <View style={[styles.layoutRow, isDesktop && styles.layoutRowDesktop]}>
        {/* Sol Kolon: Form Bölümleri */}
        <View style={styles.formColumn}>
          {/* Bölüm 01: Kimlik */}
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

          {/* Bölüm 02: Platform ve Erişim */}
          <FormSection number="02" title="Platform ve erişim" caption="Projen nerede çalışıyor, nasıl sunuluyor?">
            <Text style={styles.label}>Desteklenen Platformlar (Çoklu Seçim)</Text>
            <View style={styles.platformRow}>
              {AVAILABLE_PLATFORMS.map((p) => {
                const isSelected = selectedPlatforms.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    style={[styles.platformPill, isSelected && styles.platformPillActive]}
                    onPress={() => togglePlatform(p.id)}
                  >
                    <Ionicons name={p.icon} size={18} color="#25364E" />
                    <Text style={[styles.platformPillText, isSelected && styles.platformPillTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Fiyatlandırma Modeli</Text>
            <View style={styles.pricingRow}>
              {PRICING_MODELS.map((m) => {
                const isSelected = pricingModel === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    style={[styles.pricingChip, isSelected && styles.pricingChipActive]}
                    onPress={() => setPricingModel(m.id)}
                  >
                    <Text style={[styles.pricingChipText, isSelected && styles.pricingChipTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FormSection>

          {/* Bölüm 03: Bağlantılar (Responsive 2-Kolon Izgara) */}
          <FormSection number="03" title="Bağlantılar *" caption="En az bir mağaza veya web bağlantısı ekle.">
            {errors.links ? (
              <View style={styles.fieldErrorRow}>
                <Ionicons name="alert-circle" size={13} color="#a02e2e" />
                <Text style={styles.fieldErrorText}>{errors.links}</Text>
              </View>
            ) : null}

            {isTabletOrDesktop ? (
              <>
                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
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
                  </View>
                  <View style={styles.gridCol}>
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
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
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
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.label}>Promosyon / Beta Kodu (Opsiyonel)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Örn: KISTAS50"
                      placeholderTextColor={theme.colors.neutral[400]}
                      value={promoCode}
                      onChangeText={setPromoCode}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
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

                <Text style={styles.label}>Promosyon / Beta Kodu (Opsiyonel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Örn: KISTAS50"
                  placeholderTextColor={theme.colors.neutral[400]}
                  value={promoCode}
                  onChangeText={setPromoCode}
                  autoCapitalize="characters"
                />
              </>
            )}
          </FormSection>

          {/* Bölüm 04: Vitrin ve Ekran Görüntüleri */}
          <FormSection
            number="04"
            title="Projenin vitrini *"
            caption={`${screenshots.length} / 6 ekran görüntüsü`}
          >
            <Text style={styles.sectionTitle}>Vitrin kapağı</Text>
            {(showcaseCover || screenshots[0]) ? (
              <Image source={{ uri: showcaseCover || screenshots[0] }} style={styles.showcaseCoverPreview} resizeMode="cover" />
            ) : null}
            <TouchableOpacity
              style={styles.uploadActionBtn}
              onPress={uploadShowcaseCover}
              disabled={coverUploading || isUploadingScreenshots}
              accessibilityRole="button"
              accessibilityLabel="Vitrin kapağı yükle"
            >
              {coverUploading ? (
                <ActivityIndicator color="#3269C7" />
              ) : (
                <Ionicons name="image-outline" size={20} color="#3269C7" />
              )}
              <Text style={styles.uploadActionBtnText}>
                {coverUploading ? 'Yükleniyor…' : 'Vitrin Kapağı Yükle'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.sectionCaption, { marginVertical: 10 }]}>
              Önerilen oran 4:5. Kapak seçilmezse ilk fotoğraf kullanılır.
            </Text>
            {coverError ? <Text accessibilityRole="alert" style={styles.fieldErrorText}>{coverError}</Text> : null}
            {errors.screenshots ? (
              <View style={styles.fieldErrorRow}>
                <Ionicons name="alert-circle" size={13} color="#a02e2e" />
                <Text style={styles.fieldErrorText}>{errors.screenshots}</Text>
              </View>
            ) : null}

            {/* Ekran Görüntüleri: Masaüstünde Izgara, Mobilde Scroll */}
            {isDesktop ? (
              <View style={styles.screenshotGrid}>
                {screenshots.map((uri, idx) => (
                  <View key={idx} style={styles.screenshotItemGrid}>
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
                      style={[
                        styles.coverBadge,
                        uri === (showcaseCover || screenshots[0]) && styles.coverBadgeActive,
                      ]}
                      disabled={isUploadingScreenshots}
                      onPress={() => setShowcaseCover(uri)}
                    >
                      <Text
                        style={[
                          styles.coverText,
                          uri === (showcaseCover || screenshots[0]) && styles.coverTextActive,
                        ]}
                      >
                        {uri === (showcaseCover || screenshots[0]) ? 'VİTRİN KAPAĞI' : 'KAPAK YAP'}
                      </Text>
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
                        <Ionicons
                          name="images-outline"
                          size={26}
                          color={errors.screenshots ? '#a02e2e' : '#3269C7'}
                          style={{ marginBottom: 6 }}
                        />
                        <Text style={[styles.addScreenshotLabel, errors.screenshots && { color: '#a02e2e' }]}>
                          Görsel Ekle
                        </Text>
                        <Text style={styles.addScreenshotSub}>Maks. 6</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
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
                      style={[
                        styles.coverBadge,
                        uri === (showcaseCover || screenshots[0]) && styles.coverBadgeActive,
                      ]}
                      disabled={isUploadingScreenshots}
                      onPress={() => setShowcaseCover(uri)}
                    >
                      <Text
                        style={[
                          styles.coverText,
                          uri === (showcaseCover || screenshots[0]) && styles.coverTextActive,
                        ]}
                      >
                        {uri === (showcaseCover || screenshots[0]) ? 'VİTRİN KAPAĞI' : 'KAPAK YAP'}
                      </Text>
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
                        <Ionicons
                          name="images-outline"
                          size={26}
                          color={errors.screenshots ? '#a02e2e' : '#3269C7'}
                          style={{ marginBottom: 6 }}
                        />
                        <Text style={[styles.addScreenshotLabel, errors.screenshots && { color: '#a02e2e' }]}>
                          Görsel Yükle
                        </Text>
                        <Text style={styles.addScreenshotSub}>PC / Mobil</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </FormSection>

          {/* Bölüm 05: Hikâyeni Anlat (Markdown & Yaz/Önizle Sekmesi) */}
          <FormSection number="05" title="Hikâyeni anlat *" caption="Hangi sorunu çözüyorsun? Projeni özel yapan ne?" borderBeam>
            {/* Sekmeler: Yaz / Önizle */}
            <View style={styles.editorTabRow}>
              <TouchableOpacity
                style={[styles.editorTabBtn, descriptionTab === 'write' && styles.editorTabBtnActive]}
                onPress={() => setDescriptionTab('write')}
              >
                <Text style={[styles.editorTabText, descriptionTab === 'write' && styles.editorTabTextActive]}>
                  Yaz (Markdown)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editorTabBtn, descriptionTab === 'preview' && styles.editorTabBtnActive]}
                onPress={() => setDescriptionTab('preview')}
              >
                <Text style={[styles.editorTabText, descriptionTab === 'preview' && styles.editorTabTextActive]}>
                  Canlı Görünüm
                </Text>
              </TouchableOpacity>
              <Text style={styles.editorCharCount}>
                {description.length} / 6000
              </Text>
            </View>

            {descriptionTab === 'write' ? (
              <>
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
                  <Text style={styles.formatHint}>Metni seçip biçimlendirin veya **kalın**, # Başlık yazın</Text>
                </View>

                <TextInput
                  ref={descriptionInputRef}
                  style={[
                    styles.input,
                    styles.textArea,
                    styles.descriptionEditorInput,
                    errors.description && styles.inputError,
                  ]}
                  value={description}
                  onChangeText={(val) => {
                    setDescription(val);
                    if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  multiline
                  numberOfLines={7}
                  maxLength={6000}
                  selection={descriptionSelection}
                  onSelectionChange={({ nativeEvent }) => setDescriptionSelection(nativeEvent.selection)}
                  textAlignVertical="top"
                  placeholder="Projenizin hikayesi, hedef kitlesi ve sunduğu çözümler..."
                  placeholderTextColor={theme.colors.neutral[400]}
                />
              </>
            ) : (
              <View style={styles.markdownPreviewContainer}>
                {description.trim() ? (
                  <DescriptionRichText content={description.trim()} />
                ) : (
                  <Text style={styles.markdownPlaceholderText}>
                    Açıklama metni henüz girilmedi. Yaz sekmesinden projenizi tanıtabilirsiniz.
                  </Text>
                )}
              </View>
            )}

            {errors.description ? (
              <View style={styles.fieldErrorRow}>
                <Ionicons name="alert-circle" size={13} color="#a02e2e" />
                <Text style={styles.fieldErrorText}>{errors.description}</Text>
              </View>
            ) : null}
          </FormSection>

          {/* Akıllı Bal Küpü Form Tuzağı */}
          <HoneypotDecoyField
            value={honeypotValue}
            onChangeText={setHoneypotValue}
            secondaryValue={secondaryHoneypotValue}
            onChangeSecondaryText={setSecondaryHoneypotValue}
            onArmed={(ts) => { formArmedAtRef.current = ts; }}
          />

          {/* Yayınlama ve Gönderim Bloğu */}
          <View style={styles.publishBlock}>
            <Text style={styles.publishTitle}>
              {isEditing ? 'Değişiklikleri kaydet' : 'Keşfedilmeye hazır mısın?'}
            </Text>
            <Text style={styles.pageSubtitle}>
              {isEditing
                ? 'Güncellenen proje yeniden incelemeye gönderilir.'
                : 'Bilgilerini son kez kontrol et ve projenle topluluğa katıl.'}
            </Text>
            <CategoryStarsBanner
              size="xl"
              fullWidth
              words={submitWords}
              disabled={isLoadingCategories || loading || isSubmitted || coverUploading || isUploadingScreenshots}
              onPress={handleSubmit}
              style={styles.submitBtn}
              accessibilityLabel={isEditing ? 'Değişiklikleri Kaydet' : 'Lansmanı Gönder'}
            />
          </View>
        </View>

        {/* Sağ Kolon: Masaüstü Sticky Canlı Önizleme & Hazırlık Skoru */}
        {isDesktop && (
          <View style={styles.previewColumn}>
            <CreateListingLivePreview
              title={title}
              tagline={tagline}
              logoUrl={logoUrl}
              categoryName={categoryName}
              platforms={selectedPlatforms}
              pricingModel={pricingModel}
              coverUrl={showcaseCover || screenshots[0]}
              appStoreUrl={appStoreUrl}
              playStoreUrl={playStoreUrl}
              webUrl={webUrl}
              hasDescription={Boolean(description.trim())}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};
