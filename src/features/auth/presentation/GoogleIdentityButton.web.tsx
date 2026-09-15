import React, { useEffect, useRef, useState } from 'react';
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
        ux_mode: 'popup';
        use_fedcm_for_button: boolean;
      }) => void;
      renderButton: (parent: HTMLElement, options: {
        type: 'standard';
        theme: 'outline';
        size: 'large';
        text: 'continue_with';
        shape: 'pill';
        logo_alignment: 'left';
        locale: 'tr';
        width: number;
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
  const hostRef = useRef<HTMLElement | null>(null);
  const callbacks = useRef({ onCredential, onError });
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  callbacks.current = { onCredential, onError };

  useEffect(() => {
    let active = true;
    const render = async () => {
      try {
        const [google, noncePair] = await Promise.all([loadGoogleIdentity(), createNonce()]);
        if (!active || !hostRef.current) return;
        const host = hostRef.current;
        const width = Math.max(180, Math.min(320, Math.floor(host.getBoundingClientRect().width || 240)));
        google.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          nonce: noncePair.hashedNonce,
          ux_mode: 'popup',
          use_fedcm_for_button: true,
          callback: (response) => {
            if (!response.credential) {
              callbacks.current.onError('Google kimlik doğrulaması tamamlanamadı.');
              return;
            }
            callbacks.current.onCredential(response.credential, noncePair.nonce);
          },
        });
        host.replaceChildren();
        google.accounts.id.renderButton(host, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          locale: 'tr',
          width,
        });
        if (active) setReady(true);
      } catch {
        if (active) setFailed(true);
      }
    };
    void render();
    return () => { active = false; };
  }, []);

  if (failed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Google ile devam et"
        disabled={disabled}
        onPress={() => callbacks.current.onError('Google giriş hizmeti yüklenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.')}
        style={({ pressed }) => [styles.fallback, pressed && styles.pressed]}
      >
        <Text style={styles.fallbackText}>Google</Text>
      </Pressable>
    );
  }

  return (
    <View
      {...glassWebProps}
      nativeID="google-identity-button"
      accessibilityLabel="Google ile devam et"
      pointerEvents={disabled ? 'none' : 'auto'}
      style={[styles.wrapper, disabled && styles.disabled]}
    >
      <View
        ref={(element) => { hostRef.current = element as unknown as HTMLElement | null; }}
        style={styles.host}
      />
      {!ready && <ActivityIndicator color="#3269C7" style={styles.loading} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minWidth: 180,
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD9EC',
    borderRadius: 28,
    backgroundColor: '#F6FAFF',
    overflow: 'hidden',
  },
  host: {
    width: '100%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    position: 'absolute',
  },
  disabled: {
    opacity: 0.55,
  },
  fallback: {
    minWidth: 180,
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4DCE8',
    borderRadius: 28,
    backgroundColor: '#F6FAFF',
  },
  fallbackText: {
    color: '#252333',
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.82,
  },
});
