import React, { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
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
        use_fedcm_for_prompt: boolean;
      }) => void;
      prompt: () => void;
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
  const googleRef = useRef<GoogleIdentityApi | null>(null);
  const callbacks = useRef({ onCredential, onError });
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  callbacks.current = { onCredential, onError };

  useEffect(() => {
    let active = true;
    const prepare = async () => {
      try {
        const [google, noncePair] = await Promise.all([loadGoogleIdentity(), createNonce()]);
        if (!active) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          nonce: noncePair.hashedNonce,
          use_fedcm_for_prompt: true,
          callback: (response) => {
            if (!response.credential) {
              callbacks.current.onError('Google kimlik doğrulaması tamamlanamadı.');
              return;
            }
            callbacks.current.onCredential(response.credential, noncePair.nonce);
          },
        });
        googleRef.current = google;
        if (active) setReady(true);
      } catch {
        if (active) setFailed(true);
      }
    };
    void prepare();
    return () => { active = false; };
  }, []);

  return (
    <Pressable
      {...glassWebProps}
      nativeID="google-identity-button"
      accessibilityRole="button"
      accessibilityLabel="Google ile devam et"
      disabled={disabled}
      onPress={() => {
        if (failed) {
          callbacks.current.onError('Google giriş hizmeti yüklenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.');
          return;
        }
        if (!ready || !googleRef.current) {
          callbacks.current.onError('Google giriş hizmeti hazırlanıyor. Lütfen kısa bir süre sonra tekrar deneyin.');
          return;
        }
        googleRef.current.accounts.id.prompt();
      }}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Ionicons name="logo-google" size={21} color="#3269C7" />
      <Text style={styles.text}>Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
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
