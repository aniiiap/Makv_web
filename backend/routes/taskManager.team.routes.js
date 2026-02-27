const express = require('express');
const {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  generateInvite,
  joinTeam,
  addMember,
  removeMember,
  updateMemberRole,
  acceptInvitation,
  getInvitation,
} = require('../controllers/taskManager.team.controller');
const { protect } = require('../middleware/taskManager.auth');

const router = express.Router();

// Public routes
router.get('/invitations/:token', getInvitation);

// Protected routes
router.use(protect);

router.route('/').get(getTeams).post(createTeam);
router.route('/:id').get(getTeam).put(updateTeam).delete(deleteTeam);
router.post('/:id/invite', generateInvite);
router.post('/join/:token', joinTeam);
router.post('/invitations/accept/:token', acceptInvitation);
router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);
router.put('/:id/members/:memberId', updateMemberRole);

module.exports = router;

