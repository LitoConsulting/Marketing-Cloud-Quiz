import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminToken, isValidPassword } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const token = adminToken();
  if (!token || !isValidPassword(password)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });
  return res;
}
