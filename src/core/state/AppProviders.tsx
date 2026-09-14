import React from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { AuthProvider } from './auth/AuthContext';
import { WalletCreditsProvider } from './wallet/WalletCreditsContext';
import { LoadingProvider } from './loading/LoadingContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Katmanlı ve Ayrıştırılmış Durum Sağlayıcıları (Context Hierarchy)
 *
 * Sıralama:
 * 1. ThemeProvider: Nadiren değişir, en üst katmandadır.
 * 2. AuthProvider: Kullanıcı oturumunu yönetir.
 * 3. WalletCreditsProvider: Kullanıcının anlık bakiye ve harcamalarını yönetir (Auth'a bağlıdır).
 * 4. LoadingProvider: Ağ istekleri ve asenkron işlemler için blur/overlay sağlar.
 *
 * Not: Sık güncellenen bildirim ve sohbet verileri için Context yerine
 * 'ChatNotificationStore' (useSyncExternalStore) kullanılmaktadır.
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WalletCreditsProvider>
          <LoadingProvider>
            {children}
          </LoadingProvider>
        </WalletCreditsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
