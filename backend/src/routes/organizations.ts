import { Router } from 'express';
import mongoose from 'mongoose';
import { Organization } from '../models/Organization.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { orgReviewSchema } from '../validation/auth.js';
const router = Router();
router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user!.organizationId) return res.json({ data: { organization: null } });
  const organization = await Organization.findById(req.user!.organizationId).select('-__v');
  return res.json({ data: { organization } });
}));
router.get('/pending', requireAuth, allowRoles('admin'), asyncHandler(async (_req, res) => {
  const organizations = await Organization.find({ verificationStatus: 'pending' }).sort({ createdAt: 1 }).limit(100).populate('createdBy', 'email displayName');
  return res.json({ data: { organizations } });
}));
router.patch('/:id/review', requireAuth, allowRoles('admin'), asyncHandler(async (req, res) => {
  const input = orgReviewSchema.parse(req.body);
  const organization = await Organization.findById(req.params.id);
  if (!organization) return res.status(404).json({ error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organization not found.' } });
  const previous = organization.verificationStatus;
  organization.verificationStatus = input.decision; organization.verificationReviewedBy = new mongoose.Types.ObjectId(req.user!.id); organization.verificationReviewedAt = new Date(); organization.verificationReason = input.reason; await organization.save();
  await AuditEvent.create({ actorId: req.user!.id, action: 'organization.reviewed', targetType: 'Organization', targetId: organization.id, details: { previous, next: input.decision, reason: input.reason } });
  return res.json({ data: { organization } });
}));
export default router;
