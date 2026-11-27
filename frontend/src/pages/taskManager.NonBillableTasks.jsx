import { useState, useEffect, useMemo } from 'react';
import api from '../utils/taskManager.api';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { useTheme } from '../context/taskManager.ThemeContext';
import {
  FiSlash,
  FiUser,
  FiSearch,
  FiFolder,
  FiDownload,
  FiTrash2,
  FiPaperclip,
  FiX,
  FiBriefcase,
  FiDollarSign,
} from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../components/taskManager.ConfirmationModal';

const NonBillableTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(() => localStorage.getItem('teamFilter') || '');
  const [selectedTask, setSelectedTask] = useState(null);
  const [billableModal, setBillableModal] = useState({ isOpen: false, task: null, amount: '' });
  const [isSubmittingBillable, setIsSubmittingBillable] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    onConfirm: null,
  });
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const { isDark } = useTheme();
  const { user } = useTaskManagerAuth();
  const isAdmin = ['admin', 'master', 'superadmin', 'super_admin'].includes(user?.role);

  useEffect(() => {
    fetchTeams();
  }, [user]);

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam]);

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
      const params = { nonBillable: 'true' };
      if (selectedTeam) params.team = selectedTeam;
      const response = await api.get('/tasks', { params });
      setTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching non-billable tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    if (!searchText.trim()) return tasks;
    const query = searchText.toLowerCase();
    return tasks.filter(
      (task) =>
        (task.title && task.title.toLowerCase().includes(query)) ||
        (task.subtitle && task.subtitle.toLowerCase().includes(query)) ||
        (task.description && task.description.toLowerCase().includes(query)) ||
        (task.client?.name && task.client.name.toLowerCase().includes(query)) ||
        (task.client?.companyName && task.client.companyName.toLowerCase().includes(query))
    );
  }, [tasks, searchText]);

  const handleOpenBillableModal = (task) => {
    if (!isAdmin) return;
    if (!task.client) {
      toast.error('Cannot generate challan: no client is linked to this task.');
      return;
    }
    setBillableModal({
      isOpen: true,
      task,
      amount: task.fixedAmount !== null && task.fixedAmount !== undefined ? String(task.fixedAmount) : '',
    });
  };

  const handleConfirmBillable = async (e) => {
    e.preventDefault();
    if (isSubmittingBillable || !billableModal.task) return;

    const rawAmount = billableModal.amount;
    if (rawAmount === '' || rawAmount === null || rawAmount === undefined) {
      toast.error('Please enter an amount');
      return;
    }
    const parsedAmount = Number(rawAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      toast.error('Please enter a valid non-negative amount');
      return;
    }

    try {
      setIsSubmittingBillable(true);
      const res = await api.patch(`/tasks/${billableModal.task._id}/mark-billable`, {
        amount: parsedAmount,
      });
      setTasks((prev) => prev.filter((t) => t._id !== billableModal.task._id));
      toast.success(res?.message || 'Challan generated and task moved to Completed Tasks');
      setBillableModal({ isOpen: false, task: null, amount: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate challan');
    } finally {
      setIsSubmittingBillable(false);
    }
  };

  const handleDeleteTask = (task) => {
    if (!isAdmin || actionLoadingId) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          setIsConfirmLoading(true);
          setActionLoadingId(task._id);
          await api.delete(`/tasks/${task._id}`);
          setTasks((prev) => prev.filter((t) => t._id !== task._id));
          if (selectedTask?._id === task._id) setSelectedTask(null);
          toast.success('Task deleted successfully');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          toast.error(err.response?.data?.message || err.message || 'Failed to delete task');
        } finally {
          setActionLoadingId(null);
          setIsConfirmLoading(false);
        }
      },
    });
  };

  const handleExportExcel = () => {
    if (filteredTasks.length === 0) return;
    const excelData = filteredTasks.map((task) => ({
      'Client Name': task.client?.name || task.client?.companyName || 'N/A',
      'Task Name': task.title || '',
      'Sub-title': task.subtitle || '',
      'Task Description': task.description || 'N/A',
      'Team': task.team?.name || 'Personal',
      'Assignee': task.assignedTo?.name || 'Unassigned',
      'Marked Non-Billable Date': task.nonBillableAt
        ? new Date(task.nonBillableAt).toLocaleDateString()
        : task.updatedAt
          ? new Date(task.updatedAt).toLocaleDateString()
          : 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Non-Billable Tasks');
    XLSX.writeFile(workbook, 'Non_Billable_Tasks_Export.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Non-Billable Tasks
          </h1>
          <p className={`mt-1 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Completed tasks marked as non-billable
          </p>
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
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search non-billable tasks or client..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
            />
          </div>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
          >
            <option value="">All Teams (Personal + Teams)</option>
            <option value="personal">Personal Tasks Only</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name}
              </option>
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
          <FiSlash className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
            No non-billable tasks found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task._id}
              onClick={() => setSelectedTask(task)}
              className={`rounded-xl shadow-md p-4 sm:p-6 border transition-all cursor-pointer ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-lg'}`}
            >
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    {task.subtitle && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {task.subtitle}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className={`text-sm mb-3 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {task.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {task.client && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${isDark ? 'bg-teal-900/40 text-teal-300' : 'bg-teal-100 text-teal-800'}`}>
                        <FiBriefcase className="w-3 h-3" />
                        {task.client.name || task.client.companyName || 'Client'}
                      </span>
                    )}
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
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>
                      <FiSlash className="w-3 h-3" />
                      Non-Billable
                    </span>
                    {task.attachments?.length > 0 && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${isDark ? 'bg-primary-900/30 text-primary-400' : 'bg-primary-100 text-primary-700'}`}>
                        <FiPaperclip className="w-3 h-3" />
                        {task.attachments.length} Attachment{task.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left sm:text-right flex flex-col items-start sm:items-end justify-between gap-2">
                  <div>
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mb-1`}>
                      Marked Non-Billable
                    </div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {new Date(task.nonBillableAt || task.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenBillableModal(task);
                        }}
                        disabled={actionLoadingId === task._id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                          isDark
                            ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700 hover:bg-emerald-900/50'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        }`}
                        title="Mark as Billable and generate challan"
                      >
                        <FiDollarSign className="w-3.5 h-3.5" />
                        <span>Mark Billable</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task);
                        }}
                        disabled={actionLoadingId === task._id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                          isDark
                            ? 'bg-red-900/30 text-red-300 border-red-800 hover:bg-red-900/50'
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        }`}
                        title="Delete Task"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-2xl max-w-lg w-full p-6 shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedTask.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            {selectedTask.subtitle && (
              <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {selectedTask.subtitle}
              </p>
            )}
            {selectedTask.description && (
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {selectedTask.description}
              </p>
            )}
            <div className={`space-y-2 text-sm border-t pt-4 ${isDark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
              <div>
                <span className="font-semibold">Client: </span>
                {selectedTask.client?.name || selectedTask.client?.companyName || 'N/A'}
              </div>
              <div>
                <span className="font-semibold">Team: </span>
                {selectedTask.team?.name || 'Personal'}
              </div>
              <div>
                <span className="font-semibold">Assignee: </span>
                {selectedTask.assignedTo?.name || 'Unassigned'}
              </div>
              <div>
                <span className="font-semibold">Marked Non-Billable: </span>
                {new Date(selectedTask.nonBillableAt || selectedTask.updatedAt).toLocaleString()}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className={`px-5 py-2 rounded-lg font-medium ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billable Amount Modal */}
      {billableModal.isOpen && billableModal.task && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-2xl max-w-md w-full p-6 shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Enter Challan Amount
              </h3>
              <button
                type="button"
                onClick={() => !isSubmittingBillable && setBillableModal({ isOpen: false, task: null, amount: '' })}
                className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <p className={`text-sm mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Task: <span className="font-semibold">{billableModal.task.title}</span>
              {billableModal.task.client && (
                <> — Client: <span className="font-semibold">{billableModal.task.client.name || billableModal.task.client.companyName}</span></>
              )}
            </p>
            <form onSubmit={handleConfirmBillable} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  autoFocus
                  value={billableModal.amount}
                  onChange={(e) => setBillableModal((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter challan amount"
                  disabled={isSubmittingBillable}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'}`}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingBillable}
                  onClick={() => setBillableModal({ isOpen: false, task: null, amount: '' })}
                  className={`flex-1 px-4 py-2 border rounded-lg font-medium ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBillable}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSubmittingBillable ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Generating Challan...</span>
                    </>
                  ) : (
                    <span>Generate Challan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        onClose={() => !isConfirmLoading && setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isLoading={isConfirmLoading}
      />
    </div>
  );
};

export default NonBillableTasks;
