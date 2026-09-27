'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronUp,
  Share2,
  Apple,
  Smartphone,
  Globe,
  Monitor,
  Tag,
  Ticket,
  MessageSquare,
  Code,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { AutoTransparentLogo } from './AutoTransparentLogo';
import { GlassIconButton } from './GlassIconButton';
import { ShinyButton } from './ui/shiny-button';
import { DescriptionRichText } from './DescriptionRichText';
import { ProjectScreenshotsGallery } from './ProjectScreenshotsGallery';
import { ProjectCommentsLazySection } from './ProjectCommentsLazySection';
import { toggleProjectUpvoteAction, recordProjectViewAction } from '@/app/actions/listings';
import { isKistasDefaultAvatar, resolveAvatarUrl } from '@/lib/avatar';
import { InstagramVerifiedBadge } from './InstagramVerifiedBadge';
import { type KistasFeedbackType } from './KistasFeedbackModal';
import type { Listing } from '@kistas/shared';

const BadgeCodeModal = dynamic(
  () => import('./profile/BadgeCodeModal').then((m) => m.BadgeCodeModal),
  { ssr: false }
);

const ShareLaunchKitModal = dynamic(
  () => import('./ShareLaunchKitModal').then((m) => m.ShareLaunchKitModal),
  { ssr: false }
);

const KistasFeedbackModal = dynamic(
  () => import('./KistasFeedbackModal').then((m) => m.KistasFeedbackModal),
  { ssr: false }
);

interface ProjectDetailExperienceClientProps {
  project: Listing;
  categoryName?: string | null;
}

const PRICING_LABELS: Record<string, string> = {
  free: 'Ücretsiz',
  freemium: 'Freemium',
  subscription: 'Abonelik',
  paid: 'Ücretli',
};

function getCleanDeveloperName(fullName?: string | null): string {
  if (!fullName) return 'Geliştirici';
  return fullName.replace(/\s*\([^)]*\)/g, '').trim();
}

function toSafeHttpsUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith('//')) return null;
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export const ProjectDetailExperienceClient: React.FC<ProjectDetailExperienceClientProps> = ({
  project,
  categoryName,
}) => {
  const [upvotesCount, setUpvotesCount] = useState<number>(project.upvote_count || 0);
  const [viewCount, setViewCount] = useState<number>(project.view_count || 0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Kıstas Obsidian Feedback & Auth Modal State
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    type: KistasFeedbackType;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    redirectUrl?: string;
    highlight?: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showFeedback = useCallback((
    type: KistasFeedbackType,
    title: string,
    message: string,
    confirmLabel?: string,
    redirectUrl?: string,
    cancelLabel?: string,
    highlight?: string
  ) => {
    setFeedbackModal({
      isOpen: true,
      type,
      title,
      message,
      confirmLabel,
      redirectUrl,
      cancelLabel,
      highlight,
    });
  }, []);

  const storeActionsRef = useRef<HTMLDivElement>(null);

  const rawAppStoreUrl = project.app_store_url || (project as any).appStoreUrl;
  const rawPlayStoreUrl = project.play_store_url || (project as any).playStoreUrl;
  const rawWebsiteUrl =
    project.website_url ||
    (project as any).web_url ||
    (project as any).webUrl ||
    (project as any).websiteUrl;

  const safeAppStoreUrl = toSafeHttpsUrl(rawAppStoreUrl);
  const safePlayStoreUrl = toSafeHttpsUrl(rawPlayStoreUrl);
  const safeWebsiteUrl = toSafeHttpsUrl(rawWebsiteUrl);

  // Silent view recording
  useEffect(() => {
    void recordProjectViewAction(project.id).then((res) => {
      if (res.success) {
        setViewCount((prev) => prev + 1);
      }
    });
  }, [project.id]);

  const cleanMakerName = getCleanDeveloperName(
    project.developer_name ||
    (project as any).developerName ||
    project.seller?.full_name ||
    'KISTAS'
  );
  const isMakerVerified = Boolean(
    (project as any).is_verified ??
    project.seller?.is_verified ??
    true
  );
  const handleShare = useCallback(() => {
    setIsShareModalOpen(true);
  }, []);

  const handleToggleUpvote = async () => {
    if (isVoting) return;
    if (hasUpvoted) {
      showFeedback(
        'warning',
        'Zaten Desteklediniz',
        'Bu projeyi zaten desteklediniz. Kıstas kuralları gereği destek geri alınamaz.'
      );
      return;
    }

    setIsVoting(true);
    setHasUpvoted(true);
    setUpvotesCount((prev) => prev + 1);

    const res = await toggleProjectUpvoteAction(project.id);
    setIsVoting(false);

    if (!res.success) {
      if (res.error?.includes('giriş') || res.error?.includes('login') || res.error?.includes('auth') || res.error?.includes('Destek vermek için')) {
        setHasUpvoted(false);
        setUpvotesCount((prev) => Math.max(0, prev - 1));
        showFeedback(
          'auth',
          'Giriş Yapmalısınız',
          'Projeyi desteklemek ve oy kullanabilmek için lütfen Kıstas hesabınıza giriş yapın.',
          'Giriş Yap',
          `/listings/${project.id}`
        );
      } else if (res.error?.includes('zaten') || res.error?.includes('SUPPORT_ALREADY_GIVEN')) {
        setHasUpvoted(true);
        showFeedback(
          'warning',
          'Zaten Desteklediniz',
          'Bu projeyi zaten desteklediniz. Kıstas kuralları gereği destek geri alınamaz.'
        );
      } else {
        setHasUpvoted(false);
        setUpvotesCount((prev) => Math.max(0, prev - 1));
        showFeedback('info', 'Bilgilendirme', res.error || 'Destek oyu verilemedi.');
      }
    }
  };

  const descriptionContent = useMemo(
    () =>
      (project.description || project.tagline || 'Bu proje için henüz detaylı bir açıklama eklenmedi.')
        .replace(/\r\n?/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    [project.description, project.tagline]
  );

  return (
    <div className="min-h-screen bg-transparent text-[#F8FAFC] selection:bg-[#3B82F6]/30">
      {/* 1. Sticky Navigation Header */}
      <div className="sticky top-0 z-40 bg-[#080C14]/75 backdrop-blur-xl px-4 sm:px-8 py-3 border-b border-transparent sm:border-white/10 flex items-center justify-between">
        <Link href="/browse">
          <GlassIconButton
            icon={ChevronLeft}
            size={38}
            iconSize={20}
            title="Keşfet Ekranına Dön"
          />
        </Link>
      </div>

      <main className="container mx-auto max-w-4xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
        {/* 2. App Store Style Hero Section */}
        <section className="flex flex-row items-center sm:items-start justify-between gap-3.5 sm:gap-6 pt-1 sm:pt-2 pb-5 sm:pb-6 border-b border-white/10">
          <div className="flex flex-row items-center sm:items-start gap-3 sm:gap-5 text-left min-w-0 flex-1">
            {/* Circular App Logo */}
            <div className="relative h-16 w-16 sm:h-22 sm:w-22 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/5 shadow-sm flex items-center justify-center">
              {project.logo_url ? (
                <AutoTransparentLogo
                  src={project.logo_url}
                  alt={`${project.title} logosu`}
                  shape="circle"
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#3269C7]/10 p-3 sm:p-3.5 border border-[#3269C7]/20 shadow-[0_0_18px_rgba(50,105,199,0.2)]">
                  { }
                  <img
                    src="/kistas-logo-256.webp"
                    alt="Kıstas Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* Title, Tagline, Developer */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight truncate sm:whitespace-normal">
                {project.title}
              </h1>

              {project.tagline && (
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-medium text-[#94A3B8] line-clamp-1 sm:line-clamp-2 leading-relaxed">
                  {project.tagline}
                </p>
              )}

              <div className="mt-1 sm:mt-1.5 flex items-center justify-start gap-1.5 text-xs font-semibold">
                <span className="text-white font-bold tracking-tight uppercase text-[11px] sm:text-[12px]">
                  {cleanMakerName}
                </span>
                {isMakerVerified && (
                  <InstagramVerifiedBadge size={14} />
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons (Badge Studio & Share) */}
          <div className="shrink-0 flex items-center gap-2 sm:gap-2.5">
            <GlassIconButton
              icon={Code}
              size={42}
              iconSize={19}
              className="sm:!h-[46px] sm:!w-[46px]"
              onClick={() => setIsBadgeModalOpen(true)}
              title="Rozet Kodu Al (Sitenize Ekleyin)"
            />

            <GlassIconButton
              icon={Share2}
              size={42}
              iconSize={19}
              className="sm:!h-[46px] sm:!w-[46px]"
              onClick={handleShare}
              title="Lansmanı Paylaş & Duyur"
            />
          </div>
        </section>

        {/* 3. App Store Metadata Strip (Static Glass) */}
        <section className="relative my-6 overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.06] p-4 sm:p-5 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-center divide-x divide-white/10">
            {/* Destek */}
            <div className="px-2">
              <div className="text-[10px] font-extrabold tracking-wider text-[#94A3B8]">DESTEK</div>
              <div className="mt-1 text-base sm:text-lg font-black text-white">{upvotesCount}</div>
            </div>

            {/* Görüntülenme */}
            <div className="px-2">
              <div className="text-[10px] font-extrabold tracking-wider text-[#94A3B8]">GÖRÜNTÜLENME</div>
              <div className="mt-1 text-base sm:text-lg font-black text-white">
                {viewCount.toLocaleString('tr-TR')}
              </div>
            </div>

            {/* Puan */}
            <div className="px-2">
              <div className="text-[10px] font-extrabold tracking-wider text-[#94A3B8]">PUAN</div>
              <div className="mt-1 text-base sm:text-lg font-black text-white">
                {project.rating_count && project.rating_count > 0
                  ? (project.rating_average || 5).toFixed(1)
                  : 'Yeni'}
              </div>
            </div>

            {/* Platform */}
            <div className="px-2 hidden sm:block">
              <div className="text-[10px] font-extrabold tracking-wider text-[#94A3B8]">PLATFORM</div>
              <div className="mt-1 text-xs sm:text-sm font-bold text-white truncate">
                {project.platforms && project.platforms.length > 0
                  ? project.platforms.join(' + ')
                  : 'Dijital'}
              </div>
            </div>

            {/* Model */}
            <div className="px-2 hidden sm:block">
              <div className="text-[10px] font-extrabold tracking-wider text-[#94A3B8]">MODEL</div>
              <div className="mt-1 text-xs sm:text-sm font-bold text-white truncate">
                {PRICING_LABELS[project.pricing_model || 'freemium']}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Kıstas Destekleme Butonu (Kıstas Glass Buton) */}
        <section className="my-6">
          <ShinyButton
            onClick={handleToggleUpvote}
            disabled={isVoting || hasUpvoted}
            className="w-full h-14 sm:h-16 text-sm sm:text-base font-bold shadow-[0_10px_30px_rgba(59,130,246,0.35)]"
          >
            <div className="flex items-center justify-center gap-3">
              <ChevronUp size={22} className="text-[#60A5FA] transition-transform group-hover:-translate-y-0.5 shrink-0" />
              <span className="tracking-tight">{hasUpvoted ? 'Desteklendi' : 'Bu Projeyi Destekle'}</span>
              <b className="inline-flex items-center justify-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-black text-white backdrop-blur-md border border-white/15 tracking-normal">
                {upvotesCount}
              </b>
            </div>
          </ShinyButton>
        </section>

        {/* 5. App Store Style Ekran Görüntüleri Galerisi & Lightbox */}
        <ProjectScreenshotsGallery
          projectTitle={project.title}
          images={project.images}
        />

        {/* 6. Proje Açıklaması (Hakkında) */}
        <section className="my-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white tracking-tight mb-4">Hakkında</h2>
          <div className={`text-[#CBD5E1] ${!isDescExpanded ? 'line-clamp-4' : ''}`}>
            <DescriptionRichText content={descriptionContent} />
          </div>

          {descriptionContent.length > 180 && (
            <button
              type="button"
              onClick={() => setIsDescExpanded(!isDescExpanded)}
              className="mt-3 text-xs font-bold text-[#60A5FA] hover:underline cursor-pointer"
            >
              {isDescExpanded ? 'Daha az göster' : 'Daha fazla göster…'}
            </button>
          )}
        </section>

        {/* 7. Proje Yorumları ve Geliştirici Yanıtları */}
        <ProjectCommentsLazySection
          projectId={project.id}
          sellerId={project.seller_id}
        />

        {/* 8. Platformlar ve Model */}
        <section className="my-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <h3 className="text-lg font-bold text-white tracking-tight mb-4">Platformlar ve Model</h3>
          <div className="flex flex-wrap items-center gap-2.5">
            {project.platforms?.map((plt) => (
              <div
                key={plt}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white shadow-sm"
              >
                {plt === 'iOS' && <Apple size={14} className="text-[#CBD5E1]" />}
                {plt === 'Android' && <Smartphone size={14} className="text-[#CBD5E1]" />}
                {plt === 'Web' && <Globe size={14} className="text-[#CBD5E1]" />}
                {plt === 'macOS' && <Monitor size={14} className="text-[#CBD5E1]" />}
                <span>{plt}</span>
              </div>
            ))}

            <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-[#60A5FA] shadow-sm">
              <Tag size={14} />
              <span>{PRICING_LABELS[project.pricing_model || 'freemium']}</span>
            </div>

            {project.price > 0 && (
              <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-emerald-400 shadow-sm">
                <span>₺{project.price}</span>
              </div>
            )}
          </div>
        </section>

        {/* 9. Promosyon Kodu Kartı (Varsa) */}
        {project.promo_code && (
          <section className="my-8 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 to-amber-900/20 p-6 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <Ticket size={18} />
              <span>Kıstas topluluğuna özel indirim</span>
            </div>
            <p className="mt-1 text-xs text-amber-200/80">
              İndirim kodunu kullanarak projeyi avantajlı deneyimleyin:
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div className="rounded-xl border border-amber-400/30 bg-black/40 px-4 py-2 text-sm font-black tracking-widest text-amber-300 shadow-sm">
                {project.promo_code}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    void navigator.clipboard.writeText(project.promo_code!);
                  }
                  showFeedback(
                    'success',
                    'Promosyon Kodu Kopyalandı',
                    `Promosyon kodu (${project.promo_code}) başarıyla panoya kopyalandı.`
                  );
                }}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-500 transition-all cursor-pointer"
              >
                Kodu Kopyala
              </button>
            </div>
          </section>
        )}

        {/* 10. Geliştirici Kartı */}
        <section className="my-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <h3 className="text-lg font-bold text-white tracking-tight mb-4">Geliştirici</h3>
          <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm sm:flex-row sm:items-start">
            <div className="flex w-full min-w-0 items-center gap-3.5 sm:w-auto">
              {isKistasDefaultAvatar(project.seller?.avatar_url) ? (

                <img
                  src="/kistas-logo-256.webp"
                  alt="Kıstas Geliştirici"
                  className="h-14 w-14 shrink-0 object-contain"
                />
              ) : (

                <img
                  src={resolveAvatarUrl(project.seller?.avatar_url)}
                  alt={cleanMakerName}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/kistas-logo-256.webp';
                  }}
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="min-w-0 break-words text-sm font-bold text-white">{cleanMakerName}</span>
                  {isMakerVerified && (
                    <InstagramVerifiedBadge size={16} />
                  )}
                </div>
                <p className="break-words text-xs text-[#94A3B8]">
                  {project.seller?.rating_count && project.seller.rating_count > 0
                    ? `${(project.seller.rating_average || 5).toFixed(1)} Puan (${project.seller.rating_count} değerlendirme)`
                    : 'Kıstas Doğrulanmış Geliştirici'}
                </p>
              </div>
            </div>

            <div className="flex w-full items-center sm:w-auto">
              <ShinyButton
                href={`/messages?listingId=${project.id}`}
                className="w-full text-xs sm:!w-auto"
              >
                <span className="flex items-center justify-center gap-2">
                  <MessageSquare size={14} className="shrink-0 text-[#60A5FA]" />
                  <span>Mesaj Gönder</span>
                </span>
              </ShinyButton>
            </div>
          </div>
        </section>

        {/* 11. Proje Bilgileri Tablosu */}
        <section className="my-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <h3 className="text-lg font-bold text-white tracking-tight mb-4">Proje Bilgileri</h3>
          <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5 px-4 shadow-inner">
            <div className="flex items-center justify-between py-3 text-xs">
              <span className="text-[#94A3B8] font-medium">Geliştirici</span>
              <span className="text-white font-bold">{cleanMakerName}</span>
            </div>
            {categoryName && (
              <div className="flex items-center justify-between py-3 text-xs">
                <span className="text-[#94A3B8] font-medium">Kategori</span>
                <span className="text-white font-bold">{categoryName}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-3 text-xs">
              <span className="text-[#94A3B8] font-medium">Fiyatlandırma</span>
              <span className="text-white font-bold">{PRICING_LABELS[project.pricing_model || 'freemium']}</span>
            </div>
            <div className="flex items-center justify-between py-3 text-xs">
              <span className="text-[#94A3B8] font-medium">Platformlar</span>
              <span className="text-white font-bold">
                {project.platforms && project.platforms.length > 0 ? project.platforms.join(', ') : 'Dijital'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 text-xs">
              <span className="text-[#94A3B8] font-medium">Son Güncelleme</span>
              <span className="text-white font-bold">
                {new Date(project.updated_at || project.created_at).toLocaleDateString('tr-TR')}
              </span>
            </div>
          </div>
        </section>

        {/* 12. Harici Mağaza ve Web Bağlantıları */}
        <section ref={storeActionsRef} className="my-10">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
            {/* 1. App Store Badge */}
            {safeAppStoreUrl ? (
              <a
                href={safeAppStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex w-[164px] h-12 items-center justify-center bg-black transition-all hover:scale-105 active:scale-95 shadow-[0_6px_20px_rgba(0,0,0,0.7)] rounded-xl overflow-hidden border border-white/15 hover:border-white/30 cursor-pointer shrink-0"
                title="App Store'da Aç"
              >
                { }
                  <img
                    src="/store-badges/app-store.png?v=2"
                    alt="Download on the App Store"
                    className="h-full w-auto object-contain"
                    loading="lazy"
                    decoding="async"
                  />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => showFeedback('info', 'App Store', 'Bu proje için henüz bir App Store bağlantısı eklenmedi.')}
                className="group relative inline-flex w-[164px] h-12 items-center justify-center bg-black transition-all hover:scale-105 active:scale-95 shadow-[0_6px_20px_rgba(0,0,0,0.7)] rounded-xl overflow-hidden border border-white/10 hover:border-white/20 cursor-pointer opacity-85 hover:opacity-100 shrink-0"
                title="App Store bağlantısı henüz eklenmedi"
              >
                { }
                  <img
                    src="/store-badges/app-store.png?v=2"
                    alt="Download on the App Store"
                    className="h-full w-auto object-contain"
                    loading="lazy"
                    decoding="async"
                  />
              </button>
            )}

            {/* 2. Google Play Store Badge */}
            {safePlayStoreUrl ? (
              <a
                href={safePlayStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex w-[164px] h-12 items-center justify-center bg-black transition-all hover:scale-105 active:scale-95 shadow-[0_6px_20px_rgba(0,0,0,0.7)] rounded-xl overflow-hidden border border-white/15 hover:border-white/30 cursor-pointer shrink-0"
                title="Google Play Store'da Aç"
              >
                { }
                <img
                  src="/store-badges/google-play.png?v=2"
                  alt="GET IT ON Google Play"
                  className="h-full w-auto object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => showFeedback('info', 'Google Play Store', 'Bu proje için henüz bir Google Play Store bağlantısı eklenmedi.')}
                className="group relative inline-flex w-[164px] h-12 items-center justify-center bg-black transition-all hover:scale-105 active:scale-95 shadow-[0_6px_20px_rgba(0,0,0,0.7)] rounded-xl overflow-hidden border border-white/10 hover:border-white/20 cursor-pointer opacity-85 hover:opacity-100 shrink-0"
                title="Google Play Store bağlantısı henüz eklenmedi"
              >
                { }
                <img
                  src="/store-badges/google-play.png?v=2"
                  alt="GET IT ON Google Play"
                  className="h-full w-auto object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            )}

            {/* 3. Kıstas Store / Web'de Görüntüle Badge */}
            {safeWebsiteUrl ? (
              <a
                href={safeWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex w-[164px] h-12 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#090A0E] via-[#111625] to-[#0E131F] text-white shadow-[0_6px_20px_rgba(50,105,199,0.25)] transition-all hover:scale-105 active:scale-95 border border-white/15 hover:border-[#3269C7]/60 cursor-pointer overflow-hidden shrink-0"
                title="Web Sitesinde Aç"
              >
                { }
                <img
                  src="/kistas-logo-256.webp"
                  alt="Kıstas Store"
                  className="h-6 w-6 object-contain transition-transform group-hover:scale-110 shrink-0"
                />
                <div className="text-left select-none">
                  <div className="text-[9px] font-extrabold tracking-wider text-[#94A3B8]">WEB’DE</div>
                  <div className="text-[11.5px] font-black tracking-wide text-white leading-tight">GÖRÜNTÜLE</div>
                </div>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => showFeedback('info', 'Web Bağlantısı', 'Bu proje için henüz harici bir web sitesi bağlantısı eklenmedi.')}
                className="group relative inline-flex w-[164px] h-12 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#090A0E] via-[#111625] to-[#0E131F] text-white shadow-[0_6px_20px_rgba(50,105,199,0.2)] transition-all hover:scale-105 active:scale-95 border border-white/10 hover:border-white/20 cursor-pointer opacity-85 hover:opacity-100 overflow-hidden shrink-0"
                title="Web sitesi bağlantısı henüz eklenmedi"
              >
                { }
                <img
                  src="/kistas-logo-256.webp"
                  alt="Kıstas Store"
                  className="h-6 w-6 object-contain transition-transform group-hover:scale-110 shrink-0"
                />
                <div className="text-left select-none">
                  <div className="text-[9px] font-extrabold tracking-wider text-[#94A3B8]">WEB’DE</div>
                  <div className="text-[11.5px] font-black tracking-wide text-white leading-tight">GÖRÜNTÜLE</div>
                </div>
              </button>
            )}
          </div>
        </section>
      </main>

      {/* 13. Kıstas Obsidian Feedback & Auth Modal */}
      {feedbackModal.isOpen && (
        <KistasFeedbackModal
          isOpen
          onClose={() => setFeedbackModal((prev) => ({ ...prev, isOpen: false }))}
          type={feedbackModal.type}
          title={feedbackModal.title}
          message={feedbackModal.message}
          confirmLabel={feedbackModal.confirmLabel}
          cancelLabel={feedbackModal.cancelLabel}
          redirectUrl={feedbackModal.redirectUrl}
          highlight={feedbackModal.highlight}
        />
      )}

      {/* 14. Embed Badge Code Studio Modal */}
      {isBadgeModalOpen && (
        <BadgeCodeModal
          isOpen
          listingId={project.id}
          listingTitle={project.title}
          onClose={() => setIsBadgeModalOpen(false)}
        />
      )}

      {/* 15. One-Click Launch Kit Modal */}
      {isShareModalOpen && (
        <ShareLaunchKitModal
          isOpen
          listingId={project.id}
          listingTitle={project.title}
          listingTagline={project.tagline}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
};
