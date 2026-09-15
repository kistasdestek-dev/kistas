import React, { useEffect } from 'react';
import { DiaTextReveal } from './DiaTextReveal';

const STYLE_ID = 'kistas-discovery-reveal-styles';
const STYLES = `
.dsr{position:relative;display:flex;align-items:center;width:fit-content;max-width:calc(100% - 32px);margin:22px 16px 32px;padding:4px 4px 4px 18px;box-sizing:border-box;border:0;background:transparent;box-shadow:none;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.dsr:before{content:"";position:absolute;top:2px;bottom:2px;left:0;width:2px;border-radius:2px;background:linear-gradient(180deg,rgba(50,105,199,.18),#3269C7,rgba(50,105,199,.18));box-shadow:0 0 12px rgba(50,105,199,.45)}
.dsr-copy{position:relative;z-index:1;min-width:0}.dsr-eyebrow{margin:0 0 7px;color:#3269C7;font-size:9px;font-weight:700;letter-spacing:.16em}.dsr-line{display:flex;flex-wrap:wrap;gap:0 .28em;margin:0;color:#25364E;font-size:clamp(23px,2.3vw,34px);line-height:1.15;font-weight:700;letter-spacing:0}.dsr-reveal{color:#3269C7}
@media(max-width:767px){.dsr{align-items:flex-start;margin:20px 16px 28px;padding:3px 2px 3px 14px}.dsr-line{font-size:24px}}
`;

const WORDS = ['keşfedilir.', 'desteklenir.', 'büyür.'];

export const DiscoveryRevealStatement = React.memo(() => {
  useEffect(() => {
    const style = document.getElementById(STYLE_ID) ?? document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    if (!style.parentNode) document.head.appendChild(style);
  }, []);

  return (
    <section className="dsr" aria-label="Kıstas keşif mesajı">
      <div className="dsr-copy">
        <p className="dsr-line"><span>Fikirler burada</span><DiaTextReveal text={WORDS} className="dsr-reveal" holdDuration={1900} repeatDelay={0.35} /></p>
      </div>
    </section>
  );
});
