
import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import { Donation } from '../models/Donation.js';
import { PickupRequest } from '../models/PickupRequest.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { User } from '../models/User.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth);

const requestSchema = z.object({
  donationId: z.string().refine(
    (value) => mongoose.Types.ObjectId.isValid(value),
    'Invalid donation ID.',
  ),
  collectorMessage: z.string().trim().max(1000).optional(),
});

const reviewSchema = z.object({
  decision: z.enum(['accepted', 'rejected']),
  providerMessage: z.string().trim().max(1000).optional(),
});

const idSchema = z.string().refine(
  (value) => mongoose.Types.ObjectId.isValid(value),
  'Invalid request ID.',
);

const statusSchema = z.object({
  status: z.enum(['pickup_in_progress', 'completed']),
});

// Collector requests an available donation.
router.post(
  '/',
  allowRoles('collector'),
  asyncHandler(async (req, res) => {
    const parsed = requestSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid request.',
        },
      });
      return;
    }

    // Enforce email verification on the backend.
    const collector = await User.findById(req.user!.id).select(
      'emailVerifiedAt isSuspended',
    );

    if (!collector || collector.isSuspended) {
      res.status(403).json({
        error: {
          code: 'ACCOUNT_UNAVAILABLE',
          message: 'Your account cannot make pickup requests.',
        },
      });
      return;
    }

    if (!collector.emailVerifiedAt) {
      res.status(403).json({
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Verify your email before requesting a pickup.',
        },
      });
      return;
    }

    // Reserve atomically to prevent two collectors requesting the same donation.
    const donation = await Donation.findOneAndUpdate(
      {
        _id: parsed.data.donationId,
        status: 'available',
        expiresAt: { $gt: new Date() },
        providerId: { $ne: req.user!.id },
      },
      { $set: { status: 'reserved' } },
      { new: true },
    );

    if (!donation) {
      res.status(409).json({
        error: {
          code: 'DONATION_UNAVAILABLE',
          message:
            'This donation is unavailable, expired, or belongs to your account.',
        },
      });
      return;
    }

    let pickupRequest;

    try {
      pickupRequest = await PickupRequest.create({
        donationId: donation._id,
        providerId: donation.providerId,
        collectorId: req.user!.id,
        collectorMessage: parsed.data.collectorMessage || '',
        status: 'pending',
      });
    } catch (error) {
      // Release the reservation if request creation fails.
      await Donation.updateOne(
        { _id: donation._id, status: 'reserved' },
        {
          $set: {
            status:
              donation.expiresAt > new Date() ? 'available' : 'expired',
          },
        },
      );

      throw error;
    }

    await AuditEvent.create({
      actorId: req.user!.id,
      action: 'pickup_request.created',
      targetType: 'PickupRequest',
      targetId: pickupRequest.id,
    });

    res.status(201).json({ data: pickupRequest });
  }),
);

// Collector sees their own requests.
router.get(
  '/mine',
  allowRoles('collector'),
  asyncHandler(async (req, res) => {
    const requests = await PickupRequest.find({
      collectorId: req.user!.id,
    })
      .populate(
        'donationId',
        'foodName foodType quantity quantityUnit pickupAddress expiresAt status',
      )
      .sort({ createdAt: -1 });

    res.json({ data: requests });
  }),
);

// Provider sees requests for their own donations.
router.get(
  '/provider',
  allowRoles('provider'),
  asyncHandler(async (req, res) => {
    const requests = await PickupRequest.find({
      providerId: req.user!.id,
    })
      .populate(
        'donationId',
        'foodName foodType quantity quantityUnit pickupAddress expiresAt status',
      )
      .populate('collectorId', 'displayName email')
      .sort({ createdAt: -1 });

    res.json({ data: requests });
  }),
);

