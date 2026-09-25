'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Loader2,
  Megaphone,
  Send,
  Search,
  ChevronRight,
  TrendingUp,
  Globe,
  Layers3,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import type { Listing } from '@kistas/shared';
import { AutoTransparentLogo } from '../AutoTransparentLogo';
import { GlobalNotificationCard } from '../GlobalNotificationCard';
import { AnnouncementConfirmModal } from './AnnouncementConfirmModal';

type TemplateKey = 'new_projects' | 'popular_projects' | 'discover' | 'custom';

interface AnnouncementDraft {
  key: TemplateKey;
  label: string;
  title: string;
  body: string;
  actionLabel: string;
  actionPath: string;
  selectedProjectId?: string;
  selectedProjectTitle?: string;
  selectedProjectLogoUrl?: string;
}

interface AnnouncementHistoryItem {
  id: string;
  title: string;
  action_path: string;
  recipient_count: number;
  created_at: string;
}

interface PublishedProjectItem {
  id: string;
  title: string;
  tagline: string | null;
  logo_url: string | null;
  upvotes_count: number;
}

export interface AdminAnnouncementsViewProps {
  projects?: Listing[];
}

const templates: AnnouncementDraft[] = [
  {
    key: 'new_projects',
    label: 'Yeni yayınlar',
    title: 'Kıstas’ta yeni projeler yayında',
    body: 'Yeni yayınlanan projeleri inceleyin, ürün deneyimlerini değerlendirin ve yapıcı geri bildiriminizi paylaşın.',
    actionLabel: 'Yeni Projeleri İncele',
    actionPath: '/new',
  },
  {
    key: 'popular_projects',
    label: 'Topluluk seçkisi',
    title: 'Topluluğun öne çıkan projeleri',
    body: 'Kıstas topluluğunun en çok ilgi gösterdiği projeleri inceleyin ve değerlendirmeye katkıda bulunun.',
    actionLabel: 'Seçkiyi İncele',
    actionPath: '/popular',
  },
  {
    key: 'discover',
    label: 'Keşfedilmeyi bekleyenler',
    title: 'Değerlendirilmeyi bekleyen projeler',
    body: 'Yeni fikirleri erken aşamada inceleyin; değerlendirmeniz bağımsız geliştiricilerin ürünlerini geliştirmesine katkı sağlar.',
    actionLabel: 'Projeleri İncele',
    actionPath: '/browse',
  },
];

const newIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

