import type { StoredChallenge, AuthEnv } from '../types/auth';
import { KV_KEYS, CHALLENGE_TTL_SECONDS } from '../types/auth';

// Store a challenge for WebAuthn registration or authentication
export async function storeChallenge(
  env: AuthEnv,
  memberId: string,
  challenge: string,
  type: 'registration' | 'authentication'
): Promise<void> {
  const now = Date.now();
  const storedChallenge: StoredChallenge = {
    challenge,
    type,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + CHALLENGE_TTL_SECONDS * 1000).toISOString(),
  };

  await env.SPLITTER_KV.put(
    KV_KEYS.challenge(memberId),
    JSON.stringify(storedChallenge),
    { expirationTtl: CHALLENGE_TTL_SECONDS }
  );
}

// Get and consume a challenge (one-time use)
export async function consumeChallenge(
  env: AuthEnv,
  memberId: string,
  expectedType: 'registration' | 'authentication'
): Promise<string | null> {
  const key = KV_KEYS.challenge(memberId);
  const data = await env.SPLITTER_KV.get<StoredChallenge>(key, 'json');

  if (!data) return null;

  // Delete the challenge immediately (one-time use)
  await env.SPLITTER_KV.delete(key);

  // Check if challenge has expired
  if (new Date(data.expiresAt) < new Date()) {
    return null;
  }

  // Check if challenge type matches
  if (data.type !== expectedType) {
    return null;
  }

  return data.challenge;
}

// Clean up expired challenge (called if verification fails)
export async function deleteChallenge(
  env: AuthEnv,
  memberId: string
): Promise<void> {
  await env.SPLITTER_KV.delete(KV_KEYS.challenge(memberId));
}
