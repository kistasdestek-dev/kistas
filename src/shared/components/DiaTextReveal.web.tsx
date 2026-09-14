import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export interface DiaTextRevealProps {
  text: string[];
  fixedWidth?: boolean;
  repeat?: boolean;
  repeatDelay?: number;
  className?: string;
  charDelay?: number;
  holdDuration?: number;
}

const STYLE_ID = 'kistas-dia-text-reveal-styles';
const STYLES = `
.dtr{position:relative;display:inline-flex;align-items:baseline;overflow:hidden;vertical-align:bottom}
.dtr-measure{position:absolute;visibility:hidden;pointer-events:none;white-space:nowrap}
.dtr-measure-word{display:inline-block;padding-right:2px}.dtr-word{display:inline-flex;white-space:nowrap}
.dtr-char-shell{display:inline-block;overflow:hidden}.dtr-char{display:inline-block;will-change:transform,opacity,filter}
.dtr-in{animation:dtr-enter .7s cubic-bezier(.16,1,.3,1) both}.dtr-out{animation:dtr-leave .4s cubic-bezier(.7,0,.84,0) both}
@keyframes dtr-enter{from{transform:translateY(100%);opacity:0;filter:blur(4px)}to{transform:translateY(0);opacity:1;filter:blur(0)}}
@keyframes dtr-leave{from{transform:translateY(0);opacity:1;filter:blur(0)}to{transform:translateY(-100%);opacity:0;filter:blur(4px)}}
@media(prefers-reduced-motion:reduce){.dtr-char{animation:none!important;filter:none!important}}
`;

export const DiaTextReveal: React.FC<DiaTextRevealProps> = ({
  text,
  fixedWidth = true,
  repeat = true,
  repeatDelay = 0.5,
  className = '',
  charDelay = 35,
  holdDuration = 2000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [maxWidth, setMaxWidth] = useState<number>();
  const [isVisible, setIsVisible] = useState(true);
  const rootRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const words = useMemo(() => text.filter(Boolean), [text]);
  const currentWord = words[currentIndex] || '';
  const characters = useMemo(() => Array.from(currentWord), [currentWord]);

  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = STYLES;
      document.head.appendChild(style);
    }
    if (!rootRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!fixedWidth || !measureRef.current) return;
    const measure = () => {
      if (!measureRef.current) return;
      const widths = Array.from(measureRef.current.children).map((element) => element.getBoundingClientRect().width);
      setMaxWidth(Math.ceil(Math.max(...widths, 0)));
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);

    measure();
    Array.from(measureRef.current.children).forEach((element) => observer?.observe(element));
    document.fonts?.ready.then(measure);

    return () => observer?.disconnect();
  }, [fixedWidth, words]);

  useEffect(() => {
    if (!isVisible || words.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const isLastWord = currentIndex === words.length - 1;
    if (phase === 'in' && isLastWord && !repeat) return;
    const delay = phase === 'in'
      ? holdDuration + characters.length * charDelay
      : 450 + characters.length * 15 + repeatDelay * 1000;
    const timeout = window.setTimeout(() => {
      if (phase === 'in') {
        setPhase('out');
        return;
      }
      setCurrentIndex((index) => index + 1 >= words.length ? 0 : index + 1);
      setPhase('in');
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [characters.length, charDelay, currentIndex, holdDuration, isVisible, phase, repeat, repeatDelay, words.length]);

  return (
    <span ref={rootRef} className={`dtr ${className}`} style={{ width: fixedWidth && maxWidth ? maxWidth : undefined }}>
      {fixedWidth ? (
        <span ref={measureRef} className="dtr-measure" aria-hidden="true">
          {words.map((word) => <span key={word} className="dtr-measure-word">{word}</span>)}
        </span>
      ) : null}
      <span className="dtr-word">
        {characters.map((character, index) => {
          const delay = phase === 'in' ? index * charDelay : (characters.length - index - 1) * 15;
          return (
            <span className="dtr-char-shell" key={`${currentIndex}-${index}`}>
              <span className={`dtr-char dtr-${phase}`} style={{ animationDelay: `${delay}ms` }}>
                {character === ' ' ? '\u00A0' : character}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
};
