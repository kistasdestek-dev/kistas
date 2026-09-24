'use client';

import React, { useState, useRef } from 'react';
import { X, Camera, Check, Loader2, AlertCircle } from 'lucide-react';
import { isReservedBrandName } from '@kistas/shared';
import { createClient } from '@/lib/supabase/browser';
import { KistasLogo } from '../KistasLogo';
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
  const [draftCity, setDraftCity] = useState(profile?.city || '');
  const [draftDistrict, setDraftDistrict] = useState(profile?.district || '');
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(profile?.avatar_url || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

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

      const updatePayload: Record<string, any> = {
        full_name: trimmedName,
        bio: draftBio.trim() || null,
        city: draftCity.trim() || null,
        district: draftDistrict.trim() || null,
        avatar_url: draftAvatarUrl.trim() || null,
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
        city: draftCity.trim(),
        district: draftDistrict.trim(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="k-modal-glass-card w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-[#3B82F6]/25 via-[#60A5FA]/10 to-transparent blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-lg font-bold text-white tracking-tight">
            Profili düzenle
          </h3>
          <button
            type="button"
            disabled={saving || isUploadingAvatar}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-md cursor-pointer shadow-xs disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Avatar Selection Row */}
        <div className="flex items-center gap-4 py-5 border-b border-white/10">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileChange}
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
          />

          <div
            onClick={() => !saving && !isUploadingAvatar && fileInputRef.current?.click()}
            className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#161616] shadow-md cursor-pointer overflow-hidden group"
            title="Profil fotoğrafını değiştir"
          >
            {draftAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draftAvatarUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <KistasLogo size={42} showWordmark={false} />
            )}

            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-[#1F1F1F] border-2 border-[#0E0E0E] text-white shadow-sm">
              {isUploadingAvatar ? (
                <Loader2 size={13} className="animate-spin text-[#3269C7]" />
              ) : (
                <Camera size={13} />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white">
              Profil fotoğrafı
            </h4>
            <p className="mt-0.5 text-[11px] text-[#A1A1AA]">
              Kare bir PNG, JPG veya WEBP görsel seçin.
            </p>
            <button
              type="button"
              disabled={saving || isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#3269C7]/30 bg-[#3269C7]/20 px-2.5 py-1 text-[11px] font-bold text-[#60A5FA] hover:bg-[#3269C7]/30 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {isUploadingAvatar ? 'Yükleniyor...' : 'Fotoğrafı Değiştir'}
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 pt-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">
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
              className={`w-full h-11 px-3.5 rounded-xl border bg-[#161616] text-xs font-semibold text-white focus:outline-none focus:border-[#3269C7] transition-all ${
                isBrandReserved ? 'border-red-500' : 'border-white/10'
              }`}
            />
            {isBrandReserved && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-400">
                <AlertCircle size={12} />
                <span>‘Kıstas’ adı ve varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.</span>
              </p>
            )}
          </div>

          {/* Location Row (City / District) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">
                Şehir
              </label>
              <input
                type="text"
                value={draftCity}
                onChange={(e) => setDraftCity(e.target.value)}
                maxLength={50}
                placeholder="Örn. İstanbul"
                disabled={saving}
                className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-[#161616] text-xs font-semibold text-white placeholder-[#71717A] focus:outline-none focus:border-[#3269C7] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#A1A1AA] mb-1.5">
                İlçe
              </label>
              <input
                type="text"
                value={draftDistrict}
                onChange={(e) => setDraftDistrict(e.target.value)}
                maxLength={50}
                placeholder="Örn. Kadıköy"
                disabled={saving}
                className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-[#161616] text-xs font-semibold text-white placeholder-[#71717A] focus:outline-none focus:border-[#3269C7] transition-all"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#A1A1AA]">
                Hakkımda
              </label>
              <span className="text-[10px] text-[#71717A]">
                {draftBio.length} / 500
              </span>
            </div>
            <textarea
              value={draftBio}
              onChange={(e) => setDraftBio(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={saving}
              placeholder="Kendinizden ve projelerinizden bahsedin..."
              className="w-full p-3.5 rounded-xl border border-white/10 bg-[#161616] text-xs font-semibold text-white placeholder-[#71717A] focus:outline-none focus:border-[#3269C7] transition-all resize-none"
            />
          </div>

          {/* Error message */}
          {saveError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 font-medium flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            disabled={saving || isUploadingAvatar || isBrandReserved}
            onClick={handleSave}
            className="k-modal-glass-btn-primary w-full h-12 mt-4 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-xs active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Değişiklikleri kaydet</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
