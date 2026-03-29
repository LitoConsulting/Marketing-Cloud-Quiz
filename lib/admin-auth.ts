import { NextRequest } from 'next/server';

export function isAdminAuthed(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_session');
  return cookie?.value === process.env.ADMIN_PASSWORD;
}
