'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileText,
  Plus,
  Eye,
  Clock,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  BookOpen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

export interface AdminBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category: string;
  reading_time_minutes: number;
  is_published: boolean;
  view_count: number;
  published_at?: string;
  created_at: string;
}

interface AdminBlogViewProps {
  posts?: AdminBlogPost[];
  onRefresh?: () => void;
  searchQuery?: string;
}

export const AdminBlogView: React.FC<AdminBlogViewProps> = ({
  posts,
  onRefresh,
  searchQuery = '',
}) => {
  const [localPosts, setLocalPosts] = useState<AdminBlogPost[]>(posts || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form alanları
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Girişimcilik');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [readingTime, setReadingTime] = useState(4);
  const [isPublished, setIsPublished] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (posts && posts.length > 0) {
      setLocalPosts(posts);
    } else {
      supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setLocalPosts(data as AdminBlogPost[]);
        });
    }
  }, [posts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtreleme
  const filtered = localPosts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q)
    );
  });

  // Slug otomatik türetme
  const handleTitleChange = (val: string) => {
    setTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(generatedSlug);
  };

  // Yayın Durumunu Değiştir (Yayında / Taslak)
  const handleTogglePublish = async (post: AdminBlogPost) => {
    setActionBusyId(post.id);
    try {
      const nextStatus = !post.is_published;
      const { error } = await supabase
        .from('blog_posts')
        .update({
          is_published: nextStatus,
          published_at: nextStatus ? new Date().toISOString() : post.published_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (error) throw error;
      showToast(nextStatus ? 'Yazı yayına alındı.' : 'Yazı taslağa çekildi.');
      onRefresh?.();
    } catch (err: any) {
      console.error('handleTogglePublish error:', err);
      showToast('Hata: ' + (err.message || 'Durum güncellenemedi.'));
    } finally {
      setActionBusyId(null);
    }
  };

  // Yazıyı Sil
  const handleDeletePost = async (post: AdminBlogPost) => {
    if (!window.confirm(`"${post.title}" başlıklı yazıyı silmek istediğinize emin misiniz?`)) {
      return;
    }
    setActionBusyId(post.id);
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', post.id);
      if (error) throw error;
      showToast('Makale başarıyla silindi.');
      onRefresh?.();
    } catch (err: any) {
      console.error('handleDeletePost error:', err);
      showToast('Hata: ' + (err.message || 'Makale silinemedi.'));
    } finally {
      setActionBusyId(null);
    }
  };

  // Yeni Makale Kaydet
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast('Başlık ve içerik alanları zorunludur.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('blog_posts').insert({
        title: title.trim(),
        slug: slug.trim() || `post-${Date.now()}`,
        category: category.trim() || 'Girişimcilik',
        excerpt: excerpt.trim() || title.trim(),
        content: content.trim(),
        cover_image_url:
          coverImageUrl.trim() ||
          'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
        reading_time_minutes: Number(readingTime) || 4,
        is_published: isPublished,
        author_name: 'Kıstas Editoryal',
        author_title: 'Teknoloji & İnovasyon Ekibi',
        view_count: 0,
        published_at: isPublished ? new Date().toISOString() : null,
      });

      if (error) throw error;
      showToast('Yeni blog makalesi başarıyla yayınlandı!');
      setIsModalOpen(false);
      // Formu sıfırla
      setTitle('');
      setSlug('');
      setExcerpt('');
      setContent('');
      setCoverImageUrl('');
      onRefresh?.();
    } catch (err: any) {
      console.error('handleCreatePost error:', err);
      showToast('Hata: ' + (err.message || 'Makale kaydedilemedi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Bilgilendirmesi */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-blue-500/30 bg-[#0E182A]/95 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-3">
          <AlertCircle size={15} className="text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Üst Bar: Başlık ve Yeni Makale Butonu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2.5">
            <FileText size={20} className="text-purple-400" />
            <span>Blog & Editoryal İçerik Yönetimi</span>
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            SEO odaklı makaleler, rehberler ve dizin içeriklerini tek merkezden yönetin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-9 px-4 rounded-xl border border-purple-500/35 bg-purple-500/15 hover:bg-purple-500/25 hover:border-purple-400 text-purple-200 hover:text-white text-xs font-semibold inline-flex items-center gap-2 transition-all duration-200 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Yeni Makale Ekle</span>
        </button>
      </div>

      {/* Makaleler Listesi */}
      {filtered.length === 0 ? (
        <div className="rounded-[24px] border border-blue-500/25 bg-gradient-to-br from-[#0E182A] to-[#0A101D] p-12 text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-3">
            <BookOpen size={22} />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Henüz Makale Bulunmuyor</h3>
          <p className="text-xs text-[#94A3B8] max-w-sm mx-auto mb-4">
            {searchQuery
              ? 'Aramanızla eşleşen bir blog içeriği bulunamadı.'
              : 'Kıstas ekosistemine yeni bir makale veya rehber ekleyerek başlayabilirsiniz.'}
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-4 rounded-xl border border-purple-500/35 bg-purple-500/15 hover:bg-purple-500/25 hover:border-purple-400 text-purple-200 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-200 shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>İlk Makaleyi Yaz</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filtered.map((post, index) => {
            const isBusy = actionBusyId === post.id;
            const dateFormatted = post.created_at
              ? new Intl.DateTimeFormat('tr-TR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }).format(new Date(post.created_at))
              : '';

            return (
              <div
                key={post.id || `post-${index}`}
                className="group rounded-2xl border border-blue-500/25 bg-gradient-to-br from-[#0E182A] to-[#0A101D] p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-lg hover:border-blue-400/40 transition-all duration-200"
              >
                {/* Kapak ve Başlık Bilgileri */}
                <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                  <div className="h-16 w-24 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 relative">
                    {post.cover_image_url ? (
                      <Image
                        src={post.cover_image_url}
                        alt={post.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-purple-400">
                        <FileText size={20} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                        {post.category}
                      </span>
                      {post.is_published ? (
                        <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          Yayında
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300 inline-flex items-center gap-1">
                          <XCircle size={11} />
                          Taslak
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-white tracking-tight line-clamp-1">
                      {post.title}
                    </h3>

                    <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {post.reading_time_minutes} dk okuma
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye size={11} />
                        {post.view_count || 0} görüntülenme
                      </span>
                      {dateFormatted && (
                        <>
                          <span>•</span>
                          <span>{dateFormatted}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="h-8.5 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Yazıyı Yeni Sekmede Oku"
                  >
                    <ExternalLink size={13} />
                    <span>Görüntüle</span>
                  </Link>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleTogglePublish(post)}
                    className={`h-8.5 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-50 ${
                      post.is_published
                        ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200'
                        : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200'
                    }`}
                  >
                    {isBusy ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : post.is_published ? (
                      <XCircle size={13} className="text-amber-300/80" />
                    ) : (
                      <CheckCircle2 size={13} className="text-emerald-300/80" />
                    )}
                    <span>{post.is_published ? 'Taslağa Al' : 'Yayına Al'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDeletePost(post)}
                    className="h-8.5 w-8.5 rounded-xl border border-white/10 bg-white/5 hover:border-rose-500/30 hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50"
                    title="Makaleyi Sil"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Yeni Makale Oluşturma Modalı */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="k-modal-glass-card w-full max-w-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <h3 className="text-base font-black text-white">Yeni Blog Makalesi Ekle</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Makale Başlığı *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Örn: 2026'da SaaS Başlatmanın Altın Kuralları"
                  className="w-full h-10 px-3.5 rounded-xl border border-blue-500/25 bg-black/50 text-xs text-white placeholder:text-[#64748B] focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="saas-baslatmanin-altin-kurallari"
                    className="w-full h-10 px-3.5 rounded-xl border border-blue-500/25 bg-black/50 text-xs text-white placeholder:text-[#64748B] focus:border-blue-400 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-blue-500/25 bg-black/50 text-xs text-white focus:border-blue-400 focus:outline-none"
                  >
                    <option value="Girişimcilik">Girişimcilik</option>
                    <option value="Teknoloji">Teknoloji</option>
                    <option value="Rehberler">Rehberler</option>
                    <option value="Yapay Zeka">Yapay Zeka</option>
                    <option value="Kıstas Güncellemeleri">Kıstas Güncellemeleri</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">Okuma Süresi (Dk)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={readingTime}
                    onChange={(e) => setReadingTime(Number(e.target.value))}
                    className="w-full h-10 px-3.5 rounded-xl border border-blue-500/25 bg-black/50 text-xs text-white focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Kapak Görseli URL</label>
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full h-10 px-3.5 rounded-xl border border-blue-500/25 bg-black/50 text-xs text-white placeholder:text-[#64748B] focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Özet / Excerpt</label>
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Yazının kartlarda ve SEO'da görünecek kısa özeti..."
                  className="w-full p-3 rounded-xl border border-blue-500/25 bg-black/50 text-xs text-white placeholder:text-[#64748B] focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5">İçerik (Markdown veya Metin) *</label>
                <textarea
                  rows={7}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Makale içeriğini detaylı olarak buraya girin..."
                  className="w-full p-3.5 rounded-xl border border-blue-500/25 bg-black/50 text-xs text-white placeholder:text-[#64748B] focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="rounded border-blue-500/30 bg-black/50 text-purple-600 focus:ring-0"
                  />
                  <span>Hemen Yayına Al</span>
                </label>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-9 px-4 rounded-xl border border-white/10 text-xs font-semibold text-[#CBD5E1] hover:bg-white/5 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-9 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-purple-500/25 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                    <span>Makaleyi Yayınla</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
