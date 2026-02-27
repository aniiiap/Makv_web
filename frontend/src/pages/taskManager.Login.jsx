import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const hasGoogleClientId = GOOGLE_CLIENT_ID &&
  GOOGLE_CLIENT_ID.trim() !== '' &&
  GOOGLE_CLIENT_ID !== 'placeholder-client-id';

const TaskManagerLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, googleLogin, isAuthenticated } = useTaskManagerAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  // Remove auto-navigation - we handle navigation in success handlers
  // This prevents infinite loops when dashboard route doesn't exist yet

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password, inviteToken);

      // Check if this is first login
      if (response.user?.isFirstLogin) {
        navigate('/taskflow/first-login-setup');
        return;
      }

      // Role-based routing
      if (response.user?.role === 'admin') {
        navigate('/taskflow/admin/dashboard');
      } else if (response.acceptedInvitations > 0) {
        navigate('/taskflow/teams');
      } else {
        navigate('/taskflow/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      console.log('✅ Google credential received');
      setError('');
      setLoading(true);
      const response = await googleLogin(credentialResponse.credential, inviteToken);

      // Check if this is first login
      if (response.user?.isFirstLogin) {
        navigate('/taskflow/first-login-setup');
        return;
      }

      // Role-based routing
      if (response.user?.role === 'admin') {
        navigate('/taskflow/admin/dashboard');
      } else if (response.acceptedInvitations > 0) {
        navigate('/taskflow/teams');
      } else {
        navigate('/taskflow/dashboard');
      }
    } catch (err) {
      console.error('❌ Google login error:', err);
      setError(err.message || err.error?.message || 'Google login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to TaskFlow to manage your tasks efficiently</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Sign in to your account
          </h2>

          {inviteToken && (
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg">
              <p className="font-medium mb-1">You've been invited to join a team!</p>
              <p className="text-sm">Log in to accept the invitation and join the team.</p>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5" />
                  ) : (
                    <FiEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <FiArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {hasGoogleClientId && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  text="signin_with"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskManagerLogin;

