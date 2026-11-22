import { Router } from 'express';
import { poolManager } from '../pool-manager';

const router = Router();

router.get('/health', (req, res) => {
  res.json(poolManager.getHealthStatus());
});

export default router;