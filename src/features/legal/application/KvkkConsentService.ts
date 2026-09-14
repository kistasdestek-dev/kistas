import { supabase } from '../../../core/supabase/supabaseClient';

export type ConsentType =
  | 'kvkk_aydinlatma'
  | 'acik_riza_metni'
  | 'ticari_elektronik_ileti'
  | 'mesafeli_satis_sozlesmesi'
  | 'kullanici_sozlesmesi';

export interface RecordConsentDTO {
  consentType: ConsentType;
  documentVersion: string;
  isAccepted: boolean;
  userAgent?: string;
}

/**
 * KVKK & ETK Yasal İzin Denetim Servisi
 * İleride açılacak KVKK denetimlerinde her kullanıcının hangi sözleşme versiyonunu
 * ne zaman onayladığını değişmez (immutable) olarak kanıtlar.
 */
export class KvkkConsentService {
  public static async recordConsent(dto: RecordConsentDTO): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        return { success: false, error: 'Oturum açılmamış.' };
      }

      const { error } = await supabase.from('user_consents').upsert({
        user_id: userData.user.id,
        consent_type: dto.consentType,
        document_version: dto.documentVersion,
        is_accepted: dto.isAccepted,
        user_agent: dto.userAgent || 'KistasMobile/1.0',
        accepted_at: new Date().toISOString(),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Bilinmeyen hata' };
    }
  }

  public static async checkUserConsentStatus(consentType: ConsentType, currentVersion: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return false;

      const { data } = await supabase
        .from('user_consents')
        .select('is_accepted')
        .eq('user_id', userData.user.id)
        .eq('consent_type', consentType)
        .eq('document_version', currentVersion)
        .maybeSingle();

      return !!data?.is_accepted;
    } catch {
      return false;
    }
  }
}
