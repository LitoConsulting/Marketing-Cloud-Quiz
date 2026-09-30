// In-memory stand-in for the Upstash Redis REST API, for local development and testing
// without real credentials. Implements only the commands this app uses.
//
//   node scripts/mock-upstash.mjs            (listens on :8079)
//   UPSTASH_REDIS_REST_URL=http://localhost:8079 UPSTASH_REDIS_REST_TOKEN=local npm run dev
import http from 'node:http';

const PORT = Number(process.env.MOCK_UPSTASH_PORT ?? 8079);
const strings = new Map();
const hashes = new Map();

const hash = (key) => {
  if (!hashes.has(key)) hashes.set(key, new Map());
  return hashes.get(key);
};

function run([rawCmd, ...args]) {
  const cmd = String(rawCmd).toUpperCase();
  switch (cmd) {
    case 'PING':
      return 'PONG';
    case 'GET':
      return strings.get(args[0]) ?? null;
    case 'SET': {
      const [key, value, ...opts] = args;
      const nx = opts.some((o) => String(o).toUpperCase() === 'NX');
      if (nx && (strings.has(key) || hashes.has(key))) return null;
      strings.set(key, String(value));
      return 'OK';
    }
    case 'DEL':
      return args.reduce((n, k) => n + (strings.delete(k) | hashes.delete(k)), 0);
    case 'EXPIRE':
      return strings.has(args[0]) || hashes.has(args[0]) ? 1 : 0;
    case 'HGET':
      return hashes.get(args[0])?.get(String(args[1])) ?? null;
    case 'HSET': {
      const h = hash(args[0]);
      let added = 0;
      for (let i = 1; i < args.length; i += 2) {
        if (!h.has(String(args[i]))) added++;
        h.set(String(args[i]), String(args[i + 1]));
      }
      return added;
    }
    case 'HSETNX': {
      const h = hash(args[0]);
      if (h.has(String(args[1]))) return 0;
      h.set(String(args[1]), String(args[2]));
      return 1;
    }
    case 'HGETALL': {
      const h = hashes.get(args[0]);
      return h ? [...h.entries()].flat() : [];
    }
    case 'HLEN':
      return hashes.get(args[0])?.size ?? 0;
    case 'FLUSHALL':
      strings.clear();
      hashes.clear();
      return 'OK';
    default:
      throw new Error(`mock-upstash: unsupported command ${cmd}`);
  }
}

const b64 = (v) => Buffer.from(v, 'utf8').toString('base64');
function encode(result, base64) {
  if (!base64) return result;
  if (typeof result === 'string') return result === 'OK' ? result : b64(result);
  if (Array.isArray(result)) return result.map((v) => (typeof v === 'string' ? b64(v) : v));
  return result;
}

http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const base64 = req.headers['upstash-encoding'] === 'base64';
      res.setHeader('Content-Type', 'application/json');
      try {
        const parsed = JSON.parse(body || '[]');
        if (req.url?.startsWith('/pipeline') || req.url?.startsWith('/multi-exec')) {
          res.end(JSON.stringify(parsed.map((c) => ({ result: encode(run(c), base64) }))));
        } else {
          res.end(JSON.stringify({ result: encode(run(parsed), base64) }));
        }
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: String(err.message ?? err) }));
      }
    });
  })
  .listen(PORT, () => console.log(`mock-upstash listening on http://localhost:${PORT}`));
