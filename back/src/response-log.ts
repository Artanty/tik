import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import type { ResponseLogEntry } from './types';

const LOG_FILE = resolve(__dirname, '..', 'logs', 'response-log.json');
const MAX_ENTRIES = 10;

export interface LoggedResponse {
  method: string;
  url: string;
  status: number;
  requestBody?: string;
  response: string;
}

class ResponseLogService {
  private entries: ResponseLogEntry[] = [];

  constructor() {
    try {
      if (existsSync(LOG_FILE)) {
        this.entries = JSON.parse(readFileSync(LOG_FILE, 'utf8'));
      }
    } catch {
      this.entries = [];
    }
  }

  private saveToDisk(): void {
    const dir = dirname(LOG_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(LOG_FILE, JSON.stringify(this.entries, null, 2));
  }

  private add(entry: ResponseLogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }
    this.saveToDisk();
  }

  /** null res = failed request: log the error as customData, old shape. */
  save(res: LoggedResponse | null | undefined, customData?: unknown): void {
    if (!res) {
      this.add({
        timestamp: new Date().toISOString(),
        method: 'UNKNOWN',
        url: 'UNKNOWN',
        status: 'ERROR',
        response: customData !== undefined ? String(customData) : 'No response',
        ...(customData !== undefined ? { customData: JSON.stringify(customData) } : {}),
      });
      return;
    }
    this.add({
      timestamp: new Date().toISOString(),
      method: res.method,
      url: res.url,
      status: res.status,
      ...(res.requestBody !== undefined ? { requestBody: res.requestBody } : {}),
      response: res.response,
      ...(customData !== undefined ? { customData: JSON.stringify(customData) } : {}),
    });
  }

  getAll(): ResponseLogEntry[] {
    return [...this.entries];
  }
}

export const responseLog = new ResponseLogService();
