import { createHash, randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  EVENT_TIK_ACTION_PROP,
  eventProgress,
  type EventStateResItem,
  type PoolConfig,
  type PoolConfigItemBody,
  type BanRecord,
} from './types';
import { dd } from './lib';
// circular with outer-events (same direction as the node build): finishEntry only runs
// from the tick loop, long after both modules are fully loaded
import { finishEntry } from './outer-events';

interface Connection {
  id: string;
  response: ServerResponse;
  ip: string;
  userAgent?: string;
  connectedAt: Date;
  request: IncomingMessage;
  fingerprint: string;
}

interface Pool {
  id: string;
  config: PoolConfig;
  offset: number;
  clients: Set<Connection>;
  lastActivity: Date;
}

export interface MutationStats {
  added: string[];
  addedCount: number;
  updated: string[];
  updatedCount: number;
  deleted: string[];
  deletedItems: unknown[];
  deletedCount: number;
}

export class PoolManager {
  private pools = new Map<string, Pool>();
  private globalTimerValue = 0;
  private isRunning = false;
  private timerInterval?: NodeJS.Timeout;
  private bannedClients = new Map<string, BanRecord>();

  public getPoolCount(): number {
    return this.pools.size;
  }

  public addConnection(poolId: string, req: IncomingMessage, res: ServerResponse, urlPoolId: string): void {
    const fingerprint = joinFingerprint(req, urlPoolId);
    if (this.isClientBanned(fingerprint)) {
      const ban = this.bannedClients.get(fingerprint)!;
      res.writeHead(403, { 'Content-Type': 'application/json', Connection: 'close' });
      res.end(JSON.stringify({ error: 'Banned', reason: ban.reason }));
      return;
    }

    this.ensurePoolExists(poolId, configFromQuery(req));
    const pool = this.pools.get(poolId)!;

    const connection: Connection = {
      id: randomUUID(),
      response: res,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      connectedAt: new Date(),
      request: req,
      fingerprint,
    };

    pool.clients.add(connection);
    pool.lastActivity = new Date();

    this.sendInitialState(pool, connection);
    this.startGlobalTimerIfNeeded();

    req.on('close', () => this.removeConnection(poolId, connection.id));
  }

