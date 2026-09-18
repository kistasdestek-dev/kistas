import { supabase } from '../../../core/supabase/supabaseClient';
import { HoneypotTrapService } from './HoneypotTrapService';
import { SecurityEnforcementService } from './SecurityEnforcementService';

interface ClientBurstBucket {
  count: number;
  windowStart: number;
}

const burstBuckets = new Map<string, ClientBurstBucket>();

export interface AdaptiveRateLimitOptions {
  identifier: string;
  actionType: string;
  maxHits?: number;
  windowSeconds?: number;
  autoBanThreshold?: number;
  clientIp?: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  quarantined: boolean;
  reason?: string;
}

export const RateLimitGuardService = {
  /**
   * İstemci taraflı anlık aşırı istek (burst-flood) saldırılarını engeller.
   * Eğer bir bot veya script saniyeler içinde aşırı işlem tetiklerse
   * bal küpü tuzağını aktif eder ve istemciyi karantinaya alır.
   */
  checkClientBurst(
    actionKey: string,
    maxHits = 10,
    windowMs = 5000
  ): boolean {
    const now = Date.now();
    const bucket = burstBuckets.get(actionKey);

    if (!bucket || now - bucket.windowStart > windowMs) {
      burstBuckets.set(actionKey, { count: 1, windowStart: now });
      return true;
    }

    bucket.count += 1;

    if (bucket.count > maxHits) {
      // Şüpheli burst fuzzer tespit edildi!
      HoneypotTrapService.triggerHoneypotTrap({
        trapType: 'RAPID_BURST_FLOOD',
        toolFingerprint: 'Client Action Flooder / Brute-Force Bot',
        payload: `Aksiyon: ${actionKey} (${bucket.count} istek / ${windowMs}ms)`,
        autoQuarantine: true,
      });
      return false;
    }

    return true;
  },

  /**
   * Sunucu seviyesinde adaptif hız sınırını doğrular.
   * Eşik aşıldığında ve fuzzer ihlalleri sürdüğünde sunucu tarafında
   * aktörü otonom olarak tecrit eder.
   */
  async enforceServerRateLimit(
    options: AdaptiveRateLimitOptions
  ): Promise<RateLimitCheckResult> {
    const {
      identifier,
      actionType,
      maxHits = 30,
      windowSeconds = 60,
      autoBanThreshold = 3,
      clientIp,
    } = options;

    try {
      const { data, error } = await supabase.rpc('enforce_adaptive_rate_limit', {
        p_identifier: identifier,
        p_action_type: actionType,
        p_max_hits: maxHits,
        p_window_seconds: windowSeconds,
        p_auto_ban_threshold: autoBanThreshold,
        p_client_ip: clientIp || null,
      });

      if (error) {
        // Hata durumunda fail-open
        return { allowed: true, quarantined: false };
      }

      const res = data as { allowed?: boolean; quarantined?: boolean; reason?: string } | null;
      const allowed = res?.allowed ?? true;
      const quarantined = res?.quarantined ?? false;

      if (quarantined) {
        SecurityEnforcementService.clearCache();
      }

      return {
        allowed,
        quarantined,
        reason: res?.reason,
      };
    } catch {
      return { allowed: true, quarantined: false };
    }
  },
};
