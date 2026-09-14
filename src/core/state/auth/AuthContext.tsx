import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile } from '../../../features/auth/domain/User';
import { AuthService } from '../../../features/auth/application/AuthService';
import { supabase } from '../../supabase/supabaseClient';

export interface AuthState {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthActions {
  refreshProfile: () => Promise<UserProfile | null>;
  signOut: () => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
}

const AuthStateContext = createContext<AuthState | undefined>(undefined);
const AuthDispatchContext = createContext<AuthActions | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

const AUTH_PROFILE_SNAPSHOT_KEY = 'kistas_auth_profile_snapshot';

const readProfileSnapshot = (): UserProfile | null => {
  try {
    const storage = typeof globalThis !== 'undefined'
      ? (globalThis as typeof globalThis & { sessionStorage?: Storage }).sessionStorage
      : undefined;
    const snapshot = storage?.getItem(AUTH_PROFILE_SNAPSHOT_KEY);
    if (!snapshot) return null;
    const profile = JSON.parse(snapshot) as UserProfile;
    return profile?.id && profile?.fullName ? profile : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile | null>(readProfileSnapshot);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const current = await AuthService.getCurrentProfile();
      setProfileState(current);
      return current;
    } catch (err) {
      console.warn('AuthContext refreshProfile hatası:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await AuthService.signOut();
    } finally {
      setProfileState(null);
    }
  }, []);

  const setProfile = useCallback((newProfile: UserProfile | null) => {
    setProfileState(newProfile);
  }, []);

  useEffect(() => {
    // 1. İlk oturum kontrolü
    refreshProfile();

    // 2. Canlı Supabase Auth Dinleyicisi
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await refreshProfile();
      } else {
        setProfileState(null);
        setIsLoading(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [refreshProfile]);

  useEffect(() => {
    try {
      const storage = typeof globalThis !== 'undefined'
        ? (globalThis as typeof globalThis & { sessionStorage?: Storage }).sessionStorage
        : undefined;
      if (profile) {
        storage?.setItem(AUTH_PROFILE_SNAPSHOT_KEY, JSON.stringify(profile));
      } else if (!isLoading) {
        storage?.removeItem(AUTH_PROFILE_SNAPSHOT_KEY);
      }
    } catch {
      // Oturum görünümü önbelleği kullanılamıyorsa kimlik akışı normal devam eder.
    }
  }, [isLoading, profile]);

  // Referans bütünlüğü: State sadece profil veya loading değiştiğinde güncellenir
  const stateValue = useMemo<AuthState>(() => ({
    profile,
    isAuthenticated: !!profile,
    isLoading,
  }), [profile, isLoading]);

  // Referans bütünlüğü: Action fonksiyonları useCallback ve useMemo ile sabitlenir
  const dispatchValue = useMemo<AuthActions>(() => ({
    refreshProfile,
    signOut,
    setProfile,
  }), [refreshProfile, signOut, setProfile]);

  return (
    <AuthDispatchContext.Provider value={dispatchValue}>
      <AuthStateContext.Provider value={stateValue}>
        {children}
      </AuthStateContext.Provider>
    </AuthDispatchContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthActions = (): AuthActions => {
  const context = useContext(AuthDispatchContext);
  if (!context) {
    throw new Error('useAuthActions must be used within an AuthProvider');
  }
  return context;
};
