'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Camera,
  Upload,
  Plus,
  X,
  Smartphone,
  Apple,
  Globe,
  Monitor,
  Loader2,
  Check,
} from 'lucide-react';
import { AutoTransparentLogo } from './AutoTransparentLogo';
import { GlassIconButton } from './GlassIconButton';
import { DiscoveryRevealStatement } from './DiscoveryRevealStatement';
import { CategoryPickerModal } from './CategoryPickerModal';
import { DescriptionRichText } from './DescriptionRichText';
import { HoneypotDecoyField } from './HoneypotDecoyField';
import { KistasFeedbackModal, KistasFeedbackType } from './KistasFeedbackModal';
import { uploadToStorage, pickImageFiles } from '@/lib/storage';
import { createListingAction, updateListingAction } from '@/app/actions/listings';
import type { Category } from '@kistas/shared';

type PlatformType = 'iOS' | 'Android' | 'Web' | 'macOS';
type PricingModel = 'free' | 'freemium' | 'subscription' | 'paid';

export interface EditableListing {
  id: string;
  categoryId: string;
  title: string;
  tagline: string;
  description: string;
  pricingModel: string;
  platforms: string[];
  logoUrl: string;
  appStoreUrl: string;
  playStoreUrl: string;
  webUrl: string;
  screenshots: string[];
  coverUrl: string;
}

export interface CreateListingExperienceClientProps {
  categories: Category[];
  initialListing?: EditableListing | null;
}

const AVAILABLE_PLATFORMS: { id: PlatformType; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'iOS', label: 'iOS / iPhone', icon: Apple },
  { id: 'Android', label: 'Android', icon: Smartphone },
  { id: 'Web', label: 'Web / SaaS', icon: Globe },
  { id: 'macOS', label: 'macOS', icon: Monitor },
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
  server?: string;
}

