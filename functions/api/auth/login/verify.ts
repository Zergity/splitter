import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthEnv, LoginVerifyRequest } from '../../types/auth';
import { consumeChallenge } from '../../utils/challenges';
import { getCredentials, updateCredential, base64ToUint8Array } from '../../utils/credentials';
import { createSession, createAuthCookie } from '../../utils/jwt';

// Helper to get member name from group data
async function getMemberName(env: AuthEnv, memberId: string): Promise<string | null> {
  const group = await env.SPLITTER_KV.get<{ members: { id: string; name: string }[] }>('group', 'json');
  if (!group) return null;
  const member = group.members.find(m => m.id === memberId);
  return member?.name || null;
}

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  try {
    const { memberId, credential } = await context.request.json() as LoginVerifyRequest;

    if (!memberId || !credential) {
      return Response.json(
        { success: false, error: 'memberId and credential are required' },
        { status: 400 }
      );
    }

    const env = context.env;

    // Get and consume the challenge (one-time use)
    const expectedChallenge = await consumeChallenge(env, memberId, 'authentication');
    if (!expectedChallenge) {
      return Response.json(
        { success: false, error: 'Challenge expired or not found. Please try again.' },
        { status: 400 }
      );
    }

    // Get the stored credential
    const credentials = await getCredentials(env, memberId);
    const storedCredential = credentials.find(c => c.id === credential.id);

    if (!storedCredential) {
      return Response.json(
        { success: false, error: 'Credential not found' },
        { status: 400 }
      );
    }

    // Determine origin from request or env
    const origin = env.RP_ORIGIN || new URL(context.request.url).origin;
    const rpID = env.RP_ID || 'localhost';

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
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

    // Get member name
    const memberName = await getMemberName(env, memberId);
    if (!memberName) {
      return Response.json(
        { success: false, error: 'Member not found' },
        { status: 400 }
      );
    }

    // Create session
    const { session, token } = await createSession(env, memberId, memberName);

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
    return Response.json(
      { success: false, error: 'Failed to verify authentication' },
      { status: 500 }
    );
  }
};
