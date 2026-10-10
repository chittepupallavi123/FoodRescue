import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { AuditEvent } from '../models/AuditEvent.js';
import {
  registerSchema,
  loginSchema,
  tokenSchema,
  resetSchema,
  changePasswordSchema,
} from '../validation/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createOpaqueToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../utils/security.js';
import { sendActionEmail } from '../utils/mail.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { databaseReady } from '../config/db.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Please try again later.',
    },
  },
});

function publicUser(user: any) {
  return {
    id: user._id?.toString?.() || user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    organization: user.organization
      ? {
          id: user.organization.id,
          name: user.organization.name,
          type: user.organization.type,
          verificationStatus: user.organization.verificationStatus,
        }
      : null,
  };
}

// Register a new account.
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    if (!databaseReady()) {
      return res.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database is not connected.',
        },
      });
    }

    const input = registerSchema.parse(req.body);

    if (await User.exists({ email: input.email })) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_IN_USE',
          message: 'An account with this email already exists.',
        },
      });
    }

    const user = new User({
      email: input.email,
      passwordHash: await hashPassword(input.password),
      displayName: input.displayName,
      role: input.role,
    });

    await user.save();

    let organization = null;

    if (input.organization) {
      organization = await Organization.create({
        ...input.organization,
        name: input.organization.name,
        type: input.role,
        contactEmail: input.email,
        createdBy: user._id,
        verificationStatus: 'pending',
      });

      user.organization = organization._id;
      await user.save();
    }

    const token = createOpaqueToken();

    user.verificationTokenHash = hashToken(token);
    user.verificationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );

    await user.save();

    let emailSent = false;

    try {
      emailSent = await sendActionEmail(
        user.email,
        'Verify your FoodRescue email',
        `${env.APP_BASE_URL}/verify-email?token=${token}`,
        'verify',
      );
    } catch (error) {
      console.error(
        'Verification email could not be sent:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    await AuditEvent.create({
      actorId: user._id,
      action: 'account.registered',
      targetType: 'User',
      targetId: user.id,
      details: { role: user.role },
    });

    return res.status(201).json({
      data: {
        user: publicUser({
          ...user.toObject(),
          organization,
        }),
        emailVerification: emailSent ? 'sent' : 'not_configured',
        message: emailSent
          ? 'Account created. Check your email to verify your address.'
          : 'Account created. Email delivery is not configured; set up SMTP to verify email.',
      },
    });
  }),
);

// Sign in.
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    if (!databaseReady()) {
      return res.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database is not connected.',
        },
      });
    }

    const input = loginSchema.parse(req.body);

    const user = await User.findOne({ email: input.email })
      .select('+passwordHash')
      .populate('organization')
      .exec();

    if (
      !user ||
      !(await verifyPassword(input.password, user.passwordHash)) ||
      user.isSuspended
    ) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email or password is incorrect.',
        },
      });
    }

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((error) =>
        error ? reject(error) : resolve(),
      );
    });

    req.session.userId = user.id;
    user.lastLoginAt = new Date();

    await user.save();

    await AuditEvent.create({
      actorId: user._id,
      action: 'auth.login',
      targetType: 'User',
      targetId: user.id,
      ipAddress: req.ip,
    });

    return res.json({
      data: {
        user: publicUser(user),
      },
    });
  }),
);

// Sign out.
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    res.clearCookie(env.SESSION_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/',
    });

    return res.json({
      data: {
        message: 'Signed out.',
      },
    });
  }),
);

// Get the currently signed-in user.
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.id).populate('organization');

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Please sign in.',
        },
      });
    }

    return res.json({
      data: {
        user: publicUser(user),
      },
    });
  }),
);

