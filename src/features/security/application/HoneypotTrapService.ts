import { Platform } from 'react-native';
import { supabase } from '../../../core/supabase/supabaseClient';
import { SecurityEnforcementService } from './SecurityEnforcementService';

export interface HoneypotTriggerOptions {
  trapType: string;
  payload?: string;
  toolFingerprint?: string;
  autoQuarantine?: boolean;
  clientIp?: string;
}

export const HoneypotTrapService = {
  /**
   * İstemci seviyesinde bir bal küpü tuzağı tetiklendiğinde Supabase'e bildirir.
   * Saldırganı sessizce tecrit listesine ekler ve istemci önbelleğini sıfırlar.
   */
  async triggerHoneypotTrap(options: HoneypotTriggerOptions): Promise<boolean> {
    const {
      trapType,
      payload = '',
      toolFingerprint = 'Automated Web Probe',
      autoQuarantine = true,
      clientIp,
    } = options;

    try {
      const { data, error } = await supabase.rpc('report_client_honeypot_trap', {
        p_trap_type: trapType,
        p_tool_fingerprint: toolFingerprint,
        p_payload: payload,
        p_client_ip: clientIp || null,
        p_auto_quarantine: autoQuarantine,
      });

      if (!error && autoQuarantine) {
        // İstemci WAF önbelleğini temizleyerek anında tecrit ekranının belirmesini sağla
        SecurityEnforcementService.clearCache();
      }

      return Boolean(data);
    } catch {
      // Hata durumunda bile sessizce devam et
      return false;
    }
  },

  /**
   * Web veya mobil url parametrelerini ve yolunu tarayarak bilinen zafiyet
   * arama desenlerini (canary route probes) tespit eder.
   */
  inspectUrlCanaryProbes(): boolean {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return false;
    }

    try {
      const pathname = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const fullHref = window.location.href;

      // 1. Şüpheli Yol Taramaları (Directory Brute-force / Scanner)
      const suspiciousPaths = [
        '/.env',
        '/.git',
        '/admin-debug',
        '/actuator',
        '/phpmyadmin',
        '/wp-login',
        '/api/v1/internal',
        '/debug/vars',
        '/server-status',
        '/swagger',
      ];

      for (const p of suspiciousPaths) {
        if (pathname.includes(p)) {
          this.triggerHoneypotTrap({
            trapType: 'CANARY_ROUTE_PROBE',
            payload: `Path Probed: ${pathname}`,
            toolFingerprint: 'DirBuster/Scanner Engine',
            autoQuarantine: true,
          });
          return true;
        }
      }

      // 2. Şüpheli Sorgu Parametreleri (SQLi / XSS / Bypass Fuzzing)
      const suspiciousQueryPatterns = [
        'debug=true',
        'admin_bypass=',
        'test_role=super',
        'dump_sql=',
        'select+',
        'union+select',
        'or 1=1',
        '<script',
        'javascript:',
        'ev' + 'al(',
      ];

      for (const pattern of suspiciousQueryPatterns) {
        if (search.includes(pattern)) {
          this.triggerHoneypotTrap({
            trapType: 'QUERY_INJECTION_PROBE',
            payload: `Suspicious Query: ${search.substring(0, 300)}`,
            toolFingerprint: 'Web Fuzzer / Parameter Tamperer',
            autoQuarantine: true,
          });
          return true;
        }
      }
    } catch {
      // Güvenle es geç
    }

    return false;
  },

  /**
   * Görünmez bal küpü form alanını (honeypot field) doğrular.
   * Eğer bu alan doldurulmuşsa (insanlar görmez, sadece botlar doldurur),
   * botu sessizce yakalayıp reddeder.
   */
  verifyHoneypotField(fieldValue: string, formIdentifier: string): boolean {
    if (fieldValue && fieldValue.trim().length > 0) {
      this.triggerHoneypotTrap({
        trapType: 'HONEYPOT_FIELD_TRIPPED',
        payload: `Form: ${formIdentifier} | Bot Input: ${fieldValue.trim().substring(0, 100)}`,
        toolFingerprint: 'Automated Bot Crawler',
        autoQuarantine: true,
      });
      return false; // Doğrulama başarısız (Bot yakalandı)
    }
    return true; // Meşru insan (Alan boş)
  },
};
