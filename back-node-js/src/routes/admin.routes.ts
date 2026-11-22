import express, { Router } from 'express';
import { poolManager } from '../pool-manager';

const router = Router();

router.post('/admin/cleanup', (req, res) => {
  const cleaned = poolManager.cleanupInactivePools();
  res.json({ cleanedPools: cleaned });
});

router.post('/admin/kick', express.json(), (req, res) => {
  const { poolId, connectionId, ban, reason, banHours } = req.body;
  const result = poolManager.kickConnection(poolId, connectionId, {
    banClient: ban,
    reason,
    banDurationMs: banHours ? banHours * 60 * 60 * 1000 : undefined
  });
  res.json(result);
});

router.get('/admin/bans', (req, res) => {
  res.json(Array.from(poolManager.getBannedClients()));
});

router.delete('/admin/bans/:fingerprint', (req, res) => {
  const success = poolManager.unbanClient(req.params.fingerprint);
  res.json({ success });
});

export default router;