  /**
   * Merge config items (SPEC §4): tikAction upsert|delete only; entry stored without
   * its id; "default" becomes {} on first mutation; returns stats.
   */
  public updateConfigItem(poolId: string, itemKeyPrefix: string, configItems: EventStateResItem[]): MutationStats {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool ${poolId} not found`);

    let config: Record<string, PoolConfigItemBody>;
    if (pool.config === 'default') {
      config = {};
    } else {
      config = JSON.parse(JSON.stringify(pool.config));
    }

    const stats: MutationStats = {
      added: [],
      addedCount: 0,
      updated: [],
      updatedCount: 0,
      deleted: [],
      deletedItems: [],
      deletedCount: 0,
    };

    for (const configItem of configItems) {
      const itemKey = `${itemKeyPrefix}__${configItem.id}`;
      const action = configItem[EVENT_TIK_ACTION_PROP];

      if (action === 'add') {
        throw new Error('DO NOT USE "add" ACTION, USE ONLY "upsert" AND "delete"');
      } else if (action === 'update') {
        throw new Error('DO NOT USE "update" ACTION, USE ONLY "upsert" AND "delete"');
      } else if (action === 'upsert') {
        const { id: _id, tikAction: _tikAction, ...rest } = configItem;
        const isNew = !config[itemKey];
        config[itemKey] = rest as PoolConfigItemBody;
        if (isNew) {
          stats.added.push(itemKey);
          stats.addedCount++;
        } else {
          stats.updated.push(itemKey);
          stats.updatedCount++;
        }
      } else if (action === 'delete') {
        if (config[itemKey]) {
          stats.deletedItems.push(JSON.parse(JSON.stringify({ id: itemKey, ...config[itemKey] })));
          delete config[itemKey];
          stats.deleted.push(itemKey);
          stats.deletedCount++;
        }
      } else {
        throw new Error('no tik action in event');
      }
    }

    pool.config = config;
    pool.lastActivity = new Date();
    return stats;
  }

  public updateConfig(poolId: string, newConfig: PoolConfig): void {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool ${poolId} not found`);
    pool.config = newConfig;
    pool.lastActivity = new Date();
  }

  public getHealthStatus() {
    return {
      globalTimerValue: this.globalTimerValue,
      isRunning: this.isRunning,
      totalPools: this.pools.size,
      totalConnections: Array.from(this.pools.values()).reduce((sum, pool) => sum + pool.clients.size, 0),
      pools: Array.from(this.pools.values()).map((pool) => ({
        poolId: pool.id,
        config: pool.config,
        offset: pool.offset,
        connectionCount: pool.clients.size,
        lastActivity: pool.lastActivity.toISOString(),
        connections: Array.from(pool.clients).map((conn) => ({
          id: conn.id,
          ip: conn.ip,
          userAgent: conn.userAgent,
          connectedAt: conn.connectedAt.toISOString(),
          durationSec: Math.floor((Date.now() - conn.connectedAt.getTime()) / 1000),
        })),
      })),
    };
  }

  public cleanupInactivePools(inactiveMinutes = 5): number {
    const threshold = Date.now() - inactiveMinutes * 60 * 1000;
    let cleanedCount = 0;
    this.pools.forEach((pool, poolId) => {
      if (pool.lastActivity.getTime() < threshold) {
        this.closePool(poolId);
        cleanedCount++;
      }
    });
    return cleanedCount;
  }

  public kickConnection(
    poolId: string,
    connectionId: string,
    options: { banClient?: boolean; banDurationMs?: number; reason?: string } = {},
  ): { success: boolean; banned: boolean; message: string } {
    const pool = this.pools.get(poolId);
    if (!pool) {
      return { success: false, banned: false, message: `Pool ${poolId} not found` };
    }

    let connection: Connection | undefined;
    for (const conn of pool.clients) {
      if (conn.id === connectionId) {
        connection = conn;
        break;
      }
    }
    if (!connection) {
      return {
        success: false,
        banned: false,
        message: `Connection ${connectionId} not found in pool ${poolId}`,
      };
    }

    let banned = false;
    if (options.banClient) {
      this.bannedClients.set(connection.fingerprint, {
        fingerprint: connection.fingerprint,
        reason: options.reason || 'Administrative ban',
        bannedAt: new Date(),
        expiresAt: options.banDurationMs ? new Date(Date.now() + options.banDurationMs) : undefined,
      });
      banned = true;
    }

    try {
      const kickMessage = JSON.stringify({
        event: 'admin-kick',
        banned: options.banClient,
        reason: options.reason || 'Connection terminated by admin',
        reconnectAllowed: !options.banClient,
        ...(options.banClient && options.banDurationMs ? { banDurationMs: options.banDurationMs } : {}),
      });
      connection.response.write(`event: admin-kick\ndata: ${kickMessage}\n\n`);
      connection.response.end();
    } catch (err) {
      console.error(`Error kicking connection ${connectionId}:`, err);
    }

    pool.clients.delete(connection);

    return {
      success: true,
      banned,
      message: `Connection ${connectionId} kicked from pool ${poolId}` + (banned ? ' (BANNED)' : ''),
    };
  }

  /** Pre-handshake ban gate for the SSE route. */
  public verifyConnection(req: IncomingMessage, urlPoolId: string): { allowed: boolean; reason?: string } {
    const fingerprint = joinFingerprint(req, urlPoolId);
    if (this.isClientBanned(fingerprint)) {
      const ban = this.bannedClients.get(fingerprint)!;
      return {
        allowed: false,
        reason: ban.reason + (ban.expiresAt ? ` until ${ban.expiresAt.toISOString()}` : ' (permanent)'),
      };
    }
    return { allowed: true };
  }

  public getBannedClients(): BanRecord[] {
    return Array.from(this.bannedClients.values());
  }

  public unbanClient(fingerprint: string): boolean {
    return this.bannedClients.delete(fingerprint);
  }

  /** Stop the timer and close everything (SIGTERM). */
  public shutdown(): void {
    this.stopGlobalTimer();
    for (const poolId of Array.from(this.pools.keys())) {
      this.closePool(poolId);
    }
  }

  private isClientBanned(fingerprint: string): boolean {
    const banRecord = this.bannedClients.get(fingerprint);
    if (!banRecord) return false;
    if (banRecord.expiresAt && banRecord.expiresAt < new Date()) {
      this.bannedClients.delete(fingerprint);
      return false;
    }
    return true;
  }

  private ensurePoolExists(poolId: string, config?: string): void {
    if (!this.pools.has(poolId)) {
      this.pools.set(poolId, {
        id: poolId,
        config: config || 'default',
        offset: this.globalTimerValue,
        clients: new Set(),
        lastActivity: new Date(),
      });
    }
  }

  private sendInitialState(pool: Pool, connection: Connection): void {
    const poolTime = (this.globalTimerValue + pool.offset) % 3600;
    const initialUserState = {
      type: 'init',
      value: poolTime,
      config: pool.config,
      poolId: pool.id,
      id: connection.id,
    };
    connection.response.write(`data: ${JSON.stringify(initialUserState)}\n\n`);
  }

  /**
   * THE core design decision (see DECISIONS.md): ONE global timer for the whole process.
   * Every pool advances on the same monotonic clock (pool.offset anchors it), so pools can
   * never drift apart and timer cost is O(1) regardless of pool/connection count.
   */
  private startGlobalTimerIfNeeded(): void {
    if (!this.isRunning && this.pools.size > 0) {
      this.isRunning = true;
      this.timerInterval = setInterval(() => this.broadcastUpdates(), 1000);
    }
  }

  private broadcastUpdates(): void {
    this.globalTimerValue++;

    this.pools.forEach((pool) => {
      const updated = incrementPlayingEvents(pool.id, pool.config);
      // serialize once per pool per tick, write the same string to every client
      const message = `data: ${JSON.stringify({ config: updated })}\n\n`;

      pool.clients.forEach((connection) => {
        try {
          connection.response.write(message);
        } catch (err) {
          this.removeConnection(pool.id, connection.id);
        }
      });
      pool.lastActivity = new Date();
    });

    if (this.pools.size === 0) this.stopGlobalTimer();
  }

  private stopGlobalTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
      this.isRunning = false;
    }
  }

  private removeConnection(poolId: string, connectionId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool) return;
    for (const conn of pool.clients) {
      if (conn.id === connectionId) {
        pool.clients.delete(conn);
        break;
      }
    }
    if (pool.clients.size === 0) this.pools.delete(poolId);
  }

  private closePool(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool) return;
    pool.clients.forEach((conn) => {
      try {
        conn.response.end();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    });
    this.pools.delete(poolId);
  }
}

