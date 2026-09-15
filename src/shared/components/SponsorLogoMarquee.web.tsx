import React, { useEffect, useMemo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Listing } from '../../features/listings/domain/Listing';
import { AutoTransparentLogo } from './AutoTransparentLogo';

export interface SponsorLogoMarqueeProps {
  projects: Listing[];
  onOpenCreditStore?: () => void;
  label?: string;
  emptyMessage?: string;
}

const STYLE_ID = 'kistas-sponsor-logo-marquee-styles';
const STYLES = `
.ksm{width:100%;margin:12px 0 32px;padding:18px 0 20px;border-block:1px solid rgba(50,105,199,.13);background:rgba(250,251,253,.22);color:#25364E;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-sizing:border-box}
.ksm-head{margin:0 24px 14px}
.ksm-label{display:flex;align-items:center;gap:9px;color:#25364E;font-size:11px;font-weight:650;letter-spacing:0}
.ksm-dot{width:5px;height:5px;border-radius:50%;background:#3269C7}
.ksm-viewport{overflow:hidden;mask-image:linear-gradient(90deg,transparent,#ffffff 5%,#ffffff 95%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#ffffff 5%,#ffffff 95%,transparent);touch-action:pan-y}
.ksm-track{display:flex;width:max-content;will-change:transform;animation:ksm-flow var(--ksm-duration) linear infinite;pointer-events:none}
.ksm-rail{display:flex;align-items:center;flex-shrink:0}
.ksm-item{display:flex;align-items:center;gap:12px;width:200px;height:52px;padding:0 20px;box-sizing:border-box;flex-shrink:0}
.ksm-logo{display:grid;place-items:center;width:36px;height:36px;flex:0 0 36px;background:transparent;color:#3269C7;font-size:15px;font-weight:700}
.ksm-logo img{width:100%;height:100%;object-fit:contain;display:block}
.ksm-name{min-width:0;overflow:hidden;color:#25364E;font-size:14px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.ksm-empty{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;min-height:52px;padding:0 20px}
.ksm-empty-copy{color:#25364E;font-size:12px}
.ksm-cta{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid rgba(50,105,199,.25);border-radius:8px;background:rgba(50,105,199,.06);color:#25364E;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer}
.ksm-cta:hover{background:rgba(50,105,199,.12)}
.ksm-cta:focus-visible{outline:2px solid #3269C7;outline-offset:3px}
.ksm-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@keyframes ksm-flow{to{transform:translate3d(-50%,0,0)}}
@media(max-width:767px){.ksm{margin:8px 0 24px;padding:16px 0}.ksm-head{margin:0 16px 10px}.ksm-item{width:168px;height:48px;padding:0 16px;gap:10px}.ksm-logo{width:32px;height:32px;flex-basis:32px}.ksm-name{font-size:13px}.ksm-empty{text-align:center}.ksm-track{animation-duration:var(--ksm-mobile-duration)}}
@media(prefers-reduced-motion:reduce){.ksm-track{animation:none;transform:none}}
`;

const getInitials = (title: string) => title
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.charAt(0))
  .join('')
  .toLocaleUpperCase('tr-TR');

export const SponsorLogoMarquee = React.memo<SponsorLogoMarqueeProps>(({ projects, onOpenCreditStore, label = 'VİTRİNİ DESTEKLEYENLER', emptyMessage = 'Bu alandaki ilk görünürlük hikâyesi seninki olabilir.' }) => {
  useEffect(() => {
    const style = document.getElementById(STYLE_ID) ?? document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    if (!style.parentNode) document.head.appendChild(style);
  }, []);

  const sponsors = useMemo(() => {
    const unique = new Map<string, Listing>();
    projects.forEach((project) => unique.set(project.id, project));
    return Array.from(unique.values()).slice(0, 12);
  }, [projects]);

  const displaySponsors = useMemo(() => {
    if (sponsors.length === 0) return [];
    const minimumItems = 8;
    return Array.from({ length: Math.max(1, Math.ceil(minimumItems / sponsors.length)) }, () => sponsors).flat();
  }, [sponsors]);

  const accessibleNames = sponsors.map((project) => project.title).join(', ');
  const duration = displaySponsors.length * 200 / 24;
  const mobileDuration = displaySponsors.length * 168 / 24;

  return (
    <section className="ksm" aria-label="Kıstas sponsorları">
      <div className="ksm-head">
        <span className="ksm-label"><span className="ksm-dot" /> {label}</span>
      </div>
      {displaySponsors.length > 0 ? (
        <>
          <span className="ksm-sr">Aktif sponsorlar: {accessibleNames}</span>
          <div className="ksm-viewport" aria-hidden="true">
            <div className="ksm-track" style={{ '--ksm-duration': `${duration}s`, '--ksm-mobile-duration': `${mobileDuration}s` } as React.CSSProperties}>
              {[0, 1].map((copy) => (
                <div className="ksm-rail" key={copy}>
                  {displaySponsors.map((project, index) => (
                    <div className="ksm-item" key={`${copy}-${project.id}-${index}`}>
                      <span className="ksm-logo" style={project.logoUrl ? { background: 'transparent', borderRadius: 0, overflow: 'visible' } : undefined}>
                        {project.logoUrl ? (
                          <AutoTransparentLogo
                            src={project.logoUrl}
                            alt=""
                            decoding="async"
                            draggable={false}
                          />
                        ) : getInitials(project.title)}
                      </span>
                      <span className="ksm-name">{project.title}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="ksm-empty">
          <span className="ksm-empty-copy">{emptyMessage}</span>
          {onOpenCreditStore ? (
            <button className="ksm-cta" type="button" onClick={onOpenCreditStore}>
              Vitrinde yer al <Ionicons name="arrow-forward" size={13} />
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
});
