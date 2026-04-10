import { Audit } from '../models/Audit.js';

function serializeAudit(audit) {
  return {
    _id: audit._id,
    label: audit.label,
    createdAt: audit.createdAt,
    ratePerUnit: audit.ratePerUnit,
    totalMonthlyKwh: audit.totalMonthlyKwh,
    totalMonthlyCost: audit.totalMonthlyCost,
    totalCO2: audit.totalCO2,
    topVampires: audit.topVampires,
    roomSummary: audit.roomSummary
  };
}

export const auditController = {
  async create(req, res, next) {
    try {
      const audit = await Audit.create({
        _id: req.body._id.trim(),
        label: req.body.label.trim(),
        createdAt: new Date(req.body.createdAt),
        ratePerUnit: req.body.ratePerUnit,
        totalMonthlyKwh: req.body.totalMonthlyKwh,
        totalMonthlyCost: req.body.totalMonthlyCost,
        totalCO2: req.body.totalCO2,
        topVampires: req.body.topVampires,
        roomSummary: req.body.roomSummary
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
      const audits = await Audit.find().sort({ createdAt: -1 });
      res.json(audits.map(serializeAudit));
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const audit = await Audit.findById(req.params.id);
      if (!audit) {
        return res.status(404).json({ error: 'Audit not found' });
      }

      res.json(serializeAudit(audit));
    } catch (err) {
      next(err);
    }
  }
};
