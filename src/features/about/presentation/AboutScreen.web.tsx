import React, { useEffect, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KistasLogo } from '../../../shared/components/KistasLogo';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';

export interface AboutScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
}

const STYLE_ID = 'kistas-about-screen-styles';
const STYLES = `
.kab-page{height:100%;overflow-x:hidden;overflow-y:auto;color:#25364E;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:radial-gradient(circle at 50% 7%,rgba(50,105,199,.12),transparent 34%),#F3F6FB;scroll-behavior:smooth}
.kab-page *{box-sizing:border-box}.kab-wrap{width:min(1180px,calc(100% - 40px));margin:0 auto}.kab-hero{display:flex;flex-direction:column;align-items:center;padding:38px 0 72px;text-align:center}.kab-back{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid rgba(50,105,199,.18);border-radius:12px;background:rgba(255,255,255,.72);color:#686474;font:700 12px/1 inherit;box-shadow:0 8px 24px rgba(37,54,78,.05);cursor:pointer}.kab-back:hover{color:#25364E;border-color:rgba(50,105,199,.42)}
.kab-kicker{display:inline-flex;margin:50px 0 16px;padding:8px 12px;border:1px solid rgba(50,105,199,.16);border-radius:999px;background:rgba(255,255,255,.72);color:#3269C7;font-size:10px;font-weight:700;letter-spacing:.16em}.kab-title{max-width:920px;margin:0;font-size:clamp(54px,8vw,104px);line-height:.96;font-weight:750;letter-spacing:-.055em;color:#25364E;text-wrap:balance}.kab-title-accent{color:#3269C7}.kab-lead{max-width:760px;margin:22px auto 0;color:#5c6575;font-size:clamp(17px,2vw,21px);line-height:1.58;text-wrap:balance}.kab-actions{display:flex;justify-content:center;gap:12px;margin-top:30px}.kab-action{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:0 22px;border:1px solid rgba(50,105,199,.18);border-radius:14px;background:rgba(255,255,255,.8);color:#25364E;font:700 12px/1 inherit;text-decoration:none;box-shadow:0 10px 28px rgba(37,54,78,.06);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}.kab-action-primary{background:#25364E;color:#FAFBFD;border-color:#25364E;box-shadow:0 14px 30px rgba(37,54,78,.2)}.kab-action:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(37,54,78,.12)}
.kab-product{width:min(920px,100%);margin:48px auto 0;border:1px solid rgba(50,105,199,.18);border-radius:26px;overflow:hidden;background:rgba(255,255,255,.9);box-shadow:0 34px 90px -38px rgba(50,105,199,.5),inset 0 1px rgba(255,255,255,.9);text-align:left}.kab-product-bar{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;border-bottom:1px solid rgba(50,105,199,.12);color:#5f6877;font-size:10px;font-weight:750;letter-spacing:.05em}.kab-status{display:flex;align-items:center;gap:8px}.kab-status-dot{width:8px;height:8px;border-radius:50%;background:#3269C7;box-shadow:0 0 0 5px rgba(50,105,199,.1)}.kab-product-body{display:grid;grid-template-columns:1fr 255px;min-height:262px}.kab-feed{padding:22px 24px}.kab-search{display:flex;align-items:center;gap:10px;height:48px;padding:0 15px;border:1px solid rgba(50,105,199,.14);border-radius:14px;background:#F7F9FC;color:#737b88;font-size:12px}.kab-projects{margin-top:12px}.kab-project{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:12px;min-height:59px;border-bottom:1px solid rgba(50,105,199,.1)}.kab-project-icon{display:grid;place-items:center;width:36px;height:36px;border:1px solid rgba(50,105,199,.16);border-radius:12px;background:linear-gradient(145deg,#FFFFFF,#EAF1FB);color:#3269C7;box-shadow:0 6px 14px rgba(50,105,199,.08)}.kab-project-name{font-size:12px;font-weight:750}.kab-project-meta{display:block;margin-top:3px;color:#7b8492;font-size:9px}.kab-score{color:#3269C7;font-size:11px;font-weight:750}.kab-panel{display:flex;flex-direction:column;justify-content:center;padding:28px;border-left:1px solid rgba(50,105,199,.11);background:linear-gradient(155deg,rgba(50,105,199,.04),rgba(50,105,199,.11))}.kab-panel-label{color:#3269C7;font-size:9px;font-weight:700;letter-spacing:.14em}.kab-panel-value{max-width:180px;margin-top:10px;font-size:36px;line-height:1.03;font-weight:750;letter-spacing:-.04em}.kab-panel-copy{margin-top:12px;color:#5f6877;font-size:11px;line-height:1.55}.kab-meter{display:flex;align-items:flex-end;gap:5px;height:38px;margin-top:18px}.kab-meter span{flex:1;border-radius:3px 3px 0 0;background:#6F9BDD}.kab-meter span:nth-child(1){height:34%}.kab-meter span:nth-child(2){height:58%}.kab-meter span:nth-child(3){height:46%}.kab-meter span:nth-child(4){height:82%}.kab-meter span:nth-child(5){height:68%}.kab-meter span:nth-child(6){height:100%;background:#3269C7}
.kab-proof{padding:0 0 36px}.kab-proof-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.kab-stat{min-height:150px;padding:26px;border:1px solid rgba(50,105,199,.14);border-radius:20px;background:rgba(255,255,255,.72);box-shadow:0 16px 38px rgba(37,54,78,.06)}.kab-stat strong{display:block;color:#25364E;font-size:27px}.kab-stat span{display:block;margin-top:9px;color:#5f6877;font-size:12px;line-height:1.55}
.kab-section{padding:110px 0}.kab-section-head{display:grid;grid-template-columns:minmax(240px,.75fr) 1.25fr;gap:72px;align-items:start}.kab-eyebrow{margin:0;color:#3269C7;font-size:10px;font-weight:700;letter-spacing:.16em}.kab-heading{margin:12px 0 0;color:#25364E;font-size:clamp(34px,5vw,62px);line-height:1.03;letter-spacing:0}.kab-copy{margin:0;color:#686474;font-size:17px;line-height:1.75}.kab-copy strong{color:#25364E}.kab-principles{margin-top:62px;border-top:1px solid rgba(50,105,199,.18)}.kab-principle{display:grid;grid-template-columns:54px 220px 1fr;gap:24px;align-items:center;padding:24px 0;border-bottom:1px solid rgba(50,105,199,.18)}.kab-number{color:#3269C7;font-size:11px;font-weight:700}.kab-principle h3{margin:0;font-size:18px}.kab-principle p{margin:0;color:#3269C7;font-size:13px;line-height:1.6}
.kab-flow-band{padding:96px 0;background:rgba(255,255,255,.62);border-block:1px solid rgba(50,105,199,.1)}.kab-flow-title{max-width:680px;margin:12px 0 0;font-size:clamp(34px,5vw,56px);line-height:1.05}.kab-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:42px}.kab-step{min-height:230px;padding:26px;border:1px solid rgba(50,105,199,.15);border-radius:20px;background:rgba(255,255,255,.8);box-shadow:0 14px 34px rgba(37,54,78,.05)}.kab-step-icon{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(50,105,199,.18);border-radius:13px;background:#F3F7FD;color:#3269C7}.kab-step small{display:block;margin-top:38px;color:#3269C7;font-size:9px;font-weight:700;letter-spacing:.12em}.kab-step h3{margin:8px 0;font-size:20px}.kab-step p{margin:0;color:#5f6877;font-size:12px;line-height:1.65}
.kab-final{padding:120px 0 90px;text-align:center}.kab-final h2{max-width:860px;margin:14px auto 0;font-size:clamp(40px,7vw,82px);line-height:.98}.kab-final p{max-width:600px;margin:22px auto 0;color:#686474;font-size:16px;line-height:1.65}.kab-final .kab-action{margin-top:28px}.kab-reveal{opacity:0;transform:translateY(20px);transition:opacity .7s ease,transform .7s ease}.kab-reveal.is-visible{opacity:1;transform:none}
@media(max-width:767px){.kab-wrap{width:min(100% - 32px,1180px)}.kab-hero{padding:22px 0 56px}.kab-back{margin-top:8px}.kab-kicker{margin-top:48px}.kab-title{font-size:48px;line-height:1;letter-spacing:-.045em}.kab-lead{margin-top:18px;font-size:16px}.kab-actions{width:100%;flex-direction:column}.kab-action{width:100%}.kab-product{margin-top:36px;border-radius:20px}.kab-product-bar{height:54px;padding:0 16px}.kab-product-body{display:block}.kab-feed{padding:15px}.kab-project{grid-template-columns:38px minmax(0,1fr) auto}.kab-panel{display:none}.kab-proof-grid{grid-template-columns:1fr;gap:10px}.kab-stat{min-height:auto;padding:22px;border-radius:16px}.kab-section{padding:76px 0}.kab-section-head{grid-template-columns:1fr;gap:28px}.kab-heading{font-size:38px}.kab-copy{font-size:15px}.kab-principle{grid-template-columns:38px 1fr;gap:12px}.kab-principle p{grid-column:2}.kab-flow-band{padding:72px 0}.kab-flow{grid-template-columns:1fr}.kab-step{min-height:190px}.kab-step small{margin-top:28px}.kab-final{padding:90px 0 68px}.kab-final h2{font-size:46px}}
@media(prefers-reduced-motion:reduce){.kab-page{scroll-behavior:auto}.kab-reveal{opacity:1;transform:none;transition:none}.kab-action{transition:none}}
`;

