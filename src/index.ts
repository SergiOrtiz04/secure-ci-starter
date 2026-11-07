/**
 * Process entry point. Reads config from the environment and starts the server.
 * No secrets are read here — see `.env.example` for the expected variables.
 */
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid PORT: ${process.env.PORT}`);
  process.exit(1);
}

const app = createApp();

const server = app.listen(port, () => {
  console.log(`secure-ci-starter listening on http://localhost:${port}`);
});

// Graceful shutdown so in-flight requests finish on SIGTERM (containers, PaaS).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
  });
}
