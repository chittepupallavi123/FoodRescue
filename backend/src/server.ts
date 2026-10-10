import { assertRuntimeConfig, env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import app from './app.js';
assertRuntimeConfig();
try { await connectDatabase(); } catch (error) { console.error('MongoDB connection failed:', error instanceof Error ? error.message : 'unknown error'); }
const server = app.listen(env.PORT, () => console.info(`FoodRescue API listening on port ${env.PORT}`));
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
