import mongoose, { Schema, type InferSchemaType } from 'mongoose';
export const USER_ROLES = ['provider', 'recipient', 'collector', 'admin'] as const;
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: USER_ROLES, required: true },
  displayName: { type: String, required: true, trim: true, maxlength: 100 },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  emailVerifiedAt: { type: Date },
  verificationTokenHash: { type: String, select: false },
  verificationTokenExpiresAt: { type: Date, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  isSuspended: { type: Boolean, default: false },
  lastLoginAt: { type: Date }
}, { timestamps: true, versionKey: false });
userSchema.index({ verificationTokenHash: 1 }, { sparse: true });
userSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });
export type UserDocument = InferSchemaType<typeof userSchema> & mongoose.Document;
export const User = (mongoose.models.User || mongoose.model('User', userSchema)) as mongoose.Model<any>;