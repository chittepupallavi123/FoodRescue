import mongoose, { Schema } from 'mongoose';
export const ORG_TYPES = ['provider', 'recipient', 'collector'] as const;
const organizationSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  type: { type: String, enum: ORG_TYPES, required: true, index: true },
  address: { type: String, required: true, trim: true, maxlength: 500 },
  serviceArea: { type: String, trim: true, maxlength: 200 },
  contactEmail: { type: String, required: true, lowercase: true, trim: true },
  contactPhone: { type: String, trim: true, maxlength: 30 },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected', 'suspended'], default: 'pending', index: true },
  verificationReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verificationReviewedAt: { type: Date },
  verificationReason: { type: String, maxlength: 1000 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true, versionKey: false });
organizationSchema.index({ type: 1, verificationStatus: 1, createdAt: -1 });
export const Organization = (mongoose.models.Organization || mongoose.model('Organization', organizationSchema)) as mongoose.Model<any>;