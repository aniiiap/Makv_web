import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTheme } from '../context/taskManager.ThemeContext';
import { toast } from 'react-hot-toast';
import {
    FiArrowLeft, FiCheckSquare, FiUser, FiMail, FiPhone, FiBriefcase,
    FiMapPin, FiClock, FiPlus, FiEdit2, FiActivity, FiFileText
} from 'react-icons/fi';

const ClientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();

    const [client, setClient] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [pendingTasks, setPendingTasks] = useState(0);
    const [timeSummary, setTimeSummary] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // New task form
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        assignedTo: '',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
        isBillable: false,
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchClientData();
        fetchAllUsers();
    }, [id]);

    const fetchClientData = async () => {
        try {
            setLoading(true);
            const [detailRes, timeRes] = await Promise.all([
                api.get(`/clients/${id}`),
                api.get(`/clients/${id}/time-summary`),
            ]);
            setClient(detailRes.client);
            setTasks(detailRes.tasks || []);
            setPendingTasks(detailRes.pendingTasks || 0);
            setTimeSummary(Array.isArray(timeRes) ? timeRes : []);
        } catch (error) {
            console.error('Error fetching client:', error);
            toast.error('Failed to load client details');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await api.get('/clients/users');
            setAllUsers(Array.isArray(res) ? res : []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds === 0) return '0h 0m';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hrs}h ${mins}m`;
    };

    const grandTotal = timeSummary.reduce((sum, e) => sum + (e.totalSeconds || 0), 0);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (isSaving || !newTask.title.trim()) return;
        try {
            setIsSaving(true);
            const taskData = {
                ...newTask,
                client: id,
            };
            await api.post('/tasks', taskData);
            toast.success('Task created successfully!');
            setShowCreateTask(false);
            setNewTask({ title: '', description: '', assignedTo: '', status: 'todo', priority: 'medium', dueDate: '', isBillable: false });
            fetchClientData();
        } catch (error) {
            console.error('Failed to create task:', error);
            toast.error(error?.message || 'Failed to create task');
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save task and redirect to Bill Generator (same flow as Tasks page)
    const autoSaveTaskAndRedirectToBill = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        if (!newTask.title.trim()) {
            toast.error('Please enter at least a Task Title before generating a bill.');
            return;
        }
        try {
            setIsSaving(true);
            const taskData = {
                ...newTask,
                client: id,
                isBillable: false, // Backend marks it true upon bill generation
            };
            const response = await api.post('/tasks', taskData);
            setShowCreateTask(false);
            setNewTask({ title: '', description: '', assignedTo: '', status: 'todo', priority: 'medium', dueDate: '', isBillable: false });
            fetchClientData();
            // response is already unwrapped by interceptor
            const newTaskId = response?.data?._id || response?._id;
            if (newTaskId) {
                navigate(`/taskflow/bills/create?taskId=${newTaskId}`);
            } else {
                toast.error('Task created but could not redirect to bill generator');
            }
        } catch (error) {
            toast.error(error?.message || 'Failed to auto-save task');
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusColor = (status) => {
        if (isDark) {
            const colors = { todo: 'bg-gray-700 text-gray-200', 'in-progress': 'bg-blue-900 text-blue-200', 'in-review': 'bg-purple-900 text-purple-200', done: 'bg-green-900 text-green-200' };
            return colors[status] || colors.todo;
        }
        const colors = { todo: 'bg-gray-100 text-gray-800', 'in-progress': 'bg-blue-100 text-blue-800', 'in-review': 'bg-purple-100 text-purple-800', done: 'bg-green-100 text-green-800' };
        return colors[status] || colors.todo;
    };

    const getPriorityColor = (priority) => {
        if (isDark) {
            const colors = { low: 'bg-gray-700 text-gray-200', medium: 'bg-yellow-900 text-yellow-200', high: 'bg-orange-900 text-orange-200', urgent: 'bg-red-900 text-red-200' };
            return colors[priority] || colors.medium;
        }
        const colors = { low: 'bg-gray-100 text-gray-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-orange-100 text-orange-800', urgent: 'bg-red-100 text-red-800' };
        return colors[priority] || colors.medium;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="text-center py-12">
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Client not found</p>
                <button onClick={() => navigate('/taskflow/clients')} className="mt-4 text-primary-600 hover:underline">
                    ← Back to Clients
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FiActivity },
        { id: 'profile', label: 'Profile', icon: FiUser },
        { id: 'tasks', label: 'Tasks', icon: FiCheckSquare },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/taskflow/clients')}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                    <FiArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${isDark ? 'bg-primary-900 text-primary-300' : 'bg-primary-100 text-primary-700'}`}>
                        {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {client.name}
                        </h1>
                        {client.companyName && (
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{client.companyName}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={`flex gap-1 rounded-xl p-1 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? isDark ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm'
                            : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ========= OVERVIEW TAB ========= */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className={`rounded-xl shadow-md border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
                                    <FiCheckSquare className={`w-6 h-6 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                                </div>
                                <div>
                                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{pendingTasks}</p>
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pending Tasks</p>
                                </div>
                            </div>
                        </div>
                        <div className={`rounded-xl shadow-md border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                                    <FiCheckSquare className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                </div>
                                <div>
                                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{tasks.length}</p>
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Tasks</p>
                                </div>
                            </div>
                        </div>
                        <div className={`rounded-xl shadow-md border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}>
                                    <FiClock className={`w-6 h-6 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} />
                                </div>
                                <div>
                                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {formatDuration(grandTotal)}
                                    </p>
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Time Tracked</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Per-User Time Breakdown */}
                        <div className={`rounded-xl shadow-md border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                            <h3 className={`text-base font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <FiClock className="w-4 h-4" /> Time by User
                            </h3>
                            {timeSummary.length === 0 ? (
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No time tracked yet. Start a timer on a task to see time here.</p>
                            ) : (
                                <div className="space-y-3">
                                    {timeSummary.map((entry, idx) => (
                                        <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-primary-900 text-primary-300' : 'bg-primary-100 text-primary-700'}`}>
                                                    {(entry.user?.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{entry.user?.name}</p>
                                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{entry.entryCount} entries</p>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-semibold ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
                                                {formatDuration(entry.totalSeconds)}
                                            </span>
                                        </div>
                                    ))}
                                    {/* Grand Total */}
                                    <div className={`flex items-center justify-between p-3 rounded-lg border-t-2 mt-2 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Grand Total</span>
                                        <span className={`text-base font-bold ${isDark ? 'text-primary-300' : 'text-primary-700'}`}>
                                            {formatDuration(grandTotal)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Per-Task Time Breakdown */}
                        <div className={`rounded-xl shadow-md border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                            <h3 className={`text-base font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <FiActivity className="w-4 h-4" /> Time by Task
                            </h3>
                            {tasks.filter(t => t.timeSpent > 0).length === 0 ? (
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No time tracked on tasks yet</p>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {tasks.filter(t => t.timeSpent > 0).map((task) => (
                                        <div key={task._id} className={`p-3 rounded-lg ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <p className={`text-sm font-medium truncate flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</p>
                                                <span className={`text-sm font-semibold ml-2 flex-shrink-0 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
                                                    {formatDuration(task.timeSpent)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                {task.assignedTo && (
                                                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {task.assignedTo.name}
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(task.status)}`}>
                                                    {task.status?.replace('-', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Tasks */}
                    <div className={`rounded-xl shadow-md border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Tasks</h3>
                            <button onClick={() => setShowCreateTask(true)} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
                                <FiPlus className="w-4 h-4" /> Add Task
                            </button>
                        </div>
                        {tasks.length === 0 ? (
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No tasks yet</p>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {tasks.slice(0, 10).map((task) => (
                                    <div key={task._id} className={`flex items-start justify-between p-3 rounded-lg border ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</p>
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(task.status)}`}>{task.status?.replace('-', ' ')}</span>
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                                                {task.assignedTo && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>→ {task.assignedTo.name}</span>}
                                                {task.timeSpent > 0 && (
                                                    <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
                                                        <FiClock className="w-3 h-3" /> {formatDuration(task.timeSpent)}
                                                    </span>
                                                )}
                                                {task.isBillable && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>Billable</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========= PROFILE TAB ========= */}
            {activeTab === 'profile' && (
                <div className={`rounded-xl shadow-md border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h3 className={`text-lg font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Client Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { icon: FiUser, label: 'Name', value: client.name },
                            { icon: FiBriefcase, label: 'Company', value: client.companyName },
                            { icon: FiMail, label: 'Email', value: client.email },
                            { icon: FiPhone, label: 'Phone', value: client.phone },
                            { icon: FiFileText, label: 'PAN', value: client.pan },
                            { icon: FiFileText, label: 'GSTIN', value: client.gstin },
                            { icon: FiFileText, label: 'Aadhar', value: client.aadhar },
                            { icon: FiMapPin, label: 'Address', value: [client.address, client.city, client.state, client.pincode].filter(Boolean).join(', ') },
                        ].map((item, idx) => (
                            <div key={idx} className={`flex items-start gap-3 p-4 rounded-lg ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                                <item.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                <div>
                                    <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
                                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.value || '—'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ========= TASKS TAB ========= */}
            {activeTab === 'tasks' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            All Tasks ({tasks.length})
                        </h3>
                        <button
                            onClick={() => setShowCreateTask(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg font-medium"
                        >
                            <FiPlus className="w-4 h-4" /> New Task
                        </button>
                    </div>

                    {/* Time Summary Table */}
                    {timeSummary.length > 0 && (
                        <div className={`rounded-xl shadow-md border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                            <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                <FiClock className="w-4 h-4" /> User Time Summary
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                            <th className={`text-left py-2 px-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>User</th>
                                            <th className={`text-right py-2 px-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Time</th>
                                            <th className={`text-right py-2 px-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Entries</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                        {timeSummary.map((entry, idx) => (
                                            <tr key={idx}>
                                                <td className={`py-2 px-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{entry.user?.name}</td>
                                                <td className={`py-2 px-3 text-right font-medium ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{formatDuration(entry.totalSeconds)}</td>
                                                <td className={`py-2 px-3 text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{entry.entryCount}</td>
                                            </tr>
                                        ))}
                                        <tr className={`border-t-2 ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                                            <td className={`py-2 px-3 font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Grand Total</td>
                                            <td className={`py-2 px-3 text-right font-bold ${isDark ? 'text-primary-300' : 'text-primary-700'}`}>{formatDuration(grandTotal)}</td>
                                            <td className={`py-2 px-3 text-right font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{timeSummary.reduce((sum, e) => sum + e.entryCount, 0)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tasks List */}
                    {tasks.length === 0 ? (
                        <div className={`rounded-xl shadow-md border p-8 text-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                            <FiCheckSquare className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No tasks for this client yet</p>
                            <button onClick={() => setShowCreateTask(true)} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                                + Create first task
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map((task) => (
                                <div
                                    key={task._id}
                                    className={`rounded-xl shadow-md border p-4 transition-all hover:shadow-lg ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</p>
                                            {task.description && (
                                                <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{task.description}</p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                                <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${getStatusColor(task.status)}`}>
                                                    {task.status?.replace('-', ' ')}
                                                </span>
                                                <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                                {task.isBillable && (
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                                                        Billable
                                                    </span>
                                                )}
                                                {task.assignedTo && (
                                                    <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        <FiUser className="w-3 h-3" /> {task.assignedTo.name}
                                                    </span>
                                                )}
                                                {task.dueDate && (
                                                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        Due: {new Date(task.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {task.timeSpent > 0 && (
                                                    <span className={`flex items-center gap-1 text-xs font-medium ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
                                                        <FiClock className="w-3 h-3" /> {formatDuration(task.timeSpent)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ========= CREATE TASK MODAL ========= */}
            {showCreateTask && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowCreateTask(false)}>
                    <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`} onClick={(e) => e.stopPropagation()}>
                        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Create Task for {client.name}
                        </h3>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Title *</label>
                                <input
                                    type="text"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                                    required
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    rows={3}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Assign To</label>
                                    <select
                                        value={newTask.assignedTo}
                                        onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                                    >
                                        <option value="">Unassigned</option>
                                        {allUsers.map((u) => (
                                            <option key={u._id} value={u._id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Priority</label>
                                    <select
                                        value={newTask.priority}
                                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Due Date</label>
                                <input
                                    type="date"
                                    value={newTask.dueDate}
                                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="billable"
                                    checked={newTask.isBillable}
                                    onChange={(e) => {
                                        e.preventDefault();
                                        if (newTask.isBillable) {
                                            toast.error('Task is already marked as billable. Bills cannot be un-generated here.');
                                            return;
                                        }
                                        if (window.confirm('A bill must be generated to mark this task as billable. Redirect to Bill Generator?')) {
                                            autoSaveTaskAndRedirectToBill(e);
                                        }
                                    }}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <label htmlFor="billable" className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Billable Task</label>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateTask(false)}
                                    className={`px-4 py-2 text-sm rounded-lg font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 text-sm bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg font-medium disabled:opacity-50"
                                >
                                    {isSaving ? 'Creating...' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientDetail;
