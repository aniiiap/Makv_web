const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { protect, authorizeRoles } = require('../middleware/taskManager.auth');
const { requireBillingAccess } = require('../middleware/billingAccess.middleware');

router.get('/access', protect, billController.getBillAccess);
router.post('/', protect, requireBillingAccess, billController.createBill);
router.post('/huf', protect, requireBillingAccess, billController.createHUFBill);
router.post('/payslip', protect, authorizeRoles('admin'), billController.createPaySlip);
router.get('/', protect, requireBillingAccess, billController.getBills);
router.get('/payslips', protect, authorizeRoles('admin'), billController.getPaySlips);
router.get('/clients', protect, requireBillingAccess, billController.getClientsForBilling);
router.patch('/:id/status', protect, requireBillingAccess, billController.updateBillStatus);
router.post('/:id/send', protect, requireBillingAccess, billController.sendBill);
router.post('/payslip/:id/send', protect, authorizeRoles('admin'), billController.sendPaySlip);

module.exports = router;
