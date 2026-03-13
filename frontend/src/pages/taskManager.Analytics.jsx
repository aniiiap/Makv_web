import { useState, useEffect } from 'react';
import api from '../utils/taskManager.api';
import adminApi from '../utils/adminApi';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { useTheme } from '../context/taskManager.ThemeContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FiBarChart2, FiTrendingUp, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useTaskManagerAuth();
  const { isDark } = useTheme();

  // User Progress Analytics State
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin') {
        fetchUsers();
      }
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, selectedUserId, timeRange]);

  const fetchUsers = async () => {
    try {
      const response = await adminApi.getAllUsers(1, 100);
      if (response && response.users) {
        setUsers(response.users);
      }
    } catch (error) {
      console.error('Error fetching users for analytics:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      let url = '/tasks/stats/analytics';
      if (user?.role === 'admin' && selectedUserId) {
        url += `?userId=${selectedUserId}&timeRange=${timeRange}`;
      }
      const response = await api.get(url);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format seconds into HH:MM:SS
  const formatTime = (totalSeconds) => {
    if (!totalSeconds) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={isDark ? 'text-gray-300' : 'text-gray-500'}>Please sign in to view analytics</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-primary-400' : 'border-primary-600'}`}></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={isDark ? 'text-gray-300' : 'text-gray-500'}>No analytics data available</p>
      </div>
    );
  }

  // Prepare data for charts
  const statusData = [
    { name: 'To Do', value: stats.statusBreakdown?.todo || 0 },
    { name: 'In Progress', value: stats.statusBreakdown?.inProgress || 0 },
    { name: 'In Review', value: stats.statusBreakdown?.inReview || 0 },
    { name: 'Done', value: stats.statusBreakdown?.done || 0 },
  ];

  const priorityData = [
    { name: 'Low', value: stats.priorityBreakdown?.low || 0 },
    { name: 'Medium', value: stats.priorityBreakdown?.medium || 0 },
    { name: 'High', value: stats.priorityBreakdown?.high || 0 },
    { name: 'Urgent', value: stats.priorityBreakdown?.urgent || 0 },
  ];

  // Prepare daily tasks data for last 7 days
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayData = stats.dailyTasks?.[dateStr] || { total: 0, done: 0 };
    last7Days.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Created: dayData.total,
      Completed: dayData.done,
    });
  }

  const totalTasks = stats && stats.statusBreakdown ? statusData.reduce((sum, item) => sum + item.value, 0) : 0;
  const completionRate = totalTasks > 0
    ? (((stats.statusBreakdown?.done || 0) / totalTasks) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl">
              <FiBarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-lg sm:text-2xl lg:text-3xl">Analytics & Overview</span>
          </h1>
          <p className={`mt-2 ml-0 sm:ml-14 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Insights into your task management and productivity</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {user?.role === 'admin' && (
            <>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none transition-all ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
              >
                <option value="">All Users Overview</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </select>

              {selectedUserId && (
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none transition-all ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                >
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                  <option value="year">Past Year</option>
                </select>
              )}
            </>
          )}

          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl font-medium w-full sm:w-auto justify-center"
          >
            <FiRefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Refresh Data</span>
            <span className="sm:hidden">Refresh</span>
          </button>
        </div>
      </div>

      {stats.isUserProgressMode ? (
        // --- ADMIN USER PROGRESS VIEW ---
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl sm:rounded-2xl shadow-lg border border-blue-200 p-4 sm:p-6">
              <p className="text-xs sm:text-sm font-medium text-blue-700 mb-1">Tasks Worked On</p>
              <p className="text-3xl sm:text-4xl font-bold text-blue-900">{stats.tasksWorkedOn}</p>
              <p className="text-xs text-blue-600 mt-1">In the {stats.timeRange}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl sm:rounded-2xl shadow-lg border border-purple-200 p-4 sm:p-6">
              <p className="text-xs sm:text-sm font-medium text-purple-700 mb-1">Total Time Logged</p>
              <p className="text-3xl sm:text-4xl font-bold text-purple-900">{formatTime(stats.totalTimeSpent)}</p>
              <p className="text-xs text-purple-600 mt-1">In the {stats.timeRange}</p>
            </div>
          </div>

          <div className={`rounded-xl shadow-lg border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-4 sm:p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Task Details Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={isDark ? 'bg-gray-900/50 text-gray-400' : 'bg-gray-50 text-gray-500'}>
                    <th className="py-3 px-4 sm:px-6 font-semibold text-sm">Task Title</th>
                    <th className="py-3 px-4 sm:px-6 font-semibold text-sm">Status</th>
                    <th className="py-3 px-4 sm:px-6 font-semibold text-sm">User Time Logged</th>
                    <th className="py-3 px-4 sm:px-6 font-semibold text-sm">Currently Assigned</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {stats.taskDetails.map((task) => (
                    <tr key={task.id} className={`hover:${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} transition-colors`}>
                      <td className={`py-3 sm:py-4 px-4 sm:px-6 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {task.title}
                      </td>
                      <td className="py-3 sm:py-4 px-4 sm:px-6 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${task.status === 'done' ? 'bg-green-100 text-green-800' :
                            task.status === 'in-review' ? 'bg-yellow-100 text-yellow-800' :
                              task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'}`}>
                          {task.status.replace('-', ' ')}
                        </span>
                      </td>
                      <td className={`py-3 sm:py-4 px-4 sm:px-6 text-sm font-medium ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                        {formatTime(task.userTimeSpent)}
                      </td>
                      <td className="py-3 sm:py-4 px-4 sm:px-6 text-sm">
                        {task.isAssignedToUser ? (
                          <span className="text-green-500 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {stats.taskDetails.length === 0 && (
                    <tr>
                      <td colSpan="4" className={`py-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        No tasks worked on in this time period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // --- DEFAULT OVERVIEW VIEW ---
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl sm:rounded-2xl shadow-lg border border-blue-200 p-4 sm:p-6 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-blue-700 mb-1 sm:mb-2">Total Tasks</p>
                  <p className="text-3xl sm:text-4xl font-bold text-blue-900">{totalTasks}</p>
                  <p className="text-xs text-blue-600 mt-1 sm:mt-2">Across all statuses</p>
                </div>
                <div className="bg-white bg-opacity-60 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-md flex-shrink-0 ml-2">
                  <FiBarChart2 className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl sm:rounded-2xl shadow-lg border border-green-200 p-4 sm:p-6 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-green-700 mb-1 sm:mb-2">Completion Rate</p>
                  <p className="text-3xl sm:text-4xl font-bold text-green-900">{completionRate}%</p>
                  <p className="text-xs text-green-600 mt-1 sm:mt-2">Tasks completed</p>
                </div>
                <div className="bg-white bg-opacity-60 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-md flex-shrink-0 ml-2">
                  <FiTrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl sm:rounded-2xl shadow-lg border border-purple-200 p-4 sm:p-6 hover:shadow-xl transition-all sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-purple-700 mb-1 sm:mb-2">Tasks Completed</p>
                  <p className="text-3xl sm:text-4xl font-bold text-purple-900">{stats.statusBreakdown.done}</p>
                  <p className="text-xs text-purple-600 mt-1 sm:mt-2">Finished tasks</p>
                </div>
                <div className="bg-white bg-opacity-60 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-md flex-shrink-0 ml-2">
                  <FiCheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Status Breakdown Chart */}
            <div className={`rounded-xl sm:rounded-2xl shadow-lg border p-4 sm:p-6 hover:shadow-xl transition-all ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className={`p-1.5 sm:p-2 rounded-lg ${isDark ? 'bg-primary-900' : 'bg-primary-100'}`}>
                  <FiBarChart2 className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-primary-300' : 'text-primary-600'}`} />
                </div>
                <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tasks by Status</h2>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: isDark ? '#d1d5db' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#6b7280' : '#9ca3af'}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#d1d5db' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#6b7280' : '#9ca3af'}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1f2937' : '#fff',
                      border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      color: isDark ? '#f3f4f6' : '#111827'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px', color: isDark ? '#f3f4f6' : '#111827' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="value"
                    fill="#4F46E5"
                    name="Tasks"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Priority Breakdown Chart */}
            <div className={`rounded-xl sm:rounded-2xl shadow-lg border p-4 sm:p-6 hover:shadow-xl transition-all ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className={`p-1.5 sm:p-2 rounded-lg ${isDark ? 'bg-green-900' : 'bg-green-100'}`}>
                  <FiTrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-green-300' : 'text-green-600'}`} />
                </div>
                <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tasks by Priority</h2>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={priorityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: isDark ? '#d1d5db' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#6b7280' : '#9ca3af'}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#d1d5db' : '#6b7280', fontSize: 12 }}
                    stroke={isDark ? '#6b7280' : '#9ca3af'}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1f2937' : '#fff',
                      border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      color: isDark ? '#f3f4f6' : '#111827'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px', color: isDark ? '#f3f4f6' : '#111827' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="value"
                    fill="#10B981"
                    name="Tasks"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Activity Chart */}
          <div className={`rounded-2xl shadow-lg border p-6 hover:shadow-xl transition-all ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-900' : 'bg-purple-100'}`}>
                <FiTrendingUp className={`w-5 h-5 ${isDark ? 'text-purple-300' : 'text-purple-600'}`} />
              </div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Task Activity (Last 7 Days)</h2>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={last7Days} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: isDark ? '#d1d5db' : '#6b7280', fontSize: 12 }}
                  stroke={isDark ? '#6b7280' : '#9ca3af'}
                />
                <YAxis
                  tick={{ fill: isDark ? '#d1d5db' : '#6b7280', fontSize: 12 }}
                  stroke={isDark ? '#6b7280' : '#9ca3af'}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#fff',
                    border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    color: isDark ? '#f3f4f6' : '#111827'
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar
                  dataKey="Created"
                  fill="#3B82F6"
                  name="Tasks Created"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="Completed"
                  fill="#10B981"
                  name="Tasks Completed"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;

