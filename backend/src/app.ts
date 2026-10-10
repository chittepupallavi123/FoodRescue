
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';

import { env } from './config/env.js';
import { databaseReady } from './config/db.js';

import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organizations.js';
import donationRoutes from './routes/donations.js';
import pickupRequestRoutes from './routes/pickupRequests.js';

import { notFound, errorHandler } from './middleware/errors.js';

const app = express();

app.disable('x-powered-by');

app.set(
  'trust proxy',
  env.NODE_ENV === 'production' ? 1 : false,
);

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
);

app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.get('origin');

    if (origin && origin !== env.FRONTEND_ORIGIN) {
      res.status(403).json({
        error: {
          code: 'ORIGIN_REJECTED',
          message: 'Request origin is not allowed.',
        },
      });
      return;
    }
  }

  next();
});

const sessionOptions: session.SessionOptions = {
  name: env.SESSION_NAME,
  secret:
    env.SESSION_SECRET ||
    'development-only-secret-replace-before-use',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8,
    path: '/',
  },
  ...(env.MONGODB_URI
    ? {
        store: MongoStore.create({
          mongoUrl: env.MONGODB_URI,
          collectionName: 'sessions',
          ttl: 60 * 60 * 8,
        }),
      }
    : {}),
};

app.use(session(sessionOptions));

// Health check
app.get('/api/v1/health', (_req, res) => {
  const connected = databaseReady();

  res.status(connected ? 200 : 503).json({
    data: {
      status: connected ? 'ok' : 'degraded',
      database: connected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    },
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/donations', donationRoutes);
app.use('/api/v1/pickup-requests', pickupRequestRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