export const CreateListingExperienceClient: React.FC<CreateListingExperienceClientProps> = ({
  categories,
  initialListing,
}) => {
  const isEditing = Boolean(initialListing);
  const initialPlatforms = initialListing?.platforms.filter((platform): platform is PlatformType =>
    AVAILABLE_PLATFORMS.some((available) => available.id === platform)
  );
  const initialPricingModel = PRICING_MODELS.some((model) => model.id === initialListing?.pricingModel)
    ? (initialListing?.pricingModel as PricingModel)
    : 'freemium';

  const [title, setTitle] = useState(initialListing?.title || '');
  const [tagline, setTagline] = useState(initialListing?.tagline || '');
  const [description, setDescription] = useState(initialListing?.description || '');
  const [descriptionTab, setDescriptionTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [categoryId, setCategoryId] = useState<string | null>(
    initialListing?.categoryId || categories[0]?.id || null
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>(
    initialPlatforms?.length ? initialPlatforms : ['iOS']
  );
  const [pricingModel, setPricingModel] = useState<PricingModel>(initialPricingModel);

  const [appStoreUrl, setAppStoreUrl] = useState(initialListing?.appStoreUrl || '');
  const [playStoreUrl, setPlayStoreUrl] = useState(initialListing?.playStoreUrl || '');
  const [webUrl, setWebUrl] = useState(initialListing?.webUrl || '');

  const [logoUrl, setLogoUrl] = useState(initialListing?.logoUrl || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [screenshots, setScreenshots] = useState<string[]>(initialListing?.screenshots || []);
  const [showcaseCover, setShowcaseCover] = useState(initialListing?.coverUrl || '');
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    type: KistasFeedbackType;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showFeedback = (type: KistasFeedbackType, title: string, message: string) => {
    setFeedbackModal({ isOpen: true, type, title, message });
  };

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // Honeypot bot trap
  const [honeypotValue, setHoneypotValue] = useState('');
  const [secondaryHoneypotValue, setSecondaryHoneypotValue] = useState('');
  const formArmedAtRef = useRef<number>(Date.now());

  // Dynamic submit flipping words
  const submitWords = useMemo(() => {
    if (loading) return [isEditing ? 'Değişiklikler Kaydediliyor…' : 'Lansman Gönderiliyor…'];
    if (isEditing) return ['Değişiklikleri Kaydet'];
    return ['Lansmanı Gönder', 'Keşfedilmeye Başla', 'Topluluğa Katıl', 'Projeni Parlat'];
  }, [isEditing, loading]);

  const [wordIdx, setWordIdx] = useState(0);
  React.useEffect(() => {
    if (loading || submitWords.length <= 1) return;
    const interval = setInterval(() => {
      setWordIdx((prev) => (prev + 1) % submitWords.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [loading, submitWords]);

  // Markdown format insertion
  const applyDescriptionFormat = (format: 'bold' | 'h1' | 'h2') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = description;

    let nextDescription = text;
    let nextCursor = end;

    if (format === 'bold') {
      const selectedText = text.slice(start, end) || 'kalın metin';
      const replacement = `**${selectedText}**`;
      nextDescription = text.slice(0, start) + replacement + text.slice(end);
      nextCursor = start + replacement.length;
    } else {
      const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const lineEndIndex = text.indexOf('\n', start);
      const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
      const currentLine = text.slice(lineStart, lineEnd).replace(/^#{1,2}\s+/, '');
      const prefix = format === 'h1' ? '# ' : '## ';
      const lineContent = currentLine || (format === 'h1' ? 'Başlık' : 'Alt başlık');
      const replacement = `${prefix}${lineContent}`;
      nextDescription = text.slice(0, lineStart) + replacement + text.slice(lineEnd);
      nextCursor = lineStart + replacement.length;
    }

    if (nextDescription.length > 6000) return;
    setDescription(nextDescription);
    if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    }, 10);
  };

  const togglePlatform = (p: PlatformType) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length === 1) {
        showFeedback('warning', 'Platform Seçimi', 'En az bir hedef platform seçilmelidir.');
        return;
      }
      setSelectedPlatforms(selectedPlatforms.filter((item) => item !== p));
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  // Upload Logo
  const handlePickAndUploadLogo = async () => {
    try {
      const files = await pickImageFiles(false);
      if (!files || files.length === 0) return;
      const file = files[0];

      setIsUploadingLogo(true);
      const res = await uploadToStorage(file, 'logos');
      setIsUploadingLogo(false);

      if (res.success && res.url) {
        setLogoUrl(res.url);
        setErrors((prev) => ({ ...prev, logoUrl: undefined }));
      } else {
        showFeedback('error', 'Logo Yüklenemedi', res.error || 'Logo yüklenemedi.');
      }
    } catch (err: unknown) {
      setIsUploadingLogo(false);
      const message = err instanceof Error ? err.message : 'Logo yüklenirken bir hata oluştu.';
      showFeedback('error', 'Hata', message);
    }
  };

  // Upload Cover
  const handleUploadCover = async () => {
    try {
      const files = await pickImageFiles(false);
      if (!files || files.length === 0) return;
      const file = files[0];

      setIsUploadingCover(true);
      const res = await uploadToStorage(file, 'vitrin');
      setIsUploadingCover(false);

      if (res.success && res.url) {
        setShowcaseCover(res.url);
      } else {
        showFeedback('error', 'Kapak Yüklenemedi', res.error || 'Vitrin kapağı yüklenemedi.');
      }
    } catch (err: unknown) {
      setIsUploadingCover(false);
      const message = err instanceof Error ? err.message : 'Kapak yüklenirken bir sorun oluştu.';
      showFeedback('error', 'Hata', message);
    }
  };

  // Upload Screenshots
  const handlePickAndUploadScreenshots = async () => {
    if (screenshots.length >= 6) {
      showFeedback('warning', 'Görsel Limiti', 'En fazla 6 adet ekran görüntüsü ekleyebilirsiniz.');
      return;
    }
    try {
      const files = await pickImageFiles(true);
      if (!files || files.length === 0) return;
      const remaining = 6 - screenshots.length;
      const toUpload = files.slice(0, remaining);

      setIsUploadingScreenshots(true);
      let lastError = '';

      for (const file of toUpload) {
        const res = await uploadToStorage(file, 'vitrin');
        if (res.success && res.url) {
          setScreenshots((prev) => [...prev, res.url!]);
          setErrors((prev) => ({ ...prev, screenshots: undefined }));
        } else if (res.error) {
          lastError = res.error;
        }
      }
      setIsUploadingScreenshots(false);

      if (lastError) {
        showFeedback('error', 'Görsel Yüklenemedi', lastError);
      }
    } catch (err: unknown) {
      setIsUploadingScreenshots(false);
      const message = err instanceof Error ? err.message : 'Görseller yüklenirken bir sorun oluştu.';
      showFeedback('error', 'Hata', message);
    }
  };

  const handleRemoveScreenshot = (idx: number) => {
    const targetUrl = screenshots[idx];
    if (targetUrl === showcaseCover) {
      setShowcaseCover('');
    }
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));
  };

  // Validation
  const validateForm = (): FormErrors => {
    const errs: FormErrors = {};
    if (!title.trim()) {
      errs.title = 'Uygulama / proje adı zorunludur.';
    }
    if (!tagline.trim()) {
      errs.tagline = 'Projenizi anlatan kısa bir slogan (tagline) zorunludur.';
    }
    if (!categoryId) {
      errs.categoryId = 'Lütfen projeniz için bir kategori seçiniz.';
    }
    if (!logoUrl) {
      errs.logoUrl = 'Projeniz için bir logo yüklemeniz gerekmektedir.';
    }
    if (!appStoreUrl.trim() && !playStoreUrl.trim() && !webUrl.trim()) {
      errs.links = 'En az bir bağlantı (App Store, Play Store veya Web) giriniz.';
    }
    if (screenshots.length === 0 && !showcaseCover) {
      errs.screenshots = 'Vitrinde sergilenmek üzere en az 1 adet ekran görüntüsü yükleyiniz.';
    }
    if (!description.trim()) {
      errs.description = 'Projenizin detaylı hikayesini anlatan açıklama zorunludur.';
    } else if (description.length > 6000) {
      errs.description = 'Açıklama en fazla 6000 karakter olabilir.';
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Pars DevState Honeypot verification
    const fillTime = Date.now() - formArmedAtRef.current;
    if (honeypotValue || secondaryHoneypotValue || fillTime < 700) {
      // Deceptive bot trap
      showFeedback('info', 'Güvenlik Doğrulaması', 'Güvenlik doğrulaması tamamlandı.');
      return;
    }

    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.set('title', title.trim());
      formData.set('tagline', tagline.trim());
      formData.set('categoryId', categoryId || '');
      formData.set('description', description.trim());
      formData.set('pricingModel', pricingModel);
      formData.set('price', '0');
      formData.set('logoUrl', logoUrl);
      formData.set('coverUrl', showcaseCover || screenshots[0] || '');
      formData.set('appStoreUrl', appStoreUrl.trim());
      formData.set('playStoreUrl', playStoreUrl.trim());
      formData.set('webUrl', webUrl.trim());
      if (initialListing) formData.set('listingId', initialListing.id);

      selectedPlatforms.forEach((p) => formData.append('platforms', p));
      screenshots.forEach((s) => formData.append('screenshots', s));

      if (initialListing) {
        await updateListingAction(formData);
      } else {
        await createListingAction(formData);
      }
    } catch (err: unknown) {
      setLoading(false);
      const message = err instanceof Error ? err.message : 'Lansman gönderilirken bir hata oluştu.';
      setErrors((prev) => ({ ...prev, server: message }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-36 pt-6 text-[#F8FAFC] selection:bg-blue-500/20">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href={isEditing ? '/profile' : '/'}
            title={isEditing ? 'Profile Dön' : 'Ana Sayfaya Dön'}
            aria-label={isEditing ? 'Profile Dön' : 'Ana Sayfaya Dön'}
          >
            <GlassIconButton
              icon={ArrowLeft}
              size={40}
              iconSize={18}
              title={isEditing ? 'Profile Dön' : 'Ana Sayfaya Dön'}
              as="div"
            />
          </Link>
        </div>

        {/* Intro Banner */}
        <div className="mb-8">
          <DiscoveryRevealStatement />
          <div className="mt-2 text-xs font-bold text-[#94A3B8]">
            <span>{isEditing ? 'PROJE BİLGİLERİNİ DÜZENLE' : 'PROJE BİLGİLERİ'}</span>
          </div>

          {/* Error Banner */}
          {Object.keys(errors).length > 0 && (
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs font-bold text-rose-300 shadow-sm animate-in fade-in duration-200">
              <AlertCircle size={18} className="shrink-0 text-rose-400" />
              <span>
                {errors.server ||
                  `Lütfen kırmızı ile işaretlenen zorunlu alanları doldurunuz (${Object.keys(errors).length} eksik alan).`}
              </span>
            </div>
          )}
        </div>

        {/* Centered Launch Form */}
        <div className="mx-auto max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 01: Projenin Kimliği */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7">
              <div className="flex items-center gap-3.5 pb-5 border-b border-white/10">
                <span className="text-2xl font-black text-blue-500/40 tracking-tighter">01</span>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Projenin Kimliği</h2>
                  <p className="text-xs text-[#94A3B8]">İlk izlenim, iyi bir isim ve güçlü bir ikonla başlar.</p>
                </div>
              </div>

              {/* Logo Row */}
              <div className="mt-6 flex flex-col items-center sm:items-start">
                <button
                  type="button"
                  onClick={handlePickAndUploadLogo}
                  disabled={isUploadingLogo}
                  title={logoUrl ? 'Proje logosunu değiştir' : 'Proje logosu yükle'}
                  aria-label={logoUrl ? 'Proje logosunu değiştir' : 'Proje logosu yükle'}
                  className={`group relative isolate flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[28px] border bg-[linear-gradient(145deg,rgba(255,255,255,0.12),rgba(9,19,38,0.72))] shadow-[0_18px_42px_-14px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.22)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-14px_rgba(50,105,199,0.42),inset_0_1px_1px_rgba(255,255,255,0.28)] disabled:pointer-events-none disabled:opacity-60 sm:h-32 sm:w-32 ${
                    errors.logoUrl ? 'border-rose-500' : 'border-white/15 hover:border-[#60A5FA]/45'
                  }`}
                >
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(50,105,199,0.32),transparent_62%)]" />
                  {logoUrl ? (
                    <AutoTransparentLogo
                      src={logoUrl}
                      alt="Logo Önizleme"
                      className="relative z-10 h-[82%] w-[82%] object-contain"
                    />
                  ) : (
                    <Camera
                      size={40}
                      strokeWidth={1.7}
                      className="relative z-10 text-[#60A5FA] drop-shadow-[0_0_10px_rgba(96,165,250,0.35)]"
                    />
                  )}

                  {logoUrl && !isUploadingLogo && (
                    <span className="absolute inset-0 z-20 flex items-center justify-center bg-[#080C14]/55 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Camera
                        size={34}
                        strokeWidth={1.7}
                        className="text-[#60A5FA] drop-shadow-[0_0_10px_rgba(96,165,250,0.35)]"
                      />
                    </span>
                  )}

                  {isUploadingLogo && (
                    <span className="absolute inset-0 z-30 flex items-center justify-center bg-[#080C14]/60 backdrop-blur-md">
                      <Loader2 size={26} className="animate-spin text-[#60A5FA]" />
                    </span>
                  )}
                </button>

                <div className="mt-3 text-center sm:text-left">
                  <span className="block text-xs font-bold text-[#F8FAFC]">Proje Logosu</span>
                  {errors.logoUrl ? (
                    <p className="mt-1.5 text-xs font-medium text-rose-400 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.logoUrl}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Title & Tagline */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC]">Uygulama / Proje Adı</label>
                  <input
                    type="text"
                    value={title}
                    maxLength={60}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                    }}
                    placeholder="Örn: Kıstas"
                    className={`mt-1.5 w-full rounded-2xl border px-4 py-3 text-[16px] sm:text-sm text-white placeholder-[#64748B] focus:outline-none transition-all ${
                      errors.title ? 'border-rose-500 bg-rose-950/20' : 'border-white/10 bg-white/5 focus:border-blue-500 focus:bg-white/[0.08]'
                    }`}
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-rose-400 font-medium">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC]">Tek cümlede projen</label>
                  <input
                    type="text"
                    value={tagline}
                    maxLength={120}
                    onChange={(e) => {
                      setTagline(e.target.value);
                      if (errors.tagline) setErrors((prev) => ({ ...prev, tagline: undefined }));
                    }}
                    placeholder="Örn: Yapay zeka ile kişisel bütçe ve harcama asistanı"
                    className={`mt-1.5 w-full rounded-2xl border px-4 py-3 text-[16px] sm:text-sm text-white placeholder-[#64748B] focus:outline-none transition-all ${
                      errors.tagline ? 'border-rose-500 bg-rose-950/20' : 'border-white/10 bg-white/5 focus:border-blue-500 focus:bg-white/[0.08]'
                    }`}
                  />
                  {errors.tagline && (
                    <p className="mt-1 text-xs text-rose-400 font-medium">{errors.tagline}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#F8FAFC]">Kategori</label>
                  <CategoryPickerModal
                    categories={categories}
                    value={categoryId}
                    onChange={(id) => {
                      setCategoryId(id);
                      if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: undefined }));
                    }}
                    error={errors.categoryId}
                  />
                  {errors.categoryId && (
                    <p className="mt-1 text-xs text-rose-400 font-medium">{errors.categoryId}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 02: Platform ve Erişim */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7">
              <div className="flex items-center gap-3.5 pb-5 border-b border-white/10">
                <span className="text-2xl font-black text-blue-500/40 tracking-tighter">02</span>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Platform ve Erişim</h2>
                  <p className="text-xs text-[#94A3B8]">Projen nerede çalışıyor, nasıl sunuluyor?</p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-2">
                    Desteklenen Platformlar (Çoklu Seçim)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {AVAILABLE_PLATFORMS.map((p) => {
                      const Icon = p.icon;
                      const isSelected = selectedPlatforms.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePlatform(p.id)}
                          className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500/50 bg-blue-600/20 text-blue-300 shadow-sm'
                              : 'border-white/10 bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Icon size={16} className={isSelected ? 'text-blue-400' : 'text-[#94A3B8]'} />
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC] mb-2">
                    Fiyatlandırma Modeli
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PRICING_MODELS.map((m) => {
                      const isSelected = pricingModel === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPricingModel(m.id)}
                          className={`flex items-center justify-center rounded-2xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500/50 bg-blue-600/20 text-blue-300 shadow-sm'
                              : 'border-white/10 bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 03: Bağlantılar */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7">
              <div className="flex items-center gap-3.5 pb-5 border-b border-white/10">
                <span className="text-2xl font-black text-blue-500/40 tracking-tighter">03</span>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Bağlantılar</h2>
                  <p className="text-xs text-[#94A3B8]">En az bir mağaza veya web bağlantısı ekle.</p>
                </div>
              </div>

              {errors.links && (
                <p className="mt-4 text-xs font-medium text-rose-400 flex items-center gap-1">
                  <AlertCircle size={13} /> {errors.links}
                </p>
              )}

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC]">App Store Bağlantısı (iOS)</label>
                  <input
                    type="url"
                    value={appStoreUrl}
                    onChange={(e) => {
                      setAppStoreUrl(e.target.value);
                      if (errors.links) setErrors((prev) => ({ ...prev, links: undefined }));
                    }}
                    placeholder="https://apps.apple.com/app/..."
                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[16px] sm:text-sm text-white placeholder-[#64748B] focus:border-blue-500 focus:bg-white/[0.08] focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F8FAFC]">Play Store Bağlantısı (Android)</label>
                  <input
                    type="url"
                    value={playStoreUrl}
                    onChange={(e) => {
                      setPlayStoreUrl(e.target.value);
                      if (errors.links) setErrors((prev) => ({ ...prev, links: undefined }));
                    }}
                    placeholder="https://play.google.com/store/apps/..."
                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[16px] sm:text-sm text-white placeholder-[#64748B] focus:border-blue-500 focus:bg-white/[0.08] focus:outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#F8FAFC]">Web Sitesi / Landing Page URL</label>
                  <input
                    type="url"
                    value={webUrl}
                    onChange={(e) => {
                      setWebUrl(e.target.value);
                      if (errors.links) setErrors((prev) => ({ ...prev, links: undefined }));
                    }}
                    placeholder="https://projeniz.com"
                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[16px] sm:text-sm text-white placeholder-[#64748B] focus:border-blue-500 focus:bg-white/[0.08] focus:outline-none transition-all"
                  />
                </div>

              </div>
            </div>

            {/* 04: Projenin Vitrini */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7">
              <div className="flex items-center justify-between pb-5 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl font-black text-blue-500/40 tracking-tighter">04</span>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Projenin Vitrini</h2>
                    <p className="text-xs text-[#94A3B8]">{screenshots.length} / 6 ekran görüntüsü</p>
                  </div>
                </div>
              </div>

              {errors.screenshots && (
                <p className="mt-4 text-xs font-medium text-rose-400 flex items-center gap-1">
                  <AlertCircle size={13} /> {errors.screenshots}
                </p>
              )}

              {/* Showcase Cover Box */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#F8FAFC]">Vitrin Kapağı</span>
                  <span className="text-[11px] text-[#94A3B8]">Önerilen oran 4:5 veya 16:10</span>
                </div>

                <div className="flex items-center gap-4">
                  {(showcaseCover || screenshots[0]) && (
                    <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={showcaseCover || screenshots[0]}
                        alt="Vitrin Kapağı"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleUploadCover}
                    disabled={isUploadingCover}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-white/10 hover:border-blue-500/40 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isUploadingCover ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-blue-400" />
                        <span>Kapak Yükleniyor…</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} className="text-blue-400" />
                        <span>{showcaseCover ? 'Kapağı Değiştir' : 'Özel Vitrin Kapağı Yükle'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Screenshots Gallery Grid */}
              <div className="mt-6">
                <label className="block text-xs font-bold text-[#F8FAFC] mb-3">Ekran Görüntüleri</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {screenshots.map((uri, idx) => {
                    const isCover = uri === (showcaseCover || screenshots[0]);
                    return (
                      <div
                        key={idx}
                        className="relative group aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-sm"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={uri} alt={`Ekran ${idx + 1}`} className="h-full w-full object-cover" />

                        {/* Delete Badge */}
                        <button
                          type="button"
                          onClick={() => handleRemoveScreenshot(idx)}
                          className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md opacity-90 hover:opacity-100 hover:bg-black transition-all cursor-pointer"
                        >
                          <X size={12} />
                        </button>

                        {/* Cover Selector Badge */}
                        <button
                          type="button"
                          onClick={() => setShowcaseCover(uri)}
                          className={`absolute bottom-2 left-2 right-2 rounded-lg px-2 py-1 text-[9.5px] font-extrabold backdrop-blur-md transition-all cursor-pointer text-center ${
                            isCover
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-black/60 text-white/90 hover:bg-black/80'
                          }`}
                        >
                          {isCover ? '✓ VİTRİN KAPAĞI' : 'KAPAK YAP'}
                        </button>
                      </div>
                    );
                  })}

                  {screenshots.length < 6 && (
                    <button
                      type="button"
                      onClick={handlePickAndUploadScreenshots}
                      disabled={isUploadingScreenshots}
                      className="aspect-[16/10] flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-blue-500 transition-all cursor-pointer disabled:opacity-60 text-white"
                    >
                      {isUploadingScreenshots ? (
                        <>
                          <Loader2 size={20} className="animate-spin text-blue-400" />
                          <span className="text-[11px] font-bold text-white">Yükleniyor…</span>
                        </>
                      ) : (
                        <>
                          <Plus size={22} className="text-blue-400" />
                          <span className="text-[11px] font-bold text-white">Görsel Ekle</span>
                          <span className="text-[10px] text-[#94A3B8]">Maks. 6</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 05: Hikâyeni Anlat */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7">
              <div className="relative z-10">
                <div className="flex items-center justify-between pb-5 border-b border-white/10">
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl font-black text-blue-500/40 tracking-tighter">05</span>
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">Hikâyeni Anlat</h2>
                      <p className="text-xs text-[#94A3B8]">Hangi sorunu çözüyorsun? Projeni özel yapan ne?</p>
                    </div>
                  </div>
                </div>

                {/* Editor Tabs & Character Count */}
                <div className="mt-5 flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDescriptionTab('write')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        descriptionTab === 'write'
                          ? 'bg-blue-600 text-white shadow-sm border border-blue-500/30'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      Yaz (Markdown)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescriptionTab('preview')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        descriptionTab === 'preview'
                          ? 'bg-blue-600 text-white shadow-sm border border-blue-500/30'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      Canlı Görünüm
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-[#94A3B8]">
                    {description.length} / 6000
                  </span>
                </div>

                {/* Tab: Write */}
                {descriptionTab === 'write' ? (
                  <div className="mt-3">
                    {/* Format Toolbar */}
                    <div className="flex items-center gap-1.5 pb-2.5">
                      <button
                        type="button"
                        onClick={() => applyDescriptionFormat('h1')}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm hover:bg-white/10 cursor-pointer"
                        title="Başlık 1 Ekle"
                      >
                        H1
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDescriptionFormat('h2')}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm hover:bg-white/10 cursor-pointer"
                        title="Başlık 2 Ekle"
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDescriptionFormat('bold')}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm hover:bg-white/10 cursor-pointer"
                        title="Kalın Metin Ekle"
                      >
                        Kalın
                      </button>
                      <span className="ml-2 text-[10.5px] text-[#94A3B8] hidden sm:inline">
                        Metni seçip biçimlendirin; kalın metin veya başlık ekleyin
                      </span>
                    </div>

                    <textarea
                      ref={textareaRef}
                      value={description}
                      maxLength={6000}
                      rows={8}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                      }}
                      placeholder="Projenizin hikayesi, çözdüğü problem ve sunduğu yenilikler..."
                      className={`w-full rounded-2xl border p-4 text-[16px] sm:text-sm text-white placeholder-[#64748B] focus:outline-none transition-all ${
                        errors.description ? 'border-rose-500 bg-rose-950/20' : 'border-white/10 bg-white/5 focus:border-blue-500 focus:bg-white/[0.08]'
                      }`}
                    />
                  </div>
                ) : (
                  <div className="mt-3 min-h-[180px] rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner">
                    {description.trim() ? (
                      <DescriptionRichText content={description.trim()} />
                    ) : (
                      <p className="text-xs text-[#94A3B8] italic">
                        Açıklama metni henüz girilmedi. Yaz sekmesinden projenizi tanıtabilirsiniz.
                      </p>
                    )}
                  </div>
                )}

                {errors.description && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{errors.description}</p>
                )}
              </div>
            </div>

            {/* Pars DevState Honeypot Trap */}
            <HoneypotDecoyField
              value={honeypotValue}
              onChange={setHoneypotValue}
              secondaryValue={secondaryHoneypotValue}
              onChangeSecondary={setSecondaryHoneypotValue}
              onArmed={(ts) => {
                formArmedAtRef.current = ts;
              }}
            />

            {/* Publish & Submit Block */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7">
              <p className="mb-5 text-xs text-[#94A3B8]">
                Bilgilerini son kez kontrol et ve projenle topluluğa katıl.
              </p>

              <button
                type="submit"
                disabled={loading || isUploadingLogo || isUploadingScreenshots || isUploadingCover}
                className="shiny-cta group min-h-14 w-full text-sm font-extrabold disabled:pointer-events-none disabled:!cursor-not-allowed disabled:!opacity-60"
              >
                <span className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Lansman Gönderiliyor…</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} className="transition-transform group-hover:scale-110" />
                      <span className="transition-transform duration-300">
                        {submitWords[wordIdx % submitWords.length]}
                      </span>
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <KistasFeedbackModal
        isOpen={feedbackModal.isOpen}
        type={feedbackModal.type}
        title={feedbackModal.title}
        message={feedbackModal.message}
        onClose={() => setFeedbackModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
