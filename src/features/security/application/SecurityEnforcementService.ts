import { supabase } from '../../../core/supabase/supabaseClient';

interface QuarantineCache {
  isQuarantined: boolean;
  checkedAt: number;
}

let memoryCache: QuarantineCache | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 dakika

export const SecurityEnforcementService = {
  /**
   * İstemcinin (oturumdaki kullanıcı veya IP) aktif WAF karantinasında olup olmadığını denetler.
   * Aşırı ağ isteklerini önlemek için 2 dakikalık önbellekleme kullanır.
   */
  async checkClientQuarantineStatus(forceRefresh = false): Promise<boolean> {
    const now = Date.now();

    if (!forceRefresh && memoryCache && now - memoryCache.checkedAt < CACHE_TTL_MS) {
      return memoryCache.isQuarantined;
    }

    try {
      const { data, error } = await supabase.rpc('check_is_quarantined');

      if (error) {
        // Hata durumunda (ağ kopması vb.) meşru kullanıcıyı bloke etmemek için güvenle dönülür
        return memoryCache?.isQuarantined ?? false;
      }

      const isQuarantined = Boolean(data);
      memoryCache = {
        isQuarantined,
        checkedAt: now,
      };

      return isQuarantined;
    } catch {
      return memoryCache?.isQuarantined ?? false;
    }
  },

  /**
   * Önbelleği temizler (örneğin yeniden deneme yapıldığında).
   */
  clearCache(): void {
    memoryCache = null;
  },
};
