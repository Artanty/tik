import { config } from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { handleError } from './error-handler';
import { validateConfig } from './config-validator';
import { poolManager } from './pool-manager';
config();
const PORT = process.env.PORT || 3000;

const app = express();
const httpServer = createServer(app);


app.use('/sse/:poolId/:connId', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// SSE Endpoint
app.get('/sse/:poolId/:connId', (req, res) => {
  // Verify if client is banned
  const verification = poolManager.verifyConnection(req);
  if (!verification.allowed) {
    res.writeHead(403, {
      'Content-Type': 'application/json',
      'Connection': 'close'
    });
    res.end(JSON.stringify({
      error: 'banned',
      reason: verification.reason
    }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*' // Required for SSE CORS
  });

  try {
    poolManager.addConnection(req.params.poolId, req, res);
  } catch (error) {
    handleError(res, error);
  }
});

// Config Update Endpoint
app.post('/pool/:poolId/config', express.json(), (req, res) => {
  try {
    const { config } = req.body;
    poolManager.updateConfig(req.params.poolId, config);
    res.json({ success: true });
  } catch (error) {
    handleError(res, error);
  }
});

// Health Endpoint
app.get('/health', (req, res) => {
  res.json(poolManager.getHealthStatus());
});

// Cleanup Endpoint (optional) [UNTESTED]
app.post('/admin/cleanup', (req, res) => {
  const cleaned = poolManager.cleanupInactivePools();
  res.json({ cleanedPools: cleaned });
});

// Kick specific connection
app.post('/admin/kick', express.json(), (req, res) => {
  const { poolId, connectionId, ban, reason, banHours } = req.body;
  
  const result = poolManager.kickConnection(poolId, connectionId, {
    banClient: ban,
    reason,
    banDurationMs: banHours ? banHours * 60 * 60 * 1000 : undefined
  });

  res.json(result);
});

// List banned clients
app.get('/admin/bans', (req, res) => {
  res.json(Array.from(poolManager.getBannedClients()));
});

// Unban client
app.delete('/admin/bans/:fingerprint', (req, res) => {
  const success = poolManager.unbanClient(req.params.fingerprint);
  res.json({ success });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Optional: Add periodic cleanup
  setInterval(() => {
    const cleaned = poolManager.cleanupInactivePools();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} inactive pools`);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
});