const PROJECTS = [
  { icon: 'sparkles-outline' as const, name: 'Odak AI', meta: 'Yapay Zeka · Web', score: '248' },
  { icon: 'game-controller-outline' as const, name: 'Pixel Quest', meta: 'Mobil Oyun · iOS', score: '191' },
  { icon: 'checkmark-done-outline' as const, name: 'TaskFlow', meta: 'Verimlilik · SaaS', score: '164' },
];

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack, onExplore, onOpenPrivacy, onOpenSupport, onOpenHowItWorks, onOpenBlog }) => {
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
    <main ref={rootRef} className="kab-page">
      <section className="kab-hero kab-wrap">
        <button className="kab-back" type="button" onClick={onBack}>
          <Ionicons name="arrow-back" size={16} /> Geri dön
        </button>
        <p className="kab-kicker">KISTAS NEDİR?</p>
        <h1 className="kab-title">Yeni fikirleri keşfet.<br /><span className="kab-title-accent">Sevdiğini destekle.</span></h1>
        <p className="kab-lead">
          Kıstas, yeni dijital ürünleri bulmanın en kolay yoludur. Kullanıcılar yeni favorilerini keşfeder, üreticiler doğru insanlara ulaşır.
        </p>
        <div className="kab-actions">
          <button className="kab-action kab-action-primary" type="button" onClick={onExplore}>
            Projeleri Keşfet <Ionicons name="arrow-forward" size={16} />
          </button>
          <a className="kab-action" href="#nasil-calisir">Nasıl işler?</a>
        </div>

        <div className="kab-product" aria-label="Kıstas proje vitrini önizlemesi">
          <div className="kab-product-bar">
            <KistasLogo size={24} />
            <span className="kab-status"><span className="kab-status-dot" /> YENİ PROJELER</span>
          </div>
          <div className="kab-product-body">
            <div className="kab-feed">
              <div className="kab-search"><Ionicons name="search-outline" size={16} /> Uygulama, proje veya geliştirici ara</div>
              <div className="kab-projects">
                {PROJECTS.map((project) => (
                  <div className="kab-project" key={project.name}>
                    <span className="kab-project-icon"><Ionicons name={project.icon} size={17} /></span>
                    <span><span className="kab-project-name">{project.name}</span><span className="kab-project-meta">{project.meta}</span></span>
                    <span className="kab-score">▲ {project.score}</span>
                  </div>
                ))}
              </div>
            </div>
            <aside className="kab-panel">
              <span className="kab-panel-label">TOPLULUK DESTEĞİ</span>
              <strong className="kab-panel-value">Gerçek ilgi</strong>
              <span className="kab-panel-copy">İnsanlar beğendiği projelere destek verir. İyi fikirler daha çok kişiye ulaşır.</span>
              <div className="kab-meter" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div>
            </aside>
          </div>
        </div>
      </section>

      <section className="kab-proof">
        <div className="kab-wrap kab-proof-grid">
          <div className="kab-stat"><strong>Keşfet</strong><span>Yeni uygulamaları, oyunları ve dijital ürünleri kolayca bul.</span></div>
          <div className="kab-stat"><strong>Destekle</strong><span>Beğendiğin projeye tek dokunuşla kalıcı desteğini ver.</span></div>
          <div className="kab-stat"><strong>Büyüt</strong><span>Her destek, iyi bir fikrin daha fazla kişiye ulaşmasına yardım eder.</span></div>
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

      <CinematicFooter compact onOpenHowItWorks={onOpenHowItWorks} onOpenPrivacy={onOpenPrivacy} onOpenSupport={onOpenSupport} onOpenBlog={onOpenBlog} />
    </main>
  );
};
