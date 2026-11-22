import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import { join, resolve, relative } from 'path';
import { HttpError } from './lib';

export const STORAGE_ROOT = resolve(__dirname, '..', 'storage');

export function sanitizePath(input: string): string {
  return input
    .replace(/\.\./g, '') // strip parent-directory references
    .replace(/[^\w\-.%]/g, '_') // everything outside [a-zA-Z0-9_-.%] -> _
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
}

export const createShortHash = (input: string): string =>
  createHash('md5').update(input).digest('hex').substring(0, 16);

/**
 * File exists AND its .<propToCheck> equals the one in dataToCheck.
 * Returns the parsed file content (isReturnData) or plain true.
 */
export async function checkFileWithData(
  filePath: string,
  dataToCheck: Record<string, unknown>,
  propToCheck: string,
  isReturnData: boolean,
): Promise<Record<string, any> | boolean> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const currentData = JSON.parse(fileContent);
    if (currentData[propToCheck] === dataToCheck[propToCheck]) {
      return isReturnData ? currentData : true;
    }
    return false;
  } catch (error: any) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

/** POST /save-temp/save */
export async function saveTempSave(body: any): Promise<{ success: boolean; message: string; storagePath: string }> {
  const { path: rawPath, fileName, data } = body ?? {};
  if (!rawPath || !fileName || !data) {
    throw new HttpError(400, { message: 'path, fileName and data are required' });
  }
  const storageDir = join(STORAGE_ROOT, sanitizePath(String(rawPath)));
  const filePath = join(storageDir, sanitizePath(String(fileName)));
  await fs.mkdir(storageDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  return {
    success: true,
    message: 'Data saved successfully',
    storagePath: relative(STORAGE_ROOT, filePath),
  };
}

/** POST /save-temp/check */
export async function saveTempCheck(body: any): Promise<{ validationResult: Record<string, any> | boolean }> {
  const hostOrigin = body?.hostOrigin;
  const fileName = createShortHash(String(body?.data?.accessToken ?? '')) + '.json';
  const safePath = sanitizePath(encodeURIComponent(String(hostOrigin)));
  const filePath = join(STORAGE_ROOT, safePath, sanitizePath(fileName));
  const validationResult = await checkFileWithData(filePath, body?.data ?? {}, 'accessToken', false);
  return { validationResult };
}
