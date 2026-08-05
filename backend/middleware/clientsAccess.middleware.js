const { userHasClientsAccess } = require('../utils/clientsAccess');

exports.requireClientsAccess = async (req, res, next) => {
    if (await userHasClientsAccess(req.user)) {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'You do not have permission to access clients',
    });
};
