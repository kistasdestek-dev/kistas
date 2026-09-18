import React, { useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';
import { WebSecurityShieldService } from '../application/WebSecurityShieldService';
import { HoneypotTrapService } from '../application/HoneypotTrapService';

export interface SecurityTrustScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenFaq?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
  onOpenSecurity?: () => void;
}

const STYLE_ID = 'kistas-security-trust-styles';
const STYLES = `
.kst-page{height:100%;overflow-x:hidden;overflow-y:auto;color:#203754;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:radial-gradient(circle at 50% 6%,rgba(0,136,255,.10),transparent 32%),#F6F8FC}
.kst-page *{box-sizing:border-box}
.kst-wrap{width:min(1160px,calc(100% - 40px));margin:0 auto}
.kst-top-bar{display:flex;align-items:center;padding:24px 0 8px}
.kst-back{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid rgba(50,105,199,.18);border-radius:12px;background:rgba(255,255,255,.76);color:#5A6E85;font:700 12px/1 inherit;box-shadow:0 8px 24px rgba(32,55,84,.04);cursor:pointer;transition:transform .18s ease,border-color .18s ease}
.kst-back:hover{transform:translateX(-2px);color:#203754;border-color:rgba(50,105,199,.42)}

/* Hero Bölümü */
.kst-hero{display:flex;flex-direction:column;align-items:center;padding:24px 0 64px;text-align:center}
.kst-kicker{display:inline-flex;align-items:center;gap:8px;margin:0 0 16px;padding:8px 14px;border:1px solid rgba(0,136,255,.24);border-radius:999px;background:rgba(255,255,255,.85);color:#0088FF;font-size:11px;font-weight:700;letter-spacing:.12em;box-shadow:0 8px 20px rgba(0,136,255,.08)}
.kst-title{max-width:960px;margin:0;font-size:clamp(42px,6.5vw,78px);line-height:1.02;font-weight:700;letter-spacing:-.045em;color:#18283E}
.kst-title-accent{background:linear-gradient(135deg,#0088FF 0%,#0055CC 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.kst-lead{max-width:740px;margin:20px auto 0;color:#52677F;font-size:clamp(16px,1.8vw,19px);line-height:1.62}

/* Canlı Rozetler Grid */
.kst-badges-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:42px 0 68px}
.kst-badge-card{display:flex;flex-direction:column;padding:24px;background:rgba(255,255,255,.88);border:1px solid rgba(50,105,199,.15);border-radius:20px;box-shadow:0 14px 32px rgba(24,40,62,.04);backdrop-filter:blur(14px);transition:transform .2s ease,box-shadow .2s ease}
.kst-badge-card:hover{transform:translateY(-3px);box-shadow:0 20px 40px rgba(0,136,255,.10);border-color:rgba(0,136,255,.35)}
.kst-badge-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:#F0F6FF;color:#0088FF;border:1px solid rgba(0,136,255,.20);font-size:22px;margin-bottom:14px}
.kst-badge-value{font-size:24px;font-weight:700;color:#18283E;letter-spacing:-.02em;margin:0 0 4px}
.kst-badge-label{font-size:12px;font-weight:600;color:#6C829D;line-height:1.4;margin:0}

/* Savunma Katmanları */
.kst-section{padding:54px 0}
.kst-section-head{text-align:center;max-width:720px;margin:0 auto 48px}
.kst-section-kicker{color:#0088FF;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin:0 0 10px}
.kst-section-title{font-size:clamp(28px,4vw,44px);font-weight:700;color:#18283E;letter-spacing:-.03em;margin:0}
.kst-section-desc{color:#52677F;font-size:15px;line-height:1.6;margin:12px 0 0}

.kst-pillars-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
.kst-pillar-card{padding:32px;background:rgba(255,255,255,.94);border:1px solid rgba(50,105,199,.16);border-radius:24px;box-shadow:0 16px 40px rgba(24,40,62,.04);display:flex;flex-direction:column;gap:14px;transition:border-color .2s ease}
.kst-pillar-card:hover{border-color:rgba(0,136,255,.4)}
.kst-pillar-top{display:flex;align-items:center;gap:14px}
.kst-pillar-icon{display:grid;place-items:center;width:46px;height:46px;border-radius:14px;background:#EFF6FF;color:#0088FF;border:1px solid rgba(0,136,255,.22);font-size:22px}
.kst-pillar-title{margin:0;font-size:20px;font-weight:700;color:#18283E}
.kst-pillar-body{margin:0;color:#52677F;font-size:13px;line-height:1.65}
.kst-pillar-bullets{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.kst-bullet{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:#203754}
.kst-bullet i{width:6px;height:6px;border-radius:50%;background:#0088FF}

/* Sorumlu Bildirim & Zafiyet Raporlama Formu */
.kst-vdp-band{margin:54px 0;padding:48px;background:linear-gradient(135deg,#0C1D33 0%,#152B47 100%);border:1px solid rgba(255,255,255,.1);border-radius:28px;box-shadow:0 30px 70px rgba(12,29,51,.35);color:#FFF}
.kst-vdp-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
.kst-vdp-kicker{color:#38BDF8;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.kst-vdp-title{font-size:clamp(26px,3.5vw,38px);font-weight:700;color:#FFF;letter-spacing:-.03em;margin:10px 0 14px}
.kst-vdp-desc{color:#94A3B8;font-size:14px;line-height:1.65;margin:0 0 24px}
.kst-vdp-details{display:flex;flex-direction:column;gap:14px}
.kst-vdp-item{display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;font-size:13px;color:#E2E8F0}
.kst-vdp-item a{color:#38BDF8;text-decoration:none;font-weight:600}

.kst-form-shell{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:28px;display:flex;flex-direction:column;gap:16px}
.kst-input-group{display:flex;flex-direction:column;gap:6px}
.kst-label{font-size:12px;font-weight:700;color:#E2E8F0;letter-spacing:.02em}
.kst-input{width:100%;height:44px;padding:0 14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#FFF;font-size:13px;outline:none;transition:border-color .18s ease}
.kst-input:focus{border-color:#38BDF8;background:rgba(255,255,255,.12)}
.kst-textarea{width:100%;min-height:90px;padding:12px 14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#FFF;font-size:13px;outline:none;resize:vertical;font-family:inherit;transition:border-color .18s ease}
.kst-textarea:focus{border-color:#38BDF8;background:rgba(255,255,255,.12)}
.kst-btn-submit{height:46px;background:#0088FF;border:none;border-radius:12px;color:#FFF;font-size:13px;font-weight:750;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease;box-shadow:0 10px 24px rgba(0,136,255,.3)}
.kst-btn-submit:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(0,136,255,.45);background:#0077EE}

.kst-feedback{padding:14px;border-radius:12px;font-size:13px;line-height:1.5;display:flex;align-items:center;gap:10px}
.kst-feedback.is-success{background:rgba(34,197,94,.18);border:1px solid rgba(34,197,94,.35);color:#4ADE80}
.kst-feedback.is-error{background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.35);color:#F87171}

/* Mobil Uyumluluk */
@media(max-width:840px){
  .kst-badges-grid{grid-template-columns:repeat(2,1fr);gap:12px}
  .kst-pillars-grid{grid-template-columns:1fr}
  .kst-vdp-grid{grid-template-columns:1fr;gap:32px}
  .kst-vdp-band{padding:28px 20px}
}
@media(max-width:540px){
  .kst-badges-grid{grid-template-columns:1fr}
  .kst-title{font-size:36px}
}
`;

