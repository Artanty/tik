import type { IncomingMessage, ServerResponse } from 'http';

const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

export const dd = (value: unknown): void => {
  const prefix = `[${process.env.PROJECT_ID ?? 'UNKNOWN_PROJECT'}]`;
  if (typeof value === 'string') {
    console.log(`${CYAN}${prefix} ${value}${RESET}`);
  } else {
    console.log(`${CYAN}${prefix}${RESET}`);
    console.log(value);
  }
};

/** Error carrying an HTTP status + JSON body — caught by the top-level handler. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(typeof body === 'object' && body && 'error' in body ? String((body as any).error) : 'HttpError');
  }
}

export const corsHeaders = (): Record<string, string> => ({
  'Access-Control-Allow-Origin': '*',
});

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders() });
  res.end(JSON.stringify(body));
}

export function readJsonBody(req: IncomingMessage, limitBytes = 1024 * 1024): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new SyntaxError('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * This back's origin. x-forwarded-proto honored so the value matches the URL this
 * service is registered under in key@back when sitting behind a proxy.
 */
export function getOrigin(req: IncomingMessage): string {
  const fwdProto = req.headers['x-forwarded-proto'];
  const proto = (Array.isArray(fwdProto) ? fwdProto[0] : fwdProto)
    ?? ((req.socket as any).encrypted ? 'https' : 'http');
  return `${proto}://${req.headers.host ?? 'unknown'}`;
}

export function getClientIp(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd.join(',') : fwd;
  return [raw, req.socket.remoteAddress]
    .filter(Boolean)
    .toString()
    .split(',')[0]
    .trim();
}

/** Last request's origin — key@ calls must present the origin tik is registered under. */
let cachedOrigin: string | null = null;
export const backendOrigin = {
  set: (origin: string): void => {
    cachedOrigin = origin;
  },
  get: (): string => {
    if (!cachedOrigin) throw new Error('Backend origin not set. Call set() first.');
    return cachedOrigin;
  },
};
