import React, { useEffect, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';
import { SplineSceneBasic } from '@/components/ui/splite';

export interface AboutScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onOpenPrivacy?: () => void;
  onOpenFaq?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
}

const STYLE_ID = 'kistas-about-screen-styles';
const STYLES = `
.kab-page{height:100%;overflow-x:hidden;overflow-y:auto;color:#25364E;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:radial-gradient(circle at 50% 7%,rgba(50,105,199,.12),transparent 34%),#F3F6FB}
.kab-page *{box-sizing:border-box}.kab-wrap{width:min(1180px,calc(100% - 40px));margin:0 auto}
.kab-top-bar{display:flex;align-items:center;padding:24px 0 8px}
.kab-back{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid rgba(50,105,199,.18);border-radius:12px;background:rgba(255,255,255,.72);color:#686474;font:700 12px/1 inherit;box-shadow:0 8px 24px rgba(37,54,78,.05);cursor:pointer;transition:transform .18s ease,border-color .18s ease}.kab-back:hover{transform:translateX(-2px);color:#25364E;border-color:rgba(50,105,199,.42)}

/* 3D Spline Scene Styles */
.kab-3d-showcase{width:100%;margin:12px auto 44px}
.k-card{width:100%;height:500px;min-height:500px;background-color:rgba(0,0,0,.96);position:relative;overflow:hidden;border-radius:24px;border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 60px -12px rgba(0,0,0,.7);box-sizing:border-box}
.k-card .flex{display:flex;width:100%;height:100%;align-items:stretch}
.k-card .flex-1{flex:1 1 0%;height:100%}
.k-card .relative{position:relative}
.k-card .w-full{width:100%}
.k-card .h-full{height:100%}
.k-card canvas{width:100%!important;height:100%!important;display:block;outline:none;touch-action:pan-y}

/* Spotlight */
.-top-40{top:-160px}.left-0{left:0px}
.h-\[169\%\]{height:169%}.w-\[138\%\]{width:138%}
.opacity-0{opacity:0}.pointer-events-none{pointer-events:none}
.absolute{position:absolute}.z-\[1\]{z-index:1}

@keyframes spotlight{0%{opacity:0;transform:translate(-72%,-62%) scale(0.5)}100%{opacity:1;transform:translate(-50%,-40%) scale(1)}}
.animate-spotlight{animation:spotlight 2s ease .75s 1 forwards}

.loader{width:44px;height:44px;border:3px solid rgba(255,255,255,.2);border-radius:50%;border-top-color:#3269C7;animation:kab-spin .9s linear infinite;display:inline-block}
@keyframes kab-spin{to{transform:rotate(360deg)}}

.kab-hero{display:flex;flex-direction:column;align-items:center;padding:12px 0 72px;text-align:center}
.kab-kicker{display:inline-flex;margin:0 0 16px;padding:8px 12px;border:1px solid rgba(50,105,199,.16);border-radius:999px;background:rgba(255,255,255,.72);color:#3269C7;font-size:10px;font-weight:700;letter-spacing:.16em}
.kab-title{max-width:920px;margin:0;font-size:clamp(54px,8vw,104px);line-height:.96;font-weight:750;letter-spacing:-.055em;color:#25364E;text-wrap:balance}.kab-title-accent{color:#3269C7}.kab-lead{max-width:760px;margin:16px auto 0;color:#5c6575;font-size:clamp(17px,2vw,21px);line-height:1.58;text-wrap:balance}.kab-actions{display:flex;justify-content:center;gap:12px;margin-top:30px}.kab-action{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:0 22px;border:1px solid rgba(50,105,199,.18);border-radius:14px;background:rgba(255,255,255,.8);color:#25364E;font:700 12px/1 inherit;text-decoration:none;box-shadow:0 10px 28px rgba(37,54,78,.06);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}.kab-action-primary{background:#25364E;color:#FAFBFD;border-color:#25364E;box-shadow:0 14px 30px rgba(37,54,78,.2)}.kab-action:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(37,54,78,.12)}
.kab-bridge{width:min(920px,100%);margin:48px auto 0;padding:28px;border:1px solid rgba(50,105,199,.18);border-radius:26px;background:rgba(255,255,255,.9);box-shadow:0 34px 90px -38px rgba(50,105,199,.5),inset 0 1px rgba(255,255,255,.9);text-align:left}.kab-bridge-head{text-align:center}.kab-bridge-kicker{margin:0;color:#3269C7;font-size:10px;font-weight:700;letter-spacing:.14em}.kab-bridge-title{margin:9px 0 0;font-size:25px;line-height:1.2;letter-spacing:-.03em}.kab-bridge-grid{display:grid;grid-template-columns:1fr 64px 1fr;align-items:stretch;gap:18px;margin-top:26px}.kab-path{padding:24px;border:1px solid rgba(50,105,199,.13);border-radius:20px;background:#F8FAFD}.kab-path-icon{display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(50,105,199,.16);border-radius:13px;background:#FFF;color:#3269C7;box-shadow:0 8px 18px rgba(50,105,199,.08)}.kab-path small{display:block;margin-top:20px;color:#3269C7;font-size:9px;font-weight:700;letter-spacing:.12em}.kab-path h3{margin:7px 0 0;font-size:21px}.kab-path p{margin:8px 0 0;color:#5F6877;font-size:12px;line-height:1.6}.kab-path-steps{display:flex;align-items:center;gap:7px;margin-top:20px;color:#25364E;font-size:11px;font-weight:700}.kab-path-steps i{width:4px;height:4px;border-radius:50%;background:#3269C7}.kab-bridge-mark{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#3269C7}.kab-bridge-mark span{display:grid;width:48px;height:48px;place-items:center;border-radius:50%;background:#3269C7;color:#FFF;box-shadow:0 12px 24px rgba(50,105,199,.24)}.kab-bridge-mark small{font-size:9px;font-weight:700;letter-spacing:.1em}
.kab-section{padding:110px 0}.kab-section-head{display:grid;grid-template-columns:minmax(240px,.75fr) 1.25fr;gap:72px;align-items:start}.kab-eyebrow{margin:0;color:#3269C7;font-size:10px;font-weight:700;letter-spacing:.16em}.kab-heading{margin:12px 0 0;color:#25364E;font-size:clamp(34px,5vw,62px);line-height:1.03;letter-spacing:0}.kab-copy{margin:0;color:#686474;font-size:17px;line-height:1.75}.kab-copy strong{color:#25364E}.kab-principles{margin-top:62px;border-top:1px solid rgba(50,105,199,.18)}.kab-principle{display:grid;grid-template-columns:54px 220px 1fr;gap:24px;align-items:center;padding:24px 0;border-bottom:1px solid rgba(50,105,199,.18)}.kab-number{color:#3269C7;font-size:11px;font-weight:700}.kab-principle h3{margin:0;font-size:18px}.kab-principle p{margin:0;color:#3269C7;font-size:13px;line-height:1.6}
.kab-flow-band{padding:96px 0;background:rgba(255,255,255,.62);border-block:1px solid rgba(50,105,199,.1)}.kab-flow-title{max-width:680px;margin:12px 0 0;font-size:clamp(34px,5vw,56px);line-height:1.05}.kab-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:42px}.kab-step{min-height:230px;padding:26px;border:1px solid rgba(50,105,199,.15);border-radius:20px;background:rgba(255,255,255,.8);box-shadow:0 14px 34px rgba(37,54,78,.05)}.kab-step-icon{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(50,105,199,.18);border-radius:13px;background:#F3F7FD;color:#3269C7}.kab-step small{display:block;margin-top:38px;color:#3269C7;font-size:9px;font-weight:700;letter-spacing:.12em}.kab-step h3{margin:8px 0;font-size:20px}.kab-step p{margin:0;color:#5f6877;font-size:12px;line-height:1.65}
.kab-final{padding:120px 0 90px;text-align:center}.kab-final h2{max-width:860px;margin:14px auto 0;font-size:clamp(40px,7vw,82px);line-height:.98}.kab-final p{max-width:600px;margin:22px auto 0;color:#686474;font-size:16px;line-height:1.65}.kab-final .kab-action{margin-top:28px}.kab-reveal{opacity:0;transform:translateY(20px);transition:opacity .7s ease,transform .7s ease}.kab-reveal.is-visible{opacity:1;transform:none}

@media(min-width:768px){.md\:left-60{left:240px}.md\:-top-20{top:-80px}.md\:text-5xl{font-size:3rem;line-height:1}}
@media(min-width:1024px){.lg\:w-\[84\%\]{width:84%}}
@media(max-width:767px){
  .k-card{height:auto;min-height:540px}
  .k-card .flex{flex-direction:column}
  .k-card .flex-1.relative{height:300px;min-height:300px;width:100%}
  .kab-top-bar{padding:16px 0 8px}
  .kab-3d-showcase{margin:8px auto 32px}
  .k-3d-title{font-size:clamp(30px,7.5vw,42px)!important;letter-spacing:-0.005em!important;line-height:1.24!important}
  .k-3d-title-accent{margin-top:12px!important;letter-spacing:-0.005em!important}
  .kab-wrap{width:min(100% - 32px,1180px)}.kab-hero{padding:16px 0 56px}
  .kab-lead{margin-top:14px;font-size:16px}.kab-actions{width:100%;flex-direction:column}.kab-action{width:100%}.kab-bridge{margin-top:36px;padding:20px;border-radius:20px}.kab-bridge-title{font-size:22px}.kab-bridge-grid{grid-template-columns:1fr;gap:10px}.kab-bridge-mark{flex-direction:row;padding:2px 0}.kab-bridge-mark span{width:38px;height:38px}.kab-path{padding:20px}.kab-section{padding:76px 0}.kab-section-head{grid-template-columns:1fr;gap:28px}.kab-heading{font-size:38px}.kab-copy{font-size:15px}.kab-principle{grid-template-columns:38px 1fr;gap:12px}.kab-principle p{grid-column:2}.kab-flow-band{padding:72px 0}.kab-flow{grid-template-columns:1fr}.kab-step{min-height:190px}.kab-step small{margin-top:28px}.kab-final{padding:90px 0 68px}.kab-final h2{font-size:46px}
}
@media(prefers-reduced-motion:reduce){.kab-reveal{opacity:1;transform:none;transition:none}.kab-action{transition:none}}
`;

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack, onExplore, onOpenPrivacy, onOpenFaq, onOpenHowItWorks, onOpenBlog }) => {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const style = document.getElementById(STYLE_ID) ?? document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    if (!style.parentNode) document.head.appendChild(style);

    const nodes = rootRef.current?.querySelectorAll('.kab-reveal') ?? [];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <main ref={rootRef} className="kab-page" aria-label="Kıstas Hakkımızda">
      {/* 1. ÜST NAVİGASYON */}
      <div className="kab-wrap kab-top-bar">
        <button className="kab-back" type="button" onClick={onBack}>
          <Ionicons name="arrow-back" size={16} /> Geri dön
        </button>
      </div>

      {/* 2. 3D İNTERAKTİF AÇILIŞ VİTRİNİ (HERO) */}
      <section className="kab-3d-showcase kab-wrap" aria-label="3D Etkileşimli Vitrin">
        <SplineSceneBasic
          title="Yeni fikirleri keşfet."
          accentTitle="Sevdiğini destekle."
        />
      </section>

      {/* 3. KISTAS NEDİR & DETAYLAR */}
      <section className="kab-hero kab-wrap">
        <p className="kab-kicker">KISTAS NEDİR?</p>
        <p className="kab-lead">
          Kıstas, yeni dijital ürünleri bulmanın en kolay yoludur. Kullanıcılar yeni favorilerini keşfeder, üreticiler doğru insanlara ulaşır.
        </p>
        <div className="kab-actions">
          <button className="kab-action kab-action-primary" type="button" onClick={onExplore}>
            Projeleri Keşfet <Ionicons name="arrow-forward" size={16} />
          </button>
          <a
            className="kab-action"
            href="#nasil-calisir"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('nasil-calisir')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Nasıl işler?
          </a>
        </div>


        <div className="kab-bridge" aria-label="Kıstas kullanıcı ve proje sahibi akışı">
          <div className="kab-bridge-head">
            <p className="kab-bridge-kicker">KISTAS KİMİN İÇİN?</p>
            <h2 className="kab-bridge-title">İki ihtiyacı tek yerde buluşturur.</h2>
          </div>
          <div className="kab-bridge-grid">
            <article className="kab-path">
              <span className="kab-path-icon"><Ionicons name="compass-outline" size={20} /></span>
              <small>YENİ BİR ÜRÜN ARIYORSAN</small>
              <h3>Sana uygun projeyi bul.</h3>
              <p>Yeni uygulamaları ve dijital ürünleri incele; beğendiğine destek ver.</p>
              <div className="kab-path-steps"><span>Keşfet</span><i /><span>İncele</span><i /><span>Destekle</span></div>
            </article>
            <div className="kab-bridge-mark" aria-hidden="true"><span><Ionicons name="swap-horizontal" size={20} /></span><small>KISTAS</small></div>
            <article className="kab-path">
              <span className="kab-path-icon"><Ionicons name="rocket-outline" size={20} /></span>
              <small>BİR PROJEN VARSA</small>
              <h3>Doğru insanlara ulaş.</h3>
              <p>Projeni yayınla; gerçek ilgi, destek ve geri bildirimle büyüt.</p>
              <div className="kab-path-steps"><span>Yayınla</span><i /><span>Ulaş</span><i /><span>Büyüt</span></div>
            </article>
          </div>
        </div>
      </section>

      <section className="kab-section kab-wrap kab-reveal">
        <div className="kab-section-head">
          <div><p className="kab-eyebrow">NEDEN KISTAS?</p><h2 className="kab-heading">Yeni ürün bulmak da, ürününü duyurmak da kolay olsun.</h2></div>
          <p className="kab-copy">
            İnternette iyi bir ürünü bulmak zor, yeni bir ürünü duyurmak daha da zor. Kıstas ikisini tek yerde buluşturur. <strong>Üreticiler projelerini anlatır, kullanıcılar keşfeder ve beğendiğine destek verir.</strong> Bu kadar basit.
          </p>
        </div>
        <div className="kab-principles">
          <div className="kab-principle"><span className="kab-number">01</span><h3>Aradığını kolay bul</h3><p>Kategori, arama ve filtrelerle ilgini çeken projeye hızlıca ulaş.</p></div>
          <div className="kab-principle"><span className="kab-number">02</span><h3>Beğendiğini destekle</h3><p>Verdiğin destek kalıcıdır; projenin topluluk tarafından fark edilmesine yardım eder.</p></div>
          <div className="kab-principle"><span className="kab-number">03</span><h3>Doğru insanlara ulaş</h3><p>Projen, onu gerçekten merak eden kullanıcılarla aynı vitrinde buluşur.</p></div>
        </div>
      </section>

      <section id="nasil-calisir" className="kab-flow-band">
        <div className="kab-wrap kab-reveal">
          <p className="kab-eyebrow">NASIL İŞLER?</p>
          <h2 className="kab-flow-title">Üç basit adımda keşfet, destekle ve büyümeye ortak ol.</h2>
          <div className="kab-flow">
            <article className="kab-step"><span className="kab-step-icon"><Ionicons name="compass-outline" size={19} /></span><small>01 · KEŞFET</small><h3>Yeni projelere göz at</h3><p>Kategorileri gez, yeni çıkanları incele ve ilgini çeken projeyi aç.</p></article>
            <article className="kab-step"><span className="kab-step-icon"><Ionicons name="heart-outline" size={19} /></span><small>02 · DESTEKLE</small><h3>Beğendiğine ses ver</h3><p>Tek dokunuşla destek ol. Desteğin kalıcı olsun ve iyi fikri öne taşısın.</p></article>
            <article className="kab-step"><span className="kab-step-icon"><Ionicons name="trending-up-outline" size={19} /></span><small>03 · BÜYÜT</small><h3>Gelişime ortak ol</h3><p>Geri bildiriminle üreticiye yol göster, projenin büyümesine katkı sağla.</p></article>
          </div>
        </div>
      </section>

      <section className="kab-final kab-wrap kab-reveal">
        <p className="kab-eyebrow">ŞİMDİ KEŞFET</p>
        <h2>Yeni favorin bir tık uzağında.</h2>
        <p>Projeleri incele, beğendiğine destek ver ve iyi fikirlerin büyümesine ortak ol.</p>
        <button className="kab-action kab-action-primary" type="button" onClick={onExplore}>Projeleri Keşfet <Ionicons name="arrow-forward" size={16} /></button>
      </section>

      <CinematicFooter compact onOpenHowItWorks={onOpenHowItWorks} onOpenPrivacy={onOpenPrivacy} onOpenFaq={onOpenFaq} onOpenBlog={onOpenBlog} />
    </main>
  );
};
