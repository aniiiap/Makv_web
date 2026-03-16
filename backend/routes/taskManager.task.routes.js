const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  getDashboardStats,
  getAnalyticsStats,
  getTaskActivities,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  startTimer,
  stopTimer,
  pauseTimer,
  resumeTimer,
  logTime,
  deleteTimeEntry,
  resetTimeTracking,
  deleteActivity,
  clearActivities,
  addAttachment,
  deleteAttachment,
} = require('../controllers/taskManager.task.controller');
const { protect } = require('../middleware/taskManager.auth');
const { documentUpload } = require('../config/cloudinary');

const router = express.Router();

router.use(protect);

router.get('/stats/dashboard', getDashboardStats);
router.get('/stats/analytics', getAnalyticsStats);
router.route('/').get(getTasks).post(createTask);
router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);
router.post('/:id/comments', addComment);
router.get('/:id/activities', getTaskActivities);
router.delete('/:id/activities', clearActivities);
router.delete('/:id/activities/:activityId', deleteActivity);
router.post('/:id/subtasks', addSubtask);
router.put('/:id/subtasks/:subtaskId', updateSubtask);
router.delete('/:id/subtasks/:subtaskId', deleteSubtask);
router.post('/:id/timer/start', startTimer);
router.post('/:id/timer/pause', pauseTimer);
router.post('/:id/timer/resume', resumeTimer);
router.post('/:id/timer/stop', stopTimer);
router.post('/:id/timer/log', logTime);
router.delete('/:id/timer/entries/:entryIndex', deleteTimeEntry);
router.delete('/:id/timer/reset', resetTimeTracking);
router.post('/:id/attachments', documentUpload.array('files', 10), addAttachment);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

module.exports = router;

