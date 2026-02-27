import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiUserPlus, FiShield, FiTrendingUp, FiLogOut } from 'react-icons/fi';
import adminApi from '../utils/adminApi';
import { useTaskManagerAuth } from '../context/taskManager.AuthContext';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { logout } = useTaskManagerAuth();

    const handleLogout = () => {
        logout();
        navigate('/taskflow/login');
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await adminApi.getUserStats();
            setStats(response.stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Users',
            value: stats?.totalUsers || 0,
            icon: FiUsers,
            color: 'bg-blue-500',
            bgColor: 'bg-blue-50',
        },
        {
            title: 'Regular Users',
            value: stats?.totalRegularUsers || 0,
            icon: FiUserPlus,
            color: 'bg-green-500',
            bgColor: 'bg-green-50',
        },
        {
            title: 'Admins',
            value: stats?.totalAdmins || 0,
            icon: FiShield,
            color: 'bg-purple-500',
            bgColor: 'bg-purple-50',
        },
        {
            title: 'New This Month',
            value: stats?.newUsersThisMonth || 0,
            icon: FiTrendingUp,
            color: 'bg-orange-500',
            bgColor: 'bg-orange-50',
        },
    ];

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
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="mt-2 text-gray-600">Manage TaskFlow users and system settings</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                    >
                        <FiLogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={index}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                                    </div>
                                    <div className={`${stat.bgColor} p-3 rounded-lg`}>
                                        <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => navigate('/taskflow/admin/users')}
                            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
                        >
                            <div className="bg-primary-100 p-3 rounded-lg group-hover:bg-primary-200 transition-colors">
                                <FiUsers className="w-6 h-6 text-primary-600" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-semibold text-gray-900">Manage Users</h3>
                                <p className="text-sm text-gray-600">View, create, and manage user accounts</p>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/taskflow/dashboard')}
                            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
                        >
                            <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                                <FiTrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-semibold text-gray-900">Go to TaskFlow</h3>
                                <p className="text-sm text-gray-600">Access your regular dashboard</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
