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

/**
 * robots.txt dosyasında Disallow olarak tanımlanmış cezbedici bal küpü yolları.
 * Meşru arama motorları bu yollara asla gitmez; ancak Nuclei, FFUF, Gobuster gibi
 * ofansif tarayıcılar ve fuzzerlar ilk olarak bu yolları hedefler.
 */
export const ROBOTS_CANARY_TRAP_PATHS = [
  '/admin-internal-audit-portal',
  '/kistas-secret-vault-backup',
  '/api/v1/system-internal-probe',
  '/server-backup-archive',
  '/private-core-telemetry',
] as const;

/**
 * Sahte API endpoint'leri (Decoy API Routes).
 * Bu rotalar meşru istemcide bulunmaz. API fuzzer'ları, Nuclei ve kiterunner gibi
 * araçlar tarafından taranırsa saldırgan anında tecrit listesine alınır.
 */
export const DECOY_API_ROUTES = [
  '/api/v1/admin/users/export',
  '/api/v1/system/config-dump',
  '/api/v1/debug/sql-console',
  '/api/v1/auth/impersonate',
  '/api/v1/telemetry/raw-keys',
  '/api/internal/secrets',
  '/api/v1/backup/download',
] as const;

/**
 * Hassas yetki yükseltme, hata ayıklama ve ayrıcalık arama parametreleri.
 * URL sorgusunda (query parameter) bu parametreleri arayan fuzzer ve pentester'lar yakalanır.
 */
export const CANARY_QUERY_PARAMS = [
  'admin_mode=true',
  'admin_mode=1',
  'bypass_auth=1',
  'bypass_auth=true',
  'impersonate_user=',
  'show_hidden=true',
  'sql_debug=',
  'sudo=1',
  'test_env=stage',
  'internal_token=',
  'ktst_dev_override=',
  'canary_probe=',
  '_kistas_secret=',
  'dump_config=true',
] as const;

export interface FormHoneypotCheckPayload {
  formId: string;
  primaryDecoy?: string;
  secondaryDecoy?: string;
  armedAt?: number;
  minFillTimeMs?: number;
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
   * Belirtilen yolun robots.txt bal küpü tuzağı olup olmadığını kontrol eder.
   */
  isRobotsCanaryPath(path: string): boolean {
    if (!path || typeof path !== 'string') return false;
    const lower = path.toLowerCase();
    return ROBOTS_CANARY_TRAP_PATHS.some((canary) => lower.includes(canary.toLowerCase()));
  },

  /**
   * Belirtilen yolun sahte API tuzağı olup olmadığını kontrol eder.
   */
  isDecoyApiRoute(path: string): boolean {
    if (!path || typeof path !== 'string') return false;
    const lower = path.toLowerCase();
    return DECOY_API_ROUTES.some((route) => lower.includes(route.toLowerCase()));
  },

  /**
   * Belirtilen arama dizesinin canary sorgu parametresi içerip içermediğini denetler.
   */
  isCanaryQueryParam(search: string): boolean {
    if (!search || typeof search !== 'string') return false;
    const lower = search.toLowerCase();
    return CANARY_QUERY_PARAMS.some((param) => lower.includes(param.toLowerCase()));
  },

