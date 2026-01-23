import { generateAuthenticationOptions } from '@simplewebauthn/server';
import type { AuthEnv, LoginOptionsRequest } from '../../types/auth';
import { storeChallenge } from '../../utils/challenges';
import { getCredentials, hasPasskeys } from '../../utils/credentials';

export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  try {
    const { memberId } = await context.request.json() as LoginOptionsRequest;

    if (!memberId) {
      return Response.json(
        { success: false, error: 'memberId is required' },
        { status: 400 }
      );
    }

    const env = context.env;

    // Check if user has any registered passkeys
    const hasKeys = await hasPasskeys(env, memberId);
    if (!hasKeys) {
      return Response.json(
        { success: false, error: 'No passkeys registered for this user', code: 'NO_PASSKEYS' },
        { status: 404 }
      );
    }

    // Get user's credentials
    const credentials = await getCredentials(env, memberId);

    const options = await generateAuthenticationOptions({
      rpID: env.RP_ID || 'localhost',
      allowCredentials: credentials.map(cred => ({
        id: cred.id,
        transports: cred.transports,
      })),
      userVerification: 'preferred',
    });

    // Store challenge for verification
    await storeChallenge(env, memberId, options.challenge, 'authentication');

    return Response.json({
      success: true,
      data: { options },
    });
  } catch (error) {
    console.error('Login options error:', error);
    return Response.json(
      { success: false, error: 'Failed to generate authentication options' },
      { status: 500 }
    );
  }
};
