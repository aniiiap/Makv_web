import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { useTheme } from '../context/taskManager.ThemeContext';
import { useTimer } from '../context/taskManager.TimerContext';
import Notifications from './taskManager.Notifications';
import { GoogleLogin } from '@react-oauth/google';
import { FiLayout, FiUsers, FiCheckSquare, FiMenu, FiX, FiLogOut, FiUser, FiBarChart2, FiCalendar, FiChevronUp, FiChevronDown, FiMoon, FiSun, FiFileText, FiSquare, FiShield } from 'react-icons/fi';

// Avatar component with fallback for sidebar
const SidebarAvatar = ({ user }) => {
  const [imageError, setImageError] = useState(false);
  const hasAvatar = user?.avatar && user.avatar.trim() && !imageError;

  if (hasAvatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || 'User'}
        className="h-10 w-10 rounded-full border-2 border-white shadow-sm object-cover"
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold border-2 border-white shadow-sm">
      {user?.name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { user, logout, isAuthenticated, googleLogin } = useTaskManagerAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const hasGoogleClientId = GOOGLE_CLIENT_ID &&
    GOOGLE_CLIENT_ID.trim() !== '' &&
    GOOGLE_CLIENT_ID !== 'placeholder-client-id';

  const navigation = [
    { name: 'Dashboard', href: '/taskflow/dashboard', icon: FiLayout },
    { name: 'Teams', href: '/taskflow/teams', icon: FiUsers },
    { name: 'Tasks', href: '/taskflow/tasks', icon: FiCheckSquare },
    { name: 'Bills & Invoices', href: '/taskflow/bills', icon: FiFileText },
    { name: 'Analytics', href: '/taskflow/analytics', icon: FiBarChart2 },
    { name: 'Calendar', href: '/taskflow/calendar', icon: FiCalendar },
  ];

  if (user?.role === 'admin') {
    navigation.push({ name: 'Admin Dashboard', href: '/taskflow/admin/dashboard', icon: FiShield });
  }

  const isActive = (path) => location.pathname === path;

  // Timer Widget Component
  const SidebarTimer = () => {
    const { activeTask, isRunning, elapsedTime, formatTime, stopTimer } = useTimer();
    const { isDark } = useTheme();

    if (!activeTask || !isRunning) return null;

    return (
      <div className={`mx-4 mb-4 p-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-primary-50 border-primary-100'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-primary-700'}`}>
            Active Timer
          </span>
          <div className={`w-2 h-2 rounded-full bg-green-500 animate-pulse`} />
        </div>

        <div className={`text-sm font-medium mb-1 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {activeTask.title}
        </div>

        <div className="flex items-center justify-between">
          <div className={`text-xl font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {formatTime(elapsedTime)}
          </div>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await api.post(`/tasks/${activeTask._id}/timer/stop`);
              } catch (error) {
                console.error('Failed to stop timer on backend:', error);
              }
              stopTimer();
            }}
            className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
            title="Stop Timer"
          >
            <FiSquare className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/taskflow/login');
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await googleLogin(credentialResponse.credential);
      navigate('/taskflow/dashboard');
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login error');
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center justify-between h-16 px-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h1 className="text-2xl font-bold text-primary-600">TaskFlow</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const IconComponent = item.icon;
              const requiresAuth = item.href !== '/taskflow/dashboard';
              if (requiresAuth && !isAuthenticated) {
                return (
                  <div
                    key={item.name}
                    onClick={() => navigate('/taskflow/login')}
                    className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-gray-400 cursor-not-allowed"
                    title="Please sign in to access this page"
                  >
                    <IconComponent className="mr-3 w-5 h-5" />
                    {item.name}
                  </div>
                );
              }
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive(item.href)
                    ? isDark ? 'bg-primary-900 text-primary-300' : 'bg-primary-50 text-primary-700'
                    : isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <IconComponent className={`mr-3 w-5 h-5 ${isActive(item.href) ? 'text-primary-600' : 'text-gray-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Active Timer Widget */}
          <SidebarTimer />

          {/* User section */}
          <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            {isAuthenticated && user ? (
              <div className="relative">
                {profileDropdownOpen && (
                  <div className="mb-3 animate-in slide-in-from-top duration-200">
                    <button
                      onClick={() => {
                        handleLogout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                    >
                      <FiLogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <SidebarAvatar user={user} />
                    </div>
                    <div className="ml-3 flex-1 min-w-0 text-left">
                      <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {user?.name}
                      </p>
                      <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {profileDropdownOpen ? (
                      <FiChevronUp className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                    ) : (
                      <FiChevronDown className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                    )}
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {hasGoogleClientId && (
                  <div className="w-full [&>div]:w-full [&>div>div]:w-full [&>div>div>div]:w-full">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      text="signin_with"
                      shape="rectangular"
                      theme="outline"
                      size="large"
                      useOneTap={false}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className={`sticky top-0 z-10 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b`}>
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <FiMenu className="h-6 w-6" />
            </button>

            <div className="flex-1 lg:flex-none" />

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
              </button>
              {isAuthenticated && <Notifications />}
              {!isAuthenticated && (
                <Link
                  to="/taskflow/login"
                  className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