// Verify an email using its one-time token.
router.post(
  '/verify-email',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token } = tokenSchema.parse(req.body);

    const user = await User.findOne({
      verificationTokenHash: hashToken(token),
      verificationTokenExpiresAt: { $gt: new Date() },
    }).select('+verificationTokenHash +verificationTokenExpiresAt');

    if (!user) {
      return res.status(400).json({
        error: {
          code: 'TOKEN_INVALID',
          message: 'This verification link is invalid or expired.',
        },
      });
    }

    user.emailVerifiedAt = new Date();
    user.verificationTokenHash = undefined;
    user.verificationTokenExpiresAt = undefined;

    await user.save();

    await AuditEvent.create({
      actorId: user._id,
      action: 'auth.email_verified',
      targetType: 'User',
      targetId: user.id,
    });

    return res.json({
      data: {
        message: 'Email verified successfully.',
      },
    });
  }),
);

// Resend verification to the signed-in user's email address.
router.post(
  '/resend-verification',
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.id);

    if (!user || user.isSuspended) {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_UNAVAILABLE',
          message: 'This account is unavailable.',
        },
      });
    }

    if (user.emailVerifiedAt) {
      return res.json({
        data: {
          emailVerification: 'already_verified',
          message: 'Your email is already verified.',
        },
      });
    }

    const token = createOpaqueToken();

    user.verificationTokenHash = hashToken(token);
    user.verificationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );

    await user.save();

    let emailSent = false;

    try {
      emailSent = await sendActionEmail(
        user.email,
        'Verify your FoodRescue email',
        `${env.APP_BASE_URL}/verify-email?token=${token}`,
        'verify',
      );
    } catch (error) {
      console.error(
        'Verification email could not be sent:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    if (!emailSent) {
      return res.json({
        data: {
          emailVerification: 'not_configured',
          message:
            'Email delivery is unavailable. Please configure SMTP in the backend environment.',
        },
      });
    }

    return res.json({
      data: {
        emailVerification: 'sent',
        message: 'Verification email sent. Please check your inbox.',
      },
    });
  }),
);

// Request a password reset.
router.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (email && email.length <= 254) {
      const user = await User.findOne({ email });

      if (user && !user.isSuspended) {
        const token = createOpaqueToken();

        user.passwordResetTokenHash = hashToken(token);
        user.passwordResetExpiresAt = new Date(
          Date.now() + 30 * 60 * 1000,
        );

        await user.save();

        try {
          await sendActionEmail(
            user.email,
            'Reset your FoodRescue password',
            `${env.APP_BASE_URL}/reset-password?token=${token}`,
            'reset',
          );
        } catch (error) {
          console.error(
            'Password reset email could not be sent:',
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      }
    }

    return res.json({
      data: {
        message:
          'If an account matches that email, password reset instructions will be sent when email delivery is configured.',
      },
    });
  }),
);

// Reset a password using its one-time token.
router.post(
  '/reset-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = resetSchema.parse(req.body);

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(input.token),
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      return res.status(400).json({
        error: {
          code: 'TOKEN_INVALID',
          message: 'This password reset link is invalid or expired.',
        },
      });
    }

    user.passwordHash = await hashPassword(input.password);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;

    await user.save();

    await AuditEvent.create({
      actorId: user._id,
      action: 'auth.password_reset',
      targetType: 'User',
      targetId: user.id,
    });

    return res.json({
      data: {
        message: 'Password updated. You can now sign in.',
      },
    });
  }),
);

// Change a password while signed in.
router.post(
  '/change-password',
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);

    const user = await User.findById(req.user!.id).select('+passwordHash');

    if (
      !user ||
      !(await verifyPassword(input.currentPassword, user.passwordHash))
    ) {
      return res.status(400).json({
        error: {
          code: 'PASSWORD_MISMATCH',
          message: 'Current password is incorrect.',
        },
      });
    }

    user.passwordHash = await hashPassword(input.newPassword);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;

    await user.save();

    await AuditEvent.create({
      actorId: user._id,
      action: 'auth.password_changed',
      targetType: 'User',
      targetId: user.id,
    });

    return res.json({
      data: {
        message: 'Password changed successfully.',
      },
    });
  }),
);

export default router;