import type { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { databaseReady } from '../config/db.js';
export type AppRole = 'provider' | 'recipient' | 'collector' | 'admin';
declare module 'express-session' { interface SessionData { userId?: string } }
declare global { namespace Express { interface Request { user?: { id: string; email: string; role: AppRole; displayName: string; organizationId?: string; emailVerified: boolean } } } }
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!databaseReady()) return res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is not connected. Configure MONGODB_URI and restart the backend.' } });
  if (!req.session.userId) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' } });
  const user = await User.findById(req.session.userId).populate('organization').exec();
  if (!user || user.isSuspended) { req.session.destroy(() => undefined); return res.status(401).json({ error: { code: 'SESSION_INVALID', message: 'This session is no longer valid.' } }); }
  const org = user.organization as unknown as { _id?: { toString(): string }; verificationStatus?: string } | undefined;
  req.user = { id: user.id, email: user.email, role: user.role as AppRole, displayName: user.displayName, organizationId: org?._id?.toString(), emailVerified: Boolean(user.emailVerifiedAt) };
  next();
}
export function allowRoles(...roles: AppRole[]) { return (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' } });
  next();
}; }
