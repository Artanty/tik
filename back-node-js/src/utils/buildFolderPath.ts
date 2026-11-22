import path from 'path';

import { STORAGE_ROOT } from '../core/constants';
import { sanitizePath } from './sanitizePath';

export function buildFolderPath(rawPath: string): string {
	const safePath = sanitizePath(rawPath.toString());
	const storageDir = path.join(STORAGE_ROOT, safePath);
	// return path.join(storageDir);
	return storageDir ?? '';
}