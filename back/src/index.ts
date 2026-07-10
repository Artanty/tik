import { config } from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors'
import { dd } from './utils/dd';
import { poolManager } from './pool-manager';
import { setOriginMiddleware } from './middlewares/set-origin.middleware';

import saveTempRoutes from './routes/save-temp.routes';
import sseRoutes from './routes/sse.routes';
import adminRoutes from './routes/admin.routes';
import healthRoutes from './routes/health.routes';
import logRoutes from './routes/log.routes';

config();
const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app);

app.use(setOriginMiddleware);
app.use(cors())

app.use('/save-temp', express.json(), saveTempRoutes);
app.use(sseRoutes);
app.use(adminRoutes);
app.use(healthRoutes);
app.use(logRoutes);

httpServer.listen(PORT, () => {
  dd(`Server running on port ${PORT}`);
  setInterval(() => {
    const cleaned = poolManager.cleanupInactivePools();
    if (cleaned > 0) {
      dd(`Cleaned up ${cleaned} inactive pools`);
    }
  }, 5 * 60 * 1000);
});