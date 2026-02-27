import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { useTheme } from '../context/taskManager.ThemeContext';
import {
  FiCheckSquare, FiUser, FiRefreshCw, FiCheckCircle,
  FiClock, FiCalendar, FiUsers, FiPlus, FiArrowRight,
  FiFolder, FiFilter, FiFileText
} from 'react-icons/fi';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentTasks, setRecentTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(() => {
    // Load from localStorage on component mount
    return localStorage.getItem('teamFilter') || '';
  });
  const { isAuthenticated } = useTaskManagerAuth();
  const { isDark } = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      fetchTeams();
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      // Save to localStorage whenever filter changes
      if (selectedTeam) {
        localStorage.setItem('teamFilter', selectedTeam);
      } else {
        localStorage.removeItem('teamFilter');
      }
      fetchDashboardData();
    }
  }, [selectedTeam, isAuthenticated]);

  // Listen for filter changes from notifications
  useEffect(() => {
    const handleFilterChange = (event) => {
      const teamId = event.detail?.teamId || localStorage.getItem('teamFilter') || '';
      setSelectedTeam(teamId);
    };

    window.addEventListener('teamFilterChanged', handleFilterChange);

    return () => {
      window.removeEventListener('teamFilterChanged', handleFilterChange);
    };
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = { limit: 5 };
      if (selectedTeam) {
        params.team = selectedTeam;
      }

      const [statsResponse, tasksResponse] = await Promise.all([
        api.get('/tasks/stats/dashboard', { params: selectedTeam ? { team: selectedTeam } : {} }),
        api.get('/tasks', { params }),
      ]);

      setStats(statsResponse.data);
      setRecentTasks(tasksResponse.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-primary-400' : 'border-primary-600'}`}></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Tasks',
      value: stats?.totalTasks || 0,
      icon: FiCheckSquare,
      color: 'from-blue-500 to-blue-600',
      link: '/taskflow/tasks',
    },
    {
      name: 'My Tasks',
      value: stats?.myTasks || 0,
      icon: FiUser,
      color: 'from-purple-500 to-purple-600',
      link: '/taskflow/tasks?assignedTo=me',
    },
    {
      name: 'In Progress',
      value: stats?.inProgressTasks || 0,
      icon: FiRefreshCw,
      color: 'from-yellow-500 to-yellow-600',
      link: '/taskflow/tasks?status=in-progress',
    },
    {
      name: 'Completed',
      value: stats?.doneTasks || 0,
      icon: FiCheckCircle,
      color: 'from-green-500 to-green-600',
      link: '/taskflow/tasks?status=done',
    },
    {
      name: 'Overdue',
      value: stats?.overdueTasks || 0,
      icon: FiClock,
      color: 'from-red-500 to-red-600',
      link: '/taskflow/tasks?overdue=true',
    },
    {
      name: 'Due Soon',
      value: stats?.dueSoonTasks || 0,
      icon: FiCalendar,
      color: 'from-orange-500 to-orange-600',
      link: '/taskflow/tasks?dueSoon=true',
    },
    {
      name: 'My Teams',
      value: stats?.totalTeams || 0,
      icon: FiUsers,
      color: 'from-indigo-500 to-indigo-600',
      link: '/taskflow/teams',
    },
    {
      name: 'Created by Me',
      value: stats?.createdByMe || 0,
      icon: FiCheckCircle,
      color: 'from-pink-500 to-pink-600',
      link: '/taskflow/tasks?createdBy=me',
    },
    {
      name: 'Bills & Invoices',
      value: 'View', // Or fetch count if available
      icon: FiFileText,
      color: 'from-teal-500 to-teal-600',
      link: '/taskflow/bills',
    },
  ];

  const getStatusColor = (status) => {
    if (isDark) {
      const colors = {
        todo: 'bg-gray-700 text-gray-200',
        'in-progress': 'bg-blue-900 text-blue-200',
        'in-review': 'bg-purple-900 text-purple-200',
        done: 'bg-green-900 text-green-200',
      };
      return colors[status] || colors.todo;
    }
    const colors = {
      todo: 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'in-review': 'bg-purple-100 text-purple-800',
      done: 'bg-green-100 text-green-800',
    };
    return colors[status] || colors.todo;
  };

  const getPriorityColor = (priority) => {
    if (isDark) {
      const colors = {
        low: 'bg-gray-700 text-gray-200',
        medium: 'bg-yellow-900 text-yellow-200',
        high: 'bg-orange-900 text-orange-200',
        urgent: 'bg-red-900 text-red-200',
      };
      return colors[priority] || colors.medium;
    }
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority] || colors.medium;
  };

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
        </div>
        <div className={`rounded-xl shadow-lg overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left side - Illustration */}
            <div className="hidden md:block p-8">
              <img
                src="/illustrations/12953813_Jan-Work_2.jpg"
                alt="Task Management Illustration"
                className="w-full h-auto rounded-lg object-contain"
              />
            </div>

            {/* Right side - Content */}
            <div className="p-8 md:p-12 text-center md:text-left">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg mb-6 md:mx-auto md:mb-6">
                <FiCheckSquare className="w-8 h-8 text-white" />
              </div>
              <h2 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Welcome to Task Manager
              </h2>
              <p className={`mb-8 text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Please sign in to view your tasks, teams, and manage your projects.
              </p>
              <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4">
                <Link
                  to="/taskflow/login"
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl font-medium text-center"
                >
                  Sign In
                </Link>
                <Link
                  to="/taskflow/register"
                  className="px-6 py-3 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-medium text-center"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
          <p className={`mt-1 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Overview of your tasks and teams</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Team Filter */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className={`px-3 sm:px-4 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'}`}
          >
            <option value="">All Tasks (Personal + Teams)</option>
            <option value="personal">Personal Tasks Only</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name}
              </option>
            ))}
          </select>
          <Link
            to="/taskflow/tasks/new"
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl font-medium"
          >
            <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.link}
              className={`rounded-xl shadow-md hover:shadow-xl transition-all p-4 sm:p-6 border group ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className={`text-xs sm:text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{stat.name}</p>
                  <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`bg-gradient-to-br ${stat.color} p-3 sm:p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform flex-shrink-0 ml-2`}>
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Tasks */}
      <div className={`rounded-xl shadow-md border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className={`p-4 sm:p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Tasks</h2>
            <Link
              to="/taskflow/tasks"
              className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs sm:text-sm font-medium transition-colors"
            >
              View all
              <FiArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </div>
        <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {recentTasks.length === 0 ? (
            <div className="p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
                {/* Left side - Illustration */}
                <div className="hidden md:block">
                  <img
                    src="/illustrations/12953813_Jan-Work_2.jpg"
                    alt="Task Management Illustration"
                    className="w-full h-auto rounded-lg object-contain"
                  />
                </div>

                {/* Right side - Content */}
                <div className="text-center md:text-left">
                  <FiCheckSquare className={`w-12 h-12 mx-auto md:mx-0 mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>No tasks yet</p>
                  <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Create your first task to get started!</p>
                  <Link
                    to="/taskflow/tasks"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl font-medium"
                  >
                    <FiPlus className="w-5 h-5" />
                    Create Task
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            recentTasks.map((task) => (
              <Link
                key={task._id}
                to="/taskflow/tasks"
                className={`block p-4 sm:p-6 transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <h3 className={`text-base sm:text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className={`text-xs sm:text-sm mb-3 line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center flex-wrap gap-2">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          task.status
                        )}`}
                      >
                        {task.status.replace('-', ' ')}
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                      {task.team && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          <FiFolder className="w-3 h-3" />
                          {task.team.name || 'Team'}
                        </span>
                      )}
                      {task.assignedTo && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          <FiUser className="w-3 h-3" />
                          {task.assignedTo.name || 'Unassigned'}
                        </span>
                      )}
                    </div>
                  </div>
                  {task.dueDate && (
                    <div className="sm:ml-4 text-left sm:text-right w-full sm:w-auto">
                      <div className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100'}`}>
                        <FiCalendar className={`w-3 h-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
