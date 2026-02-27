import { useState, useEffect } from 'react';
import ReactCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import api from '../utils/taskManager.api';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { useTheme } from '../context/taskManager.ThemeContext';
import { FiCalendar, FiClock, FiAlertCircle } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

const Calendar = () => {
  const [date, setDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [selectedDateTasks, setSelectedDateTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useTaskManagerAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Filter tasks whenever date or tasks change
  useEffect(() => {
    if (!loading) {
      filterTasksByDate(date);
    }
  }, [date, tasks, loading]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks');
      const fetchedTasks = response.data || [];
      
      // Set tasks - this will trigger the useEffect to filter
      setTasks(fetchedTasks);
      
      // Also immediately filter with the fetched tasks to avoid waiting for state update
      filterTasksByDate(date, fetchedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTasksByDate = (selectedDate, tasksToFilter = null) => {
    const tasksList = tasksToFilter || tasks;
    
    if (!tasksList || tasksList.length === 0) {
      setSelectedDateTasks([]);
      return;
    }
    
    // Normalize date to YYYY-MM-DD format (ignore time and timezone)
    const normalizeDate = (dateObj) => {
      const d = new Date(dateObj);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const dateStr = normalizeDate(selectedDate);
    
    const filtered = tasksList.filter((task) => {
      if (task.dueDate) {
        // Normalize task due date to YYYY-MM-DD format
        const taskDateStr = normalizeDate(task.dueDate);
        return taskDateStr === dateStr;
      }
      return false;
    });
    
    setSelectedDateTasks(filtered);
  };

  const getTasksForDate = (date) => {
    // Use the same normalization function for consistency
    const normalizeDate = (dateObj) => {
      const d = new Date(dateObj);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const dateStr = normalizeDate(date);
    return tasks.filter((task) => {
      if (task.dueDate) {
        const taskDateStr = normalizeDate(task.dueDate);
        return taskDateStr === dateStr;
      }
      return false;
    }).length;
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const taskCount = getTasksForDate(date);
      if (taskCount > 0) {
        return (
          <div className="absolute top-0 right-0 z-10 pointer-events-none">
            <span className="inline-flex items-center justify-center w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-[10px] font-bold shadow-lg">
              {taskCount}
            </span>
          </div>
        );
      }
    }
    return null;
  };

  const getStatusColor = (status) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800 border-gray-300',
      'in-progress': 'bg-blue-100 text-blue-800 border-blue-300',
      'in-review': 'bg-purple-100 text-purple-800 border-purple-300',
      done: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[status] || colors.todo;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-200',
      medium: 'bg-yellow-200',
      high: 'bg-orange-200',
      urgent: 'bg-red-200',
    };
    return colors[priority] || colors.medium;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={isDark ? 'text-gray-300' : 'text-gray-500'}>Please sign in to view calendar</p>
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

  const handleUpcomingTaskClick = (task) => {
    // Set team filter based on whether task is personal or team
    if (task.team && task.team._id) {
      localStorage.setItem('teamFilter', task.team._id);
    } else {
      localStorage.setItem('teamFilter', 'personal');
    }

    const teamId = localStorage.getItem('teamFilter') || '';
    window.dispatchEvent(
      new CustomEvent('teamFilterChanged', {
        detail: { teamId },
      })
    );

    navigate('/taskflow/tasks');
  };
  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 text-white">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold flex items-center gap-2 sm:gap-4 mb-2">
                <div className="p-2 sm:p-3 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg">
                  <FiCalendar className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                </div>
                <span>Calendar View</span>
              </h1>
              <p className="text-indigo-100 text-sm sm:text-base lg:text-lg ml-0 sm:ml-14">View and manage your tasks by due date</p>
            </div>
          </div>
        </div>
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-white opacity-10 rounded-full -mr-16 sm:-mr-32 -mt-16 sm:-mt-32"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-48 sm:h-48 bg-white opacity-10 rounded-full -ml-12 sm:-ml-24 -mb-12 sm:-mb-24"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Calendar Container */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl sm:rounded-3xl shadow-xl border-2 border-indigo-100 p-4 sm:p-6 lg:p-8 hover:shadow-2xl transition-all duration-300">
            <div className="mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-1">Select a Date</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Click on any date to view its tasks</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-center">
              {/* Illustration */}
              <div className="flex items-center justify-center h-full order-2 lg:order-1 hidden lg:flex">
                <img 
                  src="/illustrations/26195126_79z_2203_w012_n001_48c_p6_48.jpg" 
                  alt="Calendar illustration" 
                  className="w-full h-full max-h-[500px] object-contain rounded-2xl"
                />
              </div>
              {/* Calendar */}
              <div className="flex justify-center order-1 lg:order-2">
                <div className="w-full max-w-md">
                  <div className="relative">
                    <style>{`
                      .react-calendar__tile {
                        position: relative !important;
                      }
                      .react-calendar__tile > abbr {
                        position: relative;
                        z-index: 1;
                      }
                    `}</style>
                    <ReactCalendar
                      onChange={(newDate) => {
                        setDate(newDate);
                        // Ensure tasks are filtered immediately when date changes
                        filterTasksByDate(newDate);
                      }}
                      value={date}
                      tileContent={tileContent}
                      className="w-full border-0 calendar-custom"
                      activeStartDate={new Date()} // Ensure calendar shows current month
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks for Selected Date */}
        <div className={`rounded-2xl sm:rounded-3xl shadow-xl border-2 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-br from-white to-purple-50 border-purple-100'}`}>
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 mb-4 sm:mb-6 text-white shadow-lg">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg sm:rounded-xl">
                <FiCalendar className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg lg:text-xl font-bold">
                  {date.toLocaleDateString('en-US', { 
                    weekday: 'long'
                  })}
                </h2>
                <p className="text-purple-100 text-xs sm:text-sm font-medium">
                  {date.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {selectedDateTasks.length === 0 ? (
            <div className="text-center py-8 sm:py-12 lg:py-16">
              <div className={`relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg ${isDark ? 'bg-gradient-to-br from-purple-900 to-indigo-900' : 'bg-gradient-to-br from-purple-100 to-indigo-100'}`}>
                <FiCalendar className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 ${isDark ? 'text-purple-300' : 'text-purple-400'}`} />
                <div className={`absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full animate-pulse ${isDark ? 'bg-purple-400' : 'bg-purple-500'}`}></div>
              </div>
              <p className={`font-semibold text-base sm:text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>No tasks due on this date</p>
              <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tasks with due dates will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
              {selectedDateTasks.map((task, index) => (
                <Link
                  key={task._id}
                  to={`/taskflow/tasks?taskId=${task._id}`}
                  className="block group relative"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 lg:p-5 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${isDark ? 'bg-gray-700 border-gray-600 hover:border-purple-500' : 'bg-white border-gray-200 hover:border-purple-400 bg-gradient-to-br from-white to-purple-50/30'}`}>
                    <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                      <h3 className={`font-bold flex-1 text-sm sm:text-base leading-tight transition-colors ${isDark ? 'text-white group-hover:text-purple-400' : 'text-gray-900 group-hover:text-purple-600'}`}>
                        {task.title}
                      </h3>
                      <span
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-full ml-2 sm:ml-3 shadow-sm flex-shrink-0 ${getStatusColor(
                          task.status
                        )}`}
                      >
                        {task.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    {task.description && (
                      <p className={`text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <span
                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${getPriorityColor(task.priority)} shadow-sm`}
                          title={task.priority}
                        />
                        <span className={`text-xs font-semibold capitalize ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{task.priority}</span>
                      </div>
                      {task.team && (
                        <span className={`text-xs font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${isDark ? 'text-indigo-300 bg-indigo-900' : 'text-indigo-700 bg-indigo-100'}`}>
                          👥 {task.team.name}
                        </span>
                      )}
                      {task.assignedTo && (
                        <span className={`text-xs font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${isDark ? 'text-purple-300 bg-purple-900' : 'text-purple-700 bg-purple-100'}`}>
                          👤 {task.assignedTo.name}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="bg-gradient-to-br from-white to-orange-50 rounded-3xl shadow-xl border-2 border-orange-100 p-6 hover:shadow-2xl transition-all duration-300">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-5 mb-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl">
              <FiClock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Upcoming Tasks</h2>
              <p className="text-orange-100 text-sm">Next 5 tasks on your schedule</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {tasks
            .filter((task) => task.dueDate && new Date(task.dueDate) >= new Date())
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5)
            .map((task, index) => {
              const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'done';
              return (
                <button
                  key={task._id}
                  type="button"
                  onClick={() => handleUpcomingTaskClick(task)}
                  className="block group w-full text-left"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 hover:border-orange-400 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white to-orange-50/30 w-full">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-gray-900 flex-1 group-hover:text-orange-600 transition-colors">
                        {task.title}
                      </h3>
                      <span
                        className={`px-3 py-1.5 text-xs font-bold rounded-full ml-3 shadow-sm ${getStatusColor(
                          task.status
                        )}`}
                      >
                        {task.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-sm ${
                        isOverdue 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        <FiCalendar className="w-4 h-4" />
                        {new Date(task.dueDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      {task.priority === 'urgent' && (
                        <span className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-semibold text-sm">
                          <FiAlertCircle className="w-4 h-4" />
                          Urgent
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          {tasks.filter((task) => task.dueDate && new Date(task.dueDate) >= new Date())
            .length === 0 && (
            <div className="text-center py-12">
              <div className="relative w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <FiClock className="w-10 h-10 text-orange-400" />
              </div>
              <p className="text-gray-700 font-semibold">No upcoming tasks</p>
              <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;

