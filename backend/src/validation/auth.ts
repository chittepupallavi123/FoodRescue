  import { z } from 'zod';
  import { isStrongPassword } from '../utils/security.js';
  const password = z.string().refine(isStrongPassword, 'Password must be between 12 and 128 characters.');
  export const registerSchema = z.object({
    email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
    password,
    displayName: z.string().trim().min(2).max(100),
    role: z.enum(['provider', 'recipient', 'collector']),
    organization: z.object({ name: z.string().trim().min(2).max(160), address: z.string().trim().min(5).max(500), serviceArea: z.string().trim().max(200).optional(), contactPhone: z.string().trim().max(30).optional() }).optional()
  }).superRefine((v, ctx) => {
    if (v.role !== 'collector' && !v.organization) ctx.addIssue({ code: 'custom', path: ['organization'], message: 'Organization details are required for providers and recipient organizations.' });
  });
  export const loginSchema = z.object({ email: z.string().trim().email().transform(v => v.toLowerCase()), password: z.string().min(1).max(128) });
  export const tokenSchema = z.object({ token: z.string().min(32).max(256) });
  export const resetSchema = z.object({ token: z.string().min(32).max(256), password });
  export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password });
  export const orgReviewSchema = z.object({ decision: z.enum(['verified', 'rejected', 'suspended']), reason: z.string().trim().max(1000).optional() });
