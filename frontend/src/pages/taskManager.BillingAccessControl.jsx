import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUsers, FiShield, FiFileText, FiLogOut } from 'react-icons/fi';
import adminApi from '../utils/adminApi';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';

const BillingAccessControl = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const navigate = useNavigate();
  const { logout } = useTaskManagerAuth();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getBillingAccessSettings();
      setTeams(response.teams || []);
    } catch (error) {
      console.error('Error fetching billing access settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamToggle = async (teamId, billingEnabled) => {
    try {
      setSaving(`team-${teamId}`);
      const response = await adminApi.updateTeamBillingAccess(teamId, billingEnabled);
      setTeams((prev) =>
        prev.map((team) => (team._id === teamId ? response.team : team))
      );
    } catch (error) {
      console.error('Error updating team billing access:', error);
      alert('Failed to update team billing access');
    } finally {
      setSaving(null);
    }
  };

  const handleMemberToggle = async (teamId, userId, billingAccess) => {
    try {
      setSaving(`member-${teamId}-${userId}`);
      const response = await adminApi.updateMemberBillingAccess(teamId, userId, billingAccess);
      setTeams((prev) =>
        prev.map((team) => (team._id === teamId ? response.team : team))
      );
    } catch (error) {
      console.error('Error updating member billing access:', error);
      alert('Failed to update member billing access');
    } finally {
      setSaving(null);
    }
  };

  const getMemberId = (member) => member.user?._id || member.user;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => navigate('/taskflow/admin/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 text-sm font-medium"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Admin Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Billing Access Control</h1>
            <p className="mt-2 text-gray-600">
              Control which teams and members can see the Bills &amp; Invoices page
            </p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/taskflow/login');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
          >
            <FiLogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <FiShield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">How it works</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Admins always have full access to Bills &amp; Invoices</li>
                <li>Turn off a team to hide billing from everyone in that team</li>
                <li>When a team is enabled, grant access to specific members individually</li>
                <li>Members without access will not see the Bills page at all</li>
              </ul>
            </div>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No teams found. Create teams first to manage billing access.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {teams.map((team) => (
              <div key={team._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-100 p-3 rounded-lg">
                      <FiFileText className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{team.name}</h2>
                      <p className="text-sm text-gray-500">
                        {team.members?.length || 0} member{(team.members?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className={`text-sm font-medium ${team.billingEnabled ? 'text-green-700' : 'text-gray-500'}`}>
                      {team.billingEnabled ? 'Billing Enabled' : 'Billing Disabled'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={team.billingEnabled}
                      disabled={saving === `team-${team._id}`}
                      onClick={() => handleTeamToggle(team._id, !team.billingEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                        team.billingEnabled ? 'bg-green-500' : 'bg-gray-300'
                      } ${saving === `team-${team._id}` ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          team.billingEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                </div>

                <div className={`p-5 ${!team.billingEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                    Member Access
                  </h3>
                  <div className="space-y-3">
                    {(team.members || []).map((member) => {
                      const memberId = getMemberId(member);
                      const memberName = member.user?.name || 'Unknown';
                      const memberEmail = member.user?.email || '';
                      const isSaving = saving === `member-${team._id}-${memberId}`;

                      return (
                        <div
                          key={memberId}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                              {memberName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{memberName}</p>
                              <p className="text-xs text-gray-500 truncate">{memberEmail}</p>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize flex-shrink-0">
                              {member.role}
                            </span>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer flex-shrink-0 ml-3">
                            <span className={`text-xs font-medium ${member.billingAccess ? 'text-green-600' : 'text-gray-400'}`}>
                              {member.billingAccess ? 'Has Access' : 'No Access'}
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={member.billingAccess}
                              disabled={isSaving || !team.billingEnabled}
                              onClick={() => handleMemberToggle(team._id, memberId, !member.billingAccess)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                member.billingAccess ? 'bg-green-500' : 'bg-gray-300'
                              } ${isSaving ? 'opacity-50' : ''}`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                  member.billingAccess ? 'translate-x-4' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingAccessControl;
