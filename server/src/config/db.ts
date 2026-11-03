import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
 * Connects to MongoDB with a tuned connection pool (ARCH-005).
 *
 * Pool settings:
 * - maxPoolSize: 10  — limits concurrent connections per Node.js process
 * - minPoolSize: 2   — keeps warm connections available
 * - serverSelectionTimeoutMS: 5000 — fail fast if Atlas/MongoDB is unreachable
 * - socketTimeoutMS: 45000         — matches typical LB idle timeout
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info({ host: conn.connection.host }, 'MongoDB connected');
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection error');
    process.exit(1);
  }
};
