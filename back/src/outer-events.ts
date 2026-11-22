import { attachApiToken } from './key-client';
import { poolManager } from './pool-manager';
import { responseLog } from './response-log';
import { EVENT_TIK_ACTION_PROP, eventProgress, type EventStateResItem, type PoolConfigItemBody } from './types';
import { backendOrigin, dd } from './lib';

export interface Ctx {
  body: any;
  headers: Record<string, string | string[] | undefined>;
  origin: string;
  /** userHandler from the validated token — the pool key (SPEC §3). */
  userHandler: string;
}

const OUTER_EVENTS_TIMEOUT_MS = 5000;
const pendingOuterRequests = new Set<string>();

const outerBackUrl = () => process.env.OUTER_EVENTS_BACK_URL ?? 'http://localhost:3201';
const outerProjectId = () => process.env.OUTER_EVENTS_PROJECT_ID ?? 'doro@back';
const outerKeyPrefix = () => outerProjectId().split('@')[0];

/**
 * POST /collectEventsState: token via key@back -> POST {backendUrl}/service/get-event-state
 * -> merge items into the user's pool. Never throws; failures return success:false.
 */
export async function getEventsState(ctx: Ctx): Promise<unknown> {
  const thisBackOrigin = ctx.origin;
  const backendUrlForRequest = ctx.body.backendUrl;

  try {
    const backendServiceToken = await attachApiToken(
      ctx.body.projectId, // target project, f.e.: note@back
      backendUrlForRequest, // target URL
      thisBackOrigin, // requester url (this back url)
    );

    dd('running outer get-event-state');
    const response = await fetch(`${backendUrlForRequest}/service/get-event-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': backendServiceToken.token,
        'X-Requester-Project': process.env.PROJECT_ID ?? '',
        'X-Web-Host-URL': String(ctx.headers['x-web-host-url'] ?? ''),
        'X-Requester-Url': thisBackOrigin,
        'Authorization': String(ctx.headers['authorization'] ?? ''),
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(OUTER_EVENTS_TIMEOUT_MS),
    });
    const outerData = (await response.json()) as { data: { data: EventStateResItem[] } };

    const itemKeyPrefix = String(ctx.body.projectId).split('@')[0];
    poolManager.updateConfigItem(ctx.userHandler, itemKeyPrefix, outerData.data.data);

    return {
      data: {
        success: true,
        receiverResponse: outerData.data.data,
      },
      debug: {
        'doro@back': outerData.data.data,
        [`${process.env.PROJECT_NAME}@${process.env.NAMESPACE}`]: {
          request: {
            targetProjectId: ctx.body.projectId,
            backendUrlForRequest,
            thisBackOrigin,
          },
          response: backendServiceToken,
        },
      },
    };
  } catch (error: any) {
    dd(error.message);
    return {
      data: { success: false },
      error: error.message,
    };
  }
}

/** POST /updateEventsState: merge body.data items under body.projectId's prefix. */
export async function updateEventsState(ctx: Ctx): Promise<unknown> {
  const itemKeyPrefix = String(ctx.body.projectId).split('@')[0];
  const stat = poolManager.updateConfigItem(ctx.userHandler, itemKeyPrefix, ctx.body.data);
  dd(stat);
  return {
    success: true,
    desc: 'poolManager.updateConfigItem successful',
    stat,
  };
}

/**
 * Entry reached len while PLAYING (called fire-and-forget from the tick loop):
 * complete it locally, then notify the owning outer back. Pending-set guards
 * against duplicate concurrent calls for the same entry.
 */
export async function finishEntry(poolId: string, entryId: string, entryConfig: PoolConfigItemBody): Promise<void> {
  if (pendingOuterRequests.has(entryId)) {
    console.log(`Request for ${entryId} is already in progress`);
    return;
  }
  pendingOuterRequests.add(entryId);
  try {
    const { project: _project, entityType, id } = parseEntryId(entryId);
    if (entityType === 'e') {
      await completeEvent(poolId, entryId, id, entryConfig);
    } else {
      throw new Error(`complete entityType=${entityType} - not implemented`);
    }
  } catch (error: any) {
    dd(error.message);
  }
}

/**
 * 1) upsert the entry as COMPLETED into the local pool,
 * 2) request the owning project's back (response may carry new events to add).
 */
async function completeEvent(poolId: string, entryId: string, eventId: string, poolEntry: PoolConfigItemBody): Promise<void> {
  // "doro__e_329" -> { id: "e_329", cur, len, stt: COMPLETED, tikAction: "upsert" }
  const outerItemId = entryId.split('__')[1];
  const itemKeyPrefix = entryId.split('__')[0];
  const outerEntry: EventStateResItem = {
    id: outerItemId,
    cur: poolEntry.cur,
    len: poolEntry.len,
    stt: eventProgress.COMPLETED,
    [EVENT_TIK_ACTION_PROP]: 'upsert',
  };
  poolManager.updateConfigItem(poolId, itemKeyPrefix, [outerEntry]);

  await shareEventState(poolId, entryId, eventId, eventProgress.COMPLETED);
}

async function shareEventState(poolId: string, entryId: string, eventId: string, state: number): Promise<void> {
  const thisBackOrigin = backendOrigin.get();
  const backendUrlForRequest = outerBackUrl();
  const payload = { eventId, state };
  const targetProjectId = outerProjectId();

  const backendServiceToken = await attachApiToken(targetProjectId, backendUrlForRequest, thisBackOrigin);
  let outerServiceResponse: Response | null = null;

  try {
    outerServiceResponse = await fetch(`${backendUrlForRequest}/service/set-event-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': backendServiceToken.token,
        'X-Requester-Project': process.env.PROJECT_ID ?? '',
        'X-Requester-Url': thisBackOrigin,
        // the host is not bound to the pool; the user binding is enough
        'X-User-Handler': poolId,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(OUTER_EVENTS_TIMEOUT_MS),
    });
    const outerServiceResponseData = (await outerServiceResponse.json()) as {
      success: boolean;
      result?: EventStateResItem[];
    };

    if (!outerServiceResponseData.success) {
      throw new Error('wrong outer api response');
    }

    if (Array.isArray(outerServiceResponseData.result) && outerServiceResponseData.result.length) {
      poolManager.updateConfigItem(poolId, outerKeyPrefix(), outerServiceResponseData.result);
    }

    responseLog.save(
      {
        method: 'POST',
        url: `${backendUrlForRequest}/service/set-event-state`,
        status: outerServiceResponse.status,
        requestBody: JSON.stringify(payload),
        response: JSON.stringify(outerServiceResponseData),
      },
      {
        outerServiceResult: {
          request: { url: `${backendUrlForRequest}/service/set-event-state`, payload },
          response: JSON.stringify(outerServiceResponseData),
        },
        backendServiceTokenResult: {
          request: { targetProjectId, backendUrlForRequest, thisBackOrigin },
          response: backendServiceToken,
        },
      },
    );
  } catch (error: any) {
    dd('SHARE EVENT STATE ERROR:');
    dd(error.message);
    responseLog.save(null, error);
    // visible failure marker; the entry stays PLAYING so the next tick retries
    const errorEntry: EventStateResItem = {
      id: 'err_0',
      cur: 0,
      len: 3600,
      stt: eventProgress.PAUSED,
      [EVENT_TIK_ACTION_PROP]: 'upsert',
    };
    poolManager.updateConfigItem(poolId, outerKeyPrefix(), [errorEntry]);
  } finally {
    pendingOuterRequests.delete(entryId);
  }
}

/** "doro__e_349" -> { project: 'doro', entityType: 'e', id: '349' } */
export function parseEntryId(key: string): { project: string; entityType: string; id: string } {
  const parts = key.split('__');
  if (parts.length !== 2) {
    throw new Error(`Invalid key format: ${key}. Expected: service__entityType_id`);
  }
  const [project, rest] = parts;
  const entityParts = rest.split('_');
  if (entityParts.length < 2) {
    throw new Error(`Invalid entity format in key: ${key}. Expected: entityType_id`);
  }
  return { project, entityType: entityParts[0], id: entityParts.slice(1).join('_') };
}
