const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const auth = require('../middleware/taskManager.auth').protect;

router.post('/', auth, billController.createBill);
router.post('/huf', auth, billController.createHUFBill);
router.post('/payslip', auth, billController.createPaySlip);
router.get('/', auth, billController.getBills);
router.get('/payslips', auth, billController.getPaySlips);
router.get('/clients', auth, billController.getClientsForBilling);

module.exports = router;
