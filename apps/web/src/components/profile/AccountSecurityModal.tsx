'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { GlassIconButton } from '../GlassIconButton';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface AccountSecurityModalProps {
  isOpen: boolean;
  email?: string | null;
  onClose: () => void;
}

const getPasswordStrength = (pwd: string): number => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
};

export const AccountSecurityModal: React.FC<AccountSecurityModalProps> = ({
  isOpen,
  email,
  onClose,
}) => {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const supabase = createClient();
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const strength = getPasswordStrength(newPassword);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ text: 'Şifreniz en az 6 karakter olmalıdır.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Yeni şifreler birbiriyle eşleşmiyor.', type: 'error' });
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setMessage({ text: error.message || 'Şifre güncellenemedi.', type: 'error' });
      } else {
        setMessage({ text: 'Şifreniz başarıyla güncellendi!', type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordChange(false);
      }
    } catch {
      setMessage({ text: 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleResendEmailVerification = async () => {
    if (!email) return;
    setBusy(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        setMessage({ text: error.message || 'Doğrulama e-postası gönderilemedi.', type: 'error' });
      } else {
        setMessage({
          text: 'Doğrulama bağlantısı e-posta adresinize gönderildi!',
          type: 'success',
        });
      }
    } catch {
      setMessage({ text: 'Bağlantı hatası oluştu.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-none p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="k-modal-glass-card w-full max-w-lg max-h-[92vh] touch-pan-y overflow-y-auto overscroll-contain p-6 [-webkit-overflow-scrolling:touch] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-gradient-to-b from-[#3B82F6]/25 via-[#60A5FA]/10 to-transparent blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <GlassIconButton icon={ShieldCheck} size={42} iconSize={20} ariaLabel="Hesap Güvenliği" />
            <div>
              <p className="text-[10px] font-bold tracking-wider text-[#A1A1AA] uppercase">
                GÜVENLİK MERKEZİ
              </p>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Hesap Güvenliği
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-md cursor-pointer shadow-xs"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status Rows */}
        <div className="my-5 space-y-3">
          {/* Email row */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-[#141414]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3269C7]/20 text-[#60A5FA]">
                <Mail size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  E-posta Adresi
                </p>
                <p className="text-[11px] text-[#A1A1AA]">
                  {email || 'Belirtilmemiş'}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={handleResendEmailVerification}
              className="text-[11px] font-bold text-[#60A5FA] hover:underline cursor-pointer disabled:opacity-50"
            >
              Doğrula
            </button>
          </div>

          {/* Active session row */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-[#141414]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  Oturum Durumu
                </p>
                <p className="text-[11px] text-[#A1A1AA]">
                  Bu cihazda güvenli ve aktif
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
              Aktif
            </span>
          </div>

          {/* Password action toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-[#141414]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3269C7]/20 text-[#60A5FA]">
                <Lock size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  Hesap Şifresi
                </p>
                <p className="text-[11px] text-[#A1A1AA]">
                  Güçlü ve benzersiz bir parola kullanın
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPasswordChange((prev) => !prev);
                setMessage(null);
              }}
              className="text-[11px] font-bold text-[#60A5FA] hover:underline cursor-pointer"
            >
              {showPasswordChange ? 'Vazgeç' : 'Şifreyi Değiştir'}
            </button>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-4 p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              message.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0" />
            ) : (
              <AlertCircle size={15} className="shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Password Change Form */}
        {showPasswordChange && (
          <form onSubmit={handlePasswordChange} className="p-4 rounded-2xl border border-white/10 bg-[#141414] space-y-3.5 animate-in fade-in duration-150">
            <h4 className="text-xs font-bold text-white">
              Yeni Şifre Belirle
            </h4>

            {/* New Password */}
            <div>
              <div className="relative">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yeni şifreniz"
                  className="w-full h-10 px-3.5 pr-10 rounded-xl border border-white/10 bg-[#1A1A1A] text-xs font-semibold text-white placeholder-[#71717A] focus:outline-none focus:border-[#3269C7]"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showPasswordText ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Password strength bar */}
              {newPassword && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-[#222222] overflow-hidden flex gap-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        strength <= 1
                          ? 'w-1/3 bg-red-500'
                          : strength === 2
                            ? 'w-2/3 bg-amber-500'
                            : 'w-full bg-emerald-500'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[#A1A1AA]">
                    {strength <= 1 ? 'Zayıf' : strength === 2 ? 'Orta' : 'Güçlü'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <input
                type={showPasswordText ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifreyi onaylayın"
                className="w-full h-10 px-3.5 rounded-xl border border-white/10 bg-[#1A1A1A] text-xs font-semibold text-white placeholder-[#71717A] focus:outline-none focus:border-[#3269C7]"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy || !newPassword || newPassword !== confirmPassword}
              className="k-modal-glass-btn-primary w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-xs active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              <span>Şifreyi Güncelle</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
