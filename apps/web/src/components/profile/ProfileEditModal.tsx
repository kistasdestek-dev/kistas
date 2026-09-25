'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Camera, Check, Loader2, AlertCircle } from 'lucide-react';
import { isReservedBrandName } from '@kistas/shared';
import { createClient } from '@/lib/supabase/browser';
import { KistasLogo } from '../KistasLogo';
import { ShinyButton } from '../ui/shiny-button';
import { KISTAS_AVATAR_PATHS, resolveAvatarUrl, toLocalKistasAvatarPath, toStoredAvatarUrl } from '@/lib/avatar';
import type { Profile } from '@kistas/shared';

interface ProfileEditModalProps {
  isOpen: boolean;
  profile: Profile | null;
  isAdmin: boolean;
  onClose: () => void;
  onSuccess: (updatedProfile: Partial<Profile>) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  profile,
  isAdmin,
  onClose,
  onSuccess,
}) => {
  const [draftName, setDraftName] = useState(profile?.full_name || '');
  const [draftBio, setDraftBio] = useState(profile?.bio || '');
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(
    toLocalKistasAvatarPath(profile?.avatar_url) || profile?.avatar_url || ''
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const scrollY = window.scrollY;
    const previousBody = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBody.overflow;
      document.body.style.position = previousBody.position;
      document.body.style.top = previousBody.top;
      document.body.style.width = previousBody.width;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isBrandReserved = !isAdmin && isReservedBrandName(draftName);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setSaveError('Profil fotoğrafı en fazla 8 MB olabilir.');
      return;
    }

    setIsUploadingAvatar(true);
    setSaveError('');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
      const randomPart = Math.random().toString(36).substring(2, 10);
      const fileKey = `avatars/${Date.now()}-${randomPart}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('kistas')
        .upload(fileKey, file, {
          cacheControl: '31536000',
          upsert: true,
          contentType: file.type || `image/${ext}`,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from('kistas')
        .getPublicUrl(fileKey);

      setDraftAvatarUrl(publicData.publicUrl);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setSaveError(err.message || 'Profil fotoğrafı yüklenemedi.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (saving || isUploadingAvatar) return;

    const trimmedName = draftName.trim();
    if (!trimmedName) {
      setSaveError('Ad ve soyad alanı boş bırakılamaz.');
      return;
    }

    if (isBrandReserved) {
      setSaveError('‘Kıstas’ adı ve varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaveError('Oturum bilgisi doğrulanamadı.');
        setSaving(false);
        return;
      }

      const updatePayload: Record<string, string | null> = {
        full_name: trimmedName,
        bio: draftBio.trim() || null,
        avatar_url: draftAvatarUrl.trim() ? toStoredAvatarUrl(draftAvatarUrl.trim()) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (error) {
        setSaveError(error.message || 'Profil güncellenemedi.');
        setSaving(false);
        return;
      }

      onSuccess({
        full_name: trimmedName,
        bio: draftBio.trim(),
        avatar_url: draftAvatarUrl.trim(),
      });
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Profil kaydedilirken bağlantı hatası oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-[#030814]/80 p-3 backdrop-blur-xl animate-in fade-in duration-200 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-edit-title"
    >
      <div
        className="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-[28px] border border-[#5E8FD8]/25 bg-[linear-gradient(145deg,rgba(15,31,57,.98),rgba(6,16,34,.98))] p-5 shadow-[0_24px_80px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.08)] sm:max-h-[92vh] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 h-52 w-72 -translate-x-1/2 rounded-full bg-[#3269C7]/20 blur-3xl" />

        <div className="relative flex items-center justify-between pb-5">
          <h3 id="profile-edit-title" className="text-lg font-bold tracking-tight text-white">
            Profili düzenle
          </h3>
          <button
            type="button"
            disabled={saving || isUploadingAvatar}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.07] text-[#AFC5E6] transition-colors hover:bg-white/[0.12] hover:text-white cursor-pointer disabled:opacity-50"
            aria-label="Profil düzenlemeyi kapat"
          >
            <X size={16} />
          </button>
        </div>

        <section className="relative rounded-2xl bg-[#0A172B]/55 p-4 sm:p-5" aria-labelledby="profile-photo-title">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileChange}
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
          />

          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={saving || isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-visible rounded-full bg-transparent p-0 cursor-pointer disabled:opacity-50"
              title="Profil fotoğrafını değiştir"
              aria-label="Profil fotoğrafını değiştir"
            >
              {draftAvatarUrl ? (
                <img
                  src={resolveAvatarUrl(draftAvatarUrl)}
                  alt="Mevcut profil fotoğrafı"
                  className="h-full w-full rounded-full object-cover transition-transform group-hover:scale-[1.03]"
                />
              ) : (
                <KistasLogo size={52} showWordmark={false} className="transition-transform group-hover:scale-[1.03]" />
              )}
              <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#3269C7] text-white shadow-[0_5px_14px_rgba(50,105,199,.45)]">
                {isUploadingAvatar ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Camera size={13} />
                )}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <h4 id="profile-photo-title" className="text-sm font-bold text-white">
                Profil fotoğrafı
              </h4>
              <p className="mt-1 text-[11px] leading-4 text-[#91A6C5]">
                PNG, JPG veya WEBP biçiminde kare bir görsel seçin.
              </p>
              <button
                type="button"
                disabled={saving || isUploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#3269C7]/18 px-3 py-1.5 text-[11px] font-bold text-[#8DB9FF] transition-colors hover:bg-[#3269C7]/28 cursor-pointer disabled:opacity-50"
              >
                {isUploadingAvatar ? 'Yükleniyor...' : 'Fotoğrafı değiştir'}
              </button>
            </div>
          </div>

          <div className="mt-5 border-t border-[#6B8FC4]/15 pt-4">
            <p className="mb-3 text-[11px] font-bold text-[#91A6C5]">Kıstas avatarları</p>
            <div className="grid grid-cols-4 gap-3 sm:gap-4" role="radiogroup" aria-label="Kıstas profil avatarları">
              {KISTAS_AVATAR_PATHS.map((avatarPath, index) => {
                const selected = toLocalKistasAvatarPath(draftAvatarUrl) === avatarPath;
                return (
                  <button
                    key={avatarPath}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Kıstas avatarı ${index + 1}`}
                    disabled={saving || isUploadingAvatar}
                    onClick={() => setDraftAvatarUrl(avatarPath)}
                    className={`relative aspect-square rounded-full bg-transparent p-0 transition-all cursor-pointer disabled:opacity-50 ${selected ? 'scale-[1.04] drop-shadow-[0_0_12px_rgba(74,144,245,.6)]' : 'opacity-80 hover:scale-[1.03] hover:opacity-100'}`}
                  >
                    <img src={avatarPath} alt="" className="h-full w-full rounded-full object-cover" />
                    {selected ? (
                      <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#3269C7] text-white shadow-[0_4px_10px_rgba(50,105,199,.5)]" aria-hidden="true">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="relative space-y-4 pt-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#AFC5E6]">
              Ad ve soyad
            </label>
            <input
              type="text"
              value={draftName}
              onChange={(e) => {
                setDraftName(e.target.value);
                if (saveError) setSaveError('');
              }}
              maxLength={100}
              disabled={saving}
              className={`h-12 w-full rounded-xl border bg-[#08162B]/80 px-4 text-sm font-semibold text-white outline-none transition-[border-color,box-shadow] focus:border-[#5C94E8] focus:shadow-[0_0_0_3px_rgba(50,105,199,.16)] ${
                isBrandReserved ? 'border-red-500' : 'border-[#36577F]/60'
              }`}
            />
            {isBrandReserved && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-400">
                <AlertCircle size={12} />
                <span>‘Kıstas’ adı ve varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.</span>
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-bold text-[#AFC5E6]">
                Hakkımda
              </label>
              <span className="text-[10px] text-[#7187A7]">
                {draftBio.length} / 500
              </span>
            </div>
            <textarea
              value={draftBio}
              onChange={(e) => setDraftBio(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={saving}
              placeholder="Kendinizden ve projelerinizden bahsedin..."
              className="w-full resize-none rounded-xl border border-[#36577F]/60 bg-[#08162B]/80 p-4 text-sm font-medium leading-5 text-white outline-none transition-[border-color,box-shadow] placeholder:text-[#637895] focus:border-[#5C94E8] focus:shadow-[0_0_0_3px_rgba(50,105,199,.16)]"
            />
          </div>

          {saveError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs font-medium text-red-300">
              <AlertCircle size={14} className="shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <ShinyButton
            disabled={saving || isUploadingAvatar || isBrandReserved}
            onClick={handleSave}
            className="mt-2 min-h-12"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              <span>{saving ? 'Kaydediliyor...' : 'Değişiklikleri kaydet'}</span>
            </span>
          </ShinyButton>
        </div>
      </div>
    </div>
  );
};
