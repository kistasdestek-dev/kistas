import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { LoadingOverlay } from '../../../shared/components/LoadingOverlay';

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  submessage?: string;
}

export interface LoadingActions {
  showLoading: (message?: string, submessage?: string) => void;
  hideLoading: () => void;
  /**
   * Asenkron bir işlemi (API isteği, Supabase sorgusu, ekran yüklemesi vb.)
   * loading overlay ile sarmalar.
   * Gecikme eşiği (delayMs): Belirtilen süreden uzun süren işlemlerde tetiklenir (varsayılan: 150ms).
   */
  withLoading: <T>(
    action: Promise<T> | (() => Promise<T>),
    options?: {
      message?: string;
      submessage?: string;
      delayMs?: number;
      minDurationMs?: number;
    }
  ) => Promise<T>;
}

const LoadingStateContext = createContext<LoadingState>({
  isLoading: false,
});

const LoadingActionsContext = createContext<LoadingActions>({
  showLoading: () => {},
  hideLoading: () => {},
  withLoading: async (action) => (typeof action === 'function' ? action() : action),
});

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    message: 'Yükleniyor...',
    submessage: 'Lütfen bekleyin, veriler hazırlanıyor',
  });

  const timerRef = useRef<any>(null);
  const showTimeRef = useRef<number>(0);

  const showLoading = useCallback((message?: string, submessage?: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    showTimeRef.current = Date.now();
    setState({
      isLoading: true,
      message: message || 'Yükleniyor...',
      submessage: submessage !== undefined ? submessage : 'Lütfen bekleyin, veriler hazırlanıyor',
    });
  }, []);

  const hideLoading = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
  }, []);

  const withLoading = useCallback(
    async <T,>(
      action: Promise<T> | (() => Promise<T>),
      options?: {
        message?: string;
        submessage?: string;
        delayMs?: number;
        minDurationMs?: number;
      }
    ): Promise<T> => {
      const delayMs = options?.delayMs !== undefined ? options?.delayMs : 150;
      const minDurationMs = options?.minDurationMs !== undefined ? options?.minDurationMs : 320;
      let hasShown = false;
      let startTime = 0;

      // Belirtilen gecikme süresini aşarsa overlay'i tetikle
      if (delayMs > 0) {
        timerRef.current = setTimeout(() => {
          hasShown = true;
          startTime = Date.now();
          showLoading(options?.message, options?.submessage);
        }, delayMs);
      } else {
        hasShown = true;
        startTime = Date.now();
        showLoading(options?.message, options?.submessage);
      }

      try {
        const promise = typeof action === 'function' ? action() : action;
        const result = await promise;
        return result;
      } finally {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        if (hasShown) {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, minDurationMs - elapsed);
          if (remaining > 0) {
            setTimeout(() => {
              hideLoading();
            }, remaining);
          } else {
            hideLoading();
          }
        }
      }
    },
    [showLoading, hideLoading]
  );

  const actions = React.useMemo<LoadingActions>(
    () => ({ showLoading, hideLoading, withLoading }),
    [showLoading, hideLoading, withLoading]
  );

  return (
    <LoadingStateContext.Provider value={state}>
      <LoadingActionsContext.Provider value={actions}>
        {children}
        <LoadingOverlay
          visible={state.isLoading}
          message={state.message}
          submessage={state.submessage}
        />
      </LoadingActionsContext.Provider>
    </LoadingStateContext.Provider>
  );
};

export const useLoading = (): LoadingState => useContext(LoadingStateContext);
export const useLoadingActions = (): LoadingActions => useContext(LoadingActionsContext);
