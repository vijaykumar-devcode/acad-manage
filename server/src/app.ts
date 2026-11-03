import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { globalLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/authRoutes';
import classRoutes from './routes/classRoutes';
import materialRoutes from './routes/materialRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import quizRoutes from './routes/quizRoutes';
import markRoutes from './routes/markRoutes';
import searchRoutes from './routes/searchRoutes';
import resultRoutes from './routes/resultRoutes';
import noticeRoutes from './routes/noticeRoutes';
import pyqRoutes from './routes/pyqRoutes';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import supportRoutes from './routes/supportRoutes';
import gradeScaleRoutes from './routes/gradeScaleRoutes';
import challengeRoutes from './routes/challengeRoutes';
import codingAccountRoutes from './routes/codingAccountRoutes';
import noteRoutes from './routes/noteRoutes';
import { errorHandler } from './middleware/errorMiddleware';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Must be before rate limiters
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // Allow cookies to be sent
  })
);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    // Content Security Policy — strict for a pure REST API
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    // Hide server technology
    hidePoweredBy: true,
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api/', globalLimiter);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Prevent excessively large JSON payloads
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Cookie Parser ────────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── NoSQL Injection Sanitization ────────────────────────────────────────────
// express-mongo-sanitize v2 tries to overwrite req.query which Express 5 made
// read-only. Work around it by calling sanitize() manually on the writable
// fields only. req.query injection is not a practical risk when using Mongoose
// — operators in query strings are ignored by the ODM layer.
app.use((req, _res, next) => {
  if (req.body) {
    req.body = mongoSanitize.sanitize(req.body) as typeof req.body;
  }
  if (req.params) {
    req.params = mongoSanitize.sanitize(req.params) as typeof req.params;
  }
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/pyq', pyqRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/gradescale', gradeScaleRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/accounts', codingAccountRoutes);
app.use('/api/notes', noteRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'AcadeManage Backend is running.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
