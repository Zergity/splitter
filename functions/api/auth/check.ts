import type { AuthEnv } from '../types/auth';
import { hasPasskeys } from '../utils/credentials';

// POST /api/auth/check - Check if a member has passkeys registered
export const onRequestPost: PagesFunction<AuthEnv> = async (context) => {
  try {
    const { memberId } = await context.request.json() as { memberId: string };

    if (!memberId) {
      return Response.json(
        { success: false, error: 'memberId is required' },
        { status: 400 }
      );
    }

    const hasKeys = await hasPasskeys(context.env, memberId);

    return Response.json({
      success: true,
      data: { hasPasskeys: hasKeys },
    });
  } catch (error) {
    console.error('Check passkeys error:', error);
    return Response.json(
      { success: false, error: 'Failed to check passkeys' },
      { status: 500 }
    );
  }
};
