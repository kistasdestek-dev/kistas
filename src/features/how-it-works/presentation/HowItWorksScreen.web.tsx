import React, { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';
import { SplineSceneBasic } from '@/components/ui/splite';

export interface HowItWorksScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onCreateProject?: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenFaq?: () => void;
  onOpenBlog?: () => void;
}

type Audience = 'explorer' | 'creator';

interface Step {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  copy: string;
}

const STYLE_ID = 'kistas-how-it-works-styles';
const STYLES = `
.khiw-page{height:100%;overflow-x:hidden;overflow-y:auto;color:#25364E;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:radial-gradient(circle at 50% 6%,rgba(50,105,199,.12),transparent 32%),#F3F6FB}
.khiw-page *{box-sizing:border-box}.khiw-wrap{width:min(1140px,calc(100% - 40px));margin:0 auto}
.khiw-top-bar{display:flex;align-items:center;padding:24px 0 8px}
.khiw-back{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid rgba(50,105,199,.18);border-radius:12px;background:rgba(255,255,255,.72);color:#686474;font:700 12px/1 inherit;box-shadow:0 8px 24px rgba(37,54,78,.05);cursor:pointer;transition:transform .18s ease,border-color .18s ease}.khiw-back:hover{transform:translateX(-2px);border-color:rgba(50,105,199,.42);color:#25364E}

/* 3D Spline Scene Styles */
.khiw-3d-showcase{width:100%;margin:12px auto 44px}
.k-card{width:100%;height:500px;min-height:500px;background-color:rgba(0,0,0,.96);position:relative;overflow:hidden;border-radius:24px;border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 60px -12px rgba(0,0,0,.7);box-sizing:border-box}
.k-card .flex{display:flex;width:100%;height:100%;align-items:stretch}
.k-card .flex-1{flex:1 1 0%;height:100%}
.k-card .relative{position:relative}
.k-card .w-full{width:100%}
.k-card .h-full{height:100%}
.k-card canvas{width:100%!important;height:100%!important;display:block;outline:none}

/* Spotlight */
.-top-40{top:-160px}.left-0{left:0px}
.h-\[169\%\]{height:169%}.w-\[138\%\]{width:138%}
.opacity-0{opacity:0}.pointer-events-none{pointer-events:none}
.absolute{position:absolute}.z-\[1\]{z-index:1}

@keyframes spotlight{0%{opacity:0;transform:translate(-72%,-62%) scale(0.5)}100%{opacity:1;transform:translate(-50%,-40%) scale(1)}}
.animate-spotlight{animation:spotlight 2s ease .75s 1 forwards}

.loader{width:44px;height:44px;border:3px solid rgba(255,255,255,.2);border-radius:50%;border-top-color:#3269C7;animation:khiw-spin .9s linear infinite;display:inline-block}
@keyframes khiw-spin{to{transform:rotate(360deg)}}

.khiw-hero{display:flex;flex-direction:column;align-items:center;padding:16px 0 68px;text-align:center}
.khiw-kicker{display:inline-flex;margin:24px 0 16px;padding:8px 12px;border:1px solid rgba(50,105,199,.16);border-radius:999px;background:rgba(255,255,255,.72);color:#3269C7;font-size:10px;font-weight:700;letter-spacing:.16em}.khiw-title{max-width:900px;margin:0;font-size:clamp(52px,8vw,96px);line-height:.97;font-weight:750;letter-spacing:-.055em;color:#25364E;text-wrap:balance}.khiw-title-accent{color:#3269C7}.khiw-lead{max-width:690px;margin:22px auto 0;color:#5F6877;font-size:clamp(17px,2vw,21px);line-height:1.58;text-wrap:balance}
.khiw-tabs{display:grid;grid-template-columns:1fr 1fr;width:min(620px,100%);gap:6px;margin-top:34px;padding:6px;border:1px solid rgba(50,105,199,.14);border-radius:18px;background:rgba(233,241,252,.78)}.khiw-tab{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 18px;border:0;border-radius:13px;background:transparent;color:#68758A;font:700 12px/1.2 inherit;cursor:pointer;transition:background .18s ease,color .18s ease,box-shadow .18s ease}.khiw-tab.active{background:#FFFFFF;color:#25364E;box-shadow:0 8px 20px rgba(37,54,78,.09)}
.khiw-audience{width:100%;margin-top:24px}.khiw-audience-intro{max-width:620px;margin:0 auto;color:#3269C7;font-size:12px;font-weight:700}.khiw-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:22px;text-align:left}.khiw-step{min-height:240px;padding:26px;border:1px solid rgba(50,105,199,.14);border-radius:20px;background:rgba(255,255,255,.84);box-shadow:0 16px 38px rgba(37,54,78,.06)}.khiw-step-top{display:flex;align-items:center;justify-content:space-between}.khiw-step-icon{display:grid;place-items:center;width:44px;height:44px;border:1px solid rgba(50,105,199,.16);border-radius:14px;background:#EEF4FD;color:#3269C7}.khiw-step-num{color:#7B8798;font-size:10px;font-weight:700;letter-spacing:.1em}.khiw-step h3{margin:34px 0 10px;color:#25364E;font-size:21px;line-height:1.25}.khiw-step p{margin:0;color:#5F6877;font-size:13px;line-height:1.65}

.khiw-values{padding:88px 0;background:rgba(255,255,255,.62);border-block:1px solid rgba(50,105,199,.1)}.khiw-section-head{max-width:680px}.khiw-eyebrow{margin:0;color:#3269C7;font-size:10px;font-weight:700;letter-spacing:.16em}.khiw-section-title{margin:12px 0 0;font-size:clamp(34px,5vw,56px);line-height:1.05;letter-spacing:-.035em}.khiw-value-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:38px}.khiw-value{padding:24px;border:1px solid rgba(50,105,199,.14);border-radius:18px;background:#FFFFFF;box-shadow:0 14px 34px rgba(37,54,78,.05)}.khiw-value-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:13px;background:#EEF4FD;color:#3269C7}.khiw-value h3{margin:22px 0 8px;font-size:19px}.khiw-value p{margin:0;color:#5F6877;font-size:12px;line-height:1.6}
.khiw-cta{padding:90px 0}.khiw-cta-box{padding:62px 32px;border-radius:26px;background:linear-gradient(135deg,#25364E,#1D4479);color:#FFFFFF;text-align:center;box-shadow:0 28px 64px -22px rgba(37,54,78,.45)}.khiw-cta-box h2{max-width:720px;margin:0 auto;font-size:clamp(34px,5vw,58px);line-height:1.03;letter-spacing:-.04em}.khiw-cta-box p{max-width:560px;margin:18px auto 0;color:rgba(255,255,255,.78);font-size:15px;line-height:1.6}.khiw-actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:28px}.khiw-action{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:0 22px;border:1px solid rgba(255,255,255,.22);border-radius:14px;background:rgba(255,255,255,.1);color:#FFFFFF;font:700 12px/1 inherit;cursor:pointer}.khiw-action-primary{background:#FFFFFF;color:#25364E;border-color:#FFFFFF}

@media(min-width:768px){.md\:left-60{left:240px}.md\:-top-20{top:-80px}.md\:text-5xl{font-size:3rem;line-height:1}}
@media(min-width:1024px){.lg\:w-\[84\%\]{width:84%}}
@media(max-width:767px){
  .k-card{height:auto;min-height:540px}
  .k-card .flex{flex-direction:column}
  .k-card .flex-1.relative{height:300px;min-height:300px;width:100%}
  .khiw-top-bar{padding:16px 0 8px}
  .khiw-3d-showcase{margin:8px auto 32px}
  .khiw-3d-title{font-size:clamp(30px,7.5vw,42px)!important;letter-spacing:-0.005em!important;line-height:1.24!important}
  .khiw-3d-title-accent{margin-top:12px!important;letter-spacing:-0.005em!important}
  .khiw-wrap{width:min(100% - 32px,1140px)}.khiw-hero{padding:12px 0 56px}.khiw-kicker{margin-top:16px}.khiw-title{font-size:48px;line-height:1;letter-spacing:-.045em}.khiw-lead{margin-top:18px;font-size:16px}.khiw-tabs{margin-top:28px}.khiw-tab{min-height:54px;padding:0 10px;font-size:11px}.khiw-steps{grid-template-columns:1fr;gap:10px}.khiw-step{min-height:auto;padding:22px}.khiw-step h3{margin-top:25px}.khiw-values{padding:72px 0}.khiw-value-grid{grid-template-columns:1fr;gap:10px}.khiw-value{padding:22px}.khiw-cta{padding:68px 0}.khiw-cta-box{padding:44px 20px;border-radius:20px}.khiw-actions{flex-direction:column}.khiw-action{width:100%}
}
@media(prefers-reduced-motion:reduce){.khiw-back,.khiw-tab{transition:none}}
`;

