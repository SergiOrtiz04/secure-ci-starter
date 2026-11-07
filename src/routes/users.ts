/**
 * GET /users — list users (public fields only).
 *
 * The in-memory store stands in for a database. Note the explicit mapping to
 * `PublicUser`: the password hash never leaves this module, so a future
 * `res.json(users)` refactor can't accidentally leak it.
 */
import { Router } from 'express';
import { z } from 'zod';

import { listUsers, type PublicUser } from '../users-store.js';

export const usersRouter = Router();

// Query-string validation: pagination is bounded so nobody can ask for
// `?limit=1000000` and tie up the process.
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

usersRouter.get('/', (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query', issues: parsed.error.issues });
    return;
  }

  const { limit, offset } = parsed.data;
  const all = listUsers();
  const page: PublicUser[] = all.slice(offset, offset + limit);

  res.json({ total: all.length, limit, offset, users: page });
});
