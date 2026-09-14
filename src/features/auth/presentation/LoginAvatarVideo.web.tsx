import React, { useEffect, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import { KistasLogo } from '../../../shared/components/KistasLogo';

const LOGIN_VIDEO_URI = Asset.fromModule(require('../../../../videos/login.mp4')).uri;
const LOGIN_POSTER_URI = Asset.fromModule(require('../../../../videos/login-poster.png')).uri;

export interface LoginAvatarVideoProps {
  size?: number;
}

export const LoginAvatarVideo: React.FC<LoginAvatarVideoProps> = ({ size }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const targetSize = size ?? 136;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy fallback: muted autoplay will activate on next tick or tap
      });
    }
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: targetSize,
          height: targetSize,
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: '#F4F8FD',
          border: '3px solid #FFFFFF',
          boxShadow: '0 10px 28px rgba(50, 105, 199, 0.18), 0 2px 6px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <KistasLogo
          size={targetSize * 0.42}
          showWordmark={false}
          glow
          style={{ position: 'absolute' }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${LOGIN_POSTER_URI}")`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
          }}
        />
        <video
          ref={videoRef}
          src={LOGIN_VIDEO_URI}
          poster={LOGIN_POSTER_URI}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setIsVideoReady(true)}
          onError={() => setIsVideoReady(false)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            borderRadius: '50%',
            opacity: isVideoReady ? 1 : 0,
            transition: 'opacity 180ms ease-out',
          }}
        />
      </div>
    </div>
  );
};

export default LoginAvatarVideo;
