import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { Farmer, Lang } from '../types';
import { storage } from '../storage';
import { api, deriveOcrFromExtractionData } from '../api';

interface AuthState {
  loading: boolean;
  token: string | null;
  mobile: string | null;
  farmer: Farmer | null;
  lang: Lang;
  justLoggedIn: boolean;
  reuploadRequested: boolean;
}

type AuthAction =
  | { type: 'INIT'; payload: { token: string | null; mobile: string | null; farmer: Farmer | null; lang: Lang } }
  | { type: 'LOGIN'; payload: { token: string; mobile: string; farmer: Farmer | null } }
  | { type: 'UPDATE_FARMER'; payload: Farmer | null }
  | { type: 'SET_LANG'; payload: Lang }
  | { type: 'CLEAR_JUST_LOGGED_IN' }
  | { type: 'REQUEST_REUPLOAD' }
  | { type: 'CLEAR_REUPLOAD' }
  | { type: 'LOGOUT' };

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'INIT':
      return { loading: false, justLoggedIn: false, reuploadRequested: false, ...action.payload };
    case 'LOGIN':
      return { ...state, loading: false, justLoggedIn: true, reuploadRequested: false, ...action.payload };
    case 'UPDATE_FARMER':
      return { ...state, farmer: action.payload };
    case 'SET_LANG':
      return { ...state, lang: action.payload };
    case 'CLEAR_JUST_LOGGED_IN':
      return { ...state, justLoggedIn: false };
    case 'REQUEST_REUPLOAD':
      return { ...state, reuploadRequested: true };
    case 'CLEAR_REUPLOAD':
      return { ...state, reuploadRequested: false };
    case 'LOGOUT':
      return { loading: false, token: null, mobile: null, farmer: null, lang: state.lang, justLoggedIn: false, reuploadRequested: false };
    default:
      return state;
  }
}

interface AuthContextValue {
  state: AuthState;
  login: (token: string, mobile: string, farmer: Farmer | null) => Promise<void>;
  logout: () => Promise<void>;
  refreshFarmer: () => Promise<void>;
  updateFarmer: (farmer: Farmer | null) => void;
  setLang: (lang: Lang) => void;
  clearJustLoggedIn: () => void;
  requestReupload: () => void;
  clearReupload: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  state: { loading: true, token: null, mobile: null, farmer: null, lang: 'en', justLoggedIn: false, reuploadRequested: false },
  login: async () => {},
  logout: async () => {},
  refreshFarmer: async () => {},
  updateFarmer: () => {},
  setLang: () => {},
  clearJustLoggedIn: () => {},
  requestReupload: () => {},
  clearReupload: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    loading: true,
    token: null,
    mobile: null,
    farmer: null,
    lang: 'en',
    justLoggedIn: false,
    reuploadRequested: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const [session, lang] = await Promise.all([
          storage.loadSession(),
          storage.loadLang(),
        ]);
        const storedFarmer = session.farmer as Farmer | null;
        if (storedFarmer) deriveOcrFromExtractionData(storedFarmer as unknown as Record<string, unknown>);
        dispatch({
          type: 'INIT',
          payload: {
            token: session.token,
            mobile: session.mobile,
            farmer: storedFarmer,
            lang: (lang as Lang | null) ?? 'en',
          },
        });
      } catch {
        dispatch({
          type: 'INIT',
          payload: { token: null, mobile: null, farmer: null, lang: 'en' },
        });
      }
    })();
  }, []);

  const login = useCallback(async (token: string, mobile: string, farmer: Farmer | null) => {
    if (farmer) deriveOcrFromExtractionData(farmer as unknown as Record<string, unknown>);
    await storage.saveSession(token, mobile);
    if (farmer) await storage.saveFarmer(farmer);
    dispatch({ type: 'LOGIN', payload: { token, mobile, farmer } });
  }, []);

  const logout = useCallback(async () => {
    await storage.clearSession();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const refreshFarmer = useCallback(async () => {
    if (!state.mobile) return;
    try {
      const farmer = await api.getFarmerByPhone(state.mobile);
      // If the production API returns extractionData instead of merged ocr,
      // derive the ocr sections client-side so the profile screen shows full detail.
      deriveOcrFromExtractionData(farmer as unknown as Record<string, unknown>);
      await storage.saveFarmer(farmer);
      dispatch({ type: 'UPDATE_FARMER', payload: farmer });
    } catch {
      // Silently ignore — keep existing farmer state
    }
  }, [state.mobile]);

  const updateFarmer = useCallback((farmer: Farmer | null) => {
    if (farmer) storage.saveFarmer(farmer).catch(() => {});
    dispatch({ type: 'UPDATE_FARMER', payload: farmer });
  }, []);

  const setLang = useCallback((lang: Lang) => {
    storage.saveLang(lang).catch(() => {});
    dispatch({ type: 'SET_LANG', payload: lang });
  }, []);

  const clearJustLoggedIn = useCallback(() => {
    dispatch({ type: 'CLEAR_JUST_LOGGED_IN' });
  }, []);

  const requestReupload = useCallback(() => {
    dispatch({ type: 'REQUEST_REUPLOAD' });
  }, []);

  const clearReupload = useCallback(() => {
    dispatch({ type: 'CLEAR_REUPLOAD' });
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, logout, refreshFarmer, updateFarmer, setLang, clearJustLoggedIn, requestReupload, clearReupload }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
