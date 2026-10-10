
import mongoose, { Schema } from 'mongoose';

const pickupRequestSchema = new Schema(
  {
    donationId: {
      type: Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collectorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collectorMessage: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    providerMessage: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'rejected',
        'cancelled',
        'pickup_in_progress',
        'completed',
      ],
      default: 'pending',
      index: true,
    },
    reviewedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

pickupRequestSchema.index({ providerId: 1, createdAt: -1 });
pickupRequestSchema.index({ collectorId: 1, createdAt: -1 });
pickupRequestSchema.index({ donationId: 1, status: 1 });

export const PickupRequest =
  (mongoose.models.PickupRequest ||
    mongoose.model('PickupRequest', pickupRequestSchema)) as mongoose.Model<any>;
