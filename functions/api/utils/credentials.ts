import type { StoredCredential, AuthEnv } from '../types/auth';
import { KV_KEYS } from '../types/auth';

// Helper to convert Uint8Array to base64url string for storage
export function uint8ArrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Helper to convert base64url string back to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const base64Std = base64.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64Std.length % 4 === 0 ? '' : '='.repeat(4 - (base64Std.length % 4));
  const binary = atob(base64Std + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Serializable version of StoredCredential for KV storage
interface SerializedCredential {
  id: string;
  publicKey: string; // base64url encoded
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports?: string[];
  createdAt: string;
  lastUsedAt?: string;
  friendlyName?: string;
}

function serializeCredential(cred: StoredCredential): SerializedCredential {
  return {
    ...cred,
    publicKey: uint8ArrayToBase64(cred.publicKey),
  };
}

function deserializeCredential(cred: SerializedCredential): StoredCredential {
  return {
    ...cred,
    publicKey: base64ToUint8Array(cred.publicKey),
  } as StoredCredential;
}

// Get all credentials for a member
export async function getCredentials(
  env: AuthEnv,
  memberId: string
): Promise<StoredCredential[]> {
  const data = await env.SPLITTER_KV.get<SerializedCredential[]>(
    KV_KEYS.credentials(memberId),
    'json'
  );
  if (!data) return [];
  return data.map(deserializeCredential);
}

// Add a new credential for a member
export async function addCredential(
  env: AuthEnv,
  memberId: string,
  credential: StoredCredential
): Promise<void> {
  const existing = await getCredentials(env, memberId);
  const serialized = existing.map(serializeCredential);
  serialized.push(serializeCredential(credential));
  await env.SPLITTER_KV.put(
    KV_KEYS.credentials(memberId),
    JSON.stringify(serialized)
  );
}

// Update a credential (e.g., counter after authentication)
export async function updateCredential(
  env: AuthEnv,
  memberId: string,
  credentialId: string,
  updates: Partial<Pick<StoredCredential, 'counter' | 'lastUsedAt'>>
): Promise<void> {
  const credentials = await getCredentials(env, memberId);
  const updated = credentials.map(cred => {
    if (cred.id === credentialId) {
      return { ...cred, ...updates };
    }
    return cred;
  });
  const serialized = updated.map(serializeCredential);
  await env.SPLITTER_KV.put(
    KV_KEYS.credentials(memberId),
    JSON.stringify(serialized)
  );
}

// Delete a credential
export async function deleteCredential(
  env: AuthEnv,
  memberId: string,
  credentialId: string
): Promise<boolean> {
  const credentials = await getCredentials(env, memberId);
  const filtered = credentials.filter(c => c.id !== credentialId);

  if (filtered.length === credentials.length) {
    return false; // Credential not found
  }

  if (filtered.length === 0) {
    await env.SPLITTER_KV.delete(KV_KEYS.credentials(memberId));
  } else {
    const serialized = filtered.map(serializeCredential);
    await env.SPLITTER_KV.put(
      KV_KEYS.credentials(memberId),
      JSON.stringify(serialized)
    );
  }
  return true;
}

// Check if a member has any passkeys registered
export async function hasPasskeys(
  env: AuthEnv,
  memberId: string
): Promise<boolean> {
  const credentials = await getCredentials(env, memberId);
  return credentials.length > 0;
}

// Find a credential by ID
export async function findCredentialById(
  env: AuthEnv,
  memberId: string,
  credentialId: string
): Promise<StoredCredential | null> {
  const credentials = await getCredentials(env, memberId);
  return credentials.find(c => c.id === credentialId) || null;
}
