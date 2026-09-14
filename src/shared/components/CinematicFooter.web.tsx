import React, { useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

export interface CinematicFooterProps {
  compact?: boolean;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenSupport?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
}

const STYLE_ID = 'kistas-cinematic-footer-styles';
const STYLES = `
.kcf{--kcf-cyan:#3269C7;--kcf-ink:#252333;--kcf-muted:#686474;position:relative;isolation:isolate;width:100%;min-height:min(660px,78vh);margin-top:64px;overflow:hidden;background:rgba(255,255,255,.95);border-top:1px solid rgba(50,105,199,.22);color:var(--kcf-ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.kcf *{box-sizing:border-box}
.kcf-grid{position:absolute;inset:0;pointer-events:none;opacity:.38;background-size:60px 60px;background-image:linear-gradient(to right,rgba(50,105,199,.07) 1px,transparent 1px),linear-gradient(to bottom,rgba(50,105,199,.07) 1px,transparent 1px);mask-image:linear-gradient(to bottom,transparent,#ffffff 28%,#ffffff 72%,transparent)}
.kcf-aurora{position:absolute;left:50%;top:52%;width:min(920px,82vw);height:520px;pointer-events:none;transform:translate(-50%,-50%) scale(0.9);background:radial-gradient(circle,rgba(50,105,199,.18),rgba(233,226,245,.13) 38%,transparent 70%);filter:blur(70px);opacity:0.25;transition:opacity 1.2s ease,transform 1.2s cubic-bezier(0.16,1,0.3,1)}
.kcf-revealed .kcf-aurora{opacity:1;transform:translate(-50%,-50%) scale(1)}
.kcf-giant{position:absolute;left:50%;bottom:-4%;pointer-events:none;transform:translateX(-50%) translateY(32px);font-size:clamp(100px,18vw,300px);line-height:.72;font-weight:900;letter-spacing:0;white-space:nowrap;color:transparent;-webkit-text-stroke:1px rgba(37,35,51,.08);background:linear-gradient(180deg,rgba(37,35,51,.11),transparent 68%);background-clip:text;-webkit-background-clip:text;user-select:none;opacity:0.1;transition:opacity 1.1s cubic-bezier(0.16,1,0.3,1),transform 1.1s cubic-bezier(0.16,1,0.3,1)}
.kcf-revealed .kcf-giant{opacity:1;transform:translateX(-50%) translateY(0)}
.kcf-center{position:relative;z-index:2;min-height:min(580px,70vh);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:76px 24px 92px;text-align:center}

/* Metin ve Eleman Hafif Giriş Efektleri */
.kcf-title{max-width:900px;margin:0 0 36px;font-size:clamp(40px,6.5vw,88px);line-height:.96;font-weight:900;letter-spacing:0;background:linear-gradient(135deg,#252333 0%,#3269C7 50%,#252333 100%);background-size:200% auto;background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 22px rgba(50,105,199,.12));opacity:0.15;transform:translateY(28px);filter:blur(5px);transition:opacity .85s cubic-bezier(0.16,1,0.3,1),transform .85s cubic-bezier(0.16,1,0.3,1),filter .85s cubic-bezier(0.16,1,0.3,1)}
.kcf-revealed .kcf-title{opacity:1;transform:translateY(0);filter:blur(0);animation:kcf-title-shimmer 1.8s ease-out .2s 1 forwards}
@keyframes kcf-title-shimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}

.kcf-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;opacity:0.15;transform:translateY(22px);filter:blur(3px);transition:opacity .75s cubic-bezier(0.16,1,0.3,1) .15s,transform .75s cubic-bezier(0.16,1,0.3,1) .15s,filter .75s cubic-bezier(0.16,1,0.3,1) .15s}
.kcf-revealed .kcf-actions{opacity:1;transform:translateY(0);filter:blur(0)}

.kcf-links{display:flex;flex-wrap:wrap;justify-content:center;margin-top:18px;gap:10px;opacity:0.15;transform:translateY(16px);transition:opacity .7s cubic-bezier(0.16,1,0.3,1) .28s,transform .7s cubic-bezier(0.16,1,0.3,1) .28s}
.kcf-revealed .kcf-links{opacity:1;transform:translateY(0)}
.kcf-links button{font-family:inherit;cursor:pointer}

.kcf-pill{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 28px;border:1px solid rgba(50,105,199,.16);border-radius:999px;background:linear-gradient(145deg,rgba(37,35,51,.07),rgba(37,35,51,.02));box-shadow:0 16px 32px -18px #ffffff,inset 0 1px rgba(37,35,51,.1);backdrop-filter:blur(16px);color:var(--kcf-ink);font:700 13px/1 inherit;text-decoration:none;transition:transform .25s ease,border-color .25s ease,background .25s ease}
.kcf-pill:hover{transform:translateY(-2px);border-color:rgba(50,105,199,.44);background:rgba(50,105,199,.09)}
.kcf-pill-small{min-height:42px;padding:0 20px;color:var(--kcf-muted);font-size:12px}
.kcf-pill-soon{cursor:default}
.kcf-platform{display:flex;flex-direction:column;align-items:flex-start;gap:2px}
.kcf-platform small{font-size:9px;color:var(--kcf-muted);font-weight:600}
.kcf-icon{display:grid;place-items:center;width:24px;height:24px;font-size:19px}

.kcf-bottom{position:absolute;z-index:5;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:24px 32px;color:var(--kcf-muted);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:0.2;transition:opacity .6s ease-out .4s}
.kcf-revealed .kcf-bottom{opacity:1}
.kcf-top{width:46px;height:46px;min-height:46px!important;padding:0;font-size:22px;cursor:pointer;z-index:10;pointer-events:auto;user-select:none;-webkit-user-select:none}
.kcf-compact{min-height:520px}.kcf-compact .kcf-center{min-height:460px;padding:56px 20px 72px}

@media(max-width:767px){
  .kcf{min-height:540px;margin-top:40px}
  .kcf-aurora{filter:blur(36px)}
  .kcf-pill{backdrop-filter:none;-webkit-backdrop-filter:none}
  .kcf-center{min-height:460px;padding:64px 18px 96px}
  .kcf-title{font-size:38px;margin-bottom:28px}
  .kcf-actions{flex-direction:column;width:min(300px,100%)}
  .kcf-actions .kcf-pill{width:100%}
  .kcf-bottom{padding:18px 16px 46px;justify-content:center}
  .kcf-top{position:absolute;right:16px;bottom:38px}
  .kcf-copy{max-width:230px;text-align:center;line-height:1.5}
  .kcf-giant{display:none}
  .kcf-links{max-width:330px}
}
@media(prefers-reduced-motion:reduce){
  .kcf-title,.kcf-actions,.kcf-links,.kcf-giant,.kcf-bottom,.kcf-aurora{opacity:1!important;transform:none!important;filter:none!important;transition:none!important;animation:none!important}
  .kcf-pill{transition:none}
}
`;

const smoothScrollToTop = (element: HTMLElement | Window) => {
  try {
    if (element === window) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      if (document.documentElement) document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      if (document.body) document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } else {
      (element as HTMLElement).scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  } catch {
    if (element === window) {
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    } else {
      (element as HTMLElement).scrollTop = 0;
    }
  }
};

export const CinematicFooter: React.FC<CinematicFooterProps> = ({ compact = false, onOpenAbout, onOpenPrivacy, onOpenSupport, onOpenHowItWorks, onOpenBlog }) => {
  const rootRef = useRef<HTMLElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = STYLES;
      document.head.appendChild(style);
    }

    const node = rootRef.current;
    if (!node) return;

    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsRevealed(true);
            }
          });
        },
        {
          threshold: 0.08,
          rootMargin: '0px 0px -30px 0px',
        }
      );
      observer.observe(node);
      return () => observer.disconnect();
    } else {
      setIsRevealed(true);
    }
  }, []);

  const scrollToTop = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget && 'blur' in e.currentTarget) {
        (e.currentTarget as HTMLElement).blur();
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kistas:scroll-to-top'));
    }

    const scrollersToAnimate: (HTMLElement | Window)[] = [];

    // 1. Ata elemanlar
    if (rootRef.current) {
      let el: HTMLElement | null = rootRef.current.parentElement;
      while (el) {
        if (el.scrollHeight > el.clientHeight + 1 && el.scrollTop > 0 && !scrollersToAnimate.includes(el)) {
          scrollersToAnimate.push(el);
        }
        el = el.parentElement;
      }
    }

    // 2. Dokümandaki tüm kaydırılabilir kaplar (React Native ScrollView / FlatList dahil)
    try {
      const candidates = document.querySelectorAll<HTMLElement>('div, main, section');
      candidates.forEach((node) => {
        if (node.scrollHeight > node.clientHeight + 1 && node.scrollTop > 0 && !scrollersToAnimate.includes(node)) {
          scrollersToAnimate.push(node);
        }
      });
    } catch {}

    // 3. Window & document
    if (window.scrollY > 0 || (document.documentElement && document.documentElement.scrollTop > 0) || (document.body && document.body.scrollTop > 0)) {
      scrollersToAnimate.push(window);
    }

    if (scrollersToAnimate.length === 0) {
      smoothScrollToTop(window);
      return;
    }

    scrollersToAnimate.forEach((scroller) => {
      smoothScrollToTop(scroller);
    });
  };

  return (
    <footer
      ref={rootRef}
      className={`kcf${compact ? ' kcf-compact' : ''}${isRevealed ? ' kcf-revealed' : ''}`}
      aria-label="Kıstas alt bilgi"
    >
      <div className="kcf-grid" aria-hidden="true" />
      <div className="kcf-aurora" aria-hidden="true" />
      <div className="kcf-giant" aria-hidden="true">KISTAS</div>
      <div className="kcf-center">
        <h2 className="kcf-title">Yeni bir şey keşfetmeye hazır mısın?</h2>
        <div className="kcf-actions">
          <span className="kcf-pill kcf-pill-soon" aria-label="Kıstas iOS uygulaması yakında">
            <span className="kcf-icon"><Ionicons name="logo-apple" size={22} color="#252333" /></span><span className="kcf-platform">iOS uygulaması<small>Yakında</small></span>
          </span>
          <span className="kcf-pill kcf-pill-soon" aria-label="Kıstas Android uygulaması yakında">
            <span className="kcf-icon"><Ionicons name="logo-google-playstore" size={21} color="#252333" /></span><span className="kcf-platform">Android uygulaması<small>Yakında</small></span>
          </span>
        </div>
        <nav className="kcf-links" aria-label="Yasal ve destek bağlantıları">
          {onOpenAbout ? <button className="kcf-pill kcf-pill-small" type="button" onClick={onOpenAbout}>Hakkımızda</button> : null}
          {onOpenHowItWorks ? <button className="kcf-pill kcf-pill-small" type="button" onClick={onOpenHowItWorks}>Nasıl Çalışır?</button> : null}
          {onOpenBlog ? <button className="kcf-pill kcf-pill-small" type="button" onClick={() => onOpenBlog()}>Blog</button> : null}
          {onOpenPrivacy ? <button className="kcf-pill kcf-pill-small" type="button" onClick={onOpenPrivacy}>KVKK ve Gizlilik</button> : null}
          {onOpenSupport ? <button className="kcf-pill kcf-pill-small" type="button" onClick={onOpenSupport}>Destek</button> : null}
        </nav>
      </div>
      <div className="kcf-bottom">
        <div className="kcf-copy">© 2026 Kıstas · Tüm hakları saklıdır.</div>
        <button
          className="kcf-pill kcf-top"
          type="button"
          onClick={scrollToTop}
          aria-label="Sayfanın başına dön"
        >
          ↑
        </button>
      </div>
    </footer>
  );
};
