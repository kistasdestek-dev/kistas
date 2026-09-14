import { supabase } from '../../../core/supabase/supabaseClient';

export interface AccountSecurityOverview {
  email: string;
  emailVerified: boolean;
  provider: string;
  sessionActive: boolean;
  lastSignInAt: string | null;
  expiresAt: string | null;
}

type SecurityResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

export class AccountSecurityService {
  public static async getOverview(): Promise<SecurityResult<AccountSecurityOverview>> {
    try {
      const [{ data: userData, error: userError }, { data: sessionData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);

      if (userError || !userData.user) {
        return { success: false, error: userError?.message || 'Oturum bilgisi alınamadı.' };
      }

      const user = userData.user;
      const provider = String(
        user.app_metadata?.provider || user.identities?.[0]?.provider || 'email'
      );
      const expiresAt = sessionData.session?.expires_at
        ? new Date(sessionData.session.expires_at * 1000).toISOString()
        : null;

      return {
        success: true,
        data: {
          email: user.email || '',
          emailVerified: Boolean(user.email_confirmed_at),
          provider,
          sessionActive: Boolean(sessionData.session),
          lastSignInAt: user.last_sign_in_at || null,
          expiresAt,
        },
      };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Güvenlik bilgileri alınamadı.' };
    }
  }

  public static async resendEmailVerification(): Promise<SecurityResult> {
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (userError || !email) {
        return { success: false, error: userError?.message || 'Doğrulanacak e-posta adresi bulunamadı.' };
      }
      if (data.user?.email_confirmed_at) {
        return { success: true };
      }

      const { error } = await supabase.auth.resend({ type: 'signup', email });
      return error
        ? { success: false, error: error.message }
        : { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Doğrulama e-postası gönderilemedi.' };
    }
  }

  public static async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<SecurityResult> {
    try {
      if (newPassword.length < 8) {
        return { success: false, error: 'Yeni şifre en az 8 karakter olmalıdır.' };
      }
      if (currentPassword === newPassword) {
        return { success: false, error: 'Yeni şifre mevcut şifreden farklı olmalıdır.' };
      }

      const { data, error: userError } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (userError || !email) {
        return { success: false, error: userError?.message || 'Hesap bilgisi doğrulanamadı.' };
      }

      const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthenticationError) {
        return { success: false, error: 'Mevcut şifreniz doğru değil.' };
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return error
        ? { success: false, error: error.message }
        : { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Şifre değiştirilemedi.' };
    }
  }

  public static async signOutOtherSessions(): Promise<SecurityResult> {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      return error
        ? { success: false, error: error.message }
        : { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Diğer oturumlar kapatılamadı.' };
    }
  }
}