  /**
   * Sahte API rotaları için saldırganı aldatıcı sahte JSON yanıtı üretir (Cyber Deception Mock).
   */
  getDecoyApiResponse(path: string): { status: number; body: Record<string, unknown> } {
    return {
      status: 403,
      body: {
        error: 'Forbidden: Insufficient privileges for private API subsystem.',
        path,
        incident_id: `KTST-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        telemetry: 'Active probe logged to security enforcement unit.',
        canary_digest: 'ktst_decoy_secret_v1',
      },
    };
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

      // 0. Robots.txt Decoy Canary Traps (Ofansif Tarayıcı & Fuzzer Tuzağı: Nuclei, FFUF, Gobuster vb.)
      for (const canary of ROBOTS_CANARY_TRAP_PATHS) {
        if (pathname.includes(canary.toLowerCase())) {
          this.triggerHoneypotTrap({
            trapType: 'ROBOTS_TXT_CANARY_TRAP',
            payload: `Robots.txt Disallow Probe: ${pathname}`,
            toolFingerprint: 'Offensive Scanner / Fuzzer (Nuclei/FFUF/Gobuster) or Disobeying Bot',
            autoQuarantine: true,
          });
          return true;
        }
      }

      // 1. Sahte API Endpoint Tuzakları (Decoy API Routes: Kiterunner/Nuclei/API Fuzzers)
      for (const decoyRoute of DECOY_API_ROUTES) {
        if (pathname.includes(decoyRoute.toLowerCase())) {
          this.triggerHoneypotTrap({
            trapType: 'DECOY_API_ENDPOINT_TRIPPED',
            payload: `Decoy API Probe: ${pathname}`,
            toolFingerprint: 'API Fuzzer / Decoy Endpoint Scanner (Nuclei/Kiterunner/Postman)',
            autoQuarantine: true,
          });
          return true;
        }
      }

      // 2. Yetki Yükseltme & Ayrıcalık Sorgu Parametreleri (Canary Query Traps)
      for (const param of CANARY_QUERY_PARAMS) {
        if (search.includes(param.toLowerCase())) {
          this.triggerHoneypotTrap({
            trapType: 'CANARY_QUERY_PARAM_TAMPER',
            payload: `Canary Query Tamper: ${search.substring(0, 300)}`,
            toolFingerprint: 'Parameter Fuzzer / Privilege Escalation Probe',
            autoQuarantine: true,
          });
          return true;
        }
      }

      // 3. Şüpheli Yol Taramaları (Directory Brute-force / Scanner / Canary Leaks)
      const suspiciousPaths = [
        '/api/v1/internal-debug-probe',
        '/kistas-internal-audit',
        '/internal-debug-probe',
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
          const isCanaryLeak = p.includes('internal-debug-probe') || p.includes('kistas-internal-audit');
          this.triggerHoneypotTrap({
            trapType: isCanaryLeak ? 'CANARY_SOURCE_LEAK_TRIPPED' : 'CANARY_ROUTE_PROBE',
            payload: `Path Probed: ${pathname}`,
            toolFingerprint: isCanaryLeak ? 'Human Pentester / Canary Probe' : 'DirBuster/Scanner Engine',
            autoQuarantine: true,
          });
          return true;
        }
      }

      // 4. Şüpheli Sorgu Parametreleri (SQLi / XSS / Bypass Fuzzing / Canary Headers)
      const suspiciousQueryPatterns = [
        'x-canary-bypass',
        'ktst_canary',
        'ktst_master_override',
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
          const isCanaryParam = pattern.includes('canary') || pattern.includes('ktst_');
          this.triggerHoneypotTrap({
            trapType: isCanaryParam ? 'CANARY_TOKEN_TAMPER' : 'QUERY_INJECTION_PROBE',
            payload: `Suspicious Query: ${search.substring(0, 300)}`,
            toolFingerprint: isCanaryParam ? 'Source Code / Storage Reverse Engineer' : 'Web Fuzzer / Parameter Tamperer',
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
   * Çok katmanlı akıllı bal küpü form doğrulayıcısı.
   * 1. Yem alanlarının doldurulup doldurulmadığını denetler (Decoy field inspection).
   * 2. İnsanüstü form doldurma hızını (Superhuman rapid submission) denetler.
   */
  verifyFormSubmission(payload: FormHoneypotCheckPayload): boolean {
    const { formId, primaryDecoy = '', secondaryDecoy = '', armedAt, minFillTimeMs = 750 } = payload;

    // 1. Birincil yem alanı kontrolü
    if (primaryDecoy && primaryDecoy.trim().length > 0) {
      void this.triggerHoneypotTrap({
        trapType: 'HONEYPOT_FIELD_TRIPPED',
        payload: `Form: ${formId} | Primary Decoy Filled: ${primaryDecoy.trim().substring(0, 100)}`,
        toolFingerprint: 'Automated Bot Crawler / Form Spammer',
        autoQuarantine: true,
      });
      return false;
    }

    // 2. İkincil yem alanı kontrolü
    if (secondaryDecoy && secondaryDecoy.trim().length > 0) {
      void this.triggerHoneypotTrap({
        trapType: 'HONEYPOT_FIELD_TRIPPED',
        payload: `Form: ${formId} | Secondary Decoy Filled: ${secondaryDecoy.trim().substring(0, 100)}`,
        toolFingerprint: 'Automated Bot Crawler / Form Spammer',
        autoQuarantine: true,
      });
      return false;
    }

    // 3. İnsanüstü hızda form gönderimi (Rapid Bot Submission Guard)
    if (armedAt && typeof armedAt === 'number' && armedAt > 0) {
      const elapsedMs = Date.now() - armedAt;
      if (elapsedMs < minFillTimeMs) {
        void this.triggerHoneypotTrap({
          trapType: 'BOT_RAPID_SUBMISSION_TRIPPED',
          payload: `Form: ${formId} | Elapsed: ${elapsedMs}ms (Threshold: ${minFillTimeMs}ms)`,
          toolFingerprint: 'Automated Headless Script / Rapid Submission Bot',
          autoQuarantine: true,
        });
        return false;
      }
    }

    return true;
  },

  /**
   * Görünmez bal küpü form alanını (honeypot field) doğrular.
   * Geriye dönük uyumluluk için tekil bal küpü form alanını doğrular.
   */
  verifyHoneypotField(fieldValue: string, formIdentifier: string): boolean {
    return this.verifyFormSubmission({
      formId: formIdentifier,
      primaryDecoy: fieldValue,
    });
  },

  /**
   * DOM veya Storage'a ekilen tuzak belirteçlerin (Canary Tokens) girdilerde veya başlıklarda
   * kullanılıp kullanılmadığını denetler.
   */
  inspectCanaryTokenUsage(value: string, context = 'input_token_inspection'): boolean {
    if (!value || typeof value !== 'string') return true;
    const lower = value.toLowerCase();
    if (
      lower.includes('ktst_canary_override_key') ||
      lower.includes('ktst_internal_debug_auth') ||
      lower.includes('x-canary-bypass') ||
      lower.includes('ktst_decoy_secret_v1')
    ) {
      void this.triggerHoneypotTrap({
        trapType: 'CANARY_TOKEN_TAMPER',
        payload: `Context: ${context} | Poisoned Canary Token detected: ${value.substring(0, 150)}`,
        toolFingerprint: 'Source Code / Storage Reverse Engineer',
        autoQuarantine: true,
      });
      return false;
    }
    return true;
  },

  /**
   * Bir saldırı vektörünün bal küpü tuzağı olup olmadığını denetler.
   */
  isHoneypotVector(vector: string): boolean {
    if (!vector || typeof vector !== 'string') return false;
    return (
      vector.startsWith('HONEYPOT_') ||
      vector.startsWith('DECOY_') ||
      vector.startsWith('ROBOTS_TXT_') ||
      vector.startsWith('CANARY_') ||
      vector.startsWith('BOT_RAPID_') ||
      vector === 'DOM_HONEYPOT_TRIPPED' ||
      vector === 'STORAGE_TOKEN_HONEYPOT_TRIPPED'
    );
  },
};

