import mongoose, { Schema } from 'mongoose';
const auditSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true, maxlength: 100 },
  targetType: { type: String, required: true, maxlength: 80 },
  targetId: { type: String, required: true, maxlength: 100 },
  details: { type: Schema.Types.Mixed },
  ipAddress: { type: String, maxlength: 80 }
}, { timestamps: true, versionKey: false });
auditSchema.index({ actorId: 1, createdAt: -1 });
auditSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
export const AuditEvent = (mongoose.models.AuditEvent || mongoose.model('AuditEvent', auditSchema)) as mongoose.Model<any>;