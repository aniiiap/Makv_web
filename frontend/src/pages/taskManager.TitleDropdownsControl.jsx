import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiUsers,
  FiTag,
  FiSearch,
  FiCheckCircle,
  FiLogOut,
} from 'react-icons/fi';
import api from '../utils/taskManager.api';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { toast } from 'react-hot-toast';

const TitleDropdownsControl = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { logout } = useTaskManagerAuth();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/predefined-titles/teams');
      setTeams(res.teams || []);
    } catch (error) {
      try {
        const fallback = await api.get('/teams');
        setTeams(fallback.data || []);
      } catch (err) {
        console.error('Error fetching teams:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTeam = async (team) => {
    const nextVal = !team.predefinedTitlesEnabled;
    try {
      // Optimistic update
      setTeams((prev) =>
        prev.map((t) => (t._id === team._id ? { ...t, predefinedTitlesEnabled: nextVal } : t))
      );
      await api.patch(`/admin/predefined-titles/team/${team._id}`, {
        predefinedTitlesEnabled: nextVal,
      });
      toast.success(
        nextVal
          ? `Standard task titles enabled for ${team.name}`
          : `Standard task titles disabled for ${team.name}`
      );
    } catch (err) {
      // Revert optimistic update
      setTeams((prev) =>
        prev.map((t) => (t._id === team._id ? { ...t, predefinedTitlesEnabled: !nextVal } : t))
      );
      toast.error(err.response?.data?.message || 'Failed to update team');
    }
  };

  const filteredTeams = teams.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.name?.toLowerCase().includes(q) || t.owner?.name?.toLowerCase().includes(q);
  });

  const enabledCount = teams.filter((t) => t.predefinedTitlesEnabled).length;

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
        {/* Top Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button
              onClick={() => navigate('/taskflow/admin/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 text-sm font-medium transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Admin Dashboard
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Team Settings (Enable Dropdown)
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {enabledCount} / {teams.length} Active
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Configure which teams use standard predefined titles dropdowns vs. manual free-text entry
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/taskflow/admin/predefined-titles')}
              className="flex items-center gap-2 px-3.5 py-2 text-sm bg-white hover:bg-gray-100 text-gray-700 font-medium rounded-lg transition-colors border border-gray-200 shadow-sm"
            >
              <FiTag className="w-4 h-4 text-primary-600" />
              Manage Predefined Titles
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/taskflow/login');
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-sm text-sm"
            >
              <FiLogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 sm:p-5 mb-6 flex items-start gap-3">
          <FiCheckCircle className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div className="text-sm text-indigo-900">
            <p className="font-semibold mb-0.5">How Standard Task Titles work across teams:</p>
            <p className="text-indigo-800">
              When <strong>Enabled</strong> for a team, members will see searchable Predefined Titles & Sub-titles dropdowns when creating/editing tasks for that team. Teams with this <strong>Disabled</strong> will continue using standard free-text manual title entry as before.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search teams by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
        </div>

        {/* Teams List */}
        {filteredTeams.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FiUsers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No teams found</h3>
            <p className="text-sm text-gray-500 mt-1">
              {search ? 'Try a different search query.' : 'Create teams first in the Teams section.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTeams.map((team) => {
              const isEnabled = Boolean(team.predefinedTitlesEnabled);
              const membersCount = team.members?.length || 0;
              return (
                <div
                  key={team._id}
                  className={`bg-white rounded-xl shadow-sm border p-5 transition-all flex items-center justify-between gap-4 ${
                    isEnabled ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-gray-900 truncate">{team.name}</h3>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isEnabled
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isEnabled ? 'Dropdown Enabled' : 'Manual Entry'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {membersCount} {membersCount === 1 ? 'member' : 'members'}
                      {team.owner?.name ? ` • Owner: ${team.owner.name}` : ''}
                    </p>
                  </div>

                  {/* Switch Button */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={() => handleToggleTeam(team)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      isEnabled ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-1 ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TitleDropdownsControl;
