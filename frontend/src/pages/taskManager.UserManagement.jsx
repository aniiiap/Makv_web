import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUserPlus, FiSearch, FiTrash2, FiShield, FiUser } from 'react-icons/fi';
import adminApi from '../utils/adminApi';
import CreateUserModal from '../components/CreateUserModal';
import BulkCreateUserModal from '../components/BulkCreateUserModal';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, [pagination.page]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getAllUsers(pagination.page, pagination.limit);
            setUsers(response.users);
            setPagination(response.pagination);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserCreated = () => {
        setShowCreateModal(false);
        setShowBulkCreateModal(false);
        fetchUsers();
    };

    const handleDeactivateUser = async (userId, userName) => {
        if (!confirm(`Are you sure you want to deactivate ${userName}?`)) {
            return;
        }

        try {
            await adminApi.deactivateUser(userId);
            fetchUsers();
        } catch (error) {
            console.error('Error deactivating user:', error);
            alert('Failed to deactivate user');
        }
    };

    const handlePermanentDelete = async (userId, userName) => {
        if (!confirm(`⚠️ PERMANENT DELETE: Are you sure you want to permanently delete ${userName}? This action cannot be undone!`)) {
            return;
        }

        try {
            await adminApi.permanentlyDeleteUser(userId);
            alert('User permanently deleted');
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    const filteredUsers = users.filter(
        (user) =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/taskflow/admin/dashboard')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <FiArrowLeft className="w-5 h-5" />
                        <span>Back to Dashboard</span>
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                            <p className="mt-2 text-gray-600">Create and manage TaskFlow user accounts</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                            >
                                <FiUserPlus className="w-5 h-5" />
                                <span>Create User</span>
                            </button>
                            <button
                                onClick={() => setShowBulkCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <FiUserPlus className="w-5 h-5" />
                                <span>Bulk Create</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiSearch className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12">
                            <FiUser className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm ? 'Try adjusting your search' : 'Get started by creating a new user'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Created By
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Created At
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map((user) => (
                                        <tr key={user._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                                            <span className="text-primary-600 font-medium text-sm">
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-green-100 text-green-800'
                                                        }`}
                                                >
                                                    {user.role === 'admin' ? (
                                                        <FiShield className="w-3 h-3" />
                                                    ) : (
                                                        <FiUser className="w-3 h-3" />
                                                    )}
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.createdBy?.name || 'System'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleDeactivateUser(user._id, user.name)}
                                                        className="text-orange-600 hover:text-orange-900 flex items-center gap-1"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                        Deactivate
                                                    </button>
                                                    <button
                                                        onClick={() => handlePermanentDelete(user._id, user.name)}
                                                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Showing page {pagination.page} of {pagination.pages} ({pagination.total} total users)
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                disabled={pagination.page === 1}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                disabled={pagination.page === pagination.pages}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <CreateUserModal
                    onClose={() => setShowCreateModal(false)}
                    onUserCreated={handleUserCreated}
                />
            )}

            {/* Bulk Create User Modal */}
            {showBulkCreateModal && (
                <BulkCreateUserModal
                    onClose={() => setShowBulkCreateModal(false)}
                    onUsersCreated={handleUserCreated}
                />
            )}
        </div>
    );
};

export default UserManagement;
