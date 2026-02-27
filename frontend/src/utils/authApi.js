import api from './taskManager.api';

const API_BASE = '/auth';

export const authApi = {
    // Change password on first login
    changePasswordFirstLogin: async (newPassword) => {
        const response = await api.post(`${API_BASE}/change-password-first-login`, {
            newPassword,
        });
        return response;
    },
};

export default authApi;
