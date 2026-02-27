const TaskManagerNotification = require('../models/taskManager.Notification');

// @desc    Get all notifications for user
// @route   GET /api/taskflow/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const { read, limit = 50 } = req.query;
    const query = { user: req.user.id };

    if (read !== undefined) {
      query.read = read === 'true';
    }

    const notifications = await TaskManagerNotification.find(query)
      .populate('relatedTask', 'title status')
      .populate('relatedTeam', 'name _id')
      .sort('-createdAt')
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notifications count
// @route   GET /api/taskflow/notifications/unread/count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await TaskManagerNotification.countDocuments({
      user: req.user.id,
      read: false,
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/taskflow/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await TaskManagerNotification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Verify notification belongs to user
    if (notification.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/taskflow/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await TaskManagerNotification.updateMany(
      { user: req.user.id, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/taskflow/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await TaskManagerNotification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Verify notification belongs to user
    if (notification.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    await TaskManagerNotification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/taskflow/notifications
// @access  Private
exports.deleteAllNotifications = async (req, res, next) => {
  try {
    await TaskManagerNotification.deleteMany({ user: req.user.id });

    res.json({
      success: true,
      message: 'All notifications deleted',
    });
  } catch (error) {
    next(error);
  }
};

