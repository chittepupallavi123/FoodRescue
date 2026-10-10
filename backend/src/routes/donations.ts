
import { Router } from 'express';
import { z } from 'zod';
import { Donation } from '../models/Donation.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const donationSchema = z.object({
  foodName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  foodType: z.enum([
    'cooked-meals',
    'bakery',
    'fruits-vegetables',
    'packaged-food',
    'dairy',
    'other',
  ]),
  quantity: z.coerce.number().finite().positive(),
  quantityUnit: z.enum(['meals', 'kg', 'packs', 'portions', 'items']),
  preparedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),

  restaurantName: z.string().trim().min(2).max(150),
  area: z.string().trim().min(2).max(120),
  district: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: z.string().trim().regex(
    /^[1-9]\d{5}$/,
    'Enter a valid 6-digit Indian PIN code.',
  ),

  pickupAddress: z.string().trim().min(5).max(500),
  pickupInstructions: z.string().trim().max(1000).optional(),
}).superRefine((data, ctx) => {
  if (data.expiresAt <= data.preparedAt) {
    ctx.addIssue({
      code: 'custom',
      path: ['expiresAt'],
      message: 'Expiry time must be after preparation time.',
    });
  }

  if (data.expiresAt <= new Date()) {
    ctx.addIssue({
      code: 'custom',
      path: ['expiresAt'],
      message: 'Expiry time must be in the future.',
    });
  }

  if (data.preparedAt > new Date()) {
    ctx.addIssue({
      code: 'custom',
      path: ['preparedAt'],
      message: 'Preparation time cannot be in the future.',
    });
  }
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Collectors can browse and search real, currently available donations.
router.get(
  '/available',
  requireAuth,
  allowRoles('collector'),
  asyncHandler(async (req, res) => {
    const now = new Date();
    const rawSearch = req.query.search;
    const search = typeof rawSearch === 'string'
      ? rawSearch.trim().slice(0, 100)
      : '';

    await Donation.updateMany(
      {
        status: 'available',
        expiresAt: { $lte: now },
      },
      { $set: { status: 'expired' } },
    );

    const filter: Record<string, any> = {
      status: 'available',
      expiresAt: { $gt: now },
    };

    if (search) {
      const safeSearch = escapeRegex(search);
      const contains = new RegExp(safeSearch, 'i');

      filter.$or = [
        { restaurantName: contains },
        { area: contains },
        { district: contains },
        { state: contains },
        { pincode: search },
      ];
    }

    const donations = await Donation.find(filter)
      .sort({ expiresAt: 1 })
      .lean();

    res.json({ data: donations });
  }),
);

// Routes below this point are for providers.
router.use(requireAuth, allowRoles('provider'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = donationSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message:
            parsed.error.issues[0]?.message ||
            'Invalid donation details.',
        },
      });
      return;
    }

    const donation = await Donation.create({
      ...parsed.data,
      providerId: req.user!.id,
      ...(req.user!.organizationId
        ? { organizationId: req.user!.organizationId }
        : {}),
    });

    await AuditEvent.create({
      actorId: req.user!.id,
      action: 'donation.created',
      targetType: 'Donation',
      targetId: donation.id,
    });

    res.status(201).json({ data: donation });
  }),
);

router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const now = new Date();

    await Donation.updateMany(
      {
        providerId: req.user!.id,
        status: 'available',
        expiresAt: { $lte: now },
      },
      { $set: { status: 'expired' } },
    );

    const donations = await Donation.find({
      providerId: req.user!.id,
    }).sort({ createdAt: -1 });

    res.json({ data: donations });
  }),
);

router.patch(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const donation = await Donation.findOneAndUpdate(
      {
        _id: req.params.id,
        providerId: req.user!.id,
        status: 'available',
        expiresAt: { $gt: new Date() },
      },
      { $set: { status: 'cancelled' } },
      { new: true, runValidators: true },
    );

    if (!donation) {
      res.status(404).json({
        error: {
          code: 'DONATION_NOT_CANCELLABLE',
          message:
            'Donation not found, expired, or no longer available to cancel.',
        },
      });
      return;
    }

    await AuditEvent.create({
      actorId: req.user!.id,
      action: 'donation.cancelled',
      targetType: 'Donation',
      targetId: donation.id,
    });

    res.json({ data: donation });
  }),
);

export default router;
