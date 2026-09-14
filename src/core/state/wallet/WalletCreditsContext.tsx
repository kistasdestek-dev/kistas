import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BoostScope, CreditService } from '../../../features/credits/application/CreditService';
import { useAuth } from '../auth/AuthContext';

export interface WalletCreditsState {
  credits: number;
  isLoading: boolean;
  isUpdating: boolean;
}

export interface WalletCreditsActions {
  refreshCredits: () => Promise<number>;
  boostListing: (
    listingId: string,
    durationHours: number,
    creditCost: number
  ) => Promise<{ success: boolean; newCredits?: number; error?: string }>;
  boostListingScoped: (
    listingId: string,
    scope: BoostScope,
    durationHours: number,
    creditCost: number
  ) => Promise<{ success: boolean; newCredits?: number; scope?: BoostScope; error?: string }>;
}

const WalletCreditsStateContext = createContext<WalletCreditsState | undefined>(undefined);
const WalletCreditsDispatchContext = createContext<WalletCreditsActions | undefined>(undefined);

interface WalletCreditsProviderProps {
  children: React.ReactNode;
}

export const WalletCreditsProvider: React.FC<WalletCreditsProviderProps> = ({ children }) => {
  const { profile, isAuthenticated } = useAuth();
  const [credits, setCreditsState] = useState<number>(profile?.boostCredits ?? 0);
  const creditsRef = useRef(credits);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Profil değiştikçe başlangıç kredisini güncelle
  useEffect(() => {
    creditsRef.current = credits;
  }, [credits]);

  useEffect(() => {
    if (profile?.boostCredits !== undefined) {
      setCreditsState(profile.boostCredits);
    }
  }, [profile?.boostCredits]);

  const refreshCredits = useCallback(async (): Promise<number> => {
    setIsLoading(true);
    try {
      const balance = await CreditService.getMyCreditBalance();
      setCreditsState(balance);
      return balance;
    } catch (err) {
      console.warn('WalletCreditsContext refreshCredits hatası:', err);
      return creditsRef.current;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshCredits();
    } else {
      setCreditsState(0);
    }
  }, [isAuthenticated, refreshCredits]);

  const boostListingScoped = useCallback(async (
    listingId: string,
    scope: BoostScope,
    durationHours: number,
    creditCost: number
  ) => {
    setIsUpdating(true);
    try {
      const res = await CreditService.boostListingScoped(listingId, scope, durationHours, creditCost);
      if (res.success && res.newCredits !== undefined) {
        setCreditsState(res.newCredits);
      }
      return res;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const boostListing = useCallback(async (
    listingId: string,
    durationHours: number,
    creditCost: number
  ) => {
    return boostListingScoped(listingId, 'global', durationHours, creditCost);
  }, [boostListingScoped]);

  // Referans bütünlüğü: State sadece credits, isLoading veya isUpdating değiştiğinde yenilenir
  const stateValue = useMemo<WalletCreditsState>(() => ({
    credits,
    isLoading,
    isUpdating,
  }), [credits, isLoading, isUpdating]);

  // Referans bütünlüğü: Dispatch objesi useCallback'ler sayesinde sabit referansa sahiptir
  const dispatchValue = useMemo<WalletCreditsActions>(() => ({
    refreshCredits,
    boostListing,
    boostListingScoped,
  }), [refreshCredits, boostListing, boostListingScoped]);

  return (
    <WalletCreditsDispatchContext.Provider value={dispatchValue}>
      <WalletCreditsStateContext.Provider value={stateValue}>
        {children}
      </WalletCreditsStateContext.Provider>
    </WalletCreditsDispatchContext.Provider>
  );
};

export const useWallet = (): WalletCreditsState => {
  const context = useContext(WalletCreditsStateContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletCreditsProvider');
  }
  return context;
};

export const useWalletActions = (): WalletCreditsActions => {
  const context = useContext(WalletCreditsDispatchContext);
  if (!context) {
    throw new Error('useWalletActions must be used within a WalletCreditsProvider');
  }
  return context;
};
