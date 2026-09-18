import { Platform } from 'react-native';
import { SUPABASE_URL, supabase } from '../../../core/supabase/supabaseClient';
import { toSafeHttpsUrl } from '../../../core/security/ExternalUrl';
import { SecureStorageAdapter } from '../../../core/security/SecureStorage';
import { UserProfile, PendingRegistrationConsents } from '../domain/User';
import { KvkkConsentService } from '../../legal/application/KvkkConsentService';
import { KISTAS_DEFAULT_AVATAR_URL, resolveProfileAvatarUrl } from '../../../core/brandAssets';

export class AuthService {
  private static failedLoginAttempts = 0;
  private static lockoutUntil = 0;

  /**
   * Supabase Auth ve ağ hatalarını kullanıcı dostu Türkçe mesajlara dönüştürür.
   */
  public static localizeAuthError(error: any, fallbackMessage: string = 'İşlem tamamlanamadı.'): string {
    const rawMessage = (
      typeof error === 'string'
        ? error
        : error?.message || error?.error_description || ''
    ).toLowerCase().trim();

    if (!rawMessage) return fallbackMessage;

    if (
      rawMessage.includes('invalid login credentials') ||
      rawMessage.includes('invalid credentials') ||
      rawMessage.includes('invalid_grant') ||
      rawMessage.includes('invalid email or password')
    ) {
      return 'E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
    }

    if (rawMessage.includes('email not confirmed')) {
      return 'E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzdaki onay bağlantısını kontrol edin.';
    }

    if (rawMessage.includes('email address not authorized') || rawMessage.includes('email_address_not_authorized')) {
      return 'E-posta gönderimi henüz bu adres için kullanıma açık değil. Lütfen daha sonra tekrar deneyin.';
    }

    if (
      rawMessage.includes('user already registered') ||
      rawMessage.includes('already registered') ||
      rawMessage.includes('user already exists')
    ) {
      return 'Bu e-posta adresi ile kayıtlı bir hesap zaten bulunmaktadır.';
    }

    if (
      rawMessage.includes('password should be at least') ||
      rawMessage.includes('password is too short')
    ) {
      return 'Şifreniz en az 6 karakter olmalıdır.';
    }

    if (
      rawMessage.includes('rate limit') ||
      rawMessage.includes('too many requests') ||
      rawMessage.includes('over_email_send_rate_limit')
    ) {
      return 'Çok fazla deneme yapıldı. Güvenliğiniz için lütfen biraz bekleyip tekrar deneyin.';
    }

    if (rawMessage.includes('user not found')) {
      return 'Bu bilgilere ait bir kullanıcı bulunamadı.';
    }

    if (
      rawMessage.includes('invalid phone') ||
      rawMessage.includes('unsupported phone')
    ) {
      return 'Geçerli bir telefon numarası girin.';
    }

    if (
      rawMessage.includes('token has expired') ||
      rawMessage.includes('otp expired') ||
      rawMessage.includes('invalid token')
    ) {
      return 'Doğrulama kodu geçersiz veya süresi dolmuş.';
    }

    if (
      rawMessage.includes('network request failed') ||
      rawMessage.includes('fetch failed') ||
      rawMessage.includes('failed to fetch')
    ) {
      return 'İnternet bağlantısı kurulamadı. Lütfen ağ bağlantınızı kontrol edin.';
    }

    return error?.message || fallbackMessage;
  }

  /**
   * 1. E-Posta & Şifre ile Gerçek Kayıt (Supabase Production Auth)
   */
  public static async signUpWithEmail(
    email: string,
    password: string,
    fullName: string,
    consents?: PendingRegistrationConsents
  ): Promise<{ success: boolean; profile?: UserProfile | null; requiresEmailConfirmation?: boolean; error?: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error || !data?.user) {
        return { success: false, error: this.localizeAuthError(error, 'Kayıt işlemi tamamlanamadı.') };
      }

      if (!data.session) {
        return { success: false, requiresEmailConfirmation: true };
      }

