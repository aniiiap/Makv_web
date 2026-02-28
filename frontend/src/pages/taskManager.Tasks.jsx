import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { useTheme } from '../context/taskManager.ThemeContext';
import { useTimer } from '../context/taskManager.TimerContext';
import KanbanBoard from '../components/taskManager.KanbanBoard';
import {
  FiPlus, FiFilter, FiList, FiGrid, FiFolder, FiUser,
  FiCalendar, FiTag, FiEdit2, FiX, FiCheckCircle, FiClock,
  FiActivity, FiCheckSquare, FiPlay, FiSquare, FiTrash2, FiDollarSign,
  FiDownload
} from 'react-icons/fi';
import * as XLSX from 'xlsx';

const Tasks = ({ openCreate = false }) => {
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(openCreate);
  const [editingTask, setEditingTask] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'list' or 'kanban'
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'subtasks', 'time', 'activity'
  const [currentTaskDetails, setCurrentTaskDetails] = useState(null);
  const [activities, setActivities] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Custom Timer Context
  const {
    activeTask: timerActiveTask,
    isRunning: isTimerRunning,
    elapsedTime: timerElapsedTime,
    startTimer,
    stopTimer,
    syncTimer,
    formatTime
  } = useTimer();

  const [manualTimeHours, setManualTimeHours] = useState('');
  const [manualTimeMinutes, setManualTimeMinutes] = useState('');
  const [isSavingTask, setIsSavingTask] = useState(false);
  const { isDark } = useTheme();
  const [filters, setFilters] = useState(() => {
    // Load team filter from localStorage, others from URL params
    const teamFilter = localStorage.getItem('teamFilter') || '';
    return {
      team: teamFilter,
      status: '',
      assignedTo: '',
    };
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useTaskManagerAuth();
  const navigate = useNavigate();

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    team: '',
    assignedTo: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    tags: '',
    isBillable: false,
  });

  useEffect(() => {
    fetchTeams();
    // Read URL params for status and assignedTo (but not team - use localStorage)
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const teamFilter = localStorage.getItem('teamFilter') || '';
    if (status || assignedTo) {
      setFilters({
        team: teamFilter, // Use localStorage for team filter
        status: status || '',
        assignedTo: assignedTo || ''
      });
    } else {
      // Sync team filter from localStorage
      setFilters(prev => {
        if (prev.team !== teamFilter) {
          return { ...prev, team: teamFilter };
        }
        return prev;
      });
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  // Listen for filter changes and refresh triggers from notifications or other components
  useEffect(() => {
    const handleFilterChange = (event) => {
      const teamId = event.detail?.teamId || localStorage.getItem('teamFilter') || '';
      setFilters(prev => {
        if (prev.team !== teamId) {
          return { ...prev, team: teamId };
        }
        return prev;
      });
    };

    const handleRefreshTasks = () => {
      // Force refresh tasks when notification is clicked
      // This ensures we get the latest task data after updates
      // Read current filters from localStorage and state
      const teamFilter = localStorage.getItem('teamFilter') || '';

      // Fetch tasks with current filters
      const refreshTasks = async () => {
        try {
          setLoading(true);
          const params = {};
          if (teamFilter) params.team = teamFilter;
          if (filters.status) params.status = filters.status;
          if (filters.assignedTo === 'me') {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            if (userData.id) {
              params.assignedTo = userData.id;
            }
          } else if (filters.assignedTo) {
            params.assignedTo = filters.assignedTo;
          }

          const response = await api.get('/tasks', { params });
          setTasks(response.data || []);
        } catch (error) {
          console.error('Error fetching tasks:', error);
        } finally {
          setLoading(false);
        }
      };

      // Small delay to ensure any filter updates are processed first
      setTimeout(() => {
        refreshTasks();
      }, 200);
    };

    // Listen for custom event when filter is changed from notifications
    window.addEventListener('teamFilterChanged', handleFilterChange);

    // Listen for refresh trigger from notifications
    window.addEventListener('refreshTasks', handleRefreshTasks);

    // Also listen for storage events (when localStorage is changed from other tabs)
    window.addEventListener('storage', handleFilterChange);

    // Check on focus (when user comes back to this tab)
    const handleFocus = () => {
      const teamFilter = localStorage.getItem('teamFilter') || '';
      setFilters(prev => {
        if (prev.team !== teamFilter) {
          return { ...prev, team: teamFilter };
        }
        return prev;
      });
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('teamFilterChanged', handleFilterChange);
      window.removeEventListener('refreshTasks', handleRefreshTasks);
      window.removeEventListener('storage', handleFilterChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [filters]);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.team) params.team = filters.team;
      if (filters.status) params.status = filters.status;
      if (filters.assignedTo === 'me') {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.id) {
          params.assignedTo = userData.id;
        }
      } else if (filters.assignedTo) {
        params.assignedTo = filters.assignedTo;
      }

      const response = await api.get('/tasks', { params });
      setTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (isSavingTask) return;
    try {
      setIsSavingTask(true);
      if (editingTask) {
        handleUpdateTask(e);
        return;
      }
      const taskData = {
        ...newTask,
        team: newTask.team || null, // Allow null for personal tasks
        assignedTo: newTask.assignedTo || (newTask.team ? null : user?.id), // Default to self for personal tasks
        tags: newTask.tags ? newTask.tags.split(',').map((t) => t.trim()) : [],
      };
      await api.post('/tasks', taskData);
      setShowCreateModal(false);
      setEditingTask(null);
      setNewTask({
        title: '',
        description: '',
        team: '',
        assignedTo: '',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
        tags: '',
      });
      fetchTasks();
    } catch (error) {
      alert(error.message || 'Failed to create task');
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      alert(error.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
    } catch (error) {
      alert(error.message || 'Failed to delete task');
    }
  };

  const handleEditTask = async (task) => {
    setNewTask({
      title: task.title,
      description: task.description || '',
      team: task.team?._id || task.team || '',
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
      tags: task.tags ? task.tags.join(', ') : '',
      isBillable: task.isBillable || false,
    });
    setEditingTask(task._id);
    setActiveTab('details');
    setShowCreateModal(true);

    // Fetch full task details including subtasks and timer info
    try {
      const response = await api.get(`/tasks/${task._id}`);
      setCurrentTaskDetails(response.data);

      // Check if timer is running - Sync with global context if needed
      if (response.data.activeTimer) {
        // If context is empty or different, sync it
        if (!timerActiveTask || timerActiveTask._id !== response.data._id) {
          syncTimer(response.data, response.data.activeTimer);
        }
      }


      // Fetch activities
      fetchActivities(task._id);
    } catch (error) {
      console.error('Error fetching task details:', error);
      setCurrentTaskDetails(task);
    }
  };

  const fetchActivities = async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}/activities`);
      setActivities(response.data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !editingTask) return;

    try {
      const response = await api.post(`/tasks/${editingTask}/subtasks`, {
        title: newSubtaskTitle.trim()
      });
      setCurrentTaskDetails(response.data);
      setNewSubtaskTitle('');
      fetchActivities(editingTask);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add subtask');
    }
  };

  const handleToggleSubtask = async (subtaskId, completed) => {
    if (!editingTask) return;

    try {
      const response = await api.put(`/tasks/${editingTask}/subtasks/${subtaskId}`, {
        completed: !completed
      });
      setCurrentTaskDetails(response.data);
      fetchActivities(editingTask);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!editingTask) return;

    try {
      const response = await api.delete(`/tasks/${editingTask}/subtasks/${subtaskId}`);
      setCurrentTaskDetails(response.data);
      fetchActivities(editingTask);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete subtask');
    }
  };

  const handleStartTimer = async () => {
    if (!editingTask) return;

    try {
      const response = await api.post(`/tasks/${editingTask}/timer/start`);
      const updatedTask = response.data;
      setCurrentTaskDetails(updatedTask);

      // Update global timer context
      startTimer(updatedTask);

      fetchActivities(editingTask);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    if (!editingTask) return;

    try {
      const response = await api.post(`/tasks/${editingTask}/timer/stop`);
      const updatedTask = response.data;
      setCurrentTaskDetails(updatedTask);

      // Update global timer context
      stopTimer();

      fetchActivities(editingTask);
      fetchTasks(); // Refresh tasks to show updated time
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to stop timer');
    }
  };

  const handleLogTime = async () => {
    if (!editingTask) return;
    const hours = parseInt(manualTimeHours) || 0;
    const minutes = parseInt(manualTimeMinutes) || 0;

    if (hours === 0 && minutes === 0) {
      alert('Please enter time to log');
      return;
    }

    try {
      const response = await api.post(`/tasks/${editingTask}/timer/log`, {
        hours,
        minutes
      });
      setCurrentTaskDetails(response.data);
      setManualTimeHours('');
      setManualTimeMinutes('');
      fetchActivities(editingTask);
      fetchTasks();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to log time');
    }
  };



  const handleDeleteTimeEntry = async (entryIndex) => {
    if (!editingTask) return;
    if (!window.confirm('Are you sure you want to delete this time entry?')) return;

    try {
      const response = await api.delete(`/tasks/${editingTask}/timer/entries/${entryIndex}`);
      setCurrentTaskDetails(response.data);
      fetchActivities(editingTask);
      fetchTasks();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete time entry');
    }
  };

  const handleResetTimeTracking = async () => {
    if (!editingTask) return;
    if (!window.confirm('Are you sure you want to reset all time tracking? This will delete all time entries and reset the timer.')) return;

    try {
      const response = await api.delete(`/tasks/${editingTask}/timer/reset`);
      setCurrentTaskDetails(response.data);

      // Stop global timer if it was running for this task
      if (timerActiveTask && timerActiveTask._id === editingTask) {
        stopTimer();
      }

      fetchActivities(editingTask);
      fetchTasks();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reset time tracking');
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!editingTask) return;
    if (!window.confirm('Are you sure you want to delete this activity?')) return;

    try {
      await api.delete(`/tasks/${editingTask}/activities/${activityId}`);
      fetchActivities(editingTask);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete activity');
    }
  };

  const handleClearActivities = async () => {
    if (!editingTask) return;
    if (!window.confirm('Are you sure you want to clear all activity logs? This action cannot be undone.')) return;

    try {
      await api.delete(`/tasks/${editingTask}/activities`);
      setActivities([]);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to clear activities');
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (isSavingTask) return;
    try {
      setIsSavingTask(true);

      // Permission Check
      const currentTeam = teams.find(t => t._id === newTask.team);
      const currentUserMember = currentTeam?.members?.find(m => m.user?._id === user?.id);
      const userRole = currentUserMember?.role || 'member';
      const isTeamAdminOrOwner = ['admin', 'owner'].includes(userRole);
      const isPersonalTask = !newTask.team;
      const canEditSensitive = !editingTask || isPersonalTask || isTeamAdminOrOwner;

      const taskData = {
        ...newTask,
        team: newTask.team || null,
        assignedTo: newTask.assignedTo || null,
        tags: newTask.tags ? newTask.tags.split(',').map((t) => t.trim()) : [],
        isBillable: newTask.isBillable
      };

      // Filter out restricted fields if user doesn't have permission
      if (!canEditSensitive && editingTask) {
        delete taskData.priority;
        delete taskData.dueDate;
        delete taskData.assignedTo;
        delete taskData.team;
      }

      await api.put(`/tasks/${editingTask}`, taskData);
      setShowCreateModal(false);
      setEditingTask(null);
      setNewTask({
        title: '',
        description: '',
        team: '',
        assignedTo: '',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
        tags: '',
        isBillable: false,
      });
      fetchTasks();
    } catch (error) {
      alert(error.message || 'Failed to update task');
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleExportExcel = () => {
    if (tasks.length === 0) {
      alert('No tasks to export.');
      return;
    }

    // Format tasks for excel
    const excelData = tasks.map(task => {
      // Find the team name and member info if needed
      const teamName = task.team?.name || 'Personal';
      const assigneeData = task.assignedTo;
      let assigneeName = 'Unassigned';
      if (assigneeData) {
        assigneeName = assigneeData.name || 'Unassigned';
      }

      return {
        'Task Name': task.title || '',
        'Description': task.description || '',
        'Team': teamName,
        'Assignee': assigneeName,
        'Status': task.status ? task.status.replace('-', ' ') : '',
        'Priority': task.priority || '',
        'Due Date': task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None',
        'Billable': task.isBillable ? 'Yes' : 'No',
        'Tags': task.tags ? task.tags.join(', ') : '',
        'Total Time Spent (Hours)': task.timeSpent ? (task.timeSpent.hours + (task.timeSpent.minutes / 60)).toFixed(2) : '0.00',
        'Created At': task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ''
      };
    });

    // Create a new workbook and add the data
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

    // Generate buffer and trigger download
    XLSX.writeFile(workbook, "Tasks_Export.xlsx");
  };

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

  const getTeamMembers = (teamId) => {
    const team = teams.find((t) => t._id === teamId);
    return team?.members || [];
  };

  // Permission Logic Calculation
  const currentTeam = teams.find(t => t._id === newTask.team);
  // Note: user.id might be undefined initially, handle gracefully
  const currentUserMember = currentTeam?.members?.find(m => m.user?._id === user?.id);
  const userRole = currentUserMember?.role || 'member';
  const isTeamAdminOrOwner = ['admin', 'owner'].includes(userRole);
  const isPersonalTask = !newTask.team;
  const canEditSensitive = !editingTask || isPersonalTask || isTeamAdminOrOwner;

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const canDeleteTask = (task) => {
    if (!user) return false;

    // Normalize IDs to strings for comparison
    const userId = (user._id || user.id || '').toString();
    const taskCreatorId = (task.createdBy?._id || task.createdBy || '').toString();

    const isCreator = taskCreatorId === userId;

    if (!task.team) {
      return isCreator;
    }

    // Find the team to check role
    const teamId = (task.team._id || task.team || '').toString();

    // 'teams' state comes from API, IDs should be strings, but safety first
    const team = teams.find(t => (t._id || '').toString() === teamId);

    // If team details not found (shouldn't happen if loaded), default to strict
    if (!team) return isCreator;

    // Find current user in members
    const member = team.members?.find(m => {
      const memberUserId = (m.user?._id || m.user || '').toString();
      return memberUserId === userId;
    });

    if (!member) return isCreator;

    // Permissions: Creator OR Team Owner OR Team Admin
    return isCreator || ['admin', 'owner'].includes(member.role);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tasks</h1>
          <p className={`mt-1 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage your tasks and projects</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* View Toggle */}
          <div className={`flex items-center rounded-lg p-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 sm:p-2 rounded-md transition-colors ${viewMode === 'kanban'
                ? isDark ? 'bg-gray-600 text-primary-400 shadow-sm' : 'bg-white text-primary-600 shadow-sm'
                : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              title="Kanban Board"
            >
              <FiGrid className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 sm:p-2 rounded-md transition-colors ${viewMode === 'list'
                ? isDark ? 'bg-gray-600 text-primary-400 shadow-sm' : 'bg-white text-primary-600 shadow-sm'
                : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              title="List View"
            >
              <FiList className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          <button
            onClick={handleExportExcel}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg transition-all shadow border font-medium flex-1 sm:flex-none justify-center ${isDark
              ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            title="Export to Excel"
          >
            <FiDownload className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl font-medium flex-1 sm:flex-none justify-center"
          >
            <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`rounded-xl shadow-md border p-3 sm:p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <FiFilter className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <h3 className={`text-sm sm:text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Filters</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Team
            </label>
            <select
              value={filters.team}
              onChange={(e) => {
                const teamValue = e.target.value;
                setFilters({ ...filters, team: teamValue });
                // Save to localStorage
                if (teamValue) {
                  localStorage.setItem('teamFilter', teamValue);
                } else {
                  localStorage.removeItem('teamFilter');
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
            >
              <option value="">All Tasks (Personal + Teams)</option>
              <option value="personal">Personal Tasks Only</option>
              {teams.map((team) => (
                <option key={team._id} value={team._id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
            >
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="in-review">In Review</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Assigned To
            </label>
            <select
              value={filters.assignedTo}
              onChange={(e) =>
                setFilters({ ...filters, assignedTo: e.target.value })
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
            >
              <option value="">All Assignees</option>
              <option value="me">Assigned to Me</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks View */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          tasks={tasks}
          onTaskUpdate={fetchTasks}
          onTaskClick={(task) => handleEditTask(task)}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          canDeleteTask={canDeleteTask}
        />
      ) : (
        /* List View */
        tasks.length === 0 ? (
          <div className={`rounded-xl shadow-md border p-6 sm:p-12 text-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <FiCheckCircle className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`text-base sm:text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>No tasks found</p>
            <p className={`text-xs sm:text-sm mb-4 sm:mb-6 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Create your first task to get started!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              Create Task
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task._id}
                className={`rounded-xl shadow-md hover:shadow-lg transition-all p-4 sm:p-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <div className="flex items-start sm:items-center gap-2 mb-2">
                      <button
                        onClick={() => handleEditTask(task)}
                        className={`text-base sm:text-xl font-semibold hover:text-primary-600 transition-colors flex-1 text-left ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        {task.title}
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit task"
                        >
                          <FiEdit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        {canDeleteTask(task) && (
                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete task"
                          >
                            <FiX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {task.description && (
                      <p className={`text-sm mt-2 line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center flex-wrap gap-3 mt-4">
                      <select
                        value={task.status}
                        onChange={(e) =>
                          handleStatusChange(task._id, e.target.value)
                        }
                        className={`px-3 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${getStatusColor(
                          task.status
                        )}`}
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="in-review">In Review</option>
                        <option value="done">Done</option>
                      </select>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                      {task.isBillable ? (
                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                          <FiDollarSign className="w-3 h-3" />
                          Billable
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                          <FiDollarSign className="w-3 h-3 opacity-50" />
                          Non-Billable
                        </span>
                      )}
                      {task.team ? (
                        <Link
                          to={`/taskflow/teams/${task.team._id || task.team}`}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          <FiFolder className="w-3 h-3" />
                          {task.team.name || 'Team'}
                        </Link>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${isDark ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-700'}`}>
                          <FiUser className="w-3 h-3" />
                          Personal
                        </span>
                      )}
                      {task.assignedTo && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          <FiUser className="w-3 h-3" />
                          {task.assignedTo.name || 'Unassigned'}
                        </span>
                      )}
                      {task.dueDate && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${new Date(task.dueDate) < new Date() &&
                            task.status !== 'done'
                            ? isDark ? 'bg-red-900 text-red-200 font-semibold' : 'bg-red-100 text-red-700 font-semibold'
                            : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                          <FiCalendar className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {task.tags.map((tag, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                          >
                            <FiTag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl sm:rounded-2xl max-w-4xl w-full p-4 sm:p-6 my-4 sm:my-8 shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTask(null);
                  setCurrentTaskDetails(null);
                  setActiveTab('details');
                  setActivities([]);
                  setNewSubtaskTitle('');
                  setManualTimeHours('');
                  setManualTimeMinutes('');
                  setNewTask({
                    title: '',
                    description: '',
                    team: '',
                    assignedTo: '',
                    status: 'todo',
                    priority: 'medium',
                    dueDate: '',
                    tags: '',
                    isBillable: false,
                  });
                }}
                className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs - Only show when editing */}
            {editingTask && (
              <div className={`flex gap-1 sm:gap-2 mb-3 sm:mb-4 border-b overflow-x-auto ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                {['details', 'subtasks', 'time', 'activity'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab
                      ? isDark
                        ? 'text-primary-400 border-b-2 border-primary-400'
                        : 'text-primary-600 border-b-2 border-primary-600'
                      : isDark
                        ? 'text-gray-400 hover:text-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    {tab === 'details' && 'Details'}
                    {tab === 'subtasks' && (
                      <span className="flex items-center gap-1 sm:gap-2">
                        <FiCheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Subtasks</span>
                        <span className="sm:hidden">Sub</span>
                        {currentTaskDetails?.subtasks?.length > 0 && (
                          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                            {currentTaskDetails.subtasks.filter(s => s.completed).length}/{currentTaskDetails.subtasks.length}
                          </span>
                        )}
                      </span>
                    )}
                    {tab === 'time' && (
                      <span className="flex items-center gap-1 sm:gap-2">
                        <FiClock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Time Tracking</span>
                        <span className="sm:hidden">Time</span>
                      </span>
                    )}
                    {tab === 'activity' && (
                      <span className="flex items-center gap-1 sm:gap-2">
                        <FiActivity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Activity Log</span>
                        <span className="sm:hidden">Log</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'details' && (
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'}`}
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'}`}
                    rows="2"
                    placeholder="Enter task description"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Team (Optional)
                    </label>
                    <select
                      value={newTask.team}
                      onChange={(e) => {
                        setNewTask({
                          ...newTask,
                          team: e.target.value,
                          assignedTo: '' // Reset assignee when team changes
                        });
                      }}
                      disabled={!canEditSensitive}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} disabled:cursor-not-allowed`}
                    >
                      <option value="">Personal Task</option>
                      {teams.map((team) => (
                        <option key={team._id} value={team._id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    {!editingTask && <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Leave empty for personal task</p>}
                  </div>
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Assign To
                    </label>
                    <select
                      value={newTask.assignedTo}
                      onChange={(e) =>
                        setNewTask({ ...newTask, assignedTo: e.target.value })
                      }
                      disabled={!canEditSensitive}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} disabled:cursor-not-allowed`}
                    >
                      <option value="">Unassigned</option>
                      {newTask.team ? (
                        getTeamMembers(newTask.team).map((member) => (
                          <option key={member.user._id} value={member.user._id}>
                            {member.user.name}
                          </option>
                        ))
                      ) : (
                        <option value={user?.id}>{user?.name} (Me)</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Status
                    </label>
                    <select
                      value={newTask.status}
                      onChange={(e) =>
                        setNewTask({ ...newTask, status: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="in-review">In Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Priority
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) =>
                        setNewTask({ ...newTask, priority: e.target.value })
                      }
                      disabled={!canEditSensitive}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} disabled:cursor-not-allowed`}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Due Date
                    </label>
                    <input
                      type="datetime-local"
                      value={newTask.dueDate}
                      onChange={(e) =>
                        setNewTask({ ...newTask, dueDate: e.target.value })
                      }
                      disabled={!canEditSensitive}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} disabled:cursor-not-allowed`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs sm:text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      value={newTask.tags}
                      onChange={(e) =>
                        setNewTask({ ...newTask, tags: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'}`}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <input
                        type="checkbox"
                        checked={newTask.isBillable}
                        onChange={(e) => setNewTask({ ...newTask, isBillable: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium">Billable Task</span>
                    </label>
                  </div>
                </div>
                <div className="flex space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingTask(null);
                      setCurrentTaskDetails(null);
                      setActiveTab('details');
                    }}
                    className={`flex-1 px-4 py-3 border-2 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-lg transition-colors font-medium`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingTask}
                    className={`flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg transition-all shadow-lg font-medium ${isSavingTask
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:from-primary-700 hover:to-primary-800 hover:shadow-xl'
                      }`}
                  >
                    {isSavingTask
                      ? editingTask
                        ? 'Saving...'
                        : 'Creating...'
                      : editingTask
                        ? 'Update Task'
                        : 'Create Task'}
                  </button>
                </div>
              </form>
            )}

            {/* Subtasks Tab */}
            {editingTask && activeTab === 'subtasks' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <FiCheckSquare className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Subtasks
                  </h3>
                  {currentTaskDetails?.subtasks?.length > 0 && (
                    <span className={`px-2 py-1 rounded-full text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      {currentTaskDetails.subtasks.filter(s => s.completed).length} / {currentTaskDetails.subtasks.length} completed
                    </span>
                  )}
                </div>

                {/* Add subtask */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                    placeholder="Add a subtask..."
                    className={`flex-1 px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
                  />
                  <button
                    onClick={handleAddSubtask}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Subtasks list */}
                <div className="space-y-2">
                  {currentTaskDetails?.subtasks?.length > 0 ? (
                    currentTaskDetails.subtasks.map((subtask) => (
                      <div
                        key={subtask._id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
                      >
                        <button
                          onClick={() => handleToggleSubtask(subtask._id, subtask.completed)}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${subtask.completed
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : isDark ? 'border-gray-500' : 'border-gray-300'
                            }`}
                        >
                          {subtask.completed && <FiCheckCircle className="w-4 h-4" />}
                        </button>
                        <span
                          className={`flex-1 ${subtask.completed ? 'line-through opacity-60' : ''} ${isDark ? 'text-gray-300' : 'text-gray-900'
                            }`}
                        >
                          {subtask.title}
                        </span>
                        <button
                          onClick={() => handleDeleteSubtask(subtask._id)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      No subtasks yet. Add one above!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Time Tracking Tab */}
            {editingTask && activeTab === 'time' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <FiClock className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Time Tracking
                  </h3>
                </div>

                {/* Total time spent */}
                {currentTaskDetails?.timeSpent > 0 && (
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-primary-50'}`}>
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total Time Spent</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-primary-700'}`}>
                      {Math.floor(currentTaskDetails.timeSpent / 3600)}h {Math.floor((currentTaskDetails.timeSpent % 3600) / 60)}m
                    </p>
                  </div>
                )}

                {/* Timer controls */}
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  {isTimerRunning && timerActiveTask && timerActiveTask._id.toString() === editingTask.toString() ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {formatTime(timerElapsedTime)}
                        </div>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Timer running...</p>
                      </div>
                      <button
                        onClick={handleStopTimer}
                        className="w-auto px-2.5 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <FiSquare className="w-3.5 h-3.5" />
                        Stop Timer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartTimer}
                      className="w-auto px-2.5 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 mx-auto"
                    >
                      <FiPlay className="w-3.5 h-3.5" />
                      Start Timer
                    </button>
                  )}
                </div>

                {/* Manual time entry */}
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Log Time Manually</h4>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Hours</label>
                      <input
                        type="number"
                        min="0"
                        value={manualTimeHours}
                        onChange={(e) => setManualTimeHours(e.target.value)}
                        className={`w-full px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary-500`}
                      />
                    </div>
                    <div className="flex-1">
                      <label className={`block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Minutes</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={manualTimeMinutes}
                        onChange={(e) => setManualTimeMinutes(e.target.value)}
                        className={`w-full px-3 py-2 border ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary-500`}
                      />
                    </div>
                    <button
                      onClick={handleLogTime}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Log Time
                    </button>
                  </div>
                </div>

                {/* Time entries history */}
                {currentTaskDetails?.timeEntries?.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Time Entries</h4>
                      <button
                        onClick={handleResetTimeTracking}
                        className={`px-3 py-1 text-sm ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} transition-colors`}
                      >
                        Reset All
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {currentTaskDetails.timeEntries.map((entry, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'} flex justify-between items-center gap-3`}
                        >
                          <div className="flex-1">
                            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                              {new Date(entry.startTime).toLocaleString()}
                            </p>
                            {entry.description && (
                              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{entry.description}</p>
                            )}
                          </div>
                          <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {Math.floor(entry.duration / 3600)}h {Math.floor((entry.duration % 3600) / 60)}m
                          </span>
                          <button
                            onClick={() => handleDeleteTimeEntry(index)}
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete time entry"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Activity Log Tab */}
            {editingTask && activeTab === 'activity' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FiActivity className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Activity Log
                    </h3>
                  </div>
                  {activities.length > 0 && (
                    <button
                      onClick={handleClearActivities}
                      className={`px-3 py-1 text-sm ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} transition-colors`}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <div
                        key={activity._id}
                        className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'} border-l-4 ${activity.action === 'created' ? 'border-green-500' :
                          activity.action.includes('status') ? 'border-blue-500' :
                            activity.action.includes('assigned') ? 'border-purple-500' :
                              'border-gray-500'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {activity.description || activity.action}
                            </p>
                            {activity.user && (
                              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                by {activity.user.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(activity.createdAt).toLocaleString()}
                            </span>
                            <button
                              onClick={() => handleDeleteActivity(activity._id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete activity"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      No activity yet
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
