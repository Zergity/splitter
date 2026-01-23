import type { AuthEnv } from '../types/auth';
import { getTokenFromCookies, verifySession, createSession, createAuthCookie } from '../utils/jwt';

interface Group {
  id: string;
  name: string;
  currency: string;
  members: { id: string; name: string }[];
  createdAt: string;
}

// PUT /api/auth/profile - Update current user's profile (name)
export const onRequestPut: PagesFunction<AuthEnv> = async (context) => {
  try {
    const token = getTokenFromCookies(context.request);

    if (!token) {
      return Response.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const session = await verifySession(context.env, token);

    if (!session) {
      return Response.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    const { name } = await context.request.json() as { name?: string };

    if (!name || !name.trim()) {
      return Response.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Get group and update member name
    const group = await context.env.SPLITTER_KV.get<Group>('group', 'json');

    if (!group) {
      return Response.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Check if name already exists (case-insensitive, excluding current user)
    const nameExists = group.members.some(
      m => m.id !== session.memberId && m.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (nameExists) {
      return Response.json(
        { success: false, error: 'Name already taken' },
        { status: 400 }
      );
    }

    // Update the member's name
    const updatedMembers = group.members.map(m => {
      if (m.id === session.memberId) {
        return { ...m, name: trimmedName };
      }
      return m;
    });

    const updatedGroup = { ...group, members: updatedMembers };
    await context.env.SPLITTER_KV.put('group', JSON.stringify(updatedGroup));

    // Create new session with updated name
    const { session: newSession, token: newToken } = await createSession(
      context.env,
      session.memberId,
      trimmedName
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          member: { id: session.memberId, name: trimmedName },
          session: {
            memberId: newSession.memberId,
            memberName: newSession.memberName,
            expiresAt: newSession.expiresAt,
          },
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createAuthCookie(newToken),
        },
      }
    );
  } catch (error) {
    console.error('Profile update error:', error);
    return Response.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
};
