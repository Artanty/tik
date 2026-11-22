import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import { dd } from '../utils/dd';
import path from 'path';
import { checkFileWithData } from '../utils/fileStorageService';

import { sanitizePath } from '../utils/sanitizePath';
import { createShortHash } from '../utils/createHash';
import { MemoryStorageService } from '../utils/memoryStorageService';
const STORAGE_ROOT = path.join(__dirname, '..', '..', 'storage');

//* back: validateUserAccessToken v2. rename x-requester-url -> x-web-host-url;
export async function validateUserAccessToken(req: Request, res: Response, next: NextFunction) {
  dd('validateUserAccessToken START');
  
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    dd('Missing/invalid Authorization header');
    return res.status(401).json({ error: 'Bearer token required' });
  }

  const accessToken = authHeader.split(' ')[1];
  
  const hostOrigin = String(req.headers['x-web-host-url']);
  dd('hostOrigin: ' + hostOrigin)
  if (!accessToken || !hostOrigin) {
    dd('Missing required parameters');
    return res.status(400).json({ 
      error: 'Missing parameters',
      requires: ['authorization: Bearer <token>', 'x-web-host-url']
    });
  }

  try {
    // пробуем достать переменную из памяти
    const encodedHostOrigin_forPath = encodeURIComponent(hostOrigin);
    const fileName = createShortHash(accessToken);
    const safePath = sanitizePath(encodedHostOrigin_forPath.toString());
    const memStoreVariableKey = 't_' + safePath + '_' + fileName;
    const memStoreVariable = MemoryStorageService.get(memStoreVariableKey);
    
    let matchedData: any = null;
    dd(memStoreVariable)
    if (!memStoreVariable || (memStoreVariable.accessToken !== accessToken)) {
      dd('NO variable in memory store or did not match. trying file store...');
      // try to get from file
      const safeFileName = sanitizePath(fileName.toString()) + '.json';
      // Build storage path
      const storageDir = path.join(STORAGE_ROOT, safePath);
      const filePath = path.join(storageDir, safeFileName);

      const fileStoreVariable = await checkFileWithData(
        filePath, 
        { accessToken }, 
        'accessToken', 
        true
      )
      dd(fileStoreVariable)
      if (!fileStoreVariable) {
        dd('NO variable in file store or did not match. 403');
        return res.status(403).json({ error: 'Invalid token' });
      } else {
        matchedData = fileStoreVariable
        MemoryStorageService.set(memStoreVariableKey, fileStoreVariable);
        dd('FOUND variable in file store. SAVED in mem store');
      }
      
    } else {
      matchedData = memStoreVariable
      dd('FOUND variable in mem store.');
    }
    
    req.headers['x-user-handler'] = matchedData.userHandler;
    dd('validate user access token END - Valid');
    next();
  } catch (error: any) {
    console.error('Validation failed:', error.message);
    res.status(500).json({ error: 'Token validation failed' });
  }
}