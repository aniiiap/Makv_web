const mongoose = require('mongoose');
const TaskManagerTask = require('../models/taskManager.Task');
const TaskManagerTeam = require('../models/taskManager.Team');
const TaskManagerNotification = require('../models/taskManager.Notification');
const TaskManagerActivityLog = require('../models/taskManager.ActivityLog');
const { sendEmail } = require('../utils/taskManager.emailService');
const TaskManagerUser = require('../models/TaskManagerUser');
const { getIO } = require('../utils/taskManager.socketManager');
const { cloudinary } = require('../config/cloudinary');

// Helper function to create activity log
const createActivityLog = async (taskId, userId, action, field, oldValue, newValue, description) => {
  try {
    await TaskManagerActivityLog.create({
      task: taskId,
      user: userId,
      action,
      field,
      oldValue,
      newValue,
      description,
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res, next) => {
  try {
    const { team, status, assignedTo, priority, searchQuery, client } = req.query;
    const query = {};

    // Filter by team
    if (team) {
      if (team === 'personal') {
        // Personal tasks only (no team)
        query.team = null;
        query.createdBy = req.user.id;
      } else {
        // Verify user is member of team
        const teamDoc = await TaskManagerTeam.findOne({
          _id: team,
          'members.user': req.user.id,
          isActive: true,
        });

        if (!teamDoc) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to view tasks from this team',
          });
        }

        query.team = team;
      }
    } else {
      // Get all teams user is member of
      const teams = await TaskManagerTeam.find({
        'members.user': req.user.id,
        isActive: true,
      }).select('_id');

      const teamIds = teams.map((t) => t._id);

      // Include personal tasks (no team) OR team tasks OR client tasks
      query.$or = [
        { team: { $in: teamIds } },
        { team: null, createdBy: req.user.id },
        { client: { $ne: null } }
      ];
    }

    // Filter by status
    if (status) {
      const statusValue = status.includes(',') ? { $in: status.split(',') } : status;
      if (query.$or) {
        // Apply status to both parts of $or
        query.$or = query.$or.map(condition => ({ ...condition, status: statusValue }));
      } else {
        query.status = statusValue;
      }
    }

    // Filter by assignedTo
    if (assignedTo) {
      if (query.$or) {
        // Apply assignedTo to both parts of $or
        query.$or = query.$or.map(condition => ({ ...condition, assignedTo }));
      } else {
        query.assignedTo = assignedTo;
      }
    }

    // Filter by priority
    if (priority) {
      if (query.$or) {
        query.$or = query.$or.map(condition => ({ ...condition, priority }));
      } else {
        query.priority = priority;
      }
    }

    // Filter by client
    if (client) {
      if (query.$or) {
        query.$or = query.$or.map(condition => ({ ...condition, client }));
      } else {
        query.client = client;
      }
    }

    // Filter by overdue
    if (req.query.overdue === 'true') {
      const condition = {
        dueDate: { $lt: new Date() },
        status: { $ne: 'done' }
      };
      if (query.$and) {
        query.$and.push(condition);
      } else if (query.$or) {
        // Wrap existing $or and new condition in $and
        query.$and = [{ $or: query.$or }, condition];
        delete query.$or;
      } else {
        Object.assign(query, condition);
      }
    }

    // Filter by due soon (next 48 hours)
    if (req.query.dueSoon === 'true') {
      const now = new Date();
      const soon = new Date();
      soon.setHours(soon.getHours() + 48);
      const condition = {
        dueDate: { $gte: now, $lte: soon },
        status: { $ne: 'done' }
      };
      if (query.$and) {
        query.$and.push(condition);
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, condition];
        delete query.$or;
      } else {
        Object.assign(query, condition);
      }
    }

    // Filter by createdBy
    if (req.query.createdBy === 'me') {
      const condition = { createdBy: req.user.id };
      if (query.$and) {
        query.$and.push(condition);
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, condition];
        delete query.$or;
      } else {
        Object.assign(query, condition);
      }
    }

    // Filter by search query (Title or Description)
    if (searchQuery && searchQuery.trim() !== '') {
      const searchRegex = { $regex: searchQuery, $options: 'i' };
      const searchCondition = {
        $or: [
          { title: searchRegex },
          { description: searchRegex }
        ]
      };

      if (query.$or) {
        // Merge into the existing $or conditionally
        query.$and = [
          { $or: query.$or },
          searchCondition
        ];
        delete query.$or;
      } else {
        query.$or = searchCondition.$or;
      }
    }

    // Feature 2: Task Visibility on Review
    // When a task is 'in-review', it should only be visible to the reviewer (the person it is currently assignedTo)
    // admin, and the creator. Other team members cannot see it while it's in review.
    if (req.user.role !== 'admin') {
      const reviewCondition = {
        $nor: [
          {
            $and: [
              { status: 'in-review' },
              { assignedTo: { $ne: req.user.id } }
            ]
          }
        ]
      };

      if (query.$and) {
        query.$and.push(reviewCondition);
      } else {
        query.$and = [reviewCondition];

        // If we also had an $or, we must move it inside $and to not overwrite each other
        if (query.$or) {
          query.$and.push({ $or: query.$or });
          delete query.$or;
        }
      }
    }

    const tasks = await TaskManagerTask.find(query)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('client', 'name companyName')
      .sort('-createdAt');

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .populate('client', 'name companyName');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can view task
    if (task.team) {
      // Team task - verify user is member of team. Since team is populated, use _id
      const teamId = task.team._id ? task.team._id : task.team;
      const team = await TaskManagerTeam.findOne({
        _id: teamId,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this task',
        });
      }
    } else if (task.client) {
      // Client task - any authenticated user can view
    } else {
      // Personal task - only creator can view
      if (task.createdBy._id.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this task',
        });
      }
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, team, assignedTo, status, priority, dueDate, tags, client } =
      req.body;

    let teamDoc = null;

    // If team is provided, verify user is member of team
    if (team) {
      teamDoc = await TaskManagerTeam.findOne({
        _id: team,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!teamDoc) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to create tasks in this team',
        });
      }

      // If assigned, verify assignee is team member
      if (assignedTo) {
        const isMember = teamDoc.members.some(
          (m) => m.user.toString() === assignedTo.toString()
        );

        if (!isMember) {
          return res.status(400).json({
            success: false,
            message: 'Assigned user must be a team member',
          });
        }
      }
    } else if (!client) {
      // Personal task (no team, no client) - can only assign to self
      if (assignedTo && assignedTo !== req.user.id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Personal tasks can only be assigned to yourself',
        });
      }
    }
    // If client is provided (client-linked task), any user can be assigned

    const task = await TaskManagerTask.create({
      title,
      description,
      team,
      client: client || null,
      assignedTo: assignedTo || null,
      createdBy: req.user.id,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      tags: tags || [],
      isBillable: req.body.isBillable || false,
    });

    const populatedTask = await TaskManagerTask.findById(task._id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('client', 'name companyName');

    // Create activity log for task creation
    await createActivityLog(
      task._id,
      req.user.id,
      'created',
      null,
      null,
      null,
      `Task "${title}" was created`
    );

    // Create notification if task is assigned
    if (assignedTo && assignedTo.toString() !== req.user.id.toString()) {
      const assignedUser = await TaskManagerUser.findById(assignedTo);
      const notification = await TaskManagerNotification.create({
        user: assignedTo,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `${req.user.name} assigned you a task: ${title}`,
        relatedTask: task._id,
        relatedTeam: team,
      });

      getIO().to(assignedTo.toString()).emit('notification', notification);

      // Send email
      try {
        // Parse frontend URL to handle comma-separated values (e.g., from Render)
        const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const frontendBase = rawFrontendUrl.split(',')[0].trim();

        await sendEmail({
          email: assignedUser.email,
          subject: `New Task Assigned: ${title}`,
          message: `${req.user.name} assigned you a new task: ${title}`,
          html: `
            <h2>New Task Assigned</h2>
            <p>Hello ${assignedUser.name},</p>
            <p><strong>${req.user.name}</strong> assigned you a new task:</p>
            <h3>${title}</h3>
            ${description ? `<p>${description}</p>` : ''}
            <p>Priority: ${priority || 'medium'}</p>
            ${dueDate ? `<p>Due Date: ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
            <p><a href="${frontendBase}/taskflow/tasks?taskId=${task._id}">View Task</a></p>
          `,
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res, next) => {
  try {
    let task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can update task
    if (task.team) {
      const teamId = task.team._id || task.team; // Handle populated team

      const team = await TaskManagerTeam.findOne({
        _id: teamId,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this task',
        });
      }

      // If reassigning, verify new assignee is team member
      if (req.body.assignedTo && req.body.assignedTo !== task.assignedTo?.toString()) {
        const isMember = team.members.some(
          (m) => m.user && m.user.toString() === req.body.assignedTo.toString()
        );

        if (!isMember) {
          return res.status(400).json({
            success: false,
            message: 'Assigned user must be a team member',
          });
        }
      }

      // Permission Check for Team Tasks
      const member = team.members.find(m => m.user && m.user.toString() === req.user.id.toString());
      const userRole = member ? member.role : 'member';

      // If user is just a member (not owner/admin), they CANNOT change:
      // - dueDate
      // - priority
      // - assignedTo
      if (!['owner', 'admin'].includes(userRole)) {
        if (req.body.dueDate && new Date(req.body.dueDate).getTime() !== new Date(task.dueDate || 0).getTime()) {
          return res.status(403).json({
            success: false,
            message: 'Only Team Admins can update Due Date',
          });
        }
        if (req.body.priority && req.body.priority !== task.priority) {
          return res.status(403).json({
            success: false,
            message: 'Only Team Admins can update Priority',
          });
        }
        // Removed assignedTo restriction: any user can reassign a task
      }
    } else if (task.client) {
      // Client task - no team restrictions or personal task restrictions.
      // Anyone who can view it (authenticated) can edit it for now.
    } else {
      // Personal task - only creator can update
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this task',
        });
      }

      // Personal tasks can only be assigned to self
      if (req.body.assignedTo && req.body.assignedTo !== req.user.id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Personal tasks can only be assigned to yourself',
        });
      }
    }

    // Check if status changed
    const statusChanged = req.body.status && req.body.status !== task.status;
    const oldStatus = task.status;
    const priorityChanged = req.body.priority && req.body.priority !== task.priority;
    const assignedChanged = req.body.assignedTo && req.body.assignedTo !== task.assignedTo?.toString();
    const dueDateChanged = req.body.dueDate && new Date(req.body.dueDate).getTime() !== new Date(task.dueDate || 0).getTime();

    // Handle task reassignment notification
    if (req.body.assignedTo && req.body.assignedTo !== task.assignedTo?.toString()) {
      const assignedUser = await TaskManagerUser.findById(req.body.assignedTo);

      if (assignedUser && assignedUser._id.toString() !== req.user.id.toString()) {
        // Create notification
        const notification = await TaskManagerNotification.create({
          user: req.body.assignedTo,
          type: 'task_assigned',
          title: 'Task Assigned to You',
          message: `${req.user.name} assigned you a task: ${task.title}`,
          relatedTask: task._id,
          relatedTeam: task.team,
        });

        getIO().to(req.body.assignedTo.toString()).emit('notification', notification);

        // Send email
        try {
          // Parse frontend URL to handle comma-separated values
          const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const frontendBase = rawFrontendUrl.split(',')[0].trim();

          await sendEmail({
            email: assignedUser.email,
            subject: `Task Assigned: ${task.title}`,
            message: `${req.user.name} assigned you a task: ${task.title}`,
            html: `
              <h2>Task Assigned to You</h2>
              <p>Hello ${assignedUser.name},</p>
              <p><strong>${req.user.name}</strong> assigned you a task:</p>
              <h3>${task.title}</h3>
              <p><a href="${frontendBase}/taskflow/tasks?taskId=${task._id}">View Task</a></p>
            `,
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }
    }

    // Create notification for task update (if assigned)
    if (task.assignedTo && task.assignedTo.toString() !== req.user.id.toString()) {
      const notification = await TaskManagerNotification.create({
        user: task.assignedTo,
        type: 'task_updated',
        title: 'Task Updated',
        message: `${req.user.name} updated the task: ${task.title}`,
        relatedTask: task._id,
        relatedTeam: task.team,
      });

      getIO().to(task.assignedTo.toString()).emit('notification', notification);
    }

    // Log activity for status change
    if (statusChanged) {
      await createActivityLog(
        task._id,
        req.user.id,
        'status_changed',
        'status',
        oldStatus,
        req.body.status,
        `Status changed from "${oldStatus}" to "${req.body.status}"`
      );
    }

    // Log activity for priority change
    if (priorityChanged) {
      await createActivityLog(
        task._id,
        req.user.id,
        'priority_changed',
        'priority',
        task.priority,
        req.body.priority,
        `Priority changed from "${task.priority}" to "${req.body.priority}"`
      );
    }

    // Log activity for assignment change
    if (assignedChanged) {
      const oldAssignee = task.assignedTo ? await TaskManagerUser.findById(task.assignedTo).select('name') : null;
      const newAssignee = req.body.assignedTo ? await TaskManagerUser.findById(req.body.assignedTo).select('name') : null;
      await createActivityLog(
        task._id,
        req.user.id,
        req.body.assignedTo ? 'assigned' : 'unassigned',
        'assignedTo',
        oldAssignee?.name || 'Unassigned',
        newAssignee?.name || 'Unassigned',
        req.body.assignedTo
          ? `Task assigned to ${newAssignee?.name || 'user'}`
          : 'Task unassigned'
      );
    }

    // Log activity for due date change
    if (dueDateChanged) {
      await createActivityLog(
        task._id,
        req.user.id,
        'due_date_changed',
        'dueDate',
        task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date',
        req.body.dueDate ? new Date(req.body.dueDate).toLocaleDateString() : 'No due date',
        `Due date ${req.body.dueDate ? 'set to' : 'removed'} ${req.body.dueDate ? new Date(req.body.dueDate).toLocaleDateString() : ''}`
      );
    }

    // Log activity for Billable status change
    if (req.body.isBillable !== undefined && req.body.isBillable !== task.isBillable) {
      await createActivityLog(
        task._id,
        req.user.id,
        'billable_status_changed',
        'isBillable',
        task.isBillable,
        req.body.isBillable,
        `Task marked as ${req.body.isBillable ? 'Billable' : 'Non-Billable'}`
      );
    }

    // Notify task creator/admin when status changes (if different from updater)
    if (statusChanged && task.createdBy.toString() !== req.user.id.toString()) {
      const statusLabels = {
        'todo': 'To Do',
        'in-progress': 'In Progress',
        'in-review': 'In Review',
        'done': 'Done'
      };

      const notification = await TaskManagerNotification.create({
        user: task.createdBy,
        type: 'task_status_changed',
        title: 'Task Progress Updated',
        message: `${req.user.name} updated task "${task.title}" status from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[req.body.status] || req.body.status}`,
        relatedTask: task._id,
        relatedTeam: task.team,
      });

      getIO().to(task.createdBy.toString()).emit('notification', notification);

      // If it's a team task, also notify team admins/owners
      if (task.team) {
        const team = await TaskManagerTeam.findById(task.team).populate('members.user');
        if (team) {
          const adminsAndOwners = team.members.filter(
            (m) => ['owner', 'admin'].includes(m.role) &&
              m.user._id.toString() !== req.user.id.toString() &&
              m.user._id.toString() !== task.createdBy.toString()
          );

          for (const member of adminsAndOwners) {
            const adminNotification = await TaskManagerNotification.create({
              user: member.user._id,
              type: 'task_status_changed',
              title: 'Task Progress Updated',
              message: `${req.user.name} updated task "${task.title}" status from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[req.body.status] || req.body.status}`,
              relatedTask: task._id,
              relatedTeam: task.team,
            });

            getIO().to(member.user._id.toString()).emit('notification', adminNotification);
          }
        }
      }
    }

    const updateOperators = { $set: { ...req.body } };

    // Auto-stop orphaned timer if the task is marked as done
    if (statusChanged && req.body.status === 'done' && task.activeTimer) {
      let duration = task.activeTimer.accumulatedTime || 0;
      if (!task.activeTimer.isPaused) {
        const lastResumedAt = new Date(task.activeTimer.lastResumedAt || task.activeTimer.startTime);
        duration += Math.floor((new Date() - lastResumedAt) / 1000);
      }
      
      if (duration > 0) {
        updateOperators.$push = {
          timeEntries: {
            startTime: task.activeTimer.startTime,
            endTime: new Date(),
            duration,
            userId: task.activeTimer.userId,
            description: 'Auto-saved timer (Task marked as Done)'
          }
        };
        updateOperators.$inc = { timeSpent: duration };
      }
      updateOperators.$unset = { activeTimer: 1 };
    }

    task = await TaskManagerTask.findByIdAndUpdate(req.params.id, updateOperators, {
      new: true,
      runValidators: true,
    })
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can delete task
    if (task.team) {
      const teamId = task.team._id || task.team;
      const team = await TaskManagerTeam.findOne({
        _id: teamId,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this task',
        });
      }

      const member = team.members.find(
        (m) => m.user.toString() === req.user.id.toString()
      );

      // Only creator, owner, or admin can delete
      if (
        task.createdBy.toString() !== req.user.id.toString() &&
        !['owner', 'admin'].includes(member.role)
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this task',
        });
      }
    } else {
      // Personal task - only creator can delete
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this task',
        });
      }
    }

    await TaskManagerTask.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;

    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can comment on task
    if (task.team) {
      const teamId = task.team._id || task.team;
      const team = await TaskManagerTeam.findOne({
        _id: teamId,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to comment on this task',
        });
      }
    } else {
      // Personal task - only creator can comment
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to comment on this task',
        });
      }
    }

    task.comments.push({
      user: req.user.id,
      text,
    });

    await task.save();

    // Log activity for comment
    await createActivityLog(
      task._id,
      req.user.id,
      'comment_added',
      'comments',
      null,
      null,
      `Added a comment`
    );

    // Notify assigned user (if different from commenter)
    if (
      task.assignedTo &&
      task.assignedTo.toString() !== req.user.id.toString()
    ) {
      const notification = await TaskManagerNotification.create({
        user: task.assignedTo,
        type: 'task_commented',
        title: 'New Comment on Task',
        message: `${req.user.name} commented on: ${task.title}`,
        relatedTask: task._id,
        relatedTeam: task.team,
      });

      getIO().to(task.assignedTo.toString()).emit('notification', notification);
    }

    const populatedTask = await TaskManagerTask.findById(task._id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    res.json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get analytics stats
// @route   GET /api/tasks/stats/analytics
// @access  Private
exports.getAnalyticsStats = async (req, res, next) => {
  try {
    const { userId, timeRange, startDate, endDate } = req.query;

    // Determine Date Range
    let dateFilter = new Date();
    let endDateFilter = new Date();

    if (startDate && endDate) {
      // Frontend sent exact ISO boundaries (respecting local timezone)
      dateFilter = new Date(startDate);
      endDateFilter = new Date(endDate);
    } else {
      // Fallback if accessed via API directly without exact bounds
      dateFilter.setHours(0, 0, 0, 0);
      if (timeRange === 'day') {
        const queryDate = req.query.date ? new Date(req.query.date) : new Date();
        queryDate.setHours(0, 0, 0, 0);
        dateFilter = new Date(queryDate);
        endDateFilter = new Date(dateFilter);
        endDateFilter.setDate(endDateFilter.getDate() + 1);
      } else if (timeRange === 'week') {
        dateFilter.setDate(dateFilter.getDate() - 7);
      } else if (timeRange === 'year') {
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
      } else {
        // Default to month (30 days)
        dateFilter.setDate(dateFilter.getDate() - 30);
      }
    }

    // Feature 1: Admin User Progress Analytics
    if (req.user.role === 'admin' && userId) {
      // 1. Must be a Team or Client task (No personal tasks for analytics)
      // 2. User must be involved (assigned, created, or logged time)
      // 3. Must be active or modified within the timeRange to show "progress"
      // For User Progress, we want to see tasks that were active in the period
      // or tasks that are currently assigned to the user.
      const dateCondition = (timeRange === 'day' || (startDate && endDate))
        ? { $gte: dateFilter, $lte: endDateFilter } 
        : { $gte: dateFilter };

      const taskQuery = {
        $and: [
          { $or: [{ team: { $ne: null } }, { client: { $ne: null } }] },
          {
            $or: [
              // 1. User logged time during this specific period
              {
                timeEntries: {
                  $elemMatch: {
                    userId: userId,
                    $or: [
                      { startTime: dateCondition },
                      { endTime: dateCondition },
                      { createdAt: dateCondition }
                    ]
                  }
                }
              },
              // 2. User is assigned or creator, AND task was updated OR created in this period
              {
                $and: [
                  { $or: [{ assignedTo: userId }, { createdBy: userId }] },
                  { 
                    $or: [
                      { updatedAt: dateCondition },
                      { createdAt: dateCondition },
                      { 'activeTimer.startTime': dateCondition }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      const tasks = await TaskManagerTask.find(taskQuery)
        .populate('assignedTo', 'name')
        .select('title status timeEntries assignedTo updatedAt timeSpent');

      let totalTimeSpent = 0;
      let tasksWorkedOn = tasks.length;
      let completedTasksCount = 0;
      let userTaskDetails = [];

      tasks.forEach(task => {
        // Count as completed if specifically assigned to this user OR if they created it, and it's done.
        // We also check if it was completed within the timeRange (updatedAt >= dateFilter)
        if (task.status === 'done') {
          completedTasksCount++;
        }

        const userTimeEntries = task.timeEntries.filter(
          entry => entry.userId && 
                   entry.userId.toString() === userId.toString() &&
                   ((entry.endTime || entry.startTime || entry.createdAt) >= dateFilter) &&
                   ((timeRange === 'day' || (startDate && endDate)) ? ((entry.endTime || entry.startTime || entry.createdAt) <= endDateFilter) : true)
        );
        const userTimeOnTask = userTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

        totalTimeSpent += userTimeOnTask;

        const allUserEntries = task.timeEntries.filter(e => e.userId && e.userId.toString() === userId.toString());
        let lastWorkedOn = null;
        if (allUserEntries.length > 0) {
            const latestEntry = allUserEntries.sort((a, b) => {
                const dateA = a.endTime || a.startTime || a.createdAt;
                const dateB = b.endTime || b.startTime || b.createdAt;
                return new Date(dateB) - new Date(dateA);
            })[0];
            lastWorkedOn = latestEntry.endTime || latestEntry.startTime || latestEntry.createdAt;
        }

        userTaskDetails.push({
          id: task._id,
          title: task.title,
          status: task.status,
          userTimeSpent: userTimeOnTask,
          totalTimeSpentOverall: task.timeSpent || 0,
          updatedAt: task.updatedAt,
          isAssignedToUser: task.assignedTo && task.assignedTo._id.toString() === userId.toString(),
          assignedToName: task.assignedTo ? task.assignedTo.name : 'Unassigned',
          lastWorkedOn: lastWorkedOn
        });
      });

      return res.json({
        success: true,
        data: {
          isUserProgressMode: true,
          userId,
          timeRange: timeRange === 'year' ? 'past year' : (timeRange === 'week' ? 'past week' : (timeRange === 'day' ? 'selected day' : 'past month')),
          tasksWorkedOn,
          completedTasksCount,
          totalTimeSpent,
          taskDetails: userTaskDetails,
        }
      });
    }

    // DEFAULT OVERVIEW MODE
    let overviewQuery = {};

    if (req.user.role === 'admin') {
      // Global Admins see all Client/Team tasks
      overviewQuery = {
        $or: [
          { team: { $ne: null } },
          { client: { $ne: null } }
        ]
      };
    } else {
      // Normal users see tasks in their teams + personal tasks
      const userTeams = await TaskManagerTeam.find({
        'members.user': req.user.id,
        isActive: true,
      }).select('_id');
      const teamIds = userTeams.map((t) => t._id);

      overviewQuery = {
        $or: [
          { team: { $in: teamIds } },
          { team: null, createdBy: req.user.id }
        ]
      };
    }

    // Get task counts by status (Cumulative)
    const todoTasks = await TaskManagerTask.countDocuments({ ...overviewQuery, status: 'todo' });
    const inProgressTasks = await TaskManagerTask.countDocuments({ ...overviewQuery, status: 'in-progress' });
    const inReviewTasks = await TaskManagerTask.countDocuments({ ...overviewQuery, status: 'in-review' });
    const doneTasks = await TaskManagerTask.countDocuments({ ...overviewQuery, status: 'done' });

    // Get tasks by priority
    const lowPriority = await TaskManagerTask.countDocuments({ ...overviewQuery, priority: 'low' });
    const mediumPriority = await TaskManagerTask.countDocuments({ ...overviewQuery, priority: 'medium' });
    const highPriority = await TaskManagerTask.countDocuments({ ...overviewQuery, priority: 'high' });
    const urgentPriority = await TaskManagerTask.countDocuments({ ...overviewQuery, priority: 'urgent' });

    // Get tasks created or updated in the period for the daily breakdown
    const recentTasks = await TaskManagerTask.find({
      ...overviewQuery,
      updatedAt: { $gte: dateFilter }
    }).select('createdAt updatedAt status');

    // Group by date
    const tasksByDate = {};
    recentTasks.forEach(task => {
      const date = new Date(task.updatedAt).toISOString().split('T')[0];
      if (!tasksByDate[date]) {
        tasksByDate[date] = { total: 0, done: 0 };
      }
      tasksByDate[date].total++;
      if (task.status === 'done') {
        tasksByDate[date].done++;
      }
    });

    // Get my completed tasks in this context
    const myDoneTasksCount = await TaskManagerTask.countDocuments({ 
      ...overviewQuery, 
      status: 'done',
      assignedTo: req.user.id 
    });

    res.json({
      success: true,
      data: {
        isUserProgressMode: false,
        statusBreakdown: {
          todo: todoTasks,
          inProgress: inProgressTasks,
          inReview: inReviewTasks,
          done: doneTasks,
        },
        myDoneTasksCount,
        priorityBreakdown: {
          low: lowPriority,
          medium: mediumPriority,
          high: highPriority,
          urgent: urgentPriority,
        },
        dailyTasks: tasksByDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard stats
// @route   GET /api/tasks/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const { team } = req.query;

    // Get all teams user is member of
    const teams = await TaskManagerTeam.find({
      'members.user': req.user.id,
      isActive: true,
    }).select('_id');

    const teamIds = teams.map((t) => t._id);

    // Build query based on team filter
    let taskQuery;
    if (team) {
      if (team === 'personal') {
        // Personal tasks only (no team)
        taskQuery = {
          team: null,
          createdBy: req.user.id
        };
      } else {
        // Verify user is member of team (unless they are a global admin)
        if (req.user.role !== 'admin') {
          const teamDoc = await TaskManagerTeam.findOne({
            _id: team,
            'members.user': req.user.id,
            isActive: true,
          });

          if (!teamDoc) {
            return res.status(403).json({
              success: false,
              message: 'Not authorized to view stats from this team',
            });
          }
        }

        taskQuery = { team: team };
      }
    } else {
      // Query for both team tasks and personal tasks
      taskQuery = {
        $or: [
          { team: { $in: teamIds } },
          { team: null, createdBy: req.user.id }
        ]
      };
    }

    if (req.user.role !== 'admin') {
      // Feature 2: Task Visibility on Review
      // When a task is 'in-review', it should only be visible to the reviewer (assignedTo) 
      // or the creator of the task.
      const reviewCondition = {
        $nor: [
          {
            $and: [
              { status: 'in-review' },
              { assignedTo: { $ne: req.user.id } }
            ]
          }
        ]
      };

      taskQuery = {
        $and: [
          taskQuery,
          reviewCondition
        ]
      };
    }

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Get task counts in parallel
    const [
      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      myTasks,
      createdByMe,
      overdueTasks,
      dueSoonTasks,
      myDoneTasks
    ] = await Promise.all([
      TaskManagerTask.countDocuments(taskQuery),
      TaskManagerTask.countDocuments({ ...taskQuery, status: 'todo' }),
      TaskManagerTask.countDocuments({ ...taskQuery, status: 'in-progress' }),
      TaskManagerTask.countDocuments({ ...taskQuery, status: 'done' }),
      TaskManagerTask.countDocuments({ ...taskQuery, assignedTo: req.user.id }),
      TaskManagerTask.countDocuments({ ...taskQuery, createdBy: req.user.id }),
      TaskManagerTask.countDocuments({
        ...taskQuery,
        dueDate: { $lt: new Date() },
        status: { $ne: 'done' },
      }),
      TaskManagerTask.countDocuments({
        ...taskQuery,
        dueDate: { $gte: new Date(), $lte: sevenDaysFromNow },
        status: { $ne: 'done' },
      }),
      TaskManagerTask.countDocuments({
        ...taskQuery,
        assignedTo: req.user.id,
        status: 'done'
      })
    ]);

    res.json({
      success: true,
      data: {
        totalTasks,
        todoTasks,
        inProgressTasks,
        doneTasks,
        myTasks,
        myDoneTasks,
        createdByMe,
        overdueTasks,
        dueSoonTasks,
        totalTeams: teams.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get daily time tracking stats for the logged-in user
// @route   GET /api/tasks/stats/daily-timer
// @access  Private
exports.getDailyTimerStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await TaskManagerTask.aggregate([
      // Match all tasks that have the user in timeEntries
      { $unwind: '$timeEntries' },
      {
        $match: {
          'timeEntries.userId': new mongoose.Types.ObjectId(req.user.id),
          'timeEntries.startTime': { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: '$timeEntries.duration' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalSeconds = stats.length > 0 ? stats[0].totalDuration : 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    res.status(200).json({
      success: true,
      data: {
        totalSeconds,
        hours,
        minutes,
        formatted: `${hours}h ${minutes}m`,
        count: stats.length > 0 ? stats[0].count : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get task activity logs
// @route   GET /api/tasks/:id/activities
// @access  Private
exports.getTaskActivities = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can view task
    if (task.team) {
      const team = await TaskManagerTeam.findOne({
        _id: task.team,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this task',
        });
      }
    } else {
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this task',
        });
      }
    }

    const activities = await TaskManagerActivityLog.find({ task: req.params.id })
      .populate('user', 'name email avatar')
      .sort('-createdAt')
      .limit(100);

    res.json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add subtask to task
// @route   POST /api/tasks/:id/subtasks
// @access  Private
exports.addSubtask = async (req, res, next) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Subtask title is required',
      });
    }

    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can modify task
    if (task.team) {
      const team = await TaskManagerTeam.findOne({
        _id: task.team,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this task',
        });
      }
    } else {
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this task',
        });
      }
    }

    task.subtasks.push({ title, completed: false });
    await task.save();

    // Log activity
    await createActivityLog(
      task._id,
      req.user.id,
      'subtask_added',
      'subtasks',
      null,
      title,
      `Added subtask: "${title}"`
    );

    const populatedTask = await TaskManagerTask.findById(task._id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    res.json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update subtask
// @route   PUT /api/tasks/:id/subtasks/:subtaskId
// @access  Private
exports.updateSubtask = async (req, res, next) => {
  try {
    const { title, completed } = req.body;

    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can modify task
    if (task.team) {
      const team = await TaskManagerTeam.findOne({
        _id: task.team,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this task',
        });
      }
    } else {
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this task',
        });
      }
    }

    const subtask = task.subtasks.id(req.params.subtaskId);

    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: 'Subtask not found',
      });
    }

    const wasCompleted = subtask.completed;
    if (title !== undefined) subtask.title = title;
    if (completed !== undefined) subtask.completed = completed;

    await task.save();

    // Log activity if completion status changed
    if (completed !== undefined && completed !== wasCompleted) {
      await createActivityLog(
        task._id,
        req.user.id,
        'subtask_completed',
        'subtasks',
        wasCompleted,
        completed,
        `${completed ? 'Completed' : 'Uncompleted'} subtask: "${subtask.title}"`
      );
    }

    const populatedTask = await TaskManagerTask.findById(task._id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    res.json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete subtask
// @route   DELETE /api/tasks/:id/subtasks/:subtaskId
// @access  Private
exports.deleteSubtask = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can modify task
    if (task.team) {
      const team = await TaskManagerTeam.findOne({
        _id: task.team,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this task',
        });
      }
    } else {
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this task',
        });
      }
    }

    const subtask = task.subtasks.id(req.params.subtaskId);

    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: 'Subtask not found',
      });
    }

    const subtaskTitle = subtask.title;
    task.subtasks.pull(req.params.subtaskId);
    await task.save();

    // Log activity
    await createActivityLog(
      task._id,
      req.user.id,
      'subtask_deleted',
      'subtasks',
      subtaskTitle,
      null,
      `Deleted subtask: "${subtaskTitle}"`
    );

    const populatedTask = await TaskManagerTask.findById(task._id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    res.json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start timer for task
// @route   POST /api/tasks/:id/timer/start
// @access  Private
exports.startTimer = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can track time on task
    if (task.team) {
      const team = await TaskManagerTeam.findOne({
        _id: task.team,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to track time on this task',
        });
      }
    } else {
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to track time on this task',
        });
      }
    }

    // Check if there's already an active timer for this user
    if (task.activeTimer && task.activeTimer.userId) {
      if (task.activeTimer.userId.toString() === req.user._id.toString()) {
        const populatedTask = await TaskManagerTask.findById(task._id)
          .populate('team', 'name')
          .populate('assignedTo', 'name email avatar')
          .populate('createdBy', 'name email avatar')
          .populate('comments.user', 'name email avatar');

        return res.json({
          success: true,
          data: populatedTask,
          message: 'Timer already running'
        });
      }
    }

    // Set active timer - ensure userId is a proper ObjectId
    const userId = req.user._id || req.user.id;
    task.activeTimer = {
      startTime: new Date(),
      lastResumedAt: new Date(),
      userId: userId,
      isPaused: false,
      accumulatedTime: 0
    };

    // Mark the nested field as modified if needed
    task.markModified('activeTimer');

    await task.save();

    // Log activity (don't fail if logging fails)
    try {
      await createActivityLog(
        task._id,
        req.user._id, // Use _id instead of id for ObjectId
        'timer_started',
        'timeTracking',
        null,
        null,
        'Started timer'
      );
    } catch (logError) {
      console.error('Error logging timer start activity:', logError);
      // Continue even if activity log fails
    }

    const populatedTask = await TaskManagerTask.findById(task._id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    res.json({
      success: true,
      data: populatedTask,
    });
  } catch (error) {
    console.error('Error in startTimer:', error);
    next(error);
  }
};

// @desc    Stop timer for task
// @route   POST /api/tasks/:id/timer/stop
// @access  Private
exports.stopTimer = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    if (!task.activeTimer) {
      return res.status(400).json({
        success: false,
        message: 'No active timer found',
      });
    }

    const timerUserId = task.activeTimer.userId || task.activeTimer.user;
    if (!timerUserId || timerUserId.toString() !== req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No active timer found for this user',
      });
    }

    const startTime = new Date(task.activeTimer.startTime);
    const endTime = new Date();

    let duration = task.activeTimer.accumulatedTime || 0;
    if (!task.activeTimer.isPaused) {
      const lastResumedAt = new Date(task.activeTimer.lastResumedAt || task.activeTimer.startTime);
      duration += Math.floor((endTime - lastResumedAt) / 1000); // Duration in seconds
    }

    // Add time entry
    task.timeEntries.push({
      startTime,
      endTime,
      duration,
      userId: req.user.id,
      description: req.body.description || '',
    });

    // Update total time spent
    task.timeSpent = (task.timeSpent || 0) + duration;

    // Clear active timer
    task.activeTimer = undefined;

    await task.save();

    // Log activity
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    await createActivityLog(
      task._id,
      req.user.id,
      'timer_stopped',
      'timeTracking',
      null,
      duration,
      `Stopped timer. Logged ${hours}h ${minutes}m`
    );

    const populatedTask = await TaskManagerTask.findById(task._id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    res.json({
      success: true,
      data: populatedTask,
      loggedTime: duration,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Pause timer for task
// @route   POST /api/tasks/:id/timer/pause
// @access  Private
exports.pauseTimer = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (!task.activeTimer) {
      return res.status(400).json({ success: false, message: 'No active timer found' });
    }

    const timerUserId = task.activeTimer.userId || task.activeTimer.user;
    if (!timerUserId || timerUserId.toString() !== req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'No active timer found for this user' });
    }

    if (task.activeTimer.isPaused) {
      return res.status(400).json({ success: false, message: 'Timer is already paused' });
    }

    const lastResumedAt = new Date(task.activeTimer.lastResumedAt || task.activeTimer.startTime);
    const now = new Date();
    const durationSinceStartOrResume = Math.floor((now - lastResumedAt) / 1000);

    // Update accumulated time
    task.activeTimer.accumulatedTime = (task.activeTimer.accumulatedTime || 0) + durationSinceStartOrResume;
    task.activeTimer.isPaused = true;
    task.activeTimer.pausedAt = now;
    task.markModified('activeTimer');
    await task.save();

    const populatedTask = await TaskManagerTask.findById(task._id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    res.json({ success: true, data: populatedTask });
  } catch (error) {
    next(error);
  }
};

// @desc    Resume timer for task
// @route   POST /api/tasks/:id/timer/resume
// @access  Private
exports.resumeTimer = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (!task.activeTimer) {
      return res.status(400).json({ success: false, message: 'No active timer found' });
    }

    const timerUserId = task.activeTimer.userId || task.activeTimer.user;
    if (!timerUserId || timerUserId.toString() !== req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'No active timer found for this user' });
    }

    if (!task.activeTimer.isPaused) {
      return res.status(400).json({ success: false, message: 'Timer is not paused' });
    }

    // Reset lastResumedAt to now, unpause
    task.activeTimer.lastResumedAt = new Date();
    task.activeTimer.isPaused = false;
    task.activeTimer.pausedAt = undefined;

    task.markModified('activeTimer');
    await task.save();

    const populatedTask = await TaskManagerTask.findById(task._id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    res.json({ success: true, data: populatedTask });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually log time for task
// @route   POST /api/tasks/:id/timer/log
// @access  Private
exports.logTime = async (req, res, next) => {
  try {
    const { hours, minutes, description } = req.body;

    if ((!hours && hours !== 0) || (!minutes && minutes !== 0)) {
      return res.status(400).json({
        success: false,
        message: 'Hours and minutes are required',
      });
    }

    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can track time on task
    if (task.team) {
      const team = await TaskManagerTeam.findOne({
        _id: task.team,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to track time on this task',
        });
      }
    } else {
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to track time on this task',
        });
      }
    }

    const duration = (hours * 3600) + (minutes * 60); // Convert to seconds

    if (duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Time must be greater than 0',
      });
    }

    // Add time entry
    const now = new Date();
    
    // Feature: If an Admin logs time, they might be doing it on behalf of the assignee.
    // If the task has an assignee, credit the assignee. Otherwise, credit the logger.
    const targetUserId = req.body.userId || task.assignedTo || req.user.id;

    task.timeEntries.push({
      startTime: now,
      endTime: now,
      duration,
      userId: targetUserId,
      description: description || '',
    });

    // Update total time spent
    task.timeSpent = (task.timeSpent || 0) + duration;

    await task.save();

    // Log activity
    await createActivityLog(
      task._id,
      req.user.id,
      'time_logged',
      'timeTracking',
      null,
      duration,
      `Manually logged ${hours}h ${minutes}m`
    );

    const populatedTask = await TaskManagerTask.findById(task._id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    res.json({
      success: true,
      data: populatedTask,
      loggedTime: duration,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete time entry
// @route   DELETE /api/tasks/:id/timer/entries/:entryIndex
// @access  Private
exports.deleteTimeEntry = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (task.team) {
      const team = await TaskManagerTeam.findOne({ _id: task.team, 'members.user': req.user.id, isActive: true });
      if (!team) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this task' });
      }
    } else {
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this task' });
      }
    }
    const entryIndex = parseInt(req.params.entryIndex);
    if (entryIndex < 0 || entryIndex >= task.timeEntries.length) {
      return res.status(404).json({ success: false, message: 'Time entry not found' });
    }
    const entry = task.timeEntries[entryIndex];
    task.timeSpent = Math.max(0, (task.timeSpent || 0) - (entry.duration || 0));
    task.timeEntries.splice(entryIndex, 1);
    await task.save();
    await createActivityLog(task._id, req.user.id, 'time_logged', 'timeTracking', entry.duration, null,
      `Deleted time entry (${Math.floor((entry.duration || 0) / 3600)}h ${Math.floor(((entry.duration || 0) % 3600) / 60)}m)`);
    const populatedTask = await TaskManagerTask.findById(task._id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');
    res.json({ success: true, data: populatedTask });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset/clear all time entries
// @route   DELETE /api/tasks/:id/timer/reset
// @access  Private
exports.resetTimeTracking = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (task.team) {
      const team = await TaskManagerTeam.findOne({ _id: task.team, 'members.user': req.user.id, isActive: true });
      if (!team) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this task' });
      }
    } else {
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this task' });
      }
    }
    task.timeSpent = 0;
    task.timeEntries = [];
    if (task.activeTimer) {
      task.activeTimer = undefined;
    }
    await task.save();
    await createActivityLog(task._id, req.user.id, 'time_logged', 'timeTracking', null, null, 'Reset all time tracking data');
    const populatedTask = await TaskManagerTask.findById(task._id)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');
    res.json({ success: true, data: populatedTask });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete activity log
// @route   DELETE /api/tasks/:id/activities/:activityId
// @access  Private
exports.deleteActivity = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (task.team) {
      const team = await TaskManagerTeam.findOne({ _id: task.team, 'members.user': req.user.id, isActive: true });
      if (!team) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this task' });
      }
    } else {
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this task' });
      }
    }
    const activity = await TaskManagerActivityLog.findById(req.params.activityId);
    if (!activity || activity.task.toString() !== req.params.id) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    await TaskManagerActivityLog.findByIdAndDelete(req.params.activityId);
    res.json({ success: true, message: 'Activity deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear all activity logs for a task
// @route   DELETE /api/tasks/:id/activities
// @access  Private
exports.clearActivities = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (task.team) {
      const team = await TaskManagerTeam.findOne({ _id: task.team, 'members.user': req.user.id, isActive: true });
      if (!team) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this task' });
      }
    } else {
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this task' });
      }
    }
    await TaskManagerActivityLog.deleteMany({ task: req.params.id });
    res.json({ success: true, message: 'All activities cleared successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Add attachment to task
// @route   POST /api/tasks/:id/attachments
// @access  Private
exports.addAttachment = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one file',
      });
    }

    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can modify task
    if (task.team) {
      const team = await TaskManagerTeam.findOne({
        _id: task.team,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this task',
        });
      }
    } else {
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this task',
        });
      }
    }

    const uploadedAttachments = [];
    
    // Process each uploaded file
    for (const file of req.files) {
      const attachmentUrl = (file.path || file.secure_url || '').replace('http://', 'https://');
      
      const newAttachment = {
        url: attachmentUrl,
        name: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        publicId: file.filename,
        uploadedBy: req.user.id,
      };

      task.attachments.push(newAttachment);
      uploadedAttachments.push(newAttachment);
      
      // Log activity in background
      createActivityLog(
        task._id,
        req.user.id,
        'attachment_added',
        'attachments',
        null,
        newAttachment.name,
        `Added attachment: "${newAttachment.name}"`
      );
    }

    await task.save();

    // Populate in memory for response
    await task.populate([
      { path: 'team', select: 'name' },
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'comments.user', select: 'name email avatar' },
      { path: 'attachments.uploadedBy', select: 'name email avatar' }
    ]);

    res.json({
      success: true,
      message: `${req.files.length} file(s) uploaded successfully`,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete attachment from task
// @route   DELETE /api/tasks/:id/attachments/:attachmentId
// @access  Private
exports.deleteAttachment = async (req, res, next) => {
  try {
    const task = await TaskManagerTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify user can modify task
    if (task.team) {
      const team = await TaskManagerTeam.findOne({
        _id: task.team,
        'members.user': req.user.id,
        isActive: true,
      });

      if (!team) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this task',
        });
      }
    } else {
      if (task.createdBy.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this task',
        });
      }
    }
    
    const attachment = task.attachments.id(req.params.attachmentId);

    if (!attachment) {
      console.warn('❌ Attachment not found:', req.params.attachmentId);
      return res.status(404).json({
        success: false,
        message: 'Attachment not found',
      });
    }

    // Delete from Cloudinary if publicId exists - done in background for speed
    if (attachment.publicId) {
      const publicId = attachment.publicId;
      const fileName = attachment.name;
      
      // Determine resource type for deletion
      let resourceType = 'raw';
      const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
        resourceType = 'image';
      } else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
        resourceType = 'video';
      }

      console.log(`🗑️ Deleting from Cloudinary (${resourceType}):`, publicId);
      
      // Don't await this to keep response fast
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
        .then(result => console.log('✅ Cloudinary deletion result:', result))
        .catch(err => console.error('❌ Cloudinary deletion error:', err));
    }

    const attachmentName = attachment.name;
    task.attachments.pull(req.params.attachmentId);
    await task.save();

    // Log activity in background
    createActivityLog(
      task._id,
      req.user.id,
      'attachment_deleted',
      'attachments',
      attachmentName,
      null,
      `Deleted attachment: "${attachmentName}"`
    );

    // Populate in memory
    await task.populate([
      { path: 'team', select: 'name' },
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'comments.user', select: 'name email avatar' },
      { path: 'attachments.uploadedBy', select: 'name email avatar' }
    ]);

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};
