const express = require('express');
const {
    getClients,
    getClient,
    getClientTimeSummary,
    getAllUsers,
    checkClientsAccess,
} = require('../controllers/taskManager.client.controller');
const { protect } = require('../middleware/taskManager.auth');
const { requireClientsAccess } = require('../middleware/clientsAccess.middleware');

const router = express.Router();

router.use(protect);

// Check access
router.get('/access', checkClientsAccess);

// Users list (for assignee dropdown)
router.get('/users', getAllUsers);

// Client routes
router.get('/', requireClientsAccess, getClients);
router.get('/:id', requireClientsAccess, getClient);
router.get('/:id/time-summary', requireClientsAccess, getClientTimeSummary);

module.exports = router;
