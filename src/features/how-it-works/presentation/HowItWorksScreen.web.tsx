import React, { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';

export interface HowItWorksScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onCreateProject?: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenBlog?: () => void;
}

const STYLE_ID = 'kistas-how-it-works-styles';
const STYLES = `
.khiw-page{height:100%;overflow-x:hidden;overflow-y:auto;color:#252333;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#F1F5FA}
.khiw-page *{box-sizing:border-box}
.khiw-wrap{width:min(1140px,calc(100% - 40px));margin:0 auto}

/* HERO SECTION */
.khiw-hero{min-height:min(640px,72vh);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px 0 24px;text-align:center}
.khiw-back{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:0 14px;border:1px solid rgba(50,105,199,.2);border-radius:20px;background:rgba(255,255,255,.85);color:#526680;font:700 12px/1 inherit;cursor:pointer;transition:all .2s ease}
.khiw-back:hover{color:#252333;border-color:#3269C7;background:#FFFFFF;transform:translateX(-2px)}
.khiw-kicker{margin:32px 0 12px;color:#3269C7;font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase}
.khiw-title{margin:0;font-size:clamp(46px,7vw,90px);line-height:.98;font-weight:900;letter-spacing:-0.025em;color:#252333;text-shadow:0 12px 40px rgba(50,105,199,.12)}
.khiw-lead{max-width:740px;margin:12px auto 0;color:#55657A;font-size:clamp(16px,1.8vw,19.5px);line-height:1.65}
.khiw-lead strong{color:#252333}

/* TRUST RIBBON */
.khiw-trust-ribbon{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:32px 0 8px}
.khiw-trust-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(237,244,253,.7);border:1px solid rgba(203,217,236,.8);border-radius:999px;color:#3269C7;font-size:12px;font-weight:700;letter-spacing:.02em}
.khiw-trust-chip span{color:#252333}

/* TABS */
.khiw-tabs{display:inline-flex;padding:5px;background:rgba(235,243,254,.7);border:1px solid rgba(203,217,236,.8);border-radius:32px;gap:6px;margin-top:36px}
.khiw-tab{padding:11px 26px;border-radius:26px;border:none;background:transparent;color:#596E8C;font:700 13.5px/1 inherit;cursor:pointer;transition:all .25s ease;display:flex;align-items:center;gap:8px}
.khiw-tab.active{background:#FFFFFF;color:#252333;box-shadow:0 4px 14px -2px rgba(50,105,199,.16)}
.khiw-tab:hover:not(.active){color:#252333}

/* STEPS GRID */
.khiw-steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin:44px 0 68px;width:100%}
.khiw-step-card{min-width:0;background:#FFFFFF;border:1px solid #DDE6F1;border-top:3px solid #7FA5DA;border-radius:8px;padding:28px;position:relative;box-shadow:0 8px 24px -16px rgba(31,62,105,.18);transition:border-color .2s ease,box-shadow .2s ease;display:flex;flex-direction:column;text-align:left}
@media(hover:hover){.khiw-step-card:hover{border-color:#A6BFDF;box-shadow:0 12px 28px -16px rgba(31,62,105,.24)}}
.khiw-step-badge{width:48px;height:48px;border-radius:8px;background:#EDF4FD;color:#3269C7;display:grid;place-items:center;margin-bottom:24px;flex-shrink:0}
.khiw-step-num{position:absolute;top:40px;right:28px;font-size:11px;font-weight:800;letter-spacing:.05em;color:#71849F}
.khiw-step-card h3{margin:0 0 12px;font-size:19.5px;font-weight:800;color:#28374D;line-height:1.35;letter-spacing:0}
.khiw-step-card p{margin:0;color:#5B6E87;font-size:14px;line-height:1.78;flex:1}
@media(prefers-reduced-motion:reduce){.khiw-step-card{transition:none}}

/* PRINCIPLES BAND */
.khiw-principles{background:rgba(250,251,254,.92);border-block:1px solid rgba(203,217,236,.65);padding:84px 0}
.khiw-p-head{text-align:center;max-width:640px;margin:0 auto 46px}
.khiw-p-head h2{margin:0 0 12px;font-size:32px;font-weight:900;color:#252333;letter-spacing:-.01em}
.khiw-p-head p{margin:0;color:#677A93;font-size:15px;line-height:1.6}
.khiw-p-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.khiw-p-item{text-align:left;background:#FFFFFF;border:1px solid rgba(203,217,236,.7);border-radius:12px;padding:26px;box-shadow:0 6px 18px -6px rgba(50,105,199,.06)}
.khiw-p-icon{width:42px;height:42px;border-radius:10px;background:#EDF4FD;color:#3269C7;display:grid;place-items:center;margin-bottom:18px}
.khiw-p-item h4{margin:0 0 10px;font-size:18px;font-weight:800;color:#252333}
.khiw-p-item p{margin:0;color:#677A93;font-size:13.5px;line-height:1.68}

/* COMPARISON TABLE */
.khiw-compare-section{padding:84px 0}
.khiw-compare-head{text-align:center;max-width:640px;margin:0 auto 44px}
.khiw-compare-head h2{margin:0 0 12px;font-size:32px;font-weight:900;color:#252333;letter-spacing:-.01em}
.khiw-compare-head p{margin:0;color:#677A93;font-size:15px}
.khiw-table-shell{background:#FFFFFF;border:1px solid rgba(203,217,236,.8);border-radius:16px;overflow:hidden;box-shadow:0 12px 32px -12px rgba(50,105,199,.1)}
.khiw-table{width:100%;border-collapse:collapse;text-align:left;font-size:14px}
.khiw-table th{padding:18px 24px;background:#F6FAFF;border-bottom:1px solid rgba(203,217,236,.8);color:#252333;font-weight:800;font-size:13px;letter-spacing:.04em;text-transform:uppercase}
.khiw-table th:last-child{background:#EEF5FE;color:#3269C7}
.khiw-table td{padding:18px 24px;border-bottom:1px solid rgba(230,238,248,.9);color:#5B6E87;line-height:1.55}
.khiw-table tr:last-child td{border-bottom:none}
.khiw-table td.col-kistas{font-weight:700;color:#252333;background:rgba(238,245,254,.3)}
.khiw-badge-bad{display:inline-flex;align-items:center;gap:6px;color:#C2410C;font-weight:600;font-size:13px}
.khiw-badge-good{display:inline-flex;align-items:center;gap:6px;color:#15803D;font-weight:700;font-size:13px}

/* FAQ SECTION */
.khiw-faq-section{padding:84px 0}
.khiw-faq-head{text-align:center;max-width:600px;margin:0 auto 46px}
.khiw-faq-head h2{margin:0 0 12px;font-size:34px;font-weight:900;color:#252333}
.khiw-faq-head p{margin:0;color:#677A93;font-size:15px}
.khiw-faq-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
.khiw-faq-card{background:#FFFFFF;border:1px solid rgba(203,217,236,.75);border-radius:14px;padding:26px 28px;box-shadow:0 6px 20px -6px rgba(50,105,199,.06)}
.khiw-faq-card h4{margin:0 0 10px;font-size:16px;font-weight:800;color:#252333;display:flex;align-items:center;gap:10px}
.khiw-faq-card h4 span{color:#3269C7}
.khiw-faq-card p{margin:0;color:#5D6F86;font-size:13.5px;line-height:1.7}
.khiw-faq-card p strong{color:#252333}

/* CTA SECTION */
.khiw-cta{padding:80px 0 60px;text-align:center}
.khiw-cta-box{background:linear-gradient(135deg,#252333 0%,#1B3864 100%);border-radius:24px;padding:64px 32px;color:#FFFFFF;box-shadow:0 24px 60px -15px rgba(27,56,100,.35);position:relative;overflow:hidden}
.khiw-cta-box h2{margin:0 0 14px;font-size:clamp(30px,4.5vw,46px);font-weight:900;line-height:1.15}
.khiw-cta-box p{max-width:560px;margin:0 auto 34px;color:rgba(255,255,255,.82);font-size:16px;line-height:1.6}
.khiw-cta-actions{display:flex;justify-content:center;gap:14px;flex-wrap:wrap}
.khiw-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 28px;border-radius:26px;font:700 13.5px/1 inherit;text-decoration:none;cursor:pointer;transition:all .25s ease}
.khiw-btn-primary{background:#FFFFFF;color:#252333;border:1px solid #FFFFFF}
.khiw-btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.18)}
.khiw-btn-secondary{background:rgba(255,255,255,.12);color:#FFFFFF;border:1px solid rgba(255,255,255,.24);backdrop-filter:blur(8px)}
.khiw-btn-secondary:hover{background:rgba(255,255,255,.2);transform:translateY(-2px)}

/* RESPONSIVE */
@media(max-width:767px){
  .khiw-wrap{width:min(100% - 32px,1140px)}
  .khiw-hero{min-height:auto;padding-top:24px;padding-bottom:24px}
  .khiw-title{font-size:42px}
  .khiw-lead{font-size:15px}
  .khiw-trust-ribbon{gap:8px}
  .khiw-trust-chip{padding:6px 12px;font-size:11px}
  .khiw-tabs{width:100%;justify-content:center}
  .khiw-tab{padding:9px 16px;font-size:12px}
  .khiw-steps-grid{grid-template-columns:1fr;gap:16px;margin:32px 0 54px}
  .khiw-step-card{padding:24px}
  .khiw-step-num{top:36px;right:24px}
  .khiw-p-grid{grid-template-columns:1fr;gap:18px}
  .khiw-table-shell{overflow-x:auto}
  .khiw-table{font-size:12.5px}
  .khiw-table th, .khiw-table td{padding:14px 16px}
  .khiw-faq-grid{grid-template-columns:1fr;gap:14px}
  .khiw-cta-box{padding:42px 20px;border-radius:20px}
  .khiw-cta-box h2{font-size:28px}
  .khiw-cta-actions{flex-direction:column;width:100%}
  .khiw-btn{width:100%}
}
`;

