import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { useTheme } from '../context/taskManager.ThemeContext';
import { FiClock, FiChevronLeft, FiChevronRight, FiCheckSquare, FiFolder } from 'react-icons/fi';

const formatTime = (totalSeconds) => {
  if (!totalSeconds) return '0h 0m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const toDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MyDailyWork = () => {
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
  const [workData, setWorkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useTaskManagerAuth();
  const { isDark } = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      fetchDailyWork();
    } else {
      setLoading(false);
    }
  }, [selectedDate, isAuthenticated]);

  const fetchDailyWork = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks/stats/my-daily-work', {
        params: { date: selectedDate },
      });
      setWorkData(response.data);
    } catch (error) {
      console.error('Error fetching daily work:', error);
      setWorkData(null);
    } finally {
      setLoading(false);
    }
  };

  const shiftDate = (days) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    setSelectedDate(toDateString(date));
  };

  const getStatusColor = (status) => {
    if (isDark) {
      const colors = {
        todo: 'bg-gray-700 text-gray-200',
        'in-progress': 'bg-blue-900 text-blue-200',
        'in-review': 'bg-purple-900 text-purple-200',
        'client-pending': 'bg-orange-900 text-orange-200',
        done: 'bg-green-900 text-green-200',
      };
      return colors[status] || colors.todo;
    }
    const colors = {
      todo: 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'in-review': 'bg-purple-100 text-purple-800',
      'client-pending': 'bg-orange-100 text-orange-800',
      done: 'bg-green-100 text-green-800',
    };
    return colors[status] || colors.todo;
  };

  const formattedDisplayDate = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isToday = selectedDate === toDateString(new Date());

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={isDark ? 'text-gray-300' : 'text-gray-500'}>Please sign in to view your daily work</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            My Daily Work
          </h1>
          <p className={`mt-1 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {user?.name ? `${user.name}'s` : 'Your'} task history — only you can see this
          </p>
        </div>
      </div>

      <div className={`rounded-xl shadow-md border p-4 sm:p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftDate(-1)}
              className={`p-2 rounded-lg border transition-colors ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}
              aria-label="Previous day"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="date"
              value={selectedDate}
              max={toDateString(new Date())}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`px-3 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500 outline-none text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
            <button
              onClick={() => shiftDate(1)}
              disabled={isToday}
              className={`p-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}
              aria-label="Next day"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(toDateString(new Date()))}
                className="px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Today
              </button>
            )}
          </div>

          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-primary-50'}`}>
            <FiClock className="w-5 h-5 text-primary-500" />
            <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Total:{' '}
              <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {workData ? workData.formatted : '0h 0m'}
              </span>
            </span>
          </div>
        </div>
        <p className={`mt-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {formattedDisplayDate()}
          {isToday && ' (Today)'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-primary-400' : 'border-primary-600'}`} />
        </div>
      ) : (
        <div className={`rounded-xl shadow-md border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className={`p-4 sm:p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Tasks Worked On ({workData?.taskCount || 0})
            </h2>
          </div>

          {!workData?.tasks?.length ? (
            <div className="p-12 text-center">
              <FiCheckSquare className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>No time logged on this day</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                Start a timer on a task to track your work hours.
              </p>
              <Link
                to="/taskflow/tasks"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg font-medium"
              >
                Go to Tasks
              </Link>
            </div>
          ) : (
            <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {workData.tasks.map((task) => (
                <div key={task.id} className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base sm:text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {task.title}
                      </h3>
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(task.status)}`}>
                          {task.status.replace('-', ' ')}
                        </span>
                        {task.team && (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                            <FiFolder className="w-3 h-3" />
                            {task.team}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
                      <FiClock className="w-4 h-4" />
                      <span className="text-lg font-bold">{formatTime(task.timeSpent)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyDailyWork;
