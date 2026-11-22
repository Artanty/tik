import { Router } from 'express';
import { ResponseLogController } from '../controllers/responseLogController';

const router = Router();

router.post('/logs', ResponseLogController.getLogs);

export default router;