import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthEnv } from '../../types/auth';
import { consumeChallenge } from '../../utils/challenges';
import { updateCredential, base64ToUint8Array, findCredentialOwner } from '../../utils/credentials';
import { createSession, createAuthCookie } from '../../utils/jwt';

// Helper to get member from group data
async function getMember(env: AuthEnv, memberId: string): Promise<{ id: string; name: string } | null> {
  const group = await env.SPLITTER_KV.get<{ members: { id: string; name: string }[] }>('group', 'json');
  if (!group) return null;
  return group.members.find(m => m.id === memberId) || null;
}

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  try {
    const { credential } = await context.request.json() as { credential: any };

    if (!credential) {
      return Response.json(
        { success: false, error: 'credential is required' },
        { status: 400 }
      );
    }

    const env = context.env;

    // Find the credential owner by looking up the credential ID
    const credentialData = await findCredentialOwner(env, credential.id);
    if (!credentialData) {
      return Response.json(
        { success: false, error: 'Passkey not found. Please register first.' },
        { status: 400 }
      );
    }

    const { memberId, credential: storedCredential } = credentialData;

    // Get and consume the challenge (one-time use)
    // Challenge was stored with the challenge value as part of the key
    const expectedChallenge = await consumeChallenge(env, `login:${credential.response.clientDataJSON}`, 'authentication');

    // For discoverable credentials, we stored challenge differently
    // Let's try to get it by the challenge in the response
    const clientDataJSON = JSON.parse(atob(credential.response.clientDataJSON));
    const challenge = clientDataJSON.challenge;

    const validChallenge = await consumeChallenge(env, `login:${challenge}`, 'authentication');
    if (!validChallenge) {
      return Response.json(
        { success: false, error: 'Challenge expired or not found. Please try again.' },
        { status: 400 }
      );
    }

    // Determine origin from request or env
    const origin = env.RP_ORIGIN || new URL(context.request.url).origin;
    const rpID = env.RP_ID || 'localhost';

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: validChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: base64ToUint8Array(storedCredential.id),
        publicKey: storedCredential.publicKey,
        counter: storedCredential.counter,
        transports: storedCredential.transports,
      },
    });

    if (!verification.verified) {
      return Response.json(
        { success: false, error: 'Authentication verification failed' },
        { status: 400 }
      );
    }

    // Update the credential counter to prevent replay attacks
    await updateCredential(env, memberId, storedCredential.id, {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date().toISOString(),
    });

    // Get member info
    const member = await getMember(env, memberId);
    if (!member) {
      return Response.json(
        { success: false, error: 'Member not found' },
        { status: 400 }
      );
    }

    // Create session
    const { session, token } = await createSession(env, memberId, member.name);

    // Set cookie and return response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          verified: true,
          session: {
            memberId: session.memberId,
            memberName: session.memberName,
            expiresAt: session.expiresAt,
          },
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createAuthCookie(token),
        },
      }
    );
  } catch (error) {
    console.error('Login verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { success: false, error: `Failed to verify authentication: ${errorMessage}` },
      { status: 500 }
    );
  }
};
