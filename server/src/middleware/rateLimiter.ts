import rateLimit from 'express-rate-limit';

const standardMessage = {
  success: false,
  message: 'Too many requests, please try again later.',
};

/**
 * Auth limiter — applied to /auth/login and /auth/register.
 * Intentionally strict: 10 attempts per 15 minutes to slow brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Reduced from 50 to 10 to limit brute-force vectors
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Session limiter — applied to authenticated session endpoints (e.g., /auth/me).
 * Skipped only during test runs.
 */
export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  // Only skip in test environments — NOT in development or production
  skip: () => process.env.NODE_ENV === 'test',
  message: standardMessage,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Global limiter — applied to all /api/ routes.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: standardMessage,
  standardHeaders: true,
  legacyHeaders: false,
});
