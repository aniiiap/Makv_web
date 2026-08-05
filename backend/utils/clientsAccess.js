const TaskManagerTeam = require('../models/taskManager.Team');

async function getUserClientsTeams(user) {
  if (user.role === 'admin') {
    return null;
  }

  const teams = await TaskManagerTeam.find({
    'members.user': user._id,
    isActive: true,
    clientsEnabled: true,
  });

  return teams.filter((team) => {
    const member = team.members.find(
      (m) => m.user && m.user.toString() === user._id.toString()
    );
    return member && member.clientsAccess === true;
  });
}

async function userHasClientsAccess(user) {
  if (user.role === 'admin') {
    return true;
  }

  const clientsTeams = await getUserClientsTeams(user);
  return clientsTeams && clientsTeams.length > 0;
}

module.exports = {
  getUserClientsTeams,
  userHasClientsAccess,
};
