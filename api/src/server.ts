import { createApp } from './app';
import { env } from './env';
import { logger } from './lib/logger';
import { startScheduler } from './modules/triggers/service';

const app = createApp();
app.listen(env.API_PORT, '0.0.0.0', () => {
  logger.info(`FasalShield API on http://localhost:${env.API_PORT} (emulator: http://10.0.2.2:${env.API_PORT})`);
  startScheduler();
});
