import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export async function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash); }
export function createOpaqueToken(bytes = 32) { return randomBytes(bytes).toString('hex'); }
export function hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, 'hex'); const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}
export function isStrongPassword(password: string) { return password.length >= 12 && password.length <= 128; }
