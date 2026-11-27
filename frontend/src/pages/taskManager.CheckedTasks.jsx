import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { useTheme } from '../context/taskManager.ThemeContext';
import {
  FiCheckCircle,
  FiCheckSquare,
  FiUser,
  FiCalendar,
  FiTag,
  FiSearch,
  FiDownload,
  FiClock,
  FiX,
  FiBriefcase,
  FiFilter,
  FiAlertCircle,
  FiLayers,
  FiDollarSign,
  FiPrinter,
} from 'react-icons/fi';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import ChallanPreviewModal from '../components/taskManager.ChallanPreviewModal';

const CheckedTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [previewChallanTask, setPreviewChallanTask] = useState(null);

  const { isDark } = useTheme();
  const { user } = useTaskManagerAuth();
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState(() => {
    const teamFilter = localStorage.getItem('teamFilter') || '';
    return {
      team: teamFilter,
      client: searchParams.get('client') || '',
      priority: searchParams.get('priority') || '',
      status: searchParams.get('status') || '',
    };
  });

  const isAdmin = ['admin', 'master', 'superadmin', 'super_admin'].includes(user?.role);

  // Fetch initial reference data
  useEffect(() => {
    fetchTeams();
    fetchClients();
  }, [user]);

  // Fetch tasks when filters change
  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      const list = Array.isArray(response) ? response : (response?.data || []);
      setClients(list);
    } catch (error) {
      console.error('Error fetching clients in CheckedTasks:', error);
      setClients([]);
    }
  };

  // Combine clients from fetchClients and any clients attached to checked tasks
  const availableClients = useMemo(() => {
    const map = new Map();
    (clients || []).forEach((c) => {
      const id = (c?._id || c?.id || '').toString();
      if (id) {
        map.set(id, c);
      }
    });
    (tasks || []).forEach((t) => {
      const c = t.client;
      const id = (c?._id || c?.id || '').toString();
      if (id && !map.has(id)) {
        map.set(id, c);
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const nameA = a.name || a.companyName || '';
      const nameB = b.name || b.companyName || '';
      return nameA.localeCompare(nameB);
    });
  }, [clients, tasks]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = { checked: 'true' };
      if (filters.team) params.team = filters.team;
      if (filters.client) params.client = filters.client;
      if (filters.priority) params.priority = filters.priority;
      if (filters.status) params.status = filters.status;

      const response = await api.get('/tasks', { params });
      setTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching checked tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Client-side search filtering across title, subtitle, description, and client
  const filteredTasks = useMemo(() => {
    if (!searchText.trim()) return tasks;
    const query = searchText.toLowerCase();
    return tasks.filter((task) => {
      const titleMatch = task.title && task.title.toLowerCase().includes(query);
      const subtitleMatch = task.subtitle && task.subtitle.toLowerCase().includes(query);
      const descMatch = task.description && task.description.toLowerCase().includes(query);
      const clientMatch =
        (task.client?.name && task.client.name.toLowerCase().includes(query)) ||
        (task.client?.companyName && task.client.companyName.toLowerCase().includes(query));
      const assigneeMatch = task.assignedTo?.name && task.assignedTo.name.toLowerCase().includes(query);
      return titleMatch || subtitleMatch || descMatch || clientMatch || assigneeMatch;
    });
  }, [tasks, searchText]);

  const handleStatusChange = async (taskId, newStatus) => {
    const oldStatus = tasks.find((t) => t._id === taskId)?.status;
    // 1. Immediate optimistic update
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
    );
    if (selectedTask && selectedTask._id === taskId) {
      setSelectedTask((prev) => ({ ...prev, status: newStatus }));
    }

    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      if (res?.data) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, ...res.data } : t))
        );
      }
      toast.success(
        newStatus === 'done'
          ? 'Marked as Done & Challan auto-generated!'
          : `Status updated to ${newStatus.replace('-', ' ')}`
      );
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err.response?.data?.message || 'Failed to update task status');
      // Rollback on error
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: oldStatus } : t))
      );
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask((prev) => ({ ...prev, status: oldStatus }));
      }
    }
  };

  // Uncheck a task (Admin action)
  const handleToggleUncheck = async (task) => {
    if (!isAdmin) {
      alert('Only admins can uncheck tasks');
      return;
    }

    const confirmUncheck = window.confirm(
      `Uncheck "${task.title}"?\nThis task will be moved back to the regular tasks page.`
    );
    if (!confirmUncheck) return;

    try {
      setTogglingId(task._id);
      // Optimistic update
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      await api.patch(`/tasks/${task._id}/toggle-checked`);
      alert(`"${task.title}" has been unchecked and returned to regular tasks.`);
    } catch (error) {
      console.error('Error unchecking task:', error);
      alert(error.response?.data?.message || 'Failed to uncheck task');
      fetchTasks();
    } finally {
      setTogglingId(null);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (filteredTasks.length === 0) {
      alert('No checked tasks to export');
      return;
    }

    const excelData = filteredTasks.map((task) => {
      const totalSeconds = task.timeSpent || 0;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      return {
        'Client Name': task.client?.name || task.client?.companyName || 'N/A',
        'Task Title': task.title || '',
        'Sub-Title': task.subtitle || '',
        'Description': task.description || '',
        'Team': task.team?.name || 'Personal',
        'Assignee': task.assignedTo?.name || 'Unassigned',
        'Status': task.status || '',
        'Priority': task.priority || '',
        'Checked Date': task.checkedAt ? new Date(task.checkedAt).toLocaleDateString() : 'N/A',
        'Checked By': task.checkedBy?.name || 'Admin',
        'Due Date': task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A',
        'Time Spent': `${hours}h ${minutes}m`,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Checked Tasks');
    XLSX.writeFile(workbook, `Checked_Tasks_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getPriorityBadgeClass = (priority) => {
    if (isDark) {
      switch (priority) {
        case 'urgent':
          return 'bg-red-950/60 text-red-300 border-red-800';
        case 'high':
          return 'bg-orange-950/60 text-orange-300 border-orange-800';
        case 'medium':
          return 'bg-amber-950/60 text-amber-300 border-amber-800';
        default:
          return 'bg-gray-800 text-gray-300 border-gray-700';
      }
    }
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeClass = (status) => {
    if (isDark) {
      switch (status) {
        case 'done':
          return 'bg-emerald-950/60 text-emerald-300 border-emerald-800';
        case 'in-progress':
          return 'bg-blue-950/60 text-blue-300 border-blue-800';
        case 'in-review':
          return 'bg-purple-950/60 text-purple-300 border-purple-800';
        case 'client-pending':
          return 'bg-orange-950/60 text-orange-300 border-orange-800';
        default:
          return 'bg-gray-800 text-gray-300 border-gray-700';
      }
    }
    switch (status) {
      case 'done':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in-progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in-review':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'client-pending':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatTimeSpent = (seconds = 0) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const clearAllFilters = () => {
    setSearchText('');
    setFilters({
      team: '',
      client: '',
      priority: '',
      status: '',
    });
  };

  const hasActiveFilters =
    searchText ||
    filters.team ||
    filters.client ||
    filters.priority ||
    filters.status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Checked Tasks
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                isDark
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}
            >
              {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          <p className={`mt-1 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Tasks verified and marked as checked by Admin
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-sm border font-medium ${
              isDark
                ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            title="Export filtered checked tasks to Excel"
          >
            <FiDownload className="w-4 h-4 text-emerald-600" />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`rounded-xl shadow-md border p-4 space-y-3 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        }`}
      >
        {/* Search */}
        <div className="relative">
          <FiSearch
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              isDark ? 'text-gray-400' : 'text-gray-400'
            }`}
          />
          <input
            type="text"
            placeholder="Search by title, sub-title, description, client, or assignee..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 transition-colors text-sm ${
              isDark
                ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                : 'border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        {/* Filters Row: Team, Client, Priority, Status */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Team Filter */}
          <select
            value={filters.team}
            onChange={(e) => setFilters({ ...filters, team: e.target.value })}
            className={`px-3 py-1.5 text-xs sm:text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 transition-colors ${
              isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 text-gray-800 bg-white'
            }`}
          >
            <option value="">All Teams (Personal + Teams)</option>
            <option value="personal">Personal Tasks Only</option>
            {teams.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Client Filter */}
          <select
            value={filters.client}
            onChange={(e) => setFilters({ ...filters, client: e.target.value })}
            className={`px-3 py-1.5 text-xs sm:text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 transition-colors ${
              isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 text-gray-800 bg-white'
            }`}
          >
            <option value="">All Clients</option>
            {availableClients.map((c) => (
              <option key={c._id || c.id} value={c._id || c.id}>
                {c.name || c.companyName || 'Unnamed Client'}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className={`px-3 py-1.5 text-xs sm:text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 transition-colors ${
              isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 text-gray-800 bg-white'
            }`}
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className={`px-3 py-1.5 text-xs sm:text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 transition-colors ${
              isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 text-gray-800 bg-white'
            }`}
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="in-review">In Review</option>
            <option value="client-pending">Client Pending</option>
            <option value="done">Done</option>
          </select>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end pt-1">
            <button
              onClick={clearAllFilters}
              className={`text-xs inline-flex items-center gap-1 font-medium hover:underline ${
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            >
              <FiX className="w-3.5 h-3.5" />
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div
          className={`rounded-xl shadow-md border p-12 text-center ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}
        >
          <FiCheckCircle
            className={`w-16 h-16 mx-auto mb-4 ${
              isDark ? 'text-gray-600' : 'text-gray-300'
            }`}
          />
          <p className={`text-lg font-semibold mb-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            No checked tasks found
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            When an admin checks tasks from the Tasks board, they will be listed here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task._id}
              className={`rounded-xl shadow-md hover:shadow-lg transition-all p-4 sm:p-5 border ${
                isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  {/* Title & Subtitle */}
                  <div className="flex items-start sm:items-center gap-2 mb-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setShowDetailModal(true);
                      }}
                      className={`text-base sm:text-lg font-semibold hover:text-emerald-600 transition-colors text-left ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {task.title}
                    </button>
                    {task.subtitle && (
                      <span
                        className={`text-xs font-normal px-2 py-0.5 rounded border inline-block ${
                          isDark
                            ? 'bg-gray-700 text-gray-300 border-gray-600'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {task.subtitle}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p
                      className={`text-xs sm:text-sm line-clamp-2 mb-3 ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      {task.description}
                    </p>
                  )}

                  {/* Badges / Meta */}
                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    {/* Status Select (Editable & Dynamic) */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                        className={`px-3 py-1 rounded-full font-semibold border text-xs cursor-pointer capitalize transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm ${getStatusBadgeClass(
                          task.status
                        )}`}
                        title="Click to change status"
                      >
                        <option value="todo" className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200">To Do</option>
                        <option value="in-progress" className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200">In Progress</option>
                        <option value="in-review" className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200">In Review</option>
                        <option value="client-pending" className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200">Client Pending</option>
                        <option value="done" className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200">Done</option>
                      </select>
                    </div>

                    {/* Priority Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium border capitalize ${getPriorityBadgeClass(
                        task.priority
                      )}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          task.priority === 'urgent'
                            ? 'bg-red-500'
                            : task.priority === 'high'
                            ? 'bg-orange-500'
                            : task.priority === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      {task.priority}
                    </span>

                    {/* Client Badge */}
                    {task.client && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium border ${
                          isDark
                            ? 'bg-teal-950/40 text-teal-300 border-teal-800'
                            : 'bg-teal-50 text-teal-700 border-teal-200'
                        }`}
                      >
                        <FiBriefcase className="w-3 h-3" />
                        {task.client.name || task.client.companyName}
                      </span>
                    )}

                    {/* Team Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium border ${
                        isDark
                          ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      <FiLayers className="w-3 h-3" />
                      {task.team?.name || 'Personal'}
                    </span>

                    {/* Assignee */}
                    {task.assignedTo && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                          isDark ? 'text-gray-300' : 'text-gray-600'
                        }`}
                      >
                        <FiUser className="w-3 h-3" />
                        {task.assignedTo.name || 'Unassigned'}
                      </span>
                    )}

                    {/* Time Spent */}
                    {task.timeSpent > 0 && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        <FiClock className="w-3 h-3" />
                        {formatTimeSpent(task.timeSpent)}
                      </span>
                    )}

                    {/* Billable Badge */}
                    {task.isBillable && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium border ${
                          isDark
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <FiDollarSign className="w-3 h-3" />
                        Billable{task.fixedAmount !== null && task.fixedAmount !== undefined ? ` (₹${task.fixedAmount})` : ''}
                      </span>
                    )}

                    {/* Checked By / At info */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium border ${
                        isDark
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                      title={
                        task.checkedAt ? `Checked on ${new Date(task.checkedAt).toLocaleString()}` : ''
                      }
                    >
                      <FiCheckCircle className="w-3 h-3 text-emerald-600" />
                      Checked {task.checkedAt ? new Date(task.checkedAt).toLocaleDateString() : ''}
                      {task.checkedBy?.name ? ` by ${task.checkedBy.name}` : ''}
                    </span>
                  </div>
                </div>

                {/* Action buttons (Right side) */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  {isAdmin && task.isBillable && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewChallanTask(task);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        isDark
                          ? 'bg-primary-900/30 text-primary-300 border-primary-700 hover:bg-primary-900/50'
                          : 'bg-primary-50 text-primary-700 border-primary-300 hover:bg-primary-100'
                      }`}
                      title="Preview / Print Challan"
                    >
                      <FiPrinter className="w-4 h-4" />
                      <span>Challan</span>
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleToggleUncheck(task)}
                      disabled={togglingId === task._id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        isDark
                          ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700 hover:bg-red-950/40 hover:text-red-300 hover:border-red-700'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                      }`}
                      title="Click to uncheck this task (moves it back to regular tasks)"
                    >
                      <FiCheckSquare className="w-4 h-4 text-emerald-600" />
                      <span>Checked</span>
                      <span className="text-[10px] opacity-75 font-normal ml-0.5">(Uncheck)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowDetailModal(true);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Detail Modal */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-2xl rounded-2xl shadow-2xl border p-6 my-8 max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100 text-gray-900'
            }`}
          >
            <div className="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-700 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-xl font-bold">{selectedTask.title}</h2>
                  {selectedTask.subtitle && (
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded border font-medium ${
                        isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300'
                      }`}
                    >
                      {selectedTask.subtitle}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Created {new Date(selectedTask.createdAt).toLocaleDateString()}</span>
                  {selectedTask.createdBy?.name && <span>by {selectedTask.createdBy.name}</span>}
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Checked Status Banner */}
            <div
              className={`p-3 rounded-xl border mb-4 flex items-center justify-between gap-3 ${
                isDark ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <FiCheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <span className="font-semibold">Checked by Admin</span>
                  {selectedTask.checkedAt && (
                    <span className="text-xs ml-2 opacity-80">
                      ({new Date(selectedTask.checkedAt).toLocaleString()})
                    </span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    handleToggleUncheck(selectedTask);
                    setShowDetailModal(false);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    isDark
                      ? 'bg-red-950/60 text-red-300 border-red-700 hover:bg-red-900/60'
                      : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
                  }`}
                >
                  Uncheck Task
                </button>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm">
              <div
                className={`p-3 rounded-lg border ${
                  isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Status</span>
                <select
                  value={selectedTask.status}
                  onChange={(e) => handleStatusChange(selectedTask._id, e.target.value)}
                  className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer capitalize transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm ${getStatusBadgeClass(
                    selectedTask.status
                  )}`}
                  title="Click to change status"
                >
                  <option value="todo" className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200">To Do</option>
                  <option value="in-progress" className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200">In Progress</option>
                  <option value="in-review" className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200">In Review</option>
                  <option value="client-pending" className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200">Client Pending</option>
                  <option value="done" className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200">Done</option>
                </select>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Priority</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getPriorityBadgeClass(
                    selectedTask.priority
                  )}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedTask.priority === 'urgent'
                        ? 'bg-red-500'
                        : selectedTask.priority === 'high'
                        ? 'bg-orange-500'
                        : selectedTask.priority === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  {selectedTask.priority}
                </span>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Client</span>
                <span className="font-medium">
                  {selectedTask.client?.name || selectedTask.client?.companyName || 'None'}
                </span>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Team</span>
                <span className="font-medium">{selectedTask.team?.name || 'Personal'}</span>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Assignee</span>
                <span className="font-medium">{selectedTask.assignedTo?.name || 'Unassigned'}</span>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Time Spent</span>
                <span className="font-medium">{formatTimeSpent(selectedTask.timeSpent)}</span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Description
              </h3>
              <div
                className={`p-3 rounded-lg border text-sm whitespace-pre-wrap ${
                  isDark ? 'bg-gray-700/30 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'
                }`}
              >
                {selectedTask.description || 'No description provided.'}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <ChallanPreviewModal
        isOpen={!!previewChallanTask}
        onClose={() => setPreviewChallanTask(null)}
        task={previewChallanTask}
      />
    </div>
  );
};

export default CheckedTasks;
