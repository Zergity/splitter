import type { AuthEnv } from '../types/auth';
import { verifySession, getTokenFromCookies } from '../utils/jwt';

interface ReceiptsEnv extends AuthEnv {
  RECEIPTS_BUCKET: R2Bucket;
}

export const onRequestGet: PagesFunction<ReceiptsEnv> = async (context) => {
  try {
    // Verify authentication
    const token = getTokenFromCookies(context.request);
    if (!token) {
      return Response.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const session = await verifySession(context.env, token);
    if (!session) {
      return Response.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Get the path from params
    const pathParts = context.params.path;
    if (!pathParts || !Array.isArray(pathParts)) {
      return Response.json(
        { success: false, error: 'Invalid path' },
        { status: 400 }
      );
    }

    const objectKey = pathParts.join('/');

    // Validate the path starts with 'receipts/'
    if (!objectKey.startsWith('receipts/')) {
      return Response.json(
        { success: false, error: 'Invalid receipt path' },
        { status: 400 }
      );
    }

    // Get the object from R2
    const object = await context.env.RECEIPTS_BUCKET.get(objectKey);

    if (!object) {
      return Response.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Return the image with proper content type
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'private, max-age=3600');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Receipt serving error:', error);
    return Response.json(
      { success: false, error: 'Failed to serve receipt' },
      { status: 500 }
    );
  }
};
