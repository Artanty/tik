import path from 'path';

export const STORAGE_ROOT = path.join(__dirname, '..', '..', 'storage');

export const EVENT_TIK_ACTION_PROP = 'tikAction';

export enum eventProgress {
	'STOPPED' = 0,
	'PLAYING' = 1,
	'PAUSED' = 2,
	'COMPLETED' = 3
}