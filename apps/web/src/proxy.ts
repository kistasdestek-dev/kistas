import { type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/create-listing/:path*',
    '/launch-archive/:path*',
    '/credits/:path*',
    '/dashboard/:path*',
    '/messages/:path*',
    '/profile/:path*',
  ],
};
