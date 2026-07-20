import { Audit } from '../models/Audit.js';

function buildScopedAuditId(userId, clientId) {
  return `${userId.toString()}:${clientId}`;
}

function serializeAudit(audit) {
  return {
    _id: audit.client_id || audit._id,
    user_id: audit.user_id,
    label: audit.label,
    createdAt: audit.createdAt,
    ratePerUnit: audit.ratePerUnit,
    totalMonthlyKwh: audit.totalMonthlyKwh,
    totalMonthlyCost: audit.totalMonthlyCost,
    totalCO2: audit.totalCO2,
    topVampires: audit.topVampires,
    roomSummary: audit.roomSummary,
    inventorySnapshot: audit.inventorySnapshot
  };
}

export const auditController = {
  async create(req, res, next) {
    try {
      const clientId = (req.body._id || req.body.id || `snapshot_${Date.now()}`).trim();
      const audit = await Audit.create({
        _id: buildScopedAuditId(req.user._id, clientId),
        user_id: req.user._id,
        client_id: clientId,
        label: req.body.label.trim(),
        createdAt: req.body.createdAt ? new Date(req.body.createdAt) : new Date(),
        ratePerUnit: req.body.ratePerUnit,
        totalMonthlyKwh: req.body.totalMonthlyKwh,
        totalMonthlyCost: req.body.totalMonthlyCost,
        totalCO2: req.body.totalCO2,
        topVampires: req.body.topVampires,
        roomSummary: req.body.roomSummary,
        inventorySnapshot: Array.isArray(req.body.inventorySnapshot) ? req.body.inventorySnapshot : []
      });

      res.status(201).json(serializeAudit(audit));
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({ error: 'An audit with this id already exists' });
      }

      next(err);
    }
  },

  async getAll(req, res, next) {
    try {
      const audits = await Audit.find({ user_id: req.user._id }).sort({ createdAt: -1 });
      res.json(audits.map(serializeAudit));
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const audit = await Audit.findOne({
        user_id: req.user._id,
        $or: [
          { _id: buildScopedAuditId(req.user._id, req.params.id) },
          { client_id: req.params.id }
        ]
      });
      if (!audit) {
        return res.status(404).json({ error: 'Audit not found' });
      }

      res.json(serializeAudit(audit));
    } catch (err) {
      next(err);
    }
  }
};
