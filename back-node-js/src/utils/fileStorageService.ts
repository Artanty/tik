import { promises as fs } from 'fs';
import path from 'path';
import { createShortHash } from './createHash';

import { dd } from './dd';
import { buildFolderPath } from './buildFolderPath';

export interface GetUserDataFileRes {
  exists: boolean,
  data?: any, 
  fileName?: string,
  filePath?: string,
  folderPath?: string
}

export async function getUserDataFileByAccessToken(folder: any, accessToken: any): Promise<GetUserDataFileRes> {
  const result: GetUserDataFileRes = {
    exists: false,
    fileName: '',
    filePath: ''
  }
  try {
    accessToken = createShortHash(accessToken);
    result.folderPath = buildFolderPath(folder);
        
    // Read all files in the directory
    const files = await fs.readdir(result.folderPath);
        
    const matchingFiles = files.filter(file => 
      file.endsWith(`___${accessToken}.json`)
    );
        
    if (matchingFiles.length === 0) {
      // return { exists: false };
      
      return result;
    }
        
    // Get the first matching file
    result.fileName = matchingFiles[0];
    result.filePath = path.join(result.folderPath, result.fileName);
        
    // Read and parse the file content
    const fileContent = await fs.readFile(result.filePath, 'utf8');
    const data = JSON.parse(fileContent);
      
    result.exists = true;
    result.data = data;

    return result;
        
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Directory doesn't exist
      return result;
    }
    throw error;
  }
}


/**
 * Checks if a file exists at the given path with matching data
 * @param {string} filePath - Full path to the file
 * @param {any} data - Data to compare against file content
 * @returns {Promise<boolean>} - True if file exists and data matches
 */
export async function checkFileWithData(
  filePath: string, 
  dataToCheck: any, 
  propToCheck: string,
  isReturnData: boolean
): Promise<boolean | any> {
  try {
    // 1. Check if file exists
    await fs.access(filePath);
    
    // 2. Read file content
    const fileContent = await fs.readFile(filePath, 'utf8');
    
    // 3. Compare stringified data
    const currentData = JSON.parse(fileContent);
    
    
    if (currentData[propToCheck] === dataToCheck[propToCheck]) {
      if (isReturnData === true) {
        return currentData;
      }
      return true
    }

    return false

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist
      return false;
    }
    throw error; // Re-throw other errors
  }
}