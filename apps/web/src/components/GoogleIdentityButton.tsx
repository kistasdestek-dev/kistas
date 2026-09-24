'use client';

import { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '59192279747-4ru7fro8p7k9h0e7e45nbhp9jpu6kd3b.apps.googleusercontent.com';

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
        nonce: string;
        ux_mode: 'popup';
        use_fedcm_for_button: boolean;
        button_auto_select: boolean;
      }): void;
      renderButton(parent: HTMLElement, options: {
        type: 'standard';
        theme: 'filled_black';
        size: 'large';
        text: 'continue_with';
        shape: 'pill';
        width: number;
        locale: 'tr';
      }): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);

  return new Promise((resolve, reject) => {
    const script = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT}"]`) || document.createElement('script');
    const timeout = window.setTimeout(() => finish(new Error('Google giriş hizmeti zaman aşımına uğradı.')), 10000);
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
      if (error || !window.google?.accounts?.id) reject(error || new Error('Google giriş hizmeti yüklenemedi.'));
      else resolve(window.google);
    };
    const onLoad = () => finish();
    const onError = () => finish(new Error('Google giriş hizmeti yüklenemedi.'));

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!script.isConnected) {
      script.src = GOOGLE_SCRIPT;
      script.async = true;
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      document.head.appendChild(script);
    }
  });
}

async function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce));
  const hashedNonce = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return { nonce, hashedNonce };
}

interface GoogleIdentityButtonProps {
  disabled: boolean;
  onCredential: (token: string, nonce: string) => void;
  onError: (message: string) => void;
}

export function GoogleIdentityButton({ disabled, onCredential, onError }: GoogleIdentityButtonProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onCredential, onError });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onCredential, onError };
  }, [onCredential, onError]);

  useEffect(() => {
    let active = true;
    let observer: ResizeObserver | undefined;

    const prepare = async () => {
      try {
        const [google, noncePair] = await Promise.all([loadGoogleIdentity(), createNonce()]);
        if (!active || !targetRef.current) return;
        let unused = true;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: noncePair.hashedNonce,
          ux_mode: 'popup',
          use_fedcm_for_button: true,
          button_auto_select: false,
          callback: response => {
            if (!active || !unused) return;
            unused = false;
            if (response.credential) callbacksRef.current.onCredential(response.credential, noncePair.nonce);
            else callbacksRef.current.onError('Google kimlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar deneyin.');
          },
        });

        const target = targetRef.current;
        let lastWidth = 0;
        const render = () => {
          const width = Math.max(120, Math.round(target.getBoundingClientRect().width));
          if (width === lastWidth) return;
          lastWidth = width;
          target.replaceChildren();
          google.accounts.id.renderButton(target, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width,
            locale: 'tr',
          });
        };
        render();
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(render);
          observer.observe(target);
        }
      } catch {
        if (active) setFailed(true);
      }
    };
    void prepare();
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, []);

  if (failed) {
    return (
      <button type="button" disabled={disabled} onClick={() => callbacksRef.current.onError('Google giriş hizmeti yüklenemedi. Sayfayı yenileyip tekrar deneyin.')} className="auth-glass-btn flex-1 h-11 sm:h-12 rounded-full text-xs text-white border border-white/10">
        Google
      </button>
    );
  }

  return (
    <div
      className={`auth-glass-btn relative flex-1 min-w-0 h-11 sm:h-12 overflow-hidden rounded-full border border-white/10 ${disabled ? 'pointer-events-none opacity-50' : 'active:scale-[0.98]'}`}
      aria-label="Google ile devam et"
    >
      <div ref={targetRef} className="absolute inset-0 z-10 flex items-center justify-center opacity-[0.001]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2.5 text-xs font-semibold text-white">
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z" />
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
        </svg>
        <span>Google</span>
      </div>
    </div>
  );
}
