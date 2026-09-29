import Pusher from 'pusher-js';

let pusherInstance: Pusher | null = null;

/** Returns null when Pusher isn't configured (e.g. local dev); the app then runs on polling alone. */
export function getPusherClient(): Pusher | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;
  if (!pusherInstance) {
    pusherInstance = new Pusher(key, { cluster });
  }
  return pusherInstance;
}
