import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { useTheme } from '../context/taskManager.ThemeContext';
import {
  FiCheckCircle, FiUser, FiCalendar, FiTag, FiSearch, FiFolder, FiDownload, FiDollarSign, FiClock, FiTrash2, FiPaperclip, FiX, FiEye, FiFile, FiImage, FiFileText, FiActivity, FiCheckSquare, FiPlus, FiEdit2
} from 'react-icons/fi';
import * as XLSX from 'xlsx';

const CompletedTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const { isDark } = useTheme();
  const { user } = useTaskManagerAuth();
  const [searchParams] = useSearchParams();
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [currentTaskDetails, setCurrentTaskDetails] = useState(null);
  const [activities, setActivities] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    team: '',
    assignedTo: '',
    status: 'done',
    priority: 'medium',
    dueDate: '',
    tags: '',
    isBillable: false,
  });

  const [filters, setFilters] = useState(() => {
    const teamFilter = localStorage.getItem('teamFilter') || '';
    return {
      team: teamFilter,
      assignedTo: searchParams.get('assignedTo') || '',
    };
  });

  useEffect(() => {
    fetchTeams();
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [filters, teams.length]);

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
      const params = { status: 'done' };
      if (filters.team) params.team = filters.team;
      
      // Admin/Owner can see all, regular members see their own
      const isGlobalAdmin = user?.role === 'admin';
      const filteredTeam = teams.find(t => t._id === filters.team);
      const memberInFilteredTeam = filteredTeam?.members?.find(m => (m.user?._id || m.user) === user?._id || (m.user?._id || m.user) === user?.id);
      const isTeamAdminOrOwner = ['admin', 'owner'].includes(memberInFilteredTeam?.role);
      
      const canSeeAll = isGlobalAdmin || isTeamAdminOrOwner || (!filters.team && user?.role === 'admin');

      if (!canSeeAll || filters.assignedTo === 'me') {
        params.assignedTo = user?._id || user?.id;
      } else if (filters.assignedTo && filters.assignedTo !== 'me') {
        params.assignedTo = filters.assignedTo;
      }

      const response = await api.get('/tasks', { params });
      setTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching completed tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTask = async (task) => {
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
    setShowDetailModal(true);

    // Fetch full task details
    try {
      const response = await api.get(`/tasks/${task._id}`);
      setCurrentTaskDetails(response.data);
      fetchActivities(task._id);
    } catch (error) {
      console.error('Error fetching task details:', error);
      setCurrentTaskDetails(task);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      fetchTasks();
      if (newStatus !== 'done') {
        setShowDetailModal(false);
        setEditingTask(null);
        setCurrentTaskDetails(null);
        alert('Task has been moved to active tasks.');
      } else {
        setNewTask({ ...newTask, status: newStatus });
      }
    } catch (error) {
      alert(error.message || 'Failed to update task');
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

  const filteredTasks = useMemo(() => {
    if (!searchText.trim()) return tasks;
    const query = searchText.toLowerCase();
    return tasks.filter(task =>
      (task.title && task.title.toLowerCase().includes(query)) ||
      (task.description && task.description.toLowerCase().includes(query))
    );
  }, [tasks, searchText]);

  const getFileIcon = (fileType) => {
    if (fileType?.includes('image')) return <FiImage className="w-5 h-5 text-blue-500" />;
    if (fileType?.includes('pdf')) return <FiFileText className="w-5 h-5 text-red-500" />;
    if (fileType?.includes('word')) return <FiFile className="w-5 h-5 text-blue-600" />;
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return <FiFile className="w-5 h-5 text-green-600" />;
    return <FiFile className="w-5 h-5 text-gray-500" />;
  };

  const handleExportExcel = () => {
    if (tasks.length === 0) return;
    const excelData = tasks.map(task => ({
      'Task Name': task.title || '',
      'Team': task.team?.name || 'Personal',
      'Assignee': task.assignedTo?.name || 'Unassigned',
      'Completed Date': task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : 'N/A',
      'Priority': task.priority || '',
      'Billable': task.isBillable ? 'Yes' : 'No',
      'Time Spent': task.timeSpent ? `${task.timeSpent.hours}h ${task.timeSpent.minutes}m` : '0h 0m',
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Completed Tasks");
    XLSX.writeFile(workbook, "Completed_Tasks_Export.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Completed Tasks</h1>
          <p className={`mt-1 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>History of all finished work</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow border font-medium ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <FiDownload className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className={`rounded-xl shadow-md border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search completed tasks..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
            />
          </div>
          <select
            value={filters.team}
            onChange={(e) => setFilters({ ...filters, team: e.target.value })}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
          >
            <option value="">All Teams (Personal + Teams)</option>
            <option value="personal">Personal Tasks Only</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id}>{team.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className={`rounded-xl shadow-md border p-12 text-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <FiCheckCircle className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>No completed tasks found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task._id}
              onClick={() => handleViewTask(task)}
              className={`rounded-xl shadow-md p-4 sm:p-6 border transition-all cursor-pointer ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-lg'}`}
            >
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</h3>
                  {task.description && (
                    <p className={`text-sm mb-3 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {task.team && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        <FiFolder className="w-3 h-3" />
                        {task.team.name}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                      <FiUser className="w-3 h-3" />
                      {task.assignedTo?.name || 'Unassigned'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                      <FiCheckCircle className="w-3 h-3" />
                      Completed
                    </span>
                    {task.attachments?.length > 0 && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${isDark ? 'bg-primary-900/30 text-primary-400' : 'bg-primary-100 text-primary-700'}`}
                      >
                        <FiPaperclip className="w-3 h-3" />
                        {task.attachments.length} Attachment{task.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mb-1`}>Completed on</div>
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {new Date(task.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl sm:rounded-2xl max-w-4xl w-full p-4 sm:p-6 my-4 sm:my-8 shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Task Details: {newTask.title}
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setEditingTask(null);
                  setCurrentTaskDetails(null);
                  setActiveTab('details');
                  setActivities([]);
                }}
                className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className={`flex gap-1 sm:gap-2 mb-3 sm:mb-4 border-b overflow-x-auto ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              {['details', 'subtasks', 'attachments', 'activity'].map((tab) => (
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
                  {tab === 'attachments' && (
                    <span className="flex items-center gap-1 sm:gap-2">
                      <FiPaperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Attachments</span>
                      <span className="sm:hidden">Docs</span>
                      {currentTaskDetails?.attachments?.length > 0 && (
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                          {currentTaskDetails.attachments.length}
                        </span>
                      )}
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

            {activeTab === 'details' && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Title</h4>
                      <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{newTask.title}</p>
                    </div>
                    <div>
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Description</h4>
                      <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {newTask.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Status</h4>
                      <select
                        value={newTask.status}
                        onChange={(e) => handleStatusChange(editingTask, e.target.value)}
                        className={`px-3 py-1 text-xs font-medium rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${getStatusColor(newTask.status)}`}
                        style={{ appearance: 'none', paddingRight: '1rem' }}
                      >
                        <option value="todo" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">To Do</option>
                        <option value="in-progress" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">In Progress</option>
                        <option value="in-review" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">In Review</option>
                        <option value="done" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">Done</option>
                      </select>
                    </div>
                    <div>
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Priority</h4>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full inline-block ${getPriorityColor(newTask.priority)}`}>
                        {newTask.priority}
                      </span>
                    </div>
                    <div>
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Team</h4>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {currentTaskDetails?.team?.name || 'Personal'}
                      </p>
                    </div>
                    <div>
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Assignee</h4>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {currentTaskDetails?.assignedTo?.name || 'Unassigned'}
                      </p>
                    </div>
                    <div>
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Completed Date</h4>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {currentTaskDetails?.updatedAt ? new Date(currentTaskDetails.updatedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Time Spent</h4>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {currentTaskDetails?.timeSpent 
                          ? `${Math.floor(currentTaskDetails.timeSpent / 3600)}h ${Math.floor((currentTaskDetails.timeSpent % 3600) / 60)}m` 
                          : '0h 0m'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {newTask.tags && (
                  <div>
                    <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {newTask.tags.split(',').map((tag, i) => (
                        <span key={i} className={`px-2 py-1 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'subtasks' && (
              <div className="py-4 space-y-4">
                {currentTaskDetails?.subtasks?.length > 0 ? (
                  <div className="space-y-2">
                    {currentTaskDetails.subtasks.map((subtask) => (
                      <div
                        key={subtask._id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <FiCheckCircle className={`w-5 h-5 ${subtask.completed ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className={`text-sm ${subtask.completed ? 'line-through text-gray-500' : isDark ? 'text-white' : 'text-gray-900'}`}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FiCheckSquare className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-700' : 'text-gray-200'}`} />
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No subtasks found.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="py-4 space-y-3">
                {currentTaskDetails?.attachments?.length > 0 ? (
                  currentTaskDetails.attachments.map((attachment) => (
                    <div key={attachment._id} className={`p-4 rounded-xl flex items-center justify-between gap-4 border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
                          {getFileIcon(attachment.fileType)}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`} title={attachment.name}>
                            {attachment.name}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {(attachment.fileSize / (1024 * 1024)).toFixed(2)} MB • {new Date(attachment.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-2 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-all ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                          title="View"
                        >
                          <FiEye className="w-5 h-5" />
                        </a>
                        <a
                          href={attachment.url.includes('cloudinary.com') ? attachment.url.replace('/upload/', '/upload/fl_attachment/') : attachment.url}
                          download={attachment.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-2 rounded-lg hover:bg-green-50 hover:text-green-600 transition-all ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                          title="Download"
                        >
                          <FiDownload className="w-5 h-5" />
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <FiPaperclip className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-700' : 'text-gray-200'}`} />
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No attachments found.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="py-4 space-y-4">
                {activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity._id} className="flex gap-3">
                        <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                          <FiActivity className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {activity.description || activity.action}
                          </p>
                          {activity.user && (
                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              by {activity.user.name} • {new Date(activity.createdAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FiActivity className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-700' : 'text-gray-200'}`} />
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No activity logged for this task.</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setEditingTask(null);
                  setCurrentTaskDetails(null);
                }}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletedTasks;
