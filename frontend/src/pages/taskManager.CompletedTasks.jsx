import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { useTheme } from '../context/taskManager.ThemeContext';
import {
  FiCheckCircle, FiUser, FiCalendar, FiTag, FiSearch, FiFolder, FiDownload, FiDollarSign, FiClock, FiTrash2, FiPaperclip, FiX, FiEye, FiFile, FiImage, FiFileText
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
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);

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
              className={`rounded-xl shadow-md p-4 sm:p-6 border transition-all ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-100 hover:border-gray-200'}`}
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
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setShowAttachmentsModal(true);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${isDark ? 'bg-primary-900/30 text-primary-400 hover:bg-primary-900/50' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'}`}
                      >
                        <FiPaperclip className="w-3 h-3" />
                        {task.attachments.length} Attachment{task.attachments.length > 1 ? 's' : ''}
                      </button>
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

      {/* Attachments Modal */}
      {showAttachmentsModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden`}>
            <div className="p-4 sm:p-6 border-b flex items-center justify-between border-gray-700">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Attachments: {selectedTask.title}
              </h2>
              <button
                onClick={() => {
                  setShowAttachmentsModal(false);
                  setSelectedTask(null);
                }}
                className={`p-2 rounded-full transition-colors ${isDark ? 'bg-gray-700 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {selectedTask.attachments.map((attachment) => (
                <div key={attachment._id} className={`p-4 rounded-xl flex items-center justify-between gap-4 border ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
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
              ))}
            </div>
            
            <div className={`p-4 sm:p-6 border-t font-medium text-center ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
              Download or view full documents
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletedTasks;
