const TaskManagerTask = require('../models/taskManager.Task');
const TaskManagerTeam = require('../models/taskManager.Team');
const TaskManagerNotification = require('../models/taskManager.Notification');
const TaskManagerActivityLog = require('../models/taskManager.ActivityLog');
const { sendEmail } = require('../utils/taskManager.emailService');
const TaskManagerUser = require('../models/TaskManagerUser');
const { getIO } = require('../utils/taskManager.socketManager');

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
    const { team, status, assignedTo } = req.query;
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

      // Include personal tasks (no team) OR team tasks
      query.$or = [
        { team: { $in: teamIds } },
        { team: null, createdBy: req.user.id }
      ];
    }

    // Filter by status
    if (status) {
      if (query.$or) {
        // Apply status to both parts of $or
        query.$or = query.$or.map(condition => ({ ...condition, status }));
      } else {
        query.status = status;
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

    const tasks = await TaskManagerTask.find(query)
      .populate('team', 'name')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar')
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
      .populate('comments.user', 'name email avatar');

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
    } else {
      // Personal task - only creator can view
      if (task.createdBy.toString() !== req.user.id.toString()) {
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
    const { title, description, team, assignedTo, status, priority, dueDate, tags } =
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
    } else {
      // Personal task - can only assign to self
      if (assignedTo && assignedTo !== req.user.id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Personal tasks can only be assigned to yourself',
        });
      }
    }

    const task = await TaskManagerTask.create({
      title,
      description,
      team,
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
      .populate('createdBy', 'name email avatar');

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
        const frontendBase =
          process.env.FRONTEND_URL || 'http://localhost:3000';

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

    // Permission Check for Team Tasks
    if (task.team) {
      const teamId = task.team._id || task.team;
      const team = await TaskManagerTeam.findById(teamId);
      const member = team ? team.members.find(m => m.user && m.user.toString() === req.user.id.toString()) : null;
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
        if (req.body.assignedTo && req.body.assignedTo !== task.assignedTo?.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Only Team Admins can reassign tasks',
          });
        }
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
          const frontendBase =
            process.env.FRONTEND_URL || 'http://localhost:3000';

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

    task = await TaskManagerTask.findByIdAndUpdate(req.params.id, req.body, {
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
    // Get all teams user is member of
    const teams = await TaskManagerTeam.find({
      'members.user': req.user.id,
      isActive: true,
    }).select('_id');

    const teamIds = teams.map((t) => t._id);

    // Query for both team tasks and personal tasks
    const taskQuery = {
      $or: [
        { team: { $in: teamIds } },
        { team: null, createdBy: req.user.id }
      ]
    };

    // Get task counts by status
    const todoTasks = await TaskManagerTask.countDocuments({ ...taskQuery, status: 'todo' });
    const inProgressTasks = await TaskManagerTask.countDocuments({ ...taskQuery, status: 'in-progress' });
    const inReviewTasks = await TaskManagerTask.countDocuments({ ...taskQuery, status: 'in-review' });
    const doneTasks = await TaskManagerTask.countDocuments({ ...taskQuery, status: 'done' });

    // Get tasks by priority
    const lowPriority = await TaskManagerTask.countDocuments({ ...taskQuery, priority: 'low' });
    const mediumPriority = await TaskManagerTask.countDocuments({ ...taskQuery, priority: 'medium' });
    const highPriority = await TaskManagerTask.countDocuments({ ...taskQuery, priority: 'high' });
    const urgentPriority = await TaskManagerTask.countDocuments({ ...taskQuery, priority: 'urgent' });

    // Get tasks created in last 30 days (daily breakdown)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTasks = await TaskManagerTask.find({
      ...taskQuery,
      createdAt: { $gte: thirtyDaysAgo }
    }).select('createdAt status');

    // Group by date
    const tasksByDate = {};
    recentTasks.forEach(task => {
      const date = new Date(task.createdAt).toISOString().split('T')[0];
      if (!tasksByDate[date]) {
        tasksByDate[date] = { total: 0, done: 0 };
      }
      tasksByDate[date].total++;
      if (task.status === 'done') {
        tasksByDate[date].done++;
      }
    });

    res.json({
      success: true,
      data: {
        statusBreakdown: {
          todo: todoTasks,
          inProgress: inProgressTasks,
          inReview: inReviewTasks,
          done: doneTasks,
        },
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
        // Verify user is member of team
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

    // Get task counts
    const totalTasks = await TaskManagerTask.countDocuments(taskQuery);
    const todoTasks = await TaskManagerTask.countDocuments({
      ...taskQuery,
      status: 'todo',
    });
    const inProgressTasks = await TaskManagerTask.countDocuments({
      ...taskQuery,
      status: 'in-progress',
    });
    const doneTasks = await TaskManagerTask.countDocuments({
      ...taskQuery,
      status: 'done',
    });

    // Get my assigned tasks
    let myTasksQuery = { assignedTo: req.user.id };
    if (team) {
      if (team === 'personal') {
        myTasksQuery = { ...myTasksQuery, team: null };
      } else {
        myTasksQuery = { ...myTasksQuery, team: team };
      }
    } else {
      myTasksQuery = {
        ...myTasksQuery,
        $or: [
          { team: { $in: teamIds } },
          { team: null }
        ]
      };
    }
    const myTasks = await TaskManagerTask.countDocuments(myTasksQuery);

    // Get tasks created by me
    let createdByMeQuery = { createdBy: req.user.id };
    if (team) {
      if (team === 'personal') {
        createdByMeQuery = { ...createdByMeQuery, team: null };
      } else {
        createdByMeQuery = { ...createdByMeQuery, team: team };
      }
    } else {
      createdByMeQuery = {
        ...createdByMeQuery,
        $or: [
          { team: { $in: teamIds } },
          { team: null }
        ]
      };
    }
    const createdByMe = await TaskManagerTask.countDocuments(createdByMeQuery);

    // Get overdue tasks
    const overdueTasks = await TaskManagerTask.countDocuments({
      ...taskQuery,
      dueDate: { $lt: new Date() },
      status: { $ne: 'done' },
    });

    // Get tasks due soon (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const dueSoonTasks = await TaskManagerTask.countDocuments({
      ...taskQuery,
      dueDate: { $gte: new Date(), $lte: sevenDaysFromNow },
      status: { $ne: 'done' },
    });

    res.json({
      success: true,
      data: {
        totalTasks,
        todoTasks,
        inProgressTasks,
        doneTasks,
        myTasks,
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
      userId: userId,
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

    if (!task.activeTimer || task.activeTimer.userId.toString() !== req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'No active timer found for this user',
      });
    }

    const startTime = new Date(task.activeTimer.startTime);
    const endTime = new Date();
    const duration = Math.floor((endTime - startTime) / 1000); // Duration in seconds

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
    task.timeEntries.push({
      startTime: now,
      endTime: now,
      duration,
      userId: req.user.id,
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
