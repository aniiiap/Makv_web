import { useState, useEffect } from 'react';
import { useSocket } from '../context/taskManager.SocketContext';
import api from '../utils/taskManager.api';
import { Link } from 'react-router-dom';
import { FiX, FiTrash2, FiCheck } from 'react-icons/fi';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('notification', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      return () => {
        socket.off('notification');
      };
    }
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications', { params: { limit: 10 } });
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread/count');
      setUnreadCount(response.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === id ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((notif) => notif._id !== id));
      const notification = notifications.find((n) => n._id === id);
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllNotifications = async () => {
    if (!window.confirm('Are you sure you want to delete all notifications?')) {
      return;
    }
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const getNotificationLink = (notification) => {
    if (notification.relatedTask || 
        ['task_assigned', 'task_updated', 'task_status_changed', 'task_commented', 'task_due_soon', 'task_overdue'].includes(notification.type)) {
      return '/taskflow/tasks';
    }
    if (notification.relatedTeam || 
        ['team_invite', 'team_joined'].includes(notification.type)) {
      return '/taskflow/teams';
    }
    return null;
  };

  const handleTaskNotificationClick = (notification) => {
    if (notification.relatedTeam) {
      const teamId = notification.relatedTeam._id || notification.relatedTeam;
      if (teamId) {
        localStorage.setItem('teamFilter', teamId.toString());
        window.dispatchEvent(new CustomEvent('teamFilterChanged', { detail: { teamId: teamId.toString() } }));
      }
    } else {
      localStorage.removeItem('teamFilter');
      window.dispatchEvent(new CustomEvent('teamFilterChanged', { detail: { teamId: '' } }));
    }
    window.dispatchEvent(new CustomEvent('refreshTasks', { detail: { fromNotification: true } }));
    if (!notification.read) {
      markAsRead(notification._id);
    }
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          fetchNotifications();
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-xl z-20 border border-gray-200 max-h-[calc(100vh-120px)] flex flex-col">
            <div className="p-3 sm:p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Notifications
                </h3>
              </div>
              {(notifications.length > 0 || unreadCount > 0) && (
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {notifications.length > 0 && (
                    <button
                      onClick={deleteAllNotifications}
                      className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                      title="Delete all notifications"
                    >
                      <FiTrash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">Delete All</span>
                      <span className="sm:hidden">Delete</span>
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
                    >
                      <FiCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">Mark all as read</span>
                      <span className="sm:hidden">Mark read</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => {
                  const link = getNotificationLink(notification);
                  const handleNotificationClick = () => {
                    if (link === '/taskflow/tasks' && (notification.relatedTeam || notification.relatedTask)) {
                      handleTaskNotificationClick(notification);
                    } else {
                      if (!notification.read) {
                        markAsRead(notification._id);
                      }
                      setShowDropdown(false);
                    }
                  };

                  const content = (
                    <div
                      className={`p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer relative group ${
                        !notification.read ? 'bg-primary-50' : ''
                      }`}
                      onClick={link ? handleNotificationClick : undefined}
                    >
                      <div className="flex items-start gap-2 sm:gap-0">
                        <div className="flex-shrink-0">
                          {!notification.read && (
                            <div className="h-2 w-2 bg-primary-600 rounded-full mt-1.5 sm:mt-2" />
                          )}
                        </div>
                        <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2">
                            {notification.title}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => deleteNotification(notification._id, e)}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 flex-shrink-0"
                          title="Delete notification"
                        >
                          <FiX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  );

                  return link ? (
                    <Link key={notification._id} to={link} onClick={handleNotificationClick}>
                      {content}
                    </Link>
                  ) : (
                    <div key={notification._id} onClick={handleNotificationClick}>{content}</div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Notifications;

