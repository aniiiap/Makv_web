import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaLock, FaEnvelope, FaSignInAlt, FaIdCard, FaMobileAlt, FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = () => {
  const [searchParams] = useSearchParams();
  const loginType = searchParams.get('type') || 'master'; // 'master' or 'client'
  const navigate = useNavigate();
  const { login, clientLogin } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    pan: '',
    mobile: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (loginType === 'master') {
      // Master login validation
      if (!formData.email || !formData.password) {
        setError('Email and password are required');
        setLoading(false);
        return;
      }
    } else {
      // Client login validation
      if (!formData.pan || !formData.mobile) {
        setError('PAN and Mobile number are required');
        setLoading(false);
        return;
      }
    }

    try {
      let result;
      if (loginType === 'master') {
        result = await login(formData.email, formData.password);
      } else {
        result = await clientLogin(formData.pan, formData.mobile);
      }

      if (result.success) {
        setSuccess('Success! Redirecting...');
        // Redirect based on user role
        setTimeout(() => {
          if (loginType === 'master') {
            navigate('/admin/dashboard');
          } else {
            navigate('/client/dashboard');
          }
        }, 500);
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            {loginType === 'master' ? 'Office Login' : 'Client Login'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your {loginType === 'master' ? 'office' : 'client'} account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {loginType === 'master' ? (
            // Master/Office Login Form
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Client Login Form (PAN + Mobile)
            <>
              <div>
                <label htmlFor="pan" className="block text-sm font-medium text-gray-700 mb-1">
                  PAN Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaIdCard className="text-gray-400" />
                  </div>
                  <input
                    id="pan"
                    name="pan"
                    type="text"
                    required
                    value={formData.pan}
                    onChange={(e) => {
                      // Convert to uppercase and remove special characters
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      setFormData({ ...formData, pan: value });
                      setError('');
                      setSuccess('');
                    }}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 uppercase"
                    placeholder="Enter your PAN number (e.g., ABCDE1234F)"
                    maxLength={10}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaMobileAlt className="text-gray-400" />
                  </div>
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/[^\d]/g, '');
                      setFormData({ ...formData, mobile: value });
                      setError('');
                      setSuccess('');
                    }}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter your mobile number (10 digits)"
                    maxLength={10}
                    pattern="[0-9]{10}"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <>
                  <FaSignInAlt className="mr-2" />
                  Sign In
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
