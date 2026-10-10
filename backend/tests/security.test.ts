import { describe, expect, it } from 'vitest';
import { createOpaqueToken, hashToken, isStrongPassword, safeEqualHex } from '../src/utils/security.js';
import { registerSchema } from '../src/validation/auth.js';
describe('security utilities', () => {
  it('creates unique opaque tokens and hashes them deterministically', () => {
    const a = createOpaqueToken(); const b = createOpaqueToken();
    expect(a).not.toBe(b); expect(a).toHaveLength(64); expect(hashToken(a)).toBe(hashToken(a)); expect(hashToken(a)).not.toBe(a);
  });
  it('compares equal-length hex hashes safely', () => { expect(safeEqualHex('aabb', 'aabb')).toBe(true); expect(safeEqualHex('aabb', 'aabc')).toBe(false); expect(safeEqualHex('aa', 'aaaa')).toBe(false); });
  it('enforces long passwords', () => { expect(isStrongPassword('long-password-123')).toBe(true); expect(isStrongPassword('short')).toBe(false); expect(isStrongPassword('x'.repeat(129))).toBe(false); });
});
describe('registration validation', () => {
  const base = { email: 'PALLAVI@example.com', password: 'a-very-long-password', displayName: 'Pallavi', role: 'provider', organization: { name: 'Community Kitchen', address: '12 Example Road, Hyderabad' } };
  it('normalizes email and accepts a provider organization', () => { const result = registerSchema.parse(base); expect(result.email).toBe('pallavi@example.com'); });
  it('does not allow public admin registration', () => { expect(registerSchema.safeParse({ ...base, role: 'admin' }).success).toBe(false); });
  it('requires organization details for providers', () => { expect(registerSchema.safeParse({ email: 'x@y.com', password: 'a-very-long-password', displayName: 'Person', role: 'provider' }).success).toBe(false); });
  it('allows a collector without an organization', () => { expect(registerSchema.safeParse({ email: 'x@y.com', password: 'a-very-long-password', displayName: 'Person', role: 'collector' }).success).toBe(true); });
});
