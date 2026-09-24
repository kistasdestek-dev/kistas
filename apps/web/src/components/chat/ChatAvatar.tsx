'use client';

import React, { useEffect, useState } from 'react';

interface ChatAvatarProps {
  imageUrl?: string | null;
  alt: string;
  size: number;
  className?: string;
}

export const ChatAvatar: React.FC<ChatAvatarProps> = ({
  imageUrl,
  alt,
  size,
  className = '',
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const showUserImage = Boolean(imageUrl && !imageFailed);

  return (
    <div
      className={`relative shrink-0 ${showUserImage ? 'overflow-hidden rounded-full' : 'bg-transparent'} ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 flex items-center justify-center p-[8%]">
        <img
          src="/kistas-logo-transparent.png"
          alt="Kıstas"
          className="h-full w-full object-contain"
        />
      </span>

      {showUserImage && (
        <img
          src={imageUrl!}
          alt={alt}
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
};
