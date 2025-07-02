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


app.use('/sse/:poolId', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// SSE Endpoint
app.get('/sse/:poolId', (req, res) => {
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

// Cleanup Endpoint (optional)
app.post('/admin/cleanup', (req, res) => {
  const cleaned = poolManager.cleanupInactivePools();
  res.json({ cleanedPools: cleaned });
});

// Kick specific connection
app.post('/admin/pools/:poolId/kick/:connectionId', (req, res) => {
  try {
    const { poolId, connectionId } = req.params;
    const success = poolManager.kickConnection(poolId, connectionId);
    
    res.json({
      success,
      message: success 
        ? `Connection ${connectionId} kicked from pool ${poolId}`
        : `Connection or pool not found`
    });
  } catch (error) {
    handleError(res, error);
  }
});

// Kick all connections in pool
app.post('/admin/pools/:poolId/kick-all', (req, res) => {
  try {
    const { poolId } = req.params;
    const kickedCount = poolManager.kickAllInPool(poolId);
    
    res.json({
      success: kickedCount > 0,
      kickedCount,
      message: kickedCount > 0
        ? `Kicked ${kickedCount} connections from pool ${poolId}`
        : `Pool not found or empty`
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/admin/pools/:poolId', (req, res) => {
  try {
    const { poolId } = req.params;
    const { success, disconnected } = poolManager.removePool(poolId);

    if (success) {
      res.json({
        status: 'success',
        message: `Pool '${poolId}' removed`,
        disconnectedClients: disconnected,
        remainingPools: poolManager.getPoolCount(), // Now using the correct method
        activePools: poolManager.getPoolIds()      // Optional: list remaining pools
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: `Pool '${poolId}' not found`,
        activePools: poolManager.getPoolIds()     // Helpful for debugging
      });
    }
  } catch (error) {
    handleError(res, error);
  }
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