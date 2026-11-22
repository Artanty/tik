import type { IncomingMessage } from 'http';
import { join } from 'path';
import { HttpError, dd } from './lib';
import { STORAGE_ROOT, sanitizePath, createShortHash, checkFileWithData } from './storage';

/**
 * validateUserAccessToken (SPEC §6): Bearer token + x-web-host-url -> memory cache ->
 * storage/<sanitize(encodeURIComponent(hostOrigin))>/<md5_16(token)>.json whose
 * .accessToken matches. Returns the file's userHandler (the pool key).
 */
export async function authenticate(req: IncomingMessage): Promise<string> {
  dd('validateUserAccessToken START');

  const authHeader = req.headers['authorization'];
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    throw new HttpError(401, { error: 'Bearer token required' });
  }
  const accessToken = authHeader.slice('Bearer '.length);

  const hostOrigin = String(req.headers['x-web-host-url'] ?? '');
  if (!accessToken || !hostOrigin) {
    throw new HttpError(400, {
      error: 'Missing parameters',
      requires: ['authorization: Bearer <token>', 'x-web-host-url'],
    });
  }

  const safePath = sanitizePath(encodeURIComponent(hostOrigin));
  const fileName = createShortHash(accessToken);
  const cacheKey = 't_' + safePath + '_' + fileName;

  let matched: Record<string, any> | undefined = tokenCache.get(cacheKey);
  if (!matched || matched.accessToken !== accessToken) {
    const fileData = await checkFileWithData(
      join(STORAGE_ROOT, safePath, fileName + '.json'),
      { accessToken },
      'accessToken',
      true,
    );
    if (!fileData || typeof fileData !== 'object') {
      dd('NO variable in file store or did not match. 403');
      throw new HttpError(403, { error: 'Invalid token' });
    }
    matched = fileData;
    tokenCache.set(cacheKey, fileData);
    dd('FOUND variable in file store. SAVED in mem store');
  } else {
    dd('FOUND variable in mem store.');
  }

  if (!matched.userHandler) throw new HttpError(403, { error: 'Invalid token' });
  dd('validate user access token END - Valid');
  return String(matched.userHandler);
}

const tokenCache = new Map<string, Record<string, any>>();
