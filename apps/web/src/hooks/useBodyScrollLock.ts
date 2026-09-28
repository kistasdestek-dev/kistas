'use client';

import { useEffect } from 'react';

interface ScrollLockSnapshot {
  scrollY: number;
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyPaddingRight: string;
}

let activeLocks = 0;
let snapshot: ScrollLockSnapshot | null = null;

const lockDocumentScroll = () => {
  if (activeLocks === 0) {
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
    const computedPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    snapshot = {
      scrollY,
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyPaddingRight: body.style.paddingRight,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
    }
  }

  activeLocks += 1;
};

const unlockDocumentScroll = () => {
  activeLocks = Math.max(0, activeLocks - 1);
  if (activeLocks !== 0 || !snapshot) return;

  const body = document.body;
  const html = document.documentElement;
  const previous = snapshot;
  snapshot = null;

  html.style.overflow = previous.htmlOverflow;
  body.style.overflow = previous.bodyOverflow;
  body.style.position = previous.bodyPosition;
  body.style.top = previous.bodyTop;
  body.style.left = previous.bodyLeft;
  body.style.right = previous.bodyRight;
  body.style.width = previous.bodyWidth;
  body.style.paddingRight = previous.bodyPaddingRight;
  window.scrollTo({ top: previous.scrollY, left: 0, behavior: 'auto' });
};

export const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') return;

    lockDocumentScroll();
    return unlockDocumentScroll;
  }, [isLocked]);
};
