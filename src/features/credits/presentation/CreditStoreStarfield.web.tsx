import React, { useRef, useEffect } from 'react';

export interface StarParticle {
  xPct: number;
  yPct: number;
  size: number;
  color: string;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export interface CreditStoreStarfieldProps {
  mousePos: { x: number | null; y: number | null };
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const CreditStoreStarfield: React.FC<CreditStoreStarfieldProps> = ({
  mousePos,
  containerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<StarParticle[]>([]);

  useEffect(() => {
    const starColors = [
      'rgba(50, 105, 199, 0.75)',
      'rgba(96, 165, 250, 0.65)',
      'rgba(147, 100, 19, 0.55)',
      'rgba(37, 35, 51, 0.45)',
      'rgba(50, 105, 199, 0.50)',
    ];

    const particles: StarParticle[] = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        xPct: Math.random(),
        yPct: Math.random(),
        size: 1 + Math.random() * 2.2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        currentX: 0,
        currentY: 0,
        targetX: 0,
        targetY: 0,
        vx: 0,
        vy: 0,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.015 + Math.random() * 0.025,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = (canvas.width = canvas.offsetWidth);
      const height = (canvas.height = canvas.offsetHeight);

      ctx.clearRect(0, 0, width, height);

      const container = containerRef.current;
      const rect = container ? container.getBoundingClientRect() : null;

      const stiffness = 0.08;
      const damping = 0.82;
      const radius = 600;

      for (const p of particlesRef.current) {
        const baseX = p.xPct * width;
        const baseY = p.yPct * height;

        if (rect && mousePos.x !== null && mousePos.y !== null) {
          const starScreenX = rect.left + baseX;
          const starScreenY = rect.top + baseY;

          const dx = mousePos.x - starScreenX;
          const dy = mousePos.y - starScreenY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < radius) {
            const force = 1 - dist / radius;
            p.targetX = dx * force * 0.45;
            p.targetY = dy * force * 0.45;
          } else {
            p.targetX = 0;
            p.targetY = 0;
          }
        } else {
          p.targetX = 0;
          p.targetY = 0;
        }

        const ax = (p.targetX - p.currentX) * stiffness;
        p.vx = (p.vx + ax) * damping;
        p.currentX += p.vx;

        const ay = (p.targetY - p.currentY) * stiffness;
        p.vy = (p.vy + ay) * damping;
        p.currentY += p.vy;

        p.twinklePhase += p.twinkleSpeed;
        const opacity = 0.15 + 0.85 * ((Math.sin(p.twinklePhase) + 1) / 2);

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(baseX + p.currentX, baseY + p.currentY, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mousePos, containerRef]);

  return <canvas ref={canvasRef} className="k-starfield-canvas" />;
};

export default CreditStoreStarfield;
