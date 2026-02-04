import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { InitialUserState, UserTick } from './types';
import { EventStateResItem } from './controllers/outerEventsStateController';
import { EVENT_TIK_ACTION_PROP } from './core/constants';
import { PoolConfigService } from './controllers/poolConfigService';
import { dd } from './utils/dd';


interface Connection {
  id: string;
  response: Response;
  ip: string;
  userAgent?: string;
  connectedAt: Date;
  request: Request;
}

interface Pool {
  id: string;
  config: string | any;
  offset: number;
  clients: Set<Connection>;
  lastActivity: Date;
}

interface BanRecord {
  fingerprint: string;
  reason: string;
  bannedAt: Date;
  expiresAt?: Date;
}

export class PoolManager {
  private pools = new Map<string, Pool>();
  private globalTimerValue = 0;
  private isRunning = false;
  private timerInterval?: NodeJS.Timeout;
  private bannedClients = new Map<string, BanRecord>();
  private clientIdentifiers = new Map<string, string>(); // clientId -> fingerprint

  public getPoolCount(): number {
    return this.pools.size;
  }

  public getPoolIds(): string[] {
    return Array.from(this.pools.keys());
  }

  public addConnection(poolId: string, req: Request, res: Response): void {

    const fingerprint = this.getClientFingerprint(req);
    
    if (this.isClientBanned(fingerprint)) {
      res.writeHead(403, {
        'Content-Type': 'application/json',
        'Connection': 'close'
      });
      res.end(JSON.stringify({
        error: "Banned",
        reason: this.bannedClients.get(fingerprint)?.reason
      }));  
    }

    const clientId = uuidv4();
    this.clientIdentifiers.set(clientId, fingerprint);

    this.ensurePoolExists(poolId, req.query.config as string | undefined);
    const pool = this.pools.get(poolId)!;

    const connection: Connection = {
      id: uuidv4(),
      response: res,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      connectedAt: new Date(),
      request: req
    };

    pool.clients.add(connection);
    pool.lastActivity = new Date();

    this.sendInitialState(pool, connection);
    this.startGlobalTimerIfNeeded();

    req.on('close', () => this.removeConnection(poolId, connection.id));
  }

  public updateConfigItem(poolId: string, itemKeyPrefix: string, configItems: EventStateResItem[]): any {
    // dd('updateConfigItem');
    // dd(configItems);
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error('Pool not found');

    let config = pool.config

    if (!config) {
      throw new Error('pool has no config prop')
    } else if (config === 'default') {
      config = {}
    } else {
      config = JSON.parse(JSON.stringify(pool.config));
    }

    const resultStatistics = {
      added: [],
      addedCount: 0,
      updated: [],
      updatedCount: 0,
      deleted: [],
      deletedCount: 0
    } as any
    
    configItems.forEach((configItem: EventStateResItem) => {
      const itemKey = `${itemKeyPrefix}__${configItem.id}`;

      if (configItem[EVENT_TIK_ACTION_PROP] === 'add') {
        delete configItem[EVENT_TIK_ACTION_PROP];
        config[itemKey] = {};
        const { id, ...rest } = configItem;
        config[itemKey] = rest;

        resultStatistics['added'].push(itemKey);
        resultStatistics['addedCount']++;
      } else if (configItem[EVENT_TIK_ACTION_PROP] === 'update') {
        delete configItem[EVENT_TIK_ACTION_PROP];

        if (config[itemKey]) {
          config[itemKey] = {};
          const { id, ...rest } = configItem;
          config[itemKey] = rest;

          resultStatistics['updated'].push(itemKey);
          resultStatistics['updatedCount']++;
        } else {
          dd(config)
          dd(itemKey)
          throw new Error('event not found: ' + itemKey)  
        }
      } else if (configItem[EVENT_TIK_ACTION_PROP] === 'upsert') {
        delete configItem[EVENT_TIK_ACTION_PROP];
        dd('WE ARE HERE')
        if (config[itemKey]) {
          config[itemKey] = {};
          const { id, ...rest } = configItem;
          config[itemKey] = rest;

          resultStatistics['updated'].push(itemKey);
          resultStatistics['updatedCount']++;
        } else {
          config[itemKey] = {};
          const { id, ...rest } = configItem;
          config[itemKey] = rest;

          resultStatistics['added'].push(itemKey);
          resultStatistics['addedCount']++;  
        }

      } else if (configItem[EVENT_TIK_ACTION_PROP] === 'delete') {
        
        delete config[itemKey]

        resultStatistics['deleted'].push(itemKey);
        resultStatistics['deletedCount']++;
        
      } else {
        throw new Error('no tik action in event')
      }
    })

    pool.config = config;
    pool.lastActivity = new Date();

    return resultStatistics;
  }

