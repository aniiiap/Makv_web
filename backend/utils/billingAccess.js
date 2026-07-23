const TaskManagerTeam = require('../models/taskManager.Team');

async function getUserBillingTeams(user) {
  if (user.role === 'admin') {
    return null;
  }

  const teams = await TaskManagerTeam.find({
    'members.user': user._id,
    isActive: true,
    billingEnabled: true,
  });

  return teams.filter((team) => {
    const member = team.members.find(
      (m) => m.user && m.user.toString() === user._id.toString()
    );
    return member && member.billingAccess === true;
  });
}

async function userHasBillingAccess(user) {
  
  return true;
}

async function getUserBillingTeamIds(user) {
  const billingTeams = await getUserBillingTeams(user);
  return billingTeams.map((team) => team._id);
}

async function buildBillVisibilityFilter(user) {
  if (user.role === 'admin') {
    return null;
  }

  const hasAccess = await userHasBillingAccess(user);
  if (!hasAccess) {
    return { _id: null };
  }

  // Granted users see all bills and have full bills-page functionality
  return null;
}

async function userCanAccessBill(user, bill) {
  if (user.role === 'admin') {
    return true;
  }

  return userHasBillingAccess(user);
}

module.exports = {
  userHasBillingAccess,
  getUserBillingTeamIds,
  buildBillVisibilityFilter,
  userCanAccessBill,
};
