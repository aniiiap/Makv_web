const TaskManagerUser = require('../models/TaskManagerUser');
const { generateTemporaryPassword } = require('../utils/passwordGenerator');
const { sendInvitationEmail } = require('../utils/taskManager.emailService');

/**
 * @desc    Create new user (admin only)
 * @route   POST /api/taskflow/admin/users
 * @access  Private/Admin
 */
exports.createUser = async (req, res, next) => {
    try {
        const { name, email } = req.body;

        // Validate input
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name and email',
            });
        }

        // Check if user already exists
        const existingUser = await TaskManagerUser.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }

        // Generate temporary password
        const temporaryPassword = generateTemporaryPassword();

        // Create user with temporary password
        const user = await TaskManagerUser.create({
            name,
            email: email.toLowerCase(),
            password: temporaryPassword,
            provider: 'local',
            role: 'user', // Always create as user
            isFirstLogin: true,
            createdBy: req.user.id,
            emailVerified: false,
            isActive: true, // Ensure user is active
        });

        // Send invitation email
        try {
            await sendInvitationEmail({
                name,
                email: email.toLowerCase(),
                temporaryPassword,
            });
        } catch (emailError) {
            console.error('Error sending invitation email:', emailError);
            // Don't fail the user creation if email fails
            // Admin can manually share credentials
        }

        res.status(201).json({
            success: true,
            message: 'User created successfully. Invitation email sent.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isFirstLogin: user.isFirstLogin,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Create user error:', error);
        next(error);
    }
};

/**
 * @desc    Create multiple users at once (admin only)
 * @route   POST /api/taskflow/admin/users/bulk
 * @access  Private/Admin
 */
exports.createBulkUsers = async (req, res, next) => {
    try {
        const { users } = req.body; // Array of { name, email }

        if (!users || !Array.isArray(users) || users.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of users',
            });
        }

        const results = {
            success: [],
            failed: [],
        };

        for (const userData of users) {
            try {
                const { name, email } = userData;

                if (!name || !email) {
                    results.failed.push({ email, reason: 'Missing name or email' });
                    continue;
                }

                // Check if user already exists
                const existingUser = await TaskManagerUser.findOne({ email: email.toLowerCase() });
                if (existingUser) {
                    results.failed.push({ email, reason: 'User already exists' });
                    continue;
                }

                // Generate temporary password
                const temporaryPassword = generateTemporaryPassword();

                // Create user
                const user = await TaskManagerUser.create({
                    name,
                    email: email.toLowerCase(),
                    password: temporaryPassword,
                    provider: 'local',
                    role: 'user',
                    isFirstLogin: true,
                    createdBy: req.user.id,
                    emailVerified: false,
                    isActive: true,
                });

                // Send invitation email
                try {
                    await sendInvitationEmail({
                        name,
                        email: email.toLowerCase(),
                        temporaryPassword,
                    });
                } catch (emailError) {
                    console.error('Error sending invitation email:', emailError);
                }

                results.success.push({
                    id: user._id,
                    name: user.name,
                    email: user.email,
                });
            } catch (error) {
                results.failed.push({ email: userData.email, reason: error.message });
            }
        }

        res.status(201).json({
            success: true,
            message: `Created ${results.success.length} users. ${results.failed.length} failed.`,
            results,
        });
    } catch (error) {
        console.error('Bulk create users error:', error);
        next(error);
    }
};

/**
 * @desc    Get all users
 * @route   GET /api/taskflow/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const users = await TaskManagerUser.find({ isActive: true })
            .select('-password')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await TaskManagerUser.countDocuments({ isActive: true });

        res.json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get all users error:', error);
        next(error);
    }
};

/**
 * @desc    Update user role
 * @route   PATCH /api/taskflow/admin/users/:id/role
 * @access  Private/Admin
 */
exports.updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;

        if (!role || !['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be "user" or "admin"',
            });
        }

        const user = await TaskManagerUser.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Prevent changing own role
        if (user._id.toString() === req.user.id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot change your own role',
            });
        }

        user.role = role;
        await user.save();

        res.json({
            success: true,
            message: 'User role updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Update user role error:', error);
        next(error);
    }
};

/**
 * @desc    Deactivate user
 * @route   DELETE /api/taskflow/admin/users/:id
 * @access  Private/Admin
 */
exports.deactivateUser = async (req, res, next) => {
    try {
        const user = await TaskManagerUser.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Prevent deactivating own account
        if (user._id.toString() === req.user.id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account',
            });
        }

        user.isActive = false;
        await user.save();

        res.json({
            success: true,
            message: 'User deactivated successfully',
        });
    } catch (error) {
        console.error('Deactivate user error:', error);
        next(error);
    }
};

/**
 * @desc    Permanently delete user (admin only)
 * @route   DELETE /api/taskflow/admin/users/:id/permanent
 * @access  Private/Admin
 */
exports.permanentlyDeleteUser = async (req, res, next) => {
    try {
        const user = await TaskManagerUser.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Prevent deleting own account
        if (user._id.toString() === req.user.id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account',
            });
        }

        // Permanently delete the user
        await TaskManagerUser.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'User permanently deleted',
        });
    } catch (error) {
        console.error('Permanently delete user error:', error);
        next(error);
    }
};

/**
 * @desc    Bulk delete users (admin only)
 * @route   POST /api/taskflow/admin/users/bulk-delete
 * @access  Private/Admin
 */
exports.bulkDeleteUsers = async (req, res, next) => {
    try {
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of user IDs',
            });
        }

        const results = {
            success: [],
            failed: [],
        };

        for (const userId of userIds) {
            try {
                const user = await TaskManagerUser.findById(userId);

                if (!user) {
                    results.failed.push({ userId, reason: 'User not found' });
                    continue;
                }

                // Prevent deleting own account
                if (user._id.toString() === req.user.id.toString()) {
                    results.failed.push({ userId, reason: 'Cannot delete your own account' });
                    continue;
                }

                await TaskManagerUser.findByIdAndDelete(userId);
                results.success.push(userId);
            } catch (error) {
                results.failed.push({ userId, reason: error.message });
            }
        }

        res.json({
            success: true,
            message: `Deleted ${results.success.length} users. ${results.failed.length} failed.`,
            results,
        });
    } catch (error) {
        console.error('Bulk delete users error:', error);
        next(error);
    }
};

/**
 * @desc    Get user statistics
 * @route   GET /api/taskflow/admin/stats
 * @access  Private/Admin
 */
exports.getUserStats = async (req, res, next) => {
    try {
        const totalUsers = await TaskManagerUser.countDocuments({ isActive: true });
        const totalAdmins = await TaskManagerUser.countDocuments({ role: 'admin', isActive: true });
        const totalRegularUsers = await TaskManagerUser.countDocuments({ role: 'user', isActive: true });

        // Users created in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsersThisMonth = await TaskManagerUser.countDocuments({
            createdAt: { $gte: thirtyDaysAgo },
            isActive: true,
        });

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalAdmins,
                totalRegularUsers,
                newUsersThisMonth,
            },
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        next(error);
    }
};
