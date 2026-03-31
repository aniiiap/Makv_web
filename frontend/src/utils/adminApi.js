import api from './taskManager.api';

const API_BASE = '/admin';

export const adminApi = {
    // Create new user
    createUser: async (name, email, teamId) => {
        console.log('Creating user at:', `${API_BASE}/users`);
        const response = await api.post(`${API_BASE}/users`, { name, email, teamId });
        return response;
    },

    // Create multiple users at once
    createBulkUsers: async (users, teamId) => {
        const response = await api.post(`${API_BASE}/users/bulk`, { users, teamId });
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

    // Get users grouped by team
    getUsersByTeam: async () => {
        console.log('Fetching users by team from:', `${API_BASE}/users-by-team`);
        const response = await api.get(`${API_BASE}/users-by-team`);
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