  // public deleteConfigItem(poolId: string, itemKeyPrefix: string, configItems: EventStateResItem[]): void {
  //   const pool = this.pools.get(poolId);
  //   if (!pool) throw new Error('Pool not found');

  //   let config = pool.config

  //   if (!config) {
  //     throw new Error('pool has no config prop')
  //   } else if (config === 'default') {
  //     config = {}
  //   } else {
  //     config = JSON.parse(JSON.stringify(pool.config));
  //   }
    
  //   configItems.forEach((configItem: EventStateResItem) => {
  //     const itemKey = `${itemKeyPrefix}__${configItem.id}`;
  //     delete config[itemKey]
  //   })

  //   pool.config = config;
  //   pool.lastActivity = new Date();
  // }

  public updateConfig(poolId: string, newConfig: any): void {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error('Pool not found');

    pool.config = newConfig;
    pool.lastActivity = new Date();
  }

  public getHealthStatus() {
    return {
      globalTimerValue: this.globalTimerValue,
      isRunning: this.isRunning,
      totalPools: this.pools.size,
      totalConnections: Array.from(this.pools.values()).reduce((sum, pool) => sum + pool.clients.size, 0),
      pools: Array.from(this.pools.values()).map(pool => ({
        poolId: pool.id,
        config: pool.config,
        offset: pool.offset,
        connectionCount: pool.clients.size,
        lastActivity: pool.lastActivity.toISOString(),
        connections: Array.from(pool.clients).map(conn => ({
          id: conn.id,
          ip: conn.ip,
          userAgent: conn.userAgent,
          connectedAt: conn.connectedAt.toISOString(),
          durationSec: Math.floor((Date.now() - conn.connectedAt.getTime()) / 1000)
        }))
      }))
    };
  }

