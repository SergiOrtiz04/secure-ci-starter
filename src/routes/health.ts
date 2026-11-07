/**
 * GET /health — liveness probe for load balancers and uptime checks.
 * Deliberately exposes nothing about versions, hostnames or dependencies.
 */
import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()) });
});
