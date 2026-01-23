import { useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';
import type { AuthState, SessionInfo, PasskeyInfo } from '../types';

interface UseAuthReturn extends AuthState {
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: SessionInfo) => void;
  listPasskeys: () => Promise<PasskeyInfo[]>;
  deletePasskey: (passkeyId: string) => Promise<void>;
  updateProfile: (name: string) => Promise<SessionInfo>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    session: null,
    loading: true,
  });

  const checkSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const result = await authApi.checkSession();
      setState({
        authenticated: result.authenticated,
        session: result.session || null,
        loading: false,
      });
    } catch {
      setState({
        authenticated: false,
        session: null,
        loading: false,
      });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setState({
        authenticated: false,
        session: null,
        loading: false,
      });
    }
  }, []);

  const setSession = useCallback((session: SessionInfo) => {
    setState({
      authenticated: true,
      session,
      loading: false,
    });
  }, []);

  const listPasskeys = useCallback(async (): Promise<PasskeyInfo[]> => {
    return authApi.listPasskeys();
  }, []);

  const deletePasskey = useCallback(async (passkeyId: string): Promise<void> => {
    await authApi.deletePasskey(passkeyId);
  }, []);

  const updateProfile = useCallback(async (name: string): Promise<SessionInfo> => {
    const session = await authApi.updateProfile(name);
    setState({
      authenticated: true,
      session,
      loading: false,
    });
    return session;
  }, []);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return {
    ...state,
    checkSession,
    logout,
    setSession,
    listPasskeys,
    deletePasskey,
    updateProfile,
  };
}
