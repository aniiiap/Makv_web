const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} = require('../controllers/taskManager.notification.controller');
const { protect } = require('../middleware/taskManager.auth');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread/count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/', deleteAllNotifications);
router.delete('/:id', deleteNotification);

module.exports = router;

