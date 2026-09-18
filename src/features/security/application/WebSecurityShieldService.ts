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
