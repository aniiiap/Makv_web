const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { protect, authorizeRoles } = require('../middleware/taskManager.auth');

router.post('/', protect, billController.createBill);
router.post('/huf', protect, billController.createHUFBill);
router.post('/payslip', protect, authorizeRoles('admin'), billController.createPaySlip);
router.get('/', protect, billController.getBills);
router.get('/payslips', protect, authorizeRoles('admin'), billController.getPaySlips);
router.get('/clients', protect, billController.getClientsForBilling);
router.patch('/:id/status', protect, billController.updateBillStatus);
router.post('/:id/send', protect, billController.sendBill);
router.post('/payslip/:id/send', protect, authorizeRoles('admin'), billController.sendPaySlip);

module.exports = router;
