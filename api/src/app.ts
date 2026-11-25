import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { env } from './env';
import { prisma } from './db';
import { logger } from './lib/logger';
import { errorHandler, HttpError } from './lib/http';
import { authRouter } from './modules/auth.routes';
import { staffRouter } from './modules/staff.routes';
import { portalRouter } from './modules/admin/portal.routes';
import { farmerRouter } from './modules/farmer.routes';
import { agentRouter } from './modules/agent.routes';
import { policyRouter } from './modules/policy.routes';
import { adminRouter } from './modules/triggers/simulator.routes';
import { cronRouter } from './modules/cron.routes';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger, genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID() }));
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));

  app.get('/health', async (_req, res) => {
    let db = 'up';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    res.status(db === 'up' ? 200 : 503).json({ status: db === 'up' ? 'ok' : 'degraded', db, env: env.APP_ENV, time: new Date().toISOString() });
  });

  const v1 = express.Router();
  v1.use('/auth', authRouter);
  v1.use('/staff', staffRouter); // staff portal sign-in (password + authenticator code)
  v1.use('/cron', cronRouter); // daily rain check on serverless hosts
  v1.use('/admin', adminRouter); // each router applies its own guard, so mount under distinct prefixes
  v1.use('/admin', portalRouter); // admin portal (A2–A7): staff session + per-route roles
  v1.use('/agent', agentRouter); // field agents: assisted enrolment
  v1.use('/me', farmerRouter);
  v1.use(policyRouter); // last: its FARMER guard would otherwise shadow later routes
  app.use('/api/v1', v1);

  app.use((_req, _res, next) => next(new HttpError(404, 'not_found')));
  app.use(errorHandler);
  return app;
}
