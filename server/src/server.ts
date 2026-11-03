import 'dotenv/config'; // Load environment variables first, before any other imports
import app from './app';
import { connectDB } from './config/db';
import logger from './utils/logger';
import { startSyncWorker } from './workers/challengeSyncWorker';
import { startCleanupWorker } from './workers/resultCleanupWorker';

const PORT = process.env.PORT || 5000;

// Connect to database, then start the server
connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV ?? 'development' }, 'Server started');

    // Initialize automated background sync
    startSyncWorker();
    // Initialize automated result cleanup (purges data >7 days after contest end)
    startCleanupWorker();
  });
});

// Handle unhandled promise rejections — log and exit cleanly
process.on('unhandledRejection', (reason: unknown) => {
  logger.error({ reason }, 'Unhandled promise rejection');
  process.exitCode = 1;
  setTimeout(() => process.exit(1), 500);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});
