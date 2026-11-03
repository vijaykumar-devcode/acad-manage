import pino from 'pino';

/**
 * Application-wide structured logger using pino.
 *
 * - In development: pretty-printed output via pino-pretty
 * - In production: JSON output (machine-readable, aggregation-friendly)
 *
 * Usage:
 *   import logger from '../utils/logger';
 *   logger.info({ userId }, 'User logged in');
 *   logger.error({ err }, 'Unhandled error');
 */
const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    base: { pid: process.pid, env: process.env.NODE_ENV },
  },
  process.env.NODE_ENV !== 'production'
    ? pino.transport({
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      })
    : undefined
);

export default logger;
