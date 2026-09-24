'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';
import { LoginAvatarVideo } from './LoginAvatarVideo';
import { ParsDevstateLogo } from './ParsDevstateLogo';
import { GlassIconButton } from './GlassIconButton';
import { Typewriter } from './Typewriter';
import { HoneypotDecoyField } from './HoneypotDecoyField';
import { LegalModal, LEGAL_DOCUMENTS, LegalDoc } from './LegalModal';
import { createClient } from '@/lib/supabase/browser';
import { GoogleIdentityButton } from './GoogleIdentityButton';

const LOGIN_TYPEWRITER_WORDS = [
  'Geleceğin projelerini keşfedin.',
  'Fikirlerinizi vitrine taşıyın.',
  'İlham veren ürünleri inceleyin.',
  'Dijital ekosisteme yön verin.',
];

const REGISTER_TYPEWRITER_WORDS = [
  'Kıstas’a katılın.',
  'Projelerinizi vitrine taşıyın.',
  'Geleceği birlikte inşa edelim.',
];

export interface AuthExperienceClientProps {
  mode: 'login' | 'register';
}

export const AuthExperienceClient: React.FC<AuthExperienceClientProps> = ({ mode }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get('redirect');
  const redirectTo = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//') && !requestedRedirect.includes('\\')
    ? requestedRedirect
    : '/profile';
  const registering = mode === 'register';

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [consents, setConsents] = useState<boolean[]>([false, false, false]);

  // Honeypot security states
  const [honeypotValue, setHoneypotValue] = useState('');
  const [secondaryHoneypotValue, setSecondaryHoneypotValue] = useState('');
  const formArmedAtRef = useRef(Date.now());
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleFormArmed = useCallback((ts: number) => {
    formArmedAtRef.current = ts;
  }, []);

  // Progressive login step: 'email' -> 'password'
  const [loginStep, setLoginStep] = useState<'email' | 'password'>('email');

  // UI status states
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [googleAttempt, setGoogleAttempt] = useState(0);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDoc | null>(null);

  const supabase = createClient();

  // Validate form
  const validate = (): string | null => {
    // 1. Pars DevState Honeypot Traps
    if (honeypotValue.trim() !== '' || secondaryHoneypotValue.trim() !== '') {
      return 'Güvenlik doğrulaması tamamlanamadı (0xHP).';
    }
    // Bot fill speed check: humans take > 600ms
    if (Date.now() - formArmedAtRef.current < 500) {
      return 'Çok hızlı işlem yapıldı. Lütfen tekrar deneyin.';
    }

    // 2. Email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Lütfen geçerli bir e-posta adresi girin.';
    }

    // 3. Password length
    if (password.length < 6) {
      return 'Şifreniz en az 6 karakter olmalıdır.';
    }

    // 4. Registration specific checks
    if (registering) {
      if (!name.trim()) {
        return 'Lütfen adınızı ve soyadınızı girin.';
      }
      if (password !== confirmPassword) {
        return 'Girdiğiniz şifreler birbiriyle eşleşmiyor.';
      }
      if (!consents[0]) {
        return 'Devam etmek için KVKK Aydınlatma Metni’ni onaylamalısınız.';
      }
    }

    return null;
  };

  // Email/Password Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsSuccess(false);

    // Step 1 check for Login: validate email and reveal password field
    if (!registering && loginStep === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setMessage('Lütfen geçerli bir e-posta adresi girin.');
        return;
      }
      setLoginStep('password');
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 80);
      return;
    }

    const validationError = validate();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setBusy(true);

    try {
      if (registering) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              kvkk_consented_at: new Date().toISOString(),
              commercial_consent: consents[2],
            },
          },
        });

        if (error) {
          setMessage(error.message || 'Kayıt işlemi sırasında bir hata oluştu.');
          setBusy(false);
          return;
        }

        if (data.session) {
          setIsSuccess(true);
          setMessage('Hesabınız başarıyla oluşturuldu! Yönlendiriliyorsunuz...');
          setTimeout(() => {
            router.push(redirectTo);
            router.refresh();
          }, 800);
        } else {
          // Email confirmation required
          setIsSuccess(true);
          setMessage('Kayıt isteğiniz alındı! E-posta adresinize gelen doğrulama bağlantısına tıklayarak hesabınızı aktifleştirebilirsiniz.');
          setBusy(false);
        }
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setMessage('E-posta adresi veya şifre hatalı.');
          } else {
            setMessage(error.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.');
          }
          setBusy(false);
          return;
        }

        setIsSuccess(true);
        setMessage('Giriş başarılı! Yönlendiriliyorsunuz...');
        setTimeout(() => {
          router.push(redirectTo);
          router.refresh();
        }, 600);
      }
    } catch {
      setMessage('Bağlantı hatası oluştu. Lütfen tekrar deneyin.');
      setBusy(false);
    }
  };

  const handleGoogleCredential = async (token: string, nonce: string) => {
    setMessage('');
    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token, nonce });
      if (error) {
        setMessage('Google ile giriş tamamlanamadı. Lütfen tekrar deneyin.');
        setBusy(false);
        setGoogleAttempt(attempt => attempt + 1);
        return;
      }
      setIsSuccess(true);
      setMessage('Giriş başarılı! Yönlendiriliyorsunuz...');
      router.push(redirectTo);
      router.refresh();
    } catch {
      setMessage('Google ile giriş sırasında bağlantı hatası oluştu.');
      setBusy(false);
      setGoogleAttempt(attempt => attempt + 1);
    }
  };

  // GitHub keeps the redirect-based OAuth flow.
  const handleGitHub = async () => {
    setMessage('');
    setBusy(true);

    try {
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (error) {
        setMessage(error.message || 'GitHub ile giriş başlatılamadı.');
        setBusy(false);
      }
    } catch {
      setMessage('Kimlik doğrulama başlatılamadı.');
      setBusy(false);
    }
  };

  // Forgot Password
  const handleForgotPassword = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage('Şifre yenileme bağlantısı için lütfen geçerli e-posta adresinizi girin.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: callbackUrl,
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          setMessage('Lütfen yeni bir e-posta istemeden önce 60 saniye bekleyin.');
        } else {
          setMessage(error.message || 'Şifre sıfırlama bağlantısı gönderilemedi.');
        }
      } else {
        setIsSuccess(true);
        setMessage('Şifre sıfırlama bağlantısı e-postanıza gönderildi! Lütfen gelen kutunuzu (ve spam klasörünü) kontrol edin.');
      }
    } catch {
      setMessage('Bağlantı hatası oluştu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-40 w-full h-[100dvh] flex flex-col justify-between px-4 sm:px-6 py-3 sm:py-6 select-none ${
        registering ? 'overflow-y-auto' : 'overflow-hidden overscroll-none touch-none'
      }`}
    >
      {/* 1. Moving Silk Atmosphere Background (Fills entire 100dvh viewport) */}
      <div className="auth-atmosphere fixed inset-0 -z-10 pointer-events-none" />

      {/* Top Left Floating Back Button (Kıstas Tasarım Sistemi - GlassIconButton) */}
      <div className="absolute top-3 left-3 sm:top-5 sm:left-6 z-20">
        <Link href="/" title="Ana Sayfaya Dön" aria-label="Ana Sayfaya Dön">
          <GlassIconButton
            icon={ArrowLeft}
            size={40}
            iconSize={18}
            title="Ana Sayfaya Dön"
            as="div"
          />
        </Link>
      </div>

      {/* Stage / Form Container */}
      <div className="mx-auto w-full max-w-[390px] sm:max-w-[400px] flex-1 flex flex-col justify-center">
        {/* Mascot Avatar Video (Elevated Upwards with Generous Clearance) */}
        <div className="-mt-2 sm:-mt-6 mb-7 sm:mb-10 flex justify-center">
          <LoginAvatarVideo />
        </div>

        {/* Animated Typewriter Title */}
        <div className="min-h-[42px] sm:min-h-[48px] flex items-center justify-center mb-3 sm:mb-5">
          <Typewriter
            words={registering ? REGISTER_TYPEWRITER_WORDS : LOGIN_TYPEWRITER_WORDS}
            speed={65}
            delayBetweenWords={2400}
            minHeight="auto"
            className="text-2xl sm:text-[27px] font-normal leading-tight text-white tracking-tight text-center"
          />
        </div>

        {registering && (
          <p className="text-center text-xs text-[#94A3B8] mb-6">
            Dakikalar içinde ücretsiz hesabınızı oluşturun ve vitrininizi parlatın.
          </p>
        )}

        {/* Social OAuth Row */}
        <div className="flex items-center gap-3 mb-3 sm:mb-5">
          <GoogleIdentityButton
            key={googleAttempt}
            disabled={busy}
            onCredential={handleGoogleCredential}
            onError={error => {
              setMessage(error);
              setGoogleAttempt(attempt => attempt + 1);
            }}
          />

          {/* GitHub Button */}
          <button
            type="button"
            disabled={busy}
            onClick={handleGitHub}
            className="auth-glass-btn flex-1 h-11 sm:h-12 rounded-full flex items-center justify-center gap-2.5 font-semibold text-xs text-white border border-white/10 active:scale-[0.98] cursor-pointer"
          >
            <svg className="h-4 w-4" fill="#F8FAFC" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>GitHub</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-3 sm:mb-5">
          <div className="w-full border-t border-white/10" />
          <span className="bg-transparent px-3 text-[11px] font-medium text-[#94A3B8] shrink-0">
            veya e-posta ile
          </span>
          <div className="w-full border-t border-white/10" />
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot Decoy Trap */}
          <HoneypotDecoyField
            value={honeypotValue}
            onChange={setHoneypotValue}
            secondaryValue={secondaryHoneypotValue}
            onChangeSecondary={setSecondaryHoneypotValue}
            onArmed={handleFormArmed}
          />

          {/* Name Field (Register only) */}
          {registering && (
            <div>
              <label className="block text-[11px] font-medium text-[#94A3B8] mb-1.5 ml-4">
                Ad Soyad
              </label>
              <div className="auth-glass-input flex items-center gap-3 px-4 min-h-[54px] rounded-[30px]">
                <User className="h-5 w-5 text-[#94A3B8] shrink-0" />
                <input
                  type="text"
                  required
                  disabled={busy}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Adınız Soyadınız"
                  autoComplete="name"
                  className="w-full bg-transparent text-[16px] sm:text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5 ml-4 mr-2">
              <label className="text-[11px] font-medium text-[#94A3B8]">
                E-posta adresi
              </label>
              {!registering && loginStep === 'password' && (
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep('email');
                    setMessage('');
                  }}
                  className="text-[11px] font-semibold text-[#60A5FA] hover:underline cursor-pointer"
                >
                  Değiştir
                </button>
              )}
            </div>
            <div className="auth-glass-input flex items-center gap-3 px-4 min-h-[54px] rounded-[30px]">
              <Mail className="h-5 w-5 text-[#94A3B8] shrink-0" />
              <input
                type="email"
                required
                disabled={busy || (!registering && loginStep === 'password')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@kistas.com.tr"
                autoComplete="email"
                className="w-full bg-transparent text-[16px] sm:text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none"
              />
            </div>
          </div>

          {/* Password Field (Shown if registering or when loginStep === 'password') */}
          {(registering || loginStep === 'password') && (
            <div className={!registering ? 'k-field-reveal' : undefined}>
              <label className="block text-[11px] font-medium text-[#94A3B8] mb-1.5 ml-4">
                Şifre
              </label>
              <div className="auth-glass-input flex items-center gap-3 px-4 min-h-[54px] rounded-[30px]">
                <Lock className="h-5 w-5 text-[#94A3B8] shrink-0" />
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={busy}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={registering ? 'new-password' : 'current-password'}
                  className="w-full bg-transparent text-[16px] sm:text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#94A3B8] hover:text-white transition-colors p-1"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password Field (Register only) */}
          {registering && (
            <div>
              <label className="block text-[11px] font-medium text-[#94A3B8] mb-1.5 ml-4">
                Şifreyi doğrula
              </label>
              <div className="auth-glass-input flex items-center gap-3 px-4 min-h-[54px] rounded-[30px]">
                <Lock className="h-5 w-5 text-[#94A3B8] shrink-0" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  disabled={busy}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full bg-transparent text-[16px] sm:text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-[#94A3B8] hover:text-white transition-colors p-1"
                  aria-label={showConfirmPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Legal Consents (Register only) */}
          {registering && (
            <div className="space-y-2 pt-2">
              {LEGAL_DOCUMENTS.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={consents[idx]}
                    disabled={busy}
                    onClick={() =>
                      setConsents(prev => prev.map((val, i) => (i === idx ? !val : val)))
                    }
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                      consents[idx]
                        ? 'border-[#3B82F6] bg-[#3B82F6] text-white'
                        : 'border-white/20 bg-black hover:border-[#3B82F6]'
                    }`}
                  >
                    {consents[idx] && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveLegalDoc(item)}
                    className="text-left text-[11px] leading-snug text-[#94A3B8] hover:text-[#60A5FA] hover:underline"
                  >
                    {item.title}
                    {item.required ? (
                      <span className="text-[#F87171] font-bold ml-0.5">*</span>
                    ) : (
                      <span className="text-[#64748B] ml-1">(isteğe bağlı)</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Feedback Notice */}
          {message && (
            <div
              role="alert"
              className={`rounded-xl p-3 text-xs leading-relaxed transition-all ${
                isSuccess
                  ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
              }`}
            >
              {message}
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="group h-[50px] w-full rounded-full border border-blue-500/30 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>İşleminiz yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>
                    {registering
                      ? 'Hesap Oluştur'
                      : loginStep === 'email'
                      ? 'Devam Et'
                      : 'Giriş Yap'}
                  </span>
                  <ArrowRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Action / Forgot Link (Login only when password step is active) */}
        {!registering && loginStep === 'password' && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={handleForgotPassword}
              className="text-xs text-[#94A3B8] hover:text-[#60A5FA] transition-colors cursor-pointer"
            >
              Şifremi unuttum
            </button>
          </div>
        )}

        {/* Switch Mode Row */}
        <div className="mt-3 sm:mt-5 flex items-center justify-center gap-1.5 text-xs text-[#94A3B8]">
          <span>{registering ? 'Zaten hesabınız var mı?' : 'Henüz hesabınız yok mu?'}</span>
          <Link
            href={registering ? '/login' : '/signup'}
            className="font-semibold text-[#60A5FA] hover:underline"
          >
            {registering ? 'Giriş yap' : 'Kayıt Ol'}
          </Link>
        </div>
      </div>

      {/* Pars DevState Watermark (Mobilde en alt güvenli alana hizalandı) */}
      <div className="relative z-10 pt-1 pb-[calc(10px+env(safe-area-inset-bottom,0px))] sm:pb-3 flex justify-center opacity-90 hover:opacity-100 transition-opacity">
        <ParsDevstateLogo size={14.5} showSubtitle={true} />
      </div>

      {/* Legal Modal Dialog */}
      <LegalModal doc={activeLegalDoc} onClose={() => setActiveLegalDoc(null)} />
    </div>
  );
};
