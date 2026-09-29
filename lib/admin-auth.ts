import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';

export const ADMIN_COOKIE = 'admin_session';

// The cookie holds an HMAC derived from the password, never the password itself.
export function adminToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac('sha256', password).update('quiz-admin-session-v1').digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isValidPassword(password: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && typeof password === 'string' && safeEqual(password, expected!);
}

export function isAdminAuthed(req: NextRequest): boolean {
  const token = adminToken();
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  return Boolean(token && cookie && safeEqual(cookie, token));
}