  // public 


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
    options: {
      banClient?: boolean;
      banDurationMs?: number;
      reason?: string;
    } = {}
  ): { success: boolean; banned: boolean; message: string } {
    const pool = this.pools.get(poolId);
    if (!pool) {
      return {
        success: false,
        banned: false,
        message: `Pool ${poolId} not found`
      };
    }

    // Find connection
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
        message: `Connection ${connectionId} not found in pool ${poolId}`
      };
    }

    // Ban logic
    let banned = false;
    if (options.banClient) {
      const fingerprint = this.generateClientFingerprint(connection.request);
      this.bannedClients.set(fingerprint, {
        fingerprint,
        reason: options.reason || 'Administrative ban',
        bannedAt: new Date(),
        expiresAt: options.banDurationMs 
          ? new Date(Date.now() + options.banDurationMs)
          : undefined
      });
      banned = true;
    }

    // Send kick message
    try {
      const kickMessage = JSON.stringify({
        event: 'admin-kick',
        banned: options.banClient,
        reason: options.reason || 'Connection terminated by admin',
        reconnectAllowed: !options.banClient,
        ...(options.banClient && options.banDurationMs 
          ? { banDurationMs: options.banDurationMs } 
          : {})
      });

      connection.response.write(`event: admin-kick\n`);
      connection.response.write(`data: ${kickMessage}\n\n`);
      connection.response.end();
    } catch (err) {
      console.error(`Error kicking connection ${connectionId}:`, err);
    }

    // Remove connection
    pool.clients.delete(connection);

    return {
      success: true,
      banned,
      message: `Connection ${connectionId} kicked from pool ${poolId}` +
        (banned ? ' (BANNED)' : '')
    };
  }

  // Add this method to check connections before accepting them
  public verifyConnection(req: Request): { allowed: boolean; reason?: string } {
    const fingerprint = this.generateClientFingerprint(req);
    if (this.isClientBanned(fingerprint)) {
      const ban = this.bannedClients.get(fingerprint)!;
      return {
        allowed: false,
        reason: ban.reason + (ban.expiresAt 
          ? ` until ${ban.expiresAt.toISOString()}`
          : ' (permanent)')
      };
    }
    return { allowed: true };
  }

  private generateClientFingerprint(req: Request): string {
    const components = [
      req.headers['user-agent'],
      req.headers['accept-language'],
      req.headers['sec-ch-ua'],
      req.ip,
      req.params.poolId,
      req.params.connId,
      // req.headers['cookie'] // If using session cookies
    ].filter(Boolean).join('|');
    
    return createHash('sha256').update(components).digest('hex');
  }

  private banClient(
    fingerprint: string, 
    options: {
      reason: string;
      expiresAt?: Date;
    }
  ): void {
    this.bannedClients.set(fingerprint, {
      fingerprint,
      reason: options.reason,
      bannedAt: new Date(),
      expiresAt: options.expiresAt
    });

    // Schedule automatic unban if duration was specified
    if (options.expiresAt) {
      const banDuration = options.expiresAt.getTime() - Date.now();
      setTimeout(() => {
        this.bannedClients.delete(fingerprint);
      }, banDuration);
    }
  }

  private isClientBanned(fingerprint: string): boolean {
    const banRecord = this.bannedClients.get(fingerprint);
    if (!banRecord) return false;
    
    // Check if ban has expired
    if (banRecord.expiresAt && banRecord.expiresAt < new Date()) {
      this.bannedClients.delete(fingerprint);
      return false;
    }
    
    return true;
  }

  private ensurePoolExists(poolId: string, config?: string | any): void {
    if (!this.pools.has(poolId)) {
      this.pools.set(poolId, {
        id: poolId,
        config: config || 'default',
        offset: this.globalTimerValue,
        clients: new Set(),
        lastActivity: new Date()
      });
    }
  }

  private sendInitialState(pool: Pool, connection: Connection): void {
    const poolTime = (this.globalTimerValue + pool.offset) % 3600;
    const initialUserState: InitialUserState = {
      type: 'init',
      value: poolTime,
      config: pool.config,
      poolId: pool.id,
      id: connection.id,
    }
    const message = `data: ${JSON.stringify(initialUserState)}\n\n`;

    connection.response.write(message);
  }

  private startGlobalTimerIfNeeded(): void {
    if (!this.isRunning && this.pools.size > 0) {
      this.isRunning = true;
      this.timerInterval = setInterval(() => this.broadcastUpdates(), 1000);
    }
  }

  private broadcastUpdates(): void {
    this.globalTimerValue++;
    
    this.pools.forEach(pool => {
      const poolTime = (this.globalTimerValue + pool.offset) % 3600;
      const userTick: Partial<UserTick> = {
        // poolTime: poolTime,
        config: PoolConfigService.incrementPlayingEvents(pool.config),
        // globalTime: this.globalTimerValue,
        // poolId: pool.id
      }
      const message = `data: ${JSON.stringify(userTick)}\n\n`;

      pool.clients.forEach(connection => {
        try {
          connection.response.write(message);
          pool.lastActivity = new Date();
        } catch (err) {
          this.removeConnection(pool.id, connection.id);
        }
      });
    });

    // Auto-stop timer if no pools left
    if (this.pools.size === 0) {
      this.stopGlobalTimer();
    }
  }

  private stopGlobalTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
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

    if (pool.clients.size === 0) {
      this.pools.delete(poolId);
    }
  }

  private closePool(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    pool.clients.forEach(conn => {
      try {
        conn.response.end();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    });

    this.pools.delete(poolId);
  }

  private getClientIp(req: Request): string {
    return [
      req.headers['x-forwarded-for'],
      req.socket?.remoteAddress,
      req.connection?.remoteAddress
    ]
      .filter(Boolean)
      .toString()
      .split(',')[0]
      .trim();
  }
  private getClientFingerprint(req: Request): string {
    const components = [
      req.headers['user-agent'],
      req.headers['accept-language'],
      req.headers['sec-ch-ua-platform'], // "Android", "Chrome OS", "Chromium OS", "iOS", "Linux", "macOS", "Windows", or "Unknown"
      req.ip
    ].join('|');
    
    return createHash('sha256').update(components).digest('hex');
  }

  public getBannedClients(): BanRecord[] {
    return Array.from(this.bannedClients.values());
  }

  public unbanClient(fingerprint: string): boolean {
    return this.bannedClients.delete(fingerprint);
  }
}

// Singleton instance
export const poolManager = new PoolManager();