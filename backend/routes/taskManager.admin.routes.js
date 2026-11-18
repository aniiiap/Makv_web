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
    getUsersByTeam,
    getBillingAccessSettings,
    updateTeamBillingAccess,
    updateMemberBillingAccess,
    getClientsAccessSettings,
    updateTeamClientsAccess,
    updateMemberClientsAccess,
} = require('../controllers/taskManager.admin.controller');

// All routes require authentication and admin role
router.use(protect);
router.use(requireAdmin);

router.post('/users', createUser);
router.post('/users/bulk', createBulkUsers);
router.post('/users/bulk-delete', bulkDeleteUsers);
router.get('/users', getAllUsers);
router.get('/users-by-team', getUsersByTeam);
router.get('/stats', getUserStats);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deactivateUser);
router.delete('/users/:id/permanent', permanentlyDeleteUser);
router.get('/billing-access', getBillingAccessSettings);
router.patch('/billing-access/team/:teamId', updateTeamBillingAccess);
router.patch('/billing-access/team/:teamId/member/:userId', updateMemberBillingAccess);
router.get('/clients-access', getClientsAccessSettings);
router.patch('/clients-access/team/:teamId', updateTeamClientsAccess);
router.patch('/clients-access/team/:teamId/member/:userId', updateMemberClientsAccess);

const {
  getAdminPredefinedTitles,
  createPredefinedTitle,
  updatePredefinedTitle,
  deletePredefinedTitle,
  getPredefinedTitleTeams,
  updateTeamPredefinedTitlesSetting,
} = require('../controllers/taskManager.predefinedTitle.controller');

router.get('/predefined-titles', getAdminPredefinedTitles);
router.post('/predefined-titles', createPredefinedTitle);
router.put('/predefined-titles/:id', updatePredefinedTitle);
router.delete('/predefined-titles/:id', deletePredefinedTitle);
router.get('/predefined-titles/teams', getPredefinedTitleTeams);
router.patch('/predefined-titles/team/:teamId', updateTeamPredefinedTitlesSetting);

module.exports = router;
