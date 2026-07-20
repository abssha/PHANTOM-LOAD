import mongoose from 'mongoose';

const topVampireSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  roomName: { type: String, required: true, trim: true },
  score: { type: Number, required: true }
}, { _id: false });

const roomSummarySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  applianceCount: { type: Number, required: true },
  monthlyKwh: { type: Number, required: true },
  monthlyCost: { type: Number, required: true }
}, { _id: false });

const auditSchema = new mongoose.Schema({
  _id: { type: String, required: true, trim: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  client_id: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  createdAt: { type: Date, required: true },
  ratePerUnit: { type: Number, required: true },
  totalMonthlyKwh: { type: Number, required: true },
  totalMonthlyCost: { type: Number, required: true },
  totalCO2: { type: Number, required: true },
  topVampires: { type: [topVampireSchema], default: [] },
  roomSummary: { type: [roomSummarySchema], default: [] },
  inventorySnapshot: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { versionKey: false });

auditSchema.index(
  { user_id: 1, client_id: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user_id: { $exists: true },
      client_id: { $exists: true }
    }
  }
);

export const Audit = mongoose.model('Audit', auditSchema);
