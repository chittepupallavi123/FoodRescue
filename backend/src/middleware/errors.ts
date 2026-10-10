import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
export function notFound(_req: Request, res: Response) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'The requested endpoint was not found.' } }); }
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please check the submitted fields.', details: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) } });
  const err = error as { status?: number; code?: number; message?: string };
  if (err?.code === 11000) return res.status(409).json({ error: { code: 'DUPLICATE', message: 'A record with these details already exists.' } });
  const status = err?.status && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error('Unhandled request error:', error instanceof Error ? error.message : 'unknown error');
  return res.status(status).json({ error: { code: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR', message: status === 500 ? 'Something went wrong. Please try again later.' : (err.message || 'Request failed.') } });
}
