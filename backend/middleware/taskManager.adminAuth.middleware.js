const TaskManagerUser = require('../models/TaskManagerUser');

/**
 * Middleware to check if user is an admin
 */
const requireAdmin = async (req, res, next) => {
    try {
        // User should already be authenticated by the protect middleware
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route',
            });
        }

        // Check if user has admin role
        const user = await TaskManagerUser.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.',
            });
        }

        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
};

module.exports = { requireAdmin };
