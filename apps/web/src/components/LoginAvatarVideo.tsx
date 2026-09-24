'use client';

import React, { useEffect, useRef } from 'react';

export interface LoginAvatarVideoProps {
  size?: number;
  className?: string;
}

export const LoginAvatarVideo: React.FC<LoginAvatarVideoProps> = ({ size, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');

    const tryPlay = () => {
      if (!video) return;
      video.muted = true;
      video.defaultMuted = true;
      const p = video.play();
      if (p !== undefined) {
        p.catch(() => {
          // Will play on first touch / interaction
        });
      }
    };

    tryPlay();

    const handleFirstTouch = () => {
      if (video && video.paused) {
        tryPlay();
      }
    };

    window.addEventListener('touchstart', handleFirstTouch, { once: true, passive: true });
    window.addEventListener('click', handleFirstTouch, { once: true, passive: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('click', handleFirstTouch);
    };
  }, []);

  return (
    <div className="relative mx-auto flex items-center justify-center select-none">
      <div
        style={size ? { width: size, height: size } : undefined}
        className={`relative flex items-center justify-center overflow-hidden rounded-full border-[3.5px] sm:border-4 border-white bg-[#F4F8FD] shadow-[0_12px_32px_-4px_rgba(50,105,199,0.20),0_2px_8px_rgba(0,0,0,0.04)] ${
          size ? '' : 'w-[144px] h-[144px] sm:w-[172px] sm:h-[172px]'
        } ${className}`}
      >
        {/* Video Element with Native Poster (Full Head Visible & Centered) */}
        <video
          ref={videoRef}
          src="/videos/login.mp4"
          poster="/videos/login-poster.png"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="h-full w-full rounded-full object-cover object-center pointer-events-none transform scale-[0.98] translate-y-[1px]"
        />
      </div>
    </div>
  );
};
