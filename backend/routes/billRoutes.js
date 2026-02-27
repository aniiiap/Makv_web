const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const auth = require('../middleware/taskManager.auth').protect;

router.post('/', auth, billController.createBill);
router.get('/', auth, billController.getBills);

module.exports = router;
