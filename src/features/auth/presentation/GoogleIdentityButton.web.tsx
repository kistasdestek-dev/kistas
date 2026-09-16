import React, { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { GoogleIdentityButtonProps } from './GoogleIdentityButton';

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '59192279747-4ru7fro8p7k9h0e7e45nbhp9jpu6kd3b.apps.googleusercontent.com';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        nonce: string;
        use_fedcm_for_button: boolean;
      }) => void;
      renderButton: (parent: HTMLElement, options: {
        type: 'standard';
        theme: 'outline';
        size: 'large';
        text: 'continue_with';
        shape: 'pill';
        logo_alignment: 'left';
        width: string;
        locale: 'tr';
      }) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

let googleScriptPromise: Promise<GoogleIdentityApi> | null = null;
const glassWebProps = { dataSet: { authGlass: 'true' } };

const loadGoogleIdentity = (): Promise<GoogleIdentityApi> => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);
    const script = existing || document.createElement('script');
    const fail = () => {
      googleScriptPromise = null;
      reject(new Error('Google Identity yüklenemedi.'));
    };
    const ready = () => window.google?.accounts?.id
      ? resolve(window.google)
      : fail();

    script.addEventListener('load', ready, { once: true });
    script.addEventListener('error', fail, { once: true });
    if (!existing) {
      script.src = GOOGLE_IDENTITY_SCRIPT;
      script.async = true;
      script.defer = true;
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      document.head.appendChild(script);
    }
  });

  return googleScriptPromise;
};

const createNonce = async () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce));
  const hashedNonce = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return { nonce, hashedNonce };
};

export function GoogleIdentityButton({ disabled, onCredential, onError }: GoogleIdentityButtonProps) {
  const buttonRef = useRef<View>(null);
  const callbacks = useRef({ onCredential, onError });
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  callbacks.current = { onCredential, onError };

  useEffect(() => {
    let active = true;
    let resizeObserver: ResizeObserver | null = null;
    let renderedWidth = 0;

    const prepare = async () => {
      try {
        const [google, noncePair] = await Promise.all([loadGoogleIdentity(), createNonce()]);
        if (!active) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          nonce: noncePair.hashedNonce,
          use_fedcm_for_button: true,
          callback: (response) => {
            if (!response.credential) {
              callbacks.current.onError('Google kimlik doğrulaması tamamlanamadı.');
              return;
            }
            callbacks.current.onCredential(response.credential, noncePair.nonce);
          },
        });

        const target = buttonRef.current as unknown as HTMLElement | null;
        if (!target) throw new Error('Google giriş düğmesi hazırlanamadı.');

        const render = () => {
          const width = Math.max(180, Math.min(400, Math.round(target.getBoundingClientRect().width || 180)));
          if (width === renderedWidth) return;
          renderedWidth = width;
          target.replaceChildren();
          google.accounts.id.renderButton(target, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: String(width),
            locale: 'tr',
          });
          if (active) setReady(true);
        };

        render();
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(render);
          resizeObserver.observe(target);
        }
      } catch {
        if (active) setFailed(true);
      }
    };
    void prepare();
    return () => {
      active = false;
      resizeObserver?.disconnect();
    };
  }, []);

  if (failed) {
    return (
      <Pressable
        {...glassWebProps}
        accessibilityRole="button"
        accessibilityLabel="Google giriş hizmetini yeniden dene"
        disabled={disabled}
        onPress={() => callbacks.current.onError('Google giriş hizmeti yüklenemedi. Sayfayı yenileyip tekrar deneyin.')}
        style={({ pressed }) => [styles.fallbackButton, disabled && styles.disabled, pressed && styles.pressed]}
      >
        <Ionicons name="logo-google" size={21} color="#3269C7" />
        <Text style={styles.text}>Google</Text>
      </Pressable>
    );
  }

  return (
    <View pointerEvents={disabled ? 'none' : 'auto'} style={[styles.buttonShell, disabled && styles.disabled]}>
      <View ref={buttonRef} nativeID="google-identity-button" style={styles.renderTarget} />
      {!ready && (
        <View pointerEvents="none" style={styles.loading}>
          <ActivityIndicator size="small" color="#3269C7" />
          <Text style={styles.text}>Google hazırlanıyor…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonShell: {
    minWidth: 180,
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renderTarget: {
    width: '100%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    position: 'absolute',
    inset: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: '#CBD9EC',
    borderRadius: 28,
    backgroundColor: '#F6FAFF',
  },
  fallbackButton: {
    minWidth: 180,
    minHeight: 48,
    paddingHorizontal: 24,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: '#CBD9EC',
    borderRadius: 28,
    backgroundColor: '#F6FAFF',
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    color: '#34445C',
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.82,
  },
});