export const AdminAnnouncementsView: React.FC<AdminAnnouncementsViewProps> = ({ projects: externalProjects }) => {
  const supabase = useMemo(() => createClient(), []);
  const [draft, setDraft] = useState<AnnouncementDraft>(templates[0]);
  const [history, setHistory] = useState<AnnouncementHistoryItem[]>([]);
  const [projects, setProjects] = useState<PublishedProjectItem[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const idempotencyKeyRef = useRef(newIdempotencyKey());
  const draftSectionRef = useRef<HTMLDivElement>(null);

  // Paylaşılan tüm projeleri getir
  const loadProjects = useCallback(async () => {
    if (externalProjects && externalProjects.length > 0) {
      setProjects(
        externalProjects.filter((project) => project.status === 'active').map((p) => ({
          id: p.id,
          title: p.title,
          tagline: p.tagline || null,
          logo_url: p.logo_url || null,
          upvotes_count: Number(p.upvote_count || 0),
        }))
      );
      return;
    }

    setIsLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, tagline, logo_url, upvote_count, created_at, status')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProjects(
          data.map((p) => ({
            id: p.id,
            title: p.title,
            tagline: p.tagline || null,
            logo_url: p.logo_url || null,
            upvotes_count: Number(p.upvote_count || 0),
          }))
        );
      }
    } catch (err) {
      console.error('Projeler yüklenirken hata:', err);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [supabase, externalProjects]);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('admin_announcements')
      .select('id, title, action_path, recipient_count, created_at')
      .order('created_at', { ascending: false })
      .limit(6);
    if (data) setHistory(data as AnnouncementHistoryItem[]);
  }, [supabase]);

  useEffect(() => {
    void loadProjects();
    void loadHistory();
  }, [loadProjects, loadHistory]);

  const applyTemplate = (template: AnnouncementDraft) => {
    setDraft({
      ...template,
      selectedProjectId: undefined,
      selectedProjectTitle: undefined,
      selectedProjectLogoUrl: undefined,
    });
    setFeedback(null);
    idempotencyKeyRef.current = newIdempotencyKey();
  };

  const updateDraft = <K extends keyof AnnouncementDraft>(key: K, value: AnnouncementDraft[K]) => {
    setDraft((current) => ({ ...current, key: 'custom', [key]: value }));
    setFeedback(null);
    idempotencyKeyRef.current = newIdempotencyKey();
  };

  // Proje seçildiğinde otomatik doldurma
  const handleSelectProject = (project: PublishedProjectItem) => {
    const targetPath = `/listings/${project.id}`;
    const autoTitle = `${project.title} Kıstas’ta yayında`.slice(0, 80);
    const autoBody = (project.tagline || `${project.title} projesini inceleyin ve ürün deneyimine ilişkin değerlendirmenizi paylaşın.`).slice(0, 240);

    setDraft({
      key: 'custom',
      label: project.title,
      title: autoTitle,
      body: autoBody,
      actionLabel: 'Göz at',
      actionPath: targetPath,
      selectedProjectId: project.id,
      selectedProjectTitle: project.title,
      selectedProjectLogoUrl: project.logo_url || undefined,
    });
    setFeedback(null);
    idempotencyKeyRef.current = newIdempotencyKey();

    // Form alanına yumuşak kaydır
    draftSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.tagline && p.tagline.toLowerCase().includes(q))
    );
  }, [projects, projectSearch]);

  const isValid =
    draft.title.trim().length >= 3 &&
    draft.title.trim().length <= 80 &&
    draft.body.trim().length >= 5 &&
    draft.body.trim().length <= 240 &&
    draft.actionLabel.trim().length >= 2 &&
    draft.actionLabel.trim().length <= 32;

  const handleInitiateSend = () => {
    if (!isValid || isSending) return;
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSend = async () => {
    if (!isValid || isSending) return;
    setIsSending(true);
    setFeedback(null);

    try {
      const { data, error } = await supabase.rpc('admin_send_announcement', {
        p_title: draft.title.trim(),
        p_body: draft.body.trim(),
        p_action_label: draft.actionLabel.trim(),
        p_action_path: draft.actionPath.trim(),
        p_template_key: draft.key,
        p_idempotency_key: idempotencyKeyRef.current,
      });

      if (error) {
        // Eğer veritabanı kuralı rota izin hatası verirse kullanıcıyı net bilgilendir
        if (error.message?.includes('INVALID_ACTION_PATH')) {
          setFeedback({
            type: 'error',
            message: 'Hedef rota kısıtlaması nedeniyle duyuru gönderilemedi. Lütfen veritabanı migrationlarını kontrol edin.',
          });
        } else {
          setFeedback({ type: 'error', message: error.message || 'Duyuru gönderilemedi.' });
        }
      } else {
        const result = data as { recipient_count?: number } | null;
        setFeedback({
          type: 'success',
          message: `Duyuru ${Number(result?.recipient_count || 0)} aktif kullanıcıya başarıyla iletildi!`,
        });
        idempotencyKeyRef.current = newIdempotencyKey();
        await loadHistory();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Bir hata oluştu.' });
    } finally {
      setIsSending(false);
      setIsConfirmModalOpen(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Bölüm: Proje yayınları */}
      <section className="relative rounded-[28px] border border-white/10 bg-[#0E1626]/75 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#3269C7]/20 border border-[#3269C7]/40 text-[#8DB9FF] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <Layers3 size={21} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Proje Yayınları
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#3269C7]/20 border border-[#3269C7]/30 text-[10px] font-bold text-[#8DB9FF]">
                  {projects.length} Proje
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#94A3B8] font-medium">
                Yayındaki bir projeyi seçin; kurumsal bildirimi hazırlayın ve toplulukla paylaşın.
              </p>
            </div>
          </div>

          {/* Proje Arama Çubuğu */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="Proje veya kategori ara..."
              className="w-full h-10 pl-9 pr-8 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-[#3269C7] focus:bg-white/[0.07] transition-all"
            />
            {projectSearch && (
              <button
                type="button"
                onClick={() => setProjectSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Projeler Kart Grid'i */}
        {isLoadingProjects ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 size={28} className="animate-spin text-[#3269C7]" />
            <span className="text-xs font-semibold">Yayındaki projeler getiriliyor...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Arama kriterine uygun proje bulunamadı.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredProjects.map((project) => {
              const isSelected = draft.selectedProjectId === project.id;

              return (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#3269C7] bg-[#3269C7]/15 shadow-[0_0_20px_rgba(50,105,199,0.35)] -translate-y-0.5'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {project.logo_url ? (
                        <AutoTransparentLogo
                          src={project.logo_url}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Globe size={20} className="text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <h3 className="text-xs font-bold text-white truncate group-hover:text-[#8DB9FF] transition-colors">
                          {project.title}
                        </h3>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 shrink-0">
                          <TrendingUp size={11} /> {project.upvotes_count || 0}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#94A3B8] line-clamp-2 leading-relaxed">
                        {project.tagline || 'Açıklama belirtilmemiş'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-400 font-medium">
                      Yayında
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectProject(project);
                      }}
                      className={`inline-flex items-center gap-1 font-bold transition-all px-2.5 py-1 rounded-lg ${
                        isSelected
                          ? 'bg-[#3269C7] text-white shadow-xs'
                          : 'text-[#8DB9FF] hover:bg-[#3269C7]/20'
                      }`}
                    >
                      {isSelected ? 'Seçildi' : 'Bildirime Ekle'}
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Bölüm: Yayın taslağı ve kullanıcı görünümü */}
      <section
        ref={draftSectionRef}
        className="rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 text-[#8DB9FF] flex items-center justify-center shrink-0">
              <Megaphone size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Duyuru Yayını</h2>
              <p className="mt-0.5 text-xs text-[#94A3B8] font-medium leading-relaxed">
                Duyuru, kayıtlı kullanıcıların bildirim merkezine ve site açıkken üst bildirim alanına iletilir.
              </p>
            </div>
          </div>

          {draft.selectedProjectTitle && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3269C7]/20 border border-[#3269C7]/40 text-xs font-bold text-[#8DB9FF]">
              <span>Seçili Proje: {draft.selectedProjectTitle}</span>
              <button
                type="button"
                onClick={() => applyTemplate(templates[0])}
                className="hover:text-white"
                title="Projeyi kaldır"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Hızlı Şablon Butonları */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {templates.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => applyTemplate(template)}
              className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                draft.key === template.key && !draft.selectedProjectId
                  ? 'border-[#3269C7] bg-[#3269C7]/20 shadow-[0_0_15px_rgba(50,105,199,0.3)]'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-bold text-white">
                <Bell size={14} className="text-[#8DB9FF]" />
                {template.label}
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-[#94A3B8]">
                {template.title}
              </span>
            </button>
          ))}
        </div>

        {/* Form Alanları */}
        <div className="mt-6 grid gap-4">
          <label className="grid gap-1.5 text-xs font-bold text-white/90">
            Bildirim Başlığı
            <input
              value={draft.title}
              maxLength={80}
              onChange={(event) => updateDraft('title', event.target.value)}
              className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#3269C7] focus:ring-1 focus:ring-[#3269C7] transition-all"
              placeholder="Örn: Nova SaaS Kıstas’ta yayında"
            />
            <span className="text-right text-[10px] font-medium text-slate-400">{draft.title.length}/80</span>
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-white/90">
            Açıklama Metni
            <textarea
              value={draft.body}
              maxLength={240}
              rows={3}
              onChange={(event) => updateDraft('body', event.target.value)}
              className="resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm leading-relaxed text-white placeholder-slate-500 outline-none focus:border-[#3269C7] focus:ring-1 focus:ring-[#3269C7] transition-all"
              placeholder="Kullanıcıların göreceği açıklama veya proje sloganı..."
            />
            <span className="text-right text-[10px] font-medium text-slate-400">{draft.body.length}/240</span>
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-white/90">
            Hedef Sayfa (Rota)
            <input
              value={draft.actionPath}
              onChange={(event) => updateDraft('actionPath', event.target.value)}
              readOnly={Boolean(draft.selectedProjectId)}
              className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-[#3269C7] read-only:cursor-not-allowed read-only:text-white/55"
              placeholder="/listings/... veya /browse"
            />
          </label>
        </div>

        {/* Kullanıcının göreceği ortak glass bildirim kartı */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-2.5">
            <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#8DB9FF]">
              <Bell size={13} /> Kullanıcı Görünümü
            </span>
            <span className="text-[10px] text-slate-400">Navbar ile aynı Kıstas glass yüzeyi</span>
          </div>

          <div className="p-6 sm:p-8 rounded-[24px] border border-white/10 bg-[#0E1626]/50 backdrop-blur-xl flex items-center justify-center">
            <GlobalNotificationCard
              type="admin_announcement"
              title={draft.title || 'Duyuru başlığı'}
              body={draft.body || 'Duyuru açıklaması burada görünecektir.'}
              logoUrl={draft.selectedProjectLogoUrl}
              logoAlt={draft.selectedProjectTitle}
              preview
            />
          </div>
        </div>

        {/* Bildirim Geri Bildirimi */}
        {feedback && (
          <div
            className={`mt-5 flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-semibold ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            <CheckCircle2 size={16} /> {feedback.message}
          </div>
        )}

        {/* Gönderim Butonu */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleInitiateSend}
            disabled={!isValid || isSending}
            className="shiny-cta min-w-56 cursor-pointer disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-black text-white">
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {draft.selectedProjectTitle
                ? 'Projeyi Tüm Kullanıcılara Bildir'
                : 'Tüm Kullanıcılara Yayınla'}
            </span>
          </button>
        </div>
      </section>

      {/* 3. Bölüm: Son Duyurular Geçmişi */}
      {history.length > 0 && (
        <section className="rounded-[28px] border border-white/10 bg-[#0E1626]/75 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <h3 className="text-sm font-black text-white tracking-tight">Geçmiş Yayınlar ve Bildirimler</h3>
          <div className="mt-4 divide-y divide-white/[0.06]">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3.5 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white/90">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {new Date(item.created_at).toLocaleString('tr-TR')} · {item.action_path}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#3269C7]/20 border border-[#3269C7]/30 px-3 py-1 text-[10px] font-bold text-[#8DB9FF]">
                  {item.recipient_count} Alıcı
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Kıstas Sıvı Cam Onay Modalı (SignOutConfirmModal Standartı) */}
      <AnnouncementConfirmModal
        isOpen={isConfirmModalOpen}
        isSending={isSending}
        projectTitle={draft.selectedProjectTitle}
        announcementTitle={draft.title}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={() => void handleConfirmSend()}
      />
    </div>
  );
};
