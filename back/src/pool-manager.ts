import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface Connection {
  id: string;
  response: Response;
  ip: string;
  userAgent?: string;
  connectedAt: Date;
}

interface Pool {
  id: string;
  config: string;
  offset: number;
  clients: Set<Connection>;
  lastActivity: Date;
}

export class PoolManager {
  private pools = new Map<string, Pool>();
  private globalTimerValue = 0;
  private isRunning = false;
  private timerInterval?: NodeJS.Timeout;

  public getPoolCount(): number {
    return this.pools.size;
  }

  public getPoolIds(): string[] {
    return Array.from(this.pools.keys());
  }

  public addConnection(poolId: string, req: Request, res: Response): void {
    this.ensurePoolExists(poolId, req.query.config as string | undefined);
    const pool = this.pools.get(poolId)!;

    const connection: Connection = {
      id: uuidv4(),
      response: res,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      connectedAt: new Date()
    };

    pool.clients.add(connection);
    pool.lastActivity = new Date();

    this.sendInitialState(pool, connection);
    this.startGlobalTimerIfNeeded();

    req.on('close', () => this.removeConnection(poolId, connection.id));
  }

  public updateConfig(poolId: string, newConfig: string): void {
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

  public kickConnection(poolId: string, connectionId: string): boolean {
    const pool = this.pools.get(poolId);
    if (!pool) return false;

    for (const conn of pool.clients) {
      if (conn.id === connectionId) {
        try {
          // Send a termination message before closing
          conn.response.write('event: admin-kick\ndata: {"reason":"Connection terminated by admin"}\n\n');
          conn.response.end();
        } catch (err) {
          console.error('Error kicking connection:', err);
        }
        pool.clients.delete(conn);
        return true;
      }
    }
    return false;
  }

  public kickAllInPool(poolId: string): number {
    const pool = this.pools.get(poolId);
    if (!pool) return 0;

    let kickedCount = 0;
    pool.clients.forEach(conn => {
      try {
        conn.response.write('event: admin-kick\ndata: {"reason":"Pool reset by admin"}\n\n');
        conn.response.end();
        kickedCount++;
      } catch (err) {
        console.error('Error kicking connection:', err);
      }
    });

    pool.clients.clear();
    return kickedCount;
  }

  public removePool(poolId: string): { success: boolean; disconnected: number } {
    const pool = this.pools.get(poolId);
    if (!pool) {
      return { success: false, disconnected: 0 };
    }

    let disconnectedCount = 0;

    // Disconnect all clients
    pool.clients.forEach(connection => {
      try {
        connection.response.write('event: pool-removed\n');
        connection.response.write('data: {"reason":"Pool was deleted by admin"}\n\n');
        connection.response.end();
        disconnectedCount++;
      } catch (err) {
        console.error(`Error disconnecting ${connection.id}:`, err);
      }
    });

    this.pools.delete(poolId);

    // Stop timer if no pools left
    if (this.pools.size === 0) {
      this.stopGlobalTimer();
    }

    return { success: true, disconnected: disconnectedCount };
  }

  private ensurePoolExists(poolId: string, config?: string): void {
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
    const message = `data: ${JSON.stringify({
      type: 'init',
      value: poolTime,
      config: pool.config,
      poolId: pool.id,
      id: connection.id,
    })}\n\n`;

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
      const message = `data: ${JSON.stringify({
        value: poolTime,
        config: pool.config,
        globalTime: this.globalTimerValue,
        poolId: pool.id
      })}\n\n`;

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
}

// Singleton instance
export const poolManager = new PoolManager();