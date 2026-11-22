import express, { Router } from 'express';
import { handleError } from '../error-handler';
import { poolManager } from '../pool-manager';
import { OuterEventsStateController } from '../controllers/outerEventsStateController';
import { validateUserAccessToken } from '../middlewares/validateUserAccessToken';
import { dd } from '../utils/dd';
import { getUserFromRequest } from '../utils/getUserFromRequest';

const router = Router();

router.get('/sse/:poolId', validateUserAccessToken, (req, res) => {
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

  const userHandlerPoolId = getUserFromRequest(req);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  try {
    poolManager.addConnection(userHandlerPoolId, req, res);
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/pool/:poolId/config', express.json(), (req, res) => {
  try {
    const { config } = req.body;
    poolManager.updateConfig(req.params.poolId, config);
    res.json({ success: true });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/collectEventsState', express.json(), validateUserAccessToken, async (req: any, res: any) => {
  try {
    const result = await OuterEventsStateController.getEventsState(req);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/updateEventsState', express.json(), validateUserAccessToken, async (req, res) => {
  dd('ROUTE: /updateEventsState');
  try {
    const { config } = req.body;
    const result = await OuterEventsStateController.updateEventsState(req);
  
    res.json({ data: result });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;