import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { SessionInfo, PasskeyInfo, ApiResponse } from '../types';

const API_BASE = '/api/auth';

interface AuthApiResponse<T> extends ApiResponse<T> {
  code?: string;
}

async function fetchAuthApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies for session
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data: AuthApiResponse<T> = await response.json();

  if (!data.success) {
    const error = new Error(data.error || 'Auth request failed') as Error & { code?: string };
    error.code = data.code;
    throw error;
  }

  return data.data as T;
}

// Check if member has passkeys registered
export async function checkHasPasskeys(memberId: string): Promise<boolean> {
  const result = await fetchAuthApi<{ hasPasskeys: boolean }>('/check', {
    method: 'POST',
    body: JSON.stringify({ memberId }),
  });
  return result.hasPasskeys;
}

// Registration
export async function getRegistrationOptions(
  memberId: string,
  memberName: string
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const result = await fetchAuthApi<{ options: PublicKeyCredentialCreationOptionsJSON }>(
    '/register/options',
    {
      method: 'POST',
      body: JSON.stringify({ memberId, memberName }),
    }
  );
  return result.options;
}

export async function verifyRegistration(
  memberId: string,
  memberName: string,
  credential: unknown,
  friendlyName?: string
): Promise<SessionInfo> {
  const result = await fetchAuthApi<{ verified: boolean; session: SessionInfo }>(
    '/register/verify',
    {
      method: 'POST',
      body: JSON.stringify({ memberId, memberName, credential, friendlyName }),
    }
  );
  if (!result.session) {
    throw new Error('Registration verification failed');
  }
  return result.session;
}

// Login
export async function getLoginOptions(
  memberId: string
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const result = await fetchAuthApi<{ options: PublicKeyCredentialRequestOptionsJSON }>(
    '/login/options',
    {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    }
  );
  return result.options;
}

export async function verifyLogin(
  memberId: string,
  credential: unknown
): Promise<SessionInfo> {
  const result = await fetchAuthApi<{ verified: boolean; session: SessionInfo }>(
    '/login/verify',
    {
      method: 'POST',
      body: JSON.stringify({ memberId, credential }),
    }
  );
  if (!result.session) {
    throw new Error('Login verification failed');
  }
  return result.session;
}

// Session management
export async function checkSession(): Promise<{ authenticated: boolean; session?: SessionInfo }> {
  return fetchAuthApi<{ authenticated: boolean; session?: SessionInfo }>('/session');
}

export async function logout(): Promise<void> {
  await fetchAuthApi<{ loggedOut: boolean }>('/session', {
    method: 'DELETE',
  });
}

// Passkey management
export async function listPasskeys(): Promise<PasskeyInfo[]> {
  const result = await fetchAuthApi<{ passkeys: PasskeyInfo[] }>('/passkeys');
  return result.passkeys;
}

export async function deletePasskey(passkeyId: string): Promise<void> {
  await fetchAuthApi<{ deleted: boolean }>(`/passkeys/${encodeURIComponent(passkeyId)}`, {
    method: 'DELETE',
  });
}