export const SecurityTrustScreen: React.FC<SecurityTrustScreenProps> = ({
  onBack,
  onExplore,
  onOpenAbout,
  onOpenPrivacy,
  onOpenFaq,
  onOpenHowItWorks,
  onOpenBlog,
  onOpenSecurity,
}) => {
  const [researcherEmail, setResearcherEmail] = useState('');
  const [vulnTitle, setVulnTitle] = useState('');
  const [vulnDetails, setVulnDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const style = document.getElementById(STYLE_ID) ?? document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    if (!style.parentNode) document.head.appendChild(style);
  }, []);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const email = researcherEmail.trim();
    const title = vulnTitle.trim();
    const details = vulnDetails.trim();

    if (!email || !title || !details) {
      setFeedback({ tone: 'error', message: 'Lütfen tüm alanları eksiksiz doldurunuz.' });
      return;
    }

    // WebSecurityShieldService ile payload taraması
    const isClean = WebSecurityShieldService.inspectInputPayload(details, 'vdp_report_form');
    if (!isClean) {
      setFeedback({ tone: 'error', message: 'Şüpheli saldırı payloadı tespit edildi ve güvenlik protokolü gereği engellendi.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Araştırmacı bildirimini Tehdit Radarına meşru araştırma raporu olarak kaydet
      await HoneypotTrapService.triggerHoneypotTrap({
        trapType: 'VULNERABILITY_DISCLOSURE_REPORT',
        payload: `Researcher: ${email} | Title: ${title} | Notes: ${details.substring(0, 300)}`,
        toolFingerprint: 'Responsible Security Researcher',
        autoQuarantine: false, // Meşru bildirimde bulunan araştırmacıyı banlama
      });

      setFeedback({
        tone: 'success',
        message: 'Bildiriminiz Kıstas Savunma Ekibine (Pars DevState & Sayra) ulaştı. 24 saat içinde geri dönüş sağlanacaktır. Teşekkür ederiz.',
      });
      setResearcherEmail('');
      setVulnTitle('');
      setVulnDetails('');
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Rapor iletilirken bir ağ hatası oluştu. Lütfen kistasdestek@gmail.com adresine doğrudan e-posta gönderiniz.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="kst-page" aria-label="Kıstas Siber Güvenlik ve Şeffaflık Merkezi">
      {/* 1. Üst Bar */}
      <div className="kst-wrap kst-top-bar">
        <button className="kst-back" type="button" onClick={onBack}>
          <Ionicons name="arrow-back" size={16} /> Geri dön
        </button>
      </div>

      {/* 2. Hero */}
      <section className="kst-wrap kst-hero">
        <div className="kst-kicker">
          <Ionicons name="shield-checkmark" size={16} color="#0088FF" />
          KISTAS SİBER SAVUNMA & ŞEFFAFLIK MERKEZİ
        </div>
        <h1 className="kst-title">
          Kıstas Kale Mimarisiyle <br />
          <span className="kst-title-accent">%100 Uçtan Uca Koruma</span>
        </h1>
        <p className="kst-lead">
          Pars DevState ofansif güvenlik çerçevesi ve Sayra Siber Savunma Zekâsı ile tahkim edilen KISTAS, kullanıcı verilerini, bağımsız projeleri ve finansal bakiye defterlerini sıfır-güven (Zero-Trust) prensibiyle 7/24 korur.
        </p>
      </section>

      {/* 3. Canlı Savunma Rozetleri */}
      <section className="kst-wrap">
        <div className="kst-badges-grid">
          <div className="kst-badge-card">
            <div className="kst-badge-icon"><Ionicons name="shield-half" size={22} color="#0088FF" /></div>
            <h3 className="kst-badge-value">49+ Kalkan</h3>
            <p className="kst-badge-label">Aktif WAF, Bal Küpü Decoy ve Adaptif Rate Limit Koruması</p>
          </div>
          <div className="kst-badge-card">
            <div className="kst-badge-icon"><Ionicons name="document-text" size={22} color="#0088FF" /></div>
            <h3 className="kst-badge-value">RFC 9116</h3>
            <p className="kst-badge-label">Uluslararası security.txt ve Sorumlu Açıklama Standardı</p>
          </div>
          <div className="kst-badge-card">
            <div className="kst-badge-icon"><Ionicons name="lock-closed" size={22} color="#0088FF" /></div>
            <h3 className="kst-badge-value">256-Bit SSL</h3>
            <p className="kst-badge-label">Askeri Düzey HSTS Preload ve DNSSEC Şifreleme</p>
          </div>
          <div className="kst-badge-card">
            <div className="kst-badge-icon"><Ionicons name="wallet" size={22} color="#0088FF" /></div>
            <h3 className="kst-badge-value">Kriptografik Escrow</h3>
            <p className="kst-badge-label">Negatif bakiye taşkını ve yarış koşulu (race condition) koruması</p>
          </div>
        </div>
      </section>

      {/* 4. Dört Temel Savunma Sütunu */}
      <section className="kst-wrap kst-section">
        <div className="kst-section-head">
          <div className="kst-section-kicker">KATMANLI SİBER SAVUNMA</div>
          <h2 className="kst-section-title">Kıstas Kale Mimarisi Nasıl Çalışır?</h2>
          <p className="kst-section-desc">
            Sistemimiz hiçbir istemciye körü körüne güvenmez. Tüm yetki, finansal işlem ve veri akışı veritabanı kısıtları ve WAF radarıyla çift yönlü doğrulanır.
          </p>
        </div>

        <div className="kst-pillars-grid">
          <div className="kst-pillar-card">
            <div className="kst-pillar-top">
              <div className="kst-pillar-icon"><Ionicons name="globe-outline" size={22} color="#0088FF" /></div>
              <h3 className="kst-pillar-title">Web Çalışma Zamanı & WAF Kalkanı</h3>
            </div>
            <p className="kst-pillar-body">
              Tarayıcı katmanında Clickjacking ve UI-Redressing'i engelleyen Frame-Busting kalkanı, arama çubuklarına enjekte edilen DOM XSS/SQLi payload dedektörü ve otomatik bot tuzakları teyakkuzdadır.
            </p>
            <div className="kst-pillar-bullets">
              <div className="kst-bullet"><i /> Anti-Clickjacking & Frame-Busting</div>
              <div className="kst-bullet"><i /> Canlı XSS/SQLi Enjeksiyon Süzgeci</div>
              <div className="kst-bullet"><i /> Honeypot Decoy ve Görünmez Form Tuzakları</div>
            </div>
          </div>

          <div className="kst-pillar-card">
            <div className="kst-pillar-top">
              <div className="kst-pillar-icon"><Ionicons name="server-outline" size={22} color="#0088FF" /></div>
              <h3 className="kst-pillar-title">Veritabanı Düzeyinde Zero-Trust & RLS</h3>
            </div>
            <p className="kst-pillar-body">
              PostgreSQL Satır Düzeyi Güvenlik (Row Level Security - RLS) politikaları ile hiçbir kullanıcı bir başkasının verisine erişemez. Güvenlik açığı tarayıcıları gizli canary tablolarına takılır.
            </p>
            <div className="kst-pillar-bullets">
              <div className="kst-bullet"><i /> %100 Satır Düzeyi Güvenlik (RLS) Politikaları</div>
              <div className="kst-bullet"><i /> SECURITY DEFINER ile İstemciden Bağımsız Yetkilendirme</div>
              <div className="kst-bullet"><i /> Sahte Admin & Bakiye Tuzakları (Honeypot Decoys)</div>
            </div>
          </div>

          <div className="kst-pillar-card">
            <div className="kst-pillar-top">
              <div className="kst-pillar-icon"><Ionicons name="speedometer-outline" size={22} color="#0088FF" /></div>
              <h3 className="kst-pillar-title">Adaptif Hız Sınırı & Otonom WAF Ban</h3>
            </div>
            <p className="kst-pillar-body">
              Fuzzer scriptleri, credential stuffing veya API kaba kuvvet (brute-force) denemeleri dinamik sliding window tablomuz tarafından anlık ölçülür; eşik aşıldığı an saldırgan karantinaya alınır.
            </p>
            <div className="kst-pillar-bullets">
              <div className="kst-bullet"><i /> Kayan Pencere (Sliding Window) Hız Takibi</div>
              <div className="kst-bullet"><i /> Fuzzer & Burst Flood Engellemesi</div>
              <div className="kst-bullet"><i /> Yönetim Panelinden Tek Tıkla Karantina Yönetimi</div>
            </div>
          </div>

          <div className="kst-pillar-card">
            <div className="kst-pillar-top">
              <div className="kst-pillar-icon"><Ionicons name="card-outline" size={22} color="#0088FF" /></div>
              <h3 className="kst-pillar-title">Finansal Bütünlük & Escrow Koruması</h3>
            </div>
            <p className="kst-pillar-body">
              Siparişler ve teklifler Postgres durum makinesi (State Machine) tetikleyicileri ile kilitlenmiştir. Tamamlanan veya iptal edilen siparişler manipüle edilemez; negatif kredi bakiyesi oluşamaz.
            </p>
            <div className="kst-pillar-bullets">
              <div className="kst-bullet"><i /> Değiştirilemez Sipariş Durum Makinesi (Immutability)</div>
              <div className="kst-bullet"><i /> Negatif Değer & Float Taşkın CHECK Kısıtları</div>
              <div className="kst-bullet"><i /> Kriptografik CSPRNG ile Tahmin Edilemez Kodlar</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Sorumlu Zafiyet Bildirim Programı (VDP) */}
      <section className="kst-wrap">
        <div className="kst-vdp-band">
          <div className="kst-vdp-grid">
            <div>
              <div className="kst-vdp-kicker">GÜVENLİK ARAŞTIRMACILARI İÇİN</div>
              <h2 className="kst-vdp-title">Sorumlu Zafiyet Bildirim Programı (VDP)</h2>
              <p className="kst-vdp-desc">
                KISTAS, bağımsız güvenlik araştırmacılarının ve etik hacker'ların katkılarına büyük değer verir. Sistemimizde bir zafiyet tespit ettiyseniz, lütfen aşağıdaki formu kullanarak veya doğrudan e-posta yoluyla bize bildirin.
              </p>
              <div className="kst-vdp-details">
                <div className="kst-vdp-item">
                  <Ionicons name="mail" size={18} color="#38BDF8" />
                  <span>Resmi Güvenlik İrtibatı: <a href="mailto:kistasdestek@gmail.com">kistasdestek@gmail.com</a></span>
                </div>
                <div className="kst-vdp-item">
                  <Ionicons name="document-text" size={18} color="#38BDF8" />
                  <span>RFC 9116 security.txt: <a href="/.well-known/security.txt" target="_blank" rel="noreferrer">Görüntüle</a></span>
                </div>
                <div className="kst-vdp-item">
                  <Ionicons name="time" size={18} color="#38BDF8" />
                  <span>Ortalama İlk Yanıt Süresi: <strong>&lt; 24 Saat</strong></span>
                </div>
              </div>
            </div>

            <form className="kst-form-shell" onSubmit={handleSubmitReport}>
              <div className="kst-input-group">
                <label className="kst-label" htmlFor="vdp-email">İletişim E-postanız</label>
                <input
                  id="vdp-email"
                  type="email"
                  className="kst-input"
                  placeholder="guvenlik@arastirmaci.com"
                  value={researcherEmail}
                  onChange={(e) => setResearcherEmail(e.target.value)}
                  required
                />
              </div>

              <div className="kst-input-group">
                <label className="kst-label" htmlFor="vdp-title">Bulgu / Zafiyet Başlığı</label>
                <input
                  id="vdp-title"
                  type="text"
                  className="kst-input"
                  placeholder="Örn: XSS, RLS Politikası Açığı, Rate Limit Eksikliği"
                  value={vulnTitle}
                  onChange={(e) => setVulnTitle(e.target.value)}
                  required
                />
              </div>

              <div className="kst-input-group">
                <label className="kst-label" htmlFor="vdp-details">Zafiyet Detayı & Tekrar Üretme Adımları</label>
                <textarea
                  id="vdp-details"
                  className="kst-textarea"
                  placeholder="Zafiyeti tetikleyen adımları ve etki analizini açıklayınız..."
                  value={vulnDetails}
                  onChange={(e) => setVulnDetails(e.target.value)}
                  required
                />
              </div>

              {feedback ? (
                <div className={`kst-feedback is-${feedback.tone}`}>
                  <Ionicons
                    name={feedback.tone === 'success' ? 'checkmark-circle' : 'alert-circle'}
                    size={20}
                  />
                  <span>{feedback.message}</span>
                </div>
              ) : null}

              <button type="submit" className="kst-btn-submit" disabled={isSubmitting}>
                {isSubmitting ? 'İletiliyor...' : 'Güvenli Bulguyu Raporla'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 6. Alt Bilgi */}
      <CinematicFooter
        onOpenAbout={onOpenAbout}
        onOpenPrivacy={onOpenPrivacy}
        onOpenFaq={onOpenFaq}
        onOpenHowItWorks={onOpenHowItWorks}
        onOpenBlog={onOpenBlog}
        onOpenSecurity={onOpenSecurity}
      />
    </main>
  );
};
