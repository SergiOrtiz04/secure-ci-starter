/**
 * Express application factory.
 *
 * Kept separate from `index.ts` so tests can import the app without
 * binding to a port. Everything security-relevant lives here:
 *
 *   - helmet            → sensible HTTP security headers (CSP, HSTS, nosniff, ...)
 *   - express-rate-limit → global limiter + a stricter one on /login
 *   - body size limit   → 10 KB is plenty for a JSON API; stops trivial DoS
 *   - zod               → every request body is validated before it reaches logic
 *   - no stack traces   → the error handler never leaks internals to clients
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import { healthRouter } from './routes/health.js';
import { usersRouter } from './routes/users.js';
import { loginRouter } from './routes/login.js';

export interface AppOptions {
  /** Disable rate limiting in unit tests that hammer endpoints. */
  rateLimiting?: boolean;
}

export function createApp(options: AppOptions = {}): express.Express {
  const { rateLimiting = true } = options;
  const app = express();

  // Behind a reverse proxy (Render, Fly, Heroku, nginx) the client IP is in
  // X-Forwarded-For. `1` trusts exactly one hop; never use `true` in prod
  // because it lets clients spoof their IP and bypass rate limits.
  app.set('trust proxy', 1);

  // Hide the "X-Powered-By: Express" fingerprint. helmet does this too, but
  // being explicit documents intent.
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  if (rateLimiting) {
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 100, // 100 requests per IP per window
        standardHeaders: 'draft-7', // RateLimit-* headers
        legacyHeaders: false,
        message: { error: 'Too many requests, please try again later.' },
      }),
    );
  }

  app.use('/health', healthRouter);
  app.use('/users', usersRouter);
  app.use('/login', loginRouter({ rateLimiting }));

  // 404 — JSON, never HTML, so we don't reflect the path back unescaped.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler. Logs server-side, returns a generic message.
  // (Express 5 forwards rejected promises here automatically.)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // Malformed JSON from express.json() carries a status of 400.
    const status =
      typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
        ? err.status
        : 500;

    if (status >= 500) {
      console.error('[unhandled error]', err);
    }

    res.status(status).json({
      error: status >= 500 ? 'Internal server error' : 'Bad request',
    });
  });

  return app;
}
