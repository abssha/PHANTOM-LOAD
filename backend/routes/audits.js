import { Router } from 'express';
import { auditController } from '../controllers/auditController.js';
import { validateAuditCreate } from '../middleware/validator.js';

const router = Router();

router.post('/', validateAuditCreate, auditController.create);
router.get('/', auditController.getAll);
router.get('/:id', auditController.getById);

export default router;
