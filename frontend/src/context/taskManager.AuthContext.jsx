import { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/taskManager.api';

const TaskManagerAuthContext = createContext();

export const useTaskManagerAuth = () => {
  const context = useContext(TaskManagerAuthContext);
  if (!context) {
    throw new Error('useTaskManagerAuth must be used within TaskManagerAuthProvider');
  }
  return context;
};

export const TaskManagerAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('taskManagerToken');
      const savedUser = localStorage.getItem('taskManagerUser');

      if (token && savedUser) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.user);
          localStorage.setItem('taskManagerUser', JSON.stringify(response.user));
        } catch (error) {
          localStorage.removeItem('taskManagerToken');
          localStorage.removeItem('taskManagerUser');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, inviteToken = null) => {
    const response = await api.post('/auth/login', { email, password, inviteToken });
    localStorage.setItem('taskManagerToken', response.token);
    localStorage.setItem('taskManagerUser', JSON.stringify(response.user));
    setUser(response.user);
    return response;
  };

  const register = async (name, email, password, inviteToken = null) => {
    const response = await api.post('/auth/register', { name, email, password, inviteToken });
    localStorage.setItem('taskManagerToken', response.token);
    localStorage.setItem('taskManagerUser', JSON.stringify(response.user));
    setUser(response.user);
    return response;
  };

  const googleLogin = async (tokenId, inviteToken = null) => {
    try {
      console.log('🔐 Attempting Google login...');
      console.log('🔗 API Base URL:', import.meta.env.VITE_API_URL || 'http://localhost:5004/api');
      const response = await api.post('/auth/google', { tokenId, inviteToken });
      console.log('✅ Google login successful:', response);
      localStorage.setItem('taskManagerToken', response.token);
      localStorage.setItem('taskManagerUser', JSON.stringify(response.user));
      setUser(response.user);
      return response;
    } catch (error) {
      console.error('❌ Google login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('taskManagerToken');
    localStorage.removeItem('taskManagerUser');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('taskManagerUser', JSON.stringify(updatedUser));
  };

  return (
    <TaskManagerAuthContext.Provider
      value={{
        user,
        login,
        register,
        googleLogin,
        logout,
        updateUser,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </TaskManagerAuthContext.Provider>
  );
};