const STEPS: Record<Audience, Step[]> = {
  explorer: [
    { icon: 'compass-outline', title: 'Yeni projeleri bul', copy: 'Kategorileri gez. Yeni çıkan uygulama, oyun ve araçları tek yerde gör.' },
    { icon: 'heart-outline', title: 'Beğendiğine destek ver', copy: 'Tek dokunuşla kalıcı destek ol. Popüler sıralama gerçek desteklere göre oluşur.' },
    { icon: 'chatbubble-ellipses-outline', title: 'Üreticiyle bağlantı kur', copy: 'Sorunu sor, fikrini paylaş ve varsa projeye özel fırsatları yakala.' },
  ],
  creator: [
    { icon: 'images-outline', title: 'Proje vitrinini hazırla', copy: 'Projenin ne yaptığını kısa bir anlatım ve güçlü görsellerle göster.' },
    { icon: 'people-outline', title: 'Doğru kişilere ulaş', copy: 'Ürünün, yeni dijital fikirleri gerçekten merak eden kullanıcılarla buluşsun.' },
    { icon: 'trending-up-outline', title: 'Destekle büyü', copy: 'Kalıcı destekleri ve geri bildirimleri ürününün bir sonraki adımına dönüştür.' },
  ],
};

export const HowItWorksScreen: React.FC<HowItWorksScreenProps> = ({
  onBack,
  onExplore,
  onCreateProject,
  onOpenAbout,
  onOpenPrivacy,
  onOpenFaq,
  onOpenBlog,
}) => {
  const [audience, setAudience] = useState<Audience>('explorer');

  useEffect(() => {
    const style = document.getElementById(STYLE_ID) ?? document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    if (!style.parentNode) document.head.appendChild(style);
  }, []);

  const isExplorer = audience === 'explorer';

  return (
    <main className="khiw-page" aria-label="Kıstas Nasıl Çalışır">
      {/* 1. ÜST NAVİGASYON */}
      <div className="khiw-wrap khiw-top-bar">
        <button className="khiw-back" type="button" onClick={onBack}>
          <Ionicons name="arrow-back" size={16} /> Geri dön
        </button>
      </div>

      {/* 2. 3D İNTERAKTİF AÇILIŞ VİTRİNİ (HERO) */}
      <section className="khiw-3d-showcase khiw-wrap" aria-label="3D Etkileşimli Vitrin">
        <SplineSceneBasic
          title="Keşfetmek kolay."
          accentTitle="Büyümek mümkün."
        />
      </section>

      {/* 3. KISTAS NASIL İŞLER & ADIMLAR */}
      <section className="khiw-hero khiw-wrap">
        <p className="khiw-kicker">KISTAS NASIL İŞLER?</p>
        <p className="khiw-lead" style={{ marginTop: 8 }}>
          Kıstas iki tarafı buluşturur: yeni ürün arayanlar ve ürününü doğru insanlara anlatmak isteyenler.
        </p>

        <div className="khiw-tabs" role="tablist" aria-label="Kıstas kullanım amacı">
          <button className={`khiw-tab ${isExplorer ? 'active' : ''}`} type="button" role="tab" aria-selected={isExplorer} onClick={() => setAudience('explorer')}>
            <Ionicons name="compass-outline" size={17} /> Keşfetmek istiyorum
          </button>
          <button className={`khiw-tab ${!isExplorer ? 'active' : ''}`} type="button" role="tab" aria-selected={!isExplorer} onClick={() => setAudience('creator')}>
            <Ionicons name="rocket-outline" size={17} /> Projemi büyütmek istiyorum
          </button>
        </div>

        <div className="khiw-audience" role="tabpanel">
          <p className="khiw-audience-intro">{isExplorer ? 'Yeni favorini üç adımda bul.' : 'Projenin hikâyesini üç adımda duyur.'}</p>
          <div className="khiw-steps">
            {STEPS[audience].map((step, index) => (
              <article className="khiw-step" key={step.title}>
                <div className="khiw-step-top">
                  <span className="khiw-step-icon"><Ionicons name={step.icon} size={21} /></span>
                  <span className="khiw-step-num">0{index + 1}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. KISTAS FARKI */}
      <section className="khiw-values">
        <div className="khiw-wrap">
          <div className="khiw-section-head">
            <p className="khiw-eyebrow">KISTAS FARKI</p>
            <h2 className="khiw-section-title">İyi fikirlerin önünü açan üç basit ilke.</h2>
          </div>
          <div className="khiw-value-grid">
            <article className="khiw-value"><span className="khiw-value-icon"><Ionicons name="heart-outline" size={20} /></span><h3>Gerçek destek</h3><p>Popüler sıralama, kullanıcıların verdiği kalıcı desteklere göre oluşur.</p></article>
            <article className="khiw-value"><span className="khiw-value-icon"><Ionicons name="sync-outline" size={20} /></span><h3>Eşit vitrin</h3><p>Sponsorlu projeler saatlik rotasyona girer; vitrin tek bir projeye kalmaz.</p></article>
            <article className="khiw-value"><span className="khiw-value-icon"><Ionicons name="chatbubbles-outline" size={20} /></span><h3>Doğrudan bağ</h3><p>Kullanıcı ve üretici aynı yerde buluşur; soru ve geri bildirim arada kaybolmaz.</p></article>
          </div>
        </div>
      </section>

      {/* 5. ÇAĞRI KUTUSU */}
      <section className="khiw-cta khiw-wrap">
        <div className="khiw-cta-box">
          <h2>Kıstas'ta yerini al.</h2>
          <p>Yeni bir ürün keşfet veya kendi projenin doğru insanlar tarafından fark edilmesini sağla.</p>
          <div className="khiw-actions">
            <button className="khiw-action khiw-action-primary" type="button" onClick={onExplore}><Ionicons name="compass-outline" size={17} /> Projeleri Keşfet</button>
            {onCreateProject ? <button className="khiw-action" type="button" onClick={onCreateProject}><Ionicons name="rocket-outline" size={17} /> Projeni Yayınla</button> : null}
          </div>
        </div>
      </section>

      <CinematicFooter compact onOpenAbout={onOpenAbout} onOpenPrivacy={onOpenPrivacy} onOpenFaq={onOpenFaq} onOpenBlog={onOpenBlog} />
    </main>
  );
};
