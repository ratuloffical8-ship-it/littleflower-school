// server/src/index.ts
import { createApp } from './app';
import { env } from './config/env';
import { apiRouter } from './routes';
import { healthRouter } from './routes/health';

const app = createApp({ healthRouter, apiRouter });

const server = app.listen(env.port, () => {
  console.log(`[server] listening on port ${env.port} (${env.nodeEnv})`);
  console.log(`[server] allowed origins: ${env.allowedOrigins.join(', ')}`);
  console.log(`[server] App Check enforcement: ${env.appCheckEnforce ? 'ON' : 'OFF'}`);
});

function shutdown(signal: string): void {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
  // Force exit if connections do not close in time
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled promise rejection', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[server] uncaught exception', error);
  process.exit(1);
});
