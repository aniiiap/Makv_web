import api from './taskManager.api';

const API_BASE = '/admin';

export const adminApi = {
    // Create new user
    createUser: async (name, email) => {
        console.log('Creating user at:', `${API_BASE}/users`);
        const response = await api.post(`${API_BASE}/users`, { name, email });
        return response;
    },

    // Create multiple users at once
    createBulkUsers: async (users) => {
        const response = await api.post(`${API_BASE}/users/bulk`, { users });
        return response;
    },

    // Get all users
    getAllUsers: async (page = 1, limit = 20) => {
        console.log('Fetching users from:', `${API_BASE}/users`);
        const response = await api.get(`${API_BASE}/users`, {
            params: { page, limit },
        });
        return response;
    },

    // Get user statistics
    getUserStats: async () => {
        console.log('Fetching stats from:', `${API_BASE}/stats`);
        const response = await api.get(`${API_BASE}/stats`);
        return response;
    },

    // Update user role
    updateUserRole: async (userId, role) => {
        const response = await api.patch(`${API_BASE}/users/${userId}/role`, { role });
        return response;
    },

    // Deactivate user
    deactivateUser: async (userId) => {
        const response = await api.delete(`${API_BASE}/users/${userId}`);
        return response;
    },

    // Permanently delete user
    permanentlyDeleteUser: async (userId) => {
        const response = await api.delete(`${API_BASE}/users/${userId}/permanent`);
        return response;
    },

    // Bulk delete users
    bulkDeleteUsers: async (userIds) => {
        const response = await api.post(`${API_BASE}/users/bulk-delete`, { userIds });
        return response;
    },
};

export default adminApi;
