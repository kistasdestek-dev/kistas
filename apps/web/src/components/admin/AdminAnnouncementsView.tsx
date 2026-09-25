'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, CheckCircle2, Loader2, Megaphone, Send, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

type TemplateKey = 'new_projects' | 'popular_projects' | 'discover' | 'custom';

interface AnnouncementDraft {
  key: TemplateKey;
  label: string;
  title: string;
  body: string;
  actionLabel: string;
  actionPath: '/' | '/browse' | '/new' | '/popular' | '/blog';
}

interface AnnouncementHistoryItem {
  id: string;
  title: string;
  action_path: string;
  recipient_count: number;
  created_at: string;
}

const templates: AnnouncementDraft[] = [
  {
    key: 'new_projects',
    label: 'Yeni projeler',
    title: 'Yeni projeler seni bekliyor',
    body: 'Topluluğun yeni ürünlerini incele, geri bildirim bırak ve erken destekçilerden biri ol.',
    actionLabel: 'Yeni projeleri gör',
    actionPath: '/new',
  },
  {
    key: 'popular_projects',
    label: 'Popüler projeler',
    title: 'Bugünün popülerlerini keşfet',
    body: 'Kıstas topluluğunun en çok desteklediği projelere göz at ve favorine desteğini ver.',
    actionLabel: 'Popülerlere git',
    actionPath: '/popular',
  },
  {
    key: 'discover',
    label: 'Keşfet',
    title: 'Yeni bir fikre ilk desteği sen ver',
    body: 'Henüz keşfedilmemiş projeleri incele; yorumun ve desteğin bir geliştiricinin yolunu açabilir.',
    actionLabel: 'Projeleri keşfet',
    actionPath: '/browse',
  },
];

const newIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

