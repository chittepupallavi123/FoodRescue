import dotenv from 'dotenv';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, '../../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_NAME: z.string().default('foodrescue.sid'),
  SMTP_HOST: z.string().optional(), SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.string().transform(v => v === 'true').default('false'),
  SMTP_USER: z.string().optional(), SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('FoodRescue <no-reply@example.com>'),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().optional()
});
export const env = schema.parse(process.env);
export function assertRuntimeConfig() {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || env.SESSION_SECRET.startsWith('replace-with')) throw new Error('Set SESSION_SECRET to a unique random value of at least 32 characters.');
  if (env.NODE_ENV === 'production' && !env.MONGODB_URI) throw new Error('MONGODB_URI is required in production.');
}
