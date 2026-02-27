const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/taskManager.auth');
const { requireAdmin } = require('../middleware/taskManager.adminAuth.middleware');
const {
    createUser,
    createBulkUsers,
    getAllUsers,
    updateUserRole,
    deactivateUser,
    permanentlyDeleteUser,
    bulkDeleteUsers,
    getUserStats,
} = require('../controllers/taskManager.admin.controller');

// All routes require authentication and admin role
router.use(protect);
router.use(requireAdmin);

router.post('/users', createUser);
router.post('/users/bulk', createBulkUsers);
router.post('/users/bulk-delete', bulkDeleteUsers);
router.get('/users', getAllUsers);
router.get('/stats', getUserStats);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deactivateUser);
router.delete('/users/:id/permanent', permanentlyDeleteUser);

module.exports = router;
