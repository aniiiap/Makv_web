import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiUserPlus, FiTrash2, FiShield, FiUser, FiArrowLeft, FiUpload, FiX } from 'react-icons/fi';
import adminApi from '../utils/adminApi';

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    // Single user creation
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');

    // Bulk user creation
    const [bulkUsers, setBulkUsers] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getAllUsers();
            setUsers(response.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await adminApi.createUser(newUserName, newUserEmail);
            setSuccess('User created successfully! Invitation email sent.');
            setNewUserName('');
            setNewUserEmail('');
            setShowCreateModal(false);
            fetchUsers();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create user');
        }
    };

    const handleBulkCreate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            // Parse bulk users input (format: name,email per line)
            const lines = bulkUsers.trim().split('\n');
            const usersArray = lines
                .map(line => {
                    const [name, email] = line.split(',').map(s => s.trim());
                    return name && email ? { name, email } : null;
                })
                .filter(Boolean);

            if (usersArray.length === 0) {
                setError('Please provide valid user data (format: Name, Email per line)');
                return;
            }

            const response = await adminApi.createBulkUsers(usersArray);
            setSuccess(`Created ${response.results.success.length} users. ${response.results.failed.length} failed.`);
            setBulkUsers('');
            setShowBulkCreateModal(false);
            fetchUsers();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create users');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedUsers.size === 0) {
            setError('Please select users to delete');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${selectedUsers.size} user(s)?`)) {
            return;
        }

        setError('');
        setSuccess('');

        try {
            const userIds = Array.from(selectedUsers);
            const response = await adminApi.bulkDeleteUsers(userIds);
            setSuccess(response.message);
            setSelectedUsers(new Set());
            fetchUsers();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to delete users');
        }
    };

    const handleToggleUserSelection = (userId) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map(u => u._id)));
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            await adminApi.updateUserRole(userId, newRole);
            setSuccess('User role updated successfully');
            fetchUsers();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to update role');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/taskflow/admin/dashboard')}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <FiArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
                            <p className="mt-2 text-gray-600">View, create, and manage user accounts</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowBulkCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <FiUpload className="w-5 h-5" />
                            Bulk Create
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            <FiUserPlus className="w-5 h-5" />
                            Create User
                        </button>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
                        <p className="font-medium">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded">
                        <p className="font-medium">{success}</p>
                    </div>
                )}

                {/* Bulk Actions */}
                {selectedUsers.size > 0 && (
                    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                        <span className="text-gray-700 font-medium">
                            {selectedUsers.size} user(s) selected
                        </span>
                        <button
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <FiTrash2 className="w-4 h-4" />
                            Delete Selected
                        </button>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.size === users.length && users.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.has(user._id)}
                                            onChange={() => handleToggleUserSelection(user._id)}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                <span className="text-primary-600 font-medium">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleUpdateRole(user._id, e.target.value)}
                                            className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {user.isFirstLogin ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                Pending Setup
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={async () => {
                                                if (confirm('Are you sure you want to delete this user?')) {
                                                    try {
                                                        await adminApi.permanentlyDeleteUser(user._id);
                                                        setSuccess('User deleted successfully');
                                                        fetchUsers();
                                                    } catch (error) {
                                                        setError('Failed to delete user');
                                                    }
                                                }
                                            }}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Create New User</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                <p className="text-sm text-blue-700">
                                    A temporary password will be generated and sent to the user's email.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Create Modal */}
            {showBulkCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Bulk Create Users</h2>
                            <button
                                onClick={() => setShowBulkCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleBulkCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    User Data (Name, Email per line)
                                </label>
                                <textarea
                                    required
                                    value={bulkUsers}
                                    onChange={(e) => setBulkUsers(e.target.value)}
                                    rows={10}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                                    placeholder="John Doe, john@example.com&#10;Jane Smith, jane@example.com&#10;Bob Johnson, bob@example.com"
                                />
                            </div>
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                <p className="text-sm text-blue-700">
                                    <strong>Format:</strong> Name, Email (one per line)<br />
                                    Temporary passwords will be generated and sent to each user's email.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Create Users
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageUsers;
