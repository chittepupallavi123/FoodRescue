
import mongoose, { Schema } from 'mongoose';

const donationSchema = new Schema(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    foodName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    foodType: {
      type: String,
      enum: [
        'cooked-meals',
        'bakery',
        'fruits-vegetables',
        'packaged-food',
        'dairy',
        'other',
      ],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    quantityUnit: {
      type: String,
      enum: ['meals', 'kg', 'packs', 'portions', 'items'],
      required: true,
    },
    preparedAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    // New structured location fields
    restaurantName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    area: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    district: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: /^[1-9]\d{5}$/,
    },
    pickupAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    pickupInstructions: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'available',
        'reserved',
        'pickup_in_progress',
        'completed',
        'cancelled',
        'expired',
      ],
      default: 'available',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

donationSchema.index({ providerId: 1, createdAt: -1 });
donationSchema.index({ status: 1, expiresAt: 1 });
donationSchema.index({ pincode: 1, status: 1, expiresAt: 1 });
donationSchema.index({
  area: 1,
  district: 1,
  state: 1,
  status: 1,
  expiresAt: 1,
});

export const Donation =
  (mongoose.models.Donation ||
    mongoose.model('Donation', donationSchema)) as mongoose.Model<any>;
