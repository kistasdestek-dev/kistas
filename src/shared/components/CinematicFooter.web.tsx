import React, { useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KistasLogo } from './KistasLogo';

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
.kcf{--kcf-blue:#013196;--kcf-ink:#25364E;--kcf-muted:#64748B;position:relative;isolation:isolate;width:min(1180px,calc(100% - 32px));margin:72px auto 0;overflow:hidden;border:1px solid rgba(1,49,150,.12);border-bottom:0;border-radius:48px 48px 0 0;background:radial-gradient(38% 150px at 50% 0,rgba(1,49,150,.13),transparent 72%),linear-gradient(180deg,#fff 0%,#f8fafd 100%);color:var(--kcf-ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.kcf *{box-sizing:border-box}.kcf-glow{position:absolute;z-index:2;top:0;left:50%;width:36%;height:1px;transform:translate(-50%,-50%);border-radius:999px;background:rgba(1,49,150,.68);box-shadow:0 0 16px 4px rgba(1,49,150,.26);pointer-events:none}
.kcf-shell{position:relative;z-index:1;display:grid;grid-template-columns:minmax(230px,.9fr) minmax(0,2fr);gap:72px;padding:58px 64px 34px}.kcf-brand{display:flex;min-width:0;flex-direction:column;align-items:flex-start}.kcf-tagline{max-width:300px;margin:22px 0 0;color:var(--kcf-muted);font-size:13px;line-height:1.65}.kcf-sections{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:34px}.kcf-section-title{margin:0 0 18px;color:var(--kcf-blue);font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}.kcf-list{display:flex;margin:0;padding:0;list-style:none;flex-direction:column;gap:12px}.kcf-link,.kcf-static{display:inline-flex;min-height:26px;align-items:center;gap:8px;border:0;background:none;color:var(--kcf-muted);font:600 12px/1.45 inherit;letter-spacing:-.1px;text-align:left;text-decoration:none}.kcf-link{width:max-content;max-width:100%;padding:0;cursor:pointer;transition:color .25s ease,transform .25s ease}.kcf-link:hover,.kcf-link:focus-visible{color:var(--kcf-blue);transform:translateX(3px)}.kcf-link:focus-visible{outline:2px solid rgba(1,49,150,.25);outline-offset:4px;border-radius:4px}.kcf-link-icon{display:inline-flex;transition:transform .25s ease}.kcf-link:hover .kcf-link-icon{transform:translateX(2px)}.kcf-static{color:#73839a}.kcf-soon{margin-left:2px;padding:2px 6px;border-radius:999px;background:rgba(1,49,150,.07);color:var(--kcf-blue);font-size:9px;font-weight:700}.kcf-bottom{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:18px;margin:0 64px;padding:22px 0 26px;border-top:1px solid rgba(1,49,150,.1);color:var(--kcf-muted);font-size:11px;font-weight:600;letter-spacing:-.1px}.kcf-top{display:grid;width:42px;height:42px;flex:0 0 42px;place-items:center;border:1px solid rgba(50,105,199,.24);border-radius:50%;background:linear-gradient(145deg,#fff,#eef5ff);box-shadow:0 9px 20px -12px rgba(1,49,150,.65);color:var(--kcf-blue);cursor:pointer;transition:transform .25s ease,box-shadow .25s ease}.kcf-top:hover{transform:translateY(-2px);box-shadow:0 12px 24px -12px rgba(1,49,150,.8)}
.kcf-animate{opacity:0;filter:blur(4px);transform:translateY(-8px);transition:opacity .8s ease var(--kcf-delay,0s),filter .8s ease var(--kcf-delay,0s),transform .8s cubic-bezier(.16,1,.3,1) var(--kcf-delay,0s)}.kcf-revealed .kcf-animate{opacity:1;filter:blur(0);transform:translateY(0)}.kcf-compact{margin-top:48px}.kcf-compact .kcf-shell{padding-top:46px;padding-bottom:28px}
@media(max-width:860px){.kcf{width:calc(100% - 20px);margin-top:48px;border-radius:34px 34px 0 0}.kcf-shell{grid-template-columns:1fr;gap:38px;padding:42px 28px 28px}.kcf-tagline{margin-top:16px}.kcf-sections{grid-template-columns:repeat(2,minmax(0,1fr));gap:32px 22px}.kcf-bottom{margin:0 28px;padding-bottom:28px}.kcf-glow{width:52%}}
@media(max-width:420px){.kcf{width:calc(100% - 12px);border-radius:28px 28px 0 0}.kcf-shell{padding:38px 20px 24px}.kcf-sections{gap:28px 16px}.kcf-section-title{margin-bottom:14px}.kcf-list{gap:10px}.kcf-bottom{margin:0 20px}.kcf-copy{max-width:220px;line-height:1.55}.kcf-glow{width:62%;box-shadow:0 0 12px 3px rgba(1,49,150,.2)}}
@media(prefers-reduced-motion:reduce){.kcf-animate{opacity:1!important;filter:none!important;transform:none!important;transition:none!important}.kcf-link,.kcf-link-icon,.kcf-top{transition:none!important}}
`;

type FooterLink = { title: string; action: () => void };

const smoothScrollToTop = (element: HTMLElement | Window) => {
  try {
    element.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  } catch {
    if (element === window) window.scrollTo(0, 0);
    else (element as HTMLElement).scrollTop = 0;
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
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsRevealed(true);
        observer.disconnect();
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => {
    window.dispatchEvent(new CustomEvent('kistas:scroll-to-top'));
    const scrollers: (HTMLElement | Window)[] = [];
    let ancestor = rootRef.current?.parentElement ?? null;
    while (ancestor) {
      if (ancestor.scrollHeight > ancestor.clientHeight + 1 && ancestor.scrollTop > 0) scrollers.push(ancestor);
      ancestor = ancestor.parentElement;
    }
    document.querySelectorAll<HTMLElement>('div, main, section').forEach((node) => {
      if (node.scrollHeight > node.clientHeight + 1 && node.scrollTop > 0 && !scrollers.includes(node)) scrollers.push(node);
    });
    if (window.scrollY > 0) scrollers.push(window);
    (scrollers.length ? scrollers : [window]).forEach(smoothScrollToTop);
  };

  const sections: Array<{ label: string; links: FooterLink[] }> = [
    { label: 'Kıstas', links: [
      ...(onOpenAbout ? [{ title: 'Hakkımızda', action: onOpenAbout }] : []),
      ...(onOpenHowItWorks ? [{ title: 'Nasıl Çalışır?', action: onOpenHowItWorks }] : []),
    ] },
    { label: 'Kaynaklar', links: [
      ...(onOpenBlog ? [{ title: 'Blog', action: onOpenBlog }] : []),
      ...(onOpenSupport ? [{ title: 'Destek', action: onOpenSupport }] : []),
      ...(onOpenPrivacy ? [{ title: 'KVKK ve Gizlilik', action: onOpenPrivacy }] : []),
    ] },
  ].filter((section) => section.links.length > 0);

  return (
    <footer ref={rootRef} className={`kcf${compact ? ' kcf-compact' : ''}${isRevealed ? ' kcf-revealed' : ''}`} aria-label="Kıstas alt bilgi">
      <div className="kcf-glow" aria-hidden="true" />
      <div className="kcf-shell">
        <div className="kcf-brand kcf-animate" style={{ '--kcf-delay': '.06s' } as React.CSSProperties}>
          <KistasLogo size={35} showWordmark glow />
          <p className="kcf-tagline">Bağımsız dijital projelerin keşfedildiği, desteklendiği ve büyüdüğü topluluk vitrini.</p>
        </div>
        <nav className="kcf-sections" aria-label="Alt bilgi bağlantıları">
          {sections.map((section, index) => (
            <div className="kcf-animate" style={{ '--kcf-delay': `${0.14 + index * 0.1}s` } as React.CSSProperties} key={section.label}>
              <h3 className="kcf-section-title">{section.label}</h3>
              <ul className="kcf-list">
                {section.links.map((link) => (
                  <li key={link.title}><button className="kcf-link" type="button" onClick={link.action}>{link.title}<span className="kcf-link-icon" aria-hidden="true">→</span></button></li>
                ))}
              </ul>
            </div>
          ))}
          <div className="kcf-animate" style={{ '--kcf-delay': `${0.14 + sections.length * 0.1}s` } as React.CSSProperties}>
            <h3 className="kcf-section-title">Uygulamalar</h3>
            <ul className="kcf-list">
              <li className="kcf-static"><Ionicons name="logo-apple" size={16} color="#25364E" />iOS <span className="kcf-soon">Yakında</span></li>
              <li className="kcf-static"><Ionicons name="logo-google-playstore" size={15} color="#25364E" />Android <span className="kcf-soon">Yakında</span></li>
            </ul>
          </div>
        </nav>
      </div>
      <div className="kcf-bottom kcf-animate" style={{ '--kcf-delay': '.42s' } as React.CSSProperties}>
        <span className="kcf-copy">© {new Date().getFullYear()} Kıstas · Tüm hakları saklıdır.</span>
        <button className="kcf-top" type="button" onClick={scrollToTop} aria-label="Sayfanın başına dön"><Ionicons name="arrow-up" size={18} color="#013196" /></button>
      </div>
    </footer>
  );
};
