const express = require('express');
const {
    getClients,
    getClient,
    getClientTimeSummary,
    getAllUsers,
} = require('../controllers/taskManager.client.controller');
const { protect } = require('../middleware/taskManager.auth');

const router = express.Router();

router.use(protect);

// Users list (for assignee dropdown)
router.get('/users', getAllUsers);

// Client routes
router.get('/', getClients);
router.get('/:id', getClient);
router.get('/:id/time-summary', getClientTimeSummary);

module.exports = router;
