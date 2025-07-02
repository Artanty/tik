import { config } from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { handleError } from './error-handler';
import { validateConfig } from './config-validator';

config();
const PORT = process.env.PORT || 3000;

const app = express();
const httpServer = createServer(app);

// Global timer state
let globalTimerValue = 0;
let isRunning = false;
let timerInterval: NodeJS.Timeout;

// Pool storage
interface Pool {
  config: string;
  offset: number;
  clients: Set<express.Response>;
  lastActivity: Date;
}

const pools = new Map<string, Pool>();

// Timer management
function startGlobalTimer() {
  if (!isRunning) {
    isRunning = true;
    timerInterval = setInterval(() => {
      globalTimerValue++;
      broadcastToAllPools();
      cleanupInactivePools(); // Optional cleanup
    }, 1000);
  }
}

function stopGlobalTimer() {
  clearInterval(timerInterval);
  isRunning = false;
}

function broadcastToAllPools() {
  pools.forEach((pool, poolId) => {
    const poolTime = (globalTimerValue + pool.offset) % 3600;
    const message = `data: ${JSON.stringify({
      value: poolTime,
      config: pool.config,
      globalTime: globalTimerValue,
      poolId
    })}\n\n`;
    
    pool.clients.forEach(client => {
      try {
        client.write(message);
        pool.lastActivity = new Date(); // Update activity timestamp
      } catch (err) {
        // Remove dead connections
        pool.clients.delete(client);
      }
    });
  });
}

// Optional: Cleanup pools with no activity for 5+ minutes
function cleanupInactivePools() {
  const now = new Date();
  const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
  
  pools.forEach((pool, poolId) => {
    if (now.getTime() - pool.lastActivity.getTime() > inactiveThreshold) {
      pool.clients.forEach(client => client.end());
      pools.delete(poolId);
    }
  });
}

// SSE Endpoint
app.get('/sse/:poolId', (req, res) => {
  try {
    const { poolId } = req.params;
    const clientConfig = req.query.config as string | undefined;

    // Validate config if provided
    if (clientConfig) {
      validateConfig(clientConfig);
    }

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Initialize or update pool
    if (!pools.has(poolId)) {
      pools.set(poolId, {
        config: clientConfig || 'default',
        offset: globalTimerValue,
        clients: new Set(),
        lastActivity: new Date()
      });
      if (!isRunning) startGlobalTimer();
    }

    const pool = pools.get(poolId)!;

    // Send initial state
    const initialTime = (globalTimerValue + pool.offset) % 3600;
    res.write(`data: ${JSON.stringify({
      type: 'init',
      value: initialTime,
      config: pool.config,
      poolId
    })}\n\n`);

    // Add client to pool
    pool.clients.add(res);
    pool.lastActivity = new Date();

    // Remove on disconnect
    req.on('close', () => {
      pool.clients.delete(res);
      if (pool.clients.size === 0) {
        pools.delete(poolId);
        if (pools.size === 0) stopGlobalTimer();
      }
    });

  } catch (error) {
    handleError(res, error);
  }
});

// Config Update Endpoint
app.post('/pool/:poolId/config', express.json(), (req, res) => {
  try {
    const { poolId } = req.params;
    const { config: newConfig } = req.body;

    if (!pools.has(poolId)) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    validateConfig(newConfig);
    const pool = pools.get(poolId)!;
    pool.config = newConfig;
    pool.lastActivity = new Date();

    res.json({ success: true });

  } catch (error) {
    handleError(res, error);
  }
});


app.get('/health', (req, res) => {
  const poolDetails = Array.from(pools.entries()).map(([poolId, pool]) => {
    const connections = Array.from(pool.clients).map((clientRes, index) => {
      const req = (clientRes as any).req as express.Request;
      return {
        connectionId: index + 1,
        ip: getClientIp(req),
        connectedAt: pool.lastActivity.toISOString(),
        durationSec: Math.floor((Date.now() - pool.lastActivity.getTime()) / 1000),
        headers: {
          'user-agent': req.headers['user-agent'],
          'accept': req.headers['accept']
        }
      };
    });

    return {
      poolId,
      config: pool.config,
      offset: pool.offset,
      connectionCount: pool.clients.size,
      lastActivity: pool.lastActivity.toISOString(),
      connections
    };
  });

  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    globalTimerValue,
    isRunning,
    totalPools: pools.size,
    totalConnections: Array.from(pools.values()).reduce(
      (sum, pool) => sum + pool.clients.size, 0),
    pools: poolDetails
  });
});

// Helper function to get client IP
function getClientIp(req: express.Request): string {
  return (req.headers['x-forwarded-for'] || 
    req.socket?.remoteAddress || 
    'unknown').toString().split(',')[0].trim();
}

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log(`- SSE: /sse/:poolId`);
  console.log(`- Config: POST /pool/:poolId/config`);
  console.log(`- Admin: /admin/pools`);
  console.log(`- Health: /health`);
});