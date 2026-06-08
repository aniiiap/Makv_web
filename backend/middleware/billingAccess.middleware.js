const { userHasBillingAccess } = require('../utils/billingAccess');

exports.requireBillingAccess = async (req, res, next) => {
  try {
    if (await userHasBillingAccess(req.user)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have access to Bills & Invoices',
    });
  } catch (error) {
    next(error);
  }
};
