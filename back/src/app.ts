import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { loadEnv } from './env';
import { HttpError, backendOrigin, corsHeaders, dd, getOrigin, readJsonBody, sendJson } from './lib';
import { poolManager } from './pool-manager';
import { authenticate } from './auth';
import { getEventsState, updateEventsState, type Ctx } from './outer-events';
import { saveTempSave, saveTempCheck } from './storage';
import { responseLog } from './response-log';

loadEnv();
const PORT = Number(process.env.PORT) || 3000;

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  backendOrigin.set(getOrigin(req)); // setOrigin middleware parity

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...corsHeaders(),
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers':
        (req.headers['access-control-request-headers'] as string) ?? '*',
    });
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  // all routes live under API_PREFIX (safe row '/tik' in prod; unset = root, local dev)
  const apiPrefix = (process.env.API_PREFIX ?? '').replace(/\/+$/, '');
  const routePath = apiPrefix
    ? url.pathname === apiPrefix
      ? '/'
      : url.pathname.startsWith(apiPrefix + '/')
        ? url.pathname.slice(apiPrefix.length)
        : null
    : url.pathname;
  if (routePath === null) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }
  const parts = routePath.split('/').filter(Boolean);
  const [a, b, c] = parts;

  // SSE stream (SPEC §3). AUTH_ENABLED=false (dev gate-off): no token lookup,
  // the URL :poolId IS the pool key. Ban gate always applies.
  if (req.method === 'GET' && a === 'sse' && b) {
    const userHandler = authEnabled() ? await authenticate(req) : b;
    const verification = poolManager.verifyConnection(req, b);
    if (!verification.allowed) {
      sendJson(res, 403, { error: 'banned', reason: verification.reason });
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders(),
    });
    poolManager.addConnection(userHandler, req, res, b);
    return;
  }

  // whole-pool config replace (SPEC §5; no auth — preserved quirk §11.1)
  if (req.method === 'POST' && a === 'pool' && b && c === 'config') {
    const body = await readJsonBody(req);
    poolManager.updateConfig(b, body.config);
    sendJson(res, 200, { success: true });
    return;
  }

  if (req.method === 'POST' && a === 'collectEventsState') {
    const ctx = await authCtx(req);
    sendJson(res, 200, await getEventsState(ctx));
    return;
  }

  if (req.method === 'POST' && a === 'updateEventsState') {
    const ctx = await authCtx(req);
    const result = await updateEventsState(ctx);
    sendJson(res, 200, { data: result });
    return;
  }

  if (req.method === 'POST' && a === 'admin' && b === 'cleanup') {
    sendJson(res, 200, { cleanedPools: poolManager.cleanupInactivePools() });
    return;
  }

  if (req.method === 'POST' && a === 'admin' && b === 'kick') {
    const { poolId, connectionId, ban, reason, banHours } = await readJsonBody(req);
    const result = poolManager.kickConnection(poolId, connectionId, {
      banClient: ban,
      reason,
      banDurationMs: banHours ? banHours * 60 * 60 * 1000 : undefined,
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && a === 'admin' && b === 'bans') {
    sendJson(res, 200, poolManager.getBannedClients());
    return;
  }

  if (req.method === 'DELETE' && a === 'admin' && b === 'bans' && c) {
    sendJson(res, 200, { success: poolManager.unbanClient(c) });
    return;
  }

  if (req.method === 'GET' && a === 'health') {
    sendJson(res, 200, poolManager.getHealthStatus());
    return;
  }

  if (req.method === 'POST' && a === 'logs') {
    sendJson(res, 200, responseLog.getAll());
    return;
  }

  if (req.method === 'POST' && a === 'save-temp' && b === 'save') {
    sendJson(res, 200, await saveTempSave(await readJsonBody(req)));
    return;
  }

  if (req.method === 'POST' && a === 'save-temp' && b === 'check') {
    sendJson(res, 200, await saveTempCheck(await readJsonBody(req)));
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

async function authCtx(req: IncomingMessage): Promise<Ctx> {
  const body = await readJsonBody(req);
  const userHandler = authEnabled() ? await authenticate(req) : body.poolId;
  if (!userHandler) {
    throw new HttpError(400, { error: 'poolId is required in body while auth is disabled' });
  }
  return { body, headers: req.headers, origin: getOrigin(req), userHandler };
}

/** Bearer + x-web-host-url gate; turned off with AUTH_ENABLED=false (temporary dev mode). */
const authEnabled = (): boolean => process.env.AUTH_ENABLED !== 'false';

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (error instanceof HttpError) {
      sendJson(res, error.status, error.body);
      return;
    }
    if (error instanceof SyntaxError) {
      sendJson(res, 400, { error: 'Invalid JSON body', code: 'INVALID_SYNTAX' });
      return;
    }
    console.error('Unhandled error:', error);
    sendJson(res, 500, { error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });
});

server.listen(PORT, () => {
  dd(`Server running on port ${PORT}`);
  setInterval(() => {
    const cleaned = poolManager.cleanupInactivePools();
    if (cleaned > 0) dd(`Cleaned up ${cleaned} inactive pools`);
  }, 5 * 60 * 1000);
});

const shutdown = (): void => {
  poolManager.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
