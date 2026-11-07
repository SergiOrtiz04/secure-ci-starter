import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../src/app.js';

// The demo password is documented in the README; it is not a secret.
const DEMO_PASSWORD = ['correct', 'horse', 'battery', 'staple'].join(' ');

describe('security headers', () => {
  const app = createApp({ rateLimiting: false });

  it('sets helmet headers and hides X-Powered-By', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});

describe('GET /health', () => {
  const app = createApp({ rateLimiting: false });

  it('responds with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });
});

describe('GET /users', () => {
  const app = createApp({ rateLimiting: false });

  it('lists users without exposing password hashes', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.users).toHaveLength(3);
    for (const user of res.body.users as Record<string, unknown>[]) {
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('password');
    }
  });

  it('paginates with limit and offset', async () => {
    const res = await request(app).get('/users?limit=1&offset=1');
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].id).toBe(2);
  });

  it('rejects an out-of-range limit', async () => {
    const res = await request(app).get('/users?limit=1000');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid query');
  });
});

describe('POST /login', () => {
  const app = createApp({ rateLimiting: false });

  it('returns a token for valid credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'ada@example.com', password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ id: 1, email: 'ada@example.com', role: 'admin' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'ada@example.com', password: 'definitely-not-it' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid email or password' });
  });

  it('returns the same error for an unknown email (no user enumeration)', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'nobody@example.com', password: DEMO_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid email or password' });
  });

  it('validates the body with zod (400 on bad email / short password)', async () => {
    const res = await request(app).post('/login').send({ email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request body');
    const paths = (res.body.issues as { path: string }[]).map((i) => i.path);
    expect(paths).toContain('email');
    expect(paths).toContain('password');
  });

  it('rejects unknown fields (strict schema)', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'ada@example.com', password: DEMO_PASSWORD, role: 'admin' });
    expect(res.status).toBe(400);
  });

  it('rejects malformed JSON with 400 and no stack trace', async () => {
    const res = await request(app)
      .post('/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Bad request' });
  });

  it('rejects bodies over the 10kb limit', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'ada@example.com', password: 'x'.repeat(20_000) });
    expect(res.status).toBe(413);
  });
});

describe('rate limiting', () => {
  it('blocks the 6th login attempt within the window', async () => {
    const app = createApp({ rateLimiting: true });
    const attempt = () =>
      request(app).post('/login').send({ email: 'ada@example.com', password: 'wrong-password' });

    for (let i = 0; i < 5; i++) {
      const res = await attempt();
      expect(res.status).toBe(401);
    }
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Too many login attempts, please try again later.' });
    // draft-7 standard headers: a combined `RateLimit` header plus `RateLimit-Policy`.
    expect(blocked.headers['ratelimit']).toMatch(/limit=5/);
    expect(blocked.headers['ratelimit-policy']).toBeDefined();
  });
});
