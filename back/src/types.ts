export const EVENT_TIK_ACTION_PROP = 'tikAction';

export const eventProgress = {
  STOPPED: 0,
  PLAYING: 1,
  PAUSED: 2,
  COMPLETED: 3,
} as const;

export interface EventStateResItem {
  id: string;
  cur: number;
  len: number;
  stt: number;
  tikAction?: string;
}

export interface PoolConfigItemBody {
  cur: number;
  len: number;
  stt: number;
}

export type PoolConfig = Record<string, PoolConfigItemBody> | string;

export interface ResponseLogEntry {
  timestamp: string;
  method: string;
  url: string;
  status: number | string;
  requestBody?: string;
  response: string;
  customData?: string;
}

export interface BanRecord {
  fingerprint: string;
  reason: string;
  bannedAt: Date;
  expiresAt?: Date;
}
