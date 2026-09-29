import { NextRequest } from 'next/server';

export const PLAYER_COOKIE = 'player_id';

// The tab-specific X-Player-Id header (from sessionStorage) wins over the cookie,
// so several players can be tested side by side in one browser.
export function getPlayerId(req: NextRequest): string | null {
  return req.headers.get('X-Player-Id') || req.cookies.get(PLAYER_COOKIE)?.value || null;
}