      // KVKK & İYS Denetim İzi Kaydı
      if (consents) {
        try {
          if (consents.kvkkAydinlatma) {
            await KvkkConsentService.recordConsent({
              consentType: 'kvkk_aydinlatma',
              documentVersion: 'v1.0-2026',
              isAccepted: true,
            });
          }
          if (consents.acikRiza) {
            await KvkkConsentService.recordConsent({
              consentType: 'acik_riza_metni',
              documentVersion: 'v1.0-2026',
              isAccepted: true,
            });
          }
          if (consents.ticariIleti) {
            await KvkkConsentService.recordConsent({
              consentType: 'ticari_elektronik_ileti',
              documentVersion: 'v1.0-2026',
              isAccepted: true,
            });
          }
        } catch (consentErr) {
          console.warn('KVKK denetim izi kaydı uyarısı:', consentErr);
        }
      }

      // Gerçek profil verisini veritabanından çek veya oluştur
      let profile = await this.getCurrentProfile();

      if (!profile && data.user) {
        const { data: insertedProfile } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: fullName.trim() || 'Topluluk Üyesi',
            avatar_url: KISTAS_DEFAULT_AVATAR_URL,
          })
          .select(
            'id, full_name, avatar_url, bio, city, district, rating_average, rating_count, is_verified, phone, boost_credits, created_at, updated_at'
          )
          .single();

        if (insertedProfile) {
          profile = {
            id: insertedProfile.id,
            email: normalizedEmail,
            role: 'user',
            fullName: insertedProfile.full_name || fullName.trim(),
            avatarUrl: resolveProfileAvatarUrl(insertedProfile.avatar_url),
            bio: insertedProfile.bio || null,
            availableBalance: 0,
            pendingBalance: 0,
            boostCredits: Number(insertedProfile.boost_credits || 0),
            ratingAverage: Number(insertedProfile.rating_average || 5),
            ratingCount: Number(insertedProfile.rating_count || 0),
            city: insertedProfile.city || null,
            district: insertedProfile.district || null,
            isVerified: true,
            isBanned: false,
            createdAt: insertedProfile.created_at || new Date().toISOString(),
            updatedAt: insertedProfile.updated_at || new Date().toISOString(),
          };
        }
      }

      if (!profile) {
        return {
          success: false,
          error: 'Kayıt başarılı ancak profil doğrulanamadı. Lütfen e-posta kutunuzu kontrol edin.',
        };
      }

      return { success: true, profile };
    } catch (err: any) {
      return { success: false, error: this.localizeAuthError(err, 'Kayıt sırasında hata oluştu.') };
    }
  }

  /**
   * 2. E-Posta veya Telefon ile Gerçek Şifreli Giriş (Supabase Production Auth)
   */
  public static async signInWithPassword(
    identifier: string,
    password: string
  ): Promise<{ success: boolean; profile?: UserProfile | null; error?: string }> {
    const now = Date.now();
    if (this.lockoutUntil > now) {
      const waitSeconds = Math.ceil((this.lockoutUntil - now) / 1000);
      return {
        success: false,
        error: `Çok fazla hatalı giriş denemesi yapıldı. Lütfen ${waitSeconds} saniye bekleyip tekrar deneyin.`,
      };
    }

    const recordFailedAttempt = (error: any, defaultMsg: string) => {
      this.failedLoginAttempts += 1;
      if (this.failedLoginAttempts >= 5) {
        this.lockoutUntil = Date.now() + 30000;
        this.failedLoginAttempts = 0;
        return 'Çok fazla ardışık hatalı giriş denemesi yapıldı. Güvenliğiniz için 30 saniye süreyle geçici olarak durduruldu.';
      }
      return this.localizeAuthError(error, defaultMsg);
    };

    try {
      const normalizedIdentifier = identifier.trim();
      const isEmail = normalizedIdentifier.includes('@');
      const emailLower = isEmail ? normalizedIdentifier.toLowerCase() : '';

      if (isEmail) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailLower,
          password,
        });

        if (error || !data?.user) {
          return {
            success: false,
            error: recordFailedAttempt(error, 'E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.'),
          };
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          phone: this.formatTurkishPhone(normalizedIdentifier),
          password,
        });

        if (error || !data?.user) {
          return {
            success: false,
            error: recordFailedAttempt(error, 'Telefon numarası veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.'),
          };
        }
      }

      const profile = await this.getCurrentProfile();

      if (!profile) {
        return { success: false, error: 'Kullanıcı profili veritabanında bulunamadı.' };
      }

      this.failedLoginAttempts = 0;
      this.lockoutUntil = 0;
      return { success: true, profile };
    } catch (err: any) {
      return { success: false, error: this.localizeAuthError(err, 'Giriş yapılamadı.') };
    }
  }

  public static async signInWithGoogleIdToken(
    token: string,
    nonce: string
  ): Promise<{ success: boolean; profile?: UserProfile | null; error?: string }> {
    if (Platform.OS !== 'web' || !token || !nonce) {
      return { success: false, error: 'Google kimlik doğrulaması tamamlanamadı.' };
    }

    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token,
        nonce,
      });
      if (error) {
        return { success: false, error: this.localizeAuthError(error, 'Google ile giriş tamamlanamadı.') };
      }

      const profile = await this.getCurrentProfile();
      return profile
        ? { success: true, profile }
        : { success: false, error: 'Google hesabı doğrulandı ancak kullanıcı profili hazırlanamadı.' };
    } catch (err: any) {
      return { success: false, error: this.localizeAuthError(err, 'Google ile giriş tamamlanamadı.') };
    }
  }

  private static readonly ALLOWED_OAUTH_ORIGINS = [
    'https://www.kistas.com.tr',
    'https://kistas.com.tr',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
  ];

  /**
   * Kriptografik olarak güçlü tek kullanımlık OAuth State Nonce üretir.
   */
  public static generateOAuthStateNonce(): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * OAuth dönüşünde gelen state değerini tek kullanımlık olarak doğrular ve tüketir (Replay koruması).
   */
  public static verifyAndConsumeOAuthState(incomingState: string | null): boolean {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return true;
    try {
      const raw = window.sessionStorage.getItem('kistas_oauth_state');
      window.sessionStorage.removeItem('kistas_oauth_state');
      if (!raw) {
        return !incomingState;
      }
      const parsed = JSON.parse(raw);
      if (!parsed?.nonce || !incomingState) return false;
      // 10 dakika geçerlilik süresi
      if (Date.now() - parsed.timestamp > 10 * 60 * 1000) return false;
      return parsed.nonce === incomingState;
    } catch {
      return false;
    }
  }

  /**
   * 3. GitHub veya Apple ile yönlendirmeli OAuth oturumu (SEC-071 State & CSRF Korumalı)
   */
  public static async signInWithOAuth(
    provider: 'apple' | 'github'
  ): Promise<{ success: boolean; profile?: UserProfile | null; error?: string }> {
    try {
      const providerName = provider === 'github' ? 'GitHub' : 'Apple';

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const origin = window.location.origin;
        const isAllowedOrigin =
          this.ALLOWED_OAUTH_ORIGINS.some((allowed) => origin === allowed) ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:');

        if (!isAllowedOrigin) {
          return {
            success: false,
            error: 'Güvensiz veya izin verilmeyen kaynak adresinden OAuth oturumu başlatılamaz.',
          };
        }

        const stateNonce = this.generateOAuthStateNonce();
        try {
          window.sessionStorage.setItem(
            'kistas_oauth_state',
            JSON.stringify({
              nonce: stateNonce,
              provider,
              timestamp: Date.now(),
            })
          );
        } catch {
          // ignore session storage error
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: origin,
            skipBrowserRedirect: true,
            queryParams: {
              state: stateNonce,
            },
          },
        });

        if (error) {
          return {
            success: false,
            error: error.message || `${providerName} yetkilendirmesi başarısız oldu.`,
          };
        }

        if (data?.url) {
          const safeAuthUrl = toSafeHttpsUrl(data.url, {
            allowedHosts: [new URL(SUPABASE_URL).hostname],
          });
          if (!safeAuthUrl) {
            return {
              success: false,
              error: `${providerName} yetkilendirme adresi güvenlik doğrulamasından geçemedi.`,
            };
          }

          // Supabase üzerinde sağlayıcının aktif olup olmadığını önceden doğrula
          try {
            const checkRes = await fetch(safeAuthUrl, { method: 'GET' });
            if (!checkRes.ok) {
              const errData = await checkRes.json().catch(() => null);
              if (
                errData?.msg?.includes('provider is not enabled') ||
                errData?.error_code === 'validation_failed'
              ) {
                return {
                  success: false,
                  error: `${providerName} ile giriş Supabase üzerinde henüz aktif edilmemiş.\nSupabase Dashboard -> Authentication -> Providers -> ${providerName} bölümünden Client ID ve Secret bilgilerinin girilmesi gerekmektedir.`,
                };
              }
              return {
                success: false,
                error: errData?.msg || `${providerName} yetkilendirmesi başlatılamadı.`,
              };
            }

            // Sağlayıcı aktif; tarayıcıyı resmi Google / Apple oturum ekranına yönlendir
            window.location.href = safeAuthUrl;
            return { success: true };
          } catch (fetchErr: any) {
            // Fetch hatası durumunda URL'ye doğrudan yönlendir
            window.location.href = safeAuthUrl;
            return { success: true };
          }
        }
      }

      return {
        success: false,
        error: `${providerName} ile giriş bu platformda desteklenmiyor.`,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || `${provider} ile bağlantı kurulamadı.` };
    }
  }

  /**
   * 4. Şifremi Unuttum E-postası Gönderimi
   */
  public static async sendPasswordResetEmail(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      return error ? { success: false, error: this.localizeAuthError(error, 'Şifre yenileme bağlantısı gönderilemedi.') } : { success: true };
    } catch (err: any) {
      return { success: false, error: this.localizeAuthError(err, 'Şifre yenileme bağlantısı gönderilemedi.') };
    }
  }

  public static async updateRecoveredPassword(
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    if (password.length < 8) {
      return { success: false, error: 'Yeni şifreniz en az 8 karakter olmalıdır.' };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return error
        ? { success: false, error: this.localizeAuthError(error, 'Şifre güncellenemedi.') }
        : { success: true };
    } catch (err: any) {
      return { success: false, error: this.localizeAuthError(err, 'Şifre güncellenemedi.') };
    }
  }

  /**
   * 5. Oturumu Açık Kullanıcının Profilini Veritabanından Çekme
   */
  public static async getCurrentProfile(): Promise<UserProfile | null> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return null;

      const userEmail = authData.user.email?.toLowerCase();
      const profileColumns =
        'id, full_name, avatar_url, bio, city, district, rating_average, rating_count, is_verified, phone, boost_credits, created_at, updated_at';
      let [{ data, error }, { data: adminAccess }] = await Promise.all([
        supabase.from('profiles').select(profileColumns).eq('id', authData.user.id).single(),
        supabase.rpc('get_current_admin_access'),
      ]);

      // Eğer profiles tablosunda satır henüz yoksa, gerçek auth kaydı üzerinden ekle
      if (error || !data) {
        const fallbackName =
          authData.user.user_metadata?.full_name ||
          authData.user.user_metadata?.name ||
          (userEmail ? userEmail.split('@')[0] : 'Topluluk Üyesi');

        const { data: createdProfile } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            full_name: fallbackName,
            avatar_url: KISTAS_DEFAULT_AVATAR_URL,
          })
          .select(profileColumns)
          .single();

        if (createdProfile) {
          data = createdProfile;
        }
      }

      if (!data) return null;
      const isAdmin = adminAccess?.is_admin === true;

      let hasApprovedProject = false;
      try {
        const { count } = await supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', data.id)
          .eq('status', 'active');
        hasApprovedProject = Boolean(count && count > 0);
      } catch {
        // Fallback
      }

      // Not: is_verified kolonu sunucu/admin tarafında (admin_update_listing_status) yönetilir.
      // İstemciden veritabanı alanını güncellemek bank-grade koruma kuralları gereği kısıtlıdır.

      return {
        id: data.id,
        email: userEmail || '',
        role: isAdmin ? 'admin' : 'user',
        phone: data.phone,
        fullName: data.full_name || 'Kıstas Kullanıcısı',
        avatarUrl: resolveProfileAvatarUrl(data.avatar_url),
        bio: data.bio || null,
        availableBalance: 0,
        pendingBalance: 0,
        boostCredits: Number(data.boost_credits || 0),
        ratingAverage: Number(data.rating_average || 5),
        ratingCount: Number(data.rating_count || 0),
        city: data.city,
        district: data.district,
        isVerified: isAdmin || hasApprovedProject,
        isBanned: false,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  /**
   * 6. Güvenli Çıkış Yapma (B7 Bank-Grade Session Hardening & SEC-072 Global Sign-Out)
   * @param scope 'local' (sadece bu cihaz) veya 'global' (tüm bağlı cihazlar)
   */
  public static async signOut(scope: 'local' | 'global' = 'local'): Promise<void> {
    try {
      if (scope === 'global') {
        await supabase.auth.signOut({ scope: 'global' });
        try {
          await supabase.rpc('revoke_user_sessions');
        } catch {
          // RPC erişilemezse auth client çıkışı yeterlidir
        }
      } else {
        await supabase.auth.signOut({ scope: 'local' });
      }
    } finally {
      // Yerel depolama kalıntılarını ve tokenları tamamen temizle (Full Purge)
      await SecureStorageAdapter.purgeAllAuthData();
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          window.sessionStorage.removeItem('kistas_oauth_state');
          window.sessionStorage.removeItem('kistas_auth_profile_snapshot_v1');
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * B7 Kill Switch: Çalınma veya şüpheli oturum durumunda tüm aktif oturumları anında fesheder.
   */
  public static async revokeAllSessions(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('revoke_user_sessions');
      if (error) {
        return { success: false, error: error.message };
      }
      await supabase.auth.signOut({ scope: 'global' });
      await SecureStorageAdapter.purgeAllAuthData();
      return { success: Boolean(data?.success) };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Oturumlar feshedilemedi.' };
    }
  }

  /**
   * 7. (Legacy) Telefon Numarasına SMS OTP Doğrulama Kodu Gönderimi
   */
  public static async sendPhoneOtp(phone: string): Promise<{ success: boolean; error?: string }> {
    try {
      const formattedPhone = this.formatTurkishPhone(phone);
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });
      return error ? { success: false, error: error.message } : { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'SMS kodu gönderilemedi.' };
    }
  }

  /**
   * 8. (Legacy) Telefon Doğrulama Kodunu (OTP) Onaylama
   */
  public static async verifyPhoneOtp(
    phone: string,
    token: string,
    consents?: PendingRegistrationConsents
  ): Promise<{ success: boolean; profile?: UserProfile | null; error?: string }> {
    try {
      const formattedPhone = this.formatTurkishPhone(phone);
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: token.trim(),
        type: 'sms',
      });

      if (error || !data.user) {
        return { success: false, error: error?.message || 'Doğrulama kodu geçersiz.' };
      }

      const profile = await this.getCurrentProfile();
      return { success: true, profile };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Doğrulama tamamlanamadı.' };
    }
  }

  public static formatTurkishPhone(phone: string): string {
    const compactPhone = phone.replace(/[\s()-]/g, '');
    return compactPhone.startsWith('+') ? compactPhone : `+90${compactPhone.replace(/^0/, '')}`;
  }
}
