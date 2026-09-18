import { Platform } from 'react-native';
import { HoneypotTrapService } from './HoneypotTrapService';

// XSS, SQLi ve Path Traversal tespiti için derlenmiş düzenli ifadeler
const SUSPICIOUS_XSS_REGEX = /<script[\s>]|javascript:|onerror\s*=|onload\s*=|onclick\s*=|document\.cookie|window\.location|<iframe[\s>]|<img[^>]+src=[^>]+onerror/i;
const SUSPICIOUS_SQLI_REGEX = /\bunion\s+(?:all\s+)?select\b|(?:\b\d*'?\s*or\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)|--\s*$|\bdrop\s+table\b|\bexec\s*\(|\bxp_/i;
const SUSPICIOUS_PATH_REGEX = /\.\.\/\.\.\/|\/etc\/passwd|windows\/system32/i;

let isInitialized = false;

export const WebSecurityShieldService = {
  /**
   * Web istemci güvenlik kalkanını başlatır.
   * Anti-Clickjacking, Konsol Uyarısı ve Çalışma Zamanı Bütünlüğü kalkanlarını kurar.
   */
  initialize(): void {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || isInitialized) {
      return;
    }

    isInitialized = true;

    try {
      this.enforceAntiClickjacking();
      this.displayConsoleSecurityBanner();
      this.protectPrototypeIntegrity();
      this.armWindowCanaryTraps();
      this.injectDomCanaryComments();
      this.plantCanaryStorageTokens();
      HoneypotTrapService.inspectUrlCanaryProbes();
    } catch {
      // Güvenlik kalkanı hataları ana uygulamayı çökertmemelidir
    }
  },

  /**
   * Anti-Clickjacking (Frame Busting):
   * Uygulamanın üçüncü taraf kötü niyetli bir iFrame içerisine gömülmesini engeller.
   * İhlal tespit edildiğinde saldırıyı Tehdit Radarına raporlar ve çerçeveyi kırar.
   */
  enforceAntiClickjacking(): boolean {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return true;
    }

    try {
      if (window.self !== window.top) {
        const referrer = typeof document !== 'undefined' ? document.referrer : 'Unknown Frame Parent';

        // Tehdit radarına frame yerleştirme girişimini kaydet
        void HoneypotTrapService.triggerHoneypotTrap({
          trapType: 'CLICKJACKING_IFRAME_EMBED',
          payload: `Unauthorized framing detected. Referrer: ${referrer}`,
          toolFingerprint: 'Clickjacking UI-Redressing Engine',
          autoQuarantine: false, // Frame kırılacağı için kullanıcıyı hemen banlamadan önce çerçeveyi kır
        });

        // Çerçeveden kurtul (Frame-bust)
        if (window.top) {
          window.top.location.href = window.self.location.href;
        }

        return false;
      }
    } catch {
      // Çapraz kaynak (cross-origin) kısıtında window.top erişimi hata verebilir; bu durumda da framedir
      try {
        if (window.self && window.self.location) {
          window.self.location.replace(window.self.location.href);
        }
      } catch {
        // Güvenle yut
      }
      return false;
    }

    return true;
  },

  /**
   * Geliştirici konsoluna kurumsal Kıstas Siber Savunma Kalkanı uyarısı basar.
   * Meraklı veya kötü niyetli aktörleri uyarır; self-XSS ve sosyal mühendisliği engeller.
   */
  displayConsoleSecurityBanner(): void {
    if (Platform.OS !== 'web' || typeof console === 'undefined') {
      return;
    }

    try {
      const bannerTitle = '%c🛡️ KISTAS SİBER SAVUNMA KALKANI AKTİFTİR';
      const titleStyle = 'color: #0088FF; font-size: 20px; font-weight: bold; background: #0A192F; padding: 6px 12px; border-radius: 4px;';

      const warningText = '%c⚠️ DİKKAT: Burası tarayıcı geliştirici konsoludur. Buraya yapıştıracağınız veya yazacağınız komutlar hesabınızın ele geçirilmesine yol açabilir.\n\nTüm yetkisiz bellek müdahaleleri ve şüpheli API sorguları Kıstas Tehdit Radarı (Threat Radar) tarafından kaydedilmektedir.';
      const warningStyle = 'color: #FF4757; font-size: 13px; font-weight: 500; line-height: 1.5; padding: 4px 0;';

      console.log(bannerTitle, titleStyle);
      console.log(warningText, warningStyle);
    } catch {
      // Konsol metodları engellenmişse es geç
    }
  },

  /**
   * Prototip Bütünlüğü (Prototype Pollution Koruması):
   * Kritik nesne prototiplerinin (Object.prototype) çalışma zamanında tahrif edilmesini engeller.
   */
  protectPrototypeIntegrity(): void {
    if (Platform.OS !== 'web') {
      return;
    }

    try {
      // Object.prototype üzerinde __proto__ veya zararlı özellik manipülasyonunu izle
      if (typeof Object.freeze === 'function' && typeof __DEV__ !== 'undefined' && !__DEV__) {
        // Canlı ortamda prototip dondurma veya derin nesne bütünlüğü kalkanı
        Object.seal(Object.prototype);
      }
    } catch {
      // Geliştirme ortamında veya bazı kütüphanelerde çakışma durumunda es geç
    }
  },

  /**
   * Tarayıcı Global 'window' Nesnesi Getter Tuzakları:
   * F12 konsolunda değişken veya gizli token arayan meraklı/saldırgan aktörleri
   * getter erişimi anında yakalar ve karantinaya alır.
   */
  armWindowCanaryTraps(): void {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    try {
      const canaryTraps: Record<string, string> = {
        __KISTAS_DEV_SECRET__: 'ktst_trap_dev_0x9924a',
        __ADMIN_BYPASS_TOKEN__: 'ktst_trap_admin_override_88f',
        __INTERNAL_AUDIT_KEYS__: 'ktst_trap_audit_vault_77e',
        __BACKEND_CONFIG_DEBUG__: 'ktst_trap_debug_endpoint_66d',
      };

      for (const [propName, decoyValue] of Object.entries(canaryTraps)) {
        if (!(propName in window)) {
          Object.defineProperty(window, propName, {
            configurable: true,
            enumerable: false,
            get: () => {
              void HoneypotTrapService.triggerHoneypotTrap({
                trapType: 'CONSOLE_WINDOW_CANARY_PROBE',
                payload: `Window Decoy Property Inspected: ${propName}`,
                toolFingerprint: 'Browser Console / Memory Inspector',
                autoQuarantine: true,
              });
              return decoyValue;
            },
            set: (_val) => {
              void HoneypotTrapService.triggerHoneypotTrap({
                trapType: 'CONSOLE_WINDOW_CANARY_PROBE',
                payload: `Window Decoy Property Mutated: ${propName}`,
                toolFingerprint: 'Browser Console / Memory Mutator',
                autoQuarantine: true,
              });
            },
          });
        }
      }
    } catch {
      // Sessizce yut
    }
  },

  /**
   * Kaynak Kod (DOM) Yem Yorumu Tuzağı:
   * HTML sayfasını inceleyen pentester'lar için sahte bir dahili denetim endpoint'i yorumu bırakır.
   */
  injectDomCanaryComments(): void {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    try {
      const commentId = 'kistas-internal-audit-marker';
      if (!document.getElementById(commentId)) {
        const commentText =
          ' [KISTAS-INTERNAL-AUDIT]: Temporary debug endpoint active at /api/v1/internal-debug-probe with header X-Canary-Bypass. Strictly prohibited for external production use! ';
        const commentNode = document.createComment(commentText);
        if (document.body) {
          document.body.appendChild(commentNode);
        } else if (document.head) {
          document.head.appendChild(commentNode);
        }
      }
    } catch {
      // Sessizce yut
    }
  },

  /**
   * Tarayıcı Hafıza (Storage) Bal Küpü:
   * localStorage ve sessionStorage içerisine cazip sahte anahtarlar bırakır.
   * Bu anahtarları çekip isteklere veya formlara enjekte eden saldırganları fişler.
   */
  plantCanaryStorageTokens(): void {
    if (Platform.OS !== 'web') return;

    try {
      if (typeof localStorage !== 'undefined') {
        if (!localStorage.getItem('ktst_canary_override_key')) {
          localStorage.setItem('ktst_canary_override_key', 'ktst_decoy_secret_v1');
        }
      }
      if (typeof sessionStorage !== 'undefined') {
        if (!sessionStorage.getItem('ktst_internal_debug_auth')) {
          sessionStorage.setItem('ktst_internal_debug_auth', 'canary_trap_sec');
        }
      }
    } catch {
      // Sessizce yut
    }
  },

  /**
   * Canlı Girdi & XSS/SQLi Payload Dedektörü:
   * Arama çubuklarına, formlara veya parametrelere girilen metni gerçek zamanlı inceler.
   * Zararlı bir enjeksiyon vektörü tespit ederse WAF karantinasını tetikler ve false döner.
   *
   * @param input Kullanıcının veya botun girdiği metin
   * @param context Girdinin geldiği bağlam (örn: 'search_bar', 'contact_form')
   * @returns Girdi güvenliyse true, saldırı tespit edilirse false
   */
  inspectInputPayload(input: string, context = 'web_input'): boolean {
    if (!input || typeof input !== 'string') {
      return true;
    }

    const trimmed = input.trim();
    if (trimmed.length < 3) {
      return true;
    }

    // Zehirli Canary Token denetimi
    if (!HoneypotTrapService.inspectCanaryTokenUsage(trimmed, context)) {
      return false;
    }

    const isXss = SUSPICIOUS_XSS_REGEX.test(trimmed);
    const isSqli = SUSPICIOUS_SQLI_REGEX.test(trimmed);
    const isPath = SUSPICIOUS_PATH_REGEX.test(trimmed);

    if (isXss || isSqli || isPath) {
      const detectedVector = isXss ? 'DOM_XSS_PAYLOAD' : isSqli ? 'SQL_INJECTION_PAYLOAD' : 'PATH_TRAVERSAL_PAYLOAD';

      void HoneypotTrapService.triggerHoneypotTrap({
        trapType: detectedVector,
        payload: `Context: ${context} | Detected Input: ${trimmed.substring(0, 300)}`,
        toolFingerprint: 'Active Web Injection Probe',
        autoQuarantine: true,
      });

      return false; // Saldırı tespit edildi, girdiyi geçersiz say
    }

    return true; // Girdi temiz
  },
};