export const HowItWorksScreen: React.FC<HowItWorksScreenProps> = ({
  onBack,
  onExplore,
  onCreateProject,
  onOpenAbout,
  onOpenPrivacy,
  onOpenSupport,
  onOpenBlog,
}) => {
  const [activeTab, setActiveTab] = useState<'user' | 'creator'>('user');

  useEffect(() => {
    const style = document.getElementById(STYLE_ID) ?? document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    if (!style.parentNode) document.head.appendChild(style);
  }, []);

  return (
    <main className="khiw-page" aria-label="Kıstas Nasıl Çalışır">
      {/* Hero Section */}
      <section className="khiw-hero khiw-wrap">
        <button className="khiw-back" type="button" onClick={onBack} aria-label="Geri dön">
          <Ionicons name="arrow-back" size={16} /> Vitrine Dön
        </button>

        <p className="khiw-kicker">EKOSİSTEM & ÇALIŞMA PRENSİPLERİ</p>
        <h1 className="khiw-title">Kıstas Nasıl Çalışır?</h1>
        <p className="khiw-lead">
          Kıstas; bağımsız geliştiricilerin, yapay zekâ mühendislerinin ve yaratıcı kurucuların dijital projelerini doğrudan kitlelerle buluşturduğu <strong>şeffaf ve adil bir vitrindir</strong>. Tekelci reklam bütçelerine yer yok: Yalnızca gerçek topluluk desteği, saatlik eşit rotasyon ve organik büyüme.
        </p>

        {/* Trust & Scale Ribbon */}
        <div className="khiw-trust-ribbon" aria-label="Kıstas Temel İlkeleri">
          <div className="khiw-trust-chip">
            <Ionicons name="sparkles" size={14} /> <span>%100 Organik Sıralama</span>
          </div>
          <div className="khiw-trust-chip">
            <Ionicons name="sync" size={14} /> <span>Saatlik Eşit Rotasyon</span>
          </div>
          <div className="khiw-trust-chip">
            <Ionicons name="shield-checkmark" size={14} /> <span>Atomik Doğrulanmış Oylar</span>
          </div>
          <div className="khiw-trust-chip">
            <Ionicons name="wallet-outline" size={14} /> <span>Sıfır Aracı Komisyonu</span>
          </div>
        </div>

        {/* Role Switcher Tabs */}
        <div className="khiw-tabs" role="tablist">
          <button
            className={`khiw-tab ${activeTab === 'user' ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'user'}
            onClick={() => setActiveTab('user')}
          >
            <Ionicons name="compass-outline" size={17} /> Proje Keşfedenler İçin
          </button>
          <button
            className={`khiw-tab ${activeTab === 'creator' ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'creator'}
            onClick={() => setActiveTab('creator')}
          >
            <Ionicons name="rocket-outline" size={17} /> Proje Üretenler (Makers) İçin
          </button>
        </div>

        {/* Step Cards Grid */}
        {activeTab === 'user' ? (
          <div className="khiw-steps-grid">
            <article className="khiw-step-card">
              <span className="khiw-step-num">ADIM 01</span>
              <div className="khiw-step-badge"><Ionicons name="search-outline" size={24} color="#3269C7" /></div>
              <h3>Radara Takılmamış Fikirleri Keşfet</h3>
              <p>
                Yapay Zekâ, Mobil, SaaS, Oyun ve Finans gibi kategorilerde her gün vitrine çıkan yepyeni bağımsız projeleri, canlı demoları ve platform etiketlerini filtreleyerek ilk siz deneyimleyin.
              </p>
            </article>

            <article className="khiw-step-card">
              <span className="khiw-step-num">ADIM 02</span>
              <div className="khiw-step-badge"><Ionicons name="arrow-up-circle-outline" size={24} color="#3269C7" /></div>
              <h3>Topluluk Sinyali Ver (Upvote)</h3>
              <p>
                Beğendiğin projelere tek tıkla destek oyu ver. Kıstas'ın manipülasyona kapalı algoritması sayesinde oyun, projenin Popüler Vitrini'nde yükselmesini ve binlerce yeni insana ulaşmasını sağlar.
              </p>
            </article>

            <article className="khiw-step-card">
              <span className="khiw-step-num">ADIM 03</span>
              <div className="khiw-step-badge"><Ionicons name="gift-outline" size={24} color="#3269C7" /></div>
              <h3>Erken Erişim Kuponlarını Al & Konuş</h3>
              <p>
                Geliştiricilerin Kıstas üyelerine özel sunduğu promosyon kodlarını, indirimleri ve davetiyeleri kap. Yerleşik sohbet modülü üzerinden kurucuyla doğrudan temas kurup geri bildirim ver.
              </p>
            </article>
          </div>
        ) : (
          <div className="khiw-steps-grid">
            <article className="khiw-step-card">
              <span className="khiw-step-num">ADIM 01</span>
              <div className="khiw-step-badge"><Ionicons name="add-circle-outline" size={24} color="#3269C7" /></div>
              <h3>2 Dakikada Bürokrasisiz Lansman</h3>
              <p>
                Haftalar süren onay kuyrukları yok. Projenin başlığını, sloganını, dikey ekran görüntülerini, platform etiketlerini ve web/mağaza linklerini ekle; lansmanın anında başlasın.
              </p>
            </article>

            <article className="khiw-step-card">
              <span className="khiw-step-num">ADIM 02</span>
              <div className="khiw-step-badge"><Ionicons name="people-outline" size={24} color="#3269C7" /></div>
              <h3>Reklam Bütçesiz İlk Kullanıcı Kitleniz</h3>
              <p>
                Büyük reklam bütçeleri harcamadan projen 'Yeni Çıkanlar' ve 'Keşfet' akışında sergilensin. Erken benimseyici teknoloji meraklılarından ilk günden nitelikli geri bildirim topla.
              </p>
            </article>

            <article className="khiw-step-card">
              <span className="khiw-step-num">ADIM 03</span>
              <div className="khiw-step-badge"><Ionicons name="shield-checkmark-outline" size={24} color="#3269C7" /></div>
              <h3>Paranın Satın Alamadığı Adil Sıralama</h3>
              <p>
                Kıstas'ta para sıra satın alamaz. Organik sıralama doğrulanmış oylarla şekillenir. Dilersen Sponsorlu Vitrin ile saatlik eşit rotasyon algoritmasında adil frekansta parlayabilirsin.
              </p>
            </article>
          </div>
        )}
      </section>

      {/* Principles & Architecture Band */}
      <section className="khiw-principles">
        <div className="khiw-wrap">
          <div className="khiw-p-head">
            <p className="khiw-kicker">MİMARİ PRENSİPLER</p>
            <h2>Sistemin Çalışma Mimarisi</h2>
            <p>Kıstas, dijital ürünleri manipülasyondan uzak, tamamen şeffaf algoritmalarla sergilemek üzere tasarlandı.</p>
          </div>

          <div className="khiw-p-grid">
            <div className="khiw-p-item">
              <div className="khiw-p-icon"><Ionicons name="sparkles-outline" size={22} /></div>
              <h4>Akıllı Destek Algoritması</h4>
              <p>Destek oyları sunucuda atomik RPC ile doğrulanır. Son 7 günün zaman azalımlı (time-decay) ağırlıklandırmasıyla vitrin her gün taze kalır; sahte hesaplar ve botlar elenir.</p>
            </div>
            <div className="khiw-p-item">
              <div className="khiw-p-icon"><Ionicons name="sync-outline" size={22} /></div>
              <h4>Saatlik Eşit Rotasyon</h4>
              <p>Sponsorlu vitrinde tek bir bütçe ekranı tekeline alamaz. Tüm aktif sponsorlar 60 dakikalık periyotlarla eşit olasılıkla vitrine çıkar; bağımsız kurucular devlerle eşit frekansta yarışır.</p>
            </div>
            <div className="khiw-p-item">
              <div className="khiw-p-icon"><Ionicons name="cube-outline" size={22} /></div>
              <h4>Açık Ekosistem & Sıfır Komisyon</h4>
              <p>Kıstas hiçbir aracı komisyon almaz. Kullanıcıları projenin orijinal web sitesine veya mağaza sayfasına yönlendirir; kurucu ve kullanıcı arasında doğrudan temas sağlar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section: Geleneksel vs Kıstas */}
      <section className="khiw-compare-section khiw-wrap">
        <div className="khiw-compare-head">
          <p className="khiw-kicker">STANDARTLAR & FARKIMIZ</p>
          <h2>Geleneksel Mecralar vs. Kıstas</h2>
          <p>Kıstas'ın bağımsız dijital ürünler için sunduğu adil keşif standartları.</p>
        </div>

        <div className="khiw-table-shell">
          <table className="khiw-table" aria-label="Geleneksel Platformlar ve Kıstas Karşılaştırması">
            <thead>
              <tr>
                <th>Standart Kriter</th>
                <th>Geleneksel Platformlar / Reklam Ağları</th>
                <th>Kıstas Ekosistemi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Görünürlük Modeli</strong></td>
                <td><span className="khiw-badge-bad">✕</span> Yüksek bütçeli reklam verenler öne geçer</td>
                <td className="col-kistas"><span className="khiw-badge-good">✓</span> Doğrulanmış topluluk desteği ile organik yükselme</td>
              </tr>
              <tr>
                <td><strong>Sponsorluk Dağılımı</strong></td>
                <td><span className="khiw-badge-bad">✕</span> Tekel bütçeler ekranı sürekli bloke eder</td>
                <td className="col-kistas"><span className="khiw-badge-good">✓</span> Saatlik eşit rotasyon; tüm projeler eşit görünürlük alır</td>
              </tr>
              <tr>
                <td><strong>Aracı Komisyonu</strong></td>
                <td><span className="khiw-badge-bad">✕</span> %15 ila %30 arasında aracı kesintisi uygulanır</td>
                <td className="col-kistas"><span className="khiw-badge-good">✓</span> %0 Komisyon; doğrudan orijinal adrese yönlendirme</td>
              </tr>
              <tr>
                <td><strong>Kullanıcı Teması</strong></td>
                <td><span className="khiw-badge-bad">✕</span> Yorumlarda kaybolan, mesafeli iletişim</td>
                <td className="col-kistas"><span className="khiw-badge-good">✓</span> Kurucu ile yerleşik, birebir doğrulanmış sohbet</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* SSS Section */}
      <section className="khiw-faq-section khiw-wrap">
        <div className="khiw-faq-head">
          <p className="khiw-kicker">SIKÇA SORULAN SORULAR</p>
          <h2>Aklınıza Takılanlar</h2>
          <p>Kıstas işleyişi hakkında en çok merak edilen 4 kurumsal soru ve yanıtı.</p>
        </div>

        <div className="khiw-faq-grid">
          <div className="khiw-faq-card">
            <h4><span>01.</span> Kıstas'ı kullanmak ücretli mi?</h4>
            <p>Hayır! Proje aramak, vitrinleri gezmek, upvote (destek) vermek, mesajlaşmak ve standart proje lansmanı yapmak tamamen <strong>ücretsizdir</strong>.</p>
          </div>
          <div className="khiw-faq-card">
            <h4><span>02.</span> Upvote (Destek Oyu) ne işe yarar?</h4>
            <p>Bir projeye verdiğin destek oyu, projenin son 7 günlük puanını yükselterek Popüler Vitrini'nde üst sıralara tırmanmasını sağlar. Sahte oylar sunucu kontrolünde elenir.</p>
          </div>
          <div className="khiw-faq-card">
            <h4><span>03.</span> Sponsorlu Vitrin rotasyonu nedir?</h4>
            <p>Sponsorluk alan projeler saat başı eşit olasılıkla rotasyona girer; böylece küçük ya da büyük her proje en ön sıradan adil görünürlük elde eder.</p>
          </div>
          <div className="khiw-faq-card">
            <h4><span>04.</span> Kimler proje tanıtabilir?</h4>
            <p>Web uygulaması, mobil uygulama, yapay zekâ çözümü, bağımsız oyun veya SaaS geliştiren herkes projesini dakikalar içinde vitrine taşıyabilir.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="khiw-cta khiw-wrap">
        <div className="khiw-cta-box">
          <h2>Geleceğin projelerine ortak ol.</h2>
          <p>İster yeni çıkan dijital ürünleri keşfet, ister kendi hayalindeki projeyi yüzlerce insanın beğenisine sun.</p>
          <div className="khiw-cta-actions">
            <button className="khiw-btn khiw-btn-primary" type="button" onClick={onExplore}>
              <Ionicons name="compass" size={17} /> Projeleri Keşfet
            </button>
            {onCreateProject && (
              <button className="khiw-btn khiw-btn-secondary" type="button" onClick={onCreateProject}>
                <Ionicons name="rocket" size={17} /> Kendi Projeni Tanıt
              </button>
            )}
          </div>
        </div>
      </section>

      <CinematicFooter
        compact
        onOpenAbout={onOpenAbout}
        onOpenPrivacy={onOpenPrivacy}
        onOpenSupport={onOpenSupport}
        onOpenBlog={onOpenBlog}
      />
    </main>
  );
};
