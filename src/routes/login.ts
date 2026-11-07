/**
 * POST /login — credential check with:
 *
 *   - zod schema: rejects missing/oversized/malformed fields *before* any logic
 *   - strict rate limit: 5 attempts per 15 min per IP (brute-force protection)
 *   - uniform error: same status + body for "unknown email" and "wrong password"
 *
 * On success it returns an opaque session token. In a real app you'd issue a
 * signed JWT or a server-side session; here we keep it dependency-free.
 */
import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { authenticate } from '../users-store.js';

const loginSchema = z
  .object({
    email: z.email().max(254),
    // Upper bound matters: scrypt cost scales with input length, and very long
    // passwords are a classic DoS vector against hashing endpoints.
    password: z.string().min(8).max(128),
  })
  .strict(); // unknown keys → 400, so mass-assignment style bugs can't sneak in

export function loginRouter(options: { rateLimiting: boolean }): Router {
  const router = Router();

  if (options.rateLimiting) {
    router.use(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 5,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        // Successful logins don't count against the limit.
        skipSuccessfulRequests: true,
        message: { error: 'Too many login attempts, please try again later.' },
      }),
    );
  }

  router.post('/', (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }

    const user = authenticate(parsed.data.email, parsed.data.password);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    res.json({
      token: randomBytes(32).toString('base64url'),
      user,
    });
  });

  return router;
}