// Provider accepts or rejects a pending request.
router.patch(
  '/:id/review',
  allowRoles('provider'),
  asyncHandler(async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    const parsed = reviewSchema.safeParse(req.body);

    if (!id.success || !parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Provide a valid request ID and review decision.',
        },
      });
      return;
    }

    const current = await PickupRequest.findOne({
      _id: id.data,
      providerId: req.user!.id,
      status: 'pending',
    });

    if (!current) {
      res.status(404).json({
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Pending pickup request not found.',
        },
      });
      return;
    }

    const nextStatus = parsed.data.decision;
    const updated = await PickupRequest.findOneAndUpdate(
      {
        _id: current._id,
        providerId: req.user!.id,
        status: 'pending',
      },
      {
        $set: {
          status: nextStatus,
          providerMessage: parsed.data.providerMessage || '',
          reviewedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updated) {
      res.status(409).json({
        error: {
          code: 'REQUEST_ALREADY_UPDATED',
          message: 'This request has already been reviewed.',
        },
      });
      return;
    }

    // If rejected, release the donation for another collector.
    if (nextStatus === 'rejected') {
      await Donation.updateOne(
        {
          _id: current.donationId,
          providerId: req.user!.id,
          status: 'reserved',
        },
        [
          {
            $set: {
              status: {
                $cond: [
                  { $gt: ['$expiresAt', '$$NOW'] },
                  'available',
                  'expired',
                ],
              },
            },
          },
        ],
      );
    }

    await AuditEvent.create({
      actorId: req.user!.id,
      action: `pickup_request.${nextStatus}`,
      targetType: 'PickupRequest',
      targetId: updated.id,
    });

    res.json({ data: updated });
  }),
);

// Provider moves an accepted pickup through collection and completion.
router.patch(
  '/:id/status',
  allowRoles('provider'),
  asyncHandler(async (req, res) => {
    const id = idSchema.safeParse(req.params.id);
    const parsed = statusSchema.safeParse(req.body);

    if (!id.success || !parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Provide a valid request ID and pickup status.',
        },
      });
      return;
    }

    const current = await PickupRequest.findOne({
      _id: id.data,
      providerId: req.user!.id,
    });

    if (!current) {
      res.status(404).json({
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Pickup request not found.',
        },
      });
      return;
    }

    const nextStatus = parsed.data.status;
    const allowed =
      (current.status === 'accepted' &&
        nextStatus === 'pickup_in_progress') ||
      (current.status === 'pickup_in_progress' &&
        nextStatus === 'completed');

    if (!allowed) {
      res.status(409).json({
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message:
            'Pickup must be accepted, then in progress, before completion.',
        },
      });
      return;
    }

    const updated = await PickupRequest.findOneAndUpdate(
      {
        _id: current._id,
        providerId: req.user!.id,
        status: current.status,
      },
      {
        $set: {
          status: nextStatus,
          ...(nextStatus === 'completed'
            ? { completedAt: new Date() }
            : {}),
        },
      },
      { new: true },
    );

    if (!updated) {
      res.status(409).json({
        error: {
          code: 'REQUEST_ALREADY_UPDATED',
          message: 'The pickup status has changed. Refresh and try again.',
        },
      });
      return;
    }

    const expectedDonationStatus =
      nextStatus === 'completed' ? 'pickup_in_progress' : 'reserved';

    const donationStatus =
      nextStatus === 'completed' ? 'completed' : 'pickup_in_progress';

    await Donation.updateOne(
      {
        _id: current.donationId,
        providerId: req.user!.id,
        status: expectedDonationStatus,
      },
      { $set: { status: donationStatus } },
    );

    await AuditEvent.create({
      actorId: req.user!.id,
      action: `pickup_request.${nextStatus}`,
      targetType: 'PickupRequest',
      targetId: updated.id,
    });

    res.json({ data: updated });
  }),
);

// Collector cancels a request before pickup starts.
router.patch(
  '/:id/cancel',
  allowRoles('collector'),
  asyncHandler(async (req, res) => {
    const id = idSchema.safeParse(req.params.id);

    if (!id.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request ID.',
        },
      });
      return;
    }

    const updated = await PickupRequest.findOneAndUpdate(
      {
        _id: id.data,
        collectorId: req.user!.id,
        status: { $in: ['pending', 'accepted'] },
      },
      { $set: { status: 'cancelled' } },
      { new: true },
    );

    if (!updated) {
      res.status(404).json({
        error: {
          code: 'REQUEST_NOT_CANCELLABLE',
          message: 'Request not found or pickup has already started.',
        },
      });
      return;
    }

    // Release the reserved donation after cancellation.
    await Donation.updateOne(
      {
        _id: updated.donationId,
        providerId: updated.providerId,
        status: 'reserved',
      },
      [
        {
          $set: {
            status: {
              $cond: [
                { $gt: ['$expiresAt', '$$NOW'] },
                'available',
                'expired',
              ],
            },
          },
        },
      ],
    );

    await AuditEvent.create({
      actorId: req.user!.id,
      action: 'pickup_request.cancelled',
      targetType: 'PickupRequest',
      targetId: updated.id,
    });

    res.json({ data: updated });
  }),
);

export default router;