/**
 * Advance PLAYING entries: cur < len -> cur++; cur >= len -> fire-and-forget finish flow.
 * Entries are mutated in place; returns the (same-referenced) entries under fresh keys.
 */
function incrementPlayingEvents(poolId: string, config: PoolConfig): PoolConfig {
  if (typeof config === 'string') return config;

  const updated: Record<string, PoolConfigItemBody> = {};
  for (const [eventId, entryConfig] of Object.entries(config)) {
    if (entryConfig.len && entryConfig.stt === eventProgress.PLAYING) {
      if (entryConfig.cur < entryConfig.len) {
        entryConfig.cur++;
      } else {
        finishEntry(poolId, eventId, entryConfig);
      }
    }
    updated[eventId] = entryConfig;
  }
  return updated;
}

/** sha256 over [user-agent, accept-language, sec-ch-ua, remote addr, url pool id] (SPEC §7). */
function joinFingerprint(req: IncomingMessage, urlPoolId: string): string {
  const components = [
    req.headers['user-agent'],
    req.headers['accept-language'],
    req.headers['sec-ch-ua'],
    req.socket.remoteAddress,
    urlPoolId,
  ].filter(Boolean);
  return createHash('sha256').update(components.join('|')).digest('hex');
}

function configFromQuery(req: IncomingMessage): string | undefined {
  const query = (req.url ?? '').split('?')[1];
  if (!query) return undefined;
  const match = query.split('&').find((p) => p.startsWith('config='));
  return match ? decodeURIComponent(match.slice('config='.length)) : undefined;
}

function clientIp(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd.join(',') : fwd;
  return [raw, req.socket.remoteAddress].filter(Boolean).toString().split(',')[0].trim();
}

// singleton instance
export const poolManager = new PoolManager();
