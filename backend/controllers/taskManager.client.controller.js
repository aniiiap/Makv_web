const Client = require('../models/Client');
const TaskManagerTask = require('../models/taskManager.Task');
const TaskManagerUser = require('../models/TaskManagerUser');

// @desc    Get all clients with task counts
// @route   GET /api/taskflow/clients
// @access  Private
exports.getClients = async (req, res, next) => {
    try {
        const { search } = req.query;
        const query = { status: { $ne: 'inactive' } };

        if (search && search.trim()) {
            const regex = { $regex: search, $options: 'i' };
            query.$or = [
                { name: regex },
                { companyName: regex },
                { email: regex },
                { phone: regex },
            ];
        }

        const clients = await Client.find(query).sort('-createdAt').lean();

        // Get pending task counts for each client
        const clientIds = clients.map(c => c._id);
        const taskCounts = await TaskManagerTask.aggregate([
            { $match: { client: { $in: clientIds }, status: { $ne: 'done' } } },
            { $group: { _id: '$client', count: { $sum: 1 } } },
        ]);

        const countMap = {};
        taskCounts.forEach(tc => { countMap[tc._id.toString()] = tc.count; });

        const result = clients.map(c => ({
            ...c,
            pendingTasks: countMap[c._id.toString()] || 0,
        }));

        res.json(result);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single client detail
// @route   GET /api/taskflow/clients/:id
// @access  Private
exports.getClient = async (req, res, next) => {
    try {
        const client = await Client.findById(req.params.id).lean();
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        // Get tasks linked to this client
        const tasks = await TaskManagerTask.find({ client: req.params.id })
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email avatar')
            .populate('team', 'name')
            .sort('-createdAt')
            .lean();

        // Get pending task count
        const pendingTasks = tasks.filter(t => t.status !== 'done').length;

        res.json({
            client,
            tasks,
            pendingTasks,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get aggregated time tracking per user for a client's tasks
// @route   GET /api/taskflow/clients/:id/time-summary
// @access  Private
exports.getClientTimeSummary = async (req, res, next) => {
    try {
        const mongoose = require('mongoose');
        const pipeline = [
            { $match: { client: new mongoose.Types.ObjectId(req.params.id) } },
            { $unwind: '$timeEntries' },
            {
                $group: {
                    _id: '$timeEntries.userId',
                    totalSeconds: { $sum: '$timeEntries.duration' },
                    entryCount: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'taskmanagerusers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 0,
                    user: { _id: '$user._id', name: '$user.name', email: '$user.email', avatar: '$user.avatar' },
                    totalSeconds: 1,
                    entryCount: 1,
                },
            },
            { $sort: { totalSeconds: -1 } },
        ];

        const summary = await TaskManagerTask.aggregate(pipeline);
        res.json(summary);
    } catch (error) {
        next(error);
    }
};

// @desc    Get all active TaskManager users (for assignee dropdown)
// @route   GET /api/taskflow/users
// @access  Private
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await TaskManagerUser.find({ isActive: true })
            .select('name email avatar role')
            .sort('name')
            .lean();
        res.json(users);
    } catch (error) {
        next(error);
    }
};
