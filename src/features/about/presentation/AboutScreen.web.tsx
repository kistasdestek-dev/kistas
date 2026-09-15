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
.kab-page{height:100%;overflow-x:hidden;overflow-y:auto;color:#25364E;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#F1F5FA;scroll-behavior:smooth}
.kab-page *{box-sizing:border-box}.kab-wrap{width:min(1180px,calc(100% - 40px));margin:0 auto}.kab-hero{min-height:min(720px,78vh);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0 36px;text-align:center}.kab-back{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:0 12px;border:1px solid rgba(50,105,199,.2);border-radius:8px;background:rgba(250,251,253,.45);color:#686474;font:700 12px/1 inherit;cursor:pointer}.kab-back:hover{color:#25364E;border-color:rgba(50,105,199,.42)}
.kab-kicker{margin:38px 0 12px;color:#3269C7;font-size:10px;font-weight:700;letter-spacing:.18em}.kab-title{margin:0;font-size:clamp(62px,9vw,126px);line-height:.86;font-weight:700;letter-spacing:0;color:#25364E;text-shadow:0 18px 52px rgba(50,105,199,.16)}.kab-lead{max-width:720px;margin:14px auto 0;color:#5c576b;font-size:clamp(17px,2vw,22px);line-height:1.55}.kab-actions{display:flex;justify-content:center;gap:10px;margin-top:28px}.kab-action{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 18px;border:1px solid rgba(50,105,199,.22);border-radius:8px;background:rgba(250,251,253,.68);color:#25364E;font:700 12px/1 inherit;text-decoration:none;cursor:pointer}.kab-action-primary{background:#25364E;color:#FAFBFD;border-color:#25364E}.kab-action:hover{transform:translateY(-1px)}
.kab-product{width:min(900px,100%);margin:42px auto 0;border:1px solid rgba(50,105,199,.24);border-radius:8px;overflow:hidden;background:rgba(250,251,253,.88);box-shadow:0 34px 90px -42px rgba(50,105,199,.5),inset 0 1px rgba(37,35,51,.08);text-align:left}.kab-product-bar{height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid rgba(50,105,199,.14);color:#686474;font-size:10px;font-weight:750}.kab-live{display:flex;align-items:center;gap:7px}.kab-live-dot{width:7px;height:7px;border-radius:50%;background:#187657;box-shadow:0 0 10px rgba(24,118,87,.72)}.kab-product-body{display:grid;grid-template-columns:1fr 240px;min-height:236px}.kab-feed{padding:20px 22px}.kab-search{display:flex;align-items:center;gap:9px;height:42px;padding:0 13px;border:1px solid rgba(50,105,199,.16);border-radius:8px;background:#F8F9FB;color:#777181;font-size:12px}.kab-projects{margin-top:14px;border-top:1px solid rgba(50,105,199,.11)}.kab-project{display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:11px;min-height:54px;border-bottom:1px solid rgba(50,105,199,.11)}.kab-project-icon{display:grid;place-items:center;width:32px;height:32px;border:1px solid rgba(50,105,199,.18);border-radius:8px;background:rgba(50,105,199,.08);color:#3269C7}.kab-project-name{font-size:12px;font-weight:700}.kab-project-meta{margin-top:3px;color:#777181;font-size:9px}.kab-score{color:#3269C7;font-size:11px;font-weight:700}.kab-panel{display:flex;flex-direction:column;justify-content:center;padding:22px;border-left:1px solid rgba(50,105,199,.13);background:rgba(50,105,199,.035)}.kab-panel-label{color:#3269C7;font-size:9px;font-weight:700;letter-spacing:.14em}.kab-panel-value{margin-top:8px;font-size:48px;line-height:1;font-weight:700}.kab-panel-copy{margin-top:9px;color:#686474;font-size:11px;line-height:1.5}.kab-meter{display:flex;align-items:flex-end;gap:5px;height:38px;margin-top:16px}.kab-meter span{flex:1;border-radius:2px 2px 0 0;background:#3269C7}.kab-meter span:nth-child(1){height:34%}.kab-meter span:nth-child(2){height:58%}.kab-meter span:nth-child(3){height:46%}.kab-meter span:nth-child(4){height:82%}.kab-meter span:nth-child(5){height:68%}.kab-meter span:nth-child(6){height:100%;background:#3269C7}
.kab-proof{border-block:1px solid rgba(50,105,199,.14);background:rgba(250,251,253,.54)}.kab-proof-grid{display:grid;grid-template-columns:repeat(3,1fr)}.kab-stat{padding:30px 26px;border-right:1px solid rgba(50,105,199,.12)}.kab-stat:last-child{border-right:0}.kab-stat strong{display:block;color:#25364E;font-size:28px}.kab-stat span{display:block;margin-top:5px;color:#3269C7;font-size:11px;line-height:1.45}
.kab-section{padding:110px 0}.kab-section-head{display:grid;grid-template-columns:minmax(240px,.75fr) 1.25fr;gap:72px;align-items:start}.kab-eyebrow{margin:0;color:#3269C7;font-size:10px;font-weight:700;letter-spacing:.16em}.kab-heading{margin:12px 0 0;color:#25364E;font-size:clamp(34px,5vw,62px);line-height:1.03;letter-spacing:0}.kab-copy{margin:0;color:#686474;font-size:17px;line-height:1.75}.kab-copy strong{color:#25364E}.kab-principles{margin-top:62px;border-top:1px solid rgba(50,105,199,.18)}.kab-principle{display:grid;grid-template-columns:54px 220px 1fr;gap:24px;align-items:center;padding:24px 0;border-bottom:1px solid rgba(50,105,199,.18)}.kab-number{color:#3269C7;font-size:11px;font-weight:700}.kab-principle h3{margin:0;font-size:18px}.kab-principle p{margin:0;color:#3269C7;font-size:13px;line-height:1.6}
.kab-flow-band{padding:96px 0;background:rgba(250,251,253,.72);border-block:1px solid rgba(50,105,199,.12)}.kab-flow-title{max-width:680px;margin:12px 0 0;font-size:clamp(34px,5vw,56px);line-height:1.05}.kab-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:42px}.kab-step{min-height:230px;padding:24px;border:1px solid rgba(50,105,199,.18);border-radius:8px;background:rgba(250,251,253,.68)}.kab-step-icon{display:grid;place-items:center;width:38px;height:38px;border:1px solid rgba(50,105,199,.22);border-radius:8px;color:#3269C7}.kab-step small{display:block;margin-top:38px;color:#3269C7;font-size:9px;font-weight:700;letter-spacing:.12em}.kab-step h3{margin:8px 0;font-size:20px}.kab-step p{margin:0;color:#3269C7;font-size:12px;line-height:1.6}
.kab-final{padding:120px 0 90px;text-align:center}.kab-final h2{max-width:860px;margin:14px auto 0;font-size:clamp(40px,7vw,82px);line-height:.98}.kab-final p{max-width:600px;margin:22px auto 0;color:#686474;font-size:16px;line-height:1.65}.kab-final .kab-action{margin-top:28px}.kab-reveal{opacity:0;transform:translateY(20px);transition:opacity .7s ease,transform .7s ease}.kab-reveal.is-visible{opacity:1;transform:none}
@media(max-width:767px){.kab-wrap{width:min(100% - 32px,1180px)}.kab-hero{min-height:700px;padding-top:24px;justify-content:flex-start}.kab-back{margin-top:8px}.kab-kicker{margin-top:54px}.kab-title{font-size:68px}.kab-lead{font-size:17px}.kab-actions{width:100%;flex-direction:column}.kab-action{width:100%}.kab-product{margin-top:34px}.kab-product-body{display:block}.kab-feed{padding:15px}.kab-project{grid-template-columns:34px minmax(0,1fr) auto}.kab-panel{display:none}.kab-proof-grid{grid-template-columns:1fr}.kab-stat{padding:22px 0;border-right:0;border-bottom:1px solid rgba(50,105,199,.12)}.kab-stat:last-child{border-bottom:0}.kab-section{padding:76px 0}.kab-section-head{grid-template-columns:1fr;gap:28px}.kab-heading{font-size:38px}.kab-copy{font-size:15px}.kab-principle{grid-template-columns:38px 1fr;gap:12px}.kab-principle p{grid-column:2}.kab-flow-band{padding:72px 0}.kab-flow{grid-template-columns:1fr}.kab-step{min-height:190px}.kab-step small{margin-top:28px}.kab-final{padding:90px 0 68px}.kab-final h2{font-size:46px}}
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
        <p className="kab-kicker">HAKKIMIZDA</p>
        <h1 className="kab-title">Kıstas</h1>
        <p className="kab-lead">
          Bağımsız dijital ürünleri, onları gerçekten merak eden insanlarla buluşturan adil keşif vitrini.
        </p>
        <div className="kab-actions">
          <button className="kab-action kab-action-primary" type="button" onClick={onExplore}>
            Keşfet <Ionicons name="arrow-forward" size={16} />
          </button>
          <a className="kab-action" href="#nasil-calisir">Nasıl çalışır?</a>
        </div>

        <div className="kab-product" aria-label="Kıstas keşif vitrini önizlemesi">
          <div className="kab-product-bar">
            <KistasLogo size={24} />
            <span className="kab-live"><span className="kab-live-dot" /> CANLI KEŞİF</span>
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
              <span className="kab-panel-label">TOPLULUK SİNYALİ</span>
              <strong className="kab-panel-value">82%</strong>
              <span className="kab-panel-copy">Görünürlüğü reklam bütçesi değil, gerçek ilgi şekillendirir.</span>
              <div className="kab-meter" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div>
            </aside>
          </div>
        </div>
      </section>

      <section className="kab-proof">
        <div className="kab-wrap kab-proof-grid">
          <div className="kab-stat"><strong>Adil</strong><span>Her proje görünür olmak için gerçek bir fırsat bulur.</span></div>
          <div className="kab-stat"><strong>Bağımsız</strong><span>Üretici ile meraklı topluluk arasında doğrudan bağ kurulur.</span></div>
          <div className="kab-stat"><strong>Topluluk odaklı</strong><span>Değerli fikirleri insanların desteği öne taşır.</span></div>
        </div>
      </section>

      <section className="kab-section kab-wrap kab-reveal">
        <div className="kab-section-head">
          <div><p className="kab-eyebrow">NEDEN KISTAS?</p><h2 className="kab-heading">İyi ürün ile doğru topluluk arasındaki mesafeyi kısaltıyoruz.</h2></div>
          <p className="kab-copy">
            Büyük bütçelerin değil, <strong>iyi fikirlerin konuşulduğu</strong> bir alan tasarlıyoruz. Kıstas; uygulamaları, araçları ve dijital ürünleri tek bir vitrinde toplar. Üreticiler hikâyelerini anlatır, topluluk keşfeder ve gerçekten değer verdiği projeleri destekler.
          </p>
        </div>
        <div className="kab-principles">
          <div className="kab-principle"><span className="kab-number">01</span><h3>Görünürlükte denge</h3><p>Sponsorlu vitrin eşit zamanlı rotasyonla çalışır; tek bir proje ekranı ele geçirmez.</p></div>
          <div className="kab-principle"><span className="kab-number">02</span><h3>Gerçek keşif</h3><p>Kategoriler, platformlar ve topluluk sinyalleri doğru ürünü bulmayı hızlandırır.</p></div>
          <div className="kab-principle"><span className="kab-number">03</span><h3>Doğrudan bağ</h3><p>Kullanıcılar üreticiyle buluşur; geri bildirim, destek ve gelişim aynı yerde başlar.</p></div>
        </div>
      </section>

      <section id="nasil-calisir" className="kab-flow-band">
        <div className="kab-wrap kab-reveal">
          <p className="kab-eyebrow">KISTAS DÖNGÜSÜ</p>
          <h2 className="kab-flow-title">Bir fikir yayınlanır, keşfedilir ve toplulukla büyür.</h2>
          <div className="kab-flow">
            <article className="kab-step"><span className="kab-step-icon"><Ionicons name="rocket-outline" size={19} /></span><small>01 · YAYINLA</small><h3>Hikâyeni anlat</h3><p>Ürününü net bir anlatım, görseller ve doğru kategoriyle vitrine çıkar.</p></article>
            <article className="kab-step"><span className="kab-step-icon"><Ionicons name="compass-outline" size={19} /></span><small>02 · KEŞFEDİL</small><h3>Doğru kişilere ulaş</h3><p>Arama, filtreler ve adil vitrin yapısı projenin görünürlük kazanmasını sağlar.</p></article>
            <article className="kab-step"><span className="kab-step-icon"><Ionicons name="people-outline" size={19} /></span><small>03 · BÜYÜ</small><h3>Toplulukla geliş</h3><p>Destekleri ve geri bildirimleri ürününün bir sonraki adımına dönüştür.</p></article>
          </div>
        </div>
      </section>

      <section className="kab-final kab-wrap kab-reveal">
        <p className="kab-eyebrow">KEŞFETMEYE BAŞLA</p>
        <h2>Bir sonraki iyi fikir zaten burada olabilir.</h2>
        <p>Kıstas vitrininin içinde dolaş, bağımsız üreticileri keşfet ve değer verdiğin projelere ses ver.</p>
        <button className="kab-action kab-action-primary" type="button" onClick={onExplore}>Kıstas’a dön <Ionicons name="arrow-forward" size={16} /></button>
      </section>

      <CinematicFooter compact onOpenHowItWorks={onOpenHowItWorks} onOpenPrivacy={onOpenPrivacy} onOpenSupport={onOpenSupport} onOpenBlog={onOpenBlog} />
    </main>
  );
};
