import { useState, useEffect } from 'react';
import api from '../utils/taskManager.api';
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
  const { isAuthenticated } = useTaskManagerAuth();
  const { isDark } = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks/stats/analytics');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
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
    { name: 'To Do', value: stats.statusBreakdown.todo },
    { name: 'In Progress', value: stats.statusBreakdown.inProgress },
    { name: 'In Review', value: stats.statusBreakdown.inReview },
    { name: 'Done', value: stats.statusBreakdown.done },
  ];

  const priorityData = [
    { name: 'Low', value: stats.priorityBreakdown.low },
    { name: 'Medium', value: stats.priorityBreakdown.medium },
    { name: 'High', value: stats.priorityBreakdown.high },
    { name: 'Urgent', value: stats.priorityBreakdown.urgent },
  ];

  // Prepare daily tasks data for last 7 days
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayData = stats.dailyTasks[dateStr] || { total: 0, done: 0 };
    last7Days.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Created: dayData.total,
      Completed: dayData.done,
    });
  }

  const totalTasks = statusData.reduce((sum, item) => sum + item.value, 0);
  const completionRate = totalTasks > 0 
    ? ((stats.statusBreakdown.done / totalTasks) * 100).toFixed(1) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl">
              <FiBarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-lg sm:text-2xl lg:text-3xl">Analytics & Overview</span>
          </h1>
          <p className={`mt-2 ml-0 sm:ml-14 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Insights into your task management and productivity</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl font-medium w-full sm:w-auto justify-center"
        >
          <FiRefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Refresh Data</span>
          <span className="sm:hidden">Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
    </div>
  );
};

export default Analytics;

