import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWebAuthn } from '../../hooks/useWebAuthn';
import type { AuthState, SessionInfo, PasskeyInfo } from '../../types';

interface AuthContextType extends AuthState {
  isSupported: boolean;
  webAuthnLoading: boolean;
  webAuthnError: string | null;
  register: (memberId: string, memberName: string, friendlyName?: string) => Promise<SessionInfo>;
  authenticate: (memberId: string) => Promise<SessionInfo>;
  checkHasPasskeys: (memberId: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setSession: (session: SessionInfo) => void;
  listPasskeys: () => Promise<PasskeyInfo[]>;
  deletePasskey: (passkeyId: string) => Promise<void>;
  clearWebAuthnError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const webAuthn = useWebAuthn();

  // Wrap register to also update auth state
  const register = async (memberId: string, memberName: string, friendlyName?: string): Promise<SessionInfo> => {
    const session = await webAuthn.register(memberId, memberName, friendlyName);
    auth.setSession(session);
    return session;
  };

  // Wrap authenticate to also update auth state
  const authenticate = async (memberId: string): Promise<SessionInfo> => {
    const session = await webAuthn.authenticate(memberId);
    auth.setSession(session);
    return session;
  };

  const value: AuthContextType = {
    // Auth state
    authenticated: auth.authenticated,
    session: auth.session,
    loading: auth.loading,

    // WebAuthn state
    isSupported: webAuthn.isSupported,
    webAuthnLoading: webAuthn.loading,
    webAuthnError: webAuthn.error,

    // Actions
    register,
    authenticate,
    checkHasPasskeys: webAuthn.checkHasPasskeys,
    logout: auth.logout,
    setSession: auth.setSession,
    listPasskeys: auth.listPasskeys,
    deletePasskey: auth.deletePasskey,
    clearWebAuthnError: webAuthn.clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
