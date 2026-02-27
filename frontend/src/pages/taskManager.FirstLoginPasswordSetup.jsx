import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';
import authApi from '../utils/authApi';

const FirstLoginPasswordSetup = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, updateUser } = useTaskManagerAuth();
    const navigate = useNavigate();

    const getPasswordStrength = (password) => {
        if (password.length === 0) return { strength: 0, label: '', color: '' };
        if (password.length < 6) return { strength: 1, label: 'Too short', color: 'bg-red-500' };

        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[!@#$%^&*]/.test(password)) strength++;

        if (strength <= 1) return { strength: 2, label: 'Weak', color: 'bg-orange-500' };
        if (strength === 2) return { strength: 3, label: 'Fair', color: 'bg-yellow-500' };
        if (strength === 3) return { strength: 4, label: 'Good', color: 'bg-blue-500' };
        return { strength: 5, label: 'Strong', color: 'bg-green-500' };
    };

    const passwordStrength = getPasswordStrength(newPassword);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.changePasswordFirstLogin(newPassword);
            // Update user context with new user data
            if (response.user) {
                updateUser(response.user);
            }
            // Redirect based on role
            if (user?.role === 'admin') {
                navigate('/taskflow/admin/dashboard');
            } else {
                navigate('/taskflow/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-4">
                        <FiLock className="h-8 w-8 text-primary-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Your Password</h1>
                    <p className="text-gray-600">
                        Welcome! Please create a new password for your account
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <p className="text-sm text-blue-700">
                            <strong>Security Notice:</strong> For your security, you must change your temporary
                            password before accessing the system.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiLock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="newPassword"
                                    type={showNewPassword ? 'text' : 'password'}
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="block w-full pl-10 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Enter new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showNewPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                                </button>
                            </div>
                            {newPassword && (
                                <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gray-600">Password strength:</span>
                                        <span className={`text-xs font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${passwordStrength.color} transition-all duration-300`}
                                            style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                Confirm Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiLock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-10 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Confirm new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? (
                                        <FiEyeOff className="h-5 w-5" />
                                    ) : (
                                        <FiEye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            {confirmPassword && newPassword === confirmPassword && (
                                <div className="mt-2 flex items-center gap-1 text-green-600 text-sm">
                                    <FiCheck className="w-4 h-4" />
                                    <span>Passwords match</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-xs text-gray-600 font-medium mb-2">Password requirements:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                                <li className="flex items-center gap-2">
                                    <span className={newPassword.length >= 6 ? 'text-green-600' : 'text-gray-400'}>
                                        {newPassword.length >= 6 ? '✓' : '○'}
                                    </span>
                                    At least 6 characters
                                </li>
                                <li className="flex items-center gap-2">
                                    <span
                                        className={
                                            /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)
                                                ? 'text-green-600'
                                                : 'text-gray-400'
                                        }
                                    >
                                        {/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? '✓' : '○'}
                                    </span>
                                    Mix of uppercase and lowercase letters
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className={/\d/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}>
                                        {/\d/.test(newPassword) ? '✓' : '○'}
                                    </span>
                                    At least one number
                                </li>
                                <li className="flex items-center gap-2">
                                    <span
                                        className={/[!@#$%^&*]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}
                                    >
                                        {/[!@#$%^&*]/.test(newPassword) ? '✓' : '○'}
                                    </span>
                                    Special character (!@#$%^&*)
                                </li>
                            </ul>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl font-medium"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>Setting Password...</span>
                                </>
                            ) : (
                                <>
                                    <FiCheck className="w-5 h-5" />
                                    <span>Set Password & Continue</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default FirstLoginPasswordSetup;
