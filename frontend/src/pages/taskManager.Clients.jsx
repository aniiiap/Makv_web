import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/taskManager.api';
import { useTheme } from '../context/taskManager.ThemeContext';
import {
    FiPlus, FiSearch, FiUsers, FiBriefcase, FiMail, FiPhone,
    FiCheckSquare, FiChevronRight
} from 'react-icons/fi';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const { isDark } = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const response = await api.get('/clients');
            setClients(Array.isArray(response) ? response : []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = useMemo(() => {
        if (!searchText.trim()) return clients;
        const query = searchText.toLowerCase();
        return clients.filter(c =>
            (c.name && c.name.toLowerCase().includes(query)) ||
            (c.companyName && c.companyName.toLowerCase().includes(query)) ||
            (c.email && c.email.toLowerCase().includes(query)) ||
            (c.phone && c.phone.includes(query))
        );
    }, [clients, searchText]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Clients</h1>
                    <p className={`mt-1 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Manage your office clients and their tasks
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className={`rounded-xl shadow-md border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className="w-full md:w-1/3 relative">
                    <FiSearch className={`absolute left-3 top-2.5 h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="Search clients by name, company, email..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 placeholder-gray-500'}`}
                    />
                </div>
            </div>

            {/* Clients Table */}
            <div className={`rounded-xl shadow-md border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                {filteredClients.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center">
                        <FiBriefcase className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                        <p className={`text-base sm:text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                            {searchText ? 'No clients match your search' : 'No clients found'}
                        </p>
                        <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                            Clients are managed from the main admin panel
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className={`border-b ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <th className={`text-left px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Name</th>
                                    <th className={`text-left px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider hidden lg:table-cell ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Email</th>
                                    <th className={`text-left px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider hidden lg:table-cell ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Phone</th>
                                    <th className={`text-center px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Pending Tasks</th>
                                    <th className={`text-center px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-600'}`}></th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                {filteredClients.map((client) => (
                                    <tr
                                        key={client._id}
                                        onClick={() => navigate(`/taskflow/clients/${client._id}`)}
                                        className={`cursor-pointer transition-colors ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}
                                    >
                                        <td className="px-4 sm:px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-primary-900 text-primary-300' : 'bg-primary-100 text-primary-700'}`}>
                                                    {(client.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className={`font-semibold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {client.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`px-4 sm:px-6 py-4 text-sm hidden lg:table-cell ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {client.email || '—'}
                                        </td>
                                        <td className={`px-4 sm:px-6 py-4 text-sm hidden lg:table-cell ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {client.phone || '—'}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${client.pendingTasks > 0
                                                ? isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                                                : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                <FiCheckSquare className="w-3 h-3" />
                                                {client.pendingTasks}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-center">
                                            <FiChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Clients;