export const AdminAnnouncementsView: React.FC = () => {
  const supabase = useMemo(() => createClient(), []);
  const [draft, setDraft] = useState<AnnouncementDraft>(templates[0]);
  const [history, setHistory] = useState<AnnouncementHistoryItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const idempotencyKeyRef = useRef(newIdempotencyKey());

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('admin_announcements')
      .select('id, title, action_path, recipient_count, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setHistory(data as AnnouncementHistoryItem[]);
  }, [supabase]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const applyTemplate = (template: AnnouncementDraft) => {
    setDraft(template);
    setFeedback(null);
    idempotencyKeyRef.current = newIdempotencyKey();
  };

  const updateDraft = <K extends keyof AnnouncementDraft>(key: K, value: AnnouncementDraft[K]) => {
    setDraft((current) => ({ ...current, key: 'custom', [key]: value }));
    setFeedback(null);
    idempotencyKeyRef.current = newIdempotencyKey();
  };

  const isValid = draft.title.trim().length >= 3
    && draft.title.trim().length <= 80
    && draft.body.trim().length >= 5
    && draft.body.trim().length <= 240
    && draft.actionLabel.trim().length >= 2
    && draft.actionLabel.trim().length <= 32;

  const handleSend = async () => {
    if (!isValid || isSending) return;
    if (!window.confirm('Bu duyuru tüm kayıtlı kullanıcılara gönderilecek. Devam edilsin mi?')) return;

    setIsSending(true);
    setFeedback(null);
    const { data, error } = await supabase.rpc('admin_send_announcement', {
      p_title: draft.title.trim(),
      p_body: draft.body.trim(),
      p_action_label: draft.actionLabel.trim(),
      p_action_path: draft.actionPath,
      p_template_key: draft.key,
      p_idempotency_key: idempotencyKeyRef.current,
    });

    if (error) {
      setFeedback({ type: 'error', message: error.message || 'Duyuru gönderilemedi.' });
    } else {
      const result = data as { recipient_count?: number } | null;
      setFeedback({
        type: 'success',
        message: `Duyuru ${Number(result?.recipient_count || 0)} kullanıcıya gönderildi.`,
      });
      idempotencyKeyRef.current = newIdempotencyKey();
      await loadHistory();
    }
    setIsSending(false);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[26px] border border-white/90 bg-white p-5 shadow-[4px_8px_24px_rgba(130,146,168,0.14)] sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#3269C7]">
            <Megaphone size={21} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#25364E]">Topluluk duyurusu</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#64748B]">
              Seçtiğiniz duyuru tüm kayıtlı kullanıcılara bildirim merkezinde ve site açıkken glass kart olarak ulaşır.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => applyTemplate(template)}
              className={`rounded-2xl border p-3 text-left transition-all ${draft.key === template.key ? 'border-[#3269C7] bg-blue-50 shadow-sm' : 'border-[#DCE6F2] bg-[#F8FAFD] hover:border-[#9DB8DD]'}`}
            >
              <span className="flex items-center gap-2 text-xs font-bold text-[#25364E]"><Sparkles size={14} className="text-[#3269C7]" />{template.label}</span>
              <span className="mt-1.5 block text-[11px] leading-4 text-[#64748B]">{template.title}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1.5 text-xs font-bold text-[#41536C]">
            Başlık
            <input value={draft.title} maxLength={80} onChange={(event) => updateDraft('title', event.target.value)} className="h-11 rounded-xl border border-[#D7E2EF] bg-[#F7F9FC] px-3.5 text-sm text-[#25364E] outline-none focus:border-[#3269C7]" />
            <span className="text-right text-[10px] font-medium text-[#8290A5]">{draft.title.length}/80</span>
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-[#41536C]">
            Açıklama
            <textarea value={draft.body} maxLength={240} rows={4} onChange={(event) => updateDraft('body', event.target.value)} className="resize-none rounded-xl border border-[#D7E2EF] bg-[#F7F9FC] px-3.5 py-3 text-sm leading-5 text-[#25364E] outline-none focus:border-[#3269C7]" />
            <span className="text-right text-[10px] font-medium text-[#8290A5]">{draft.body.length}/240</span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold text-[#41536C]">
              Buton metni
              <input value={draft.actionLabel} maxLength={32} onChange={(event) => updateDraft('actionLabel', event.target.value)} className="h-11 rounded-xl border border-[#D7E2EF] bg-[#F7F9FC] px-3.5 text-sm text-[#25364E] outline-none focus:border-[#3269C7]" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#41536C]">
              Hedef sayfa
              <select value={draft.actionPath} onChange={(event) => updateDraft('actionPath', event.target.value as AnnouncementDraft['actionPath'])} className="h-11 rounded-xl border border-[#D7E2EF] bg-[#F7F9FC] px-3.5 text-sm text-[#25364E] outline-none focus:border-[#3269C7]">
                <option value="/browse">Göz At</option>
                <option value="/new">Yeni Çıkanlar</option>
                <option value="/popular">Popüler</option>
                <option value="/blog">Blog</option>
                <option value="/">Ana sayfa</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 rounded-[22px] border border-white/15 bg-[linear-gradient(145deg,#18304F,#091326)] p-4 text-white shadow-[0_18px_42px_rgba(9,19,38,.22)]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-400/15 text-[#8DB9FF]"><BellRing size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black">{draft.title || 'Duyuru başlığı'}</p>
              <p className="mt-1 text-[11px] leading-4 text-[#B8C7DC]">{draft.body || 'Duyuru açıklaması'}</p>
              <span className="mt-2 inline-flex text-[10px] font-bold text-[#79A9F4]">{draft.actionLabel || 'Göz at'} →</span>
            </div>
          </div>
        </div>

        {feedback && (
          <div className={`mt-4 flex items-center gap-2 rounded-xl px-3.5 py-3 text-xs font-semibold ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            <CheckCircle2 size={15} /> {feedback.message}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => void handleSend()} disabled={!isValid || isSending} className="shiny-cta min-w-44 disabled:pointer-events-none disabled:opacity-45">
            <span className="flex items-center justify-center gap-2 px-5 py-3 text-xs font-black text-white">
              {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Tüm kullanıcılara gönder
            </span>
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="rounded-[24px] border border-white/90 bg-white p-5 shadow-[4px_8px_22px_rgba(130,146,168,0.12)]">
          <h3 className="text-sm font-black text-[#25364E]">Son duyurular</h3>
          <div className="mt-3 divide-y divide-[#E5ECF4]">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                <div className="min-w-0"><p className="truncate font-bold text-[#33465F]">{item.title}</p><p className="mt-0.5 text-[10px] text-[#8290A5]">{new Date(item.created_at).toLocaleString('tr-TR')} · {item.action_path}</p></div>
                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-[#3269C7]">{item.recipient_count} alıcı</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
