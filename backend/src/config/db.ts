import mongoose from 'mongoose';
import { env } from './env.js';
export async function connectDatabase() {
  if (!env.MONGODB_URI) {
    console.warn('MONGODB_URI is not configured; database-backed API operations will be unavailable.');
    return false;
  }
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.info('MongoDB connected');
  return true;
}
export function databaseReady() { return mongoose.connection.readyState === 1; }
