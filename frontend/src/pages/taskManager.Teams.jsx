import { useState, useEffect } from 'react';
import api from '../utils/taskManager.api';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { useTheme } from '../context/taskManager.ThemeContext';
import {
  FiPlus, FiUsers, FiMail, FiLink, FiX, FiUser,
  FiAward, FiLock, FiCheckCircle, FiEdit2, FiTrash2
} from 'react-icons/fi';

// Avatar component with fallback
const Avatar = ({ user, size = 'md' }) => {
  const [imageError, setImageError] = useState(false);
  const hasAvatar = user?.avatar && user.avatar.trim() && !imageError;

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-lg',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (hasAvatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || 'User'}
        className={`${sizeClass} rounded-full border-2 border-white shadow-sm object-cover`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold border-2 border-white shadow-sm`}>
      {user?.name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
};

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const { user } = useTaskManagerAuth();
  const { isDark } = useTheme();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teams');
      setTeams(response.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/teams', newTeam);
      setShowCreateModal(false);
      setNewTeam({ name: '', description: '' });
      fetchTeams();
    } catch (error) {
      alert(error.message || 'Failed to create team');
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/teams/${selectedTeam._id}/members`, {
        email: inviteEmail,
      });
      setShowInviteModal(false);
      setInviteEmail('');
      // Refresh team data if members modal is open
      if (showMembersModal) {
        const response = await api.get(`/teams/${selectedTeam._id}`);
        setSelectedTeam(response.data);
      } else {
        setSelectedTeam(null);
      }
      fetchTeams();
      alert('Member invited successfully!');
    } catch (error) {
      alert(error.message || 'Failed to invite member');
    }
  };

  const handleGenerateInvite = async (team) => {
    try {
      const response = await api.post(`/teams/${team._id}/invite`);
      const inviteUrl = response.inviteUrl;
      navigator.clipboard.writeText(inviteUrl);
      alert('Invite link copied to clipboard!');
    } catch (error) {
      alert(error.message || 'Failed to generate invite');
    }
  };

  const handleViewMembers = async (team) => {
    try {
      // Fetch full team details with members
      const response = await api.get(`/teams/${team._id}`);
      setSelectedTeam(response.data);
      setShowMembersModal(true);
    } catch (error) {
      alert(error.message || 'Failed to load team details');
    }
  };

  const handleRemoveMember = async (teamId, memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this team?`)) {
      return;
    }

    try {
      await api.delete(`/teams/${teamId}/members/${memberId}`);
      // Refresh team data
      const response = await api.get(`/teams/${teamId}`);
      setSelectedTeam(response.data);
      // Also refresh teams list
      fetchTeams();
      alert('Member removed successfully!');
    } catch (error) {
      alert(error.message || 'Failed to remove member');
    }
  };

  const getUserRole = (team) => {
    const member = team.members?.find((m) => m.user?._id === user.id);
    return member?.role || 'member';
  };

  const canManageTeam = (team) => {
    const role = getUserRole(team);
    return role === 'owner' || role === 'admin';
  };

  const isOwner = (team) => {
    return team.owner?._id === user.id || team.owner === user.id || getUserRole(team) === 'owner';
  };

  const handleDeleteTeam = async (team) => {
    if (!window.confirm(`Are you sure you want to delete the team "${team.name}"? This will remove the team from all members and cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/teams/${team._id}`);
      fetchTeams(); // Refresh the teams list
      // Close modals if open
      if (showMembersModal && selectedTeam?._id === team._id) {
        setShowMembersModal(false);
        setSelectedTeam(null);
      }
      if (showInviteModal && selectedTeam?._id === team._id) {
        setShowInviteModal(false);
        setSelectedTeam(null);
      }
      alert('Team deleted successfully!');
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to delete team');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <FiAward className="w-4 h-4 text-yellow-600" />;
      case 'admin':
        return <FiLock className="w-4 h-4 text-blue-600" />;
      default:
        return <FiUser className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-primary-400' : 'border-primary-600'}`}></div>
      </div>
    );
  }

  // Helper to filter valid members
  const getValidMembers = (members) => members?.filter(m => m.user) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Teams</h1>
          <p className={`mt-1 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Collaborate and manage team projects</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl font-medium w-full sm:w-auto justify-center"
        >
          <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Create Team</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>

      {teams.length === 0 ? (
        <div className={`rounded-xl shadow-md border p-6 sm:p-12 text-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg mb-4 sm:mb-6">
            <FiUsers className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <p className={`text-base sm:text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>No teams yet</p>
          <p className={`text-xs sm:text-sm mb-4 sm:mb-6 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Create your first team to start collaborating</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            Create your first team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {teams.map((team) => {
            const validMembers = getValidMembers(team.members);
            return (
              <div
                key={team._id}
                className={`rounded-xl shadow-md hover:shadow-xl transition-all p-4 sm:p-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg sm:text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className={`text-xs sm:text-sm line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {team.description}
                      </p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg flex-shrink-0 ${isDark ? 'bg-primary-900' : 'bg-primary-100'}`}>
                    {getRoleIcon(getUserRole(team))}
                    <span className={`text-xs font-medium ${isDark ? 'text-primary-300' : 'text-primary-700'}`}>
                      {getUserRole(team)}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Members ({validMembers.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {validMembers.slice(0, 5).map((member) => (
                      <div
                        key={member.user._id}
                        className="flex items-center"
                        title={`${member.user.name} (${member.role})`}
                      >
                        <Avatar user={member.user} size="sm" />
                      </div>
                    ))}
                    {validMembers.length > 5 && (
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 shadow-sm ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-200 text-gray-600 border-white'}`}>
                        +{validMembers.length - 5}
                      </div>
                    )}
                  </div>
                </div>
                {/* Action buttons (view/invite/delete) */}
                <div className="flex gap-1.5 sm:gap-2">
                  <button
                    onClick={() => handleViewMembers(team)}
                    className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-center rounded-lg transition-colors font-medium ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <FiEdit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">View</span>
                  </button>
                  {canManageTeam(team) && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedTeam(team);
                          setShowInviteModal(true);
                        }}
                        className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors ${isDark ? 'bg-primary-900 text-primary-300 hover:bg-primary-800' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}
                        title="Invite member"
                      >
                        <FiMail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => handleGenerateInvite(team)}
                        className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors ${isDark ? 'bg-primary-900 text-primary-300 hover:bg-primary-800' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}
                        title="Copy invite link"
                      >
                        <FiLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </>
                  )}
                  {isOwner(team) && (
                    <button
                      onClick={() => handleDeleteTeam(team)}
                      className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors ${isDark ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      title="Delete team"
                    >
                      <FiTrash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className={`rounded-xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 lg:p-8 shadow-2xl my-4 sm:my-8 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Team</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTeam({ name: '', description: '' });
                }}
                className={`transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateTeam} className="space-y-5">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTeam.name}
                  onChange={(e) =>
                    setNewTeam({ ...newTeam, name: e.target.value })
                  }
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'}`}
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description (Optional)
                </label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) =>
                    setNewTeam({ ...newTeam, description: e.target.value })
                  }
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'}`}
                  rows="3"
                  placeholder="Enter team description"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTeam({ name: '', description: '' });
                  }}
                  className={`flex-1 px-4 py-3 border-2 rounded-lg transition-colors font-medium ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl font-medium"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && selectedTeam && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 ${showMembersModal ? 'z-[60]' : 'z-50'}`}>
          <div className={`rounded-2xl max-w-md w-full p-8 shadow-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Invite Member to {selectedTeam.name}
              </h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  if (!showMembersModal) {
                    setSelectedTeam(null);
                  }
                }}
                className={`transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleInviteMember} className="space-y-5">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Address *
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                    <FiMail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'}`}
                    placeholder="user@example.com"
                  />
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    if (!showMembersModal) {
                      setSelectedTeam(null);
                    }
                  }}
                  className={`flex-1 px-4 py-3 border-2 rounded-lg transition-colors font-medium ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl font-medium"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Members Modal */}
      {showMembersModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-8 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedTeam.name}</h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {selectedTeam.members?.length || 0} {selectedTeam.members?.length === 1 ? 'member' : 'members'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowMembersModal(false);
                  setSelectedTeam(null);
                }}
                className={`transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="space-y-3">
                {selectedTeam.members?.filter(m => m.user)?.map((member) => {
                  const isCurrentUser = member.user._id === user.id;
                  const canRemove = canManageTeam(selectedTeam) && !isCurrentUser && member.role !== 'owner';

                  return (
                    <div
                      key={member.user._id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${isDark ? 'bg-gray-700 border-gray-600 hover:border-gray-500' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar user={member.user} size="md" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {member.user.name}
                              {isCurrentUser && (
                                <span className={`text-sm font-normal ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>(You)</span>
                              )}
                            </h3>
                            {getRoleIcon(member.role)}
                          </div>
                          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{member.user.email}</p>
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 border rounded-lg text-sm font-medium capitalize ${isDark ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-700'}`}>
                          {member.role}
                        </span>
                        {canRemove && (
                          <button
                            onClick={() => handleRemoveMember(selectedTeam._id, member.user._id, member.user.name)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-900' : 'text-red-600 hover:bg-red-50'}`}
                            title="Remove member"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
