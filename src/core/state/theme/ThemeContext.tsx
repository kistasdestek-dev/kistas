import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { theme as defaultTheme, Theme } from '../../theme';

export type ThemeMode = 'dark' | 'light';

export interface ThemeState {
  theme: Theme;
  mode: ThemeMode;
}

export interface ThemeActions {
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeStateContext = createContext<ThemeState | undefined>(undefined);
const ThemeDispatchContext = createContext<ThemeActions | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialMode = 'dark',
}) => {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Referans bütünlüğü: State objesi sadece mode değiştiğinde yeniden üretilir
  const stateValue = useMemo<ThemeState>(() => ({
    theme: defaultTheme,
    mode,
  }), [mode]);

  // Referans bütünlüğü: Dispatch objesi asla yeniden üretilmez
  const dispatchValue = useMemo<ThemeActions>(() => ({
    setMode,
    toggleMode,
  }), [setMode, toggleMode]);

  return (
    <ThemeDispatchContext.Provider value={dispatchValue}>
      <ThemeStateContext.Provider value={stateValue}>
        {children}
      </ThemeStateContext.Provider>
    </ThemeDispatchContext.Provider>
  );
};

export const useTheme = (): ThemeState => {
  const context = useContext(ThemeStateContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useThemeActions = (): ThemeActions => {
  const context = useContext(ThemeDispatchContext);
  if (!context) {
    throw new Error('useThemeActions must be used within a ThemeProvider');
  }
  return context;
};
