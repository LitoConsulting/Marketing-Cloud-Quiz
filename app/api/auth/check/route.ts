import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: isAdminAuthed(req) });
}
