import { supabase } from '../../../core/supabase/supabaseClient';

export interface UpdateProfileDTO {
  fullName?: string;
  bio?: string;
  city?: string;
  district?: string;
  iban?: string;
  avatarUrl?: string;
}

/**
 * Kıstas marka adı ve varyasyonlarının (leetspeak, noktalama, Türkçe karakter vb.)
 * yetkisiz kullanıcılar tarafından profil ismi olarak kullanılmasını engeller.
 */
export function isReservedBrandName(name?: string | null): boolean {
  if (!name || typeof name !== 'string') return false;
  const raw = name.trim();
  if (!raw) return false;

  // 1. Türkçe karakter ve leetspeak normalizasyonu
  const normalized = raw
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİiîíïì]/g, 'i')
    .replace(/[@4]/g, 'a')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[^a-z0-9]/g, '');

  if (normalized.includes('kistas')) {
    return true;
  }

  // 2. Harf aralarına sembol veya boşluk yerleştirilmiş varyasyon regexi
  const spacedRegex = /k[\W_]*[ıİiîíïì1!|][\W_]*[s5$][\W_]*t[\W_]*[a@4][\W_]*[s5$]/i;
  return spacedRegex.test(raw);
}

export class ProfileService {
  /**
   * Satıcı IBAN Doğrulama ve Kaydı (TR + 24 Hane = 26 Karakter)
   */
  public static validateTurkishIban(iban: string): boolean {
    const cleaned = iban.replace(/\s+/g, '').toUpperCase();
    return /^TR[0-9]{24}$/.test(cleaned);
  }

  public static async updateProfile(dto: UpdateProfileDTO): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return { success: false, error: 'Oturum açılmamış.' };

      // Kıstas marka adı koruması: Admin harici kullanıcılar Kıstas adını veya varyasyonlarını kullanamaz
      if (dto.fullName && isReservedBrandName(dto.fullName)) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (userProfile?.role !== 'admin') {
          return {
            success: false,
            error: '‘Kıstas’ adı ve varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.',
          };
        }
      }

      if (dto.iban && !this.validateTurkishIban(dto.iban)) {
        return { success: false, error: 'Geçersiz Türkiye IBAN formatı (TR ile başlamalı ve 26 karakter olmalıdır).' };
      }

      const updatePayload: Record<string, unknown> = {};
      if (dto.fullName !== undefined) updatePayload.full_name = dto.fullName;
      if (dto.bio !== undefined) updatePayload.bio = dto.bio;
      if (dto.city !== undefined) updatePayload.city = dto.city;
      if (dto.district !== undefined) updatePayload.district = dto.district;
      if (dto.avatarUrl !== undefined) updatePayload.avatar_url = dto.avatarUrl;
      if (dto.iban !== undefined) updatePayload.iban = dto.iban.replace(/\s+/g, '').toUpperCase();

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', authData.user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Profil güncellenemedi.' };
    }
  }
}
